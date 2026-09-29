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

  it('không chọn kì thì giữ báo cáo chung như trước', () => {
    const out = buildPeriodParentReport(src, null);
    expect(out.report.results).toHaveLength(2);
    expect(out.printInput.period).toBeNull();
    expect(out.printInput.comparison).toBeNull();
  });
});
