/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDb, gradeSubmissionCore, stripAnswerKey, type CoreAnswer, type CoreQuestion } from './_exam-core.js';

// Một hàm phục vụ cả 2 việc để không vượt giới hạn số Serverless Function:
//   GET  ?code=ABC   → đề đang phát hành, ĐÃ LƯỢC correctAnswer/explanation (học sinh vào làm)
//   GET  ?examId=xxx → đề theo id, đã lược (trang kết quả/xem lại)
//   POST { submissionId } → chấm bài bằng đáp án gốc (admin), nhúng đáp án khi allowReview
//
// Chống xem đáp án qua DevTools: rules cấm học sinh đọc doc đề trực tiếp; API này dùng admin SDK
// và chỉ trả phần đã lược. Fail-safe: nếu POST lỗi, bài vẫn ở 'submitted' và giáo viên tự xác minh.

const handleGet = async (req: VercelRequest, res: VercelResponse) => {
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
