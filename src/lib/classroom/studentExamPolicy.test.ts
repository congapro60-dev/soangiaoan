import { describe, expect, it } from 'vitest';
import {
  evaluateStudentExamStart,
  findResumableExamAttempt,
  isSameStudentExamContext,
} from './studentExamPolicy';

const baseInput = (overrides: Record<string, unknown> = {}) => ({
  now: new Date('2026-08-28T10:00:00.000Z'),
  link: { uid: 'anon-1', studentId: 'student-1', classId: 'class-1', teacherId: 'teacher-1' },
  assignment: { id: 'assignment-1', classId: 'class-1', type: 'exam' as const, examId: 'exam-1', isOpen: true },
  exam: { id: 'exam-1', isActive: true, maxAttempts: 2 },
  attempts: [],
  ...overrides,
});

describe('studentExamPolicy', () => {
  it('allows a linked student to start an open class exam', () => {
    expect(evaluateStudentExamStart(baseInput())).toEqual({ allowed: true, reason: 'ok' });
  });

  it('rejects an assignment or exam from another class', () => {
    expect(evaluateStudentExamStart(baseInput({
      assignment: { id: 'assignment-1', classId: 'class-2', type: 'exam', examId: 'exam-1', isOpen: true },
    }))).toEqual({ allowed: false, reason: 'assignment_not_in_class' });
    expect(evaluateStudentExamStart(baseInput({
      assignment: { id: 'assignment-1', classId: 'class-1', type: 'exam', examId: 'exam-2', isOpen: true },
    }))).toEqual({ allowed: false, reason: 'exam_not_linked' });
  });

  it('rejects closed, not-yet-open and expired activities', () => {
    expect(evaluateStudentExamStart(baseInput({
      assignment: { id: 'assignment-1', classId: 'class-1', type: 'exam', examId: 'exam-1', isOpen: false },
    }))).toEqual({ allowed: false, reason: 'assignment_closed' });
    expect(evaluateStudentExamStart(baseInput({
      exam: { id: 'exam-1', isActive: true, startAt: '2026-08-28T11:00:00.000Z' },
    }))).toEqual({ allowed: false, reason: 'exam_not_started' });
    expect(evaluateStudentExamStart(baseInput({
      exam: { id: 'exam-1', isActive: true, endAt: '2026-08-28T09:00:00.000Z' },
    }))).toEqual({ allowed: false, reason: 'exam_ended' });
  });

  it('rejects a student outside a targeted support group', () => {
    expect(evaluateStudentExamStart(baseInput({
      assignment: {
        id: 'assignment-1', classId: 'class-1', type: 'exam', examId: 'exam-1', isOpen: true,
        targetStudentIds: ['student-2'],
      },
    }))).toEqual({ allowed: false, reason: 'student_not_targeted' });
  });

  it('enforces max attempts on the server policy input', () => {
    expect(evaluateStudentExamStart(baseInput({
      exam: { id: 'exam-1', isActive: true, maxAttempts: 1 },
      attempts: [{ id: 'attempt-1', studentId: 'student-1', classId: 'class-1', assignmentId: 'assignment-1', status: 'submitted' }],
    }))).toEqual({ allowed: false, reason: 'max_attempts_reached' });
  });

  it('resumes the student in-progress attempt and ignores another student attempt', () => {
    const attempts = [
      { id: 'other', studentId: 'student-2', classId: 'class-1', assignmentId: 'assignment-1', status: 'in_progress' as const },
      { id: 'mine', studentId: 'student-1', classId: 'class-1', assignmentId: 'assignment-1', status: 'in_progress' as const },
    ];
    expect(findResumableExamAttempt(attempts, 'student-1', 'class-1', 'assignment-1')?.id).toBe('mine');
    expect(findResumableExamAttempt(attempts, 'student-3', 'class-1', 'assignment-1')).toBeUndefined();
  });

  it('requires every attempt context field to match the verified student link', () => {
    const context = { studentId: 'student-1', classId: 'class-1', assignmentId: 'assignment-1' };
    expect(isSameStudentExamContext(context, context)).toBe(true);
    expect(isSameStudentExamContext(context, { ...context, studentId: 'student-2' })).toBe(false);
    expect(isSameStudentExamContext(context, { ...context, assignmentId: 'assignment-2' })).toBe(false);
  });
});
