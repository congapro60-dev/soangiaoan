/**
 * Thông báo tức thời cho PHỤ HUYNH qua Zalo Bot khi con nộp bài và khi có kết quả chấm:
 * - Khi con vừa gửi bài xong: gửi tin báo bài đã được nhận và đang chấm.
 * - Khi máy chấm xong: gửi kết quả điểm số + lời khen/nhắc nhở.
 * - Chỉ gửi cho tài khoản phụ huynh đã liên kết (role === 'parent' và active === true).
 * - Bỏ qua chính tài khoản nộp (nếu phụ huynh nộp bài hộ con từ tài khoản của mình).
 */
import type { Firestore } from 'firebase-admin/firestore';
import { sendStyled, sendSticker } from './_assistant-zalo-send.js';

export const CONGRATS_STICKER = () => String(process.env.ZALO_BOT_CONGRA_STICKER || '').trim();
export const isHighGrade = (score: number, maxScore: number, approved: boolean): boolean =>
  approved && maxScore > 0 && Number.isFinite(score) && Number.isFinite(maxScore) && score / maxScore >= 0.8;

export interface ParentSubmissionNotice {
  classId: string;
  studentId: string;
  assignmentTitle: string;
  photoCount: number;
  fromUserId?: string;
}

export interface ParentGradedNotice {
  classId: string;
  studentId: string;
  assignmentTitle: string;
  score: number;
  maxScore: number;
  approved: boolean;
  fromUserId?: string;
}

export const notifyParentSubmission = async (
  db: Firestore,
  token: string,
  info: ParentSubmissionNotice,
): Promise<void> => {
  try {
    if (typeof db?.collection !== 'function') return;
    const linksSnap = await db.collection('channelLinks')
      .where('channel', '==', 'zalo_bot')
      .where('classId', '==', info.classId)
      .where('studentId', '==', info.studentId)
      .where('role', '==', 'parent')
      .where('active', '==', true)
      .get();

    const targets = linksSnap.docs.filter(doc => {
      const d = doc.data() as any;
      return d.channelUserId && d.channelUserId !== info.fromUserId;
    });
    if (!targets.length) return;

    const [studentDoc, classDoc] = await Promise.all([
      db.collection('classes').doc(info.classId).collection('students').doc(info.studentId).get(),
      db.collection('classes').doc(info.classId).get(),
    ]);
    const studentName = String((studentDoc.data() as any)?.name ?? 'con');
    const className = String((classDoc.data() as any)?.name ?? '');

    const text = [
      '🔔 THÔNG BÁO NỘP BÀI TẬP VỀ NHÀ',
      `👤 Học sinh: ${studentName}${className ? ` (Lớp ${className})` : ''}`,
      `📝 Bài tập: ${info.assignmentTitle}`,
      `📷 Số lượng ảnh: ${info.photoCount} ảnh`,
      '⏳ Hệ thống đang chấm tự động. Kết quả sẽ được gửi ngay cho phụ huynh sau ít phút.',
      '',
      '💡 Phụ huynh có thể nhắn số 0 để xem menu chức năng.',
    ].join('\n');

    for (const t of targets) {
      const userId = String(t.data().channelUserId);
      await sendStyled(token, userId, text);
    }
  } catch {
    /* Lỗi thông báo không làm gián đoạn luồng chính */
  }
};

export const notifyParentGraded = async (
  db: Firestore,
  token: string,
  info: ParentGradedNotice,
): Promise<void> => {
  try {
    if (typeof db?.collection !== 'function') return;
    const linksSnap = await db.collection('channelLinks')
      .where('channel', '==', 'zalo_bot')
      .where('classId', '==', info.classId)
      .where('studentId', '==', info.studentId)
      .where('role', '==', 'parent')
      .where('active', '==', true)
      .get();

    const targets = linksSnap.docs.filter(doc => {
      const d = doc.data() as any;
      return d.channelUserId && d.channelUserId !== info.fromUserId;
    });
    if (!targets.length) return;

    const [studentDoc, classDoc] = await Promise.all([
      db.collection('classes').doc(info.classId).collection('students').doc(info.studentId).get(),
      db.collection('classes').doc(info.classId).get(),
    ]);
    const studentName = String((studentDoc.data() as any)?.name ?? 'con');
    const className = String((classDoc.data() as any)?.name ?? '');

    const statusBadge = info.approved ? '✅ Giáo viên đã duyệt' : '🤖 Chấm tự động';
    const congrats = isHighGrade(info.score, info.maxScore, info.approved);

    const text = [
      '📊 KẾT QUẢ BÀI TẬP CỦA CON',
      `👤 Học sinh: ${studentName}${className ? ` (Lớp ${className})` : ''}`,
      `📝 Bài: ${info.assignmentTitle}`,
      `🎯 Điểm số: ${info.score}/${info.maxScore} (${statusBadge})`,
      congrats ? '🌟 Chúc mừng em đã hoàn thành bài tập xuất sắc!' : '',
      '',
      '👉 Phụ huynh nhắn số 2 để xem chi tiết nhận xét & bài làm của con.',
    ].filter(Boolean).join('\n');

    for (const t of targets) {
      const userId = String(t.data().channelUserId);
      if (congrats) {
        await sendSticker(token, userId, CONGRATS_STICKER()).catch(() => false);
      }
      await sendStyled(token, userId, text);
    }
  } catch {
    /* Lỗi thông báo không làm gián đoạn luồng chính */
  }
};
