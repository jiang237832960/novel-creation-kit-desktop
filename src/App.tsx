import { Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import ProjectWorkspace from './pages/ProjectWorkspace';
import Settings from './pages/Settings';

function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<ProjectList />} />
          <Route path="projects/:id" element={<ProjectWorkspace />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Layout>
  );
}

export default App;
