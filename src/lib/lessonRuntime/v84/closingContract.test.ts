import { describe, expect, it } from 'vitest';
import { synthesizeV84Closing, type V84ClosingInput } from './closingContract';

const base = (): V84ClosingInput => ({
  roomId: 'room-1', closingRevision: 2, contentHash: 'a'.repeat(64),
  roster: [
    { studentId: 's1', name: 'An', participantUid: 'u1', attendance: 'PRESENT' as const },
    { studentId: 's2', name: 'Bình', participantUid: 'u2', attendance: 'PRESENT' as const },
  ],
  exitItems: [{ instanceId: 'exit-1', questionId: 'q1', criterionIds: ['SC1'], supportsExactEvaluation: true }],
  responses: [
    { studentId: 's1', participantUid: 'u1', instanceId: 'exit-1', revision: 1, value: '4',
      evaluated: 'correct' as const, evidenceType: 'exact_answer' as const },
  ],
  selfAssessments: [{ studentId: 's1', participantUid: 'u1', revision: 1, criteria: [{ criterionId: 'SC1', value: 'achieved' as const }] }],
  nextStepOptions: [{ id: 'next-1', label: { vi: 'Làm thêm một bài tương tự', en: 'Try one more similar problem', ja: '同じ形式の問題にもう一度取り組む' }, taskRef: 'A3-Q2' }],
  nextSteps: [{ studentId: 's1', nextStepId: 'next-1', responseRevision: 1, taskRef: 'A3-Q2' }],
});

