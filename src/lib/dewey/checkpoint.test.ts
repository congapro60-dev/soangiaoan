import { describe, expect, it } from 'vitest';
import { createDeweyCheckpoint, isTrustedDeweyMessage } from './checkpoint';

describe('Dewey checkpoint helpers', () => {
  it('accepts messages only from the active lesson iframe', () => {
    const iframeWindow = {} as Window;
    expect(isTrustedDeweyMessage({ source: iframeWindow } as MessageEvent, iframeWindow)).toBe(true);
    expect(isTrustedDeweyMessage({ source: {} } as MessageEvent, iframeWindow)).toBe(false);
  });

  it('creates an incomplete checkpoint from a lesson signal', () => {
    expect(createDeweyCheckpoint('lesson-1', 'ST01', {
      unitIds: ['u1'],
      durationSeconds: 42,
      olympiaScore: 20,
      notebookEntries: ['note'],
    })).toMatchObject({
      lessonId: 'lesson-1',
      studentCode: 'ST01',
      completedUnitIds: ['u1'],
      status: 'in_progress',
      olympiaScore: 20,
    });
  });
});
