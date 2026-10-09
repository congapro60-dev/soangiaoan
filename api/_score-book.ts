/**
 * Sổ điểm của lớp — `scoreBooks/{classId}`, chỉ đi qua đây (rules mặc định chặn client).
 *
 * Giáo viên thuộc lớp: xem cả sổ, nhập/xoá cột điểm hệ số 1, lưu điểm thi đã đồng bộ từ file điểm.
 * Học sinh: chỉ nhận dòng của chính mình, xác định từ phiên `studentLinks` — không nhận studentId từ client.
 */
import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { teacherContext } from './_classroom-teacher.js';
import {
  SCORE_BOOKS_COL,
  canAddHs1Column,
  computeAutoScores,
  normalizeScoreBook,
  parseHs1Score,
  parseHs1Weight,
  sanitizeExamScores,
  studentScoreView,
  validateHs1Column,
  type HomeworkAssignment,
  type HomeworkEntry,
  type Hs1Weight,
  type ScoreBookDoc,
} from '../src/lib/classroom/scoreBook.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

const MAX_ROWS = 300;

const nowIso = (): string => new Date().toISOString();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const readBook = async (db: Db, classId: string): Promise<ScoreBookDoc> => {
  const snap = await db.collection(SCORE_BOOKS_COL).doc(classId).get();
  return normalizeScoreBook(classId, snap.exists ? snap.data() : null);
};

const writeBook = async (db: Db, book: ScoreBookDoc, uid: string): Promise<void> => {
  // `auto` là điểm tính lại mỗi lần đọc — không bao giờ lưu.
  const { auto: _auto, ...stored } = book;
  await db.collection(SCORE_BOOKS_COL).doc(book.classId).set({ ...stored, updatedAt: nowIso(), updatedBy: uid });
};

const isoOf = (value: unknown): string => (typeof value === 'string' ? value : '');
const numOf = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/**
 * Bài giao + mọi lượt nộp của lớp (ảnh và đề online), chuẩn hoá để `computeAutoScores` tính.
 * Chỉ `select` vài trường nhỏ — bài nộp mang cả ảnh/chi tiết từng câu, kéo hết về là phí.
 * `studentId` có thì chỉ lấy bài của em đó (cổng học sinh / phụ huynh).
 */
const loadHomeworkInputs = async (
  db: Db,
  classId: string,
  studentId?: string,
): Promise<{ assignments: HomeworkAssignment[]; entries: HomeworkEntry[] }> => {
  const scoped = (name: string) => {
    const base = db.collection(name).where('classId', '==', classId);
    return studentId ? base.where('studentId', '==', studentId) : base;
  };
  const [assignmentSnap, uploadSnap, onlineSnap] = await Promise.all([
    db.collection('assignments').where('classId', '==', classId).select('title', 'createdAt', 'dueAt', 'periodicTest', 'targetStudentIds').get(),
    scoped('submissions').select('assignmentId', 'studentId', 'createdAt', 'grade.score', 'grade.maxScore', 'grade.awaitingClarification').get(),
    scoped('examSubmissions').select('assignmentId', 'studentId', 'status', 'startedAt', 'submittedAt', 'totalScore', 'maxScore', 'grade.score', 'grade.maxScore').get(),
  ]);

  const assignments: HomeworkAssignment[] = assignmentSnap.docs.map(doc => {
    const data = doc.data();
    const targets = Array.isArray(data.targetStudentIds) ? data.targetStudentIds.filter((id): id is string => typeof id === 'string') : [];
    return {
      id: doc.id,
      title: isoOf(data.title) || 'Bài giao',
      createdAt: isoOf(data.createdAt),
      ...(isoOf(data.dueAt) ? { dueAt: isoOf(data.dueAt) } : {}),
      periodic: Boolean(data.periodicTest),
      ...(targets.length > 0 ? { targetStudentIds: targets } : {}),
    };
  });

  const entries: HomeworkEntry[] = [];
  for (const doc of uploadSnap.docs) {
    const data = doc.data();
    if (typeof data.assignmentId !== 'string' || typeof data.studentId !== 'string') continue;
    const grade = isRecord(data.grade) ? data.grade : null;
    const score = grade && grade.awaitingClarification !== true ? numOf(grade.score) : null;
    entries.push({ assignmentId: data.assignmentId, studentId: data.studentId, submittedAt: isoOf(data.createdAt), score, maxScore: grade ? numOf(grade.maxScore) ?? 0 : 0 });
  }
  for (const doc of onlineSnap.docs) {
    const data = doc.data();
    if (typeof data.assignmentId !== 'string' || typeof data.studentId !== 'string' || data.status === 'in_progress') continue;
    const grade = isRecord(data.grade) ? data.grade : null;
    const graded = grade ? numOf(grade.score) : data.status === 'graded' ? numOf(data.totalScore) : null;
    const maxScore = (grade ? numOf(grade.maxScore) : null) ?? numOf(data.maxScore) ?? 0;
    entries.push({ assignmentId: data.assignmentId, studentId: data.studentId, submittedAt: isoOf(data.submittedAt) || isoOf(data.startedAt), score: graded, maxScore });
  }
  return { assignments, entries };
};

