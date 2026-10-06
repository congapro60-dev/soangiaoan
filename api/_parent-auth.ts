/**
 * Xác thực phụ huynh cổng /ph: mã lớp + em + PIN. Dùng chung cho xem báo cáo, báo cáo tự chọn, thống kê.
 * PIN phụ huynh KHÔNG khoá khi nhập sai (chủ dự án chốt 06/10) — nên mỗi lần sai chỉ được đếm lại cho giáo viên xem.
 */
import type { VercelResponse } from '@vercel/node';
import { normalizeJoinCode, verifyPin } from './_classroom-core.js';
import { PARENT_SECRETS_SUB, normalizeParentPin } from '../src/lib/classroom/parentAccess.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

/** Mã lớp + em từ thân yêu cầu của phụ huynh; không có thì đã trả 404 và trả `null`. */
export const resolveParentStudent = async (db: Db, body: Body, res: VercelResponse) => {
  const joinCode = normalizeJoinCode(body.joinCode);
  const studentId = typeof body.studentId === 'string' ? body.studentId : '';
  const classes = joinCode ? await db.collection('classes').where('joinCode', '==', joinCode).limit(1).get() : null;
  const classDoc = classes?.docs[0];
  if (!classDoc || !studentId || studentId.includes('/')) return void res.status(404).json({ error: 'Không tìm thấy lớp hoặc học sinh.' });
  const studentSnap = await classDoc.ref.collection('students').doc(studentId).get();
  if (!studentSnap.exists) return void res.status(404).json({ error: 'Không tìm thấy học sinh trong lớp này.' });
  return { classDoc, studentId, studentSnap, secretRef: classDoc.ref.collection(PARENT_SECRETS_SUB).doc(studentId) };
};

/** Kiểm PIN phụ huynh (không khoá); không qua thì đã trả lỗi và trả `false`. `onWrong` để đếm lần sai. */
export const verifyParentPin = async (
  secretRef: FirebaseFirestore.DocumentReference,
  pin: string,
  res: VercelResponse,
  onWrong?: () => Promise<void>,
): Promise<boolean> => {
  const snap = await secretRef.get();
  if (!snap.exists) {
    res.status(409).json({ error: 'Thầy cô chưa cấp mã PIN phụ huynh cho em này. Nhờ thầy cô cấp mã.' });
    return false;
  }
  if (!verifyPin(normalizeParentPin(pin), String(snap.data()?.pinHash || ''))) {
    await onWrong?.();
    res.status(401).json({ error: 'Mã PIN không đúng. Thử lại, hoặc nhờ thầy cô cấp lại mã.' });
    return false;
  }
  return true;
};
