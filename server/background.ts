import { AsyncLocalStorage } from 'node:async_hooks';
import type { Response } from 'express';

/**
 * `waitUntil` kiểu Vercel cho Cloud Run (lỗi thật 18/11). Bot chấm bài và báo GV/PH bằng `chayNgam`
 * SAU khi trả lời webhook. Vercel giữ CPU cho các việc đó; Cloud Run thì hạ CPU gần 0 ngay khi
 * phản hồi xong, nên lượt chấm treo ở bước tải ảnh và báo "Chưa tải đủ ảnh". Với route bật
 * `holdBackground`, phản hồi HTTP chỉ thực sự gửi khi mọi việc nền đã xong (tối đa BACKGROUND_CAP_MS).
 * Tin nhắn cho HS/PH đi qua API gửi tin của Zalo, nên người dùng không phải chờ; Zalo gửi lại
 * webhook chậm cũng không sao vì bot đã chặn trùng theo message_id.
 */
export const BACKGROUND_CAP_MS = 280_000;
const backgroundWork = new AsyncLocalStorage<{ waitUntil: (work: Promise<unknown>) => void }>();
(globalThis as Record<symbol, unknown>)[Symbol.for('@vercel/request-context')] = { get: () => backgroundWork.getStore() };

/** Chạy handler, giữ `res.end` lại tới khi các việc `waitUntil` (kể cả việc sinh thêm) xong hoặc hết hạn. */
export const runHoldingBackground = async (res: Response, run: () => Promise<unknown>, capMs = BACKGROUND_CAP_MS): Promise<void> => {
  const tracked: Promise<unknown>[] = [];
  const realEnd = res.end.bind(res) as (...args: unknown[]) => Response;
  let deferred: unknown[] | null = null;
  (res as unknown as { end: (...args: unknown[]) => Response }).end = (...args: unknown[]) => { deferred ??= args; return res; };
  try {
    await backgroundWork.run({ waitUntil: work => { tracked.push(work.catch(() => undefined)); } }, run);
    const deadline = Date.now() + capMs;
    for (let done = 0; done < tracked.length && Date.now() < deadline;) {
      const batch = tracked.slice(done);
      done = tracked.length;
      const timer = new Promise(resolve => setTimeout(resolve, Math.max(0, deadline - Date.now())).unref());
      await Promise.race([Promise.allSettled(batch), timer]);
    }
    if (tracked.length && Date.now() >= deadline) console.error(`[server] việc nền quá ${capMs / 1000}s, trả phản hồi trước`);
  } finally {
    (res as unknown as { end: unknown }).end = realEnd;
    if (deferred) realEnd(...deferred);
  }
};

