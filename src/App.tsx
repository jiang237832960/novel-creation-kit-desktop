import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import ProjectWorkspace from './pages/ProjectWorkspace';
import GlobalResources from './pages/GlobalResources';
import Settings from './pages/Settings';
import ZeroTokenSettings from './pages/ZeroTokenSettings';
import ZeroTokenChat from './pages/ZeroTokenChat';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<ProjectList />} />
        <Route path="projects/:id" element={<ProjectWorkspace />} />
        <Route path="resources" element={<GlobalResources />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/zero-token" element={<ZeroTokenSettings />} />
        <Route path="chat" element={<ZeroTokenChat />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
