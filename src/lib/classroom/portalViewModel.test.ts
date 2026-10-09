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
    expect(getStudentAssignmentState(assignment, submission({ status: 'submitted' }))).toMatchObject({ status: 'waiting', action: 'status', canResubmit: true });
  });

  it('keeps grading visible as an active state and locks resubmit while processing', () => {
    expect(getStudentAssignmentState(assignment, submission({ status: 'grading' }))).toMatchObject({ status: 'grading', action: 'status' });
    expect(getStudentAssignmentState(assignment, submission({ status: 'grading' })).canResubmit).toBeFalsy();
  });

  it('turns a failed attempt into an explicit retry state', () => {
    expect(getStudentAssignmentState(assignment, submission({ status: 'error', errorMessage: 'Ảnh bị mờ' }))).toMatchObject({ status: 'retry', action: 'retry' });
  });

  it('shows the graded result and review action, still allowing a fresh attempt', () => {
    expect(getStudentAssignmentState(assignment, submission({ status: 'graded', grade: {
      score: 8,
      maxScore: 10,
      feedback: 'Tốt',
      strengths: [],
      weaknesses: [],
      gradedAt: '2026-08-22T11:00:00.000Z',
      teacherApproved: true,
    } }))).toMatchObject({ status: 'graded', action: 'review', canResubmit: true });
  });

  it('chấm xong nhưng chưa duyệt: học sinh chỉ thấy "chờ thầy cô duyệt", không có nút xem nhận xét', () => {
    expect(getStudentAssignmentState(assignment, submission({ status: 'graded', grade: {
      score: 0, maxScore: 10, feedback: '', strengths: [], weaknesses: [], gradedAt: '2026-08-22T11:00:00.000Z', teacherApproved: false, scoreHidden: true,
    } }))).toMatchObject({ status: 'pending-approval', action: 'status', label: 'Chờ thầy cô duyệt', canResubmit: true });
  });

  it('does not offer resubmit for assignments without an attempt or for self-submissions', () => {
    expect(getStudentAssignmentState(assignment).canResubmit).toBeFalsy();
    expect(getStudentAssignmentState(undefined, submission({ id: 'self-1', assignmentId: null })).canResubmit).toBeFalsy();
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

describe('bài còn chờ em xác nhận', () => {
  it('không hiện "đã chấm" và không cho nộp bổ sung đè lên các câu đang xác nhận', () => {
    const state = getStudentAssignmentState(assignment, submission({ status: 'graded', grade: {
      score: 0, maxScore: 10, feedback: '', strengths: [], weaknesses: [], teacherApproved: true, awaitingClarification: true, gradedAt: '2026-10-09T10:00:00.000Z',
    } }));
    expect(state).toMatchObject({ status: 'waiting', label: 'Cần em xác nhận' });
    expect(state.canResubmit).toBeFalsy();
  });
});
