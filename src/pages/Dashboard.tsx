import React, { useState } from 'react';
import { Layout, Menu, Card, Typography, Button, Space, Tabs, Table, Tag, Progress, Timeline, Badge, Avatar, Tooltip, Statistic, Row, Col, Divider, Alert, Empty } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  FolderOutlined,
  SettingOutlined,
  BookOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  TeamOutlined,
  SafetyOutlined,
  EditOutlined,
  PlusOutlined,
  SyncOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const AgentList = [
  { id: 'archivist', name: '档案员', icon: '📁', description: '构建上下文，维护设定与伏笔', color: '#1890ff' },
  { id: 'stylist', name: '文风师', icon: '🎨', description: '分析文风，制定风格指南', color: '#722ed1' },
  { id: 'screenwriter', name: '编剧', icon: '✍️', description: '设计场景，规划剧情', color: '#eb2f96' },
  { id: 'writer', name: '写手', icon: '📝', description: '正文初稿写作', color: '#52c41a' },
  { id: 'wordcount', name: '字数管控师', icon: '🔢', description: '字数监控与合规校验', color: '#fa8c16' },
  { id: 'polisher', name: '润色师', icon: '✨', description: '文本润色与AI痕迹去除', color: '#13c2c2' },
  { id: 'verifier', name: '验证官', icon: '🔍', description: '33维度审计', color: '#faad14' },
  { id: 'reviser', name: '修订师', icon: '🔧', description: '问题修复与细节优化', color: '#f5222d' },
  { id: 'learning', name: '学习代理', icon: '🧠', description: '沉淀经验，更新Truth Files', color: '#1677ff' },
];

const TruthFilesList = [
  { name: 'current_state.md', nameCn: '当前世界状态', icon: '🌍', description: '时间线、地点、关键物品' },
  { name: 'resource_ledger.md', nameCn: '资源账本', icon: '💰', description: '货币、物品、属性' },
  { name: 'pending_hooks.md', nameCn: '待处理伏笔', icon: '🪝', description: '伏笔铺设与回收记录' },
  { name: 'chapter_summaries.md', nameCn: '章节摘要', icon: '📑', description: '章节进度与核心事件' },
  { name: 'subplot_board.md', nameCn: '支线进度板', icon: '📋', description: '支线任务与进度' },
  { name: 'emotional_arcs.md', nameCn: '情感弧线', icon: '💗', description: '角色情感变化轨迹' },
  { name: 'character_matrix.md', nameCn: '角色交互矩阵', icon: '👥', description: '角色信息与关系' },
];

