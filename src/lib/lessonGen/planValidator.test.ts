import { describe, expect, it } from 'vitest';
import {
  buildQuestionInstanceId,
  validateLessonPlanDraft,
  type LessonPlanDraft,
} from './planValidator';

const validDraft = (): LessonPlanDraft => ({
  id: 'draft-sequence',
  sourceHash: 'source-1',
  durationSec: 2400,
  status: 'review_ready',
  activities: [
    {
      id: 'practice',
      durationSec: 600,
      questionInstanceIds: ['q-practice@practice'],
      assetIds: ['sequence-table'],
    },
    {
      id: 'postcheck',
      durationSec: 900,
      questionInstanceIds: ['q-post@postcheck'],
      assetIds: [],
    },
    {
      id: 'exit',
      durationSec: 900,
      questionInstanceIds: ['q-exit@exit'],
      assetIds: [],
    },
  ],
  questions: [
    {
      id: 'q-practice',
      provenance: 'teacher_authored',
      prompt: 'Tính u_4.',
      answerOrRubric: 'u_4=9.',
      hints: ['Thay n=4.'],
      revealPolicy: 'show_after_submit',
    },
    {
      id: 'q-post',
      provenance: 'canonical',
      prompt: 'Tính u_5.',
      answerOrRubric: 'u_5=11.',
      hints: ['Thay n=5.'],
      revealPolicy: 'teacher_manual',
    },
    {
      id: 'q-exit',
      provenance: 'canonical',
      prompt: 'Số 7 trong u_7 cho biết gì?',
      answerOrRubric: 'Vị trí số hạng.',
      hints: ['Đọc chỉ số.'],
      revealPolicy: 'teacher_manual',
    },
  ],
  questionInstances: [
    { id: 'q-practice@practice', questionId: 'q-practice', activityId: 'practice', attemptMode: 'fresh', evidenceFamilyId: 'practice-substitution' },
    { id: 'q-post@postcheck', questionId: 'q-post', activityId: 'postcheck', attemptMode: 'fresh', evidenceFamilyId: 'post-substitution' },
    { id: 'q-exit@exit', questionId: 'q-exit', activityId: 'exit', attemptMode: 'fresh', evidenceFamilyId: 'exit-index' },
  ],
  assets: [
    {
      id: 'sequence-table',
      provenance: 'teacher_authored',
      kind: 'deterministic_math_visual',
      activityIds: ['practice'],
      fallback: 'Bảng n và u_n trên TV.',
    },
  ],
});

describe('LessonGen plan validator', () => {
  it('builds a stable question instance id', () => {
    expect(buildQuestionInstanceId('q-exit', 'exit')).toBe('q-exit@exit');
  });

  it('allows a review-ready plan with sourced questions, unique instances and bound assets', () => {
    expect(validateLessonPlanDraft(validDraft())).toEqual([]);
  });

  it('blocks plan approval when a canonical question has not been verified', () => {
    const draft = validDraft();
    draft.questions[1].provenance = 'source_verification_required';

    expect(validateLessonPlanDraft(draft)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SOURCE_VERIFICATION_REQUIRED', path: 'questions.q-post' }),
    ]));
  });

  it('rejects reusing one question instance for post-check and exit evidence', () => {
    const draft = validDraft();
    draft.activities[2].questionInstanceIds = ['q-post@postcheck'];

    expect(validateLessonPlanDraft(draft)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'QUESTION_INSTANCE_REUSED', path: 'activities.exit.questionInstanceIds' }),
    ]));
  });

  it('rejects an activity reference to an unbound visual asset', () => {
    const draft = validDraft();
    draft.activities[1].assetIds = ['sequence-table'];

    expect(validateLessonPlanDraft(draft)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ASSET_ACTIVITY_MISMATCH', path: 'activities.postcheck.assetIds' }),
    ]));
  });

  it('rejects an empty AI plan instead of compiling placeholder classroom content', () => {
    const draft = validDraft();
    draft.activities = [];
    draft.questions = [];
    draft.questionInstances = [];

    expect(validateLessonPlanDraft(draft)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ACTIVITY_REQUIRED' }),
      expect.objectContaining({ code: 'QUESTION_REQUIRED' }),
    ]));
  });
});
