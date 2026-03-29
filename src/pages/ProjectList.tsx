import React, { useState } from 'react';
import { Card, Row, Col, Button, Modal, Form, Input, Select, Typography, Empty, Tag, message, Space, Dropdown } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PlusOutlined, FolderOpenOutlined, BookOutlined, DeleteOutlined, ClockCircleOutlined, MessageOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { useProjectStore } from '../stores';
import type { Project, NovelType } from '../types';
import AIChatPanel from '../components/chat/AIChatPanel';

const { Title, Text } = Typography;
const { Option } = Select;

const NOVEL_TYPES = [
  { value: '无限流', label: '无限流', icon: '🔄', color: 'purple' },
  { value: '玄幻', label: '玄幻', icon: '⚔️', color: 'red' },
  { value: '都市', label: '都市', icon: '🏙️', color: 'blue' },
  { value: '科幻', label: '科幻', icon: '🚀', color: 'cyan' },
  { value: '悬疑推理', label: '悬疑推理', icon: '🔮', color: 'magenta' },
  { value: '其他', label: '其他', icon: '📚', color: 'default' },
];

const ProjectList: React.FC = () => {
  const navigate = useNavigate();
  const { projects, basePath, addProject, removeProject } = useProjectStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleCreateProjectByChat = async (projectInfo: { name: string; type: NovelType }) => {
    if (!window.electronAPI || !basePath) {
      message.error('Electron API 不可用或基础路径未设置');
      return;
    }

    setLoading(true);
    try {
      const projectId = uuidv4();
      const projectPath = `${basePath}/${projectId}`;

      const createResult = await window.electronAPI.createProject(projectPath);
      if (!createResult.success) {
        message.error(`创建项目失败: ${createResult.error}`);
        return;
      }

      const projectInfoData = {
        name: projectInfo.name,
        type: projectInfo.type,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
      };

      await window.electronAPI.writeFile(
        `${projectPath}/project.json`,
        JSON.stringify(projectInfoData, null, 2)
      );

      const newProject: Project = {
        id: projectId,
        name: projectInfo.name,
        type: projectInfo.type,
        path: projectPath,
        createdAt: projectInfoData.createdAt,
        updatedAt: projectInfoData.updatedAt,
        status: 'active',
      };

      addProject(newProject);
      message.success(`项目"${projectInfo.name}"创建成功！`);
      setIsChatOpen(false);
      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error('创建项目失败:', error);
      message.error('创建项目失败');
    } finally {
      setLoading(false);
    }
  };

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

  const handleDeleteProject = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.electronAPI) return;
    
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除项目"${project.name}"吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const result = await window.electronAPI.deleteProject(project.path);
        if (result.success) {
          removeProject(project.id);
          message.success('项目已删除');
        } else {
          message.error(`删除失败: ${result.error}`);
        }
      },
    });
  };

  const getTypeInfo = (type: string) => NOVEL_TYPES.find(t => t.value === type) || NOVEL_TYPES[NOVEL_TYPES.length - 1];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>项目列表</Title>
          <Text type="secondary">管理您的小说项目</Text>
        </div>
        <Dropdown menu={{
          items: [
            {
              key: 'form',
              icon: <PlusOutlined />,
              label: '表单创建',
              onClick: () => setIsModalOpen(true),
            },
            {
              key: 'chat',
              icon: <MessageOutlined />,
              label: '对话创建',
              onClick: () => setIsChatOpen(true),
            },
          ],
        }} trigger={['click']}>
          <Button type="primary" icon={<PlusOutlined />} size="large">
            新建项目
          </Button>
        </Dropdown>
      </div>

      {projects.length === 0 ? (
        <Card>
          <Empty
            image={<BookOutlined style={{ fontSize: 64, color: '#1890ff' }} />}
            description={
              <div>
                <Text style={{ fontSize: 16 }}>还没有创建任何项目</Text>
                <br />
                <Text type="secondary">点击上方"新建项目"开始您的创作之旅</Text>
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
                  onClick={() => navigate(`/projects/${project.id}`)}
                  cover={
                    <div style={{
                      height: 80,
                      background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 32 }}>{typeInfo.icon}</span>
                      <Tag color={typeInfo.color} style={{ marginTop: 8 }}>{project.type}</Tag>
                    </div>
                  }
                  actions={[
                    <Button key="open" type="text" icon={<FolderOpenOutlined />} onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}>
                      打开
                    </Button>,
                    <Button key="delete" type="text" danger icon={<DeleteOutlined />} onClick={(e) => handleDeleteProject(project, e)}>
                      删除
                    </Button>,
                  ]}
                >
                  <Card.Meta
                    title={project.name}
                    description={
                      <div style={{ padding: '8px 0 0' }}>
                        <Space>
                          <ClockCircleOutlined />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                          </Text>
                        </Space>
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
        title="新建项目"
        open={isModalOpen}
        onOk={handleCreateProject}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
        confirmLoading={loading}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" initialValues={{ type: '无限流' }} style={{ marginTop: 24 }}>
          <Form.Item
            name="name"
            label="项目名称"
            rules={[
              { required: true, message: '请输入项目名称' },
              { max: 50, message: '项目名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="请输入小说名称，如《诡异游戏》" />
          </Form.Item>
          
          <Form.Item
            name="type"
            label="小说类型"
            rules={[{ required: true, message: '请选择小说类型' }]}
          >
            <Select placeholder="选择小说类型">
              {NOVEL_TYPES.map((type) => (
                <Option key={type.value} value={type.value}>
                  <Space><span>{type.icon}</span><span>{type.label}</span></Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <AIChatPanel
        visible={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onProjectCreated={handleCreateProjectByChat}
      />
    </div>
  );
};

export default ProjectList;
