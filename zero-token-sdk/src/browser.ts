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
import { DEFAULT_PROVIDERS, MODEL_CATEGORIES, getProvidersByCategory } from './providers';

type StreamCallback = (content: string) => void;

declare const chrome: typeof globalThis & { 
  runtime?: { 
    sendMessage: (message: any) => Promise<any>;
  } 
};

class BrowserExtensionAdapter implements ZeroTokenSDK {
  async init(_config: ZeroTokenConfig): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      throw new Error('Chrome extension not found');
    }
  }

  getProviders(category?: ModelCategory): ProviderInfo[] {
    if (category) {
      return getProvidersByCategory(category);
    }
    return DEFAULT_PROVIDERS;
  }

  async getAuthStatus(): Promise<AuthStatus[]> {
    const response = await chrome.runtime!.sendMessage({ action: 'getAuthStatus' });
    if (!response.success) {
      throw new Error(response.error || 'Failed to get auth status');
    }
    return response.status;
  }

  async login(providerId: string): Promise<void> {
    const response = await chrome.runtime!.sendMessage({ action: 'openLogin', data: { providerId } });
    if (!response.success) {
      throw new Error(response.error || 'Failed to open login');
    }
  }

  async logout(_providerId: string): Promise<void> {}

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const [providerId] = request.model.split('/');    
    const response = await chrome.runtime!.sendMessage({
      action: 'proxyRequest',
      data: { providerId, body: request },
    });

    if (!response.success) {
      throw new Error(response.error || 'Request failed');
    }

    const data = JSON.parse(response.result.body);
    return {
      id: data.id || `chat-${Date.now()}`,
      model: request.model,
      choices: [{
        message: {
          role: 'assistant',
          content: data.choices?.[0]?.message?.content || data.content?.[0]?.text || '',
        },
        finishReason: 'stop',
      }],
    };
  }

  async chatStream(request: ChatRequest, onChunk: StreamCallback): Promise<void> {
    const response = await this.chat({ ...request, stream: false });
    onChunk(response.choices[0].message.content);
  }

  async generateImage(request: ImageRequest): Promise<{ url: string }> {
    const [providerId] = request.model.split('/');
    const response = await chrome.runtime!.sendMessage({
      action: 'proxyRequest',
      data: { providerId, body: request },
    });
    if (!response.success) throw new Error(response.error || 'Request failed');
    const data = JSON.parse(response.result.body);
    return { url: data.data?.[0]?.url || '' };
  }

  async generateVideo(request: VideoRequest): Promise<{ url: string }> {
    const [providerId] = request.model.split('/');
    const response = await chrome.runtime!.sendMessage({
      action: 'proxyRequest',
      data: { providerId, body: request },
    });
    if (!response.success) throw new Error(response.error || 'Request failed');
    const data = JSON.parse(response.result.body);
    return { url: data.data?.[0]?.url || '' };
  }

  async textToSpeech(request: AudioRequest): Promise<{ url: string }> {
    const [providerId] = request.model.split('/');
    const response = await chrome.runtime!.sendMessage({
      action: 'proxyRequest',
      data: { providerId, body: request },
    });
    if (!response.success) throw new Error(response.error || 'Request failed');
    const data = JSON.parse(response.result.body);
    return { url: data.url || '' };
  }

  destroy(): void {}
}

export { BrowserExtensionAdapter };
export * from './types';
export { DEFAULT_PROVIDERS, MODEL_CATEGORIES, getProvidersByCategory };
