import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import type { V832TokenVerifier } from './_v832-runtime.js';
import { assertPrivateDocumentSize, decodePrivateJson, encodePrivateJson, decodePrivateLessonIR, encodePrivateLessonIR } from '../src/lib/lessonCompiler/v832/privateJsonCodec.js';
import { computeSourceSnapshotFingerprint, sourceAuthoringRevision, stableSortedJson, validateV871AuthoringSource,
  validateStoredV871AuthoringPlan, validateStoredV871PlanMapping, type V871SourceSnapshot } from '../src/lib/lessonCompiler/v832/sourceAuthoringState.js';
import { buildSourceModel } from '../src/lib/lessonCompiler/v832/sourceModel.js';
import { evaluateLearningQuality, type SemanticRuleAttestation } from '../src/lib/lessonCompiler/v832/qualityGate.js';
import { freezeReviewedDesign } from '../src/lib/lessonCompiler/v832/designGate.js';
import { prepareRuntimeBuild, type RuntimeBuildV832 } from '../src/lib/lessonCompiler/v832/runtimePackage.js';
import { computeLessonContentHash } from '../src/lib/lessonReview/v832/repairLifecycle.js';

export class PreviewError extends Error {
  constructor(readonly status: number, code: string) { super(code); }
}

export const commitPreviewRoom = async (db: FirebaseFirestore.Firestore,
  build: RuntimeBuildV832 & { ownerUid: string; sourceBinding?: unknown }, roomRef: FirebaseFirestore.DocumentReference,
  room: Record<string, unknown>, projection: Record<string, unknown>): Promise<void> => {
  const write = (writer: Pick<FirebaseFirestore.Transaction,'create'> | FirebaseFirestore.WriteBatch) => {
    writer.create(roomRef,room);writer.create(roomRef.collection('public').doc('current'),projection);
  };
  const experience = build.privateLessonIR.extensions?.v871Experience as { version?: string } | undefined;
  if (experience?.version !== '1.1' && build.sourceBinding === undefined) {
    const batch=db.batch();write(batch);await batch.commit();return;
  }
  await db.runTransaction(async transaction => {
    const binding = build.sourceBinding as Record<string,unknown> | undefined;
    const keys=['sourceDraftId','sourceSnapshotFingerprint','authoringRevision','irDraftId','irRevision'];
    if (!binding || Array.isArray(binding) || Object.keys(binding).length!==keys.length || keys.some(key=>!Object.hasOwn(binding,key))
      || typeof binding.sourceDraftId!=='string' || !/^lesson-gen-[a-f0-9]{20}$/.test(binding.sourceDraftId)
      || typeof binding.irDraftId!=='string' || !/^v832-[a-f0-9]{24}$/.test(binding.irDraftId)
      || !hash(binding.sourceSnapshotFingerprint) || !revision(binding.authoringRevision) || !revision(binding.irRevision)) {
      throw new PreviewError(409,'V871_PREVIEW_SOURCE_BINDING_REQUIRED');
    }
    const [sourceSnapshot,irSnapshot,buildSnapshot]=await Promise.all([
      transaction.get(db.collection('lessonGenDrafts').doc(binding.sourceDraftId)),
      transaction.get(db.collection('lessonGenDrafts').doc(binding.irDraftId)),
      transaction.get(db.collection('lessonV832Builds').doc(build.manifest.packageId)),
    ]);
    if(!sourceSnapshot.exists || !irSnapshot.exists || !buildSnapshot.exists)throw new PreviewError(409,'V871_PREVIEW_SOURCE_CHANGED');
    const source=sourceSnapshot.data() as V871SourceSnapshot,ir=irSnapshot.data()!,currentBuild=buildSnapshot.data()!;
    if(source.ownerUid!==build.ownerUid || ir.ownerUid!==build.ownerUid || currentBuild.ownerUid!==build.ownerUid
      || source.v832DraftId!==binding.irDraftId || ir.sourceDraftId!==binding.sourceDraftId || ir.revision!==binding.irRevision
      || source.v871AuthoringRevision!==binding.authoringRevision
      || stableSortedJson(currentBuild.sourceBinding)!==stableSortedJson(binding)
      || currentBuild.manifest?.contentHash!==build.manifest.contentHash)throw new PreviewError(409,'V871_PREVIEW_SOURCE_CHANGED');
    try {
      if(await computeSourceSnapshotFingerprint(source)!==binding.sourceSnapshotFingerprint)throw new Error('stale');
      const authoring=await validateStoredV871AuthoringPlan(source,build.ownerUid);
      if(!authoring || authoring.state!=='MAPPED')throw new Error('review');
      if(stableSortedJson(decodePrivateJson(currentBuild.privateExperiencePlan))!==stableSortedJson(authoring.plan))throw new Error('plan');
      const currentIR=decodePrivateLessonIR(ir.lessonIR);
      validateStoredV871PlanMapping(source,currentIR,authoring);
      if(await computeLessonContentHash(currentIR)!==build.manifest.contentHash
        || await computeLessonContentHash(decodePrivateLessonIR(currentBuild.privateLessonIR))!==build.manifest.contentHash)throw new Error('hash');
    } catch {throw new PreviewError(409,'V871_PREVIEW_SOURCE_CHANGED');}
    write(transaction);
  });
};
const verifyIdentity: V832TokenVerifier = async token => {
  if (typeof token !== 'string' || !token) return null;
  try { const decoded = await getAuth().verifyIdToken(token); return { uid: decoded.uid, anonymous: decoded.firebase?.sign_in_provider === 'anonymous' }; }
  catch { return null; }
};
const fields = ['action','idToken','sourceDraftId','irDraftId','expectedSourceSnapshotFingerprint','expectedAuthoringRevision','expectedIrRevision','expectedContentHash'];
const hash = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const revision = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const validated = async <T>(operation: () => T | Promise<T>): Promise<T> => {
  try { return await operation(); }
  catch (cause) { throw new PreviewError(422, cause instanceof Error ? cause.message : 'V871_PREVIEW_INVALID'); }
};
const storedReviews = (value: unknown, ownerUid: string): SemanticRuleAttestation[] => {
  if (!Array.isArray(value) || value.length > 15) throw new Error('V871_REVIEW_INVALID');
  const seen = new Set<string>();
  return value.map(item => {
    const keys = ['ruleId','verdict','evidence','reviewer','reviewedAt'];
    if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).length !== keys.length
      || keys.some(key => !Object.hasOwn(item,key)) || typeof item.ruleId !== 'string' || !/^M(0[1-9]|1[0-5])$/.test(item.ruleId)
      || seen.has(item.ruleId) || !['pass','fail'].includes(item.verdict) || item.reviewer !== ownerUid
      || typeof item.evidence !== 'string' || item.evidence.trim().length < 12 || item.evidence.length > 4000
      || typeof item.reviewedAt !== 'string' || !Number.isFinite(Date.parse(item.reviewedAt))) throw new Error('V871_REVIEW_INVALID');
    seen.add(item.ruleId); return { ...item } as SemanticRuleAttestation;
  });
};

