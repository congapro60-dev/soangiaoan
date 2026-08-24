import type { SubmissionDoc } from './types';

const createdAtValue = (value?: string): number => {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const newestFirst = (left: SubmissionDoc, right: SubmissionDoc): number =>
  createdAtValue(right.createdAt) - createdAtValue(left.createdAt)
  || String(right.createdAt || '').localeCompare(String(left.createdAt || ''))
  || right.id.localeCompare(left.id);

/** Lấy đúng một lượt mới nhất của mỗi học sinh trong một bài giao. */
export const currentSubmissionsForAssignment = (submissions: readonly SubmissionDoc[]): SubmissionDoc[] => {
  const latest = new Map<string, SubmissionDoc>();
  for (const submission of submissions) {
    if (!submission.assignmentId) continue;
    const current = latest.get(submission.studentId);
    if (!current || newestFirst(submission, current) < 0) latest.set(submission.studentId, submission);
  }

  return [...latest.values()].sort((left, right) =>
    left.studentId.localeCompare(right.studentId, 'vi') || newestFirst(left, right));
};

/** Chỉ trả các lượt hiện hành có id được chọn; lượt lịch sử cũ bị loại khỏi bulk action. */
export const selectedCurrentSubmissions = (
  submissions: readonly SubmissionDoc[],
  selectedIds: ReadonlySet<string>,
): SubmissionDoc[] => currentSubmissionsForAssignment(submissions)
  .filter(submission => selectedIds.has(submission.id));

export interface SelectionSummary {
  total: number;
  pending: number;
  graded: number;
  unapproved: number;
}

export const summarizeSelection = (submissions: readonly SubmissionDoc[]): SelectionSummary => ({
  total: submissions.length,
  pending: submissions.filter(submission => submission.status === 'submitted' || submission.status === 'error').length,
  graded: submissions.filter(submission => submission.status === 'graded' && Boolean(submission.grade)).length,
  unapproved: submissions.filter(submission => Boolean(submission.grade) && submission.grade?.teacherApproved !== true).length,
});
