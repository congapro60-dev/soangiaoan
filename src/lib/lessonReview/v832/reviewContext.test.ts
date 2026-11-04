import { describe, expect, it } from 'vitest';
import { structuralLessonIR } from '../../lessonCompiler/v832/lessonIR.testFixture';
import { captureReviewContext } from './reviewContext';

const capture = {
  role: 'student' as const,
  activityId: 'A1',
  locale: 'vi' as const,
  viewport: { width: 390, height: 844, devicePixelRatio: 3 },
  revealStep: 0,
  visualStateId: 'initial',
  attentionSurface: 'student_device',
  handoffState: 'DEVICE_WORK',
  roomStateRevision: 7,
  contentHash: 'hash-1',
  buildId: 'build-1',
  compilerVersion: '8.3.2',
  runtimeVersion: '8.3.2',
  route: '/lesson/student',
  screenshotAssetId: 'shot-1',
  visibleComponentIds: ['student-prompt'],
};

describe('Review & Fix context capture', () => {
  it('captures exact room and pedagogical context without inventing learner evidence', () => {
    const lesson = structuralLessonIR();
    const context = captureReviewContext(lesson, capture);
    expect(context).toMatchObject({
      lessonId: 'structural-test-only', lessonVersion: '0.0.1', activityId: 'A1',
      role: 'student', revealStep: 0, visualStateId: 'initial', handoffState: 'DEVICE_WORK',
      roomStateRevision: 7, screenshotAssetId: 'shot-1',
      pedagogical: { objectiveRefs: ['LI1'], expectedEvidence: 'Lời giải', learnerEvidenceProvenance: [], planningAssumptions: [] },
    });
    expect(context.pedagogical.successCriteria).toHaveLength(1);
  });

  it('preserves assumption provenance instead of presenting it as observed fact', () => {
    const lesson = structuralLessonIR();
    lesson.learnerContext.evidence.push({ id: 'LE1', type: 'planning_assumption', summary: 'Giả định thử', requiresTeacherConfirmation: true });
    expect(captureReviewContext(lesson, capture).pedagogical.planningAssumptions).toEqual([
      expect.objectContaining({ id: 'LE1', type: 'planning_assumption' }),
    ]);
  });

  it('rejects stale activity context instead of matching a different screen', () => {
    expect(() => captureReviewContext(structuralLessonIR(), { ...capture, activityId: 'missing' })).toThrow(/activity/);
  });
});
