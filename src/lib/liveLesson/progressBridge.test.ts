import { describe, expect, it } from 'vitest';
import { getPilotLiveLessonDefinition } from './definition';
import {
  ProgressBridgeInputError,
  buildProgressBridgeResult,
  buildProgressBridgeResults,
  type ProgressBridgeInput,
  type TrustedParticipantMetadata,
} from './progressBridge';
import type { LiveLessonSession, LiveResponse } from './types';

const definition = getPilotLiveLessonDefinition();

const session = (status: LiveLessonSession['status'] = 'closed'): LiveLessonSession => ({
  id: 'session-1',
  schemaVersion: 1,
  lessonId: definition.lessonId,
  title: definition.title,
  classId: 'class-1',
  teacherUid: 'teacher-1',
  allowedStepIds: [...definition.allowedStepIds],
  expiresAt: 2_000_000,
  status,
  currentCueId: 'P40',
  currentTvScreenId: 'S10',
  publicStateEnabled: false,
  publicStatsEnabled: false,
  createdAt: 1_000_000,
  updatedAt: 2_000_000,
});

const metadata: TrustedParticipantMetadata = {
  participantUid: 'anonymous-1',
  studentId: 'teacher-1_NGUYEN-A',
  studentCode: 'NGUYEN-A',
  studentName: 'Nguyễn A',
  studentClass: '10A1',
  teacherId: 'teacher-1',
  classId: 'class-1',
  route: 'S',
};

const response = (
  stepId: string,
  responseType: LiveResponse['responseType'],
  value: LiveResponse['value'],
  submittedAt: number,
): LiveResponse => ({
  id: `${metadata.participantUid}__${stepId}`,
  participantUid: metadata.participantUid,
  classId: metadata.classId,
  stepId,
  responseType,
  value,
  clientNonce: `nonce-${stepId}`,
  submittedAt,
  updatedAt: submittedAt,
});

const completeInput = (overrides: Partial<ProgressBridgeInput> = {}): ProgressBridgeInput => ({
  session: session(),
  definition,
  submissions: [{
    participantUid: metadata.participantUid,
    responses: [
      response('ai-error-w01', 'choice', 'Conceptual', 1_001),
      response('quick-check', 'choice', 'B', 1_002),
      response('exit-ticket', 'text', 'x > 2', 1_003),
    ],
  }],
  participantMetadata: [metadata],
  ...overrides,
});

describe('live lesson progress bridge', () => {
  it('refuses an incomplete participant without producing a partial record', () => {
    const input = completeInput({
      submissions: [{
        participantUid: metadata.participantUid,
        responses: [response('ai-error-w01', 'choice', 'Conceptual', 1_001), response('quick-check', 'choice', 'B', 1_002)],
      }],
    });

    expect(buildProgressBridgeResult(input)).toEqual({ kind: 'not_ready', reason: 'missing_exit_ticket' });
  });

  it('maps a complete participant through trusted metadata, never anonymous uid', () => {
    const result = buildProgressBridgeResult(completeInput());

    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') return;
    expect(definition.responseSteps.find((step) => step.id === 'exit-ticket')?.responseTypes).toEqual(['text']);
    expect(result.record.studentId).toBe(metadata.studentId);
    expect(result.record.studentId).not.toBe(metadata.participantUid);
    expect(result.record.studentCode).toBe(metadata.studentCode);
    expect(result.record.route).toBe('standard');
    expect(result.record.status).toBe('completed');
    expect(result.record.diagnosticAttempt.purpose).toBe('diagnostic');
    expect(result.record.quickCheckAttempts).toHaveLength(1);
    expect(result.record.exitTicketAttempt?.purpose).toBe('exit_ticket');
    expect(JSON.stringify(result.record)).not.toContain('participantUid');
  });

  it('creates the same id and timestamps on a close retry', () => {
    const first = buildProgressBridgeResult(completeInput());
    const second = buildProgressBridgeResult(completeInput());

    expect(second).toEqual(first);
  });

  it('rejects a session that is not closed before inspecting evidence', () => {
    expect(() => buildProgressBridgeResult(completeInput({ session: session('running') })))
      .toThrowError(ProgressBridgeInputError);
  });

  it('fails closed when trusted participant mapping is absent', () => {
    const result = buildProgressBridgeResult(completeInput({ participantMetadata: [] }));

    expect(result).toEqual({ kind: 'not_ready', reason: 'missing_diagnostic' });
  });

  it('validates every response instead of silently ignoring extra submissions', () => {
    const input = completeInput({
      submissions: [{
        participantUid: metadata.participantUid,
        responses: [
          response('warmup', 'choice', 'A', 1_000),
          response('ai-error-w01', 'choice', 'Conceptual', 1_001),
          response('quick-check', 'choice', 'B', 1_002),
          response('exit-ticket', 'text', 'x > 2', 1_003),
        ],
      }],
    });

    expect(buildProgressBridgeResult(input).kind).toBe('ready');
  });

  it.each([
    ['wrong participant', { participantUid: 'other-anonymous' }],
    ['wrong class', { classId: 'class-2' }],
    ['disallowed step', { stepId: 'not-a-live-step' }],
    ['non-canonical exit response type', { stepId: 'exit-ticket', responseType: 'exit_ticket' as const }],
  ])('rejects every %s response', (_label, change) => {
    const invalidResponse = response('exit-ticket', 'text', 'x > 2', 1_003);
    const changedResponse = { ...invalidResponse, ...change } as LiveResponse;
    const input = completeInput({
      submissions: [{
        participantUid: metadata.participantUid,
        responses: [
          response('ai-error-w01', 'choice', 'Conceptual', 1_001),
          response('quick-check', 'choice', 'B', 1_002),
          changedResponse,
        ],
      }],
    });

    expect(() => buildProgressBridgeResult(input)).toThrowError(ProgressBridgeInputError);
  });

  it('rejects a definition that fails canonical validation', () => {
    const invalidDefinition = {
      ...definition,
      allowedStepIds: [...definition.allowedStepIds, 'not-a-live-step'],
    } as typeof definition;

    expect(() => buildProgressBridgeResult(completeInput({ definition: invalidDefinition })))
      .toThrowError(ProgressBridgeInputError);
  });

  it('uses the closed session timestamp when now is omitted', () => {
    const input = completeInput();
    const first = buildProgressBridgeResult(input);
    const second = buildProgressBridgeResult({ ...input, now: undefined });

    expect(first).toEqual(second);
    if (first.kind !== 'ready') return;
    expect(first.record.completedAt).toBe(new Date(session().updatedAt).toISOString());
  });

  it('processes every participant instead of dropping submissions after the first', () => {
    const secondMetadata = { ...metadata, participantUid: 'anonymous-2', studentId: 'teacher-1_TRAN-B', studentCode: 'TRAN-B', studentName: 'Trần B' };
    const secondResponses = [
      response('ai-error-w01', 'choice', 'Algebraic', 1_001),
      response('quick-check', 'choice', 'C', 1_002),
      response('exit-ticket', 'text', 'x < 3', 1_003),
    ].map(item => ({ ...item, participantUid: secondMetadata.participantUid, classId: secondMetadata.classId, id: `${secondMetadata.participantUid}__${item.stepId}` }));
    const input = completeInput({
      submissions: [
        ...completeInput().submissions,
        { participantUid: secondMetadata.participantUid, responses: secondResponses },
      ],
      participantMetadata: [metadata, secondMetadata],
    });

    expect(buildProgressBridgeResults(input)).toHaveLength(2);
  });
});
