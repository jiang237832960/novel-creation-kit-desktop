import React, { useState, useEffect, useMemo } from 'react';
import { Card, Typography, Table, Tag, Button, Space, Tabs, Alert, Divider, Progress, Tooltip, Badge } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  WarningOutlined, 
  InfoCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { validatorService, auditService, HARD_RULES } from '../../services/validator';
import type { ValidationResult, AuditResult, AuditDimension } from '../../types';

const { Title, Text, Paragraph } = Typography;

interface ValidationPanelProps {
  content: string;
  chapterId?: string;
  onValidate?: (results: ValidationResult[]) => void;
  onAudit?: (result: AuditResult) => void;
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({
  content,
  chapterId = 'unknown',
  onValidate,
  onAudit,
}) => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'error' | 'warning'>('all');
  const [selectedRule, setSelectedRule] = useState<string | null>(null);

  const runValidation = useMemo(() => {
    return () => {
      if (!content.trim()) {
        setValidationResults([]);
        return;
      }
      
      setIsValidating(true);
      setTimeout(() => {
        const results = validatorService.validateText(content);
        setValidationResults(results);
        setIsValidating(false);
        onValidate?.(results);
      }, 100);
    };
  }, [content, onValidate]);

  const runAudit = useMemo(() => {
    return () => {
      if (!content.trim()) {
        setAuditResult(null);
        return;
      }
      
      setIsAuditing(true);
      setTimeout(() => {
        const result = auditService.auditChapter(content, chapterId);
        setAuditResult(result);
        setIsAuditing(false);
        onAudit?.(result);
      }, 200);
    };
  }, [content, chapterId, onAudit]);

  useEffect(() => {
    if (content.trim()) {
      runValidation();
    }
  }, [content]);

  const filteredResults = useMemo(() => {
    let results = validationResults;
    if (filter !== 'all') {
      results = results.filter(r => r.severity === filter);
    }
    if (selectedRule) {
      results = results.filter(r => r.ruleId === selectedRule);
    }
    return results;
  }, [validationResults, filter, selectedRule]);

  const errorCount = validationResults.filter(r => r.severity === 'error').length;
  const warningCount = validationResults.filter(r => r.severity === 'warning').length;

  const auditPassCount = auditResult?.dimensions.filter(d => d.status === 'pass').length || 0;
  const auditWarningCount = auditResult?.dimensions.filter(d => d.status === 'warning').length || 0;
  const auditFailCount = auditResult?.dimensions.filter(d => d.status === 'fail').length || 0;

  const getSeverityColor = (severity: 'error' | 'warning') => severity === 'error' ? 'error' : 'warning';

  const ruleColumns = [
    { title: '规则', dataIndex: 'id', key: 'id', width: 80, render: (id: string) => <Tag>{id}</Tag> },
    { title: '规则内容', dataIndex: 'rule', key: 'rule' },
    { title: '级别', dataIndex: 'severity', key: 'severity', width: 80, render: (s: 'error' | 'warning') => <Tag color={getSeverityColor(s)}>{s === 'error' ? 'Error' : 'Warning'}</Tag> },
  ];

