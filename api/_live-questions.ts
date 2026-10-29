/// <reference types="node" />
/**
 * COMM-AQ-01 — Câu hỏi ẩn danh trong tiết live (spec: tasks/gate-pd-hand-raise-anon-questions.md).
 *
 * Quyết định khóa cứng: câu HS gõ/gửi luôn ẨN DANH tuyệt đối — server xác thực quyền gửi
 * qua idToken nhưng KHÔNG ghi bất kỳ định danh nào (uid, tên, device, IP) vào câu hỏi,
 * KHÔNG lưu bảng ánh xạ questionId → studentId, KHÔNG log uid kèm nội dung câu hỏi.
 * Hand raise (CÓ tên) đi qua Firestore trực tiếp ở client — tách biệt hoàn toàn.
 */
import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';

type Db = FirebaseFirestore.Firestore;
type Data = Record<string, unknown>;

const MAX_BODY = 500;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 5;
const NONCE_WINDOW_MS = 10 * 60_000;

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const isSafeId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);

/** Rate-limit in-memory theo uid — chỉ giữ timestamp, không giữ nội dung. */
const rateBuckets = new Map<string, number[]>();
const allowSend = (uid: string, now: number): boolean => {
  const bucket = (rateBuckets.get(uid) ?? []).filter((ts) => now - ts < RATE_WINDOW_MS);
  if (bucket.length >= RATE_MAX_PER_WINDOW) { rateBuckets.set(uid, bucket); return false; }
  bucket.push(now);
  rateBuckets.set(uid, bucket);
  return true;
};

const bad = (res: VercelResponse, status: number, message: string) => {
  res.status(status).json({ error: message });
  return true;
};

/** HS gửi câu hỏi ẩn danh: xác thực qua idToken nhưng KHÔNG ghi định danh vào câu hỏi. */
export const handleLiveAnonymousQuestion = async (db: Db, body: Data, res: VercelResponse): Promise<boolean> => {
  if (body.action !== 'liveAnonymousQuestion') return false;
  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(text(body.idToken))).uid;
  } catch { return bad(res, 401, 'Phiên đăng nhập không hợp lệ.'); }
  const sessionId = body.sessionId;
  if (!isSafeId(sessionId)) return bad(res, 400, 'Phiên không hợp lệ.');
  const questionBody = text(body.body);
  if (questionBody.length < 2 || questionBody.length > MAX_BODY) return bad(res, 400, 'Câu hỏi từ 2 đến 500 ký tự.');
  const activityId = text(body.activityId);
  if (activityId && (activityId.length > 128 || /[/\n\r]/.test(activityId))) return bad(res, 400, 'Ngữ cảnh hoạt động không hợp lệ.');
  const clientNonce = text(body.clientNonce);
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(clientNonce)) return bad(res, 400, 'Mã chống trùng không hợp lệ.');

  const sessionRef = db.collection('liveLessonSessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();
  const session = sessionDoc.data();
  if (!sessionDoc.exists || !session) return bad(res, 404, 'Phiên tiết trực tiếp không tồn tại.');
  if (session.status === 'closed') return bad(res, 409, 'Tiết đã kết thúc.');

  // Quyền gửi: HS phải gắn với đúng lớp của phiên. Đọc studentLinks TẠI REQUEST BOUNDARY
  // rồi vứt bỏ — không ghi vào câu hỏi, không lưu mapping.
  const link = (await db.collection('studentLinks').doc(uid).get()).data();
  if (!link || link.classId !== session.classId) return bad(res, 403, 'Em không thuộc lớp của phiên này.');

  const now = Date.now();
  if (!allowSend(uid, now)) return bad(res, 429, 'Em vừa gửi nhiều câu rồi, nghỉ một chút nhé.');

  // Idempotency: trùng nonce trong 10 phút → trả lại câu cũ, không tạo bản ghi mới.
  const questionsRef = sessionRef.collection('questions');
  const windowSince = new Date(now - NONCE_WINDOW_MS);
  const dup = await questionsRef
    .where('clientNonce', '==', clientNonce)
    .where('serverReceivedAt', '>=', windowSince)
    .limit(1)
    .get();
  if (!dup.empty) {
    const existing = dup.docs[0];
    res.status(200).json({ questionId: existing.id, duplicate: true });
    return true;
  }

  // Doc câu hỏi CHỈ chứa nội dung + ngữ cảnh bài học. questionId random độc lập,
  // không suy ra từ uid/nonce/hand raise.
  const questionId = randomUUID();
  await questionsRef.doc(questionId).set({
    questionId,
    classId: session.classId,
    activityId: activityId || null,
    body: questionBody,
    clientNonce,
    status: 'new',
    isPublished: false,
    serverReceivedAt: FieldValue.serverTimestamp(),
  });
  // Log không kèm uid (chỉ metrics tổng).
  console.log('[live-question] accepted', JSON.stringify({ sessionId, bytes: questionBody.length }));
  res.status(200).json({ questionId, duplicate: false });
  return true;
};

