import { describe, expect, it } from 'vitest';
import { activityBudgetResult, applyQuestionTiming, computeLessonDrift, computeTimeBank, createRoomTiming,
  recommendRecovery, revokeQuestionTiming } from './timing';

describe('V8.4 classroom timing', () => {
  it('rejects an activity whose question budgets exceed its declared duration', () => {
    const result = activityBudgetResult({
      durationSec: 300, introSec: 20, handoffSec: 20, closeSec: 10,
      questions: [
        { workSec: 90, statsSec: 15, revealDebriefSec: 25, transitionSec: 5 },
        { workSec: 90, statsSec: 15, revealDebriefSec: 25, transitionSec: 5 },
        { workSec: 90, statsSec: 15, revealDebriefSec: 25, transitionSec: 5 },
      ],
    });
    expect(result.requiredSec).toBe(455);
    expect(result.valid).toBe(false);
    expect(result.deficitSec).toBe(155);
  });

  it('credits only completed work that finished before its maximum budget', () => {
    expect(computeTimeBank([{ plannedWorkSec: 45, actualWorkSec: 27 },
      { plannedWorkSec: 30, actualWorkSec: 40 }])).toBe(18);
  });

  it('uses optional time before protected recheck, Exit and closing evidence', () => {
    expect(recommendRecovery(50, [
      { id: 'challenge', compressibleSec: 30, protected: false },
      { id: 'recheck', compressibleSec: 30, protected: true },
      { id: 'debrief', compressibleSec: 25, protected: false },
      { id: 'exit', compressibleSec: 20, protected: true },
    ])).toEqual({ recoveredSec: 50, remainingDelaySec: 0, cuts: [
      { id: 'challenge', seconds: 30 }, { id: 'debrief', seconds: 20 },
    ] });
  });

  it('credits a completed question once even when stats and reveal are revisited', () => {
    const initial = createRoomTiming(100, 100);
    const locked = applyQuestionTiming(initial, { runKey: 'Q1@A1:100', savedWorkSec: 18 });
    expect(locked.timeBankSec).toBe(18);
    expect(applyQuestionTiming(locked, { runKey: 'Q1@A1:100', savedWorkSec: 18 })).toEqual(locked);
    expect(applyQuestionTiming(locked, { runKey: 'Q2@A1:130', savedWorkSec: 0 }).timeBankSec).toBe(18);
    expect(revokeQuestionTiming(locked, 'Q1@A1:100').timeBankSec).toBe(0);
  });

  it('forecasts drift from planned activity start and current overrun', () => {
    const timing = createRoomTiming(100, 370);
    expect(computeLessonDrift(timing, 400, 300, 60)).toBe(30);
    expect(computeLessonDrift(timing, 500, 300, 60)).toBe(-40);
  });
});
