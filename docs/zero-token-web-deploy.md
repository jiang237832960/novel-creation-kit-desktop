name = "zero-token-proxy"
main = "src/workers/zero-token-proxy.ts"
compatibility_date = "2024-01-01"

# 免费计划配置
[kv_namespaces]
COOKIES = { binding = "COOKIES", id = "YOUR_KV_NAMESPACE_ID" }
```

然后，用户需要：
1. 在 Cloudflare Dashboard 创建一个 KV Namespace
2. 获取 Namespace ID 并填入 wrangler.toml
3. 部署 worker
4. 得到一个 `https://xxx.workers.dev` 的 URL

让我创建一个更完整的 Web 版解决方案，包含：
1. Cloudflare Workers 代理代码
2. 前端配置说明
3. 部署指南
</think>

让我创建完整的 Web 版解决方案：
<minimax:tool_call>
<invoke name="write">
<parameter name="content"># ZeroToken Web Proxy - Cloudflare Workers 部署指南

## 快速部署

### 1. 创建 Cloudflare 账号
访问 https://dash.cloudflare.com 并注册

### 2. 创建 Workers 项目
```bash
npm create cloudflare@latest zero-token-proxy
cd zero-token-proxy
```

### 3. 复制 worker 代码
将 `src/workers/zero-token-proxy.ts` 的内容复制到 `src/index.ts`

### 4. 创建 KV Namespace
在 Cloudflare Dashboard → Workers & Pages → KV → Create namespace
命名为 `COOKIES`

### 5. 配置 wrangler.toml
```toml
name = "zero-token-proxy"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "COOKIES"
id = "你的-KV-Namespace-ID"
```

### 6. 部署
```bash
npx wrangler deploy
```

### 7. 获取你的 Worker URL
部署后会得到类似：`https://zero-token-proxy.your-name.workers.dev`

## API 接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/providers` | GET | 获取支持的提供商列表 |
| `/auth` | POST | 设置 Cookie `{provider, cookie}` |
| `/auth-status` | GET | 获取认证状态 |
| `/v1/chat/completions` | POST | 代理聊天请求 |

## 前端配置

在前端设置中填入 Worker URL：
```
https://zero-token-proxy.your-name.workers.dev
```
