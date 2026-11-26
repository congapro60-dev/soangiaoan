/**
 * Đồng bộ khoá Gemini của Cài đặt (trình duyệt) lên máy chủ — một ô dán, dùng cho cả soạn bài lẫn chấm bài (26/11/2026).
 *
 * Máy chủ không bao giờ trả khoá thật, chỉ 4 ký tự cuối. Nên:
 * - khoá trong trình duyệt → gửi lên (máy chủ kiểm khoá mới với Google);
 * - khoá CHỈ có trên máy chủ (vd lưu ở trang Chi phí AI trước đây) → giữ lại, trừ khi khoá đó đã từng được đồng bộ từ trình
 *   duyệt rồi bị xoá ở trình duyệt (tức giáo viên chủ động xoá).
 */
import { maskKey } from '../admin/aiKeyPolicy';

export interface KeySyncPlan {
  /** Có cần gọi máy chủ không. */
  needed: boolean;
  keys: string[];
  keepLast4: string[];
}

const SYNCED_STORAGE_KEY = 'smartplan:aiKeySyncedLast4';

export const planKeySync = (localKeys: readonly string[], serverLast4: readonly string[], syncedLast4: readonly string[]): KeySyncPlan => {
  const keys = [...new Set(localKeys.map(k => k.trim()).filter(Boolean))];
  const localLast4 = keys.map(maskKey);
  const keepLast4 = serverLast4.filter(l => !localLast4.includes(l) && !syncedLast4.includes(l));
  const wanted = [...localLast4, ...keepLast4];
  const needed = keys.length > 0 && (wanted.length !== serverLast4.length || wanted.some((l, i) => l !== serverLast4[i]));
  return { needed, keys, keepLast4 };
};

export const readSyncedLast4 = (): string[] => {
  try { return JSON.parse(localStorage.getItem(SYNCED_STORAGE_KEY) || '[]') as string[]; } catch { return []; }
};

export const writeSyncedLast4 = (keys: readonly string[]): void => {
  try { localStorage.setItem(SYNCED_STORAGE_KEY, JSON.stringify(keys.map(maskKey))); } catch { /* trình duyệt chặn lưu: lần sau đồng bộ lại */ }
};
