import type { ZeroTokenConfig, ZeroTokenProvider, ZeroTokenModel, ChatMessage, ZeroTokenChatRequest } from '../types';

const DEFAULT_GATEWAY_URL = 'http://127.0.0.1:3001';

export class ZeroTokenService {
  private gatewayUrl: string;
  private gatewayToken: string;
  private providers: ZeroTokenProvider[] = [];
  private activeProvider: string = '';
  private activeModel: string = '';

  constructor(gatewayUrl: string = DEFAULT_GATEWAY_URL, gatewayToken: string = '') {
    this.gatewayUrl = gatewayUrl;
    this.gatewayToken = gatewayToken;
  }

  setConfig(config: Partial<ZeroTokenConfig>): void {
    if (config.gatewayUrl) this.gatewayUrl = config.gatewayUrl;
    if (config.gatewayToken) this.gatewayToken = config.gatewayToken;
    if (config.providers) this.providers = config.providers;
    if (config.activeProvider) this.activeProvider = config.activeProvider;
    if (config.activeModel) this.activeModel = config.activeModel;
  }

  getConfig(): { gatewayUrl: string; gatewayToken: string } {
    return {
      gatewayUrl: this.gatewayUrl,
      gatewayToken: this.gatewayToken,
    };
  }

  getActiveProvider(): string {
    return this.activeProvider;
  }

  getActiveModel(): string {
    return this.activeModel;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.gatewayToken) {
      headers['Authorization'] = `Bearer ${this.gatewayToken}`;
    }
    return headers;
  }

  async checkConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.gatewayUrl}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (response.ok) {
        return { success: true };
      }
      return { success: false, error: `HTTP ${response.status}` };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '连接失败' };
    }
  }

  async fetchModels(): Promise<{ success: boolean; providers?: ZeroTokenProvider[]; error?: string }> {
    try {
      const response = await fetch(`${this.gatewayUrl}/v1/models`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }
      const data = await response.json();
      const providers = this.parseModelsResponse(data);
      this.providers = providers;
      return { success: true, providers };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '获取模型列表失败' };
    }
  }

  private parseModelsResponse(data: unknown): ZeroTokenProvider[] {
    const providers: ZeroTokenProvider[] = [];
    if (!data || typeof data !== 'object') return providers;

    const dataObj = data as Record<string, unknown>;
    
    if (dataObj.data && Array.isArray(dataObj.data)) {
      const models = dataObj.data as Array<{
        id?: string;
        name?: string;
        provider?: string;
        context_window?: number;
        max_tokens?: number;
        reasoning?: boolean;
        input_modalities?: string[];
        output_modalities?: string[];
      }>;

      const providerMap = new Map<string, ZeroTokenModel[]>();

      for (const model of models) {
        const id = model.id || 'unknown';
        const parts = id.split('/');
        const providerId = parts[0] || 'unknown';
        const modelName = parts.slice(1).join('/') || id;

        if (!providerMap.has(providerId)) {
          providerMap.set(providerId, []);
        }

        providerMap.get(providerId)!.push({
          id: modelName,
          name: model.name || modelName,
          provider: providerId,
          contextWindow: model.context_window || 64000,
          maxTokens: model.max_tokens || 4096,
          reasoning: model.reasoning,
          inputModalities: model.input_modalities,
          outputModalities: model.output_modalities,
        });
      }

      const providerNames: Record<string, string> = {
        'deepseek-web': 'DeepSeek',
        'claude-web': 'Claude Web',
        'chatgpt-web': 'ChatGPT Web',
        'gemini-web': 'Gemini Web',
        'qwen-web': 'Qwen',
        'qwen-cn-web': 'Qwen 中国',
        'kimi-web': 'Kimi',
        'doubao-web': '豆包',
        'grok-web': 'Grok',
        'glm-web': 'GLM',
        'glm-intl-web': 'GLM 国际',
        'xiaomimo-web': '小米 MiMo',
        'perplexity-web': 'Perplexity',
      };

      for (const [providerId, models] of providerMap) {
        providers.push({
          id: providerId,
          name: providerNames[providerId] || providerId,
          status: 'configured',
          models,
        });
      }
    }

    return providers;
  }

  async sendMessage(
    messages: ChatMessage[],
    model: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<{ success: boolean; content?: string; error?: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    try {
      const request: ZeroTokenChatRequest = {
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 2000,
      };

      const response = await fetch(`${this.gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        content: data.choices?.[0]?.message?.content || '',
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        } : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '请求失败',
      };
    }
  }

  async sendStreamingMessage(
    messages: ChatMessage[],
    model: string,
    onChunk: (content: string) => void,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const request: ZeroTokenChatRequest = {
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 2000,
        stream: true,
      };

      const response = await fetch(`${this.gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `HTTP ${response.status}`,
        };
      }

      const reader = response.body?.getReader();
      if (!reader) {
        return { success: false, error: '无法读取响应流' };
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch {
            // skip invalid JSON
          }
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '流式请求失败',
      };
    }
  }

  getAvailableProviders(): ZeroTokenProvider[] {
    return this.providers;
  }

  getModelsByProvider(providerId: string): ZeroTokenModel[] {
    const provider = this.providers.find(p => p.id === providerId);
    return provider?.models || [];
  }

  isConfigured(): boolean {
    return this.providers.length > 0 && !!this.activeModel;
  }

  getGatewayUrl(): string {
    return this.gatewayUrl;
  }

  setGatewayUrl(url: string): void {
    this.gatewayUrl = url;
  }

  setGatewayToken(token: string): void {
    this.gatewayToken = token;
  }
}

export const zeroTokenService = new ZeroTokenService();
