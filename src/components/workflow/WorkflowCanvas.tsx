import React, { useState } from 'react';
import { Card, Steps, Button, Space, Typography, Badge, Tooltip, Modal, Empty, Spin } from 'antd';
import {
  CheckCircleFilled,
  ClockCircleFilled,
  LoadingOutlined,
  CloseCircleFilled,
  ForwardFilled,
  PauseCircleFilled,
  PlayCircleFilled,
  ReloadOutlined,
} from '@ant-design/icons';
import type { Agent, AgentStatus } from '../../types';

const { Text, Title } = Typography;

interface WorkflowCanvasProps {
  agents: Agent[];
  onAgentClick: (agent: Agent) => void;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onReset?: () => void;
  isRunning?: boolean;
  isPaused?: boolean;
  currentAgentIndex?: number;
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

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  agents,
  onAgentClick,
  onStart,
  onPause,
  onResume,
  onReset,
  isRunning = false,
  isPaused = false,
  currentAgentIndex = 0,
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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Space style={{ width: '100%', justifyContent: 'center' }}>
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
                  cursor: 'pointer',
                }}
                onClick={() => handleAgentClick(agent)}
              >
                <Space>
                  <Tooltip title={getDuration(agent)}>
                    {getStatusIcon(agent.status)}
                  </Tooltip>
                  <Text strong={agent.status === 'running'}>{agent.nameCn}</Text>
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
                  hoverable
                  onClick={() => handleAgentClick(agent)}
                  style={{
                    borderColor: agent.status === 'running' ? '#1890ff' : undefined,
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
        width={600}
      >
        {selectedAgent && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text type="secondary">状态：</Text>
              <Badge
                status={getStatusTag(selectedAgent.status).color as any}
                text={getStatusTag(selectedAgent.status).text}
              />
            </div>
            <div>
              <Text type="secondary">描述：</Text>
              <div>{selectedAgent.description}</div>
            </div>
            {selectedAgent.currentTask && (
              <div>
                <Text type="secondary">当前任务：</Text>
                <div>{selectedAgent.currentTask}</div>
              </div>
            )}
            {selectedAgent.output && (
              <div>
                <Text type="secondary">输出：</Text>
                <Card size="small" style={{ marginTop: 8, maxHeight: 200, overflow: 'auto' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
                    {selectedAgent.output}
                  </pre>
                </Card>
              </div>
            )}
            {selectedAgent.error && (
              <div>
                <Text type="secondary">错误：</Text>
                <Text type="danger">{selectedAgent.error}</Text>
              </div>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default WorkflowCanvas;
