/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDb, gradeSubmissionCore, stripAnswerKey, type CoreAnswer, type CoreQuestion } from './_exam-core.js';
import { getAuth } from 'firebase-admin/auth';
import { createHash, timingSafeEqual } from 'node:crypto';
import { getBearerToken } from './_ai-gateway-core.js';

/**
 * Giới hạn tần suất tìm mã đề THEO IP, đếm chung trên Firestore (`rateLimits/{ipHash_phút}`) — bộ đếm trong bộ nhớ
 * từng dùng ở đây không có tác dụng trên Vercel (mỗi instance / cold start đếm lại từ 0).
 * Ngưỡng rộng vì cả trường dùng chung một IP mạng; lỗi Firestore thì cho qua (không chặn học sinh vào thi).
 * Doc có `expireAt` để bật TTL policy của Firestore dọn tự động.
 */
const RATE_LIMIT_MAX = 300;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // mỗi phút

export const examPasswordMatches = (stored: unknown, supplied: unknown): boolean => {
  if (typeof stored !== 'string' || stored.length === 0 || typeof supplied !== 'string') return false;
  const left = Buffer.from(stored);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
};

const checkRateLimit = async (db: FirebaseFirestore.Firestore, ip: string, now = Date.now()): Promise<boolean> => {
  const window = Math.floor(now / RATE_LIMIT_WINDOW_MS);
  const key = `${createHash('sha256').update(ip).digest('hex').slice(0, 24)}_${window}`;
  const ref = db.collection('rateLimits').doc(key);
  try {
    return await db.runTransaction(async tx => {
      const count = Number((await tx.get(ref)).data()?.count) || 0;
      if (count >= RATE_LIMIT_MAX) return false;
      tx.set(ref, { count: count + 1, scope: 'exam-code', expireAt: new Date((window + 2) * RATE_LIMIT_WINDOW_MS) });
      return true;
    });
  } catch (error) {
    console.warn('[exam] không đếm được lượt tìm mã đề, cho qua', error);
    return true;
  }
};

// Một hàm phục vụ cả 2 việc để không vượt giới hạn số Serverless Function:
//   GET  ?code=ABC   → đề đang phát hành, ĐÃ LƯỢC correctAnswer/explanation (học sinh vào làm)
//   GET  ?examId=xxx → đề theo id, đã lược (trang kết quả/xem lại)
//   GET  ?submissionId=xxx → kết quả một bài làm theo link kết quả (thí sinh tự do, không gắn lớp)
//   POST { submissionId } → chấm bài bằng đáp án gốc (admin), nhúng đáp án khi allowReview
//
// Chống xem đáp án qua DevTools: rules cấm học sinh đọc doc đề trực tiếp; API này dùng admin SDK
// và chỉ trả phần đã lược. Fail-safe: nếu POST lỗi, bài vẫn ở 'submitted' và giáo viên tự xác minh.

