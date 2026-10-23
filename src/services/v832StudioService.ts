import { collection, doc, getDoc, getDocFromServer, limit, onSnapshot, query, runTransaction, serverTimestamp, setDoc, where,
  type Unsubscribe } from 'firebase/firestore';
import { getBytes, ref } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, storage } from '../lib/firebase';
import type { LessonIRV83 } from '../lib/lessonCompiler/v832/lessonIRSchema';
import type { RuntimeBuildV832 } from '../lib/lessonCompiler/v832/runtimePackage';
import type { TeacherConfirmationAuditRecord } from '../lib/lessonCompiler/v832/confirmationReview';
import { computeLessonContentHash } from '../lib/lessonReview/v832/repairLifecycle';
import { evaluateLearningQuality, type SemanticRuleAttestation } from '../lib/lessonCompiler/v832/qualityGate';
import { freezeReviewedDesign } from '../lib/lessonCompiler/v832/designGate';
import type { ReviewContext } from '../lib/lessonReview/v832/reviewContext';
import type { IssueClassification, LessonIRPatch } from '../lib/lessonReview/v832/repairLifecycle';
import type { ReviewFieldChange } from '../lib/lessonReview/v832/candidateChanges';
import { canFreezeSourceBundle } from '../lib/lessonGen/sourceVerification';
import { verifySourceBundleHash } from '../lib/lessonGen/sourceIngestion';
import type { StoredLessonGenDraft, StoredV871ExperiencePlanDraft, V871PackageSummary } from './lessonGenDraftService';
import { encodePrivateLessonIR, encodePrivateJson, decodePrivateLessonIR, decodePrivateJson, assertPrivateDocumentSize } from '../lib/lessonCompiler/v832/privateJsonCodec';
import { authorLessonIR } from '../lib/lessonCompiler/v832/authorLessonIR';
import { LESSON_IR_PATCH_OPERATIONS } from '../lib/lessonReview/v832/repairLifecycle';
import { exportV871OwnerPrivatePackage, type V871OwnerPackage, type V871PackageInput } from '../lib/lessonCompiler/v832/v871PackageExporter';

export type { V871PackageSummary, V871OwnerPackage };

import { stableSortedJson, computeSourceSnapshotFingerprint, sourceAuthoringRevision, validateV871AuthoringSource,
  validateStoredV871AuthoringPlan, validateStoredV871PlanMapping } from '../lib/lessonCompiler/v832/sourceAuthoringState';
import { V88_1_VERSION } from '../lib/lessonCompiler/v832/v88Version';
export { computeSourceSnapshotFingerprint } from '../lib/lessonCompiler/v832/sourceAuthoringState';

const COLLECTION = 'lessonGenDrafts';

export interface V832ReviewInboxItem {
  id: string;
  roomId: string;
  ownerUid: string;
  teacherMessage: string;
  createdAt: string;
  status: string;
  context: ReviewContext;
  candidateId?: string;
  refinementBaseCandidateId?: string | null;
  followUpMessage?: string | null;
  classification?: IssueClassification;
}

export interface V832RepairCandidateDoc {
  id: string;
  ownerUid: string;
  reviewRequestId: string;
  status: 'QA_PENDING' | 'REFINEMENT_REQUESTED' | 'SUPERSEDED' | 'REJECTED';
  contentHash: string;
  classification: IssueClassification;
  qa: Record<string, string>;
  changes?: ReviewFieldChange[];
  before: { activityId: string; activity: LessonIRV83['timeline'][number] | null };
  candidateIR: LessonIRV83;
  parentVersion: string;
  version: string;
  patch?: LessonIRPatch;
}

const hydrateCandidate = (value: Record<string, unknown>, id: string): V832RepairCandidateDoc => {
  const candidateIR = decodePrivateLessonIR(value.candidateIR);
  const before = decodePrivateJson(value.before) as V832RepairCandidateDoc['before'];
  if (!before || typeof before !== 'object' || Array.isArray(before) || typeof before.activityId !== 'string'
    || !(before.activity === null || (before.activity && typeof before.activity === 'object' && !Array.isArray(before.activity)))) {
    throw new Error('PRIVATE_JSON_BEFORE');
  }
  if (before.activity !== null) decodePrivateLessonIR({ ...candidateIR, timeline: [before.activity] });
  const changes = value.changes === undefined ? undefined : decodePrivateJson(value.changes) as ReviewFieldChange[];
  if (changes !== undefined && (!Array.isArray(changes) || changes.some(change => !change
    || typeof change !== 'object' || Array.isArray(change) || typeof change.path !== 'string'
    || !Object.hasOwn(change, 'before') || !Object.hasOwn(change, 'after')))) throw new Error('PRIVATE_JSON_CHANGES');
  const patch = value.patch === undefined ? undefined : decodePrivateJson(value.patch) as LessonIRPatch;
  if (patch !== undefined && (!patch || typeof patch !== 'object' || Array.isArray(patch)
    || !LESSON_IR_PATCH_OPERATIONS.includes(patch.op)
    || ['targetId', 'baseLessonVersion', 'baseContentHash', 'beforeHash'].some(key => typeof (patch as unknown as Record<string, unknown>)[key] !== 'string')
    || !patch.changes || typeof patch.changes !== 'object' || Array.isArray(patch.changes))) throw new Error('PRIVATE_JSON_PATCH');
  return { ...value, id, candidateIR, before, ...(changes === undefined ? {} : { changes }),
    ...(patch === undefined ? {} : { patch }) } as V832RepairCandidateDoc;
};

export const readV832RepairCandidate = async (candidateId: string): Promise<V832RepairCandidateDoc> => {
  const ownerUid = teacherUid();
  if (!/^[A-Za-z0-9_-]{1,180}$/.test(candidateId)) throw new Error('Mã ứng viên không hợp lệ.');
  const snapshot = await getDoc(doc(db, 'lessonV832RepairCandidates', candidateId));
  if (!snapshot.exists() || snapshot.data().ownerUid !== ownerUid) throw new Error('Không có quyền đọc ứng viên.');
  return hydrateCandidate(snapshot.data(), snapshot.id);
};

