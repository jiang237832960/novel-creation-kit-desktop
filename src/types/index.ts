export interface ElectronAPI {
  getUserDocumentsPath: () => Promise<string>;
  getAppPath: () => Promise<string>;
  createProject: (projectPath: string) => Promise<{ success: boolean; error?: string }>;
  deleteProject: (projectPath: string) => Promise<{ success: boolean; error?: string }>;
  copyProject: (srcPath: string, destPath: string) => Promise<{ success: boolean; error?: string }>;
  createBackup: (targetPath: string) => Promise<{ success: boolean; backupPath?: string; error?: string }>;
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
  listDirectory: (dirPath: string) => Promise<{
    success: boolean;
    entries?: { name: string; isDirectory: boolean; path: string }[];
    error?: string;
  }>;
  selectDirectory: () => Promise<{ success: boolean; canceled?: boolean; path?: string }>;
  openExternal: (url: string) => Promise<void>;
  storeGet: (key: string) => Promise<unknown>;
  storeSet: (key: string, value: unknown) => Promise<{ success: boolean }>;
  backupFile: (filePath: string) => Promise<{ success: boolean; backupPath?: string; error?: string }>;
  fileExists: (filePath: string) => Promise<boolean>;
  getFileInfo: (filePath: string) => Promise<{
    success: boolean;
    info?: { size: number; createdAt: string; modifiedAt: string; isDirectory: boolean };
    error?: string;
  }>;
  onMenuNewProject: (callback: () => void) => () => void;
  onMenuOpenProject: (callback: () => void) => () => void;
  onMenuSave: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export interface Project {
  id: string;
  name: string;
  type: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'archived' | 'completed';
  description?: string;
  coverImage?: string;
}

export interface Chapter {
  id: string;
  projectId: string;
  number: number;
  title: string;
  content: string;
  status: 'draft' | 'review' | 'published';
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TruthFile {
  name: string;
  path: string;
  content: string;
  updatedAt?: string;
}

export type AgentStatus = 'pending' | 'waiting' | 'running' | 'completed' | 'failed' | 'skipped';

export interface Agent {
  id: string;
  name: string;
  nameCn: string;
  status: AgentStatus;
  description: string;
  currentTask?: string;
  input?: string;
  output?: string;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export interface ValidationResult {
  ruleId: string;
  severity: 'error' | 'warning';
  position?: number;
  line?: number;
  description: string;
  suggestion?: string;
  matchedText?: string;
}

export interface AuditDimension {
  category: string;
  name: string;
  status: 'pass' | 'warning' | 'fail' | 'skipped';
  issues: string[];
  suggestions: string[];
}

export interface AuditResult {
  chapterId: string;
  timestamp: string;
  dimensions: AuditDimension[];
  overallStatus: 'pass' | 'warning' | 'fail';
  summary: string;
}

export interface LLMConfig {
  provider: 'openai' | 'claude' | 'custom';
  apiKey: string;
  endpoint?: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface WorkflowState {
  projectId: string;
  chapterId: string;
  agents: Agent[];
  currentAgentIndex: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  logs: WorkflowLog[];
}

export interface WorkflowLog {
  timestamp: string;
  agentId: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

export interface TruthFileData {
  current_state: {
    timeline: string;
    locations: string[];
    keyItems: string[];
    characters: string[];
  };
  resource_ledger: {
    currency: { name: string; amount: number }[];
    items: { name: string; quantity: number; description: string }[];
    attributes: Record<string, number>;
  };
  pending_hooks: {
    hooks: { id: string; description: string; chapter: number; status: 'pending' | 'fulfilled' }[];
  };
  chapter_summaries: {
    chapters: { number: number; title: string; status: string; events: string[]; hooks: string[]; characters: string[] }[];
  };
  subplot_board: {
    subplots: { id: string; title: string; progress: number; status: string; nextStep: string }[];
  };
  emotional_arcs: {
    characters: { id: string; name: string; currentEmotion: string; trajectory: string[]; keyPoints: string[] }[];
  };
  character_matrix: {
    characters: {
      id: string;
      name: string;
      gender?: string;
      age?: string;
      identity: string;
      abilities: string[];
      personality: string;
      relationships: Record<string, string>;
    }[];
    interactions: { from: string; to: string; type: string; chapter: number; description: string }[];
  };
}

export interface NovelType {
  value: string;
  label: string;
  color: string;
  description: string;
}

export const NOVEL_TYPES: NovelType[] = [
  { value: '无限流', label: '无限流', color: 'purple', description: '主角穿越于各种任务世界' },
  { value: '玄幻', label: '玄幻', color: 'red', description: '包含修仙、魔法等元素' },
  { value: '都市', label: '都市', color: 'blue', description: '现代都市背景的故事' },
  { value: '科幻', label: '科幻', color: 'cyan', description: '科学技术为基础的幻想' },
  { value: '悬疑推理', label: '悬疑推理', color: 'magenta', description: '解谜和推理为主的故事' },
  { value: '其他', label: '其他', color: 'default', description: '其他类型的小说' },
];
