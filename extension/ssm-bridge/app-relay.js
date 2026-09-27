// Chạy trên trang app SmartPlan. Chuyển yêu cầu của app sang service worker và trả kết quả về.
// Chỉ nhận tin từ chính cửa sổ này (không nhận từ iframe hay trang khác).
window.addEventListener('message', (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const msg = event.data;
  if (!msg || msg.source !== 'smartplan-app' || msg.kind !== 'ssm-request' || typeof msg.id !== 'string') return;
  chrome.runtime.sendMessage({ kind: 'ssm-request', op: msg.op, params: msg.params }, (response) => {
    const failed = chrome.runtime.lastError;
    window.postMessage({
      source: 'ssm-bridge',
      kind: 'ssm-response',
      id: msg.id,
      ...(failed ? { ok: false, error: 'Tiện ích SSM không phản hồi — tải lại trang app.' } : response),
    }, window.location.origin);
  });
});
