import React, { useState } from 'react';
import { Card, Row, Col, Button, Modal, Form, Input, Select, Typography, Popconfirm, Empty, Tag, message, Statistic, Progress } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PlusOutlined, DeleteOutlined, FolderOpenOutlined, BookOutlined, FileTextOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { useProjectStore } from '../stores';
import type { Project } from '../types';

const { Title, Text } = Typography;
const { Option } = Select;

const NOVEL_TYPES = [
  { value: '无限流', label: '无限流', color: 'purple', icon: '🔄' },
  { value: '玄幻', label: '玄幻', color: 'red', icon: '⚔️' },
  { value: '都市', label: '都市', color: 'blue', icon: '🏙️' },
  { value: '科幻', label: '科幻', color: 'cyan', icon: '🚀' },
  { value: '悬疑推理', label: '悬疑推理', color: 'magenta', icon: '🔮' },
  { value: '其他', label: '其他', color: 'default', icon: '📚' },
];

const ProjectList: React.FC = () => {
  const navigate = useNavigate();
  const { projects, basePath, addProject, removeProject } = useProjectStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleCreateProject = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      const projectId = uuidv4();
      const projectPath = `${basePath}/${projectId}`;
      
      if (!window.electronAPI) {
        message.error('Electron API 不可用');
        setLoading(false);
        return;
      }
      
      const createResult = await window.electronAPI.createProject(projectPath);
      if (!createResult.success) {
        message.error(`创建项目失败: ${createResult.error}`);
        setLoading(false);
        return;
      }
      
      const projectInfo = {
        name: values.name,
        type: values.type,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
      };
      
      await window.electronAPI.writeFile(
        `${projectPath}/project.json`,
        JSON.stringify(projectInfo, null, 2)
      );
      
      const newProject: Project = {
        id: projectId,
        name: values.name,
        type: values.type,
        path: projectPath,
        createdAt: projectInfo.createdAt,
        updatedAt: projectInfo.updatedAt,
        status: 'active',
      };
      
      addProject(newProject);
      message.success('项目创建成功');
      setIsModalOpen(false);
      form.resetFields();
      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error('创建项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!window.electronAPI) return;
    
    const result = await window.electronAPI.deleteProject(project.path);
    if (result.success) {
      removeProject(project.id);
      message.success('项目已删除');
    } else {
      message.error(`删除失败: ${result.error}`);
    }
  };

  const getTypeInfo = (type: string) => NOVEL_TYPES.find(t => t.value === type) || NOVEL_TYPES[NOVEL_TYPES.length - 1];

  return (
    <div style={{ padding: '0 0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>项目管理</Title>
          <Text type="secondary">管理和创建您的小说项目</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)} size="large">
          新建项目
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <Empty
            image={<BookOutlined style={{ fontSize: 64, color: '#1890ff' }} />}
            description={
              <div>
                <Text style={{ fontSize: 16 }}>还没有创建任何项目</Text>
                <br />
                <Text type="secondary">创建您的第一个小说项目，开始创作之旅</Text>
              </div>
            }
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
              创建第一个项目
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {projects.map((project) => {
            const typeInfo = getTypeInfo(project.type);
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={project.id}>
                <Card
                  hoverable
                  style={{ height: '100%' }}
                  bodyStyle={{ padding: 0 }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  cover={
                    <div style={{ 
                      height: 100, 
                      background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                    }}>
                      <span style={{ fontSize: 36 }}>{typeInfo.icon}</span>
                      <Tag color={typeInfo.color} style={{ marginTop: 8 }}>{project.type}</Tag>
                    </div>
                  }
                  actions={[
                    <Button
                      key="open"
                      type="text"
                      icon={<FolderOpenOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projects/${project.id}`);
                      }}
                    >
                      打开
                    </Button>,
                    <Popconfirm
                      key="delete"
                      title="确定要删除这个项目吗？"
                      description="删除后无法恢复"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleDeleteProject(project);
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                    >
                      <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                      >
                        删除
                      </Button>
                    </Popconfirm>,
                  ]}
                >
                  <Card.Meta
                    title={project.name}
                    description={
                      <div style={{ padding: '12px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                          <ClockCircleOutlined />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                          </Text>
                        </div>
                        <Progress percent={0} size="small" showInfo={false} />
                        <Text type="secondary" style={{ fontSize: 11 }}>创作进度 0%</Text>
                      </div>
                    }
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <Modal
        title={
          <Space>
            <BookOutlined />
            <span>创建新项目</span>
          </Space>
        }
        open={isModalOpen}
        onOk={handleCreateProject}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={loading}
        okText="创建"
        cancelText="取消"
        width={480}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ type: '无限流' }}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="name"
            label="项目名称"
            rules={[
              { required: true, message: '请输入项目名称' },
              { max: 50, message: '项目名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="请输入小说名称，如《诡异游戏》" size="large" />
          </Form.Item>
          
          <Form.Item
            name="type"
            label="小说类型"
            rules={[{ required: true, message: '请选择小说类型' }]}
          >
            <Select placeholder="选择小说类型" size="large">
              {NOVEL_TYPES.map((type) => (
                <Option key={type.value} value={type.value}>
                  <Space>
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="项目简介（可选）"
          >
            <Input.TextArea 
              placeholder="简单描述您的故事设定" 
              rows={3}
              showCount
              maxLength={200}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectList;
