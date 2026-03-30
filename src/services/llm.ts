import type { LLMConfig, Agent, NovelType } from '../types';
import { zeroTokenService } from './zeroToken';

export interface PendingProject {
  name?: string;
  type?: NovelType;
  description?: string;
  confirmed: boolean;
}

export interface OnProjectCreateCallback {
  (project: { name: string; type: NovelType; description?: string }): void;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  name: string;
  sendMessage: (messages: LLMMessage[], config: Partial<LLMConfig>) => Promise<LLMResponse>;
  getModels: () => string[];
}

class OpenAIProvider implements LLMProvider {
  name = 'OpenAI';

  async sendMessage(messages: LLMMessage[], config: Partial<LLMConfig>): Promise<LLMResponse> {
    const { apiKey, endpoint, model, temperature, maxTokens } = config;
    
    if (!apiKey) {
      return { success: false, error: 'API Key 未设置' };
    }

    try {
      const response = await fetch(endpoint || 'https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4',
          messages,
          temperature: temperature ?? 0.7,
          max_tokens: maxTokens ?? 2000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `API 请求失败: ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        content: data.choices?.[0]?.message?.content || '',
        usage: data.usage,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络请求失败',
      };
    }
  }

  getModels(): string[] {
    return ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'];
  }
}

class ClaudeProvider implements LLMProvider {
  name = 'Claude';

  async sendMessage(messages: LLMMessage[], config: Partial<LLMConfig>): Promise<LLMResponse> {
    const { apiKey, model, temperature, maxTokens } = config;
    
    if (!apiKey) {
      return { success: false, error: 'API Key 未设置' };
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: model || 'claude-3-sonnet-20240229',
          max_tokens: maxTokens ?? 2000,
          temperature: temperature ?? 0.7,
          messages: messages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `API 请求失败: ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        content: data.content?.[0]?.text || '',
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络请求失败',
      };
    }
  }

  getModels(): string[] {
    return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-5-sonnet-20241022', 'claude-2.1'];
  }
}

class CustomProvider implements LLMProvider {
  name = 'Custom';

