import type { LessonIRV83 } from '../../lessonCompiler/v832/lessonIRSchema.js';
import { activityBudgetResult } from './timing.js';

type BudgetStatus = 'UNVALIDATED' | 'VALID' | 'INVALID';
export interface BudgetValidationResult { status: BudgetStatus; issues: string[] }

const object = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const seconds = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const validateV84ActivityBudgets = (lesson: LessonIRV83): BudgetValidationResult => {
  const raw = object(object(lesson.extensions)?.v84);
  if (!raw) return { status: 'UNVALIDATED', issues: [] };
  const budgets = object(raw.activityBudgets);
  if (raw.version !== '1.0' || !budgets) return { status: 'INVALID', issues: ['V84_BUDGET_CONTRACT_INVALID'] };
  const issues: string[] = [];
  for (const activity of lesson.timeline) {
    if (!activity.questionInstances?.length) continue;
    const budget = object(budgets[activity.id]);
    if (!budget || !seconds(budget.introSec) || !seconds(budget.closeSec) || !object(budget.questions)) {
      issues.push(`ACTIVITY_BUDGET_MISSING:${activity.id}`);
      continue;
    }
    const questions: Array<{ workSec: number; statsSec: number; revealDebriefSec: number; transitionSec: number }> = [];
    for (const instance of activity.questionInstances) {
      const extra = object((budget.questions as Record<string, unknown>)[instance.instanceId]);
      const workSec = lesson.questions[instance.questionId]?.estimatedWorkTimeSec;
      if (!extra || !seconds(extra.statsSec) || !seconds(extra.revealDebriefSec)
        || !seconds(extra.transitionSec) || !seconds(workSec) || workSec <= 0) {
        issues.push(`QUESTION_BUDGET_MISSING:${activity.id}:${instance.instanceId}`);
        continue;
      }
      questions.push({ workSec, statsSec: extra.statsSec, revealDebriefSec: extra.revealDebriefSec,
        transitionSec: extra.transitionSec });
    }
    if (questions.length !== activity.questionInstances.length) continue;
    const handoffSec = activity.surfaceHandoff ? activity.surfaceHandoff.entry.durationSec + activity.surfaceHandoff.recall.durationSec
      : activity.timingPolicy.surfaceSwitchCostSec;
    const result = activityBudgetResult({ durationSec: activity.durationSec, introSec: budget.introSec,
      handoffSec, closeSec: budget.closeSec, questions });
    if (!result.valid) issues.push(`ACTIVITY_BUDGET_EXCEEDED:${activity.id}:${result.requiredSec}>${activity.durationSec}`);
  }
  for (const id of Object.keys(budgets)) {
    if (!lesson.timeline.some(activity => activity.id === id)) issues.push(`ACTIVITY_BUDGET_UNKNOWN:${id}`);
  }
  return { status: issues.length ? 'INVALID' : 'VALID', issues };
};
