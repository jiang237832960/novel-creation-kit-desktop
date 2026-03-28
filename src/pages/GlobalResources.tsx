import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Button, Space, Tag, List, Select, message, Spin, Empty, Divider, Descriptions } from 'antd';
import { 
  GlobalOutlined, 
  FileTextOutlined, 
  EditOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useGlobalResourcesStore } from '../stores';
import type { NovelType, GlobalLearningResource } from '../types';
import { NOVEL_TYPES, HARD_RULES } from '../types';

const { Title, Text } = Typography;

const GlobalResources: React.FC = () => {
  const { 
    globalPath, 
    selectedType, 
    resources,
    setGlobalPath,
    setSelectedType,
    setResources,
  } = useGlobalResourcesStore();
  
  const [loading, setLoading] = useState(true);
  const [initPath, setInitPath] = useState('');

  const loadResources = async (basePath: string) => {
    if (!window.electronAPI) return;
    
    try {
      const publicLearningsPath = `${basePath}/public_learnings`;
      const result = await window.electronAPI.listDirectory(publicLearningsPath);
      
      if (result.success && result.entries) {
        const loadedResources: GlobalLearningResource[] = [];
        
        for (const entry of result.entries) {
          if (entry.isDirectory) {
            const filesResult = await window.electronAPI.listDirectory(entry.path);
            if (filesResult.success && filesResult.entries) {
              for (const file of filesResult.entries) {
                const isMdFile = file.name.endsWith('.md');
                const isJsonFile = file.name.endsWith('.json');
                if (!file.isDirectory && (isMdFile || isJsonFile)) {
                  const contentResult = await window.electronAPI.readFile(file.path);
                  if (contentResult.success) {
                    loadedResources.push({
                      id: file.path,
                      name: file.name,
                      type: 'rules',
                      category: entry.name as NovelType,
                      path: file.path,
                      content: contentResult.content || '',
                      updateAt: new Date().toISOString(),
                    });
                  }
                }
              }
            }
          }
        }
        
        setResources(loadedResources);
      }
    } catch (error) {
      console.error('加载资源失败:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!window.electronAPI) {
        setLoading(false);
        return;
      }
      
      try {
        const basePath = await window.electronAPI.getUserDocumentsPath();
        setInitPath(basePath);
        
        const resPath = `${basePath}/NovelCreationKit/global_resources`;
        setGlobalPath(resPath);
        
        const exists = await window.electronAPI.fileExists(resPath);
        if (!exists) {
          try {
            await window.electronAPI.initGlobalResources?.(basePath);
          } catch {
            // ignore init error
          }
        }
        
        await loadResources(resPath);
      } catch (error) {
        console.error('初始化全局资源失败:', error);
      }
      setLoading(false);
    };
    
    init();
  }, []);

  const handleRefresh = async () => {
    if (!globalPath || !window.electronAPI) return;
    setLoading(true);
    await loadResources(globalPath);
    setLoading(false);
    message.success('资源已刷新');
  };

  const filteredResources = selectedType === '全部' 
    ? resources 
    : resources.filter(r => r.category === selectedType);

  const getTypeColor = (type: NovelType | string) => {
    const typeInfo = NOVEL_TYPES.find(t => t.value === type);
    return typeInfo?.color || 'default';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" tip="加载全局资源..." />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>全局资源库</Title>
          <Text type="secondary">管理类型化学习资产、技能规则、最佳实践</Text>
        </div>
        <Space>
          <Button icon={<SyncOutlined />} onClick={handleRefresh}>刷新</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <GlobalOutlined />
                <span>公共学习库</span>
              </Space>
            }
            extra={
              <Select 
                value={selectedType} 
                onChange={(value) => setSelectedType(value)}
                style={{ width: 150 }}
              >
                <Select.Option value="全部">全部类型</Select.Option>
                <Select.Option value="通用">通用</Select.Option>
                {NOVEL_TYPES.map(type => (
                  <Select.Option key={type.value} value={type.value}>{type.icon} {type.label}</Select.Option>
                ))}
              </Select>
            }
          >
            {filteredResources.length === 0 ? (
              <Empty description="暂无资源" />
            ) : (
              <List
                size="small"
                dataSource={filteredResources}
                renderItem={(resource) => (
                  <List.Item
                    actions={[
                      <Button key="edit" type="text" size="small" icon={<EditOutlined />} />
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<FileTextOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
                      title={
                        <Space>
                          {resource.name}
                          <Tag color={getTypeColor(resource.category)}>{resource.category}</Tag>
                        </Space>
                      }
                      description={
                        <Text type="secondary" ellipsis style={{ maxWidth: 300 }}>
                          {resource.content.substring(0, 100)}...
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>

          <Card title="问题案例库" style={{ marginTop: 16 }}>
            <Text type="secondary">暂无问题案例</Text>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="全局规则">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong>11 条硬规则</Text>
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {HARD_RULES.slice(0, 5).map(rule => (
                    <Tag key={rule.id} color={rule.severity === 'error' ? 'error' : 'warning'}>
                      {rule.id} {rule.rule.substring(0, 15)}...
                    </Tag>
                  ))}
                </div>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div>
                <Text strong>33 维度审计</Text>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">A类(8) B类(7) C类(5) D类(5) E类(3) F类(2) G类(3)</Text>
                </div>
              </div>
            </Space>
          </Card>

          <Card title="最佳实践" style={{ marginTop: 16 }}>
            <Text type="secondary">暂无最佳实践</Text>
          </Card>

          <Card title="资源路径" style={{ marginTop: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="全局资源库">
                <Text copyable>{globalPath || initPath || '未初始化'}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default GlobalResources;