  async sendMessage(messages: LLMMessage[], config: Partial<LLMConfig>): Promise<LLMResponse> {
    const { apiKey, endpoint, model, temperature, maxTokens } = config;
    
    if (!apiKey || !endpoint) {
      return { success: false, error: 'API Key 或 Endpoint 未设置' };
    }

    try {
      // Ensure endpoint has proper path for OpenAI-compatible APIs
      let fullEndpoint = endpoint;
      if (!endpoint.includes('/v1/chat/completions')) {
        fullEndpoint = endpoint.replace(/\/$/, '') + '/v1/chat/completions';
      }

      const body = {
        model: model || 'custom',
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens ?? 2000,
      };

      // Use Electron IPC proxy to avoid CORS issues in desktop app
      if (window.electronAPI?.customApi) {
        const result = await window.electronAPI.customApi.proxy({
          endpoint: fullEndpoint,
          apiKey,
          body,
        });

        if (!result.success) {
          return {
            success: false,
            error: result.error || 'API 请求失败',
          };
        }

        return {
          success: true,
          content: result.data?.choices?.[0]?.message?.content || result.data?.content || '',
        };
      }

      // Fallback to direct fetch for web version
      const response = await fetch(fullEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `API 请求失败: ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        content: data.choices?.[0]?.message?.content || data.content || '',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络请求失败',
      };
    }
  }

  getModels(): string[] {
    return ['custom-model'];
  }
}

class ZeroTokenProvider implements LLMProvider {
  name = 'Zero Token';

  async sendMessage(messages: LLMMessage[], config: Partial<LLMConfig>): Promise<LLMResponse> {
    const { model, temperature, maxTokens } = config;
    
    if (!zeroTokenService.isConfigured()) {
      const result = await zeroTokenService.fetchModels();
      if (!result.success || !result.providers?.length) {
        return { success: false, error: 'Zero Token 网关未配置或无可用模型' };
      }
    }

    const chatMessages = messages.map(m => ({
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      timestamp: new Date().toISOString(),
    }));

    const result = await zeroTokenService.sendMessage(
      chatMessages,
      model || zeroTokenService.getActiveModel(),
      { temperature, maxTokens }
    );

    return {
      success: result.success,
      content: result.content,
      error: result.error,
      usage: result.usage,
    };
  }

  getModels(): string[] {
    const models: string[] = [];
    const providers = zeroTokenService.getAvailableProviders();
    for (const provider of providers) {
      for (const model of provider.models) {
        models.push(`${provider.id}/${model.id}`);
      }
    }
    return models.length > 0 ? models : ['deepseek-web/deepseek-chat', 'claude-web/claude-sonnet-4-6'];
  }
}

interface MemoryBlock {
  id: string;
  type: 'project_info' | 'user_preference' | 'conversation_summary' | 'key_decision';
  content: string;
  timestamp: string;
  importance: number;
}

class LLMService {
  private providers: Map<string, LLMProvider> = new Map();
  private currentProvider: LLMProvider;
  private config: LLMConfig;
  private conversationHistory: LLMMessage[] = [];
  private systemPrompt: string = '';
  private memoryBlocks: MemoryBlock[] = [];
  private projectContext: {
    name?: string;
    type?: string;
    platform?: string;
    style?: string;
    wordCount?: string;
  } = {};

  constructor() {
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('claude', new ClaudeProvider());
    this.providers.set('custom', new CustomProvider());
    this.providers.set('zero-token', new ZeroTokenProvider());
    
    this.currentProvider = this.providers.get('openai')!;
    
    this.config = {
      provider: 'openai',
      apiKey: '',
      endpoint: '',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
    };

    this.systemPrompt = this.getDefaultSystemPrompt();
    this.loadMemoryBlocks();
  }

  private getDefaultSystemPrompt(): string {
    return `你是创作总监，是用户与系统的唯一交互入口。

核心职责：
1. 精准解析用户的创作需求，提取核心参数（项目名称、类型、题材、风格）
2. 调度对应的Agent执行专属技能
3. 审核全局技能规则，确保执行不偏离
4. 管控创作全流程，确保每个环节执行到位

重要规则：
- 一旦用户提供了信息（书名、类型、风格、字数等），必须记住
- 不重复询问用户已确认的信息
- 严格按照用户指令执行，不额外询问
- 如果用户要求直接开始创作，立即启动工作流

当前已确认的创作参数：
${this.getProjectContextSummary()}

你的回复应该：
- 直接执行用户指令，不要重复询问已提供的信息
- 如果信息不足，先基于已知参数推断执行
- 定期将关键信息存入记忆块`;
  }

  private getProjectContextSummary(): string {
    if (Object.keys(this.projectContext).length === 0) {
      return '（暂无已确认的创作参数）';
    }
    return Object.entries(this.projectContext)
      .map(([key, value]) => `- ${key}: ${value || '待定'}`)
      .join('\n');
  }

  updateProjectContext(updates: Partial<typeof LLMService.prototype.projectContext>): void {
    this.projectContext = { ...this.projectContext, ...updates };
    this.persistMemoryBlocks();
    this.updateSystemPrompt();
  }

  getProjectContext(): typeof this.projectContext {
    return { ...this.projectContext };
  }

  addMemoryBlock(type: MemoryBlock['type'], content: string, importance: number = 5): void {
    const block: MemoryBlock = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      content,
      timestamp: new Date().toISOString(),
      importance,
    };
    this.memoryBlocks.push(block);
    this.persistMemoryBlocks();
  }

  getMemoryBlocks(type?: MemoryBlock['type']): MemoryBlock[] {
    if (type) {
      return this.memoryBlocks.filter(b => b.type === type);
    }
    return [...this.memoryBlocks].sort((a, b) => b.importance - a.importance);
  }

  private persistMemoryBlocks(): void {
    const data = {
      memoryBlocks: this.memoryBlocks,
      projectContext: this.projectContext,
    };
    localStorage.setItem('llm_memory_blocks', JSON.stringify(data));
  }

  private loadMemoryBlocks(): void {
    try {
      const stored = localStorage.getItem('llm_memory_blocks');
      if (stored) {
        const data = JSON.parse(stored);
        this.memoryBlocks = data.memoryBlocks || [];
        this.projectContext = data.projectContext || {};
        this.updateSystemPrompt();
      }
    } catch (e) {
      console.warn('Failed to load memory blocks:', e);
    }
  }

  clearMemory(): void {
    this.memoryBlocks = [];
    this.projectContext = {};
    this.conversationHistory = [];
    localStorage.removeItem('llm_memory_blocks');
    this.updateSystemPrompt();
  }

  private updateSystemPrompt(): void {
    this.systemPrompt = this.getDefaultSystemPrompt();
  }

  private extractProjectInfoFromText(text: string): void {
    const patterns = {
      name: /书名[：:]\s*["']?([^"'@\n]+)["']?/i,
      type: /(?:类型|题材|分类)[：:]\s*["']?([^"'@\n]+)["']?/i,
      style: /(?:风格|文风)[：:]\s*["']?([^"'@\n]+)["']?/i,
      wordCount: /(\d+\s*万?[字章节])/i,
      platform: /(?:平台|发布)[：:]\s*["']?([^"'@\n]+)["']?/i,
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        const value = match[1].trim();
        if (value && value !== '待定') {
          (this.projectContext as any)[key] = value;
        }
      }
    }

    if (Object.keys(this.projectContext).length > 0) {
      this.persistMemoryBlocks();
    }
  }

  setConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };
    
    const provider = this.providers.get(this.config.provider);
    if (provider) {
      this.currentProvider = provider;
    }
  }

  getConfig(): LLMConfig {
    return { ...this.config };
  }

  async sendMessage(messages: LLMMessage[]): Promise<LLMResponse> {
    return this.currentProvider.sendMessage(messages, this.config);
  }

  async sendMessageWithHistory(userMessage: string): Promise<LLMResponse> {
    // 提取项目信息
    this.extractProjectInfoFromText(userMessage);

    // 添加用户消息到历史
    this.conversationHistory.push({ role: 'user', content: userMessage });

    // 构建增强的系统提示（包含记忆）
    const memoryContext = this.buildMemoryContext();
    const enhancedSystemPrompt = memoryContext 
      ? `${this.systemPrompt}\n\n## 记忆上下文\n${memoryContext}`
      : this.systemPrompt;

    // 构建完整的消息列表
    const allMessages: LLMMessage[] = [
      { role: 'system', content: enhancedSystemPrompt },
      ...this.conversationHistory.slice(-20), // 保留最近20条
    ];

    const response = await this.currentProvider.sendMessage(allMessages, this.config);

    // 添加助手回复到历史
    if (response.success && response.content) {
      this.conversationHistory.push({ role: 'assistant', content: response.content });
      
      // 从回复中提取关键信息存入记忆
      this.extractAndStoreKeyInfo(response.content);
    }

    return response;
  }

  private buildMemoryContext(): string {
    const contexts: string[] = [];

    // 项目上下文
    if (Object.keys(this.projectContext).length > 0) {
      contexts.push(`【当前项目】\n${this.getProjectContextSummary()}`);
    }

    // 高重要性记忆块
    const importantMemories = this.memoryBlocks
      .filter(b => b.importance >= 7)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);

    if (importantMemories.length > 0) {
      contexts.push(`【重要记忆】\n${importantMemories.map(b => `- ${b.content}`).join('\n')}`);
    }

    return contexts.join('\n\n');
  }

  private extractAndStoreKeyInfo(content: string): void {
    // 从回复中提取关键决策和结论
    const keyPatterns = [
      /已确认[：:]\s*([^。\n]+)/gi,
      /项目[名称类型风格][：:]\s*["']?([^"'。\n]+)["']?/gi,
      /决定[：:]\s*([^。\n]+)/gi,
    ];

    for (const pattern of keyPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const info = match[1].trim();
        if (info.length > 5 && info.length < 100) {
          this.addMemoryBlock('key_decision', info, 6);
        }
      }
    }
  }

