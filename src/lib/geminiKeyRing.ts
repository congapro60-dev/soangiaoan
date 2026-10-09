/**
 * NHIỀU KHOÁ GEMINI TRONG CÀI ĐẶT (trình duyệt của giáo viên) — giáo viên có nhiều tài khoản Google thì dán mỗi tài khoản một khoá
 * để gom hạn mức miễn phí. Khoá hết hạn mức / hỏng thì tự đổi sang khoá kế; hết cả danh sách mới báo lỗi (khi đó chế độ
 * "khoá riêng trước, hết mới sang ví" tiếp tục chuyển sang ví web như trước).
 *
 * Khoá chỉ nằm trong trình duyệt này (không gửi lên máy chủ, không đồng bộ sang máy khác). `settings.geminiApiKey` luôn là
 * khoá ĐẦU TIÊN của danh sách, để mọi nơi chỉ cần biết "có khoá hay chưa" vẫn chạy đúng.
 */
import { cooldownMsFor } from './admin/geminiKeyPool';
import { isOwnKeyFailure } from './ai/aiModeStore';

export const MAX_OWN_GEMINI_KEYS = 10;
const REST_STORAGE_KEY = 'smartplan:gemini-key-rest:v1';
const INVALID_REST_MS = 6 * 60 * 60 * 1000;

interface KeySettings { geminiApiKey?: string; geminiApiKeys?: string[] }

/** Bỏ ô trống, khoảng trắng thừa, khoá trùng; cắt ở trần. */
export const normalizeKeys = (keys: readonly string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of keys) {
    const key = String(raw ?? '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= MAX_OWN_GEMINI_KEYS) break;
  }
  return out;
};

/** Danh sách khoá Gemini của giáo viên: `geminiApiKeys` nếu có, không thì khoá đơn cũ. */
export const geminiKeysOf = (settings: KeySettings): string[] => {
  const list = normalizeKeys(settings.geminiApiKeys ?? []);
  return list.length > 0 ? list : normalizeKeys([settings.geminiApiKey ?? '']);
};

/** Dùng khi đang GÕ trong Cài đặt: giữ nguyên ô trống để các ô không nhảy vị trí; `geminiApiKey` vẫn là khoá không-rỗng đầu tiên. */
export const editingKeysPatch = (rows: readonly string[]): { geminiApiKey: string; geminiApiKeys: string[] } => {
  const list = rows.slice(0, MAX_OWN_GEMINI_KEYS).map(row => String(row ?? ''));
  return { geminiApiKey: list.map(row => row.trim()).find(Boolean) ?? '', geminiApiKeys: list };
};

/** Các ô hiện trong Cài đặt: danh sách đã lưu, hoặc khoá đơn cũ, luôn có ít nhất một ô. */
export const keyRowsOf = (settings: KeySettings): string[] => {
  const rows = settings.geminiApiKeys && settings.geminiApiKeys.length > 0 ? settings.geminiApiKeys : [settings.geminiApiKey ?? ''];
  return rows.length > 0 ? [...rows] : [''];
};

// ── Khoá nghỉ: nhớ theo dấu vân tay (đuôi khoá), không lưu khoá thật ở đây ──

type RestMap = Record<string, number>;
const fingerprint = (key: string): string => `${key.length}:${key.slice(-8)}`;

const readRest = (): RestMap => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(REST_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed as RestMap : {};
  } catch {
    return {};
  }
};
const writeRest = (map: RestMap): void => {
  try { window.localStorage.setItem(REST_STORAGE_KEY, JSON.stringify(map)); } catch { /* chế độ riêng tư: chỉ mất nhớ nghỉ giữa các lần mở trang */ }
};

/** Nghỉ bao lâu sau lỗi của khoá: sai/bị thu hồi → 6 giờ; còn lại theo thân lỗi (hạn mức ngày, `retryDelay`…). */
export const restMsForError = (error: unknown, now: number): number => {
  const text = error instanceof Error ? error.message : String(error ?? '');
  if (/API key not valid|API_KEY_INVALID|API key expired|PERMISSION_DENIED|\b401\b/i.test(text)) return INVALID_REST_MS;
  return cooldownMsFor(text, now);
};

/**
 * Thứ tự thử: khoá sẵn sàng trước (xoay vòng để dàn đều tải), rồi tới khoá đang nghỉ — khoá sắp hết nghỉ trước.
 * Khoá đang nghỉ vẫn được thử khi không còn khoá nào khác (hạn mức theo phút có thể đã hồi).
 */
export const orderKeys = (keys: readonly string[], rest: RestMap, now: number, rotation: number): string[] => {
  const ready = keys.filter(k => !((rest[fingerprint(k)] ?? 0) > now));
  const resting = keys.filter(k => (rest[fingerprint(k)] ?? 0) > now).sort((a, b) => rest[fingerprint(a)] - rest[fingerprint(b)]);
  const start = ready.length > 0 ? Math.abs(rotation) % ready.length : 0;
  return [...ready.slice(start), ...ready.slice(0, start), ...resting];
};

let rotation = 0;

/**
 * Chạy `run` với khoá đầu tiên dùng được; lỗi do KHOÁ (hết hạn mức, sai khoá) thì cho khoá đó nghỉ và thử khoá kế.
 * Lỗi khác (quá tải 503, mạng, prompt sai) ném ra ngay — đổi khoá không giúp được gì. `canRotate` cho nơi đã hiện một phần kết
 * quả (luồng chữ): đổi khoá lúc đó làm lặp nội dung nên phải ném lỗi luôn.
 */
export const withGeminiKeys = async <T>(
  keys: readonly string[],
  run: (key: string) => Promise<T>,
  options: { canRotate?: () => boolean } = {},
): Promise<T> => {
  const list = normalizeKeys(keys);
  if (list.length === 0) throw new Error('Chưa có khoá Gemini trong Cài đặt.');
  const rest = readRest();
  const ordered = orderKeys(list, rest, Date.now(), rotation++);
  let lastError: unknown;
  for (const key of ordered) {
    try {
      const result = await run(key);
      if (rest[fingerprint(key)]) { delete rest[fingerprint(key)]; writeRest(rest); }
      return result;
    } catch (error) {
      lastError = error;
      if (!isOwnKeyFailure(error) || options.canRotate?.() === false) throw error;
      const now = Date.now();
      rest[fingerprint(key)] = now + restMsForError(error, now);
      writeRest(rest);
    }
  }
  throw lastError;
};
