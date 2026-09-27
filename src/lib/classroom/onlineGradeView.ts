import type { ExamSubmission } from '../../types.js';

export interface OnlineAttemptStatusView {
  label: string;
  className: string;
  canGrade: boolean;
  canApprove: boolean;
  canDeleteGrade: boolean;
}

export const onlineAttemptStatus = (attempt: Pick<ExamSubmission, 'status' | 'gradeState' | 'gradingSource' | 'grade'>): OnlineAttemptStatusView => {
  if (attempt.status === 'in_progress') {
    return { label: 'Đang làm', className: 'bg-blue-50 text-blue-700', canGrade: false, canApprove: false, canDeleteGrade: false };
  }
  if (attempt.gradeState === 'official' || attempt.grade?.teacherApproved === true) {
    return { label: 'Đã duyệt', className: 'bg-emerald-50 text-emerald-700', canGrade: true, canApprove: false, canDeleteGrade: true };
  }
  if (attempt.gradeState === 'provisional' || attempt.gradingSource === 'ai') {
    return { label: 'Điểm AI tạm', className: 'bg-violet-50 text-violet-700', canGrade: true, canApprove: true, canDeleteGrade: true };
  }
  if (attempt.gradeState === 'pending_teacher_review' || attempt.grade) {
    return { label: 'Chờ GV duyệt', className: 'bg-amber-50 text-amber-700', canGrade: true, canApprove: true, canDeleteGrade: true };
  }
  return { label: 'Chờ chấm', className: 'bg-slate-100 text-slate-600', canGrade: true, canApprove: false, canDeleteGrade: false };
};
