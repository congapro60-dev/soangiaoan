import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { db, removeUndefinedFields, storage } from '../lib/firebase';
import type { LessonSourceBundle } from '../lib/lessonGen/sourceIngestion';
import type { SourceVerificationRecord, TeacherCanonicalSourceApproval } from '../lib/lessonGen/sourceVerification';
import type { LessonPlanDraft } from '../lib/lessonGen/planValidator';
import type { CompiledLessonPackage } from '../lib/lessonGen/packageCompiler';
import type { LiveLessonDefinition } from '../lib/liveLesson/types';
import type { StoredV871ExperiencePlanDraft } from '../lib/lessonCompiler/v832/sourceAuthoringState';
import type { BanToanTemplateGate } from '../lib/lessonGen/banToanTemplate';
import { V88_1_VERSION } from '../lib/lessonCompiler/v832/v88Version';
export type { StoredV871ExperiencePlanDraft } from '../lib/lessonCompiler/v832/sourceAuthoringState';

const COLLECTION = 'lessonGenDrafts';

export type LessonGenDraftStatus = 'imported' | 'review_ready' | 'plan_approved' | 'design_approved' | 'compiled';

export interface V871PackageSummary {
  version: typeof V88_1_VERSION;
  access: 'OWNER_PRIVATE';
  releaseStatus: 'NOT_CERTIFIED';
  sourceHash: string;
  contentHash: string;
  packageHash: string;
  artifactCount: 14;
  sourceSnapshotFingerprint: string;
  irDraftId: string;
  irRevision: number;
  generatedAt: string;
}

export interface StoredLessonGenDraft {
  id: string;
  ownerUid: string;
  sourceHash: string;
  banToanTemplateGate?: BanToanTemplateGate;
  banToanTemplateId?: 'ban-toan-2025-2026-landscape';
  revision: number;
  status: LessonGenDraftStatus;
  sourceBundle: LessonSourceBundle;
  verificationRecords: SourceVerificationRecord[];
  planDraft?: LessonPlanDraft | null;
  sourceApproval?: TeacherCanonicalSourceApproval | null;
  v832DraftId?: string | null;
  approval?: { planApprovedAt?: unknown; designApprovedAt?: unknown };
  originalStoragePath?: string;
  compiledPackageId?: string | null;
  v871PackageSummary?: V871PackageSummary | null;
  v871AuthoringRevision?: number;
  v871ExperiencePlanDraft?: StoredV871ExperiencePlanDraft | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}


export const saveLessonGenDraft = async (draft: Omit<StoredLessonGenDraft, 'createdAt' | 'updatedAt'>): Promise<void> => {
  await setDoc(doc(db, COLLECTION, draft.id), {
    ...removeUndefinedFields(draft),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

const safeFileName = (name: string): string => name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'source.bin';

export const uploadLessonGenSource = async (ownerUid: string, draftId: string, file: File): Promise<string> => {
  const path = `lessonGen/${ownerUid}/${draftId}/${safeFileName(file.name)}`;
  await uploadBytes(ref(storage, path), file, { contentType: file.type || 'application/octet-stream' });
  return path;
};

export const updateLessonGenDraft = async (
  id: string,
  patch: Partial<Pick<StoredLessonGenDraft, 'revision' | 'status' | 'sourceBundle' | 'verificationRecords' | 'planDraft' | 'sourceApproval' | 'v832DraftId' | 'approval' | 'compiledPackageId' | 'v871PackageSummary' | 'banToanTemplateGate' | 'banToanTemplateId'>>,
): Promise<void> => {
  const sourceChanged = ['sourceBundle', 'verificationRecords', 'sourceApproval', 'v832DraftId'].some(key => Object.hasOwn(patch, key));
  await updateDoc(doc(db, COLLECTION, id), { ...removeUndefinedFields(patch),
    ...(sourceChanged ? { v871ExperiencePlanDraft: null, v871PackageSummary: null } : {}), updatedAt: serverTimestamp() });
};

export const getLessonGenDraft = async (id: string): Promise<StoredLessonGenDraft | null> => {
  const snapshot = await getDoc(doc(db, COLLECTION, id));
  return snapshot.exists() ? { id: snapshot.id, ...(snapshot.data() as Omit<StoredLessonGenDraft, 'id'>) } : null;
};

export const saveCompiledLessonPackage = async (ownerUid: string, packageResult: CompiledLessonPackage, runtimeDefinition: LiveLessonDefinition): Promise<void> => {
  await setDoc(doc(db, 'lessonGenPackages', packageResult.packageId), removeUndefinedFields({
    ...packageResult,
    ownerUid,
    createdAt: serverTimestamp(),
  }));
  await setDoc(doc(db, 'lessonGenPublicPackages', packageResult.packageId), removeUndefinedFields({
    packageId: packageResult.packageId,
    ownerUid,
    lessonId: packageResult.lessonId,
    version: packageResult.version,
    contentHash: packageResult.contentHash,
    runtimeDefinition,
    createdAt: serverTimestamp(),
  }));
};

export const getGeneratedRuntimeDefinition = async (packageId: string): Promise<LiveLessonDefinition | null> => {
  const snapshot = await getDoc(doc(db, 'lessonGenPublicPackages', packageId));
  if (!snapshot.exists()) return null;
  const value = snapshot.data().runtimeDefinition;
  return value && typeof value === 'object' ? value as LiveLessonDefinition : null;
};