export const handleV871PreparePreview = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>,
  res: VercelResponse, verify: V832TokenVerifier = verifyIdentity): Promise<boolean> => {
  if (body.action !== 'v871PreparePreview') return false;
  try {
    const identity = await verify(body.idToken);
    if (!identity || identity.anonymous) throw new PreviewError(401,'V871_TEACHER_REQUIRED');
    if (Object.keys(body).length !== fields.length || fields.some(key => !Object.hasOwn(body,key))
      || typeof body.sourceDraftId !== 'string' || !/^lesson-gen-[a-f0-9]{20}$/.test(body.sourceDraftId)
      || typeof body.irDraftId !== 'string' || !/^v832-[a-f0-9]{24}$/.test(body.irDraftId)
      || !hash(body.expectedContentHash) || !hash(body.expectedSourceSnapshotFingerprint)
      || !revision(body.expectedAuthoringRevision) || !revision(body.expectedIrRevision)) throw new PreviewError(400,'V871_PREVIEW_REQUEST_INVALID');
    const sourceId = body.sourceDraftId, irId = body.irDraftId;
    const outcome = await db.runTransaction(async transaction => {
      const sourceRef = db.collection('lessonGenDrafts').doc(sourceId), irRef = db.collection('lessonGenDrafts').doc(irId);
      const [sourceSnapshot, irSnapshot] = await Promise.all([transaction.get(sourceRef), transaction.get(irRef)]);
      if (!sourceSnapshot.exists || !irSnapshot.exists) throw new PreviewError(404,'V871_PREVIEW_DRAFT_NOT_FOUND');
      const source = sourceSnapshot.data() as V871SourceSnapshot & { id: string; revision: number };
      const ir = irSnapshot.data()!;
      if (source.ownerUid !== identity.uid || ir.ownerUid !== identity.uid) throw new PreviewError(403,'V871_PREVIEW_OWNER_REQUIRED');
      if (source.id !== sourceId || ir.id !== irId || source.v832DraftId !== irId || ir.sourceDraftId !== sourceId
        || ir.status !== 'v832_review' || ir.revision !== body.expectedIrRevision
        || !revision(source.revision) || source.v871AuthoringRevision !== body.expectedAuthoringRevision) throw new PreviewError(409,'V871_PREVIEW_REVISION_CONFLICT');
      await validated(() => { assertPrivateDocumentSize(sourceSnapshot.data()!,['createdAt','updatedAt']); assertPrivateDocumentSize(ir,['createdAt','updatedAt']); });
      const fingerprint = await validated(() => computeSourceSnapshotFingerprint(source));
      if (fingerprint !== body.expectedSourceSnapshotFingerprint) throw new PreviewError(409,'V871_PREVIEW_SOURCE_CONFLICT');
      const lesson = await validated(() => {
        if (ir.lessonIR?.codec !== 'v832-private-json') throw new Error('PRIVATE_JSON_ENVELOPE_REQUIRED');
        return decodePrivateLessonIR(ir.lessonIR);
      });
      if (await computeLessonContentHash(lesson) !== body.expectedContentHash) throw new PreviewError(409,'V871_PREVIEW_CONTENT_CONFLICT');
      const { frozen, build, privateExperiencePlan } = await validated(async () => {
        await validateV871AuthoringSource(source,identity.uid);
        const authoring = await validateStoredV871AuthoringPlan(source,identity.uid);
        if (!authoring || authoring.state !== 'MAPPED') throw new Error('V871_AUTHORING_REVIEW_REQUIRED');
        validateStoredV871PlanMapping(source,lesson,authoring);
        if (ir.sourceHash !== source.sourceHash || lesson.provenance?.sourceHash !== source.sourceHash
          || lesson.lesson.lessonId !== sourceId || lesson.lesson.runtimeMin !== source.sourceBundle.durationMinutes) throw new Error('V871_PREVIEW_SOURCE_MISMATCH');
        const compact = (text: string) => text.normalize('NFC').replace(/\s|\$/g,'').toLowerCase();
        const texts = source.sourceBundle.sources.map(item => compact(item.content));
        if ([...lesson.sourceVerification.canonicalTerms,...lesson.sourceVerification.canonicalFormulas,
          ...Object.values(lesson.questions).filter(q => q.authoredSource === 'canonical').map(q => q.prompt.vi)]
          .some(text => !compact(text) || !texts.some(sourceText => sourceText.includes(compact(text))))) throw new Error('V871_CANONICAL_CONTENT_NOT_IN_SOURCE');
        const acceptedIds = source.sourceBundle.sources.filter(item => item.role === 'canonical' || item.id === source.sourceApproval?.sourceId).map(item => item.id);
        if (lesson.sourceVerification.canonicalSources.length !== acceptedIds.length
          || new Set(lesson.sourceVerification.canonicalSources.map(item => item.sourceId)).size !== acceptedIds.length
          || lesson.sourceVerification.canonicalSources.some(item => !acceptedIds.includes(item.sourceId))) throw new Error('V871_CANONICAL_SOURCE_MISMATCH');
        const sourceModel = buildSourceModel(source.sourceBundle,source.verificationRecords);
        if (sourceModel.issues.length) throw new Error('SOURCE_MODEL_INVALID');
        const reviews = storedReviews(ir.semanticAttestations,identity.uid);
        const quality = evaluateLearningQuality(lesson,reviews);
        const frozen = freezeReviewedDesign(lesson,quality,sourceModel);
        return { frozen, build: await prepareRuntimeBuild(frozen,reviews,sourceModel), privateExperiencePlan: encodePrivateJson(authoring.plan) };
      });
      const changed = stableSortedJson(frozen) !== stableSortedJson(lesson);
      const irRevision = ir.revision + (changed ? 1 : 0);
      if (!revision(irRevision)) throw new PreviewError(409,'V871_PREVIEW_REVISION_OVERFLOW');
      const sourceBinding = { sourceDraftId: sourceId, sourceSnapshotFingerprint: fingerprint,
        authoringRevision: sourceAuthoringRevision(source), irDraftId: irId, irRevision };
      const bindingHash=createHash('sha256').update(stableSortedJson({sourceBinding,privateExperiencePlan})).digest('hex');
      build.manifest.packageId += `:${bindingHash.slice(0,16)}`;
      const buildRef = db.collection('lessonV832Builds').doc(build.manifest.packageId);
      const existing = await transaction.get(buildRef);
      const update = { lessonIR: encodePrivateLessonIR(frozen), revision: irRevision,
        designReview: { reviewerUid: identity.uid, baseContentHash: body.expectedContentHash, reviewedAt: new Date().toISOString() },
        updatedAt: FieldValue.serverTimestamp() };
      const payload = { ...build, privateLessonIR: encodePrivateLessonIR(build.privateLessonIR),
        privateExperiencePlan, ownerUid: identity.uid, sourceBinding, createdAt: FieldValue.serverTimestamp() };
      await validated(() => { assertPrivateDocumentSize({ ...ir,...update },['createdAt','updatedAt']); assertPrivateDocumentSize(payload,['createdAt']); });
      if (existing.exists) {
        const saved = existing.data()!;
        await validated(()=>assertPrivateDocumentSize(saved,['createdAt']));
        if (saved.ownerUid !== identity.uid || stableSortedJson(saved.manifest) !== stableSortedJson(build.manifest)
          || stableSortedJson(saved.sourceBinding) !== stableSortedJson(sourceBinding)
          || stableSortedJson(saved.privateExperiencePlan) !== stableSortedJson(privateExperiencePlan)
          || await validated(() => computeLessonContentHash(decodePrivateLessonIR(saved.privateLessonIR))) !== build.manifest.contentHash) {
          throw new PreviewError(409,'V871_PREVIEW_BUILD_CONFLICT');
        }
      }
      if (changed) transaction.update(irRef,update);
      if (!existing.exists) transaction.create(buildRef,payload);
      return { created: !existing.exists, manifest: build.manifest, irRevision, contentHash: build.manifest.contentHash };
    });
    const { created,...result } = outcome;
    res.status(created ? 201 : 200).json(result);
  } catch (cause) {
    if (cause instanceof PreviewError) res.status(cause.status).json({ error: 'Chưa thể chuẩn bị bản xem trước; kiểm tra nguồn, phiên bản và kết quả kiểm định.', code: cause.message });
    else { console.error('[v871-preview] failed',cause); res.status(500).json({ error: 'Không chuẩn bị được bản xem trước.' }); }
  }
  return true;
};