export const decideV832RepairCandidate = async (candidate: V832RepairCandidateDoc,
  decision: 'REJECT' | 'REFINE', message: string): Promise<void> => {
  teacherUid();
  const response = await fetch('/api/classroom', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'v832RepairCandidateDecision', idToken: await auth.currentUser!.getIdToken(),
      candidateId: candidate.id, expectedContentHash: candidate.contentHash, decision, message }) });
  const result = await response.json() as { error?: string };
  if (!response.ok) throw new Error(result.error ?? 'Không lưu được quyết định.');
};

export const subscribeV832RepairCandidates = (
  onChange: (items: V832RepairCandidateDoc[]) => void, onError: (error: Error) => void,
): Unsubscribe => onSnapshot(query(collection(db, 'lessonV832RepairCandidates'),
  where('ownerUid', '==', teacherUid()), limit(50)),
  snapshot => {
    try { onChange(snapshot.docs.map(item => hydrateCandidate(item.data(), item.id))); }
    catch (error) { onError(error instanceof Error ? error : new Error('PRIVATE_JSON_CANDIDATE')); }
  }, onError);

export const proposeV832RepairCandidate = async (reviewId: string, classification: IssueClassification,
  proposal: Pick<LessonIRPatch, 'op' | 'targetId' | 'changes'>): Promise<{ candidateId: string; status: 'QA_PENDING' }> => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Cần tài khoản giáo viên.');
  const response = await fetch('/api/classroom', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'v832CreateRepairCandidate', idToken: await user.getIdToken(),
      reviewId, classification, proposal }) });
  const result = await response.json() as { candidateId: string; status: 'QA_PENDING'; error?: string };
  if (!response.ok) throw new Error(result.error ?? 'Không lưu được ứng viên sửa.');
  return result;
};

export const recordV832ReviewTriage = async (reviewId: string, classification: IssueClassification): Promise<{
  status: 'PROPOSAL_READY'; targetLayer: IssueClassification['targetLayer'];
}> => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Cần tài khoản giáo viên.');
  const response = await fetch('/api/classroom', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'v832RecordReviewTriage', idToken: await user.getIdToken(), reviewId, classification }) });
  const result = await response.json() as { status: 'PROPOSAL_READY'; targetLayer: IssueClassification['targetLayer']; error?: string };
  if (!response.ok) throw new Error(result.error ?? 'Không lưu được phân loại.');
  return result;
};

export const subscribeV832ReviewInbox = (
  onChange: (items: V832ReviewInboxItem[]) => void,
  onError: (error: Error) => void,
): Unsubscribe => {
  const ownerUid = teacherUid();
  return onSnapshot(query(collection(db, 'lessonV832ReviewRequests'), where('ownerUid', '==', ownerUid), limit(50)),
    snapshot => onChange(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as V832ReviewInboxItem))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))), onError);
};

export const readV832ReviewScreenshot = async (item: V832ReviewInboxItem): Promise<Blob> => {
  const uid = teacherUid();
  if (item.ownerUid !== uid || !item.context.screenshotAssetId.startsWith(`lessonGen/${uid}/${item.roomId}/review-`)) {
    throw new Error('Ảnh yêu cầu sửa không thuộc không gian riêng của giáo viên.');
  }
  const bytes = await getBytes(ref(storage, item.context.screenshotAssetId), 8 * 1024 * 1024);
  return new Blob([bytes], { type: 'image/png' });
};

export interface StoredV832StudioDraft {
  id: string;
  ownerUid: string;
  sourceHash: string;
  revision: number;
  status: 'v832_review';
  lessonIR: LessonIRV83;
  confirmationAudit: TeacherConfirmationAuditRecord[];
  semanticAttestations: SemanticRuleAttestation[];
  sourceDraftId?: string;
  sourceSnapshot?: Pick<StoredLessonGenDraft, 'sourceBundle' | 'verificationRecords' | 'sourceApproval' | 'originalStoragePath'>;
}

const teacherUid = (): string => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Đăng nhập tài khoản giáo viên để lưu bài V8.3.2.');
  return user.uid;
};

export const saveImportedV832Draft = async (lessonIR: LessonIRV83, sourceDraftId?: string): Promise<string> => {
  const encodedLessonIR = encodePrivateLessonIR(lessonIR);
  lessonIR = decodePrivateLessonIR(encodedLessonIR);
  const ownerUid = teacherUid();
  const sourceHash = lessonIR.provenance?.sourceHash;
  if (!sourceHash) throw new Error('Lesson IR cần provenance.sourceHash để lưu bản nháp.');
  const draftId = `v832-${crypto.randomUUID().replaceAll('-', '').slice(0,24)}`;
  const ref = doc(db, COLLECTION, draftId);
  const value = {
    id: draftId, ownerUid, sourceHash, revision: 1, status: 'v832_review',
    lessonIR: encodedLessonIR, confirmationAudit: [], semanticAttestations: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    ...(sourceDraftId ? { sourceDraftId } : {}),
  };
  if (sourceDraftId) {
    if (!/^lesson-gen-[0-9a-f]{20}$/.test(sourceDraftId)) throw new Error('Mã bản nháp nguồn không hợp lệ.');
    const sourceRef = doc(db, COLLECTION, sourceDraftId);
    await runTransaction(db, async transaction => {
      const sourceSnapshot = await transaction.get(sourceRef);
      if (!sourceSnapshot.exists()) throw new Error('Không tìm thấy nguồn đã tải lên.');
      const source = structuredClone(sourceSnapshot.data()) as StoredLessonGenDraft;
      if (source.ownerUid !== ownerUid || source.sourceHash !== sourceHash || source.sourceBundle?.sourceHash !== sourceHash
        || source.sourceBundle.durationMinutes !== lessonIR.lesson.runtimeMin
        || !canFreezeSourceBundle(source.sourceBundle, source.verificationRecords, source.sourceApproval, ownerUid)
        || !await verifySourceBundleHash(source.sourceBundle)) {
        throw new Error('Nguồn đã đổi hoặc chưa được duyệt; kiểm tra lại trước khi lưu bài.');
      }
      const pinnedSource = {
        sourceBundle: source.sourceBundle, verificationRecords: source.verificationRecords,
        sourceApproval: source.sourceApproval ?? null,
        ...(source.originalStoragePath ? { originalStoragePath: source.originalStoragePath } : {}),
      };
      const complete = { ...value, sourceSnapshot: pinnedSource };
      assertPrivateDocumentSize(complete, ['createdAt', 'updatedAt']);
      transaction.set(ref, complete);
      transaction.update(sourceRef, { v832DraftId: draftId, updatedAt: serverTimestamp() });
    });
  } else {
    assertPrivateDocumentSize(value, ['createdAt', 'updatedAt']);
    await setDoc(ref, value);
  }
  return draftId;
};

