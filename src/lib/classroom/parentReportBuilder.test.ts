import { describe, expect, it } from 'vitest';
import type { AssignmentDoc, SubmissionDoc } from './types';
import { buildPeriodParentReport } from './parentReportBuilder';

const asg = (id: string, dueAt: string, title: string): AssignmentDoc =>
  ({ id, title, dueAt, createdAt: dueAt, maxScore: 10, teacherId: 't', classId: 'c', type: 'homework' }) as unknown as AssignmentDoc;
const graded = (id: string, assignmentId: string, createdAt: string, score: number): SubmissionDoc => ({
  id, assignmentId, createdAt, updatedAt: createdAt, studentId: 'hs', teacherId: 't', classId: 'c', fileUrls: [], note: '', status: 'graded',
  grade: { score, maxScore: 10, feedback: '', teacherApproved: true, gradedAt: createdAt, strengths: [], weaknesses: [], weakTopics: [] },
} as unknown as SubmissionDoc);

const src = {
  studentId: 'hs', studentName: 'Nguyễn Văn An', className: '10A', studentCode: 'M01',
  assignments: [asg('a9', '2026-09-20T02:00:00Z', 'BTVN tháng 9'), asg('a10', '2026-10-10T02:00:00Z', 'BTVN tháng 10')],
  submissions: [graded('n9', 'a9', '2026-09-19T02:00:00Z', 5), graded('n10', 'a10', '2026-10-09T02:00:00Z', 8)],
  profile: null,
  scoreView: { exams: { moet: [{ label: 'KSĐN', score: 6 }], tds: [] }, hs1: [{ label: '15p', date: '2026-10-05', score: 9 }, { label: '15p', date: '2026-09-05', score: 4 }] },
};

describe('dựng báo cáo phụ huynh theo kì', () => {
  it('báo cáo tháng 10: chỉ bài tháng 10, so sánh với tháng 9, tiêu đề + khoảng, HS1 đúng tháng', () => {
    const out = buildPeriodParentReport(src, { kind: 'month', from: '2026-10-01', to: '2026-10-31' });
    expect(out.report.results.map(r => r.title)).toEqual(['BTVN tháng 10']);
    expect(out.printInput.period).toEqual({ title: 'Báo cáo học tập tháng 10/2026', range: 'Từ 01/10/2026 đến 31/10/2026', kind: 'month' });
    expect(out.printInput.comparison).toMatchObject({ before: { avgPercent: 50 }, after: { avgPercent: 80 } });
    expect(out.printInput.hs1).toEqual([{ label: '15p', date: '2026-10-05', score: 9 }]);
    expect(out.printInput.exams?.moet).toHaveLength(1);
  });

  it('dữ liệu gửi AI không chứa họ tên hay mã học sinh', () => {
    const facts = JSON.stringify(buildPeriodParentReport(src, { kind: 'gk1', from: '2026-09-01', to: '2026-10-31' }).facts);
    expect(facts).not.toContain('Nguyễn Văn An');
    expect(facts).not.toContain('M01');
    expect(facts).toContain('KSĐN: 6/10');
  });

  it('bằng chứng YCCĐ: lượt đã duyệt mới nhất mỗi bài, từng câu có mã; bài không có chi tiết câu thì cả bài là một câu', () => {
    const detailed = graded('n9b', 'a9', '2026-09-19T05:00:00Z', 6);
    detailed.grade!.questionResults = [
      { questionNumber: 'Câu 1', status: 'correct', score: 4, maxScore: 4, studentAnswer: 'x', expectedAnswer: 'A = {1; 2}', errorType: '', explanation: 'Đúng', correction: '', nextPractice: '', needsTeacherReview: false },
      { questionNumber: 'Câu 2', status: 'incorrect', score: 2, maxScore: 6, studentAnswer: 'y', expectedAnswer: 'B', errorType: 'Nhầm giao với hợp', explanation: 'Lấy hợp thay vì giao', correction: '', nextPractice: '', needsTeacherReview: false },
    ];
    const unapproved = graded('n10b', 'a10', '2026-10-09T09:00:00Z', 10);
    unapproved.grade!.teacherApproved = false;
    const out = buildPeriodParentReport({ ...src, submissions: [...src.submissions, detailed, unapproved] }, { kind: 'gk1', from: '2026-09-01', to: '2026-10-31' });
    expect(out.evidence.map(e => [e.ma, e.ten, e.cau.map(q => [q.ma, q.diem, q.toiDa])])).toEqual([
      ['b1', 'BTVN tháng 9', [['b1q1', 4, 4], ['b1q2', 2, 6]]],
      ['b2', 'BTVN tháng 10', [['b2', 8, 10]]],
    ]);
    expect(out.evidence[0].cau[1]).toMatchObject({ ketQua: 'sai', loi: 'Nhầm giao với hợp' });
    expect(out.facts.baiDaDuyet).toBe(out.evidence);
    expect(JSON.stringify(out.evidence)).not.toContain('Nguyễn Văn An');
  });

  it('bằng chứng kì dài: rải đều cả kì, không quá 120 câu, dữ liệu gửi AI không vượt trần', () => {
    const many = Array.from({ length: 30 }, (_, i) => {
      const day = `2026-${String(9 + Math.floor(i / 10)).padStart(2, '0')}-${String(1 + (i % 10) * 2).padStart(2, '0')}T02:00:00Z`;
      const s = graded(`s${i}`, `x${i}`, day, 7);
      s.grade!.questionResults = Array.from({ length: 10 }, (_, q) => ({
        questionNumber: `Câu ${q + 1}`, status: 'correct' as const, score: 1, maxScore: 1, studentAnswer: 'bài làm '.repeat(40),
        expectedAnswer: 'đáp án '.repeat(40), errorType: '', explanation: 'giải thích '.repeat(60), correction: '', nextPractice: '', needsTeacherReview: false,
      }));
      return s;
    });
    const asgs = many.map((s, i) => asg(`x${i}`, s.createdAt, `Bài ${i}`));
    const out = buildPeriodParentReport({ ...src, assignments: asgs, submissions: many }, { kind: 'ck1', from: '2026-09-01', to: '2026-11-30' });
    const questions = out.evidence.reduce((sum, e) => sum + e.cau.length, 0);
    expect(questions).toBeLessThanOrEqual(120);
    expect(out.evidence[0].ten).toBe('Bài 0');
    expect(out.evidence.at(-1)!.ten).toBe('Bài 29');
    expect(JSON.stringify(out.evidence).length).toBeLessThanOrEqual(45_000);
  });

  it('không chọn kì thì giữ báo cáo chung như trước', () => {
    const out = buildPeriodParentReport(src, null);
    expect(out.report.results).toHaveLength(2);
    expect(out.printInput.period).toBeNull();
    expect(out.printInput.comparison).toBeNull();
  });
});
