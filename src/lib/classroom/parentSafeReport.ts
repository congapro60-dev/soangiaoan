import type { AssignmentDoc, StudentProfileDoc, SubmissionDoc } from './types';

export type ParentSafeAssignmentStatus = 'official' | 'pending' | 'grading' | 'error' | 'not_submitted';
export type ParentSafeTrend = 'up' | 'flat' | 'down' | 'not_enough_data';

export interface ParentSafeAssignmentInput {
  id: string;
  title: string;
  maxScore?: number | null;
  dueAt?: string;
}

export interface ParentSafeReportInput {
  studentId: string;
  studentName: string;
  className: string;
  assignments?: readonly ParentSafeAssignmentInput[];
  submissions: readonly SubmissionDoc[];
  profile?: StudentProfileDoc | null;
}

export interface ParentSafeAssignmentResult {
  assignmentId: string;
  title: string;
  status: ParentSafeAssignmentStatus;
  submittedAt?: string;
  score: number | null;
  maxScore: number | null;
  feedback?: string;
}

export interface ParentSafeReport {
  studentId: string;
  studentName: string;
  className: string;
  results: ParentSafeAssignmentResult[];
  officialCount: number;
  officialAveragePercent: number | null;
  pendingCount: number;
  missingCount: number;
  strengths: string[];
  areasToPractice: string[];
  progress: {
    trend: ParentSafeTrend;
    firstPercent: number | null;
    latestPercent: number | null;
  };
  nextSteps: string[];
}

const timestamp = (value: unknown): number => {
  const parsed = Date.parse(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const newestFirst = (left: SubmissionDoc, right: SubmissionDoc): number => (
  timestamp(right.createdAt) - timestamp(left.createdAt)
  || String(right.createdAt || '').localeCompare(String(left.createdAt || ''))
  || right.id.localeCompare(left.id)
);

const normalizedText = (value: unknown): string => (
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
);

const uniqueText = (values: readonly unknown[]): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const text = normalizedText(value);
    const key = text.toLocaleLowerCase('vi-VN');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(text);
  }
  return output;
};

const validScorePair = (submission: SubmissionDoc): { score: number; maxScore: number } | null => {
  const grade = submission.grade;
  if (submission.status !== 'graded' || grade?.teacherApproved !== true) return null;
  const score = typeof grade.score === 'number' && Number.isFinite(grade.score) ? grade.score : null;
  const maxScore = typeof grade.maxScore === 'number' && Number.isFinite(grade.maxScore) ? grade.maxScore : null;
  if (score === null || maxScore === null || maxScore <= 0 || score < 0 || score > maxScore) return null;
  return { score, maxScore };
};

const safeStatus = (submission: SubmissionDoc | undefined): ParentSafeAssignmentStatus => {
  if (!submission) return 'not_submitted';
  if (validScorePair(submission)) return 'official';
  if (submission.status === 'grading') return 'grading';
  if (submission.status === 'error') return 'error';
  return 'pending';
};

const titleFor = (assignment: ParentSafeAssignmentInput | undefined, submission: SubmissionDoc): string => (
  normalizedText(assignment?.title) || (submission.assignmentId ? `Bài tập ${submission.assignmentId}` : 'Bài tự nộp')
);

const resultFromSubmission = (
  assignment: ParentSafeAssignmentInput | undefined,
  submission: SubmissionDoc,
): ParentSafeAssignmentResult => {
  const pair = validScorePair(submission);
  const grade = submission.grade;
  const official = pair !== null;
  return {
    assignmentId: assignment?.id || submission.assignmentId || `self:${submission.id}`,
    title: titleFor(assignment, submission),
    status: safeStatus(submission),
    submittedAt: submission.createdAt,
    score: official ? pair.score : null,
    maxScore: official ? pair.maxScore : null,
    ...(official && normalizedText(grade?.feedback) ? { feedback: normalizedText(grade?.feedback) } : {}),
  };
};

/**
 * Nhãn tham chiếu SỐ BÀI/CÂU cụ thể ("Bài 2", "Câu 4a", "phần 2") — vô nghĩa với phụ huynh vì
 * họ không cầm đề. Một số chủ đề trong hồ sơ lại bị đặt tên từ nhận xét theo bài của AI, nên chặn
 * ở đây để bản phụ huynh chỉ còn chủ đề CHUNG, dù dữ liệu hồ sơ có lẫn.
 */
const namesSpecificProblem = (topic: string): boolean => /\b(bài|câu|phần|ý)\s*\d/iu.test(topic);

const profileTopics = (profile: StudentProfileDoc | null | undefined, level: 'solid' | 'weak' | 'developing'): string[] => (
  (profile?.topics || [])
    .filter(topic => topic.level === level && topic.evidenceSubmissionIds.length > 0 && !namesSpecificProblem(topic.topic))
    .map(topic => topic.topic)
);

