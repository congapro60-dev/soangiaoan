import { auth } from '../firebase';
import type { Exam, ExamQuestion, ExamSubmission } from '../../types';
import type {
  AssignmentDoc,
  ActivityExportBundle,
  ClassInvitationDoc,
  ClassMemberDoc,
} from './types';
import type { TeacherOnlineGradeEdit } from './onlineGradeLifecycle';
import type { StudentExamScores } from './examScores';
import { normalizeScoreBook, type Hs1Weight, type ScoreBookDoc } from './scoreBook';
import { normalizePortfolio, type CompetencyPortfolioDoc, type PortfolioEntry } from './competency/studentPortfolio';
import type { ParentRequirementLine } from './parentRequirements';
import type { ReportOverrides } from './reportOverrides';
import type { ParentActivityEvent, ParentActivityRow, PublishedParentGroup } from './parentAccess';

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

export interface ClassSheetSyncInput {
  spreadsheetId: string;
  spreadsheetTitle: string;
  sheetId: number;
  sheetTitle: string;
}

/** Lưu tab Google Sheet đã nối cho lớp; truyền null để bỏ nối. */
export const setClassSheetSync = async (classId: string, sheetSync: ClassSheetSyncInput | null): Promise<void> => {
  await callTeacherApi({ action: 'setClassSheetSync', classId, sheetSync });
};

/** Lưu file điểm thi (tab MOET/TDS) của lớp; truyền null để bỏ nối. */
export const setClassExamSheet = async (
  classId: string,
  examSheet: { spreadsheetId: string; spreadsheetTitle: string } | null,
): Promise<void> => {
  await callTeacherApi({ action: 'setClassExamSheet', classId, examSheet });
};

export const loadScoreBook = async (classId: string): Promise<ScoreBookDoc> => {
  const { scoreBook } = await callTeacherApi<{ scoreBook: unknown }>({ action: 'teacherScoreBook', classId });
  return normalizeScoreBook(classId, scoreBook);
};

/** Tạo (không truyền columnId) hoặc sửa một cột điểm hệ số 1. `scores`: studentId → điểm gõ, '' = xoá. */
export const saveHs1Column = async (
  classId: string,
  columnId: string | null,
  column: { label: string; date: string; weight?: Hs1Weight },
  scores: Record<string, string>,
): Promise<ScoreBookDoc> => {
  const { scoreBook } = await callTeacherApi<{ scoreBook: unknown }>({ action: 'saveHs1Column', classId, columnId, column, scores });
  return normalizeScoreBook(classId, scoreBook);
};

/** Đưa các bài giao lên sổ thành cột liên kết sống; bài đã có cột thì chỉ đổi hệ số. */
export const linkAssignmentColumns = async (
  classId: string,
  items: Array<{ assignmentId: string; weight: Hs1Weight }>,
): Promise<ScoreBookDoc> => {
  const { scoreBook } = await callTeacherApi<{ scoreBook: unknown }>({ action: 'linkAssignments', classId, items });
  return normalizeScoreBook(classId, scoreBook);
};

/** Chọn hệ số cho các mốc thi MOET (mốc vắng trong `weights` = không tính vào điểm trung bình). */
export const saveExamWeights = async (classId: string, weights: Record<string, Hs1Weight>): Promise<ScoreBookDoc> => {
  const { scoreBook } = await callTeacherApi<{ scoreBook: unknown }>({ action: 'setExamWeights', classId, weights });
  return normalizeScoreBook(classId, scoreBook);
};

export const deleteHs1Column = async (classId: string, columnId: string): Promise<ScoreBookDoc> => {
  const { scoreBook } = await callTeacherApi<{ scoreBook: unknown }>({ action: 'deleteHs1Column', classId, columnId });
  return normalizeScoreBook(classId, scoreBook);
};

export const saveExamScores = async (
  classId: string,
  spreadsheetTitle: string,
  exams: Record<string, StudentExamScores>,
): Promise<ScoreBookDoc> => {
  const { scoreBook } = await callTeacherApi<{ scoreBook: unknown }>({ action: 'saveExamScores', classId, spreadsheetTitle, exams });
  return normalizeScoreBook(classId, scoreBook);
};

export const renameStudent = async (classId: string, studentId: string, name: string): Promise<void> => {
  await callTeacherApi({ action: 'renameStudent', classId, studentId, name });
};

/** Sửa mã học sinh (Mã HS) — cũng là tên đăng nhập, phải duy nhất trong lớp; PIN giữ nguyên. */
export const setStudentCode = async (classId: string, studentId: string, code: string): Promise<void> => {
  await callTeacherApi({ action: 'setStudentCode', classId, studentId, code });
};

export const renameAssignment = async (assignmentId: string, title: string): Promise<void> => {
  await callTeacherApi({ action: 'renameAssignment', assignmentId, title });
};

