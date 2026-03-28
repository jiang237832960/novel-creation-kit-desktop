import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, Typography, Space, Divider, Tag, message, Alert, List, Avatar, Badge, Descriptions } from 'antd';
import { ApiOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, GatewayOutlined, KeyOutlined } from '@ant-design/icons';
import { useSettingsStore } from '../stores';
import { zeroTokenService } from '../services/zeroToken';
import type { ZeroTokenProvider, ZeroTokenModel } from '../types';

const { Title, Text } = Typography;
const { Option } = Select;

const ZeroTokenSettings: React.FC = () => {
  const { zeroTokenConfig, setZeroTokenConfig, llmConfig, setLlmConfig } = useSettingsStore();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [loadingModels, setLoadingModels] = useState(false);
  const [providers, setProviders] = useState<ZeroTokenProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [models, setModels] = useState<ZeroTokenModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');

  useEffect(() => {
    form.setFieldsValue({
      gatewayUrl: zeroTokenConfig.gatewayUrl,
      gatewayToken: zeroTokenConfig.gatewayToken,
    });
    if (zeroTokenConfig.providers.length > 0) {
      setProviders(zeroTokenConfig.providers);
    }
  }, [zeroTokenConfig, form]);

  const handleTestConnection = async () => {
    try {
      setConnectionStatus('testing');
      const values = await form.validateFields();
      zeroTokenService.setGatewayUrl(values.gatewayUrl);
      zeroTokenService.setGatewayToken(values.gatewayToken);
      
      const result = await zeroTokenService.checkConnection();
      
      if (result.success) {
        setConnectionStatus('success');
        message.success('网关连接成功！');
      } else {
        setConnectionStatus('failed');
        message.error(result.error || '连接失败');
      }
    } catch (error) {
      setConnectionStatus('failed');
      message.error('连接测试失败');
    }
  };

  const handleLoadModels = async () => {
    try {
      setLoadingModels(true);
      const values = await form.validateFields();
      zeroTokenService.setGatewayUrl(values.gatewayUrl);
      zeroTokenService.setGatewayToken(values.gatewayToken);
      
      const result = await zeroTokenService.fetchModels();
      
      if (result.success && result.providers) {
        setProviders(result.providers);
        setZeroTokenConfig({ providers: result.providers });
        message.success(`成功加载 ${result.providers.length} 个提供商！`);
      } else {
        message.error(result.error || '获取模型列表失败');
      }
    } catch (error) {
      message.error('获取模型列表失败');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      setModels(provider.models);
      setZeroTokenConfig({ activeProvider: providerId });
    }
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    if (selectedProvider) {
      setZeroTokenConfig({ activeModel: `${selectedProvider}/${modelId}` });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();
      
      setZeroTokenConfig({
        gatewayUrl: values.gatewayUrl,
        gatewayToken: values.gatewayToken,
        activeProvider: selectedProvider,
        activeModel: selectedModel ? `${selectedProvider}/${selectedModel}` : zeroTokenConfig.activeModel,
      });

      if (selectedProvider && selectedModel) {
        setLlmConfig({
          provider: 'zero-token',
          model: `${selectedProvider}/${selectedModel}`,
        });
      }
      
      message.success('设置已保存');
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const getProviderIcon = (providerId: string) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'configured': return 'success';
      case 'not_configured': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Zero Token 设置</Title>
        <Text type="secondary">配置 OpenClaw Zero Token 网关，免费使用各大 AI 模型</Text>
      </div>

      <Alert
        message="Zero Token 是什么？"
        description={
          <div>
            <p style={{ margin: '8px 0' }}>
              Zero Token 通过浏览器登录的方式捕获各大 AI 平台的认证凭证（Cookie + Bearer Token），
              然后直接调用其 Web API，无需购买昂贵的 API Token。
            </p>
            <p style={{ margin: '8px 0' }}>
              <strong>支持的平台：</strong>DeepSeek、Qwen、Kimi、Claude、ChatGPT、豆包、Gemini、Grok、GLM、小米 MiMo 等
            </p>
            <p style={{ margin: '8px 0' }}>
              <strong>前提条件：</strong>需要先安装并运行 OpenClaw Zero Token 网关服务
            </p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card title={<Space><GatewayOutlined />网关配置</Space>}>
        <Form form={form} layout="vertical">
          <Form.Item
            name="gatewayUrl"
            label="网关地址"
            rules={[{ required: true, message: '请输入网关地址' }]}
          >
            <Input placeholder="http://127.0.0.1:3001" />
          </Form.Item>

          <Form.Item
            name="gatewayToken"
            label="网关 Token"
            extra="可选：网关访问令牌"
          >
            <Input.Password placeholder="留空则无需认证" />
          </Form.Item>
        </Form>

        <Space>
          <Button
            type="primary"
            icon={<ApiOutlined />}
            onClick={handleTestConnection}
            loading={connectionStatus === 'testing'}
          >
            测试连接
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleLoadModels}
            loading={loadingModels}
          >
            加载模型列表
          </Button>
          {connectionStatus === 'success' && (
            <Tag icon={<CheckCircleOutlined />} color="success">已连接</Tag>
          )}
          {connectionStatus === 'failed' && (
            <Tag icon={<CloseCircleOutlined />} color="error">连接失败</Tag>
          )}
        </Space>
      </Card>

      {providers.length > 0 && (
        <Card title={<Space><KeyOutlined />选择模型</Space>} style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <Text strong>选择提供商：</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {providers.map(provider => (
                <Tag
                  key={provider.id}
                  color={selectedProvider === provider.id ? 'blue' : 'default'}
                  style={{ padding: '4px 12px', cursor: 'pointer', fontSize: 14 }}
                  onClick={() => handleProviderChange(provider.id)}
                >
                  {getProviderIcon(provider.id)} {provider.name} ({provider.models.length})
                </Tag>
              ))}
            </div>
          </div>

          {selectedProvider && models.length > 0 && (
            <div>
              <Text strong>选择模型：</Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {models.map(model => (
                  <Tag
                    key={model.id}
                    color={selectedModel === model.id ? 'green' : 'default'}
                    style={{ padding: '4px 12px', cursor: 'pointer' }}
                    onClick={() => handleModelChange(model.id)}
                  >
                    {model.name}
                    {model.reasoning && ' 🧠'}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          <Divider />

          <Space>
            <Button type="primary" onClick={handleSave} loading={saving}>
              保存配置
            </Button>
            {selectedProvider && selectedModel && (
              <Tag color="green">
                当前选择：{selectedProvider}/{selectedModel}
              </Tag>
            )}
          </Space>
        </Card>
      )}

      <Card title="已配置的提供商" style={{ marginTop: 16 }}>
        {providers.length === 0 ? (
          <Text type="secondary">暂无已配置的提供商，请先点击"加载模型列表"</Text>
        ) : (
          <List
            dataSource={providers}
            renderItem={provider => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Avatar size="large" style={{ background: '#1890ff' }}>
                      {getProviderIcon(provider.id)}
                    </Avatar>
                  }
                  title={
                    <Space>
                      {provider.name}
                      <Badge status={getStatusColor(provider.status) as any} text={provider.status === 'configured' ? '已配置' : provider.status} />
                    </Space>
                  }
                  description={
                    <Space wrap>
                      {provider.models.slice(0, 5).map(m => (
                        <Tag key={m.id}>{m.name}</Tag>
                      ))}
                      {provider.models.length > 5 && <Tag>+{provider.models.length - 5} 更多</Tag>}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Card title="关于" style={{ marginTop: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="版本">OpenClaw Zero Token</Descriptions.Item>
          <Descriptions.Item label="项目地址">github.com/linuxhsj/openclaw-zero-token</Descriptions.Item>
          <Descriptions.Item label="集成方式">HTTP Gateway API</Descriptions.Item>
          <Descriptions.Item label=" License">MIT</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default ZeroTokenSettings;
