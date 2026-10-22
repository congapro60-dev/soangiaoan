import { describe, it, expect } from 'vitest';
import { computeAutoScore, validateExamQuestions, verifySubmissionScore } from './examScoring';
import { computeAutoScoreCore } from '../../api/_exam-core';
import type { ExamQuestion, StudentAnswer } from '../types';

const questions: ExamQuestion[] = [
  { id: 'q1', type: 'multiple_choice', content: 'MCQ', options: ['A. 1', 'B. 2', 'C. 3', 'D. 4'], correctAnswer: 'A', points: 2 },
  { id: 'q2', type: 'short_answer', content: 'SA', correctAnswer: '42', points: 1 },
  { id: 'q3', type: 'essay', content: 'Essay', points: 3 },
];

describe('computeAutoScore true/false parity', () => {
  const question: ExamQuestion = {
    id: 'tf', type: 'true_false', content: 'TF', options: ['a', 'b', 'c', 'd'], correctAnswer: 'Đ,S,Đ,S', points: 1,
  };

  it('matches server semantics for CSV/JSON and missing keys', () => {
    expect(computeAutoScore(question, JSON.stringify({ a: 'đ', b: 's', c: 'đ', d: 's' }))).toBe(1);
    expect(computeAutoScore(question, '{}', 'thpt2025')).toBe(0);
    expect(computeAutoScore(question, JSON.stringify({ a: 'Đ' }), 'thpt2025')).toBe(0.1);
    expect(computeAutoScore({ ...question, correctAnswer: 'Đ,S,Đ' }, 'Đ,S,Đ,S')).toBe(0);
  });

  it('agrees with the actual server for every partial score and simple true/false', () => {
    for (const mode of ['all_or_nothing', 'thpt2025'] as const) {
      for (let count = 0; count <= 4; count++) {
        const q = { ...question, correctAnswer: 'Đ,Đ,Đ,Đ', points: 4 };
        const answer = Array.from({ length: 4 }, (_, i) => i < count ? 'Đ' : 'S').join(',');
        expect(computeAutoScore(q, answer, mode)).toBe(computeAutoScoreCore(q, answer, mode));
      }
    }
    const q = { ...question, options: undefined, correctAnswer: 'Đúng' };
    expect(computeAutoScore(q, 'Đúng')).toBe(computeAutoScoreCore(q, 'Đúng'));
  });

  it('refreshes review keys when explicitly regrading', () => {
    const q = { ...question, type: 'multiple_choice' as const, correctAnswer: 'B' };
    expect(verifySubmissionScore([q], [{ questionId: q.id, answer: 'B', autoScore: 0, correctAnswer: 'A' }], 0).answers[0]).toMatchObject({ autoScore: 1, correctAnswer: 'B' });
  });

  it('normalizes full-text MCQ keys and rejects invalid compound T/F tokens', () => {
    const normalized = validateExamQuestions([{
      id: 'full-text', type: 'multiple_choice', content: 'Câu hỏi',
      options: ['A. Hà Nội', 'B. Huế'], correctAnswer: 'Hà Nội', points: 1,
    }]);
    expect(normalized[0].correctAnswer).toBe('A');
    expect(() => validateExamQuestions([{
      id: 'bad-tf', type: 'true_false', content: 'Câu hỏi', options: ['a', 'b', 'c', 'd'], correctAnswer: 'X,X,X,X', points: 1,
    }])).toThrow();
  });
});

describe('verifySubmissionScore', () => {
  it('không đổi gì khi điểm trung thực', () => {
    const answers: StudentAnswer[] = [
      { questionId: 'q1', answer: 'A', autoScore: 2 },
      { questionId: 'q2', answer: '42', autoScore: 1 },
      { questionId: 'q3', answer: 'bài làm', aiScore: 2 },
    ];
    const res = verifySubmissionScore(questions, answers, 5, undefined);
    expect(res.changed).toBe(false);
    expect(res.totalScore).toBe(5);
  });

  it('phát hiện và sửa điểm bị can thiệp (học sinh tự ghi điểm tối đa)', () => {
    const answers: StudentAnswer[] = [
      { questionId: 'q1', answer: 'B', autoScore: 2 },  // sai nhưng tự ghi 2
      { questionId: 'q2', answer: 'sai', autoScore: 1 }, // sai nhưng tự ghi 1
      { questionId: 'q3', answer: 'bài làm', aiScore: 1.5 },
    ];
    const res = verifySubmissionScore(questions, answers, 6, undefined);
    expect(res.changed).toBe(true);
    expect(res.answers[0].autoScore).toBe(0);
    expect(res.answers[1].autoScore).toBe(0);
    expect(res.totalScore).toBe(1.5);
  });

  it('tổng điểm CÓ cộng aiScore tự luận (recalc cũ làm mất phần này)', () => {
    const answers: StudentAnswer[] = [
      { questionId: 'q1', answer: 'A', autoScore: 2 },
      { questionId: 'q2', answer: '42', autoScore: 1 },
      { questionId: 'q3', answer: 'bài làm dài', aiScore: 2.75 },
    ];
    const res = verifySubmissionScore(questions, answers, 3, undefined);
    expect(res.totalScore).toBe(5.75);
    expect(res.changed).toBe(true); // stored 3 ≠ 5.75 → cần sửa
  });

  it('câu essay chưa chấm không bị tính, không bị đổi', () => {
    const answers: StudentAnswer[] = [
      { questionId: 'q1', answer: 'A', autoScore: 2 },
      { questionId: 'q2', answer: '', autoScore: 0 },
      { questionId: 'q3', answer: 'chưa chấm' },
    ];
    const res = verifySubmissionScore(questions, answers, 2, undefined);
    expect(res.changed).toBe(false);
    expect(res.totalScore).toBe(2);
    expect(res.answers[2].aiScore).toBeUndefined();
  });
});
