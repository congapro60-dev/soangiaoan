import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BarChart3, Download, Loader2, RefreshCw } from 'lucide-react';
import { getSubmissions } from '../../../hooks/useExams';
import { listAssignmentsForClass, listSubmissionsForClass } from '../../../lib/classroom/submissionService';
import {
  buildClassAssignmentReport,
  type ClassAssignmentReport as ClassAssignmentReportMetrics,
  type ClassReportAssignment,
  type ClassReportQuestionStats,
  type ClassReportQuestionResult,
  type ClassReportSubmission,
} from '../../../lib/classroom/classReportModel';
import type { AssignmentDoc, SubmissionDoc } from '../../../lib/classroom/types';
import type { ClassAssignment, Exam, ExamSubmission, Student } from '../../../types';

export interface ClassAssignmentReportProps {
  classId: string;
  teacherId: string;
  className: string;
  students: Student[];
  onlineAssignments: ClassAssignment[];
  exams: Exam[];
}

const asFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const asText = (value: unknown): string => (typeof value === 'string' ? value : String(value ?? ''));

const normalizeMatchText = (value: unknown): string => asText(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLocaleLowerCase('vi-VN');

const mapQuestionResult = (result: {
  questionNumber?: unknown;
  status?: unknown;
  score?: unknown;
  maxScore?: unknown;
  errorType?: unknown;
  weakTopics?: unknown;
}): ClassReportQuestionResult => ({
  questionNumber: asText(result.questionNumber),
  status: asText(result.status),
  score: asFiniteNumber(result.score),
  maxScore: asFiniteNumber(result.maxScore),
  errorType: typeof result.errorType === 'string' ? result.errorType : null,
  weakTopics: Array.isArray(result.weakTopics)
    ? result.weakTopics.filter((topic): topic is string => typeof topic === 'string')
    : typeof result.weakTopics === 'string' ? result.weakTopics : [],
});

export const adaptUploadSubmission = (
  submission: SubmissionDoc,
  assignment: Pick<AssignmentDoc, 'id' | 'maxScore'>,
): ClassReportSubmission => {
  const grade = submission.grade;
  return {
    id: asText(submission.id),
    studentKey: asText(submission.studentId),
    createdAt: asText(submission.createdAt),
    status: asText(submission.status),
    score: asFiniteNumber(grade?.score),
    maxScore: asFiniteNumber(grade?.maxScore) ?? asFiniteNumber(assignment.maxScore),
    official: submission.status === 'graded' && grade?.teacherApproved === true,
    weakTopics: grade?.weakTopics ?? [],
    questionResults: (grade?.questionResults ?? []).map(mapQuestionResult),
  };
};

const scoreForAnswer = (answer: ExamSubmission['answers'][number] | undefined): number | null =>
  asFiniteNumber(answer?.autoScore) ?? asFiniteNumber(answer?.aiScore);

export const adaptOnlineSubmission = (
  submission: ExamSubmission,
  exam: Exam,
  roster: readonly Student[],
  className: string,
): ClassReportSubmission | null => {
  const submittedClassKey = normalizeMatchText(submission.studentClass);
  const selectedClassKey = normalizeMatchText(className);
  if (submittedClassKey && submittedClassKey !== selectedClassKey) return null;

  const submittedNameKey = normalizeMatchText(submission.studentName);
  let student: Student | undefined;
  if (submission.studentId) {
    const byId = roster.find(candidate => candidate.id === submission.studentId);
    if (!byId || (submittedNameKey && normalizeMatchText(byId.name) !== submittedNameKey)) return null;
    student = byId;
  } else {
    const nameMatches = roster.filter(candidate => normalizeMatchText(candidate.name) === submittedNameKey);
    if (nameMatches.length !== 1) return null;
    student = nameMatches[0];
  }
  if (!student) return null;

  const questionResults: ClassReportQuestionResult[] = exam.questions.map((question, index) => {
    const answer = submission.answers.find(item => item.questionId === question.id);
    const score = scoreForAnswer(answer);
    const maxScore = asFiniteNumber(question.points);
    const status = score === null
      ? 'not_attempted'
      : maxScore !== null && maxScore > 0 && score >= maxScore
        ? 'correct'
        : score > 0 ? 'partial' : 'incorrect';
    return {
      questionNumber: String(index + 1),
      status,
      score,
      maxScore,
      errorType: null,
      weakTopics: [],
    };
  });

  return {
    id: asText(submission.id),
    studentKey: student.id,
    createdAt: asText(submission.submittedAt || submission.startedAt),
    status: asText(submission.status),
    score: asFiniteNumber(submission.totalScore),
    maxScore: asFiniteNumber(exam.maxScore),
    official: submission.status === 'graded',
    weakTopics: [],
    questionResults,
  };
};

const csvCell = (value: unknown): string => {
  const text = asText(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const percentText = (value: number | null): string => value === null ? '' : `${(value * 100).toFixed(1)}%`;

export const getQuestionOutcomeRows = (question: Pick<ClassReportQuestionStats, 'evidenceCount' | 'correct' | 'partial' | 'incorrect' | 'unreadable' | 'notAttempted'>): Array<{ metric: string; count: number; rate: number }> => {
  const denominator = question.evidenceCount;
  const outcomes: Array<[string, number]> = [
    ['Đúng', question.correct],
    ['Đúng một phần', question.partial],
    ['Sai', question.incorrect],
    ['Không đọc được', question.unreadable],
    ['Chưa làm', question.notAttempted],
  ];
  return outcomes.map(([metric, count]) => ({ metric, count, rate: denominator > 0 ? count / denominator : 0 }));
};

export const buildClassReportCsv = (reports: readonly ClassAssignmentReportMetrics[]): string => {
  const rows: string[][] = [['Loại bài', 'Tên bài', 'Chỉ số', 'Câu hoặc nhãn', 'Số lượng', 'Tỷ lệ']];
  for (const report of reports) {
    const type = report.assignment.type;
    const title = report.assignment.title;
    const roster = report.counters.roster;
    const rate = (count: number): string => roster > 0 ? percentText(count / roster) : '';
    rows.push(
      [type, title, 'Sĩ số', '', report.counters.roster.toString(), ''],
      [type, title, 'Đã nộp', '', report.counters.submitted.toString(), rate(report.counters.submitted)],
      [type, title, 'Đã chấm', '', report.counters.graded.toString(), rate(report.counters.graded)],
      [type, title, 'Đã duyệt', '', report.counters.official.toString(), rate(report.counters.official)],
      [type, title, 'Chưa nộp', '', report.counters.missing.toString(), rate(report.counters.missing)],
      [type, title, 'Điểm trung bình chính thức', '', report.averagePercent === null ? '' : `${report.averagePercent.toFixed(1)}%`, ''],
    );

    const distributionTotal = report.metrics.officialEvidenceCount;
    for (const label of ['0-<5', '5-<6.5', '6.5-<8', '8-10'] as const) {
      const count = report.scoreDistribution[label];
      rows.push([type, title, 'Phân bố điểm', label, String(count), distributionTotal > 0 ? percentText(count / distributionTotal) : '']);
    }
    for (const question of report.questionStats) {
      const questionLabel = `Câu ${question.questionNumber}`;
      for (const outcome of getQuestionOutcomeRows(question)) {
        rows.push([type, title, outcome.metric, questionLabel, String(outcome.count), percentText(outcome.rate)]);
      }
      rows.push([type, title, 'Tỷ lệ đúng', questionLabel, '', percentText(question.correctRate)]);
      rows.push([type, title, 'Tỷ lệ điểm', questionLabel, '', percentText(question.scoreRate)]);
    }
    const labelRows = (metric: string, stats: readonly { label: string; evidenceCount: number }[]) => {
      const total = stats.reduce((sum, stat) => sum + stat.evidenceCount, 0);
      for (const stat of stats) {
        rows.push([type, title, metric, stat.label, String(stat.evidenceCount), total > 0 ? percentText(stat.evidenceCount / total) : '']);
      }
    };
    labelRows('Lỗi phổ biến', report.errorStats);
    labelRows('Chủ đề cần củng cố', report.topicStats);
  }
  return `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`;
};

const formatPercent = (value: number | null): string => value === null ? '—' : `${value.toFixed(1)}%`;
const formatRate = (value: number): string => `${Math.round(value * 100)}%`;

const MetricCard = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    {hint && <p className="mt-1 text-xs font-semibold text-slate-500">{hint}</p>}
  </div>
);

const Distribution = ({ report }: { report: ClassAssignmentReportMetrics }) => {
  const labels: Array<[keyof typeof report.scoreDistribution, string]> = [
    ['0-<5', '0–<5'],
    ['5-<6.5', '5–<6,5'],
    ['6.5-<8', '6,5–<8'],
    ['8-10', '8–10'],
  ];
  const total = report.metrics.officialEvidenceCount;
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="score-distribution-heading">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-indigo-600" />
        <h3 id="score-distribution-heading" className="text-lg font-black text-slate-900">Phân bố điểm</h3>
      </div>
      <div className="mt-5 space-y-4">
        {labels.map(([key, label]) => {
          const count = report.scoreDistribution[key];
          const width = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="font-bold text-slate-700">{label}</span>
                <span className="font-black text-slate-600">{count} ({total > 0 ? `${Math.round(width)}%` : '—'})</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100" aria-label={`${label}: ${count}`}>
                <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {total === 0 && <p className="mt-4 text-sm font-semibold text-amber-700">Chưa đủ dữ liệu chính thức để phân bố điểm.</p>}
    </section>
  );
};

const QuestionStats = ({ report }: { report: ClassAssignmentReportMetrics }) => (
  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="question-stats-heading">
    <h3 id="question-stats-heading" className="text-lg font-black text-slate-900">Thống kê theo câu</h3>
    {report.questionStats.length === 0 ? (
      <p className="mt-4 text-sm font-semibold text-slate-500">Chưa có dữ liệu câu hỏi chính thức.</p>
    ) : (
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs font-black uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-3">Câu</th><th className="px-3 py-3">Bằng chứng</th><th className="px-3 py-3">Đúng</th>
              <th className="px-3 py-3">Đúng một phần</th><th className="px-3 py-3">Sai</th><th className="px-3 py-3">Không đọc được</th><th className="px-3 py-3">Chưa làm</th>
              <th className="px-3 py-3">Tỷ lệ đúng</th><th className="px-3 py-3">Tỷ lệ điểm</th>
            </tr>
          </thead>
          <tbody>
            {report.questionStats.map(question => {
              const outcomes = getQuestionOutcomeRows(question);
              return (
              <tr key={question.questionNumber} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-3 font-black text-slate-800">{question.questionNumber}</td>
                <td className="px-3 py-3 font-semibold text-slate-600">{question.evidenceCount}</td>
                <td className="px-3 py-3 font-bold text-emerald-700">{outcomes[0].count}</td>
                <td className="px-3 py-3 font-bold text-amber-700">{outcomes[1].count}</td>
                <td className="px-3 py-3 font-bold text-rose-700">{outcomes[2].count}</td>
                <td className="px-3 py-3 font-bold text-orange-700">{outcomes[3].count}</td>
                <td className="px-3 py-3 font-bold text-slate-600">{outcomes[4].count}</td>
                <td className="px-3 py-3 font-black text-slate-800">{formatRate(question.correctRate)}</td>
                <td className="px-3 py-3 font-black text-slate-800">{formatRate(question.scoreRate)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

const LabelStats = ({ title, stats }: { title: string; stats: readonly { label: string; evidenceCount: number }[] }) => {
  const total = stats.reduce((sum, stat) => sum + stat.evidenceCount, 0);
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-lg font-black text-slate-900">{title}</h3>
      {stats.length === 0 ? <p className="mt-4 text-sm font-semibold text-slate-500">Chưa có bằng chứng.</p> : (
        <ul className="mt-4 space-y-3">
          {stats.map(stat => (
            <li key={stat.label} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
              <span className="min-w-0 break-words text-sm font-bold text-slate-700">{stat.label}</span>
              <span className="shrink-0 text-xs font-black text-slate-500">{stat.evidenceCount} · {total > 0 ? formatRate(stat.evidenceCount / total) : '—'}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const ReportBody = ({ report }: { report: ClassAssignmentReportMetrics }) => (
  <div className="mt-5 space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard label="Sĩ số" value={`${report.counters.roster}`} hint="danh sách lớp hiện tại" />
      <MetricCard label="Đã nộp" value={`${report.counters.submitted}`} />
      <MetricCard label="Đã chấm" value={`${report.counters.graded}`} />
      <MetricCard label="Đã duyệt" value={`${report.counters.official}`} hint="bằng chứng chính thức" />
      <MetricCard label="Chưa nộp" value={`${report.counters.missing}`} />
      <MetricCard label="Điểm trung bình" value={formatPercent(report.averagePercent)} hint="chỉ tính bài đã duyệt" />
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Distribution report={report} />
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="recommendations-heading">
        <h3 id="recommendations-heading" className="text-lg font-black text-slate-900">Khuyến nghị dạy học</h3>
        <ul className="mt-4 space-y-3">
          {report.recommendations.map(recommendation => (
            <li key={recommendation} className="rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-semibold leading-6 text-indigo-950">{recommendation}</li>
          ))}
        </ul>
      </section>
    </div>
    <QuestionStats report={report} />
    <div className="grid gap-5 lg:grid-cols-2">
      <LabelStats title="Lỗi phổ biến" stats={report.errorStats} />
      <LabelStats title="Chủ đề cần củng cố" stats={report.topicStats} />
    </div>
  </div>
);

const sourceErrorText = (source: string, error: unknown): string =>
  `${source}: ${error instanceof Error ? error.message : 'không tải được dữ liệu.'}`;

export const ClassAssignmentReport = ({
  classId,
  teacherId,
  className,
  students,
  onlineAssignments,
  exams,
}: ClassAssignmentReportProps) => {
  const [reports, setReports] = useState<ClassAssignmentReportMetrics[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [sourceErrors, setSourceErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setReports([]);
    setSelectedAssignmentId('');
    setSourceErrors([]);

    void (async () => {
      const [uploadAssignmentsResult, uploadSubmissionsResult] = await Promise.allSettled([
        listAssignmentsForClass(classId, teacherId),
        listSubmissionsForClass(classId, teacherId),
      ]);
      const errors: string[] = [];
      const nextReports: ClassAssignmentReportMetrics[] = [];

      if (uploadAssignmentsResult.status === 'fulfilled' && uploadSubmissionsResult.status === 'fulfilled') {
        const uploadAssignments = uploadAssignmentsResult.value;
        const uploadSubmissions = uploadSubmissionsResult.value;
        for (const assignment of uploadAssignments) {
          const normalized: ClassReportAssignment = {
            id: assignment.id,
            title: assignment.title,
            type: 'Bài nộp ảnh/AI',
            maxScore: asFiniteNumber(assignment.maxScore),
            submissions: uploadSubmissions
              .filter(submission => submission.assignmentId === assignment.id)
              .map(submission => adaptUploadSubmission(submission, assignment)),
          };
          nextReports.push(buildClassAssignmentReport({
            roster: students.map(student => ({ studentKey: student.id })),
            assignment: normalized,
          }));
        }
      } else {
        if (uploadAssignmentsResult.status === 'rejected') errors.push(sourceErrorText('Bài nộp ảnh/AI — danh sách bài giao', uploadAssignmentsResult.reason));
        if (uploadSubmissionsResult.status === 'rejected') errors.push(sourceErrorText('Bài nộp ảnh/AI — bài nộp', uploadSubmissionsResult.reason));
      }

      const onlineResults = await Promise.all(onlineAssignments.map(async assignment => {
        try {
          const submissions = await getSubmissions(assignment.examId);
          const exam = exams.find(item => item.id === assignment.examId);
          if (!exam) throw new Error('không tìm thấy cấu hình đề trong danh sách hiện tại.');
          const normalized: ClassReportAssignment = {
            id: `exam:${assignment.examId}`,
            title: assignment.examTitle || exam.title,
            type: 'Đề online',
            maxScore: asFiniteNumber(exam.maxScore),
            submissions: submissions
              .map(submission => adaptOnlineSubmission(submission, exam, students, className))
              .filter((submission): submission is ClassReportSubmission => submission !== null),
          };
          return buildClassAssignmentReport({
            roster: students.map(student => ({ studentKey: student.id })),
            assignment: normalized,
          });
        } catch (error) {
          errors.push(sourceErrorText(`Đề online “${assignment.examTitle || assignment.examId}”`, error));
          return null;
        }
      }));
      nextReports.push(...onlineResults.filter((report): report is ClassAssignmentReportMetrics => report !== null));

      if (cancelled) return;
      setReports(nextReports);
      setSelectedAssignmentId(nextReports[0]?.assignment.id || '');
      setSourceErrors(errors);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [classId, teacherId, className, students, onlineAssignments, exams]);

  const selectedReport = useMemo(
    () => reports.find(report => report.assignment.id === selectedAssignmentId) || reports[0],
    [reports, selectedAssignmentId],
  );

  const downloadCsv = () => {
    const blob = new Blob([buildClassReportCsv(reports)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bao-cao-lop-${className.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'tong-hop'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-5 space-y-5" aria-label={`Báo cáo lớp ${className}`}>
      <div className="flex flex-col gap-4 rounded-3xl border border-indigo-100 bg-indigo-50/60 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Báo cáo theo từng bài giao</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">{className}</h2>
          <p className="mt-1 text-sm font-medium text-slate-600">Chỉ dữ liệu chính thức mới góp vào điểm và khuyến nghị.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="class-report-assignment">Chọn bài giao</label>
          <select
            id="class-report-assignment"
            value={selectedAssignmentId}
            onChange={event => setSelectedAssignmentId(event.target.value)}
            disabled={loading || reports.length === 0}
            className="min-h-11 rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {reports.length === 0 && <option value="">Chưa có bài giao</option>}
            {reports.map(report => <option key={report.assignment.id} value={report.assignment.id}>{report.assignment.type} · {report.assignment.title}</option>)}
          </select>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={loading || reports.length === 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Tải CSV tổng hợp
          </button>
        </div>
      </div>

      {sourceErrors.length > 0 && (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
          <div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-black">Một phần dữ liệu chưa tải được</p><ul className="mt-1 list-disc pl-5">{sourceErrors.map(error => <li key={error}>{error}</li>)}</ul><p className="mt-2">Các số liệu đang hiển thị chỉ tính nguồn đã tải thành công; lỗi không được quy thành 0.</p></div></div>
        </div>
      )}

      {loading ? (
        <div role="status" className="rounded-3xl border border-slate-200 bg-white px-5 py-14 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
          <p className="mt-3 font-black text-slate-800">Đang tải dữ liệu báo cáo…</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">Đang đọc bài giao và bài nộp ở chế độ chỉ đọc.</p>
        </div>
      ) : !selectedReport ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-14 text-center">
          {sourceErrors.length > 0 ? <AlertCircle className="mx-auto h-8 w-8 text-amber-500" /> : <RefreshCw className="mx-auto h-8 w-8 text-slate-300" />}
          <h3 className="mt-3 font-black text-slate-900">{sourceErrors.length > 0 ? 'Chưa tải được báo cáo' : 'Chưa có dữ liệu'}</h3>
          <p className="mx-auto mt-1 max-w-lg text-sm font-semibold leading-6 text-slate-500">{sourceErrors.length > 0 ? 'Kiểm tra kết nối hoặc quyền truy cập rồi thử lại khi mở lại khu vực Báo cáo.' : 'Lớp này chưa có bài giao phù hợp để tổng hợp.'}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-xs font-black uppercase tracking-wide text-indigo-600">{selectedReport.assignment.type}</p><h3 className="mt-1 text-xl font-black text-slate-900">{selectedReport.assignment.title}</h3></div>
            <p className="hidden text-right text-xs font-semibold text-slate-500 sm:block">{selectedReport.metrics.officialEvidenceCount} bằng chứng chính thức</p>
          </div>
          <ReportBody report={selectedReport} />
        </>
      )}
    </div>
  );
};
