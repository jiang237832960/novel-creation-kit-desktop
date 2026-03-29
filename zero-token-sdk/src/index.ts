import type { ZeroTokenSDK, ZeroTokenConfig, ChatRequest, ChatResponse, ImageRequest, VideoRequest, AudioRequest } from './types';
import { NodeAdapter } from './node';
import { DEFAULT_PROVIDERS } from './providers';

declare const chrome: {
  runtime?: {
    sendMessage(message: any): Promise<any>;
  }
};

export function createSDK(config: ZeroTokenConfig): ZeroTokenSDK {
  switch (config.mode) {
    case 'browser-extension':
      return createBrowserExtensionSDK();
    case 'node':
    case 'standalone':
    default:
      return new NodeAdapter(config);
  }
}

function createBrowserExtensionSDK(): ZeroTokenSDK {
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    throw new Error('Chrome extension not found. Please install ZeroToken Chrome extension.');
  }
  
  const chromeRuntime = chrome.runtime;
  
  return {
    async init(): Promise<void> {},
    getProviders() {
      return DEFAULT_PROVIDERS;
    },
    async getAuthStatus() {
      const response = await chromeRuntime.sendMessage({ action: 'getAuthStatus' });
      if (!response.success) throw new Error(response.error);
      return response.status;
    },
    async login(providerId: string) {
      const response = await chromeRuntime.sendMessage({ action: 'openLogin', data: { providerId } });
      if (!response.success) throw new Error(response.error);
    },
    async logout(): Promise<void> {},
    async chat(request: ChatRequest): Promise<ChatResponse> {
      const [providerId] = request.model.split('/');
      const response = await chromeRuntime.sendMessage({
        action: 'proxyRequest',
        data: { providerId, body: request },
      });
      if (!response.success) throw new Error(response.error);
      const data = JSON.parse(response.result.body);
      return {
        id: data.id || `chat-${Date.now()}`,
        model: request.model,
        choices: [{
          message: { role: 'assistant', content: data.choices?.[0]?.message?.content || '' },
          finishReason: 'stop',
        }],
      };
    },
    async chatStream(request: ChatRequest, onChunk: (content: string) => void): Promise<void> {
      const response = await this.chat({ ...request, stream: false });
      onChunk(response.choices[0].message.content);
    },
    async generateImage(request: ImageRequest): Promise<{ url: string }> {
      const [providerId] = request.model.split('/');
      const response = await chromeRuntime.sendMessage({
        action: 'proxyRequest',
        data: { providerId, body: request },
      });
      if (!response.success) throw new Error(response.error);
      const data = JSON.parse(response.result.body);
      return { url: data.data?.[0]?.url || '' };
    },
    async generateVideo(request: VideoRequest): Promise<{ url: string }> {
      const [providerId] = request.model.split('/');
      const response = await chromeRuntime.sendMessage({
        action: 'proxyRequest',
        data: { providerId, body: request },
      });
      if (!response.success) throw new Error(response.error);
      const data = JSON.parse(response.result.body);
      return { url: data.data?.[0]?.url || '' };
    },
    async textToSpeech(request: AudioRequest): Promise<{ url: string }> {
      const [providerId] = request.model.split('/');
      const response = await chromeRuntime.sendMessage({
        action: 'proxyRequest',
        data: { providerId, body: request },
      });
      if (!response.success) throw new Error(response.error);
      const data = JSON.parse(response.result.body);
      return { url: data.url || data.data?.[0]?.url || '' };
    },
    destroy(): void {},
  };
}

export type { ZeroTokenSDK, ZeroTokenConfig };
export * from './types';
export { DEFAULT_PROVIDERS } from './providers';
