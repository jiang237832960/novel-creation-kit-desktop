import React from 'react';
import { Card, Form, Input, Select, Slider, Button, Typography, Space, Divider, Tag, message, Alert, Collapse, InputNumber, Switch, Tooltip } from 'antd';
import { SaveOutlined, ApiOutlined, GlobalOutlined, CheckCircleOutlined, CloseCircleOutlined, QuestionCircleOutlined, RocketOutlined } from '@ant-design/icons';
import { useSettingsStore } from '../stores';
import { llmService } from '../services/llm';
import type { LLMConfig } from '../types';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI', icon: '🤖', models: ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'] },
  { value: 'claude', label: 'Claude (Anthropic)', icon: '🧠', models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-5-sonnet-20241022', 'claude-2.1'] },
  { value: 'custom', label: '自定义 API', icon: '⚙️', models: [] },
];

const PRESET_TEMPLATES = [
  { name: 'OpenAI 标准', provider: 'openai', endpoint: '', model: 'gpt-4', temperature: 0.7, maxTokens: 2000 },
  { name: 'Claude 标准', provider: 'claude', endpoint: '', model: 'claude-3-sonnet-20240229', temperature: 0.7, maxTokens: 2000 },
  { name: 'Ollama 本地', provider: 'custom', endpoint: 'http://localhost:11434/v1', model: 'llama3', temperature: 0.7, maxTokens: 2000 },
  { name: 'Groq 加速', provider: 'custom', endpoint: 'https://api.groq.com/openai/v1', model: 'llama-3.1-70b-versatile', temperature: 0.7, maxTokens: 2000 },
];

