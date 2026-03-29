import * as http from 'http';
import * as https from 'https';
import { app, session, BrowserView, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface Credentials {
  cookie: string;
  bearer?: string;
  userAgent: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiPath: string;
  loginUrl: string;
  modelPath?: string;
  models: ModelConfig[];
}

export interface ModelConfig {
  id: string;
  name: string;
  contextWindow: number;
  maxTokens: number;
  reasoning?: boolean;
}

export interface AuthProfile {
  provider: string;
  credentials?: Credentials;
  lastUpdate?: string;
}

const DEFAULT_GATEWAY_PORT = 3001;

const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    id: 'deepseek-web',
    name: 'DeepSeek',
    baseUrl: 'https://chat.deepseek.com',
    apiPath: '/api/v1/chat/completions',
    loginUrl: 'https://chat.deepseek.com',
    modelPath: 'model',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', contextWindow: 64000, maxTokens: 4096 },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', contextWindow: 64000, maxTokens: 8192, reasoning: true },
    ],
  },
  {
    id: 'claude-web',
    name: 'Claude Web',
    baseUrl: 'https://claude.ai',
    apiPath: '/api/chat/completions',
    loginUrl: 'https://claude.ai',
    modelPath: 'model',
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4', contextWindow: 195000, maxTokens: 8192 },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4', contextWindow: 195000, maxTokens: 8192 },
    ],
  },
  {
    id: 'qwen-web',
    name: 'Qwen',
    baseUrl: 'https://chat.qwen.ai',
    apiPath: '/api/v1/chat/completions',
    loginUrl: 'https://chat.qwen.ai',
    modelPath: 'model',
    models: [
      { id: 'qwen-plus', name: 'Qwen Plus', contextWindow: 32000, maxTokens: 4096 },
      { id: 'qwen-turbo', name: 'Qwen Turbo', contextWindow: 32000, maxTokens: 4096 },
    ],
  },
  {
    id: 'kimi-web',
    name: 'Kimi',
    baseUrl: 'https://kimi.moonshot.cn',
    apiPath: '/api/v1/chat/completions',
    loginUrl: 'https://kimi.moonshot.cn',
    modelPath: 'model',
    models: [
      { id: 'moonshot-v1-8k', name: 'Moonshot V1 8K', contextWindow: 8000, maxTokens: 4096 },
      { id: 'moonshot-v1-32k', name: 'Moonshot V1 32K', contextWindow: 32000, maxTokens: 4096 },
    ],
  },
  {
    id: 'doubao-web',
    name: '豆包',
    baseUrl: 'https://www.doubao.com',
    apiPath: '/api/v1/chat/completions',
    loginUrl: 'https://www.doubao.com',
    modelPath: 'model',
    models: [
      { id: 'doubao-seed-2.0', name: '豆包 Seed 2.0', contextWindow: 63000, maxTokens: 4096 },
    ],
  },
  {
    id: 'chatgpt-web',
    name: 'ChatGPT Web',
    baseUrl: 'https://chat.openai.com',
    apiPath: '/api/chat/completions',
    loginUrl: 'https://chat.openai.com',
    modelPath: 'model',
    models: [
      { id: 'gpt-4', name: 'GPT-4', contextWindow: 8000, maxTokens: 4096 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000, maxTokens: 4096 },
    ],
  },
  {
    id: 'gemini-web',
    name: 'Gemini Web',
    baseUrl: 'https://generativelanguage.googleapis.com',
    apiPath: '/v1beta/models',
    loginUrl: 'https://gemini.google.com',
    modelPath: 'model',
    models: [
      { id: 'gemini-pro', name: 'Gemini Pro', contextWindow: 32000, maxTokens: 4096 },
    ],
  },
];

export class IntegratedZeroTokenGateway {
  private port: number;
  private authToken: string;
  private stateDir: string;
  private authProfiles: Map<string, AuthProfile> = new Map();
  private server: http.Server | null = null;
  private isRunning: boolean = false;
  private authWindow: BrowserWindow | null = null;
  private currentAuthProvider: string | null = null;

  constructor(port: number = DEFAULT_GATEWAY_PORT, authToken: string = '') {
    this.port = port;
    this.authToken = authToken;
    this.stateDir = path.join(app.getPath('userData'), 'zero-token-state');
    this.ensureStateDir();
    this.loadAuthProfiles();
  }

  private ensureStateDir(): void {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
    const authDir = path.join(this.stateDir, 'auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
  }

  private loadAuthProfiles(): void {
    const authFile = path.join(this.stateDir, 'auth', 'profiles.json');
    if (fs.existsSync(authFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
        for (const [key, profile] of Object.entries(data)) {
          this.authProfiles.set(key, profile as AuthProfile);
        }
      } catch (e) {
        console.error('Failed to load auth profiles:', e);
      }
    }
  }

  private saveAuthProfiles(): void {
    const authFile = path.join(this.stateDir, 'auth', 'profiles.json');
    const data: Record<string, AuthProfile> = {};
    for (const [key, profile] of this.authProfiles) {
      data[key] = profile;
    }
    fs.writeFileSync(authFile, JSON.stringify(data, null, 2));
  }

  public async start(): Promise<{ success: boolean; error?: string }> {
    if (this.isRunning) {
      return { success: true };
    }

    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (err) => {
        console.error('Gateway server error:', err);
        resolve({ success: false, error: err.message });
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        console.log(`ZeroToken Gateway running on port ${this.port}`);
        this.isRunning = true;
        resolve({ success: true });
      });
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    if (this.authWindow) {
      this.authWindow.close();
      this.authWindow = null;
    }
    this.isRunning = false;
  }

  public getPort(): number {
    return this.port;
  }

