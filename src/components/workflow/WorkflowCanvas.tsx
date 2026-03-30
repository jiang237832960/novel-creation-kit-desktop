import React, { useState } from 'react';
import { Card, Steps, Button, Space, Typography, Badge, Tooltip, Modal, Empty, Spin, Tag, Progress, Alert, Divider } from 'antd';
import {
  CheckCircleFilled,
  ClockCircleFilled,
  LoadingOutlined,
  CloseCircleFilled,
  ForwardFilled,
  PauseCircleFilled,
  PlayCircleFilled,
  ReloadOutlined,
  FileTextOutlined,
  SafetyCertificateFilled,
  ScissorOutlined,
} from '@ant-design/icons';
import type { Agent, AgentStatus, WORKFLOW_STEPS } from '../../types';

const { Text, Title } = Typography;

interface WorkflowCanvasProps {
  agents: Agent[];
  onAgentClick: (agent: Agent) => void;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onReset?: () => void;
  onStepClick?: (step: number) => void;
  isRunning?: boolean;
  isPaused?: boolean;
  currentAgentIndex?: number;
  currentStep?: number;
  stepStatus?: 'pass' | 'fail' | 'checking' | null;
  qualityResults?: {
    gateCheck?: { errorCount: number; warningCount: number; pass: boolean };
    aiTraceScore?: number;
    semanticCheck?: { avgSimilarity: number; status: string };
    wordCount?: { charCount: number; status: string };
  };
}

const getStatusIcon = (status: AgentStatus) => {
  switch (status) {
    case 'completed':
      return <CheckCircleFilled style={{ color: '#52c41a' }} />;
    case 'running':
      return <LoadingOutlined style={{ color: '#1890ff' }} />;
    case 'failed':
      return <CloseCircleFilled style={{ color: '#ff4d4f' }} />;
    case 'waiting':
      return <ClockCircleFilled style={{ color: '#faad14' }} />;
    case 'skipped':
      return <ForwardFilled style={{ color: '#8c8c8c' }} />;
    default:
      return <ClockCircleFilled style={{ color: '#d9d9d9' }} />;
  }
};

const getStatusTag = (status: AgentStatus) => {
  const config: Record<AgentStatus, { color: string; text: string }> = {
    pending: { color: 'default', text: '待执行' },
    waiting: { color: 'warning', text: '等待中' },
    running: { color: 'processing', text: '执行中' },
    completed: { color: 'success', text: '已完成' },
    failed: { color: 'error', text: '失败' },
    skipped: { color: 'default', text: '已跳过' },
  };
  return config[status] || config.pending;
};