/** Sổ điểm kèm điểm tự tính từ bài nộp — bản trả về cho trình duyệt (xem `AutoScores`). */
export const readBookWithAuto = async (
  db: Db,
  classId: string,
  options: { studentIds: readonly string[]; onlyStudent?: string },
): Promise<ScoreBookDoc> => {
  const book = await readBook(db, classId);
  const { assignments, entries } = await loadHomeworkInputs(db, classId, options.onlyStudent);
  return { ...book, auto: computeAutoScores(book, assignments, entries, options.studentIds) };
};

/** Giáo viên: tính cho cả lớp hiện tại. */
const teacherBook = async (db: Db, context: { classId: string; classRef: FirebaseFirestore.DocumentReference }, book?: ScoreBookDoc): Promise<ScoreBookDoc> => {
  const studentIds = [...(await rosterIds(context.classRef))];
  const base = book ?? await readBook(db, context.classId);
  const { assignments, entries } = await loadHomeworkInputs(db, context.classId);
  return { ...base, auto: computeAutoScores(base, assignments, entries, studentIds) };
};

/** Mã học sinh đang có trong danh sách lớp — điểm của em đã rời lớp không được ghi mới. */
const rosterIds = async (classRef: FirebaseFirestore.DocumentReference): Promise<Set<string>> => {
  const snap = await classRef.collection('students').get();
  return new Set(snap.docs.map(d => d.id));
};

const newColumnId = (): string => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const handleTeacherScoreBook = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  res.status(200).json({ scoreBook: await teacherBook(db, context) });
};

/** Tạo mới hoặc sửa MỘT cột điểm hệ số 1 cùng điểm của cả lớp ở cột đó. Ô trống = xoá điểm. */
const handleSaveHs1Column = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const column = validateHs1Column(body.column);
  if ('error' in column) return void res.status(422).json({ error: column.error });
  const rawScores = isRecord(body.scores) ? Object.entries(body.scores) : [];
  if (rawScores.length > MAX_ROWS) return void res.status(422).json({ error: 'Quá nhiều dòng điểm.' });

  const parsed: Array<[string, number | null]> = [];
  for (const [studentId, raw] of rawScores) {
    const score = parseHs1Score(raw);
    if (score === undefined) return void res.status(422).json({ error: `Điểm "${String(raw)}" không hợp lệ — nhập số từ 0 đến 10, tối đa 2 chữ số lẻ.` });
    parsed.push([studentId, score]);
  }

  const rawWeight = isRecord(body.column) ? body.column.weight : undefined;
  const weight = parseHs1Weight(rawWeight);
  if (rawWeight !== undefined && !weight) return void res.status(422).json({ error: 'Hệ số chỉ có thể là 1, 2 hoặc 3.' });

  const book = await readBook(db, context.classId);
  const requestedId = typeof body.columnId === 'string' ? body.columnId.trim() : '';
  let columnId = requestedId;
  if (requestedId) {
    const existing = book.hs1Columns.find(c => c.id === requestedId);
    if (!existing) return void res.status(404).json({ error: 'Không tìm thấy cột điểm — có thể đã bị xoá.' });
    existing.label = column.label;
    existing.date = column.date;
    if (weight) existing.weight = weight;
  } else {
    if (!canAddHs1Column(book)) return void res.status(409).json({ error: 'Sổ điểm đã đủ số cột tối đa.' });
    columnId = newColumnId();
    book.hs1Columns.push({ id: columnId, label: column.label, date: column.date, weight: weight ?? 1 });
  }

  const roster = await rosterIds(context.classRef);
  for (const [studentId, score] of parsed) {
    if (!roster.has(studentId)) continue;
    const row = { ...(book.hs1[studentId] ?? {}) };
    if (score === null) delete row[columnId];
    else row[columnId] = score;
    book.hs1[studentId] = row;
  }
  await writeBook(db, book, context.uid);
  res.status(200).json({ saved: true, columnId, scoreBook: await teacherBook(db, context, book) });
};

