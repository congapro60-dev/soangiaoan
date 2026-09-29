/**
 * Lấy link file mẫu điểm LO của SSM (dán vào app) → URL file .xlsx thật trên CDN.
 * CHỈ chấp nhận file tĩnh công khai ở `cdn-ssm.edufit.vn/export/evaluation/…xlsx`.
 * Không phải SSM, không vé đăng nhập — chỉ là file mẫu ai có link cũng tải được.
 * Thuần, không gọi mạng. Máy chủ dùng hàm này để CHẶN trước khi tải (chống tải URL bậy).
 */

const ALLOWED_HOST = 'cdn-ssm.edufit.vn';
const ALLOWED_PREFIX = '/export/evaluation/';

/**
 * Trả URL CDN hợp lệ, hoặc null nếu link không đúng.
 * Nhận cả link trực tiếp lẫn link xem Office (`view.officeapps.live.com/op/view.aspx?src=<url mã hoá>`).
 */
export const resolveTemplateUrl = (input: string): string | null => {
  const raw = (input ?? '').trim();
  if (!raw) return null;

  let candidate: URL;
  try {
    candidate = new URL(raw);
  } catch {
    return null;
  }

  // Link xem Office: URL thật nằm ở tham số ?src=
  if (candidate.hostname.endsWith('officeapps.live.com')) {
    const src = candidate.searchParams.get('src');
    if (!src) return null;
    try {
      candidate = new URL(src);
    } catch {
      return null;
    }
  }

  if (candidate.protocol !== 'https:') return null;
  if (candidate.hostname !== ALLOWED_HOST) return null;
  if (!candidate.pathname.startsWith(ALLOWED_PREFIX)) return null;
  if (!candidate.pathname.toLowerCase().endsWith('.xlsx')) return null;
  // Bỏ query/hash — chỉ giữ đường dẫn file.
  return `https://${ALLOWED_HOST}${candidate.pathname}`;
};
