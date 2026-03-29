import type { ProviderInfo } from './types';

export const DEFAULT_PROVIDERS: ProviderInfo[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://chat.deepseek.com',
    apiPath: '/api/v1/chat/completions',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', contextWindow: 64000, maxTokens: 4096 },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', contextWindow: 64000, maxTokens: 8192, reasoning: true },
    ],
  },
  {
    id: 'claude',
    name: 'Claude',
    baseUrl: 'https://claude.ai',
    apiPath: '/api/chat/completions',
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4', contextWindow: 195000, maxTokens: 8192 },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4', contextWindow: 195000, maxTokens: 8192 },
    ],
  },
  {
    id: 'qwen',
    name: 'Qwen',
    baseUrl: 'https://chat.qwen.ai',
    apiPath: '/api/v1/chat/completions',
    models: [
      { id: 'qwen-plus', name: 'Qwen Plus', contextWindow: 32000, maxTokens: 4096 },
      { id: 'qwen-turbo', name: 'Qwen Turbo', contextWindow: 32000, maxTokens: 4096 },
    ],
  },
  {
    id: 'kimi',
    name: 'Kimi',
    baseUrl: 'https://kimi.moonshot.cn',
    apiPath: '/api/v1/chat/completions',
    models: [
      { id: 'moonshot-v1-8k', name: 'Moonshot V1 8K', contextWindow: 8000, maxTokens: 4096 },
      { id: 'moonshot-v1-32k', name: 'Moonshot V1 32K', contextWindow: 32000, maxTokens: 4096 },
    ],
  },
  {
    id: 'doubao',
    name: '豆包',
    baseUrl: 'https://www.doubao.com',
    apiPath: '/api/v1/chat/completions',
    models: [
      { id: 'doubao-seed-2.0', name: '豆包 Seed 2.0', contextWindow: 63000, maxTokens: 4096 },
    ],
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    baseUrl: 'https://chat.openai.com',
    apiPath: '/api/chat/completions',
    models: [
      { id: 'gpt-4', name: 'GPT-4', contextWindow: 8000, maxTokens: 4096 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000, maxTokens: 4096 },
    ],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    apiPath: '/v1beta/models',
    models: [
      { id: 'gemini-pro', name: 'Gemini Pro', contextWindow: 32000, maxTokens: 4096 },
    ],
  },
];
