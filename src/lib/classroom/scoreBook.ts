/**
 * SỔ ĐIỂM của lớp: điểm thi định kì (MOET + TDS, đồng bộ từ file điểm Google Sheet của lớp) và điểm
 * hệ số 1 giáo viên nhập trên lớp. Một document `scoreBooks/{classId}`, CHỈ máy chủ đọc/ghi — học sinh
 * nhận đúng phần của mình qua API. BTVN không chép vào đây: lấy thẳng từ bài đã duyệt.
 *
 * File này thuần (không Firestore) để cả máy chủ lẫn trình duyệt dùng chung phần kiểm dữ liệu.
 */
import { examLabelKey, type ExamMark, type PaperExamMark, type StudentExamScores } from './examScores.js';

export const SCORE_BOOKS_COL = 'scoreBooks';

/** Thang điểm hệ số 1 (thang 10). */
export const HS1_MAX = 10;
/** Điểm thi TDS có thể theo thang trường (không nhất thiết thang 10) — chặn số vô lý thôi. */
const EXAM_MAX = 100;
const LABEL_MAX = 80;
const MAX_HS1_COLUMNS = 60;

/** Hệ số của một cột điểm: HS1, HS2 hoặc HS3. */
export type Hs1Weight = 1 | 2 | 3;

/** Một cột điểm (vd "Kiểm tra 15 phút lần 1"): nhập tay, hoặc liên kết sống với một bài giao. */
export interface Hs1Column {
  id: string;
  label: string;
  /** Ngày kiểm tra dạng YYYY-MM-DD. */
  date: string;
  /** Hệ số khi tính điểm trung bình; cột cũ chưa có thì là 1. */
  weight: Hs1Weight;
  /** Có = điểm tự lấy từ bài nộp mới nhất của bài giao này; ô nhập tay (nếu có) đè lên. */
  assignmentId?: string;
}

/** Thống kê BTVN của một học sinh — tính lại mỗi lần đọc, không lưu. */
export interface HomeworkStats {
  /** Số bài đã nộp / số bài tính vào tỉ lệ. */
  submitted: number;
  total: number;
  /** Chuyên cần thang 10 = tỉ lệ nộp × 10 (78% → 7.8, làm tròn 1 số lẻ); null khi chưa có bài nào để tính. */
  attendance: number | null;
  /** Trung bình mọi BTVN đã có điểm (thang 10); null khi chưa bài nào có điểm. */
  average: number | null;
  graded: number;
}

/** Bài giao hiển thị trong hộp chọn "đưa bài lên sổ". */
export interface AutoAssignmentInfo {
  id: string;
  title: string;
  /** Hạn nộp, hoặc ngày giao khi không có hạn (YYYY-MM-DD). */
  date: string;
  /** Số học sinh đã có điểm / số nộp. */
  graded: number;
  submitted: number;
  periodicKey?: string;
}

/** Điểm tự tính từ bài nộp — chỉ có trong bản máy chủ trả về, KHÔNG lưu vào Firestore. */
export interface AutoScores {
  /** columnId → studentId → điểm thang 10. */
  linked: Record<string, Record<string, number>>;
  homework: Record<string, HomeworkStats>;
  /** examKey → studentId → điểm thang 10 từ bài giao đã gán vào mốc định kì. */
  periodic: Record<string, Record<string, number>>;
  assignments?: AutoAssignmentInfo[];
  examAssignments?: AutoAssignmentInfo[];
  computedAt: string;
}

export interface ScoreBookDoc {
  classId: string;
  hs1Columns: Hs1Column[];
  /** studentId → columnId → điểm. */
  hs1: Record<string, Record<string, number>>;
  /** studentId → điểm thi đã đồng bộ. */
  exams: Record<string, StudentExamScores>;
  /** Tên mốc thi MOET → hệ số (1–3); mốc không có trong đây thì không tính vào điểm trung bình. */
  examWeights?: Record<string, Hs1Weight>;
  examsSyncedAt?: string;
  examsSpreadsheetTitle?: string;
  /** studentId → điểm thầy cô xác nhận từ ảnh bài chấm tay. Ghép vào `exams` khi đọc, chỉ ở cột file điểm chưa có. */
  paperExams?: Record<string, PaperExamMark[]>;
  /** Điểm giáo viên sửa/xóa; null là xóa mốc đó khỏi sổ. */
  examOverrides?: Record<string, Record<string, { label: string; score: number | null }>>;
  examColumnLabels?: Record<string, string>;
  hiddenExamColumns?: string[];
  /** Header các cột điểm đọc từ file MOET/TDS, kể cả khi cả lớp chưa có điểm. */
  examColumns?: { moet: string[]; tds: string[] };
  /** examKey → assignmentId; liên kết bài đã nộp vào cột định kì của sổ. */
  periodicAssignmentLinks?: Record<string, string>;
  updatedAt?: string;
  auto?: AutoScores;
}

