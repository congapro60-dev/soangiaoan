import { describe, expect, it } from 'vitest';
import type { Exam } from '../../types';
import {
  buildActivityExportPlan,
  finalizeActivityExportBundle,
} from './activityExport';

const exam = (overrides: Partial<Exam> = {}): Exam => ({
  id: 'exam-1',
  code: 'ABC123',
  title: 'Đề Toán tuần 1',
  subjectId: 'toan',
  teacherId: 'teacher-1',
  teacherName: 'Giáo viên',
  questions: [{
    id: 'q1',
    type: 'multiple_choice',
    content: '$x+1=2$',
    options: ['$0$', '$1$'],
    correctAnswer: '$1$',
    explanation: 'Trừ 1 ở hai vế',
    points: 1,
  }],
  durationMinutes: 30,
  maxScore: 1,
  isActive: true,
  allowReview: true,
  shuffleQuestions: false,
  createdAt: '2026-08-28T08:00:00.000Z',
  updatedAt: '2026-08-28T08:00:00.000Z',
  ...overrides,
});

describe('activity export contract', () => {
  it('builds student and teacher payloads from one immutable snapshot', () => {
    const plan = buildActivityExportPlan(exam(), 'both');

    expect(plan.contentVersion).toBeTruthy();
    expect(plan.contentHash).toBeTruthy();
    expect(plan.student.questions[0]).not.toHaveProperty('correctAnswer');
    expect(plan.student.questions[0]).not.toHaveProperty('explanation');
    expect(plan.teacher.questions[0].correctAnswer).toBe('$1$');
    expect(plan.student.contentVersion).toBe(plan.teacher.contentVersion);
    expect(plan.student.contentHash).toBe(plan.teacher.contentHash);
    expect(plan.requestedFormats).toEqual(['pdf', 'docx']);
  });

  it('marks both-format export ready only when all requested outputs match the snapshot', () => {
    const plan = buildActivityExportPlan(exam(), 'both');
    const ready = finalizeActivityExportBundle(plan, {
      studentPdfUrl: 'https://example.test/student.pdf',
      studentDocxUrl: 'https://example.test/student.docx',
      teacherKeyPdfUrl: 'https://example.test/teacher.pdf',
      teacherKeyDocxUrl: 'https://example.test/teacher.docx',
      generatedAt: '2026-08-28T10:00:00.000Z',
    });

    expect(ready).toMatchObject({
      status: 'ready',
      contentVersion: plan.contentVersion,
      contentHash: plan.contentHash,
    });
  });

  it('returns an actionable error instead of ready when a requested backup is missing', () => {
    const plan = buildActivityExportPlan(exam(), 'both');
    const result = finalizeActivityExportBundle(plan, {
      studentPdfUrl: 'https://example.test/student.pdf',
      generatedAt: '2026-08-28T10:00:00.000Z',
    });

    expect(result.status).toBe('error');
    expect(result.errorMessage).toContain('DOCX');
  });

  it('keeps a changed exam on a different content hash', () => {
    const first = buildActivityExportPlan(exam(), 'pdf');
    const second = buildActivityExportPlan(exam({ questions: [{ ...exam().questions[0], content: '$x+2=2$' }] }), 'pdf');

    expect(second.contentHash).not.toBe(first.contentHash);
    expect(second.contentVersion).not.toBe(first.contentVersion);
  });
});
