import type { Exam, ExamSubmission } from '../../types';
import type {
  AssignmentDoc,
  PracticeAttemptDoc,
  PracticeSetDoc,
  StudentActivityStatus,
  StudentActivityView,
  SubmissionDoc,
} from './types';

export interface StudentActivityModelInput {
  studentId: string;
  assignments?: readonly AssignmentDoc[];
  exams?: readonly Exam[];
  submissions?: readonly SubmissionDoc[];
  examSubmissions?: readonly ExamSubmission[];
  practiceSets?: readonly PracticeSetDoc[];
  practiceAttempts?: readonly PracticeAttemptDoc[];
}

const timestamp = (value: unknown): number => {
  const parsed = Date.parse(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const attemptTimestamp = (item: { createdAt?: string; updatedAt?: string; submittedAt?: string; startedAt?: string }): string =>
  item.submittedAt || item.updatedAt || item.createdAt || item.startedAt || '';

const isNewer = (candidate: { createdAt?: string; updatedAt?: string; submittedAt?: string; startedAt?: string }, current: { createdAt?: string; updatedAt?: string; submittedAt?: string; startedAt?: string }): boolean => {
  const candidateTime = timestamp(attemptTimestamp(candidate));
  const currentTime = timestamp(attemptTimestamp(current));
  return candidateTime > currentTime || (candidateTime === currentTime && attemptTimestamp(candidate) > attemptTimestamp(current));
};

const newest = <T extends { createdAt?: string; updatedAt?: string; submittedAt?: string; startedAt?: string }>(items: readonly T[]): T | undefined =>
  items.reduce<T | undefined>((current, item) => !current || isNewer(item, current) ? item : current, undefined);

const finiteScore = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const purposeFor = (assignment: AssignmentDoc, exam?: Exam) =>
  assignment.purpose || exam?.purpose || 'assignment' as const;

const contentVersionFor = (assignment: AssignmentDoc, exam?: Exam): string =>
  assignment.contentVersion || exam?.contentVersion || `legacy:assignment:${assignment.id}`;

const nextActionFor = (status: StudentActivityStatus): StudentActivityView['nextAction'] => {
  switch (status) {
    case 'not_started': return 'start';
    case 'in_progress': return 'resume';
    case 'pending_teacher': return 'wait_teacher';
    case 'official':
    case 'formative_complete': return 'view_feedback';
    case 'error': return 'retry';
    case 'grading':
    case 'submitted': return 'wait_teacher';
  }
};

const uploadStatus = (submission: SubmissionDoc | undefined): StudentActivityStatus => {
  if (!submission) return 'not_started';
  if (submission.status === 'error') return 'error';
  if (submission.status === 'grading') return 'grading';
  if (submission.grade?.teacherApproved) return 'official';
  if (submission.grade) return 'pending_teacher';
  return 'submitted';
};

const examStatus = (submission: ExamSubmission | undefined): StudentActivityStatus => {
  if (!submission) return 'not_started';
  if (submission.status === 'in_progress') return 'in_progress';
  if (submission.gradeState === 'official' || (submission.gradeState === undefined && submission.status === 'graded')) return 'official';
  if (submission.gradeState === 'pending_teacher_review') return 'pending_teacher';
  if (submission.gradeState === 'provisional' || finiteScore(submission.totalScore) !== null) return 'pending_teacher';
  return submission.status === 'submitted' ? 'submitted' : 'submitted';
};

const practiceStatus = (attempt: PracticeAttemptDoc | undefined): StudentActivityStatus => {
  if (!attempt) return 'not_started';
  if (attempt.status === 'graded') return 'formative_complete';
  if (attempt.status === 'grading') return 'grading';
  return 'error';
};

const toUploadView = (
  assignment: AssignmentDoc,
  submissions: readonly SubmissionDoc[],
): StudentActivityView => {
  const latest = newest(submissions);
  const status = uploadStatus(latest);
  return {
    id: assignment.id,
    sourceType: 'assignment',
    assignmentId: assignment.id,
    title: assignment.title,
    purpose: purposeFor(assignment),
    deliveryMode: assignment.deliveryMode || 'file',
    gradingPolicy: assignment.gradingPolicy,
    skillIds: [...(assignment.skillIds || [])],
    contentVersion: contentVersionFor(assignment),
    dueAt: assignment.dueAt,
    maxScore: assignment.maxScore,
    attemptCount: submissions.length,
    latestAttemptAt: latest ? attemptTimestamp(latest) : undefined,
    provisionalScore: finiteScore(latest?.grade?.score),
    officialScore: latest?.grade?.teacherApproved ? finiteScore(latest.grade.score) : null,
    status,
    nextAction: nextActionFor(status),
  };
};

const toExamView = (
  assignment: AssignmentDoc,
  exam: Exam | undefined,
  submissions: readonly ExamSubmission[],
): StudentActivityView => {
  const latest = newest(submissions);
  const status = examStatus(latest);
  const score = finiteScore(latest?.totalScore);
  const official = status === 'official' ? score : null;
  return {
    id: assignment.id,
    sourceType: 'online_exam',
    assignmentId: assignment.id,
    examId: assignment.examId,
    title: assignment.title || exam?.title || 'Bài online',
    purpose: purposeFor(assignment, exam),
    deliveryMode: assignment.deliveryMode || 'online',
    gradingPolicy: assignment.gradingPolicy,
    skillIds: [...(assignment.skillIds || exam?.skillIds || [])],
    contentVersion: contentVersionFor(assignment, exam),
    dueAt: assignment.dueAt,
    maxScore: assignment.maxScore ?? exam?.maxScore,
    attemptCount: submissions.length,
    latestAttemptAt: latest ? attemptTimestamp(latest) : undefined,
    provisionalScore: score,
    officialScore: official,
    status,
    nextAction: nextActionFor(status),
  };
};

const toPracticeView = (set: PracticeSetDoc, attempts: readonly PracticeAttemptDoc[]): StudentActivityView => {
  const latest = newest(attempts);
  const status = practiceStatus(latest);
  return {
    id: set.id,
    sourceType: 'practice',
    practiceSetId: set.id,
    title: `Luyện tập${set.topics.length > 0 ? ` · ${set.topics.join(', ')}` : ''}`,
    purpose: 'practice',
    deliveryMode: 'online',
    skillIds: [...(set.skillIds || [])],
    contentVersion: `practice:${set.id}:${set.updatedAt}`,
    maxScore: latest?.maxScore,
    attemptCount: attempts.length,
    latestAttemptAt: latest ? attemptTimestamp(latest) : undefined,
    provisionalScore: finiteScore(latest?.score),
    officialScore: null,
    status,
    nextAction: status === 'formative_complete' ? 'practice_again' : nextActionFor(status),
  };
};

export const buildStudentActivityViews = (input: StudentActivityModelInput): StudentActivityView[] => {
  const assignments = (input.assignments || []).filter(assignment =>
    !assignment.targetStudentIds || assignment.targetStudentIds.includes(input.studentId));
  const examsById = new Map((input.exams || []).map(exam => [exam.id, exam]));
  const uploadSubmissions = (assignmentId: string) => (input.submissions || []).filter(submission =>
    submission.studentId === input.studentId && submission.assignmentId === assignmentId);
  const examSubmissions = (assignment: AssignmentDoc) => (input.examSubmissions || []).filter(submission =>
    submission.studentId === input.studentId
    && (submission.assignmentId === assignment.id
      || (!submission.assignmentId && Boolean(assignment.examId) && submission.examId === assignment.examId)));
  const practiceAttempts = (setId: string) => (input.practiceAttempts || []).filter(attempt =>
    attempt.studentId === input.studentId && attempt.setId === setId);

  const views = assignments.map(assignment => assignment.type === 'exam'
    ? toExamView(assignment, assignment.examId ? examsById.get(assignment.examId) : undefined, examSubmissions(assignment))
    : toUploadView(assignment, uploadSubmissions(assignment.id)));

  for (const set of (input.practiceSets || []).filter(item => item.studentId === input.studentId)) {
    views.push(toPracticeView(set, practiceAttempts(set.id)));
  }

  return views.sort((a, b) => timestamp(b.latestAttemptAt) - timestamp(a.latestAttemptAt) || a.title.localeCompare(b.title, 'vi'));
};
