import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import type { V832TokenVerifier } from './_v832-runtime.js';
import { prepareReviewCandidate, routeReviewIssueLayer } from '../src/lib/lessonReview/v832/candidateProposal.js';
import { validateIssueClassification, type IssueClassification, type LessonIRPatch } from '../src/lib/lessonReview/v832/repairLifecycle.js';
import type { RuntimeBuildV832 } from '../src/lib/lessonCompiler/v832/runtimePackage.js';
import { decodePrivateLessonIR, encodePrivateLessonIR, encodePrivateJson, assertPrivateDocumentSize } from '../src/lib/lessonCompiler/v832/privateJsonCodec.js';
import { inspectReviewScope } from '../src/lib/lessonReview/v832/candidateChanges.js';
import { computeLessonContentHash } from '../src/lib/lessonReview/v832/repairLifecycle.js';

class RepairError extends Error {
  constructor(readonly statusCode: number, message: string, readonly code?: string) { super(message); }
}

const verifyFirebase: V832TokenVerifier = async token => {
  if (typeof token !== 'string' || !token) return null;
  try {
    const decoded = await getAuth().verifyIdToken(token);
    return { uid: decoded.uid, anonymous: decoded.firebase?.sign_in_provider === 'anonymous' };
  } catch { return null; }
};

const ID = /^[A-Za-z0-9._:@-]{1,180}$/;
const isSafeId = (value: unknown): value is string =>
  typeof value === 'string' && ID.test(value) && value !== '.' && value !== '..' && !value.includes('..') && !value.includes('/');
const safeId = (value: unknown): string => {
  if (typeof value !== 'string' || !ID.test(value)) throw new RepairError(400, 'Mã yêu cầu không hợp lệ.');
  return value;
};

const proposalFields = (body: Record<string, unknown>) => {
  const classification = body.classification as IssueClassification | null;
  const proposal = body.proposal as Pick<LessonIRPatch, 'op' | 'targetId' | 'changes'> | null;
  if (!classification || typeof classification !== 'object' || !Array.isArray(classification.secondary)
    || classification.secondary.some(value => typeof value !== 'string')
    || !Array.isArray(classification.affectedPaths)
    || classification.affectedPaths.some(value => typeof value !== 'string')
    || typeof classification.primary !== 'string'
    || typeof classification.rationale !== 'string' || !proposal || typeof proposal !== 'object'
    || typeof proposal.op !== 'string' || typeof proposal.targetId !== 'string'
    || !proposal.changes || typeof proposal.changes !== 'object' || Array.isArray(proposal.changes)) {
    throw new RepairError(400, 'Đề xuất sửa chưa đúng cấu trúc phân loại và typed patch.');
  }
  return { classification, proposal };
};

const classificationOnly = (value: unknown): IssueClassification => {
  const classification = value as IssueClassification | null;
  if (!classification || typeof classification !== 'object' || !Array.isArray(classification.secondary)
    || classification.secondary.some(item => typeof item !== 'string')
    || !Array.isArray(classification.affectedPaths)
    || classification.affectedPaths.some(item => typeof item !== 'string')
    || typeof classification.primary !== 'string' || typeof classification.rationale !== 'string') {
    throw new RepairError(400, 'Phân loại yêu cầu sửa không hợp lệ.');
  }
  const issues = validateIssueClassification(classification);
  if (issues.length) throw new RepairError(422, `Phân loại chưa hợp lệ: ${issues.join('; ')}`);
  return classification;
};

const HASH = /^[a-f0-9]{64}$/;
const stale = () => new RepairError(409, 'Ứng viên hoặc liên kết bản gốc đã đổi; tải lại trước khi duyệt.');
const linkedId = (value: unknown): string => {
  if (typeof value !== 'string' || !ID.test(value)) throw stale();
  return value;
};

