/**
 * Quy tắc style cho xuất Word loại "Giáo án ban Toán" (KHDH kiểu v13) — CHỈ DATA.
 * Port màu/độ rộng từ outputs/khdh/build_v8_combined.js (bản mẫu vàng KHDH_v13).
 *
 * Dùng bởi renderWordCore.ts (client) khi styleProfile === 'toan'.
 * ⚠️ Bản server api/render-word-core.ts CHƯA mirror — bot-push render generic (TODO trong HANDOFF).
 * Nguyên tắc nhận diện: match trên chuỗi ĐÃ CHUẨN HÓA (bỏ dấu, lowercase) để chịu được
 * biến thể output AI; KHÔNG match được thì rơi về render thường — không bao giờ fail.
 */

/** Chuẩn hóa tiếng Việt để match: lowercase, bỏ dấu, bỏ emoji/số thứ tự đầu, gộp khoảng trắng. */
export const normalizeViHeading = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s|/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Banner mục theo màu v13 — match trên heading đã chuẩn hóa, cái khớp ĐẦU TIÊN thắng. */
export const TOAN_BANNER_MATCHERS: Array<{ re: RegExp; fill: string }> = [
  { re: /thong tin chung/, fill: 'c9daf8' },
  { re: /muc tieu|phan hoa muc tieu/, fill: 'fce5cd' },
  { re: /khoi dong|xac dinh muc tieu|xac dinh nhiem vu|tien trinh/, fill: 'cfe2f3' },
  { re: /mo rong|van dung thuc te|co hoi hoc tap/, fill: 'c9daf8' },
  { re: /so ket|rut kinh nghiem|tong hop|tong ket/, fill: 'b4a7d6' },
  { re: /btvn|ve nha|huong dan ve nha/, fill: 'ead1dc' },
  { re: /truoc gio hoc/, fill: 'cfe2f3' },
  // hoat dong đặt SAU các mục cụ thể (khởi động/mở rộng/sơ kết cũng là "hoạt động n")
  { re: /hoat dong|hinh thanh|luyen tap|tic.?tac.?toe|jigsaw|chuyen gia|vong ghep|kiem tra chuan bi/, fill: 'b6d7a8' },
];

/** Tra fill banner cho heading loại toan; undefined = render heading thường. */
export const matchToanBanner = (headingText: string): string | undefined => {
  const norm = normalizeViHeading(headingText);
  if (!norm) return undefined;
  return TOAN_BANNER_MATCHERS.find(m => m.re.test(norm))?.fill;
};

/** Bảng hoạt động 3 cột: header khớp Thời gian / Giáo viên và Học sinh / Nội dung ghi bảng. */
export const isToanActivityTableHeader = (headerCells: string[]): boolean => {
  if (headerCells.length !== 3) return false;
  const [c1, c2, c3] = headerCells.map(normalizeViHeading);
  return /thoi gian/.test(c1) && /(giao vien|gv)/.test(c2) && /(noi dung|ghi bang)/.test(c3);
};

/**
 * Tỉ lệ độ rộng 3 cột bảng hoạt động — chuẩn ban Toán 15/45/40.
 * Chốt 2026-07 sau khi rà 3 giáo án định hướng Bài 19; phải KHỚP với COL3 trong
 * lib/toanSchoolForm/buildSchoolFormDocx.ts (hai đường xuất Word khác nhau, cùng một chuẩn).
 */
export const TOAN_ACTIVITY_COL_RATIOS = [0.15, 0.45, 0.4] as const;

/** Fill header bảng hoạt động. */
export const TOAN_ACT_HEADER_FILL = 'cfe2f3';

/** Bảng mục tiêu: fill theo nhãn hàng ở cột đầu (đã chuẩn hóa). */
export const matchToanObjectiveRowFill = (firstCellText: string): string | undefined => {
  const norm = normalizeViHeading(firstCellText);
  if (/^co ban\b/.test(norm)) return 'D9EAD3';
  if (/^trong tam\b/.test(norm)) return 'FCE5CD';
  if (/^nang cao\b/.test(norm)) return 'FFF2CC';
  return undefined;
};

/**
 * Nhãn câu hỏi ở đầu đoạn/ô — render bold màu xanh đậm. Danh sách ĐÓNG khớp hợp đồng
 * trong toanFormats.ts (Socratic + Bloom + mức độ, kèm biến thể đánh số [NB-1]).
 */
export const TOAN_NHAN_RE =
  /^\s*\[(PHÁT HIỆN|SO SÁNH|SUY LUẬN|DỰ ĐOÁN|KHÁI QUÁT|PHẢN BIỆN|SÁNG TẠO|SỐ HỌC|MÔ HÌNH HÓA|GHI NHỚ|HIỂU|VẬN DỤNG|PHÂN TÍCH|HỆ QUẢ|NB|TH|VD|VDC)(-\d+)?\]/;

/** Màu chữ nhãn câu hỏi (v13: 1F4E79). */
export const TOAN_NHAN_COLOR = '1F4E79';

