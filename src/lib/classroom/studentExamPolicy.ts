export type StudentExamAttemptStatus = 'in_progress' | 'submitted' | 'graded';

export interface VerifiedStudentLink {
  uid: string;
  studentId: string;
  classId: string;
  teacherId: string;
}

export interface StudentExamAssignmentPolicy {
  id: string;
  classId: string;
  type: 'upload' | 'exam';
  examId?: string;
  isOpen: boolean;
  dueAt?: string;
  targetStudentIds?: string[];
}

export interface StudentExamDefinitionPolicy {
  id: string;
  isActive: boolean;
  startAt?: string;
  endAt?: string;
  maxAttempts?: number;
}

export interface StudentExamAttemptContext {
  id: string;
  studentId?: string;
  classId?: string;
  assignmentId?: string;
  status: StudentExamAttemptStatus;
  updatedAt?: string;
  startedAt?: string;
}

export interface StudentExamStartInput {
  now: Date;
  link: VerifiedStudentLink;
  assignment: StudentExamAssignmentPolicy;
  exam: StudentExamDefinitionPolicy;
  attempts: readonly StudentExamAttemptContext[];
}

export type StudentExamStartReason =
  | 'ok'
  | 'invalid_student_link'
  | 'assignment_not_in_class'
  | 'assignment_not_exam'
  | 'exam_not_linked'
  | 'assignment_closed'
  | 'student_not_targeted'
  | 'exam_not_found'
  | 'exam_not_started'
  | 'exam_ended'
  | 'assignment_due'
  | 'max_attempts_reached';

export interface StudentExamStartDecision {
  allowed: boolean;
  reason: StudentExamStartReason;
}

const validId = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const time = (value: unknown): number | null => {
  if (!value) return null;
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

const attemptedBy = (
  attempts: readonly StudentExamAttemptContext[],
  studentId: string,
  classId: string,
  assignmentId: string,
): StudentExamAttemptContext[] => attempts.filter(attempt =>
  attempt.studentId === studentId
  && attempt.classId === classId
  && attempt.assignmentId === assignmentId);

export const isSameStudentExamContext = (
  left: Pick<StudentExamAttemptContext, 'studentId' | 'classId' | 'assignmentId'>,
  right: Pick<StudentExamAttemptContext, 'studentId' | 'classId' | 'assignmentId'>,
): boolean => left.studentId === right.studentId
  && left.classId === right.classId
  && left.assignmentId === right.assignmentId;

export const findResumableExamAttempt = (
  attempts: readonly StudentExamAttemptContext[],
  studentId: string,
  classId: string,
  assignmentId: string,
): StudentExamAttemptContext | undefined => attemptedBy(attempts, studentId, classId, assignmentId)
  .filter(attempt => attempt.status === 'in_progress')
  .sort((left, right) => String(right.updatedAt || right.startedAt || '').localeCompare(String(left.updatedAt || left.startedAt || '')))[0];

export const evaluateStudentExamStart = (input: StudentExamStartInput): StudentExamStartDecision => {
  const { link, assignment, exam, now } = input;
  if (!validId(link.studentId) || !validId(link.classId) || !validId(link.teacherId)) {
    return { allowed: false, reason: 'invalid_student_link' };
  }
  if (assignment.classId !== link.classId) return { allowed: false, reason: 'assignment_not_in_class' };
  if (assignment.type !== 'exam') return { allowed: false, reason: 'assignment_not_exam' };
  if (!assignment.examId || assignment.examId !== exam.id) return { allowed: false, reason: 'exam_not_linked' };
  if (!assignment.isOpen) return { allowed: false, reason: 'assignment_closed' };
  if (assignment.targetStudentIds && !assignment.targetStudentIds.includes(link.studentId)) {
    return { allowed: false, reason: 'student_not_targeted' };
  }
  if (!validId(exam.id)) return { allowed: false, reason: 'exam_not_found' };

  const nowMs = now.getTime();
  const startMs = time(exam.startAt);
  const endMs = time(exam.endAt);
  const dueMs = time(assignment.dueAt);
  if (!exam.isActive) return { allowed: false, reason: 'exam_ended' };
  if (startMs !== null && nowMs < startMs) return { allowed: false, reason: 'exam_not_started' };
  if (endMs !== null && nowMs > endMs) return { allowed: false, reason: 'exam_ended' };
  if (dueMs !== null && nowMs > dueMs) return { allowed: false, reason: 'assignment_due' };

  const ownAttempts = attemptedBy(input.attempts, link.studentId, link.classId, assignment.id);
  const maxAttempts = typeof exam.maxAttempts === 'number' && Number.isFinite(exam.maxAttempts)
    ? Math.max(1, Math.floor(exam.maxAttempts))
    : null;
  const finishedAttempts = ownAttempts.filter(attempt => attempt.status !== 'in_progress').length;
  if (maxAttempts !== null && finishedAttempts >= maxAttempts && !findResumableExamAttempt(ownAttempts, link.studentId, link.classId, assignment.id)) {
    return { allowed: false, reason: 'max_attempts_reached' };
  }
  return { allowed: true, reason: 'ok' };
};
