import { auth } from '../firebase';
import type { Exam, ExamQuestion, ExamSubmission } from '../../types';
import type {
  AssignmentDoc,
  ActivityExportBundle,
  ClassInvitationDoc,
  ClassMemberDoc,
} from './types';
import type { TeacherOnlineGradeEdit } from './onlineGradeLifecycle';

export interface CreateSupportActivityInput {
  classId: string;
  sourceReportId: string;
  purpose: 'practice' | 'remediation' | 'assignment' | 'assessment';
  title: string;
  objective: string;
  durationMinutes?: number;
  dueAt?: string;
  targetStudentIds?: string[];
  skillIds?: string[];
  questions: ExamQuestion[];
}

export interface TeacherAccessView {
  role: 'owner' | 'co_owner';
  isOwner: boolean;
  isOriginalOwner: boolean;
  originalOwnerId: string;
  canManageMembers: boolean;
}

export interface TeacherMembersResult {
  members: ClassMemberDoc[];
  invitations: ClassInvitationDoc[];
  access: TeacherAccessView;
}

export interface PendingTeacherInvitation extends ClassInvitationDoc {
  className?: string;
}

const callTeacherApi = async <T>(payload: Record<string, unknown>): Promise<T> => {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.isAnonymous) throw new Error('Cần đăng nhập bằng tài khoản giáo viên.');
  const idToken = await currentUser.getIdToken();
  const response = await fetch('/api/classroom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, idToken }),
  });
  const data = await response.json().catch(() => null) as { error?: unknown } | null;
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : `Máy chủ trả lỗi ${response.status}.`);
  return data as T;
};

export const listClassTeachers = async (classId: string): Promise<TeacherMembersResult> =>
  callTeacherApi<TeacherMembersResult>({ action: 'teacherMembers', classId });

export const listPendingTeacherInvitations = async (): Promise<PendingTeacherInvitation[]> => {
  const result = await callTeacherApi<{ invitations: PendingTeacherInvitation[] }>({ action: 'teacherInvitations' });
  return result.invitations || [];
};

export const inviteTeacher = async (
  classId: string,
  email: string,
  role: 'co_owner' | 'transfer_owner',
): Promise<ClassInvitationDoc> => {
  const result = await callTeacherApi<{ invitation: ClassInvitationDoc }>({ action: 'inviteTeacher', classId, email, role });
  return result.invitation;
};

export const acceptTeacherInvitation = async (invitationId: string): Promise<{ classId: string; role: 'owner' | 'co_owner' }> =>
  callTeacherApi({ action: 'acceptTeacherInvitation', invitationId });

export const declineTeacherInvitation = async (invitationId: string): Promise<void> => {
  await callTeacherApi({ action: 'declineTeacherInvitation', invitationId });
};

export const leaveClass = async (classId: string): Promise<void> => {
  await callTeacherApi({ action: 'leaveClass', classId });
};

export const removeTeacher = async (classId: string, targetUid: string): Promise<void> => {
  await callTeacherApi({ action: 'removeTeacher', classId, targetUid });
};

export const renameClass = async (classId: string, name: string, track?: string): Promise<void> => {
  await callTeacherApi({ action: 'renameClass', classId, name, ...(track === undefined ? {} : { track }) });
};

export const renameStudent = async (classId: string, studentId: string, name: string): Promise<void> => {
  await callTeacherApi({ action: 'renameStudent', classId, studentId, name });
};

export const renameAssignment = async (assignmentId: string, title: string): Promise<void> => {
  await callTeacherApi({ action: 'renameAssignment', assignmentId, title });
};

export const createExamAssignment = async (input: {
  classId: string;
  examId: string;
  title: string;
  dueAt?: string;
  maxScore?: number;
}): Promise<AssignmentDoc> => {
  const result = await callTeacherApi<{ assignment: AssignmentDoc }>({ action: 'createExamAssignment', ...input });
  return result.assignment;
};

export const createSupportActivity = async (
  input: CreateSupportActivityInput,
): Promise<{ exam: Exam; assignment: AssignmentDoc }> => {
  const result = await callTeacherApi<{ exam: Exam; assignment: AssignmentDoc }>({
    action: 'createSupportActivity',
    ...input,
  });
  return result;
};

export const updateActivityExportBundle = async (
  assignmentId: string,
  examId: string,
  bundle: ActivityExportBundle,
  classId?: string,
): Promise<void> => {
  await callTeacherApi({
    action: 'updateActivityExportBundle',
    assignmentId,
    examId,
    ...(classId ? { classId } : {}),
    bundle,
  });
};

export const listAccessibleExams = async (classId: string): Promise<Exam[]> => {
  const result = await callTeacherApi<{ exams: Exam[] }>({ action: 'teacherExams', classId });
  return result.exams || [];
};

export const getAccessibleExam = async (classId: string, examId: string): Promise<Exam> => {
  const result = await callTeacherApi<{ exam: Exam }>({ action: 'teacherExam', classId, examId });
  return result.exam;
};

export const listAccessibleExamSubmissions = async (classId: string, examId: string): Promise<ExamSubmission[]> => {
  const result = await callTeacherApi<{ submissions: ExamSubmission[] }>({ action: 'teacherExamSubmissions', classId, examId });
  return result.submissions || [];
};

export const listOnlineAssignmentSubmissions = async (classId: string, assignmentId: string): Promise<ExamSubmission[]> => {
  const result = await callTeacherApi<{ submissions: ExamSubmission[] }>({ action: 'teacherOnlineSubmissions', classId, assignmentId });
  return result.submissions || [];
};

export const saveOnlineGrade = async (
  attemptId: string,
  edit: TeacherOnlineGradeEdit,
  classId?: string,
): Promise<ExamSubmission> => {
  const result = await callTeacherApi<{ attempt: ExamSubmission }>({
    action: 'teacherOnlineSaveGrade',
    attemptId,
    ...(classId ? { classId } : {}),
    edit,
  });
  return result.attempt;
};

export const approveOnlineGrade = async (attemptId: string, classId?: string): Promise<ExamSubmission> => {
  const result = await callTeacherApi<{ attempt: ExamSubmission }>({
    action: 'teacherOnlineApproveGrade',
    attemptId,
    ...(classId ? { classId } : {}),
  });
  return result.attempt;
};

export const deleteOnlineGrade = async (attemptId: string, classId?: string): Promise<ExamSubmission> => {
  const result = await callTeacherApi<{ attempt: ExamSubmission }>({
    action: 'teacherOnlineDeleteGrade',
    attemptId,
    ...(classId ? { classId } : {}),
  });
  return result.attempt;
};

export const regradeOnlineGrade = async (attemptId: string, classId?: string): Promise<ExamSubmission> => {
  const result = await callTeacherApi<{ attempt: ExamSubmission }>({
    action: 'teacherOnlineAiRegrade',
    attemptId,
    ...(classId ? { classId } : {}),
  });
  return result.attempt;
};

export const autoGradeOnline = async (attemptId: string, classId?: string): Promise<ExamSubmission> => {
  const result = await callTeacherApi<{ attempt: ExamSubmission }>({
    action: 'teacherOnlineAutoGrade',
    attemptId,
    ...(classId ? { classId } : {}),
  });
  return result.attempt;
};
