import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Typography, Button, Space, Tabs, message, Spin, Badge, Tag, Card, List, Avatar, Tooltip, Progress } from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  FileTextOutlined,
  SafetyOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { useProjectStore, useWorkflowStore, useSettingsStore } from '../stores';
import { llmService, workflowEngine } from '../services/llm';
import type { TruthFile, Chapter, Agent } from '../types';
import { v4 as uuidv4 } from 'uuid';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const AgentFlow = [
  { id: 'chief-director', name: '总导演', icon: '🎬', desc: '章节调度/任务拆解' },
  { id: 'archivist', name: '档案员', icon: '📁', desc: '上下文/伏笔追踪' },
  { id: 'stylist', name: '文风师', icon: '🎨', desc: '文风/节奏控制' },
  { id: 'screenwriter', name: '编剧', icon: '✍️', desc: '场景/剧情/细纲' },
  { id: 'writer', name: '写手', icon: '📝', desc: '正文初稿' },
  { id: 'wordcount', name: '字数管控', icon: '🔢', desc: '字数监控' },
  { id: 'polisher', name: '润色师', icon: '✨', desc: '润色/去AI痕迹' },
  { id: 'verifier', name: '验证官', icon: '🔍', desc: '全维度校验' },
  { id: 'reviser', name: '修订师', icon: '🔧', desc: '问题修复' },
  { id: 'learning', name: '学习代理', icon: '🧠', desc: '经验沉淀/规则迭代' },
];

const ProjectWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, currentProject, chapters, setCurrentProject, setChapters, addChapter, updateChapter, removeChapter, setCurrentChapter, currentChapter } = useProjectStore();
  const { agents, isRunning, isPaused, setAgents, setIsRunning, setIsPaused } = useWorkflowStore();
  const { llmConfig } = useSettingsStore();
  
  const [loading, setLoading] = useState(true);
  const [truthFiles, setTruthFiles] = useState<TruthFile[]>([]);
  const [chapterContent, setChapterContent] = useState('');
  const [leftTab, setLeftTab] = useState('workflow');
  const [activeTab, setActiveTab] = useState('chapter');

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
            loadedChapters.push({
              id: uuidv4(),
              projectId: project.id,
              number: chapterNumber,
              title: file.name.replace('.md', ''),
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

  const handleSaveTruthFile = async (file: TruthFile) => {
    if (!window.electronAPI) return;
    
    await window.electronAPI.backupFile(file.path);
    const result = await window.electronAPI.writeFile(file.path, file.content);
    if (result.success) {
      setTruthFiles(prev => prev.map(tf => tf.path === file.path ? file : tf));
      message.success('保存成功');
    } else {
      message.error(`保存失败: ${result.error}`);
    }
  };

  const handleSaveChapter = async () => {
    if (!currentProject || !currentChapter || !window.electronAPI) return;
    
    const chapterPath = `${currentProject.path}/chapters/${currentChapter.title}.md`;
    const result = await window.electronAPI.writeFile(chapterPath, chapterContent);
    if (result.success) {
      updateChapter(currentChapter.id, {
        content: chapterContent,
        wordCount: chapterContent.replace(/\s/g, '').length,
      });
      message.success('章节保存成功');
    } else {
      message.error(`保存失败: ${result.error}`);
    }
  };

  const handleAddChapter = () => {
    if (!currentProject) return;
    const chapterNumber = chapters.length + 1;
    const newChapter: Chapter = {
      id: uuidv4(),
      projectId: currentProject.id,
      number: chapterNumber,
      title: `第${chapterNumber}章`,
      content: '',
      status: 'draft',
      wordCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addChapter(newChapter);
    setCurrentChapter(newChapter);
    setChapterContent('');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Space direction="vertical">
          <Title level={4}>项目不存在</Title>
          <Button type="primary" onClick={() => navigate('/projects')}>返回项目列表</Button>
        </Space>
      </div>
    );
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{
        background: '#fff',
        padding: '0 16px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')} />
          <Title level={4} style={{ margin: 0 }}>{currentProject.name}</Title>
          <Tag>{currentProject.type}</Tag>
        </Space>
        <Space>
          <Button icon={<SaveOutlined />} onClick={handleSaveChapter}>保存</Button>
          <Button type="primary" icon={<PlayCircleOutlined />}>运行工作流</Button>
        </Space>
      </Header>

      <Layout>
        <Sider width={280} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <Tabs
            activeKey={leftTab}
            onChange={setLeftTab}
            style={{ height: '100%' }}
            tabBarStyle={{ marginBottom: 0, padding: '0 12px' }}
            items={[
              {
                key: 'workflow',
                label: <span><ExperimentOutlined /> 10-Agent</span>,
                children: (
                  <div style={{ padding: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {AgentFlow.map((agent, index) => (
                        <div key={agent.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '12px',
                          background: index === 0 ? '#e6f7ff' : '#fafafa',
                          borderRadius: 8,
                          border: index === 0 ? '1px solid #91d5ff' : '1px solid #f0f0f0',
                        }}>
                          <Avatar style={{ background: '#1890ff' }}>{agent.icon}</Avatar>
                          <div style={{ flex: 1 }}>
                            <Text strong style={{ fontSize: 13 }}>{agent.name}</Text>
                            <div><Text type="secondary" style={{ fontSize: 11 }}>{agent.desc}</Text></div>
                          </div>
                          {index === 0 && <Tag color="blue">待执行</Tag>}
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                key: 'truth',
                label: <span><FileTextOutlined /> Truth Files</span>,
                children: (
                  <List
                    size="small"
                    style={{ padding: 12 }}
                    dataSource={truthFiles}
                    renderItem={(file) => (
                      <List.Item style={{ padding: '8px 0', cursor: 'pointer' }}>
                        <List.Item.Meta
                          avatar={<Avatar style={{ fontSize: 16 }}>📄</Avatar>}
                          title={<Text style={{ fontSize: 12 }}>{file.name.replace('.md', '')}</Text>}
                        />
                      </List.Item>
                    )}
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
                label: <span><FileTextOutlined /> 章节编辑</span>,
                children: (
                  <div style={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <select
                          value={currentChapter?.id || ''}
                          onChange={(e) => {
                            const ch = chapters.find(c => c.id === e.target.value);
                            if (ch) {
                              setCurrentChapter(ch);
                              setChapterContent(ch.content);
                            }
                          }}
                          style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d9d9d9' }}
                        >
                          <option value="">选择章节</option>
                          {chapters.map(c => (
                            <option key={c.id} value={c.id}>第{c.number}章 - {c.title}</option>
                          ))}
                        </select>
                        <Button size="small" onClick={handleAddChapter}>新建章节</Button>
                      </Space>
                      <Text type="secondary">字数：{chapterContent.replace(/\s/g, '').length}</Text>
                    </div>
                    <textarea
                      value={chapterContent}
                      onChange={(e) => setChapterContent(e.target.value)}
                      placeholder="开始创作..."
                      style={{
                        flex: 1,
                        border: 'none',
                        padding: 16,
                        fontSize: 15,
                        fontFamily: '"Songti SC", "SimSun", serif',
                        lineHeight: 1.8,
                        resize: 'none',
                        outline: 'none',
                      }}
                    />
                  </div>
                ),
              },
              {
                key: 'validation',
                label: <span><SafetyOutlined /> 验证审计</span>,
                children: (
                  <div style={{ padding: 16 }}>
                    <Card title="11 条硬规则" size="small">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                        {[
                          { id: 'R01', rule: '禁止"不是……而是……"句式', error: true },
                          { id: 'R02', rule: '禁止破折号"——"', error: true },
                          { id: 'R03', rule: '转折词密度 ≤ 1次/3000字', error: false },
                          { id: 'R04', rule: '高疲劳词 ≤ 1次/章', error: false },
                          { id: 'R05', rule: '禁止元叙事', error: false },
                          { id: 'R06', rule: '禁止报告术语', error: true },
                          { id: 'R07', rule: '禁止作者说教词', error: false },
                          { id: 'R08', rule: '禁止集体反应套话', error: false },
                          { id: 'R09', rule: '禁止连续4句"了"字', error: false },
                          { id: 'R10', rule: '段落长度 ≤ 300字', error: false },
                          { id: 'R11', rule: '禁止本书禁忌', error: true },
                        ].map(r => (
                          <Tag key={r.id} color={r.error ? 'error' : 'warning'}>{r.id} {r.rule}</Tag>
                        ))}
                      </div>
                    </Card>
                    <Card title="33 维度审计" size="small" style={{ marginTop: 16 }}>
                      <Text type="secondary">选择章节后点击"运行审计"开始检查</Text>
                    </Card>
                  </div>
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
