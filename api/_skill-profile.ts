import { buildSkillSummary } from '../src/lib/learning/skillProfile.js';
import type { SkillEvidence, StudentSkillState } from '../src/lib/learning/skillTypes.js';
import type { ProfileTopic, SubmissionGrade } from '../src/lib/classroom/types.js';
import { mergeTopics, removeEvidence, applyEvidence } from '../src/lib/classroom/profileMerge.js';
import { buildHomeworkSkillEvidence } from '../src/lib/learning/skillProfile.js';
import { stripUndefinedDeep } from './_firestore-sanitize.js';

export const SKILL_EVIDENCE_COL = 'studentSkillEvidence';
const STUDENT_PROFILES_COL = 'studentProfiles';

export interface SkillEvidenceOwner {
  studentId: string;
  classId: string;
  teacherId: string;
}

interface SkillProfileDocRef {
  get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
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
  await db.collection(STUDENT_PROFILES_COL).doc(owner.studentId).set(stripUndefinedDeep({
    ...owner,
    skills,
    updatedAt: now,
  }), { merge: true });
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
    await collection.doc(skillEvidenceDocId(owner, item.evidenceId)).set(stripUndefinedDeep({
      ...owner,
      ...item,
    }));
  }
  return rebuildStudentSkillSummary(db, owner, now);
};

const isEvidenceFromSource = (data: Record<string, unknown>, sourceId: string): boolean =>
  data.submissionId === sourceId || data.attemptId === sourceId || data.evidenceId === sourceId;

const removeSourceEvidence = async (
  db: SkillProfileDb,
  owner: SkillEvidenceOwner,
  sourceId: string,
  keepDocumentIds: Set<string> = new Set(),
): Promise<void> => {
  const collection = db.collection(SKILL_EVIDENCE_COL);
  const snapshot = await collection.where('studentId', '==', owner.studentId).get();
  for (const document of snapshot.docs) {
    const data = document.data();
    if (
      data.classId === owner.classId
      && data.teacherId === owner.teacherId
      && isEvidenceFromSource(data, sourceId)
      && !keepDocumentIds.has(document.id)
    ) {
      await collection.doc(document.id).delete();
    }
  }
};

/** Ghi lại trọn bộ evidence của một nguồn, loại các skill cũ đã bị bỏ khi chấm lại. */
export const replaceSkillEvidenceAndRebuild = async (
  db: SkillProfileDb,
  owner: SkillEvidenceOwner,
  sourceId: string,
  evidence: SkillEvidence[],
  now = new Date().toISOString(),
): Promise<StudentSkillState[]> => {
  const collection = db.collection(SKILL_EVIDENCE_COL);
  const keepDocumentIds = new Set<string>();
  for (const item of evidence) {
    const documentId = skillEvidenceDocId(owner, item.evidenceId);
    keepDocumentIds.add(documentId);
    await collection.doc(documentId).set(stripUndefinedDeep({
      ...owner,
      ...item,
    }));
  }
  await removeSourceEvidence(db, owner, sourceId, keepDocumentIds);
  return rebuildStudentSkillSummary(db, owner, now);
};

export const removeSkillEvidenceAndRebuild = async (
  db: SkillProfileDb,
  owner: SkillEvidenceOwner,
  sourceId: string,
  now = new Date().toISOString(),
): Promise<StudentSkillState[]> => {
  await removeSourceEvidence(db, owner, sourceId);
  return rebuildStudentSkillSummary(db, owner, now);
};

/**
 * Đồng bộ hóa hồ sơ chủ đề (profile topics) VÀ kỹ năng (skill evidence) cho một bài nộp ĐÃ DUYỆT.
 *
 * Hàm này là CỬA DUY NHẤT để commit bằng chứng vào hồ sơ tích luỹ — được dùng bởi:
 *  - Học sinh tự chấm AI thành công (auto-approval): approvalSource='student_ai'
 *  - Giáo viên duyệt/bỏ duyệt điểm: approvalSource='teacher'
 *
 * Idempotent: gọi lại nhiều lần với cùng submissionId + grade cho ra cùng kết quả.
 * Nếu sync thất bại, ném lỗi để caller quyết định retry (grade vẫn được giữ approved).
 */
export interface SyncApprovedGradeInput {
  submissionId: string;
  assignmentId: string | null;
  grade: SubmissionGrade;
  owner: SkillEvidenceOwner;
  now: string;
  /** true khi đang bật duyệt (approved), false khi bỏ duyệt/xoá grade. */
  approved: boolean;
}

export const syncApprovedGradeEvidence = async (
  db: SkillProfileDb,
  input: SyncApprovedGradeInput,
): Promise<{ topics: ProfileTopic[]; skills: StudentSkillState[] }> => {
  const { submissionId, assignmentId, grade, owner, now, approved } = input;

  // 1) Lấy hồ sơ chủ đề hiện tại
  const profileRef = db.collection('studentProfiles').doc(owner.studentId);
  const profileSnap = await profileRef.get();
  const profile = profileSnap.exists ? profileSnap.data() || {} : {};
  const existingTopics = Array.isArray(profile.topics) ? (profile.topics as ProfileTopic[]) : [];

  // 2) Áp dụng bằng chứng cho hồ sơ chủ đề (merge/remove)
  const nextTopics = applyEvidence({
    existing: existingTopics,
    weakTopics: grade.weakTopics || [],
    strengths: grade.strengths || [],
    submissionId,
    assignmentId: assignmentId || undefined,
    approved,
    now,
  });

  // 3) Ghi hồ sơ chủ đề
  await profileRef.set(stripUndefinedDeep({
    ...owner,
    topics: nextTopics,
    updatedAt: now,
  }), { merge: true });

  // 4) Đồng bộ skill evidence canonical
  const skillEvidence = buildHomeworkSkillEvidence({
    submissionId,
    assignmentId: assignmentId || undefined,
    grade: {
      score: grade.score,
      maxScore: grade.maxScore,
      weakTopics: grade.weakTopics || [],
      strengths: grade.strengths || [],
      teacherApproved: approved,
      gradedAt: grade.gradedAt,
      questionResults: grade.questionResults?.map(q => ({
        confidence: q.confidence,
      })) || [],
    },
  });

  let skills: StudentSkillState[];
  if (approved) {
    skills = await replaceSkillEvidenceAndRebuild(db, owner, submissionId, skillEvidence, now);
  } else {
    skills = await removeSkillEvidenceAndRebuild(db, owner, submissionId, now);
  }

  return { topics: nextTopics, skills };
};
