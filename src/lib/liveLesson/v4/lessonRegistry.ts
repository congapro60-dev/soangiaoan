import type { AdaptiveLesson } from '../../adaptive/types';
import {
  getAllBanToanV4Contracts,
  getBanToanV4Contract,
  getBanToanV4PackageMetadata,
  type BanToanV4PackageMetadata,
} from './lessonAdapter';
import type { LiveLessonV4Contract } from './types';

export interface BanToanV4LessonBinding {
  sourceKey: string;
  packageId: string;
  metadata: BanToanV4PackageMetadata;
  contract: LiveLessonV4Contract;
}

export type AdaptiveLessonIdentity = Partial<Pick<AdaptiveLesson, 'id' | 'grade' | 'curriculumRef'>>;

const contractsBySourceKey = new Map(getAllBanToanV4Contracts().map((contract) => [contract.sourceKey, contract]));
const metadataBySourceKey = new Map(getBanToanV4PackageMetadata().map((metadata) => [metadata.sourceKey, metadata]));
const sourceKeyByPackageId = new Map(getBanToanV4PackageMetadata().map((metadata) => [metadata.packageId, metadata.sourceKey]));

function isExactSourceKey(value: unknown): value is string {
  return typeof value === 'string' && contractsBySourceKey.has(value);
}

function numericGrade(value: unknown): number | null {
  const grade = Number(value);
  return Number.isInteger(grade) ? grade : null;
}

function numericPeriod(value: unknown): number | null {
  const period = Number(value);
  return Number.isInteger(period) ? period : null;
}

/**
 * Resolve only from explicit identity: source key/package id, curriculumRef.lessonCode,
 * or the exact grade-week-period tuple. Title is deliberately never used.
 */
export function getBanToanV4SourceKeyForLesson(
  lesson: AdaptiveLessonIdentity,
): string | null {
  const directCandidates = [lesson.curriculumRef?.lessonCode, lesson.id];
  for (const candidate of directCandidates) {
    if (isExactSourceKey(candidate)) return candidate;
    if (typeof candidate === 'string' && sourceKeyByPackageId.has(candidate)) return sourceKeyByPackageId.get(candidate) ?? null;
  }

  const grade = numericGrade(lesson.grade);
  const week = numericPeriod(lesson.curriculumRef?.week);
  const period = numericPeriod(lesson.curriculumRef?.period);
  if (grade === null || week === null || period === null) return null;
  const tupleKey = `${grade}-${week}-${period}`;
  return isExactSourceKey(tupleKey) ? tupleKey : null;
}

export function getBanToanV4ContractByPackageId(packageId: string): LiveLessonV4Contract | null {
  const sourceKey = sourceKeyByPackageId.get(packageId);
  return sourceKey ? contractsBySourceKey.get(sourceKey) ?? null : null;
}

export function getBanToanV4ContractForLiveDefinitionId(definitionId: string): LiveLessonV4Contract | null {
  return getBanToanV4ContractByPackageId(definitionId);
}

export function getBanToanV4PackageForLesson(
  lesson: AdaptiveLessonIdentity,
): BanToanV4LessonBinding | null {
  const sourceKey = getBanToanV4SourceKeyForLesson(lesson);
  if (!sourceKey) return null;
  const contract = contractsBySourceKey.get(sourceKey);
  const metadata = metadataBySourceKey.get(sourceKey);
  if (!contract || !metadata) return null;
  return { sourceKey, packageId: metadata.packageId, metadata, contract };
}

export function getBanToanV4ContractForLesson(
  lesson: AdaptiveLessonIdentity,
): LiveLessonV4Contract | null {
  return getBanToanV4PackageForLesson(lesson)?.contract ?? null;
}

export function getBanToanV4PackageCount(): number {
  return contractsBySourceKey.size;
}

export { getBanToanV4Contract };