  getConversationHistory(): LLMMessage[] {
    return [...this.conversationHistory];
  }

  clearConversationHistory(): void {
    this.conversationHistory = [];
  }

  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  isConfigured(): boolean {
    if (this.config.provider === 'zero-token') {
      return zeroTokenService.isConfigured();
    }
    if (!this.config.apiKey) return false;
    if (this.config.provider === 'custom' && !this.config.endpoint) return false;
    return true;
  }
}

export const llmService = new LLMService();

const NOVEL_TYPES: NovelType[] = ['无限流', '玄幻', '都市', '科幻', '悬疑推理', '其他'];

export class CreativeDirector {
  private llm = llmService;
  private workflowEngine!: WorkflowEngine;
  private pendingProject: PendingProject = { confirmed: false };
  private onProjectCreateCallback?: OnProjectCreateCallback;

  constructor() {
    setTimeout(() => {
      this.workflowEngine = new WorkflowEngine();
    }, 0);
  }

  setOnProjectCreateCallback(callback: OnProjectCreateCallback): void {
    this.onProjectCreateCallback = callback;
  }

  private extractProjectInfo(text: string): Partial<PendingProject> {
    const result: Partial<PendingProject> = {};
    const lowerText = text.toLowerCase();

    const typePatterns: Record<string, NovelType> = {
      '无限流': '无限流',
      '玄幻': '玄幻',
      '都市': '都市',
      '科幻': '科幻',
      '悬疑': '悬疑推理',
      '推理': '悬疑推理',
      '其他': '其他',
    };

    for (const [pattern, type] of Object.entries(typePatterns)) {
      if (text.includes(pattern)) {
        result.type = type;
        break;
      }
    }

    const bookTitleMatch = text.match(/《([^》]+)》/);
    if (bookTitleMatch) {
      result.name = bookTitleMatch[1];
    } else {
      const createProjectMatch = text.match(/创建项目[:：]\s*["']?([^"'，,\n]+)["']?/i);
      if (createProjectMatch) {
        result.name = createProjectMatch[1].trim();
      }
    }

    return result;
  }

