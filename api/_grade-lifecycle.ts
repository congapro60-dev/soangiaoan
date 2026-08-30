import { removeEvidence } from '../src/lib/classroom/profileMerge.js';
import type {
  ProfileTopic,
  SubmissionDoc,
  SubmissionGrade,
  SubmissionGradeHistoryDoc,
  SubmissionGradeRevisionAction,
} from '../src/lib/classroom/types.js';
import { removeSkillEvidenceAndRebuild } from './_skill-profile.js';

const historyIdForGrade = (
  submission: SubmissionDoc,
  action: SubmissionGradeRevisionAction,
): string => {
  // Một grade hiện hành có một gradedAt ổn định. Dùng nó làm khoá revision để
  // request retry không tạo thêm history trùng cho cùng một grade cũ.
  const revisionKey = encodeURIComponent(String(submission.grade?.gradedAt || submission.updatedAt || 'unknown'));
  return `grade_${submission.id}_${action}_${revisionKey}`;
};

const historyForGrade = (
  submission: SubmissionDoc,
  action: SubmissionGradeRevisionAction,
  actorUid: string,
  createdAt: string,
  id: string,
): SubmissionGradeHistoryDoc => ({
  id,
  submissionId: submission.id,
  teacherId: submission.teacherId,
  classId: submission.classId,
  studentId: submission.studentId,
  assignmentId: submission.assignmentId,
  action,
  actorUid,
  grade: submission.grade as SubmissionGrade,
  createdAt,
});

/**
 * Chốt một kết quả AI cùng history trong MỘT transaction, nhưng chỉ khi worker
 * còn giữ đúng token đã claim. Worker cũ sau recovery/manual edit sẽ không thể
 * ghi grade hoặc tạo history giả.
 * Cũng xóa lastGradingError, lastGradingErrorRaw, evidenceSyncError trong cùng
 * transaction để tránh race condition với cleanup sau commit.
 */
export const commitAiGradeIfClaimed = async (
  db: FirebaseFirestore.Firestore,
  ref: FirebaseFirestore.DocumentReference,
  previous: SubmissionDoc,
  gradingRunId: string,
  grade: SubmissionGrade,
  actorUid: string,
  now: string,
): Promise<{ committed: boolean; historyId: string | null }> => {
  const historyId = previous.grade ? historyIdForGrade(previous, 'ai_regrade') : null;
  let committed = false;

  await db.runTransaction(async transaction => {
    const latestSnapshot = await transaction.get(ref);
    if (!latestSnapshot.exists) return;
    const latest = latestSnapshot.data() as FirebaseFirestore.DocumentData;
    if (latest.status !== 'grading' || latest.gradingRunId !== gradingRunId) return;

    if (previous.grade && historyId) {
      transaction.set(
        db.collection('submissionGradeHistory').doc(historyId),
        historyForGrade(previous, 'ai_regrade', actorUid, now, historyId),
      );
    }
    transaction.update(ref, {
      status: 'graded',
      grade,
      errorMessage: '',
      gradingRunId: null,
      updatedAt: now,
      lastGradingError: '',
      lastGradingErrorRaw: '',
      evidenceSyncError: '',
    });
    committed = true;
  });

  return { committed, historyId: committed ? historyId : null };
};

export class GradeLifecycleConflictError extends Error {
  constructor() {
    super('Kết quả chấm vừa thay đổi ở một cửa sổ khác. Tải lại bài rồi thử lại.');
    this.name = 'GradeLifecycleConflictError';
  }
}

/** History và document hiện hành phải đổi cùng nhau; không để retry tạo trạng thái nửa chừng. */
export const commitSubmissionGradeChange = async (
  db: FirebaseFirestore.Firestore,
  ref: FirebaseFirestore.DocumentReference,
  previous: SubmissionDoc,
  action: SubmissionGradeRevisionAction,
  actorUid: string,
  nextSubmission: SubmissionDoc,
  now: string,
): Promise<string | null> => {
  const historyId = previous.grade ? historyIdForGrade(previous, action) : null;

  await db.runTransaction(async transaction => {
    const latestSnapshot = await transaction.get(ref);
    if (!latestSnapshot.exists) throw new GradeLifecycleConflictError();
    const latest = latestSnapshot.data() as FirebaseFirestore.DocumentData;
    const latestGradeAt = latest.grade && typeof latest.grade === 'object' ? latest.grade.gradedAt : undefined;
    const previousGradeAt = previous.grade?.gradedAt;
    if (latest.teacherId !== previous.teacherId
      || latest.updatedAt !== previous.updatedAt
      || latest.status !== previous.status
      || latestGradeAt !== previousGradeAt) {
      throw new GradeLifecycleConflictError();
    }

    if (previous.grade && historyId) {
      transaction.set(
        db.collection('submissionGradeHistory').doc(historyId),
        historyForGrade(previous, action, actorUid, now, historyId),
      );
    }
    transaction.set(ref, nextSubmission);
  });

  return historyId;
};

/** Gỡ cả compatibility topics và canonical skill evidence của một submission. */
export const removeSubmissionGradeEvidence = async (
  db: FirebaseFirestore.Firestore,
  submission: SubmissionDoc,
  now: string,
): Promise<void> => {
  if (submission.studentId) {
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
