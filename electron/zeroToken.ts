import * as http from 'http';
import * as https from 'https';
import { app, session, BrowserWindow, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface Credentials {
  cookie: string;
  userAgent: string;
}

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
  loginUrl: string;
  models: ModelInfo[];
}

export interface AuthState {
  provider: string;
  cookie: string;
  userAgent: string;
  lastUpdate: string;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://chat.deepseek.com',
    apiPath: '/api/v1/chat/completions',
    loginUrl: 'https://chat.deepseek.com',
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
    loginUrl: 'https://claude.ai',
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4', contextWindow: 195000, maxTokens: 8192 },
    ],
  },
  {
    id: 'qwen',
    name: 'Qwen',
    baseUrl: 'https://chat.qwen.ai',
    apiPath: '/api/v1/chat/completions',
    loginUrl: 'https://chat.qwen.ai',
    models: [
      { id: 'qwen-plus', name: 'Qwen Plus', contextWindow: 32000, maxTokens: 4096 },
    ],
  },
  {
    id: 'kimi',
    name: 'Kimi',
    baseUrl: 'https://kimi.moonshot.cn',
    apiPath: '/api/v1/chat/completions',
    loginUrl: 'https://kimi.moonshot.cn',
    models: [
      { id: 'moonshot-v1-8k', name: 'Moonshot V1 8K', contextWindow: 8000, maxTokens: 4096 },
    ],
  },
  {
    id: 'doubao',
    name: '豆包',
    baseUrl: 'https://www.doubao.com',
    apiPath: '/api/v1/chat/completions',
    loginUrl: 'https://www.doubao.com',
    models: [
      { id: 'doubao-seed-2.0', name: '豆包 Seed 2.0', contextWindow: 63000, maxTokens: 4096 },
    ],
  },
];

const DEFAULT_PORT = 3001;
const DEFAULT_CDP_PORT = 9222;

class ZeroTokenServer {
  private port: number;
  private cdpPort: number;
  private authStates: Map<string, AuthState> = new Map();
  private stateDir: string;
  private server: http.Server | null = null;
  private loginWindow: BrowserWindow | null = null;

  constructor(port: number = DEFAULT_PORT, cdpPort: number = DEFAULT_CDP_PORT) {
    this.port = port;
    this.cdpPort = cdpPort;
    this.stateDir = path.join(app.getPath('userData'), 'zero-token');
    this.ensureStateDir();
    this.loadAuth();
  }

