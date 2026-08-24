import { describe, expect, it } from 'vitest';
import type { SubmissionDoc } from './types';
import { buildStudentReportModel } from './reportModel';

const submission = (patch: Partial<SubmissionDoc>): SubmissionDoc => ({
  id: patch.id || 'sub-1',
  teacherId: 'teacher-1',
  classId: 'class-1',
  studentId: 'student-1',
  assignmentId: 'asg-1',
  fileUrls: ['https://example.test/work.jpg'],
  note: '',
  status: 'graded',
  createdAt: '2026-08-24T10:00:00.000Z',
  updatedAt: '2026-08-24T10:00:00.000Z',
  ...patch,
});

const grade = (score: number, teacherApproved: boolean) => ({
  score,
  maxScore: 10,
  feedback: '',
  strengths: [],
  weaknesses: [],
  weakTopics: [],
  gradedAt: '2026-08-24T10:00:00.000Z',
  teacherApproved,
});

describe('buildStudentReportModel', () => {
  it('chỉ lấy lượt mới nhất của mỗi bài giao, dù dữ liệu trả về không theo thứ tự', () => {
    const model = buildStudentReportModel([
      submission({ id: 'old', createdAt: '2026-08-23T10:00:00.000Z', grade: grade(2, true) }),
      submission({ id: 'new', createdAt: '2026-08-24T10:00:00.000Z', grade: grade(8, true) }),
    ]);

    expect(model.currentSubmissions.map(item => item.id)).toEqual(['new']);
  });

  it('không đưa bài chưa duyệt vào điểm trung bình', () => {
    const model = buildStudentReportModel([
      submission({ id: 'approved', grade: grade(8, true) }),
      submission({
        id: 'pending',
        assignmentId: 'asg-2',
        grade: grade(0, false),
        createdAt: '2026-08-24T11:00:00.000Z',
      }),
    ]);

    expect(model.gradedSubmissions).toHaveLength(2);
    expect(model.approvedSubmissions.map(item => item.id)).toEqual(['approved']);
    expect(model.averagePercent).toBe(80);
  });

  it('tính trung bình theo phần trăm khi bài có thang điểm khác nhau', () => {
    const model = buildStudentReportModel([
      submission({ id: 'ten', grade: { ...grade(8, true), maxScore: 10 } }),
      submission({ id: 'twenty', assignmentId: 'asg-2', grade: { ...grade(15, true), maxScore: 20 } }),
    ]);

    expect(model.averagePercent).toBe(77.5);
  });

  it('giữ bài tự nộp như các lượt độc lập và không làm mất bài được giao', () => {
    const model = buildStudentReportModel([
      submission({ id: 'assigned', grade: grade(7, true) }),
      submission({ id: 'self', assignmentId: null, grade: grade(9, true), createdAt: '2026-08-24T12:00:00.000Z' }),
    ]);

    expect(model.currentSubmissions.map(item => item.id)).toEqual(['self', 'assigned']);
  });
});
