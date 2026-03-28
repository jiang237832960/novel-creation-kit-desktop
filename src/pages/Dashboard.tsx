import React, { useState } from 'react';
import { Card, Row, Col, Typography, Button, Space, Tag, Statistic, Divider, List, Avatar, Badge, FloatButton } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  PlayCircleOutlined,
  FileTextOutlined,
  SafetyOutlined,
  ExperimentOutlined,
  ArrowRightOutlined,
  BookOutlined,
  MessageOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import AIChatPanel from '../components/chat/AIChatPanel';

const { Title, Text, Paragraph } = Typography;

const AgentFlow = [
  { step: 0, name: '创作总监', icon: '👑', desc: '用户交互入口', layer: 'control' },
  { step: 1, name: '总导演', icon: '🎬', desc: '章节调度/任务拆解', layer: 'execution' },
  { step: 2, name: '档案员', icon: '📁', desc: '上下文/伏笔追踪', layer: 'execution' },
  { step: 3, name: '文风师', icon: '🎨', desc: '文风/节奏控制', layer: 'execution' },
  { step: 4, name: '编剧', icon: '✍️', desc: '场景/剧情/细纲', layer: 'execution' },
  { step: 5, name: '写手', icon: '📝', desc: '正文初稿', layer: 'execution' },
  { step: 6, name: '字数管控', icon: '🔢', desc: '字数监控', layer: 'execution' },
  { step: 7, name: '润色师', icon: '✨', desc: '润色/去AI痕迹', layer: 'execution' },
  { step: 8, name: '验证官', icon: '🔍', desc: '全维度校验', layer: 'execution' },
  { step: 9, name: '修订师', icon: '🔧', desc: '问题修复', layer: 'execution' },
  { step: 10, name: '学习代理', icon: '🧠', desc: '经验沉淀/规则迭代', layer: 'learning' },
];

const TruthFiles = [
  { name: 'current_state.md', icon: '🌍', desc: '世界当前状态' },
  { name: 'resource_ledger.md', icon: '💰', desc: '资源账本' },
  { name: 'pending_hooks.md', icon: '🪝', desc: '待处理伏笔池' },
  { name: 'chapter_summaries.md', icon: '📑', desc: '章节摘要' },
  { name: 'subplot_board.md', icon: '📋', desc: '支线进度板' },
  { name: 'emotional_arcs.md', icon: '💗', desc: '情感弧线' },
  { name: 'character_matrix.md', icon: '👥', desc: '角色交互矩阵' },
];

