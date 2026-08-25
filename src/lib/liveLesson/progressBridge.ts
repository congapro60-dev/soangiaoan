import type {
  AdaptiveAnswer,
  AssessmentAttempt,
  LearningRoute,
  StudentSessionProgressRecord,
} from '../adaptive/types';
import type { LiveLessonDefinition, LiveLessonSession, LiveResponse, LiveRoute } from './types';

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

const normalizeStudentCode = (value: string): string => value.trim().toUpperCase().replace(/\s+/g, '-');

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

export const buildProgressBridgeResult = (input: ProgressBridgeInput): ProgressBridgeResult => {
  assertClosedSession(input.session);
  if (input.definition.lessonId !== input.session.lessonId) {
    throw new ProgressBridgeInputError('Định nghĩa bài học không khớp phiên đã đóng.');
  }

  const submission = input.submissions[0];
  if (!submission) return { kind: 'not_ready', reason: 'missing_diagnostic' };
  const metadata = findTrustedMetadata(input, submission.participantUid);
  if (!metadata) return { kind: 'not_ready', reason: 'missing_diagnostic' };

  const diagnosticResponse = responseForStep(submission.responses, input.definition.aiErrorStepId);
  if (!diagnosticResponse) return { kind: 'not_ready', reason: 'missing_diagnostic' };
  const quickCheckResponse = responseForStep(submission.responses, 'quick-check');
  if (!quickCheckResponse) return { kind: 'not_ready', reason: 'missing_quick_check' };
  const exitTicketResponse = responseForStep(submission.responses, 'exit-ticket');
  if (!exitTicketResponse || exitTicketResponse.responseType !== 'exit_ticket') {
    return { kind: 'not_ready', reason: 'missing_exit_ticket' };
  }

  const now = input.now ?? new Date().toISOString();
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
      completedAt: now,
      updatedAt: now,
    },
  };
};
