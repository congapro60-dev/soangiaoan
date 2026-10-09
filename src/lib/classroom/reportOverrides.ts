/**
 * Bản chỉnh tay của giáo viên trên báo cáo phụ huynh: sửa bất kì chữ hoặc số nào mà không đụng vào dữ liệu gốc
 * (điểm bài, Sổ điểm, thống kê lớp). Chỉ ghi những chỗ thầy cô đã sửa; chỗ khác vẫn tự tính lại như cũ.
 * Lưu theo từng học sinh + kì; cổng phụ huynh áp bản chỉnh này lên báo cáo đã công bố mỗi lần phụ huynh mở.
 * Module thuần — máy chủ (api/) và trình duyệt dùng chung.
 */
import type { ParentCompetencyItem, ParentReportPrintInput } from './parentReportTypes.js';
import type { ExamMark } from './examScores.js';
import type { Hs1Mark } from './scoreBook.js';
import { sanitizeRequirementLines, type ParentRequirementLine } from './parentRequirements.js';

/** Một bài trong "Kết quả theo bài": chỉ ghi những ô đã sửa; `hidden` = ẩn khỏi báo cáo. */
export interface ResultOverride {
  id: string;
  title?: string;
  score?: number | null;
  maxScore?: number | null;
  hidden?: boolean;
}

export interface ReportOverrides {
  studentName?: string;
  className?: string;
  overallSummary?: string;
  strengths?: string[];
  areasToPractice?: string[];
  parentActions?: string[];
  teacherActions?: string[];
  officialCount?: number;
  pendingCount?: number;
  missingCount?: number;
  /** null = báo cáo ghi "chưa đủ bài để tính điểm trung bình". */
  officialAveragePercent?: number | null;
  results?: ResultOverride[];
  moet?: ExamMark[];
  tds?: ExamMark[];
  hs1?: Hs1Mark[];
  competencyItems?: ParentCompetencyItem[];
  teacherComment?: string;
  requirements?: ParentRequirementLine[];
}

const MAX_TEXT = 3000;
const MAX_LINE = 600;
const MAX_LIST = 30;
const MAX_ROWS = 200;
const LEVELS = ['Xuất sắc', 'Tốt', 'Đạt yêu cầu', 'Chưa đạt yêu cầu'];

const text = (value: unknown, max: number): string | undefined => (typeof value === 'string' ? value.trim().slice(0, max) : undefined);
const count = (value: unknown): number | undefined => (typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100000, Math.round(value))) : undefined);
const score = (value: unknown): number | undefined => (typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100000, Math.round(value * 100) / 100)) : undefined);
const lines = (value: unknown): string[] | undefined => (Array.isArray(value)
  ? value.flatMap(item => { const line = text(item, MAX_LINE); return line ? [line] : []; }).slice(0, MAX_LIST)
  : undefined);
const rows = (value: unknown): Record<string, unknown>[] | undefined => (Array.isArray(value)
  ? value.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object').slice(0, MAX_ROWS)
  : undefined);

