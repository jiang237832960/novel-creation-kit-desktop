import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, Space, Divider, Tag, message, Alert, List, Avatar, Descriptions, Modal, Tabs, Select, Tooltip, Spin } from 'antd';
import { ApiOutlined, CheckCircleOutlined, CloseCircleOutlined, GatewayOutlined, KeyOutlined, LoginOutlined, RobotOutlined, DeleteOutlined, CloudOutlined, DesktopOutlined, ReloadOutlined } from '@ant-design/icons';
import { useSettingsStore } from '../stores';
import type { ZeroTokenProvider } from '../types';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

interface ProviderCredentials {
  cookie: string;
  bearer?: string;
  userAgent?: string;
}

interface RemoteGateway {
  url: string;
  token?: string;
}

const PROVIDER_DISPLAY: Record<string, { icon: string; color: string }> = {
  'deepseek-web': { icon: '🔵', color: '#1890ff' },
  'claude-web': { icon: '🟣', color: '#722ed1' },
  'chatgpt-web': { icon: '🟢', color: '#52c41a' },
  'gemini-web': { icon: '🟡', color: '#faad14' },
  'qwen-web': { icon: '🟠', color: '#fa8c16' },
  'kimi-web': { icon: '🌙', color: '#8c8c8c' },
  'doubao-web': { icon: '🐰', color: '#eb6f5e' },
};