  const resultColumns = [
    { 
      title: '规则', 
      dataIndex: 'ruleId', 
      key: 'ruleId', 
      width: 80, 
      render: (id: string) => <Tag>{id}</Tag> 
    },
    { 
      title: '级别', 
      dataIndex: 'severity', 
      key: 'severity', 
      width: 80, 
      render: (s: 'error' | 'warning') => <Tag color={getSeverityColor(s)}>{s === 'error' ? 'Error' : 'Warning'}</Tag> 
    },
    { 
      title: '位置', 
      dataIndex: 'line', 
      key: 'line', 
      width: 80, 
      render: (line: number) => line ? `第 ${line} 行` : '-' 
    },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '建议', dataIndex: 'suggestion', key: 'suggestion', render: (t: string) => <Text type="secondary">{t}</Text> },
  ];

  const dimensionColumns = [
    { 
      title: '类别', 
      dataIndex: 'category', 
      key: 'category', 
      width: 80,
      render: (c: string) => <Tag color="blue">{c}</Tag>
    },
    { title: '维度', dataIndex: 'name', key: 'name' },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status', 
      width: 100,
      render: (s: AuditDimension['status']) => {
        const config = {
          pass: { color: 'success', text: '通过', icon: <CheckCircleOutlined /> },
          warning: { color: 'warning', text: '警告', icon: <WarningOutlined /> },
          fail: { color: 'error', text: '失败', icon: <CloseCircleOutlined /> },
          skipped: { color: 'default', text: '跳过', icon: <InfoCircleOutlined /> },
        };
        return (
          <Tag color={config[s].color} icon={config[s].icon}>
            {config[s].text}
          </Tag>
        );
      }
    },
    { 
      title: '问题', 
      dataIndex: 'issues', 
      key: 'issues',
      render: (issues: string[]) => (
        <div>
          {issues.map((issue, i) => (
            <div key={i}>
              <Text type="danger" style={{ fontSize: 12 }}>{issue}</Text>
            </div>
          ))}
        </div>
      )
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Tabs
        style={{ flex: 1, overflow: 'hidden' }}
        items={[
          {
            key: 'rules',
            label: '11条硬规则',
            children: (
              <div style={{ height: '100%', overflow: 'auto', padding: '0 16px 16px' }}>
                <Space style={{ marginBottom: 16 }}>
                  <Button
                    icon={<PlayCircleOutlined />}
                    onClick={runValidation}
                    loading={isValidating}
                  >
                    运行验证
                  </Button>
                  <Divider type="vertical" />
                  <Tag icon={<CloseCircleOutlined />} color="error">{errorCount} Error</Tag>
                  <Tag icon={<WarningOutlined />} color="warning">{warningCount} Warning</Tag>
                  {content.length > 0 && (
                    <Text type="secondary">字数: {content.length}</Text>
                  )}
                </Space>

                <Table
                  title={() => <Text strong>硬规则列表</Text>}
                  size="small"
                  dataSource={HARD_RULES}
                  rowKey="id"
                  columns={ruleColumns}
                  pagination={false}
                  style={{ marginBottom: 16 }}
                />

                {filteredResults.length > 0 && (
                  <>
                    <Divider />
                    <Space style={{ marginBottom: 12 }}>
                      <Text strong>验证结果 ({filteredResults.length})</Text>
                      <Divider type="vertical" />
                      <Button
                        size="small"
                        icon={<FilterOutlined />}
                        onClick={() => setFilter('all')}
                        type={filter === 'all' ? 'primary' : 'default'}
                      >
                        全部
                      </Button>
                      <Button
                        size="small"
                        icon={<CloseCircleOutlined />}
                        onClick={() => setFilter('error')}
                        type={filter === 'error' ? 'primary' : 'default'}
                      >
                        Error
                      </Button>
                      <Button
                        size="small"
                        icon={<WarningOutlined />}
                        onClick={() => setFilter('warning')}
                        type={filter === 'warning' ? 'primary' : 'default'}
                      >
                        Warning
                      </Button>
                    </Space>
                    <Table
                      size="small"
                      dataSource={filteredResults}
                      rowKey={(record, index) => `${record.ruleId}-${record.line}-${index}`}
                      columns={resultColumns}
                      pagination={{ pageSize: 10 }}
                      rowClassName={(record) => record.severity === 'error' ? 'error-row' : 'warning-row'}
                    />
                  </>
                )}

                {validationResults.length === 0 && content.length > 0 && !isValidating && (
                  <Alert
                    message="验证通过"
                    description="未检测到违反硬规则的内容"
                    type="success"
                    showIcon
                    icon={<CheckCircleOutlined />}
                  />
                )}

                {content.length === 0 && (
                  <Alert
                    message="暂无内容"
                    description="请先在编辑器中输入内容，系统将自动运行验证"
                    type="info"
                    showIcon
                  />
                )}
              </div>
            ),
          },
          {
            key: 'audit',
            label: '33维度审计',
            children: (
              <div style={{ height: '100%', overflow: 'auto', padding: '0 16px 16px' }}>
                <Space style={{ marginBottom: 16 }}>
                  <Button
                    icon={<PlayCircleOutlined />}
                    onClick={runAudit}
                    loading={isAuditing}
                  >
                    运行审计
                  </Button>
                  <Divider type="vertical" />
                  {auditResult && (
                    <>
                      <Tag icon={<CheckCircleOutlined />} color="success">{auditPassCount} 通过</Tag>
                      <Tag icon={<WarningOutlined />} color="warning">{auditWarningCount} 警告</Tag>
                      <Tag icon={<CloseCircleOutlined />} color="error">{auditFailCount} 失败</Tag>
                    </>
                  )}
                </Space>

                {auditResult && (
                  <>
                    <Card size="small" style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Progress
                          type="circle"
                          percent={Math.round((auditPassCount / 33) * 100)}
                          size={60}
                          strokeColor={auditFailCount > 0 ? '#ff4d4f' : auditWarningCount > 3 ? '#faad14' : '#52c41a'}
                        />
                        <div style={{ flex: 1 }}>
                          <Text strong style={{ fontSize: 16 }}>
                            审计结果：{
                              auditResult.overallStatus === 'pass' ? '通过' :
                              auditResult.overallStatus === 'warning' ? '需优化' : '未通过'
                            }
                          </Text>
                          <Paragraph type="secondary" style={{ margin: 0, marginTop: 4 }}>
                            {auditResult.summary}
                          </Paragraph>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            审计时间：{new Date(auditResult.timestamp).toLocaleString('zh-CN')}
                          </Text>
                        </div>
                      </div>
                    </Card>

                    <Table
                      size="small"
                      dataSource={auditResult.dimensions}
                      rowKey="name"
                      columns={dimensionColumns}
                      pagination={{ pageSize: 10 }}
                    />
                  </>
                )}

                {!auditResult && (
                  <Alert
                    message={'点击"运行审计"开始33维度审计'}
                    description="审计将检查内容的一致性、质量、AI痕迹、结构等多个维度"
                    type="info"
                    showIcon
                  />
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export default ValidationPanel;