const trendOf = (percents: readonly number[]): { trend: ParentSafeTrend; firstPercent: number | null; latestPercent: number | null } => {
  if (percents.length < 2) return { trend: 'not_enough_data', firstPercent: percents[0] ?? null, latestPercent: percents.at(-1) ?? null };
  const firstPercent = percents[0];
  const latestPercent = percents[percents.length - 1];
  const difference = latestPercent - firstPercent;
  return {
    trend: difference >= 5 ? 'up' : difference <= -5 ? 'down' : 'flat',
    firstPercent,
    latestPercent,
  };
};

const buildNextSteps = (
  areasToPractice: readonly string[],
  pendingCount: number,
  missingCount: number,
): string[] => {
  const steps = areasToPractice.slice(0, 3).map(topic => `Luyện thêm “${topic}” bằng một nhiệm vụ ngắn và kiểm tra lại ở bài tiếp theo.`);
  if (pendingCount > 0) steps.push(`Chờ thầy cô hoàn tất ${pendingCount} bài đang được xử lý hoặc duyệt.`);
  if (missingCount > 0) steps.push(`Hoàn thành ${missingCount} bài chưa nộp theo danh sách bài được giao.`);
  if (steps.length === 0) steps.push('Tiếp tục duy trì việc làm bài và tự kiểm tra cách trình bày ở bài tiếp theo.');
  return steps;
};

export const buildParentSafeReport = (input: ParentSafeReportInput): ParentSafeReport => {
  const assignments = [...(input.assignments || [])];
  const assignmentById = new Map(assignments.map(assignment => [assignment.id, assignment]));
  const latestByAssignment = new Map<string, SubmissionDoc>();

  for (const submission of [...input.submissions].sort(newestFirst)) {
    if (submission.studentId !== input.studentId) continue;
    const key = submission.assignmentId || `self:${submission.id}`;
    if (!latestByAssignment.has(key)) latestByAssignment.set(key, submission);
  }

  const results: ParentSafeAssignmentResult[] = assignments.map(assignment => {
    const submission = latestByAssignment.get(assignment.id);
    return submission
      ? resultFromSubmission(assignment, submission)
      : {
        assignmentId: assignment.id,
        title: assignment.title,
        status: 'not_submitted' as const,
        score: null,
        maxScore: null,
      };
  });

  for (const [key, submission] of latestByAssignment) {
    if (key.startsWith('self:') || !assignmentById.has(key)) results.push(resultFromSubmission(assignmentById.get(key), submission));
  }
  results.sort((left, right) => timestamp(right.submittedAt) - timestamp(left.submittedAt) || left.title.localeCompare(right.title, 'vi'));

  const officialResults = results.filter(result => result.status === 'official' && result.score !== null && result.maxScore !== null && result.maxScore > 0);
  const percents = officialResults
    .sort((left, right) => timestamp(left.submittedAt) - timestamp(right.submittedAt))
    .map(result => (result.score! / result.maxScore!) * 100);
  // Bản phụ huynh chỉ nói CHUNG theo chủ đề/năng lực Toán (chủ đề tích luỹ trong hồ sơ), KHÔNG
  // bê nhận xét theo từng bài ("Bài 2a thiếu…") vì phụ huynh không cầm đề, đọc vào không hiểu.
  // Nhận xét theo bài của AI (`grade.strengths`/`grade.weaknesses`) chỉ dành cho bản giáo viên.
  const profileStrengths = profileTopics(input.profile, 'solid');
  const profileWeaknesses = [...profileTopics(input.profile, 'weak'), ...profileTopics(input.profile, 'developing')];
  const strengths = uniqueText(profileStrengths);
  const areasToPractice = uniqueText(profileWeaknesses);
  const pendingCount = results.filter(result => ['pending', 'grading', 'error'].includes(result.status)).length;
  const officialAveragePercent = percents.length > 0 ? percents.reduce((sum, value) => sum + value, 0) / percents.length : null;

  return {
    studentId: input.studentId,
    studentName: normalizedText(input.studentName),
    className: normalizedText(input.className),
    results,
    officialCount: officialResults.length,
    officialAveragePercent,
    pendingCount,
    missingCount: results.filter(result => result.status === 'not_submitted').length,
    strengths,
    areasToPractice,
    progress: trendOf(percents),
    nextSteps: buildNextSteps(areasToPractice, pendingCount, results.filter(result => result.status === 'not_submitted').length),
  };
};

export type ParentSafeAssignmentDefinition = Pick<AssignmentDoc, 'id' | 'title' | 'maxScore' | 'dueAt'>;