const HardRules = [
  { id: 'R01', rule: '禁止"不是……而是……"句式', level: 'error' },
  { id: 'R02', rule: '禁止破折号"——"', level: 'error' },
  { id: 'R03', rule: '转折词密度 ≤ 1次/3000字', level: 'warning' },
  { id: 'R04', rule: '高疲劳词 ≤ 1次/章', level: 'warning' },
  { id: 'R05', rule: '禁止元叙事', level: 'warning' },
  { id: 'R06', rule: '禁止报告术语', level: 'error' },
  { id: 'R07', rule: '禁止作者说教词', level: 'warning' },
  { id: 'R08', rule: '禁止集体反应套话', level: 'warning' },
  { id: 'R09', rule: '禁止连续4句"了"字', level: 'warning' },
  { id: 'R10', rule: '段落长度 ≤ 300字', level: 'warning' },
  { id: 'R11', rule: '禁止本书禁忌', level: 'error' },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [chatVisible, setChatVisible] = useState(false);

  return (
    <div style={{ padding: 24 }}>
      <AIChatPanel visible={chatVisible} onClose={() => setChatVisible(false)} />

      <FloatButton
        type="primary"
        icon={<MessageOutlined />}
        badge={{ count: 0 }}
        onClick={() => setChatVisible(true)}
        tooltip="AI创作助手"
        style={{ right: 24, bottom: 24 }}
      />

      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>工作台</Title>
        <Text type="secondary">欢迎使用 Novel Creation Kit 多智能体小说创作系统</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <PlayCircleOutlined style={{ color: '#1890ff' }} />
                <span>12-Agent 五层协作系统</span>
              </Space>
            }
            extra={<Tag color="orange">InkOS</Tag>}
          >
            <div style={{ marginBottom: 16, padding: '8px 12px', background: '#fafafa', borderRadius: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <Space>
                  <Tag color="orange" style={{ margin: 0 }}>👑 入口</Tag>
                  <Text type="secondary">创作总监（用户交互层）</Text>
                  <ArrowRightOutlined style={{ color: '#d9d9d9' }} />
                  <Tag color="blue" style={{ margin: 0 }}>🎬 总导演</Tag>
                  <Text type="secondary">启动执行层</Text>
                  <ArrowRightOutlined style={{ color: '#d9d9d9' }} />
                  <Tag color="green" style={{ margin: 0 }}>🧠 学习代理</Tag>
                  <Text type="secondary">持续优化</Text>
                </Space>
              </Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', padding: '8px 0' }}>
              {AgentFlow.map((agent, index) => {
                const getBgColor = () => {
                  if (agent.layer === 'control') return '#fff7e6';
                  if (agent.layer === 'learning') return '#f6ffed';
                  if (index === 1) return '#e6f7ff';
                  return '#fafafa';
                };
                const getBorderColor = () => {
                  if (agent.layer === 'control') return '#ffd591';
                  if (agent.layer === 'learning') return '#b7eb8f';
                  if (index === 1) return '#91d5ff';
                  return '#f0f0f0';
                };
                return (
                  <React.Fragment key={agent.step}>
                    <div style={{ textAlign: 'center', minWidth: 90 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: getBgColor(),
                        border: `2px solid ${getBorderColor()}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 6px', fontSize: 18
                      }}>
                        {agent.icon}
                      </div>
                      <Text strong style={{ fontSize: 11 }}>{agent.name}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 9 }}>{agent.desc}</Text>
                    </div>
                    {index < AgentFlow.length - 1 && (
                      <ArrowRightOutlined style={{ color: '#d9d9d9', margin: '0 4px', flexShrink: 0 }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </Card>

          <Card
            title={
              <Space>
                <SafetyOutlined style={{ color: '#faad14' }} />
                <span>质量保障体系</span>
              </Space>
            }
            style={{ marginTop: 16 }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <div style={{ padding: 12, background: '#fff7e6', borderRadius: 8, border: '1px solid #ffe58f' }}>
                  <Space>
                    <span style={{ fontSize: 24 }}>📏</span>
                    <div>
                      <Text strong>11 条硬规则</Text>
                      <div><Text type="secondary" style={{ fontSize: 12 }}>零 LLM 成本的自动检查</Text></div>
                    </div>
                  </Space>
                  <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {HardRules.slice(0, 5).map(rule => (
                      <Tag key={rule.id} color={rule.level === 'error' ? 'error' : 'warning'} style={{ margin: 0 }}>
                        {rule.id}
                      </Tag>
                    ))}
                    <Tag>+6</Tag>
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ padding: 12, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
                  <Space>
                    <span style={{ fontSize: 24 }}>🔬</span>
                    <div>
                      <Text strong>33 维度审计</Text>
                      <div><Text type="secondary" style={{ fontSize: 12 }}>全方位质量保障</Text></div>
                    </div>
                  </Space>
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      A类(8) B类(7) C类(5) D类(5) E类(3) F类(2) G类(3)
                    </Text>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <FileTextOutlined style={{ color: '#52c41a' }} />
                <span>7 个 Truth Files</span>
              </Space>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TruthFiles.map(tf => (
                <div key={tf.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
                  <span style={{ fontSize: 16 }}>{tf.icon}</span>
                  <div style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13 }}>{tf.desc}</Text>
                    <div><Text type="secondary" style={{ fontSize: 11 }}>{tf.name}</Text></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="快速开始"
            style={{ marginTop: 16 }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Button
                type="primary"
                size="large"
                block
                icon={<PlayCircleOutlined />}
                onClick={() => navigate('/projects')}
              >
                创建新项目
              </Button>
              <Button
                size="large"
                block
                icon={<BookOutlined />}
                onClick={() => navigate('/projects')}
              >
                打开现有项目
              </Button>
              <Button
                size="large"
                block
                icon={<ThunderboltOutlined />}
                onClick={() => navigate('/chat')}
                style={{ background: '#faad14', borderColor: '#faad14', color: '#fff' }}
              >
                Zero Token 免费聊天
              </Button>
            </Space>
          </Card>

          <Card
            title="系统状态"
            style={{ marginTop: 16 }}
          >
            <Statistic title="项目总数" value={0} suffix="个" />
            <Divider style={{ margin: '12px 0' }} />
            <Statistic title="章节总数" value={0} suffix="章" />
            <Divider style={{ margin: '12px 0' }} />
            <Statistic title="创作字数" value={0} suffix="字" />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
