import { randomUUID } from 'node:crypto';
import type { SubmissionDoc } from '../src/lib/classroom/types.js';
import { SubmissionAccessError } from './_submission-actors.js';
import { isStaleGradingTimestamp } from '../src/lib/classroom/submissionSelection.js';

type Db = FirebaseFirestore.Firestore;
type Result = { success: boolean; gradePreserved?: boolean; failureCode?: string };
// Google refused the key itself: every later item would fail the same way, so the job pauses on this item.
const PAUSE_CODES = new Set(['provider_quota', 'provider_key_invalid']);

// Jobs are provisioned by an administrator; clients cannot write this collection.
// One leased item per request keeps retries within the existing 300-second function.
export const runGradingRefreshItem = async (db: Db, jobId: string, grade: (submission: SubmissionDoc, assignment: FirebaseFirestore.DocumentData, bypassDailyQuota: boolean) => Promise<Result>) => {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(jobId)) throw new SubmissionAccessError(422, 'Mã đợt chấm không hợp lệ.');
  const ref = db.collection('gradingRefreshJobs').doc(jobId), runId = randomUUID();
  const claim = await db.runTransaction(async tx => {
    const job = (await tx.get(ref)).data();
    if (!job || job.expiresAt <= Date.now() || job.status === 'paused') throw new SubmissionAccessError(409, 'Đợt chấm đã hết hạn hoặc tạm dừng.');
    if (!Array.isArray(job.submissionIds) || !job.teacherId || !Number.isInteger(job.cursor) || job.cursor < 0) throw new SubmissionAccessError(422, 'Đợt chấm thiếu phạm vi.');
    if (job.cursor >= job.submissionIds.length) return { done: true, job } as const;
    if (job.leaseUntil > Date.now()) return { busy: true, job } as const;
    const submissionId = job.submissionIds[job.cursor];
    if (typeof submissionId !== 'string' || !submissionId || submissionId.includes('/')) throw new SubmissionAccessError(422, 'Mã bài không hợp lệ.');
    tx.update(ref, { runId, leaseUntil: Date.now() + 6 * 60_000 });
    return { submissionId, job } as const;
  });
  const remaining = claim.job.submissionIds.length - claim.job.cursor;
  if ('done' in claim) return { done: true, remaining: 0, counts: claim.job.counts || {} };
  if ('busy' in claim) return { busy: true, remaining };

  let outcome = 'failed', failureCode = '', pauseCode = '';
  try {
    const subRef = db.collection('submissions').doc(claim.submissionId);
    const snapshot = await subRef.get(), submission = { id: snapshot.id, ...snapshot.data() } as SubmissionDoc;
    const classDoc = submission.classId ? (await db.collection('classes').doc(submission.classId).get()).data() : undefined;
    if (!snapshot.exists || submission.teacherId !== claim.job.teacherId || classDoc?.teacherId !== claim.job.teacherId) outcome = 'skipped_scope';
    else if (snapshot.data()?.gradingRefreshJobId === jobId) outcome = 'already_done';
    else if (snapshot.data()?.deletionRunId) outcome = 'skipped_busy';
    else if (submission.status === 'grading' && !isStaleGradingTimestamp(submission.updatedAt)) outcome = 'retry_busy';
    else if (submission.grade?.editedByTeacher || submission.grade?.questionResults?.some(row => row.teacherEdited)) outcome = 'skipped_manual';
    else if (!submission.assignmentId) outcome = 'skipped_source';
    else {
      const assignment = (await db.collection('assignments').doc(submission.assignmentId).get()).data();
      const member = (await db.collection('classes').doc(submission.classId).collection('students').doc(submission.studentId).get()).exists;
      if (!member || !assignment || assignment.classId !== submission.classId || assignment.teacherId !== submission.teacherId || assignment.type === 'exam' || assignment.deliveryMode === 'online'
        || Array.isArray(assignment.targetStudentIds) && assignment.targetStudentIds.length && !assignment.targetStudentIds.includes(submission.studentId)) outcome = 'skipped_scope';
      else {
        // A completed grade after a lost response must not be charged a second time.
        const prior = (await ref.collection('items').doc(submission.id).get()).data();
        if (prior?.startedAt && submission.grade?.gradedAt && submission.grade.gradedAt !== prior.previousGradeAt && Date.parse(submission.grade.gradedAt) >= Date.parse(prior.startedAt)) outcome = 'already_done';
        else {
          await ref.collection('items').doc(submission.id).set({ startedAt: new Date().toISOString(), previousGradeAt: submission.grade?.gradedAt || '', status: 'running' });
          const result = await grade(submission, assignment, claim.job.allowDailyQuotaBypass === true);
          outcome = result.success ? 'graded' : result.gradePreserved ? 'failed_preserved' : 'failed';
          failureCode = result.success ? '' : result.failureCode || 'unknown';
          if (PAUSE_CODES.has(failureCode)) pauseCode = failureCode;
          if (result.success) await subRef.update({ gradingRefreshJobId: jobId });
        }
      }
    }
  } catch (error) {
    if (error instanceof SubmissionAccessError && error.statusCode === 429) pauseCode = 'daily_quota';
    else if (error instanceof Error && error.name === 'AiKeyRequiredError') pauseCode = `key_blocked_${String((error as { reason?: unknown }).reason || 'unknown')}`;
    else { outcome = 'failed'; failureCode = 'exception'; }
  }

  if (pauseCode) {
    // The cursor stays on this item so a resumed job retries it; the item only records why the job stopped.
    const pausedAt = new Date().toISOString();
    await db.runTransaction(async tx => {
      if ((await tx.get(ref)).data()?.runId !== runId) return;
      tx.set(ref.collection('items').doc(claim.submissionId), { status: 'paused', failureCode: pauseCode, finishedAt: pausedAt }, { merge: true });
      tx.update(ref, { status: 'paused', runId: '', leaseUntil: 0, pauseReason: pauseCode, pausedAt, updatedAt: pausedAt });
    });
    throw new SubmissionAccessError(429, `Đợt chấm tạm dừng: ${pauseCode}`);
  }

  await db.runTransaction(async tx => {
    const current = (await tx.get(ref)).data();
    if (current?.runId !== runId) return;
    if (outcome === 'retry_busy') { tx.update(ref, { runId: '', leaseUntil: 0 }); return; }
    tx.set(ref.collection('items').doc(claim.submissionId), { status: outcome, ...(failureCode ? { failureCode } : {}), finishedAt: new Date().toISOString() }, { merge: true });
    tx.update(ref, { cursor: current.cursor + 1, runId: '', leaseUntil: 0, updatedAt: new Date().toISOString(), counts: { ...current.counts, [outcome]: (current.counts?.[outcome] || 0) + 1 }, status: current.status === 'paused' ? 'paused' : remaining === 1 ? 'complete' : 'running' });
  });
  if (outcome === 'retry_busy') return { busy: true, remaining };
  return { outcome, ...(failureCode ? { failureCode } : {}), remaining: remaining - 1, done: remaining === 1, ...(remaining === 1 ? { counts: (await ref.get()).data()?.counts || {} } : {}) };
};
