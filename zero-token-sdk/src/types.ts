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

export interface AuthStatus {
  provider: string;
  name: string;
  authenticated: boolean;
}

export type RunMode = 'browser-extension' | 'node' | 'standalone';

export interface ZeroTokenConfig {
  mode: RunMode;
  standaloneUrl?: string;
}

export interface ZeroTokenSDK {
  init(config: ZeroTokenConfig): Promise<void>;
  
  getProviders(): ProviderInfo[];
  
  getAuthStatus(): Promise<AuthStatus[]>;
  
  login(providerId: string): Promise<void>;
  
  logout(providerId: string): Promise<void>;
  
  chat(request: ChatRequest): Promise<ChatResponse>;
  
  chatStream(
    request: ChatRequest, 
    onChunk: (content: string) => void
  ): Promise<void>;
  
  destroy(): void;
}

export interface ChatChunkEvent {
  type: 'content' | 'done' | 'error';
  content?: string;
  error?: string;
}

export type ChunkCallback = (event: ChatChunkEvent) => void;
