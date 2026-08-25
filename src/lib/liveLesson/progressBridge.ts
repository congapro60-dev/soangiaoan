import type {
  AdaptiveAnswer,
  AssessmentAttempt,
  LearningRoute,
  StudentSessionProgressRecord,
} from '../adaptive/types.js';
import type { LiveLessonDefinition, LiveLessonSession, LiveResponse, LiveRoute } from './types.js';

export type ProgressBridgeResult =
  | { kind: 'ready'; record: StudentSessionProgressRecord }
  | { kind: 'not_ready'; reason: 'missing_diagnostic' | 'missing_quick_check' | 'missing_exit_ticket' };

export interface TrustedParticipantMetadata {
  participantUid: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  studentClass?: string;
  teacherId: string;
  classId: string;
  /** Route returned by the server-side diagnostic/linking boundary, never inferred from UID. */
  route: LiveRoute;
}

export interface NormalizedLiveStudentSubmission {
  participantUid: string;
  responses: LiveResponse[];
}

export interface ProgressBridgeInput {
  session: LiveLessonSession;
  definition: LiveLessonDefinition;
  submissions: NormalizedLiveStudentSubmission[];
  participantMetadata: TrustedParticipantMetadata[];
  now?: string;
}

export class ProgressBridgeInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProgressBridgeInputError';
  }
}

const routeMap: Record<LiveRoute, LearningRoute> = {
  M: 'foundation',
  S: 'standard',
  C: 'challenge',
};

const CANONICAL_STEP_CONTRACT: Record<string, LiveResponse['responseType'][]> = {
  warmup: ['choice'],
  'notice-wonder': ['choice', 'text'],
  goals: ['choice'],
  route: ['route'],
  model: ['choice', 'text'],
  'ai-error-w01': ['choice', 'text'],
  'quick-check': ['choice', 'text'],
  'exit-ticket': ['text'],
};

const CANONICAL_STEP_IDS = Object.keys(CANONICAL_STEP_CONTRACT);

const normalizeStudentCode = (value: string): string => value.trim().toUpperCase().replace(/\s+/g, '-');

const assertCanonicalDefinition = (definition: LiveLessonDefinition): void => {
  if (definition.id !== 'g10_w5_p31_bpt_tiet1' || definition.durationSeconds !== 2400) {
    throw new ProgressBridgeInputError('Định nghĩa live lesson không phải contract canonical của pilot.');
  }
  if (definition.allowedStepIds.length !== CANONICAL_STEP_IDS.length
    || definition.allowedStepIds.some((stepId, index) => stepId !== CANONICAL_STEP_IDS[index])) {
    throw new ProgressBridgeInputError('Danh sách bước phản hồi không khớp contract canonical.');
  }
  if (definition.aiErrorStepId !== 'ai-error-w01') {
    throw new ProgressBridgeInputError('Bước diagnostic không khớp contract canonical.');
  }
  const steps = new Map(definition.responseSteps.map(step => [step.id, step]));
  if (steps.size !== CANONICAL_STEP_IDS.length) {
    throw new ProgressBridgeInputError('Định nghĩa thiếu hoặc trùng bước phản hồi canonical.');
  }
  for (const stepId of CANONICAL_STEP_IDS) {
    const step = steps.get(stepId);
    const expectedTypes = CANONICAL_STEP_CONTRACT[stepId];
    if (!step || step.responseTypes.length !== expectedTypes.length
      || step.responseTypes.some((responseType, index) => responseType !== expectedTypes[index])) {
      throw new ProgressBridgeInputError(`Contract response của bước ${stepId} không hợp lệ.`);
    }
  }
};

const responseForStep = (responses: LiveResponse[], stepId: string): LiveResponse | null => (
  responses
    .filter(response => response.stepId === stepId)
    .sort((left, right) => right.updatedAt - left.updatedAt || right.submittedAt - left.submittedAt || right.id.localeCompare(left.id))[0]
    ?? null
);

const answerFromResponse = (response: LiveResponse): AdaptiveAnswer => ({
  questionId: response.stepId,
  answer: String(response.value),
  score: 0,
});

const attemptFromResponse = ({
  response,
  assessmentId,
  purpose,
  attemptId,
}: {
  response: LiveResponse;
  assessmentId: string;
  purpose: AssessmentAttempt['purpose'];
  attemptId: string;
}): AssessmentAttempt => ({
  id: attemptId,
  assessmentId,
  purpose,
  submittedAt: new Date(response.submittedAt).toISOString(),
  durationSeconds: 0,
  answers: [answerFromResponse(response)],
  objectiveScores: [],
});

const assertResponseMatchesContract = (
  response: LiveResponse,
  submission: NormalizedLiveStudentSubmission,
  input: ProgressBridgeInput,
): void => {
  if (response.participantUid !== submission.participantUid) {
    throw new ProgressBridgeInputError('Response participantUid không khớp submission.');
  }
  if (response.classId !== input.session.classId) {
    throw new ProgressBridgeInputError('Response classId không khớp phiên.');
  }
  if (!input.session.allowedStepIds.includes(response.stepId)
    || !input.definition.allowedStepIds.includes(response.stepId)) {
    throw new ProgressBridgeInputError(`Response step ${response.stepId} không được phép trong phiên.`);
  }
  const step = input.definition.responseSteps.find(item => item.id === response.stepId);
  if (!step || !step.responseTypes.includes(response.responseType)) {
    throw new ProgressBridgeInputError(`Response type của bước ${response.stepId} không khớp definition.`);
  }
  if (!['string', 'number', 'boolean'].includes(typeof response.value)
    || (typeof response.value === 'number' && !Number.isFinite(response.value))) {
    throw new ProgressBridgeInputError(`Response value của bước ${response.stepId} không hợp lệ.`);
  }
  if (!response.clientNonce.trim()) {
    throw new ProgressBridgeInputError(`Response nonce của bước ${response.stepId} không hợp lệ.`);
  }
  if (typeof response.value === 'string' && response.value.length > (step.maxTextLength ?? 2000)) {
    throw new ProgressBridgeInputError(`Response text của bước ${response.stepId} vượt giới hạn.`);
  }
  if (response.responseType === 'route' && !['M', 'S', 'C'].includes(String(response.value))) {
    throw new ProgressBridgeInputError('Route response phải là M, S hoặc C.');
  }
  if (!Number.isFinite(response.submittedAt) || !Number.isFinite(response.updatedAt)) {
    throw new ProgressBridgeInputError('Response timestamp không hợp lệ.');
  }
};