export const readV832StudioDraft = async (draftId: string): Promise<StoredV832StudioDraft | null> => {
  teacherUid();
  if (!/^v832-[0-9a-f]{24}$/.test(draftId)) throw new Error('Mã bản nháp V8.3.2 không hợp lệ.');
  const snapshot = await getDoc(doc(db, COLLECTION, draftId));
  if (!snapshot.exists()) return null;
  const value = snapshot.data();
  if (value.ownerUid !== auth.currentUser?.uid || value.status !== 'v832_review') throw new Error('Bản nháp không hợp lệ.');
  return { id: snapshot.id, ...(value as Omit<StoredV832StudioDraft, 'id'>), lessonIR: decodePrivateLessonIR(value.lessonIR) };
};

export const persistV832DesignReview = async (draftId: string, baseContentHash: string): Promise<LessonIRV83> => {
  const ownerUid = teacherUid();
  if (!/^v832-[0-9a-f]{24}$/.test(draftId)) throw new Error('Mã bản nháp V8.3.2 không hợp lệ.');
  return runTransaction(db, async transaction => {
    const draftRef = doc(db, COLLECTION, draftId);
    const snapshot = await transaction.get(draftRef);
    if (!snapshot.exists()) throw new Error('Bản nháp không còn tồn tại.');
    const current = { ...snapshot.data() } as StoredV832StudioDraft;
    if (current.ownerUid !== ownerUid || current.status !== 'v832_review') throw new Error('Không có quyền chốt thiết kế.');
    current.lessonIR = decodePrivateLessonIR(current.lessonIR);
    if (await computeLessonContentHash(current.lessonIR) !== baseContentHash) throw new Error('Bản nháp đã đổi; tải lại trước khi chốt thiết kế.');
    const next = freezeReviewedDesign(current.lessonIR, evaluateLearningQuality(current.lessonIR, current.semanticAttestations));
    const update = { lessonIR: encodePrivateLessonIR(next), revision: current.revision + 1,
      designReview: { reviewerUid: ownerUid, baseContentHash, reviewedAt: new Date().toISOString() },
      updatedAt: serverTimestamp() };
    assertPrivateDocumentSize({ ...snapshot.data(), ...update }, ['createdAt', 'updatedAt']);
    transaction.update(draftRef, update);
    return next;
  });
};

export const persistV832ConfirmationDecision = async (
  draftId: string,
  nextLessonIR: LessonIRV83,
  audit: TeacherConfirmationAuditRecord,
): Promise<void> => {
  const encodedLessonIR = encodePrivateLessonIR(nextLessonIR);
  nextLessonIR = decodePrivateLessonIR(encodedLessonIR);
  audit = structuredClone(audit);
  const ownerUid = teacherUid();
  if (!/^v832-[0-9a-f]{24}$/.test(draftId)) throw new Error('Mã bản nháp V8.3.2 không hợp lệ.');
  const ref = doc(db, COLLECTION, draftId);
  await runTransaction(db, async tx => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) throw new Error('Bản nháp không còn tồn tại.');
    const current = { ...snapshot.data() } as StoredV832StudioDraft;
    if (current.ownerUid !== ownerUid || current.status !== 'v832_review') throw new Error('Không có quyền cập nhật bản nháp.');
    current.lessonIR = decodePrivateLessonIR(current.lessonIR);
    if (current.confirmationAudit.length >= 200) throw new Error('Nhật ký xác nhận đã đạt giới hạn; tạo phiên bản mới.');
    if (await computeLessonContentHash(current.lessonIR) !== audit.baseContentHash) throw new Error('Bản nháp đã đổi; tải lại trước khi xác nhận.');
    if (await computeLessonContentHash(nextLessonIR) !== audit.resultingContentHash) throw new Error('Nội dung xác nhận không khớp biên bản.');
    const update = {
      lessonIR: encodedLessonIR,
      confirmationAudit: [...current.confirmationAudit, audit],
      semanticAttestations: [],
      revision: current.revision + 1,
      updatedAt: serverTimestamp(),
    };
    assertPrivateDocumentSize({ ...snapshot.data(), ...update }, ['createdAt', 'updatedAt']);
    tx.update(ref, update);
  });
};

export const persistV832SemanticAttestation = async (
  draftId: string,
  baseContentHash: string,
  attestation: SemanticRuleAttestation,
): Promise<void> => {
  attestation = structuredClone(attestation);
  const ownerUid = teacherUid();
  if (!/^v832-[0-9a-f]{24}$/.test(draftId)) throw new Error('Mã bản nháp V8.3.2 không hợp lệ.');
  if (attestation.reviewer !== ownerUid || !/^M(0[1-9]|1[0-5])$/.test(attestation.ruleId)
    || !['pass', 'fail'].includes(attestation.verdict) || attestation.evidence.trim().length < 12) {
    throw new Error('Biên bản kiểm định chất lượng không hợp lệ.');
  }
  const ref = doc(db, COLLECTION, draftId);
  await runTransaction(db, async tx => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) throw new Error('Bản nháp không còn tồn tại.');
    const current = snapshot.data() as StoredV832StudioDraft;
    if (current.ownerUid !== ownerUid || current.status !== 'v832_review') throw new Error('Không có quyền cập nhật bản nháp.');
    const lessonIR = decodePrivateLessonIR(current.lessonIR);
    if (await computeLessonContentHash(lessonIR) !== baseContentHash) throw new Error('Bản nháp đã đổi; tải lại trước khi kiểm định.');
    const remaining = (current.semanticAttestations ?? []).filter(item => item.ruleId !== attestation.ruleId);
    const update = {
      semanticAttestations: [...remaining, attestation],
      revision: current.revision + 1,
      updatedAt: serverTimestamp(),
    };
    assertPrivateDocumentSize({ ...snapshot.data(), ...update }, ['createdAt', 'updatedAt']);
    tx.update(ref, update);
  });
};