const handleGet = async (req: VercelRequest, res: VercelResponse) => {
  const submissionId = typeof req.query.submissionId === 'string' ? req.query.submissionId.trim() : '';
  if (submissionId) return safeId(submissionId) ? handleGetResult(submissionId, res) : res.status(400).json({ error: 'Mã bài làm không hợp lệ.' });
  const code = typeof req.query.code === 'string' ? req.query.code.trim().toUpperCase() : '';
  const examId = typeof req.query.examId === 'string' ? req.query.examId.trim() : '';
  const proofSubmissionId = typeof req.query.proofSubmissionId === 'string' ? req.query.proofSubmissionId.trim() : '';
  if (!code && !examId) {
    return res.status(400).json({ error: 'Thiếu tham số code hoặc examId' });
  }
  if (examId && !safeId(examId) || code && !/^[A-Z0-9_-]{3,32}$/.test(code)) return res.status(400).json({ error: 'Mã đề không hợp lệ.' });
  if (!examId) {
    const forwarded = req.headers?.['x-vercel-forwarded-for'] || req.headers?.['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress || 'unknown').slice(0, 100);
    if (!await checkRateLimit(getAdminDb(), ip)) return res.status(429).json({ error: 'Quá nhiều lượt tìm mã đề, vui lòng thử lại sau.' });
  }

  const db = getAdminDb();
  let examData: any = null;

  if (examId) {
    const snap = await db.collection('exams').doc(examId).get();
    if (snap.exists) examData = snap.data();
  } else {
    const query = await db.collection('exams')
      .where('code', '==', code)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    if (!query.empty) examData = query.docs[0].data();
  }

  if (!examData) {
    return res.status(404).json({ error: 'Không tìm thấy đề thi' });
  }

  if (examId && typeof examData.password === 'string' && examData.password.length > 0) {
    if (!safeId(proofSubmissionId)) return res.status(403).json({ error: 'Cần bài nộp hợp lệ để xem lại đề thi.' });
    const proof = await getAdminDb().collection('examSubmissions').doc(proofSubmissionId).get();
    const proofData = proof.exists ? proof.data() : undefined;
    if (!proofData || proofData.examId !== examId || !['submitted', 'graded'].includes(String(proofData.status))) {
      return res.status(403).json({ error: 'Bài nộp không hợp lệ cho đề thi này.' });
    }
  }

  if (code && typeof examData.password === 'string' && examData.password.length > 0 && !examPasswordMatches(examData.password, req.query.password)) {
    const { questions: _questions, password: _password, id: _id, ...examMeta } = examData;
    return res.status(200).json({
      passwordRequired: true,
      exam: { ...examMeta, questions: [], passwordRequired: true },
    });
  }

  const publicExam = {
    ...examData,
    questions: Array.isArray(examData.questions) ? examData.questions.map(stripAnswerKey) : [],
  };
  delete publicExam.password;

  res.setHeader('Cache-Control', 'public, max-age=15, s-maxage=30');
  return res.status(200).json({ exam: publicExam });
};

const RESULT_LEADERBOARD_SIZE = 10;
const safeId = (value: string): boolean => Boolean(value) && value.length <= 150 && !value.includes('/');
class ExamRequestError extends Error { constructor(readonly statusCode: number, message: string) { super(message); } }

/** Đề cho hiện điểm chưa: theo cài đặt "Hiện kết quả khi nào" của giáo viên — máy chủ quyết, không để trình duyệt tự quyết. */
export const canShowExamResult = (exam: Record<string, any>, submission: Record<string, any>, nowMs: number): boolean => {
  const showWhen = exam.showResultWhen ?? 'submit';
  const endMs = exam.endAt ? Date.parse(String(exam.endAt)) : NaN;
  const examEnded = Number.isFinite(endMs) && nowMs > endMs;
  return showWhen === 'submit' || (showWhen === 'all_done' && (examEnded || exam.isActive === false));
};

/**
 * Bản bài làm gửi về trang kết quả: chưa tới lúc hiện điểm thì bỏ điểm (tổng + từng câu); đề không cho xem lại thì bỏ
 * đáp án/giải thích. Không trả nonce, ghi chú nội bộ hay dữ liệu chấm của giáo viên.
 */
export const publicResultProjection = (id: string, submission: Record<string, any>, exam: Record<string, any>, nowMs: number) => {
  const showScore = canShowExamResult(exam, submission, nowMs) && (submission.status === 'graded' || Boolean(submission.publicAutoGradedAt));
  const allowReview = showScore && Boolean(exam.allowReview);
  const answers = (Array.isArray(submission.answers) ? submission.answers : [])
    .filter((item: unknown): item is Record<string, any> => Boolean(item && typeof item === 'object'))
    .map((item: Record<string, any>) => ({
      questionId: String(item.questionId ?? ''),
      answer: String(item.answer ?? ''),
      ...(showScore && typeof item.autoScore === 'number' ? { autoScore: item.autoScore } : {}),
      ...(showScore && typeof item.aiScore === 'number' ? { aiScore: item.aiScore } : {}),
      ...(allowReview && typeof item.aiFeedback === 'string' ? { aiFeedback: item.aiFeedback } : {}),
      ...(allowReview && item.correctAnswer !== undefined ? { correctAnswer: item.correctAnswer } : {}),
      ...(allowReview && item.explanation !== undefined ? { explanation: item.explanation } : {}),
    }));
  return {
    id,
    examId: String(submission.examId ?? ''),
    examCode: String(submission.examCode ?? ''),
    studentName: String(submission.studentName ?? ''),
    studentClass: String(submission.studentClass ?? ''),
    startedAt: String(submission.startedAt ?? ''),
    ...(submission.submittedAt ? { submittedAt: String(submission.submittedAt) } : {}),
    status: submission.status === 'graded' ? 'graded' : 'submitted',
    maxScore: typeof submission.maxScore === 'number' ? submission.maxScore : 0,
    answers,
    ...(showScore && typeof submission.totalScore === 'number' ? { totalScore: submission.totalScore } : {}),
    ...(showScore ? {} : { resultHidden: true }),
  };
};

/**
 * Trang kết quả / xem lại của thí sinh tự do. Firestore không cho ai ngoài giáo viên chủ đề đọc bài làm, nên trang này đọc qua đây.
 * Bài trong lớp (có classId/assignmentId) không xem ở đây — em xem ở cổng học sinh, nơi điểm chỉ hiện sau khi thầy cô duyệt.
 */
const handleGetResult = async (submissionId: string, res: VercelResponse) => {
  const db = getAdminDb();
  const subSnap = await db.collection('examSubmissions').doc(submissionId).get();
  const submission = subSnap.exists ? subSnap.data() as Record<string, any> : null;
  if (!submission || submission.status === 'in_progress' || !submission.examId) {
    return res.status(404).json({ error: 'Không tìm thấy bài làm' });
  }
  if (submission.classId || submission.assignmentId) {
    return res.status(403).json({ error: 'Bài này làm trong lớp — em xem kết quả ở cổng học sinh của lớp.' });
  }
  const examSnap = await db.collection('exams').doc(String(submission.examId)).get();
  if (!examSnap.exists) return res.status(404).json({ error: 'Không tìm thấy đề thi của bài làm' });
  const exam = examSnap.data() as Record<string, any>;
  const nowMs = Date.now();
  const projected = publicResultProjection(submissionId, submission, exam, nowMs);

  let leaderboard: { isMe: boolean; studentName: string; studentClass: string; totalScore: number }[] = [];
  let leaderboardLimited = false;
  if (!projected.resultHidden && !exam.hideLeaderboard) {
    // ponytail: legacy public/class attempts share a collection; scan at most 500 ordered candidates.
    const query = db.collection('examSubmissions')
      .where('examId', '==', String(submission.examId))
      .orderBy('totalScore', 'desc').limit(100);
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    for (let page = 0; page < 5; page++) {
      const snap = await (cursor ? query.startAfter(cursor) : query).get();
      for (const doc of snap.docs) {
        const data = doc.data();
        if (!['graded', 'submitted'].includes(data.status) || data.status !== 'graded' && !data.publicAutoGradedAt || !Number.isFinite(data.totalScore) || data.classId || data.assignmentId) continue;
        leaderboard.push({ isMe: doc.id === submissionId, studentName: String(data.studentName ?? ''), studentClass: String(data.studentClass ?? ''), totalScore: data.totalScore });
        if (leaderboard.length === RESULT_LEADERBOARD_SIZE) break;
      }
      if (leaderboard.length === RESULT_LEADERBOARD_SIZE || snap.docs.length < 100) break;
      cursor = snap.docs.at(-1);
      leaderboardLimited = page === 4;
    }
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ submission: projected, leaderboard, ...(leaderboardLimited ? { leaderboardLimited: true } : {}) });
};


