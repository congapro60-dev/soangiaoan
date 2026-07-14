import { describe, it, expect } from 'vitest';
import { verifySubmissionScore } from './examScoring';
import type { ExamQuestion, StudentAnswer } from '../types';

const questions: ExamQuestion[] = [
  { id: 'q1', type: 'multiple_choice', content: 'MCQ', options: ['A. 1', 'B. 2', 'C. 3', 'D. 4'], correctAnswer: 'A', points: 2 },
  { id: 'q2', type: 'short_answer', content: 'SA', correctAnswer: '42', points: 1 },
  { id: 'q3', type: 'essay', content: 'Essay', points: 3 },
];

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
