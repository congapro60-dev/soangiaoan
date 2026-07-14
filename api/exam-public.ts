/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDb } from './exam-admin-core.js';
import { stripAnswerKey } from './exam-scoring-core.js';

// Trả về đề thi cho HỌC SINH, đã LƯỢC BỎ correctAnswer + explanation của từng câu
// (chống xem đáp án qua DevTools). Dùng admin SDK nên bỏ qua rules teacher-only.
//   GET ?code=ABC123  -> theo mã, yêu cầu đề đang phát hành (isActive)
//   GET ?examId=xxx   -> theo id, dùng cho trang kết quả/xem lại (không bắt buộc active)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const code = typeof req.query.code === 'string' ? req.query.code.trim().toUpperCase() : '';
  const examId = typeof req.query.examId === 'string' ? req.query.examId.trim() : '';

  if (!code && !examId) {
    return res.status(400).json({ error: 'Thiếu tham số code hoặc examId' });
  }

  try {
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
    // Không bao giờ lộ mật khẩu chấm/khoá đề cho học sinh
    delete publicExam.password;

    // Cache CDN ngắn để giảm tải; đề đổi thì cache tự hết sau 30s
    res.setHeader('Cache-Control', 'public, max-age=15, s-maxage=30');
    return res.status(200).json({ exam: publicExam });
  } catch (error: any) {
    console.error('[exam-public] error', error);
    return res.status(500).json({ error: error?.message || 'Lỗi máy chủ' });
  }
}