const Settings: React.FC = () => {
  const { llmConfig, setLlmConfig } = useSettingsStore();
  const [form] = Form.useForm();
  const [saving, setSaving] = React.useState(false);
  const [testStatus, setTestStatus] = React.useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const currentProvider = PROVIDERS.find(p => p.value === llmConfig.provider) || PROVIDERS[0];

  const handleSave = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();
      setLlmConfig(values);
      llmService.setConfig(values);
      message.success('设置已保存');
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTestStatus('testing');
      const values = await form.validateFields();
      const tempConfig: Partial<LLMConfig> = { ...values };
      llmService.setConfig(tempConfig);
      
      const response = await llmService.sendMessage([
        { role: 'user', content: 'Hi' }
      ]);
      
      if (response.success) {
        setTestStatus('success');
        message.success('API 连接成功！');
      } else {
        setTestStatus('failed');
        message.error(`连接失败: ${response.error}`);
      }
    } catch (error) {
      setTestStatus('failed');
      message.error(`连接失败: ${error}`);
    }
  };

  const handleProviderChange = (value: string) => {
    const provider = PROVIDERS.find(p => p.value === value);
    if (provider && provider.models.length > 0) {
      form.setFieldsValue({ model: provider.models[0] });
    }
    setTestStatus('idle');
  };

  const handleTemplateSelect = (template: typeof PRESET_TEMPLATES[0]) => {
    form.setFieldsValue(template);
    setLlmConfig(template);
    llmService.setConfig(template);
    message.success(`已加载模板: ${template.name}`);
  };

  const isCustomProvider = llmConfig.provider === 'custom';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Title level={2}>设置</Title>

      <Space direction="vertical" style={{ width: '100%' }} size="large">
        
        <Card
          title={
            <Space>
              <RocketOutlined />
              <span>快速配置模板</span>
            </Space>
          }
          extra={<Text type="secondary">选择预设模板快速开始</Text>}
        >
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {PRESET_TEMPLATES.map((template) => (
              <Button
                key={template.name}
                onClick={() => handleTemplateSelect(template)}
                style={{ 
                  height: 'auto', 
                  padding: '12px 16px',
                  textAlign: 'left',
                  borderColor: llmConfig.endpoint === template.endpoint ? '#1890ff' : undefined,
                }}
              >
                <div style={{ fontWeight: 600 }}>{template.name}</div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                  {template.provider === 'custom' ? template.endpoint : template.provider} / {template.model}
                </div>
              </Button>
            ))}
          </div>
        </Card>

        <Card
          title={
            <Space>
              <ApiOutlined />
              <span>API 配置</span>
            </Space>
          }
          extra={
            <Switch checked={showAdvanced} onChange={setShowAdvanced} checkedChildren="高级" unCheckedChildren="基础" />
          }
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={llmConfig}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item
                name="provider"
                label="API 提供商"
                rules={[{ required: true, message: '请选择提供商' }]}
              >
                <Select 
                  placeholder="选择 API 提供商"
                  onChange={handleProviderChange}
                  size="large"
                >
                  {PROVIDERS.map((p) => (
                    <Option key={p.value} value={p.value}>
                      <Space>
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="apiKey"
                label={
                  <Space>
                    API Key
                    <Tooltip title="在对应平台的控制台获取 API Key">
                      <QuestionCircleOutlined style={{ color: '#8c8c8c' }} />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: '请输入 API Key' }]}
              >
                <Input.Password 
                  placeholder="sk-..." 
                  size="large"
                  onChange={() => setTestStatus('idle')}
                />
              </Form.Item>
            </div>

            <Form.Item
              name="endpoint"
              label={
                <Space>
                  API Endpoint
                  {isCustomProvider && <Tag color="orange">必填</Tag>}
                </Space>
              }
              extra={
                isCustomProvider 
                  ? '输入你的 API 端点地址，例如 OpenAI 兼容接口'
                  : '可选：使用代理或自定义端点'
              }
              rules={isCustomProvider ? [{ required: true, message: '自定义 API 必须填写端点' }] : []}
            >
              <Input 
                placeholder={currentProvider.value === 'openai' ? 'https://api.openai.com/v1' : 'http://localhost:11434/v1'} 
                size="large"
              />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: isCustomProvider ? '1fr' : '1fr 1fr', gap: 16 }}>
              <Form.Item
                name="model"
                label="模型"
                rules={[{ required: true, message: '请选择或输入模型' }]}
              >
                {isCustomProvider ? (
                  <Input 
                    placeholder="输入模型名称，如 llama3、qwen、gpt-4" 
                    size="large"
                  />
                ) : (
                  <Select
                    placeholder="选择模型"
                    showSearch
                    size="large"
                    filterOption={(input, option) =>
                      (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {currentProvider.models.map((model) => (
                      <Option key={model} value={model}>{model}</Option>
                    ))}
                  </Select>
                )}
              </Form.Item>

              {!isCustomProvider && (
                <Form.Item
                  name="maxTokens"
                  label="最大生成长度"
                  extra={`当前: ${llmConfig.maxTokens || 2000} tokens`}
                >
                  <Slider 
                    min={500} 
                    max={8000} 
                    step={100}
                    value={llmConfig.maxTokens || 2000}
                    onChange={(value) => form.setFieldValue('maxTokens', value)}
                    marks={{ 500: '500', 2000: '2000', 4000: '4000', 8000: '8000' }}
                  />
                </Form.Item>
              )}
            </div>

            {showAdvanced && (
              <Collapse ghost style={{ marginTop: 16 }}>
                <Panel header="高级配置" key="advanced">
                  <Form.Item
                    name="temperature"
                    label={
                      <Space>
                        Temperature (创造性)
                        <Tooltip title="控制输出的随机性。0.0 更确定，1.0 更有创造性">
                          <QuestionCircleOutlined style={{ color: '#8c8c8c' }} />
                        </Tooltip>
                      </Space>
                    }
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <Slider 
                        min={0} 
                        max={2} 
                        step={0.1}
                        value={llmConfig.temperature ?? 0.7}
                        onChange={(value) => form.setFieldValue('temperature', value)}
                        marks={{ 0: '0', 0.5: '0.5', 1: '1.0', 1.5: '1.5', 2: '2.0' }}
                        style={{ flex: 1 }}
                      />
                      <Tag>{llmConfig.temperature ?? 0.7}</Tag>
                    </div>
                  </Form.Item>
                  
                  {isCustomProvider && (
                    <Form.Item
                      name="maxTokens"
                      label="最大生成长度"
                    >
                      <InputNumber 
                        min={100} 
                        max={128000} 
                        step={100}
                        value={llmConfig.maxTokens || 2000}
                        onChange={(value) => form.setFieldValue('maxTokens', value || 2000)}
                        style={{ width: '100%' }}
                        addonAfter="tokens"
                      />
                    </Form.Item>
                  )}
                </Panel>
              </Collapse>
            )}
          </Form>

          <Divider />

          <Space wrap>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              size="large"
            >
              保存配置
            </Button>
            <Button
              icon={<ApiOutlined />}
              onClick={handleTestConnection}
              loading={testStatus === 'testing'}
              size="large"
            >
              测试连接
            </Button>
            {testStatus === 'success' && (
              <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: 14, padding: '4px 12px' }}>
                连接成功
              </Tag>
            )}
            {testStatus === 'failed' && (
              <Tag icon={<CloseCircleOutlined />} color="error" style={{ fontSize: 14, padding: '4px 12px' }}>
                连接失败
              </Tag>
            )}
          </Space>
        </Card>

        <Card
          title={
            <Space>
              <GlobalOutlined />
              <span>全局公共资源库</span>
            </Space>
          }
        >
          <Paragraph>
            全局公共资源库存储所有类型化学习资产与技能规则。
          </Paragraph>
          
          <Tag>~/Documents/NovelCreationKit/global_resources/</Tag>

          <Alert
            message="功能说明"
            description="系统启动时自动加载全局资源库，新项目将根据小说类型自动适配对应的规则和模板。"
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        </Card>

        <Card title="关于">
          <Space direction="vertical">
            <Space>
              <Text strong>Novel Creation Kit</Text>
              <Tag color="blue">v1.0.0</Tag>
            </Space>
            <Text type="secondary">基于 InkOS 设计的多智能体小说创作系统</Text>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default Settings;