/**
 * ── BỘ MÀU PHÂN LOẠI DÒNG (chuẩn ban Toán, chốt 2026-07) ────────────────────
 * Mục đích: GV liếc mắt là phân biệt được đâu là kịch bản, đâu là gợi ý cho HS yếu,
 * đâu là cảnh báo lỗi, đâu là ghi chú điều hành lớp. Trước đây mọi thứ đen trơn → rối mắt.
 *
 *  - (mặc định)  đen thường     : lời thoại / kịch bản chính
 *  - CORE_Q      xanh, nghiêng  : câu hỏi cốt lõi giữ suốt tiết
 *  - HINT        cam, nghiêng   : gợi ý / scaffold cho HS cần hỗ trợ
 *  - WARNING     đỏ, đậm        : cảnh báo lỗi HS hay mắc
 *  - WAIT        xám, nghiêng   : ghi chú điều hành lớp (thời gian chờ, gọi ngẫu nhiên)
 *
 * Nhận diện bám ĐÚNG các chuỗi mà toanFormats.ts yêu cầu AI sinh ra (⚠, ↳ Gợi ý, → Chờ…).
 */
export type ToanLineKind = 'core_q' | 'hint' | 'warning' | 'wait';

export interface ToanLineStyle {
  color: string;
  bold?: boolean;
  italic?: boolean;
}

export const TOAN_LINE_STYLES: Record<ToanLineKind, ToanLineStyle> = {
  core_q: { color: '2E75B6', italic: true },
  hint: { color: 'C55A11', italic: true },
  warning: { color: 'C00000', bold: true },
  wait: { color: '7F7F7F', italic: true },
};

/**
 * Bóc mọi ký hiệu dẫn đầu (⚠ → ↳ 💡 • - số thứ tự…) để chỉ còn phần chữ.
 * Làm vậy thay vì liệt kê từng ký hiệu trong regex vì hai cái bẫy đã gặp:
 *  - Emoji ngoài BMP (💡 = U+1F4A1) trong char class `[↳💡]` bị tách thành 2 nửa surrogate
 *    khi regex không bật cờ `u` → không bao giờ khớp.
 *  - Biến thể có VS16 ("⚠️" = ⚠ + U+FE0F) làm lệch phần `\s*` ngay sau.
 */
const stripLeadingSymbols = (s: string): string => s.replace(/^[^\p{L}]+/u, '');

/**
 * ⚠️ KHÔNG dùng \b sau chữ tiếng Việt có dấu: "ý" không phải ký tự \w trong chế độ ASCII nên
 * \b không tạo được ranh giới từ → /gợi\s*ý\b/ KHÔNG khớp "Gợi ý: ...". Dùng neo ^ là đủ.
 */
const TOAN_LINE_MATCHERS: Array<{ kind: ToanLineKind; re: RegExp }> = [
  // Cảnh báo lỗi: "Lỗi phổ biến:", "Dự kiến khó khăn:", "Dự kiến nhầm lẫn Bài 2:",
  // "Lỗi cần tránh:", "Hay nhầm:" — cho phép vài chữ xen giữa từ khóa và dấu hai chấm.
  {
    kind: 'warning',
    re: /^(?:lỗi\s*(?:phổ\s*biến|cần\s*tránh|thường\s*gặp)|dự\s*kiến\s*(?:khó\s*khăn|nhầm\s*lẫn)|hay\s*nhầm)[^:：\n]{0,40}[:：]/i,
  },
  // Gợi ý phân hóa: "↳ Gợi ý…", "💡 Gợi ý…", "Gợi ý (HS…)"
  { kind: 'hint', re: /^gợi\s*ý/i },
  // Ghi chú điều hành: "→ Chờ ≥ 3 giây…", "Chờ 5 giây…"
  { kind: 'wait', re: /^chờ\s*[≥>]?\s*\d/i },
];

/**
 * Phân loại MỘT dòng để tô màu. Trả về undefined nếu là kịch bản thường (giữ đen).
 * `isQuotedItalic`: dòng đang ở dạng *"…"* — dùng để nhận câu hỏi cốt lõi.
 */
export const matchToanLineKind = (
  text: string,
  opts?: { isQuotedItalic?: boolean },
): ToanLineKind | undefined => {
  const raw = (text || '').trim();
  if (!raw) return undefined;
  // Ba nhóm dưới nhận diện trên phần CHỮ (đã bóc ký hiệu dẫn đầu).
  const body = stripLeadingSymbols(raw);
  const hit = TOAN_LINE_MATCHERS.find(m => m.re.test(body));
  if (hit) return hit.kind;
  // Câu hỏi cốt lõi: in nghiêng + nằm trong ngoặc kép + có dấu hỏi — dùng chuỗi GỐC vì
  // dấu mở ngoặc kép chính là dấu hiệu nhận biết (bóc đi là mất).
  if (opts?.isQuotedItalic && /^["“].*[?？]["”]?\s*$/.test(raw)) return 'core_q';
  return undefined;
};

/** Tra style tô màu cho một dòng; undefined = render thường. */
export const matchToanLineStyle = (
  text: string,
  opts?: { isQuotedItalic?: boolean },
): ToanLineStyle | undefined => {
  const kind = matchToanLineKind(text, opts);
  return kind ? TOAN_LINE_STYLES[kind] : undefined;
};