  private buildProjectCreationPrompt(userInput: string): string {
    return `你是创作总监，是用户与系统的唯一交互入口。你的职责包括：
1. 精准解析用户的创作需求，提取核心参数
2. 调度对应的Agent执行专属技能
3. 审核全局技能规则，确保执行不偏离
4. 管控创作全流程，确保每个环节执行到位

当前用户想要创建小说项目，请通过对话引导用户完善以下信息：
- 项目名称（书名）
- 小说类型（无限流/玄幻/都市/科幻/悬疑推理/其他）

请以友好、专业的方式与用户对话，询问缺少的信息。
当用户提供了足够信息（至少包括名称和类型），请询问用户确认是否创建项目。
如果用户确认创建，回复"确认创建项目：[项目名称]@[项目类型]"，其中项目和类型用实际值替换。
如果用户表示不需要创建项目，回复"取消创建"并友好地结束对话。`;
  }

  async processUserRequest(userInput: string): Promise<{
    success: boolean;
    response?: string;
    workflowStarted?: boolean;
    projectCreated?: boolean;
    error?: string;
  }> {
    if (!this.llm.isConfigured()) {
      return {
        success: false,
        error: 'LLM未配置，请在设置中配置API密钥'
      };
    }

    const extractedInfo = this.extractProjectInfo(userInput);
    if (extractedInfo.name) this.pendingProject.name = extractedInfo.name;
    if (extractedInfo.type) this.pendingProject.type = extractedInfo.type;

    const isCreateProjectIntent = 
      userInput.includes('创建项目') ||
      userInput.includes('新建项目') ||
      userInput.includes('想写') ||
      userInput.includes('想创作') ||
      userInput.includes('写小说') ||
      userInput.includes('开始') ||
      userInput.includes('构思') ||
      userInput.includes('构思') ||
      extractedInfo.name ||
      extractedInfo.type;

    let systemPrompt: string;
    if (isCreateProjectIntent) {
      systemPrompt = this.buildProjectCreationPrompt(userInput);
    } else {
      systemPrompt = `你是创作总监，是用户与系统的唯一交互入口。

核心职责：
1. 精准解析用户的创作需求，提取核心参数
2. 调度对应的Agent执行专属技能
3. 审核全局技能规则，确保执行不偏离
4. 管控创作全流程，确保每个环节执行到位

重要规则：
- 一旦用户提供了信息（书名、类型、风格、字数等），必须记住
- 不重复询问用户已确认的信息
- 严格按照用户指令执行，不额外询问

当前已确认的创作参数：
- 项目名称：${this.pendingProject.name || '待定'}
- 小说类型：${this.pendingProject.type || '待定'}
- 目标字数：${this.pendingProject.type ? '50万字（番茄平台标准）' : '待定'}
- 发布平台：${this.pendingProject.type ? '番茄' : '待定'}
- 风格：${this.pendingProject.type ? '轻松幽默' : '待定'}

请根据已确认的参数，直接开始创作工作流，不要再询问用户。`;
    }

    try {
      // 使用带历史的消息发送
      this.llm.setSystemPrompt(systemPrompt);
      const response = await this.llm.sendMessageWithHistory(userInput);

      if (!response.success) {
        return { success: false, error: response.error };
      }

      const content = response.content || '';

      const confirmMatch = content.match(/确认创建项目[：:]\s*([^@]+)@(.+?)(?:\s*$|,|\。|\.)/);
      if (confirmMatch && this.onProjectCreateCallback) {
        const projectName = confirmMatch[1].trim();
        const projectType = confirmMatch[2].trim() as NovelType;

        this.onProjectCreateCallback({
          name: projectName,
          type: NOVEL_TYPES.includes(projectType) ? projectType : '其他',
        });

        this.pendingProject = { confirmed: false };

        return {
          success: true,
          response: `项目"${projectName}"创建成功！`,
          workflowStarted: true,
          projectCreated: true,
        };
      }

      if (content.includes('取消创建')) {
        this.pendingProject = { confirmed: false };
      }

      return {
        success: true,
        response: content,
        workflowStarted: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  getWorkflowEngine(): WorkflowEngine {
    return this.workflowEngine;
  }
}

export const creativeDirector = new CreativeDirector();

export class WorkflowEngine {
  private agents: Agent[] = [];
  private currentIndex: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private onStateChange?: (agents: Agent[], status: string) => void;
  private llm = llmService;

  constructor() {
    this.initAgents();
  }

  private initAgents(): void {
    this.agents = [
      { id: 'creative-director', name: 'CreativeDirector', nameCn: '创作总监', status: 'pending', description: '唯一用户交互入口，技能调度核心' },
      { id: 'chief-director', name: 'ChiefDirector', nameCn: '总导演', status: 'pending', description: '章节创作调度、任务拆解、内部终审' },
      { id: 'archivist', name: 'Archivist', nameCn: '档案员', status: 'pending', description: '上下文组装、设定维护、伏笔追踪' },
      { id: 'stylist', name: 'Stylist', nameCn: '文风师', status: 'pending', description: '文风标准制定、叙事节奏控制' },
      { id: 'screenwriter', name: 'Screenwriter', nameCn: '编剧', status: 'pending', description: '场景设定、剧情架构、伏笔规划、细纲创作' },
      { id: 'writer', name: 'Writer', nameCn: '写手', status: 'pending', description: '正文初稿写作、场景/对话创作' },
      { id: 'wordcount', name: 'WordCount', nameCn: '字数管控师', status: 'pending', description: '字数监控、合规校验、优化建议' },
      { id: 'polisher', name: 'Polisher', nameCn: '润色师', status: 'pending', description: '文本润色、AI痕迹去除、语言优化' },
      { id: 'verifier', name: 'Verifier', nameCn: '验证官', status: 'pending', description: '全维度校验、问题定位、根因分析' },
      { id: 'reviser', name: 'Reviser', nameCn: '修订师', status: 'pending', description: '问题修复、细节优化、一致性校准' },
      { id: 'learning-agent', name: 'LearningAgent', nameCn: '学习代理', status: 'pending', description: '沉淀经验、更新TruthFiles、规则迭代' },
      { id: 'flexible-agent', name: 'FlexibleAgent', nameCn: '灵活Agent', status: 'pending', description: '根据需求灵活适配' },
    ];
  }

  setOnStateChange(callback: (agents: Agent[], status: string) => void): void {
    this.onStateChange = callback;
  }

  setLLMConfig(config: Partial<LLMConfig>): void {
    this.llm.setConfig(config);
  }

  start(): void {
    if (this.isRunning && !this.isPaused) return;
    
    if (!this.isRunning) {
      this.initAgents();
      this.currentIndex = 0;
      this.isRunning = true;
    }
    
    this.isPaused = false;
    this.updateAgentStatus(this.currentIndex, 'running');
    this.notifyStateChange();
  }

  pause(): void {
    this.isPaused = true;
    this.updateAgentStatus(this.currentIndex, 'waiting');
    this.notifyStateChange();
  }

  resume(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.updateAgentStatus(this.currentIndex, 'running');
    this.notifyStateChange();
    this.runCurrentAgent();
  }

  stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.notifyStateChange();
  }

  reset(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.initAgents();
    this.currentIndex = 0;
    this.notifyStateChange();
  }

  getAgents(): Agent[] {
    return [...this.agents];
  }

  getCurrentAgent(): Agent | null {
    return this.agents[this.currentIndex] || null;
  }

  isWorkflowRunning(): boolean {
    return this.isRunning && !this.isPaused;
  }

  private updateAgentStatus(index: number, status: Agent['status']): void {
    if (index >= 0 && index < this.agents.length) {
      this.agents[index].status = status;
      if (status === 'running') {
        this.agents[index].startTime = Date.now();
      } else if (status === 'completed' || status === 'failed') {
        this.agents[index].endTime = Date.now();
      }
    }
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      const status = this.isPaused ? 'paused' : this.isRunning ? 'running' : 'idle';
      this.onStateChange([...this.agents], status);
    }
  }

  private async runCurrentAgent(): Promise<void> {
    if (!this.isRunning || this.isPaused) return;
    
    const agent = this.agents[this.currentIndex];
    if (!agent) {
      this.completeWorkflow();
      return;
    }

    try {
      agent.currentTask = `正在执行 ${agent.nameCn} 任务...`;
      this.notifyStateChange();

      await this.executeAgentTask(agent);

      this.updateAgentStatus(this.currentIndex, 'completed');
      agent.currentTask = `${agent.nameCn} 任务已完成`;
      agent.endTime = Date.now();
      this.notifyStateChange();

      this.currentIndex++;
      
      if (this.currentIndex >= this.agents.length) {
        this.completeWorkflow();
      } else if (this.isRunning && !this.isPaused) {
        this.updateAgentStatus(this.currentIndex, 'running');
        this.notifyStateChange();
        setTimeout(() => this.runCurrentAgent(), 500);
      }
    } catch (error) {
      this.updateAgentStatus(this.currentIndex, 'failed');
      this.agents[this.currentIndex].error = error instanceof Error ? error.message : '未知错误';
      this.notifyStateChange();
    }
  }

  private async executeAgentTask(agent: Agent): Promise<void> {
    if (!this.llm.isConfigured()) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return;
    }

    const systemPrompt = this.getAgentSystemPrompt(agent);
    const response = await this.llm.sendMessage([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: agent.input || '开始执行任务' },
    ]);

