// Fill/highlight only. Never click Save/Submit or choose a field by substring.
const visible = el => !el.disabled && !el.readOnly && el.getClientRects().length > 0;
const textInput = el => visible(el) && (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement && el.type === 'text');
const excelInput = el => visible(el) && el.type === 'file' && /(?:\.xlsx|spreadsheetml\.sheet)/i.test(el.accept || '');
const exactKey = (el, key) => {
  const direct = [el.getAttribute('data-key'), el.getAttribute('data-code'), el.name, el.id].filter(Boolean).map(value => String(value).trim().toLowerCase());
  if (direct.includes(key)) return true;
  const row = el.closest('tr') || el.closest('[data-row]');
  return row ? String(row.textContent || '').trim().toLowerCase().split(/\s+/).includes(key) : false;
};
const highlight = (input, color) => { input.style.outline = `3px solid ${color}`; input.style.outlineOffset = '2px'; input.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !['ssm-attach-file','ssm-autofill'].includes(message?.kind)) return false;
  try {
    if (!message.sessionToken || message.sessionToken !== localStorage.getItem('access_token') || message.workspace !== localStorage.getItem('workspace')) throw new Error('Phiên SSM vừa đổi. Kiểm tra đúng tài khoản rồi thử lại.');
    if (message.kind === 'ssm-attach-file') {
      if (typeof message.fileData !== 'string' || message.fileData.length > 4000000 || typeof message.fileName !== 'string' || !/\.xlsx$/i.test(message.fileName)) throw new Error('Chỉ nhận file Excel .xlsx hợp lệ.');
      const inputs = [...document.querySelectorAll('input[type="file"]')].filter(excelInput);
      if (inputs.length !== 1) throw new Error('Mở đúng form nhập điểm LO, chỉ để một ô chọn .xlsx rồi thử lại.');
      const input = inputs[0];
      const bytes = Uint8Array.from(atob(message.fileData), c => c.charCodeAt(0));
      const file = new File([bytes], message.fileName, {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files;
      input.dispatchEvent(new Event('change', {bubbles:true})); input.dispatchEvent(new Event('input', {bubbles:true})); highlight(input, '#10b981');
      sendResponse({ok:true}); return false;
    }
    const fields = message.params?.fields;
    if (message.params?.fieldSelector || !Array.isArray(fields) || !fields.length || fields.length > 500) throw new Error('Danh sách hoặc cách chọn ô không hợp lệ.');
    const inputs = [...document.querySelectorAll('textarea, input[type="text"]')].filter(textInput);
    const plan = [], used = new Set(), keys = new Set();
    for (const field of fields) {
      if (typeof field?.key !== 'string' || typeof field.value !== 'string' || !field.key.trim() || !field.value.trim() || field.value.length > 10000) throw new Error('Mỗi nội dung cần mã chính xác và chữ hợp lệ.');
      const key = field.key.trim().toLowerCase();
      if (keys.has(key)) throw new Error('Mã bị lặp trong danh sách. Không điền để tránh ghi nhầm.'); keys.add(key);
      const targets = message.params?.target === 'focused' ? fields.length === 1 && document.activeElement instanceof HTMLTextAreaElement && textInput(document.activeElement) ? [document.activeElement] : [] : inputs.filter(el => exactKey(el, key));
      if (targets.length !== 1 || used.has(targets[0])) throw new Error('Chưa xác định duy nhất đúng ô. Chọn ô cần điền hoặc kiểm tra Mã HS rồi thử lại.');
      const input = targets[0]; if (String(input.value || '').trim() && input.value !== field.value) throw new Error('Ô đã có nội dung. Tiện ích không ghi đè; thầy cô kiểm tra trên SSM.');
      used.add(input); plan.push({input,value:field.value});
    }
    for (const {input,value} of plan) {
      const setter = Object.getOwnPropertyDescriptor(input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value')?.set;
      if (!setter) throw new Error('Ô nhập không hỗ trợ điền an toàn.'); setter.call(input,value);
      input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); highlight(input,'#8b5cf6');
    }
    sendResponse({ok:true,data:{filled:plan.length,total:fields.length}});
  } catch (reason) { sendResponse({ok:false,error:reason instanceof Error ? reason.message : String(reason)}); }
  return false;
});
