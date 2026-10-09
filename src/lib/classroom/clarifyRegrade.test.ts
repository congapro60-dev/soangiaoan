import { describe, expect, it } from 'vitest';
import { buildQuestionRegradePrompt, parseQuestionRegrade } from './clarifyRegrade';
import type { QuestionResult } from './types';

const old: QuestionResult = {
  questionNumber: 'Tự luận – Bài 1', status: 'unreadable', score: 0, maxScore: 2, studentAnswer: 'mờ', expectedAnswer: 'x = 2',
  errorType: '', explanation: '', correction: '', nextPractice: '', needsTeacherReview: true,
  clarify: { kind: 'photo', state: 'regrading', reading: 'mờ', photoUrls: ['u'] },
};

describe('chấm lại một câu từ ảnh chụp lại', () => {
  it('câu lệnh chỉ nhắm đúng một câu, nói rõ thứ tự ảnh, không đưa đáp án cũ máy đọc làm căn cứ', () => {
    const prompt = buildQuestionRegradePrompt({
      question: old, answerKey: 'Bài 1: x = 2', rubric: '', assignmentTitle: 'Kiểm tra', assignmentText: '', gradingInstructions: '',
      assignmentImageCount: 1, answerKeyImageCount: 1,
    });
    expect(prompt).toContain('"Tự luận – Bài 1"');
    expect(prompt).toContain('tối đa 2 điểm');
    expect(prompt).toContain('1 ảnh đầu là ĐỀ');
    expect(prompt).toContain('KHÔNG dùng làm căn cứ');
    expect(prompt).toContain('Bài 1: x = 2');
  });

  it('đọc kết quả, giữ nhãn câu + điểm tối đa + đáp án mốc + clarify; điểm bị kẹp trong thang', () => {
    const next = parseQuestionRegrade('```json\n{"status":"correct","score":9,"studentAnswer":"x = 2","errorType":"Không có","explanation":"Đúng","correction":"","nextPractice":"","confidence":0.92}\n```', old)!;
    expect(next).toMatchObject({ questionNumber: 'Tự luận – Bài 1', maxScore: 2, expectedAnswer: 'x = 2', status: 'correct', score: 2, needsTeacherReview: false, confidence: 0.92 });
    expect(next.clarify).toBe(old.clarify);
  });

  it('không đọc được / mờ → vẫn là câu chưa chắc; không làm là kết quả hợp lệ; rác thì null', () => {
    expect(parseQuestionRegrade('{"status":"unreadable","score":0,"studentAnswer":""}', old)).toMatchObject({ needsTeacherReview: true });
    expect(parseQuestionRegrade('{"status":"not_attempted","score":0,"studentAnswer":"","confidence":0.9}', old)).toMatchObject({ status: 'not_attempted', needsTeacherReview: false });
    expect(parseQuestionRegrade('xin lỗi tôi không biết', old)).toBeNull();
  });
});
