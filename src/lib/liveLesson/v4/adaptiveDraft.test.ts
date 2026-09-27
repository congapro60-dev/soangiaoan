import { describe, expect, it } from 'vitest';
import { buildBanToanV4AdaptiveLessonDraft } from './adaptiveDraft';
import { getAllBanToanV4Contracts, getBanToanV4Contract } from './lessonAdapter';
import { validateAdaptiveLessonPublishReadiness } from '../../adaptive/adaptiveFromLessonPlan';

describe('V4 Ban Toán adaptive lesson draft', () => {
  it('creates a deterministic draft that the existing lesson editor can store', () => {
    const lesson = buildBanToanV4AdaptiveLessonDraft('10-5-31', 'teacher-1', '2026-08-30T10:00:00.000Z');

    expect(lesson).toMatchObject({
      id: 'adaptive-v4-10-5-31-teacher-1',
      title: 'Bất phương trình bậc nhất hai ẩn — Tiết 1',
      subjectId: 'math',
      grade: '10',
      status: 'draft',
      teacherId: 'teacher-1',
      durationMinutes: 40,
      curriculumRef: { programType: 'TDS', week: '5', period: 31, lessonCode: '10-5-31' },
    });
    expect(lesson.fiveStepFlow.steps).toHaveLength(5);
    expect(lesson.fiveStepFlow.steps.reduce((sum, step) => sum + step.estimatedMinutes, 0)).toBe(40);
    expect(lesson.objectives.length).toBeGreaterThanOrEqual(3);
    expect(lesson.knowledgeUnits[0]?.routes.map((route) => route.route)).toEqual(['foundation', 'standard', 'challenge']);
    expect(lesson.diagnosticTest.questions).toHaveLength(5);
    expect(lesson.knowledgeUnits[0]?.quickCheck.questions).toHaveLength(2);
    expect(lesson.exitTicket.questions).toHaveLength(3);
    expect(lesson.knowledgeUnits[0]?.routes[1]?.workedExamples[0]?.solution).toContain('Mô hình:');
    expect(lesson.knowledgeUnits[0]?.routes[1]?.practiceTasks[0]?.expectedAnswer).toBe(
      getBanToanV4Contract('10-5-31').sourceContent?.exercises.find((item) => item.level === 'TH')?.answer,
    );
    expect(lesson.generationWarnings?.join(' ')).toContain('candidate');
  });

  it('preserves elective status as a learner choice, not a fixed ability label', () => {
    const lesson = buildBanToanV4AdaptiveLessonDraft('10-5-37', 'teacher-1');

    expect(lesson.generationWarnings?.join(' ')).toContain('elective-practice');
    expect(lesson.knowledgeUnits[0]?.routes.every((route) => route.explanation.includes('có thể đổi'))).toBe(true);
  });

  it('keeps all 48 generated drafts content-complete enough for the existing editor gate', () => {
    for (const contract of getAllBanToanV4Contracts()) {
      const lesson = buildBanToanV4AdaptiveLessonDraft(contract.sourceKey, 'teacher-qa');
      const codes = new Set(validateAdaptiveLessonPublishReadiness(lesson).map((issue) => issue.code));

      expect(lesson.diagnosticTest.questions).toHaveLength(5);
      expect(lesson.knowledgeUnits[0]?.quickCheck.questions).toHaveLength(2);
      expect(lesson.exitTicket.questions).toHaveLength(3);
      expect(codes.has('insufficient_diagnostic')).toBe(false);
      expect(codes.has('insufficient_quick_check')).toBe(false);
      expect(codes.has('insufficient_exit_ticket')).toBe(false);
      expect(codes.has('invalid_worked_example')).toBe(false);
      expect(codes.has('invalid_question_options')).toBe(false);
    }
  });
});
