/**
 * Hồ sơ năng lực HS tự điền cùng GV — `competencyPortfolios/{classId}__{studentId}`, chỉ đi qua đây.
 * Học sinh: chỉ hồ sơ của CHÍNH mình (lớp + mã lấy từ `studentLinks`), chỉ sửa ô của HS.
 * Giáo viên thuộc lớp: xem/sửa hồ sơ từng em, sửa được mọi ô, thêm mức chốt + ý kiến.
 */
import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { teacherContext } from './_classroom-teacher.js';
import { asCompetencyGrade, type CompetencyGrade } from '../src/lib/classroom/competency/framework.js';
import {
  COMPETENCY_PORTFOLIOS_COL,
  mergePortfolio,
  normalizePortfolio,
  portfolioDocId,
  sanitizePortfolioPatch,
  type CompetencyPortfolioDoc,
} from '../src/lib/classroom/competency/studentPortfolio.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

const readPortfolio = async (db: Db, classId: string, studentId: string): Promise<CompetencyPortfolioDoc> => {
  const snap = await db.collection(COMPETENCY_PORTFOLIOS_COL).doc(portfolioDocId(classId, studentId)).get();
  return normalizePortfolio(classId, studentId, snap.exists ? snap.data() : null);
};

const savePatch = async (
  db: Db, classId: string, studentId: string, grade: CompetencyGrade,
  rawPatch: unknown, role: 'student' | 'teacher', uid: string,
): Promise<CompetencyPortfolioDoc | { error: string }> => {
  const patch = sanitizePortfolioPatch(rawPatch, grade, role);
  if (Object.keys(patch).length === 0) return { error: 'Không có nội dung hợp lệ để lưu.' };
  const current = await readPortfolio(db, classId, studentId);
  const next: CompetencyPortfolioDoc = {
    classId, studentId,
    entries: mergePortfolio(current.entries, patch),
    updatedAt: new Date().toISOString(), updatedBy: uid, updatedByRole: role,
  };
  await db.collection(COMPETENCY_PORTFOLIOS_COL).doc(portfolioDocId(classId, studentId)).set(next);
  return next;
};

/** Phiên học sinh → lớp, mã HS, khối. */
const studentSession = async (db: Db, body: Body, res: VercelResponse) => {
  const idToken = typeof body.idToken === 'string' ? body.idToken : '';
  const uid = idToken ? await getAuth().verifyIdToken(idToken).then(d => d.uid).catch(() => null) : null;
  if (!uid) { res.status(401).json({ error: 'Phiên đăng nhập học sinh không hợp lệ.' }); return null; }
  const link = (await db.collection('studentLinks').doc(uid).get()).data() as { classId?: unknown; studentId?: unknown } | undefined;
  const classId = typeof link?.classId === 'string' ? link.classId : '';
  const studentId = typeof link?.studentId === 'string' ? link.studentId : '';
  if (!classId || !studentId) { res.status(403).json({ error: 'Chỉ học sinh đã đăng nhập lớp mới dùng được hồ sơ năng lực.' }); return null; }
  const grade = asCompetencyGrade((await db.collection('classes').doc(classId).get()).data()?.grade);
  return { uid, classId, studentId, grade };
};

const handleStudentPortfolio = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const session = await studentSession(db, body, res);
  if (!session) return;
  res.status(200).json({ grade: session.grade, portfolio: await readPortfolio(db, session.classId, session.studentId) });
};

const handleSaveStudentPortfolio = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const session = await studentSession(db, body, res);
  if (!session) return;
  if (!session.grade) return void res.status(400).json({ error: 'Lớp chưa rõ khối 10/11/12 nên chưa dùng được hồ sơ năng lực.' });
  const saved = await savePatch(db, session.classId, session.studentId, session.grade, body.entries, 'student', session.uid);
  if ('error' in saved) return void res.status(422).json({ error: saved.error });
  res.status(200).json({ portfolio: saved });
};

/** GV: mã HS phải có trong danh sách lớp. */
const teacherStudent = async (db: Db, body: Body, res: VercelResponse) => {
  const context = await teacherContext(db, body, res);
  if (!context) return null;
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  if (!studentId || studentId.includes('/') || !(await context.classRef.collection('students').doc(studentId).get()).exists) {
    res.status(404).json({ error: 'Không tìm thấy học sinh trong lớp.' });
    return null;
  }
  return { ...context, studentId, grade: asCompetencyGrade(context.classData?.grade) };
};

const handleTeacherPortfolio = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const ctx = await teacherStudent(db, body, res);
  if (!ctx) return;
  res.status(200).json({ portfolio: await readPortfolio(db, ctx.classId, ctx.studentId) });
};

const handleSaveTeacherPortfolio = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const ctx = await teacherStudent(db, body, res);
  if (!ctx) return;
  if (!ctx.grade) return void res.status(400).json({ error: 'Lớp chưa rõ khối 10/11/12 nên chưa dùng được hồ sơ năng lực.' });
  const saved = await savePatch(db, ctx.classId, ctx.studentId, ctx.grade, body.entries, 'teacher', ctx.uid);
  if ('error' in saved) return void res.status(422).json({ error: saved.error });
  res.status(200).json({ portfolio: saved });
};

export const handlePortfolioAction = async (db: Db, body: Body, res: VercelResponse): Promise<boolean> => {
  const action = String(body.action || '');
  if (action === 'studentPortfolio') { await handleStudentPortfolio(db, body, res); return true; }
  if (action === 'saveStudentPortfolio') { await handleSaveStudentPortfolio(db, body, res); return true; }
  if (action === 'teacherPortfolio') { await handleTeacherPortfolio(db, body, res); return true; }
  if (action === 'saveTeacherPortfolio') { await handleSaveTeacherPortfolio(db, body, res); return true; }
  return false;
};
