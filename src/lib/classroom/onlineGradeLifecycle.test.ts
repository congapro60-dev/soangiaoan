import { describe, expect, it } from 'vitest';
import type { ExamQuestion, StudentAnswer } from '../../types.js';
import {
  applyTeacherOnlineGradeEdit,
  approveOnlineGrade,
  applyAiOnlineGradeSuggestion,
  buildAutomaticOnlineGrade,
  projectOnlineGradeForStudent,
  removeOnlineGrade,
  type OnlineGradeSource,
} from './onlineGradeLifecycle.js';

const questions: ExamQuestion[] = [
  { id: 'q1', type: 'multiple_choice', content: 'Chọn A', options: ['A', 'B'], correctAnswer: 'A', points: 2, explanation: 'Vì A đúng.' },
  { id: 'q2', type: 'essay', content: 'Giải phương trình $x=1$.', points: 3, correctAnswer: 'x=1', explanation: 'Đối chiếu nghiệm.' },
];

const answers: StudentAnswer[] = [
  { questionId: 'q1', answer: 'A' },
  { questionId: 'q2', answer: 'x = 1' },
];

describe('online grade lifecycle', () => {
  it('tự chấm câu khách quan và tự chính thức khi policy automatic', () => {
    const result = buildAutomaticOnlineGrade({
      questions: [questions[0]],
      answers: [answers[0]],
      maxScore: 2,
      gradingPolicy: 'automatic',
      now: '2026-08-28T10:00:00.000Z',
    });

    expect(result.status).toBe('graded');
    expect(result.gradeState).toBe('official');
    expect(result.gradingSource).toBe('automatic');
    expect(result.approvalMode).toBe('automatic_policy');
    expect(result.grade.teacherApproved).toBe(true);
    expect(result.totalScore).toBe(2);
    expect(result.answers[0]).toMatchObject({ questionId: 'q1', answer: 'A', autoScore: 2 });
    expect(result.grade.questionResults?.[0]).toMatchObject({ status: 'correct', score: 2, maxScore: 2 });
  });

  it('bài có tự luận chỉ tạo điểm tạm và bắt chờ giáo viên', () => {
    const result = buildAutomaticOnlineGrade({
      questions,
      answers,
      maxScore: 5,
      gradingPolicy: 'mixed',
      now: '2026-08-28T10:00:00.000Z',
    });

    expect(result.gradeState).toBe('pending_teacher_review');
    expect(result.gradingSource).toBe('automatic');
    expect(result.grade.teacherApproved).toBe(false);
    expect(result.grade.questionResults).toEqual(expect.arrayContaining([
      expect.objectContaining({ questionNumber: 'Câu 2', status: 'unreadable', needsTeacherReview: true }),
    ]));
  });

  it('AI chấm theo từng câu, giữ trạng thái provisional và không tự duyệt', () => {
    const result = applyAiOnlineGradeSuggestion({
      answers,
      maxScore: 5,
    }, questions, {
      score: 4.5,
      maxScore: 5,
      feedback: 'Em làm đúng ý chính; cần trình bày đủ bước ở câu tự luận.',
      noteForTeacher: 'Câu tự luận đã được AI đọc rõ.',
      strengths: ['Nắm được đáp án trắc nghiệm.'],
      weaknesses: ['Thiếu bước trình bày.'],
      weakTopics: ['Trình bày lời giải'],
      questionResults: [
        { questionNumber: 'Câu 1', status: 'correct', score: 2, maxScore: 2, studentAnswer: 'A', expectedAnswer: 'A', errorType: 'Không có', explanation: 'Chọn đúng.', correction: '', nextPractice: 'Làm câu vận dụng.', needsTeacherReview: false },
        { questionNumber: 'Câu 2', status: 'partially_correct', score: 2.5, maxScore: 3, studentAnswer: 'x = 1', expectedAnswer: 'x=1', errorType: 'Thiếu bước', explanation: 'Kết quả đúng nhưng thiếu bước.', correction: 'Viết đủ biến đổi.', nextPractice: 'Làm một bài tương tự.', needsTeacherReview: false },
      ],
    }, '2026-08-28T10:20:00.000Z');

    expect(result.totalScore).toBe(4.5);
    expect(result.gradeState).toBe('provisional');
    expect(result.gradingSource).toBe('ai');
    expect(result.grade.teacherApproved).toBe(false);
    expect(result.answers).toEqual(expect.arrayContaining([
      expect.objectContaining({ questionId: 'q2', answer: 'x = 1', aiScore: 2.5 }),
    ]));
  });

  it('sửa tay theo từng câu, tính lại tổng và buộc duyệt lại', () => {
    const initial = buildAutomaticOnlineGrade({
      questions,
      answers,
      maxScore: 5,
      gradingPolicy: 'mixed',
      now: '2026-08-28T10:00:00.000Z',
    });
    const edited = applyTeacherOnlineGradeEdit(initial, questions, {
      questionScores: { q1: 1.5, q2: 2.5 },
      questionFeedback: { q2: 'Em đã nêu đúng nghiệm, cần trình bày đủ bước.' },
      feedback: 'Em đã hoàn thành phần chính; cần trình bày đủ bước ở câu tự luận.',
      weakTopics: ['Trình bày lời giải'],
      teacherNote: 'Đã đối chiếu bài gốc.',
    }, '2026-08-28T10:05:00.000Z');

    expect(edited.totalScore).toBe(4);
    expect(edited.gradeState).toBe('pending_teacher_review');
    expect(edited.grade.teacherApproved).toBe(false);
    expect(edited.grade.editedByTeacher).toBe(true);
    expect(edited.answers).toEqual(expect.arrayContaining([
      expect.objectContaining({ questionId: 'q1', answer: 'A', teacherScore: 1.5 }),
      expect.objectContaining({ questionId: 'q2', answer: 'x = 1', teacherScore: 2.5, teacherFeedback: 'Em đã nêu đúng nghiệm, cần trình bày đủ bước.' }),
    ]));
  });

  it('duyệt mới thành official và xóa điểm chỉ xóa dữ liệu dẫn xuất', () => {
    const initial = buildAutomaticOnlineGrade({
      questions,
      answers,
      maxScore: 5,
      gradingPolicy: 'mixed',
      now: '2026-08-28T10:00:00.000Z',
    });
    const teacherReviewed = applyTeacherOnlineGradeEdit(initial, questions, {
      questionScores: { q1: 2, q2: 3 },
    }, '2026-08-28T10:05:00.000Z');
    const approved = approveOnlineGrade(teacherReviewed, '2026-08-28T10:10:00.000Z');
    expect(approved.grade.teacherApproved).toBe(true);
    expect(approved.gradeState).toBe('official');
    expect(approved.teacherApprovedAt).toBe('2026-08-28T10:10:00.000Z');

    const removed = removeOnlineGrade(approved as OnlineGradeSource, questions);
    expect(removed.grade).toBeUndefined();
    expect(removed.status).toBe('submitted');
    expect(removed.totalScore).toBeUndefined();
    expect(removed.answers).toEqual(answers);
  });

  it('projection học sinh không làm lộ ghi chú giáo viên hoặc đáp án khi chưa được xem lại', () => {
    const initial = buildAutomaticOnlineGrade({
      questions: [questions[0]],
      answers: [answers[0]],
      maxScore: 2,
      gradingPolicy: 'automatic',
      now: '2026-08-28T10:00:00.000Z',
    });
    const grade = {
      ...initial.grade,
      noteForTeacher: 'Ghi chú nội bộ',
      teacherNote: 'Không gửi cho học sinh',
    };
    const safe = projectOnlineGradeForStudent(grade, false);
    expect(safe).not.toHaveProperty('noteForTeacher');
    expect(safe).not.toHaveProperty('teacherNote');
    expect(safe.questionResults?.[0]).toMatchObject({ expectedAnswer: '', explanation: '' });
    const reviewed = projectOnlineGradeForStudent(grade, true);
    expect(reviewed.questionResults?.[0]).toMatchObject({ expectedAnswer: 'A', explanation: 'Vì A đúng.' });
  });
});
