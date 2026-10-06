/**
 * Cổng phụ huynh (/ph): PIN RIÊNG của phụ huynh + báo cáo giáo viên đã công bố. Thuần — dùng chung máy chủ và giao diện.
 *
 * PIN phụ huynh tách khỏi PIN học sinh: PIN học sinh là chìa khoá đăng nhập của em (nộp bài…) và có khoá khi nhập sai,
 * phụ huynh gõ nhầm không được làm khoá em.
 */
import type { ReportKind } from './reportKinds.js';

/** `classes/{classId}/parentSecrets/{studentId}` — bản băm + bản hiển thị PIN, trạng thái khoá. */
export const PARENT_SECRETS_SUB = 'parentSecrets';
/** `classes/{classId}/parentReports/{studentId}__{kind}__{from}__{to}` — bản chụp báo cáo giáo viên đã công bố. */
export const PARENT_REPORTS_SUB = 'parentReports';
/** Trần độ dài JSON một báo cáo (Firestore giới hạn 1MB/tài liệu; chữ Việt tính theo byte UTF-8). */
export const PARENT_INPUT_MAX_CHARS = 300_000;
/** Số báo cáo gửi mỗi lượt lên máy chủ (thân yêu cầu Vercel tối đa ~4,5MB). */
export const PUBLISH_CHUNK = 12;

export const parentReportDocId = (studentId: string, kind: ReportKind | string, from: string, to: string): string =>
  `${studentId}__${kind}__${from}__${to}`;

/** Người đặt PIN hiện tại: giáo viên cấp (phụ huynh phải đặt lại ở lần vào đầu tiên) hoặc chính phụ huynh. */
export type ParentPinSetBy = 'teacher' | 'parent';

/** Lý do PIN do phụ huynh tự chọn quá dễ đoán (4 số giống nhau, dãy tăng/giảm); `null` nếu chấp nhận được. */
export const weakParentPinReason = (pin: string): string | null => {
  if (/^(\d)\1{3}$/.test(pin)) return 'Mã PIN không được là 4 số giống nhau.';
  if ('0123456789'.includes(pin) || '9876543210'.includes(pin)) return 'Mã PIN không được là dãy số liên tiếp (như 1234).';
  return null;
};

export const parentPortalLink =(origin: string, joinCode: string): string => `${origin}/ph/${joinCode}`;

export const DEFAULT_PARENT_MESSAGE = [
  'Kính gửi phụ huynh em {ten} ({lop}),',
  'Thầy cô gửi phụ huynh đường dẫn xem báo cáo học tập môn Toán của em:',
  '{link}',
  'Cách vào: chọn tên con → nhập mã PIN: {pin}',
  'Mã PIN dành riêng cho phụ huynh, xin đừng chia sẻ. Các báo cáo mới (tháng, giữa kì, cuối kì) sẽ được cập nhật tại cùng đường dẫn này.',
  'Trân trọng.',
].join('\n');

/** Thay {ten} {lop} {link} {pin}; biến lạ giữ nguyên để giáo viên thấy lỗi gõ. */
export const renderParentMessage = (template: string, vars: { ten: string; lop: string; link: string; pin: string }): string =>
  template.replace(/\{(ten|lop|link|pin)\}/g, (_, key: keyof typeof vars) => vars[key]);

/** Một báo cáo đã công bố, phía phụ huynh nhìn thấy (kèm bản chụp dữ liệu để dựng lại như PDF). */
export interface PublishedParentReport {
  id: string;
  kind: ReportKind;
  from: string;
  to: string;
  title: string;
  range: string;
  publishedAt: string;
  input: unknown;
}

/** Một kì đã công bố cho cả lớp, phía giáo viên nhìn thấy. */
export interface PublishedParentGroup {
  kind: ReportKind;
  from: string;
  to: string;
  title: string;
  range: string;
  count: number;
  publishedAt: string;
}
