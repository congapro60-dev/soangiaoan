import { useCallback, useEffect, useRef, useState } from 'react';
import { getAiKeyStatus, type AiKeyStatus } from '../lib/ai/aiBillingApi';
import { AI_BILLING_UPDATED_EVENT } from '../lib/ai/aiKeyGate';

/** Sau một lượt gọi AI chờ chừng này (gộp các lượt liên tiếp) rồi mới đọc lại số dư. */
const SETTLE_MS = 3_000;
/** Đọc lại nhiều nhất mỗi chừng này khi bị kích bởi lượt gọi AI: mỗi lần đọc tốn ~6 lượt đọc Firestore. */
const MIN_INTERVAL_MS = 15_000;
/** Thỉnh thoảng đọc lại để thấy lượt do học sinh tự nộp và tiền nạp qua chuyển khoản (không đi qua trình duyệt này). */
const POLL_MS = 90_000;

/**
 * Số dư + chi tiêu hôm nay của ví AI, tự làm mới:
 *  - sau mỗi lượt gọi đường AI của trang này (`aiKeyGate` phát sự kiện),
 *  - mỗi 90 giây,
 *  - khi quay lại tab sau lúc vắng lâu.
 * Tab ẩn thì không đọc. Lỗi đọc thì giữ số cũ (chip không nhấp nháy mất).
 */
export const useAiBillingStatus = (): { status: AiKeyStatus | null; refresh: () => Promise<void> } => {
  const [status, setStatus] = useState<AiKeyStatus | null>(null);
  const lastFetchAt = useRef(0);

  const refresh = useCallback(async () => {
    lastFetchAt.current = Date.now();
    try {
      setStatus(await getAiKeyStatus({ quiet: true }));
    } catch {
      // Giữ số cũ.
    }
  }, []);

  useEffect(() => {
    let settleTimer: number | undefined;
    const refreshIfVisible = () => { if (!document.hidden) void refresh(); };
    const onAiCall = () => {
      window.clearTimeout(settleTimer);
      const wait = Math.max(SETTLE_MS, MIN_INTERVAL_MS - (Date.now() - lastFetchAt.current));
      settleTimer = window.setTimeout(refreshIfVisible, wait);
    };
    const onVisible = () => { if (!document.hidden && Date.now() - lastFetchAt.current > POLL_MS) void refresh(); };

    void refresh();
    window.addEventListener(AI_BILLING_UPDATED_EVENT, onAiCall);
    document.addEventListener('visibilitychange', onVisible);
    const poll = window.setInterval(refreshIfVisible, POLL_MS);
    return () => {
      window.clearTimeout(settleTimer);
      window.clearInterval(poll);
      window.removeEventListener(AI_BILLING_UPDATED_EVENT, onAiCall);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return { status, refresh };
};
