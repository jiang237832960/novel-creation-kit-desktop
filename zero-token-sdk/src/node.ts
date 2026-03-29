import type { 
  ZeroTokenSDK, 
  ZeroTokenConfig, 
  ProviderInfo, 
  AuthStatus, 
  ChatRequest, 
  ChatResponse,
  ImageRequest,
  VideoRequest,
  AudioRequest,
  ModelCategory
} from './types';
import { DEFAULT_PROVIDERS, getProvidersByCategory } from './providers';

type StreamCallback = (content: string) => void;

interface AuthState {
  cookie: string;
  userAgent: string;
}

class NodeAdapter implements ZeroTokenSDK {
  private config: ZeroTokenConfig;
  private authStates: Map<string, AuthState> = new Map();

  constructor(config: ZeroTokenConfig) {
    this.config = config;
  }

  async init(_config: ZeroTokenConfig): Promise<void> {
    this.config = _config;
  }

  getProviders(category?: ModelCategory): ProviderInfo[] {
    if (category) {
      return getProvidersByCategory(category);
    }
    return DEFAULT_PROVIDERS;
  }

  async getAuthStatus(): Promise<AuthStatus[]> {
    return DEFAULT_PROVIDERS.map(p => ({
      provider: p.id,
      name: p.name,
      category: p.category,
      authenticated: this.authStates.has(p.id),
    }));
  }

  async login(providerId: string): Promise<void> {
    const provider = DEFAULT_PROVIDERS.find(p => p.id === providerId);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }
    
    if (this.config.mode === 'node') {
      try {
        const { shell } = await import('electron');
        await shell.openExternal(provider.baseUrl);
      } catch {
        console.log(`Please login at: ${provider.baseUrl}`);
      }
    } else {
      console.log(`Please login at: ${provider.baseUrl}`);
    }
  }

  async setCredentials(providerId: string, cookie: string, userAgent?: string): Promise<void> {
    this.authStates.set(providerId, {
      cookie,
      userAgent: userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });
  }

  async logout(providerId: string): Promise<void> {
    this.authStates.delete(providerId);
  }

  private getAuth(providerId: string): AuthState {
    const auth = this.authStates.get(providerId);
    if (!auth) {
      throw new Error(`Not logged in to ${providerId}. Please call login() or setCredentials() first.`);
    }
    return auth;
  }

  private getProviderInfo(providerId: string) {
    const provider = DEFAULT_PROVIDERS.find(p => p.id === providerId);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }
    return provider;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const [providerId] = request.model.split('/');
    const auth = this.getAuth(providerId);
    const provider = this.getProviderInfo(providerId);

    const response = await fetch(`${provider.baseUrl}${provider.apiPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': auth.cookie,
        'User-Agent': auth.userAgent,
        'Origin': provider.baseUrl,
        'Referer': provider.baseUrl,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return {
      id: data.id || `chat-${Date.now()}`,
      model: request.model,
      choices: [{
        message: {
          role: 'assistant',
          content: data.choices?.[0]?.message?.content || data.content?.[0]?.text || '',
        },
        finishReason: data.choices?.[0]?.finish_reason || 'stop',
      }],
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      } : undefined,
    };
  }

  async chatStream(request: ChatRequest, onChunk: StreamCallback): Promise<void> {
    const [providerId] = request.model.split('/');
    const auth = this.getAuth(providerId);
    const provider = this.getProviderInfo(providerId);

    const response = await fetch(`${provider.baseUrl}${provider.apiPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': auth.cookie,
        'User-Agent': auth.userAgent,
        'Origin': provider.baseUrl,
        'Referer': provider.baseUrl,
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

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
          if (content) onChunk(content);
        } catch {}
      }
    }
  }

  async generateImage(request: ImageRequest): Promise<{ url: string }> {
    const [providerId] = request.model.split('/');
    const auth = this.getAuth(providerId);
    const provider = this.getProviderInfo(providerId);

    const response = await fetch(`${provider.baseUrl}${provider.apiPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': auth.cookie,
        'User-Agent': auth.userAgent,
        'Origin': provider.baseUrl,
        'Referer': provider.baseUrl,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }

    const data = await response.json();
    return { url: data.data?.[0]?.url || '' };
  }

  async generateVideo(request: VideoRequest): Promise<{ url: string }> {
    const [providerId] = request.model.split('/');
    const auth = this.getAuth(providerId);
    const provider = this.getProviderInfo(providerId);

    const response = await fetch(`${provider.baseUrl}${provider.apiPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': auth.cookie,
        'User-Agent': auth.userAgent,
        'Origin': provider.baseUrl,
        'Referer': provider.baseUrl,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }

    const data = await response.json();
    return { url: data.data?.[0]?.url || '' };
  }

  async textToSpeech(request: AudioRequest): Promise<{ url: string }> {
    const [providerId] = request.model.split('/');
    const auth = this.getAuth(providerId);
    const provider = this.getProviderInfo(providerId);

    const response = await fetch(`${provider.baseUrl}${provider.apiPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': auth.cookie,
        'User-Agent': auth.userAgent,
        'Origin': provider.baseUrl,
        'Referer': provider.baseUrl,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }

    const data = await response.json();
    return { url: data.url || data.data?.[0] || '' };
  }

  destroy(): void {
    this.authStates.clear();
  }
}

export { NodeAdapter };
