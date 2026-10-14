// Chạy trong tab ssm.edufit.vn. Chỉ trả phiên đăng nhập cho service worker của CHÍNH tiện ích này
// (chrome.runtime chỉ nhận tin trong nội bộ tiện ích) — trang web khác không gọi được vào đây.
//
// HẠNG MỤC 5 (Token Cache): mỗi lần đọc phiên từ localStorage, đồng thời lưu vào
// chrome.storage.session để service worker dùng lại mà không cần tab SSM mở.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || message?.kind !== 'ssm-session') return false;
  const token = localStorage.getItem('access_token') || '';
  const workspace = localStorage.getItem('workspace') || '';
  // Cache vào storage.session (tự xoá khi trình duyệt đóng) — service worker đọc lại khi cần.
  if (token && workspace) {
    chrome.storage.session.set({
      ssmToken: token,
      ssmWorkspace: workspace,
      ssmCachedAt: Date.now(),
    }).catch(() => { /* storage đầy hoặc bị chặn: bỏ qua, lần sau đọc lại từ tab */ });
  }
  sendResponse({ token, workspace });
  return false;
});
