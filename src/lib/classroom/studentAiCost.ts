/**
 * Chi phí AI của MỘT học sinh — để em thấy mỗi hoạt động của mình tốn bao nhiêu tiền của thầy cô (chủ dự án chốt 2026-10-01,
 * mục đích giáo dục "biết quý trọng đồng tiền"). Chỉ để HIỂN THỊ cho em: em không phải trả gì.
 *
 * Con số là GIÁ GỐC theo bảng giá niêm yết (`aiPricing.ts`) × tỷ giá, tính từ số token của từng lượt — không phải số tiền thật bị
 * trừ ví của thầy cô (có thể được giảm giá, dùng khoá riêng hoặc miễn trừ), để em luôn thấy cùng một thước đo.
 */
import { costUsdOfCall, costUsdOfImage } from '../admin/aiPricing.js';

/** Một lượt AI đã ghi (`aiUsage`) — chỉ các trường cần để quy tiền. */
export interface StudentAiCostRow {
  id: string;
  at: string;
  day: string;
  model: string;
  feature: string;
  inputTokens: number;
  outputTokens: number;
  thoughtsTokens: number;
  cachedTokens: number;
  images?: number;
  /** Tỷ giá lúc dùng nếu lượt đó đã ghi (lượt tính ví); vắng thì dùng tỷ giá hiện tại. */
  usdVnd?: number;
  assignmentId?: string;
}

export interface StudentAiCostItem {
  id: string;
  at: string;
  label: string;
  inputTokens: number;
  outputTokens: number;
  tokens: number;
  vnd: number;
  /** Tên bài tập (nếu lượt đó gắn với một bài giao); máy chủ điền sau. */
  assignmentTitle?: string;
  assignmentId?: string;
}

export interface StudentAiCostTotals {
  calls: number;
  tokens: number;
  vnd: number;
}

export interface StudentAiCostView {
  /** Ngày (giờ VN, YYYY-MM-DD) của số "hôm nay". */
  today: string;
  totals: { today: StudentAiCostTotals; week: StudentAiCostTotals; all: StudentAiCostTotals };
  /** Mới nhất trước. */
  recent: StudentAiCostItem[];
  /** Có nhiều lượt hơn mức máy chủ đọc (số "tất cả" chỉ tính phần đã đọc). */
  truncated: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
  autoGrade: 'AI chấm bài nộp',
  gradeOne: 'AI chấm bài nộp',
  gradeAssignment: 'AI chấm bài nộp',
  practice: 'AI soạn bài luyện thêm cho em',
  submitPractice: 'AI chấm bài luyện thêm',
  rewriteFeedback: 'AI viết lại nhận xét',
  generateImage: 'AI vẽ hình minh hoạ',
};

/** Tên hoạt động bằng tiếng Việt cho em đọc; hoạt động lạ thì gọi chung là hỗ trợ học tập. */
export const studentAiFeatureLabel = (feature: string): string => FEATURE_LABELS[feature] ?? 'AI hỗ trợ học tập';

const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0);

/** Giá gốc VNĐ của một lượt (làm tròn đồng). Model chưa có trong bảng giá → 0 (không đoán). */
export const rowCostVnd = (row: StudentAiCostRow, currentUsdVnd: number): number => {
  const rate = row.usdVnd && row.usdVnd > 1000 ? row.usdVnd : currentUsdVnd;
  const images = num(row.images);
  const usd = images > 0
    ? costUsdOfImage(row.model, row.day, images)
    : costUsdOfCall(row.model, row.day, {
      inputTokens: num(row.inputTokens),
      outputTokens: num(row.outputTokens),
      thoughtsTokens: num(row.thoughtsTokens),
      cachedTokens: num(row.cachedTokens),
    });
  return Math.round((usd ?? 0) * rate);
};

/** Ngày (YYYY-MM-DD) lùi `days` ngày so với `day`, tính trên lịch thuần (không lệch múi giờ). */
const shiftDay = (day: string, days: number): string => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10);
};

const add = (totals: StudentAiCostTotals, item: StudentAiCostItem): void => {
  totals.calls += 1;
  totals.tokens += item.tokens;
  totals.vnd += item.vnd;
};

/** Gom các lượt của một em thành tổng hôm nay / 7 ngày / tất cả + danh sách gần đây (tối đa `recentLimit`). */
export const summarizeStudentAiCost = (
  rows: readonly StudentAiCostRow[],
  today: string,
  currentUsdVnd: number,
  options: { recentLimit?: number; truncated?: boolean } = {},
): StudentAiCostView => {
  const weekStart = shiftDay(today, 6);
  const totals = {
    today: { calls: 0, tokens: 0, vnd: 0 },
    week: { calls: 0, tokens: 0, vnd: 0 },
    all: { calls: 0, tokens: 0, vnd: 0 },
  };
  const items = rows.map((row): { item: StudentAiCostItem; day: string } => {
    const inputTokens = num(row.inputTokens);
    const outputTokens = num(row.outputTokens) + num(row.thoughtsTokens);
    return {
      day: row.day,
      item: {
        id: row.id,
        at: row.at,
        label: studentAiFeatureLabel(row.feature),
        inputTokens,
        outputTokens,
        tokens: inputTokens + outputTokens,
        vnd: rowCostVnd(row, currentUsdVnd),
        ...(row.assignmentId ? { assignmentId: row.assignmentId } : {}),
      },
    };
  });
  for (const { item, day } of items) {
    add(totals.all, item);
    if (day >= weekStart && day <= today) add(totals.week, item);
    if (day === today) add(totals.today, item);
  }
  const recent = items
    .map(entry => entry.item)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, options.recentLimit ?? 30);
  return { today, totals, recent, truncated: options.truncated === true };
};

/** "1.250đ"; dưới 1đ ghi "<1đ" để lượt rất nhỏ không bị hiểu thành miễn phí. */
export const formatStudentVnd = (vnd: number, hasUsage = true): string => {
  if (vnd <= 0) return hasUsage ? '<1đ' : '0đ';
  return `${Math.round(vnd).toLocaleString('vi-VN')}đ`;
};
