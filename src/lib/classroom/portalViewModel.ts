import type { AssignmentDoc, SubmissionDoc } from './types';

export type StudentAssignmentStatus = 'todo' | 'waiting' | 'grading' | 'retry' | 'graded' | 'self-submitted';
export type StudentAssignmentAction = 'submit' | 'status' | 'retry' | 'review';

export interface StudentAssignmentState {
  status: StudentAssignmentStatus;
  action: StudentAssignmentAction;
  label: string;
  detail?: string;
}

const compareCreatedAt = (left: string, right: string): number => {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  const leftValid = Number.isFinite(leftTime);
  const rightValid = Number.isFinite(rightTime);

  if (leftValid && rightValid) return leftTime - rightTime;
  if (leftValid) return 1;
  if (rightValid) return -1;
  return left.localeCompare(right);
};

/**
 * Lấy đúng lần nộp hiện tại của từng bài được giao.
 * Bài tự nộp có assignmentId = null nên không được trộn vào danh sách bài giao.
 */
export const latestSubmissionByAssignment = (
  submissions: readonly SubmissionDoc[],
): Map<string, SubmissionDoc> => {
  const latest = new Map<string, SubmissionDoc>();
  for (const submission of submissions) {
    if (!submission.assignmentId) continue;
    const current = latest.get(submission.assignmentId);
    if (!current || compareCreatedAt(submission.createdAt, current.createdAt) > 0) {
      latest.set(submission.assignmentId, submission);
    }
  }
  return latest;
};

export const getStudentAssignmentState = (
  assignment: AssignmentDoc | undefined,
  submission?: SubmissionDoc,
): StudentAssignmentState => {
  if (!assignment) {
    return {
      status: 'self-submitted',
      action: 'review',
      label: 'Xem trạng thái',
    };
  }

  if (!submission) {
    return {
      status: 'todo',
      action: 'submit',
      label: 'Nộp ảnh',
    };
  }

  switch (submission.status) {
    case 'graded':
      return {
        status: 'graded',
        action: 'review',
        label: 'Xem nhận xét',
      };
    case 'grading':
      return {
        status: 'grading',
        action: 'status',
        label: 'Đang chấm',
      };
    case 'error':
      return {
        status: 'retry',
        action: 'retry',
        label: 'Nộp lại',
        detail: submission.errorMessage,
      };
    case 'submitted':
    default:
      return {
        status: 'waiting',
        action: 'status',
        label: 'Xem trạng thái',
      };
  }
};
