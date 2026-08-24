import { buildSkillSummary } from '../src/lib/learning/skillProfile.js';
import type { SkillEvidence, StudentSkillState } from '../src/lib/learning/skillTypes.js';

export const SKILL_EVIDENCE_COL = 'studentSkillEvidence';
const STUDENT_PROFILES_COL = 'studentProfiles';

export interface SkillEvidenceOwner {
  studentId: string;
  classId: string;
  teacherId: string;
}

interface SkillProfileDocRef {
  set(payload: Record<string, unknown>, options?: { merge?: boolean }): Promise<unknown>;
  delete(): Promise<unknown>;
}

interface SkillProfileQuery {
  get(): Promise<{ docs: Array<{ id: string; data(): Record<string, unknown> }> }>;
}

interface SkillProfileCollection {
  doc(id: string): SkillProfileDocRef;
  where(field: string, operator: '==', value: unknown): SkillProfileQuery;
}

export interface SkillProfileDb {
  collection(name: string): SkillProfileCollection;
}

export const skillEvidenceDocId = (owner: SkillEvidenceOwner, evidenceId: string): string =>
  `${encodeURIComponent(owner.studentId)}__${encodeURIComponent(evidenceId)}`;

const listOwnerEvidence = async (db: SkillProfileDb, owner: SkillEvidenceOwner): Promise<Array<SkillEvidence & SkillEvidenceOwner>> => {
  const snapshot = await db.collection(SKILL_EVIDENCE_COL)
    .where('studentId', '==', owner.studentId)
    .get();

  return snapshot.docs
    .map(document => document.data())
    .filter(data => data.classId === owner.classId && data.teacherId === owner.teacherId)
    .map(data => data as unknown as SkillEvidence & SkillEvidenceOwner);
};

export const rebuildStudentSkillSummary = async (
  db: SkillProfileDb,
  owner: SkillEvidenceOwner,
  now = new Date().toISOString(),
): Promise<StudentSkillState[]> => {
  const evidence = await listOwnerEvidence(db, owner);
  const skills = buildSkillSummary(evidence);
  await db.collection(STUDENT_PROFILES_COL).doc(owner.studentId).set({
    ...owner,
    skills,
    updatedAt: now,
  }, { merge: true });
  return skills;
};

export const upsertSkillEvidenceAndRebuild = async (
  db: SkillProfileDb,
  owner: SkillEvidenceOwner,
  evidence: SkillEvidence[],
  now = new Date().toISOString(),
): Promise<StudentSkillState[]> => {
  const collection = db.collection(SKILL_EVIDENCE_COL);
  for (const item of evidence) {
    await collection.doc(skillEvidenceDocId(owner, item.evidenceId)).set({
      ...owner,
      ...item,
    });
  }
  return rebuildStudentSkillSummary(db, owner, now);
};

export const removeSkillEvidenceAndRebuild = async (
  db: SkillProfileDb,
  owner: SkillEvidenceOwner,
  sourceId: string,
  now = new Date().toISOString(),
): Promise<StudentSkillState[]> => {
  const collection = db.collection(SKILL_EVIDENCE_COL);
  const snapshot = await collection.where('studentId', '==', owner.studentId).get();
  for (const document of snapshot.docs) {
    const data = document.data();
    if (
      data.classId === owner.classId
      && data.teacherId === owner.teacherId
      && (data.submissionId === sourceId || data.attemptId === sourceId || data.evidenceId === sourceId)
    ) {
      await collection.doc(document.id).delete();
    }
  }
  return rebuildStudentSkillSummary(db, owner, now);
};
