import { describe, expect, it } from 'vitest';
import { getPilotLiveLessonDefinition } from './definition';
import {
  ProgressBridgeInputError,
  buildProgressBridgeResult,
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
      response('exit-ticket', 'exit_ticket', 'x > 2', 1_003),
    ],
  }],
  participantMetadata: [metadata],
  now: '2026-08-25T10:00:00.000Z',
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
});
