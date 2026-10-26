/**
 * Sổ điểm của lớp — `scoreBooks/{classId}`, chỉ đi qua đây (rules mặc định chặn client).
 *
 * Giáo viên thuộc lớp: xem cả sổ, nhập/xoá cột điểm hệ số 1, lưu điểm thi đã đồng bộ từ file điểm.
 * Học sinh: chỉ nhận dòng của chính mình, xác định từ phiên `studentLinks` — không nhận studentId từ client.
 */
import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { handleScoreBookStream } from './_score-book-stream.js';
import { teacherContext } from './_classroom-teacher.js';
import { classMemberId, deriveClassAccess, memberFromData } from './_classroom-access.js';
import { isOnlineAttemptOfficial } from '../src/lib/classroom/onlineGradeLifecycle.js';
import {
  SCORE_BOOKS_COL,
  canAddHs1Column,
  computeAutoScores,
  columnScore,
  examColumnDisplayLabels,
  mergePaperExams,
  applyExamOverrides,
  normalizeScoreBook,
  parseHs1Score,
  parseHs1Weight,
  sanitizeExamScores,
  storedExams,
  studentScoreView,
  validateHs1Column,
  type HomeworkAssignment,
  type HomeworkEntry,
  type Hs1Weight,
  type ScoreBookDoc,
} from '../src/lib/classroom/scoreBook.js';
import { examLabelKey } from '../src/lib/classroom/examScores.js';

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
  // Điểm ghép từ ảnh chấm tay đã nằm ở `paperExams` — không chép vào `exams` (đồng bộ file điểm thay `exams` cả khối).
  await db.collection(SCORE_BOOKS_COL).doc(book.classId).set({ ...stored, exams: storedExams(book.exams), updatedAt: nowIso(), updatedBy: uid });
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
  transaction?: FirebaseFirestore.Transaction,
): Promise<{ assignments: HomeworkAssignment[]; entries: HomeworkEntry[] }> => {
  const scoped = (name: string) => {
    const base = db.collection(name).where('classId', '==', classId);
    return studentId ? base.where('studentId', '==', studentId) : base;
  };
  const read = (source: FirebaseFirestore.Query) => transaction ? transaction.get(source) : source.get();
  const [assignmentSnap, uploadSnap, onlineSnap] = await Promise.all([
    read(db.collection('assignments').where('classId', '==', classId).select('title', 'createdAt', 'dueAt', 'periodicTest', 'targetStudentIds')),
    read(scoped('submissions').select('assignmentId', 'studentId', 'createdAt', 'grade.score', 'grade.maxScore', 'grade.gradedAt', 'grade.awaitingClarification', 'grade.teacherApproved')),
    read(scoped('examSubmissions').select('assignmentId', 'studentId', 'status', 'gradeState', 'startedAt', 'submittedAt', 'totalScore', 'maxScore', 'grade.score', 'grade.maxScore', 'grade.gradedAt', 'grade.teacherApproved')),
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
      ...(data.periodicTest ? { periodicLabel: (isRecord(data.periodicTest) ? isoOf(data.periodicTest.sheetLabel).trim() : '') || isoOf(data.title) } : {}),
      ...(targets.length > 0 ? { targetStudentIds: targets } : {}),
    };
  });

  const entries: HomeworkEntry[] = [];
  for (const doc of uploadSnap.docs) {
    const data = doc.data();
    if (typeof data.assignmentId !== 'string' || typeof data.studentId !== 'string') continue;
    const grade = isRecord(data.grade) ? data.grade : null;
    // Cổng học sinh / phụ huynh (`studentId` có) chỉ nhận điểm ĐÃ DUYỆT: điểm máy chấm chưa được thầy cô duyệt (kể cả bài còn
    // câu chờ em xác nhận) không được lọt ra qua điểm trung bình hay bảng điểm. Giáo viên vẫn thấy mọi điểm đã chấm.
    const visible = grade && (studentId ? grade.teacherApproved === true : grade.teacherApproved === true || grade.awaitingClarification !== true);
    const score = visible ? numOf(grade.score) : null;
    entries.push({ assignmentId: data.assignmentId, studentId: data.studentId, submittedAt: isoOf(data.createdAt), score, maxScore: grade ? numOf(grade.maxScore) ?? 0 : 0, approved: grade?.teacherApproved === true, gradedAt: isoOf(grade?.gradedAt) });
  }
  for (const doc of onlineSnap.docs) {
    const data = doc.data();
    if (typeof data.assignmentId !== 'string' || typeof data.studentId !== 'string' || data.status === 'in_progress') continue;
    const grade = isRecord(data.grade) ? data.grade : null;
    // Như bài ảnh: cổng học sinh / phụ huynh chỉ nhận điểm đề online đã CHÍNH THỨC (xem `hideUnofficialOnlineScore`).
    const official = isOnlineAttemptOfficial({
      status: data.status,
      gradeState: data.gradeState,
      grade: grade ? { teacherApproved: grade.teacherApproved === true } as never : undefined,
    });
    const graded = studentId && !official ? null : grade ? numOf(grade.score) : data.status === 'graded' ? numOf(data.totalScore) : null;
    const maxScore = (grade ? numOf(grade.maxScore) : null) ?? numOf(data.maxScore) ?? 0;
    entries.push({ assignmentId: data.assignmentId, studentId: data.studentId, submittedAt: isoOf(data.submittedAt) || isoOf(data.startedAt), score: graded, maxScore, approved: official, gradedAt: isoOf(grade?.gradedAt) });
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

/** Lưu đúng ô đang sửa; kiểm giá trị cũ và ghi nguyên lô trong transaction. */
const handleSaveScoreCells = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const cells = body.cells;
  if (!Array.isArray(cells) || cells.length === 0 || cells.length > MAX_ROWS * 60
    || cells.some(cell => !isRecord(cell) || !['hs1', 'moet'].includes(String(cell.kind))
      || typeof cell.studentId !== 'string' || typeof cell.key !== 'string'
      || !(cell.score === null || typeof cell.score === 'number') || parseHs1Score(cell.score) === undefined
      || !(cell.previous === null || typeof cell.previous === 'number') || parseHs1Score(cell.previous) === undefined)) {
    return void res.status(422).json({ error: 'Ô điểm không hợp lệ — nhập điểm 0–10, tối đa 2 chữ số lẻ.' });
  }
  const ref = db.collection(SCORE_BOOKS_COL).doc(context.classId);
  let issue: { status: number; message: string } | undefined;
  await db.runTransaction(async tx => {
    issue = undefined;
    const [snap, inputs, students, classroom, membership] = await Promise.all([
      tx.get(ref), loadHomeworkInputs(db, context.classId, undefined, tx), tx.get(context.classRef.collection('students')),
      tx.get(context.classRef), tx.get(db.collection('classMembers').doc(classMemberId(context.classId, context.uid))),
    ]);
    if (!classroom.exists || !deriveClassAccess(classroom.data() ?? {}, memberFromData(membership.data()), context.uid)) {
      issue = { status: 403, message: 'Không còn quyền sửa điểm lớp này.' }; return;
    }
    const roster = new Set(students.docs.map(doc => doc.id));
    const book = normalizeScoreBook(context.classId, snap.exists ? snap.data() : null);
    const view = { ...book, auto: computeAutoScores(book, inputs.assignments, inputs.entries, [...roster]) };
    const seen = new Set<string>();
    const stamp = nowIso();
    for (const cell of cells) {
      const { studentId, key, score, previous, kind } = cell;
      const id = JSON.stringify([studentId, kind, key]);
      if (!roster.has(studentId) || seen.has(id)) { issue = { status: 422, message: 'Học sinh ngoài lớp hoặc ô điểm bị lặp.' }; return; }
      seen.add(id);
      if (kind === 'hs1') {
        const column = book.hs1Columns.find(c => c.id === key);
        if (!column) { issue = { status: 409, message: 'Cột điểm đã thay đổi. Kiểm tra lại bảng điểm.' }; return; }
        if ((columnScore(view, column, studentId) ?? null) !== previous) { issue = { status: 409, message: 'Điểm vừa thay đổi ở cửa sổ khác. Bản nháp được giữ; kiểm tra điểm mới trước khi lưu.' }; return; }
        const row = { ...(book.hs1[studentId] ?? {}) };
        if (score === null) delete row[key]; else row[key] = score;
        book.hs1[studentId] = row;
      } else {
        const sourceKey = Object.entries(book.examColumnLabels ?? {}).find(([, label]) => label === key)?.[0] ?? examLabelKey(key);
        const labels = examColumnDisplayLabels(view);
        const moetKeys = new Set([...(book.examColumns?.moet ?? []), ...Object.values(book.exams).flatMap(row => row.moet.map(mark => mark.label)), ...Object.values(view.auto.periodicLabels ?? {})].map(examLabelKey));
        if (!moetKeys.has(sourceKey) || !labels.some(label => label === key) || (book.hiddenExamColumns ?? []).includes(sourceKey)) { issue = { status: 409, message: 'Cột thi đã thay đổi. Kiểm tra lại bảng điểm.' }; return; }
        const mark = studentScoreView(view, studentId).exams.moet.find(mark => mark.label === key || examLabelKey(mark.label) === sourceKey);
        if ((mark?.score ?? null) !== previous) { issue = { status: 409, message: 'Điểm thi vừa thay đổi. Bản nháp được giữ; kiểm tra điểm mới trước khi lưu.' }; return; }
        book.examOverrides = { ...(book.examOverrides ?? {}), [studentId]: { ...(book.examOverrides?.[studentId] ?? {}), [sourceKey]: { label: key, score, updatedAt: stamp } } };
      }
    }
    const { auto: _auto, ...stored } = snap.data() ?? {};
    tx.set(ref, { ...stored, classId: context.classId, hs1: book.hs1, examOverrides: book.examOverrides ?? {}, updatedAt: stamp, updatedBy: context.uid });
  });
  if (issue) return void res.status(issue.status).json({ error: issue.message });
  res.status(200).json({ saved: true, scoreBook: await teacherBook(db, context) });
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

const handleLinkPeriodicAssignments = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0 || items.length > 40) return void res.status(422).json({ error: 'Chọn ít nhất một bài đã nộp và cột định kì.' });
  const wanted = new Map<string, string>();
  for (const item of items) {
    const assignmentId = isRecord(item) && typeof item.assignmentId === 'string' ? item.assignmentId.trim() : '';
    const examKey = isRecord(item) && typeof item.examKey === 'string' ? item.examKey.trim() : '';
    if (!assignmentId || assignmentId.includes('/') || !examKey) return void res.status(422).json({ error: 'Bài và cột định kì không hợp lệ.' });
    wanted.set(examKey, assignmentId);
  }
  const snapshots = await db.getAll(...[...wanted.values()].map(id => db.collection('assignments').doc(id)));
  const book = await readBook(db, context.classId);
  const allowedKeys = new Set([...(book.examColumns?.moet ?? []), ...(book.examColumns?.tds ?? [])].map(examLabelKey));
  const links = { ...(book.periodicAssignmentLinks ?? {}) };
  for (const snap of snapshots) {
    const data = snap.data();
    if (!snap.exists || !data || data.classId !== context.classId) return void res.status(404).json({ error: 'Có bài không thuộc lớp này hoặc đã bị xóa.' });
    const key = [...wanted.entries()].find(([, id]) => id === snap.id)?.[0] ?? '';
    if (!allowedKeys.has(key)) return void res.status(422).json({ error: 'Cột định kì phải là cột đã đọc từ file MOET/TDS.' });
    const existing = links[key];
    if (existing && existing !== snap.id) return void res.status(409).json({ error: 'Cột định kì này đã liên kết với một bài khác.' });
    links[key] = snap.id;
  }
  book.periodicAssignmentLinks = links;
  await writeBook(db, book, context.uid);
  res.status(200).json({ saved: true, scoreBook: await teacherBook(db, context, book) });
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
  book.exams = applyExamOverrides(mergePaperExams(exams, book.paperExams ?? {}), book.examOverrides ?? {});
  if (isRecord(body.columns)) {
    book.examColumns = {
      moet: Array.isArray(body.columns.moet) ? body.columns.moet.filter((v): v is string => typeof v === 'string').slice(0, 40) : [],
      tds: Array.isArray(body.columns.tds) ? body.columns.tds.filter((v): v is string => typeof v === 'string').slice(0, 40) : [],
    };
  }
  book.examsSyncedAt = nowIso();
  const title = typeof body.spreadsheetTitle === 'string' ? body.spreadsheetTitle.trim().slice(0, 200) : '';
  if (title) book.examsSpreadsheetTitle = title;
  await writeBook(db, book, context.uid);
  res.status(200).json({ saved: true, studentCount: Object.keys(exams).length, scoreBook: await teacherBook(db, context, book) });
};

