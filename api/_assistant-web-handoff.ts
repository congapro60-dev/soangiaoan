import { createHash, randomBytes } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import type { VercelResponse } from '@vercel/node';

type Db = FirebaseFirestore.Firestore;
type Data = FirebaseFirestore.DocumentData;
const TICKETS = 'assistantWebTickets';
const SESSIONS = 'assistantParentWebSessions';
const STUDENT_SESSIONS = 'assistantStudentWebSessions';
const TTL = 5 * 60_000;
const SESSION_TTL = 8 * 60 * 60_000;
export const PARENT_WEB_COOKIE = 'spai_parent_web';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const opaque = () => randomBytes(32).toString('hex');
const validToken = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
/** Only an HttpOnly cookie may supply this credential; never trust a JSON session field. */
export function bindParentWebCookie(body: Record<string, unknown>, cookie: unknown): void {
  delete body.webParentSession;
  const value = String(cookie || '').split(';').map(part => part.trim())
    .find(part => part.startsWith(PARENT_WEB_COOKIE + '='))?.slice(PARENT_WEB_COOKIE.length + 1);
  if (validToken(value)) body.webParentSession = value;
}
const pinRevision = (secret: Data) => digest(`${secret.pinHash}|${secret.updatedAt ?? ''}`);
function fail(): never { throw new Error('Liên kết đã hết hạn, đã dùng hoặc quyền truy cập đã đổi. Nhắn web trong bot để lấy liên kết mới.'); }

async function currentIdentity(db: Db, tx: FirebaseFirestore.Transaction, ticket: Data) {
  const link = (await tx.get(db.collection('channelLinks').doc(ticket.linkId))).data();
  const classRef = db.collection('classes').doc(ticket.classId);
  const cls = (await tx.get(classRef)).data();
  const student = (await tx.get(classRef.collection('students').doc(ticket.studentId))).data();
  const secret = (await tx.get(classRef.collection(ticket.role === 'parent' ? 'parentSecrets' : 'studentSecrets').doc(ticket.studentId))).data();
  if (!link || !link.active || link.channel !== 'zalo_bot' || link.channelAccountId !== ticket.botId
    || link.channelUserId !== ticket.userId || link.role !== ticket.role || link.classId !== ticket.classId || link.studentId !== ticket.studentId
    || !cls || !student || !secret?.pinHash || cls.teacherId !== ticket.teacherId || pinRevision(secret) !== ticket.pinRevision
    || cls.joinCode !== ticket.joinCode) fail();
  if (ticket.assignmentId) {
    const assignment = (await tx.get(db.collection('assignments').doc(ticket.assignmentId))).data();
    if (!assignment || assignment.classId !== ticket.classId || assignment.teacherId !== ticket.teacherId
      || Array.isArray(assignment.targetStudentIds) && assignment.targetStudentIds.length && !assignment.targetStudentIds.includes(ticket.studentId)) fail();
  }
  return { cls: cls!, student: student!, secret: secret! };
}

/** Only the verified channel identity may issue this link; no PIN or bearer credential goes in the query. */
export async function issueWebHandoff(db: Db, botId: string, userId: string, role: 'student' | 'parent', classId: string, studentId: string, assignmentId?: string): Promise<string> {
  const links = await db.collection('channelLinks').where('channel', '==', 'zalo_bot').where('channelAccountId', '==', botId)
    .where('channelUserId', '==', userId).where('active', '==', true).get();
  const link = links.docs.find(doc => { const d = doc.data(); return d.role === role && d.classId === classId && d.studentId === studentId; });
  if (!link) fail();
  const token = opaque();
  const ref = db.collection(TICKETS).doc(digest(token));
  const ticket = await db.runTransaction(async tx => {
    const cls = (await tx.get(db.collection('classes').doc(classId))).data();
    const secret = (await tx.get(db.collection('classes').doc(classId).collection(role === 'parent' ? 'parentSecrets' : 'studentSecrets').doc(studentId))).data();
    if (!cls?.joinCode || !secret?.pinHash) fail();
    const value = { linkId: link!.id, botId, userId, role, classId, studentId, teacherId: cls!.teacherId,
      joinCode: cls!.joinCode, ...(assignmentId ? { assignmentId } : {}), pinRevision: pinRevision(secret!), expiresAt: Date.now() + TTL, confirmed: false, consumed: false };
    await currentIdentity(db, tx, value);
    tx.create(ref, value);
    return value;
  });
  const origin = new URL(process.env.ASSISTANT_WEB_ORIGIN || 'https://zalo-test.congapro60-devs-projects.vercel.app').origin;
  return `${origin}/${role === 'parent' ? 'ph' : 'lop'}/${encodeURIComponent(ticket.joinCode)}#bot=${token}`;
}

/** Confirmation must be typed in the original linked chat; a forwarded URL alone grants nothing. */
export async function confirmWebHandoff(db: Db, botId: string, userId: string, message: string): Promise<string | null> {
  const match = /^(?:mở|mo)\s+web\s+([a-f0-9]{12})$/i.exec(message.trim());
  if (!match) return null;
  const found = await db.collection(TICKETS).where('botId', '==', botId).where('userId', '==', userId)
    .where('confirmationHash', '==', digest(match[1].toLowerCase())).get();
  if (found.docs.length !== 1) return 'Mã xác nhận không hợp lệ. Hãy chép đúng mã đang hiện trên trang web.';
  try {
    await db.runTransaction(async tx => {
      const snap = await tx.get(found.docs[0].ref), value = snap.data();
      if (!value || value.expiresAt <= Date.now() || value.consumed || !value.browserHash) fail();
      await currentIdentity(db, tx, value);
      tx.update(snap.ref, { confirmed: true });
    });
    return 'Đã xác nhận mở web. Quay lại đúng trang đang hiện mã này để tiếp tục.';
  } catch { return 'Liên kết mở web đã hết hạn hoặc quyền đã đổi. Nhắn web để lấy liên kết mới.'; }
}

