import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { teacherContext } from './_classroom-teacher.js';
import { classMemberId, readClassAccess } from './_classroom-access.js';
import { isSafeDocId } from '../src/lib/classroom/parentAccess.js';

/** Chỉ gửi tín hiệu: điểm luôn đọc qua API kiểm quyền hiện có, không đưa PII vào stream. */
export const handleScoreBookStream = async (
  db: FirebaseFirestore.Firestore,
  body: Record<string, unknown>,
  res: VercelResponse,
): Promise<void> => {
  const token = typeof body.idToken === 'string' ? body.idToken : '';
  const student = body.action === 'studentScoreBookStream';
  let uid: string; let classId: string; let studentId = '';
  if (student) {
    const identity = token ? await getAuth().verifyIdToken(token, true).catch(() => null) : null;
    if (!identity) return void res.status(401).json({ error: 'Phiên đăng nhập học sinh không hợp lệ.' });
    uid = identity.uid;
    const link = (await db.collection('studentLinks').doc(uid).get()).data();
    if (!isSafeDocId(link?.classId) || !isSafeDocId(link?.studentId)) return void res.status(403).json({ error: 'Phiên học sinh không hợp lệ.' });
    classId = link.classId; studentId = link.studentId;
  } else {
    const context = await teacherContext(db, body, res);
    if (!context) return;
    uid = context.uid; classId = context.classId;
  }
  const classRef = db.collection('classes').doc(classId);
  const authorized = async (): Promise<boolean> => {
    const identity = await getAuth().verifyIdToken(token, true).catch(() => null);
    if (identity?.uid !== uid) return false;
    if (!student) return Boolean(await readClassAccess(db, classId, uid));
    const [link, classroom, roster] = await Promise.all([
      db.collection('studentLinks').doc(uid).get(), classRef.get(), classRef.collection('students').doc(studentId).get(),
    ]);
    return link.exists && link.data()?.classId === classId && link.data()?.studentId === studentId && classroom.exists && roster.exists;
  };
  if (!(await authorized())) return void res.status(403).json({ error: 'Không còn quyền xem bảng điểm.' });
  if (res.destroyed) return;
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  await new Promise<void>(resolve => {
    let closed = false; let running = false; let dirty = false;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const unsubscribes: Array<() => void> = [];
    const close = () => {
      if (closed) return;
      closed = true;
      clearTimeout(pending); clearTimeout(duration); clearInterval(heartbeat);
      for (const unsubscribe of unsubscribes) unsubscribe();
      res.removeListener('close', close); res.removeListener('error', close);
      if (!res.destroyed) res.end();
      resolve();
    };
    const flush = async () => {
      pending = undefined;
      if (closed || running) return;
      running = true;
      try {
        const changed = dirty; dirty = false;
        if (!(await authorized())) { close(); return; }
        if (!closed && !res.destroyed) res.write(`${JSON.stringify({ type: changed ? 'invalidate' : 'ping' })}\n`);
      } catch { close(); }
      finally {
        running = false;
        if (dirty && !closed && !pending) pending = setTimeout(() => void flush(), 25);
      }
    };
    const invalidate = () => {
      if (closed) return;
      dirty = true;
      if (!running && !pending) pending = setTimeout(() => void flush(), 25);
    };
    const duration = setTimeout(close, 40_000);
    const heartbeat = setInterval(() => { if (!running && !pending) void flush(); }, 10_000);
    res.on('close', close); res.on('error', close);
    const sources: Array<FirebaseFirestore.Query | FirebaseFirestore.DocumentReference> = [
      db.collection('scoreBooks').doc(classId), classRef,
      db.collection('assignments').where('classId', '==', classId),
      ...['submissions', 'examSubmissions'].map(name => {
        const query = db.collection(name).where('classId', '==', classId);
        return student ? query.where('studentId', '==', studentId) : query;
      }),
      ...(student ? [db.collection('studentLinks').doc(uid), classRef.collection('students').doc(studentId)]
        : [db.collection('classMembers').doc(classMemberId(classId, uid)), classRef.collection('students')]),
    ];
    try {
      for (const source of sources) {
        if (closed) break;
        const unsubscribe = source.onSnapshot(invalidate, close);
        if (closed) unsubscribe(); else unsubscribes.push(unsubscribe);
      }
      invalidate();
    } catch { close(); }
  });
};