const assertAllResponsesMatchContract = (input: ProgressBridgeInput): void => {
  if (!Array.isArray(input.submissions)) {
    throw new ProgressBridgeInputError('Submissions phải là một mảng.');
  }
  const participantUids = new Set<string>();
  for (const submission of input.submissions) {
    if (!submission.participantUid || participantUids.has(submission.participantUid)) {
      throw new ProgressBridgeInputError('Submissions phải có participantUid duy nhất.');
    }
    participantUids.add(submission.participantUid);
    if (!Array.isArray(submission.responses)) {
      throw new ProgressBridgeInputError('Responses phải là một mảng.');
    }
    submission.responses.forEach(response => assertResponseMatchesContract(response, submission, input));
  }
};

const assertClosedSession = (session: LiveLessonSession): void => {
  if (session.status !== 'closed') {
    throw new ProgressBridgeInputError('Chỉ được ghép tiến trình sau khi phiên đã đóng.');
  }
}

const findTrustedMetadata = (
  input: ProgressBridgeInput,
  participantUid: string,
): TrustedParticipantMetadata | null => input.participantMetadata.find(metadata => (
  metadata.participantUid === participantUid
  && metadata.classId === input.session.classId
  && metadata.teacherId === input.session.teacherUid
  && metadata.route in routeMap
  && metadata.studentId !== metadata.participantUid
  && metadata.studentId === `${metadata.teacherId}_${normalizeStudentCode(metadata.studentCode)}`
)) ?? null;

const buildSingleProgressBridgeResult = (
  input: ProgressBridgeInput,
  submission: NormalizedLiveStudentSubmission,
): ProgressBridgeResult => {
  const metadata = findTrustedMetadata(input, submission.participantUid);
  if (!metadata) return { kind: 'not_ready', reason: 'missing_diagnostic' };

  const diagnosticResponse = responseForStep(submission.responses, input.definition.aiErrorStepId);
  if (!diagnosticResponse) return { kind: 'not_ready', reason: 'missing_diagnostic' };
  const quickCheckResponse = responseForStep(submission.responses, 'quick-check');
  if (!quickCheckResponse) return { kind: 'not_ready', reason: 'missing_quick_check' };
  const exitTicketResponse = responseForStep(submission.responses, 'exit-ticket');
  if (!exitTicketResponse) return { kind: 'not_ready', reason: 'missing_exit_ticket' };

  const closedAt = new Date(input.session.updatedAt).toISOString();
  const studentCode = normalizeStudentCode(metadata.studentCode);
  const progressId = `${metadata.teacherId}_${input.session.lessonId}_${studentCode}`;
  const diagnosticAttempt = attemptFromResponse({
    response: diagnosticResponse,
    assessmentId: `${input.session.lessonId}__diagnostic`,
    purpose: 'diagnostic',
    attemptId: `${progressId}__diagnostic`,
  });
  const quickCheckAttempt = attemptFromResponse({
    response: quickCheckResponse,
    assessmentId: `${input.session.lessonId}__quick_check`,
    purpose: 'quick_check',
    attemptId: `${progressId}__quick_check`,
  });
  const exitTicketAttempt = attemptFromResponse({
    response: exitTicketResponse,
    assessmentId: `${input.session.lessonId}__exit_ticket`,
    purpose: 'exit_ticket',
    attemptId: `${progressId}__exit_ticket`,
  });

  return {
    kind: 'ready',
    record: {
      id: progressId,
      teacherId: metadata.teacherId,
      lessonId: input.session.lessonId,
      lessonTitle: input.definition.title,
      studentId: metadata.studentId,
      studentCode,
      studentName: metadata.studentName,
      ...(metadata.studentClass ? { studentClass: metadata.studentClass } : {}),
      route: routeMap[metadata.route],
      status: 'completed',
      diagnosticAttempt,
      quickCheckAttempts: [quickCheckAttempt],
      exitTicketAttempt,
      objectiveStates: [],
      remediationAttempts: 0,
      startedAt: new Date(input.session.createdAt).toISOString(),
      completedAt: closedAt,
      updatedAt: closedAt,
    },
  };
};

export const buildProgressBridgeResults = (input: ProgressBridgeInput): ProgressBridgeResult[] => {
  assertClosedSession(input.session);
  if (input.definition.lessonId !== input.session.lessonId) {
    throw new ProgressBridgeInputError('Định nghĩa bài học không khớp phiên đã đóng.');
  }
  assertCanonicalDefinition(input.definition);
  assertAllResponsesMatchContract(input);
  return input.submissions.map(submission => buildSingleProgressBridgeResult(input, submission));
};

export const buildProgressBridgeResult = (input: ProgressBridgeInput): ProgressBridgeResult => {
  if (input.submissions.length !== 1) {
    throw new ProgressBridgeInputError('Bridge singular chỉ nhận đúng một submission; dùng buildProgressBridgeResults cho nhiều học sinh.');
  }
  return buildProgressBridgeResults(input)[0];
};