/** Hồ sơ năng lực một HS (phần HS tự điền + mức/ý kiến GV). */
export const loadTeacherPortfolio = async (classId: string, studentId: string): Promise<CompetencyPortfolioDoc> => {
  const { portfolio } = await callTeacherApi<{ portfolio: unknown }>({ action: 'teacherPortfolio', classId, studentId });
  return normalizePortfolio(classId, studentId, portfolio);
};

/** GV lưu hồ sơ: sửa được mọi ô (kể cả của HS), thêm mức chốt + ý kiến. */
export const saveTeacherPortfolio = async (
  classId: string,
  studentId: string,
  entries: Record<string, PortfolioEntry>,
): Promise<CompetencyPortfolioDoc> => {
  const { portfolio } = await callTeacherApi<{ portfolio: unknown }>({ action: 'saveTeacherPortfolio', classId, studentId, entries });
  return normalizePortfolio(classId, studentId, portfolio);
};

/** Máy chủ tải hộ file mẫu điểm LO của SSM từ LINK (browser bị CORS chặn cdn-ssm). */
export const fetchSsmTemplateByLink = async (link: string): Promise<{ bytes: ArrayBuffer; filename: string }> => {
  const r = await callTeacherApi<{ base64: string; filename: string }>({ action: 'ssmFetchTemplate', link });
  const bin = atob(r.base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return { bytes: arr.buffer, filename: r.filename };
};

/** Máy chủ tải hộ thời khoá biểu Prime Timetable từ LINK xem (trình duyệt bị chặn đọc chéo trang). */
export const fetchPrimeTimetableByLink = async (link: string): Promise<unknown> => {
  const r = await callTeacherApi<{ timetable: unknown }>({ action: 'fetchPrimeTimetable', link });
  return r.timetable;
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

// ── Nhận xét giáo viên trong báo cáo phụ huynh theo tháng/kì/năm ──

export interface ParentReportNoteKey {
  classId: string;
  studentId: string;
  kind: string;
  from: string;
  to: string;
}

export interface ParentReportNote {
  text: string;
  /** Dòng "kết quả theo yêu cầu cần đạt" (rỗng = báo cáo dùng danh sách chủ đề cũ). */
  requirements: ParentRequirementLine[];
  /** Chỗ thầy cô chỉnh tay trên báo cáo (chữ, số…) — xem `reportOverrides`. */
  overrides?: ReportOverrides;
}

export const loadParentReportNote = (key: ParentReportNoteKey) =>
  callTeacherApi<ParentReportNote & { updatedAt: string | null }>({ action: 'parentReportNote', ...key });

export const saveParentReportNote = (key: ParentReportNoteKey, note: ParentReportNote) =>
  callTeacherApi<ParentReportNote & { updatedAt: string }>({ action: 'saveParentReportNote', ...key, ...note });

/** AI soạn nháp nhận xét + ghép bài đã duyệt vào yêu cầu cần đạt; giáo viên sửa rồi mới lưu. */
export const draftParentReportComment = (key: ParentReportNoteKey, facts: Record<string, unknown>, program?: string | null) =>
  callTeacherApi<ParentReportNote>({ action: 'draftParentReportComment', ...key, facts, ...(program ? { program } : {}) });

/** Cổng phụ huynh (/ph): cấp PIN riêng cho phụ huynh — gọi lại thì giữ PIN cũ, chỉ cấp cho em chưa có. */
export const issueParentPins = (classId: string) =>
  callTeacherApi<{ joinCode: string; className: string; rows: Array<{ studentId: string; name: string; pin: string; parentSet: boolean }> }>({ action: 'issueParentPins', classId });

export const resetParentPin = (classId: string, studentId: string) =>
  callTeacherApi<{ studentId: string; pin: string }>({ action: 'resetParentPin', classId, studentId });

/** Công bố báo cáo một kì cho các em (mỗi lượt vài em); công bố lại cùng kì thì ghi đè. */
export const publishParentReports = (classId: string, period: { kind: string; from: string; to: string }, reports: Array<{ studentId: string; input: unknown }>) =>
  callTeacherApi<{ saved: number; skipped: string[] }>({ action: 'publishParentReports', classId, ...period, reports });

export const listParentPublished = async (classId: string): Promise<PublishedParentGroup[]> =>
  (await callTeacherApi<{ groups: PublishedParentGroup[] }>({ action: 'listParentPublished', classId })).groups;

/** Thống kê hoạt động của phụ huynh cả lớp (số lần vào, lần cuối, đang xem…). */
export const loadParentActivity = async (classId: string): Promise<ParentActivityRow[]> =>
  (await callTeacherApi<{ rows: ParentActivityRow[] }>({ action: 'parentActivity', classId })).rows;

/** Dòng thời gian chi tiết của một em (mới nhất trước). */
export const loadParentActivityDetail = async (classId: string, studentId: string): Promise<ParentActivityEvent[]> =>
  (await callTeacherApi<{ events: ParentActivityEvent[] }>({ action: 'parentActivityDetail', classId, studentId })).events;

export const unpublishParentReports = (classId: string, period: { kind: string; from: string; to: string }) =>
  callTeacherApi<{ removed: number }>({ action: 'unpublishParentReports', classId, ...period });
