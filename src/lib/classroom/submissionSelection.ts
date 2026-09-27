import type { SubmissionDoc, SubmissionGrade } from './types.js';

/** Dưới ngưỡng này coi là máy đọc chữ chưa chắc, nên nhắc giáo viên soát lại. */
export const READ_CONFIDENCE_FLOOR = 0.6;

/**
 * Khóa grading cũ hơn ngần này là worker đã chết giữa chừng. Phải khớp `STALE_GRADING_MS` bên
 * `api/grade-homework.ts`: máy chủ giết hàm chấm ở 60s nên không worker lành nào giữ khoá lâu hơn.
 */
export const STALE_GRADING_MS = 2 * 60 * 1000;

export const isStaleGradingTimestamp = (updatedAt?: string, nowMs = Date.now()): boolean => {
  const timestamp = Date.parse(String(updatedAt || ''));
  return !Number.isFinite(timestamp) || nowMs - timestamp > STALE_GRADING_MS;
};

/**
 * Bài có thể đưa vào một lượt chấm AI hay không.
 *
 * Gồm cả bài mang nhãn "Đang chấm" mà khoá đã chết: bỏ sót nhóm này thì nút "Chấm AI" đếm ra 0
 * trong khi cả chục bài treo trên màn hình, và giáo viên không còn đường nào gỡ.
 */
export const isGradableNow = (submission: SubmissionDoc, nowMs = Date.now()): boolean =>
  submission.status === 'submitted'
  || submission.status === 'error'
  || (submission.status === 'grading' && isStaleGradingTimestamp(submission.updatedAt, nowMs));

/**
 * Máy đọc bài "chưa chắc": có câu không đọc rõ, có câu tự đánh dấu cần giáo viên soát, hoặc độ
 * chắc chắn đọc chữ thấp. Dùng để hiện nhãn nhắc GV mở ra kiểm — bắt lỗi AI đọc nhầm công thức.
 */
export const hasUncertainRead = (grade?: SubmissionGrade): boolean => {
  const results = grade?.questionResults;
  if (!Array.isArray(results)) return false;
  return results.some(question =>
    question?.status === 'unreadable'
    || question?.needsTeacherReview === true
    || (typeof question?.confidence === 'number' && question.confidence < READ_CONFIDENCE_FLOOR));
};

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

export type SubmissionHistoryMode = 'latest' | 'all';

/** Chọn projection hiển thị: lượt hiện hành mặc định hoặc toàn bộ lịch sử để đối chiếu. */
export const submissionsForHistoryMode = (
  submissions: readonly SubmissionDoc[],
  mode: SubmissionHistoryMode,
): SubmissionDoc[] => mode === 'latest'
  ? currentSubmissionsForAssignment(submissions)
  : [...submissions];

/** Chỉ trả các lượt hiện hành có id được chọn; lượt lịch sử cũ bị loại khỏi bulk action. */
export const selectedCurrentSubmissions = (
  submissions: readonly SubmissionDoc[],
  selectedIds: ReadonlySet<string>,
): SubmissionDoc[] => currentSubmissionsForAssignment(submissions)
  .filter(submission => selectedIds.has(submission.id));

/** Trả mọi lượt nộp có id được chọn; dùng cho thao tác xóa có chủ đích của giáo viên. */
export const selectedSubmissionsForAssignment = (
  submissions: readonly SubmissionDoc[],
  selectedIds: ReadonlySet<string>,
): SubmissionDoc[] => submissions.filter(submission => selectedIds.has(submission.id));

export interface SelectionSummary {
  total: number;
  pending: number;
  graded: number;
  unapproved: number;
  /**
   * Bài ĐÃ chấm mà chấm lại AI được: bỏ đúng bài giáo viên đã sửa tay (`editedByTeacher`) để
   * chấm lại loạt sau khi đổi đáp án KHÔNG đè lên chỉnh sửa của giáo viên. Bài đã sửa tay muốn
   * chấm lại vẫn làm được qua nút "Chấm lại bằng AI" của từng em (hành động có chủ đích).
   */
  regradable: number;
}

export const summarizeSelection = (submissions: readonly SubmissionDoc[]): SelectionSummary => ({
  total: submissions.length,
  pending: submissions.filter(submission => isGradableNow(submission)).length,
  graded: submissions.filter(submission => submission.status === 'graded' && Boolean(submission.grade)).length,
  // Bài đang bị worker giữ khóa không được đưa vào bulk duyệt; dữ liệu UI có thể
  // cũ hơn server một nhịp và endpoint duyệt cũ là client-side.
  unapproved: submissions.filter(submission => submission.status === 'graded'
    && Boolean(submission.grade)
    && submission.grade?.teacherApproved !== true).length,
  regradable: submissions.filter(submission => submission.status === 'graded'
    && Boolean(submission.grade)
    && submission.grade?.editedByTeacher !== true).length,
});

export interface ClassBacklog {
  /** Lượt mới nhất chưa chấm (chờ chấm / khoá chấm đã chết). */
  toGrade: SubmissionDoc[];
  /** Lượt mới nhất máy chấm lỗi (ảnh mờ, không đọc được…) — tách riêng để giáo viên thấy lý do. */
  errored: SubmissionDoc[];
  /** Đã chấm, chưa duyệt, máy đọc chắc chắn — duyệt loạt được. */
  toApprove: SubmissionDoc[];
  /** Đã chấm, chưa duyệt nhưng máy đọc chưa chắc — mặc định giữ lại cho giáo viên xem. */
  uncertain: SubmissionDoc[];
  /** Số bài giao đang có việc tồn. */
  assignmentCount: number;
}

/**
 * Việc tồn của CẢ LỚP qua mọi bài giao (kể cả bài cũ học sinh nộp muộn), chỉ tính lượt nộp
 * mới nhất của mỗi em — để giáo viên chấm + duyệt một lần thay vì dò từng bài.
 */
export const classBacklog = (
  submissions: readonly SubmissionDoc[],
  assignmentIds: ReadonlySet<string>,
  nowMs = Date.now(),
): ClassBacklog => {
  const byAssignment = new Map<string, SubmissionDoc[]>();
  for (const submission of submissions) {
    if (!submission.assignmentId || !assignmentIds.has(submission.assignmentId)) continue;
    byAssignment.set(submission.assignmentId, [...(byAssignment.get(submission.assignmentId) ?? []), submission]);
  }
  const current = [...byAssignment.values()].flatMap(list => currentSubmissionsForAssignment(list));
  const errored = current.filter(submission => submission.status === 'error');
  const toGrade = current.filter(submission => submission.status !== 'error' && isGradableNow(submission, nowMs));
  const waiting = current.filter(submission => submission.status === 'graded'
    && Boolean(submission.grade)
    && submission.grade?.teacherApproved !== true);
  return {
    toGrade,
    errored,
    toApprove: waiting.filter(submission => !hasUncertainRead(submission.grade)),
    uncertain: waiting.filter(submission => hasUncertainRead(submission.grade)),
    assignmentCount: new Set([...toGrade, ...errored, ...waiting].map(submission => submission.assignmentId)).size,
  };
};