const handleDeleteHs1Column = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const columnId = typeof body.columnId === 'string' ? body.columnId.trim() : '';
  const book = await readBook(db, context.classId);
  if (!book.hs1Columns.some(c => c.id === columnId)) return void res.status(404).json({ error: 'Không tìm thấy cột điểm.' });
  book.hs1Columns = book.hs1Columns.filter(c => c.id !== columnId);
  for (const row of Object.values(book.hs1)) delete row[columnId];
  await writeBook(db, book, context.uid);
  res.status(200).json({ deleted: true, scoreBook: await teacherBook(db, context, book) });
};

/**
 * Đưa các bài giao lên sổ: mỗi bài thành một cột liên kết sống kèm hệ số giáo viên chọn.
 * Bài đã có cột thì chỉ đổi hệ số (không tạo cột trùng). Bài kiểm tra định kì không đưa lên đây — điểm
 * chính thức của nó nằm ở file điểm.
 */
const handleLinkAssignments = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0 || items.length > 40) return void res.status(422).json({ error: 'Chọn từ 1 đến 40 bài để đưa lên sổ.' });

  const wanted = new Map<string, Hs1Weight>();
  for (const item of items) {
    const assignmentId = isRecord(item) && typeof item.assignmentId === 'string' ? item.assignmentId.trim() : '';
    const weight = isRecord(item) ? parseHs1Weight(item.weight) : undefined;
    if (!assignmentId || assignmentId.includes('/') || !weight) return void res.status(422).json({ error: 'Mỗi bài cần mã bài và hệ số 1, 2 hoặc 3.' });
    wanted.set(assignmentId, weight);
  }

  const snaps = await db.getAll(...[...wanted.keys()].map(id => db.collection('assignments').doc(id)));
  const book = await readBook(db, context.classId);
  let added = 0;
  for (const snap of snaps) {
    const data = snap.data();
    if (!snap.exists || !data || data.classId !== context.classId) return void res.status(404).json({ error: 'Có bài không thuộc lớp này hoặc đã bị xoá.' });
    if (data.periodicTest) return void res.status(422).json({ error: `"${String(data.title || 'Bài')}" là bài kiểm tra định kì — điểm chính thức lấy từ file điểm, không đưa lên đây.` });
    const weight = wanted.get(snap.id)!;
    const existing = book.hs1Columns.find(c => c.assignmentId === snap.id);
    if (existing) { existing.weight = weight; continue; }
    if (!canAddHs1Column(book)) return void res.status(409).json({ error: 'Sổ điểm đã đủ số cột tối đa.' });
    const label = typeof data.title === 'string' && data.title.trim() ? data.title.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, 80) : 'Bài giao';
    const due = typeof data.dueAt === 'string' ? data.dueAt : typeof data.createdAt === 'string' ? data.createdAt : '';
    const date = /^\d{4}-\d{2}-\d{2}/.test(due) ? due.slice(0, 10) : new Date().toISOString().slice(0, 10);
    book.hs1Columns.push({ id: newColumnId(), label, date, weight, assignmentId: snap.id });
    added += 1;
  }
  await writeBook(db, book, context.uid);
  res.status(200).json({ saved: true, added, scoreBook: await teacherBook(db, context, book) });
};