const captureV871Session = (assertContext?: () => void) => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Đăng nhập tài khoản giáo viên để soạn bài.');
  let valid = true;
  const dispose = onAuthStateChanged(auth, current => { if (current !== user) valid = false; });
  const assertCurrent = () => {
    if (!valid || auth.currentUser !== user || user.isAnonymous) throw new Error('Phiên đăng nhập đã thay đổi.');
    assertContext?.();
  };
  return { user, assertCurrent, dispose };
};

export interface V871SourceAuthoringInput {
  sourceDraftId: string;
  expectedSourceRevision: number;
  expectedSourceSnapshotFingerprint: string;
  expectedAuthoringRevision: number;
  teacherArchetypeChoice?: 'practice' | 'review_diagnostic';
  invoke: (prompt: string) => Promise<string>;
  assertCurrent?: () => void;
}

export const authorV871SourceDraft = async (input: V871SourceAuthoringInput) => {
  const { invoke, assertCurrent, ...data } = input;
  const request = structuredClone(data);
  if (!/^lesson-gen-[0-9a-f]{20}$/.test(request.sourceDraftId)
    || !Number.isSafeInteger(request.expectedSourceRevision) || request.expectedSourceRevision < 1
    || !/^[0-9a-f]{64}$/i.test(request.expectedSourceSnapshotFingerprint)
    || !Number.isSafeInteger(request.expectedAuthoringRevision) || request.expectedAuthoringRevision < 0
    || request.expectedAuthoringRevision >= Number.MAX_SAFE_INTEGER || typeof invoke !== 'function'
    || (request.teacherArchetypeChoice !== undefined && request.teacherArchetypeChoice !== 'practice'
      && request.teacherArchetypeChoice !== 'review_diagnostic')) throw new Error('V871_AUTHORING_REQUEST_INVALID');
  const session = captureV871Session(assertCurrent);
  try {
    session.assertCurrent();
    const sourceRef = doc(db, COLLECTION, request.sourceDraftId);
    const validateCurrent = async (source: StoredLessonGenDraft) => {
      session.assertCurrent();
      await validateV871AuthoringSource(source, session.user.uid);
      if (source.id !== request.sourceDraftId || source.revision !== request.expectedSourceRevision
        || sourceAuthoringRevision(source) !== request.expectedAuthoringRevision
        || await computeSourceSnapshotFingerprint(source) !== request.expectedSourceSnapshotFingerprint) {
        throw new Error('V871_AUTHORING_REVISION_CONFLICT');
      }
      session.assertCurrent();
    };
    const entry = await getDocFromServer(sourceRef);
    if (!entry.exists()) throw new Error('V871_SOURCE_SNAPSHOT_REQUIRED');
    const source = structuredClone(entry.data()) as StoredLessonGenDraft;
    await validateCurrent(source);
    const candidate = await authorLessonIR({ bundle: source.sourceBundle, reviews: source.verificationRecords,
      teacherApproval: source.sourceApproval, ownerUid: session.user.uid, lessonId: request.sourceDraftId,
      ...(request.teacherArchetypeChoice ? { teacherArchetypeChoice: request.teacherArchetypeChoice } : {}),
      invoke: async prompt => { session.assertCurrent(); const response = await invoke(prompt); session.assertCurrent(); return response; } });
    session.assertCurrent();
    const newIrId = candidate.status === 'MAPPED' ? `v832-${crypto.randomUUID().replaceAll('-', '').slice(0, 24)}` : null;
    const authoringRevision = request.expectedAuthoringRevision + 1;
    const committed = await runTransaction(db, async transaction => {
      session.assertCurrent();
      const currentSnapshot = await transaction.get(sourceRef);
      if (!currentSnapshot.exists()) throw new Error('V871_SOURCE_SNAPSHOT_REQUIRED');
      const current = structuredClone(currentSnapshot.data()) as StoredLessonGenDraft;
      await validateCurrent(current);
      const nextSource = newIrId ? { ...current, v832DraftId: newIrId } : current;
      const wrapper: StoredV871ExperiencePlanDraft = { version: '1.0', state: candidate.status,
        sourceHash: current.sourceHash, sourceSnapshotFingerprint: await computeSourceSnapshotFingerprint(nextSource),
        authoringRevision, teacherArchetypeChoice: request.teacherArchetypeChoice ?? null,
        plan: encodePrivateJson(candidate.authoringPlan), diagnostics: candidate.diagnostics, createdAt: new Date().toISOString() };
      const update = { v871AuthoringRevision: authoringRevision, v871ExperiencePlanDraft: wrapper,
        v871PackageSummary: null, ...(newIrId ? { v832DraftId: newIrId } : {}), updatedAt: serverTimestamp() };
      assertPrivateDocumentSize({ ...current, ...update }, ['createdAt', 'updatedAt']);
      if (candidate.status === 'MAPPED' && newIrId) {
        const irRef = doc(db, COLLECTION, newIrId);
        if ((await transaction.get(irRef)).exists()) throw new Error('V871_IR_ID_CONFLICT');
        const irDocument = { id: newIrId, ownerUid: session.user.uid, sourceHash: current.sourceHash,
          revision: 1, status: 'v832_review', lessonIR: encodePrivateLessonIR(candidate.lessonIR),
          confirmationAudit: [], semanticAttestations: [], sourceDraftId: request.sourceDraftId,
          sourceSnapshot: { sourceBundle: current.sourceBundle, verificationRecords: current.verificationRecords,
            sourceApproval: current.sourceApproval ?? null,
            ...(current.originalStoragePath ? { originalStoragePath: current.originalStoragePath } : {}) },
          createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        assertPrivateDocumentSize(irDocument, ['createdAt', 'updatedAt']);
        session.assertCurrent();
        transaction.set(irRef, irDocument);
      }
      session.assertCurrent();
      transaction.update(sourceRef, update);
      return wrapper;
    });
    session.assertCurrent();
    const latestSnapshot = await getDocFromServer(sourceRef);
    session.assertCurrent();
    if (!latestSnapshot.exists()) throw new Error('V871_AUTHORING_REVISION_CONFLICT');
    const latest = latestSnapshot.data() as StoredLessonGenDraft;
    if (latest.ownerUid !== session.user.uid || sourceAuthoringRevision(latest) !== authoringRevision
      || stableSortedJson(latest.v871ExperiencePlanDraft) !== stableSortedJson(committed)
      || await computeSourceSnapshotFingerprint(latest) !== committed.sourceSnapshotFingerprint) {
      throw new Error('V871_AUTHORING_REVISION_CONFLICT');
    }
    session.assertCurrent();
    return candidate.status === 'MAPPED'
      ? { ...candidate, status: 'DRAFT_CREATED' as const, draftId: newIrId!, authoringRevision, sourceSnapshotFingerprint: committed.sourceSnapshotFingerprint }
      : { ...candidate, authoringRevision, sourceSnapshotFingerprint: committed.sourceSnapshotFingerprint };
  } finally { session.dispose(); }
};

export const readV871SourceAuthoringPlan = async (sourceDraftId: string) => {
  if (!/^lesson-gen-[0-9a-f]{20}$/.test(sourceDraftId)) throw new Error('V871_SOURCE_SNAPSHOT_REQUIRED');
  const session = captureV871Session();
  try {
    const snapshot = await getDocFromServer(doc(db, COLLECTION, sourceDraftId));
    session.assertCurrent();
    if (!snapshot.exists()) throw new Error('V871_SOURCE_SNAPSHOT_REQUIRED');
    const source = structuredClone(snapshot.data()) as StoredLessonGenDraft;
    if (source.ownerUid !== session.user.uid) throw new Error('Không có quyền đọc bản nháp nguồn.');
    const plan = await validateStoredV871AuthoringPlan(source, session.user.uid);
    session.assertCurrent();
    return plan;
  } finally { session.dispose(); }
};

export const prepareV871StudioPreview = async (sourceDraftId: string, irDraftId: string, expectedIrRevision: number,
  expectedContentHash: string, assertCurrent: () => void): Promise<{ manifest: RuntimeBuildV832['manifest']; irRevision: number; contentHash: string }> => {
  if (!/^lesson-gen-[a-f0-9]{20}$/.test(sourceDraftId) || !/^v832-[a-f0-9]{24}$/.test(irDraftId)
    || !Number.isSafeInteger(expectedIrRevision) || expectedIrRevision < 1 || !/^[a-f0-9]{64}$/.test(expectedContentHash)) {
    throw new Error('V871_PREVIEW_REQUEST_INVALID');
  }
  const session = captureV871Session(assertCurrent);
  try {
    session.assertCurrent();
    const [sourceSnapshot,irSnapshot] = await Promise.all([
      getDocFromServer(doc(db,COLLECTION,sourceDraftId)),getDocFromServer(doc(db,COLLECTION,irDraftId)),
    ]);
    session.assertCurrent();
    if (!sourceSnapshot.exists() || !irSnapshot.exists()) throw new Error('V871_PREVIEW_DRAFT_NOT_FOUND');
    const source = sourceSnapshot.data() as StoredLessonGenDraft, ir = irSnapshot.data() as StoredV832StudioDraft;
    if (source.ownerUid !== session.user.uid || ir.ownerUid !== session.user.uid || source.v832DraftId !== irDraftId
      || ir.sourceDraftId !== sourceDraftId || ir.revision !== expectedIrRevision) throw new Error('V871_PREVIEW_REVISION_CONFLICT');
    if (await computeLessonContentHash(decodePrivateLessonIR(ir.lessonIR)) !== expectedContentHash) throw new Error('V871_PREVIEW_CONTENT_CONFLICT');
    const plan = await validateStoredV871AuthoringPlan(source,session.user.uid);
    if (!plan || plan.state !== 'MAPPED') throw new Error('V871_AUTHORING_REVIEW_REQUIRED');
    const expectedSourceSnapshotFingerprint = await computeSourceSnapshotFingerprint(source);
    session.assertCurrent();
    const idToken = await session.user.getIdToken();
    session.assertCurrent();
    const response = await fetch('/api/classroom',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      action:'v871PreparePreview',idToken,sourceDraftId,irDraftId,expectedSourceSnapshotFingerprint,
      expectedAuthoringRevision:sourceAuthoringRevision(source),expectedIrRevision,expectedContentHash,
    })});
    session.assertCurrent();
    const result = await response.json();
    session.assertCurrent();
    if (!response.ok) throw new Error(`${result.error ?? 'Không chuẩn bị được bản xem trước.'}${result.code ? ` (${result.code})` : ''}`);
    if (!result.manifest || typeof result.manifest.packageId !== 'string' || !Number.isSafeInteger(result.irRevision)
      || result.irRevision < expectedIrRevision || typeof result.contentHash !== 'string') throw new Error('V871_PREVIEW_RESPONSE_INVALID');
    return result;
  } finally { session.dispose(); }
};

