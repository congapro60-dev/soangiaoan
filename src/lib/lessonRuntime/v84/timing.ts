export interface QuestionBudget {
  workSec: number;
  statsSec: number;
  revealDebriefSec: number;
  transitionSec: number;
}
export interface ActivityBudget {
  durationSec: number;
  introSec: number;
  handoffSec: number;
  closeSec: number;
  questions: QuestionBudget[];
}
export interface RoomTimingV84 {
  lessonStartedAtSec: number;
  activityStartedAtSec: number;
  timeBankSec: number;
  creditedRunKeys: string[];
  creditedRunSavings: Record<string, number>;
}

export const createRoomTiming = (lessonStartedAtSec: number, activityStartedAtSec: number): RoomTimingV84 => {
  if (![lessonStartedAtSec, activityStartedAtSec].every(Number.isFinite)) throw new Error('ROOM_TIMING_INVALID');
  return { lessonStartedAtSec, activityStartedAtSec, timeBankSec: 0, creditedRunKeys: [], creditedRunSavings: {} };
};

export const applyQuestionTiming = (current: RoomTimingV84, result: { runKey: string; savedWorkSec: number }): RoomTimingV84 => {
  if (!result.runKey || !Number.isFinite(result.savedWorkSec) || result.savedWorkSec < 0) throw new Error('QUESTION_TIMING_INVALID');
  if (current.creditedRunKeys.includes(result.runKey)) return current;
  return { ...current, timeBankSec: current.timeBankSec + result.savedWorkSec,
    creditedRunKeys: [...current.creditedRunKeys, result.runKey],
    creditedRunSavings: { ...current.creditedRunSavings, [result.runKey]: result.savedWorkSec } };
};

export const revokeQuestionTiming = (current: RoomTimingV84, runKey: string): RoomTimingV84 => {
  if (!current.creditedRunKeys.includes(runKey)) return current;
  const savings = current.creditedRunSavings?.[runKey];
  if (savings === undefined) throw new Error('TIME_BANK_CREDIT_UNKNOWN');
  const creditedRunSavings = { ...current.creditedRunSavings };
  delete creditedRunSavings[runKey];
  return { ...current, timeBankSec: Math.max(0, current.timeBankSec - savings),
    creditedRunKeys: current.creditedRunKeys.filter(key => key !== runKey), creditedRunSavings };
};

export const computeLessonDrift = (timing: Pick<RoomTimingV84, 'lessonStartedAtSec' | 'activityStartedAtSec'>, nowSec: number,
  plannedActivityStartSec: number, activityBudgetSec: number): number => {
  if (![nowSec, plannedActivityStartSec, activityBudgetSec].every(Number.isFinite) || activityBudgetSec < 0) {
    throw new Error('LESSON_DRIFT_INPUT_INVALID');
  }
  const plannedStartAtSec = timing.lessonStartedAtSec + plannedActivityStartSec;
  const startDriftSec = plannedStartAtSec - timing.activityStartedAtSec;
  const overrunSec = Math.max(0, nowSec - timing.activityStartedAtSec - activityBudgetSec);
  return startDriftSec - overrunSec;
};
export const activityBudgetResult = (budget: ActivityBudget): { valid: boolean; requiredSec: number; deficitSec: number } => {
  const values = [budget.durationSec, budget.introSec, budget.handoffSec, budget.closeSec,
    ...budget.questions.flatMap(question => [question.workSec, question.statsSec, question.revealDebriefSec, question.transitionSec])];
  if (values.some(value => !Number.isFinite(value) || value < 0)) throw new Error('ACTIVITY_BUDGET_INVALID');
  const requiredSec = budget.introSec + budget.handoffSec + budget.closeSec
    + budget.questions.reduce((sum, question) => sum + question.workSec + question.statsSec + question.revealDebriefSec + question.transitionSec, 0);
  return { valid: requiredSec <= budget.durationSec, requiredSec, deficitSec: Math.max(0, requiredSec - budget.durationSec) };
};
export const computeTimeBank = (questions: readonly { plannedWorkSec: number; actualWorkSec: number }[]): number => {
  if (questions.some(question => !Number.isFinite(question.plannedWorkSec) || !Number.isFinite(question.actualWorkSec)
    || question.plannedWorkSec < 0 || question.actualWorkSec < 0)) throw new Error('TIME_BANK_INPUT_INVALID');
  return questions.reduce((sum, question) => sum + Math.max(0, question.plannedWorkSec - question.actualWorkSec), 0);
};
export const recommendRecovery = (delaySec: number, segments: readonly { id: string; compressibleSec: number; protected: boolean }[]): {
  recoveredSec: number; remainingDelaySec: number; cuts: Array<{ id: string; seconds: number }>;
} => {
  if (!Number.isFinite(delaySec) || delaySec < 0 || segments.some(segment => !Number.isFinite(segment.compressibleSec)
    || segment.compressibleSec < 0)) throw new Error('RECOVERY_INPUT_INVALID');
  let remainingDelaySec = delaySec;
  const cuts: Array<{ id: string; seconds: number }> = [];
  for (const segment of segments) {
    if (segment.protected || remainingDelaySec <= 0) continue;
    const seconds = Math.min(segment.compressibleSec, remainingDelaySec);
    if (seconds > 0) { cuts.push({ id: segment.id, seconds }); remainingDelaySec -= seconds; }
  }
  return { recoveredSec: delaySec - remainingDelaySec, remainingDelaySec, cuts };
};