/** Làm sạch bản chỉnh nhận từ máy khách: chỉ giữ trường biết, đúng kiểu, đúng cỡ. */
export const sanitizeReportOverrides = (raw: unknown, grade: string | number): ReportOverrides => {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: ReportOverrides = {};
  const set = <K extends keyof ReportOverrides>(key: K, value: ReportOverrides[K] | undefined) => { if (value !== undefined) out[key] = value; };
  set('studentName', text(source.studentName, 120) || undefined);
  set('className', text(source.className, 120) || undefined);
  set('overallSummary', text(source.overallSummary, MAX_TEXT));
  set('strengths', lines(source.strengths));
  set('areasToPractice', lines(source.areasToPractice));
  set('parentActions', lines(source.parentActions));
  set('teacherActions', lines(source.teacherActions));
  set('officialCount', count(source.officialCount));
  set('pendingCount', count(source.pendingCount));
  set('missingCount', count(source.missingCount));
  if (source.officialAveragePercent === null) out.officialAveragePercent = null;
  else set('officialAveragePercent', score(source.officialAveragePercent));
  const results = rows(source.results)?.flatMap(row => {
    const id = text(row.id, 200);
    if (!id) return [];
    const item: ResultOverride = { id };
    const title = text(row.title, 200);
    if (title) item.title = title;
    for (const key of ['score', 'maxScore'] as const) {
      if (row[key] === null) item[key] = null;
      else { const value = score(row[key]); if (value !== undefined) item[key] = value; }
    }
    if (row.hidden === true) item.hidden = true;
    return Object.keys(item).length > 1 ? [item] : [];
  });
  set('results', results);
  const marks = (value: unknown): ExamMark[] | undefined => rows(value)?.flatMap(row => {
    const label = text(row.label, 100);
    const value2 = score(row.score);
    if (!label || value2 === undefined) return [];
    const letter = text(row.letter, 10);
    return [{ label, score: value2, ...(letter ? { letter } : {}) }];
  });
  set('moet', marks(source.moet));
  set('tds', marks(source.tds));
  set('hs1', rows(source.hs1)?.flatMap(row => {
    const label = text(row.label, 100);
    const value = score(row.score);
    return label && value !== undefined ? [{ label, date: text(row.date, 10) ?? '', score: value }] : [];
  }));
  set('competencyItems', rows(source.competencyItems)?.flatMap(row => {
    const topic = text(row.topic, 200);
    const level = LEVELS.includes(String(row.level)) ? String(row.level) as ParentCompetencyItem['level'] : null;
    return topic && level ? [{ area: text(row.area, 100) ?? '', topic, level }] : [];
  }));
  set('teacherComment', text(source.teacherComment, MAX_TEXT));
  if (Array.isArray(source.requirements)) out.requirements = sanitizeRequirementLines(String(grade), source.requirements);
  return out;
};

const hasOwn = (overrides: ReportOverrides, key: keyof ReportOverrides) => overrides[key] !== undefined;

/** Áp bản chỉnh lên dữ liệu báo cáo. Không có bản chỉnh thì trả nguyên dữ liệu gốc. Không sửa đối tượng đầu vào. */
export const applyReportOverrides = (input: ParentReportPrintInput, overrides: ReportOverrides | null | undefined): ParentReportPrintInput => {
  if (!overrides || Object.keys(overrides).length === 0) return input;
  const report = { ...input.report };
  for (const key of ['overallSummary', 'strengths', 'areasToPractice', 'parentActions', 'teacherActions', 'officialCount', 'pendingCount', 'missingCount', 'officialAveragePercent'] as const) {
    if (hasOwn(overrides, key)) (report as Record<string, unknown>)[key] = overrides[key];
  }
  if (overrides.studentName) report.studentName = overrides.studentName;
  if (overrides.className) report.className = overrides.className;
  if (overrides.results) {
    const byId = new Map(overrides.results.map(item => [item.id, item]));
    report.results = report.results.flatMap(result => {
      const edit = byId.get(result.assignmentId);
      if (!edit) return [result];
      if (edit.hidden) return [];
      return [{
        ...result,
        ...(edit.title ? { title: edit.title } : {}),
        ...(edit.score !== undefined ? { score: edit.score } : {}),
        ...(edit.maxScore !== undefined ? { maxScore: edit.maxScore } : {}),
      }];
    });
  }
  const next: ParentReportPrintInput = { ...input, report };
  if (overrides.studentName) next.studentName = overrides.studentName;
  if (overrides.className) next.className = overrides.className;
  if (overrides.moet || overrides.tds) next.exams = { moet: overrides.moet ?? input.exams?.moet ?? [], tds: overrides.tds ?? input.exams?.tds ?? [] };
  if (overrides.hs1) next.hs1 = overrides.hs1;
  if (overrides.competencyItems && input.competency) next.competency = { ...input.competency, items: overrides.competencyItems };
  if (overrides.teacherComment !== undefined) next.teacherComment = overrides.teacherComment;
  if (overrides.requirements) next.requirements = overrides.requirements.length > 0 ? overrides.requirements : null;
  return next;
};

/** Các trường thầy cô đã chỉnh tay (để hiện dấu ở bản giáo viên). */
export const overriddenKeys = (overrides: ReportOverrides | null | undefined): Set<keyof ReportOverrides> =>
  new Set((Object.keys(overrides ?? {}) as (keyof ReportOverrides)[]).filter(key => overrides![key] !== undefined));
