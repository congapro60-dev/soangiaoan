import type { SubmissionDoc } from './types';

const timestamp = (value?: string): number => {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const newestFirst = (left: SubmissionDoc, right: SubmissionDoc): number =>
  timestamp(right.createdAt) - timestamp(left.createdAt)
  || String(right.createdAt || '').localeCompare(String(left.createdAt || ''))
  || right.id.localeCompare(left.id);

/**
 * Mô hình báo cáo dùng chung cho giáo viên/phụ huynh.
 *
 * Một học sinh có thể có nhiều attempt cho cùng bài. Báo cáo hiện hành chỉ lấy attempt mới nhất;
 * nếu không, em nộp lại sẽ bị tính hai lần và điểm trung bình trở nên sai. Bài tự nộp không có
 * assignmentId nên mỗi lượt là một bằng chứng độc lập.
 */
export interface StudentReportModel {
  currentSubmissions: SubmissionDoc[];
  gradedSubmissions: SubmissionDoc[];
  approvedSubmissions: SubmissionDoc[];
  pendingApprovalSubmissions: SubmissionDoc[];
  averagePercent: number | null;
}

export const buildStudentReportModel = (submissions: readonly SubmissionDoc[]): StudentReportModel => {
  const latestAssigned = new Map<string, SubmissionDoc>();

  for (const submission of submissions) {
    if (!submission.assignmentId) continue;
    const current = latestAssigned.get(submission.assignmentId);
    if (!current || newestFirst(submission, current) < 0) latestAssigned.set(submission.assignmentId, submission);
  }

  const selfSubmitted = submissions.filter(submission => !submission.assignmentId);
  const currentSubmissions = [...latestAssigned.values(), ...selfSubmitted].sort(newestFirst);
  const gradedSubmissions = currentSubmissions.filter(submission => submission.status === 'graded' && submission.grade);
  const approvedSubmissions = gradedSubmissions.filter(submission => submission.grade?.teacherApproved === true);
  const pendingApprovalSubmissions = gradedSubmissions.filter(submission => submission.grade?.teacherApproved !== true);
  const percentages = approvedSubmissions
    .map(submission => {
      const score = Number(submission.grade?.score);
      const maxScore = Number(submission.grade?.maxScore);
      return Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0
        ? (Math.min(Math.max(score, 0), maxScore) / maxScore) * 100
        : null;
    })
    .filter((value): value is number => value !== null);

  return {
    currentSubmissions,
    gradedSubmissions,
    approvedSubmissions,
    pendingApprovalSubmissions,
    averagePercent: percentages.length > 0
      ? percentages.reduce((sum, value) => sum + value, 0) / percentages.length
      : null,
  };
};
