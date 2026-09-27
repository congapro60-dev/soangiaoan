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
  normalizeScoreBook,
  parseHs1Score,
  sanitizeExamScores,
  studentScoreView,
  validateHs1Column,
  type ScoreBookDoc,
} from '../src/lib/classroom/scoreBook.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

const MAX_ROWS = 300;

const nowIso = (): string => new Date().toISOString();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readBook = async (db: Db, classId: string): Promise<ScoreBookDoc> => {
  const snap = await db.collection(SCORE_BOOKS_COL).doc(classId).get();
  return normalizeScoreBook(classId, snap.exists ? snap.data() : null);
};

const writeBook = async (db: Db, book: ScoreBookDoc, uid: string): Promise<void> => {
  await db.collection(SCORE_BOOKS_COL).doc(book.classId).set({ ...book, updatedAt: nowIso(), updatedBy: uid });
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
  res.status(200).json({ scoreBook: await readBook(db, context.classId) });
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

  const book = await readBook(db, context.classId);
  const requestedId = typeof body.columnId === 'string' ? body.columnId.trim() : '';
  let columnId = requestedId;
  if (requestedId) {
    const existing = book.hs1Columns.find(c => c.id === requestedId);
    if (!existing) return void res.status(404).json({ error: 'Không tìm thấy cột điểm — có thể đã bị xoá.' });
    existing.label = column.label;
    existing.date = column.date;
  } else {
    if (!canAddHs1Column(book)) return void res.status(409).json({ error: 'Sổ điểm đã đủ số cột tối đa.' });
    columnId = newColumnId();
    book.hs1Columns.push({ id: columnId, label: column.label, date: column.date });
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
  res.status(200).json({ saved: true, columnId, scoreBook: book });
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
  res.status(200).json({ deleted: true, scoreBook: book });
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
  res.status(200).json({ saved: true, studentCount: Object.keys(exams).length, scoreBook: book });
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
  res.status(200).json({ scores: studentScoreView(await readBook(db, classId), studentId) });
};

export const handleScoreBookAction = async (db: Db, body: Body, res: VercelResponse): Promise<boolean> => {
  const action = String(body.action || '');
  if (action === 'teacherScoreBook') { await handleTeacherScoreBook(db, body, res); return true; }
  if (action === 'saveHs1Column') { await handleSaveHs1Column(db, body, res); return true; }
  if (action === 'deleteHs1Column') { await handleDeleteHs1Column(db, body, res); return true; }
  if (action === 'saveExamScores') { await handleSaveExamScores(db, body, res); return true; }
  if (action === 'studentScoreBook') { await handleStudentScoreBook(db, body, res); return true; }
  return false;
};
