import { describe, expect, it } from 'vitest';
import type { SubmissionDoc } from './types';
import type { ParentSafeAssignmentResult } from './parentSafeReport';
import { defaultPeriod, filterForPeriod, monthlyAverages, periodComparison, periodError, rangeLabel, reportTitle, schoolYearStart } from './reportPeriod';

const sub = (id: string, assignmentId: string | null, createdAt: string): SubmissionDoc =>
  ({ id, assignmentId, createdAt, studentId: 's', teacherId: 't', classId: 'c', status: 'graded', fileUrls: [], note: '', updatedAt: createdAt }) as SubmissionDoc;

const official = (submittedAt: string, score: number): ParentSafeAssignmentResult =>
  ({ assignmentId: submittedAt, title: 'Bài', status: 'official', submittedAt, score, maxScore: 10 });

describe('báo cáo phụ huynh theo kì', () => {
  it('khoảng điền sẵn theo năm học (từ tháng 8 là năm học mới), tháng lấy trọn tháng', () => {
    expect(schoolYearStart('2026-09-29')).toBe(2026);
    expect(schoolYearStart('2027-03-01')).toBe(2026);
    expect(defaultPeriod('month', '2026-09-29')).toEqual({ kind: 'month', from: '2026-09-01', to: '2026-09-30' });
    expect(defaultPeriod('month', '2026-09-29', '2027-02')).toMatchObject({ from: '2027-02-01', to: '2027-02-28' });
    expect(defaultPeriod('ck1', '2026-09-29')).toMatchObject({ from: '2026-09-01', to: '2027-01-15' });
    expect(defaultPeriod('year', '2027-04-02')).toMatchObject({ from: '2026-09-01', to: '2027-05-31', hk2From: '2027-01-16' });
  });

  it('kiểm khoảng + tiêu đề', () => {
    expect(periodError({ kind: 'gk1', from: '2026-11-01', to: '2026-10-01' })).toMatch(/trước/);
    expect(periodError({ kind: 'year', from: '2026-09-01', to: '2027-05-31', hk2From: '2027-07-01' })).toMatch(/học kì II/);
    expect(periodError(defaultPeriod('gk2', '2026-09-29'))).toBeNull();
    expect(reportTitle(defaultPeriod('month', '2026-10-05'))).toBe('Báo cáo học tập tháng 10/2026');
    expect(reportTitle(defaultPeriod('gk1', '2026-10-05'))).toBe('Báo cáo giữa học kì I — năm học 2026–2027');
    expect(rangeLabel({ kind: 'gk1', from: '2026-09-01', to: '2026-10-31' })).toBe('Từ 01/09/2026 đến 31/10/2026');
  });

  it('lọc theo khoảng: bài giao theo hạn nộp (giờ VN), bài nộp tới hết ngày cuối, HS1 theo ngày kiểm tra', () => {
    const period = { kind: 'month' as const, from: '2026-10-01', to: '2026-10-31' };
    const assignments = [
      { id: 'a9', dueAt: '2026-09-30T20:00:00.000Z' },    // 03:00 01/10 giờ VN → thuộc tháng 10
      { id: 'a10', dueAt: '2026-10-15T10:00:00.000Z' },
      { id: 'a11', createdAt: '2026-11-02T01:00:00.000Z' },
    ];
    const out = filterForPeriod(period, {
      assignments,
      submissions: [
        sub('n1', 'a10', '2026-10-14T01:00:00.000Z'),
        sub('n-muon', 'a10', '2026-11-03T01:00:00.000Z'),
        sub('tu-do', null, '2026-10-20T01:00:00.000Z'),
        sub('tu-do-cu', null, '2026-09-20T01:00:00.000Z'),
      ],
      hs1: [{ label: '15p', date: '2026-10-10', score: 8 }, { label: '15p', date: '2026-09-10', score: 6 }],
    });
    expect(out.assignments.map(a => a.id)).toEqual(['a9', 'a10']);
    expect(out.submissions.map(s => s.id)).toEqual(['n1', 'tu-do']);
    expect(out.hs1).toHaveLength(1);
  });

  it('điểm theo tháng + so sánh tháng trước / hai nửa kì / hai học kì', () => {
    const results = [official('2026-09-10T03:00:00Z', 5), official('2026-10-05T03:00:00Z', 7), official('2026-10-25T03:00:00Z', 9), official('2027-02-01T03:00:00Z', 8)];
    expect(monthlyAverages(results).map(p => [p.month, Math.round(p.avgPercent), p.count])).toEqual([['2026-09', 50, 1], ['2026-10', 80, 2], ['2027-02', 80, 1]]);

    const thang = periodComparison(defaultPeriod('month', '2026-10-05'), results);
    expect(thang).toMatchObject({ before: { label: 'Tháng 9/2026', avgPercent: 50 }, after: { label: 'Tháng 10/2026', avgPercent: 80 } });

    const nam = periodComparison(defaultPeriod('year', '2026-10-05'), results);
    expect(nam?.before).toMatchObject({ label: 'Học kì I', count: 3 });
    expect(nam?.after).toMatchObject({ label: 'Học kì II', count: 1, avgPercent: 80 });

    const ky = periodComparison({ kind: 'gk1', from: '2026-09-01', to: '2026-10-31' }, results);
    expect(ky?.before.count).toBe(1);
    expect(ky?.after.count).toBe(2);
    expect(periodComparison(defaultPeriod('month', '2027-04-05'), results)).toBeNull();
  });
});
