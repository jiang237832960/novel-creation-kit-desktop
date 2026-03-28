import React, { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Avatar, Space, List, Spin, Typography, Select, Tag, Dropdown, Badge, Tooltip, Empty } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, SwapOutlined, SettingOutlined, DownOutlined, ThunderboltOutlined, ClearOutlined } from '@ant-design/icons';
import { useSettingsStore } from '../stores';
import { zeroTokenService } from '../services/zeroToken';
import type { ChatMessage, ZeroTokenProvider, ZeroTokenModel } from '../types';

const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  provider?: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
}

const ZeroTokenChat: React.FC = () => {
  const { zeroTokenConfig, setZeroTokenConfig } = useSettingsStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [providers, setProviders] = useState<ZeroTokenProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [modelOptions, setModelOptions] = useState<ZeroTokenModel[]>([]);

  useEffect(() => {
    loadProviders();
  }, [zeroTokenConfig.providers]);

  useEffect(() => {
    if (currentConversation) {
      setMessages(currentConversation.messages);
      const [p, m] = (currentConversation.model || '').split('/');
      if (p && m) {
        setSelectedProvider(p);
        setSelectedModel(m);
      }
    }
  }, [currentConversation]);

  const loadProviders = async () => {
    if (zeroTokenConfig.providers.length > 0) {
      setProviders(zeroTokenConfig.providers);
      if (!selectedProvider && zeroTokenConfig.activeProvider) {
        setSelectedProvider(zeroTokenConfig.activeProvider);
        const provider = zeroTokenConfig.providers.find(p => p.id === zeroTokenConfig.activeProvider);
        if (provider) {
          setModelOptions(provider.models);
          if (zeroTokenConfig.activeModel) {
            const modelId = zeroTokenConfig.activeModel.split('/')[1];
            setSelectedModel(modelId);
          }
        }
      }
    }
  };

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      setModelOptions(provider.models);
      setSelectedModel(provider.models[0]?.id || '');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const createNewConversation = () => {
    const model = selectedProvider && selectedModel ? `${selectedProvider}/${selectedModel}` : '';
    const newConversation: Conversation = {
      id: `conv_${Date.now()}`,
      title: `对话 ${conversations.length + 1}`,
      messages: [],
      provider: selectedProvider,
      model,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations(prev => [...prev, newConversation]);
    setCurrentConversation(newConversation);
    setMessages([]);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (!selectedModel) {
      const model = zeroTokenConfig.activeModel || 'deepseek-web/deepseek-chat';
      const [p, m] = model.split('/');
      if (p && m) {
        setSelectedProvider(p);
        setSelectedModel(m);
      }
    }

    const modelId = selectedProvider && selectedModel ? `${selectedProvider}/${selectedModel}` : zeroTokenConfig.activeModel;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
      provider: selectedProvider,
      model: selectedModel,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    const assistantMessageId = `assistant_${Date.now()}`;
    let fullContent = '';

    try {
      const chatMessages = [...messages, userMessage].map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        timestamp: m.timestamp,
      }));

      const result = await zeroTokenService.sendStreamingMessage(
        chatMessages,
        modelId || zeroTokenConfig.activeModel,
        (chunk) => {
          fullContent += chunk;
          setStreamingContent(fullContent);
        },
        { temperature: 0.7, maxTokens: 2000 }
      );

      if (result.success) {
        const assistantMessage: ChatMessage = {
          id: assistantMessageId,
          role: 'assistant',
          content: fullContent,
          timestamp: new Date().toISOString(),
          provider: selectedProvider,
          model: selectedModel,
        };
        setMessages(prev => [...prev, assistantMessage]);

        if (currentConversation) {
          setConversations(prev => prev.map(c =>
            c.id === currentConversation.id
              ? { ...c, messages: [...c.messages, userMessage, assistantMessage], updatedAt: new Date().toISOString() }
              : c
          ));
        }
      } else {
        const errorMessage: ChatMessage = {
          id: assistantMessageId,
          role: 'assistant',
          content: `错误: ${result.error}`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '抱歉，发生了错误。请检查网关连接或模型配置。',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
    setStreamingContent('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearConversation = () => {
    if (currentConversation) {
      const updated = conversations.map(c =>
        c.id === currentConversation.id ? { ...c, messages: [] } : c
      );
      setConversations(updated);
      setCurrentConversation({ ...currentConversation, messages: [] });
      setMessages([]);
    }
  };

  const getProviderIcon = (providerId?: string) => {
    if (!providerId) return '🤖';
    const icons: Record<string, string> = {
      'deepseek-web': '🔵',
      'claude-web': '🟣',
      'chatgpt-web': '🟢',
      'gemini-web': '🟡',
      'qwen-web': '🟠',
      'qwen-cn-web': '🟠',
      'kimi-web': '🌙',
      'doubao-web': '🐰',
      'grok-web': '⚡',
      'glm-web': '🔷',
      'glm-intl-web': '🔷',
      'xiaomimo-web': '📱',
      'perplexity-web': '🔍',
    };
    return icons[providerId] || '🤖';
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: 280,
        borderRight: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        background: '#fafafa',
      }}>
        <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
          <Button type="primary" block icon={<SwapOutlined />} onClick={createNewConversation}>
            新建对话
          </Button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
          {conversations.length === 0 ? (
            <Empty description="暂无对话" style={{ marginTop: 40 }} />
          ) : (
            <List
              dataSource={conversations}
              renderItem={conv => (
                <List.Item
                  style={{
                    cursor: 'pointer',
                    borderRadius: 8,
                    marginBottom: 4,
                    background: currentConversation?.id === conv.id ? '#e6f7ff' : 'transparent',
                  }}
                  onClick={() => setCurrentConversation(conv)}
                >
                  <List.Item.Meta
                    avatar={<Avatar size="small" icon={getProviderIcon(conv.provider) as any} />}
                    title={<Text ellipsis style={{ fontSize: 13 }}>{conv.title}</Text>}
                    description={
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {conv.messages.length} 条消息
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>

        <div style={{ padding: 12, borderTop: '1px solid #f0f0f0' }}>
          <Button block icon={<SettingOutlined />} onClick={() => window.location.hash = '#/settings/zero-token'}>
            Zero Token 设置
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Space>
            <Text strong>Zero Token 聊天</Text>
            {selectedProvider && (
              <Tag icon={<span>{getProviderIcon(selectedProvider)}</span>}>
                {providers.find(p => p.id === selectedProvider)?.name || selectedProvider}
              </Tag>
            )}
            {selectedModel && <Tag>{selectedModel}</Tag>}
          </Space>

          <Space>
            <Select
              value={selectedProvider}
              onChange={handleProviderChange}
              style={{ width: 140 }}
              placeholder="选择提供商"
            >
              {providers.map(p => (
                <Option key={p.id} value={p.id}>
                  {getProviderIcon(p.id)} {p.name}
                </Option>
              ))}
            </Select>

            <Select
              value={selectedModel}
              onChange={setSelectedModel}
              style={{ width: 180 }}
              placeholder="选择模型"
              disabled={!selectedProvider}
            >
              {modelOptions.map(m => (
                <Option key={m.id} value={m.id}>
                  {m.name} {m.reasoning && '🧠'}
                </Option>
              ))}
            </Select>

            <Tooltip title="清空当前对话">
              <Button icon={<ClearOutlined />} onClick={handleClearConversation} disabled={!currentConversation} />
            </Tooltip>
          </Space>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {messages.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Card style={{ textAlign: 'center', maxWidth: 500 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>
                  <ThunderboltOutlined style={{ color: '#1890ff' }} />
                </div>
                <Title level={4}>免费使用 AI 模型</Title>
                <Text type="secondary">
                  通过 Zero Token 技术，无需 API Key 即可使用 DeepSeek、Claude、Qwen、Kimi 等多种 AI 模型。
                </Text>
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    请先在设置中配置并加载模型列表
                  </Text>
                </div>
              </Card>
            </div>
          ) : (
            <List
              dataSource={messages}
              renderItem={(message) => (
                <List.Item
                  style={{
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                    border: 'none',
                    padding: '8px 0',
                  }}
                >
                  <div style={{
                    maxWidth: '70%',
                    display: 'flex',
                    flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}>
                    <Avatar
                      size={36}
                      icon={message.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                      style={{
                        background: message.role === 'user' ? '#1890ff' : '#52c41a',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{
                      background: message.role === 'user' ? '#e6f7ff' : '#f5f5f5',
                      padding: '12px 16px',
                      borderRadius: message.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {message.content}
                      {message.id === `assistant_${Date.now()}` && streamingContent && (
                        <span style={{ opacity: 0.7 }}>{streamingContent}</span>
                      )}
                    </div>
                  </div>
                </List.Item>
              )}
            />
          )}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: 12 }}>
              <Spin size="small" /> <Text type="secondary" style={{ marginLeft: 8 }}>AI 正在思考...</Text>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: 16,
          borderTop: '1px solid #f0f0f0',
          background: '#fff',
        }}>
          <Space.Compact style={{ width: '100%' }}>
            <TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="输入你的问题... (Enter 发送，Shift+Enter 换行)"
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{ flex: 1, borderRadius: 8 }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={isLoading}
              disabled={!input.trim()}
              style={{ borderRadius: 8 }}
            >
              发送
            </Button>
          </Space.Compact>
          <div style={{ marginTop: 8, textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Zero Token 通过浏览器凭证调用 AI 模型，请确保网关正在运行
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZeroTokenChat;
