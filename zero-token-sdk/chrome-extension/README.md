# ZeroToken Chrome 插件

让 Web 应用可以通过浏览器插件代理 AI 平台请求，无需手动复制 Cookie。

## 功能

- ✅ 自动获取已登录 AI 平台的 Cookie
- ✅ 作为代理转发 API 请求
- ✅ 支持多个 AI 平台
- ✅ 支持 DeepSeek、Claude、Qwen、Kimi、豆包、ChatGPT

## 安装步骤

### 1. 下载插件
将 `plugins/zero-token-chrome-extension` 文件夹完整下载到本地

### 2. 打开 Chrome 扩展页面
- 地址栏输入 `chrome://extensions`
- 或菜单 → 更多工具 → 扩展程序

### 3. 开启开发者模式
- 页面右上角开启「开发者模式」

### 4. 加载插件
- 点击「加载已解压的扩展程序」
- 选择 `zero-token-chrome-extension` 文件夹

### 5. 配置权限
首次使用插件时，Chrome 会询问以下权限：
- **Cookie 访问**：用于读取 AI 平台的登录状态
- **网站访问**：用于代理 API 请求

## 使用方法

### 1. 确保已登录
在 Chrome 中打开对应的 AI 网站并登录：
- DeepSeek: https://chat.deepseek.com
- Claude: https://claude.ai
- Qwen: https://chat.qwen.ai
- Kimi: https://kimi.moonshot.cn
- 豆包: https://www.doubao.com
- ChatGPT: https://chat.openai.com

### 2. 点击插件图标
插件图标会显示各平台的登录状态

### 3. Web 应用配置
在 Web 应用的 ZeroToken 设置中：
1. 选择「Web 版（Chrome 插件）」
2. 插件会自动检测已登录的平台

## API 接口

插件提供以下接口供前端调用：

```javascript
// 获取提供商列表
chrome.runtime.sendMessage({ action: 'getProviders' });

// 获取认证状态
chrome.runtime.sendMessage({ action: 'getAuthStatus' });

// 代理请求
chrome.runtime.sendMessage({ 
  action: 'proxyRequest',
  data: {
    providerId: 'deepseek',
    body: {
      model: 'deepseek/deepseek-chat',
      messages: [{ role: 'user', content: '你好' }]
    }
  }
});

// 获取指定平台的 Cookie
chrome.runtime.sendMessage({ 
  action: 'getCookies',
  data: { providerId: 'deepseek' }
});
```

## 工作原理

```
┌─────────────────────────────────────────────────────────────────┐
│  Web 应用                                                       │
│      │                                                           │
│      │ chrome.runtime.sendMessage()                            │
│      ▼                                                           │
│  Chrome 插件 (background.js)                                    │
│      │                                                           │
│      │ chrome.cookies.getAll()                                 │
│      ▼                                                           │
│  AI 平台网站 Cookie ← 用户已登录                                │
│                                                                 │
│      │                                                           │
│      │ fetch() + Cookie                                        │
│      ▼                                                           │
│  AI 平台 API                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 优势

| 对比项 | 手动 Cookie | Chrome 插件 |
|--------|------------|----------------|
| Cookie 获取 | 手动复制粘贴 | 自动获取 |
| 过期处理 | 需重新复制 | 自动刷新 |
| 用户体验 |繁琐 | 流畅 |
| 额外服务 | 需要代理服务 | 不需要 |

## 安全说明

1. **Cookie 仅本地使用**：插件获取的 Cookie 只会用于代理请求，不会上传到任何服务器
2. **权限最小化**：只请求必要的权限
3. **开源可审计**：代码完全透明，可自行审查

## 常见问题

### Q: 提示"未登录"但我已经登录了？
A: 请刷新 AI 网站页面，然后重新点击插件图标

### Q: 如何确认插件正常工作？
A: 点击插件图标，绿色勾选表示已登录，灰色表示未登录

### Q: Cookie 有效期多久？
A: 取决于各平台，一般几天到几周不等

## 文件结构

```
zero-token-chrome-extension/
├── manifest.json      # 插件配置
├── background.js      # 后台服务（处理代理请求）
├── content.js         # 内容脚本（页面注入）
├── popup.html         # 弹窗界面
├── popup.js           # 弹窗逻辑
└── README.md          # 说明文档
```
