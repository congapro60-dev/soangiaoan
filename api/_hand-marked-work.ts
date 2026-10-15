import type { VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { getAdminStorage } from './_exam-core.js';
import { actorStamp, assertActorCurrent, authorizeSubmissionActor, consumeActorGrant, discardActorFiles, prepareActorFiles, releasePendingSources, SubmissionAccessError, type ActorContext } from './_submission-actors.js';
import { uniqueStoragePaths } from './_classroom-storage.js';
import type { HandMarkedEvidence, SubmissionDoc } from '../src/lib/classroom/types.js';
type Db = FirebaseFirestore.Firestore;
type Data = FirebaseFirestore.DocumentData;
const fail = (code: number, message: string): never => { throw new SubmissionAccessError(code, message); };
const id = (value: unknown): string => typeof value === 'string' && !!value && value.length <= 150 && !value.includes('/') ? value : fail(422, 'Mã bản chấm tay không hợp lệ.');
/** Explicit metadata DTO: neither private paths nor storage tokens can leave this projector. */
export const handMarkedProjection = (data: Data, teacher = false): Pick<SubmissionDoc, 'handMarkedEvidence' | 'handMarkedPublished'> => {
  const evidence = data.handMarkedEvidence;
  const published = data.handMarkedPublished === true;
  if (!teacher && !published || !evidence || typeof evidence !== 'object' || !Array.isArray(evidence.files)) return { handMarkedPublished: published };
  const actor = evidence.submittedBy || {};
  return { handMarkedPublished: published, handMarkedEvidence: {
    id: String(evidence.id || ''), files: evidence.files.map((file: Data) => ({ id: String(file.id || ''), name: String(file.name || ''), mimeType: String(file.mimeType || ''), size: Number(file.size) || 0, kind: file.kind === 'pdf' ? 'pdf' : 'image' })),
    note: String(evidence.note || ''), createdAt: String(evidence.createdAt || ''),
    submittedBy: { role: 'teacher', studentId: String(actor.studentId || ''), at: String(actor.at || ''), ...(teacher && typeof actor.uid === 'string' ? { uid: actor.uid } : {}) },
  } };
};
const current = async (db: Db, tx: FirebaseFirestore.Transaction, actor: ActorContext, submissionId: string, evidence = false): Promise<SubmissionDoc> => {
  const snap = await tx.get(db.collection('submissions').doc(submissionId));
  const data = { id: submissionId, ...snap.data() } as SubmissionDoc;
  if (!snap.exists || data.studentId !== actor.studentId || data.classId !== actor.classId || data.teacherId !== actor.teacherId) fail(403, 'Không có quyền với bài này.');
  if (snap.data()?.deletionRunId) fail(409, 'Bài nộp đang được xóa. Chờ xử lý xong rồi thử lại.');
  await assertActorCurrent(db, tx, actor, data.assignmentId, evidence);
  return data;
};
/** Internal AI context loader; never returns these signed URLs in a student/parent DTO. */
export const publishedHandMarkedImages = async (db: Db, submission: SubmissionDoc): Promise<string[]> => {
  const paths = await db.runTransaction(async tx => {
    const latest = (await tx.get(db.collection('submissions').doc(submission.id))).data();
    if (!latest || latest.classId !== submission.classId || latest.studentId !== submission.studentId || latest.teacherId !== submission.teacherId
      || latest.handMarkedPublished !== true || latest.handMarkedEvidence?.id !== submission.handMarkedEvidence?.id) fail(409, 'Bản chấm tay đã đổi hoặc không còn được công bố.');
    const revision = (await tx.get(db.collection('submissionHandMarkedReviews').doc(id(latest!.handMarkedEvidence.id)))).data();
    if (!revision || revision.submissionId !== submission.id || revision.classId !== submission.classId || revision.studentId !== submission.studentId || revision.teacherId !== submission.teacherId) fail(404, 'Không tìm thấy bản chấm tay.');
    return ((revision!.files || []) as Data[]).filter(file => file.kind === 'image' && typeof file.path === 'string' && file.path.startsWith(`hand-marked-homework/${submission.classId}/${submission.studentId}/`)).map(file => file.path as string);
  });
  return Promise.all(paths.map(async path => (await getAdminStorage().file(path).getSignedUrl({version:'v4',action:'read',expires:Date.now()+60000}))[0]));
};
export const handleHandMarkedWorkAction = async (db: Db, body: Data, res: VercelResponse): Promise<boolean> => {
  if (!['saveHandMarkedWork', 'setHandMarkedVisibility', 'readHandMarkedFile'].includes(body.action)) return false;
  try {
    res.setHeader('Cache-Control', 'no-store');
    const auth = await authorizeSubmissionActor(db, body, res); if (!auth) return true;
    const { actor, submissionId } = auth, ref = db.collection('submissions').doc(submissionId);
    if (body.action !== 'readHandMarkedFile' && actor.role !== 'teacher') fail(403, 'Chỉ giáo viên tải và công bố bản chấm tay.');
    if (body.action === 'readHandMarkedFile' && actor.role !== 'teacher' && actor.role !== 'student' && actor.role !== 'parent') fail(403, 'Không có quyền xem bản chấm tay.');
    if (body.action === 'saveHandMarkedWork') {
      await db.runTransaction(tx => current(db, tx, actor, submissionId, true));
      const prepared = await prepareActorFiles(db, body, actor, auth.submission.assignmentId, 'hand_marked');
      const reviewId = randomUUID(), now = new Date().toISOString(), stamp = actorStamp(actor, now);
      const paths = uniqueStoragePaths(prepared.fileUrls, getAdminStorage().name);
      const files = prepared.attachments.map((file, index) => ({ id: randomUUID(), name: file.name, mimeType: file.mimeType!, size: file.size!, kind: file.kind === 'pdf' ? 'pdf' as const : 'image' as const, path: paths[index] }));
      let evidence: HandMarkedEvidence | undefined;
      try { await db.runTransaction(async tx => {
        const latest = await current(db, tx, actor, submissionId, true);
        if (latest.assignmentId !== auth.submission.assignmentId) fail(409, 'Bài nộp vừa đổi. Tải lại rồi gửi bản chấm tay.');
        const grantRef = await consumeActorGrant(db, tx, prepared, actor, latest.assignmentId, 'hand_marked');
        if (!grantRef) fail(409, 'Lượt tải bản chấm tay đã hết hạn hoặc đã dùng.');
        if (paths.length !== files.length || files.some(file => !file.path?.startsWith(`hand-marked-homework/${actor.classId}/${actor.studentId}/`) || file.kind === 'image' && !file.mimeType.startsWith('image/') || file.kind === 'pdf' && file.mimeType !== 'application/pdf')) fail(422, 'Tệp bản chấm tay không hợp lệ.');
        evidence = { id: reviewId, files: files.map(({path: _path, ...file}) => file), note: typeof body.note === 'string' ? body.note.trim().slice(0,2000) : '', submittedBy: stamp, createdAt: now };
        tx.create(db.collection('submissionHandMarkedReviews').doc(reviewId), { ...evidence, files, submissionId, classId: actor.classId, studentId: actor.studentId, teacherId: actor.teacherId });
        tx.create(db.collection('submissionHandMarkedAudit').doc(randomUUID()), { submissionId, reviewId, action: 'upload', actor: stamp, at: now });
        tx.update(ref, { handMarkedEvidence: evidence, handMarkedPublished: false, handMarkedPublishedAt: '', handMarkedPublishedBy: '', updatedAt: now });
        tx.update(grantRef!, { consumed: true, consumedAt: now, reviewId });
      }); } catch (reason) { await discardActorFiles(prepared); throw reason; }
      await releasePendingSources(prepared);
      res.status(200).json({ handMarkedEvidence: evidence, handMarkedPublished: false }); return true;
    }
    if (body.action === 'setHandMarkedVisibility') {
      const reviewId = id(body.expectedReviewId); if (typeof body.published !== 'boolean') fail(422, 'Trạng thái công bố không hợp lệ.');
      await db.runTransaction(async tx => {
        const latest = await current(db, tx, actor, submissionId);
        if (!latest.handMarkedEvidence || latest.handMarkedEvidence.id !== reviewId) fail(409, 'Bản chấm tay đã đổi. Tải lại để công bố đúng phiên bản.');
        const now = new Date().toISOString();
        tx.update(ref, { handMarkedPublished: body.published, handMarkedPublishedAt: now, handMarkedPublishedBy: actor.uid!, updatedAt: now });
        tx.create(db.collection('submissionHandMarkedAudit').doc(randomUUID()), { submissionId, reviewId, action: body.published ? 'publish' : 'unpublish', actor: actorStamp(actor, now), at: now });
      });
      res.status(200).json({ handMarkedPublished: body.published }); return true;
    }
    const reviewId = id(body.reviewId), fileId = id(body.fileId);
    const readPath = async (tx: FirebaseFirestore.Transaction) => {
      const latest = await current(db, tx, actor, submissionId);
      if (!latest.handMarkedEvidence || latest.handMarkedEvidence.id !== reviewId) fail(409, 'Bản chấm tay đã đổi. Mở lại bài để xem phiên bản hiện tại.');
      if (actor.role !== 'teacher' && latest.handMarkedPublished !== true) fail(403, 'Bản chấm tay chưa được công bố.');
      const revision = (await tx.get(db.collection('submissionHandMarkedReviews').doc(reviewId))).data() as Data | undefined;
      if (!revision) fail(404, 'Không tìm thấy bản chấm tay.');
      const stored = revision!;
      if (stored.submissionId !== submissionId || stored.classId !== actor.classId || stored.studentId !== actor.studentId || stored.teacherId !== actor.teacherId) fail(404, 'Không tìm thấy bản chấm tay.');
      const file = stored.files?.find((item: Data) => item.id === fileId);
      if (!file || typeof file.path !== 'string' || !file.path.startsWith(`hand-marked-homework/${actor.classId}/${actor.studentId}/`)) fail(404, 'Không tìm thấy tệp bản chấm tay.');
      return file.path as string;
    };
    const path = await db.runTransaction(readPath);
    const expiresAt = Date.now() + 60000;
    const [url] = await getAdminStorage().file(path).getSignedUrl({version:'v4',action:'read',expires:expiresAt});
    if (await db.runTransaction(readPath) !== path) fail(409, 'Bản chấm tay đã thay đổi. Mở lại bài.');
    res.status(200).json({ url, expiresAt }); return true;
  } catch (reason) { if (reason instanceof SubmissionAccessError) { res.status(reason.statusCode).json({ error: reason.message }); return true; } throw reason; }
};
