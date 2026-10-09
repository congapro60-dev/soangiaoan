import { describe, expect, it } from 'vitest';
import { buildWeeklyOverview } from './classWeeklyOverview';
import type { ClassAssignmentReport } from './classReportModel';

const report = (id: string, weekDate: string | undefined, roster: number, submitted: number, avg: number | null, evidence: number): ClassAssignmentReport => ({
  assignment: { id, title: id, type: 'x', ...(weekDate ? { weekDate } : {}) },
  counters: { roster, submitted, graded: submitted, official: evidence, pending: 0, missing: roster - submitted },
  averagePercent: avg, metrics: { averagePercent: avg, medianPercent: avg, officialEvidenceCount: evidence },
} as unknown as ClassAssignmentReport);

describe('thống kê cả lớp theo tuần', () => {
  const plan = { week1Monday: '2026-08-17', skippedWeeks: [] };
  it('gộp theo tuần (mới nhất trước), tỉ lệ nộp, điểm TB có trọng số theo số bằng chứng, lượt chưa nộp', () => {
    const rows = buildWeeklyOverview([
      report('a', '2026-10-06T10:00:00.000Z', 30, 27, 80, 27),
      report('b', '2026-10-08T10:00:00.000Z', 30, 15, 60, 15),
      report('c', '2026-09-29T10:00:00.000Z', 30, 30, 90, 30),
      report('d', undefined, 30, 0, null, 0),
    ], plan);
    expect(rows.map(r => r.title)).toEqual(['Tuần 8 · 5/10 – 11/10', 'Tuần 7 · 28/9 – 4/10', 'Chưa rõ tuần']);
    expect(rows[0]).toMatchObject({ assignments: 2, submitted: 42, expected: 60, submitRate: 70, averagePercent: 72.9, missing: 18 });
    expect(rows[1]).toMatchObject({ assignments: 1, submitRate: 100, averagePercent: 90, missing: 0 });
    expect(rows[2]).toMatchObject({ assignments: 1, submitRate: 0, averagePercent: null, missing: 30 });
  });
});
