/**
 * Số liệu "hôm nay" cho chip Ví AI ở Header và popup chi tiết — thuần, không gọi mạng.
 * Chip nằm trong bundle đầu nên KHÔNG import `statementPrintDoc` (kéo theo bộ xuất PDF); `formatVnd` viết lại ở đây.
 */
import type { AiKeyStatus, StatementItem } from './aiBillingApi';
import type { TokenUsageSnapshot } from '../../hooks/useTokenTracker';

/** Số dư dưới mức này thì chip đổi sang màu cảnh báo (chưa hết nhưng sắp hết). */
export const LOW_BALANCE_VND = 10_000;

export const formatVnd = (value: number): string => `${Math.round(value).toLocaleString('vi-VN')}đ`;

const VN_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

/** Ngày giờ Việt Nam (YYYY-MM-DD) của một mốc ISO; mốc hỏng trả chuỗi rỗng. */
export const vnDayOf = (iso: string): string => {
  const time = new Date(iso);
  return Number.isNaN(time.getTime()) ? '' : VN_DAY.format(time);
};

export type ChipTone = 'ok' | 'low' | 'empty' | 'info';

export interface ChipView {
  /** Dòng chính: "Ví 48.200đ" hoặc trạng thái không trừ ví. */
  wallet: string;
  /** Dòng phụ: "hôm nay −1.300đ". */
  today: string;
  tone: ChipTone;
}

/**
 * Chip hiện TIỀN, không hiện token: giá mỗi model đổi theo ngày và tỷ giá nên "số dư token" không có nghĩa rõ ràng.
 * Khi web chưa bật tính phí hoặc tài khoản được miễn thì "hôm nay" là giá gốc THAM KHẢO (dấu ~), không bị trừ ví.
 */
export const chipView = (status: AiKeyStatus): ChipView => {
  if (!status.gateEnabled) return { wallet: 'Chưa tính phí', today: `hôm nay ~${formatVnd(status.todayVnd)}`, tone: 'info' };
  if (status.exempt) return { wallet: 'Không trừ ví', today: `hôm nay ~${formatVnd(status.todayVnd)}`, tone: 'info' };
  const balance = Math.round(status.balanceVnd);
  // Có khoá riêng đang dùng được thì khoá riêng chạy trước; ví hết chỉ là dự phòng nên không báo động đỏ.
  const ownKeyWorks = status.hasKey && status.keyStatus === 'ok';
  const tone: ChipTone = ownKeyWorks && balance < LOW_BALANCE_VND ? 'info' : balance <= 0 ? 'empty' : balance < LOW_BALANCE_VND ? 'low' : 'ok';
  return { wallet: `Ví ${formatVnd(Math.max(0, balance))}`, today: status.todayVnd > 0 ? `hôm nay −${formatVnd(status.todayVnd)}` : 'hôm nay 0đ', tone };
};

export interface DaySummary {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  chargeVnd: number;
}

/** Lượt của đúng ngày `day` (giờ VN), mới nhất trước. */
export const itemsOfDay = (items: readonly StatementItem[], day: string): StatementItem[] =>
  items.filter(item => vnDayOf(item.at) === day).sort((a, b) => b.at.localeCompare(a.at));

/** Token "suy nghĩ" Google tính theo giá đầu ra nên gộp vào cột ra cho người đọc. */
export const summarizeDay = (items: readonly StatementItem[], day: string): DaySummary =>
  itemsOfDay(items, day).reduce<DaySummary>((sum, item) => ({
    calls: sum.calls + 1,
    inputTokens: sum.inputTokens + item.inputTokens,
    outputTokens: sum.outputTokens + item.outputTokens + item.thoughtsTokens,
    cachedTokens: sum.cachedTokens + item.cachedTokens,
    chargeVnd: sum.chargeVnd + item.chargeVnd,
  }), { calls: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0, chargeVnd: 0 });

export interface QuotaRow {
  provider: string;
  model: string;
  label: string;
  requests: number;
  tokens: number;
  /** Hạn mức lượt/ngày tham chiếu của model; null = không biết. */
  limit: number | null;
  /** % lượt còn lại trong ngày so với hạn mức tham chiếu; null khi không có hạn mức. */
  remainingPct: number | null;
}

/** Thanh "còn lại" kiểu 9Router cho khoá riêng: Google không trả số dư nên so lượt đã gọi với hạn mức tham chiếu. */
export const quotaRow = (snapshot: TokenUsageSnapshot): QuotaRow => {
  const limit = snapshot.limit && snapshot.limit.rpd > 0 ? snapshot.limit.rpd : null;
  return {
    provider: snapshot.provider,
    model: snapshot.model,
    label: snapshot.limit?.displayName ?? snapshot.model,
    requests: snapshot.requestsToday,
    tokens: snapshot.tokensToday,
    limit,
    remainingPct: limit ? Math.max(0, Math.round((1 - snapshot.requestsToday / limit) * 100)) : null,
  };
};

/** Màu thanh theo phần còn lại — cùng ngưỡng cảm giác với Quota Tracker (xanh / vàng / đỏ). */
export const quotaTone = (remainingPct: number | null): 'ok' | 'warn' | 'danger' | 'none' =>
  remainingPct === null ? 'none' : remainingPct <= 15 ? 'danger' : remainingPct <= 40 ? 'warn' : 'ok';

export const formatCount = (value: number): string => Math.round(value).toLocaleString('vi-VN');
