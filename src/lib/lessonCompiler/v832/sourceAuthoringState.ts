import type { LessonSourceBundle } from '../../lessonGen/sourceIngestion';
import { verifySourceBundleHash } from '../../lessonGen/sourceIngestion';
import { canFreezeSourceBundle, type SourceVerificationRecord, type TeacherCanonicalSourceApproval } from '../../lessonGen/sourceVerification';
import { encodePrivateJson, decodePrivateJson, type PrivateJsonEnvelope } from './privateJsonCodec';
import type { LessonIRV83 } from './lessonIRSchema';
import { buildSourceModel } from './sourceModel';
import { validateExperienceAuthoringPlan, validateExperiencePlanMapping } from './experienceAuthoring';
import { parseV871ExperienceExtension } from './experienceExtension';

export interface V871SourceSnapshot {
  ownerUid: string;
  sourceHash: string;
  sourceBundle: LessonSourceBundle;
  verificationRecords: SourceVerificationRecord[];
  sourceApproval?: TeacherCanonicalSourceApproval | null;
  v832DraftId?: string | null;
  v871AuthoringRevision?: number;
  v871ExperiencePlanDraft?: StoredV871ExperiencePlanDraft | null;
}

export interface StoredV871ExperiencePlanDraft {
  version: '1.0';
  state: 'MAPPED' | 'REVIEW_REQUIRED';
  sourceHash: string;
  sourceSnapshotFingerprint: string;
  authoringRevision: number;
  teacherArchetypeChoice: 'practice' | 'review_diagnostic' | null;
  plan: PrivateJsonEnvelope;
  diagnostics: string[];
  createdAt: string;
}

export const stableSortedJson = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSortedJson).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort().filter(k => obj[k] !== undefined);
  return `{${keys.map(k => `${JSON.stringify(k)}:${stableSortedJson(obj[k])}`).join(',')}}`;
};

export const computeSourceSnapshotFingerprint = async (
  source: Pick<V871SourceSnapshot, 'sourceHash' | 'sourceBundle' | 'verificationRecords' | 'sourceApproval' | 'v832DraftId'>
): Promise<string> => {
  const payload = {
    sourceHash: source.sourceHash,
    sourceBundle: source.sourceBundle,
    verificationRecords: source.verificationRecords,
    sourceApproval: source.sourceApproval ?? null,
    v832DraftId: source.v832DraftId ?? null,
  };
  const json = stableSortedJson(payload);
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
};

export const sourceAuthoringRevision = (source: V871SourceSnapshot): number => {
  const value = source.v871AuthoringRevision;
  if (value === undefined) return 0;
  if (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0)) throw new Error('V871_AUTHORING_REVISION_INVALID');
  return value;
};

export const validateV871AuthoringSource = async (source: V871SourceSnapshot, ownerUid: string): Promise<void> => {
  if (!source || source.ownerUid !== ownerUid || !source.sourceBundle || !Array.isArray(source.verificationRecords)
    || !Array.isArray(source.sourceBundle.sources) || !source.sourceBundle.sources.length
    || source.sourceHash !== source.sourceBundle.sourceHash) throw new Error('V871_SOURCE_SNAPSHOT_REQUIRED');
  if (!await verifySourceBundleHash(source.sourceBundle)) throw new Error('SOURCE_HASH_MISMATCH');
  if (!canFreezeSourceBundle(source.sourceBundle, source.verificationRecords, source.sourceApproval, ownerUid)) {
    throw new Error('SOURCE_GATE_NOT_VERIFIED');
  }
};

export const validateStoredV871AuthoringPlan = async (source: V871SourceSnapshot, ownerUid: string) => {
  sourceAuthoringRevision(source);
  const value = source.v871ExperiencePlanDraft;
  if (value === undefined || value === null) return null;
  const wrapper = decodePrivateJson(encodePrivateJson(value)) as StoredV871ExperiencePlanDraft;
  const keys = ['version', 'state', 'sourceHash', 'sourceSnapshotFingerprint', 'authoringRevision',
    'teacherArchetypeChoice', 'plan', 'diagnostics', 'createdAt'];
  if (!wrapper || typeof wrapper !== 'object' || Array.isArray(wrapper) || Object.keys(wrapper).length !== keys.length
    || keys.some(key => !Object.hasOwn(wrapper, key)) || wrapper.version !== '1.0'
    || (wrapper.state !== 'MAPPED' && wrapper.state !== 'REVIEW_REQUIRED')
    || !Number.isSafeInteger(wrapper.authoringRevision) || wrapper.authoringRevision < 1
    || wrapper.authoringRevision !== sourceAuthoringRevision(source) || wrapper.sourceHash !== source.sourceHash
    || wrapper.sourceSnapshotFingerprint !== await computeSourceSnapshotFingerprint(source)
    || !Array.isArray(wrapper.diagnostics) || wrapper.diagnostics.some(item => typeof item !== 'string')
    || typeof wrapper.createdAt !== 'string' || !Number.isFinite(Date.parse(wrapper.createdAt))
    || (wrapper.teacherArchetypeChoice !== null && wrapper.teacherArchetypeChoice !== 'practice'
      && wrapper.teacherArchetypeChoice !== 'review_diagnostic')
    || wrapper.plan?.codec !== 'v832-private-json') throw new Error('V871_AUTHORING_PLAN_STALE_OR_INVALID');
  await validateV871AuthoringSource(source, ownerUid);
  const validated = validateExperienceAuthoringPlan(decodePrivateJson(wrapper.plan), {
    sourceModel: buildSourceModel(source.sourceBundle, source.verificationRecords), durationMinutes: source.sourceBundle.durationMinutes!,
    ...(wrapper.teacherArchetypeChoice ? { teacherArchetypeChoice: wrapper.teacherArchetypeChoice } : {}) });
  if ((validated.mapping === 'MAPPABLE') !== (wrapper.state === 'MAPPED')
    || (wrapper.state === 'MAPPED' && !source.v832DraftId)) throw new Error('V871_AUTHORING_PLAN_STALE_OR_INVALID');
  return { ...wrapper, plan: validated.plan };
};

export const validateStoredV871PlanMapping = (source: V871SourceSnapshot, lesson: LessonIRV83,
  authoring: Awaited<ReturnType<typeof validateStoredV871AuthoringPlan>>) => {
  const extension = parseV871ExperienceExtension(lesson.extensions);
  if (!authoring && extension?.version !== '1.1') return;
  if (!authoring) throw new Error('V871_AUTHORING_PLAN_REQUIRED');
  if (extension?.version !== '1.1') throw new Error('V871_AUTHORING_VERSION_CONFLICT');
  const issues = validateExperiencePlanMapping(authoring.plan, lesson, {
    sourceModel: buildSourceModel(source.sourceBundle, source.verificationRecords), durationMinutes: source.sourceBundle.durationMinutes!,
    ...(authoring.teacherArchetypeChoice ? { teacherArchetypeChoice: authoring.teacherArchetypeChoice } : {}) });
  if (issues.length) throw new Error(`V871_STAGE2_MAPPING_INVALID:${issues.join(',')}`);
};
