/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDb, gradeSubmissionCore, stripAnswerKey, type CoreAnswer, type CoreQuestion } from './_exam-core.js';

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
  if (submissionId) return handleGetResult(submissionId, res);
  const code = typeof req.query.code === 'string' ? req.query.code.trim().toUpperCase() : '';
  const examId = typeof req.query.examId === 'string' ? req.query.examId.trim() : '';
  if (!code && !examId) {
    return res.status(400).json({ error: 'Thiếu tham số code hoặc examId' });
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

  const publicExam = {
    ...examData,
    questions: Array.isArray(examData.questions) ? examData.questions.map(stripAnswerKey) : [],
  };
  delete publicExam.password;

  res.setHeader('Cache-Control', 'public, max-age=15, s-maxage=30');
  return res.status(200).json({ exam: publicExam });
};

const RESULT_LEADERBOARD_SIZE = 10;

/** Đề cho hiện điểm chưa: theo cài đặt "Hiện kết quả khi nào" của giáo viên — máy chủ quyết, không để trình duyệt tự quyết. */
export const canShowExamResult = (exam: Record<string, any>, submission: Record<string, any>, nowMs: number): boolean => {
  const showWhen = exam.showResultWhen ?? 'submit';
  const endMs = exam.endAt ? Date.parse(String(exam.endAt)) : NaN;
  const examEnded = Number.isFinite(endMs) && nowMs > endMs;
  return showWhen === 'submit' || (showWhen === 'all_done' && (examEnded || submission.status === 'graded'));
};

/**
 * Bản bài làm gửi về trang kết quả: chưa tới lúc hiện điểm thì bỏ điểm (tổng + từng câu); đề không cho xem lại thì bỏ
 * đáp án/giải thích. Không trả nonce, ghi chú nội bộ hay dữ liệu chấm của giáo viên.
 */
export const publicResultProjection = (id: string, submission: Record<string, any>, exam: Record<string, any>, nowMs: number) => {
  const showScore = canShowExamResult(exam, submission, nowMs);
  const allowReview = showScore && Boolean(exam.allowReview);
  const answers = (Array.isArray(submission.answers) ? submission.answers : [])
    .filter((item: unknown): item is Record<string, any> => Boolean(item && typeof item === 'object'))
    .map((item: Record<string, any>) => ({
      questionId: String(item.questionId ?? ''),
      answer: String(item.answer ?? ''),
      ...(showScore && typeof item.autoScore === 'number' ? { autoScore: item.autoScore } : {}),
      ...(showScore && typeof item.aiScore === 'number' ? { aiScore: item.aiScore } : {}),
      ...(showScore && typeof item.aiFeedback === 'string' ? { aiFeedback: item.aiFeedback } : {}),
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

  let leaderboard: { id: string; studentName: string; studentClass: string; totalScore: number }[] = [];
  if (!projected.resultHidden && !exam.hideLeaderboard) {
    const all = await db.collection('examSubmissions').where('examId', '==', String(submission.examId)).get();
    leaderboard = all.docs
      .map(doc => ({ id: doc.id, data: doc.data() as Record<string, any> }))
      .filter(({ data }) => data.status !== 'in_progress' && typeof data.totalScore === 'number' && !data.classId && !data.assignmentId)
      .sort((a, b) => b.data.totalScore - a.data.totalScore)
      .slice(0, RESULT_LEADERBOARD_SIZE)
      .map(({ id, data }) => ({ id, studentName: String(data.studentName ?? ''), studentClass: String(data.studentClass ?? ''), totalScore: data.totalScore }));
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ submission: projected, leaderboard });
};

const handlePost = async (req: VercelRequest, res: VercelResponse) => {
  const submissionId = typeof req.body?.submissionId === 'string' ? req.body.submissionId.trim() : '';
  if (!submissionId) {
    return res.status(400).json({ error: 'Thiếu submissionId' });
  }

  const db = getAdminDb();
  const subRef = db.collection('examSubmissions').doc(submissionId);
  const subSnap = await subRef.get();
  if (!subSnap.exists) {
    return res.status(404).json({ error: 'Không tìm thấy bài nộp' });
  }
  const submission = subSnap.data() as any;
  // Bài trong lớp chấm theo vòng đời của lớp (tạm → duyệt); đường chấm công khai này không được ghi đè lên.
  if (submission.classId || submission.assignmentId) {
    return res.status(403).json({ error: 'Bài làm trong lớp không chấm qua đường này.' });
  }

  const examSnap = await db.collection('exams').doc(submission.examId).get();
  if (!examSnap.exists) {
    return res.status(404).json({ error: 'Không tìm thấy đề thi của bài nộp' });
  }
  const exam = examSnap.data() as any;

  const questions: CoreQuestion[] = Array.isArray(exam.questions) ? exam.questions : [];
  const answers: CoreAnswer[] = Array.isArray(submission.answers) ? submission.answers : [];

  const graded = gradeSubmissionCore(questions, answers, Boolean(exam.allowReview), exam.tfScoringMode);

  await subRef.update({
    answers: graded.answers,
    totalScore: graded.totalScore,
    status: graded.status,
  });

  return res.status(200).json({
    totalScore: graded.totalScore,
    status: graded.status,
    maxScore: exam.maxScore ?? submission.maxScore ?? 0,
  });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') return await handleGet(req, res);
    if (req.method === 'POST') return await handlePost(req, res);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[api/exam] error', error);
    return res.status(500).json({ error: error?.message || 'Lỗi máy chủ' });
  }
}
