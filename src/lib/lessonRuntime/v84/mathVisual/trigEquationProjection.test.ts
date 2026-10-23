import { describe, expect, it } from 'vitest';
import { parseMathVisualExtension } from './extension';
import { projectMathVisuals } from './publicVisual';
import { trigEquationLesson } from './trigEquation.testFixture';

describe('trig-equation extension and public reveal', () => {
  it('validates the same visual and question-phase contract without a lesson-ID branch', () => {
    const lesson = trigEquationLesson();
    lesson.lesson.lessonId = 'arbitrary-trig-review';
    expect(parseMathVisualExtension(lesson).trig.renderer).toBe('trig_equation');
  });

  it('never sends solutions before question REVEAL, even with a stale reveal visual cursor', () => {
    const lesson = trigEquationLesson();
    for (const phase of ['INTRO', 'QUESTION_BRIEF', 'QUESTION_OPEN', 'QUESTION_LOCKED', 'STATS']) {
      const projected = projectMathVisuals(lesson, ['trig'], 'reveal', phase)[0];
      expect(projected).toMatchObject({ renderer: 'trig_equation', stateId: 'task' });
      expect(JSON.stringify(projected)).not.toMatch(/roots|families|solution_points|solution_families|arcsin/);
    }
  });

  it('publishes only the solution groups visible in the chosen reveal state', () => {
    const lesson = trigEquationLesson();
    const reveal = projectMathVisuals(lesson, ['trig'], 'task', 'REVEAL')[0] as unknown as {
      roots: number[]; families: unknown[];
    };
    expect(reveal.roots).toHaveLength(2);
    expect(reveal.roots[0]).toBeCloseTo(Math.PI / 6, 12);
    expect(reveal.families).toHaveLength(2);
    lesson.visuals.trig.states.reveal.visibleObjects = ['circle', 'axes', 'solution_points'];
    expect(projectMathVisuals(lesson, ['trig'], 'task', 'REVEAL')[0]).not.toHaveProperty('families');
  });

  it('blocks spoiler states and invalid equation domains at compile time', () => {
    const lesson = trigEquationLesson();
    lesson.visuals.trig.states.task.visibleObjects.push('solution_points');
    expect(() => parseMathVisualExtension(lesson)).toThrow('VISUAL_SPOILER');
    const invalid = trigEquationLesson();
    const extension = invalid.extensions!.mathVisualSimulation as { assets: { trig: { model: { value: number } } } };
    extension.assets.trig.model.value = NaN;
    expect(() => parseMathVisualExtension(invalid)).toThrow('VISUAL_MODEL_INVALID:trig');
  });

  it('requires both solution objects to be classified as answer-bearing', () => {
    const lesson = trigEquationLesson();
    const extension = lesson.extensions!.mathVisualSimulation as { assets: { trig: { answerBearingObjectIds: string[] } } };
    extension.assets.trig.answerBearingObjectIds = [];
    expect(() => parseMathVisualExtension(lesson)).toThrow('VISUAL_SOLUTION_OBJECT_INVALID:trig');
  });
});