export const subscribeV871SourceInvalidation = (sourceDraftId: string, fingerprint: string, authoringRevision: number,
  onInvalidate: () => void): Unsubscribe => {
  const session = captureV871Session();
  let active = true, invalidated = false, generation = 0;
  let previous: string | undefined;
  const invalidate = () => { if (active && !invalidated) { invalidated = true; onInvalidate(); } };
  const stop = onSnapshot(doc(db, COLLECTION, sourceDraftId), { includeMetadataChanges: true }, snapshot => {
    if (!active || invalidated) return;
    const currentGeneration = ++generation;
    try {
      session.assertCurrent();
      if (!snapshot.exists() || snapshot.metadata.hasPendingWrites) { invalidate(); return; }
      if (snapshot.metadata.fromCache) return;
      const value = snapshot.data() as StoredLessonGenDraft;
      if (value.ownerUid !== session.user.uid || sourceAuthoringRevision(value) !== authoringRevision) { invalidate(); return; }
      const signature = stableSortedJson({ sourceHash: value.sourceHash, sourceBundle: value.sourceBundle,
        verificationRecords: value.verificationRecords, sourceApproval: value.sourceApproval ?? null,
        v832DraftId: value.v832DraftId ?? null, plan: value.v871ExperiencePlanDraft ?? null });
      if (previous !== undefined && previous !== signature) { invalidate(); return; }
      previous = signature;
      void computeSourceSnapshotFingerprint(value).then(actual => {
        if (!active || generation !== currentGeneration) return;
        session.assertCurrent();
        if (actual !== fingerprint) invalidate();
      }).catch(invalidate);
    } catch { invalidate(); }
  }, invalidate);
  return () => { active = false; generation++; stop(); session.dispose(); };
};

