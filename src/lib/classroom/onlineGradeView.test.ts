import { describe, expect, it } from 'vitest';
import type { ExamSubmission } from '../../types.js';
import { onlineAttemptStatus } from './onlineGradeView.js';

const attempt = (patch: Partial<ExamSubmission>): ExamSubmission => ({
  id: 'attempt-1', examId: 'exam-1', examCode: 'ABC', studentName: 'Nguyễn An', startedAt: '2026-08-28T09:00:00.000Z',
  answers: [], maxScore: 10, status: 'submitted', ...patch,
});

describe('onlineGradeView', () => {
  it('phân biệt đang làm, chờ chấm, điểm AI tạm và điểm chính thức', () => {
    expect(onlineAttemptStatus(attempt({ status: 'in_progress' })).label).toBe('Đang làm');
    expect(onlineAttemptStatus(attempt({ status: 'submitted' })).label).toBe('Chờ chấm');
    expect(onlineAttemptStatus(attempt({ status: 'graded', gradeState: 'provisional' })).label).toBe('Điểm AI tạm');
    expect(onlineAttemptStatus(attempt({ status: 'graded', gradeState: 'official' })).label).toBe('Đã duyệt');
  });
});
