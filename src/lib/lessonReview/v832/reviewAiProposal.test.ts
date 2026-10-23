import { describe, expect, it } from 'vitest';
import { structuralLessonIR } from '../../lessonCompiler/v832/lessonIR.testFixture';
import { parseReviewAiProposal, reviewAiPrompt } from './reviewAiProposal';

describe('review AI proposal boundary', () => {
  it('sends one relevant activity without raw learner evidence or future activity content', () => {
    const lesson = structuralLessonIR();
    lesson.learnerContext.evidence.push({ id: 'private-one', type: 'unknown', summary: 'PRIVATE_LEARNER_NAME' } as never);
    lesson.timeline.push({ ...structuredClone(lesson.timeline[0]), id: 'A2', order: 2,
      presenter: { ...lesson.timeline[0].presenter, exactCopy: { vi: 'FUTURE_ACTIVITY_SECRET' } } });
    const prompt = reviewAiPrompt(lesson, { teacherMessage: 'Sản phẩm Coach còn là placeholder.', activityId: 'A1',
      role: 'presenter', locale: 'vi', sourceStatus: 'SOURCE_VERIFICATION_REQUIRED' });
    expect(prompt).toContain('Sản phẩm Coach còn là placeholder.');
    expect(prompt).toContain('Lời giải');
    expect(prompt).not.toContain('PRIVATE_LEARNER_NAME');
    expect(prompt).not.toContain('FUTURE_ACTIVITY_SECRET');
  });

  it('parses one typed IR proposal and rejects non-JSON or missing classification', () => {
    const parsed = parseReviewAiProposal('```json\n{"classification":{"primary":"COACH_STUDENT_MIRROR_IR","secondary":[],"targetLayer":"LESSON_IR","confidence":0.96,"rationale":"Placeholder Coach chưa đúng","affectedPaths":["timeline/A1/coach"],"severity":"P2"},"proposal":{"op":"UPDATE_ACTIVITY","targetId":"A1","changes":{"studentAction":"Viết lời giải"}}}\n```');
    expect(parsed.classification.targetLayer).toBe('LESSON_IR');
    expect(parsed.proposal?.targetId).toBe('A1');
    expect(() => parseReviewAiProposal('not JSON')).toThrow('AI_REPAIR_JSON_INVALID');
    expect(() => parseReviewAiProposal('{"proposal":{}}')).toThrow('AI_REPAIR_CLASSIFICATION_INVALID');
  });
});
