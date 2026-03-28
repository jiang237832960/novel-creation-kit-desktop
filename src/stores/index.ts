import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, Chapter, LLMConfig, Agent, TruthFile, ValidationResult, AuditResult } from '../types';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  chapters: Chapter[];
  currentChapter: Chapter | null;
  basePath: string;
  isLoading: boolean;
  
  setBasePath: (path: string) => void;
  setLoading: (loading: boolean) => void;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setCurrentProject: (project: Project | null) => void;
  setChapters: (chapters: Chapter[]) => void;
  addChapter: (chapter: Chapter) => void;
  updateChapter: (id: string, updates: Partial<Chapter>) => void;
  removeChapter: (id: string) => void;
  setCurrentChapter: (chapter: Chapter | null) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProject: null,
      chapters: [],
      currentChapter: null,
      basePath: '',
      isLoading: false,
      
      setBasePath: (path) => set({ basePath: path }),
      setLoading: (loading) => set({ isLoading: loading }),
      setProjects: (projects) => set({ projects }),
      addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
      updateProject: (id, updates) => set((state) => ({
        projects: state.projects.map((p) => p.id === id ? { ...p, ...updates } : p),
        currentProject: state.currentProject?.id === id ? { ...state.currentProject, ...updates } : state.currentProject,
      })),
      removeProject: (id) => set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
      })),
      setCurrentProject: (project) => set({ currentProject: project }),
      setChapters: (chapters) => set({ chapters }),
      addChapter: (chapter) => set((state) => ({ chapters: [...state.chapters, chapter] })),
      updateChapter: (id, updates) => set((state) => ({
        chapters: state.chapters.map((c) => c.id === id ? { ...c, ...updates } : c),
        currentChapter: state.currentChapter?.id === id ? { ...state.currentChapter, ...updates } : state.currentChapter,
      })),
      removeChapter: (id) => set((state) => ({
        chapters: state.chapters.filter((c) => c.id !== id),
        currentChapter: state.currentChapter?.id === id ? null : state.currentChapter,
      })),
      setCurrentChapter: (chapter) => set({ currentChapter: chapter }),
    }),
    {
      name: 'novel-creation-kit-projects',
      partialize: (state) => ({
        projects: state.projects,
        basePath: state.basePath,
      }),
    }
  )
);

interface SettingsState {
  llmConfig: LLMConfig;
  theme: 'light' | 'dark';
  autoSave: boolean;
  autoSaveInterval: number;
  
  setLlmConfig: (config: Partial<LLMConfig>) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setAutoSave: (enabled: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      llmConfig: {
        provider: 'openai',
        apiKey: '',
        endpoint: '',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
      },
      theme: 'light',
      autoSave: true,
      autoSaveInterval: 30000,
      
      setLlmConfig: (config) => set((state) => ({
        llmConfig: { ...state.llmConfig, ...config },
      })),
      setTheme: (theme) => set({ theme }),
      setAutoSave: (enabled) => set({ autoSave: enabled }),
      setAutoSaveInterval: (interval) => set({ autoSaveInterval: interval }),
    }),
    {
      name: 'novel-creation-kit-settings',
    }
  )
);

interface WorkflowState {
  agents: Agent[];
  currentAgentIndex: number;
  isRunning: boolean;
  isPaused: boolean;
  logs: { timestamp: string; agentId: string; level: string; message: string }[];
  
  setAgents: (agents: Agent[]) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  setCurrentAgentIndex: (index: number) => void;
  setIsRunning: (running: boolean) => void;
  setIsPaused: (paused: boolean) => void;
  addLog: (log: { timestamp: string; agentId: string; level: string; message: string }) => void;
  resetWorkflow: () => void;
}

export const useWorkflowStore = create<WorkflowState>()((set) => ({
  agents: [
    { id: 'archivist', name: 'Archivist', nameCn: '档案员', status: 'pending', description: '构建上下文，维护设定与伏笔' },
    { id: 'stylist', name: 'Stylist', nameCn: '文风师', status: 'pending', description: '分析文风，制定风格指南' },
    { id: 'screenwriter', name: 'Screenwriter', nameCn: '编剧', status: 'pending', description: '设计场景，规划剧情' },
    { id: 'writer', name: 'Writer', nameCn: '写手', status: 'pending', description: '正文初稿写作' },
    { id: 'wordcount', name: 'WordCount', nameCn: '字数管控师', status: 'pending', description: '字数监控与合规校验' },
    { id: 'polisher', name: 'Polisher', nameCn: '润色师', status: 'pending', description: '文本润色与AI痕迹去除' },
    { id: 'verifier', name: 'Verifier', nameCn: '验证官', status: 'pending', description: '33维度审计' },
    { id: 'reviser', name: 'Reviser', nameCn: '修订师', status: 'pending', description: '问题修复与细节优化' },
    { id: 'learning', name: 'Learning', nameCn: '学习代理', status: 'pending', description: '沉淀经验，更新Truth Files' },
  ],
  currentAgentIndex: 0,
  isRunning: false,
  isPaused: false,
  logs: [],
  
  setAgents: (agents) => set({ agents }),
  updateAgent: (id, updates) => set((state) => ({
    agents: state.agents.map((a) => a.id === id ? { ...a, ...updates } : a),
  })),
  setCurrentAgentIndex: (index) => set({ currentAgentIndex: index }),
  setIsRunning: (running) => set({ isRunning: running }),
  setIsPaused: (paused) => set({ isPaused: paused }),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  resetWorkflow: () => set((state) => ({
    agents: state.agents.map((a) => ({ ...a, status: 'pending' as const, currentTask: undefined, output: undefined, error: undefined })),
    currentAgentIndex: 0,
    isRunning: false,
    isPaused: false,
  })),
}));

interface ValidationState {
  validationResults: ValidationResult[];
  auditResult: AuditResult | null;
  isValidating: boolean;
  
  setValidationResults: (results: ValidationResult[]) => void;
  setAuditResult: (result: AuditResult | null) => void;
  setIsValidating: (validating: boolean) => void;
  clearResults: () => void;
}

export const useValidationStore = create<ValidationState>()((set) => ({
  validationResults: [],
  auditResult: null,
  isValidating: false,
  
  setValidationResults: (results) => set({ validationResults: results }),
  setAuditResult: (result) => set({ auditResult: result }),
  setIsValidating: (validating) => set({ isValidating: validating }),
  clearResults: () => set({ validationResults: [], auditResult: null }),
}));

interface TruthFilesState {
  truthFiles: TruthFile[];
  activeFile: TruthFile | null;
  isDirty: boolean;
  
  setTruthFiles: (files: TruthFile[]) => void;
  updateTruthFile: (name: string, updates: Partial<TruthFile>) => void;
  setActiveFile: (file: TruthFile | null) => void;
  setIsDirty: (dirty: boolean) => void;
}

export const useTruthFilesStore = create<TruthFilesState>()((set) => ({
  truthFiles: [],
  activeFile: null,
  isDirty: false,
  
  setTruthFiles: (files) => set({ truthFiles: files }),
  updateTruthFile: (name, updates) => set((state) => ({
    truthFiles: state.truthFiles.map((f) => f.name === name ? { ...f, ...updates } : f),
    activeFile: state.activeFile?.name === name ? { ...state.activeFile, ...updates } : state.activeFile,
  })),
  setActiveFile: (file) => set({ activeFile: file, isDirty: false }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
}));
