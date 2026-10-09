/**
 * DANH SÁCH NHIỀU KHOÁ GEMINI của chủ dự án — phần thuần, dùng chung máy chủ + giao diện.
 *
 * Mỗi khoá gắn một hạng: `free` (dự án Google chưa gắn thanh toán, có hạn mức miễn phí) hoặc `paid`.
 * Khoá chung được chọn theo thứ tự: free → paid → khoá ở biến môi trường (luôn là chốt cuối). Khoá bị Google báo
 * hết hạn mức thì nghỉ (theo từng model) rồi tự quay lại; khoá hỏng thì bị loại cho tới khi quản trị bật lại.
 * Danh sách chỉ thay NGUỒN khoá chung; ai bị trừ ví bao nhiêu vẫn tính theo giá gốc như cũ (xem `_ai-usage.ts`).
 */

export type PoolKeyTier = 'free' | 'paid';
export type PoolKeyStatus = 'ok' | 'exhausted' | 'invalid';

export interface PoolKey {
  id: string;
  label: string;
  key: string;
  tier: PoolKeyTier;
  enabled: boolean;
  status?: PoolKeyStatus;
  statusAt?: string;
  statusMessage?: string;
  /** model → mốc ISO được dùng lại. Nghỉ theo model vì có model không có hạn mức miễn phí mà model khác vẫn có. */
  cooldowns?: Record<string, string>;
}

export const POOL_MAX_KEYS = 30;
/** Một lượt gọi thử tối đa chừng này khoá trong danh sách trước khi lùi về khoá môi trường. */
export const POOL_MAX_TRIES_PER_CALL = 6;

const MINUTE = 60 * 1000;
export const COOLDOWN_UNKNOWN_MS = 90 * 1000;
export const COOLDOWN_NO_FREE_TIER_MS = 24 * 60 * MINUTE;
const COOLDOWN_MAX_RETRY_MS = 15 * MINUTE;

/** Hạn mức ngày của Google đặt lại lúc nửa đêm giờ Thái Bình Dương (07:00–08:00 UTC): nghỉ tới 08:00 UTC kế tiếp cho chắc. */
const nextDailyReset = (now: number): number => {
  const d = new Date(now);
  const reset = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 8, 0, 0);
  return reset > now ? reset : reset + 24 * 60 * MINUTE;
};

/**
 * Nghỉ bao lâu sau khi Google trả 429/403 vì hạn mức. Đọc thân lỗi: "limit: 0" = model này không có hạn mức miễn phí
 * ở khoá này (nghỉ 24 giờ), hạn mức NGÀY = nghỉ tới lần đặt lại kế tiếp, còn lại (theo phút / không rõ) nghỉ ngắn —
 * có `retryDelay` thì dùng nó (tối đa 15 phút).
 */
export const cooldownMsFor = (detail: string, now: number): number => {
  const text = String(detail || '');
  if (/limit:\s*0\b/i.test(text)) return COOLDOWN_NO_FREE_TIER_MS;
  if (/PerDay/i.test(text)) return nextDailyReset(now) - now;
  const retry = text.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i);
  if (retry) return Math.min(Math.max(Math.ceil(Number(retry[1]) * 1000), 5_000), COOLDOWN_MAX_RETRY_MS);
  return COOLDOWN_UNKNOWN_MS;
};

export const isCooling = (key: PoolKey, model: string, now: number): boolean => {
  const until = Date.parse(key.cooldowns?.[model] || '');
  return Number.isFinite(until) && until > now;
};

/**
 * Khoá kế tiếp để gọi `model`: đang bật, chưa hỏng, không đang nghỉ, chưa thử trong lượt này. Hạng free đi trước paid;
 * cùng hạng thì xoay vòng theo `rotation` để dàn đều tải (không ghi gì mỗi lượt gọi).
 */
export const pickPoolKey = (keys: readonly PoolKey[], model: string, now: number, tried: ReadonlySet<string>, rotation: number): PoolKey | null => {
  const usable = keys.filter(k => k.enabled && k.status !== 'invalid' && !tried.has(k.id) && !isCooling(k, model, now));
  for (const tier of ['free', 'paid'] as const) {
    const group = usable.filter(k => k.tier === tier);
    if (group.length > 0) return group[Math.abs(rotation) % group.length];
  }
  return null;
};

/** Dạng gọn gửi lên giao diện quản trị: KHÔNG bao giờ kèm khoá thật, chỉ 4 ký tự cuối. */
export interface PoolKeyView {
  id: string;
  label: string;
  last4: string;
  tier: PoolKeyTier;
  enabled: boolean;
  status: PoolKeyStatus;
  statusAt?: string;
  statusMessage?: string;
  /** model → mốc ISO còn hiệu lực (đã lọc các mốc đã qua). */
  cooldowns: Record<string, string>;
}

export const toPoolKeyView = (key: PoolKey, now: number): PoolKeyView => ({
  id: key.id,
  label: key.label,
  last4: key.key.slice(-4),
  tier: key.tier,
  enabled: key.enabled,
  status: key.status ?? 'ok',
  ...(key.statusAt ? { statusAt: key.statusAt } : {}),
  ...(key.statusMessage ? { statusMessage: key.statusMessage } : {}),
  cooldowns: Object.fromEntries(Object.entries(key.cooldowns ?? {}).filter(([, until]) => Date.parse(until) > now)),
});

/** Đọc lại danh sách từ Firestore: chỉ giữ mục hợp lệ, cắt độ dài, không cho trùng mã hoặc trùng khoá. */
export const sanitizePool = (raw: unknown): PoolKey[] => {
  const list = Array.isArray(raw) ? raw : [];
  const seenId = new Set<string>();
  const seenKey = new Set<string>();
  const out: PoolKey[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const v = item as Record<string, unknown>;
    const id = typeof v.id === 'string' ? v.id : '';
    const key = typeof v.key === 'string' ? v.key.trim() : '';
    if (!id || !key || seenId.has(id) || seenKey.has(key)) continue;
    seenId.add(id);
    seenKey.add(key);
    const cooldowns: Record<string, string> = {};
    if (v.cooldowns && typeof v.cooldowns === 'object') {
      for (const [model, until] of Object.entries(v.cooldowns as Record<string, unknown>).slice(0, 10)) {
        if (typeof until === 'string') cooldowns[model.slice(0, 80)] = until;
      }
    }
    out.push({
      id,
      label: typeof v.label === 'string' ? v.label.slice(0, 60) : '',
      key,
      tier: v.tier === 'paid' ? 'paid' : 'free',
      enabled: v.enabled !== false,
      ...(v.status === 'exhausted' || v.status === 'invalid' ? { status: v.status } : {}),
      ...(typeof v.statusAt === 'string' ? { statusAt: v.statusAt } : {}),
      ...(typeof v.statusMessage === 'string' ? { statusMessage: v.statusMessage.slice(0, 300) } : {}),
      ...(Object.keys(cooldowns).length > 0 ? { cooldowns } : {}),
    });
    if (out.length >= POOL_MAX_KEYS) break;
  }
  return out;
};