  private ensureStateDir(): void {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  private loadAuth(): void {
    const authFile = path.join(this.stateDir, 'auth.json');
    if (fs.existsSync(authFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
        for (const [key, value] of Object.entries(data)) {
          this.authStates.set(key, value as AuthState);
        }
      } catch (e) {
        console.error('Failed to load auth:', e);
      }
    }
  }

  private saveAuth(): void {
    const authFile = path.join(this.stateDir, 'auth.json');
    const data: Record<string, AuthState> = {};
    for (const [key, value] of this.authStates) {
      data[key] = value;
    }
    fs.writeFileSync(authFile, JSON.stringify(data, null, 2));
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));
      this.server.on('error', reject);
      this.server.listen(this.port, '127.0.0.1', () => {
        console.log(`ZeroToken server running on port ${this.port}`);
        resolve();
      });
    });
  }

  stop(): void {
    this.server?.close();
    this.loginWindow?.close();
  }

  getPort(): number {
    return this.port;
  }

  getProviders(): ProviderInfo[] {
    return PROVIDERS;
  }

  getAuthStatus(): { id: string; name: string; authenticated: boolean }[] {
    return PROVIDERS.map(p => ({
      id: p.id,
      name: p.name,
      authenticated: this.authStates.has(p.id),
    }));
  }

  async captureFromChrome(providerId: string): Promise<AuthState> {
    const provider = PROVIDERS.find(p => p.id === providerId);
    if (!provider) throw new Error('Unknown provider');

    try {
      const CDP = require('puppeteer-core');
      const client = await CDP({ browserURL: `http://127.0.0.1:${this.cdpPort}` });
      
      const browser = client;
      const pages = await browser.pages();
      const domain = new URL(provider.baseUrl).hostname;

      let targetPage = pages.find((p: any) => p.url()?.startsWith(provider.baseUrl));
      
      if (!targetPage) {
        targetPage = (await browser.newPage()) as any;
        await (targetPage as any).goto(provider.baseUrl);
      }

      const session = await (targetPage as any).createCDPSession();
      const cookiesResult = await session.send('Network.getAllCookies');
      const cookies = cookiesResult.cookies.filter((c: any) => 
        c.domain.includes(domain.replace('www.', ''))
      );

      if (cookies.length === 0) {
        throw new Error(`No cookies found for ${provider.name}. Please login at ${provider.baseUrl} in Chrome first.`);
      }

      const cookieStr = cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');
      const userAgent = (targetPage as any).userAgent();

      const auth: AuthState = {
        provider: providerId,
        cookie: cookieStr,
        userAgent,
        lastUpdate: new Date().toISOString(),
      };

      this.authStates.set(providerId, auth);
      this.saveAuth();

      await browser.disconnect();

      return auth;
    } catch (e) {
      if (String(e).includes('connect')) {
        throw new Error(`Chrome not found on port ${this.cdpPort}. Please start Chrome with: --remote-debugging-port=${this.cdpPort}`);
      }
      throw e;
    }
  }

  async openLoginWindow(providerId: string): Promise<void> {
    const provider = PROVIDERS.find(p => p.id === providerId);
    if (!provider) throw new Error('Unknown provider');

    if (this.loginWindow) {
      this.loginWindow.close();
      this.loginWindow = null;
    }

    console.log(`[ZeroToken] Opening login window for ${provider.name} at ${provider.loginUrl}`);

    return new Promise((resolve, reject) => {
      this.loginWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: `登录 ${provider.name}`,
        webPreferences: {
          partition: `persist:zero-token-${providerId}`,
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      // Set timeout for loadURL
      const timeout = setTimeout(() => {
        console.error(`[ZeroToken] Login window load timeout for ${provider.name}`);
        reject(new Error('登录窗口加载超时，请检查网络连接'));
      }, 30000);

      this.loginWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
        console.error(`[ZeroToken] Failed to load: ${errorCode} - ${errorDescription}`);
        clearTimeout(timeout);
        reject(new Error(`页面加载失败: ${errorDescription} (${errorCode})`));
      });

      this.loginWindow.webContents.on('did-finish-load', () => {
        console.log(`[ZeroToken] Login window loaded successfully`);
        clearTimeout(timeout);
        this.loginWindow?.show();
        resolve();
      });

      this.loginWindow.on('closed', () => {
        console.log(`[ZeroToken] Login window closed`);
        this.loginWindow = null;
      });

      // Load the login URL
      this.loginWindow.loadURL(provider.loginUrl).catch((err) => {
        console.error(`[ZeroToken] loadURL error: ${err.message}`);
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  async captureAuth(providerId: string): Promise<AuthState> {
    const provider = PROVIDERS.find(p => p.id === providerId);
    if (!provider) throw new Error('Unknown provider');

    const partition = session.fromPartition(`persist:zero-token-${providerId}`);
    const cookies = await partition.cookies.get({ domain: new URL(provider.baseUrl).hostname });

    if (cookies.length === 0) {
      throw new Error('No cookies found. Please login first.');
    }

    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const auth: AuthState = {
      provider: providerId,
      cookie: cookieStr,
      userAgent,
      lastUpdate: new Date().toISOString(),
    };

    this.authStates.set(providerId, auth);
    this.saveAuth();
    this.loginWindow?.close();

    return auth;
  }

  clearAuth(providerId: string): void {
    this.authStates.delete(providerId);
    this.saveAuth();
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    console.log(`[ZeroToken] ${req.method} ${req.url}`);
    const url = new URL(req.url || '/', `http://127.0.0.1:${this.port}`);

    if (url.pathname === '/health') {
      console.log('[ZeroToken] Health check');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (url.pathname === '/providers') {
      console.log('[ZeroToken] Get providers');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ providers: PROVIDERS }));
      return;
    }

    if (url.pathname === '/auth-status') {
      console.log('[ZeroToken] Get auth status');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: this.getAuthStatus() }));
      return;
    }

    if (url.pathname === '/v1/chat/completions') {
      console.log('[ZeroToken] Chat completions request');
      this.handleChatCompletions(req, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  private async handleChatCompletions(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    let body = '';
    req.on('data', chunk => { body += chunk; });

    await new Promise<void>((resolve) => req.on('end', resolve));

    try {
      const { model, messages, stream } = JSON.parse(body);
      const [providerId] = model.split('/');

      const auth = this.authStates.get(providerId);
      if (!auth) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: `Not authenticated for ${providerId}` } }));
        return;
      }

      const provider = PROVIDERS.find(p => p.id === providerId);
      if (!provider) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Unknown provider' } }));
        return;
      }

      const result = await this.proxyRequest(provider, auth, { model, messages, stream });

      if (stream) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });
        res.write(result);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(result);
      }
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: String(error) } }));
    }
  }

  private async proxyRequest(provider: ProviderInfo, auth: AuthState, request: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const targetUrl = `${provider.baseUrl}${provider.apiPath}`;
      console.log(`[ZeroToken] Proxy request to: ${targetUrl}`);
      console.log(`[ZeroToken] Cookie length: ${auth.cookie.length}`);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': auth.userAgent,
        'Cookie': auth.cookie,
        'Accept': 'application/json',
        'Origin': provider.baseUrl,
        'Referer': provider.baseUrl,
      };

      const options = {
        hostname: new URL(targetUrl).hostname,
        port: 443,
        path: new URL(targetUrl).pathname,
        method: 'POST',
        headers,
      };

      console.log(`[ZeroToken] Request options:`, JSON.stringify(options, null, 2));

      const proxyReq = https.request(options, (proxyRes) => {
        console.log(`[ZeroToken] Proxy response status: ${proxyRes.statusCode}`);
        
        let data = '';
        proxyRes.on('data', chunk => { 
          console.log(`[ZeroToken] Received chunk: ${chunk.length} bytes`);
          data += chunk; 
        });
        proxyRes.on('end', () => { 
          console.log(`[ZeroToken] Proxy response end, data length: ${data.length}`);
          if (data.length === 0) {
            reject(new Error('Empty response from upstream server (EOF)'));
          } else {
            resolve(data); 
          }
        });
        proxyRes.on('error', (err) => {
          console.error(`[ZeroToken] Proxy response error: ${err.message}`);
          reject(err);
        });
      });

      proxyReq.on('error', (err) => {
        console.error(`[ZeroToken] Proxy request error: ${err.message}`);
        reject(err);
      });

      const requestBody = JSON.stringify(request);
      console.log(`[ZeroToken] Request body length: ${requestBody.length}`);
      
      proxyReq.write(requestBody);
      proxyReq.end();
    });
  }
}

let serverInstance: ZeroTokenServer | null = null;

export function getZeroTokenServer(): ZeroTokenServer {
  if (!serverInstance) {
    serverInstance = new ZeroTokenServer();
  }
  return serverInstance;
}

export function createZeroTokenServer(port?: number, cdpPort?: number): ZeroTokenServer {
  if (serverInstance) {
    serverInstance.stop();
  }
  serverInstance = new ZeroTokenServer(port, cdpPort);
  return serverInstance;
}
