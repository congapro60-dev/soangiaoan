import { describe, expect, it } from 'vitest';
import { structuralLessonIR } from './lessonIR.testFixture';
import { buildTeacherConfirmationCards, confirmTeacherDecision } from './confirmationReview';
import { inspectTeacherConfirmations } from './teacherConfirmation';
import { computeLessonContentHash } from '../../lessonReview/v832/repairLifecycle';

const lessonWithPending = () => {
  const lesson = structuralLessonIR();
  lesson.learnerContext.evidence = [
    { id: 'LE1', type: 'planning_assumption', summary: 'Một số em cần hỗ trợ kí hiệu.', requiresTeacherConfirmation: true, materialForReadyToTeach: true },
    { id: 'LE2', type: 'planning_assumption', summary: 'Chuẩn bị hình khác để giải thích.', requiresTeacherConfirmation: true, materialForReadyToTeach: true },
  ];
  lesson.qualityAudit.teacherConfirmationsRequired = [
    { id: 'FDC1', reason: 'Xác nhận ngưỡng can thiệp và recheck.', materialForReadyToTeach: true, resolved: false },
  ];
  return lesson;
};

describe('grouped Teacher Confirmation review', () => {
  it('groups one learner-context decision without absorbing an unrelated FDC confirmation', () => {
    const lesson = lessonWithPending();
    const cards = buildTeacherConfirmationCards(lesson, { LE1: 'learner-context', LE2: 'learner-context', FDC1: 'formative-cycle' });
    expect(cards).toHaveLength(2);
    expect(cards.find(card => card.key === 'learner-context')?.refs).toEqual(['learnerEvidence:LE1', 'learnerEvidence:LE2']);
    expect(cards.find(card => card.key === 'formative-cycle')?.refs).toEqual(['qualityAudit:FDC1']);
  });

  it('keeps blank group selections as separate decisions', () => {
    const cards = buildTeacherConfirmationCards(lessonWithPending(), {
      'learnerEvidence:LE1': '', 'learnerEvidence:LE2': '', 'qualityAudit:FDC1': '',
    });
    expect(cards).toHaveLength(3);
  });

  it('confirms a grouped decision with an audit record while preserving assumption types', async () => {
    const lesson = lessonWithPending();
    const hash = await computeLessonContentHash(lesson);
    const card = buildTeacherConfirmationCards(lesson, { LE1: 'learner-context', LE2: 'learner-context' })
      .find(item => item.key === 'learner-context')!;
    const result = await confirmTeacherDecision(lesson, card, {
      teacherUid: 'teacher-1', baseLessonVersion: lesson.lesson.lessonVersion,
      baseContentHash: hash, decision: 'confirm_planning_assumption',
      rationale: 'Tôi đã đối chiếu với bài làm gần đây và sẽ chuẩn bị hai cách hỗ trợ.',
      confirmedAt: '2026-09-24T08:00:00.000Z',
    });
    expect(result.lessonIR.learnerContext.evidence.map(item => item.confirmedByTeacher)).toEqual([true, true]);
    expect(result.lessonIR.learnerContext.evidence.map(item => item.type)).toEqual(['planning_assumption', 'planning_assumption']);
    expect(result.lessonIR.qualityAudit.teacherConfirmationsRequired[0].resolved).toBe(false);
    expect(result.audit.confirmationRefs).toEqual(['learnerEvidence:LE1', 'learnerEvidence:LE2']);
    expect(result.audit.teacherUid).toBe('teacher-1');
    expect(inspectTeacherConfirmations(result.lessonIR).releaseBlocked).toBe(true);
    expect(lesson.learnerContext.evidence[0].confirmedByTeacher).toBeUndefined();
  });

  it('confirms one card that explicitly groups learner context with its quality audit record', async () => {
    const lesson = lessonWithPending();
    const card = buildTeacherConfirmationCards(lesson, { LE1: 'learner-context', FDC1: 'learner-context' })
      .find(item => item.key === 'learner-context')!;
    const result = await confirmTeacherDecision(lesson, card, {
      teacherUid: 'teacher-1', baseLessonVersion: lesson.lesson.lessonVersion,
      baseContentHash: await computeLessonContentHash(lesson), decision: 'confirm_group',
      acknowledgedRefs: card.refs,
      rationale: 'Tôi đã đọc cả căn cứ về lớp và ngưỡng can thiệp; kế hoạch này phù hợp.',
      confirmedAt: '2026-09-24T08:00:00.000Z',
    });
    expect(result.lessonIR.learnerContext.evidence[0].confirmedByTeacher).toBe(true);
    expect(result.lessonIR.qualityAudit.teacherConfirmationsRequired[0].resolved).toBe(true);
    expect(result.lessonIR.learnerContext.evidence[1].confirmedByTeacher).toBeUndefined();
  });

  it('rejects stale cards, an empty rationale, and unacknowledged mixed-source members', async () => {
    const lesson = lessonWithPending();
    const card = buildTeacherConfirmationCards(lesson, { LE1: 'learner-context', FDC1: 'learner-context' })
      .find(item => item.key === 'learner-context')!;
    const input = {
      teacherUid: 'teacher-1', baseLessonVersion: lesson.lesson.lessonVersion,
      baseContentHash: await computeLessonContentHash(lesson), decision: 'confirm_planning_assumption' as const,
      rationale: 'Đã kiểm tra đầy đủ.', confirmedAt: '2026-09-24T08:00:00.000Z',
    };
    await expect(confirmTeacherDecision(lesson, card, input)).rejects.toThrow(/MIXED_GROUP_ACKNOWLEDGEMENT_REQUIRED/);
    const learnerCard = buildTeacherConfirmationCards(lesson, { LE1: 'learner-context' }).find(item => item.key === 'learner-context')!;
    await expect(confirmTeacherDecision(lesson, learnerCard, { ...input, baseContentHash: 'stale' })).rejects.toThrow(/CONTENT_HASH/);
    await expect(confirmTeacherDecision(lesson, learnerCard, { ...input, rationale: ' ' })).rejects.toThrow(/RATIONALE/);
  });
});