/** Sửa/xóa điểm thi trong sổ. Không ghi ngược Google Sheet; lần đồng bộ sau vẫn tôn trọng override. */
const handleSaveExamColumn = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const label = typeof body.label === 'string' ? body.label.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, 80) : '';
  const scores = isRecord(body.scores) ? body.scores : {};
  const kind = body.kind === 'moet' || body.kind === 'tds' || body.kind === 'both' ? body.kind : undefined;
  if (!label || (!kind && !isRecord(body.scores))) return void res.status(422).json({ error: 'Thiếu tên mốc hoặc bảng điểm.' });
  const key = examLabelKey(label);
  const book = await readBook(db, context.classId);
  if (kind) {
    // Hàng rào: một mốc thi chỉ có một cột. Tạo cột mới khi mốc đã có là sinh cột trùng (vụ "Thi GHKI" vs "Giữa học kì I").
    const existing = [...(book.examColumns?.moet ?? []), ...(book.examColumns?.tds ?? [])].find(item => examLabelKey(item) === key);
    if (existing) return void res.status(422).json({ error: `Mốc "${existing}" đã có trong sổ điểm. Sửa hoặc xoá cột cũ thay vì tạo cột mới.` });
    const examColumns = {
      moet: [...(book.examColumns?.moet ?? [])],
      tds: [...(book.examColumns?.tds ?? [])],
    };
    // Cột nhập tay luôn thuộc nhóm MOET (điểm sửa tay đều nằm ở moet) — đẩy vào cả hai nhóm sẽ sinh cột kép.
    const targets: Array<'moet' | 'tds'> = kind === 'both' ? ['moet'] : [kind];
    for (const target of targets) {
      if (!examColumns[target].some(existing => examLabelKey(existing) === key)) examColumns[target].push(label);
    }
    book.examColumns = examColumns;
  }
  const overrides = { ...(book.examOverrides ?? {}) };
  const roster = await rosterIds(context.classRef);
  // Mốc thời gian để biết ô nào sửa SAU lần đồng bộ Sheet gần nhất (gợi ý đẩy lên Sheet).
  const editedAt = nowIso();
  for (const [studentId, raw] of Object.entries(scores)) {
    if (!roster.has(studentId)) continue;
    const score = raw === null || raw === '' ? null : Number(raw);
    if (!(score === null || (Number.isFinite(score) && score >= 0 && score <= 10))) return void res.status(422).json({ error: 'Điểm phải từ 0 đến 10.' });
    overrides[studentId] = { ...(overrides[studentId] ?? {}), [key]: { label, score, updatedAt: editedAt } };
  }
  // An empty cell means "use the current Sheet/paper value" for that student.
  // Only persist an override when it differs from that current source.
  for (const [studentId, raw] of Object.entries(scores)) {
    if (!roster.has(studentId)) continue;
    const score = raw === null || raw === '' ? null : Number(raw);
    const current = book.exams[studentId]?.moet.find(mark => examLabelKey(mark.label) === key)
      ?? book.exams[studentId]?.tds.find(mark => examLabelKey(mark.label) === key);
    if (score === (current?.score ?? null)) delete overrides[studentId]?.[key];
  }
  book.examOverrides = overrides;
  book.exams = applyExamOverrides(book.exams, overrides);
  await writeBook(db, book, context.uid);
  res.status(200).json({ saved: true, scoreBook: await teacherBook(db, context, book) });
};

