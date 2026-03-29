/**
 * ZeroToken Chrome Extension - Content Script
 * 
 * 注入到页面中，用于获取页面状态和 Cookie
 */

// 监听来自 popup 或前端的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkLoginStatus') {
    // 检查页面是否已登录
    const isLoggedIn = checkIfLoggedIn();
    sendResponse({ loggedIn: isLoggedIn });
  }
  return true;
});

// 检查是否已登录（通过检查页面上的元素或状态）
function checkIfLoggedIn() {
  // 这个方法可以根据不同平台定制
  // 返回 true 表示已登录，false 表示未登录
  return true;
}

// 通知 background script 页面已加载
chrome.runtime.sendMessage({
  action: 'pageLoaded',
  url: window.location.href,
});