  public isGatewayRunning(): boolean {
    return this.isRunning;
  }

  public getProviders(): ProviderConfig[] {
    return PROVIDER_CONFIGS;
  }

  public getProvider(providerId: string): ProviderConfig | undefined {
    return PROVIDER_CONFIGS.find(p => p.id === providerId);
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (this.authToken) {
      const authHeader = req.headers['authorization'];
      if (!authHeader || authHeader !== `Bearer ${this.authToken}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Unauthorized' } }));
        return;
      }
    }

    const url = new URL(req.url || '/', `http://127.0.0.1:${this.port}`);

    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (url.pathname === '/v1/models') {
      this.handleModelsRequest(res);
      return;
    }

    if (url.pathname === '/v1/chat/completions') {
      this.handleChatCompletions(req, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'Not found' } }));
  }

  private handleModelsRequest(res: http.ServerResponse): void {
    const models: any[] = [];

    for (const provider of PROVIDER_CONFIGS) {
      for (const model of provider.models) {
        models.push({
          id: `${provider.id}/${model.id}`,
          name: model.name,
          provider: provider.id,
          context_window: model.contextWindow,
          max_tokens: model.maxTokens,
          reasoning: model.reasoning || false,
        });
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: models }));
  }

  private async handleChatCompletions(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const request = JSON.parse(body);
        const modelId = request.model;
        const [providerId, modelName] = modelId.split('/');

        const provider = this.getProvider(providerId);
        if (!provider) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: `Unknown provider: ${providerId}` } }));
          return;
        }

        const profile = this.authProfiles.get(`${providerId}:default`);
        if (!profile || !profile.credentials) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: `Not authenticated for ${providerId}. Please login first.` } }));
          return;
        }

        const result = await this.proxyToProvider(provider, modelName, request, profile.credentials);

        if (request.stream) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          });
          res.write(result);
          res.end();
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(result);
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: String(error) } }));
      }
    });
  }

  private async proxyToProvider(
    provider: ProviderConfig,
    modelName: string,
    request: any,
    credentials: Credentials
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const targetUrl = `${provider.baseUrl}${provider.apiPath}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': credentials.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': credentials.cookie,
      };

      if (credentials.bearer) {
        headers['Authorization'] = `Bearer ${credentials.bearer}`;
      }

      const body = JSON.stringify({
        ...request,
        model: modelName,
      });

      const urlObj = new URL(targetUrl);
      const options: http.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname,
        method: 'POST',
        headers,
      };

      const protocol = urlObj.protocol === 'https:' ? https : http;
      const proxyReq = protocol.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', chunk => { data += chunk; });
        proxyRes.on('end', () => {
          resolve(data);
        });
      });

      proxyReq.on('error', reject);
      proxyReq.write(body);
      proxyReq.end();
    });
  }

  public async startAuth(providerId: string): Promise<{ success: boolean; error?: string }> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      return { success: false, error: 'Unknown provider' };
    }

    this.currentAuthProvider = providerId;

    if (this.authWindow) {
      this.authWindow.close();
    }

    this.authWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      title: `登录 ${provider.name}`,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: 'persist:zero-token-auth',
      },
    });

    const self = this;

    this.authWindow.webContents.on('did-finish-load', async () => {
      console.log(`Auth window loaded: ${provider.loginUrl}`);
    });

    await this.authWindow.loadURL(provider.loginUrl);

    setTimeout(() => {
      if (self.authWindow) {
        self.authWindow.show();
      }
    }, 500);

    return { success: true };
  }

  public async captureCredentials(providerId: string): Promise<{ success: boolean; error?: string }> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      return { success: false, error: 'Unknown provider' };
    }

    try {
      const partition = session.fromPartition('persist:zero-token-auth');
      const cookies = await partition.cookies.get({ domain: new URL(provider.baseUrl).hostname });

      if (cookies.length === 0) {
        return { success: false, error: 'No cookies found. Please login first.' };
      }

      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

      const credentials: Credentials = {
        cookie: cookieString,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };

      this.setCredentials(providerId, credentials);

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  public setCredentials(providerId: string, credentials: Credentials): void {
    const profile: AuthProfile = {
      provider: providerId,
      credentials,
      lastUpdate: new Date().toISOString(),
    };
    this.authProfiles.set(`${providerId}:default`, profile);
    this.saveAuthProfiles();
  }

  public getAuthStatus(): { provider: string; authenticated: boolean; lastUpdate?: string }[] {
    const status: { provider: string; authenticated: boolean; lastUpdate?: string }[] = [];

    for (const provider of PROVIDER_CONFIGS) {
      const profile = this.authProfiles.get(`${provider.id}:default`);
      status.push({
        provider: provider.id,
        authenticated: !!(profile && profile.credentials),
        lastUpdate: profile?.lastUpdate,
      });
    }

    return status;
  }

  public clearCredentials(providerId: string): void {
    this.authProfiles.delete(`${providerId}:default`);
    this.saveAuthProfiles();
  }

  public closeAuthWindow(): void {
    if (this.authWindow) {
      this.authWindow.close();
      this.authWindow = null;
    }
  }

  public getAuthWindow(): BrowserWindow | null {
    return this.authWindow;
  }
}

let gatewayInstance: IntegratedZeroTokenGateway | null = null;

export function getGateway(): IntegratedZeroTokenGateway {
  if (!gatewayInstance) {
    gatewayInstance = new IntegratedZeroTokenGateway();
  }
  return gatewayInstance;
}

export function createGateway(port?: number, authToken?: string): IntegratedZeroTokenGateway {
  if (gatewayInstance) {
    gatewayInstance.stop();
  }
  gatewayInstance = new IntegratedZeroTokenGateway(port, authToken);
  return gatewayInstance;
}
