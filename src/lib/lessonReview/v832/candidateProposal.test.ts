import { describe, expect, it } from 'vitest';
import { structuralLessonIR } from '../../lessonCompiler/v832/lessonIR.testFixture';
import { prepareReviewCandidate, routeReviewIssueLayer } from './candidateProposal';
import { computeLessonContentHash } from './repairLifecycle';

const classification = {
  primary: 'COACH_STUDENT_MIRROR_IR' as const, secondary: [], targetLayer: 'LESSON_IR' as const,
  confidence: 0.95, rationale: 'Sản phẩm Coach còn là văn bản mẫu tiếng Anh.',
  affectedPaths: ['timeline/A1/coach/studentMirror/expectedProduct'], severity: 'P2' as const,
};

describe('Review & Fix candidate safety', () => {
  it('builds a separate IR candidate and leaves all unrun acceptance gates visible', async () => {
    const lesson = structuralLessonIR();
    const original = await computeLessonContentHash(lesson);
    const updatedCoach = structuredClone(lesson.timeline[0].coach);
    updatedCoach.studentMirror.expectedProduct = 'Một lời giải có giải thích.';
    const result = await prepareReviewCandidate(lesson, classification, {
      op: 'UPDATE_ACTIVITY', targetId: 'A1', changes: { coach: updatedCoach },
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.candidate.lessonIR.timeline[0].coach.studentMirror.expectedProduct).toBe('Một lời giải có giải thích.');
    expect(lesson.timeline[0].coach.studentMirror.expectedProduct).toBe('Lời giải');
    expect(await computeLessonContentHash(lesson)).toBe(original);
    expect(result.candidate.parentVersion).toBe(lesson.lesson.lessonVersion);
    expect(result.changes).toEqual([{ path: '/timeline/A1/coach/studentMirror/expectedProduct',
      before: 'Lời giải', after: 'Một lời giải có giải thích.' }]);
    expect(result.qa).toMatchObject({ schema: 'PASS', references: 'PASS', budget: 'UNVALIDATED',
      browser: 'NOT_RUN', math: 'NOT_RUN', teacherApproval: 'PENDING' });
  });

  it('routes math/source/runtime/privacy complaints away from lesson-only repair', async () => {
    const lesson = structuralLessonIR();
    for (const primary of ['MATH_CORRECTNESS', 'SOURCE_CANONICAL', 'RUNTIME_ENGINE', 'PRIVACY_SECURITY'] as const) {
      const result = await prepareReviewCandidate(lesson, { ...classification, primary }, {
        op: 'UPDATE_ACTIVITY', targetId: 'A1', changes: { studentAction: 'Đổi nội dung' },
      });
      expect(result).toMatchObject({ accepted: false });
    }
  });

  it('rejects a patch that breaks paired Student/Coach references', async () => {
    const lesson = structuralLessonIR();
    const coach = structuredClone(lesson.timeline[0].coach);
    coach.studentMirror.studentPrompt.vi = 'Nhiệm vụ khác';
    const result = await prepareReviewCandidate(lesson, { ...classification,
      affectedPaths: ['timeline/A1/coach/studentMirror/studentPrompt'] }, {
      op: 'UPDATE_ACTIVITY', targetId: 'A1', changes: { coach },
    });
    expect(result).toMatchObject({ accepted: false });
    if ('issues' in result) expect(result.issues).toContain('COACH_STUDENT_PROMPT_MISMATCH:A1');
  });

  it('rejects unclassified timing and answer changes even when the schema remains valid', async () => {
    const lesson = structuralLessonIR();
    const timing = await prepareReviewCandidate(lesson, { ...classification,
      primary: 'LOCALE_COPY', affectedPaths: ['timeline/A1'] }, {
      op: 'CHANGE_TIMING', targetId: 'A1', changes: { durationSec: 2100 },
    });
    expect(timing).toMatchObject({ accepted: false });
    if ('issues' in timing) expect(timing.issues).toContain('PATCH_REQUIRES_TIMING_SCOPE');
    const coach = structuredClone(lesson.timeline[0].coach);
    coach.studentMirror.correctAnswerOrRubric = 'Đáp án bị đổi';
    const answer = await prepareReviewCandidate(lesson, { ...classification,
      affectedPaths: ['timeline/A1/coach'] }, { op: 'UPDATE_ACTIVITY', targetId: 'A1', changes: { coach } });
    expect(answer).toMatchObject({ accepted: false });
    if ('issues' in answer) expect(answer.issues).toContain('PATCH_REQUIRES_QUESTION_SCOPE');
  });

  it('rejects changes outside declared fields and routes protected secondary classifications', async () => {
    const lesson = structuralLessonIR();
    const coach = structuredClone(lesson.timeline[0].coach);
    coach.purpose = 'Mục đích ngoài trường đã khai báo';
    const result = await prepareReviewCandidate(lesson, classification,
      { op: 'UPDATE_ACTIVITY', targetId: 'A1', changes: { coach } });
    expect(result).toMatchObject({ accepted: false });
    if ('issues' in result) expect(result.issues).toContain('PATCH_OUTSIDE_DECLARED_PATH:/timeline/A1/coach/purpose');
    expect(routeReviewIssueLayer({ ...classification, secondary: ['SOURCE_CANONICAL'] })).toBe('SOURCE_REVIEW');
    expect(routeReviewIssueLayer({ ...classification, secondary: ['PRIVACY_SECURITY'] })).toBe('SHARED_ENGINE');
  });

  it('applies a sparse nested patch without deleting the rest of Coach or changing the original', async () => {
    const lesson = structuralLessonIR();
    const beforeCoach = structuredClone(lesson.timeline[0].coach);
    const result = await prepareReviewCandidate(lesson, classification, {
      op: 'UPDATE_ACTIVITY', targetId: 'A1', changes: {
        coach: { studentMirror: { expectedProduct: 'Một lời giải kèm bước kiểm tra.' } },
      },
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.candidate.lessonIR.timeline[0].coach).toEqual({ ...beforeCoach,
      studentMirror: { ...beforeCoach.studentMirror, expectedProduct: 'Một lời giải kèm bước kiểm tra.' } });
    expect(lesson.timeline[0].coach).toEqual(beforeCoach);
    expect(result.changes).toHaveLength(1);
  });

  it('rejects prototype keys before expanding sparse changes', async () => {
    const result = await prepareReviewCandidate(structuralLessonIR(), classification, {
      op: 'UPDATE_ACTIVITY', targetId: 'A1',
      changes: JSON.parse('{"coach":{"__proto__":{"polluted":true}}}'),
    });
    expect(result).toMatchObject({ accepted: false });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
