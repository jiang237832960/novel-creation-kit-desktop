import type { 
  ZeroTokenSDK, 
  ZeroTokenConfig, 
  ProviderInfo, 
  AuthStatus, 
  ChatRequest, 
  ChatResponse
} from './types';
import { DEFAULT_PROVIDERS } from './providers';

declare const chrome: typeof globalThis & { 
  runtime?: { 
    sendMessage: (message: any) => Promise<any>;
  } 
};

type StreamCallback = (content: string) => void;

class BrowserExtensionAdapter implements ZeroTokenSDK {
  async init(_config: ZeroTokenConfig): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      throw new Error('Chrome extension not found');
    }
  }

  getProviders(): ProviderInfo[] {
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

  async logout(_providerId: string): Promise<void> {
    // Browser extension doesn't need explicit logout
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const [providerId] = request.model.split('/');
    
    const response = await chrome.runtime!.sendMessage({
      action: 'proxyRequest',
      data: {
        providerId,
        body: request,
      },
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

  destroy(): void {}
}

export function createSDK(_config: ZeroTokenConfig): ZeroTokenSDK {
  return new BrowserExtensionAdapter();
}

export { BrowserExtensionAdapter };
export * from './types';
export { DEFAULT_PROVIDERS };
