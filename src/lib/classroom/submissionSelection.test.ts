import { describe, expect, it } from 'vitest';
import type { SubmissionDoc } from './types';
import {
  currentSubmissionsForAssignment,
  selectedCurrentSubmissions,
  summarizeSelection,
} from './submissionSelection';

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
  it('chọn lượt mới nhất theo timestamp, không phụ thuộc thứ tự Firestore trả về', () => {
    const current = currentSubmissionsForAssignment([
      submission('new', 'student-1', '2026-08-24T12:00:00.000Z'),
      submission('old', 'student-1', '2026-08-23T12:00:00.000Z'),
      submission('other', 'student-2', '2026-08-24T11:00:00.000Z'),
    ]);

    expect(current.map(item => item.id)).toEqual(['new', 'other']);
  });

  it('không cho selection của lượt cũ lọt vào thao tác hàng loạt', () => {
    const all = [
      submission('new', 'student-1', '2026-08-24T12:00:00.000Z'),
      submission('old', 'student-1', '2026-08-23T12:00:00.000Z'),
    ];

    expect(selectedCurrentSubmissions(all, new Set(['old', 'new'])).map(item => item.id)).toEqual(['new']);
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

    expect(summarizeSelection(selected)).toEqual({ total: 2, pending: 1, graded: 1, unapproved: 1 });
  });
});
