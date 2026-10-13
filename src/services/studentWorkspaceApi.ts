import { auth } from '../lib/firebase';
import type {
  PublishedStudentReport, StudentAssignmentDetail, StudentReportSummary, StudentWorkspaceIndex,
} from '../lib/classroom/studentWorkspace';

const call = async <T,>(action: string, payload: Record<string, unknown> = {}): Promise<T> => {
  const current = auth.currentUser;
  if (!current?.isAnonymous) throw new Error('Cần phiên đăng nhập học sinh.');
  const idToken = await current.getIdToken();
  const response = await fetch('/api/classroom', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, action, idToken }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `Máy chủ trả lỗi ${response.status}`);
  return data as T;
};

export const fetchStudentWorkspace = (): Promise<StudentWorkspaceIndex> => call('studentWorkspace');
export const fetchStudentAssignmentDetail = (assignmentId: string | null, submissionId?: string): Promise<StudentAssignmentDetail> =>
  call('studentAssignmentDetail', { assignmentId, ...(submissionId ? { submissionId } : {}) });
export const loadStudentReports = async (): Promise<StudentReportSummary[]> =>
  (await call<{ reports: StudentReportSummary[] }>('studentReports')).reports;
export const getStudentReport = async (reportId: string): Promise<PublishedStudentReport> =>
  (await call<{ report: PublishedStudentReport }>('studentReport', { reportId })).report;