const teacherOwnedSession = async (db: Db, uid: string, sessionId: unknown) => {
  if (!isSafeId(sessionId)) return null;
  const sessionRef = db.collection('liveLessonSessions').doc(sessionId);
  const doc = await sessionRef.get();
  const data = doc.data();
  if (!doc.exists || !data || data.teacherUid !== uid) return null;
  return { sessionId: sessionId as string, session: data, sessionRef };
};

/** GV điều hành câu hỏi: Công bố / đổi trạng thái / Xóa. GV không bao giờ thấy người gửi. */
export const handleLiveQuestionModeration = async (db: Db, body: Data, res: VercelResponse): Promise<boolean> => {
  if (body.action !== 'livePublishQuestion' && body.action !== 'liveSetQuestionStatus') return false;
  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(text(body.idToken))).uid;
  } catch { return bad(res, 401, 'Phiên đăng nhập không hợp lệ.'); }
  const owned = await teacherOwnedSession(db, uid, body.sessionId);
  if (!owned) return bad(res, 403, 'Chỉ giáo viên điều hành phiên này được sửa câu hỏi.');
  const questionId = body.questionId;
  if (!isSafeId(questionId)) return bad(res, 400, 'Mã câu hỏi không hợp lệ.');
  const questionRef = owned.sessionRef.collection('questions').doc(questionId);

  if (body.action === 'livePublishQuestion') {
    const doc = await questionRef.get();
    const question = doc.data();
    if (!doc.exists || !question) return bad(res, 404, 'Không tìm thấy câu hỏi.');
    if (question.status === 'hidden') return bad(res, 409, 'Câu hỏi đã bị ẩn.');
    // Câu công bố chỉ chứa nội dung + mã ẩn danh — không có định danh ở bất kỳ trường nào.
    await owned.sessionRef.collection('publishedQuestions').doc(questionId).set({
      questionId,
      activityId: question.activityId ?? null,
      body: question.body,
      publishedAt: FieldValue.serverTimestamp(),
    });
    await questionRef.set({ status: 'reviewing', isPublished: true }, { merge: true });
    res.status(200).json({ published: true });
    return true;
  }

  const status = text(body.status);
  if (!['reviewing', 'answered', 'deferred', 'hidden', 'new'].includes(status)) return bad(res, 400, 'Trạng thái không hợp lệ.');
  const doc = await questionRef.get();
  if (!doc.exists) return bad(res, 404, 'Không tìm thấy câu hỏi.');
  if (status === 'hidden') {
    // Ẩn: gỡ khỏi public nếu đã công bố.
    await owned.sessionRef.collection('publishedQuestions').doc(questionId).delete().catch(() => undefined);
  }
  await questionRef.set({ status }, { merge: true });
  if (text(body.delete) === 'true' || body.delete === true) {
    await questionRef.delete();
  }
  res.status(200).json({ status });
  return true;
};
