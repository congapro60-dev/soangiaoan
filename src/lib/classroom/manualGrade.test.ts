import { describe, expect, it } from 'vitest';
import type { SubmissionDoc } from './types';
import { buildManualGradeUpdate } from './manualGrade';

const submission = (grade?: SubmissionDoc['grade']): SubmissionDoc => ({
  id: 'sub-1',
  teacherId: 'teacher-1',
  classId: 'class-1',
  studentId: 'student-1',
  assignmentId: 'asg-1',
  fileUrls: [],
  note: '',
  status: 'submitted',
  grade,
  createdAt: '2026-08-24T10:00:00.000Z',
  updatedAt: '2026-08-24T10:00:00.000Z',
});

describe('buildManualGradeUpdate', () => {
  it('đưa bài chấm tay về trạng thái graded thật sự và xóa lỗi cũ', () => {
    const update = buildManualGradeUpdate(submission(), {
      score: 7,
      maxScore: 10,
      feedback: 'Em cần sửa câu 2.',
      weakTopics: ['phân thức'],
    }, '2026-08-24T12:00:00.000Z');

    expect(update.status).toBe('graded');
    expect(update.errorMessage).toBe('');
    expect(update['grade.score']).toBe(7);
    expect(update['grade.teacherApproved']).toBe(false);
  });

  it('giữ cờ duyệt và thông tin nền khi giáo viên sửa bài đã duyệt', () => {
    const existingGrade = {
      score: 8,
      maxScore: 10,
      feedback: 'cũ',
      strengths: ['đúng phương pháp'],
      weaknesses: ['nhầm dấu'],
      teacherApproved: true,
      gradedAt: '2026-08-24T10:00:00.000Z',
    };
    const update = buildManualGradeUpdate(submission(existingGrade), {
      score: 9,
      maxScore: 10,
      feedback: 'mới',
      weakTopics: [],
    }, '2026-08-24T12:00:00.000Z');

    expect(update['grade.teacherApproved']).toBe(true);
    expect(update['grade.strengths']).toEqual(['đúng phương pháp']);
    expect(update['grade.weaknesses']).toEqual(['nhầm dấu']);
  });
});
