import React, { useState } from 'react';
import { Card, Form, Input, Select, Slider, Button, Typography, Space, Divider, Tag, message, Alert, Descriptions, Tabs } from 'antd';
import { SaveOutlined, ApiOutlined, CheckCircleOutlined, CloseCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../stores';
import { llmService } from '../services/llm';
import type { LLMConfig } from '../types';

const { Title, Text } = Typography;
const { Option } = Select;

const Settings: React.FC = () => {
  const { llmConfig, setLlmConfig } = useSettingsStore();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

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
      llmService.setConfig(values);
      
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
      message.error(`连接失败`);
    }
  };

  const isCustomProvider = llmConfig.provider === 'custom';
  const isZeroTokenProvider = llmConfig.provider === 'zero-token';

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>设置</Title>
        <Text type="secondary">配置 API 连接和系统选项</Text>
      </div>

      <Tabs
        defaultActiveKey="api"
        items={[
          {
            key: 'api',
            label: <span><ApiOutlined /> API 配置</span>,
            children: (
              <Card>
                <Form form={form} layout="vertical" initialValues={llmConfig}>
                  <Form.Item name="provider" label="API 提供商" rules={[{ required: true }]}>
                    <Select placeholder="选择 API 提供商">
                      <Option value="openai">OpenAI (GPT-4, GPT-3.5)</Option>
                      <Option value="claude">Claude (Anthropic)</Option>
                      <Option value="custom">自定义 API</Option>
                      <Option value="zero-token">
                        <Space>
                          <ThunderboltOutlined style={{ color: '#faad14' }} />
                          <span>Zero Token (免费)</span>
                        </Space>
                      </Option>
                    </Select>
                  </Form.Item>

                  {!isZeroTokenProvider && (
                    <>
                      <Form.Item name="apiKey" label="API Key" rules={[{ required: !isZeroTokenProvider, message: '请输入 API Key' }]}>
                        <Input.Password placeholder="sk-..." />
                      </Form.Item>

                      <Form.Item
                        name="endpoint"
                        label="API Endpoint"
                        extra={isCustomProvider ? '必填：输入你的 API 端点地址' : '可选：使用代理或自定义端点'}
                      >
                        <Input
                          placeholder={isCustomProvider ? 'http://localhost:11434/v1' : 'https://api.openai.com/v1'}
                          disabled={!isCustomProvider}
                        />
                      </Form.Item>
                    </>
                  )}

                  {isZeroTokenProvider && (
                    <Alert
                      message="Zero Token 配置"
                      description={
                        <Space direction="vertical">
                          <Text>Zero Token 通过浏览器凭证调用 AI 模型，无需 API Key。</Text>
                          <Button type="link" onClick={() => navigate('/settings/zero-token')} style={{ padding: 0, height: 'auto' }}>
                            点击这里配置 Zero Token →
                          </Button>
                        </Space>
                      }
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  )}

                  <Form.Item name="model" label="模型" rules={[{ required: true }]}>
                    {isCustomProvider ? (
                      <Input placeholder="输入模型名称，如 llama3, qwen, gpt-4" />
                    ) : (
                      <Select placeholder="选择模型" showSearch>
                        {llmConfig.provider === 'openai' && (
                          <>
                            <Option value="gpt-4">gpt-4</Option>
                            <Option value="gpt-4-turbo">gpt-4-turbo</Option>
                            <Option value="gpt-3.5-turbo">gpt-3.5-turbo</Option>
                          </>
                        )}
                        {llmConfig.provider === 'claude' && (
                          <>
                            <Option value="claude-3-opus">claude-3-opus</Option>
                            <Option value="claude-3-sonnet">claude-3-sonnet</Option>
                            <Option value="claude-3-5-sonnet">claude-3-5-sonnet</Option>
                          </>
                        )}
                      </Select>
                    )}
                  </Form.Item>

                  <Form.Item name="temperature" label="Temperature (创造性)">
                    <Slider min={0} max={2} step={0.1} marks={{ 0: '0', 1: '1', 2: '2' }} />
                  </Form.Item>

                  <Form.Item name="maxTokens" label="最大生成长度">
                    <Slider min={500} max={8000} step={100} marks={{ 500: '500', 2000: '2000', 4000: '4000', 8000: '8000' }} />
                  </Form.Item>
                </Form>

                <Divider />

                <Space>
                  <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
                    保存
                  </Button>
                  {!isZeroTokenProvider && (
                    <Button icon={<ApiOutlined />} onClick={handleTestConnection} loading={testStatus === 'testing'}>
                      测试连接
                    </Button>
                  )}
                  {testStatus === 'success' && <Tag icon={<CheckCircleOutlined />} color="success">连接成功</Tag>}
                  {testStatus === 'failed' && <Tag icon={<CloseCircleOutlined />} color="error">连接失败</Tag>}
                </Space>
              </Card>
            ),
          },
          {
            key: 'zero-token',
            label: <span><ThunderboltOutlined /> Zero Token</span>,
            children: (
              <Card>
                <ZeroTokenSettingsInline />
              </Card>
            ),
          },
        ]}
      />

      <Card title="关于" style={{ marginTop: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="版本">Novel Creation Kit v1.0.0</Descriptions.Item>
          <Descriptions.Item label="技术栈">Electron + React + TypeScript</Descriptions.Item>
          <Descriptions.Item label="核心功能">12-Agent 协作 / 7 Truth Files / 33 维度审计</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

const ZeroTokenSettingsInline: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div>
      <Alert
        message="Zero Token 是什么？"
        description="Zero Token 让你无需 API Key 即可使用 DeepSeek、Claude、Qwen、Kimi 等多种 AI 模型。通过浏览器登录捕获凭证，完全免费！"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Button type="primary" onClick={() => navigate('/settings/zero-token')}>
        前往 Zero Token 设置页面
      </Button>
    </div>
  );
};

export default Settings;
