# ZeroToken Web 版实现方案

## 问题分析

```
┌─────────────────────────────────────────────────────────────────┐
│  浏览器 CORS 限制                                              │
│                                                                 │
│  我们的 Web 应用 (https://app.com)                            │
│         │                                                      │
│         │ fetch()                                             │
│         ▼                                                      │
│  AI 平台 API (https://chat.deepseek.com)                       │
│                                                                 │
│  ❌ 浏览器会拦截，因为不同源！                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 解决方案：Cloudflare Workers 代理

```
┌─────────────┐         ┌──────────────────┐         ┌──────────────┐
│  Web 前端   │ ──────► │  Cloudflare      │ ──────► │  DeepSeek    │
│             │  HTTPS  │  Workers        │         │  API         │
│  带 Cookie  │         │  (免费代理)      │         │              │
└─────────────┘         └──────────────────┘         └──────────────┘
```

### 优势

1. **免费** - Cloudflare Workers 有免费额度
2. **全球 CDN** - 低延迟
3. **无需服务器** - 纯前端部署
4. **简单** - 只需要部署一个 Worker

## 部署步骤

### 1. 创建 Cloudflare 账号
访问 https://dash.cloudflare.com

### 2. 创建 Worker
```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 创建项目
wrangler generate zero-token-proxy

# 进入目录
cd zero-token-proxy
```

### 3. 复制 Worker 代码
将 `src/workers/zero-token-proxy-simple.ts` 的内容复制到 `src/index.ts`

### 4. 部署
```bash
wrangler deploy
```

### 5. 获取 URL
部署成功后会得到：
```
https://zero-token-proxy.your-subdomain.workers.dev
```

## 前端使用

### Web 版设置

1. 打开设置页面
2. 选择 "Web 版（连接网关）"
3. 填入 Worker URL
4. 在「管理登录」中：
   - 打开目标 AI 平台的网页
   - 登录账号
   - 打开开发者工具 (F12) → Application → Cookies
   - 复制 Cookie 值
   - 粘贴到设置中

### 请求格式

```javascript
// 前端请求
const response = await fetch('https://your-worker.workers.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Provider-Id': 'deepseek',
    'X-Provider-Cookie': '复制的 cookie 值',
  },
  body: JSON.stringify({
    model: 'deepseek/deepseek-chat',
    messages: [{ role: 'user', content: '你好' }],
  }),
});
```

## Worker API 接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/providers` | GET | 获取支持的提供商 |
| `/auth-status` | GET | 认证状态 |
| `/v1/chat/completions` | POST | 代理聊天请求 |

## Cookie 获取方法

### DeepSeek
1. 打开 https://chat.deepseek.com
2. 登录账号
3. F12 → Application → Cookies → chat.deepseek.com
4. 复制 `session` 或 `csrf_token` 等 cookie

### Claude
1. 打开 https://claude.ai
2. 登录账号
3. F12 → Application → Cookies → claude.ai
4. 复制 cookie 值

## 安全注意事项

1. **Cookie 传输** - 建议使用 HTTPS
2. **Cookie 有效期** - AI 平台的 cookie 可能会过期，过期后需要重新获取
3. **不要泄露 Cookie** - Cookie 相当于登录凭证，请妥善保管

## 限制

1. **Cookie 会过期** - 需要定期重新获取
2. **部分平台有反爬虫** - 可能需要额外的验证
3. **免费额度** - Cloudflare Workers 每天 100,000 请求

## 替代方案

### 1. Vercel Serverless Functions
类似的方式，部署到 Vercel

### 2. 自己的后端服务
部署一个简单的 Node.js 代理服务

### 3. 桌面版
使用 Electron 桌面版，有内置网关，完全独立工作
