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
      { id: 'archivist', name: 'Archivist', nameCn: '档案员', status: 'pending', description: '构建上下文，维护设定与伏笔' },
      { id: 'stylist', name: 'Stylist', nameCn: '文风师', status: 'pending', description: '分析文风，制定风格指南' },
      { id: 'screenwriter', name: 'Screenwriter', nameCn: '编剧', status: 'pending', description: '设计场景，规划剧情' },
      { id: 'writer', name: 'Writer', nameCn: '写手', status: 'pending', description: '正文初稿写作' },
      { id: 'wordcount', name: 'WordCount', nameCn: '字数管控师', status: 'pending', description: '字数监控与合规校验' },
      { id: 'polisher', name: 'Polisher', nameCn: '润色师', status: 'pending', description: '文本润色与AI痕迹去除' },
      { id: 'verifier', name: 'Verifier', nameCn: '验证官', status: 'pending', description: '33维度审计' },
      { id: 'reviser', name: 'Reviser', nameCn: '修订师', status: 'pending', description: '问题修复与细节优化' },
      { id: 'learning', name: 'Learning', nameCn: '学习代理', status: 'pending', description: '沉淀经验，更新Truth Files' },
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
      archivist: '你是档案员，负责构建创作上下文，维护设定与伏笔。读取并整理项目设定、人物状态、世界规则等信息，为后续创作提供准确的基础数据。',
      stylist: '你是文风师，负责分析并制定文风指南。根据用户偏好和作品类型，制定章节的文风标准，包括语气、句式、节奏等方面的指导。',
      screenwriter: '你是编剧，负责场景设计和剧情架构。设计具体场景，规划情节发展，埋设伏笔，确保故事线清晰有趣。',
      writer: '你是写手，负责正文初稿写作。基于细纲和上下文，创作符合要求的正文内容。',
      wordcount: '你是字数管控师，负责字数监控与合规校验。检查章节字数是否符合要求，提供优化建议。',
      polisher: '你是润色师，负责文本润色与AI痕迹去除。优化语言表达，去除生硬表达，增强阅读体验。',
      verifier: '你是验证官，负责33维度审计。全面检查内容质量、一致性、逻辑性等问题。',
      reviser: '你是修订师，负责问题修复与细节优化。根据验证结果修复问题，优化内容细节。',
      learning: '你是学习代理，负责沉淀经验与更新设定。总结本次创作的经验教训，更新Truth Files。',
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
