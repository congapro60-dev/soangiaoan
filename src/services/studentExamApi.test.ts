import { describe, expect, it } from 'vitest';
import { buildStudentExamPayload } from './studentExamApi';

describe('studentExamApi request contract', () => {
  it('chỉ gửi activity/answer data, không gửi identity để quyết định quyền', () => {
    expect(buildStudentExamPayload('studentExamStart', {
      assignmentId: 'assignment-1',
      studentId: 'student-khac',
      studentName: 'Người lạ',
    })).toEqual({
      action: 'studentExamStart',
      assignmentId: 'assignment-1',
    });
  });

  it('giữ câu trả lời cần thiết nhưng loại mọi field đáp án máy/chủ thể', () => {
    expect(buildStudentExamPayload('studentExamSubmit', {
      attemptId: 'attempt-1',
      nonce: 'nonce-1',
      answers: [{
        questionId: 'q1',
        answer: 'B',
        correctAnswer: 'A',
        explanation: 'Không được gửi.',
      }],
      studentId: 'student-khac',
      classId: 'class-khac',
    })).toEqual({
      action: 'studentExamSubmit',
      attemptId: 'attempt-1',
      nonce: 'nonce-1',
      answers: [{ questionId: 'q1', answer: 'B' }],
    });
  });
});
