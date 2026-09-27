// Chạy trong tab ssm.edufit.vn. Chỉ trả phiên đăng nhập cho service worker của CHÍNH tiện ích này
// (chrome.runtime chỉ nhận tin trong nội bộ tiện ích) — trang web khác không gọi được vào đây.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || message?.kind !== 'ssm-session') return false;
  sendResponse({
    // `access_token` là vé riêng của SSM; `sso_access_token` là vé đăng nhập chung Edufit — API SSM trả 401 với vé đó.
    token: localStorage.getItem('access_token') || '',
    workspace: localStorage.getItem('workspace') || '',
  });
  return false;
});