/** Một điểm hệ số 1 đã ghép tên cột, để hiển thị cho học sinh / phụ huynh. */
export interface Hs1Mark {
  label: string;
  date: string;
  score: number;
  /** Thiếu = 1. */
  weight?: Hs1Weight;
}

/** Phần sổ điểm của MỘT học sinh. */
export interface StudentScoreView {
  exams: StudentExamScores;
  hs1: Hs1Mark[];
  examsSyncedAt?: string;
  /** Hệ số của từng mốc MOET được tính vào điểm trung bình. */
  examWeights?: Record<string, Hs1Weight>;
  /** Điểm trung bình có hệ số (cột điểm + mốc MOET đã chọn hệ số); null khi chưa có điểm nào. */
  average?: number | null;
  homework?: HomeworkStats;
}

export const emptyScoreBook = (classId: string): ScoreBookDoc => ({ classId, hs1Columns: [], hs1: {}, exams: {} });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cleanLabel = (value: unknown): string =>
  typeof value === 'string' ? value.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, LABEL_MAX) : '';

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Hệ số giáo viên chọn: chỉ 1, 2, 3 (nhận cả chuỗi "2"); sai thì undefined. */
export const parseHs1Weight = (value: unknown): Hs1Weight | undefined => {
  const n = typeof value === 'string' ? Number(value) : value;
  return n === 1 || n === 2 || n === 3 ? n : undefined;
};

/** Quy điểm về thang 10; bài không có thang hợp lệ thì null. Điểm vượt thang (cộng thêm) bị chặn ở 10. */
export const scoreToTen = (score: number, maxScore: number): number | null =>
  Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0 && score >= 0
    ? round2(Math.min(10, score / maxScore * 10))
    : null;

/**
 * Điểm hệ số 1 giáo viên gõ: số 0–10, tối đa 2 chữ số lẻ; nhận cả "8,5".
 * Trả `null` = ô trống (xoá điểm), `undefined` = không hợp lệ.
 */
export const parseHs1Score = (value: unknown): number | null | undefined => {
  if (value === null || value === undefined) return null;
  const text = typeof value === 'number' ? String(value) : String(value).trim().replace(',', '.');
  if (text === '') return null;
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(text)) return undefined;
  const score = Number(text);
  return score >= 0 && score <= HS1_MAX ? score : undefined;
};

const isIsoDay = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/** Kiểm tên + ngày một cột hệ số 1; hỏng thì trả lý do để báo giáo viên. */
export const validateHs1Column = (raw: unknown): { label: string; date: string } | { error: string } => {
  if (!isRecord(raw)) return { error: 'Thiếu thông tin cột điểm.' };
  const label = cleanLabel(raw.label);
  if (!label) return { error: 'Cột điểm cần có tên (vd "Kiểm tra 15 phút lần 1").' };
  if (!isIsoDay(raw.date)) return { error: 'Ngày kiểm tra không hợp lệ.' };
  return { label, date: raw.date };
};

export const canAddHs1Column = (book: ScoreBookDoc): boolean => book.hs1Columns.length < MAX_HS1_COLUMNS;

const sanitizeMarks = (raw: unknown): ExamMark[] => {
  if (!Array.isArray(raw)) return [];
  const marks: ExamMark[] = [];
  for (const item of raw.slice(0, 20)) {
    if (!isRecord(item)) continue;
    const label = cleanLabel(item.label);
    const score = typeof item.score === 'number' && Number.isFinite(item.score) ? round2(item.score) : NaN;
    if (!label || !(score >= 0 && score <= EXAM_MAX)) continue;
    const letter = cleanLabel(item.letter).slice(0, 8);
    marks.push({ label, score, ...(letter ? { letter } : {}), ...(item.source === 'paper' ? { source: 'paper' as const } : {}) });
  }
  return marks;
};

/** Làm sạch điểm thi trình duyệt gửi lên (đọc từ Google Sheet của giáo viên). */
export const sanitizeExamScores = (raw: unknown): StudentExamScores => (
  isRecord(raw) ? { moet: sanitizeMarks(raw.moet), tds: sanitizeMarks(raw.tds) } : { moet: [], tds: [] }
);

