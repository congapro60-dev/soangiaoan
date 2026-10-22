import type { StudentAssignmentView, SubmissionDoc, SubmissionFeedbackDoc } from '../lib/classroom/types';
export type SubmissionActorCredentials = { role: 'parent'; joinCode: string; studentId: string; pin: string } | { role: 'teacher'; classId: string; studentId: string } | { role?: 'student' };
const call = async <T>(action: string, credentials: SubmissionActorCredentials, data: Record<string, unknown> = {}, endpoint = '/api/classroom'): Promise<T> => {
  const idToken = credentials.role === 'parent' ? undefined : await (await import('../lib/firebase')).auth.currentUser?.getIdToken();
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...credentials, ...data, ...(idToken ? { idToken } : {}) }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Chưa hoàn tất thao tác. Thử lại.');
  return result as T;
};
export const actorAssignments = (credentials: SubmissionActorCredentials) => call<{ assignments: StudentAssignmentView[]; submissions: SubmissionDoc[] }>('actorAssignments', credentials);
export const actorAssignmentDetail = (credentials: SubmissionActorCredentials, assignmentId: string) => call<{ assignment: StudentAssignmentView; submissions: SubmissionDoc[] }>('actorAssignmentDetail', credentials, { assignmentId });
export const setSubmissionLock = (credentials: SubmissionActorCredentials, assignmentId: string, locked: boolean) => call<{ submissionLocked: boolean }>('setSubmissionLock', credentials, { assignmentId, locked });
export const uploadActorEvidence = async (credentials: SubmissionActorCredentials, assignmentId: string | null, files: File[], scope: { purpose?: 'submission' | 'clarification' | 'correction' | 'hand_marked'; submissionId?: string; questionNumber?: string } = {}): Promise<string> => {
  const grant = await call<{ uploadGrantId: string; files: { uploadUrl: string; mimeType: string }[] }>('issueSubmissionUpload', credentials, { assignmentId, ...scope, files: files.map(file => ({ name: file.name, mimeType: file.type, size: file.size })) });
  for (const [index, file] of files.entries()) {
    const response = await fetch(grant.files[index].uploadUrl, { method: 'PUT', headers: { 'Content-Type': grant.files[index].mimeType }, body: file });
    if (!response.ok) throw new Error('Tải ảnh chưa thành công. Chọn ảnh rồi thử lại.');
  }
  return grant.uploadGrantId;
};
export const submitActorSubmission = (credentials: SubmissionActorCredentials, data: { assignmentId: string | null; uploadGrantId: string; supplementOf?: string; note?: string; textContent?: string; handMarked?: boolean }) => call<{ submission: SubmissionDoc }>('submitActorSubmission', credentials, data);
export const actorClarifyAnswers = (credentials: SubmissionActorCredentials, submissionId: string, answers: { questionNumber: string; answer: string }[], skip: string[] = []) => call<{ pending: number; rejected: { questionNumber: string; reason: string }[] }>('clarifyAnswers', credentials, { submissionId, answers, skip }, '/api/grade-homework');
export const actorClarifyPhoto = (credentials: SubmissionActorCredentials, submissionId: string, questionNumber: string, uploadGrantId?: string) => call<{ regrading: boolean }>('clarifyPhoto', credentials, { submissionId, questionNumber, uploadGrantId }, '/api/grade-homework');
export const actorAnswerExamCode = (credentials: SubmissionActorCredentials, submissionId: string, examCode: string) => call('answerExamCode', credentials, { submissionId, examCode }, '/api/grade-homework');
export const submissionFeedback = (submissionId: string, credentials: SubmissionActorCredentials = {}) => call<{ feedback: SubmissionFeedbackDoc[] }>('submissionFeedback', credentials, { submissionId });
export const sendSubmissionFeedback = (submissionId: string, message: string, questionNumber?: string) => call<{ feedback: SubmissionFeedbackDoc }>('sendSubmissionFeedback', {}, { submissionId, message, questionNumber });
export const replySubmissionFeedback = (credentials: SubmissionActorCredentials, submissionId: string, feedbackId: string, message: string, resolved = false) => call<{ feedback: SubmissionFeedbackDoc }>('replySubmissionFeedback', credentials, { submissionId, feedbackId, message, resolved });
export const readSubmissionFeedback = (submissionId: string, lastReplyAt: string) => call('readSubmissionFeedback', {}, { submissionId, lastReplyAt });
export const actorGradeOne = (credentials: SubmissionActorCredentials, submissionId: string, mode: 'quick' | 'thorough' = 'quick', options: { background?: boolean } = {}) => call('gradeOne', credentials, { submissionId, mode, ...(options.background ? { background: true } : {}) }, '/api/grade-homework');
export const prepareWorkedSolutions = (credentials: SubmissionActorCredentials, assignmentId: string, examCode?: string, force = false) => call<{ cache: import('../lib/classroom/types').WorkedSolutionCache }>('prepareWorkedSolutions', credentials, { assignmentId, examCode, force }, '/api/grade-homework');

export const listCorrectionAttempts = (submissionId: string, credentials: SubmissionActorCredentials = {}) => call<{ attempts: import('../lib/classroom/types').CorrectionAttemptDoc[] }>('correctionAttempts', credentials, { submissionId });
export const saveCorrectionAttempt = (submissionId: string, uploadGrantId: string, note?: string, credentials: SubmissionActorCredentials = {}) => call<{ attempt: import('../lib/classroom/types').CorrectionAttemptDoc }>('saveCorrectionAttempt', credentials, { submissionId, uploadGrantId, note });
export const reviewCorrectionAttempt = (submissionId: string, correctionAttemptId: string, credentials: SubmissionActorCredentials = {}) => call<{ attempt: import('../lib/classroom/types').CorrectionAttemptDoc }>('reviewCorrectionAttempt', credentials, { submissionId, correctionAttemptId }, '/api/grade-homework');

export const annotateSubmissionPhotos = (credentials: SubmissionActorCredentials, submissionId: string, force = false) => call<{ mapped:number; unlocated:number; total:number; cached?:boolean }>('annotateSubmissionPhotos', credentials, { submissionId, force }, '/api/grade-homework');

export const saveHandMarkedWork = (credentials: SubmissionActorCredentials, submissionId: string, uploadGrantId: string, note?: string) => call<{ handMarkedEvidence: NonNullable<SubmissionDoc['handMarkedEvidence']>; handMarkedPublished: boolean }>('saveHandMarkedWork', credentials, { submissionId, uploadGrantId, note });
export const setHandMarkedVisibility = (credentials: SubmissionActorCredentials, submissionId: string, expectedReviewId: string, published: boolean) => call<{ handMarkedPublished: boolean }>('setHandMarkedVisibility', credentials, { submissionId, expectedReviewId, published });
/** Bài GV nộp hộ đã chấm tay: bật/ẩn ẢNH bài nộp với phụ huynh (HS vẫn xem bài của mình). */
export const setSubmissionPhotosVisibility = (credentials: SubmissionActorCredentials, submissionId: string, published: boolean) => call<{ handMarkedPublished: boolean }>('setSubmissionPhotosVisibility', credentials, { submissionId, published });
export const readHandMarkedFile = (credentials: SubmissionActorCredentials, submissionId: string, reviewId: string, fileId: string) => call<{ url: string; expiresAt: number }>('readHandMarkedFile', credentials, { submissionId, reviewId, fileId });
