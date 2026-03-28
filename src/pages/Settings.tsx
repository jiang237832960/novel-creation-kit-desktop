import React from 'react';
import { Card, Form, Input, Select, Slider, Switch, Button, Typography, Space, Divider, Tag, message, Alert } from 'antd';
import { SaveOutlined, ApiOutlined, GlobalOutlined, InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useSettingsStore } from '../stores';
import { llmService } from '../services/llm';
import type { LLMConfig } from '../types';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const Settings: React.FC = () => {
  const { llmConfig, setLlmConfig } = useSettingsStore();
  const [form] = Form.useForm();
  const [saving, setSaving] = React.useState(false);
  const [testStatus, setTestStatus] = React.useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  const handleSave = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();
      setLlmConfig(values);
      llmService.setConfig(values);
      message.success('设置保存成功');
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
        { role: 'user', content: 'Hello, please respond with just "OK" to test the connection.' }
      ]);
      
      if (response.success) {
        setTestStatus('success');
        message.success('API 连接测试成功');
      } else {
        setTestStatus('failed');
        message.error(`连接失败: ${response.error}`);
      }
    } catch (error) {
      setTestStatus('failed');
      message.error(`连接失败: ${error}`);
    }
  };

  const availableModels = llmService.getAvailableModels();
  const isConfigured = llmConfig.apiKey && llmConfig.apiKey.length > 0;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={2}>设置</Title>

      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card
          title={
            <Space>
              <ApiOutlined />
              <span>API 配置</span>
            </Space>
          }
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={llmConfig}
          >
            <Form.Item
              name="provider"
              label="API 提供商"
              rules={[{ required: true, message: '请选择 API 提供商' }]}
            >
              <Select 
                placeholder="请选择"
                onChange={() => setTestStatus('idle')}
              >
                <Option value="openai">OpenAI</Option>
                <Option value="claude">Claude (Anthropic)</Option>
                <Option value="custom">自定义</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="apiKey"
              label="API Key"
              rules={[{ required: true, message: '请输入 API Key' }]}
              extra={
                <Text type="secondary">
                  {llmConfig.provider === 'openai' && '获取 OpenAI API Key: https://platform.openai.com/api-keys'}
                  {llmConfig.provider === 'claude' && '获取 Claude API Key: https://console.anthropic.com/settings/keys'}
                  {llmConfig.provider === 'custom' && '请输入您的自定义 API 服务密钥'}
                </Text>
              }
            >
              <Input.Password 
                placeholder="请输入 API Key" 
                onChange={() => setTestStatus('idle')}
              />
            </Form.Item>

            <Form.Item
              name="endpoint"
              label="API Endpoint (可选)"
              extra="仅在使用自定义提供商时需要填写，例如 OpenAI 兼容的代理地址"
            >
              <Input 
                placeholder="https://api.openai.com/v1" 
                disabled={llmConfig.provider !== 'custom'}
              />
            </Form.Item>

            <Form.Item
              name="model"
              label="模型"
              rules={[{ required: true, message: '请选择模型' }]}
            >
              <Select
                placeholder="请选择模型"
                showSearch
                filterOption={(input, option) =>
                  (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {availableModels.map((model) => (
                  <Option key={model} value={model}>{model}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="temperature"
              label="Temperature (创造性)"
              tooltip="控制输出的随机性。较低的值更确定性，较高的值更有创造性但可能不稳定"
            >
              <Slider 
                min={0} 
                max={2} 
                step={0.1} 
                marks={{ 0: '0', 0.5: '0.5', 1: '1', 1.5: '1.5', 2: '2' }}
              />
              <Space>
                <Text type="secondary">确定</Text>
                <Text type="secondary">|</Text>
                <Text type="secondary">创造</Text>
              </Space>
            </Form.Item>

            <Form.Item
              name="maxTokens"
              label="最大生成长度"
              tooltip="单次生成的最大 token 数量"
            >
              <Slider 
                min={500} 
                max={8000} 
                step={100} 
                marks={{ 500: '500', 2000: '2000', 4000: '4000', 8000: '8000' }}
              />
            </Form.Item>
          </Form>

          <Divider />

          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
            >
              保存设置
            </Button>
            <Button
              icon={<ApiOutlined />}
              onClick={handleTestConnection}
              loading={testStatus === 'testing'}
              disabled={!isConfigured}
            >
              测试连接
            </Button>
            {testStatus === 'success' && (
              <Tag icon={<CheckCircleOutlined />} color="success">
                连接成功
              </Tag>
            )}
            {testStatus === 'failed' && (
              <Tag icon={<InfoCircleOutlined />} color="error">
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
            全局公共资源库存储所有类型化学习资产与技能规则，是系统的核心资源。
          </Paragraph>
          
          <div style={{ marginTop: 16 }}>
            <Text strong>资源库位置：</Text>
            <div style={{ marginTop: 8 }}>
              <Tag>~/Documents/NovelCreationKit/global_resources/</Tag>
            </div>
          </div>

          <Divider />

          <Text strong>资源库结构：</Text>
          <ul style={{ marginTop: 8 }}>
            <li><Text>public_learnings/ - 类型化学习库</Text></li>
            <li><Text>public_templates/ - 公共模板库</Text></li>
            <li><Text>public_standards/ - 公共规范库</Text></li>
            <li><Text>public_writing_style/ - 公共文风库</Text></li>
          </ul>

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
            <div>
              <Text strong>Novel Creation Kit</Text>
              <Tag color="blue" style={{ marginLeft: 8 }}>v1.0.0</Tag>
            </div>
            <Text type="secondary">基于 InkOS 设计的多智能体小说创作系统</Text>
            <Text type="secondary">Electron + React + TypeScript + Zustand</Text>
            <Divider />
            <Text type="secondary" style={{ fontSize: 12 }}>
              核心特性：
            </Text>
            <ul style={{ marginTop: 4 }}>
              <li><Text type="secondary" style={{ fontSize: 12 }}>9-Agent 协作工作流</Text></li>
              <li><Text type="secondary" style={{ fontSize: 12 }}>7 个 Truth Files 管理</Text></li>
              <li><Text type="secondary" style={{ fontSize: 12 }}>11 条硬规则实时检查</Text></li>
              <li><Text type="secondary" style={{ fontSize: 12 }}>33 维度审计系统</Text></li>
              <li><Text type="secondary" style={{ fontSize: 12 }}>多 API 支持 (OpenAI / Claude)</Text></li>
            </ul>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default Settings;
