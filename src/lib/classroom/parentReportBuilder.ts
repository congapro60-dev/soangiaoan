/**
 * Dựng báo cáo phụ huynh cho MỘT học sinh theo khoảng thời gian — dùng chung cho xuất từng em và xuất cả lớp,
 * để hai đường luôn ra cùng một nội dung.
 */
import type { AssignmentDoc, StudentProfileDoc, SubmissionDoc } from './types';
import type { StudentScoreView } from './scoreBook';
import { buildParentSafeReport, validScorePair, type ParentSafeReport } from './parentSafeReport';
import type { EvidenceQuestion, EvidenceSubmission } from './parentRequirements';
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
  /** Số liệu an toàn gửi AI soạn nháp nhận xét — không có họ tên hay ghi chú nội bộ. */
  facts: Record<string, unknown>;
  /** Từng câu của các bài đã duyệt trong kì — căn cứ để ghép vào yêu cầu cần đạt. */
  evidence: EvidenceSubmission[];
}

// Trần để một lượt AI xong trong ~50s và dữ liệu gửi đi < 60k kí tự (tháng thực tế ~90 câu mất ~25s).
const MAX_EVIDENCE_SUBMISSIONS = 16;
// Không cắt ít câu mỗi bài: phiếu dài (Phần I/II/III) có câu làm ĐÚNG ở cuối — cắt là mất bằng chứng, mức bị thấp oan.
const MAX_QUESTIONS_PER_SUBMISSION = 60;
const MAX_EVIDENCE_QUESTIONS = 120;
const MAX_EVIDENCE_CHARS = 45_000;
const QUESTION_RESULT_LABEL: Record<string, string> = {
  correct: 'đúng', partially_correct: 'đúng một phần', incorrect: 'sai', unreadable: 'không đọc được', not_attempted: 'bỏ trống',
};
/** Lấy `count` phần tử rải đều từ đầu tới cuối (giữ thứ tự) — báo cáo kì/năm không chỉ nhìn mấy bài cuối. */
const spreadEvenly = <T,>(items: readonly T[], count: number): T[] => {
  if (items.length <= count) return [...items];
  if (count <= 1) return items.slice(-1);
  return Array.from({ length: count }, (_, i) => items[Math.round((i * (items.length - 1)) / (count - 1))]);
};

const clip = (value: unknown, max: number): string | undefined => {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  return text ? text.slice(0, max) : undefined;
};

/**
 * Lượt ĐÃ DUYỆT gần nhất của mỗi bài trong kì → danh sách câu có điểm. Bài chấm trước khi có chi tiết câu
 * thì cả bài là một "câu". Không có tên học sinh; ghi chú nội bộ của giáo viên không đưa vào.
 */
export const buildRequirementEvidence = (
  submissions: readonly SubmissionDoc[],
  assignments: readonly AssignmentDoc[],
): EvidenceSubmission[] => {
  const titles = new Map(assignments.map(a => [a.id, a.title]));
  const latest = new Map<string, SubmissionDoc>();
  for (const submission of [...submissions].sort((l, r) => String(r.createdAt).localeCompare(String(l.createdAt)))) {
    if (!validScorePair(submission)) continue;
    const key = submission.assignmentId || `self:${submission.id}`;
    if (!latest.has(key)) latest.set(key, submission);
  }
  const questionCount = (s: SubmissionDoc) => Math.min(MAX_QUESTIONS_PER_SUBMISSION, Math.max(1, s.grade?.questionResults?.length ?? 1));
  const ordered = [...latest.values()].sort((l, r) => String(l.createdAt).localeCompare(String(r.createdAt)));
  let chosen = spreadEvenly(ordered, MAX_EVIDENCE_SUBMISSIONS);
  while (chosen.length > 1 && chosen.reduce((sum, s) => sum + questionCount(s), 0) > MAX_EVIDENCE_QUESTIONS) {
    chosen = spreadEvenly(ordered, chosen.length - 1);
  }
  // Dữ liệu vẫn quá dài thì cắt ngắn chữ từng câu dần, thay vì để máy chủ từ chối cả lượt.
  for (const scale of [1, 0.6, 0.35]) {
    const built = buildEvidenceRows(chosen, titles, scale);
    if (JSON.stringify(built).length <= MAX_EVIDENCE_CHARS || scale === 0.35) return built;
  }
  return [];
};

const buildEvidenceRows = (chosen: readonly SubmissionDoc[], titles: ReadonlyMap<string, string>, scale: number): EvidenceSubmission[] => {
  const n = (max: number) => Math.max(40, Math.round(max * scale));
  return chosen
    .map((submission, index) => {
      const ma = `b${index + 1}`;
      const grade = submission.grade!;
      const details = (grade.questionResults ?? []).filter(q => Number.isFinite(q.score) && Number.isFinite(q.maxScore) && q.maxScore > 0);
      const cau: EvidenceQuestion[] = details.length > 0
        ? details.slice(0, MAX_QUESTIONS_PER_SUBMISSION).map((q, qi) => ({
          ma: `${ma}q${qi + 1}`,
          diem: q.score,
          toiDa: q.maxScore,
          ketQua: QUESTION_RESULT_LABEL[q.status] ?? q.status,
          loi: clip(q.errorType, 80),
          giaiThich: clip(q.explanation, n(200)),
          dapAn: clip(q.expectedAnswer, n(110)),
          baiLam: scale === 1 ? clip(q.studentAnswer, 110) : undefined,
        }))
        : [{ ma, diem: grade.score, toiDa: grade.maxScore, ketQua: 'cả bài', giaiThich: clip([...(grade.strengths ?? []), ...(grade.weaknesses ?? [])].join('; '), 300) }];
      return { ma, ten: (submission.assignmentId && titles.get(submission.assignmentId)) || 'Bài tự nộp', ngay: vnDay(submission.createdAt), cau };
    });
};

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

  const evidence = buildRequirementEvidence(scoped.submissions, scoped.assignments);
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

  if (evidence.length > 0) facts.baiDaDuyet = evidence;

  return { report, printInput, facts, evidence };
};
