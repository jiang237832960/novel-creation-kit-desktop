import React, { useState } from 'react';
import { Card, Row, Col, Button, Modal, Form, Input, Select, Typography, Popconfirm, Empty, Tag, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PlusOutlined, DeleteOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { useProjectStore } from '../stores';
import type { Project } from '../types';

const { Title, Text } = Typography;
const { Option } = Select;

const NOVEL_TYPES = [
  { value: '无限流', label: '无限流' },
  { value: '玄幻', label: '玄幻' },
  { value: '都市', label: '都市' },
  { value: '科幻', label: '科幻' },
  { value: '悬疑推理', label: '悬疑推理' },
  { value: '其他', label: '其他' },
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

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      '无限流': 'purple',
      '玄幻': 'red',
      '都市': 'blue',
      '科幻': 'cyan',
      '悬疑推理': 'magenta',
      '其他': 'default',
    };
    return colors[type] || 'default';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>项目列表</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          新建项目
        </Button>
      </div>

      {projects.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无项目"
        >
          <Button type="primary" onClick={() => setIsModalOpen(true)}>
            创建第一个项目
          </Button>
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {projects.map((project) => (
            <Col key={project.id} xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                actions={[
                  <Button
                    key="open"
                    type="text"
                    icon={<FolderOpenOutlined />}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    打开
                  </Button>,
                  <Popconfirm
                    key="delete"
                    title="确定要删除这个项目吗？"
                    description="删除后无法恢复"
                    onConfirm={() => handleDeleteProject(project)}
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                  >
                    <Button type="text" danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <Card.Meta
                  title={project.name}
                  description={
                    <div>
                      <Tag color={getTypeColor(project.type)}>{project.type}</Tag>
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          创建于 {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                        </Text>
                      </div>
                    </div>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title="创建新项目"
        open={isModalOpen}
        onOk={handleCreateProject}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={loading}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ type: '无限流' }}
        >
          <Form.Item
            name="name"
            label="项目名称"
            rules={[
              { required: true, message: '请输入项目名称' },
              { max: 50, message: '项目名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="请输入小说名称" />
          </Form.Item>
          
          <Form.Item
            name="type"
            label="小说类型"
            rules={[{ required: true, message: '请选择小说类型' }]}
          >
            <Select placeholder="请选择小说类型">
              {NOVEL_TYPES.map((type) => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectList;
