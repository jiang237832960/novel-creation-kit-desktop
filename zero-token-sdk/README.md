# @zero-token/sdk

Zero Token SDK - 通过浏览器凭证免费使用 AI 模型

## 安装

```bash
npm install @zero-token/sdk
# 或
yarn add @zero-token/sdk
# 或
pnpm add @zero-token/sdk
```

## 快速开始

### 浏览器插件模式

```javascript
import { createSDK } from '@zero-token/sdk';

// 创建 SDK 实例（浏览器插件模式）
const zt = createSDK({ mode: 'browser-extension' });

// 获取支持的提供商列表
const providers = zt.getProviders();
console.log(providers);

// 检查登录状态
const status = await zt.getAuthStatus();
console.log(status);

// 登录（打开对应网站）
await zt.login('deepseek');

// 发送消息
const response = await zt.chat({
  model: 'deepseek/deepseek-chat',
  messages: [{ role: 'user', content: '你好' }],
});
console.log(response.choices[0].message.content);
```

### Node.js / Electron 模式

```javascript
import { createSDK } from '@zero-token/sdk';

const zt = createSDK({ mode: 'node' });

// 设置凭证（手动从浏览器复制）
await zt.setCredentials('deepseek', 'cookie_string', 'user_agent_string');

// 发送消息
const response = await zt.chat({
  model: 'deepseek/deepseek-chat',
  messages: [{ role: 'user', content: '你好' }],
});
```

### 流式响应

```javascript
const zt = createSDK({ mode: 'browser-extension' });

await zt.chatStream({
  model: 'deepseek/deepseek-chat',
  messages: [{ role: 'user', content: '讲个故事' }],
}, (content) => {
  console.log('收到:', content);
});
```

## API

### createSDK(config)

创建 SDK 实例

**参数**:
- `config.mode`: `'browser-extension'` | `'node'` | `'standalone'`

### SDK 实例方法

#### init(config)

初始化 SDK（可选）

#### getProviders()

获取支持的提供商列表

#### getAuthStatus()

获取各平台的登录状态

#### login(providerId)

打开对应平台的登录页面

#### logout(providerId)

退出登录

#### chat(request)

发送聊天请求

**request 参数**:
```typescript
{
  model: string;        // 如 'deepseek/deepseek-chat'
  messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}
```

#### chatStream(request, onChunk)

发送流式聊天请求

#### destroy()

销毁 SDK 实例，释放资源

## 支持的提供商

| ID | 名称 | 模型 |
|----|------|------|
| `deepseek` | DeepSeek | deepseek-chat, deepseek-reasoner |
| `claude` | Claude | claude-sonnet-4-6, claude-opus-4-6 |
| `qwen` | Qwen | qwen-plus, qwen-turbo |
| `kimi` | Kimi | moonshot-v1-8k, moonshot-v1-32k |
| `doubao` | 豆包 | doubao-seed-2.0 |
| `chatgpt` | ChatGPT | gpt-4, gpt-4-turbo |
| `gemini` | Gemini | gemini-pro |

## 浏览器插件

配合 Chrome 插件使用更方便：

1. 安装 [ZeroToken Chrome 插件](../plugins/zero-token-chrome-extension)
2. 在对应网站登录
3. 使用浏览器模式，无需手动复制 Cookie

## License

MIT
