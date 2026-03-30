export interface ZeroTokenProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiPath: string;
  loginUrl?: string;
  models: {
    id: string;
    name: string;
    contextWindow: number;
    maxTokens: number;
    reasoning?: boolean;
  }[];
}

export interface AuthStatus {
  provider: string;
  authenticated: boolean;
  lastUpdate?: string;
}

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
  initGlobalResources: (basePath: string) => Promise<{ success: boolean; error?: string }>;
  zeroToken: {
    start: (port?: number, authToken?: string) => Promise<{ success: boolean; error?: string }>;
    stop: () => Promise<{ success: boolean; error?: string }>;
    status: () => Promise<{ success: boolean; isRunning?: boolean; port?: number; error?: string }>;
    getProviders: () => Promise<{ success: boolean; providers?: ZeroTokenProviderConfig[]; error?: string }>;
    startAuth: (providerId: string) => Promise<{ success: boolean; error?: string }>;
    captureCredentials: (providerId: string) => Promise<{ success: boolean; error?: string }>;
    setCredentials: (providerId: string, credentials: { cookie: string; bearer?: string; userAgent?: string }) => Promise<{ success: boolean; error?: string }>;
    getAuthStatus: () => Promise<{ success: boolean; status?: AuthStatus[]; error?: string }>;
    clearCredentials: (providerId: string) => Promise<{ success: boolean; error?: string }>;
    closeAuthWindow: () => Promise<{ success: boolean; error?: string }>;
  };
  customApi: {
    proxy: (options: { endpoint: string; apiKey: string; body: any }) => Promise<{
      success: boolean;
      data?: any;
      error?: string;
      status?: number;
    }>;
  };
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
  type: NovelType;
  path: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'archived' | 'completed';
  description?: string;
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
  id: AgentId;
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

export type AgentId = 
  | 'creative-director'    // 创作总监
  | 'learning-agent'     // 学习代理（调度管控层）
  | 'chief-director'      // 总导演
  | 'archivist'          // 档案员
  | 'stylist'           // 文风师
  | 'screenwriter'       // 编剧
  | 'writer'            // 写手
  | 'wordcount'         // 字数管控师
  | 'polisher'          // 润色师
  | 'verifier'          // 验证官
  | 'reviser'           // 修订师
  | 'flexible-agent';   // 灵活Agent（根据需求适配）

export interface ValidationResult {
  ruleId: string;
  severity: 'error' | 'warning';
  position?: number;
  line?: number;
  description: string;
  suggestion?: string;
  matchedText?: string;
}

export interface AuditResult {
  chapterId: string;
  timestamp: string;
  dimensions: AuditDimension[];
  overallStatus: 'pass' | 'warning' | 'fail';
  summary: string;
}

export interface AuditDimension {
  category: string;
  name: string;
  status: 'pass' | 'warning' | 'fail' | 'skipped';
  issues: string[];
  suggestions: string[];
}

