/**
 * ZeroToken Web Proxy - Cloudflare Workers
 * 
 * 部署到 Cloudflare Workers（免费）
 * 功能：代理 AI 平台的 API 请求，使用存储的 Cookie 进行认证
 */

interface Env {
  COOKIES: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  };
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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function getCookie(provider: string, env: Env): Promise<string | null> {
  try {
    const cookie = await env.COOKIES.get(`cookie_${provider}`);
    return cookie;
  } catch {
    return null;
  }
}

async function setCookie(provider: string, cookie: string, env: Env): Promise<void> {
  await env.COOKIES.put(`cookie_${provider}`, cookie, { expirationTtl: 60 * 60 * 24 * 30 }); // 30 days
}

async function proxyRequest(
  provider: string,
  request: Request,
  env: Env
): Promise<Response> {
  const config = PROVIDERS[provider as keyof typeof PROVIDERS];
  if (!config) {
    return new Response(JSON.stringify({ error: 'Unknown provider' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const cookie = await getCookie(provider, env);
  if (!cookie) {
    return new Response(JSON.stringify({ error: `Not authenticated for ${provider}` }), {
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
      const providersList = Object.entries(PROVIDERS).map(([id, config]) => ({
        id,
        name: config.name,
        baseUrl: config.baseUrl,
      }));
      return new Response(JSON.stringify({ providers: providersList }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Set cookie
    if (url.pathname === '/auth' && request.method === 'POST') {
      const { provider, cookie } = await request.json();
      if (!provider || !cookie) {
        return new Response(JSON.stringify({ error: 'Missing provider or cookie' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
      await setCookie(provider, cookie, env);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Get auth status
    if (url.pathname === '/auth-status') {
      const status = await Promise.all(
        Object.keys(PROVIDERS).map(async (provider) => {
          const cookie = await getCookie(provider, env);
          return {
            id: provider,
            name: PROVIDERS[provider as keyof typeof PROVIDERS].name,
            authenticated: !!cookie,
          };
        })
      );
      return new Response(JSON.stringify({ status }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Proxy chat completions
    if (url.pathname === '/v1/chat/completions' && request.method === 'POST') {
      const body = await request.json();
      const model = body.model as string;
      const providerId = model?.split('/')[0];
      
      if (!providerId) {
        return new Response(JSON.stringify({ error: 'Missing model' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      return proxyRequest(providerId, request, env);
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  },
};
