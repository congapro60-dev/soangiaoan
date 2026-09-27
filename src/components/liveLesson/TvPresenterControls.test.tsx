import { describe, expect, it } from 'vitest';
import { canPresenterControl, getPresenterCueNavigation } from './TvPresenterControls';

const definition = {
  cues: [
    { id: 'P00', tvScreenId: 'S0' },
    { id: 'P03', tvScreenId: 'S1' },
    { id: 'P05', tvScreenId: 'S2' },
  ],
} as Parameters<typeof getPresenterCueNavigation>[0];

describe('getPresenterCueNavigation', () => {
  it('moves to the next cue and returns its screen id', () => {
    expect(getPresenterCueNavigation(definition, 'P00', 'next')).toEqual({
      currentCueId: 'P03', currentTvScreenId: 'S1', index: 1, total: 3,
    });
  });

  it('moves to the previous cue', () => {
    expect(getPresenterCueNavigation(definition, 'P05', 'previous')).toEqual({
      currentCueId: 'P03', currentTvScreenId: 'S1', index: 1, total: 3,
    });
  });

  it('clamps at the first and last cue', () => {
    expect(getPresenterCueNavigation(definition, 'P00', 'previous').currentCueId).toBe('P00');
    expect(getPresenterCueNavigation(definition, 'P05', 'next').currentCueId).toBe('P05');
  });

  it('falls back to the first cue for an unknown current cue', () => {
    expect(getPresenterCueNavigation(definition, 'nope', 'previous').currentCueId).toBe('P00');
  });
});

describe('canPresenterControl', () => {
  it('allows only the authenticated session owner', () => {
    expect(canPresenterControl({ teacherUid: 'teacher-a' }, 'teacher-a')).toBe(true);
    expect(canPresenterControl({ teacherUid: 'teacher-a' }, 'teacher-b')).toBe(false);
    expect(canPresenterControl({ teacherUid: 'teacher-a' }, null)).toBe(false);
    expect(canPresenterControl({ teacherUid: 'teacher-a' }, undefined)).toBe(false);
  });
});
