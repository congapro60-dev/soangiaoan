import { describe, expect, it } from 'vitest';
import { structuralLessonIR } from './lessonIR.testFixture';
import { freezeReviewedDesign } from './designGate';
import type { LearningQualityResult } from './qualityGate';

const quality: LearningQualityResult = { status: 'NEEDS_TEACHER_CONFIRMATION', passedRules: [], failedRules: [],
  pendingRules: [], warnings: [], teacherConfirmationsRequired: [{ id: 'pending', reason: 'Căn cứ về lớp', materialForReadyToTeach: true }],
  derivedBadges: { differentiation: false, global_intercultural: false, digital_citizenship: false, assessment_for_learning: false } };

describe('teacher-reviewed design freeze', () => {
  it('blocks before source/quality review and never claims browser or teacher-ready approval', () => {
    const lesson = structuralLessonIR();
    expect(() => freezeReviewedDesign(lesson, quality)).toThrow('SOURCE_GATE');
    lesson.sourceVerification.status = 'VERIFIED';
    lesson.sourceVerification.unresolved = [];
    lesson.sourceVerification.canonicalSources = [{ sourceId: 'teacher-source', name: 'Giáo án đã duyệt', kind: 'teacher_lesson_plan' }];
    expect(() => freezeReviewedDesign(lesson, { ...quality, status: 'BLOCKED', pendingRules: ['M01'] })).toThrow('QUALITY_GATE');
  });

  it('permits design preview with a pending material confirmation and preserves the original', () => {
    const lesson = structuralLessonIR();
    lesson.sourceVerification.status = 'VERIFIED';
    lesson.sourceVerification.unresolved = [];
    lesson.sourceVerification.canonicalSources = [{ sourceId: 'teacher-source', name: 'Giáo án đã duyệt', kind: 'teacher_lesson_plan' }];
    const next = freezeReviewedDesign(lesson, quality);
    expect(lesson.buildStatus).toBe('QUALITY_AUDIT');
    expect(next.buildStatus).toBe('DESIGN_FROZEN');
    expect(next.qualityAudit.status).toBe('NEEDS_TEACHER_CONFIRMATION');
    expect(next.qualityAudit.teacherConfirmationsRequired[0]).toMatchObject({ id: 'pending', resolved: false });
  });

  it('validates present V8.8.1 experience and fails closed with proper precedence', () => {
    const lesson = structuralLessonIR();
    lesson.sourceVerification.status = 'VERIFIED';
    lesson.sourceVerification.unresolved = [];
    lesson.sourceVerification.canonicalSources = [{ sourceId: 'teacher-source', name: 'Giáo án đã duyệt', kind: 'teacher_lesson_plan' }];
    lesson.extensions = { v871Experience: { invalid: true } };
    expect(() => freezeReviewedDesign(lesson, quality)).toThrow(/V871_EXPERIENCE_BLOCKED/);
  });

  it('preserves error precedence: source and V8.4 timing before V8.8.1 experience', () => {
    const lesson = structuralLessonIR();
    lesson.extensions = { v871Experience: { invalid: true } };
    // 1. Source verification fails first
    expect(() => freezeReviewedDesign(lesson, quality)).toThrow('SOURCE_GATE_NOT_VERIFIED');

    // Make source pass
    lesson.sourceVerification.status = 'VERIFIED';
    lesson.sourceVerification.unresolved = [];
    lesson.sourceVerification.canonicalSources = [{ sourceId: 'teacher-source', name: 'Giáo án đã duyệt', kind: 'teacher_lesson_plan' }];

    // 2. Introduce invalid V8.4 budget alongside invalid V8.8.1
    lesson.extensions.v84 = { version: 'invalid-version', activityBudgets: {} };
    expect(() => freezeReviewedDesign(lesson, quality)).toThrow(/DESIGN_TIMING_INVALID/);
  });
});
