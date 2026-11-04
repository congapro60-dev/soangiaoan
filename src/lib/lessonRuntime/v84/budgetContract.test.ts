import { describe, expect, it } from 'vitest';
import { structuralLessonIR } from '../../lessonCompiler/v832/lessonIR.testFixture';
import { validateV84ActivityBudgets } from './budgetContract';

const lessonWithQuestion = () => {
  const lesson = structuralLessonIR();
  lesson.questions.Q1 = { id: 'Q1', prompt: { vi: 'Trả lời' }, responseType: 'short', hints: [],
    misconceptions: [], evidenceTargets: ['reasoning'], submissionModes: ['typed'],
    estimatedWorkTimeSec: 90, authoredSource: 'teacher' };
  lesson.timeline[0].questionInstances = [{ instanceId: 'Q1@A1', questionId: 'Q1', activityId: 'A1',
    attemptMode: 'fresh', required: true, order: 1 }];
  lesson.timeline[0].durationSec = 120;
  lesson.timeline[0].timingPolicy.plannedDurationSec = 120;
  return lesson;
};

describe('V8.4 compiler question budgets', () => {
  it('keeps a historical V8.3.2 lesson preview-compatible while recording an unvalidated budget', () => {
    expect(validateV84ActivityBudgets(lessonWithQuestion())).toEqual({ status: 'UNVALIDATED', issues: [] });
  });

  it('rejects a declared activity whose real question and handoff costs exceed duration', () => {
    const lesson = lessonWithQuestion();
    lesson.extensions = { v84: { version: '1.0', activityBudgets: { A1: {
      introSec: 20, closeSec: 10,
      questions: { 'Q1@A1': { statsSec: 20, revealDebriefSec: 15, transitionSec: 5 } },
    } } } };
    expect(validateV84ActivityBudgets(lesson)).toEqual({ status: 'INVALID',
      issues: ['ACTIVITY_BUDGET_EXCEEDED:A1:160>120'] });
  });

  it('accepts a feasible complete budget and rejects an omitted question instance', () => {
    const lesson = lessonWithQuestion();
    lesson.timeline[0].durationSec = 180;
    lesson.timeline[0].timingPolicy.plannedDurationSec = 180;
    lesson.extensions = { v84: { version: '1.0', activityBudgets: { A1: {
      introSec: 20, closeSec: 10,
      questions: { 'Q1@A1': { statsSec: 20, revealDebriefSec: 15, transitionSec: 5 } },
    } } } };
    expect(validateV84ActivityBudgets(lesson)).toEqual({ status: 'VALID', issues: [] });
    lesson.questions.Q1.estimatedWorkTimeSec = 0;
    expect(validateV84ActivityBudgets(lesson)).toEqual({ status: 'INVALID',
      issues: ['QUESTION_BUDGET_MISSING:A1:Q1@A1'] });
    lesson.questions.Q1.estimatedWorkTimeSec = 90;
    delete (lesson.extensions as { v84: { activityBudgets: { A1: { questions: Record<string, unknown> } } } }).v84.activityBudgets.A1.questions['Q1@A1'];
    expect(validateV84ActivityBudgets(lesson)).toEqual({ status: 'INVALID',
      issues: ['QUESTION_BUDGET_MISSING:A1:Q1@A1'] });
  });
});
