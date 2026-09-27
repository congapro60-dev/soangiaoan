import { describe, expect, it } from 'vitest';
import { answersFromSubmission, remainingSecondsForAttempt, submissionAnswersForQuestions } from './studentExamView';

describe('studentExamView', () => {
  it('khôi phục answers theo questionId và bỏ field nội bộ', () => {
    expect(answersFromSubmission([
      { questionId: 'q1', answer: 'B', correctAnswer: 'A' },
      { questionId: 'q2', answer: 'x', explanation: 'ẩn' },
    ])).toEqual({ q1: 'B', q2: 'x' });
  });

  it('tạo payload theo đúng thứ tự đề và giữ câu chưa làm là chuỗi rỗng', () => {
    expect(submissionAnswersForQuestions(
      [{ id: 'q2' }, { id: 'q1' }] as never,
      { q1: 'A' },
    )).toEqual([
      { questionId: 'q2', answer: '' },
      { questionId: 'q1', answer: 'A' },
    ]);
  });

  it('tính thời gian còn lại từ startedAt của server và chặn theo endAt', () => {
    expect(remainingSecondsForAttempt({
      durationMinutes: 30,
      startedAt: '2026-08-28T10:00:00.000Z',
      now: new Date('2026-08-28T10:05:00.000Z'),
    })).toBe(25 * 60);
    expect(remainingSecondsForAttempt({
      durationMinutes: 30,
      startedAt: '2026-08-28T10:00:00.000Z',
      endAt: '2026-08-28T10:12:00.000Z',
      now: new Date('2026-08-28T10:20:00.000Z'),
    })).toBe(0);
  });
});