const ALLOWED_SUMMARY_KEYS = new Set([
  'version',
  'access',
  'releaseStatus',
  'sourceHash',
  'contentHash',
  'packageHash',
  'artifactCount',
  'sourceSnapshotFingerprint',
  'irDraftId',
  'irRevision',
  'generatedAt',
]);

const SHA256_HEX_REGEX = /^[0-9a-f]{64}$/i;
const STRICT_ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;
const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export const validateV871PackageSummary = (summary: unknown): string[] => {
  const issues: string[] = [];
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
    return ['INVALID_SUMMARY_OBJECT'];
  }
  const proto = Object.getPrototypeOf(summary);
  if (proto !== Object.prototype && proto !== null) {
    return ['INVALID_SUMMARY_PROTOTYPE'];
  }

  // 1. Check all own property descriptors on summary itself
  const ownKeys = Reflect.ownKeys(summary);
  for (const k of ownKeys) {
    if (typeof k === 'symbol') {
      issues.push('UNEXPECTED_SYMBOL_KEY');
      continue;
    }
    if (UNSAFE_OBJECT_KEYS.has(k)) {
      issues.push(`UNSAFE_KEY:${k}`);
      continue;
    }
    const desc = Object.getOwnPropertyDescriptor(summary, k);
    if (!desc) {
      issues.push(`INVALID_DESCRIPTOR:${k}`);
      continue;
    }
    if ('get' in desc || 'set' in desc || typeof desc.get === 'function' || typeof desc.set === 'function') {
      issues.push('ACCESSOR_DESCRIPTOR_FORBIDDEN');
      continue;
    }
    if (!desc.enumerable) {
      issues.push('NON_ENUMERABLE_KEY_FORBIDDEN');
      continue;
    }
    if (!ALLOWED_SUMMARY_KEYS.has(k)) {
      issues.push(`UNEXPECTED_SUMMARY_KEY:${k}`);
    }
  }

  // 2. Require all eleven own data descriptors (prevent prototype inheritance bypass)
  const detached: Record<string, unknown> = {};
  for (const k of ALLOWED_SUMMARY_KEYS) {
    const desc = Object.getOwnPropertyDescriptor(summary, k);
    if (!desc) {
      issues.push(`MISSING_OWN_SUMMARY_KEY:${k}`);
      continue;
    }
    if ('get' in desc || 'set' in desc || typeof desc.get === 'function' || typeof desc.set === 'function') {
      continue;
    }
    if (!desc.enumerable) {
      continue;
    }
    detached[k] = desc.value;
  }

  if (issues.length > 0) return issues;

  if (detached.version !== V88_1_VERSION) issues.push('INVALID_VERSION');
  if (detached.access !== 'OWNER_PRIVATE') issues.push('INVALID_ACCESS');
  if (detached.releaseStatus !== 'NOT_CERTIFIED') issues.push('INVALID_RELEASE_STATUS');
  if (detached.artifactCount !== 14) issues.push('INVALID_ARTIFACT_COUNT');
  if (typeof detached.sourceHash !== 'string' || !SHA256_HEX_REGEX.test(detached.sourceHash)) issues.push('INVALID_SOURCE_HASH');
  if (typeof detached.contentHash !== 'string' || !SHA256_HEX_REGEX.test(detached.contentHash)) issues.push('INVALID_CONTENT_HASH');
  if (typeof detached.packageHash !== 'string' || !SHA256_HEX_REGEX.test(detached.packageHash)) issues.push('INVALID_PACKAGE_HASH');
  if (typeof detached.sourceSnapshotFingerprint !== 'string' || !SHA256_HEX_REGEX.test(detached.sourceSnapshotFingerprint)) issues.push('INVALID_FINGERPRINT');
  if (typeof detached.irDraftId !== 'string' || !/^v832-[0-9a-f]{24}$/.test(detached.irDraftId)) issues.push('INVALID_IR_DRAFT_ID');
  if (typeof detached.irRevision !== 'number' || !Number.isSafeInteger(detached.irRevision) || detached.irRevision <= 0) issues.push('INVALID_IR_REVISION');
  if (typeof detached.generatedAt !== 'string' || !STRICT_ISO_REGEX.test(detached.generatedAt)) {
    issues.push('INVALID_GENERATED_AT');
  } else {
    const d = new Date(detached.generatedAt);
    const parts = detached.generatedAt.split(/[-T:.Z]/).map(Number);
    if (isNaN(d.getTime())
      || d.getUTCFullYear() !== parts[0]
      || d.getUTCMonth() + 1 !== parts[1]
      || d.getUTCDate() !== parts[2]
      || d.getUTCHours() !== parts[3]
      || d.getUTCMinutes() !== parts[4]
      || d.getUTCSeconds() !== parts[5]) {
      issues.push('INVALID_GENERATED_AT');
    }
  }

  return issues;
};