describe('V8.8.1 closing contract', () => {
  it('creates three separated outputs with anonymous public summary', () => {
    const result = synthesizeV84Closing(base());
    expect(result.status).toBe('needs_teacher_review');
    expect(result.publicClosing).not.toHaveProperty('studentId');
    expect(result.publicClosing).not.toHaveProperty('participantUid');
    expect(result.publicClosing.nextStepCounts).toEqual({ 'next-1': 1 });
    expect(result.studentClosing.s1).toMatchObject({ status: 'ready', nextActionCopy: { vi: 'Làm thêm một bài tương tự' } });
    expect(result.publicClosing.localeCopy.en.title).toBe('Class summary');
    expect(result.studentClosing.s1.evidenceStatementsByLocale.ja[0]).toContain('設問1');
    expect(result.studentClosing.s1.differentiatedHomework[0].labelCopy.en).toBe('Try one more similar problem');
    expect(result.studentClosing.s1).not.toHaveProperty('sourceRef');
    expect(result.studentClosing.s1).not.toHaveProperty('confidence');
    expect(result.teacherAnalytics.s1).toMatchObject({ studentId: 's1', studentName: 'An' });
    expect(result.teacherAnalytics.s2).toMatchObject({ studentId: 's2', requiresTeacherReview: true });
  });

  it('does not claim completion when Exit evidence or self-assessment is missing', () => {
    const input = base(); input.responses = []; input.selfAssessments = [];
    const result = synthesizeV84Closing(input);
    expect(result.status).toBe('collecting');
    expect(result.publicClosing.localeCopy.vi.classProgress).toContain('chưa đủ');
    expect(result.studentClosing.s1.status).toBe('collecting');
    expect(result.studentClosing.s1.differentiatedHomework).toEqual([]);
  });

  it('routes free text and photo evidence to teacher review without exposing internal labels', () => {
    const input = base(); input.responses[0].evaluated = 'unsupported'; input.responses[0].evidenceType = 'photo';
    const result = synthesizeV84Closing(input);
    expect(result.status).toBe('needs_teacher_review');
    const student = JSON.stringify(result.studentClosing.s1);
    expect(student).not.toMatch(/secure|developing|review|sourceRef|confidence/);
    expect(result.studentClosing.s1.teacherMessageCopy?.vi).toContain('thầy/cô');
  });

  it('is deterministic for the same closing revision and rejects duplicate response revisions', () => {
    const input = base();
    const result1 = synthesizeV84Closing(input); const result2 = synthesizeV84Closing(structuredClone(input));
    expect(result1).toEqual(result2);
    input.responses.push({ ...input.responses[0] });
    expect(() => synthesizeV84Closing(input)).toThrow('CLOSING_DUPLICATE_RESPONSE');
  });

  it('uses the learner-selected authored next step instead of the first option', () => {
    const input = base();
    input.nextStepOptions.push({ id: 'next-2', label: { vi: 'Khám phá thêm', en: 'Explore further', ja: 'さらに探究する' }, taskRef: 'E1' });
    input.nextSteps = [{ studentId: 's1', nextStepId: 'next-2', responseRevision: 2, taskRef: 'E1' }];
    const result = synthesizeV84Closing(input);
    expect(result.publicClosing.nextStepCounts).toEqual({ 'next-2': 1 });
    expect(result.studentClosing.s1).toMatchObject({ nextActionCopy: { vi: 'Khám phá thêm', en: 'Explore further' }, differentiatedHomework: [{ id: 'next-2', taskRef: 'E1' }] });
  });

  it('requires every authored Exit response and exact criterion coverage before completion', () => {
    const input = base();
    input.exitItems.push({ instanceId: 'exit-2', questionId: 'q2', criterionIds: ['SC2'], supportsExactEvaluation: true });
    input.selfAssessments[0].criteria.push({ criterionId: 'SC2', value: 'progressing' });
    expect(synthesizeV84Closing(input).studentClosing.s1.status).toBe('collecting');
    input.responses.push({ ...input.responses[0], instanceId: 'exit-2' });
    input.selfAssessments[0].criteria.pop();
    expect(synthesizeV84Closing(input).studentClosing.s1.status).toBe('collecting');
  });

  it('does not report the closing loop complete before an authored next-step choice', () => {
    const input = base(); input.nextSteps = [];
    expect(synthesizeV84Closing(input).studentClosing.s1.status).toBe('collecting');
  });

  it('does not use a correct answer for another criterion to confirm self-assessment', () => {
    const input = base();
    input.exitItems.push({ instanceId: 'exit-2', questionId: 'q2', criterionIds: ['SC2'], supportsExactEvaluation: true });
    input.responses[0].evaluated = 'incorrect';
    input.responses.push({ ...input.responses[0], instanceId: 'exit-2', evaluated: 'correct' });
    input.selfAssessments[0].criteria.push({ criterionId: 'SC2', value: 'progressing' });
    expect(synthesizeV84Closing(input).teacherAnalytics.s1.selfAssessmentComparison.matched).toBe(false);
  });

  it('does not let confirmed absence prevent an otherwise completed class closing', () => {
    const input = base(); input.roster[1].attendance = 'ABSENT_CONFIRMED';
    expect(synthesizeV84Closing(input).status).toBe('ready');
    expect(synthesizeV84Closing(input).studentClosing.s2.status).toBe('collecting');
  });

  it('uses learner-readable evidence copy instead of internal instance IDs', () => {
    const input = base(); input.exitItems[0].instanceId = 'INTERNAL_Q1@EXIT';
    input.responses[0].instanceId = 'INTERNAL_Q1@EXIT';
    const statements = synthesizeV84Closing(input).studentClosing.s1.evidenceStatementsByLocale.vi;
    expect(statements.join(' ')).not.toContain('INTERNAL_Q1@EXIT');
    expect(statements.join(' ')).toContain('Câu 1');
  });

  it('supplies closing outputs independently in VI/EN/JA', () => {
    const result = synthesizeV84Closing(base());
    for (const locale of ['vi', 'en', 'ja'] as const) {
      expect(result.publicClosing.localeCopy[locale].title).toBeTruthy();
      expect(result.publicClosing.localeCopy[locale].classProgress).toBeTruthy();
      expect(result.publicClosing.localeCopy[locale].evidenceBasedStatement).toBeTruthy();
      expect(result.studentClosing.s1.evidenceStatementsByLocale[locale]).toHaveLength(1);
      expect(result.studentClosing.s1.differentiatedHomework[0].labelCopy[locale]).toBeTruthy();
    }
  });
});
