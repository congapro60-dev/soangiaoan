/**
 * TỰ CHẤM + TỰ DUYỆT SAU 60 PHÚT — thuần, dùng chung máy chủ + giao diện.
 *
 * Chủ dự án chốt (2026-09-25): bài học sinh nộp mà sau 60 phút giáo viên chưa chấm thì AI tự chấm;
 * bài đã chấm mà sau 60 phút chưa duyệt thì tự duyệt. Áp dụng mọi lớp, giáo viên TẮT được cho lớp
 * mình. Bài máy đọc chưa chắc KHÔNG tự duyệt — giữ lại cho giáo viên xem.
 */
import type { SubmissionDoc } from './types.js';
import { currentSubmissionsForAssignment, hasUncertainRead, isStaleGradingTimestamp } from './submissionSelection.js';

export const AUTO_GRADE_AFTER_MS = 60 * 60 * 1000;

/** Trường trên `classes/{classId}`: `false` = giáo viên đã tắt; vắng = bật (mặc định). */
export const AUTO_GRADE_CLASS_FIELD = 'autoGradeAfterHour';

export const autoGradeEnabledFor = (classData: Record<string, unknown> | undefined): boolean =>
  classData?.[AUTO_GRADE_CLASS_FIELD] !== false;

const timeOf = (value?: string): number => {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const olderThanWindow = (value: string | undefined, nowMs: number): boolean => {
  const at = timeOf(value);
  return Number.isFinite(at) && nowMs - at >= AUTO_GRADE_AFTER_MS;
};

export interface AutoSweepPlan {
  /** Chờ chấm quá 60 phút tính từ lúc nộp (kể cả khoá chấm đã chết). Bài lỗi để giáo viên xử lý. */
  toGrade: SubmissionDoc[];
  /** Đã chấm, chưa duyệt, quá 60 phút tính từ lúc chấm, máy đọc chắc chắn. */
  toApprove: SubmissionDoc[];
}

/**
 * Việc cần làm của một lượt quét trên các bài nộp của MỘT bài giao — chỉ lượt nộp mới nhất của mỗi em,
 * để không chấm/duyệt lại lượt cũ đã bị lượt mới thay.
 */
export const planAutoSweep = (submissions: readonly SubmissionDoc[], nowMs = Date.now()): AutoSweepPlan => {
  const current = currentSubmissionsForAssignment(submissions);
  return {
    toGrade: current.filter(submission =>
      (submission.status === 'submitted' || (submission.status === 'grading' && isStaleGradingTimestamp(submission.updatedAt, nowMs)))
      && olderThanWindow(submission.createdAt, nowMs)),
    toApprove: current.filter(submission =>
      submission.status === 'graded'
      && Boolean(submission.grade)
      && submission.grade?.teacherApproved !== true
      && !hasUncertainRead(submission.grade)
      && olderThanWindow(submission.grade?.gradedAt || submission.updatedAt, nowMs)),
  };
};

/** Bài vừa được máy tự chấm xong: duyệt luôn nếu máy đọc chắc chắn. */
export const canAutoApproveFreshGrade = (submission: SubmissionDoc): boolean =>
  submission.status === 'graded'
  && Boolean(submission.grade)
  && submission.grade?.teacherApproved !== true
  && !hasUncertainRead(submission.grade);
