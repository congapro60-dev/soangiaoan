import { describe, expect, it } from 'vitest';
import { getV84NextStepSaveErrorCopy, restoreV84NextStep, validateV84NextStepSubmission, type V84NextStepOption } from './closingNextStep';

const options: V84NextStepOption[] = [
  { id: 'MORE_PRACTICE', taskRef: 'practice-2' },
  { id: 'DEEP_CHALLENGE', taskRef: 'challenge-1' },
];

describe('V8.8 Next Step contract', () => {
  it.each([
    ['vi', 'Chưa thể lưu lựa chọn. Hãy thử lại.'],
    ['en', 'Could not save your choice. Please try again.'],
    ['ja', '選択を保存できませんでした。もう一度お試しください。'],
  ] as const)('returns student-safe save error copy for %s', (locale, expected) => {
    const copy = getV84NextStepSaveErrorCopy(new Error('NEXT_STEP_CLOSING_CONFLICT'), locale);
    expect(copy).toBe(expected);
    expect(copy).not.toMatch(/NEXT_STEP|[A-Z][A-Z0-9]+_[A-Z0-9_]+/);
  });

  it('accepts an authored option and emits only server-owned persistence fields', () => {
    expect(validateV84NextStepSubmission({
      roomId: 'room-1', studentId: 'student-1', participantUid: 'uid-1',
      packageId: 'package-1', contentHash: 'a'.repeat(64), clientNonce: 'nonce-1',
      nextStepId: 'MORE_PRACTICE', responseRevision: 2, closingRevision: 4, options,
    })).toEqual({
      studentId: 'student-1', participantUid: 'uid-1', nextStepId: 'MORE_PRACTICE',
      packageId: 'package-1', contentHash: 'a'.repeat(64), responseRevision: 2,
      closingRevision: 4, clientNonce: 'nonce-1', taskRef: 'practice-2',
    });
  });

  it.each([
    ['unknown option', { nextStepId: 'UNKNOWN' }],
    ['invalid response revision', { responseRevision: 0 }],
    ['invalid closing revision', { closingRevision: 0 }],
    ['invalid hash', { contentHash: 'hash' }],
  ])('rejects %s', (_name, override) => {
    expect(() => validateV84NextStepSubmission({
      roomId: 'room-1', studentId: 'student-1', participantUid: 'uid-1',
      packageId: 'package-1', contentHash: 'a'.repeat(64), clientNonce: 'nonce-1',
      nextStepId: 'MORE_PRACTICE', responseRevision: 2, closingRevision: 4, options,
      ...override,
    })).toThrow();
  });

  it('does not accept client feedback, mastery or score fields', () => {
    const result = validateV84NextStepSubmission({
      roomId: 'room-1', studentId: 'student-1', participantUid: 'uid-1',
      packageId: 'package-1', contentHash: 'a'.repeat(64), clientNonce: 'nonce-1',
      nextStepId: 'MORE_PRACTICE', responseRevision: 2, closingRevision: 4, options,
      feedback: 'fake', mastery: 'ready', score: 100,
    } as never);
    expect(result).not.toHaveProperty('feedback');
    expect(result).not.toHaveProperty('mastery');
    expect(result).not.toHaveProperty('score');
  });

  it('restores only the saved authored choice for the current closing revision', () => {
    expect(restoreV84NextStep({ nextStepId: 'DEEP_CHALLENGE', responseRevision: 3, closingRevision: 4 }, options, 4))
      .toEqual({ nextStepId: 'DEEP_CHALLENGE', responseRevision: 3 });
    expect(restoreV84NextStep(null, options, 4)).toEqual({ nextStepId: null, responseRevision: 0 });
    expect(() => restoreV84NextStep({ nextStepId: 'OTHER', responseRevision: 3, closingRevision: 4 }, options, 4))
      .toThrow('NEXT_STEP_RESTORE_INVALID');
    expect(() => restoreV84NextStep({ nextStepId: 'DEEP_CHALLENGE', responseRevision: 3, closingRevision: 3 }, options, 4))
      .toThrow('NEXT_STEP_RESTORE_INVALID');
  });
});
