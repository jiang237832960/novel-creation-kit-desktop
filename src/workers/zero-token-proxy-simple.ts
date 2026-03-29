/**
 * ZeroToken Web Proxy - Cloudflare Workers (简化版)
 * 
 * 工作方式：
 * 1. 用户在浏览器登录 AI 平台
 * 2. 从浏览器复制 Cookie
 * 3. 前端发送请求时带上 Cookie 和 Provider ID
 * 4. Worker 代理转发到对应平台
 */

interface Env {
  // 可以留空，因为我们直接从请求头获取 Cookie
}

interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiPath: string;
}

const PROVIDERS: Record<string, Provider> = {
  'deepseek': {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://chat.deepseek.com',
    apiPath: '/api/v1/chat/completions',
  },
  'claude': {
    id: 'claude',
    name: 'Claude',
    baseUrl: 'https://claude.ai',
    apiPath: '/api/chat/completions',
  },
  'qwen': {
    id: 'qwen',
    name: 'Qwen',
    baseUrl: 'https://chat.qwen.ai',
    apiPath: '/api/v1/chat/completions',
  },
  'kimi': {
    id: 'kimi',
    name: 'Kimi',
    baseUrl: 'https://kimi.moonshot.cn',
    apiPath: '/api/v1/chat/completions',
  },
  'doubao': {
    id: 'doubao',
    name: '豆包',
    baseUrl: 'https://www.doubao.com',
    apiPath: '/api/v1/chat/completions',
  },
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Provider-Cookie, X-Provider-Id',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Get providers list
    if (url.pathname === '/providers') {
      const providersList = Object.entries(PROVIDERS).map(([, config]) => config);
      return new Response(JSON.stringify({ providers: providersList }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Get auth status (always authenticated since we get cookie from request header)
    if (url.pathname === '/auth-status') {
      const status = Object.values(PROVIDERS).map(p => ({
        id: p.id,
        name: p.name,
        authenticated: false, // 用户每次请求都带 Cookie，所以不需要预存
      }));
      return new Response(JSON.stringify({ status }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Proxy chat completions
    if (url.pathname === '/v1/chat/completions' && request.method === 'POST') {
      const providerId = request.headers.get('X-Provider-Id');
      
      if (!providerId) {
        return new Response(JSON.stringify({ error: 'Missing X-Provider-Id header' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      const config = PROVIDERS[providerId];
      if (!config) {
        return new Response(JSON.stringify({ error: `Unknown provider: ${providerId}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      const cookie = request.headers.get('X-Provider-Cookie');
      if (!cookie) {
        return new Response(JSON.stringify({ error: 'Missing X-Provider-Cookie header' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      const body = await request.json();
      const targetUrl = `${config.baseUrl}${config.apiPath}`;

      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': cookie,
            'Origin': config.baseUrl,
            'Referer': config.baseUrl,
          },
          body: JSON.stringify(body),
        });

        const data = await response.text();

        return new Response(data, {
          status: response.status,
          headers: {
            'Content-Type': response.headers.get('Content-Type') || 'application/json',
            ...CORS_HEADERS,
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  },
};
