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
  { re: /khoi dong|xac dinh muc tieu|tien trinh/, fill: 'cfe2f3' },
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

/** Tỉ lệ độ rộng 3 cột bảng hoạt động theo v13 (1000/4900/3126 của W=9026 ≈ 11%/54%/35%). */
export const TOAN_ACTIVITY_COL_RATIOS = [1000 / 9026, 4900 / 9026, 3126 / 9026] as const;

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

/** Nhãn câu hỏi Socratic [PHÁT HIỆN]... ở đầu đoạn/ô — render bold màu xanh đậm. */
export const TOAN_NHAN_RE = /^\s*\[(PHÁT HIỆN|SO SÁNH|DỰ ĐOÁN|PHẢN VÍ DỤ|KHÁI QUÁT|VÌ SAO)\]/;

/** Màu chữ nhãn câu hỏi (v13: 1F4E79). */
export const TOAN_NHAN_COLOR = '1F4E79';
