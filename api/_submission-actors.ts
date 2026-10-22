import { awaitsClarification } from '../src/lib/classroom/clarification.js';
import { attachAssignmentSolutions } from './_assignment-solutions.js';
import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { randomUUID } from 'node:crypto';
import { getAdminStorage } from './_exam-core.js';
import { classMemberId, deriveClassAccess, memberFromData } from './_classroom-access.js';
import { resolveParentStudent, verifyParentPin } from './_parent-auth.js';
import { verifyPin } from './_classroom-core.js';
import { isSafeDocId, isValidParentPin, normalizeParentPin } from '../src/lib/classroom/parentAccess.js';
import { uniqueStoragePaths } from './_classroom-storage.js';
import { mergeSubmissionEvidence } from '../src/lib/classroom/submissionRevision.js';
import type { SubmissionActor, SubmissionDoc, StudentAssignmentView } from '../src/lib/classroom/types.js';

type Db = FirebaseFirestore.Firestore;
type Data = FirebaseFirestore.DocumentData;

/** OMR-detected answer for one question: client canvas/code analysis output. */
export interface DetectedAnswer {
  questionNo: number;
  answer: 'A' | 'B' | 'C' | 'D' | null;
  confidence: number;
}

/** Validates detectedAnswers from client trust boundary. Returns valid array or throws 400. */
const validateDetectedAnswers = (input: unknown): DetectedAnswer[] | undefined => {
  if (input === undefined || input === null) return undefined;
  if (!Array.isArray(input)) error(400, 'detectedAnswers phải là mảng.');
  const entries = input as unknown[];
  if (entries.length > 40) error(400, 'detectedAnswers tối đa 40 câu.');
  // Empty array is valid: signals attempted OMR but no bubbles detected
  if (entries.length === 0) return [];
  const seen = new Set<number>();
  const ALLOWED = new Set(['A', 'B', 'C', 'D', null]);
  for (const item of entries) {
    if (!item || typeof item !== 'object') error(400, 'detectedAnswers phải là object.');
    const entry = item as Record<string, unknown>;
    const q = entry.questionNo as number;
    if (typeof q !== 'number' || !Number.isInteger(q) || q < 1 || q > 40) error(400, 'questionNo phải là số nguyên từ 1 đến 40.');
    if (seen.has(q)) error(400, `questionNo ${q} lặp trong detectedAnswers.`);
    seen.add(q);
    const ans = entry.answer;
    if (!(ans === null || typeof ans === 'string') || !ALLOWED.has(ans)) error(400, 'answer phải là A|B|C|D|null.');
    const conf = entry.confidence as number;
    if (typeof conf !== 'number' || !Number.isFinite(conf) || conf < 0 || conf > 1) error(400, 'confidence phải là số từ 0 đến 1.');
  }
  return input as DetectedAnswer[];
};

export class SubmissionAccessError extends Error { constructor(readonly statusCode: number, message: string) { super(message); } }
export interface ActorContext { role: SubmissionActor['role']; uid?: string; classId: string; teacherId: string; studentId: string; pin?: string; pinRevision?: string; joinCode?: string }
const error = (code: number, message: string): never => { throw new SubmissionAccessError(code, message); };
const id = (value: unknown): string => isSafeDocId(value) ? value : error(422, 'Mã bài hoặc học sinh không hợp lệ.');
const text = (value: unknown): string => typeof value === 'string' ? value : '';
const correctionPublished = (value: Data): boolean => value.handMarkedPublished === true && Boolean(value.handMarkedEvidence?.id)
  || value.status === 'graded' && Boolean(value.grade) && !awaitsClarification(value.grade.questionResults) && (!value.assignmentId || value.grade.teacherApproved === true);
