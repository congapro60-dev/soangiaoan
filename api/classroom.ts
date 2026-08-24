/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from './_exam-core.js';
import {
  EMPTY_LOCK,
  createPin,
  hashPin,
  isLocked,
  isValidPinShape,
  minutesUntilUnlock,
  nextLockState,
  normalizeJoinCode,
  verifyPin,
  type LockState,
} from './_classroom-core.js';

/**
 * Một hàm phục vụ các việc sau, để không vượt trần 12 Serverless Function của Vercel:
 *
 *   POST { action: 'roster', joinCode }                     → danh sách tên để học sinh chọn
 *   POST { action: 'login', joinCode, studentId, pin, idToken } → gắn phiên vào studentLinks/{uid}
 *   POST { action: 'issuePins', classId, idToken }          → giáo viên cấp PIN cho cả lớp
 *   POST { action: 'resetOnePin', classId, studentId, idToken } → cấp lại PIN cho MỘT em
 *   POST { action: 'viewPin', classId, studentId, idToken } → giáo viên xem PIN ĐANG DÙNG của một em
 *   POST { action: 'revokeStudentAccess', classId, studentId, idToken } → xoá học sinh khỏi server + thu hồi đăng nhập
 *   POST { action: 'revokeClass', classId, idToken } → gỡ toàn bộ dữ liệu lớp khỏi server (roster/secret/link)
 *
 * Vì sao phải đi qua server thay vì để client đọc thẳng Firestore:
 *  - PIN nằm ở `studentSecrets`, rules cấm MỌI client đọc. Chỉ Admin SDK kiểm được.
 *  - `studentLinks` cũng cấm client ghi. Cho client tự ghi là cho nó tự nhận là bất kỳ ai.
 *  - Danh sách tên học sinh không mở ở tầng rules; chỉ trả qua đây sau khi mã lớp đúng.
 *
 * PIN chỉ 4 số nên KHOÁ SAU 5 LẦN SAI là hàng rào thật, không phải tính năng thêm.
 * Từ 2026-08-22 máy chủ lưu THÊM bản PIN thô (`pinPlain`) cạnh bản băm: chủ dự án chốt rằng
 * giáo viên phải xem lại được mã đang dùng mọi lúc. Với mã 4 số thì băm vốn không chống nổi
 * vét cạn (chỉ 10.000 khả năng), nên rủi ro cộng thêm là không đáng kể so với giá trị sử dụng;
 * client vẫn không đọc trực tiếp được document bí mật, chỉ lấy qua API đã xác thực chủ lớp.
 */

const readBody = (req: VercelRequest): Record<string, unknown> => {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>;
  try {
    return JSON.parse(String(req.body || '{}'));
  } catch {
    return {};
  }
};

const uidFromIdToken = async (idToken: unknown): Promise<string | null> => {
  if (typeof idToken !== 'string' || !idToken) return null;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    return null;
  }
};

const findClassByJoinCode = async (db: FirebaseFirestore.Firestore, joinCode: string) => {
  if (joinCode.length < 4) return null;
  const snap = await db.collection('classes').where('joinCode', '==', joinCode).limit(1).get();
  return snap.empty ? null : snap.docs[0];
};

const handleRoster = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const joinCode = normalizeJoinCode(body.joinCode);
  const classDoc = await findClassByJoinCode(db, joinCode);
  if (!classDoc) return res.status(404).json({ error: 'Không tìm thấy lớp với mã này. Kiểm tra lại mã thầy cô cho.' });

  const students = await classDoc.ref.collection('students').get();
  return res.status(200).json({
    classId: classDoc.id,
    className: classDoc.data().name || '',
    // CỐ Ý chỉ trả id và tên. Mã học sinh của trường không rời khỏi máy chủ.
    students: students.docs
      .map(d => ({ studentId: d.id, name: String(d.data().name || '') }))
      .filter(s => s.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'vi')),
  });
};