const normalizeHomeworkStats = (raw: unknown): HomeworkStats | null => {
  if (!isRecord(raw)) return null;
  const count = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
  const maybe = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  return { submitted: count(raw.submitted), total: count(raw.total), attendance: maybe(raw.attendance), average: maybe(raw.average), graded: count(raw.graded) };
};

const normalizeAutoScores = (raw: unknown): AutoScores | undefined => {
  if (!isRecord(raw)) return undefined;
  const linked: AutoScores['linked'] = {};
  if (isRecord(raw.linked)) {
    for (const [columnId, row] of Object.entries(raw.linked)) {
      if (!isRecord(row)) continue;
      linked[columnId] = Object.fromEntries(Object.entries(row).filter(([, v]) => typeof v === 'number' && Number.isFinite(v))) as Record<string, number>;
    }
  }
  const homework: AutoScores['homework'] = {};
  if (isRecord(raw.homework)) {
    for (const [studentId, value] of Object.entries(raw.homework)) {
      const stats = normalizeHomeworkStats(value);
      if (stats) homework[studentId] = stats;
    }
  }
  const assignments = Array.isArray(raw.assignments)
    ? raw.assignments.filter((a): a is AutoAssignmentInfo => isRecord(a) && typeof a.id === 'string' && typeof a.title === 'string' && typeof a.date === 'string')
      .map(a => ({ id: a.id, title: a.title, date: a.date, graded: Number(a.graded) || 0, submitted: Number(a.submitted) || 0 }))
    : undefined;
  const periodic: AutoScores['periodic'] = {};
  if (isRecord(raw.periodic)) {
    for (const [key, row] of Object.entries(raw.periodic)) {
      if (!isRecord(row)) continue;
      periodic[key] = Object.fromEntries(Object.entries(row).filter(([, value]) => typeof value === 'number' && Number.isFinite(value))) as Record<string, number>;
    }
  }
  const examAssignments = Array.isArray(raw.examAssignments)
    ? raw.examAssignments.filter((a): a is AutoAssignmentInfo => isRecord(a) && typeof a.id === 'string' && typeof a.title === 'string' && typeof a.date === 'string')
      .map(a => ({ id: a.id, title: a.title, date: a.date, graded: Number(a.graded) || 0, submitted: Number(a.submitted) || 0, ...(typeof a.periodicKey === 'string' ? { periodicKey: a.periodicKey } : {}) }))
    : undefined;
  return { linked, homework, periodic, ...(assignments ? { assignments } : {}), ...(examAssignments ? { examAssignments } : {}), computedAt: typeof raw.computedAt === 'string' ? raw.computedAt : '' };
};

