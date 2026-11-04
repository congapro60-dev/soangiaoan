// Chạy trong tab ssm.edufit.vn. Chỉ trả phiên đăng nhập cho service worker của CHÍNH tiện ích này
// (chrome.runtime chỉ nhận tin trong nội bộ tiện ích) — trang web khác không gọi được vào đây.
//
// Bộ nhớ đệm phiên do service worker (background.js) giữ: content script không ghi được chrome.storage.session
// (mặc định chỉ ngữ cảnh tin cậy) — và cũng không nên mở quyền đó cho content script.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || message?.kind !== 'ssm-session') return false;
  const token = localStorage.getItem('access_token') || '';
  const workspace = localStorage.getItem('workspace') || '';
  sendResponse({ token, workspace });
  return false;
});
