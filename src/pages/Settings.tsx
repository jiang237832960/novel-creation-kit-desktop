import React, { useState } from 'react';
import { Card, Form, Input, Select, Slider, Button, Typography, Space, Divider, Tag, message, Alert, Descriptions } from 'antd';
import { SaveOutlined, ApiOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useSettingsStore } from '../stores';
import { llmService } from '../services/llm';
import type { LLMConfig } from '../types';

const { Title, Text } = Typography;
const { Option } = Select;

const Settings: React.FC = () => {
  const { llmConfig, setLlmConfig } = useSettingsStore();
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

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>设置</Title>
        <Text type="secondary">配置 API 连接和系统选项</Text>
      </div>

      <Card title={<Space><ApiOutlined />API 配置</Space>}>
        <Form form={form} layout="vertical" initialValues={llmConfig}>
          <Form.Item name="provider" label="API 提供商" rules={[{ required: true }]}>
            <Select placeholder="选择 API 提供商">
              <Option value="openai">OpenAI (GPT-4, GPT-3.5)</Option>
              <Option value="claude">Claude (Anthropic)</Option>
              <Option value="custom">自定义 API</Option>
            </Select>
          </Form.Item>

          <Form.Item name="apiKey" label="API Key" rules={[{ required: true, message: '请输入 API Key' }]}>
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
          <Button icon={<ApiOutlined />} onClick={handleTestConnection} loading={testStatus === 'testing'}>
            测试连接
          </Button>
          {testStatus === 'success' && <Tag icon={<CheckCircleOutlined />} color="success">连接成功</Tag>}
          {testStatus === 'failed' && <Tag icon={<CloseCircleOutlined />} color="error">连接失败</Tag>}
        </Space>
      </Card>

      <Card title="关于" style={{ marginTop: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="版本">Novel Creation Kit v1.0.0</Descriptions.Item>
          <Descriptions.Item label="技术栈">Electron + React + TypeScript</Descriptions.Item>
          <Descriptions.Item label="核心功能">9-Agent 协作 / 7 Truth Files / 33 维度审计</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default Settings;
