/**
 * ZeroToken Chrome Extension - Popup Script
 */

// 提供商配置
const PROVIDERS = {
  'deepseek': { name: 'DeepSeek', icon: '🔵' },
  'claude': { name: 'Claude', icon: '🟣' },
  'qwen': { name: 'Qwen', icon: '🟠' },
  'kimi': { name: 'Kimi', icon: '🌙' },
  'doubao': { name: '豆包', icon: '🐰' },
  'chatgpt': { name: 'ChatGPT', icon: '🟢' },
};

// 渲染状态列表
function renderStatus(status) {
  const container = document.getElementById('status');
  
  if (!status || status.length === 0) {
    container.innerHTML = '<div class="loading">暂无数据</div>';
    return;
  }
  
  container.innerHTML = status.map(item => {
    const provider = PROVIDERS[item.id] || { name: item.id, icon: '🤖' };
    return `
      <div class="status-item">
        <div class="status-name">
          <span class="status-icon ${item.authenticated ? 'logged-in' : 'logged-out'}">
            ${item.authenticated ? '✓' : '✗'}
          </span>
          <span>${provider.icon} ${provider.name}</span>
        </div>
        <span style="color: ${item.authenticated ? '#52c41a' : '#999'}">
          ${item.authenticated ? '已登录' : '未登录'}
        </span>
      </div>
    `;
  }).join('');
}

// 加载状态
async function loadStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getAuthStatus' });
    if (response.success) {
      renderStatus(response.status);
    } else {
      document.getElementById('status').innerHTML = 
        `<div class="loading" style="color: #ff4d4f">加载失败: ${response.error}</div>`;
    }
  } catch (error) {
    document.getElementById('status').innerHTML = 
      `<div class="loading" style="color: #ff4d4f">加载失败</div>`;
  }
}

// 页面加载完成后获取状态
document.addEventListener('DOMContentLoaded', loadStatus);
