/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDb } from './exam-admin-core.js';
import { gradeSubmissionCore, type CoreAnswer, type CoreQuestion } from './exam-scoring-core.js';

// Chấm điểm bài nộp phía SERVER (nguồn tin cậy). Học sinh gọi sau khi lưu câu trả lời.
// Admin đọc đáp án gốc từ đề (rules không cho học sinh đọc), tính điểm và ghi lại bài nộp.
//   POST { submissionId }
// Fail-safe: nếu hàm này lỗi, bài nộp vẫn được lưu ở client; giáo viên mở trang theo dõi sẽ
// tự xác minh & tính lại điểm (verifySubmissionScore) — điểm cuối luôn đúng.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const submissionId = typeof req.body?.submissionId === 'string' ? req.body.submissionId.trim() : '';
  if (!submissionId) {
    return res.status(400).json({ error: 'Thiếu submissionId' });
  }

  try {
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

    const graded = gradeSubmissionCore(
      questions,
      answers,
      Boolean(exam.allowReview),
      exam.tfScoringMode,
    );

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
  } catch (error: any) {
    console.error('[grade-exam] error', error);
    return res.status(500).json({ error: error?.message || 'Lỗi máy chủ' });
  }
}
