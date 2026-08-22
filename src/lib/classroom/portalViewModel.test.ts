import { describe, expect, it } from 'vitest';
import type { AssignmentDoc, SubmissionDoc } from './types';
import { getStudentAssignmentState, latestSubmissionByAssignment } from './portalViewModel';

const assignment: AssignmentDoc = {
  id: 'asg-1',
  teacherId: 'teacher-1',
  classId: 'class-1',
  title: 'Bài số 1',
  description: '',
  type: 'upload',
  isOpen: true,
  createdAt: '2026-08-22T08:00:00.000Z',
  updatedAt: '2026-08-22T08:00:00.000Z',
};

const submission = (patch: Partial<SubmissionDoc>): SubmissionDoc => ({
  id: 'sub-1',
  teacherId: 'teacher-1',
  classId: 'class-1',
  studentId: 'student-1',
  assignmentId: 'asg-1',
  fileUrls: ['https://example.com/homework.jpg'],
  note: '',
  status: 'submitted',
  createdAt: '2026-08-22T09:00:00.000Z',
  updatedAt: '2026-08-22T09:00:00.000Z',
  ...patch,
});

describe('latestSubmissionByAssignment', () => {
  it('keeps only the newest attempt for an assigned task', () => {
    const old = submission({ id: 'sub-old', createdAt: '2026-08-22T09:00:00.000Z', updatedAt: '2026-08-22T09:00:00.000Z' });
    const latest = submission({ id: 'sub-latest', status: 'graded', createdAt: '2026-08-22T10:00:00.000Z', updatedAt: '2026-08-22T10:00:00.000Z' });

    expect(latestSubmissionByAssignment([latest, old])).toEqual(new Map([['asg-1', latest]]));
  });

  it('does not combine self-submissions with an assigned-task attempt', () => {
    const self = submission({ id: 'self-1', assignmentId: null });

    expect(latestSubmissionByAssignment([self])).toEqual(new Map());
  });

  it('prefers a valid timestamp over a malformed timestamp', () => {
    const malformed = submission({ id: 'sub-bad-date', createdAt: 'khong-phai-ngay', updatedAt: 'khong-phai-ngay' });
    const valid = submission({ id: 'sub-valid-date', createdAt: '2026-08-22T10:00:00.000Z', updatedAt: '2026-08-22T10:00:00.000Z' });

    expect(latestSubmissionByAssignment([malformed, valid]).get('asg-1')?.id).toBe('sub-valid-date');
  });
});

describe('getStudentAssignmentState', () => {
  it('shows submit for an assignment without an attempt', () => {
    expect(getStudentAssignmentState(assignment)).toMatchObject({ status: 'todo', action: 'submit' });
  });

  it('shows waiting and status action after submission', () => {
    expect(getStudentAssignmentState(assignment, submission({ status: 'submitted' }))).toMatchObject({ status: 'waiting', action: 'status' });
  });

  it('keeps grading visible as an active state', () => {
    expect(getStudentAssignmentState(assignment, submission({ status: 'grading' }))).toMatchObject({ status: 'grading', action: 'status' });
  });

  it('turns a failed attempt into an explicit retry state', () => {
    expect(getStudentAssignmentState(assignment, submission({ status: 'error', errorMessage: 'Ảnh bị mờ' }))).toMatchObject({ status: 'retry', action: 'retry' });
  });

  it('shows the graded result and review action', () => {
    expect(getStudentAssignmentState(assignment, submission({ status: 'graded', grade: {
      score: 8,
      maxScore: 10,
      feedback: 'Tốt',
      strengths: [],
      weaknesses: [],
      gradedAt: '2026-08-22T11:00:00.000Z',
      teacherApproved: false,
    } }))).toMatchObject({ status: 'graded', action: 'review' });
  });

  it('keeps a self-submission separate from assigned-task state', () => {
    expect(getStudentAssignmentState(undefined, submission({ id: 'self-1', assignmentId: null }))).toMatchObject({ status: 'self-submitted', action: 'review' });
  });

  it('does not turn a failed submission into an empty state', () => {
    const state = getStudentAssignmentState(assignment, submission({ status: 'error', errorMessage: 'Không đọc được ảnh' }));

    expect(state.status).toBe('retry');
    expect(state.detail).toBe('Không đọc được ảnh');
  });
});