/** Đổi tên hoặc ẩn một cột thi trong sổ; dữ liệu nguồn Google Sheet giữ nguyên. */
const handleSaveExamColumnSettings = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const sourceLabel = typeof body.label === 'string' ? body.label.trim() : '';
  let key = examLabelKey(sourceLabel);
  if (!sourceLabel || !key) return void res.status(422).json({ error: 'Thiếu tên mốc thi.' });
  const book = await readBook(db, context.classId);
  key = Object.entries(book.examColumnLabels ?? {}).find(([storedKey, shown]) => storedKey === key || examLabelKey(shown) === key)?.[0] ?? key;
  const nextLabel = typeof body.newLabel === 'string' ? body.newLabel.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, 80) : '';
  if (body.newLabel !== undefined && !nextLabel) return void res.status(422).json({ error: 'Tên cột không được để trống.' });
  const labels = { ...(book.examColumnLabels ?? {}) };
  if (typeof body.newLabel === 'string') {
    if (nextLabel && nextLabel !== sourceLabel) labels[key] = nextLabel;
    else delete labels[key];
  }
  book.examColumnLabels = labels;
  const hidden = new Set((book.hiddenExamColumns ?? []).map(examLabelKey));
  if (body.hidden === true) hidden.add(key); else hidden.delete(key);
  book.hiddenExamColumns = [...hidden];
  await writeBook(db, book, context.uid);
  res.status(200).json({ saved: true, scoreBook: await teacherBook(db, context, book) });
};

