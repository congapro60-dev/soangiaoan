import { describe, expect, it } from 'vitest';
import { generateLessonPlanDraft } from './generationPipeline';

describe('lesson generation pipeline', () => {
  it('rejects a model result that is not a structured plan draft', async () => {
    await expect(generateLessonPlanDraft({
      prompt: 'x',
      invoke: async () => '{"title":"missing required fields"}',
    })).rejects.toThrow('schema');
  });

  it('returns validated structured output and records its input hash', async () => {
    const draft = await generateLessonPlanDraft({
      prompt: 'x',
      sourceHash: 'source-1',
      invoke: async () => JSON.stringify({
        id: 'draft-1', sourceHash: 'source-1', durationSec: 2400, status: 'review_ready',
        activities: [{ id: 'warmup', durationSec: 2400, questionInstanceIds: ['q1@warmup'], assetIds: [] }],
        questions: [{ id: 'q1', provenance: 'teacher_authored', prompt: 'Dự đoán quy luật.', answerOrRubric: 'GV duyệt.', hints: [], revealPolicy: 'teacher_manual' }],
        questionInstances: [{ id: 'q1@warmup', questionId: 'q1', activityId: 'warmup', attemptMode: 'fresh', evidenceFamilyId: 'prediction' }], assets: [],
      }),
    });
    expect(draft).toMatchObject({ id: 'draft-1', sourceHash: 'source-1', status: 'review_ready' });
  });
});
