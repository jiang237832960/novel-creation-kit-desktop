import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, List, Space, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  BookOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useProjectStore } from '../stores';
import type { Project } from '../types';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { projects, basePath, setBasePath, setProjects } = useProjectStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initBasePath = async () => {
      if (!basePath && window.electronAPI) {
        const documentsPath = await window.electronAPI.getUserDocumentsPath();
        const kitPath = `${documentsPath}/NovelCreationKit/projects`;
        setBasePath(kitPath);
        
        try {
          const result = await window.electronAPI.listDirectory(kitPath);
          if (result.success && result.entries) {
            const projectList: Project[] = [];
            for (const entry of result.entries) {
              if (entry.isDirectory) {
                const projectFilePath = `${entry.path}/project.json`;
                const projectData = await window.electronAPI.readFile(projectFilePath);
                if (projectData.success && projectData.content) {
                  try {
                    const projectInfo = JSON.parse(projectData.content);
                    projectList.push({
                      id: entry.name,
                      name: projectInfo.name || entry.name,
                      type: projectInfo.type || 'unknown',
                      path: entry.path,
                      createdAt: projectInfo.createdAt || new Date().toISOString(),
                      updatedAt: projectInfo.updatedAt || new Date().toISOString(),
                      status: projectInfo.status || 'active',
                    });
                  } catch {
                    projectList.push({
                      id: entry.name,
                      name: entry.name,
                      type: 'unknown',
                      path: entry.path,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      status: 'active',
                    });
                  }
                }
              }
            }
            setProjects(projectList);
          }
        } catch {
          // Directory might not exist yet
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    };
    
    initBasePath();
  }, [basePath, setBasePath, setProjects]);

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div>
      <Title level={2}>仪表盘</Title>
      
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="项目总数"
              value={projects.length}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="进行中"
              value={projects.filter(p => p.status === 'active').length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="已完成"
              value={projects.filter(p => p.status === 'completed').length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="章节总数"
              value={0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title="最近项目"
            extra={<a onClick={() => navigate('/projects')}>查看全部</a>}
          >
            <List
              loading={loading}
              locale={{ emptyText: '暂无项目' }}
              dataSource={recentProjects}
              renderItem={(project) => (
                <List.Item
                  actions={[
                    <a key="open" onClick={() => navigate(`/projects/${project.id}`)}>
                      打开
                    </a>
                  ]}
                >
                  <List.Item.Meta
                    title={project.name}
                    description={
                      <Space>
                        <Tag>{project.type}</Tag>
                        <Text type="secondary">
                          {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card title="快速开始">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Title level={5}>1. 创建新项目</Title>
                <Text type="secondary">在项目列表页面创建新的小说项目</Text>
              </div>
              <div>
                <Title level={5}>2. 配置 API</Title>
                <Text type="secondary">在设置页面配置 LLM API 密钥</Text>
              </div>
              <div>
                <Title level={5}>3. 开始创作</Title>
                <Text type="secondary">使用 9-Agent 协作系统开始小说创作</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