const handleLogin = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ. Tải lại trang rồi thử lại.' });

  const pin = body.pin;
  if (!isValidPinShape(pin)) return res.status(400).json({ error: 'Mã PIN phải là 4 chữ số.' });

  const joinCode = normalizeJoinCode(body.joinCode);
  const studentId = typeof body.studentId === 'string' ? body.studentId : '';
  const classDoc = await findClassByJoinCode(db, joinCode);
  if (!classDoc || !studentId) return res.status(404).json({ error: 'Không tìm thấy lớp hoặc học sinh.' });

  const studentRef = classDoc.ref.collection('students').doc(studentId);
  const studentSnap = await studentRef.get();
  if (!studentSnap.exists) return res.status(404).json({ error: 'Không tìm thấy học sinh trong lớp này.' });

  const secretRef = classDoc.ref.collection('studentSecrets').doc(studentId);
  const secretSnap = await secretRef.get();
  if (!secretSnap.exists) {
    return res.status(409).json({ error: 'Thầy cô chưa cấp mã PIN cho em. Báo thầy cô bấm "Cấp mã PIN" trong lớp.' });
  }

  const secret = secretSnap.data() as { pinHash?: string } & Partial<LockState>;
  const lock: LockState = {
    failedAttempts: secret.failedAttempts ?? 0,
    lockedUntil: secret.lockedUntil ?? null,
  };
  const now = new Date();

  if (isLocked(lock, now)) {
    return res.status(429).json({
      error: `Sai mã PIN nhiều lần. Thử lại sau ${minutesUntilUnlock(lock, now)} phút, hoặc nhờ thầy cô cấp lại PIN.`,
    });
  }

  const ok = verifyPin(pin, String(secret.pinHash || ''));
  await secretRef.set({ ...nextLockState(lock, ok, now), updatedAt: now.toISOString() }, { merge: true });

  if (!ok) return res.status(401).json({ error: 'Mã PIN không đúng.' });

  const classData = classDoc.data();
  await db.collection('studentLinks').doc(uid).set({
    uid,
    studentId,
    classId: classDoc.id,
    teacherId: classData.teacherId,
    createdAt: now.toISOString(),
  });

  return res.status(200).json({
    studentId,
    classId: classDoc.id,
    teacherId: classData.teacherId,
    className: classData.name || '',
    studentName: studentSnap.data()?.name || '',
  });
};

const handleIssuePins = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });

  const classId = typeof body.classId === 'string' ? body.classId : '';
  const classSnap = await db.collection('classes').doc(classId).get();
  if (!classSnap.exists) return res.status(404).json({ error: 'Không tìm thấy lớp.' });
  if (classSnap.data()?.teacherId !== uid) {
    return res.status(403).json({ error: 'Chỉ giáo viên chủ lớp mới cấp được mã PIN.' });
  }

  const regenerate = body.regenerate === true;
  const students = await classSnap.ref.collection('students').get();
  const now = new Date().toISOString();
  const issued: Array<{ studentId: string; name: string; pin: string }> = [];
  let batch = db.batch();
  let pending = 0;

  for (const studentDoc of students.docs) {
    const secretRef = classSnap.ref.collection('studentSecrets').doc(studentDoc.id);
    if (!regenerate && (await secretRef.get()).exists) continue;

    const pin = createPin();
    batch.set(secretRef, {
      studentId: studentDoc.id,
      classId: classId,
      pinHash: hashPin(pin),
      pinPlain: pin,
      ...EMPTY_LOCK,
      updatedAt: now,
    });
    issued.push({ studentId: studentDoc.id, name: String(studentDoc.data().name || ''), pin });
    pending += 1;
    if (pending >= 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending > 0) await batch.commit();

  return res.status(200).json({ issued, total: students.size });
};

/**
 * Cấp lại PIN cho ĐÚNG MỘT em.
 *
 * Thiếu đường này thì một em quên PIN là cả lớp phải đổi mã — 25 em kia bị phiền vì lỗi của
 * một người, và giáo viên phải phát lại toàn bộ bảng PIN.
 *
 * Cấp lại cũng XOÁ trạng thái khoá: em bị khoá vì sai 5 lần thì mã mới phải dùng được ngay.
 */
