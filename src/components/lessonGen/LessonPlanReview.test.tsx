import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LessonPlanReview } from './LessonPlanReview';

describe('LessonPlanReview', () => {
  it('shows teacher-readable timeline, questions and assets instead of raw JSON', () => {
    const html = renderToStaticMarkup(<LessonPlanReview draft={{
      id: 'draft-1', sourceHash: 'hash', durationSec: 2400, status: 'review_ready',
      activities: [{ id: 'warmup', durationSec: 120, questionInstanceIds: ['q1@warmup'], assetIds: ['table'] }],
      questions: [{ id: 'q1', provenance: 'teacher_authored', prompt: 'Em dự đoán gì?', answerOrRubric: 'Rubric GV', hints: ['Nhìn bảng'], revealPolicy: 'teacher_manual' }],
      questionInstances: [{ id: 'q1@warmup', questionId: 'q1', activityId: 'warmup', attemptMode: 'fresh', evidenceFamilyId: 'prediction' }],
      assets: [{ id: 'table', provenance: 'teacher_authored', kind: 'deterministic_math_visual', activityIds: ['warmup'], fallback: 'Dùng bảng trên TV' }],
    }} onChangeQuestionPrompt={() => {}} />);
    expect(html).toContain('Kế hoạch để giáo viên duyệt');
    expect(html).toContain('Khởi động');
    expect(html).toContain('Em dự đoán gì?');
    expect(html).toContain('Sửa câu hỏi');
    expect(html).not.toContain('"questionInstances"');
  });
});
