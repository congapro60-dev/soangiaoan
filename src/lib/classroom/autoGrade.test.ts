import { describe, expect, it } from 'vitest';
import type { QuestionResult, SubmissionDoc, SubmissionGrade } from './types';
import { AUTO_GRADE_AFTER_MS, autoGradeEnabledFor, canAutoApproveFreshGrade, planAutoSweep } from './autoGrade';

const NOW = Date.parse('2026-09-25T12:00:00.000Z');
const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

const grade = (approved: boolean, gradedAt: string, confidence = 0.95): SubmissionGrade => ({
  score: 7, maxScore: 10, feedback: '', teacherApproved: approved, gradedAt,
  questionResults: [{ confidence } as QuestionResult],
} as SubmissionGrade);

const sub = (id: string, studentId: string, createdAt: string, patch: Partial<SubmissionDoc> = {}): SubmissionDoc => ({
  id, teacherId: 't', classId: 'c', studentId, assignmentId: 'a', fileUrls: [], note: '',
  status: 'submitted', createdAt, updatedAt: createdAt, ...patch,
} as SubmissionDoc);

describe('tự chấm + tự duyệt sau 60 phút', () => {
  it('chấm bài chờ quá 60 phút tính từ lúc nộp; chưa đủ 60 phút hoặc bài lỗi thì chưa đụng', () => {
    const plan = planAutoSweep([
      sub('qua-han', 'A', ago(61)),
      sub('moi-nop', 'B', ago(30)),
      sub('loi', 'C', ago(120), { status: 'error' }),
      sub('khoa-chet', 'D', ago(90), { status: 'grading', updatedAt: ago(10) }),
      sub('dang-cham', 'E', ago(90), { status: 'grading', updatedAt: ago(0.5) }),
    ], NOW);
    expect(plan.toGrade.map(s => s.id).sort()).toEqual(['khoa-chet', 'qua-han']);
  });

  it('chỉ tính lượt nộp mới nhất của mỗi em', () => {
    const plan = planAutoSweep([
      sub('cu', 'A', ago(200)),
      sub('moi', 'A', ago(20)),
    ], NOW);
    expect(plan.toGrade).toEqual([]);
  });

  it('duyệt bài đã chấm quá 60 phút tính từ lúc chấm; bài máy đọc chưa chắc giữ lại', () => {
    const plan = planAutoSweep([
      sub('duyet', 'A', ago(300), { status: 'graded', grade: grade(false, ago(70)) }),
      sub('moi-cham', 'B', ago(300), { status: 'graded', grade: grade(false, ago(10)) }),
      sub('chua-chac', 'C', ago(300), { status: 'graded', grade: grade(false, ago(70), 0.3) }),
      sub('da-duyet', 'D', ago(300), { status: 'graded', grade: grade(true, ago(70)) }),
    ], NOW);
    expect(plan.toApprove.map(s => s.id)).toEqual(['duyet']);
  });

  it('bài máy vừa tự chấm: duyệt luôn nếu đọc chắc; lớp tắt thì không chạy', () => {
    expect(canAutoApproveFreshGrade(sub('x', 'A', ago(70), { status: 'graded', grade: grade(false, ago(0)) }))).toBe(true);
    expect(canAutoApproveFreshGrade(sub('y', 'A', ago(70), { status: 'graded', grade: grade(false, ago(0), 0.2) }))).toBe(false);
    expect(autoGradeEnabledFor(undefined)).toBe(true);
    expect(autoGradeEnabledFor({ autoGradeAfterHour: false })).toBe(false);
    expect(AUTO_GRADE_AFTER_MS).toBe(3_600_000);
  });
});