/** Đọc document Firestore về dạng chuẩn, bỏ qua phần hỏng thay vì làm vỡ màn hình. */
export const normalizeScoreBook = (classId: string, raw: unknown): ScoreBookDoc => {
  if (!isRecord(raw)) return emptyScoreBook(classId);
  const hs1Columns = Array.isArray(raw.hs1Columns)
    ? raw.hs1Columns.filter((c): c is Hs1Column => isRecord(c) && typeof c.id === 'string' && typeof c.label === 'string' && typeof c.date === 'string')
      .map(c => ({
        id: c.id,
        label: c.label,
        date: c.date,
        weight: parseHs1Weight(c.weight) ?? 1,
        ...(typeof c.assignmentId === 'string' && c.assignmentId ? { assignmentId: c.assignmentId } : {}),
      }))
    : [];
  const hs1: ScoreBookDoc['hs1'] = {};
  if (isRecord(raw.hs1)) {
    for (const [studentId, row] of Object.entries(raw.hs1)) {
      if (!isRecord(row)) continue;
      const clean: Record<string, number> = {};
      for (const [columnId, score] of Object.entries(row)) {
        if (typeof score === 'number' && Number.isFinite(score)) clean[columnId] = score;
      }
      hs1[studentId] = clean;
    }
  }
  const exams: ScoreBookDoc['exams'] = {};
  if (isRecord(raw.exams)) {
    for (const [studentId, value] of Object.entries(raw.exams)) exams[studentId] = sanitizeExamScores(value);
  }
  const examWeights: Record<string, Hs1Weight> = {};
  if (isRecord(raw.examWeights)) {
    for (const [label, value] of Object.entries(raw.examWeights)) {
      const weight = parseHs1Weight(value);
      if (weight) examWeights[label] = weight;
    }
  }
  const auto = normalizeAutoScores(raw.auto);
  const paperExams = sanitizePaperExams(raw.paperExams);
  const examOverrides = sanitizeExamOverrides(raw.examOverrides);
  // Mốc thi đang có điểm thật, tách theo nhóm — cột trùng mà không có điểm thì mới bị bỏ.
  const examDataKeys = { moet: new Set<string>(), tds: new Set<string>() };
  for (const row of Object.values(exams)) {
    for (const mark of row.moet) examDataKeys.moet.add(examLabelKey(mark.label));
    for (const mark of row.tds) examDataKeys.tds.add(examLabelKey(mark.label));
  }
  return {
    classId,
    hs1Columns,
    hs1,
    exams: applyExamOverrides(mergePaperExams(exams, paperExams), examOverrides),
    ...(Object.keys(paperExams).length > 0 ? { paperExams } : {}),
    ...(Object.keys(examOverrides).length > 0 ? { examOverrides } : {}),
    ...(sanitizeExamColumnLabels(raw.examColumnLabels) ? { examColumnLabels: sanitizeExamColumnLabels(raw.examColumnLabels)! } : {}),
    ...(Array.isArray(raw.hiddenExamColumns) ? { hiddenExamColumns: [...new Set(raw.hiddenExamColumns.filter((key): key is string => typeof key === 'string').map(examLabelKey))] } : {}),
    ...(isRecord(raw.examColumns) ? { examColumns: dedupeExamColumns({
      moet: Array.isArray(raw.examColumns.moet) ? raw.examColumns.moet.filter((v): v is string => typeof v === 'string') : [],
      tds: Array.isArray(raw.examColumns.tds) ? raw.examColumns.tds.filter((v): v is string => typeof v === 'string') : [],
    }, examDataKeys) } : {}),
    ...(isRecord(raw.periodicAssignmentLinks) ? { periodicAssignmentLinks: Object.fromEntries(Object.entries(raw.periodicAssignmentLinks).filter(([, id]) => typeof id === 'string')) as Record<string, string> } : {}),
    ...(Object.keys(examWeights).length > 0 ? { examWeights } : {}),
    ...(typeof raw.examsSyncedAt === 'string' ? { examsSyncedAt: raw.examsSyncedAt } : {}),
    ...(typeof raw.examsSpreadsheetTitle === 'string' ? { examsSpreadsheetTitle: raw.examsSpreadsheetTitle } : {}),
    ...(typeof raw.updatedAt === 'string' ? { updatedAt: raw.updatedAt } : {}),
    ...(auto ? { auto } : {}),
  };
};

const sanitizePaperExams = (raw: unknown): Record<string, PaperExamMark[]> => {
  const out: Record<string, PaperExamMark[]> = {};
  if (!isRecord(raw)) return out;
  for (const [studentId, list] of Object.entries(raw)) {
    if (!Array.isArray(list)) continue;
    const marks = list.flatMap(item => {
      if (!isRecord(item)) return [];
      const label = cleanLabel(item.label);
      const score = typeof item.score === 'number' && Number.isFinite(item.score) ? round2(item.score) : NaN;
      const assignmentId = typeof item.assignmentId === 'string' ? item.assignmentId : '';
      if (!label || !assignmentId || !(score >= 0 && score <= HS1_MAX)) return [];
      return [{ label, score, assignmentId, confirmedAt: typeof item.confirmedAt === 'string' ? item.confirmedAt : '' }];
    });
    if (marks.length > 0) out[studentId] = marks.slice(0, 20);
  }
  return out;
};

