import { describe, expect, it } from 'vitest';
import { computeAutoScoreCore, gradeSubmissionCore, stripAnswerKey, type CoreQuestion } from '../_exam-core';

const questions: CoreQuestion[] = [
  { id: 'q1', type: 'multiple_choice', options: ['A. 1', 'B. 2', 'C. 3', 'D. 4'], correctAnswer: 'A', points: 2, explanation: 'vì A' },
  { id: 'q2', type: 'true_false', options: ['a. x', 'b. y', 'c. z', 'd. t'], correctAnswer: JSON.stringify({ a: 'Đ', b: 'S', c: 'Đ', d: 'S' }), points: 4 },
  { id: 'q3', type: 'short_answer', correctAnswer: '42', points: 1 },
  { id: 'q4', type: 'essay', correctAnswer: '', points: 3, explanation: 'gợi ý' },
];

describe('computeAutoScoreCore', () => {
  it('MCQ đúng/sai', () => {
    expect(computeAutoScoreCore(questions[0], 'A')).toBe(2);
    expect(computeAutoScoreCore(questions[0], 'B')).toBe(0);
  });
  it('short answer chuẩn hoá khoảng trắng/hoa thường', () => {
    expect(computeAutoScoreCore(questions[2], ' 42 ')).toBe(1);
  });
  it('Đ/S thpt2025 partial credit', () => {
    const three = JSON.stringify({ a: 'Đ', b: 'S', c: 'Đ', d: 'Đ' });
    expect(computeAutoScoreCore(questions[1], three, 'thpt2025')).toBe(2);
    expect(computeAutoScoreCore(questions[1], three, 'all_or_nothing')).toBe(0);
  });
  it('essay trả undefined', () => {
    expect(computeAutoScoreCore(questions[3], 'bài làm')).toBeUndefined();
  });
});

describe('gradeSubmissionCore', () => {
  it('chấm đầy đủ + status graded, nhúng đáp án khi allowReview', () => {
    const res = gradeSubmissionCore(
      [questions[0], questions[2]],
      [{ questionId: 'q1', answer: 'A' }, { questionId: 'q3', answer: '42' }],
      true,
    );
    expect(res.totalScore).toBe(3);
    expect(res.status).toBe('graded');
    expect(res.answers[0].correctAnswer).toBe('A');
    expect(res.answers[0].explanation).toBe('vì A');
  });

  it('KHÔNG nhúng đáp án khi allowReview tắt', () => {
    const res = gradeSubmissionCore([questions[0]], [{ questionId: 'q1', answer: 'A' }], false);
    expect(res.answers[0].correctAnswer).toBeUndefined();
  });

  it('bài có essay chưa chấm → status submitted, tổng chỉ tính câu auto', () => {
    const res = gradeSubmissionCore(
      questions,
      [
        { questionId: 'q1', answer: 'A' },
        { questionId: 'q2', answer: JSON.stringify({ a: 'Đ', b: 'S', c: 'Đ', d: 'S' }) },
        { questionId: 'q3', answer: '42' },
        { questionId: 'q4', answer: 'bài tự luận' },
      ],
      false,
    );
    expect(res.status).toBe('submitted');
    expect(res.totalScore).toBe(7);
  });

  it('điểm học sinh tự ghi bị ghi đè bằng điểm tính từ đáp án gốc', () => {
    const res = gradeSubmissionCore([questions[0]], [{ questionId: 'q1', answer: 'B', autoScore: 2 }], false);
    expect(res.answers[0].autoScore).toBe(0);
    expect(res.totalScore).toBe(0);
  });
});

describe('stripAnswerKey', () => {
  it('bỏ correctAnswer + explanation, giữ phần còn lại', () => {
    const stripped = stripAnswerKey(questions[0]);
    expect((stripped as any).correctAnswer).toBeUndefined();
    expect((stripped as any).explanation).toBeUndefined();
    expect(stripped.id).toBe('q1');
    expect(stripped.options).toEqual(['A. 1', 'B. 2', 'C. 3', 'D. 4']);
  });
});
