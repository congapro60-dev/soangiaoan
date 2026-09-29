/**
 * BÁO CÁO PHỤ HUYNH THEO KÌ — thuần, dùng chung giao diện + bản in.
 *
 * Chủ dự án chốt (2026-09-29): báo cáo tháng / giữa kì I / cuối kì I / giữa kì II / cuối kì II / cả năm.
 * Mốc thời gian CHỌN TAY mỗi lần xuất (web dùng cho nhiều trường, không gán cứng lịch năm học) — khoảng
 * mặc định dưới đây chỉ để điền sẵn. Điểm thi định kì hiện mọi cột (không phân kì) nên KHÔNG tính ĐTB môn.
 */
import type { SubmissionDoc } from './types.js';
import type { Hs1Mark } from './scoreBook.js';
import type { ParentSafeAssignmentResult } from './parentSafeReport.js';

import { REPORT_KINDS, type ReportKind } from './reportKinds.js';

export { REPORT_KINDS, type ReportKind };

export interface ReportPeriod {
  kind: ReportKind;
  /** YYYY-MM-DD, gồm cả hai đầu (giờ Việt Nam). */
  from: string;
  to: string;
  /** Chỉ báo cáo cả năm: ngày bắt đầu học kì II, để so sánh hai kì. */
  hk2From?: string;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const VN_TZ = 'Asia/Ho_Chi_Minh';

/** Ngày theo giờ Việt Nam (YYYY-MM-DD) của một mốc ISO; hỏng thì ''. */
export const vnDay = (iso?: string): string => {
  const ms = Date.parse(String(iso || ''));
  if (!Number.isFinite(ms)) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: VN_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
};

const pad = (n: number) => String(n).padStart(2, '0');
const lastDayOfMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
export const dmy = (day: string): string => (DAY_RE.test(day) ? day.split('-').reverse().join('/') : day);
const addDays = (day: string, n: number): string => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Năm bắt đầu năm học: từ tháng 8 tính là năm học mới. */
export const schoolYearStart = (today: string): number => {
  const [y, m] = today.split('-').map(Number);
  return m >= 8 ? y : y - 1;
};

/** Khoảng điền sẵn khi chọn loại báo cáo — giáo viên sửa theo lịch trường mình. */
export const defaultPeriod = (kind: ReportKind, today: string, month?: string): ReportPeriod => {
  const sy = schoolYearStart(today);
  if (kind === 'month') {
    const [y, m] = (month && /^\d{4}-\d{2}$/.test(month) ? month : today.slice(0, 7)).split('-').map(Number);
    return { kind, from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(lastDayOfMonth(y, m))}` };
  }
  const ranges: Record<Exclude<ReportKind, 'month'>, [string, string]> = {
    gk1: [`${sy}-09-01`, `${sy}-10-31`],
    ck1: [`${sy}-09-01`, `${sy + 1}-01-15`],
    gk2: [`${sy + 1}-01-16`, `${sy + 1}-03-15`],
    ck2: [`${sy + 1}-01-16`, `${sy + 1}-05-31`],
    year: [`${sy}-09-01`, `${sy + 1}-05-31`],
  };
  const [from, to] = ranges[kind];
  return { kind, from, to, ...(kind === 'year' ? { hk2From: `${sy + 1}-01-16` } : {}) };
};

export const periodError = (p: ReportPeriod): string | null => {
  if (!DAY_RE.test(p.from) || !DAY_RE.test(p.to)) return 'Chọn đủ ngày bắt đầu và ngày kết thúc.';
  if (p.from > p.to) return 'Ngày bắt đầu phải trước ngày kết thúc.';
  if (p.kind === 'year' && p.hk2From && (!DAY_RE.test(p.hk2From) || p.hk2From <= p.from || p.hk2From > p.to)) {
    return 'Ngày bắt đầu học kì II phải nằm trong năm học.';
  }
  return null;
};

export const reportTitle = (p: ReportPeriod): string => {
  if (p.kind === 'month') {
    const [y, m] = p.from.split('-');
    return `Báo cáo học tập tháng ${Number(m)}/${y}`;
  }
  const sy = schoolYearStart(p.from);
  const name = REPORT_KINDS.find(item => item.kind === p.kind)?.label ?? '';
  return `Báo cáo ${name.charAt(0).toLowerCase()}${name.slice(1)} — năm học ${sy}–${sy + 1}`;
};

export const rangeLabel = (p: ReportPeriod): string => `Từ ${dmy(p.from)} đến ${dmy(p.to)}`;

const inRange = (day: string, from: string, to: string) => day !== '' && day >= from && day <= to;

interface DatedAssignment {
  id: string;
  dueAt?: string;
  createdAt?: string;
}

/**
 * Dữ liệu thuộc khoảng báo cáo: bài giao có hạn nộp (hoặc ngày giao) trong khoảng, bài nộp của các bài đó
 * nộp tới hết ngày cuối khoảng, bài tự nộp trong khoảng, điểm hệ số 1 có ngày kiểm tra trong khoảng.
 */
export const filterForPeriod = <A extends DatedAssignment>(
  period: ReportPeriod,
  data: { assignments: readonly A[]; submissions: readonly SubmissionDoc[]; hs1?: readonly Hs1Mark[] },
): { assignments: A[]; submissions: SubmissionDoc[]; hs1: Hs1Mark[] } => {
  const assignments = data.assignments.filter(a => inRange(vnDay(a.dueAt || a.createdAt), period.from, period.to));
  const ids = new Set(assignments.map(a => a.id));
  const submissions = data.submissions.filter(s => {
    const day = vnDay(s.createdAt);
    return s.assignmentId ? ids.has(s.assignmentId) && day !== '' && day <= period.to : inRange(day, period.from, period.to);
  });
  const hs1 = (data.hs1 ?? []).filter(mark => inRange(mark.date, period.from, period.to));
  return { assignments, submissions, hs1 };
};

export interface MonthPoint {
  month: string;
  label: string;
  avgPercent: number;
  count: number;
}

const officialPercents = (results: readonly ParentSafeAssignmentResult[]) => results
  .filter(r => r.status === 'official' && r.score !== null && r.maxScore !== null && r.maxScore > 0)
  .map(r => ({ day: vnDay(r.submittedAt), percent: (r.score as number) / (r.maxScore as number) * 100 }))
  .filter(item => item.day !== '');

/** Điểm trung bình (%) các bài chính thức theo từng tháng — cho biểu đồ báo cáo kì/năm. */
export const monthlyAverages = (results: readonly ParentSafeAssignmentResult[]): MonthPoint[] => {
  const byMonth = new Map<string, number[]>();
  for (const item of officialPercents(results)) {
    const key = item.day.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), item.percent]);
  }
  return [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, values]) => ({
    month,
    label: `T${Number(month.slice(5))}`,
    avgPercent: values.reduce((sum, v) => sum + v, 0) / values.length,
    count: values.length,
  }));
};

export interface ComparisonSide {
  label: string;
  avgPercent: number | null;
  count: number;
}

export interface PeriodComparison {
  before: ComparisonSide;
  after: ComparisonSide;
}

const side = (label: string, results: readonly ParentSafeAssignmentResult[], from: string, to: string): ComparisonSide => {
  const values = officialPercents(results).filter(item => inRange(item.day, from, to)).map(item => item.percent);
  return { label, avgPercent: values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null, count: values.length };
};

/**
 * So sánh để phụ huynh thấy con tiến hay lùi — tính trên kết quả CẢ NĂM (chưa lọc khoảng):
 * tháng → tháng trước; giữa/cuối kì → nửa đầu với nửa sau của khoảng; cả năm → học kì I với học kì II.
 */
export const periodComparison = (period: ReportPeriod, allResults: readonly ParentSafeAssignmentResult[]): PeriodComparison | null => {
  let before: ComparisonSide;
  let after: ComparisonSide;
  if (period.kind === 'month') {
    const prevTo = addDays(period.from, -1);
    const prevFrom = `${prevTo.slice(0, 7)}-01`;
    before = side(`Tháng ${Number(prevFrom.slice(5, 7))}/${prevFrom.slice(0, 4)}`, allResults, prevFrom, prevTo);
    after = side(`Tháng ${Number(period.from.slice(5, 7))}/${period.from.slice(0, 4)}`, allResults, period.from, period.to);
  } else if (period.kind === 'year' && period.hk2From) {
    before = side('Học kì I', allResults, period.from, addDays(period.hk2From, -1));
    after = side('Học kì II', allResults, period.hk2From, period.to);
  } else {
    const days = Math.round((Date.parse(`${period.to}T00:00:00Z`) - Date.parse(`${period.from}T00:00:00Z`)) / 86_400_000);
    const mid = addDays(period.from, Math.floor(days / 2));
    before = side(`Nửa đầu (${dmy(period.from)}–${dmy(mid)})`, allResults, period.from, mid);
    after = side(`Nửa sau (${dmy(addDays(mid, 1))}–${dmy(period.to)})`, allResults, addDays(mid, 1), period.to);
  }
  return before.count === 0 && after.count === 0 ? null : { before, after };
};