const dedupeMarks = (marks: ExamMark[]): ExamMark[] => {
  const seen = new Set<string>();
  return marks.filter(mark => {
    const key = examLabelKey(mark.label);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const sanitizeExamOverrides = (raw: unknown): NonNullable<ScoreBookDoc['examOverrides']> => {
  const out: NonNullable<ScoreBookDoc['examOverrides']> = {};
  if (!isRecord(raw)) return out;
  for (const [studentId, values] of Object.entries(raw)) {
    if (!isRecord(values)) continue;
    const row: Record<string, { label: string; score: number | null }> = {};
    for (const [key, value] of Object.entries(values)) {
      if (!isRecord(value) || typeof value.label !== 'string') continue;
      const score = value.score === null ? null : (typeof value.score === 'number' && Number.isFinite(value.score) ? round2(value.score) : NaN);
      if (!(score === null || (score >= 0 && score <= HS1_MAX))) continue;
      row[examLabelKey(key || value.label)] = { label: cleanLabel(value.label), score };
    }
    if (Object.keys(row).length > 0) out[studentId] = row;
  }
  return out;
};

export const applyExamOverrides = (exams: ScoreBookDoc['exams'], overrides: NonNullable<ScoreBookDoc['examOverrides']>): ScoreBookDoc['exams'] => {
  const out: ScoreBookDoc['exams'] = {};
  for (const [studentId, row] of Object.entries(exams)) {
    out[studentId] = { moet: dedupeMarks(row.moet), tds: dedupeMarks(row.tds) };
  }
  for (const [studentId, values] of Object.entries(overrides)) {
    const row = out[studentId] ?? (out[studentId] = { moet: [], tds: [] });
    for (const [key, override] of Object.entries(values)) {
      row.moet = row.moet.filter(mark => examLabelKey(mark.label) !== key);
      row.tds = row.tds.filter(mark => examLabelKey(mark.label) !== key);
      if (override.score !== null) row.moet.push({ label: override.label, score: override.score });
    }
  }
  return out;
};

const sanitizeExamColumnLabels = (raw: unknown): Record<string, string> | undefined => {
  if (!isRecord(raw)) return undefined;
  const labels = Object.fromEntries(Object.entries(raw).flatMap(([key, value]) => {
    const label = cleanLabel(value);
    return label ? [[examLabelKey(key), label]] : [];
  }));
  return Object.keys(labels).length ? labels : undefined;
};

export const applyExamColumnSettings = (exams: ScoreBookDoc['exams'], rawLabels: unknown, rawHidden: unknown): ScoreBookDoc['exams'] => {
  const labels = sanitizeExamColumnLabels(rawLabels) ?? {};
  const hidden = new Set(Array.isArray(rawHidden) ? rawHidden.filter((key): key is string => typeof key === 'string').map(examLabelKey) : []);
  const out: ScoreBookDoc['exams'] = {};
  for (const [studentId, row] of Object.entries(exams)) {
    const map = (marks: ExamMark[]) => dedupeMarks(marks)
      .filter(mark => !hidden.has(examLabelKey(mark.label)))
      .map(mark => ({ ...mark, ...(labels[examLabelKey(mark.label)] ? { label: labels[examLabelKey(mark.label)] } : {}) }));
    out[studentId] = { moet: map(row.moet), tds: map(row.tds) };
  }
  return out;
};

/**
 * Bỏ cột trùng mốc: hai tên khác nhau nhưng cùng mã chuẩn (vd "Thi GHKI" và "Giữa học kì I")
 * là MỘT mốc thi — giữ cột đầu, bỏ bóng ma. Cột trùng mà đang có điểm thật thì giữ lại để không mất dữ liệu.
 */
export const dedupeExamColumns = (
  columns: { moet: string[]; tds: string[] },
  dataKeys: { moet?: ReadonlySet<string>; tds?: ReadonlySet<string> } = {},
): { moet: string[]; tds: string[] } => {
  const moet: string[] = [];
  const moetKeys = new Set<string>();
  for (const label of columns.moet) {
    const key = examLabelKey(label);
    if (!key || moetKeys.has(key)) continue;
    moetKeys.add(key);
    moet.push(label);
  }
  const tds: string[] = [];
  const tdsKeys = new Set<string>();
  for (const label of columns.tds) {
    const key = examLabelKey(label);
    if (!key || tdsKeys.has(key)) continue;
    tdsKeys.add(key);
    // Cùng mã với cột MOET: chỉ giữ khi chính nhóm TDS đang mang điểm thật.
    if (moetKeys.has(key) && !dataKeys.tds?.has(key)) continue;
    tds.push(label);
  }
  return { moet, tds };
};

/** Nguồn của một ô điểm thi định kì trong sổ — để giáo viên biết điểm đến từ đâu. */
export type ExamScoreSource = 'assignment' | 'manual' | 'paper' | 'sheet';

/** Nhãn + gợi ý của từng nguồn điểm (dùng chung cho cả GV, HS và phụ huynh). */
export const EXAM_SOURCE_INFO: Record<ExamScoreSource, { label: string; hint: string }> = {
  assignment: { label: 'Bài nộp', hint: 'Điểm lấy từ bài học sinh đã nộp, gán vào mốc này.' },
  manual: { label: 'Sửa tay', hint: 'Điểm giáo viên sửa tay trong sổ điểm.' },
  paper: { label: 'Chấm tay', hint: 'Điểm chấm tay đã xác nhận từ ảnh bài thi.' },
  sheet: { label: 'Sheet', hint: 'Điểm đọc từ file điểm Google Sheet của lớp.' },
};

/**
 * Nguồn thật của ô điểm, đúng thứ tự ưu tiên đang dùng để hiển thị:
 * bài nộp > sửa tay > chấm tay > Sheet. Ô trống → undefined.
 */
export const examScoreSource = (book: ScoreBookDoc, studentId: string, label: string): ExamScoreSource | undefined => {
  const key = examLabelKey(label);
  if (!key) return undefined;
  if (typeof book.auto?.periodic?.[key]?.[studentId] === 'number') return 'assignment';
  const override = book.examOverrides?.[studentId]?.[key];
  if (override && override.score !== null) return 'manual';
  const view = applyExamColumnSettings({ [studentId]: book.exams[studentId] ?? { moet: [], tds: [] } }, book.examColumnLabels, book.hiddenExamColumns)[studentId];
  const mark = [...view.moet, ...view.tds].find(item => examLabelKey(item.label) === key);
  if (!mark) return undefined;
  return mark.source === 'paper' ? 'paper' : 'sheet';
};

export const examColumnDisplayLabels = (book: ScoreBookDoc): string[] => {
  const labels = [...(book.examColumns?.moet ?? []), ...(book.examColumns?.tds ?? []), ...Object.values(book.exams).flatMap(row => [...row.moet, ...row.tds].map(mark => mark.label))];
  const out: string[] = [];
  for (const label of labels) {
    const key = examLabelKey(label);
    if ((book.hiddenExamColumns ?? []).includes(key) || out.some(item => examLabelKey(item) === key)) continue;
    out.push(book.examColumnLabels?.[key] ?? label);
  }
  return out;
};

const examsWithPeriodicAssignmentScores = (book: ScoreBookDoc, studentId: string): StudentExamScores => {
  const base = applyExamColumnSettings({ [studentId]: book.exams[studentId] ?? { moet: [], tds: [] } }, book.examColumnLabels, book.hiddenExamColumns)[studentId];
  const periodic = book.auto?.periodic ?? {};
  const moet = [...base.moet];
  for (const [key, row] of Object.entries(periodic)) {
    const score = row[studentId];
    if (typeof score !== 'number') continue;
    const current = moet.find(mark => examLabelKey(mark.label) === key) ?? base.tds.find(mark => examLabelKey(mark.label) === key);
    const next = { label: current?.label ?? book.examColumnLabels?.[key] ?? key, score };
    const index = moet.findIndex(mark => examLabelKey(mark.label) === key);
    if (index >= 0) moet[index] = next;
    else {
      const tdsIndex = base.tds.findIndex(mark => examLabelKey(mark.label) === key);
      if (tdsIndex < 0) moet.push(next);
    }
  }
  return { moet, tds: base.tds };
};

const sameExamLabel = (left: string, right: string): boolean => examLabelKey(left) === examLabelKey(right);

/**
 * Ghép điểm chấm tay đã xác nhận vào điểm thi: file điểm LUÔN thắng — cột đã có điểm từ file thì bỏ qua điểm ảnh.
 * Mốc trùng tên một cột TDS của lớp thì vào TDS, còn lại vào MOET (thang 10).
 */
export const mergePaperExams = (
  exams: Record<string, StudentExamScores>,
  paperExams: Record<string, PaperExamMark[]>,
): Record<string, StudentExamScores> => {
  const tdsLabels = Object.values(exams).flatMap(row => row.tds.filter(mark => mark.source !== 'paper').map(mark => mark.label));
  const out: Record<string, StudentExamScores> = {};
  for (const [studentId, row] of Object.entries(exams)) {
    out[studentId] = { moet: dedupeMarks(row.moet.filter(mark => mark.source !== 'paper')), tds: dedupeMarks(row.tds.filter(mark => mark.source !== 'paper')) };
  }
  for (const [studentId, marks] of Object.entries(paperExams)) {
    const row = out[studentId] ?? (out[studentId] = { moet: [], tds: [] });
    for (const mark of marks) {
      if ([...row.moet, ...row.tds].some(item => sameExamLabel(item.label, mark.label))) continue;
      const target = tdsLabels.some(label => sameExamLabel(label, mark.label)) ? row.tds : row.moet;
      target.push({ label: mark.label, score: mark.score, source: 'paper' });
    }
  }
  return out;
};

/** Điểm thi lưu xuống Firestore: bỏ phần ghép từ ảnh (đã có ở `paperExams`). */
export const storedExams = (exams: Record<string, StudentExamScores>): Record<string, StudentExamScores> =>
  Object.fromEntries(Object.entries(exams).map(([studentId, row]) => [studentId, {
    moet: row.moet.filter(mark => mark.source !== 'paper'),
    tds: row.tds.filter(mark => mark.source !== 'paper'),
  }]));

/** Cột xếp theo ngày kiểm tra, cùng ngày thì theo thứ tự tạo. */
export const sortedHs1Columns = (columns: readonly Hs1Column[]): Hs1Column[] =>
  columns.map((column, index) => ({ column, index }))
    .sort((a, b) => a.column.date.localeCompare(b.column.date) || a.index - b.index)
    .map(item => item.column);

/** Điểm của một học sinh ở một cột: ô nhập tay đè điểm tự lấy từ bài nộp. */
export const columnScore = (book: ScoreBookDoc, column: Hs1Column, studentId: string): number | undefined => {
  const manual = book.hs1[studentId]?.[column.id];
  return typeof manual === 'number' ? manual : book.auto?.linked[column.id]?.[studentId];
};

/** Trung bình có hệ số Σ(hệ số × điểm) / Σ hệ số (thang 10, làm tròn 2 số lẻ); chưa có điểm thì null. */
export const weightedAverage = (items: ReadonlyArray<{ score: number; weight?: number }>): number | null => {
  let total = 0;
  let weights = 0;
  for (const item of items) {
    const weight = item.weight ?? 1;
    total += item.score * weight;
    weights += weight;
  }
  return weights === 0 ? null : round2(total / weights);
};

/** Trung bình các điểm cột (có hệ số) — mọi nơi hiển thị "TB hệ số" đều dùng hàm này. */
export const hs1Average = (marks: readonly Hs1Mark[]): number | null => weightedAverage(marks);

/** Điểm trung bình tổng: các cột điểm + những mốc MOET giáo viên đã chọn hệ số. */
const overallAverage = (hs1: readonly Hs1Mark[], moet: readonly { label: string; score: number }[], examWeights: Record<string, Hs1Weight> | undefined): number | null =>
  weightedAverage([
    ...hs1,
    ...moet.flatMap(mark => {
      const weight = Object.entries(examWeights ?? {}).find(([label]) => examLabelKey(label) === examLabelKey(mark.label))?.[1];
      return weight ? [{ score: mark.score, weight }] : [];
    }),
  ]);

/** Phần sổ điểm của một học sinh — chỉ những ô đã có điểm. */
export const studentScoreView = (book: ScoreBookDoc, studentId: string): StudentScoreView => {
  const hs1: Hs1Mark[] = [];
  for (const column of sortedHs1Columns(book.hs1Columns)) {
    const score = columnScore(book, column, studentId);
    if (score !== undefined) hs1.push({ label: column.label, date: column.date, score, weight: column.weight });
  }
  const exams = examsWithPeriodicAssignmentScores(book, studentId);
  const homework = book.auto?.homework[studentId];
  return {
    exams,
    hs1,
    ...(book.examsSyncedAt ? { examsSyncedAt: book.examsSyncedAt } : {}),
    ...(book.examWeights ? { examWeights: book.examWeights } : {}),
    average: overallAverage(hs1, exams.moet, book.examWeights),
    ...(homework ? { homework } : {}),
  };
};

/** Một lượt nộp đã chuẩn hoá để tính điểm; `score` null = đã nộp nhưng chưa có điểm. */
export interface HomeworkEntry {
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  score: number | null;
  maxScore: number;
}

/** Bài giao đã chuẩn hoá để tính điểm. */
export interface HomeworkAssignment {
  id: string;
  title: string;
  createdAt: string;
  dueAt?: string;
  /** Bài kiểm tra định kì: điểm chính thức nằm ở file điểm, không tính vào BTVN. */
  periodic: boolean;
  /** Vắng = cả lớp. */
  targetStudentIds?: string[];
}

/** Bài mới giao chưa có hạn: sau ngần này mới tính "chưa nộp" vào chuyên cần. */
const NO_DUE_GRACE_MS = 24 * 60 * 60 * 1000;

const timeOf = (iso: string | undefined): number => {
  const t = Date.parse(String(iso || ''));
  return Number.isFinite(t) ? t : 0;
};

const dayOf = (iso: string | undefined): string => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : '');

/**
 * Điểm tự tính từ bài nộp, tính lại mỗi lần đọc nên đổi điểm/nộp thêm bài là sổ đổi theo.
 * - Mỗi (bài, học sinh) lấy lượt nộp MỚI NHẤT có điểm; mọi điểm đã chấm đều tính, bất kể ai duyệt.
 * - Chuyên cần = số bài đã nộp / số bài đã đến hạn (hoặc đã nộp) × 10.
 */
export const computeAutoScores = (
  book: ScoreBookDoc,
  assignments: readonly HomeworkAssignment[],
  entries: readonly HomeworkEntry[],
  studentIds: readonly string[],
  nowMs = Date.now(),
): AutoScores => {
  const latest = new Map<string, HomeworkEntry>();
  const latestGraded = new Map<string, HomeworkEntry>();
  for (const entry of entries) {
    const key = `${entry.assignmentId}\u0000${entry.studentId}`;
    const newer = (current?: HomeworkEntry) => !current || timeOf(entry.submittedAt) >= timeOf(current.submittedAt);
    if (newer(latest.get(key))) latest.set(key, entry);
    if (entry.score !== null && newer(latestGraded.get(key))) latestGraded.set(key, entry);
  }
  const tenOf = (assignmentId: string, studentId: string): number | null => {
    const entry = latestGraded.get(`${assignmentId}\u0000${studentId}`);
    return entry && entry.score !== null ? scoreToTen(entry.score, entry.maxScore) : null;
  };

  const periodic: AutoScores['periodic'] = {};
  const linkedPeriodicIds = new Set(Object.values(book.periodicAssignmentLinks ?? {}));
  for (const [examKey, assignmentId] of Object.entries(book.periodicAssignmentLinks ?? {})) {
    const row: Record<string, number> = {};
    for (const studentId of studentIds) {
      const ten = tenOf(assignmentId, studentId);
      if (ten !== null) row[studentId] = ten;
    }
    periodic[examKey] = row;
  }

  const linked: AutoScores['linked'] = {};
  for (const column of book.hs1Columns) {
    if (!column.assignmentId) continue;
    const row: Record<string, number> = {};
    for (const studentId of studentIds) {
      const ten = tenOf(column.assignmentId, studentId);
      if (ten !== null) row[studentId] = ten;
    }
    linked[column.id] = row;
  }

  const allSelectableAssignments = assignments.filter(a => !a.periodic);
  const homeworkAssignments = allSelectableAssignments.filter(a => !linkedPeriodicIds.has(a.id));
  const homework: AutoScores['homework'] = {};
  for (const studentId of studentIds) {
    let total = 0;
    let submitted = 0;
    const tens: number[] = [];
    for (const assignment of homeworkAssignments) {
      if (assignment.targetStudentIds && !assignment.targetStudentIds.includes(studentId)) continue;
      const did = latest.has(`${assignment.id}\u0000${studentId}`);
      const dueMs = assignment.dueAt ? timeOf(assignment.dueAt) : timeOf(assignment.createdAt) + NO_DUE_GRACE_MS;
      if (did || dueMs <= nowMs) total += 1;
      if (did) submitted += 1;
      const ten = tenOf(assignment.id, studentId);
      if (ten !== null) tens.push(ten);
    }
    homework[studentId] = {
      submitted,
      total,
      attendance: total > 0 ? Math.round(submitted / total * 100) / 10 : null,
      average: tens.length > 0 ? round2(tens.reduce((sum, v) => sum + v, 0) / tens.length) : null,
      graded: tens.length,
    };
  }

  const roster = new Set(studentIds);
  const periodicByAssignment = Object.fromEntries(Object.entries(book.periodicAssignmentLinks ?? {}).map(([key, id]) => [id, key]));
  const toPickerInfo = (assignment: HomeworkAssignment): AutoAssignmentInfo => ({
    id: assignment.id,
    title: assignment.title,
    date: dayOf(assignment.dueAt) || dayOf(assignment.createdAt),
    submitted: [...latest.values()].filter(e => e.assignmentId === assignment.id && roster.has(e.studentId)).length,
    graded: [...latestGraded.values()].filter(e => e.assignmentId === assignment.id && roster.has(e.studentId)).length,
    ...(periodicByAssignment[assignment.id] ? { periodicKey: periodicByAssignment[assignment.id] } : {}),
  });
  const picker = homeworkAssignments.map(toPickerInfo).sort((a, b) => b.date.localeCompare(a.date));
  const examPicker = assignments.map(toPickerInfo).filter(item => item.submitted > 0).sort((a, b) => b.date.localeCompare(a.date));

  return {
    linked,
    homework,
    periodic,
    assignments: picker,
    examAssignments: examPicker,
    computedAt: new Date(nowMs).toISOString(),
  };
};
