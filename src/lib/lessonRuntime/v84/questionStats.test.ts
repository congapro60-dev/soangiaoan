import { describe, expect, it } from 'vitest';
import { openQuestion, submitQuestionResponse } from './questionState';
import { finalizeQuestionStats } from './questionStats';

const run = () => openQuestion({
  instanceId: 'Q1@A1', activityId: 'A1', requiredStudentIds: ['one', 'two'],
  openedAtSec: 100, workBudgetSec: 45, revealPolicy: 'teacher_manual',
});

describe('V8.4 public-safe question statistics', () => {
  it('counts current MCQ choices once per student, including a late non-blocking response', () => {
    let current = submitQuestionResponse(run(), 'one', 110, 'A');
    current = submitQuestionResponse(current, 'one', 111, 'B');
    current = submitQuestionResponse(current, 'late', 112, 'B');
    current = submitQuestionResponse(current, 'two', 113, 'A');
    expect(finalizeQuestionStats(current, 'mcq', ['A', 'B', 'C'])).toEqual({
      kind: 'choice_distribution', validResponses: 3,
      choices: [{ id: 'A', count: 1 }, { id: 'B', count: 2 }, { id: 'C', count: 0 }],
    });
  });

  it('does not publish raw text reasoning or unique math input', () => {
    let textRun = submitQuestionResponse(run(), 'one', 110, 'Tên em là An');
    textRun = submitQuestionResponse(textRun, 'two', 111, 'Lập luận riêng');
    const textStats = finalizeQuestionStats(textRun, 'text', []);
    expect(textStats).toEqual({ kind: 'completion', validResponses: 2 });
    expect(JSON.stringify(textStats)).not.toContain('An');

    let mathRun = submitQuestionResponse(run(), 'one', 110, 'u_5=26');
    mathRun = submitQuestionResponse(mathRun, 'two', 111, 'u_5=27');
    expect(finalizeQuestionStats(mathRun, 'math_input', [])).toEqual({
      kind: 'math_clusters', validResponses: 2, common: [], otherCount: 2,
    });
  });

  it('does not publish a repeated personal phrase submitted through math input', () => {
    let current = submitQuestionResponse(run(), 'one', 110, 'Tên em là An');
    current = submitQuestionResponse(current, 'two', 111, 'Tên em là An');
    const stats = finalizeQuestionStats(current, 'math_input', []);
    expect(stats).toEqual({ kind: 'math_clusters', validResponses: 2, common: [], otherCount: 2 });
    expect(JSON.stringify(stats)).not.toContain('An');
  });

  it('may publish a repeated plain numeric result without student identity', () => {
    let current = submitQuestionResponse(run(), 'one', 110, '26');
    current = submitQuestionResponse(current, 'two', 111, '26');
    expect(finalizeQuestionStats(current, 'math_input', [])).toEqual({
      kind: 'math_clusters', validResponses: 2, common: [{ answer: '26', count: 2 }], otherCount: 0,
    });
  });

  it('aggregates each True/False row without exposing student answers', () => {
    let current = submitQuestionResponse(run(), 'one', 110, 'Đ, Đ, S');
    current = submitQuestionResponse(current, 'two', 111, 'S, Đ, S');
    const stats = finalizeQuestionStats(current, 'true_false_matrix', ['1', '2', '3']);
    expect(stats).toEqual({ kind: 'matrix_distribution', validResponses: 2, rows: [
      { id: '1', trueCount: 1, falseCount: 1, unclassifiedCount: 0 },
      { id: '2', trueCount: 2, falseCount: 0, unclassifiedCount: 0 },
      { id: '3', trueCount: 0, falseCount: 2, unclassifiedCount: 0 },
    ] });
    expect(JSON.stringify(stats)).not.toContain('one');
  });

  it('counts each selected option in a multi-select response once', () => {
    let current = submitQuestionResponse(run(), 'one', 110, 'A,C');
    current = submitQuestionResponse(current, 'two', 111, 'B,C');
    expect(finalizeQuestionStats(current, 'multi', ['A', 'B', 'C'])).toEqual({
      kind: 'choice_distribution', validResponses: 2,
      choices: [{ id: 'A', count: 1 }, { id: 'B', count: 1 }, { id: 'C', count: 2 }],
    });
  });
});