const handleResetOnePin = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });

  const classId = typeof body.classId === 'string' ? body.classId : '';
  const studentId = typeof body.studentId === 'string' ? body.studentId : '';
  const classSnap = await db.collection('classes').doc(classId).get();
  if (!classSnap.exists) return res.status(404).json({ error: 'Không tìm thấy lớp.' });
  if (classSnap.data()?.teacherId !== uid) {
    return res.status(403).json({ error: 'Chỉ giáo viên chủ lớp mới cấp lại được mã PIN.' });
  }

  const studentRef = classSnap.ref.collection('students').doc(studentId);
  const studentSnap = await studentRef.get();
  if (!studentSnap.exists) return res.status(404).json({ error: 'Không tìm thấy học sinh trong lớp này.' });

  const pin = createPin();
  await classSnap.ref.collection('studentSecrets').doc(studentId).set({
    studentId,
    classId,
    pinHash: hashPin(pin),
    pinPlain: pin,
    ...EMPTY_LOCK,
    updatedAt: new Date().toISOString(),
  });

  return res.status(200).json({ studentId, name: String(studentSnap.data()?.name || ''), pin });
};

/**
 * Xem PIN ĐANG DÙNG của một em — chỉ giáo viên chủ lớp.
 *
 * Trả `pin: null` khi mã được cấp trước 2026-08-22 (thời máy chủ chỉ giữ bản băm, không đọc
 * ngược được): giáo viên cấp lại một lần là từ đó về sau xem lại được thoải mái.
 */
const handleViewPin = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });

  const classId = typeof body.classId === 'string' ? body.classId : '';
  const studentId = typeof body.studentId === 'string' ? body.studentId : '';
  const classSnap = await db.collection('classes').doc(classId).get();
  if (!classSnap.exists) return res.status(404).json({ error: 'Không tìm thấy lớp.' });
  if (classSnap.data()?.teacherId !== uid) {
    return res.status(403).json({ error: 'Chỉ giáo viên chủ lớp mới xem được mã PIN.' });
  }

  const studentSnap = await classSnap.ref.collection('students').doc(studentId).get();
  if (!studentSnap.exists) return res.status(404).json({ error: 'Không tìm thấy học sinh trong lớp này.' });

  const secretSnap = await classSnap.ref.collection('studentSecrets').doc(studentId).get();
  const pin = String(secretSnap.data()?.pinPlain || '') || null;

  return res.status(200).json({
    studentId,
    name: String(studentSnap.data()?.name || ''),
    pin,
  });
};

/**
 * Xoá học sinh khỏi server và THU HỒI quyền truy cập: xoá roster, xoá bí mật PIN, gỡ mọi
 * studentLinks đang trỏ vào em này. Không làm gì thì "xoá" trên giao diện chỉ là xoá local —
 * em ấy vẫn vào được bằng mã lớp + PIN cũ.
 */
const handleRevokeStudentAccess = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập tài khoản giáo viên.' });

  const classId = typeof body.classId === 'string' ? body.classId : '';
  const studentId = typeof body.studentId === 'string' ? body.studentId : '';
  const classSnap = await db.collection('classes').doc(classId).get();
  if (!classSnap.exists) return res.status(404).json({ error: 'Không tìm thấy lớp.' });
  if (classSnap.data()?.teacherId !== uid) {
    return res.status(403).json({ error: 'Chỉ giáo viên chủ lớp mới thu hồi được quyền truy cập.' });
  }

  // Firestore delete trên document không tồn tại vẫn thành công — khỏi kiểm exists từng cái.
  await classSnap.ref.collection('students').doc(studentId).delete();
  await classSnap.ref.collection('studentSecrets').doc(studentId).delete();

  const links = await db.collection('studentLinks').where('studentId', '==', studentId).get();
  let batch = db.batch();
  let pending = 0;
  let revokedLinks = 0;
  for (const l of links.docs) {
    batch.delete(l.ref);
    revokedLinks += 1;
    pending += 1;
    if (pending >= 400) { await batch.commit(); batch = db.batch(); pending = 0; }
  }
  if (pending > 0) await batch.commit();

  return res.status(200).json({ revoked: true, revokedLinks });
};

/**
 * Gỡ toàn bộ dữ liệu LỚP khỏi server khi giáo viên xoá lớp: roster, bí mật PIN, document lớp
 * và mọi studentLinks của lớp. Điểm/bài nộp CỐ Ý GIỮ LẠI để đối chiếu sau; quyền truy cập
 * học sinh chết ngay vì studentLinks đã bị gỡ.
 */
