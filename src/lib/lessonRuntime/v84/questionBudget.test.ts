import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { LessonIRV83 } from '../../lessonCompiler/v832/lessonIRSchema';
import { resolvePreviewQuestionWorkSec } from './questionBudget';

const golden = (): LessonIRV83 => JSON.parse(readFileSync(
  'tests/fixtures/v832/11T38.lesson-ir-v8.3.2.validated.json', 'utf8')) as LessonIRV83;

describe('V8.4 preview question time from canonical activity', () => {
  it('derives a bounded work timer when the supplied 11T38 question estimate is zero', () => {
    const lesson = golden();
    const problem = lesson.timeline.find(activity => activity.id === 'problem')!;
    expect(lesson.questions.problem_idea.estimatedWorkTimeSec).toBe(0);
    expect(resolvePreviewQuestionWorkSec(problem, lesson.questions, 'problem_idea@problem')).toBe(80);
    const explore = lesson.timeline.find(activity => activity.id === 'explore')!;
    expect(resolvePreviewQuestionWorkSec(explore, lesson.questions, 'explore_predict@explore')).toBe(128);
    expect(resolvePreviewQuestionWorkSec(explore, lesson.questions, 'explore_explain@explore')).toBe(128);
  });

  it('uses an authored positive estimate and rejects an impossible fallback', () => {
    const lesson = golden();
    const problem = lesson.timeline.find(activity => activity.id === 'problem')!;
    lesson.questions.problem_idea.estimatedWorkTimeSec = 45;
    expect(resolvePreviewQuestionWorkSec(problem, lesson.questions, 'problem_idea@problem')).toBe(45);
    lesson.questions.problem_idea.estimatedWorkTimeSec = 0;
    problem.durationSec = 2;
    delete problem.surfaceHandoff;
    expect(() => resolvePreviewQuestionWorkSec(problem, lesson.questions, 'problem_idea@problem'))
      .toThrow('QUESTION_WORK_TIME_UNSPECIFIED');
  });
});
