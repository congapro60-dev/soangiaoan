// Type + tiện ích dùng chung cho HAI tầng rà soát giáo án:
//  - `generalStandards.ts` — tiêu chí toàn trường (Checklist tự kiểm tra giáo án), mọi môn.
//  - `mathStandards.ts`    — tiêu chí Toán TDS (4 bước, Polya, 2 lộ trình gợi ý...), chỉ Toán.
//
// Tách ra đây để tầng chung không phải import ngược từ tầng Toán.

export type LessonType = 'practice' | 'knowledge' | 'flipped' | 'unknown';

export type FindingStatus = 'pass' | 'fail' | 'warn';
export type FindingSeverity = 'high' | 'medium' | 'low';

/**
 * Mã thành phần Domain 1 của khung Danielson (sheet "Domain 1" trong file checklist):
 * 1a Kiến thức nội dung & sư phạm · 1b Thấu hiểu học sinh · 1c Đặt mục tiêu dạy học
 * 1d Sử dụng tài nguyên · 1e Lập kế hoạch mạch lạc · 1f Thiết kế đánh giá.
 */
export type DanielsonCode = '1a' | '1b' | '1c' | '1d' | '1e' | '1f';

export const DANIELSON_LABEL: Record<DanielsonCode, string> = {
  '1a': 'Kiến thức nội dung & sư phạm',
  '1b': 'Thấu hiểu học sinh',
  '1c': 'Đặt mục tiêu dạy học',
  '1d': 'Sử dụng tài nguyên',
  '1e': 'Lập kế hoạch mạch lạc',
  '1f': 'Thiết kế đánh giá',
};

export interface StandardsFinding {
  /** id ổn định, kebab-case — dùng cho UI/kiểm thử, KHÔNG đổi tuỳ tiện. */
  id: string;
  title: string;
  status: FindingStatus;
  severity: FindingSeverity;
  /** Bằng chứng: đã tìm thấy gì / thiếu gì trong giáo án. */
  evidence: string;
  /** Hướng sửa cụ thể, không chung chung. */
  suggestion: string;
  /** Áp dụng cho mọi tiết, hay chỉ tiết luyện tập (mục C). */
  scope: 'all' | 'practice';
  /** Thành phần Danielson tương ứng; bỏ trống với tiêu chí hành chính. */
  danielson?: DanielsonCode;
}

export const norm = (s: string): string => s.toLowerCase();

export const has = (text: string, re: RegExp): boolean => re.test(text);