export const persistV871PackageSummary = async (
  sourceDraftId: string,
  expectedSourceSnapshotFingerprint: string,
  expectedIrRevision: number,
  expectedContentHash: string,
  summary: V871PackageSummary,
  expectedIrDraftId?: string,
  sessionUser?: unknown,
  expectedAuthoringRevision = 0,
): Promise<void> => {
  const initiatingSession = (sessionUser && typeof sessionUser === 'object' ? sessionUser : auth.currentUser) as { uid: string; isAnonymous: boolean } | null;
  if (!initiatingSession || initiatingSession.isAnonymous) {
    throw new Error('Đăng nhập tài khoản giáo viên để lưu bài V8.3.2.');
  }

  const summaryIssues = validateV871PackageSummary(summary);
  if (summaryIssues.length > 0) {
    throw new Error(`V871_SUMMARY_INVALID:${summaryIssues.join(',')}`);
  }

  // Detach validated summary from inspected own descriptors before any await
  const detachedSummary: V871PackageSummary = {
    version: Object.getOwnPropertyDescriptor(summary, 'version')!.value,
    access: Object.getOwnPropertyDescriptor(summary, 'access')!.value,
    releaseStatus: Object.getOwnPropertyDescriptor(summary, 'releaseStatus')!.value,
    sourceHash: Object.getOwnPropertyDescriptor(summary, 'sourceHash')!.value,
    contentHash: Object.getOwnPropertyDescriptor(summary, 'contentHash')!.value,
    packageHash: Object.getOwnPropertyDescriptor(summary, 'packageHash')!.value,
    artifactCount: Object.getOwnPropertyDescriptor(summary, 'artifactCount')!.value,
    sourceSnapshotFingerprint: Object.getOwnPropertyDescriptor(summary, 'sourceSnapshotFingerprint')!.value,
    irDraftId: Object.getOwnPropertyDescriptor(summary, 'irDraftId')!.value,
    irRevision: Object.getOwnPropertyDescriptor(summary, 'irRevision')!.value,
    generatedAt: Object.getOwnPropertyDescriptor(summary, 'generatedAt')!.value,
  };

  if (detachedSummary.sourceSnapshotFingerprint !== expectedSourceSnapshotFingerprint
    || detachedSummary.irRevision !== expectedIrRevision
    || detachedSummary.contentHash !== expectedContentHash) {
    throw new Error('V871_PACKAGE_REVISION_CONFLICT');
  }

  if (expectedIrDraftId && detachedSummary.irDraftId !== expectedIrDraftId) {
    throw new Error('V871_IR_DRAFT_REQUIRED');
  }

  const session = captureV871Session();
  try {
  await runTransaction(db, async transaction => {
    session.assertCurrent();
    // Check strict object reference identity
    if (auth.currentUser !== initiatingSession || auth.currentUser?.isAnonymous) {
      throw new Error('Phiên đăng nhập đã thay đổi.');
    }

    const sourceRef = doc(db, COLLECTION, sourceDraftId);
    const sourceSnapshot = await transaction.get(sourceRef);
    if (!sourceSnapshot.exists()) {
      throw new Error('V871_SOURCE_SNAPSHOT_REQUIRED');
    }
    const source = sourceSnapshot.data() as StoredLessonGenDraft;
    if (source.ownerUid !== initiatingSession.uid) {
      throw new Error('Không có quyền cập nhật bản nháp nguồn.');
    }
    if (!source.sourceBundle || !Array.isArray(source.verificationRecords)) {
      throw new Error('V871_SOURCE_SNAPSHOT_REQUIRED');
    }

    if (source.sourceHash !== source.sourceBundle.sourceHash || detachedSummary.sourceHash !== source.sourceHash) {
      throw new Error('SOURCE_HASH_MISMATCH');
    }

    const authoring = await validateStoredV871AuthoringPlan(source, initiatingSession.uid);
    if (authoring?.state === 'REVIEW_REQUIRED') throw new Error('V871_AUTHORING_REVIEW_REQUIRED');
    if (!Number.isSafeInteger(expectedAuthoringRevision) || expectedAuthoringRevision < 0
      || sourceAuthoringRevision(source) !== expectedAuthoringRevision) throw new Error('V871_AUTHORING_REVISION_CONFLICT');

    const currentFingerprint = await computeSourceSnapshotFingerprint(source);
    if (currentFingerprint !== expectedSourceSnapshotFingerprint) {
      throw new Error('V871_PACKAGE_REVISION_CONFLICT');
    }

    if (!await verifySourceBundleHash(source.sourceBundle)) {
      throw new Error('SOURCE_HASH_MISMATCH');
    }
    if (!canFreezeSourceBundle(source.sourceBundle, source.verificationRecords, source.sourceApproval, initiatingSession.uid)) {
      throw new Error('SOURCE_GATE_NOT_VERIFIED');
    }
    if (!source.v832DraftId || source.v832DraftId !== detachedSummary.irDraftId) {
      throw new Error('V871_IR_DRAFT_REQUIRED');
    }
    if (expectedIrDraftId && source.v832DraftId !== expectedIrDraftId) {
      throw new Error('V871_IR_DRAFT_REQUIRED');
    }

    const irRef = doc(db, COLLECTION, source.v832DraftId);
    const irSnapshot = await transaction.get(irRef);
    if (!irSnapshot.exists()) {
      throw new Error('V871_IR_DRAFT_REQUIRED');
    }
    const irData = irSnapshot.data() as StoredV832StudioDraft;
    if (irData.ownerUid !== initiatingSession.uid || irData.status !== 'v832_review') {
      throw new Error('Không có quyền cập nhật bản nháp bài học.');
    }
    if (irData.sourceDraftId !== sourceDraftId) {
      throw new Error('V871_SOURCE_SNAPSHOT_REQUIRED');
    }
    if (irData.revision !== expectedIrRevision) {
      throw new Error('V871_PACKAGE_REVISION_CONFLICT');
    }

    const decodedIR = decodePrivateLessonIR(irData.lessonIR);
    validateStoredV871PlanMapping(source, decodedIR, authoring);
    if (irData.sourceHash !== source.sourceHash || decodedIR.provenance?.sourceHash !== source.sourceHash) {
      throw new Error('V871_SOURCE_HASH_MISMATCH');
    }
    if (detachedSummary.sourceHash !== irData.sourceHash) {
      throw new Error('V871_SOURCE_HASH_MISMATCH');
    }
    if (decodedIR.lesson.runtimeMin !== source.sourceBundle.durationMinutes) {
      throw new Error('LESSON_DURATION_MISMATCH');
    }
    const currentContentHash = await computeLessonContentHash(decodedIR);
    if (currentContentHash !== expectedContentHash) {
      throw new Error('V871_PACKAGE_REVISION_CONFLICT');
    }

    // Final auth check right before write
    if (auth.currentUser !== initiatingSession || auth.currentUser?.isAnonymous) {
      throw new Error('Phiên đăng nhập đã thay đổi.');
    }

    const updatePayload = {
      v871PackageSummary: detachedSummary,
      updatedAt: serverTimestamp(),
    };
    session.assertCurrent();
    transaction.update(sourceRef, updatePayload);
  });
  } finally { session.dispose(); }
};

