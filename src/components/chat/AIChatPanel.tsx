import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Avatar, Space, List, Spin, Typography } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, CloseOutlined } from '@ant-design/icons';
import { creativeDirector } from '../../services/llm';

const { Text } = Typography;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AIChatPanelProps {
  visible: boolean;
  onClose: () => void;
  projectId?: string;
}

const AIChatPanel: React.FC<AIChatPanelProps> = ({ visible, onClose, projectId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是创作总监，是你的唯一创作入口。\n\n我可以帮你：\n1. 解析创作需求，创建小说项目\n2. 调度Agent执行创作任务\n3. 解答创作相关问题\n4. 审核全局规则\n\n请告诉我你想要创作什么类型的小说？',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (visible) {
      scrollToBottom();
    }
  }, [messages, visible]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await creativeDirector.processUserRequest(userMessage.content);

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: result.success && result.response
          ? result.response
          : result.error || '抱歉，我遇到了一些问题，请稍后再试。',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: '抱歉，发生了错误。请检查网络连接或LLM配置。',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      width: 420,
      height: 560,
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Space>
          <Avatar size="small" icon={<RobotOutlined />} style={{ background: 'rgba(255,255,255,0.2)' }} />
          <Text strong style={{ color: '#fff' }}>创作总监 AI</Text>
        </Space>
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          style={{ color: '#fff' }}
          size="small"
        />
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <List
          dataSource={messages}
          renderItem={(message) => (
            <List.Item
              style={{
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                border: 'none',
                padding: '4px 0',
              }}
            >
              <div style={{
                maxWidth: '80%',
                display: 'flex',
                flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: 8,
              }}>
                <Avatar
                  size={32}
                  icon={message.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                  style={{
                    background: message.role === 'user' ? '#1890ff' : '#52c41a',
                    flexShrink: 0,
                  }}
                />
                <div style={{
                  background: message.role === 'user' ? '#e6f7ff' : '#f5f5f5',
                  padding: '10px 14px',
                  borderRadius: message.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  <Text style={{ fontSize: 14 }}>{message.content}</Text>
                </div>
              </div>
            </List.Item>
          )}
        />
        {isLoading && (
          <div style={{ textAlign: 'center', padding: 12 }}>
            <Spin size="small" /> <Text type="secondary" style={{ marginLeft: 8 }}>思考中...</Text>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: 12,
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        gap: 8,
      }}>
        <Input.TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入你的创作需求..."
          autoSize={{ minRows: 1, maxRows: 3 }}
          style={{ flex: 1, borderRadius: 8 }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={isLoading}
          disabled={!input.trim()}
          style={{ borderRadius: 8 }}
        />
      </div>
    </div>
  );
};

export default AIChatPanel;
