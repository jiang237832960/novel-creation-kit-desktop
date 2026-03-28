import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, Chapter, LLMConfig, Agent, TruthFile, ValidationResult, AuditResult, NovelType, GlobalLearningResource, UserPreference, ProblemCase, BestPractice } from '../types';
import { NOVEL_TYPES, AGENTS, HARD_RULES } from '../types';

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
    (set, _get) => ({
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

const initialAgents: Agent[] = AGENTS.map(a => ({
  ...a,
  status: 'pending' as const,
}));

export const useWorkflowStore = create<WorkflowState>()((set) => ({
  agents: initialAgents,
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
  resetWorkflow: () => set({
    agents: initialAgents.map(a => ({ ...a, status: 'pending' as const })),
    currentAgentIndex: 0,
    isRunning: false,
    isPaused: false,
    logs: [],
  }),
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

interface GlobalResourcesState {
  globalPath: string;
  selectedType: NovelType | '全部';
  resources: GlobalLearningResource[];
  userPreferences: UserPreference[];
  problemCases: ProblemCase[];
  bestPractices: BestPractice[];
  
  setGlobalPath: (path: string) => void;
  setSelectedType: (type: NovelType | '全部') => void;
  setResources: (resources: GlobalLearningResource[]) => void;
  addResource: (resource: GlobalLearningResource) => void;
  updateResource: (id: string, updates: Partial<GlobalLearningResource>) => void;
  removeResource: (id: string) => void;
  setUserPreferences: (preferences: UserPreference[]) => void;
  addProblemCase: (problem: ProblemCase) => void;
  updateProblemCase: (id: string, updates: Partial<ProblemCase>) => void;
  addBestPractice: (practice: BestPractice) => void;
  updateBestPractice: (id: string, updates: Partial<BestPractice>) => void;
}

export const useGlobalResourcesStore = create<GlobalResourcesState>()(
  persist(
    (set) => ({
      globalPath: '',
      selectedType: '全部',
      resources: [],
      userPreferences: [],
      problemCases: [],
      bestPractices: [],
      
      setGlobalPath: (path) => set({ globalPath: path }),
      setSelectedType: (type) => set({ selectedType: type }),
      setResources: (resources) => set({ resources }),
      addResource: (resource) => set((state) => ({ resources: [...state.resources, resource] })),
      updateResource: (id, updates) => set((state) => ({
        resources: state.resources.map((r) => r.id === id ? { ...r, ...updates } : r),
      })),
      removeResource: (id) => set((state) => ({
        resources: state.resources.filter((r) => r.id !== id),
      })),
      setUserPreferences: (preferences) => set({ userPreferences: preferences }),
      addProblemCase: (problem) => set((state) => ({ problemCases: [...state.problemCases, problem] })),
      updateProblemCase: (id, updates) => set((state) => ({
        problemCases: state.problemCases.map((p) => p.id === id ? { ...p, ...updates } : p),
      })),
      addBestPractice: (practice) => set((state) => ({ bestPractices: [...state.bestPractices, practice] })),
      updateBestPractice: (id, updates) => set((state) => ({
        bestPractices: state.bestPractices.map((p) => p.id === id ? { ...p, ...updates } : p),
      })),
    }),
    {
      name: 'novel-creation-kit-global-resources',
    }
  )
);