export const readOrGenerateV871OwnerPackage = async (
  draftId: string,
  expectedIrDraftId?: string,
): Promise<{ summary: V871PackageSummary; package: V871OwnerPackage; authoringRevision: number }> => {
  const initiatingSession = auth.currentUser;
  if (!initiatingSession || initiatingSession.isAnonymous) {
    throw new Error('Đăng nhập tài khoản giáo viên để lưu bài V8.3.2.');
  }

  const session = captureV871Session();
  try {
  const sourceRef = doc(db, COLLECTION, draftId);
  const snapshot = await getDoc(sourceRef);
  if (!snapshot.exists()) {
    throw new Error('V871_SOURCE_SNAPSHOT_REQUIRED');
  }
  const source = snapshot.data() as StoredLessonGenDraft;
  if (source.ownerUid !== initiatingSession.uid) {
    throw new Error('Không có quyền đọc bản nháp nguồn.');
  }
  if (!source.sourceBundle || !Array.isArray(source.verificationRecords)) {
    throw new Error('V871_SOURCE_SNAPSHOT_REQUIRED');
  }
  if (source.sourceHash !== source.sourceBundle.sourceHash) {
    throw new Error('SOURCE_HASH_MISMATCH');
  }
  if (!await verifySourceBundleHash(source.sourceBundle)) {
    throw new Error('SOURCE_HASH_MISMATCH');
  }
  if (!canFreezeSourceBundle(source.sourceBundle, source.verificationRecords, source.sourceApproval, initiatingSession.uid)) {
    throw new Error('SOURCE_GATE_NOT_VERIFIED');
  }
  const authoringRevision = sourceAuthoringRevision(source);
  const authoring = await validateStoredV871AuthoringPlan(source, initiatingSession.uid);
  if (authoring?.state === 'REVIEW_REQUIRED') throw new Error('V871_AUTHORING_REVIEW_REQUIRED');
  if (!source.v832DraftId) {
    throw new Error('V871_IR_DRAFT_REQUIRED');
  }
  if (expectedIrDraftId && source.v832DraftId !== expectedIrDraftId) {
    throw new Error('V871_IR_DRAFT_REQUIRED');
  }

  if (auth.currentUser !== initiatingSession || auth.currentUser?.isAnonymous) {
    throw new Error('Phiên đăng nhập đã thay đổi.');
  }

  const irDoc = await readV832StudioDraft(source.v832DraftId);
  if (!irDoc) {
    throw new Error('V871_IR_DRAFT_REQUIRED');
  }
  if (irDoc.ownerUid !== initiatingSession.uid) {
    throw new Error('Không có quyền đọc bản nháp bài học.');
  }
  if (irDoc.sourceDraftId !== draftId) {
    throw new Error('V871_SOURCE_SNAPSHOT_REQUIRED');
  }
  if (irDoc.sourceHash !== source.sourceHash || irDoc.lessonIR.provenance?.sourceHash !== source.sourceHash) {
    throw new Error('V871_SOURCE_HASH_MISMATCH');
  }
  if (irDoc.lessonIR.lesson.runtimeMin !== source.sourceBundle.durationMinutes) {
    throw new Error('LESSON_DURATION_MISMATCH');
  }
  validateStoredV871PlanMapping(source, irDoc.lessonIR, authoring);

  // Pre-export auth check
  if (auth.currentUser !== initiatingSession || auth.currentUser?.isAnonymous) {
    throw new Error('Phiên đăng nhập đã thay đổi.');
  }

  const exporterInput: V871PackageInput = {
    lessonIR: irDoc.lessonIR,
    sourceSnapshot: {
      sourceBundle: source.sourceBundle,
      verificationRecords: source.verificationRecords,
      sourceApproval: source.sourceApproval ?? null,
    },
    ownerUid: initiatingSession.uid,
    ...(authoring ? { authoringPlan: authoring.plan,
      ...(authoring.teacherArchetypeChoice ? { teacherArchetypeChoice: authoring.teacherArchetypeChoice } : {}) } : {}),
  };
  const pkg = await exportV871OwnerPrivatePackage(exporterInput);
  session.assertCurrent();

  // Post-export auth check
  if (auth.currentUser !== initiatingSession || auth.currentUser?.isAnonymous) {
    throw new Error('Phiên đăng nhập đã thay đổi.');
  }

  const sourceSnapshotFingerprint = await computeSourceSnapshotFingerprint(source);
  const contentHash = await computeLessonContentHash(irDoc.lessonIR);
  const summary: V871PackageSummary = {
    version: V88_1_VERSION,
    access: 'OWNER_PRIVATE',
    releaseStatus: 'NOT_CERTIFIED',
    sourceHash: source.sourceHash,
    contentHash: pkg.contentHash,
    packageHash: pkg.packageHash,
    artifactCount: 14,
    sourceSnapshotFingerprint,
    irDraftId: source.v832DraftId,
    irRevision: irDoc.revision,
    generatedAt: new Date().toISOString(),
  };

  await persistV871PackageSummary(
    draftId,
    sourceSnapshotFingerprint,
    irDoc.revision,
    contentHash,
    summary,
    expectedIrDraftId,
    initiatingSession,
    authoringRevision,
  );
  session.assertCurrent();

  // Postcommit auth switch: suppress private return if session changed
  if (auth.currentUser !== initiatingSession || auth.currentUser?.isAnonymous) {
    throw new Error('Phiên đăng nhập đã thay đổi.');
  }

  const latestSnapshot = await getDocFromServer(sourceRef);
  if (!latestSnapshot.exists()) throw new Error('V871_PACKAGE_REVISION_CONFLICT');
  const latest = latestSnapshot.data() as StoredLessonGenDraft;
  if (latest.ownerUid !== initiatingSession.uid || sourceAuthoringRevision(latest) !== authoringRevision
    || stableSortedJson(latest.v871ExperiencePlanDraft ?? null) !== stableSortedJson(source.v871ExperiencePlanDraft ?? null)
    || await computeSourceSnapshotFingerprint(latest) !== sourceSnapshotFingerprint) throw new Error('V871_PACKAGE_REVISION_CONFLICT');
  if (auth.currentUser !== initiatingSession || auth.currentUser?.isAnonymous) throw new Error('Phiên đăng nhập đã thay đổi.');
  session.assertCurrent();

  return { summary, package: pkg, authoringRevision };
  } finally { session.dispose(); }
};
