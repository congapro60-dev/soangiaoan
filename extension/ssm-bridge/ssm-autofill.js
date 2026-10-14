// Chạy trong tab ssm.edufit.vn. Nhận file Excel đã điền điểm từ service worker
// và tự động gắn vào ô <input type="file"> trên trang SSM đang mở.
//
// HẠNG MỤC 1 (1-Click Excel Relay) & HẠNG MỤC 2/3 (Auto-Fill):
// Nguyên tắc an toàn: chỉ ĐIỀN và TÔ VIỀN NỔI BẬT, giáo viên tự bấm Lưu trên SSM.
// Không tự bấm nút Lưu/Submit bao giờ.

/**
 * Tìm ô input file trên trang SSM để gắn file Excel điểm LO.
 * Ưu tiên input có accept chứa .xlsx hoặc nằm gần chữ "Upload"/"Chọn file".
 */
const findScoreFileInput = () => {
  const inputs = [...document.querySelectorAll('input[type="file"]')];
  if (inputs.length === 0) return null;
  // Ưu tiên input chấp nhận .xlsx
  const xlsx = inputs.find(i => (i.accept || '').toLowerCase().includes('xlsx'));
  if (xlsx) return xlsx;
  return inputs[0];
};

/**
 * Gắn file vào input và bắn sự kiện change để framework của SSM nhận biết.
 * Tô viền xanh nổi bật để giáo viên kiểm tra mắt trước khi bấm Lưu.
 */
const attachFileToInput = (input, file) => {
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('input', { bubbles: true }));
  // Tô viền nổi bật — giáo viên kiểm tra mắt 1 lần rồi tự bấm Lưu trên SSM.
  input.style.outline = '3px solid #10b981';
  input.style.outlineOffset = '2px';
  input.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;

  // HẠNG MỤC 1: gắn file Excel điểm LO đã điền vào trang SSM.
  if (message?.kind === 'ssm-attach-file') {
    (async () => {
      try {
        const input = findScoreFileInput();
        if (!input) {
          sendResponse({ ok: false, error: 'Không tìm thấy ô chọn file trên trang SSM — mở trang nhập điểm LO rồi thử lại.' });
          return;
        }
        // message.fileData là base64 của file .xlsx đã điền điểm.
        const bytes = Uint8Array.from(atob(message.fileData), c => c.charCodeAt(0));
        const file = new File([bytes], message.fileName || 'diem-lo-da-dien.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        attachFileToInput(input, file);
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: 'Không gắn được file: ' + (e.message || e) });
      }
    })();
    return true; // async response
  }

  // HẠNG MỤC 2: tự điền nhận xét học sinh cả lớp vào bảng trên trang SSM.
  // HẠNG MỤC 3: tự điền lịch báo giảng / BTVN vào các ô tiết học trên trang SSM.
  // params.fields: [{ key, value, match }] — key để khớp (mã HS / tên tiết), value để điền.
  // params.fieldSelector: CSS selector của các ô cần điền (mặc định: textarea, input[type=text]).
  if (message?.kind === 'ssm-autofill') {
    (async () => {
      try {
        const fields = message.params?.fields || [];
        const selector = message.params?.fieldSelector || 'textarea, input[type="text"]';
        if (!Array.isArray(fields) || fields.length === 0) {
          sendResponse({ ok: false, error: 'Thiếu danh sách nội dung cần điền.' });
          return;
        }
        const inputs = [...document.querySelectorAll(selector)];
        if (inputs.length === 0) {
          sendResponse({ ok: false, error: 'Không tìm thấy ô nhập liệu nào trên trang SSM.' });
          return;
        }
        let filled = 0;
        for (const f of fields) {
          const key = (f.key || '').toString().trim().toLowerCase();
          const value = (f.value || '').toString();
          if (!key || !value) continue;
          // Tìm ô có chứa key trong các thuộc tính gần nó (data-*, name, id, placeholder, hoặc dòng chứa key).
          const target = inputs.find((el) => {
            const hay = [
              el.getAttribute('data-key') || '',
              el.getAttribute('data-code') || '',
              el.name || '',
              el.id || '',
              el.placeholder || '',
              el.closest('tr')?.textContent || '',
              el.closest('[data-row]')?.textContent || '',
            ].join(' ').toLowerCase();
            return hay.includes(key);
          });
          if (!target) continue;
          // Điền giá trị — hỗ trợ cả React (native setter) để framework nhận biết.
          const setter = Object.getOwnPropertyDescriptor(
            target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
            'value'
          )?.set;
          if (setter) setter.call(target, value);
          else target.value = value;
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
          // Tô viền nổi bật để giáo viên kiểm tra mắt trước khi bấm Lưu trên SSM.
          target.style.outline = '3px solid #8b5cf6';
          target.style.outlineOffset = '2px';
          filled++;
        }
        sendResponse({ ok: true, data: { filled, total: fields.length } });
      } catch (e) {
        sendResponse({ ok: false, error: 'Không điền được: ' + (e.message || e) });
      }
    })();
    return true;
  }

  return false;
});
