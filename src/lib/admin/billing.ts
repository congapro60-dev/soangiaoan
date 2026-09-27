/**
 * Lập BẢNG KÊ tiền AI theo giáo viên — thuần, dùng chung cho máy chủ (gom số) và giao diện (xuất CSV).
 *
 * Hai loại số, KHÔNG trộn lẫn:
 *  - ĐO THẬT: từ collection `aiUsage` (từ METERING_START_DAY) — token × giá niêm yết theo ngày.
 *  - ƯỚC TÍNH: giai đoạn trước bộ đếm — lấy TỔNG Google thực thu (chủ dự án nhập từ AI Studio) chia
 *    theo tỷ lệ số lượt AI chấm bài của từng giáo viên. Luôn hiện nhãn "ước tính".
 */
import { costUsdOfCall, type UsageTokens } from './aiPricing.js';

export interface UsageRecord extends UsageTokens {
  day: string;
  model: string;
  feature: string;
  uid: string | null;
  anonymous: boolean;
  refs: Record<string, string>;
  /** Nguồn khoá: 'own' = giáo viên tự trả Google → KHÔNG vào bảng kê. Vắng = khoá chung (lượt cũ). */
  keySource?: string;
  /** Giáo viên chịu khoá do máy chủ xác định lúc gọi — tin hơn suy từ mã tham chiếu. */
  keyOwnerUid?: string;
  /** Mã document + thời điểm — để hoá đơn dẫn tới đúng từng lượt (minh chứng). */
  id?: string;
  at?: string;
}

export interface OwnerMaps {
  submissionOwner: ReadonlyMap<string, string>;
  assignmentOwner: ReadonlyMap<string, string>;
  classOwner: ReadonlyMap<string, string>;
  /** uid ẩn danh của học sinh → giáo viên chủ lớp. */
  studentLinkOwner: ReadonlyMap<string, string>;
}

/**
 * Ai chịu tiền lượt này. Lượt của HỌC SINH (nộp bài được chấm) tính cho GIÁO VIÊN CHỦ LỚP.
 * Ưu tiên mã cụ thể nhất: bài nộp → bài giao → lớp → liên kết học sinh → chính người gọi (giáo viên).
 */
export const resolveBillTo = (record: Pick<UsageRecord, 'uid' | 'anonymous' | 'refs' | 'keyOwnerUid'>, maps: OwnerMaps): string | null => {
  if (record.keyOwnerUid) return record.keyOwnerUid;
  const { refs } = record;
  const fromRef = (refs.submissionId && maps.submissionOwner.get(refs.submissionId))
    || (refs.assignmentId && maps.assignmentOwner.get(refs.assignmentId))
    || (refs.classId && maps.classOwner.get(refs.classId));
  if (fromRef) return fromRef;
  if (record.uid && record.anonymous) return maps.studentLinkOwner.get(record.uid) ?? null;
  return record.uid && !record.anonymous ? record.uid : null;
};

export interface ModelUsage extends UsageTokens {
  calls: number;
  costUsd: number;
}

export interface TeacherUsage extends UsageTokens {
  /** uid giáo viên chịu tiền; 'unknown' khi không quy được về ai. */
  billTo: string;
  calls: number;
  costUsd: number;
  /** Lượt dùng model chưa có trong bảng giá — tiền của chúng CHƯA được tính. */
  unpricedCalls: number;
  byModel: Record<string, ModelUsage>;
}

const emptyTokens = (): UsageTokens => ({ inputTokens: 0, outputTokens: 0, thoughtsTokens: 0, cachedTokens: 0 });

const addTokens = (target: UsageTokens, source: UsageTokens) => {
  target.inputTokens += source.inputTokens;
  target.outputTokens += source.outputTokens;
  target.thoughtsTokens += source.thoughtsTokens;
  target.cachedTokens += source.cachedTokens;
};

/** Gom các lượt dùng thành từng dòng theo giáo viên chịu tiền, sắp tiền giảm dần. */
export const aggregateUsage = (records: readonly UsageRecord[], maps: OwnerMaps): TeacherUsage[] => {
  const byTeacher = new Map<string, TeacherUsage>();
  for (const record of records) {
    // Lượt chạy bằng khoá RIÊNG của giáo viên: họ đã tự trả Google, không thu lại.
    if (record.keySource === 'own') continue;
    const billTo = resolveBillTo(record, maps) ?? 'unknown';
    const row = byTeacher.get(billTo) ?? { billTo, calls: 0, costUsd: 0, unpricedCalls: 0, byModel: {}, ...emptyTokens() };
    const cost = costUsdOfCall(record.model, record.day, record);
    row.calls += 1;
    addTokens(row, record);
    if (cost === null) row.unpricedCalls += 1;
    else row.costUsd += cost;
    const model = row.byModel[record.model] ?? { calls: 0, costUsd: 0, ...emptyTokens() };
    model.calls += 1;
    addTokens(model, record);
    if (cost !== null) model.costUsd += cost;
    row.byModel[record.model] = model;
    byTeacher.set(billTo, row);
  }
  return [...byTeacher.values()].sort((a, b) => b.costUsd - a.costUsd);
};

/**
 * Chia một tổng tiền (VNĐ) theo tỷ lệ số lượt, làm tròn tới đồng mà TỔNG vẫn khớp đúng
 * (phương pháp phần dư lớn nhất). Không có lượt nào thì trả rỗng.
 */
export const allocateByCount = (totalVnd: number, counts: Readonly<Record<string, number>>): Record<string, number> => {
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  const sum = entries.reduce((acc, [, n]) => acc + n, 0);
  const total = Math.max(0, Math.round(totalVnd));
  if (sum === 0 || total === 0) return {};
  const raw = entries.map(([key, n]) => ({ key, exact: (total * n) / sum }));
  const result: Record<string, number> = {};
  let assigned = 0;
  for (const item of raw) {
    result[item.key] = Math.floor(item.exact);
    assigned += result[item.key];
  }
  raw.sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)));
  for (let i = 0; i < total - assigned; i += 1) result[raw[i % raw.length].key] += 1;
  return result;
};

export interface BillingLine {
  teacherLabel: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  measuredVnd: number;
  estimatedVnd: number;
}

const csvCell = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""')}"`;

/** Bảng kê CSV (mở được bằng Excel, có BOM cho tiếng Việt). */
export const buildBillingCsv = (lines: readonly BillingLine[], meta: { period: string; usdVnd: number; rateNote: string }): string => {
  const header = ['Giáo viên', 'Số lượt AI', 'Token vào', 'Token ra (+suy nghĩ)', 'USD (đo thật)', 'VNĐ (đo thật)', 'VNĐ ước tính trước bộ đếm', 'Tổng VNĐ'];
  const rows = lines.map(line => [
    line.teacherLabel, line.calls, line.inputTokens, line.outputTokens, line.costUsd.toFixed(4),
    line.measuredVnd, line.estimatedVnd, line.measuredVnd + line.estimatedVnd,
  ]);
  const total = lines.reduce((acc, line) => acc + line.measuredVnd + line.estimatedVnd, 0);
  const lead = [[`Bảng kê chi phí AI — ${meta.period}`], [`Tỷ giá: 1 USD = ${meta.usdVnd} VNĐ (${meta.rateNote})`], []];
  const tail = [[], ['Tổng cộng', '', '', '', '', '', '', total]];
  return '﻿' + [...lead, header, ...rows, ...tail].map(row => row.map(csvCell).join(',')).join('\r\n');
};
