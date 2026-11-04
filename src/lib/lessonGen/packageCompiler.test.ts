import { describe, expect, it } from 'vitest';
import { compileLessonPackage } from './packageCompiler';
import type { LessonPlanDraft } from './planValidator';

const plan: LessonPlanDraft = {
  id: 'draft-1', sourceHash: 'source-1', durationSec: 2400, status: 'plan_approved',
  activities: [{ id: 'warmup', durationSec: 120, questionInstanceIds: ['q1@warmup'], assetIds: [] }],
  questions: [{ id: 'q1', provenance: 'teacher_authored', prompt: 'Em dự đoán gì?', answerOrRubric: 'Rubric riêng', hints: ['Quan sát bảng'], revealPolicy: 'teacher_manual' }],
  questionInstances: [{ id: 'q1@warmup', questionId: 'q1', activityId: 'warmup', attemptMode: 'fresh', evidenceFamilyId: 'prediction' }],
  assets: [],
};

describe('lesson package compiler', () => {
  it('creates an immutable versioned package with public copy but no private rubric', async () => {
    const packageResult = await compileLessonPackage({ plan, lessonId: 'generated-1', revision: 3 });
    expect(packageResult).toMatchObject({ lessonId: 'generated-1', version: 'r3', sourceHash: 'source-1' });
    expect(packageResult.publicManifest.activities[0].questionPrompt).toBe('Em dự đoán gì?');
    expect(JSON.stringify(packageResult.publicManifest)).not.toContain('Rubric riêng');
    expect(packageResult.privateManifest.questions[0].answerOrRubric).toBe('Rubric riêng');
  });

  it('refuses an unapproved plan', async () => {
    await expect(compileLessonPackage({ plan: { ...plan, status: 'review_ready' }, lessonId: 'generated-1', revision: 3 })).rejects.toThrow('duyệt');
  });
});
