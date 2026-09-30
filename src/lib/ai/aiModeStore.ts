/**
 * Chế độ nguồn khoá của giáo viên (chỉ khoá riêng / chỉ ví web / cả hai) đang áp dụng ở PHÍA TRÌNH DUYỆT.
 *
 * Soạn giáo án, nâng cấp, dự giờ, ra đề… gọi Gemini ngay từ trình duyệt bằng khoá trong Cài đặt (`aiProviders.ts`). Để ví
 * web trả được cho chúng, nơi gọi cần biết chế độ: giữ khoá riêng, đi qua relay máy chủ, hay khoá riêng trước rồi mới relay.
 * Chế độ đến từ `aiKeyStatus` (chip Ví AI và trang ví cập nhật vào đây); chưa biết thì giữ hành vi cũ (khoá riêng).
 */
import { useSyncExternalStore } from 'react';
import { AI_KEY_MODES, type AiKeyMode } from '../admin/aiKeyPolicy';

export interface AiModeSnapshot {
  mode: AiKeyMode;
  /** Web đã bật tính phí. Chưa bật thì ví chưa dùng cho việc gì, mọi thứ chạy như trước. */
  gateEnabled: boolean;
}

let snapshot: AiModeSnapshot | null = null;
/** Mốc (đơn điệu) của lần đặt gần nhất — để bỏ phản hồi ĐẾN MUỘN của một yêu cầu đã bắt đầu trước thay đổi mới hơn. */
let lastSetAt = 0;
const listeners = new Set<() => void>();

export const getAiModeSnapshot = (): AiModeSnapshot | null => snapshot;

/**
 * `requestedAt` = `performance.now()` lúc BẮT ĐẦU yêu cầu đọc trạng thái. Nếu từ đó tới giờ đã có lần đặt khác (giáo viên vừa
 * đổi chế độ ở trang ví, hoặc đăng xuất → null) thì phản hồi này cũ hơn, bỏ đi — không thì chế độ cũ đè lên chế độ mới (QA F7).
 */
export const setAiModeSnapshot = (next: AiModeSnapshot | null, requestedAt?: number): void => {
  if (requestedAt !== undefined && requestedAt <= lastSetAt) return;
  lastSetAt = performance.now();
  const unchanged = snapshot === next || (snapshot && next && snapshot.mode === next.mode && snapshot.gateEnabled === next.gateEnabled);
  if (unchanged) return;
  snapshot = next;
  listeners.forEach(listener => listener());
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const useAiModeSnapshot = (): AiModeSnapshot | null => useSyncExternalStore(subscribe, getAiModeSnapshot, () => null);

/** Gemini gọi đường nào: khoá riêng ngay trên trình duyệt · relay máy chủ (trừ ví) · khoá riêng trước, hết mới relay. */
export type GeminiRoute = 'own' | 'relay' | 'own-then-relay';

export const geminiRouteFor = (hasOwnKey: boolean, current: AiModeSnapshot | null): GeminiRoute => {
  // Chế độ lạ/thiếu (máy chủ cũ, dữ liệu hỏng) coi như chưa biết → hành vi cũ, KHÔNG suy ra ví (QA F6).
  if (!current || !current.gateEnabled || !AI_KEY_MODES.includes(current.mode) || current.mode === 'own') return 'own';
  if (current.mode === 'wallet') return 'relay';
  return hasOwnKey ? 'own-then-relay' : 'relay';
};

/**
 * Lỗi gọi Gemini có phải lỗi CỦA KHOÁ (hết hạn mức / khoá hỏng) không — chỉ khi đó mới đáng chuyển sang ví.
 * Quá tải (503), mạng đứt, prompt sai KHÔNG phải lỗi khoá: chuyển sang ví lúc đó là đốt tiền oan.
 * Trùng ý `classifyGeminiKeyFailure` ở máy chủ, nhưng ở đây chỉ còn thông điệp lỗi của SDK để xét.
 */
export const isOwnKeyFailure = (error: unknown): boolean => {
  const text = error instanceof Error ? error.message : String(error ?? '');
  if (/\b503\b|high demand|UNAVAILABLE|overloaded/i.test(text)) return false;
  return /\b429\b|RESOURCE_EXHAUSTED|quota|API key not valid|API_KEY_INVALID|API key expired|PERMISSION_DENIED|\b401\b/i.test(text);
};
