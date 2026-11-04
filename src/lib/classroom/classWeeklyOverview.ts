/**
 * Thống kê CẢ LỚP theo tuần học: mỗi tuần số bài giao, tỉ lệ nộp, điểm trung bình và số lượt chưa nộp — để thấy tuần nào lớp tụt.
 * Tuần đánh số theo Lịch dạy (xem `reportWeeks`). Điểm trung bình tính trên bài đã có điểm chính thức, mỗi bài nặng theo số bằng chứng.
 */
import type { ClassAssignmentReport } from './classReportModel';
import { groupResultsByWeek, weekTitle, type WeekGroup, type WeekPlan } from './reportWeeks';

export interface WeeklyOverviewRow {
  /** Thứ Hai của tuần; '' = bài không có ngày. */
  monday: string;
  title: string;
  assignments: number;
  /** Số lượt nộp / số lượt đáng ra phải nộp (bài × sĩ số). */
  submitted: number;
  expected: number;
  /** % lượt nộp; null khi chưa có bài nào có sĩ số. */
  submitRate: number | null;
  /** Điểm trung bình lớp (%), null khi chưa bài nào có điểm chính thức. */
  averagePercent: number | null;
  missing: number;
}

export const buildWeeklyOverview = (reports: readonly ClassAssignmentReport[], plan: WeekPlan | null | undefined): WeeklyOverviewRow[] => {
  const byId = new Map(reports.map(report => [report.assignment.id, report]));
  const groups: WeekGroup[] = groupResultsByWeek(reports.map(report => ({
    assignmentId: report.assignment.id, title: report.assignment.title, status: 'official' as const, score: null, maxScore: null,
    ...(report.assignment.weekDate ? { dueAt: report.assignment.weekDate } : {}),
  })), plan);
  return groups.map(group => {
    const rows = group.results.flatMap(result => { const report = byId.get(result.assignmentId); return report ? [report] : []; });
    const submitted = rows.reduce((sum, report) => sum + report.counters.submitted, 0);
    const expected = rows.reduce((sum, report) => sum + report.counters.roster, 0);
    const weight = rows.reduce((sum, report) => sum + (report.averagePercent === null ? 0 : report.metrics.officialEvidenceCount || 1), 0);
    const averagePercent = weight === 0 ? null : Math.round(rows.reduce((sum, report) => (
      report.averagePercent === null ? sum : sum + report.averagePercent * (report.metrics.officialEvidenceCount || 1)), 0) / weight * 10) / 10;
    return {
      monday: group.monday,
      title: weekTitle(group),
      assignments: rows.length,
      submitted,
      expected,
      submitRate: expected > 0 ? Math.round(submitted / expected * 100) : null,
      averagePercent,
      missing: rows.reduce((sum, report) => sum + report.counters.missing, 0),
    };
  });
};
