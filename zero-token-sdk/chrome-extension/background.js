/**
 * ZeroToken Chrome Extension - Background Service Worker
 * 
 * 处理来自前端的消息，转发 AI 平台 API 请求
 */

// 支持的平台配置
const PROVIDERS = {
  'deepseek': {
    name: 'DeepSeek',
    baseUrl: 'https://chat.deepseek.com',
    apiPath: '/api/v1/chat/completions',
    domains: ['chat.deepseek.com'],
  },
  'claude': {
    name: 'Claude',
    baseUrl: 'https://claude.ai',
    apiPath: '/api/chat/completions',
    domains: ['claude.ai'],
  },
  'qwen': {
    name: 'Qwen',
    baseUrl: 'https://chat.qwen.ai',
    apiPath: '/api/v1/chat/completions',
    domains: ['chat.qwen.ai'],
  },
  'kimi': {
    name: 'Kimi',
    baseUrl: 'https://kimi.moonshot.cn',
    apiPath: '/api/v1/chat/completions',
    domains: ['kimi.moonshot.cn'],
  },
  'doubao': {
    name: '豆包',
    baseUrl: 'https://www.doubao.com',
    apiPath: '/api/v1/chat/completions',
    domains: ['www.doubao.com'],
  },
  'chatgpt': {
    name: 'ChatGPT',
    baseUrl: 'https://chat.openai.com',
    apiPath: '/api/chat/completions',
    domains: ['chat.openai.com'],
  },
};

// 获取平台配置
function getProviderConfig(providerId) {
  return PROVIDERS[providerId];
}

// 获取 Cookie
async function getCookies(providerId) {
  const config = getProviderConfig(providerId);
  if (!config) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  const cookies = [];
  
  for (const domain of config.domains) {
    const domainCookies = await chrome.cookies.getAll({ domain });
    cookies.push(...domainCookies);
  }

  if (cookies.length === 0) {
    throw new Error(`No cookies found for ${config.name}. Please login first.`);
  }

  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}

// 获取 User-Agent
async function getUserAgent(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    return tab.userAgent || navigator.userAgent;
  } catch {
    return navigator.userAgent;
  }
}

// 代理请求
async function proxyRequest(providerId, requestBody, tabId) {
  const config = getProviderConfig(providerId);
  if (!config) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  const cookies = await getCookies(providerId);
  const userAgent = await getUserAgent(tabId);

  const targetUrl = `${config.baseUrl}${config.apiPath}`;

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': userAgent,
      'Cookie': cookies,
      'Origin': config.baseUrl,
      'Referer': config.baseUrl,
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.text();
  
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: data,
  };
}

// 获取认证状态
async function getAuthStatus() {
  const status = [];
  
  for (const [id, config] of Object.entries(PROVIDERS)) {
    try {
      const cookies = await chrome.cookies.getAll({ domain: config.domains[0] });
      status.push({
        id,
        name: config.name,
        authenticated: cookies.length > 0,
      });
    } catch {
      status.push({
        id,
        name: config.name,
        authenticated: false,
      });
    }
  }
  
  return status;
}

// 获取提供商列表
function getProviders() {
  return Object.entries(PROVIDERS).map(([id, config]) => ({
    id,
    name: config.name,
    baseUrl: config.baseUrl,
  }));
}

// 监听来自前端的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, data } = message;

  (async () => {
    try {
      switch (action) {
        case 'getProviders':
          sendResponse({ success: true, providers: getProviders() });
          break;

        case 'getAuthStatus':
          const status = await getAuthStatus();
          sendResponse({ success: true, status });
          break;

        case 'proxyRequest':
          const { providerId, body, tabId } = data;
          const result = await proxyRequest(providerId, body, tabId || sender.tab?.id);
          sendResponse({ success: true, result });
          break;

        case 'getCookies':
          const providerCookies = await getCookies(data.providerId);
          sendResponse({ success: true, cookie: providerCookies });
          break;

        case 'getUserAgent':
          const ua = await getUserAgent(data.tabId);
          sendResponse({ success: true, userAgent: ua });
          break;

        default:
          sendResponse({ success: false, error: `Unknown action: ${action}` });
      }
    } catch (error) {
      console.error('[ZeroToken Background]', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // 保持消息通道开放以支持异步响应
});

// 监听安装/更新
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[ZeroToken] Extension installed');
  } else if (details.reason === 'update') {
    console.log('[ZeroToken] Extension updated');
  }
});

console.log('[ZeroToken] Background service worker started');
