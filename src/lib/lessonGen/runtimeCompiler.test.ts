import { describe, expect, it } from 'vitest';
import { compileLessonPlanRuntime } from './runtimeCompiler';
import type { LessonPlanDraft } from './planValidator';

const draft: LessonPlanDraft = {
  id: 'draft-1', sourceHash: 'hash', durationSec: 2400, status: 'plan_approved',
  activities: [
    { id: 'warmup', durationSec: 1200, questionInstanceIds: ['q1@warmup'], assetIds: [] },
    { id: 'exit', durationSec: 1200, questionInstanceIds: ['q2@exit'], assetIds: [] },
  ],
  questions: [
    { id: 'q1', provenance: 'teacher_authored', prompt: 'Em nhận thấy gì?', answerOrRubric: 'GV xem', hints: [], revealPolicy: 'no_reveal' },
    { id: 'q2', provenance: 'teacher_authored', prompt: 'Điều gì em kiểm tra lại?', answerOrRubric: 'GV xem', hints: [], revealPolicy: 'teacher_manual' },
  ],
  questionInstances: [
    { id: 'q1@warmup', questionId: 'q1', activityId: 'warmup', attemptMode: 'fresh', evidenceFamilyId: 'warmup' },
    { id: 'q2@exit', questionId: 'q2', activityId: 'exit', attemptMode: 'fresh', evidenceFamilyId: 'exit' },
  ],
  assets: [],
};

describe('generated lesson runtime compiler', () => {
  it('compiles approved plan into a three-surface runtime without private rubric', () => {
    const definition = compileLessonPlanRuntime({ draft, lessonId: 'generated-1', title: 'Bài sinh từ giáo án' });
    expect(definition.lessonId).toBe('generated-1');
    expect(definition.cues).toHaveLength(3);
    expect(definition.responseSteps.map(step => step.id)).toEqual(['q1', 'q2']);
    expect(JSON.stringify(definition)).not.toContain('GV xem');
    expect(definition.cues.at(-1)?.id).toBe('P40');
  });
});
