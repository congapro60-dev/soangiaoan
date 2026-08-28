import { describe, expect, it } from 'vitest';
import type { Exam } from '../../types';
import {
  buildExamContentSnapshot,
  canEditExamContent,
  getExamContentHash,
} from './activitySnapshot';

const baseExam = (overrides: Partial<Exam> = {}): Exam => ({
  id: 'exam-1',
  code: 'ABC123',
  title: 'Đề Toán',
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

describe('activity snapshot', () => {
  it('creates deterministic version/hash and separates student content from teacher key', () => {
    const first = buildExamContentSnapshot(baseExam());
    const second = buildExamContentSnapshot(baseExam());

    expect(first.contentVersion).toBe(second.contentVersion);
    expect(first.contentHash).toBe(second.contentHash);
    expect(first.studentQuestions[0]).not.toHaveProperty('correctAnswer');
    expect(first.studentQuestions[0]).not.toHaveProperty('explanation');
    expect(first.teacherQuestions[0].correctAnswer).toBe('$1$');
    expect(first.teacherQuestions[0].explanation).toBe('Trừ 1 ở hai vế');
  });

  it('changes the hash when canonical question content changes', () => {
    expect(getExamContentHash(baseExam())).not.toBe(getExamContentHash(baseExam({
      questions: [{
        ...baseExam().questions[0],
        content: '$x+2=2$',
      }],
    })));
  });

  it('blocks content patches after publishing an immutable exam', () => {
    expect(canEditExamContent(baseExam({ isImmutableAfterPublish: true }), { title: 'Tên mới' })).toEqual({
      allowed: true,
      requiresNewVersion: false,
    });
    expect(canEditExamContent(baseExam({ isImmutableAfterPublish: true }), {
      questions: [{ ...baseExam().questions[0], content: 'Nội dung mới' }],
    })).toEqual({
      allowed: false,
      requiresNewVersion: true,
    });
  });
});
