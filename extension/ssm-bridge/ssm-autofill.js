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

  return false;
});
