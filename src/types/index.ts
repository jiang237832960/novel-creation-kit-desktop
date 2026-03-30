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
  conversation: {
    save: (messages: any[]) => Promise<{ success: boolean; error?: string }>;
    load: () => Promise<{ success: boolean; messages?: any[]; error?: string }>;
    clear: () => Promise<{ success: boolean; error?: string }>;
  };
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
  quality: {
    gateCheck: (options: { text: string; chapterNumber?: number }) => Promise<{
      success: boolean;
      results?: any[];
      summary?: { totalIssues: number; errorCount: number; warningCount: number; pass: boolean };
      error?: string;
    }>;
    aiTraceCheck: (options: { text: string }) => Promise<{
      success: boolean;
      issues?: any[];
      aiTraceScore?: number;
      status?: string;
      summary?: { totalIssues: number; highIssues: number; mediumIssues: number; lowIssues: number };
      error?: string;
    }>;
    semanticCheck: (options: { text: string }) => Promise<{
      success: boolean;
      highSimilarPairs?: any[];
      frequentPhrases?: { phrase: string; count: number }[];
      avgSimilarity?: number;
      status?: string;
      suggestions?: string[];
      error?: string;
    }>;
    wordCount: (options: { text: string }) => Promise<{
      success: boolean;
      charCount?: number;
      wordCount?: number;
      sentenceCount?: number;
      paragraphCount?: number;
      avgParagraphLength?: number;
      status?: string;
      suggestions?: string[];
      error?: string;
    }>;
  };
  blackboard: {
    create: (options: { projectPath: string; chapterNum: number; content: any }) => Promise<{
      success: boolean;
      path?: string;
      error?: string;
    }>;
    read: (options: { projectPath: string; chapterNum: number }) => Promise<{
      success: boolean;
      content?: string;
      path?: string;
      error?: string;
    }>;
    update: (options: { projectPath: string; chapterNum: number; content: string }) => Promise<{
      success: boolean;
      path?: string;
      error?: string;
    }>;
  };
  truthFiles: {
    readAll: (options: { projectPath: string }) => Promise<{
      success: boolean;
      files?: { name: string; content: string; path: string }[];
      error?: string;
    }>;
    write: (options: { filePath: string; content: string }) => Promise<{
      success: boolean;
      error?: string;
    }>;
  };
  document: {
    integrityCheck: (options: { projectPath: string; chapterNum: number; step: string }) => Promise<{
      success: boolean;
      pass?: boolean;
      missingDocs?: string[];
      error?: string;
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
  type?: AgentType;
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
  { id: 'R01', rule: '禁止"不是……而是……"句式', severity: 'error' as const, autoFix: true },
  { id: 'R02', rule: '禁止破折号"——"', severity: 'error' as const, autoFix: true },
  { id: 'R03', rule: '转折词密度 ≤ 1次/3000字', severity: 'warning' as const, autoFix: false },
  { id: 'R04', rule: '高疲劳词 ≤ 1次/章', severity: 'warning' as const, autoFix: false },
  { id: 'R05', rule: '禁止元叙事', severity: 'warning' as const, autoFix: true },
  { id: 'R06', rule: '禁止报告术语', severity: 'error' as const, autoFix: true },
  { id: 'R07', rule: '禁止作者说教词', severity: 'warning' as const, autoFix: false },
  { id: 'R08', rule: '禁止集体反应套话', severity: 'warning' as const, autoFix: false },
  { id: 'R09', rule: '禁止连续4句"了"字', severity: 'warning' as const, autoFix: true },
  { id: 'R10', rule: '段落长度 ≤ 300字', severity: 'warning' as const, autoFix: false },
  { id: 'R11', rule: '禁止本书禁忌', severity: 'error' as const, autoFix: true },
];

// 33维度审计分类 - 完整版
export const AUDIT_DIMENSIONS = {
  A: { 
    name: '基础一致性', 
    count: 9, 
    severity: 'critical',
    dims: [
      { id: 'A01', name: 'OOC检测', desc: '角色行为与人设矛盾' },
      { id: 'A02', name: '战力崩坏', desc: '战力数值不合理波动' },
      { id: 'A03', name: '信息越界', desc: '角色知道不该知道的信息' },
      { id: 'A04', name: '时间线矛盾', desc: '时间逻辑错误' },
      { id: 'A05', name: '物理规则冲突', desc: '违反世界观物理规则' },
      { id: 'A06', name: '命名冲突', desc: '角色/物品名称不一致' },
      { id: 'A07', name: '物品属性矛盾', desc: '物品属性前后不一致' },
      { id: 'A08', name: '关系逻辑矛盾', desc: '人物关系变化不合理' },
      { id: 'A09', name: '设定冲突', desc: '与世界观设定矛盾' },
    ]
  },
  B: { 
    name: '内容质量', 
    count: 10, 
    severity: 'critical',
    dims: [
      { id: 'B01', name: '词汇疲劳', desc: '高频词使用过度' },
      { id: 'B02', name: '利益链断裂', desc: '角色动机不合理' },
      { id: 'B03', name: '台词失真', desc: '对话不符合人物性格' },
      { id: 'B04', name: '描述重复', desc: '场景/动作描写重复' },
      { id: 'B05', name: '节奏拖沓', desc: '情节推进缓慢' },
      { id: 'B06', name: '情感突兀', desc: '情绪变化不合逻辑' },
      { id: 'B07', name: '悬念失效', desc: '悬念设计不吸引人' },
      { id: 'B08', name: '配角降智', desc: '配角行为不合理' },
      { id: 'B09', name: '年代考据', desc: '时代背景错误' },
      { id: 'B10', name: '视角一致性', desc: '叙事视角混乱' },
    ]
  },
  C: { 
    name: 'AI痕迹', 
    count: 5, 
    severity: 'warning',
    dims: [
      { id: 'C01', name: '段落等长', desc: '段落长度过于均匀' },
      { id: 'C02', name: '套话密度', desc: 'AI生成套路化表达' },
      { id: 'C03', name: '句式单一', desc: '句式变化少' },
      { id: 'C04', name: '连接词过度', desc: '过渡词使用过度' },
      { id: 'C05', name: '无意义排比', desc: '刻意使用排比句式' },
    ]
  },
  D: { 
    name: '故事结构', 
    count: 5, 
    severity: 'warning',
    dims: [
      { id: 'D01', name: '支线停滞', desc: '支线长期无进展' },
      { id: 'D02', name: '弧线平坦', desc: '角色成长弧光缺失' },
      { id: 'D03', name: '高潮缺失', desc: '缺少情绪高潮点' },
      { id: 'D04', name: '冲突不足', desc: '矛盾冲突不够激烈' },
      { id: 'D05', name: '节奏失衡', desc: '节奏忽快忽慢' },
    ]
  },
  E: { 
    name: '合规', 
    count: 3, 
    severity: 'critical',
    dims: [
      { id: 'E01', name: '敏感词', desc: '包含敏感内容' },
      { id: 'E02', name: '版权问题', desc: '涉嫌侵权' },
      { id: 'E03', name: '政治敏感', desc: '政治内容不当' },
    ]
  },
  F: { 
    name: '番外专属', 
    count: 4, 
    severity: 'warning',
    dims: [
      { id: 'F01', name: '正传冲突', desc: '与正传设定矛盾' },
      { id: 'F02', name: '未来信息泄露', desc: '泄露正传未来剧情' },
      { id: 'F03', name: '世界规则一致性', desc: '违反番外世界规则' },
      { id: 'F04', name: '番外伏笔隔离', desc: '番外伏笔影响正传' },
    ]
  },
  G: { 
    name: '读者体验', 
    count: 4, 
    severity: 'warning',
    dims: [
      { id: 'G01', name: '钩子设计', desc: '章节结尾钩子不够吸引' },
      { id: 'G02', name: '大纲偏离', desc: '偏离预定大纲' },
      { id: 'G03', name: '阅读疲劳', desc: '阅读体验差' },
      { id: 'G04', name: '爽点虚化', desc: '爽点描写不够到位' },
    ]
  },
};

// Agent 列表配置（12个Agent）- 完整版
export const AGENTS: Omit<Agent, 'status' | 'currentTask' | 'input' | 'output' | 'error' | 'startTime' | 'endTime'>[] = [
  { id: 'creative-director', name: 'CreativeDirector', nameCn: '创作总监', type: 'deliberative', description: '唯一用户交互入口，技能调度核心，负责技能规则同步与用户需求适配' },
  { id: 'learning-agent', name: 'LearningAgent', nameCn: '学习代理', type: 'reactive', description: '全局学习技能、经验沉淀、规则迭代、资源管理、错误预防' },
  { id: 'chief-director', name: 'ChiefDirector', nameCn: '总导演', type: 'deliberative', description: '章节创作调度、任务拆解、内部终审，把控更新节奏与番茄签约标准' },
  { id: 'archivist', name: 'Archivist', nameCn: '档案员', type: 'reactive', description: '上下文组装、设定维护、伏笔追踪、网文配角管理、Truth Files维护' },
  { id: 'stylist', name: 'Stylist', nameCn: '文风师', type: 'reactive', description: '文风标准制定、叙事节奏控制、网文节奏适配、群像角色三层结构设计' },
  { id: 'screenwriter', name: 'Screenwriter', nameCn: '编剧', type: 'reactive', description: '场景设定、剧情架构、伏笔规划、细纲创作、爽点设计、番茄黄金开篇设计' },
  { id: 'writer', name: 'Writer', nameCn: '写手', type: 'reactive', description: '正文初稿写作、场景/对话创作、角色灵魂塑造、遵循文风指南' },
  { id: 'wordcount', name: 'WordCount', nameCn: '字数管控师', type: 'reactive', description: '字数监控(2000-2500字)、合规检查、更新节奏管理、番茄签约标准把控' },
  { id: 'polisher', name: 'Polisher', nameCn: '润色师', type: 'reactive', description: '文本润色、AI痕迹去除、语言优化、情绪渲染强化、去AI味核心技巧' },
  { id: 'verifier', name: 'Verifier', nameCn: '验证官', type: 'deliberative', description: '全维度校验(33维度)、问题定位、根因分析、语义雷同检测、细纲匹配率验证(≥90%)' },
  { id: 'reviser', name: 'Reviser', nameCn: '修订师', type: 'reactive', description: '问题修复、细节优化、一致性校准、Truth Files同步更新' },
  { id: 'flexible-agent', name: 'FlexibleAgent', nameCn: '灵活Agent', type: 'reactive', description: '根据具体创作需求灵活适配、参与工作流各环节' },
];

// Agent类型
export type AgentType = 'deliberative' | 'reactive';

// 7个 Truth Files
export const TRUTH_FILES = [
  { name: 'current_state.md', nameCn: '当前世界状态', icon: '🌍', desc: '时间线、地点、关键物品', category: 'world' as const },
  { name: 'resource_ledger.md', nameCn: '资源账本', icon: '💰', desc: '货币、物品、属性', category: 'resource' as const },
  { name: 'pending_hooks.md', nameCn: '待处理伏笔', icon: '🪝', desc: '伏笔铺设与回收记录', category: 'plot' as const },
  { name: 'chapter_summaries.md', nameCn: '章节摘要', icon: '📑', desc: '章节进度与核心事件', category: 'chapter' as const },
  { name: 'subplot_board.md', nameCn: '支线进度板', icon: '📋', desc: '支线任务与进度', category: 'plot' as const },
  { name: 'emotional_arcs.md', nameCn: '情感弧线', icon: '💗', desc: '角色情感变化轨迹', category: 'character' as const },
  { name: 'character_matrix.md', nameCn: '角色交互矩阵', icon: '👥', desc: '角色信息与关系', category: 'character' as const },
];

// 黑板文档类型
export interface BlackboardDoc {
  chapterNum: number;
  createdAt: string;
  updatedAt: string;
  content: {
    characterStates: CharacterState[];
    sceneDesign: SceneDesign;
    keyDialogues: KeyDialogue[];
    hooks: Hook[];
    characterStateChanges: CharacterStateChange[];
  };
}

export interface CharacterState {
  name: string;
  status: string;
  location: string;
  emotion: string;
}

export interface SceneDesign {
  scenes: Scene[];
}

export interface Scene {
  id: string;
  name: string;
  location: string;
  time: string;
  keyPoints: string[];
}

export interface KeyDialogue {
  character: string;
  content: string;
  purpose: string;
}

export interface Hook {
  type: 'suspense' | 'cliffhanger' | 'cliffhanger';
  content: string;
  position: string;
}

export interface CharacterStateChange {
  character: string;
  before: string;
  after: string;
  reason: string;
}

// 工作流步骤定义
export interface WorkflowStep {
  step: number;
  agentId: AgentId;
  name: string;
  nameCn: string;
  description: string;
  inputs: string[];
  outputs: string[];
  requiredDocuments: string[];
  checkpointRequired: boolean;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  { step: 0, agentId: 'creative-director', name: 'Preparation', nameCn: '预备检查', description: '检查规则文件和前序章节状态', inputs: [], outputs: ['检查通过/失败'], requiredDocuments: [], checkpointRequired: false },
  { step: 1, agentId: 'chief-director', name: 'TaskAllocation', nameCn: '任务分配', description: '确认章节类型、字数要求，分配任务', inputs: [], outputs: [], requiredDocuments: [], checkpointRequired: false },
  { step: 2, agentId: 'archivist', name: 'DataLoading', nameCn: '资料读取', description: '读取人物状态表、剧情脉络表、伏笔追踪表、分卷细纲', inputs: ['Truth Files', '分卷细纲'], outputs: ['档案摘要'], requiredDocuments: ['current_state.md', 'pending_hooks.md', 'chapter_summaries.md'], checkpointRequired: true },
  { step: 3, agentId: 'stylist', name: 'StyleGuide', nameCn: '文风指南', description: '确定本章文风基调，提供台词人性化标准', inputs: [], outputs: ['文风指导卡'], requiredDocuments: [], checkpointRequired: false },
  { step: 4, agentId: 'screenwriter', name: 'SceneDesign', nameCn: '场景设计', description: '设计四个场景的详细节拍，创建黑板文档', inputs: ['分卷细纲', '上一章学习报告'], outputs: ['黑板文档', '第X章细纲.md'], requiredDocuments: ['细纲/第X章细纲.md', '黑板_第X章.md'], checkpointRequired: true },
  { step: 5, agentId: 'writer', name: 'Writing', nameCn: '正文创作', description: '参考黑板文档创作正文', inputs: ['黑板文档', '场景设计'], outputs: ['第X章_初稿.md'], requiredDocuments: ['黑板_第X章.md'], checkpointRequired: true },
  { step: 6, agentId: 'wordcount', name: 'WordCount', nameCn: '字数检查', description: '检查字数是否符合要求(1800-2200字)', inputs: ['第X章_初稿.md'], outputs: ['字数报告'], requiredDocuments: [], checkpointRequired: false },
  { step: 7, agentId: 'polisher', name: 'Polishing', nameCn: '文本优化', description: '优化对话流畅度，增强描写细腻度', inputs: ['第X章_初稿.md'], outputs: ['第X章_润色稿.md'], requiredDocuments: [], checkpointRequired: false },
  { step: 8, agentId: 'verifier', name: 'Verification', nameCn: '质量验证', description: '运行33维度质量验证，生成验证报告', inputs: ['第X章_润色稿.md', '黑板文档'], outputs: ['验证报告_第X章.md'], requiredDocuments: ['验证报告_第X章.md'], checkpointRequired: true },
  { step: 9, agentId: 'reviser', name: 'Revision', nameCn: '问题修复', description: '修复验证官发现的问题', inputs: ['验证报告_第X章.md'], outputs: ['第X章_修订稿.md'], requiredDocuments: [], checkpointRequired: false },
  { step: 10, agentId: 'learning-agent', name: 'Learning', nameCn: '经验沉淀', description: '更新Truth Files，沉淀本章经验', inputs: ['第X章_修订稿.md'], outputs: ['Truth Files更新'], requiredDocuments: ['current_state.md', 'pending_hooks.md', 'chapter_summaries.md'], checkpointRequired: true },
];
