import { describe, expect, it } from 'vitest';
import type { SubmissionDoc } from './types';
import {
  currentSubmissionsForAssignment,
  hasUncertainRead,
  isStaleGradingTimestamp,
  selectedSubmissionsForAssignment,
  selectedCurrentSubmissions,
  submissionsForHistoryMode,
  summarizeSelection,
} from './submissionSelection';
import type { QuestionResult, SubmissionGrade } from './types';

const submission = (id: string, studentId: string, createdAt: string, patch: Partial<SubmissionDoc> = {}): SubmissionDoc => ({
  id,
  teacherId: 'teacher-1',
  classId: 'class-1',
  studentId,
  assignmentId: 'asg-1',
  fileUrls: ['https://example.test/work.jpg'],
  note: '',
  status: 'submitted',
  createdAt,
  updatedAt: createdAt,
  ...patch,
});

describe('submissionSelection', () => {
  it('nhận diện khóa grading cũ để UI cho giáo viên chấm lại', () => {
    const now = Date.parse('2026-09-07T12:00:00.000Z');

    expect(isStaleGradingTimestamp('2026-09-07T11:50:01.000Z', now)).toBe(false);
    expect(isStaleGradingTimestamp('2026-09-07T11:49:59.000Z', now)).toBe(true);
    expect(isStaleGradingTimestamp('not-a-date', now)).toBe(true);
  });

  it('chọn lượt mới nhất theo timestamp, không phụ thuộc thứ tự Firestore trả về', () => {
    const current = currentSubmissionsForAssignment([
      submission('new', 'student-1', '2026-08-24T12:00:00.000Z'),
      submission('old', 'student-1', '2026-08-23T12:00:00.000Z'),
      submission('other', 'student-2', '2026-08-24T11:00:00.000Z'),
    ]);

    expect(current.map(item => item.id)).toEqual(['new', 'other']);
  });

  it('chọn projection lượt mới nhất hoặc toàn bộ lịch sử theo mode', () => {
    const all = [
      submission('new', 'student-1', '2026-08-24T12:00:00.000Z'),
      submission('old', 'student-1', '2026-08-23T12:00:00.000Z'),
      submission('other', 'student-2', '2026-08-24T11:00:00.000Z'),
    ];

    expect(submissionsForHistoryMode(all, 'latest').map(item => item.id)).toEqual(['new', 'other']);
    expect(submissionsForHistoryMode(all, 'all').map(item => item.id)).toEqual(['new', 'old', 'other']);
  });

  it('không cho selection của lượt cũ lọt vào thao tác hàng loạt', () => {
    const all = [
      submission('new', 'student-1', '2026-08-24T12:00:00.000Z'),
      submission('old', 'student-1', '2026-08-23T12:00:00.000Z'),
    ];

    expect(selectedCurrentSubmissions(all, new Set(['old', 'new'])).map(item => item.id)).toEqual(['new']);
  });

  it('cho phép phạm vi xóa bao gồm cả lượt mới nhất và lượt cũ được chọn', () => {
    const all = [
      submission('new', 'student-1', '2026-08-24T12:00:00.000Z'),
      submission('old', 'student-1', '2026-08-23T12:00:00.000Z'),
    ];

    expect(selectedSubmissionsForAssignment(all, new Set(['old', 'new'])).map(item => item.id)).toEqual(['new', 'old']);
  });

  it('tóm tắt đúng phạm vi xóa/duyệt/chấm', () => {
    const selected = [
      submission('wait', 'student-1', '2026-08-24T12:00:00.000Z'),
      submission('grade', 'student-2', '2026-08-24T11:00:00.000Z', { status: 'graded', grade: {
        score: 8,
        maxScore: 10,
        feedback: '',
        strengths: [],
        weaknesses: [],
        teacherApproved: false,
        gradedAt: '2026-08-24T11:00:00.000Z',
      } }),
    ];

    expect(summarizeSelection(selected)).toEqual({ total: 2, pending: 1, graded: 1, unapproved: 1, regradable: 1 });
  });

  it('không tính bài giáo viên đã sửa tay vào diện chấm lại loạt', () => {
    const selected = [
      submission('ai', 'student-1', '2026-08-24T12:00:00.000Z', { status: 'graded', grade: {
        score: 8, maxScore: 10, feedback: '', strengths: [], weaknesses: [], teacherApproved: true,
        gradedAt: '2026-08-24T12:00:00.000Z',
      } }),
      submission('taysua', 'student-2', '2026-08-24T11:00:00.000Z', { status: 'graded', grade: {
        score: 9, maxScore: 10, feedback: '', strengths: [], weaknesses: [], teacherApproved: true,
        editedByTeacher: true, gradedAt: '2026-08-24T11:00:00.000Z',
      } }),
    ];

    expect(summarizeSelection(selected).regradable).toBe(1);
  });

  it('không đưa bài đang grading vào số lượng bulk duyệt', () => {
    const grading = submission('grading', 'student-1', '2026-08-24T12:00:00.000Z', {
      status: 'grading',
      grade: {
        score: 7,
        maxScore: 10,
        feedback: '',
        strengths: [],
        weaknesses: [],
        teacherApproved: false,
        gradedAt: '2026-08-25T00:00:00.000Z',
      },
    });

    expect(summarizeSelection([grading]).unapproved).toBe(0);
  });
});

describe('hasUncertainRead — nhắc soát khi máy đọc chưa chắc', () => {
  const qr = (patch: Partial<QuestionResult>): QuestionResult => ({
    questionNumber: 'C1', status: 'correct', score: 2, maxScore: 2,
    studentAnswer: 'x=1', expectedAnswer: 'x=1', errorType: 'Không có',
    explanation: '', correction: '', nextPractice: '', needsTeacherReview: false, ...patch,
  });
  const grade = (questionResults?: SubmissionGrade['questionResults']): SubmissionGrade => ({
    score: 5, maxScore: 10, feedback: '', strengths: [], weaknesses: [], teacherApproved: false,
    gradedAt: '2026-09-03T00:00:00.000Z', ...(questionResults ? { questionResults } : {}),
  });

  it('không có questionResults thì coi là chắc', () => {
    expect(hasUncertainRead(undefined)).toBe(false);
    expect(hasUncertainRead(grade())).toBe(false);
  });

  it('bắt câu unreadable, cần soát, hoặc confidence thấp', () => {
    expect(hasUncertainRead(grade([qr({ status: 'unreadable', needsTeacherReview: true })]))).toBe(true);
    expect(hasUncertainRead(grade([qr({ needsTeacherReview: true })]))).toBe(true);
    expect(hasUncertainRead(grade([qr({ confidence: 0.3 })]))).toBe(true);
  });

  it('đọc rõ, confidence cao thì không cảnh báo', () => {
    expect(hasUncertainRead(grade([qr({ confidence: 0.95 })]))).toBe(false);
  });
});
