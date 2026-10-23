import { describe, expect, it } from 'vitest';
import { structuralLessonIR } from '../../lessonCompiler/v832/lessonIR.testFixture';
import { diffReviewCandidate, inspectClassifiedChanges, inspectReviewScope } from './candidateChanges';

const copyClassification = {
  primary: 'LOCALE_COPY' as const, secondary: [], targetLayer: 'LESSON_IR' as const,
  confidence: 0.95, rationale: 'Sửa câu chữ', affectedPaths: ['timeline/A1'], severity: 'P2' as const,
};

describe('classified composite changes', () => {
  it('detects protected fields inside an added array entry', () => {
    const lesson = structuralLessonIR();
    const candidate = structuredClone(lesson);
    candidate.timeline.push({ ...structuredClone(lesson.timeline[0]), id: 'A2' });
    const changes = diffReviewCandidate(lesson, candidate);
    const issues = inspectClassifiedChanges(changes, { ...copyClassification, affectedPaths: ['timeline'] });
    expect(issues).toContain('PATCH_REQUIRES_TIMING_SCOPE');
    expect(issues).toContain('PATCH_REQUIRES_LEARNING_GOAL_SCOPE');
  });

  it('detects a protected optional field when added or removed', () => {
    const lesson = structuralLessonIR();
    const candidate = structuredClone(lesson);
    candidate.timeline[0].privacy = 'Keep student names private';
    for (const [before, after] of [[lesson, candidate], [candidate, lesson]]) {
      expect(inspectClassifiedChanges(diffReviewCandidate(before, after), copyClassification))
        .toContain('PATCH_REQUIRES_SECURITY_REVIEW');
    }
  });

  it('does not treat unchanged protected siblings as changes in a sparse copy edit', () => {
    const lesson = structuralLessonIR();
    const candidate = structuredClone(lesson);
    candidate.timeline[0].coach.purpose = 'Quan sát cách giải thích của học sinh';
    expect(inspectClassifiedChanges(diffReviewCandidate(lesson, candidate), copyClassification)).toEqual([]);
  });
});

describe('review-request scope', () => {
  it('permits the current activity but refuses another activity for a screen request', () => {
    const lesson = structuralLessonIR();
    const change = { path: '/timeline/A2/studentAction', before: 'A', after: 'B' };
    expect(inspectReviewScope(lesson, 'A1', 'screen', [change])).toEqual(['PATCH_OUTSIDE_REVIEW_SCOPE:/timeline/A2/studentAction']);
    expect(inspectReviewScope(lesson, 'A1', 'lesson', [change])).toEqual([]);
    expect(inspectReviewScope(lesson, 'A1', 'runtime', [change])).toEqual(['PATCH_RUNTIME_SCOPE_REQUIRES_ENGINE']);
    expect(inspectReviewScope(lesson, 'A1', 'screen', [{ ...change, path: '/timeline/A1/studentAction' }])).toEqual([]);
  });
});