export const actorStamp = (actor: ActorContext, at: string): SubmissionActor => ({ role: actor.role, ...(actor.uid ? { uid: actor.uid } : {}), studentId: actor.studentId, at });
export const resolveSubmissionActor = async (db: Db, body: Data, res: VercelResponse, scope?: Data): Promise<ActorContext | null> => {
  if (body.role === 'parent') {
    if (!isValidParentPin(body.pin)) error(401, 'Mã PIN phụ huynh không hợp lệ.');
    const target = await resolveParentStudent(db, body, res);
    if (!target || !await verifyParentPin(db, target, body.pin, res, { requireParentSet: true })) return null;
    const secret = (await target.secretRef.get()).data() || {};
    const actor: ActorContext = { pinRevision: `${secret.pinHash}|${secret.updatedAt}`, joinCode: text(target.classDoc.data().joinCode), role: 'parent', classId: target.classDoc.id, teacherId: text(target.classDoc.data().teacherId), studentId: target.studentId, pin: normalizeParentPin(body.pin) };
    if (scope && (scope.classId !== actor.classId || scope.teacherId !== actor.teacherId || scope.studentId && scope.studentId !== actor.studentId)) error(403, 'Không có quyền với bài này.');
    return actor;
  }
  let uid: string;
  try { if (!text(body.idToken)) throw new Error(); uid = (await getAuth().verifyIdToken(text(body.idToken))).uid; } catch { return error(401, 'Phiên đăng nhập không hợp lệ.'); }
  const link = (await db.collection('studentLinks').doc(uid).get()).data();
  if (body.role !== 'teacher' && link) {
    const actor: ActorContext = { role: 'student', uid, classId: id(link.classId), teacherId: id(link.teacherId), studentId: id(link.studentId) };
    if (scope && (scope.classId !== actor.classId || scope.teacherId !== actor.teacherId || scope.studentId && scope.studentId !== actor.studentId)) error(403, 'Không có quyền với bài này.');
    await db.runTransaction(tx => assertActorCurrent(db, tx, actor));
    return actor;
  }
  const classId = id(scope?.classId || body.classId);
  const classData = (await db.collection('classes').doc(classId).get()).data();
  const member = (await db.collection('classMembers').doc(classMemberId(classId, uid)).get()).data();
  if (!classData || !deriveClassAccess(classData, memberFromData(member), uid)) error(403, 'Không có quyền giáo viên với lớp này.');
  const actor: ActorContext = { role: 'teacher', uid, classId, teacherId: id(classData!.teacherId), studentId: id(scope?.studentId || body.studentId) };
  if (scope && scope.teacherId !== actor.teacherId) error(403, 'Bài không thuộc lớp này.');
  return actor;
};
/** Re-read identity, enrollment and authorization in the SAME transaction as evidence mutation. */
export const assertActorCurrent = async (db: Db, tx: FirebaseFirestore.Transaction, actor: ActorContext, assignmentId?: string | null, evidence = false): Promise<Data | undefined> => {
  const classRef = db.collection('classes').doc(actor.classId);
  const classSnap = await tx.get(classRef);
  const student = await tx.get(classRef.collection('students').doc(actor.studentId));
  if (!classSnap.exists || !student.exists || classSnap.data()?.teacherId !== actor.teacherId) error(403, 'Học sinh không còn thuộc lớp này.');
  if (actor.role === 'teacher') {
    const member = await tx.get(db.collection('classMembers').doc(classMemberId(actor.classId, actor.uid!)));
    if (!deriveClassAccess(classSnap.data()!, memberFromData(member.data()), actor.uid!)) error(403, 'Quyền giáo viên đã bị thu hồi.');
  } else if (actor.role === 'student') {
    const link = (await tx.get(db.collection('studentLinks').doc(actor.uid!))).data();
    if (!link || link.classId !== actor.classId || link.studentId !== actor.studentId || link.teacherId !== actor.teacherId) error(403, 'Phiên học sinh đã bị thu hồi.');
  } else {
    const secret = (await tx.get(classRef.collection('parentSecrets').doc(actor.studentId))).data();
    if (!secret || secret.pinSetBy !== 'parent' || !verifyPin(actor.pin!, text(secret.pinHash)) || actor.pinRevision !== `${secret.pinHash}|${secret.updatedAt}` || actor.joinCode !== classSnap.data()?.joinCode) error(401, 'PIN phụ huynh đã thay đổi. Đăng nhập lại.');
  }
  if (!assignmentId) return undefined;
  const assignment = (await tx.get(db.collection('assignments').doc(id(assignmentId)))).data();
  if (!assignment || assignment.classId !== actor.classId || assignment.teacherId !== actor.teacherId
      || Array.isArray(assignment.targetStudentIds) && assignment.targetStudentIds.length && !assignment.targetStudentIds.includes(actor.studentId)) error(403, 'Bài không được giao cho học sinh này.');
  if (evidence && (assignment!.type === 'exam' || assignment!.deliveryMode === 'online')) error(422, 'Bài thi online dùng luồng làm bài riêng, không nộp hoặc xác nhận ảnh qua chức năng này.');
  if (evidence && assignment!.submissionLocked === true) error(409, 'Bài đã khóa chốt. Nhờ thầy cô mở khóa trước khi nộp hoặc xác nhận.');
  return assignment;
};
export const authorizeSubmissionActor = async (db: Db, body: Data, res: VercelResponse) => {
  if (body.role !== 'parent' && !text(body.idToken)) error(401, 'Phiên đăng nhập không hợp lệ.');
  const submissionId = id(body.submissionId);
  const snapshot = await db.collection('submissions').doc(submissionId).get();
  if (!snapshot.exists) error(404, 'Không tìm thấy bài nộp.');
  const submission = { id: submissionId, ...snapshot.data() } as SubmissionDoc;
  const actor = await resolveSubmissionActor(db, body, res, submission);
  return actor ? { actor, submission, submissionId } : null;
};
const mimeAllowed = (mime: string) => ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(mime);
const filesInput = (input: unknown): Array<{ name: string; mimeType: string; size: number }> => {
  if (!Array.isArray(input) || !input.length || input.length > 12) error(422, 'Chọn từ 1 đến 12 tệp.');
  return (input as Data[]).map(raw => {
    const name = text(raw?.name).slice(0, 300), mimeType = text(raw?.mimeType), size = raw?.size;
    if (!name || !mimeAllowed(mimeType) || !Number.isInteger(size) || size < 1 || size >= 20 * 1024 * 1024) error(422, 'Loại hoặc kích thước tệp không hợp lệ (dưới 20 MB).');
    return { name, mimeType, size };
  });
};
const uploadOrigin = (value: unknown): string => { const allowed = ['https://giaoandewey.vercel.app', ...[process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean).map(host => `https://${host}`)]; const candidate = text(value); if (allowed.includes(candidate) || process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(candidate)) return candidate; return allowed[0]; };
const grantOwner = (grant: Data, actor: ActorContext, assignmentId: string | null, purpose: string) => grant.role === actor.role && grant.uid === (actor.uid || '') && grant.studentId === actor.studentId && grant.classId === actor.classId && grant.teacherId === actor.teacherId && grant.assignmentId === assignmentId && grant.purpose === purpose && grant.pinRevision === (actor.pinRevision || '') && grant.expiresAt > Date.now() && grant.consumed !== true;
export const prepareActorFiles = async (db: Db, body: Data, actor: ActorContext, assignmentId: string | null, purpose = 'submission') => {
  const bucket = getAdminStorage();
  const grantId = text(body.uploadGrantId);
  let grant: Data | undefined;
  let sourceFiles: Array<{ path: string; name: string; mimeType?: string; size?: number }>;
  if (grantId) {
    grant = (await db.collection('submissionUploadGrants').doc(id(grantId)).get()).data();
    if (!grant || !grantOwner(grant, actor, assignmentId, purpose) || ['clarification','correction','hand_marked'].includes(purpose) && (grant.submissionId !== body.submissionId || purpose === 'clarification' && grant.questionNumber !== body.questionNumber)) error(422, 'Lượt tải ảnh đã hết hạn, dùng rồi hoặc không thuộc bài này.');
    sourceFiles = grant!.files;
  } else {
    if (actor.role === 'parent' || purpose === 'hand_marked') error(422, 'Tải tệp qua lượt được cấp cho bài này.');
    const urls = body.fileUrls || body.photoUrls;
    if (!Array.isArray(urls) || !urls.length || urls.length > 12 || urls.some(value => typeof value !== 'string')) error(422, 'Chọn ảnh bài làm để nộp.');
    const paths = uniqueStoragePaths(urls, bucket.name);
    if (paths.length !== urls.length || paths.some(path => !path.startsWith(`homework/${actor.uid}/`) || path.slice(`homework/${actor.uid}/`.length).includes('/'))) error(422, 'Tệp không thuộc kho bài làm của tài khoản đang nộp.');
    sourceFiles = paths.map(path => ({ path, name: path.split('/').at(-1)! }));
  }
  const batchId = randomUUID();
  const attachments = [];
  const copiedPaths: string[] = [];
  try {
  for (const [index, source] of sourceFiles.entries()) {
    const file = bucket.file(source.path);
    // Ảnh của lượt được cấp chưa tải lên xong (client gửi sớm) → báo rõ cho người nộp, không thành lỗi máy chủ 500.
    const [metadata] = await file.getMetadata().catch((reason: { code?: number }) => {
      if (grant && reason?.code === 404) error(422, 'Ảnh chưa tải lên xong. Chờ tải xong rồi bấm nộp lại.');
      throw reason;
    });
    if (!metadata || !mimeAllowed(metadata.contentType || '') || Number(metadata.size) < 1 || Number(metadata.size) >= 20 * 1024 * 1024
       || grant && (metadata.contentType !== source.mimeType || Number(metadata.size) !== source.size || metadata.name !== source.path)) error(422, 'Ảnh không khớp loại, kích thước hoặc đường dẫn được cấp.');
    const path = purpose === 'hand_marked'
      ? `hand-marked-homework/${actor.classId}/${actor.studentId}/${batchId}-${index}`
      : `accepted-homework/${actor.classId}/${actor.studentId}/${batchId}-${index}`;
    await bucket.file(source.path, metadata.generation ? { generation: metadata.generation } : undefined).copy(bucket.file(path), { preconditionOpts: { ifGenerationMatch: 0 } });
    copiedPaths.push(path);
    const token = randomUUID();
    await bucket.file(path).setMetadata({ contentType: metadata.contentType, metadata: { firebaseStorageDownloadTokens: purpose === 'hand_marked' ? null : token } });
    const url = purpose === 'hand_marked' ? `gs://${bucket.name}/${path}` : `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
    attachments.push({ name: source.name, url, mimeType: metadata.contentType, size: Number(metadata.size), kind: (metadata.contentType!.startsWith('image/') ? 'image' : metadata.contentType === 'application/pdf' ? 'pdf' : 'document') as 'image' | 'pdf' | 'document' });
  }
  return { attachments, fileUrls: attachments.map(file => file.url), grantId, grant };
  } catch (reason) { await Promise.allSettled(copiedPaths.map(path => bucket.file(path).delete())); throw reason; }
};
export const consumeActorGrant = async (db: Db, tx: FirebaseFirestore.Transaction, prepared: Awaited<ReturnType<typeof prepareActorFiles>>, actor: ActorContext, assignmentId: string | null, purpose = 'submission'): Promise<FirebaseFirestore.DocumentReference | undefined> => {
  if (!prepared.grantId) return undefined;
  const ref = db.collection('submissionUploadGrants').doc(prepared.grantId);
  const fresh = (await tx.get(ref)).data();
  if (!fresh || !grantOwner(fresh, actor, assignmentId, purpose) || JSON.stringify(fresh.files) !== JSON.stringify(prepared.grant?.files) || fresh.submissionId !== prepared.grant?.submissionId || fresh.questionNumber !== prepared.grant?.questionNumber) error(409, 'Lượt tải ảnh đã dùng hoặc đã thay đổi.');
  return ref;
};
/**
 * Sau khi lượt nộp đã ghi xong: ảnh đã chép sang `accepted-homework/`, bản tạm ở `pending-homework/` không còn dùng — xoá để
 * mỗi bài không chiếm dung lượng gấp đôi. Lỗi xoá không làm hỏng lượt nộp đã thành công.
 */
export const releasePendingSources = async (prepared: Awaited<ReturnType<typeof prepareActorFiles>>): Promise<void> => {
  const files = (prepared.grant?.files || []) as Array<{ path?: unknown }>;
  const paths = files.map(file => String(file.path || '')).filter(path => path.startsWith('pending-homework/'));
  if (!paths.length) return;
  const bucket = getAdminStorage();
  await Promise.allSettled(paths.map(path => bucket.file(path).delete()));
};
/** Một học sinh không giữ quá chừng này lượt tải ảnh chưa dùng cùng lúc (chặn xin lượt liên tục để làm đầy kho). */
const MAX_OPEN_GRANTS = 10;
/**
 * Dọn lượt tải ảnh đã hết hạn mà chưa dùng (bỏ dở) của học sinh này: xoá ảnh tạm + lượt. Trả số lượt còn hạn chưa dùng.
 */
const sweepStudentGrants = async (db: Db, studentId: string, now: number): Promise<number> => {
  const snap = await db.collection('submissionUploadGrants').where('studentId', '==', studentId).where('consumed', '==', false).get();
  const bucket = getAdminStorage();
  let open = 0;
  for (const doc of snap.docs) {
    const grant = doc.data();
    if (Number(grant.expiresAt) > now) { open += 1; continue; }
    const paths = (Array.isArray(grant.files) ? grant.files : []).map((file: Data) => String(file?.path || '')).filter((path: string) => path.startsWith('pending-homework/'));
    await Promise.allSettled(paths.map((path: string) => bucket.file(path).delete()));
    await doc.ref.delete().catch(() => undefined);
  }
  return open;
};
export const discardActorFiles = async (prepared: Awaited<ReturnType<typeof prepareActorFiles>>): Promise<void> => { const bucket = getAdminStorage(); await Promise.allSettled(uniqueStoragePaths(prepared.fileUrls, bucket.name).filter(path => path.startsWith('accepted-homework/') || path.startsWith('hand-marked-homework/')).map(path => bucket.file(path).delete())); };
interface Projectors { projectStudentAssignment(id: string, data: Data): StudentAssignmentView; projectStudentSubmission(id: string, data: Data): SubmissionDoc }
export const handleSubmissionActorAction = async (db: Db, body: Data, res: VercelResponse, projectors: Projectors): Promise<boolean> => {
  if (!['setSubmissionLock', 'issueSubmissionUpload', 'submitActorSubmission', 'actorAssignments', 'actorAssignmentDetail'].includes(body.action)) return false;
  try {
    if (body.action === 'setSubmissionLock') {
      const assignmentId = id(body.assignmentId), ref = db.collection('assignments').doc(assignmentId), assignment = (await ref.get()).data();
      if (!assignment) error(404, 'Không tìm thấy bài giao.');
      let uid: string; try { uid = (await getAuth().verifyIdToken(text(body.idToken))).uid; } catch { return error(401, 'Cần đăng nhập giáo viên.'); }
      if (typeof body.locked !== 'boolean') error(422, 'Trạng thái khóa không hợp lệ.');
      await db.runTransaction(async tx => {
        const snap = await tx.get(ref), current = snap.data();
        if (!current) error(404, 'Bài giao không còn tồn tại.');
        const classData = (await tx.get(db.collection('classes').doc(current!.classId))).data();
        const member = (await tx.get(db.collection('classMembers').doc(classMemberId(current!.classId, uid)))).data();
        if (!classData || classData.teacherId !== current!.teacherId || !deriveClassAccess(classData, memberFromData(member), uid)) error(403, 'Không có quyền khóa bài này.');
        tx.update(ref, { submissionLocked: body.locked, lockedAt: new Date().toISOString(), lockedBy: uid, updatedAt: new Date().toISOString() });
      });
      res.status(200).json({ submissionLocked: body.locked }); return true;
    }
    const assignmentId = body.assignmentId ? id(body.assignmentId) : null;
    const assignment = assignmentId ? (await db.collection('assignments').doc(assignmentId).get()).data() : undefined;
    const actor = await resolveSubmissionActor(db, body, res, assignment);
    if (!actor) return true;
    if (['saveHandMarkedWork','setHandMarkedVisibility'].includes(String(body.action)) && actor.role !== 'teacher') error(403, 'Chỉ giáo viên quản lý bản chấm tay.');
    if (body.action === 'actorAssignments') {
      await db.runTransaction(tx => assertActorCurrent(db, tx, actor));
      const snap = await db.collection('assignments').where('classId', '==', actor.classId).get();
      const allowed = snap.docs.filter(doc => doc.data().teacherId === actor.teacherId && (!doc.data().targetStudentIds?.length || doc.data().targetStudentIds.includes(actor.studentId)));
      const ids = new Set(allowed.map(doc => doc.id));
      const submitted = await db.collection('submissions').where('studentId', '==', actor.studentId).get();
      const summaries = submitted.docs.filter(doc => doc.data().classId === actor.classId && doc.data().teacherId === actor.teacherId && ids.has(doc.data().assignmentId)).map(doc => {
        const safe = projectors.projectStudentSubmission(doc.id, doc.data());
        const { handMarkedEvidence: _evidence, ...summary } = safe;
        return { ...summary, fileUrls: [], attachments: [], note: '', ...(safe.grade ? { grade: { score: safe.grade.score, maxScore: safe.grade.maxScore, teacherApproved: safe.grade.teacherApproved, scoreHidden: safe.grade.scoreHidden === true, awaitingClarification: safe.grade.awaitingClarification === true, gradedAt: safe.grade.gradedAt, feedback: '', strengths: [], weaknesses: [] } } : {}) };
      }).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
      res.status(200).json({ assignments: allowed.map(doc => projectors.projectStudentAssignment(doc.id, doc.data())), submissions: summaries }); return true;
    }
    if (body.action === 'actorAssignmentDetail') {
      await db.runTransaction(tx => assertActorCurrent(db, tx, actor, assignmentId));
      const snap = await db.collection('submissions').where('studentId', '==', actor.studentId).get();
      res.status(200).json({ ...(assignment ? { assignment: projectors.projectStudentAssignment(assignmentId!, assignment) } : {}), submissions: snap.docs.filter(doc => doc.data().classId === actor.classId && doc.data().teacherId === actor.teacherId && doc.data().assignmentId === assignmentId).map(doc => projectors.projectStudentSubmission(doc.id, attachAssignmentSolutions({ id: doc.id, ...doc.data() } as SubmissionDoc, assignment))) }); return true;
    }
    const correction = body.action === 'saveCorrectionAttempt' || body.action === 'issueSubmissionUpload' && body.purpose === 'correction';
    const handMarked = body.action === 'issueSubmissionUpload' && body.purpose === 'hand_marked';
    if (handMarked && actor.role !== 'teacher') error(403, 'Chỉ giáo viên tải bản chấm tay.');
    await db.runTransaction(tx => assertActorCurrent(db, tx, actor, assignmentId, !correction));
    if (body.action === 'issueSubmissionUpload') {
      const files = filesInput(body.files), grantId = randomUUID(), expiresAt = Date.now() + 10 * 60 * 1000;
      if (await sweepStudentGrants(db, actor.studentId, Date.now()) >= MAX_OPEN_GRANTS) error(429, 'Đang có quá nhiều lượt tải ảnh chưa dùng. Chờ vài phút rồi thử lại.');
      const purpose = body.purpose === 'hand_marked' ? 'hand_marked' : body.purpose === 'correction' ? 'correction' : body.purpose === 'clarification' ? 'clarification' : 'submission';
      let questionScope = {};
      if (purpose === 'hand_marked' && files.some(file => !file.mimeType.startsWith('image/') && file.mimeType !== 'application/pdf')) error(422, 'Bản chấm tay chỉ nhận ảnh hoặc PDF.');
      if (purpose === 'clarification' || purpose === 'correction' || purpose === 'hand_marked') {
        const submissionId = id(body.submissionId), questionNumber = text(body.questionNumber);
        const submission = (await db.collection('submissions').doc(submissionId).get()).data();
        if (!submission || submission.studentId !== actor.studentId || submission.classId !== actor.classId || submission.teacherId !== actor.teacherId || submission.assignmentId !== assignmentId || purpose === 'clarification' && !submission.grade?.questionResults?.some((row: Data) => row.questionNumber === questionNumber && row.clarify?.kind === 'photo')) error(403, 'Câu cần đối chiếu không thuộc bài này.');
        if (purpose === 'correction' && !correctionPublished(submission!)) error(409, 'Chờ bài chấm hoặc bản chấm tay được công bố trước khi lưu bài chữa.');
        if (purpose === 'correction' && files.some(file => !file.mimeType.startsWith('image/'))) error(422, 'Bài chữa cần ảnh chụp rõ từng trang.');
        questionScope = purpose === 'correction' || purpose === 'hand_marked' ? { submissionId } : { submissionId, questionNumber };
      }
      const objects = files.map((file, index) => ({ ...file, path: `pending-homework/${grantId}/${index}` }));
      const grant = { role: actor.role, uid: actor.uid || '', studentId: actor.studentId, classId: actor.classId, teacherId: actor.teacherId, assignmentId, purpose, pinRevision: actor.pinRevision || '', ...questionScope, files: objects, expiresAt, consumed: false };
      await db.runTransaction(async tx => {
        await assertActorCurrent(db, tx, actor, assignmentId, purpose !== 'correction');
        if (purpose === 'correction' || purpose === 'hand_marked') {
          const fresh = (await tx.get(db.collection('submissions').doc(String((questionScope as {submissionId:string}).submissionId)))).data();
          if (!fresh || fresh.studentId !== actor.studentId || fresh.classId !== actor.classId || fresh.teacherId !== actor.teacherId || fresh.assignmentId !== assignmentId || purpose === 'correction' && !correctionPublished(fresh)) error(409, 'Bài nộp hoặc quyền xem đã đổi. Tải lại rồi gửi.');
        }
        tx.create(db.collection('submissionUploadGrants').doc(grantId), grant);
      });
      const signed = await Promise.all(objects.map(async file => ({ ...file, uploadUrl: (await getAdminStorage().file(file.path).createResumableUpload({ origin: uploadOrigin(body.uploadOrigin), metadata: { contentType: file.mimeType, contentLength: file.size }, preconditionOpts: { ifGenerationMatch: 0 } }))[0] })));
      res.status(200).json({ uploadGrantId: grantId, expiresAt, files: signed }); return true;
    }
    const prepared = await prepareActorFiles(db, body, actor, assignmentId);
    const submissionId = randomUUID(), ref = db.collection('submissions').doc(submissionId), now = new Date().toISOString();
    const supplementOf = body.supplementOf ? id(body.supplementOf) : undefined;
    let created: SubmissionDoc | undefined;
    try { await db.runTransaction(async tx => {
      await assertActorCurrent(db, tx, actor, assignmentId, true);
      const grantRef = await consumeActorGrant(db, tx, prepared, actor, assignmentId);
      const previous = supplementOf ? (await tx.get(db.collection('submissions').doc(supplementOf))).data() : undefined;
      if (supplementOf && (!previous || previous.studentId !== actor.studentId || previous.classId !== actor.classId || previous.teacherId !== actor.teacherId || previous.assignmentId !== assignmentId)) error(403, 'Lượt nộp trước không thuộc đúng bài và học sinh.');
      const evidence = previous ? mergeSubmissionEvidence({ fileUrls: previous.fileUrls || [], attachments: previous.attachments || [], textContent: text(previous.textContent) }, { fileUrls: prepared.fileUrls, attachments: prepared.attachments, textContent: text(body.textContent) }) : { fileUrls: prepared.fileUrls, attachments: prepared.attachments, textContent: text(body.textContent) };
      if (evidence.fileUrls.length > 12 || evidence.textContent.length > 60000) error(422, 'Lượt bổ sung vượt giới hạn 12 tệp hoặc 60000 ký tự.');
      // Bài ĐÃ CHẤM TAY: GV nộp hộ → điểm GV ghi tay là điểm chính thức. HS/PH tự nộp →
      // máy chỉ ĐỌC điểm GV ghi (lưu vào paperScore), thầy cô phải xác nhận mới chốt —
      // không để học sinh tự viết điểm rồi tự chấm.
      const handMarked = body.handMarked === true;
      const detectedAnswers = validateDetectedAnswers(body.detectedAnswers);
      created = { id: submissionId, teacherId: actor.teacherId, classId: actor.classId, studentId: actor.studentId, assignmentId, ...(supplementOf ? { supplementOf } : {}), ...evidence, note: text(body.note).slice(0, 2000), status: 'submitted', submittedBy: actorStamp(actor, now), ...(handMarked ? { handMarkedPaper: true, handMarkedDeclaredBy: actor.role } : {}), ...(detectedAnswers !== undefined ? { detectedAnswers } : {}), createdAt: now, updatedAt: now };
      tx.create(ref, created); if (grantRef) tx.update(grantRef, { consumed: true, consumedAt: now, submissionId });
    });
    } catch (reason) { await discardActorFiles(prepared); throw reason; }
    await releasePendingSources(prepared);
    res.status(200).json({ submission: created }); return true;
  } catch (reason) { if (reason instanceof SubmissionAccessError) { res.status(reason.statusCode).json({ error: reason.message }); return true; } throw reason; }
};