const WORKFLOW_STEP_NAMES = [
  { step: 0, name: '预备检查', icon: '🔍' },
  { step: 1, name: '任务分配', icon: '📋' },
  { step: 2, name: '档案员', icon: '📚' },
  { step: 3, name: '文风师', icon: '✍️' },
  { step: 4, name: '编剧', icon: '🎬' },
  { step: 5, name: '写手', icon: '📝' },
  { step: 6, name: '字数管控', icon: '📊' },
  { step: 7, name: '润色师', icon: '✨' },
  { step: 8, name: '验证官', icon: '🔎' },
  { step: 9, name: '修订师', icon: '🔧' },
  { step: 10, name: '学习代理', icon: '🎓' },
];

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  agents,
  onAgentClick,
  onStart,
  onPause,
  onResume,
  onReset,
  onStepClick,
  isRunning = false,
  isPaused = false,
  currentAgentIndex = 0,
  currentStep = 0,
  stepStatus,
  qualityResults,
}) => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
    onAgentClick(agent);
  };

  const getDuration = (agent: Agent) => {
    if (agent.startTime && agent.endTime) {
      const duration = agent.endTime - agent.startTime;
      return `${(duration / 1000).toFixed(1)}s`;
    }
    if (agent.startTime) {
      const duration = Date.now() - agent.startTime;
      return `${(duration / 1000).toFixed(1)}s`;
    }
    return '-';
  };

  const renderQualityStatus = () => {
    if (!qualityResults) return null;

    const results = [];

    if (qualityResults.gateCheck) {
      const { errorCount, warningCount, pass } = qualityResults.gateCheck;
      results.push(
        <Tag key="gate" icon={<SafetyCertificateFilled />} color={pass ? 'success' : 'error'}>
          硬规则检查 {errorCount === 0 && warningCount === 0 ? '✅' : `${errorCount}错/${warningCount}警`}
        </Tag>
      );
    }

    if (qualityResults.aiTraceScore !== undefined) {
      const score = qualityResults.aiTraceScore;
      results.push(
        <Tag key="ai" icon={<ScissorOutlined />} color={score >= 8 ? 'success' : score >= 5 ? 'warning' : 'error'}>
          AI痕迹 {score.toFixed(1)}/10
        </Tag>
      );
    }

    if (qualityResults.wordCount) {
      const { charCount, status } = qualityResults.wordCount;
      results.push(
        <Tag key="word" color={status === 'pass' ? 'success' : 'warning'}>
          字数 {charCount}
        </Tag>
      );
    }

    return results.length > 0 ? (
      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {results}
      </div>
    ) : null;
  };

  const getStepProgress = () => {
    const completedSteps = agents.filter(a => a.status === 'completed').length;
    return Math.round((completedSteps / agents.length) * 100);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Space>
            {!isRunning ? (
              <Button
                type="primary"
                icon={<PlayCircleFilled />}
                onClick={onStart}
                disabled={agents.every(a => a.status === 'completed')}
              >
                开始工作流
              </Button>
            ) : isPaused ? (
              <Button
                type="primary"
                icon={<PlayCircleFilled />}
                onClick={onResume}
              >
                继续
              </Button>
            ) : (
              <Button
                icon={<PauseCircleFilled />}
                onClick={onPause}
              >
                暂停
              </Button>
            )}
            <Button
              icon={<ReloadOutlined />}
              onClick={onReset}
              disabled={isRunning}
            >
              重置
            </Button>
          </Space>
          
          <Space>
            <Text type="secondary">进度:</Text>
            <Progress percent={getStepProgress()} size="small" style={{ width: 120 }} />
            <Text type="secondary">{currentStep + 1}/{agents.length}</Text>
          </Space>
        </div>

        {qualityResults && renderQualityStatus()}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <Steps
          direction="vertical"
          size="small"
          current={isRunning ? currentAgentIndex : -1}
          items={agents.map((agent, index) => ({
            title: (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: onStepClick ? 'pointer' : 'default',
                }}
                onClick={() => {
                  if (onStepClick) {
                    onStepClick(index);
                  }
                  handleAgentClick(agent);
                }}
              >
                <Space>
                  <Tooltip title={`步骤${index}: ${WORKFLOW_STEP_NAMES[index]?.name || ''}`}>
                    {getStatusIcon(agent.status)}
                  </Tooltip>
                  <Text strong={agent.status === 'running'}>{agent.nameCn}</Text>
                  {WORKFLOW_STEP_NAMES[index] && (
                    <Tag style={{ fontSize: 10 }}>{WORKFLOW_STEP_NAMES[index].icon}</Tag>
                  )}
                </Space>
                <Badge
                  status={getStatusTag(agent.status).color as any}
                  text={<Text type="secondary" style={{ fontSize: 12 }}>{getStatusTag(agent.status).text}</Text>}
                />
              </div>
            ),
            description: agent.currentTask ? (
              <div style={{ marginTop: 8 }}>
                <Card
                  size="small"
                  hoverable={!!onStepClick}
                  onClick={() => {
                    if (onStepClick) {
                      onStepClick(index);
                    }
                    handleAgentClick(agent);
                  }}
                  style={{
                    borderColor: agent.status === 'running' ? '#1890ff' : undefined,
                    cursor: onStepClick ? 'pointer' : 'default',
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {agent.currentTask}
                  </Text>
                  {agent.output && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        输出: {agent.output.substring(0, 100)}...
                      </Text>
                    </div>
                  )}
                  {agent.error && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="danger" style={{ fontSize: 11 }}>
                        错误: {agent.error}
                      </Text>
                    </div>
                  )}
                  {agent.status === 'completed' && (
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 10 }}>
                        耗时: {getDuration(agent)}
                      </Text>
                    </div>
                  )}
                </Card>
              </div>
            ) : null,
          }))}
        />
      </div>

      <Modal
        title={`${selectedAgent?.nameCn || ''} - 详情`}
        open={!!selectedAgent}
        onCancel={() => setSelectedAgent(null)}
        footer={null}
        width={700}
      >
        {selectedAgent && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <Text type="secondary">状态：</Text>
                <Badge
                  status={getStatusTag(selectedAgent.status).color as any}
                  text={getStatusTag(selectedAgent.status).text}
                />
              </div>
              <div>
                <Text type="secondary">类型：</Text>
                <Text>{selectedAgent.type === 'deliberative' ? '审议型' : '反应型'}</Text>
              </div>
              <div>
                <Text type="secondary">耗时：</Text>
                <Text>{getDuration(selectedAgent)}</Text>
              </div>
            </div>
            
            <Divider style={{ margin: '8px 0' }} />
            
            <div>
              <Text type="secondary">职责描述：</Text>
              <div style={{ marginTop: 4 }}>{selectedAgent.description}</div>
            </div>
            
            {selectedAgent.currentTask && (
              <div>
                <Text type="secondary">当前任务：</Text>
                <div style={{ marginTop: 4, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                  {selectedAgent.currentTask}
                </div>
              </div>
            )}
            
            {selectedAgent.input && (
              <div>
                <Text type="secondary">输入：</Text>
                <Card size="small" style={{ marginTop: 4, maxHeight: 120, overflow: 'auto' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 11 }}>
                    {selectedAgent.input}
                  </pre>
                </Card>
              </div>
            )}
            
            {selectedAgent.output && (
              <div>
                <Text type="secondary">输出：</Text>
                <Card size="small" style={{ marginTop: 4, maxHeight: 200, overflow: 'auto' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 11 }}>
                    {selectedAgent.output}
                  </pre>
                </Card>
              </div>
            )}
            
            {selectedAgent.error && (
              <Alert
                message="执行错误"
                description={selectedAgent.error}
                type="error"
                showIcon
              />
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default WorkflowCanvas;