/** Chọn hệ số (1–3) cho các mốc thi MOET; mốc không có trong danh sách = không tính vào điểm trung bình. */
const handleSetExamWeights = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  if (!isRecord(body.weights)) return void res.status(422).json({ error: 'Thiếu hệ số các mốc thi.' });
  const weights: Record<string, Hs1Weight> = {};
  for (const [label, raw] of Object.entries(body.weights).slice(0, 40)) {
    if (raw === null || raw === 0 || raw === '') continue;
    const weight = parseHs1Weight(raw);
    if (!weight) return void res.status(422).json({ error: 'Hệ số chỉ có thể là 1, 2 hoặc 3.' });
    weights[label.slice(0, 80)] = weight;
  }
  const book = await readBook(db, context.classId);
  if (Object.keys(weights).length > 0) book.examWeights = weights; else delete book.examWeights;
  await writeBook(db, book, context.uid);
  res.status(200).json({ saved: true, scoreBook: await teacherBook(db, context, book) });
};

/**
 * Lưu điểm thi đã đọc từ file điểm của lớp (trình duyệt đọc bằng quyền Google của giáo viên).
 * THAY TOÀN BỘ phần điểm thi — file Sheet là nguồn gốc, sổ điểm chỉ là bản chép để học sinh xem được.
 */
const handleSaveExamScores = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  if (!isRecord(body.exams)) return void res.status(422).json({ error: 'Thiếu điểm thi.' });
  const entries = Object.entries(body.exams);
  if (entries.length > MAX_ROWS) return void res.status(422).json({ error: 'Quá nhiều dòng điểm.' });

  const roster = await rosterIds(context.classRef);
  const exams: ScoreBookDoc['exams'] = {};
  for (const [studentId, raw] of entries) {
    if (!roster.has(studentId)) continue;
    const clean = sanitizeExamScores(raw);
    if (clean.moet.length > 0 || clean.tds.length > 0) exams[studentId] = clean;
  }
  const book = await readBook(db, context.classId);
  book.exams = exams;
  book.examsSyncedAt = nowIso();
  const title = typeof body.spreadsheetTitle === 'string' ? body.spreadsheetTitle.trim().slice(0, 200) : '';
  if (title) book.examsSpreadsheetTitle = title;
  await writeBook(db, book, context.uid);
  res.status(200).json({ saved: true, studentCount: Object.keys(exams).length, scoreBook: await teacherBook(db, context, book) });
};

/** Học sinh xem sổ điểm của CHÍNH mình. */
const handleStudentScoreBook = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const idToken = typeof body.idToken === 'string' ? body.idToken : '';
  const uid = idToken ? await getAuth().verifyIdToken(idToken).then(d => d.uid).catch(() => null) : null;
  if (!uid) return void res.status(401).json({ error: 'Phiên đăng nhập học sinh không hợp lệ.' });
  const linkSnap = await db.collection('studentLinks').doc(uid).get();
  if (!linkSnap.exists) return void res.status(403).json({ error: 'Chỉ học sinh đã đăng nhập mới xem được bảng điểm.' });
  const link = linkSnap.data() as { classId?: unknown; studentId?: unknown };
  const classId = typeof link.classId === 'string' ? link.classId : '';
  const studentId = typeof link.studentId === 'string' ? link.studentId : '';
  if (!classId || !studentId) return void res.status(403).json({ error: 'Phiên học sinh thiếu thông tin lớp.' });
  const book = await readBookWithAuto(db, classId, { studentIds: [studentId], onlyStudent: studentId });
  res.status(200).json({ scores: studentScoreView(book, studentId) });
};

export const handleScoreBookAction = async (db: Db, body: Body, res: VercelResponse): Promise<boolean> => {
  const action = String(body.action || '');
  if (action === 'teacherScoreBook') { await handleTeacherScoreBook(db, body, res); return true; }
  if (action === 'saveHs1Column') { await handleSaveHs1Column(db, body, res); return true; }
  if (action === 'linkAssignments') { await handleLinkAssignments(db, body, res); return true; }
  if (action === 'setExamWeights') { await handleSetExamWeights(db, body, res); return true; }
  if (action === 'deleteHs1Column') { await handleDeleteHs1Column(db, body, res); return true; }
  if (action === 'saveExamScores') { await handleSaveExamScores(db, body, res); return true; }
  if (action === 'studentScoreBook') { await handleStudentScoreBook(db, body, res); return true; }
  return false;
};
