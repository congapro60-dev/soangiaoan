// NGUỒN SỰ THẬT DUY NHẤT về bố cục form giáo án ban Toán (25-26_Mẫu giáo án_Ban Toán.docx).
//
// Dùng chung cho HAI đường xuất:
//   - buildSchoolFormDocx.ts  → file .docx (docx.js, đơn vị twip / half-point)
//   - buildSchoolFormHtml.ts  → trang in HTML để lưu PDF (đơn vị inch / pt / %)
//
// Trước đây bộ màu và tỉ lệ cột bị chép tay ở nhiều nơi; HANDOFF ghi đó là bất biến nhưng
// KHÔNG có test nào khoá. Lệch một chỗ là người dùng thấy Word và PDF khác nhau.
// `schoolFormLayout.invariants.test.ts` khoá cả ba đường về đúng bộ số này.

/** Mã màu pastel LẤY ĐÚNG từ template trường. */
export const FILL = {
  ttc: 'C9DAF8',       // I. THÔNG TIN CHUNG
  sub: 'FCE5CD',       // tiểu mục
  tienTrinh: 'CFE2F3', // II. TIẾN TRÌNH + header bảng hoạt động
  khoiDong: 'E6B8AF',  // hoạt động đầu tiên (khởi động)
  hoatDongChinh: 'B6D7A8',
  hoatDong: 'D9EAD3',  // các hoạt động còn lại
  soKet: 'B4A7D6',
  btvn: 'EAD1DC',
} as const;

export const FONT = 'Arial';

/** Cỡ chữ theo POINT — đường .docx nhân đôi thành half-point, đường HTML dùng thẳng. */
export const PT = { body: 11, band: 12, title: 15 } as const;

/** Giãn dòng: docx dùng 264 twip trên nền 240 (= 1.1 lần). */
export const LINE_HEIGHT = 264 / 240;

/**
 * Khổ Letter NGANG, đơn vị twip (1 inch = 1440 twip).
 * docx.js tự hoán đổi width/height khi orientation=LANDSCAPE nên `buildSchoolFormDocx`
 * truyền vào theo chiều dọc; các số dưới đây là kích thước SAU khi xoay.
 */
export const PAGE_TWIP = { width: 15840, height: 12240 } as const;
export const MARGIN_TWIP = { top: 180, right: 720, bottom: 1440, left: 450 } as const;

/** Bề rộng in được = 15840 − 450 − 720. */
export const PRINTABLE_TWIP = PAGE_TWIP.width - MARGIN_TWIP.left - MARGIN_TWIP.right;

export const twipToInch = (twip: number): number => twip / 1440;

/**
 * Phiếu học tập ở phụ lục in trên khổ A4 (không phải Letter như thân giáo án) vì giáo viên
 * photo phát cho học sinh. Số đo theo chiều DỌC; đường .docx tự hoán đổi khi để ngang.
 */
export const PHIEU_PAGE_TWIP = { width: 11906, height: 16838 } as const; // A4 = 210 × 297 mm
export const PHIEU_MARGIN_TWIP = { top: 720, right: 720, bottom: 720, left: 900 } as const;

/** Bề rộng in được của phiếu, theo từng hướng giấy. */
export const phieuPrintableTwip = (khoGiay: 'doc' | 'ngang'): number => {
  const rong = khoGiay === 'ngang' ? PHIEU_PAGE_TWIP.height : PHIEU_PAGE_TWIP.width;
  return rong - PHIEU_MARGIN_TWIP.left - PHIEU_MARGIN_TWIP.right;
};

/**
 * Bảng hoạt động 3 cột (Thời gian thực | Giáo viên và Học sinh | Nội dung) — chuẩn ban Toán
 * 15/45/40, chốt 2026-07 sau khi rà 3 giáo án định hướng Bài 19. Trước đó là 9/50/41, cột
 * Thời gian quá hẹp làm mốc "P12 – P22" bị xuống dòng.
 */
export const ACTIVITY_COL_RATIOS = [0.15, 0.45, 0.4] as const;

/** Bảng mục tiêu 2 cột: nhãn mức / nội dung. */
export const OBJECTIVE_COL_RATIOS = [0.18, 0.82] as const;

/**
 * Độ rộng 3 cột theo twip cho đường .docx. Tổng 14625 — CỐ Ý lệch nhẹ so với
 * PRINTABLE_TWIP (14670) vì đây là số đã chốt và đã kiểm trên file thật; đổi cho "tròn"
 * sẽ làm dịch mọi giáo án cũ. Test bất biến chỉ khoá TỈ LỆ, không khoá tổng.
 */
export const ACTIVITY_COL_TWIP = [2194, 6581, 5850] as const;

/** Tỉ lệ phần trăm dùng cho HTML — dẫn xuất từ cùng một bộ tỉ lệ, không chép tay. */
export const toPercents = (ratios: readonly number[]): string[] =>
  ratios.map((r) => `${(r * 100).toFixed(2)}%`);
