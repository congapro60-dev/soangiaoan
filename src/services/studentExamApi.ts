import { auth } from '../lib/firebase';
import type { Exam, ExamSubmission, StudentAnswer } from '../types';
import type { StudentAssignmentView } from '../lib/classroom/types';

export type StudentExamAction = 'studentExamStart' | 'studentExamResume' | 'studentExamSave' | 'studentExamSubmit';

export interface StudentExamResponse {
  assignment: StudentAssignmentView;
  exam: Exam;
  attempt: ExamSubmission;
  contentVersion: string;
  contentHash: string;
  resumed?: boolean;
  saved?: boolean;
  submitted?: boolean;
  alreadySubmitted?: boolean;
}

export interface StudentExamAnswersInput {
  questionId: string;
  answer: string;
}

export interface StudentExamPayloadInput {
  assignmentId?: string;
  attemptId?: string;
  nonce?: string;
  answers?: readonly Partial<StudentAnswer>[];
  tabSwitches?: number;
  /** Các field này cố ý không được chuyển tiếp: server suy ra từ studentLink. */
  studentId?: string;
  studentName?: string;
  studentClass?: string;
  classId?: string;
}

export const buildStudentExamPayload = (
  action: StudentExamAction,
  input: StudentExamPayloadInput,
): Record<string, unknown> => {
  const payload: Record<string, unknown> = { action };
  if (action === 'studentExamStart' && typeof input.assignmentId === 'string' && input.assignmentId.trim()) {
    payload.assignmentId = input.assignmentId.trim();
  }
  if (action !== 'studentExamStart' && typeof input.attemptId === 'string' && input.attemptId.trim()) {
    payload.attemptId = input.attemptId.trim();
  }
  if (action === 'studentExamSubmit' && typeof input.nonce === 'string' && input.nonce.trim()) {
    payload.nonce = input.nonce.trim();
  }
  if (action === 'studentExamSave' || action === 'studentExamSubmit') {
    payload.answers = (input.answers || [])
      .filter((answer): answer is Partial<StudentAnswer> => Boolean(answer && typeof answer === 'object'))
      .map(answer => ({
        questionId: typeof answer.questionId === 'string' ? answer.questionId : '',
        answer: typeof answer.answer === 'string' ? answer.answer : '',
      }));
  }
  if (action === 'studentExamSave' && typeof input.tabSwitches === 'number' && Number.isFinite(input.tabSwitches)) {
    payload.tabSwitches = Math.max(0, Math.floor(input.tabSwitches));
  }
  return payload;
};

class StudentExamApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'StudentExamApiError';
  }
}

const call = async (
  action: StudentExamAction,
  input: StudentExamPayloadInput,
): Promise<StudentExamResponse> => {
  const current = auth.currentUser;
  if (!current || !current.isAnonymous) throw new StudentExamApiError(401, 'Cần phiên đăng nhập học sinh.');
  const idToken = await current.getIdToken();
  const response = await fetch('/api/classroom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...buildStudentExamPayload(action, input), idToken }),
  });
  const data = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const errorValue = data && typeof data === 'object' ? (data as { error?: unknown }).error : undefined;
    const message = typeof errorValue === 'string'
      ? errorValue
      : `Máy chủ trả lỗi ${response.status}.`;
    throw new StudentExamApiError(response.status, message);
  }
  return data as StudentExamResponse;
};

export const startStudentExam = (assignmentId: string): Promise<StudentExamResponse> =>
  call('studentExamStart', { assignmentId });

export const resumeStudentExam = (attemptId: string): Promise<StudentExamResponse> =>
  call('studentExamResume', { attemptId });

export const saveStudentExam = (
  attemptId: string,
  answers: readonly StudentExamAnswersInput[],
  tabSwitches?: number,
): Promise<StudentExamResponse> => call('studentExamSave', { attemptId, answers, tabSwitches });

export const submitStudentExam = (
  attemptId: string,
  answers: readonly StudentExamAnswersInput[],
  nonce: string,
): Promise<StudentExamResponse> => call('studentExamSubmit', { attemptId, answers, nonce });

export { StudentExamApiError };