const HardRules = [
  { id: 'R01', rule: '禁止"不是……而是……"句式', severity: 'error' },
  { id: 'R02', rule: '禁止破折号"——"', severity: 'error' },
  { id: 'R03', rule: '转折词密度 ≤ 1次/3000字', severity: 'warning' },
  { id: 'R04', rule: '高疲劳词 ≤ 1次/章', severity: 'warning' },
  { id: 'R05', rule: '禁止元叙事', severity: 'warning' },
  { id: 'R06', rule: '禁止报告术语', severity: 'error' },
  { id: 'R07', rule: '禁止作者说教词', severity: 'warning' },
  { id: 'R08', rule: '禁止集体反应套话', severity: 'warning' },
  { id: 'R09', rule: '禁止连续4句"了"字', severity: 'warning' },
  { id: 'R10', rule: '段落长度 ≤ 300字', severity: 'warning' },
  { id: 'R11', rule: '禁止本书禁忌', severity: 'error' },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const agent = AgentList.find(a => a.id === selectedAgent);

  return (
    <div style={{ padding: '0 24px 24px' }}>
      <Title level={2}>创作工作台</Title>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card 
            title={
              <Space>
                <TeamOutlined />
                <span>9-Agent 协作系统</span>
              </Space>
            }
            extra={<Tag color="blue">InkOS 架构</Tag>}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {AgentList.map((a) => (
                <Card
                  key={a.id}
                  size="small"
                  hoverable
                  onClick={() => setSelectedAgent(a.id)}
                  style={{ 
                    borderColor: selectedAgent === a.id ? a.color : undefined,
                    cursor: 'pointer'
                  }}
                  bodyStyle={{ padding: 12 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{a.icon}</span>
                    <Text strong style={{ fontSize: 13 }}>{a.name}</Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{a.description}</Text>
                </Card>
              ))}
            </div>
            
            {agent && (
              <div style={{ marginTop: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
                <Space>
                  <span style={{ fontSize: 24 }}>{agent.icon}</span>
                  <div>
                    <Text strong style={{ fontSize: 16 }}>{agent.name}</Text>
                    <div><Text type="secondary">{agent.description}</Text></div>
                  </div>
                </Space>
              </div>
            )}
          </Card>

          <Card 
            title={
              <Space>
                <SafetyOutlined />
                <span>11 条硬规则</span>
              </Space>
            }
            style={{ marginTop: 16 }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {HardRules.map((rule) => (
                <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fafafa', borderRadius: 4 }}>
                  <Tag color={rule.severity === 'error' ? 'error' : 'warning'}>{rule.id}</Tag>
                  <Text style={{ fontSize: 13 }}>{rule.rule}</Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card 
            title={
              <Space>
                <FileTextOutlined />
                <span>7 个 Truth Files</span>
              </Space>
            }
          >
            <Timeline
              items={TruthFilesList.map((tf, index) => ({
                dot: <span style={{ fontSize: 16 }}>{tf.icon}</span>,
                children: (
                  <div key={tf.name}>
                    <Text strong>{tf.nameCn}</Text>
                    <div><Text type="secondary" style={{ fontSize: 12 }}>{tf.description}</Text></div>
                  </div>
                ),
              }))}
            />
          </Card>

          <Card 
            title="创作统计" 
            style={{ marginTop: 16 }}
          >
            <Statistic title="项目总数" value={0} suffix="个" />
            <Divider style={{ margin: '12px 0' }} />
            <Statistic title="章节总数" value={0} suffix="章" />
            <Divider style={{ margin: '12px 0' }} />
            <Statistic title="创作字数" value={0} suffix="字" />
          </Card>

          <Alert
            message="快速开始"
            description="选择上方 Agent 角色开始创作，或在项目列表中打开现有项目"
            type="info"
            showIcon
            style={{ marginTop: 16 }}
            action={
              <Button size="small" onClick={() => navigate('/projects')}>
                查看项目
              </Button>
            }
          />
        </Col>
      </Row>

      <Card 
        title={
          <Space>
            <ExclamationCircleOutlined />
            <span>33 维度审计体系</span>
          </Space>
        }
        style={{ marginTop: 16 }}
      >
        <Row gutter={[16, 16]}>
          {[
            { category: 'A类', name: '基础一致性', count: 8, color: 'blue', dims: 'OOC检测、战力崩坏、信息越界...' },
            { category: 'B类', name: '内容质量', count: 7, color: 'green', dims: '词汇疲劳、台词失真、节奏拖沓...' },
            { category: 'C类', name: 'AI痕迹', count: 5, color: 'orange', dims: '段落等长、套话密度、句式单一...' },
            { category: 'D类', name: '故事结构', count: 5, color: 'purple', dims: '支线停滞、弧线平坦、高潮缺失...' },
            { category: 'E类', name: '合规', count: 3, color: 'red', dims: '敏感词、版权问题、政治敏感' },
            { category: 'F类', name: '番外专属', count: 2, color: 'cyan', dims: '正传冲突、未来信息泄露' },
            { category: 'G类', name: '读者体验', count: 3, color: 'magenta', dims: '钩子设计、大纲偏离、阅读疲劳' },
          ].map((cat) => (
            <Col xs={24} sm={12} md={8} key={cat.category}>
              <Card size="small" bodyStyle={{ padding: 12 }}>
                <Space>
                  <Tag color={cat.color}>{cat.category}</Tag>
                  <Text strong>{cat.name}</Text>
                  <Tag>{cat.count}维</Tag>
                </Space>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{cat.dims}</Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};

export default Dashboard;
