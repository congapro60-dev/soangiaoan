import type { AssignmentDoc, SubmissionDoc } from './types';

export type StudentAssignmentStatus = 'todo' | 'waiting' | 'pending-approval' | 'grading' | 'retry' | 'graded' | 'self-submitted';
export type StudentAssignmentAction = 'submit' | 'status' | 'retry' | 'review';

export interface StudentAssignmentState {
  status: StudentAssignmentStatus;
  action: StudentAssignmentAction;
  label: string;
  detail?: string;
  /**
   * true khi bài đã có lần nộp (đang chờ hoặc đã chấm) mà học sinh vẫn phải nộp lại được —
   * ví dụ nộp nhầm ảnh rồi nhận phản hồi yêu cầu chụp lại. Không set cho grading (đang xử
   * lý thì khoá) và không set cho bài tự nộp.
   */
  canResubmit?: boolean;
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

/**
 * Điểm của bài này đang bị giấu với học sinh (chưa được duyệt). Bài "Chấm thử" (không gắn bài giao, không tính điểm)
 * là để em tự xem đúng/sai nên không phải chờ duyệt.
 */
export const scoreHiddenFromStudent = (submission: Pick<SubmissionDoc, 'assignmentId' | 'grade'>): boolean =>
  Boolean(submission.grade) && (submission.grade?.scoreHidden === true || (submission.grade?.teacherApproved !== true && Boolean(submission.assignmentId)));

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
      // Máy còn hỏi lại em vài câu: chưa có điểm để xem, và nộp bổ sung lúc này sẽ chấm đè lên các câu em đang xác nhận.
      if (submission.grade?.awaitingClarification) {
        return {
          status: 'waiting',
          action: 'status',
          label: 'Cần em xác nhận',
          detail: 'Máy cần em xác nhận vài câu ở bảng phía trên trang.',
        };
      }
      // Máy hoặc thầy cô đã chấm nhưng CHƯA duyệt: em không đọc được điểm, nhận xét hay kết quả từng câu cho tới khi được duyệt.
      if (scoreHiddenFromStudent(submission)) {
        return {
          status: 'pending-approval',
          action: 'status',
          label: 'Chờ thầy cô duyệt',
          detail: 'Điểm và nhận xét sẽ hiện sau khi thầy cô duyệt.',
          canResubmit: true,
        };
      }
      return {
        status: 'graded',
        action: 'review',
        label: 'Xem nhận xét',
        canResubmit: true,
      };
    case 'grading':
      return {
        status: 'grading',
        action: 'status',
        label: 'Đang chấm',
      };
    case 'error':
      // Máy chưa đọc được mã đề: em chọn mã ghi trên tờ đề ngay trên thẻ bài, không phải nộp lại.
      if (submission.errorReason === 'exam_code') {
        return {
          status: 'waiting',
          action: 'status',
          label: 'Xem trạng thái',
          detail: submission.errorMessage,
        };
      }
      // Chỉ khi ẢNH chưa rõ mới bảo em nộp lại; lỗi hệ thống thì em không cần làm gì, thầy cô xử lý.
      if (submission.errorReason === 'photo') {
        return {
          status: 'retry',
          action: 'retry',
          label: 'Nộp lại ảnh',
          detail: submission.errorMessage,
        };
      }
      return {
        status: 'waiting',
        action: 'status',
        label: 'Xem trạng thái',
        detail: submission.errorMessage,
        canResubmit: true,
      };
    case 'submitted':
    default:
      return {
        status: 'waiting',
        action: 'status',
        label: 'Xem trạng thái',
        canResubmit: true,
      };
  }
};
