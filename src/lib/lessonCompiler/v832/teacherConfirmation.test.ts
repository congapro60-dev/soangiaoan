import { describe, expect, it } from 'vitest';
import { structuralLessonIR } from './lessonIR.testFixture';
import { inspectTeacherConfirmations } from './teacherConfirmation';

describe('teacher confirmations and provenance', () => {
  it('blocks teaching for an unresolved material planning assumption without turning it into fact', () => {
    const lesson = structuralLessonIR();
    lesson.learnerContext.evidence.push({
      id: 'LE-1', type: 'planning_assumption', summary: 'Một số em có thể chưa quen kí hiệu.',
      requiresTeacherConfirmation: true, materialForReadyToTeach: true,
    });

    const result = inspectTeacherConfirmations(lesson);
    expect(result.releaseBlocked).toBe(true);
    expect(result.pending).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'LE-1', source: 'learnerEvidence', material: true }),
    ]));
    expect(lesson.learnerContext.evidence[0].type).toBe('planning_assumption');
  });

  it('keeps nonmaterial assumptions visible without blocking release', () => {
    const lesson = structuralLessonIR();
    lesson.learnerContext.evidence.push({
      id: 'LE-2', type: 'planning_assumption', summary: 'Có thể dùng bảng phụ.',
      requiresTeacherConfirmation: true, materialForReadyToTeach: false,
    });
    const result = inspectTeacherConfirmations(lesson);
    expect(result.releaseBlocked).toBe(false);
    expect(result.pending).toHaveLength(1);
  });

  it('treats missing materiality on an unconfirmed assumption conservatively', () => {
    const lesson = structuralLessonIR();
    lesson.learnerContext.evidence.push({
      id: 'LE-unknown-materiality', type: 'planning_assumption', summary: 'Nhu cầu hỗ trợ chưa rõ.',
      requiresTeacherConfirmation: true,
    });
    expect(inspectTeacherConfirmations(lesson).releaseBlocked).toBe(true);
  });

  it('blocks release for material quality-audit confirmations', () => {
    const lesson = structuralLessonIR();
    lesson.qualityAudit.teacherConfirmationsRequired.push({
      id: 'FDC-1', reason: 'GV cần xác nhận ngưỡng can thiệp.', materialForReadyToTeach: true, resolved: false,
    });
    expect(inspectTeacherConfirmations(lesson).releaseBlocked).toBe(true);
  });

  it('flags observed learner evidence without provenance instead of confirming it', () => {
    const lesson = structuralLessonIR();
    lesson.learnerContext.evidence.push({
      id: 'LE-3', type: 'teacher_observed', summary: 'Ba học sinh đang gặp khó.', requiresTeacherConfirmation: false,
    });
    expect(inspectTeacherConfirmations(lesson).provenanceIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ evidenceId: 'LE-3', code: 'OBSERVED_WITHOUT_SOURCE' }),
    ]));
  });
});
