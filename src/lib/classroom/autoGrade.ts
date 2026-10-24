/**
 * TỰ CHẤM + TỰ DUYỆT SAU 60 PHÚT — thuần, dùng chung máy chủ + giao diện.
 *
 * Chính sách chủ dự án (2026-10-24) thay chính sách giữ lại bài nghi ngờ của 2026-09-25:
 * bài học sinh nộp mà sau 60 phút giáo viên chưa chấm thì AI tự chấm; bài đã chấm mà sau 60 phút
 * chưa duyệt thì tự duyệt — KỂ CẢ bài máy đọc chưa chắc hoặc lệch điểm sổ (bài kiểm tra định kì).
 * Bài cần soát được duyệt kèm cờ ("Đọc chưa rõ" / "Lệch điểm GV") ở dòng bài để giáo viên
 * chấm lại; sau khi thầy sửa tay (editedByTeacher) thì cờ tự tắt. Áp dụng mọi lớp, giáo viên
 * TẮT được cho lớp mình.
 */
import type { SubmissionDoc } from './types.js';
import { currentSubmissionsForAssignment, isStaleGradingTimestamp } from './submissionSelection.js';

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
  /** Đã chấm, chưa duyệt, quá 60 phút tính từ lúc chấm. */
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
      && olderThanWindow(submission.grade?.gradedAt || submission.updatedAt, nowMs)),
  };
};

/** Bài vừa được máy tự chấm xong: duyệt luôn (bài đọc chưa chắc thì cờ nhắc thầy ở dòng bài). */
export const canAutoApproveFreshGrade = (submission: SubmissionDoc): boolean =>
  submission.status === 'graded'
  && Boolean(submission.grade)
  && submission.grade?.teacherApproved !== true;
