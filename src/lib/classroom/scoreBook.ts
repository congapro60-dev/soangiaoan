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

/** Một cột điểm hệ số 1 (vd "Kiểm tra 15 phút lần 1"). */
export interface Hs1Column {
  id: string;
  label: string;
  /** Ngày kiểm tra dạng YYYY-MM-DD. */
  date: string;
}

export interface ScoreBookDoc {
  classId: string;
  hs1Columns: Hs1Column[];
  /** studentId → columnId → điểm. */
  hs1: Record<string, Record<string, number>>;
  /** studentId → điểm thi đã đồng bộ. */
  exams: Record<string, StudentExamScores>;
  examsSyncedAt?: string;
  examsSpreadsheetTitle?: string;
  updatedAt?: string;
}

/** Một điểm hệ số 1 đã ghép tên cột, để hiển thị cho học sinh / phụ huynh. */
export interface Hs1Mark {
  label: string;
  date: string;
  score: number;
}

/** Phần sổ điểm của MỘT học sinh. */
export interface StudentScoreView {
  exams: StudentExamScores;
  hs1: Hs1Mark[];
  examsSyncedAt?: string;
}

export const emptyScoreBook = (classId: string): ScoreBookDoc => ({ classId, hs1Columns: [], hs1: {}, exams: {} });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cleanLabel = (value: unknown): string =>
  typeof value === 'string' ? value.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, LABEL_MAX) : '';

const round2 = (value: number): number => Math.round(value * 100) / 100;

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

/** Đọc document Firestore về dạng chuẩn, bỏ qua phần hỏng thay vì làm vỡ màn hình. */
export const normalizeScoreBook = (classId: string, raw: unknown): ScoreBookDoc => {
  if (!isRecord(raw)) return emptyScoreBook(classId);
  const hs1Columns = Array.isArray(raw.hs1Columns)
    ? raw.hs1Columns.filter((c): c is Hs1Column => isRecord(c) && typeof c.id === 'string' && typeof c.label === 'string' && typeof c.date === 'string')
      .map(c => ({ id: c.id, label: c.label, date: c.date }))
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
  return {
    classId,
    hs1Columns,
    hs1,
    exams,
    ...(typeof raw.examsSyncedAt === 'string' ? { examsSyncedAt: raw.examsSyncedAt } : {}),
    ...(typeof raw.examsSpreadsheetTitle === 'string' ? { examsSpreadsheetTitle: raw.examsSpreadsheetTitle } : {}),
    ...(typeof raw.updatedAt === 'string' ? { updatedAt: raw.updatedAt } : {}),
  };
};

/** Cột xếp theo ngày kiểm tra, cùng ngày thì theo thứ tự tạo. */
export const sortedHs1Columns = (columns: readonly Hs1Column[]): Hs1Column[] =>
  columns.map((column, index) => ({ column, index }))
    .sort((a, b) => a.column.date.localeCompare(b.column.date) || a.index - b.index)
    .map(item => item.column);

/** Phần sổ điểm của một học sinh — chỉ những ô đã có điểm. */
export const studentScoreView = (book: ScoreBookDoc, studentId: string): StudentScoreView => {
  const row = book.hs1[studentId] ?? {};
  const hs1 = sortedHs1Columns(book.hs1Columns)
    .filter(column => typeof row[column.id] === 'number')
    .map(column => ({ label: column.label, date: column.date, score: row[column.id] }));
  return {
    exams: book.exams[studentId] ?? { moet: [], tds: [] },
    hs1,
    ...(book.examsSyncedAt ? { examsSyncedAt: book.examsSyncedAt } : {}),
  };
};

/** Trung bình cộng điểm hệ số 1 (thang 10), làm tròn 2 số lẻ; chưa có điểm thì null. */
export const hs1Average = (marks: readonly Hs1Mark[]): number | null =>
  marks.length === 0 ? null : round2(marks.reduce((sum, mark) => sum + mark.score, 0) / marks.length);