const handleRevokeClass = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập tài khoản giáo viên.' });

  const classId = typeof body.classId === 'string' ? body.classId : '';
  const classSnap = await db.collection('classes').doc(classId).get();
  if (!classSnap.exists) return res.status(404).json({ error: 'Không tìm thấy lớp.' });
  if (classSnap.data()?.teacherId !== uid) {
    return res.status(403).json({ error: 'Chỉ giáo viên chủ lớp mới gỡ được dữ liệu lớp.' });
  }

  const [students, secrets, links] = await Promise.all([
    classSnap.ref.collection('students').get(),
    classSnap.ref.collection('studentSecrets').get(),
    db.collection('studentLinks').where('classId', '==', classId).get(),
  ]);

  let batch = db.batch();
  let pending = 0;
  let removedStudents = 0;
  let removedSecrets = 0;
  let revokedLinks = 0;

  // await được thật sự: hàm phụ là async và mọi nơi gọi đều await. Bản trước dùng forEach nên
  // lệnh ghi giữa chừng bị bắn đi mà không chờ — lỗi biến mất không dấu vết.
  const xoa = async (ref: FirebaseFirestore.DocumentReference) => {
    batch.delete(ref);
    pending += 1;
    if (pending >= 400) { await batch.commit(); batch = db.batch(); pending = 0; }
  };
  for (const d of students.docs) { await xoa(d.ref); removedStudents += 1; }
  for (const d of secrets.docs) { await xoa(d.ref); removedSecrets += 1; }
  for (const d of links.docs) { await xoa(d.ref); revokedLinks += 1; }
  await xoa(classSnap.ref);
  if (pending > 0) await batch.commit();

  return res.status(200).json({
    revoked: true,
    removedStudents,
    removedSecrets,
    revokedLinks,
  });
};

/**
 * Bảng PIN của CẢ LỚP để giáo viên phát cho học sinh.
 *
 * Bảng lúc cấp chỉ hiện một lần, mà giáo viên thì cần phát lại nhiều lần: em mới vào lớp, phụ
 * huynh hỏi lại, đổi điện thoại... Từ khi máy chủ lưu thêm `pinPlain` thì đọc lại được, nên
 * không bắt cấp mã mới chỉ để xem mã cũ nữa.
 *
 * Em nào được cấp PIN trước khi có `pinPlain` sẽ trả `pin: null` — nơi gọi hiện rõ để giáo viên
 * biết cần cấp lại riêng em đó, chứ không im lặng bỏ sót.
 */
const handleViewClassPins = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });

  const classId = typeof body.classId === 'string' ? body.classId : '';
  const classSnap = await db.collection('classes').doc(classId).get();
  if (!classSnap.exists) return res.status(404).json({ error: 'Không tìm thấy lớp.' });
  if (classSnap.data()?.teacherId !== uid) {
    return res.status(403).json({ error: 'Chỉ giáo viên chủ lớp mới xem được mã PIN.' });
  }

  const [students, secrets] = await Promise.all([
    classSnap.ref.collection('students').get(),
    classSnap.ref.collection('studentSecrets').get(),
  ]);
  const pinTheoId = new Map(secrets.docs.map(d => [d.id, String(d.data()?.pinPlain || '')]));

  const rows = students.docs
    .map(d => ({
      studentId: d.id,
      name: String(d.data()?.name || ''),
      pin: pinTheoId.get(d.id) || null,
    }))
    .filter(r => r.name)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

  return res.status(200).json({
    joinCode: String(classSnap.data()?.joinCode || ''),
    className: String(classSnap.data()?.name || ''),
    rows,
  });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Chỉ nhận POST' });
  }

  const body = readBody(req);
  const action = String(body.action || '');

  try {
    const db = getAdminDb();
    if (action === 'roster') return await handleRoster(db, body, res);
    if (action === 'login') return await handleLogin(db, body, res);
    if (action === 'issuePins') return await handleIssuePins(db, body, res);
    if (action === 'resetOnePin') return await handleResetOnePin(db, body, res);
    if (action === 'viewPin') return await handleViewPin(db, body, res);
    if (action === 'viewClassPins') return await handleViewClassPins(db, body, res);
    if (action === 'revokeStudentAccess') return await handleRevokeStudentAccess(db, body, res);
    if (action === 'revokeClass') return await handleRevokeClass(db, body, res);
    return res.status(400).json({ error: `Hành động không hợp lệ: ${action}` });
  } catch (error) {
    console.error('[classroom] lỗi', error);
    return res.status(500).json({ error: 'Máy chủ gặp lỗi. Thử lại sau ít phút.' });
  }
}
