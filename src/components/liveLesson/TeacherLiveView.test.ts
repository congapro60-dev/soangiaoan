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
    expect(getCueNavigation(definition, 'P00', 'previous')).toEqual({ currentCueId: 'P00', currentTvScreenId: 'S0' });
    expect(getCueNavigation(definition, 'P00', 'next')).toEqual({ currentCueId: 'P01', currentTvScreenId: 'S1' });
    expect(getCueNavigation(definition, 'P21', 'next')).toEqual({ currentCueId: 'P21', currentTvScreenId: 'S11' });
  });

  it('derives elapsed and remaining time from the canonical cue timeline', () => {
    expect(getTimerSnapshot(definition, 'P12', 'running')).toEqual({ elapsedSeconds: 1005, remainingSeconds: 1395, status: 'running' });
    expect(getTimerSnapshot(definition, 'P12', 'paused')).toEqual({ elapsedSeconds: 1005, remainingSeconds: 1395, status: 'paused' });
    expect(getTimerSnapshot(definition, 'missing', 'running')).toEqual({ elapsedSeconds: 0, remainingSeconds: 2400, status: 'running' });
  });

  it('creates only allowed teacher state patches and never resumes a closed session', () => {
    expect(buildTeacherStatePatch(definition, 'P05', 'running')).toEqual({
      currentCueId: 'P05', currentTvScreenId: 'S4',
    });
    expect(buildTeacherStatePatch(definition, 'P05', 'paused')).toEqual({ status: 'running' });
    expect(buildTeacherStatePatch(definition, 'P05', 'closed')).toBeNull();
  });
});
