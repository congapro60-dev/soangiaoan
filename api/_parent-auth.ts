/**
 * Xác thực phụ huynh cổng /ph: mã lớp + em + PIN. Dùng chung cho xem báo cáo, báo cáo tự chọn, sự kiện thống kê.
 * PIN phụ huynh KHÔNG khoá khi nhập sai (chủ dự án chốt 06/10) — thay vào đó MỌI lần sai đều được đếm cho giáo viên xem
 * (`recordParentActivity('wrong')`, có giới hạn tần suất ghi để một đợt dò mã không làm nghẽn tài liệu thống kê).
 */
import type { VercelResponse } from '@vercel/node';
import { normalizeJoinCode, verifyPin } from './_classroom-core.js';
import { recordParentActivity } from './_parent-activity.js';
import { PARENT_SECRETS_SUB, isSafeDocId, normalizeParentPin, type ParentPinSetBy } from '../src/lib/classroom/parentAccess.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

export interface ParentTarget {
  classDoc: FirebaseFirestore.QueryDocumentSnapshot;
  studentId: string;
  studentSnap: FirebaseFirestore.DocumentSnapshot;
  secretRef: FirebaseFirestore.DocumentReference;
}

/** Mã lớp + em từ thân yêu cầu của phụ huynh; không có thì đã trả 404/400 và trả `null`. */
export const resolveParentStudent = async (db: Db, body: Body, res: VercelResponse): Promise<ParentTarget | null> => {
  const joinCode = normalizeJoinCode(body.joinCode);
  const studentId = body.studentId;
  if (!isSafeDocId(studentId)) { res.status(404).json({ error: 'Không tìm thấy lớp hoặc học sinh.' }); return null; }
  const classes = joinCode ? await db.collection('classes').where('joinCode', '==', joinCode).limit(1).get() : null;
  const classDoc = classes?.docs[0];
  if (!classDoc) { res.status(404).json({ error: 'Không tìm thấy lớp hoặc học sinh.' }); return null; }
  const studentSnap = await classDoc.ref.collection('students').doc(studentId).get();
  if (!studentSnap.exists) { res.status(404).json({ error: 'Không tìm thấy học sinh trong lớp này.' }); return null; }
  return { classDoc, studentId, studentSnap, secretRef: classDoc.ref.collection(PARENT_SECRETS_SUB).doc(studentId) };
};

/**
 * Kiểm PIN phụ huynh (không khoá). Sai → đếm cho giáo viên rồi trả 401; không qua thì đã trả lỗi và trả `false`.
 * `requireParentSet`: chỉ nhận PIN phụ huynh TỰ ĐẶT (PIN còn là mã giáo viên cấp thì 403) — dùng cho mọi thao tác
 * ngoài "xem lần đầu" và "đổi PIN".
 */
export const verifyParentPin = async (
  db: Db,
  target: ParentTarget,
  pin: string,
  res: VercelResponse,
  options: { device?: unknown; requireParentSet?: boolean } = {},
): Promise<boolean> => {
  const snap = await target.secretRef.get();
  if (!snap.exists) {
    res.status(409).json({ error: 'Thầy cô chưa cấp mã PIN phụ huynh cho em này. Nhờ thầy cô cấp mã.' });
    return false;
  }
  if (!verifyPin(normalizeParentPin(pin), String(snap.data()?.pinHash || ''))) {
    await recordParentActivity(db, target.classDoc.ref, target.studentId, 'wrong', { device: options.device });
    res.status(401).json({ error: 'Mã PIN không đúng. Thử lại, hoặc nhờ thầy cô cấp lại mã.' });
    return false;
  }
  const setBy = snap.data()?.pinSetBy as ParentPinSetBy | undefined;
  if (options.requireParentSet && setBy !== 'parent') {
    res.status(403).json({ error: 'Hãy đặt mã PIN riêng trước khi xem báo cáo.' });
    return false;
  }
  return true;
};