    if (response.success) {
      agent.output = response.content;
    } else {
      agent.output = '';
      console.warn(`Agent ${agent.name} execution returned:`, response.error);
    }
  }

  private getAgentSystemPrompt(agent: Agent): string {
    const prompts: Record<string, string> = {
      'creative-director': `你是创作总监，是用户与系统的唯一交互入口。

核心职责：
1. 精准解析用户的创作需求，提取核心参数（项目名称、类型、题材、风格）
2. 调度对应的Agent执行专属技能
3. 审核全局技能规则，确保执行不偏离
4. 管控创作全流程，确保每个环节执行到位

工作流程：
- 接收用户输入，判断意图（创建项目/继续创作/修改/查询）
- 调用对应Agent执行任务
- 汇总结果反馈给用户

严格遵循全局公共资源库的规则，确保技能执行一致性。`,

      'chief-director': `你是总导演，负责章节创作调度、任务拆解与内部终审。

核心职责：
1. 基于编剧创作的细纲与全局规则、网文节奏标准，拆解章节创作任务
2. 调度档案员、文风师、写手等后续Agent执行对应技能
3. 统筹章节创作全流程，把控网文更新节奏
4. 完成章节内部终审

番茄签约标准（必须严格执行）：
- 金手指第1章必须觉醒
- 1万字内必须进入第一个副本
- 每2000字至少1个钩子
- 单章字数2000-2200字

确保各Agent技能执行衔接顺畅、符合全局规则、细纲要求及网文节奏规范。`,

      archivist: `你是档案员，负责上下文组装、设定维护与伏笔追踪。

核心职责：
1. 基于全局设定规则、网文专属规范与编剧创作的场景、细纲，组装项目上下文
2. 维护人物状态与伏笔
3. 配合编剧的伏笔规划、爽点设计
4. 记录所有角色（含网文配角）的状态变动轨迹、伏笔铺设与回收情况

Truth Files维护（7个核心文档）：
- current_state.md: 当前世界状态（时间线、地点、关键物品）
- resource_ledger.md: 资源账本（货币、物品、属性）
- pending_hooks.md: 待处理伏笔（伏笔铺设与回收记录）
- chapter_summaries.md: 章节摘要（章节进度与核心事件）
- subplot_board.md: 支线进度板（支线任务与进度）
- emotional_arcs.md: 情感弧线（角色情感变化轨迹）
- character_matrix.md: 角色交互矩阵（角色信息与关系）

为写手、润色师提供准确参考，确保设定、人物、伏笔的一致性。`,

      stylist: `你是文风师，负责文风标准制定与叙事节奏控制。

核心职责：
1. 基于用户偏好、网文文风规范与类型文风规范，制定章节文风指南
2. 控制网文章节节奏（开头钩子、中间爽点、结尾留坑）
3. 提供台词人性化标准

文风指南内容要求：
- 适配网文口语化表达
- 短句节奏控制技巧
- 情绪渲染方法
- 对话自然度标准

群像角色三层结构：
- 层级共性(60%): 同一身份/职业群体的共同特征
- 群体特性(20%): 小群体内的差异化特征
- 个体差异(20%): 独一无二的个人特征

确保文风贴合网文读者阅读习惯。`,

      screenwriter: `你是编剧，负责场景设定、剧情架构、伏笔规划与细纲创作。

核心职责：
1. 完成小说场景设定（含场景细节、氛围适配）
2. 搭建剧情架构
3. 规划伏笔铺设与网文爽点设计
4. 创作细纲（大纲的细分展开）

细纲要求：
- 具体到每一个章节的内容分配
- 爽点位置标注
- 钩子设计
- 节奏把控

黄金开篇标准（第1-3章）：
- 第1章(2000字)：开头3句话危机+规则+惨死 → 中间陷入绝境 → 结尾金手指觉醒
- 第2章：金手指详细介绍 → 第一次破局爽点 → 结尾核心设定+终极目标
- 第3章：进入副本 → 看到致命隐藏规则 → 死亡危机降临

节奏标准：
- 金手指第1章必须觉醒
- 1万字内必须进入第一个副本
- 每2000字至少1个钩子

将场景设定、伏笔规划、爽点设计同步给档案员，为总导演拆解任务提供依据。

重要：在Step 4必须创建黑板文档(黑板_第X章.md)，供写手参考。`,

      writer: `你是写手，负责正文初稿写作与场景/对话创作。

核心职责：
1. 基于编剧创作的细纲、爽点钩子设计创作正文
2. 参考档案员提供的上下文、人物/伏笔追踪信息
3. 结合文风师制定的网文适配文风指南与全局规则完成正文初稿

角色灵魂塑造原则：
- 核心矛盾（三圈模型：表层人设vs深层渴望vs外部规则）
- 角色有缺陷（性格缺陷、能力短板、心理阴影）
- 成长弧光（初始→考验→选择→成长）
- 细节锚点（专属物品、习惯动作、口头禅）

格式强制要求：
- 禁止空行
- 禁止元叙事（禁止"读者"、"前文"、"上文"等指代）
- 禁止结构标记（##场景、---分隔线等）
- 禁止机械时间标注

正文必须：
- 贴合用户偏好与类型风格
- 突出网文爽点
- 强化情绪渲染
- 控制短句节奏
- 确保正文内容与设定、细纲、网文节奏要求高度一致

重要：参考黑板文档(黑板_第X章.md)进行创作。`,

      wordcount: `你是字数管控师，负责字数监控与合规校验。

核心职责：
1. 基于全局字数标准、网文更新规范，监控正文章字数
2. 结合网文日/周更新计划，提出字数分配优化建议
3. 确保单章节字数达标、更新节奏稳定

番茄签约标准：
- 单章字数：2000-2200字（最高不超过2500字）
- 日更节奏：稳定更新是追更率的关键
- 字数冗余：避免水文，保持内容密度

工作内容：
- 检查字数是否达标
- 如不足，指导增加细节
- 如超标，指导精简内容
- 提供字数优化建议`,

      polisher: `你是润色师，负责文本润色、AI痕迹去除与语言优化。

核心职责：
1. 基于文风指南、网文文风规范、全局规则与写手提交的正文初稿，润色文本
2. 去除AI痕迹、优化语言表达
3. 强化网文情绪渲染与短句节奏
4. 保留爽点冲击力

去AI味核心技巧：

语言层面：
- 去除过度礼貌的表达
- 口语化改造
- 增加语气词
- 词汇接地气

结构层面：
- 打破完美结构
- 长短句交错
- 段落长短不一

内容层面：
- 增加具体细节
- 增强情绪波动
- 个性化表达

同时参考档案员维护的人物状态、场景设定、网文配角信息，确保润色后内容贴合人设、场景及网文阅读习惯。`,

      verifier: `你是验证官，负责全维度校验、问题定位与根因分析。

核心职责：
1. 基于全局规则、网文专属规范与问题案例库，执行全维度校验
2. 定位问题根因，匹配解决方案
3. 识别重复内容、冗余表述、爽点不足、钩子无效等问题
4. 重点负责跨章节内容的语义雷同检测

33维度审计标准：

A类-基础一致性（严重问题）：
- OOC检测：角色行为与人设矛盾
- 战力崩坏：战力数值不合理波动
- 时间线矛盾：时间逻辑错误
- 设定冲突：世界观设定矛盾

B类-内容质量（内容问题）：
- 词汇疲劳：高疲劳词使用过度
- 台词失真：对话不符合人物性格
- 描述重复：场景/动作描写重复

C类-AI痕迹（风格问题）：
- 段落等长：段落长度过于均匀
- 套话密度：AI生成套路化表达
- 句式单一：句式变化少

D类-故事结构：
- 支线停滞：支线长期无进展
- 高潮缺失：缺少情绪高潮点

E类-合规（致命问题）：
- 敏感词、版权问题、政治敏感

细纲匹配率验证：≥90%

将校验报告同步给修订师。同时校验档案员维护的各类追踪表准确性。`,

      reviser: `你是修订师，负责问题修复、细节优化与一致性校准。

核心职责：
1. 基于验证官出具的校验报告、网文专属解决方案与全局解决方案，修复问题
2. 优化内容细节与网文节奏
3. 同步对接档案员，根据问题修复情况更新人物状态、伏笔、网文配角等相关追踪表
4. 确保内容与设定、追踪表、网文规范一致

修复原则：
- 修复时不增加AI痕迹
- 保持原文的优点和特色
- 确保修复后的内容流畅自然
- 同步更新所有相关的Truth Files`,

      'learning-agent': `你是学习代理，是技能迭代的核心。

核心职责：
1. 维护全局公共资源库结构，项目初始化时自动加载对应类型的规则、偏好、经验
2. 从项目创作中提取可复用经验，统计问题频次，优化技能规则与预防方案
3. 根据用户反馈，实时更新对应类型的用户偏好画像
4. 基于学习沉淀，优化全局技能规则，同步适配所有Agent的执行技能

错误预防机制：
- 统计高频错误类型
- 制定预防策略
- 更新规则库

经验沉淀：
- 记录成功案例
- 提取可复用方法论
- 更新最佳实践库

所有更新需记录来源和原因，确保知识可追溯。`,

      'flexible-agent': `你是灵活Agent，根据具体创作需求灵活适配。

核心职责：
1. 根据具体创作需求灵活适配
2. 当有特殊需求时，参与对应的工作流环节
3. 提供额外的创作支持

工作方式：
- 接收创作总监的任务分配
- 灵活调整工作内容
- 提供专业建议和支持`,
    };
    return prompts[agent.id] || '执行对应任务';
  }

  private completeWorkflow(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.notifyStateChange();
  }
}

export const workflowEngine = new WorkflowEngine();
