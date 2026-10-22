import { describe, expect, it } from 'vitest';
import { sampleAdaptiveLesson } from './sampleAdaptiveLesson';
import { buildClassSummary, buildCloseArtifacts, buildStudentFeedback, resolveHomework, selectHomework } from './closeAssignment';
import type { AssessmentAttempt } from './types';

const lesson = sampleAdaptiveLesson;
const q = lesson.diagnosticTest.questions;
const wrong = q.find(item => item.misconceptionIds?.length)!;
const attempt = (correctIds: string[]): AssessmentAttempt => ({
  id: 'a', assessmentId: lesson.diagnosticTest.id, purpose: 'diagnostic', submittedAt: 'x', durationSeconds: 1,
  answers: q.map(item => ({ questionId: item.id, answer: 'zzz-secret-answer', isCorrect: correctIds.includes(item.id), score: correctIds.includes(item.id) ? item.points : 0, detectedMisconceptionIds: correctIds.includes(item.id) ? [] : item.misconceptionIds, feedback: item.explanation })),
  objectiveScores: [...new Set(q.flatMap(item => item.objectiveIds))].map(objectiveId => {
    const rel = q.filter(item => item.objectiveIds.includes(objectiveId));
    const score = rel.filter(item => correctIds.includes(item.id)).reduce((s, item) => s + item.points, 0);
    const maxScore = rel.reduce((s, item) => s + item.points, 0);
    return { objectiveId, score, maxScore, masteryEstimate: score / maxScore };
  }),
});
const allIds = new Set([...lesson.diagnosticTest.questions, ...lesson.exitTicket.questions, ...lesson.knowledgeUnits.flatMap(u => u.quickCheck.questions)].map(item => item.id));

describe('selectHomework', () => {
  it('chon cau co san khop objective/misconception, khong sinh moi, bo cau da dung', () => {
    const correct = q.filter(item => item.id !== wrong.id).map(item => item.id);
    const picked = selectHomework(lesson, [attempt(correct)]);
    expect(picked.length).toBeGreaterThan(0);
    expect(picked.length).toBeLessThanOrEqual(5);
    picked.forEach(ref => expect(allIds.has(ref.questionId)).toBe(true));
    expect(picked.some(ref => correct.includes(ref.questionId))).toBe(false);
    expect(new Set(picked.map(ref => ref.questionId)).size).toBe(picked.length);
  });
  it('dat het muc tieu: khong co BTVN', () => {
    expect(selectHomework(lesson, [attempt(q.map(item => item.id))])).toEqual([]);
  });
});

describe('buildClassSummary', () => {
  it('an danh: khong studentId/ten HS trong ket qua', () => {
    const summary = buildClassSummary(lesson, { 'student-SECRET-1': { diagnostic: attempt([]) }, 'student-SECRET-2': { diagnostic: attempt(q.map(item => item.id)) } });
    expect(summary.students).toBe(2);
    expect(JSON.stringify(summary)).not.toContain('SECRET');
    expect(summary.objectives[0].avgPercent).toBe(50);
    expect(summary.misconceptions.length).toBeGreaterThan(0);
  });
});

describe('buildStudentFeedback', () => {
  it('khong ro dap an/loi giai', () => {
    const lines = buildStudentFeedback(lesson, [attempt([])]).join('\n');
    expect(lines).not.toMatch(/Đáp án|Dap an/i);
    q.forEach(item => {
      if (item.correctAnswer) expect(lines).not.toContain(item.correctAnswer);
      expect(lines).not.toContain(item.explanation);
    });
    expect(lines).not.toContain('zzz-secret-answer');
  });
  it('resolveHomework khong tra dap an', () => {
    const arts = buildCloseArtifacts(lesson, { s1: { diagnostic: attempt([]) } }, 'now');
    const json = JSON.stringify(resolveHomework(lesson, arts.homework.s1));
    expect(json).not.toContain('correctAnswer');
    expect(json).not.toContain('explanation');
  });
});
