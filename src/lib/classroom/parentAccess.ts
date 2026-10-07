/**
 * Cổng phụ huynh (/ph): PIN RIÊNG của phụ huynh + báo cáo giáo viên đã công bố. Thuần — dùng chung máy chủ và giao diện.
 *
 * PIN phụ huynh tách khỏi PIN học sinh: PIN học sinh là chìa khoá đăng nhập của em (nộp bài…) và có khoá khi nhập sai;
 * PIN phụ huynh KHÔNG khoá (chủ dự án chốt) nên gõ nhầm không bao giờ làm khoá em hay chính phụ huynh.
 */
import type { ReportKind } from './reportKinds.js';

/** `classes/{classId}/parentSecrets/{studentId}` — bản băm + bản hiển thị PIN + `pinSetBy` (không còn khoá khi nhập sai). */
export const PARENT_SECRETS_SUB = 'parentSecrets';
/** `classes/{classId}/parentConfig/branding` — nhận diện trường/GV của lần công bố gần nhất, để báo cáo tự chọn không phải quét mọi báo cáo đã công bố. */
export const PARENT_CONFIG_SUB = 'parentConfig';
export const PARENT_BRANDING_DOC = 'branding';
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

/** PIN phụ huynh: đúng 4 ký tự bất kỳ (số, chữ, ký tự đặc biệt), không có khoảng trắng. Chuẩn hoá NFC để chữ có dấu gõ ở máy nào cũng khớp. */
export const PARENT_PIN_LENGTH = 4;
export const normalizeParentPin = (raw: string): string => raw.normalize('NFC');
// Chặn khoảng trắng, ký tự điều khiển, ký tự vô hình/định dạng (zero-width, RTL…) và surrogate lẻ (emoji hợp lệ vẫn được) — PIN phải nhìn thấy và gõ lại được.
const PIN_FORBIDDEN = /[\s\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]/;
const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;
export const isValidParentPin = (pin: unknown): pin is string =>
  typeof pin === 'string' && !PIN_FORBIDDEN.test(pin) && !LONE_SURROGATE.test(pin) && [...normalizeParentPin(pin)].length === PARENT_PIN_LENGTH;
/** Mã học sinh hợp lệ làm id tài liệu Firestore (không `/`, không `.`/`..`, không dạng `__x__`); chặn sớm thay vì để máy chủ ném 500. */
export const isSafeDocId = (id: unknown): id is string =>
  typeof id === 'string' && id.length > 0 && id.length <= 150 && !id.includes('/') && id !== '.' && id !== '..' && !/^__.*__$/.test(id) && !/[\u0000-\u001f\u007f]/.test(id) && !LONE_SURROGATE.test(id);
export const PARENT_PIN_RULE = 'Mã PIN gồm đúng 4 ký tự (số, chữ hoặc ký tự đặc biệt), không có dấu cách.';

export const parentPortalLink = (origin: string, joinCode: string): string => `${origin}/ph/${joinCode}`;

export const DEFAULT_PARENT_MESSAGE = [
  'Kính gửi phụ huynh em {ten} ({lop}),',
  'Thầy cô gửi phụ huynh đường dẫn xem báo cáo học tập môn Toán của em:',
  '{link}',
  'Cách vào: chọn tên con → nhập mã PIN tạm: {pin}',
  'Lần đầu vào, hệ thống sẽ yêu cầu phụ huynh tự đặt mã PIN riêng (4 ký tự bất kỳ); sau đó mã tạm này hết hiệu lực. Xin đừng chia sẻ mã. Các báo cáo mới (tháng, giữa kì, cuối kì) sẽ được cập nhật tại cùng đường dẫn này.',
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

/** `classes/{classId}/parentStats/{studentId}` — bộ đếm hoạt động của phụ huynh; `.../events/{id}` — dòng thời gian chi tiết. */
export const PARENT_STATS_SUB = 'parentStats';
export const PARENT_EVENTS_SUB = 'events';
/** Trang phụ huynh gửi tín hiệu "còn đây" mỗi chừng này; quá `PARENT_ONLINE_MS` không có tín hiệu = không còn xem. */
export const PARENT_PING_MS = 30_000;
export const PARENT_ONLINE_MS = 75_000;

export type ParentEventType = 'login' | 'open' | 'pdf' | 'custom' | 'pinChanged';
export type ParentDevice = 'mobile' | 'desktop' | 'khac';
export const parentDeviceOf = (value: unknown): ParentDevice => (value === 'mobile' || value === 'desktop' ? value : 'khac');

/** Một dòng thống kê của một em, phía giáo viên nhìn thấy. */
export interface ParentActivityRow {
  studentId: string;
  name: string;
  loginCount: number;
  openCount: number;
  pdfCount: number;
  customCount: number;
  wrongCount: number;
  firstLoginAt: string;
  lastLoginAt: string;
  lastSeenAt: string;
  lastWrongAt: string;
  lastDevice: ParentDevice | '';
  /** Có tín hiệu trong `PARENT_ONLINE_MS` gần nhất (máy chủ tính theo giờ máy chủ). */
  online: boolean;
}

export interface ParentActivityEvent {
  id: string;
  type: ParentEventType;
  at: string;
  device: ParentDevice;
  /** Báo cáo nào (tiêu đề) hoặc khoảng ngày tự chọn. */
  detail: string;
}

/** Nhận diện trường/giáo viên đưa vào báo cáo: chỉ giữ chữ (đã cắt độ dài) và logo dạng data URL ảnh an toàn — không chép nguyên JSON của giáo viên. */
export interface ParentBrandingData { schoolName?: string; teacherName?: string; logoDataUrl?: string }
const LOGO_RE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
export const sanitizeBranding = (value: unknown): ParentBrandingData | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const logo = typeof raw.logoDataUrl === 'string' && raw.logoDataUrl.length <= 250_000 && LOGO_RE.test(raw.logoDataUrl) ? raw.logoDataUrl : '';
  const out: ParentBrandingData = {
    ...(text(raw.schoolName, 120) ? { schoolName: text(raw.schoolName, 120) } : {}),
    ...(text(raw.teacherName, 80) ? { teacherName: text(raw.teacherName, 80) } : {}),
    ...(logo ? { logoDataUrl: logo } : {}),
  };
  return Object.keys(out).length > 0 ? out : null;
};

/** Báo cáo xem đầu tiên = kì MỚI NHẤT theo ngày kết thúc (công bố lại một kì cũ không được nhảy lên đầu); cùng kì thì bản công bố sau xếp trước. */
export const compareParentReports = (a: { to: string; publishedAt: string }, b: { to: string; publishedAt: string }): number =>
  b.to.localeCompare(a.to) || b.publishedAt.localeCompare(a.publishedAt);

