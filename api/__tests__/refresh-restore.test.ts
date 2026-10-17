import { describe, expect, it } from 'vitest';
import { decideRestore, withCurrentMarks } from '../_refresh-restore';
import type { QuestionResult, SubmissionDoc, SubmissionGrade } from '../../src/lib/classroom/types';

const row = (questionNumber: string, over: Partial<QuestionResult> = {}): QuestionResult => ({
  questionNumber, status: 'correct', score: 1, maxScore: 1, studentAnswer: 'A', expectedAnswer: 'A',
  errorType: '', explanation: '', correction: '', nextPractice: '', needsTeacherReview: false, ...over,
});
const mark = { imageIndex: 1, imageUrl: 'https://storage.test/a.jpg', x: .1, y: .2, width: .2, height: .1, confidence: .95 };
const oldGrade = { score: 8.65, maxScore: 10, feedback: 'cũ', teacherApproved: true, approvalSource: 'teacher', gradedAt: '2026-10-10T00:00:00.000Z', questionResults: [row('Câu 1', { score: 0.5 })] } as unknown as SubmissionGrade;
const newGrade = { score: 8.8, maxScore: 10, feedback: 'mới', teacherApproved: false, gradedAt: '2026-10-15T11:23:04.833Z', questionResults: [row('câu 1.', { photoMarks: [mark] })] } as unknown as SubmissionGrade;
const sub = (grade: SubmissionGrade, over: Partial<SubmissionDoc> = {}) => ({ id: 's', status: 'graded', grade, ...over }) as SubmissionDoc;
const history = [{ action: 'ai_regrade', createdAt: newGrade.gradedAt, grade: oldGrade }];

describe('khôi phục sau sự cố chấm lại 15–16/10', () => {
  it('bài bị job chấm lại (lịch sử cùng mốc giờ) → trả lại grade cũ', () => {
    expect(decideRestore(sub(newGrade), history)).toMatchObject({ action: 'restore', oldGrade });
  });

  it('điểm mới đã được duyệt sau đợt (tự duyệt hay bấm duyệt hàng loạt) vẫn khôi phục — chủ dự án chốt 17/10', () => {
    expect(decideRestore(sub({ ...newGrade, teacherApproved: true, approvalSource: 'auto_timeout' } as SubmissionGrade), history).action).toBe('restore');
    expect(decideRestore(sub({ ...newGrade, teacherApproved: true, approvalSource: 'teacher' } as SubmissionGrade), history).action).toBe('restore');
  });

  it('thầy cô sửa tay / bài chấm lại thêm sau đợt (mốc lệch) / đã khôi phục / đang chấm → giữ nguyên', () => {
    expect(decideRestore(sub({ ...newGrade, editedByTeacher: true } as SubmissionGrade), history).action).toBe('skip');
    expect(decideRestore(sub({ ...newGrade, gradedAt: '2026-10-16T09:00:00.000Z' } as SubmissionGrade), history).reason).toContain('sau đợt chạy');
    expect(decideRestore({ ...sub(newGrade), refreshRestoredAt: 'x' }, history).reason).toBe('Đã khôi phục.');
    expect(decideRestore(sub(newGrade, { status: 'grading' }), history).action).toBe('skip');
    expect(decideRestore(null, history).action).toBe('skip');
  });

  it('ghép dấu trên ảnh mới vào bảng câu cũ theo nhãn; giữ nguyên điểm câu cũ và câu GV đã bỏ dấu', () => {
    const merged = withCurrentMarks([row('Câu 1', { score: 0.5 }), row('Câu 2', { photoMarksCleared: true })], [row('câu 1.', { photoMarks: [mark] }), row('Câu 2', { photoMarks: [mark] })]);
    expect(merged[0]).toMatchObject({ score: 0.5, photoMarks: [mark] });
    expect(merged[1].photoMarks).toBeUndefined();
  });
});