export interface LLMConfig {
  provider: 'openai' | 'claude' | 'custom' | 'zero-token';
  apiKey: string;
  endpoint?: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

// Zero Token 相关类型
export interface ZeroTokenProvider {
  id: string;
  name: string;
  baseUrl?: string;
  apiPath?: string;
  loginUrl?: string;
  status: 'configured' | 'not_configured' | 'error';
  models: ZeroTokenModel[];
}

export interface ZeroTokenModel {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  maxTokens: number;
  reasoning?: boolean;
  inputModalities?: string[];
  outputModalities?: string[];
}

export interface ZeroTokenConfig {
  gatewayUrl: string;
  gatewayToken: string;
  providers: ZeroTokenProvider[];
  activeProvider: string;
  activeModel: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  provider?: string;
  model?: string;
}

export interface ZeroTokenChatRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ZeroTokenChatResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
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

export type NovelType = '无限流' | '玄幻' | '都市' | '科幻' | '悬疑推理' | '其他';

export const NOVEL_TYPES: { value: NovelType; label: string; icon: string; color: string }[] = [
  { value: '无限流', label: '无限流', icon: '🔄', color: 'purple' },
  { value: '玄幻', label: '玄幻', icon: '⚔️', color: 'red' },
  { value: '都市', label: '都市', icon: '🏙️', color: 'blue' },
  { value: '科幻', label: '科幻', icon: '🚀', color: 'cyan' },
  { value: '悬疑推理', label: '悬疑推理', icon: '🔮', color: 'magenta' },
  { value: '其他', label: '其他', icon: '📚', color: 'default' },
];

// 全局资源库相关类型
export interface GlobalLearningResource {
  id: string;
  name: string;
  type: 'rules' | 'practices' | 'problems' | 'preventions' | 'styles' | 'templates';
  category: NovelType | '通用';
  path: string;
  content: string;
  updateAt: string;
  frequency?: number;  // 使用频次
  verified?: boolean;   // 是否经过验证
}

export interface UserPreference {
  id: string;
  userId: string;
  novelType: NovelType;
  preferences: {
    style?: string;
    pacing?: string;
    dialogueStyle?: string;
    descriptionStyle?: string;
  };
  updateAt: string;
}

export interface ProblemCase {
  id: string;
  category: NovelType | '通用';
  problem: string;
  rootCause: string;
  solution: string;
  frequency: number;
  severity: 'high' | 'medium' | 'low';
}

export interface BestPractice {
  id: string;
  category: NovelType | '通用';
  title: string;
  description: string;
 适用场景: string;
  verifiedCount: number;
}

// 11条硬规则
export const HARD_RULES = [
  { id: 'R01', rule: '禁止"不是……而是……"句式', severity: 'error' as const },
  { id: 'R02', rule: '禁止破折号"——"', severity: 'error' as const },
  { id: 'R03', rule: '转折词密度 ≤ 1次/3000字', severity: 'warning' as const },
  { id: 'R04', rule: '高疲劳词 ≤ 1次/章', severity: 'warning' as const },
  { id: 'R05', rule: '禁止元叙事', severity: 'warning' as const },
  { id: 'R06', rule: '禁止报告术语', severity: 'error' as const },
  { id: 'R07', rule: '禁止作者说教词', severity: 'warning' as const },
  { id: 'R08', rule: '禁止集体反应套话', severity: 'warning' as const },
  { id: 'R09', rule: '禁止连续4句"了"字', severity: 'warning' as const },
  { id: 'R10', rule: '段落长度 ≤ 300字', severity: 'warning' as const },
  { id: 'R11', rule: '禁止本书禁忌', severity: 'error' as const },
];

// 33维度审计分类
export const AUDIT_DIMENSIONS = {
  A: { name: '基础一致性', count: 8, dims: ['OOC检测', '战力崩坏', '信息越界', '时间线矛盾', '物理规则冲突', '命名冲突', '物品属性矛盾', '关系逻辑矛盾'] },
  B: { name: '内容质量', count: 7, dims: ['词汇疲劳', '利益链缺失', '台词失真', '描述重复', '节奏拖沓', '情感突兀', '悬念失效'] },
  C: { name: 'AI痕迹', count: 5, dims: ['段落等长', '套话密度', '句式单一', '连接词过度', '无意义排比'] },
  D: { name: '故事结构', count: 5, dims: ['支线停滞', '弧线平坦', '高潮缺失', '冲突不足', '节奏失衡'] },
  E: { name: '合规', count: 3, dims: ['敏感词', '版权问题', '政治敏感'] },
  F: { name: '番外专属', count: 2, dims: ['正传冲突', '未来信息泄露'] },
  G: { name: '读者体验', count: 3, dims: ['钩子设计', '大纲偏离', '阅读疲劳'] },
};

// Agent 列表配置（12个Agent）
export const AGENTS: Omit<Agent, 'status' | 'currentTask' | 'input' | 'output' | 'error' | 'startTime' | 'endTime'>[] = [
  { id: 'creative-director', name: 'CreativeDirector', nameCn: '创作总监', description: '唯一用户交互入口，技能调度核心，负责技能规则同步与用户需求适配' },
  { id: 'learning-agent', name: 'LearningAgent', nameCn: '学习代理', description: '全局学习技能、经验沉淀、规则迭代、资源管理' },
  { id: 'chief-director', name: 'ChiefDirector', nameCn: '总导演', description: '章节创作调度、任务拆解、内部终审，把控更新节奏' },
  { id: 'archivist', name: 'Archivist', nameCn: '档案员', description: '上下文组装、设定维护、伏笔追踪、网文配角管理' },
  { id: 'stylist', name: 'Stylist', nameCn: '文风师', description: '文风标准制定、叙事节奏控制、网文节奏适配' },
  { id: 'screenwriter', name: 'Screenwriter', nameCn: '编剧', description: '场景设定、剧情架构、伏笔规划、细纲创作、爽点设计' },
  { id: 'writer', name: 'Writer', nameCn: '写手', description: '正文初稿写作、场景/对话创作，突出爽点' },
  { id: 'wordcount', name: 'WordCount', nameCn: '字数管控师', description: '字数监控、合规校验、优化建议' },
  { id: 'polisher', name: 'Polisher', nameCn: '润色师', description: '文本润色、AI痕迹去除、语言优化' },
  { id: 'verifier', name: 'Verifier', nameCn: '验证官', description: '全维度校验、问题定位、根因分析、语义雷同检测' },
  { id: 'reviser', name: 'Reviser', nameCn: '修订师', description: '问题修复、细节优化、一致性校准' },
  { id: 'flexible-agent', name: 'FlexibleAgent', nameCn: '灵活Agent', description: '根据具体创作需求灵活适配' },
];

// 7个 Truth Files
export const TRUTH_FILES = [
  { name: 'current_state.md', nameCn: '当前世界状态', icon: '🌍', desc: '时间线、地点、关键物品' },
  { name: 'resource_ledger.md', nameCn: '资源账本', icon: '💰', desc: '货币、物品、属性' },
  { name: 'pending_hooks.md', nameCn: '待处理伏笔', icon: '🪝', desc: '伏笔铺设与回收记录' },
  { name: 'chapter_summaries.md', nameCn: '章节摘要', icon: '📑', desc: '章节进度与核心事件' },
  { name: 'subplot_board.md', nameCn: '支线进度板', icon: '📋', desc: '支线任务与进度' },
  { name: 'emotional_arcs.md', nameCn: '情感弧线', icon: '💗', desc: '角色情感变化轨迹' },
  { name: 'character_matrix.md', nameCn: '角色交互矩阵', icon: '👥', desc: '角色信息与关系' },
];