export async function verifyParentWebSession(db: Db, token: unknown, classId: string, studentId: string, tx?: FirebaseFirestore.Transaction): Promise<Data | null> {
  if (!validToken(token)) return null;
  const check = async (transaction: FirebaseFirestore.Transaction) => {
    const value = (await transaction.get(db.collection(SESSIONS).doc(digest(token)))).data();
    if (!value || value.expiresAt <= Date.now() || value.classId !== classId || value.studentId !== studentId || value.role !== 'parent') return null;
    try { await currentIdentity(db, transaction, value); return value; } catch { return null; }
  };
  return tx ? check(tx) : db.runTransaction(check);
}

/** Legacy PIN logins retain their existing policy; bot logins revalidate their server-only grant. */
export async function verifyStudentBotLink(db: Db, uid: string, link: Data | undefined, tx?: FirebaseFirestore.Transaction): Promise<boolean> {
  if (!link) return false;
  if (!Object.prototype.hasOwnProperty.call(link, 'botWebSession')) return true;
  if (!validToken(link.botWebSession)) return false;
  const check = async (transaction: FirebaseFirestore.Transaction) => {
    const value = (await transaction.get(db.collection(STUDENT_SESSIONS).doc(link.botWebSession))).data();
    if (!value || value.uid !== uid || value.role !== 'student' || value.expiresAt <= Date.now()
      || value.classId !== link.classId || value.studentId !== link.studentId || value.teacherId !== link.teacherId) return false;
    try { await currentIdentity(db, transaction, value); return true; } catch { return false; }
  };
  return tx ? check(tx) : db.runTransaction(check);
}

/** POST only, invoked before ordinary classroom actions; GET/link previews never consume tickets. */
export async function handleWebHandoffAction(db: Db, body: Data, res: VercelResponse): Promise<boolean> {
  if (!['beginBotWeb', 'redeemBotWeb', 'parentWebSession', 'logoutParentWeb'].includes(body.action)) return false;
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (body.action === 'logoutParentWeb') {
      if (validToken(body.webParentSession)) await db.collection(SESSIONS).doc(digest(body.webParentSession)).delete();
      res.setHeader('Set-Cookie', `${PARENT_WEB_COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
      res.status(200).json({ ok: true }); return true;
    }
    if (body.action === 'parentWebSession') {
      const session = validToken(body.webParentSession) ? (await db.collection(SESSIONS).doc(digest(body.webParentSession)).get()).data() : null;
      const valid = session && await verifyParentWebSession(db, body.webParentSession, session.classId, session.studentId);
      if (!valid) fail();
      res.status(200).json({ role: 'parent', joinCode: valid!.joinCode, studentId: valid!.studentId, assignmentId: valid!.assignmentId || '' }); return true;
    }
    if (!validToken(body.ticket) || !validToken(body.verifier)) fail();
    const ref = db.collection(TICKETS).doc(digest(body.ticket));
    if (body.action === 'beginBotWeb') {
      const code = randomBytes(6).toString('hex');
      const result = await db.runTransaction(async tx => {
        const value = (await tx.get(ref)).data();
        if (!value || value.expiresAt <= Date.now() || value.consumed || value.browserHash && value.browserHash !== digest(body.verifier)) fail();
        await currentIdentity(db, tx, value);
        if (value.browserHash) return { code: null, expiresAt: value.expiresAt };
        tx.update(ref, { browserHash: digest(body.verifier), confirmationHash: digest(code) });
        return { code, expiresAt: value.expiresAt };
      });
      res.status(200).json(result); return true;
    }
    let uid = '';
    if (typeof body.idToken === 'string') {
      const identity = await getAuth().verifyIdToken(body.idToken);
      if (identity.firebase?.sign_in_provider !== 'anonymous') fail();
      uid = identity.uid;
    }
    const parentToken = opaque();
    const result = await db.runTransaction(async tx => {
      const value = (await tx.get(ref)).data();
      if (!value || value.expiresAt <= Date.now() || value.consumed || value.browserHash !== digest(body.verifier)) fail();
      const identity = await currentIdentity(db, tx, value!);
      if (!value!.confirmed) return null;
      if (value!.role === 'student') {
        if (!uid) fail();
        const sessionId = opaque();
        tx.create(db.collection(STUDENT_SESSIONS).doc(sessionId), { ...value, uid, pinUpdatedAt: identity.secret.updatedAt ?? '', expiresAt: Date.now() + SESSION_TTL });
        tx.set(db.collection('studentLinks').doc(uid), { uid, classId: value!.classId, studentId: value!.studentId, teacherId: value!.teacherId, botWebSession: sessionId, createdAt: new Date().toISOString() });
      } else tx.create(db.collection(SESSIONS).doc(digest(parentToken)), { ...value, expiresAt: Date.now() + SESSION_TTL });
      tx.update(ref, { consumed: true });
      return { role: value!.role, joinCode: value!.joinCode, studentId: value!.studentId, studentName: identity.student.name || '', assignmentId: value!.assignmentId || '' };
    });
    if (!result) { res.status(202).json({ pending: true }); return true; }
    if (result.role === 'parent') res.setHeader('Set-Cookie', `${PARENT_WEB_COOKIE}=${parentToken}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL / 1000}`);
    res.status(200).json(result);
  } catch { res.status(401).json({ error: 'Liên kết đã hết hạn, đã dùng hoặc quyền đã đổi. Nhắn web trong bot để lấy liên kết mới.' }); }
  return true;
}