const ZeroTokenSettings: React.FC = () => {
  const { zeroTokenConfig, setZeroTokenConfig, setLlmConfig } = useSettingsStore();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState<ZeroTokenProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [models, setModels] = useState<{ id: string; name: string; contextWindow: number; maxTokens: number; reasoning?: boolean }[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [gatewayStatus, setGatewayStatus] = useState<'stopped' | 'starting' | 'running' | 'error'>('stopped');
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authProvider, setAuthProvider] = useState<string>('');
  const [credentials, setCredentials] = useState<ProviderCredentials>({ cookie: '', bearer: '', userAgent: '' });
  const [authStatus, setAuthStatus] = useState<{ provider: string; authenticated: boolean }[]>([]);
  const [authLoading, setAuthLoading] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [hasChromeExtension, setHasChromeExtension] = useState(false);
  const [mode, setMode] = useState<'electron' | 'web' | 'chrome-extension'>('electron');
  const [remoteGateway, setRemoteGateway] = useState<RemoteGateway>({ url: '' });
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ provider: string; success: boolean; message: string } | null>(null);

  useEffect(() => {
    const electron = !!window.electronAPI;
    setIsElectron(electron);
    
    // 检测 Chrome 插件
    const checkChromeExtension = () => {
      // @ts-ignore
      const hasExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
      setHasChromeExtension(!!hasExtension);
      if (hasExtension) {
        setMode('chrome-extension');
      } else if (electron) {
        setMode('electron');
      } else {
        setMode('web');
      }
    };
    
    checkChromeExtension();
    form.setFieldsValue({
      gatewayToken: zeroTokenConfig.gatewayToken,
    });
  }, [zeroTokenConfig, form]);

  useEffect(() => {
    if (mode === 'electron') {
      checkGatewayStatus();
    } else if (mode === 'web' || mode === 'chrome-extension') {
      loadProvidersFromWeb();
    }
    if (mode === 'chrome-extension') {
      loadAuthStatusFromExtension();
    }
  }, [mode]);

  const loadProvidersFromWeb = () => {
    const defaultProviders: ZeroTokenProvider[] = [
      { id: 'deepseek-web', name: 'DeepSeek', baseUrl: 'https://chat.deepseek.com', apiPath: '/api/v1/chat/completions', loginUrl: 'https://chat.deepseek.com', status: 'configured', models: [
        { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'deepseek-web', contextWindow: 64000, maxTokens: 4096 },
        { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', provider: 'deepseek-web', contextWindow: 64000, maxTokens: 8192, reasoning: true },
      ]},
      { id: 'claude-web', name: 'Claude Web', baseUrl: 'https://claude.ai', apiPath: '/api/chat/completions', loginUrl: 'https://claude.ai', status: 'configured', models: [
        { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4', provider: 'claude-web', contextWindow: 195000, maxTokens: 8192 },
      ]},
      { id: 'qwen-web', name: 'Qwen', baseUrl: 'https://chat.qwen.ai', apiPath: '/api/v1/chat/completions', loginUrl: 'https://chat.qwen.ai', status: 'configured', models: [
        { id: 'qwen-plus', name: 'Qwen Plus', provider: 'qwen-web', contextWindow: 32000, maxTokens: 4096 },
      ]},
      { id: 'kimi-web', name: 'Kimi', baseUrl: 'https://kimi.moonshot.cn', apiPath: '/api/v1/chat/completions', loginUrl: 'https://kimi.moonshot.cn', status: 'configured', models: [
        { id: 'moonshot-v1-8k', name: 'Moonshot V1 8K', provider: 'kimi-web', contextWindow: 8000, maxTokens: 4096 },
      ]},
      { id: 'doubao-web', name: '豆包', baseUrl: 'https://www.doubao.com', apiPath: '/api/v1/chat/completions', loginUrl: 'https://www.doubao.com', status: 'configured', models: [
        { id: 'doubao-seed-2.0', name: '豆包 Seed 2.0', provider: 'doubao-web', contextWindow: 63000, maxTokens: 4096 },
      ]},
    ];
    setProviders(defaultProviders);
    const storedAuth = localStorage.getItem('zero-token-auth');
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth);
        const status = Object.entries(parsed).map(([provider, cred]) => ({
          provider,
          authenticated: !!(cred as ProviderCredentials)?.cookie,
        }));
        setAuthStatus(status);
      } catch {}
    }
  };

  const checkGatewayStatus = async () => {
    if (!window.electronAPI) return;
    const status = await window.electronAPI.zeroToken.status();
    if (status.success && status.isRunning) {
      setGatewayStatus('running');
      loadProviders();
      loadAuthStatus();
    } else {
      setGatewayStatus('stopped');
    }
  };

  const handleStartGateway = async () => {
    if (!window.electronAPI) {
      message.error('Electron API 不可用');
      return;
    }

    try {
      setGatewayStatus('starting');
      const values = await form.validateFields();

      const result = await window.electronAPI.zeroToken.start(
        3001,
        values.gatewayToken || ''
      );

      if (result.success) {
        setGatewayStatus('running');
        message.success('Zero Token 网关已启动！');
        loadProviders();
        loadAuthStatus();
        setLlmConfig({ provider: 'zero-token' });
      } else {
        setGatewayStatus('error');
        message.error(result.error || '启动失败');
      }
    } catch (error) {
      setGatewayStatus('error');
      message.error('启动网关失败');
    }
  };

  const handleStopGateway = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.zeroToken.stop();
    if (result.success) {
      setGatewayStatus('stopped');
      message.success('网关已停止');
    }
  };

  const loadProviders = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.zeroToken.getProviders();
    if (result.success && result.providers) {
      const mappedProviders: ZeroTokenProvider[] = result.providers.map(p => ({
        id: p.id,
        name: p.name,
        baseUrl: p.baseUrl,
        apiPath: p.apiPath,
        loginUrl: (p as any).loginUrl,
        status: 'configured' as const,
        models: p.models.map(m => ({
          id: m.id,
          name: m.name,
          provider: p.id,
          contextWindow: m.contextWindow,
          maxTokens: m.maxTokens,
          reasoning: m.reasoning,
        })),
      }));
      setProviders(mappedProviders);
    }
  };

  const loadAuthStatus = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.zeroToken.getAuthStatus();
    if (result.success && result.status) {
      setAuthStatus(result.status);
    }
  };

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      setModels(provider.models);
      if (provider.models.length > 0) {
        setSelectedModel(provider.models[0].id);
      }
    }
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
  };

  const handleSave = async () => {
    if (!selectedProvider || !selectedModel) {
      message.error('请选择提供商和模型');
      return;
    }

    setSaving(true);
    try {
      const modelId = `${selectedProvider}/${selectedModel}`;
      const gatewayUrl = mode === 'electron' ? 'http://127.0.0.1:3001' : remoteGateway.url;

      setZeroTokenConfig({
        gatewayUrl,
        activeProvider: selectedProvider,
        activeModel: modelId,
      });
      setLlmConfig({
        provider: 'zero-token',
        model: modelId,
      });
      message.success('配置已保存');
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleStartAuth = async (providerId: string) => {
    if (!window.electronAPI) return;

    setAuthLoading(true);
    setAuthProvider(providerId);

    try {
      const result = await window.electronAPI.zeroToken.startAuth(providerId);
      if (result.success) {
        message.success('登录窗口已打开，请在窗口中登录');
        Modal.confirm({
          title: '登录完成后',
          content: '请在打开的登录窗口中完成登录，然后点击下方「已完成登录」按钮',
          okText: '已完成登录',
          cancelText: '取消',
          onOk: handleCaptureCredentials,
          onCancel: () => {
            window.electronAPI?.zeroToken.closeAuthWindow();
          },
        });
      } else {
        message.error(result.error || '打开登录窗口失败');
      }
    } catch (error) {
      message.error('打开登录窗口失败');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCaptureCredentials = async () => {
    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.zeroToken.captureCredentials(authProvider);
      if (result.success) {
        message.success('凭证捕获成功！');
        loadAuthStatus();
      } else {
        message.error(result.error || '凭证捕获失败，请确保已登录');
      }
    } catch (error) {
      message.error('凭证捕获失败');
    }
  };

  const handleClearCredentials = async (providerId: string) => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.zeroToken.clearCredentials(providerId);
    if (result.success) {
      message.success('凭证已清除');
      loadAuthStatus();
    }
  };

  const handleSaveWebCredentials = () => {
    if (!credentials.cookie) {
      message.error('请输入 Cookie');
      return;
    }

    const stored = JSON.parse(localStorage.getItem('zero-token-auth') || '{}');
    stored[authProvider] = credentials;
    localStorage.setItem('zero-token-auth', JSON.stringify(stored));

    const status = { provider: authProvider, authenticated: true };
    setAuthStatus(prev => {
      const filtered = prev.filter(s => s.provider !== authProvider);
      return [...filtered, status];
    });

    message.success('凭证已保存');
    setAuthModalVisible(false);
    setCredentials({ cookie: '', bearer: '', userAgent: '' });
  };

  const loadAuthStatusFromExtension = async () => {
    try {
      // @ts-ignore
      const response = await chrome.runtime.sendMessage({ action: 'getAuthStatus' });
      if (response.success && response.status) {
        const status = response.status.map((s: any) => ({
          provider: s.id,
          authenticated: s.authenticated,
        }));
        setAuthStatus(status);
      }
    } catch (error) {
      console.error('Failed to load auth status from extension:', error);
    }
  };

  const handleClearWebCredentials = (providerId: string) => {
    const stored = JSON.parse(localStorage.getItem('zero-token-auth') || '{}');
    delete stored[providerId];
    localStorage.setItem('zero-token-auth', JSON.stringify(stored));

    setAuthStatus(prev => prev.filter(s => s.provider !== providerId));
    message.success('凭证已清除');
  };

  const handleOpenAuthModal = (providerId: string) => {
    setAuthProvider(providerId);
    const stored = JSON.parse(localStorage.getItem('zero-token-auth') || '{}');
    setCredentials(stored[providerId] || { cookie: '', bearer: '', userAgent: '' });
    setAuthModalVisible(true);
  };

  const handleTestConnection = async (providerId: string) => {
    setTestingProvider(providerId);
    setTestResult(null);

    try {
      const provider = providers.find(p => p.id === providerId);
      if (!provider) {
        setTestResult({ provider: providerId, success: false, message: '未找到提供商' });
        return;
      }

      const model = provider.models[0];
      if (!model) {
        setTestResult({ provider: providerId, success: false, message: '未找到模型' });
        return;
      }

      // Chrome 插件模式
      if (mode === 'chrome-extension') {
        try {
          // @ts-ignore
          const response = await chrome.runtime.sendMessage({
            action: 'proxyRequest',
            data: {
              providerId: providerId.replace('-web', ''), // 去掉 -web 后缀
              body: {
                model: `${providerId.replace('-web', '')}/${model.id}`,
                messages: [{ role: 'user', content: '你好，请回复"测试成功"' }],
                stream: false,
              },
            },
          });

          if (response.success) {
            const data = JSON.parse(response.result.body);
            const content = data.choices?.[0]?.message?.content || data.content?.[0]?.text || '';
            setTestResult({ provider: providerId, success: true, message: `测试成功！AI 回复: ${content.slice(0, 50)}...` });
            message.success('模型测试成功！');
          } else {
            setTestResult({ provider: providerId, success: false, message: `测试失败: ${response.error}` });
            message.error(`测试失败: ${response.error}`);
          }
        } catch (error) {
          setTestResult({ provider: providerId, success: false, message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}` });
          message.error('测试失败');
        }
        return;
      }

      const gatewayUrl = mode === 'electron' ? 'http://127.0.0.1:3001' : remoteGateway.url;
      
      if (!gatewayUrl) {
        setTestResult({ provider: providerId, success: false, message: '请先填写网关地址' });
        message.error('请先填写网关地址');
        return;
      }

      const testMessage = {
        model: `${providerId}/${model.id}`,
        messages: [{ role: 'user', content: '你好，请回复"测试成功"' }],
        stream: false,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (remoteGateway.token) {
        headers['Authorization'] = `Bearer ${remoteGateway.token}`;
      }

      const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(testMessage),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || data.content?.[0]?.text || '';
        setTestResult({ provider: providerId, success: true, message: `测试成功！AI 回复: ${content.slice(0, 50)}...` });
        message.success('模型测试成功！');
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || `HTTP ${response.status}`;
        setTestResult({ provider: providerId, success: false, message: `测试失败: ${errorMsg}` });
        message.error(`测试失败: ${errorMsg}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '网络错误';
      setTestResult({ provider: providerId, success: false, message: `测试失败: ${errorMsg}` });
      message.error(`测试失败: ${errorMsg}`);
    } finally {
      setTestingProvider(null);
    }
  };

  const getProviderIcon = (providerId: string) => PROVIDER_DISPLAY[providerId]?.icon || '🤖';
  const getProviderColor = (providerId: string) => PROVIDER_DISPLAY[providerId]?.color || '#1890ff';
  const getProviderName = (providerId: string) => providers.find(p => p.id === providerId)?.name || providerId;
  const isProviderAuthenticated = (providerId: string) => authStatus.find(s => s.provider === providerId)?.authenticated || false;

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Zero Token 设置</Title>
        <Text type="secondary">通过浏览器凭证免费使用各大 AI 模型</Text>
      </div>

      <Alert
        message="Zero Token 是什么？"
        description={
          <div>
            <p style={{ margin: '8px 0' }}>
              Zero Token 通过获取各大 AI 平台的登录凭证，直接调用其 Web API，无需购买昂贵的 API Token。
            </p>
            <p style={{ margin: '8px 0' }}>
              <strong>支持的平台：</strong>DeepSeek、Qwen、Kimi、Claude、ChatGPT、豆包、Gemini 等
            </p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {(isElectron || hasChromeExtension) && (
        <Card title={<Space><DesktopOutlined />运行模式</Space>} style={{ marginBottom: 16 }}>
          <Space wrap>
            {isElectron && (
              <Button
                type={mode === 'electron' ? 'primary' : 'default'}
                icon={<DesktopOutlined />}
                onClick={() => setMode('electron')}
              >
                桌面版（内置网关）
              </Button>
            )}
            
            {hasChromeExtension && (
              <Button
                type={mode === 'chrome-extension' ? 'primary' : 'default'}
                icon={<ApiOutlined />}
                onClick={() => setMode('chrome-extension')}
              >
                Chrome 插件（推荐）
              </Button>
            )}
            
            <Tooltip title="Web 版需要部署网关服务或连接已有网关">
              <Button
                type={mode === 'web' ? 'primary' : 'default'}
                icon={<CloudOutlined />}
                onClick={() => setMode('web')}
              >
                Web 版（连接网关）
              </Button>
            </Tooltip>
          </Space>
        </Card>
      )}

      {mode === 'electron' && (
        <Card title={<Space><GatewayOutlined />Zero Token 网关</Space>} style={{ marginBottom: 16 }}>
          <Form form={form} layout="vertical">
            <Form.Item
              name="gatewayToken"
              label="网关访问令牌"
              extra="可选：设置后访问网关需要提供此令牌"
            >
              <Input.Password placeholder="留空则无需认证" />
            </Form.Item>
          </Form>

          <Space>
            {gatewayStatus === 'stopped' && (
              <Button type="primary" icon={<ApiOutlined />} onClick={handleStartGateway}>
                启动网关
              </Button>
            )}
            {gatewayStatus === 'running' && (
              <>
                <Tag icon={<CheckCircleOutlined />} color="success">网关运行中</Tag>
                <Button icon={<CloseCircleOutlined />} onClick={handleStopGateway} danger>
                  停止网关
                </Button>
              </>
            )}
            {gatewayStatus === 'starting' && (
              <Tag icon={<ApiOutlined />} color="processing">启动中...</Tag>
            )}
            {gatewayStatus === 'error' && (
              <>
                <Tag icon={<CloseCircleOutlined />} color="error">启动失败</Tag>
                <Button type="primary" onClick={handleStartGateway}>重试</Button>
              </>
            )}
          </Space>
        </Card>
      )}

      {mode === 'web' && (
        <Card title={<Space><CloudOutlined />连接远程网关</Space>} style={{ marginBottom: 16 }}>
          <Alert
            message="Web 版需要连接 ZeroToken 网关服务"
            description={
              <div>
                <p style={{ margin: '4px 0' }}>1. 部署 ZeroToken 网关服务（或使用已有的兼容服务）</p>
                <p style={{ margin: '4px 0' }}>2. 填入网关地址并点击保存</p>
                <p style={{ margin: '4px 0' }}>3. 或在下方「管理登录」中手动输入 Cookie</p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input
              placeholder="网关地址，如 http://localhost:3001 或 https://your-gateway.com"
              value={remoteGateway.url}
              onChange={e => setRemoteGateway({ ...remoteGateway, url: e.target.value })}
              addonBefore="网关 URL"
            />
            <Input
              placeholder="可选：网关访问令牌"
              value={remoteGateway.token || ''}
              onChange={e => setRemoteGateway({ ...remoteGateway, token: e.target.value })}
              addonBefore="令牌"
            />
          </Space>
        </Card>
      )}

      {mode === 'chrome-extension' && (
        <Card title={<Space><ApiOutlined />Chrome 插件模式</Space>} style={{ marginBottom: 16 }}>
          <Alert
            message="通过 Chrome 插件代理请求"
            description={
              <div>
                <p style={{ margin: '4px 0' }}>1. 请确保已安装 ZeroToken Chrome 插件</p>
                <p style={{ margin: '4px 0' }}>2. 在 Chrome 中登录对应的 AI 网站</p>
                <p style={{ margin: '4px 0' }}>3. 插件会自动获取 Cookie 并代理请求</p>
              </div>
            }
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        </Card>
      )}

      {(gatewayStatus === 'running' || mode === 'web' || mode === 'chrome-extension') && providers.length > 0 && (
        <>
          <Card title={<Space><KeyOutlined />AI 提供商</Space>} style={{ marginBottom: 16 }}>
            <Tabs defaultActiveKey="providers">
              <TabPane tab="选择模型" key="providers">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  {providers.map(provider => (
                    <Card
                      key={provider.id}
                      size="small"
                      style={{
                        width: 160,
                        cursor: 'pointer',
                        border: selectedProvider === provider.id ? `2px solid ${getProviderColor(provider.id)}` : '1px solid #f0f0f0',
                        opacity: isProviderAuthenticated(provider.id) ? 1 : 0.6,
                      }}
                      onClick={() => handleProviderSelect(provider.id)}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 32 }}>{getProviderIcon(provider.id)}</div>
                        <div style={{ fontWeight: 'bold', marginTop: 8 }}>{provider.name}</div>
                        <div style={{ fontSize: 12, color: '#999' }}>{provider.models.length} 个模型</div>
                        {isProviderAuthenticated(provider.id) ? (
                          <Tag color="green" style={{ marginTop: 4 }}>已认证</Tag>
                        ) : (
                          <Tag color="orange" style={{ marginTop: 4 }}>未登录</Tag>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                {selectedProvider && models.length > 0 && (
                  <div>
                    <Text strong>选择模型：</Text>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {models.map(model => (
                        <Tag
                          key={model.id}
                          color={selectedModel === model.id ? 'green' : 'default'}
                          style={{ padding: '4px 12px', cursor: 'pointer', fontSize: 14 }}
                          onClick={() => handleModelSelect(model.id)}
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
                  <Button type="primary" onClick={handleSave} loading={saving} disabled={!selectedProvider || !selectedModel}>
                    保存配置
                  </Button>
                  {selectedProvider && selectedModel && (
                    <Tag color="green">
                      当前选择：{selectedProvider}/{selectedModel}
                    </Tag>
                  )}
                </Space>
              </TabPane>

              <TabPane tab="管理登录" key="auth">
                <Alert
                  message={mode === 'electron' ? '点击平台的「登录」按钮，在打开的窗口中完成登录' : '点击平台旁边的「设置」按钮，手动输入 Cookie'}
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                <List
                  dataSource={providers}
                  renderItem={provider => (
                    <List.Item
                      actions={[
                        mode === 'electron' ? (
                          <Button
                            key="auth"
                            size="small"
                            type={isProviderAuthenticated(provider.id) ? 'default' : 'primary'}
                            icon={<LoginOutlined />}
                            loading={authLoading && authProvider === provider.id}
                            onClick={() => handleStartAuth(provider.id)}
                          >
                            {isProviderAuthenticated(provider.id) ? '重新登录' : '登录'}
                          </Button>
                        ) : (
                          <Button
                            key="set"
                            size="small"
                            type={isProviderAuthenticated(provider.id) ? 'default' : 'primary'}
                            icon={<KeyOutlined />}
                            onClick={() => handleOpenAuthModal(provider.id)}
                          >
                            {isProviderAuthenticated(provider.id) ? '更新' : '设置'}
                          </Button>
                        ),
                        isProviderAuthenticated(provider.id) && (
                          <Button
                            key="test"
                            size="small"
                            icon={testingProvider === provider.id ? <Spin size="small" /> : <ReloadOutlined />}
                            onClick={() => handleTestConnection(provider.id)}
                            disabled={testingProvider !== null}
                          >
                            测试
                          </Button>
                        ),
                        isProviderAuthenticated(provider.id) && (
                          <Button
                            key="clear"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => mode === 'electron' ? handleClearCredentials(provider.id) : handleClearWebCredentials(provider.id)}
                          />
                        ),
                      ].filter(Boolean)}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar size="large" style={{ background: getProviderColor(provider.id) }}>
                            {getProviderIcon(provider.id)}
                          </Avatar>
                        }
                        title={getProviderName(provider.id)}
                        description={
                          isProviderAuthenticated(provider.id) 
                            ? <Tag color="success">已登录</Tag>
                            : <Text type="secondary">未登录</Text>
                        }
                      />
                    </List.Item>
                  )}
                />

                {testResult && (
                  <Alert
                    message={`${getProviderName(testResult.provider)} 测试结果`}
                    description={testResult.message}
                    type={testResult.success ? 'success' : 'error'}
                    showIcon
                    style={{ marginTop: 16 }}
                  />
                )}
              </TabPane>
            </Tabs>
          </Card>
        </>
      )}

      <Card title="关于">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="版本">Integrated Zero Token v1.0</Descriptions.Item>
          <Descriptions.Item label="桌面版">Electron + BrowserWindow</Descriptions.Item>
          <Descriptions.Item label="Web 版">连接网关服务 + 手动 Cookie</Descriptions.Item>
          <Descriptions.Item label=" License">MIT</Descriptions.Item>
        </Descriptions>
      </Card>

      <Modal
        title={<Space><RobotOutlined /> 设置 {getProviderName(authProvider)} 凭证</Space>}
        open={authModalVisible}
        onOk={handleSaveWebCredentials}
        onCancel={() => setAuthModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Alert
          message="如何获取 Cookie？"
          description={
            <div>
              <p style={{ margin: '4px 0' }}>1. 在浏览器新标签页打开 {getProviderName(authProvider)}</p>
              <p style={{ margin: '4px 0' }}>2. 登录你的账号</p>
              <p style={{ margin: '4px 0' }}>3. 按 F12 打开开发者工具</p>
              <p style={{ margin: '4px 0' }}>4. 在 Application / Storage → Cookies 中找到 Cookie</p>
              <p style={{ margin: '4px 0' }}>5. 复制 Cookie 值粘贴到下方</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form layout="vertical">
          <Form.Item label="Cookie" required extra="从开发者工具中复制完整的 Cookie 字符串">
            <Input.TextArea
              value={credentials.cookie}
              onChange={e => setCredentials({ ...credentials, cookie: e.target.value })}
              placeholder="cookie_value_here"
              rows={4}
            />
          </Form.Item>

          <Form.Item label="Bearer Token (可选)" extra="某些平台需要，如 ChatGPT">
            <Input
              value={credentials.bearer}
              onChange={e => setCredentials({ ...credentials, bearer: e.target.value })}
              placeholder="Bearer token (如果有)"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ZeroTokenSettings;