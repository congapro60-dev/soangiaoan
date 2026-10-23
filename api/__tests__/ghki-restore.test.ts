import { describe, expect, it } from 'vitest';
import { decideGhkiRestore, gradeAtCutoff, gradeTextBroken, latestCleanGrade } from '../_ghki-restore';
import type { SubmissionDoc, SubmissionGrade } from '../../src/lib/classroom/types';

const COLUMBUS = 'asg_1787d143-4d24-43a6-ae8c-d9e45a498258';
const OLINDA = 'asg_70eb10a9-912c-4551-b389-d5e43107d6c0';
const LOP12 = 'asg_ec30fd04-4486-47d0-aad8-a634c90cd0b5';
const row = (questionNumber: string) => ({ questionNumber, status: 'correct', score: 1, maxScore: 1, studentAnswer: 'A', expectedAnswer: 'A', errorType: '', explanation: '', correction: '', nextPractice: '', needsTeacherReview: false });
const grade = (over: Partial<SubmissionGrade> = {}) => ({ score: 5, maxScore: 10, feedback: 'Em làm tốt phần đầu.', strengths: [], weaknesses: [], weakTopics: ['Hàm số'], gradedAt: '2026-10-22T10:00:00.000Z', teacherApproved: false, questionResults: [row('Câu 1')], ...over }) as SubmissionGrade;
const broken = (over: Partial<SubmissionGrade> = {}) => grade({ feedback: 'Em l�m t�t', weakTopics: ['H�m s�'], ...over });
const sub = (id: string, assignmentId: string, g: SubmissionGrade, over: Partial<SubmissionDoc> = {}) => ({ id, assignmentId, status: 'graded', grade: g, classId: 'c', studentId: 's', teacherId: 't', ...over }) as SubmissionDoc;

