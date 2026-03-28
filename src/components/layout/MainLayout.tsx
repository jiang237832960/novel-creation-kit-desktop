import React, { ReactNode } from 'react';
import { Layout, Menu, Typography, Badge } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  FolderOutlined,
  SettingOutlined,
  BookOutlined,
} from '@ant-design/icons';

const { Sider, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '工作台' },
  { key: '/projects', icon: <FolderOutlined />, label: '项目列表' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

const MainLayout: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={220}
        style={{
          background: '#001529',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <BookOutlined style={{ fontSize: 28, color: '#1890ff' }} />
          <Text strong style={{ color: '#fff', fontSize: 14, marginTop: 8 }}>Novel Creation Kit</Text>
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>多智能体小说创作系统</Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />
        <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, padding: '0 12px' }}>
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: 6, textAlign: 'center' }}>
            <Badge status="success" text={<Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>系统就绪</Text>} />
          </div>
        </div>
      </Sider>
      <Layout>
        <Content style={{ padding: 0, overflow: 'auto', background: '#f0f2f5' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