// ponytail: RF1 only validates; no accepted-build publish until trusted QA gates exist.
const validateAccept = async (transaction: FirebaseFirestore.Transaction, db: FirebaseFirestore.Firestore,
  candidate: FirebaseFirestore.DocumentData, id: string, uid: string, expected: unknown): Promise<never> => {
  if (typeof expected !== 'string' || !HASH.test(expected)) throw new RepairError(400, 'Mã băm nội dung không hợp lệ.');
  if (candidate.id !== id || candidate.status !== 'QA_PENDING' || candidate.contentHash !== expected) throw stale();
  const reviewId = linkedId(candidate.reviewRequestId);
  const buildId = linkedId(candidate.buildId);
  const parentId = candidate.parentCandidateId == null ? null : linkedId(candidate.parentCandidateId);
  const [reviewSnapshot, buildSnapshot] = await Promise.all([
    transaction.get(db.collection('lessonV832ReviewRequests').doc(reviewId)),
    transaction.get(db.collection('lessonV832Builds').doc(buildId)),
  ]);
  const parentSnapshot = parentId ? await transaction.get(db.collection('lessonV832RepairCandidates').doc(parentId)) : null;
  const review = reviewSnapshot.data();
  const build = buildSnapshot.data();
  const parent = parentSnapshot?.data();
  const roomSnapshot = review?.roomId == null ? null : await transaction.get(db.collection('lessonV832Rooms').doc(linkedId(review.roomId)));
  const room = roomSnapshot?.data();
  if (!review || review.ownerUid !== uid || review.candidateId !== id || review.status !== 'PROPOSAL_READY'
    || review.context?.buildId !== buildId || !build || build.ownerUid !== uid || build.manifest?.packageId !== buildId
    || build.manifest.contentHash !== review.context.contentHash
    || build.manifest.schemaVersion !== '8.3.2' || build.manifest.compilerVersion !== '8.3.2'
    || (roomSnapshot && (!room || room.packageId !== buildId || room.contentHash !== review.context.contentHash))
    || (!parentId && candidate.baseContentHash !== review.context.contentHash)
    || (parentId && (!parent || parent.ownerUid !== uid || parent.reviewRequestId !== reviewId || parent.buildId !== buildId
      || parent.status !== 'SUPERSEDED' || parent.supersededBy !== id))) throw stale();
  let baseLesson, lesson, parentLesson;
  try {
    [candidate, build, parent].forEach(document => document && assertPrivateDocumentSize(document, ['createdAt', 'updatedAt']));
    baseLesson = decodePrivateLessonIR(build.privateLessonIR);
    lesson = decodePrivateLessonIR(candidate.candidateIR);
    parentLesson = parent ? decodePrivateLessonIR(parent.candidateIR) : null;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('PRIVATE_')) {
      throw new RepairError(422, 'Dữ liệu ứng viên sai định dạng hoặc vượt giới hạn.');
    }
    throw error;
  }
  const source = parentLesson ?? baseLesson;
  const [candidateHash, sourceHash, pinHash] = await Promise.all([lesson, source, baseLesson].map(computeLessonContentHash));
  if (candidateHash !== candidate.contentHash || pinHash !== build.manifest.contentHash || sourceHash !== candidate.baseContentHash
    || source.lesson.lessonVersion !== candidate.parentVersion || lesson.lesson.lessonVersion !== candidate.version
    || lesson.lesson.lessonId !== baseLesson.lesson.lessonId
    || build.manifest.lessonId !== baseLesson.lesson.lessonId || build.manifest.lessonVersion !== baseLesson.lesson.lessonVersion
    || [baseLesson, lesson, parentLesson].some(item => item?.provenance?.sourceHash !== undefined
      && item.provenance.sourceHash !== build.manifest.sourceHash)
    || (parent && (parent.contentHash !== sourceHash || parent.version !== source.lesson.lessonVersion
      || parentLesson!.lesson.lessonId !== baseLesson.lesson.lessonId))) throw stale();
  throw new RepairError(422, 'Ứng viên chưa có bằng chứng QA tin cậy để được chấp nhận.', 'QA_GATES_INCOMPLETE');
};
const decideCandidate = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, uid: string,
  res: VercelResponse) => {
  const id = safeId(body.candidateId);
  const decision = body.decision;
  if (decision !== 'ACCEPT' && decision !== 'REJECT' && decision !== 'REFINE') throw new RepairError(400, 'Quyết định không hợp lệ.');
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (decision !== 'ACCEPT' && (message.length > 4000 || (decision === 'REFINE' && !message))) throw new RepairError(400, 'Cần ghi yêu cầu chỉnh tiếp, tối đa 4000 ký tự.');
  const candidateRef = db.collection('lessonV832RepairCandidates').doc(id);
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(candidateRef);
    if (!snapshot.exists) throw new RepairError(404, 'Không tìm thấy ứng viên.');
    const candidate = snapshot.data()!;
    if (candidate.ownerUid !== uid) throw new RepairError(403, 'Bạn không sở hữu ứng viên.');
    if (decision === 'ACCEPT') return validateAccept(transaction, db, candidate, id, uid, body.expectedContentHash);
    if (candidate.status !== 'QA_PENDING' || candidate.contentHash !== body.expectedContentHash) {
      throw new RepairError(409, 'Ứng viên đã đổi; tải lại trước khi quyết định.');
    }
    const reviewRef = db.collection('lessonV832ReviewRequests').doc(safeId(candidate.reviewRequestId));
    const reviewSnapshot = await transaction.get(reviewRef);
    const review = reviewSnapshot.data();
    if (!reviewSnapshot.exists || review?.ownerUid !== uid || review.candidateId !== id || review.status !== 'PROPOSAL_READY') {
      throw new RepairError(409, 'Ứng viên không còn là đề xuất hiện tại.');
    }
    const at = new Date().toISOString();
    const conversation = Array.isArray(review.repairConversation) ? review.repairConversation : [];
    if (conversation.length >= 40) throw new RepairError(409, 'Cuộc trao đổi sửa đã đạt giới hạn; tạo yêu cầu mới.');
    const candidateUpdate = { status: decision === 'REJECT' ? 'REJECTED' : 'REFINEMENT_REQUESTED',
      decision: { type: decision, actorUid: uid, message, at }, updatedAt: FieldValue.serverTimestamp() };
    assertPrivateDocumentSize({ ...candidate, ...candidateUpdate }, ['createdAt', 'updatedAt']);
    transaction.update(candidateRef, candidateUpdate);
    transaction.update(reviewRef, {
      status: decision === 'REJECT' ? 'REJECTED' : 'NEW',
      ...(decision === 'REFINE' ? { refinementBaseCandidateId: id, followUpMessage: message } : {}),
      repairConversation: [...conversation, { candidateId: id, decision, message, actorUid: uid, at }],
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return res.status(200).json({ candidateId: id, status: decision === 'REJECT' ? 'REJECTED' : 'REFINEMENT_REQUESTED' });
};

const exactKeys = (obj: unknown, allowed: readonly string[]): obj is Record<string, unknown> => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const keys = Object.keys(obj);
  return keys.length === allowed.length && allowed.every(k => Object.prototype.hasOwnProperty.call(obj, k));
};

const POINTER_KEYS = ['schemaVersion', 'id', 'ownerUid', 'lessonId', 'sourceHash', 'revision', 'currentBuildId', 'history', 'lastRollback'] as const;
const HISTORY_KEYS = ['buildId', 'contentHash', 'lessonVersion'] as const;
const LAST_ROLLBACK_KEYS = ['requestId', 'fromBuildId', 'toBuildId', 'revision'] as const;
const RECEIPT_KEYS = ['schemaVersion', 'ownerUid', 'request', 'response'] as const;
const RECEIPT_REQUEST_KEYS = [
  'action', 'pointerId', 'requestId', 'expectedRevision',
  'expectedCurrentBuildId', 'expectedContentHash', 'targetBuildId', 'targetContentHash',
] as const;
const RECEIPT_RESPONSE_KEYS = ['pointerId', 'currentBuildId', 'revision'] as const;

type BuildPointer = {
  schemaVersion: 1;
  id: string;
  ownerUid: string;
  lessonId: string;
  sourceHash: string;
  revision: number;
  currentBuildId: string;
  history: { buildId: string; contentHash: string; lessonVersion: string }[];
  lastRollback: null | { requestId: string; fromBuildId: string; toBuildId: string; revision: number };
};

type RollbackReceipt = {
  schemaVersion: 1;
  ownerUid: string;
  request: {
    action: 'v832RollbackBuild';
    pointerId: string;
    requestId: string;
    expectedRevision: number;
    expectedCurrentBuildId: string;
    expectedContentHash: string;
    targetBuildId: string;
    targetContentHash: string;
  };
  response: { pointerId: string; currentBuildId: string; revision: number };
};

const ALLOWED_ROLLBACK_KEYS = new Set([
  'action', 'idToken', 'pointerId', 'requestId', 'expectedRevision',
  'expectedCurrentBuildId', 'expectedContentHash', 'targetBuildId', 'targetContentHash',
]);

const rollbackPayload = (body: Record<string, unknown>) => {
  if (Object.keys(body).some(key => !ALLOWED_ROLLBACK_KEYS.has(key))) throw new RepairError(400, 'Yêu cầu hoàn tác chứa trường không cho phép.');
  const { pointerId, requestId, expectedRevision, expectedCurrentBuildId, expectedContentHash, targetBuildId, targetContentHash } = body;
  if (!isSafeId(pointerId) || !isSafeId(requestId) || !isSafeId(expectedCurrentBuildId) || !isSafeId(targetBuildId)) {
    throw new RepairError(400, 'Mã định danh trong yêu cầu hoàn tác không hợp lệ.');
  }
  if (typeof expectedRevision !== 'number' || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new RepairError(400, 'Phiên bản kỳ vọng không hợp lệ.');
  }
  if (typeof expectedContentHash !== 'string' || !HASH.test(expectedContentHash)
    || typeof targetContentHash !== 'string' || !HASH.test(targetContentHash)) {
    throw new RepairError(400, 'Mã băm trong yêu cầu hoàn tác không hợp lệ.');
  }
  return {
    action: 'v832RollbackBuild' as const,
    pointerId, requestId, expectedRevision, expectedCurrentBuildId, expectedContentHash, targetBuildId, targetContentHash,
  };
};

const rollbackBuild = async (
  db: FirebaseFirestore.Firestore, body: Record<string, unknown>, uid: string, res: VercelResponse,
) => {
  const request = rollbackPayload(body);
  const pointerRef = db.collection('lessonV832BuildPointers').doc(request.pointerId);
  const receiptRef = pointerRef.collection('rollbackReceipts').doc(request.requestId);
  let responseData: { pointerId: string; currentBuildId: string; revision: number } | null = null;
  await db.runTransaction(async transaction => {
    const [pointerSnapshot, receiptSnapshot] = await Promise.all([
      transaction.get(pointerRef),
      transaction.get(receiptRef),
    ]);
    if (!pointerSnapshot.exists) throw new RepairError(404, 'Không tìm thấy con trỏ.');
    const pointer = pointerSnapshot.data() as BuildPointer | undefined;
    if (!pointer || pointer.ownerUid !== uid) throw new RepairError(403, 'Bạn không sở hữu con trỏ.');

    try {
      assertPrivateDocumentSize(pointer as unknown as Record<string, unknown>);
    } catch {
      throw stale();
    }

    if (!exactKeys(pointer, POINTER_KEYS)
      || pointer.schemaVersion !== 1 || pointer.id !== request.pointerId || !isSafeId(pointer.id)
      || typeof pointer.lessonId !== 'string' || !isSafeId(pointer.lessonId)
      || typeof pointer.sourceHash !== 'string' || !pointer.sourceHash
      || typeof pointer.revision !== 'number' || !Number.isSafeInteger(pointer.revision) || pointer.revision < 0
      || typeof pointer.currentBuildId !== 'string' || !isSafeId(pointer.currentBuildId)
      || !Array.isArray(pointer.history) || pointer.history.length === 0) throw stale();

    const historySet = new Set<string>();
    for (const entry of pointer.history) {
      if (!exactKeys(entry, HISTORY_KEYS)
        || typeof entry.buildId !== 'string' || !isSafeId(entry.buildId)
        || typeof entry.contentHash !== 'string' || !HASH.test(entry.contentHash)
        || typeof entry.lessonVersion !== 'string' || entry.lessonVersion.trim().length === 0
        || historySet.has(entry.buildId)) throw stale();
      historySet.add(entry.buildId);
    }
    if (!historySet.has(pointer.currentBuildId)) throw stale();

    if (pointer.lastRollback !== null) {
      const lr = pointer.lastRollback;
      if (!exactKeys(lr, LAST_ROLLBACK_KEYS)
        || typeof lr.requestId !== 'string' || !isSafeId(lr.requestId)
        || typeof lr.fromBuildId !== 'string' || !isSafeId(lr.fromBuildId)
        || typeof lr.toBuildId !== 'string' || !isSafeId(lr.toBuildId)
        || typeof lr.revision !== 'number' || !Number.isSafeInteger(lr.revision) || lr.revision < 1) throw stale();
    }

    if (receiptSnapshot.exists) {
      const receipt = receiptSnapshot.data() as RollbackReceipt | undefined;
      try {
        assertPrivateDocumentSize(receipt as unknown as Record<string, unknown>);
      } catch {
        throw stale();
      }
      if (!exactKeys(receipt, RECEIPT_KEYS)
        || receipt.schemaVersion !== 1 || receipt.ownerUid !== uid
        || !exactKeys(receipt.request, RECEIPT_REQUEST_KEYS)
        || !exactKeys(receipt.response, RECEIPT_RESPONSE_KEYS)) throw stale();
      const r = receipt.request as Record<string, unknown>;
      const match = r.action === request.action && r.pointerId === request.pointerId && r.requestId === request.requestId
        && r.expectedRevision === request.expectedRevision && r.expectedCurrentBuildId === request.expectedCurrentBuildId
        && r.expectedContentHash === request.expectedContentHash && r.targetBuildId === request.targetBuildId
        && r.targetContentHash === request.targetContentHash;
      if (!match) throw stale();

      if (receipt.response.pointerId !== request.pointerId
        || receipt.response.currentBuildId !== request.targetBuildId
        || typeof receipt.response.revision !== 'number'
        || !Number.isSafeInteger(receipt.response.revision)
        || request.expectedRevision >= Number.MAX_SAFE_INTEGER
        || receipt.response.revision !== request.expectedRevision + 1) throw stale();

      responseData = {
        pointerId: request.pointerId,
        currentBuildId: request.targetBuildId,
        revision: receipt.response.revision,
      };
      return;
    }

    const currentEntry = pointer.history.find(h => h.buildId === pointer.currentBuildId);
    const targetEntry = pointer.history.find(h => h.buildId === request.targetBuildId);
    if (!currentEntry || !targetEntry || request.targetBuildId === pointer.currentBuildId
      || targetEntry.contentHash !== request.targetContentHash) throw stale();
    if (pointer.revision !== request.expectedRevision || pointer.currentBuildId !== request.expectedCurrentBuildId
      || currentEntry.contentHash !== request.expectedContentHash || pointer.revision >= Number.MAX_SAFE_INTEGER) throw stale();
    const nextRevision = pointer.revision + 1;
    const currentBuildRef = db.collection('lessonV832Builds').doc(pointer.currentBuildId);
    const targetBuildRef = db.collection('lessonV832Builds').doc(request.targetBuildId);
    const [currentBuildSnapshot, targetBuildSnapshot] = await Promise.all([
      transaction.get(currentBuildRef),
      transaction.get(targetBuildRef),
    ]);
    if (!currentBuildSnapshot.exists || !targetBuildSnapshot.exists) throw stale();
    const currentBuild = currentBuildSnapshot.data();
    const targetBuild = targetBuildSnapshot.data();
    if (!currentBuild || !targetBuild) throw stale();
    for (const [build, entry] of [[currentBuild, currentEntry], [targetBuild, targetEntry]] as const) {
      if (build.ownerUid !== uid || !build.manifest || typeof build.manifest !== 'object') throw stale();
      const m = build.manifest as Record<string, unknown>;
      if (m.packageId !== entry.buildId || m.lessonId !== pointer.lessonId
        || m.lessonVersion !== entry.lessonVersion || m.contentHash !== entry.contentHash
        || m.sourceHash !== pointer.sourceHash || m.schemaVersion !== '8.3.2'
        || m.compilerVersion !== '8.3.2') throw stale();
      try {
        assertPrivateDocumentSize(build, ['createdAt', 'updatedAt']);
      } catch {
        throw stale();
      }
      let lessonIR;
      try {
        lessonIR = decodePrivateLessonIR(build.privateLessonIR);
      } catch {
        throw stale();
      }
      if (!lessonIR?.lesson || lessonIR.lesson.lessonId !== pointer.lessonId
        || lessonIR.lesson.lessonVersion !== entry.lessonVersion) throw stale();
      if (lessonIR.provenance?.sourceHash !== undefined && lessonIR.provenance.sourceHash !== pointer.sourceHash) throw stale();
      const actualHash = await computeLessonContentHash(lessonIR);
      if (actualHash !== entry.contentHash) throw stale();
    }
    const pointerUpdate = {
      currentBuildId: request.targetBuildId,
      revision: nextRevision,
      lastRollback: {
        requestId: request.requestId,
        fromBuildId: pointer.currentBuildId,
        toBuildId: request.targetBuildId,
        revision: nextRevision,
      },
    };
    const receiptDoc: RollbackReceipt = {
      schemaVersion: 1,
      ownerUid: uid,
      request,
      response: {
        pointerId: request.pointerId,
        currentBuildId: request.targetBuildId,
        revision: nextRevision,
      },
    };
    try {
      assertPrivateDocumentSize({ ...pointer, ...pointerUpdate });
      assertPrivateDocumentSize(receiptDoc as unknown as Record<string, unknown>);
    } catch {
      throw stale();
    }
    transaction.update(pointerRef, pointerUpdate);
    transaction.create(receiptRef, receiptDoc as unknown as Record<string, unknown>);
    responseData = receiptDoc.response;
  });
  return res.status(200).json(responseData);
};

export const handleV832RepairAction = async (
  db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse,
  verify: V832TokenVerifier = verifyFirebase,
): Promise<boolean> => {
  if (!['v832CreateRepairCandidate', 'v832RecordReviewTriage', 'v832RepairCandidateDecision', 'v832RollbackBuild'].includes(String(body.action))) return false;
  try {
    const identity = await verify(body.idToken);
    if (!identity || identity.anonymous) throw new RepairError(401, 'Cần đăng nhập tài khoản giáo viên.');
    if (typeof body.action !== 'string') throw new RepairError(400, 'Hành động không hợp lệ.');
    if (body.action === 'v832RollbackBuild') {
      await rollbackBuild(db, body, identity.uid, res);
      return true;
    }
    if (body.action === 'v832RepairCandidateDecision') {
      await decideCandidate(db, body, identity.uid, res);
      return true;
    }
    const reviewId = safeId(body.reviewId);
    const reviewRef = db.collection('lessonV832ReviewRequests').doc(reviewId);
    const reviewSnapshot = await reviewRef.get();
    if (!reviewSnapshot.exists) throw new RepairError(404, 'Không tìm thấy yêu cầu sửa.');
    const review = reviewSnapshot.data();
    if (review?.ownerUid !== identity.uid) throw new RepairError(403, 'Bạn không sở hữu yêu cầu sửa.');
    if (review.status !== 'NEW') throw new RepairError(409, 'Yêu cầu đã có đề xuất hoặc đã đổi trạng thái.');
    if (body.action === 'v832RecordReviewTriage') {
      const classification = classificationOnly(body.classification);
      const targetLayer = routeReviewIssueLayer(classification);
      if (targetLayer === 'LESSON_IR') throw new RepairError(409, 'Lỗi riêng bài cần typed IR patch để tạo ứng viên.');
      const routed = { ...classification, targetLayer };
      await db.runTransaction(async transaction => {
        const fresh = await transaction.get(reviewRef);
        if (!fresh.exists || fresh.data()?.ownerUid !== identity.uid || fresh.data()?.status !== 'NEW') {
          throw new RepairError(409, 'Yêu cầu đã đổi; tải lại trước khi phân loại.');
        }
        transaction.update(reviewRef, { status: 'PROPOSAL_READY', classification: routed,
          updatedAt: FieldValue.serverTimestamp() });
      });
      res.status(200).json({ status: 'PROPOSAL_READY', targetLayer });
      return true;
    }
    const { classification, proposal } = proposalFields(body);
    const buildId = safeId(review.context?.buildId);
    const buildRef = db.collection('lessonV832Builds').doc(buildId);
    const buildSnapshot = await buildRef.get();
    if (!buildSnapshot.exists) throw new RepairError(404, 'Gói bài học gốc không còn tồn tại.');
    const build = buildSnapshot.data() as RuntimeBuildV832 & { ownerUid: string };
    if (build.ownerUid !== identity.uid || build.manifest?.contentHash !== review.context?.contentHash
      || build.manifest.packageId !== buildId) throw new RepairError(409, 'Yêu cầu không còn khớp gói bài học đã ghim.');
    const parentId = review.refinementBaseCandidateId ? safeId(review.refinementBaseCandidateId) : null;
    const parentRef = parentId ? db.collection('lessonV832RepairCandidates').doc(parentId) : null;
    const parentSnapshot = parentRef ? await parentRef.get() : null;
    const parent = parentSnapshot?.data();
    if (parentId && (!parentSnapshot?.exists || parent?.ownerUid !== identity.uid
      || parent.reviewRequestId !== reviewId || parent.status !== 'REFINEMENT_REQUESTED' || parent.candidateIR == null)) {
      throw new RepairError(409, 'Bản gốc của lần chỉnh tiếp không còn hợp lệ.');
    }
    const baseLesson = decodePrivateLessonIR(parentId ? parent!.candidateIR : build.privateLessonIR);
    const result = await prepareReviewCandidate(baseLesson, classification, proposal);
    if ('issues' in result) throw new RepairError(422, `Đề xuất chưa đủ điều kiện: ${result.issues.join('; ')}`);
    const scopeIssues = inspectReviewScope(baseLesson, String(review.context.activityId), String(review.scope ?? 'screen'), result.changes);
    if (scopeIssues.length) throw new RepairError(422, `Đề xuất vượt phạm vi yêu cầu: ${scopeIssues.join('; ')}`);
    const candidateRef = db.collection('lessonV832RepairCandidates').doc();
    await db.runTransaction(async transaction => {
      const [freshReview, freshBuild] = await Promise.all([transaction.get(reviewRef), transaction.get(buildRef)]);
      if (!freshReview.exists || freshReview.data()?.ownerUid !== identity.uid || freshReview.data()?.status !== 'NEW'
        || !freshBuild.exists || freshBuild.data()?.ownerUid !== identity.uid
        || freshBuild.data()?.manifest?.contentHash !== review.context.contentHash) {
        throw new RepairError(409, 'Yêu cầu hoặc bài học đã thay đổi; tải lại trước khi đề xuất.');
      }
      if ((freshReview.data()?.refinementBaseCandidateId ?? null) !== parentId) throw new RepairError(409, 'Bản chỉnh tiếp đã đổi.');
      if (parentRef) {
        const freshParent = await transaction.get(parentRef);
        if (!freshParent.exists || freshParent.data()?.status !== 'REFINEMENT_REQUESTED'
          || freshParent.data()?.contentHash !== parent?.contentHash) throw new RepairError(409, 'Ứng viên gốc đã đổi.');
        assertPrivateDocumentSize({ ...freshParent.data(), status: 'SUPERSEDED', supersededBy: candidateRef.id,
          updatedAt: FieldValue.serverTimestamp() }, ['createdAt', 'updatedAt']);
      }
      const payload = {
        id: candidateRef.id, ownerUid: identity.uid, reviewRequestId: reviewId, buildId,
        baseContentHash: result.candidate.patch.baseContentHash,
        status: 'QA_PENDING', parentVersion: result.candidate.parentVersion,
        version: result.candidate.version, contentHash: result.candidate.contentHash,
        parentCandidateId: parentId, sourceFeedback: review.followUpMessage ?? review.teacherMessage,
        patch: encodePrivateJson(result.candidate.patch), classification, qa: result.qa, changes: encodePrivateJson(result.changes),
        before: encodePrivateJson({ activityId: review.context.activityId,
          activity: baseLesson.timeline.find(item => item.id === review.context.activityId) ?? null }),
        candidateIR: encodePrivateLessonIR(result.candidate.lessonIR),
        createdAt: FieldValue.serverTimestamp(),
      };
      assertPrivateDocumentSize(payload, ['createdAt']);
      transaction.set(candidateRef, payload);
      transaction.update(reviewRef, { status: 'PROPOSAL_READY', candidateId: candidateRef.id,
        refinementBaseCandidateId: null, followUpMessage: null,
        updatedAt: FieldValue.serverTimestamp() });
      if (parentRef) transaction.update(parentRef, { status: 'SUPERSEDED', supersededBy: candidateRef.id,
        updatedAt: FieldValue.serverTimestamp() });
    });
    res.status(201).json({ candidateId: candidateRef.id, status: 'QA_PENDING', qa: result.qa });
  } catch (error) {
    if (error instanceof RepairError) res.status(error.statusCode).json({ error: error.message, ...(error.code ? { code: error.code } : {}) });
    else { console.error('[v832-repair] failed', error); res.status(500).json({ error: 'Không tạo được ứng viên sửa.' }); }
  }
  return true;
};
