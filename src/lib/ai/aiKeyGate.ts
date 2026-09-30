/**
 * CỔNG KHOÁ AI phía giao diện giáo viên.
 *
 * Máy chủ trả 402 `{ code: 'AI_KEY_REQUIRED', reason }` khi khoá riêng hết / chưa có, hết số dư, chạm trần…
 * Thay vì sửa từng nơi gọi API, lớp này bọc `fetch` của trang giáo viên: gặp 402 đó thì mở hộp chọn (nạp tiền,
 * nhập mã giảm giá, nhập khoá, đồng ý dùng khoá chung); giáo viên xử lý xong → TỰ GỬI LẠI đúng yêu cầu cũ,
 * không phải bấm lại. Huỷ → trả nguyên phản hồi 402 để nơi gọi hiện lỗi như thường.
 */
import type { AiKeyBlockReason } from '../admin/aiKeyPolicy';

type Resolver = (reason: AiKeyBlockReason) => Promise<boolean>;

let resolver: Resolver | null = null;
let pending: Promise<boolean> | null = null;
let installed = false;

const GATED_PATHS = ['/api/grade-homework', '/api/classroom', '/api/generate-simulation'];

/** Phát sau mỗi phản hồi của ba đường AI — chip Ví AI ở Header nghe để làm mới số dư. */
export const AI_BILLING_UPDATED_EVENT = 'ai-billing-updated';

/** Header đánh dấu lượt ĐỌC số liệu ví: không coi là lượt dùng AI (nếu không chip sẽ tự làm mới chính nó mãi). */
export const AI_QUIET_HEADER = 'X-Ai-Quiet';

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

const isQuiet = (init?: RequestInit): boolean => {
  try { return new Headers(init?.headers).has(AI_QUIET_HEADER); } catch { return false; }
};

/** Hộp chọn đăng ký cách xử lý; trả `true` khi giáo viên đã xử lý xong và muốn thử lại. */
export const setAiKeyGateResolver = (next: Resolver | null): void => {
  resolver = next;
};

/** Nhiều yêu cầu cùng bị chặn một lúc thì chỉ mở MỘT hộp, mọi yêu cầu chờ chung kết quả. */
const resolveOnce = (reason: AiKeyBlockReason): Promise<boolean> => {
  if (!resolver) return Promise.resolve(false);
  pending ??= resolver(reason).finally(() => { pending = null; });
  return pending;
};

export const installAiKeyFetchGate = (): void => {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await original(input, init);
    const gated = GATED_PATHS.some(path => urlOf(input).includes(path));
    if (gated && !isQuiet(init)) window.dispatchEvent(new Event(AI_BILLING_UPDATED_EVENT));
    if (response.status !== 402 || !gated) return response;
    const data = await response.clone().json().catch(() => null) as { code?: string; reason?: AiKeyBlockReason } | null;
    if (data?.code !== 'AI_KEY_REQUIRED' || !data.reason) return response;
    const retry = await resolveOnce(data.reason);
    if (!retry) return response;
    const retried = await original(input, init);
    window.dispatchEvent(new Event(AI_BILLING_UPDATED_EVENT));
    return retried;
  };
};
