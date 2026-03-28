import React, { ReactNode } from 'react';
import { Layout, Menu, Typography, Badge } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  FolderOutlined,
  SettingOutlined,
  BookOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';

const { Sider, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '工作台' },
  { key: '/projects', icon: <FolderOutlined />, label: '项目列表' },
  { key: '/agents', icon: <ExperimentOutlined />, label: 'Agent 管理' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

const MainLayout: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Sider
        width={220}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
          }}
        >
          <BookOutlined style={{ fontSize: 28, color: '#fff' }} />
          <Text strong style={{ color: '#fff', fontSize: 14, marginTop: 4 }}>Novel Creation Kit</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>多智能体小说创作系统</Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />
        <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, padding: '0 12px' }}>
          <div style={{ padding: '12px', background: '#fafafa', borderRadius: 8, textAlign: 'center' }}>
            <Badge status="success" text={<Text type="secondary" style={{ fontSize: 11 }}>系统正常</Text>} />
          </div>
        </div>
      </Sider>
      <Layout>
        <Content style={{ padding: 24, overflow: 'auto' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
