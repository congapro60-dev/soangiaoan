import { describe, expect, it } from 'vitest';
import { buildAuthoringContext } from './authoringContext';
import { parseMathVisualExtension } from '../../lessonRuntime/v84/mathVisual/extension';
import { solveTrigEquation } from '../../lessonRuntime/v84/mathVisual/trigEquation';
import { resolveGeometry2D, validateGeometry2DInvariants } from '../../lessonRuntime/v84/mathVisual/geometry2d';
import { sequenceRows, validateSequenceInvariants } from '../../lessonRuntime/v84/mathVisual/sequence';
import { validateV84ActivityBudgets } from '../../lessonRuntime/v84/budgetContract';
import { structuralLessonIR } from './lessonIR.testFixture';

const context = buildAuthoringContext();

describe('authoring context contract', () => {
  it('is parser-valid when composed with synthetic lesson IDs', () => {
    const lesson = structuralLessonIR();
    lesson.timeline = context.fragments.map((fragment, index) => ({ ...lesson.timeline[0], id: fragment.activityId, order: index + 1, durationSec: 600, questionInstances: [] })) as never;
    lesson.visuals = Object.fromEntries(context.fragments.map(fragment => {
      const model = fragment.contract.renderer === 'geometry_2d' ? fragment.contract.model : null;
      const modelObjects = model ? [...model.points.map(point => point.id), ...model.segments.map(segment => segment.id)] : [];
      return [fragment.visualId, { id: fragment.visualId, type: 'simulation', objects: [...new Set([...fragment.contract.answerBearingObjectIds, ...modelObjects, 'safe_object'])], states: { task: { visibleObjects: ['safe_object'] }, reveal: { visibleObjects: fragment.contract.answerBearingObjectIds } } }];
    })) as never;
    lesson.extensions = { mathVisualSimulation: { version: '1.0', assets: Object.fromEntries(context.fragments.map(fragment => [fragment.visualId, fragment.contract])) } };
    expect(Object.keys(parseMathVisualExtension(lesson))).toHaveLength(4);
    const geometry = context.fragments[1].contract as any;
    expect(validateGeometry2DInvariants(resolveGeometry2D(geometry.model), geometry.invariants)).toEqual([]);
    expect(validateSequenceInvariants(context.fragments[2].contract.model as never)).toEqual([]);
    expect(sequenceRows(context.fragments[2].contract.model as never).map(row => row.value)).toEqual([3, 5, 7, 9]);
    expect(solveTrigEquation(context.fragments[3].contract.model as never).roots.length).toBeGreaterThan(0);
  });

  it('keeps every answer-bearing object out of task visibility', () => {
    for (const fragment of context.fragments) expect(fragment.contract.answerBearingObjectIds).not.toContain('safe_object');
  });

  it('rejects a task state that exposes an answer-bearing object', () => {
    const lesson = structuralLessonIR();
    const fragment = context.fragments[0];
    lesson.timeline[0].id = fragment.activityId;
    lesson.visuals = {
      [fragment.visualId]: {
        id: fragment.visualId,
        type: 'simulation',
        objects: ['safe_object', ...fragment.contract.answerBearingObjectIds],
        states: { task: { visibleObjects: [fragment.contract.answerBearingObjectIds[0]] }, reveal: { visibleObjects: fragment.contract.answerBearingObjectIds } },
      },
    } as never;
    lesson.extensions = { mathVisualSimulation: { version: '1.0', assets: { [fragment.visualId]: fragment.contract } } };
    expect(() => parseMathVisualExtension(lesson)).toThrow(`VISUAL_SPOILER:${fragment.visualId}:task`);
  });

  it('rejects a reduced activity duration when its synthetic v84 budget no longer fits', () => {
    const lesson = structuralLessonIR();
    lesson.timeline[0] = { ...lesson.timeline[0], id: 'synthetic_activity_sequence', durationSec: 100, questionInstances: [{ instanceId: 'synthetic_instance_sequence', questionId: 'Q1', activityId: 'synthetic_activity_sequence', attemptMode: 'fresh', required: true, order: 1 }] };
    lesson.questions = { Q1: { id: 'Q1', prompt: { vi: 'Câu hỏi tổng hợp' }, expectedAnswer: { vi: 'Đáp án tổng hợp' }, evidenceTargets: ['SC1'], submissionModes: ['typed'], estimatedWorkTimeSec: 60, authoredSource: 'system_authored' } } as never;
    lesson.extensions = { v84: { version: '1.0', activityBudgets: { synthetic_activity_sequence: { introSec: 30, closeSec: 30, questions: { synthetic_instance_sequence: { statsSec: 15, revealDebriefSec: 30, transitionSec: 15 } } } } } };
    const result = validateV84ActivityBudgets(lesson);
    expect(result.status).toBe('INVALID');
    expect(result.issues).toContain('ACTIVITY_BUDGET_EXCEEDED:synthetic_activity_sequence:180>100');
  });

  it('defines budget examples only against synthetic IDs and existing rules', () => {
    expect(context.timing.activityBudgets.synthetic_activity_sequence.questions).toHaveProperty('synthetic_instance_sequence');
    expect(context.timing.rules.join(' ')).toContain('existing activity budget contract');
  });

  it('does not present synthetic math as source or learner evidence', () => {
    expect(JSON.stringify(context)).not.toContain('source_verified');
    expect(JSON.stringify(context)).not.toContain('teacher_observed');
    expect(context.fragments.every(fragment => fragment.contract.mathematicalAuthority === 'system_authored_pending_review')).toBe(true);
  });
});