/**
 * Thầy cô xác nhận điểm đã chấm tay (máy đọc từ ảnh bài kiểm tra định kì, thầy cô soát lại) để đưa vào sổ điểm.
 * Lưu ở `paperExams`; cột đã có điểm từ file điểm thì file điểm vẫn thắng. `score: null` = gỡ điểm này.
 */
const handleConfirmPaperExamScore = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const studentId = typeof body.studentId === 'string' ? body.studentId : '';
  const assignmentId = typeof body.assignmentId === 'string' ? body.assignmentId : '';
  const label = typeof body.label === 'string' ? body.label.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, 80) : '';
  const score = body.score === null ? null : parseHs1Score(body.score);
  if (!studentId || !assignmentId || !label || score === undefined) return void res.status(422).json({ error: 'Thiếu học sinh, bài, tên cột hoặc điểm (0–10).' });
  if (!(await rosterIds(context.classRef)).has(studentId)) return void res.status(404).json({ error: 'Học sinh không thuộc lớp này.' });
  const assignment = (await db.collection('assignments').doc(assignmentId).get()).data();
  if (!assignment || assignment.classId !== context.classId || !assignment.periodicTest) return void res.status(422).json({ error: 'Chỉ bài kiểm tra định kì của lớp này mới đưa điểm chấm tay vào sổ.' });
  const book = await readBook(db, context.classId);
  const paperExams = { ...(book.paperExams ?? {}) };
  const key = examLabelKey(label);
  const others = (paperExams[studentId] ?? []).filter(mark => examLabelKey(mark.label) !== key);
  paperExams[studentId] = score === null ? others : [...others, { label, score, assignmentId, confirmedAt: nowIso() }];
  book.paperExams = paperExams;
  book.exams = applyExamOverrides(mergePaperExams(book.exams, paperExams), book.examOverrides ?? {});
  await writeBook(db, book, context.uid);
  res.status(200).json({ saved: true, scoreBook: await teacherBook(db, context, book) });
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
  if (action === 'teacherScoreBookStream' || action === 'studentScoreBookStream') { await handleScoreBookStream(db, body, res); return true; }
  if (action === 'teacherScoreBook') { await handleTeacherScoreBook(db, body, res); return true; }
  if (action === 'saveScoreCells') { await handleSaveScoreCells(db, body, res); return true; }
  if (action === 'saveHs1Column') { await handleSaveHs1Column(db, body, res); return true; }
  if (action === 'linkAssignments') { await handleLinkAssignments(db, body, res); return true; }
  if (action === 'linkPeriodicAssignments') { await handleLinkPeriodicAssignments(db, body, res); return true; }
  if (action === 'setExamWeights') { await handleSetExamWeights(db, body, res); return true; }
  if (action === 'deleteHs1Column') { await handleDeleteHs1Column(db, body, res); return true; }
  if (action === 'saveExamScores') { await handleSaveExamScores(db, body, res); return true; }
  if (action === 'saveExamColumn') { await handleSaveExamColumn(db, body, res); return true; }
  if (action === 'saveExamColumnSettings') { await handleSaveExamColumnSettings(db, body, res); return true; }
  if (action === 'confirmPaperExamScore') { await handleConfirmPaperExamScore(db, body, res); return true; }
  if (action === 'studentScoreBook') { await handleStudentScoreBook(db, body, res); return true; }
  return false;
};