describe('khôi phục GHKI 23/10', () => {
  it('lấy bản tại mốc = bản cất ở lần đổi ĐẦU TIÊN sau mốc; lần đổi trước mốc bỏ qua', () => {
    const yesterday = grade({ score: 9.5 });
    const history = [
      { createdAt: '2026-10-23T01:16:43.000Z', grade: grade({ score: 7.9 }) },
      { createdAt: '2026-10-23T01:07:30.000Z', grade: yesterday },
      { createdAt: '2026-10-22T08:00:00.000Z', grade: grade({ score: 1 }) },
    ];
    expect(gradeAtCutoff(history)).toBe(yesterday);
    expect(gradeAtCutoff([{ createdAt: '2026-10-22T08:00:00.000Z', grade: grade() }])).toBeUndefined();
  });

  it('Columbus: trả nguyên trạng trước sự cố, kể cả trạng thái CHƯA duyệt và bảng câu cũ', () => {
    const yesterday = grade({ score: 9.5, teacherApproved: false, questionResults: [row('Phần I – Câu 1'), row('Phần I – Câu 2')] });
    const now = broken({ score: 7.9, teacherApproved: true });
    const decision = decideGhkiRestore(sub('x', COLUMBUS, now), [{ createdAt: '2026-10-23T01:07:30.000Z', grade: yesterday }]);
    expect(decision).toMatchObject({ action: 'restore', grade: yesterday });
    expect(decision.grade?.teacherApproved).toBe(false);
  });

  it('Tuệ Minh: trả bản cũ nhưng điểm 4,85 theo bút đỏ', () => {
    const decision = decideGhkiRestore(sub('c7fd6025-8da3-4f63-9beb-fe4a536eb42e', COLUMBUS, broken({ score: 2.6 })), [{ createdAt: '2026-10-23T01:07:30.000Z', grade: grade({ score: 4.65 }) }]);
    expect(decision.grade).toMatchObject({ score: 4.85, feedback: 'Em làm tốt phần đầu.' });
  });

  it('Olinda / lớp 12: giữ điểm + duyệt hiện tại, chỉ thay trường hỏng chữ bằng bản sạch gần nhất', () => {
    const now = broken({ score: 3.5, teacherApproved: true, feedback: 'Em l�m', weakTopics: ['Đạo hàm'] });
    const history = [
      { createdAt: '2026-10-23T02:42:00.000Z', grade: now },
      { createdAt: '2026-10-23T00:56:00.000Z', grade: grade({ score: 6, feedback: 'Bản sạch mới nhất.' }) },
      { createdAt: '2026-10-22T10:00:00.000Z', grade: grade({ feedback: 'Bản sạch cũ.' }) },
    ];
    const decision = decideGhkiRestore(sub('o', OLINDA, now), history);
    expect(decision.grade).toMatchObject({ score: 3.5, teacherApproved: true, feedback: 'Bản sạch mới nhất.', weakTopics: ['Đạo hàm'] });
    expect(gradeTextBroken(decision.grade)).toBe(false);
  });

  it('lớp 12 df9ad9c6: bỏ 4 câu máy bịa Phần II, không đổi điểm bút đỏ', () => {
    const rows = ['Câu 1 (Phần II)', 'Câu 4 (Phần II)', 'Câu 5 (Phần II)', 'Câu 8 (Phần II)'].map(row);
    const decision = decideGhkiRestore(sub('df9ad9c6-a3c6-46df-acb8-abb9ded6678a', LOP12, grade({ score: 4.85, questionResults: rows })), []);
    expect(decision.removedRows).toEqual(['Câu 5 (Phần II)', 'Câu 8 (Phần II)']);
    expect(decision.grade?.questionResults?.map(r => r.questionNumber)).toEqual(['Câu 1 (Phần II)', 'Câu 4 (Phần II)']);
    expect(decision.grade?.score).toBe(4.85);
  });

  it('Hải Phong: bài ghép lấy lời phê sạch từ phiếu gốc; 2 bài lẻ để nguyên', () => {
    const merged = decideGhkiRestore(sub('1da12eb5-a1d2-4f47-b9e0-113f5d4efc26', COLUMBUS, broken({ score: 6.9, teacherApproved: true })), [],
      [{ createdAt: '2026-10-23T02:20:45.000Z', grade: grade({ score: 5, feedback: 'Lời phê phiếu.' }) }]);
    // bài ghép thuộc Columbus nhưng tạo SAU mốc: chỉ sửa chữ, KHÔNG trả về bản lúc mới tạo
    expect(merged.grade).toMatchObject({ score: 6.9, teacherApproved: true, feedback: 'Lời phê phiếu.' });
    expect(decideGhkiRestore(sub('5988c78a-0ca4-4b53-b3b9-c5524a74c151', COLUMBUS, broken()), []).action).toBe('skip');
    expect(decideGhkiRestore(sub('f0bb7b6c-ee48-4c06-a8ac-3b3798518d36', COLUMBUS, broken()), []).action).toBe('skip');
  });

  it('chạy lại an toàn; bài không thuộc GHKI, đang chấm, không có bản sạch → giữ nguyên', () => {
    expect(decideGhkiRestore({ ...sub('o', OLINDA, broken()), ghkiRestoredAt: 'x' } as never, []).reason).toBe('Đã khôi phục.');
    expect(decideGhkiRestore(sub('o', 'asg_khac', broken()), []).action).toBe('skip');
    expect(decideGhkiRestore(sub('o', OLINDA, broken(), { status: 'grading' }), []).action).toBe('skip');
    expect(decideGhkiRestore(sub('o', OLINDA, broken()), [{ createdAt: '2026-10-23T01:00:00.000Z', grade: broken() }]).reason).toContain('viết lại tay');
    expect(decideGhkiRestore(sub('o', OLINDA, grade()), []).reason).toBe('Lời phê đã sạch.');
    expect(latestCleanGrade([])).toBeUndefined();
  });
});
