export type ModelCategory = 'chat' | 'image' | 'video' | 'audio';

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  maxTokens: number;
  reasoning?: boolean;
}

export interface ProviderInfo {
  id: string;
  name: string;
  category: ModelCategory;
  baseUrl: string;
  apiPath: string;
  models: ModelInfo[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finishReason: string;
  }[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ImageRequest {
  model: string;
  prompt: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792' | '512x512';
  quality?: 'standard' | 'hd';
  n?: number;
}

export interface VideoRequest {
  model: string;
  prompt: string;
  duration?: number;
  aspectRatio?: string;
}

export interface AudioRequest {
  model: string;
  input: string;
  voice?: string;
  speed?: number;
}

export interface AuthStatus {
  provider: string;
  name: string;
  category: ModelCategory;
  authenticated: boolean;
}

export type RunMode = 'browser-extension' | 'node' | 'standalone';

export interface ZeroTokenConfig {
  mode: RunMode;
  standaloneUrl?: string;
}

export interface ZeroTokenSDK {
  init(config: ZeroTokenConfig): Promise<void>;
  
  getProviders(category?: ModelCategory): ProviderInfo[];
  
  getAuthStatus(): Promise<AuthStatus[]>;
  
  login(providerId: string): Promise<void>;
  
  logout(providerId: string): Promise<void>;
  
  chat(request: ChatRequest): Promise<ChatResponse>;
  
  chatStream(
    request: ChatRequest, 
    onChunk: (content: string) => void
  ): Promise<void>;
  
  generateImage(request: ImageRequest): Promise<{ url: string }>;
  
  generateVideo(request: VideoRequest): Promise<{ url: string }>;
  
  textToSpeech(request: AudioRequest): Promise<{ url: string }>;
  
  destroy(): void;
}
