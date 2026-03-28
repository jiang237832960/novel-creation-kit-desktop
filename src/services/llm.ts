import type { LLMConfig, Agent } from '../types';

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
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'custom',
          messages,
          temperature: temperature ?? 0.7,
          max_tokens: maxTokens ?? 2000,
        }),
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

class LLMService {
  private providers: Map<string, LLMProvider> = new Map();
  private currentProvider: LLMProvider;
  private config: LLMConfig;

  constructor() {
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('claude', new ClaudeProvider());
    this.providers.set('custom', new CustomProvider());
    
    this.currentProvider = this.providers.get('openai')!;
    
    this.config = {
      provider: 'openai',
      apiKey: '',
      endpoint: '',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
    };
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

  getProviderName(): string {
    return this.currentProvider.name;
  }

  getAvailableModels(): string[] {
    return this.currentProvider.getModels();
  }

  isConfigured(): boolean {
    if (!this.config.apiKey) return false;
    if (this.config.provider === 'custom' && !this.config.endpoint) return false;
    return true;
  }
}

export const llmService = new LLMService();

export class CreativeDirector {
  private llm = llmService;
  private workflowEngine: WorkflowEngine;

  constructor() {
    this.workflowEngine = new WorkflowEngine();
  }

  async processUserRequest(userInput: string): Promise<{
    success: boolean;
    response?: string;
    workflowStarted?: boolean;
    error?: string;
  }> {
    if (!this.llm.isConfigured()) {
      return {
        success: false,
        error: 'LLM未配置，请在设置中配置API密钥'
      };
    }

    const systemPrompt = `你是创作总监，是用户与系统的唯一交互入口。你的职责包括：
1. 精准解析用户的创作需求，提取核心参数
2. 调度对应的Agent执行专属技能
3. 审核全局技能规则，确保执行不偏离
4. 管控创作全流程，确保每个环节执行到位

当用户提出创作需求时，你需要：
1. 理解用户想要创作什么（类型、题材、风格）
2. 判断需要启动什么样的工作流
3. 将任务分解并分配给合适的Agent

当前系统支持的Agent有：
- 总导演：章节创作调度、任务拆解
- 档案员：上下文组装、伏笔追踪
- 文风师：文风标准制定
- 编剧：场景设计、剧情架构
- 写手：正文初稿写作
- 字数管控师：字数监控
- 润色师：文本润色
- 验证官：全维度校验
- 修订师：问题修复
- 学习代理：经验沉淀

请以创作总监的身份回复用户，并执行相应的工作流。`;

    try {
      const response = await this.llm.sendMessage([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput }
      ]);

      if (!response.success) {
        return { success: false, error: response.error };
      }

      return {
        success: true,
        response: response.content,
        workflowStarted: true
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
      'creative-director': '你是创作总监，是用户与系统的唯一交互入口。你的职责包括：1）精准解析用户的创作需求，提取核心参数；2）调度对应的Agent执行专属技能；3）审核全局技能规则，确保执行不偏离；4）管控创作全流程，确保每个环节执行到位。严格遵循全局公共资源库的规则，确保技能执行一致性。',
      'chief-director': '你是总导演，负责章节创作调度、任务拆解与内部终审。基于编剧创作的细纲与全局规则、网文节奏标准，拆解章节创作任务，调度档案员、文风师、写手等后续Agent执行对应技能，统筹章节创作全流程，把控网文更新节奏与章节断更应急处理，完成章节内部终审，确保各Agent技能执行衔接顺畅、符合全局规则、细纲要求及网文节奏规范。',
      archivist: '你是档案员，负责上下文组装、设定维护与伏笔追踪。基于全局设定规则、网文专属规范与编剧创作的场景、细纲，组装项目上下文，维护人物状态与伏笔；配合编剧的伏笔规划、爽点设计，记录所有角色（含网文配角）的状态变动轨迹、伏笔铺设与回收情况，实时更新人物状态追踪表、伏笔追踪表、网文配角管理表，为写手、润色师提供准确参考，确保设定、人物、伏笔的一致性。',
      stylist: '你是文风师，负责文风标准制定与叙事节奏控制。基于用户偏好、网文文风规范与类型文风规范，制定章节文风指南（适配网文口语化、短句节奏、情绪渲染需求），控制网文章节节奏（开头钩子、中间爽点、结尾留坑），确保文风贴合网文读者阅读习惯。',
      screenwriter: '你是编剧，负责场景设定、剧情架构、伏笔规划与细纲创作。完成小说场景设定（含场景细节、氛围适配），搭建剧情架构，规划伏笔铺设与网文爽点设计，同时创作细纲——作为大纲的细分展开，具体到每一个章节的内容分配、爽点位置、钩子设计、节奏把控。将场景设定、伏笔规划、爽点设计同步给档案员，为总导演拆解任务提供依据。',
      writer: '你是写手，负责正文初稿写作与场景/对话创作。基于编剧创作的细纲、爽点钩子设计，档案员提供的上下文、人物/伏笔追踪信息及网文配角管理信息，结合文风师制定的网文适配文风指南与全局规则，完成正文初稿，贴合用户偏好与类型风格，突出网文爽点、强化情绪渲染，控制短句节奏，确保正文内容与设定、细纲、网文节奏要求高度一致。',
      wordcount: '你是字数管控师，负责字数监控与合规校验。基于全局字数标准、网文更新规范，监控正文章字数，结合网文日/周更新计划，提出字数分配优化建议，确保单章节字数达标、更新节奏稳定，同时规避字数冗余。',
      polisher: '你是润色师，负责文本润色、AI痕迹去除与语言优化。基于文风指南、网文文风规范、全局规则与写手提交的正文初稿，润色文本、去除AI痕迹、优化语言表达，强化网文情绪渲染与短句节奏，保留爽点冲击力，同时参考档案员维护的人物状态、场景设定、网文配角信息，确保润色后内容贴合人设、场景及网文阅读习惯。',
      verifier: '你是验证官，负责全维度校验、问题定位与根因分析。基于全局规则、网文专属规范与问题案例库，执行全维度校验，定位问题根因，匹配解决方案。重点负责跨章节内容的语义雷同检测、网文爽点密度校验、钩子合理性校验，识别重复内容、冗余表述、爽点不足、钩子无效等问题，将校验报告同步给修订师。同时校验档案员维护的各类追踪表准确性。',
      reviser: '你是修订师，负责问题修复、细节优化与一致性校准。基于验证官出具的校验报告、网文专属解决方案与全局解决方案，修复语义雷同、设定不一致、爽点不足、钩子无效等问题，优化内容细节与网文节奏。同步对接档案员，根据问题修复情况更新人物状态、伏笔、网文配角等相关追踪表，确保内容与设定、追踪表、网文规范一致。',
      'learning-agent': '你是学习代理，是技能迭代的核心。职责包括：1）维护全局公共资源库结构，项目初始化时自动加载对应类型的规则、偏好、经验；2）从项目创作中提取可复用经验，统计问题频次，优化技能规则与预防方案；3）根据用户反馈，实时更新对应类型的用户偏好画像；4）基于学习沉淀，优化全局技能规则，同步适配所有Agent的执行技能。所有更新需记录来源和原因。',
      'flexible-agent': '你是灵活Agent，根据具体创作需求灵活适配。当有特殊需求时，参与对应的工作流环节，提供额外的创作支持。',
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
