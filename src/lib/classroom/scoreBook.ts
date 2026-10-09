/**
 * SỔ ĐIỂM của lớp: điểm thi định kì (MOET + TDS, đồng bộ từ file điểm Google Sheet của lớp) và điểm
 * hệ số 1 giáo viên nhập trên lớp. Một document `scoreBooks/{classId}`, CHỈ máy chủ đọc/ghi — học sinh
 * nhận đúng phần của mình qua API. BTVN không chép vào đây: lấy thẳng từ bài đã duyệt.
 *
 * File này thuần (không Firestore) để cả máy chủ lẫn trình duyệt dùng chung phần kiểm dữ liệu.
 */
import type { ExamMark, StudentExamScores } from './examScores.js';

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
}

/** Điểm tự tính từ bài nộp — chỉ có trong bản máy chủ trả về, KHÔNG lưu vào Firestore. */
export interface AutoScores {
  /** columnId → studentId → điểm thang 10. */
  linked: Record<string, Record<string, number>>;
  homework: Record<string, HomeworkStats>;
  assignments?: AutoAssignmentInfo[];
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
    marks.push({ label, score, ...(letter ? { letter } : {}) });
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
  return { linked, homework, ...(assignments ? { assignments } : {}), computedAt: typeof raw.computedAt === 'string' ? raw.computedAt : '' };
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
  return {
    classId,
    hs1Columns,
    hs1,
    exams,
    ...(Object.keys(examWeights).length > 0 ? { examWeights } : {}),
    ...(typeof raw.examsSyncedAt === 'string' ? { examsSyncedAt: raw.examsSyncedAt } : {}),
    ...(typeof raw.examsSpreadsheetTitle === 'string' ? { examsSpreadsheetTitle: raw.examsSpreadsheetTitle } : {}),
    ...(typeof raw.updatedAt === 'string' ? { updatedAt: raw.updatedAt } : {}),
    ...(auto ? { auto } : {}),
  };
};

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
    ...moet.flatMap(mark => (examWeights?.[mark.label] ? [{ score: mark.score, weight: examWeights[mark.label] }] : [])),
  ]);

/** Phần sổ điểm của một học sinh — chỉ những ô đã có điểm. */
export const studentScoreView = (book: ScoreBookDoc, studentId: string): StudentScoreView => {
  const hs1: Hs1Mark[] = [];
  for (const column of sortedHs1Columns(book.hs1Columns)) {
    const score = columnScore(book, column, studentId);
    if (score !== undefined) hs1.push({ label: column.label, date: column.date, score, weight: column.weight });
  }
  const exams = book.exams[studentId] ?? { moet: [], tds: [] };
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

  const homeworkAssignments = assignments.filter(a => !a.periodic);
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
  const picker: AutoAssignmentInfo[] = homeworkAssignments.map(assignment => ({
    id: assignment.id,
    title: assignment.title,
    date: dayOf(assignment.dueAt) || dayOf(assignment.createdAt),
    submitted: [...latest.values()].filter(e => e.assignmentId === assignment.id && roster.has(e.studentId)).length,
    graded: [...latestGraded.values()].filter(e => e.assignmentId === assignment.id && roster.has(e.studentId)).length,
  })).sort((a, b) => b.date.localeCompare(a.date));

  return { linked, homework, assignments: picker, computedAt: new Date(nowMs).toISOString() };
};
