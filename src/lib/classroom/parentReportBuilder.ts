/**
 * Dựng báo cáo phụ huynh cho MỘT học sinh theo khoảng thời gian — dùng chung cho xuất từng em và xuất cả lớp,
 * để hai đường luôn ra cùng một nội dung.
 */
import type { AssignmentDoc, StudentProfileDoc, SubmissionDoc } from './types';
import type { StudentScoreView } from './scoreBook';
import { buildParentSafeReport, type ParentSafeReport } from './parentSafeReport';
import type { ParentCompetencyItem, ParentCompetencySummary, ParentReportPrintInput } from './parentReportPrintDoc';
import { buildStudentCompetencyPortfolio, portfolioProgress } from './competency/portfolioModel';
import { asCompetencyGrade } from './competency/framework';
import { filterForPeriod, monthlyAverages, periodComparison, rangeLabel, reportTitle, vnDay, type ReportPeriod } from './reportPeriod';

export interface ParentReportSource {
  studentId: string;
  studentName: string;
  className: string;
  studentCode?: string;
  classGrade?: string;
  assignments: readonly AssignmentDoc[];
  /** Bài nộp của CHÍNH học sinh này. */
  submissions: readonly SubmissionDoc[];
  profile: StudentProfileDoc | null;
  scoreView: StudentScoreView | null;
}

/** Hồ sơ năng lực rút gọn — chỉ tên năng lực + mức, qua cổng "bài đã duyệt". */
export const parentCompetencyFor = (
  classGrade: string | undefined,
  submissions: readonly SubmissionDoc[],
  assignments: readonly AssignmentDoc[],
): ParentCompetencySummary | null => {
  const grade = asCompetencyGrade(classGrade);
  if (!grade) return null;
  const subs = submissions.filter(s => s.grade).map(s => ({
    assignmentId: s.assignmentId ?? '',
    score: s.grade!.score,
    maxScore: s.grade!.maxScore,
    approved: Boolean(s.grade!.teacherApproved),
    submittedAt: s.createdAt,
  }));
  const areas = buildStudentCompetencyPortfolio(grade, subs, assignments.map(a => ({ id: a.id, competencyTags: a.competencyTags })));
  const { assessed, total } = portfolioProgress(areas);
  const items: ParentCompetencyItem[] = [];
  for (const area of areas) {
    for (const row of area.rows) {
      if (row.result?.level) items.push({ area: area.area, topic: row.competency.topic, level: row.result.level });
    }
  }
  return { grade: String(grade), assessed, total, items };
};

export interface PeriodParentReport {
  report: ParentSafeReport;
  /** Đầu vào bản in (chưa có nhận xét giáo viên). */
  printInput: Omit<ParentReportPrintInput, 'teacherComment'>;
  /** Số liệu an toàn gửi AI soạn nháp nhận xét — không có họ tên, đáp án hay ghi chú nội bộ. */
  facts: Record<string, unknown>;
}

const round1 = (value: number | null): number | null => (value === null ? null : Math.round(value * 10) / 10);

/** `period` null = báo cáo chung từ đầu năm như trước. */
export const buildPeriodParentReport = (src: ParentReportSource, period: ReportPeriod | null): PeriodParentReport => {
  const base = { studentId: src.studentId, studentName: src.studentName, className: src.className, profile: src.profile };
  const hs1All = src.scoreView?.hs1 ?? [];
  const scoped = period
    ? filterForPeriod(period, { assignments: src.assignments, submissions: src.submissions, hs1: hs1All })
    : { assignments: [...src.assignments], submissions: [...src.submissions], hs1: hs1All };
  const report = buildParentSafeReport({ ...base, assignments: scoped.assignments, submissions: scoped.submissions });

  let comparison = null;
  let monthly = null;
  if (period) {
    const full = buildParentSafeReport({ ...base, assignments: src.assignments, submissions: src.submissions });
    comparison = periodComparison(period, full.results);
    monthly = monthlyAverages(report.results);
  }
  // Năng lực là thứ tích luỹ: tính tới hết khoảng báo cáo (không cắt đầu khoảng).
  const upToEnd = period ? src.submissions.filter(s => { const day = vnDay(s.createdAt); return day !== '' && day <= period.to; }) : src.submissions;
  const competency = parentCompetencyFor(src.classGrade, upToEnd, src.assignments);
  const exams = src.scoreView?.exams ?? null;
  const title = period ? reportTitle(period) : 'Báo cáo học tập môn Toán';

  const printInput: Omit<ParentReportPrintInput, 'teacherComment'> = {
    report,
    studentName: src.studentName,
    className: src.className,
    studentCode: src.studentCode,
    competency,
    exams,
    hs1: scoped.hs1,
    period: period ? { title, range: rangeLabel(period), kind: period.kind } : null,
    comparison,
    monthly,
  };

  const facts: Record<string, unknown> = {
    loaiBaoCao: title,
    thoiGian: period ? rangeLabel(period) : 'Từ đầu năm học tới nay',
    diemTrungBinhPhanTram: round1(report.officialAveragePercent),
    xuHuong: report.progress.trend,
    soBaiDaCoKetQua: report.officialCount,
    soBaiChuaNop: report.missingCount,
    soBaiDangChoXuLy: report.pendingCount,
    diemManh: report.strengths.slice(0, 6),
    canRenThem: report.areasToPractice.slice(0, 6),
    ...(comparison ? { soSanh: { truoc: { ...comparison.before, avgPercent: round1(comparison.before.avgPercent) }, sau: { ...comparison.after, avgPercent: round1(comparison.after.avgPercent) } } } : {}),
    ...(exams && (exams.moet.length > 0 || exams.tds.length > 0) ? { diemThiDinhKi: [...exams.moet.map(m => `${m.label}: ${m.score}/10`), ...exams.tds.map(m => `${m.label}: ${m.score}${m.letter ? ` (${m.letter})` : ''}`)] } : {}),
    ...(scoped.hs1.length > 0 ? { diemHeSo1: scoped.hs1.map(m => `${m.label}: ${m.score}/10`) } : {}),
    ...(competency && competency.items.length > 0 ? { nangLuc: competency.items.slice(0, 12).map(i => `${i.topic}: ${i.level}`) } : {}),
  };

  return { report, printInput, facts };
};
