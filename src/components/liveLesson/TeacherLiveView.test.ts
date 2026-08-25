import { describe, expect, it } from 'vitest';
import { getPilotLiveLessonDefinition } from '../../lib/liveLesson/definition';
import {
  buildTeacherStatePatch,
  getCueNavigation,
  getTimerSnapshot,
} from './TeacherLiveView';

describe('TeacherLiveView controls', () => {
  const definition = getPilotLiveLessonDefinition();

  it('moves within cue bounds and keeps the matching TV screen', () => {
    expect(getCueNavigation(definition, 'P00', 'previous')).toEqual({ cueId: 'P00', tvScreenId: 'S0' });
    expect(getCueNavigation(definition, 'P00', 'next')).toEqual({ cueId: 'P01', tvScreenId: 'S1' });
    expect(getCueNavigation(definition, 'P21', 'next')).toEqual({ cueId: 'P21', tvScreenId: 'S11' });
  });

  it('derives elapsed and remaining time from the canonical cue timeline', () => {
    expect(getTimerSnapshot(definition, 'P12')).toEqual({ elapsedSeconds: 1005, remainingSeconds: 1395 });
    expect(getTimerSnapshot(definition, 'P12', 2500, 'running', 1500)).toEqual({ elapsedSeconds: 1006, remainingSeconds: 1394 });
    expect(getTimerSnapshot(definition, 'missing')).toEqual({ elapsedSeconds: 0, remainingSeconds: 2400 });
  });

  it('creates only allowed teacher state patches and never resumes a closed session', () => {
    expect(buildTeacherStatePatch(definition, 'P05', 'running')).toEqual({
      currentCueId: 'P05', currentTvScreenId: 'S4',
    });
    expect(buildTeacherStatePatch(definition, 'P05', 'paused')).toEqual({ status: 'running' });
    expect(buildTeacherStatePatch(definition, 'P05', 'closed')).toBeNull();
  });
});