/** Xác thực giáo viên qua Firebase ID token. Trả về null nếu không hợp lệ hoặc là anonymous. */
const verifyTeacher = async (req: VercelRequest): Promise<{ uid: string } | null> => {
  const token = getBearerToken(req.headers?.authorization);
  if (!token) return null;
  try {
    getAdminDb();
    const decoded: any = await getAuth().verifyIdToken(token);
    if (decoded?.firebase?.sign_in_provider === 'anonymous') return null;
    return { uid: decoded.uid };
  } catch {
    return null;
  }
};

const handlePost = async (req: VercelRequest, res: VercelResponse) => {
  const nonce = typeof req.body?.clientNonce === 'string' ? req.body.clientNonce : '';
  const user = await verifyTeacher(req);
  if (!user && nonce.length < 24) {
    return res.status(401).json({ error: 'Bạn cần đăng nhập để chấm bài.' });
  }

  const submissionId = typeof req.body?.submissionId === 'string' ? req.body.submissionId.trim() : '';
  if (!safeId(submissionId)) {
    return res.status(400).json({ error: 'Thiếu submissionId' });
  }

  const db = getAdminDb();
  const subRef = db.collection('examSubmissions').doc(submissionId);
  const result = await db.runTransaction(async tx => {
    const snap = await tx.get(subRef);
    if (!snap.exists) throw new ExamRequestError(404, 'Không tìm thấy bài nộp');
    const submission = snap.data()!;
    if (submission.classId || submission.assignmentId) throw new ExamRequestError(403, 'Bài làm trong lớp không chấm qua đường này.');
    if (typeof submission.examId !== 'string' || !safeId(submission.examId)) throw new ExamRequestError(404, 'Bài nộp không có đề hợp lệ.');
    const examSnap = await tx.get(db.collection('exams').doc(submission.examId));
    if (!examSnap.exists) throw new ExamRequestError(404, 'Không tìm thấy đề thi của bài nộp');
    const exam = examSnap.data()!;
    if (typeof exam.teacherId !== 'string' || !exam.teacherId.trim()) throw new ExamRequestError(403, 'Đề chưa có giáo viên chủ sở hữu hợp lệ.');
    const supplied = Buffer.from(nonce), stored = Buffer.from(typeof submission.clientNonce === 'string' ? submission.clientNonce : '');
    const ownAttempt = nonce.length >= 24 && nonce.length <= 128 && supplied.length === stored.length && timingSafeEqual(supplied, stored);
    const teacher = user?.uid === exam.teacherId;
    if (!teacher && !ownAttempt) throw new ExamRequestError(user ? 403 : 401, 'Không có quyền chấm bài này.');
    if (!['submitted', 'graded'].includes(submission.status)) throw new ExamRequestError(409, 'Bài chưa nộp để chấm.');
    // Repeated student/teacher requests never erase existing teacher scores or consume another grading run.
    if (submission.status === 'graded' || submission.publicAutoGradedAt) return publicResultProjection(submissionId, submission, exam, Date.now());
    const questions: CoreQuestion[] = Array.isArray(exam.questions) ? exam.questions : [];
    if ((Array.isArray(submission.answers) ? submission.answers : []).some(a => a &&
      (!questions.some(q => q.id === a.questionId) || questions.some(q => q.id === a.questionId && q.type === 'essay'))
      && (a.aiScore !== undefined || a.autoScore !== undefined || a.aiFeedback !== undefined))) {
      throw new ExamRequestError(409, 'Bài có điểm tự luận hoặc dữ liệu cũ chưa xác minh. Giáo viên cần kiểm tra trước khi chấm, điểm cũ được giữ nguyên.');
    }
    const answers: CoreAnswer[] = questions.map(q => {
      const raw = (Array.isArray(submission.answers) ? submission.answers : []).find(a => a && a.questionId === q.id);
      return { questionId: q.id, answer: typeof raw?.answer === 'string' ? raw.answer : '' };
    });
    const graded = gradeSubmissionCore(questions, answers, Boolean(exam.allowReview), exam.tfScoringMode);
    const patch = { answers: graded.answers, totalScore: graded.totalScore, status: graded.status, publicAutoGradedAt: new Date().toISOString() };
    tx.update(subRef, patch);
    return publicResultProjection(submissionId, { ...submission, ...patch, maxScore: exam.maxScore ?? submission.maxScore ?? 0 }, exam, Date.now());
  });
  return res.status(200).json(result);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') return await handleGet(req, res);
    if (req.method === 'POST') return await handlePost(req, res);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    if (error instanceof ExamRequestError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[api/exam] error', error);
    return res.status(500).json({ error: error?.message || 'Lỗi máy chủ' });
  }
}
