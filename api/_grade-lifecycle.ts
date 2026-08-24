import { removeEvidence } from '../src/lib/classroom/profileMerge.js';
import type {
  ProfileTopic,
  SubmissionDoc,
  SubmissionGradeHistoryDoc,
  SubmissionGradeRevisionAction,
} from '../src/lib/classroom/types.js';
import { removeSkillEvidenceAndRebuild } from './_skill-profile.js';

const newHistoryId = (submissionId: string): string => {
  const random = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `grade_${submissionId}_${random}`;
};

export const archiveSubmissionGrade = async (
  db: FirebaseFirestore.Firestore,
  submission: SubmissionDoc,
  action: SubmissionGradeRevisionAction,
  actorUid: string,
  createdAt: string,
): Promise<string | null> => {
  if (!submission.grade) return null;

  const id = newHistoryId(submission.id);
  const history: SubmissionGradeHistoryDoc = {
    id,
    submissionId: submission.id,
    teacherId: submission.teacherId,
    classId: submission.classId,
    studentId: submission.studentId,
    assignmentId: submission.assignmentId,
    action,
    actorUid,
    grade: submission.grade,
    createdAt,
  };
  await db.collection('submissionGradeHistory').doc(id).set(history);
  return id;
};

/** Gỡ cả compatibility topics và canonical skill evidence của một submission. */
export const removeSubmissionGradeEvidence = async (
  db: FirebaseFirestore.Firestore,
  submission: SubmissionDoc,
  now: string,
): Promise<void> => {
  if (submission.grade?.teacherApproved === true && submission.studentId) {
    const profileRef = db.collection('studentProfiles').doc(submission.studentId);
    const profileSnap = await profileRef.get();
    if (profileSnap.exists) {
      const profile = profileSnap.data() || {};
      const existing = Array.isArray(profile.topics)
        ? (profile.topics as ProfileTopic[]).filter(topic => Array.isArray(topic?.evidenceSubmissionIds))
        : [];
      await profileRef.set({
        studentId: submission.studentId,
        classId: submission.classId,
        teacherId: submission.teacherId,
        topics: removeEvidence(existing, submission.id, now, submission.assignmentId || undefined),
        updatedAt: now,
      }, { merge: true });
    }
  }

  await removeSkillEvidenceAndRebuild(db, {
    studentId: submission.studentId,
    classId: submission.classId,
    teacherId: submission.teacherId,
  }, submission.id, now);
};

export const submissionWithoutGrade = (submission: SubmissionDoc): Omit<SubmissionDoc, 'grade'> => {
  const { grade: _grade, ...withoutGrade } = submission;
  return withoutGrade;
};
