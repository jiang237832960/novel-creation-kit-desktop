import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Typography, Button, Space, message, Spin, Tabs, Modal } from 'antd';
import { 
  ArrowLeftOutlined, 
  SaveOutlined, 
  PlayCircleOutlined, 
  PauseCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useProjectStore, useWorkflowStore, useSettingsStore } from '../stores';
import { llmService, workflowEngine } from '../services/llm';
import WorkflowCanvas from '../components/workflow/WorkflowCanvas';
import TruthFilesPanel from '../components/truthFiles/TruthFilesPanel';
import ChapterEditor from '../components/editor/ChapterEditor';
import ValidationPanel from '../components/validation/ValidationPanel';
import type { TruthFile, Chapter, Agent } from '../types';
import { v4 as uuidv4 } from 'uuid';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const ProjectWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    projects, 
    currentProject, 
    chapters,
    setCurrentProject, 
    setChapters,
    addChapter,
    updateChapter,
    removeChapter,
    setCurrentChapter,
    currentChapter,
  } = useProjectStore();
  
  const { 
    agents, 
    isRunning, 
    isPaused, 
    currentAgentIndex,
    setAgents,
    updateAgent,
    setIsRunning,
    setIsPaused,
    setCurrentAgentIndex,
    resetWorkflow,
    addLog,
  } = useWorkflowStore();
  
  const { llmConfig } = useSettingsStore();
  
  const [loading, setLoading] = useState(true);
  const [truthFiles, setTruthFiles] = useState<TruthFile[]>([]);
  const [activeTab, setActiveTab] = useState('chapter');
  const [leftTab, setLeftTab] = useState('workflow');
  const [isSaving, setIsSaving] = useState(false);

  const loadProject = useCallback(async () => {
    if (!id || !window.electronAPI) {
      setLoading(false);
      return;
    }

    const project = projects.find(p => p.id === id);
    if (project) {
      setCurrentProject(project);
      
      const truthFilesDir = `${project.path}/truth_files`;
      const result = await window.electronAPI.listDirectory(truthFilesDir);
      
      if (result.success && result.entries) {
        const files: TruthFile[] = [];
        for (const entry of result.entries.filter(e => !e.isDirectory && e.name.endsWith('.md'))) {
          const fileResult = await window.electronAPI.readFile(entry.path);
          if (fileResult.success) {
            files.push({
              name: entry.name,
              path: entry.path,
              content: fileResult.content || '',
            });
          }
        }
        setTruthFiles(files);
      }
      
      const chaptersResult = await window.electronAPI.listDirectory(`${project.path}/chapters`);
      const loadedChapters: Chapter[] = [];
      if (chaptersResult.success && chaptersResult.entries) {
        const mdFiles = chaptersResult.entries
          .filter(e => !e.isDirectory && e.name.endsWith('.md'))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        
        for (const file of mdFiles) {
          const contentResult = await window.electronAPI.readFile(file.path);
          if (contentResult.success) {
            const match = file.name.match(/第?(\d+)章/);
            const chapterNumber = match ? parseInt(match[1], 10) : loadedChapters.length + 1;
            const titleMatch = file.name.match(/第\d+章[：:]?(.*)\.md/);
            const title = titleMatch ? titleMatch[1].trim() : file.name.replace('.md', '');
            
            loadedChapters.push({
              id: uuidv4(),
              projectId: project.id,
              number: chapterNumber,
              title,
              content: contentResult.content || '',
              status: 'draft',
              wordCount: (contentResult.content || '').replace(/\s/g, '').length,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
        setChapters(loadedChapters);
      }
    }
    setLoading(false);
  }, [id, projects, setCurrentProject, setChapters]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    llmService.setConfig(llmConfig);
  }, [llmConfig]);

  useEffect(() => {
    workflowEngine.setOnStateChange((updatedAgents, status) => {
      setAgents(updatedAgents);
      if (status === 'running') {
        setIsRunning(true);
        setIsPaused(false);
        setCurrentAgentIndex(updatedAgents.findIndex(a => a.status === 'running'));
      } else if (status === 'paused') {
        setIsPaused(true);
      } else {
        setIsRunning(false);
        setIsPaused(false);
      }
    });
  }, [setAgents, setIsRunning, setIsPaused, setCurrentAgentIndex]);

  const handleSaveTruthFile = async (file: TruthFile) => {
    if (!window.electronAPI) return;
    
    await window.electronAPI.backupFile(file.path);
    const result = await window.electronAPI.writeFile(file.path, file.content);
    if (result.success) {
      setTruthFiles(prev => prev.map(tf => tf.path === file.path ? file : tf));
      addLog({
        timestamp: new Date().toISOString(),
        agentId: 'user',
        level: 'success',
        message: `已保存 ${file.name}`,
      });
    } else {
      message.error(`保存失败: ${result.error}`);
    }
  };

  const handleReloadTruthFiles = async () => {
    if (!currentProject) return;
    const truthFilesDir = `${currentProject.path}/truth_files`;
    const result = await window.electronAPI.listDirectory(truthFilesDir);
    
    if (result.success && result.entries) {
      const files: TruthFile[] = [];
      for (const entry of result.entries.filter(e => !e.isDirectory && e.name.endsWith('.md'))) {
        const fileResult = await window.electronAPI.readFile(entry.path);
        if (fileResult.success) {
          files.push({
            name: entry.name,
            path: entry.path,
            content: fileResult.content || '',
          });
        }
      }
      setTruthFiles(files);
      message.success('Truth Files 已重新加载');
    }
  };

  const handleSaveChapter = async () => {
    if (!currentProject || !currentChapter || !window.electronAPI) return;
    
    setIsSaving(true);
    const chapterPath = `${currentProject.path}/chapters/${currentChapter.title ? `第${currentChapter.number}章${currentChapter.title.includes('第') ? '' : '：' + currentChapter.title}` : `第${currentChapter.number}章`}.md`;
    
    const result = await window.electronAPI.writeFile(chapterPath, currentChapter.content);
    if (result.success) {
      message.success('章节保存成功');
      addLog({
        timestamp: new Date().toISOString(),
        agentId: 'user',
        level: 'success',
        message: `已保存章节：${currentChapter.title || `第${currentChapter.number}章`}`,
      });
    } else {
      message.error(`保存失败: ${result.error}`);
    }
    setIsSaving(false);
  };

  const handleChapterAdd = async (chapter: Chapter) => {
    addChapter(chapter);
    setCurrentChapter(chapter);
    
    if (currentProject && window.electronAPI) {
      const chapterPath = `${currentProject.path}/chapters/第${chapter.number}章：${chapter.title}.md`;
      await window.electronAPI.writeFile(chapterPath, '');
    }
  };

  const handleChapterUpdate = (id: string, updates: Partial<Chapter>) => {
    updateChapter(id, updates);
  };

  const handleChapterDelete = (id: string) => {
    removeChapter(id);
    if (currentChapter?.id === id) {
      setCurrentChapter(chapters.find(c => c.id !== id) || null);
    }
  };

  const handleWorkflowStart = () => {
    if (!llmService.isConfigured()) {
      Modal.warning({
        title: 'LLM 未配置',
        content: '请先在设置页面配置 API 密钥',
        okText: '去设置',
        onOk: () => navigate('/settings'),
      });
      return;
    }
    
    workflowEngine.setLLMConfig(llmConfig);
    workflowEngine.start();
    addLog({
      timestamp: new Date().toISOString(),
      agentId: 'system',
      level: 'info',
      message: '工作流已启动',
    });
  };

  const handleWorkflowPause = () => {
    workflowEngine.pause();
    addLog({
      timestamp: new Date().toISOString(),
      agentId: 'system',
      level: 'warning',
      message: '工作流已暂停',
    });
  };

  const handleWorkflowResume = () => {
    workflowEngine.resume();
    addLog({
      timestamp: new Date().toISOString(),
      agentId: 'system',
      level: 'info',
      message: '工作流已继续',
    });
  };

  const handleWorkflowReset = () => {
    Modal.confirm({
      title: '确定要重置工作流吗？',
      content: '这将清除所有执行状态和输出',
      okText: '重置',
      cancelText: '取消',
      onOk: () => {
        workflowEngine.reset();
        resetWorkflow();
        addLog({
          timestamp: new Date().toISOString(),
          agentId: 'system',
          level: 'info',
          message: '工作流已重置',
        });
      },
    });
  };

  const handleAgentClick = (agent: Agent) => {
    console.log('Agent clicked:', agent);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Space direction="vertical">
          <Title level={4}>项目不存在</Title>
          <Button type="primary" onClick={() => navigate('/projects')}>
            返回项目列表
          </Button>
        </Space>
      </div>
    );
  }

  return (
    <Layout style={{ height: 'calc(100vh - 48px)', margin: '-24px' }}>
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px', 
        borderBottom: '1px solid #f0f0f0', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        height: 56,
      }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')} />
          <Title level={4} style={{ margin: 0 }}>
            {currentProject.name}
          </Title>
        </Space>
        <Space>
          <Button 
            icon={<SaveOutlined />} 
            onClick={handleSaveChapter}
            loading={isSaving}
          >
            保存
          </Button>
          {!isRunning ? (
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />} 
              onClick={handleWorkflowStart}
            >
              运行
            </Button>
          ) : isPaused ? (
            <Button icon={<PlayCircleOutlined />} onClick={handleWorkflowResume}>
              继续
            </Button>
          ) : (
            <Button icon={<PauseCircleOutlined />} onClick={handleWorkflowPause}>
              暂停
            </Button>
          )}
          <Button icon={<ReloadOutlined />} onClick={handleWorkflowReset}>
            重置
          </Button>
        </Space>
      </Header>
      
      <Layout>
        <Sider 
          width={320} 
          style={{ 
            background: '#fff', 
            borderRight: '1px solid #f0f0f0',
            overflow: 'hidden',
          }}
        >
          <Tabs
            activeKey={leftTab}
            onChange={setLeftTab}
            style={{ height: '100%' }}
            tabBarStyle={{ marginBottom: 0, padding: '0 16px' }}
            items={[
              {
                key: 'workflow',
                label: '工作流',
                children: (
                  <WorkflowCanvas
                    agents={agents}
                    onAgentClick={handleAgentClick}
                    onStart={handleWorkflowStart}
                    onPause={handleWorkflowPause}
                    onResume={handleWorkflowResume}
                    onReset={handleWorkflowReset}
                    isRunning={isRunning}
                    isPaused={isPaused}
                    currentAgentIndex={currentAgentIndex}
                  />
                ),
              },
              {
                key: 'truth',
                label: 'Truth Files',
                children: (
                  <TruthFilesPanel
                    files={truthFiles}
                    onSave={handleSaveTruthFile}
                    onReload={handleReloadTruthFiles}
                    projectPath={currentProject.path}
                  />
                ),
              },
            ]}
          />
        </Sider>
        
        <Content>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            style={{ height: '100%' }}
            tabBarStyle={{ marginBottom: 0, padding: '0 16px' }}
            items={[
              {
                key: 'chapter',
                label: '章节编辑',
                children: (
                  <ChapterEditor
                    projectId={currentProject.id}
                    projectPath={currentProject.path}
                    chapters={chapters}
                    currentChapter={currentChapter}
                    onChapterSelect={setCurrentChapter}
                    onChapterAdd={handleChapterAdd}
                    onChapterUpdate={handleChapterUpdate}
                    onChapterDelete={handleChapterDelete}
                    onSave={handleSaveChapter}
                  />
                ),
              },
              {
                key: 'validation',
                label: '验证审计',
                children: (
                  <ValidationPanel
                    content={currentChapter?.content || ''}
                    chapterId={currentChapter?.id || 'unknown'}
                  />
                ),
              },
            ]}
          />
        </Content>
      </Layout>
    </Layout>
  );
};

export default ProjectWorkspace;
