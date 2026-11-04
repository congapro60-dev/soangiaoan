import { type ChangeEventHandler, type RefObject, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, BarChart3, BookOpen, BookOpenCheck, Camera, CheckCircle2, ChevronLeft, ChevronRight, FileText, Info, Loader2, LogOut, NotebookPen, RefreshCw, Search, Sparkles, Target, TrendingUp, X } from 'lucide-react';
import type { PracticeAttemptResult, PracticeSetResult } from '../../../../services/gradingApi';
import type { ExamSubmission } from '../../../../types';
import type { AssignmentDoc, StudentActivityView, StudentProfileDoc, SubmissionDoc } from '../../../../lib/classroom/types';
import type { StudentAssignmentDetail, StudentWorkspaceSubmission } from '../../../../lib/classroom/studentWorkspace';
import { getStudentAssignmentState, latestSubmissionByAssignment, scoreHiddenFromStudent, type StudentAssignmentState } from '../../../../lib/classroom/portalViewModel';
import { buildStudentProgressSummary } from '../../../../lib/classroom/studentProgressModel';
import { isActionableClarifyQuestion } from '../../../../lib/classroom/clarification';
import { buildStudentSkillCards } from '../../../../lib/classroom/skillViewModel';
import { vnDay } from '../../../../lib/classroom/reportPeriod';
import { submissionDeadlineState } from '../../../../lib/classroom/hanNop';
import { StudentAssignmentCard } from './StudentAssignmentCard';
import { StudentSubmittedWork } from './StudentSubmittedWork';
import { StudentNotificationBell } from './StudentNotificationBell';
import { StudentAiCostChip } from './StudentAiCostChip';
import { StudentScoreBoard } from './StudentScoreBoard';
import { StudentCompetencyPortfolio } from './StudentCompetencyPortfolio';
import { NhanXetMarkdown } from '../NhanXetMarkdown';
import { QuestionResultsList } from '../QuestionResultsList';
import { PracticeScaffold } from './PracticeScaffold';
import { ClarifyPanel } from './ClarifyPanel';
import type { StudentScoreView } from '../../../../lib/classroom/scoreBook';
import type { StudentFeedItem } from '../../../../lib/classroom/studentNotifications';
import type { StudentDiscoverCatalogItem } from '../../../../lib/discover/types';
import type { StudentAdaptiveAssignment } from '../../../../services/studentPortalApi';
import { StudentClosedAdaptive } from './StudentClosedAdaptive';

const StudentPublishedReports = lazy(() => import('./StudentPublishedReports').then(module => ({ default: module.StudentPublishedReports })));

const PRACTICE_LEVEL_LABEL: Record<string, { label: string; className: string }> = {
  nhan_biet: { label: 'Nhận biết · Thông hiểu', className: 'bg-emerald-50 text-emerald-700' },
  van_dung: { label: 'Vận dụng', className: 'bg-blue-50 text-blue-700' },
  van_dung_cao: { label: 'Vận dụng cao', className: 'bg-violet-50 text-violet-700' },
};
interface SessionInfo {
  studentId: string;
  studentName: string;
  className: string;
}

interface Props {
  session: SessionInfo;
  assignments: AssignmentDoc[];
  submissions: SubmissionDoc[];
  onlineSubmissions: ExamSubmission[];
  profile: StudentProfileDoc | null;
  /** Sổ điểm của em (thi định kì + hệ số 1); null khi chưa tải được. */
  scores: StudentScoreView | null;
  /** Danh mục Discover an toàn theo khối lớp; bài chưa được giao nên chưa mở từ đây. */
  discoverCatalog?: readonly StudentDiscoverCatalogItem[];
  /** Bài học phân hoá thầy cô đã giao cho lớp — mở qua máy chủ (bản đã bỏ đáp án). */
  adaptiveAssignments?: readonly StudentAdaptiveAssignment[];
  onOpenAdaptive?: (assignmentId: string) => void;
  loading: boolean;
  uploadingId: string;
  uploadStep: string;
  successMessage: string;
  warningMessage: string;
  actionError: string;
  dataError: string;
  practiceSet: PracticeSetResult | null;
  practiceAnswers: Record<string, string>;
  practiceAttempt: PracticeAttemptResult | null;
  loadingPractice: boolean;
  submittingPractice: boolean;
  practiceError: string;
  uploadRef: RefObject<HTMLInputElement | null>;
  pendingFiles: readonly File[];
  pendingAssignmentTitle: string | null;
  maxPendingFiles: number;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  onChooseImage: (assignmentId: string | null, supplementOf?: string) => void;
  onAddMoreImages: () => void;
  onRemovePendingFile: (index: number) => void;
  onSubmitPendingFiles: () => void;
  /** Em khai bài thầy cô đã chấm tay (máy đọc điểm thầy ghi, thầy xác nhận). */
  handMarked?: boolean;
  onHandMarkedChange?: (value: boolean) => void;
  onOpenAssignment: (assignment: AssignmentDoc | undefined, submission?: SubmissionDoc) => void;
  onLoadDetail: (assignmentId: string | null, submissionId?: string) => Promise<StudentAssignmentDetail>;
  onAnswerExamCode: (submissionId: string, examCode: string) => Promise<void>;
  /** Dòng thời gian thông báo đã gộp sẵn ở trang cha. */
  notifications: readonly StudentFeedItem[];
  notificationsLastSeenAt: string | null;
  onNotificationsOpened: (seenAt: string) => void;
  onSignOut: () => void;
  onReload: () => void;
  onLoadPractice: () => void;
  onPracticeAnswerChange: (questionId: string, answer: string) => void;
  onSubmitPractice: () => void;
  onDismissSuccess: () => void;
}

type Section = 'assignments' | 'scores' | 'stats' | 'competencies' | 'reports';
type FilterKey = 'all' | 'action' | 'waiting' | 'graded';
const sections = [
  { key: 'assignments', label: 'Bài tập', icon: BookOpen },
  { key: 'scores', label: 'Sổ điểm', icon: NotebookPen },
  { key: 'stats', label: 'Thống kê', icon: BarChart3 },
  { key: 'competencies', label: 'Năng lực', icon: Target },
  { key: 'reports', label: 'Báo cáo', icon: FileText },
] as const;
const PAGE_SIZE = 20;
const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:border-indigo-300 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50';
const dayLabel = (date?: string) => date && Number.isFinite(Date.parse(date)) ? new Date(date).toLocaleDateString('vi-VN') : 'Chưa có ngày';
const onlineAssignmentState = (activity?: StudentActivityView): StudentAssignmentState => {
  if (!activity || activity.status === 'not_started') return { status: 'todo', action: 'submit', label: 'Chưa làm' };
  if (activity.status === 'in_progress') return { status: 'waiting', action: 'status', label: 'Đang làm dở' };
  if (activity.status === 'official') return { status: 'graded', action: 'review', label: 'Đã có điểm' };
  if (activity.status === 'pending_teacher') return { status: 'pending-approval', action: 'status', label: 'Chờ thầy cô duyệt' };
  return { status: 'waiting', action: 'status', label: 'Chờ kết quả' };
};
export const studentClarificationQuestions = (submission?: SubmissionDoc, assignment?: AssignmentDoc) => assignment?.submissionLocked === true ? [] : (submission?.grade?.questionResults ?? []).filter(question =>
  isActionableClarifyQuestion(question) || question.clarify?.state === 'regrading',
);
export interface WorkspaceRow {
  id: string;
  title: string;
  assignment?: AssignmentDoc;
  submission?: SubmissionDoc;
  state: StudentAssignmentState;
  clarificationCount: number;
  score: number | null;
  maxScore: number;
  attempts: number;
  date: string;
  statDate: string;
  /** Lúc nộp lượt mới nhất ĐÃ NỘP (lượt đang làm dở không tính) — để xét đúng hạn / quá hạn. */
  submittedAt?: string;
}
/** The index contains the full scoped year; pagination never changes the totals. */
export const buildWorkspaceRows = (studentId: string, assignments: AssignmentDoc[], submissions: SubmissionDoc[], onlineSubmissions: ExamSubmission[]): WorkspaceRow[] => {
  const own = submissions.filter(submission => submission.studentId === studentId);
  const latest = latestSubmissionByAssignment(own);
  const activities = buildStudentProgressSummary({ studentId, assignments, submissions: own, examSubmissions: onlineSubmissions }).assignmentActivities;
  const activityMap = new Map(activities.map(activity => [activity.assignmentId, activity]));
  const assigned = new Set(assignments.map(assignment => assignment.id));
  // Đề online: lượt mới mở mà chưa nộp không phải là "đã nộp" — chỉ lấy lượt đã nộp thật.
  const onlineSubmittedAt = (assignmentId: string): string | undefined => onlineSubmissions
    .filter(attempt => attempt.assignmentId === assignmentId && attempt.status !== 'in_progress' && attempt.submittedAt)
    .map(attempt => attempt.submittedAt as string)
    .sort()
    .pop();
  const rows = assignments.filter(assignment => !assignment.targetStudentIds?.length || assignment.targetStudentIds.includes(studentId)).map(assignment => {
    const submission = latest.get(assignment.id);
    const activity = activityMap.get(assignment.id);
    const state = assignment.type === 'exam' ? onlineAssignmentState(activity) : getStudentAssignmentState(assignment, submission);
    const clarificationCount = assignment.submissionLocked !== true && submission?.grade?.awaitingClarification
      ? ((submission as StudentWorkspaceSubmission).clarificationCount ?? studentClarificationQuestions(submission, assignment).filter(isActionableClarifyQuestion).length) : 0;
    const score = assignment.periodicTest ? null : assignment.type === 'exam' ? activity?.officialScore ?? null
      : submission?.grade?.teacherApproved && !submission.grade.awaitingClarification && !scoreHiddenFromStudent(submission) ? submission.grade.score : null;
    return { id: assignment.id, title: assignment.title, assignment, submission,
      state: clarificationCount === 0 && submission?.grade?.awaitingClarification ? { ...state, label: (submission as StudentWorkspaceSubmission).clarificationRegrading ? 'Đang đọc lại ảnh' : 'Chờ thầy cô soát' } : assignment.submissionLocked === true && !submission && state.status === 'todo' ? { ...state, label: 'Đã đóng' } : state,
      clarificationCount, score, maxScore: activity?.maxScore ?? submission?.grade?.maxScore ?? assignment.maxScore ?? 10,
      attempts: assignment.type === 'exam' ? activity?.attemptCount ?? 0 : own.filter(item => item.assignmentId === assignment.id).length,
      date: assignment.createdAt, statDate: submission?.createdAt || activity?.latestAttemptAt || assignment.createdAt,
      submittedAt: assignment.type === 'exam' ? onlineSubmittedAt(assignment.id) : submission?.createdAt };
  });
  const selfAttempts = own.filter(submission => !submission.assignmentId || !assigned.has(submission.assignmentId));
  const byId = new Map(selfAttempts.map(item => [item.id, item]));
  const roots = new Map<string, SubmissionDoc[]>();
  for (const submission of selfAttempts) {
    let root = submission; const seen = new Set([root.id]);
    while (root.supplementOf && byId.has(root.supplementOf) && !seen.has(root.supplementOf)) { root = byId.get(root.supplementOf)!; seen.add(root.id); }
    roots.set(root.id, [...(roots.get(root.id) ?? []), submission]);
  }
  const self = [...roots.values()].map(attempts => { const submission = [...attempts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]; return ({
    id: `submission:${submission.id}`, title: submission.assignmentId ? 'Bài đã nộp (đề đã đóng)' : 'Chấm thử · Bài tự nộp',
    submission, state: { status: 'self-submitted' as const, action: 'review' as const, label: submission.grade?.awaitingClarification ? ((submission as StudentWorkspaceSubmission).clarificationCount ? 'Cần xác nhận' : (submission as StudentWorkspaceSubmission).clarificationRegrading ? 'Đang đọc lại ảnh' : 'Chờ thầy cô soát') : submission.status === 'grading' ? 'Đang chấm' : 'Đã nộp' },
    clarificationCount: submission.grade?.awaitingClarification ? (submission as StudentWorkspaceSubmission).clarificationCount ?? studentClarificationQuestions(submission).filter(isActionableClarifyQuestion).length : 0,
    score: null, maxScore: 10, attempts: attempts.length, date: submission.createdAt, statDate: submission.createdAt,
  }); });
  return [...rows, ...self].sort((a, b) => Number(workspaceNeedsAction(b)) - Number(workspaceNeedsAction(a)) || (b.date || '').localeCompare(a.date || ''));
};
export const workspaceNeedsAction = (row: WorkspaceRow): boolean => (row.assignment?.submissionLocked !== true && (row.clarificationCount > 0 || row.submission?.errorReason === 'exam_code'))
  || Boolean(row.assignment?.submissionLocked !== true && row.assignment && (row.state.status === 'todo' || row.state.status === 'retry'));
export const filterWorkspaceRows = (rows: readonly WorkspaceRow[], query: string, filter: FilterKey, from: string, to: string, statistics = false): WorkspaceRow[] => {
  const needle = query.trim().toLocaleLowerCase('vi-VN');
  return rows.filter(row => {
    const day = vnDay(statistics ? row.statDate : row.date);
    const statusMatches = filter === 'all' || (filter === 'action' ? workspaceNeedsAction(row)
      : filter === 'graded' ? row.score !== null : ['waiting', 'grading', 'pending-approval'].includes(row.state.status));
    return (!needle || row.title.toLocaleLowerCase('vi-VN').includes(needle)) && statusMatches
      && (!from || day >= from) && (!to || day <= to);
  });
};
const Pagination = ({ page, count, onPage }: { page: number; count: number; onPage: (page: number) => void }) => {
  const total = Math.max(1, Math.ceil(count / PAGE_SIZE));
  return <div className="mt-3 flex items-center justify-between gap-2 text-sm text-slate-500">
    <span>{count} kết quả · Trang {page}/{total}</span>
    <div className="flex gap-2"><button type="button" className={buttonClass} aria-label="Trang trước" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="h-4 w-4" /></button>
    <button type="button" className={buttonClass} aria-label="Trang sau" disabled={page >= total} onClick={() => onPage(page + 1)}><ChevronRight className="h-4 w-4" /></button></div>
  </div>;
};
export const StudentPortalDashboard = (props: Props) => {
  const { session, assignments, submissions, onlineSubmissions, profile, scores, discoverCatalog = [], adaptiveAssignments = [], onOpenAdaptive, loading, uploadingId, uploadStep,
    successMessage, warningMessage, actionError, dataError, practiceSet, practiceAnswers, practiceAttempt,
    loadingPractice, submittingPractice, practiceError, uploadRef, pendingFiles, pendingAssignmentTitle, maxPendingFiles,
    onFileChange, onChooseImage, onAddMoreImages, onRemovePendingFile, onSubmitPendingFiles, onOpenAssignment, handMarked = false, onHandMarkedChange,
    onAnswerExamCode, notifications, notificationsLastSeenAt, onNotificationsOpened, onSignOut, onReload,
    onLoadPractice, onPracticeAnswerChange, onSubmitPractice, onDismissSuccess, onLoadDetail } = props;
  const [section, setSection] = useState<Section>('assignments');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [statsPage, setStatsPage] = useState(1);
  const [statsFrom, setStatsFrom] = useState('');
  const [statsTo, setStatsTo] = useState('');
  const [showPractice, setShowPractice] = useState(false);
  const [visitedCompetencies, setVisitedCompetencies] = useState(false);
  const [feedbackAttempt, setFeedbackAttempt] = useState('');
  const [feedbackOpenRequest, setFeedbackOpenRequest] = useState(0);
  const [opened, setOpened] = useState<WorkspaceRow | null>(null);
  const [detail, setDetail] = useState<StudentAssignmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const requestId = useRef(0);
  const pendingSectionRef = useRef<HTMLElement>(null);
  const rows = useMemo(() => buildWorkspaceRows(session.studentId, assignments, submissions, onlineSubmissions), [session.studentId, assignments, submissions, onlineSubmissions]);
  const visibleRows = useMemo(() => filterWorkspaceRows(rows, query, filter, from, to), [rows, query, filter, from, to]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE)));
  const statisticalRows = useMemo(() => filterWorkspaceRows(rows.filter(row => row.assignment), '', 'all', statsFrom, statsTo, true).sort((a, b) => (b.statDate || '').localeCompare(a.statDate || '')), [rows, statsFrom, statsTo]);
  const safeStatsPage = Math.min(statsPage, Math.max(1, Math.ceil(statisticalRows.length / PAGE_SIZE)));
  const official = statisticalRows.filter(row => row.score !== null && row.maxScore > 0);
  const average = official.length ? official.reduce((sum, row) => sum + row.score! / row.maxScore * 10, 0) / official.length : null;
  const homeworkScores = rows.flatMap(row => row.score !== null && row.maxScore > 0 ? [{ id: row.id, title: row.title, score: row.score, maxScore: row.maxScore }] : []);
  const loadDetail = useCallback(async (row: WorkspaceRow, keep = false) => {
    const ticket = ++requestId.current;
    if (!keep) setDetail(null);
    setDetailError(''); setDetailLoading(true);
    try {
      const result = await onLoadDetail(row.assignment?.id ?? null, row.assignment ? undefined : row.submission?.id);
      if (ticket === requestId.current) setDetail(result);
    } catch (error) {
      if (ticket === requestId.current) setDetailError(error instanceof Error ? error.message : 'Chưa tải được bài. Kiểm tra mạng rồi thử lại.');
    } finally { if (ticket === requestId.current) setDetailLoading(false); }
  }, [onLoadDetail]);
  const openRow = (row: WorkspaceRow) => {
    setSection('assignments'); setShowPractice(false); setOpened(row);
    void loadDetail(row);
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };
  const reloadDetail = () => { onReload(); if (openedRef.current) void loadDetail(openedRef.current, true); };
  // Refresh loaded work after the full lightweight index changes; no image/question fetch for unopened work.
  const openedRef = useRef(opened); openedRef.current = opened;
  useEffect(() => () => { ++requestId.current; }, []);
  useEffect(() => { if (openedRef.current) void loadDetail(openedRef.current, true); }, [submissions, onlineSubmissions, loadDetail]);
  const chooseSection = (next: Section) => { setSection(next); if (next === 'competencies') setVisitedCompetencies(true); window.scrollTo?.({ top: 0 }); };
  const soTepChoNop = pendingFiles.length;
  useEffect(() => { if (soTepChoNop > 0) pendingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [soTepChoNop]);
  const pendingPreviewUrls = useMemo(() => pendingFiles.map(file => file.type.startsWith('image/') && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null), [pendingFiles]);
  useEffect(() => () => { pendingPreviewUrls.forEach(url => { if (url) URL.revokeObjectURL(url); }); }, [pendingPreviewUrls]);
  const ownDetail = detail?.submissions.filter(item => item.studentId === session.studentId) ?? [];
  const detailAssignment = detail?.assignment;
  const detailLatest = detailAssignment ? latestSubmissionByAssignment(ownDetail).get(detailAssignment.id) : [...ownDetail].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const clarify = studentClarificationQuestions(detailLatest, detailAssignment);
  const clarifyItems = detailLatest?.grade?.awaitingClarification && clarify.length ? [{ submission: { ...detailLatest, grade: { ...detailLatest.grade, questionResults: clarify } }, title: detailAssignment?.title || 'Bài tự nộp' }] : [];
  const detailState = detailAssignment?.type === 'exam' ? onlineAssignmentState(buildStudentProgressSummary({ studentId: session.studentId, assignments: [detailAssignment], examSubmissions: detail?.onlineSubmissions }).assignmentActivities[0]) : getStudentAssignmentState(detailAssignment, detailLatest);
  if (detailLatest?.grade?.awaitingClarification && !clarify.some(isActionableClarifyQuestion)) { detailState.label = clarify.some(question => question.clarify?.state === 'regrading') ? 'Đang đọc lại ảnh' : 'Chờ thầy cô soát'; }
  if (detailAssignment?.submissionLocked === true) { detailState.canResubmit = false; if (detailState.action === 'submit' || detailState.action === 'retry') { detailState.action = 'status'; detailState.label = 'Bài đã khóa chốt'; } }
  if (detailState.detail?.includes('phía trên trang')) detailState.detail = 'Em mở phần xác nhận ngay trong bài này.';
  const legacyTopics = profile?.topics || [];
  const weakTopics = legacyTopics.filter(topic => topic.level === 'weak' || topic.level === 'developing').map(topic => topic.topic);
  const strongTopics = legacyTopics.filter(topic => topic.level === 'solid').map(topic => topic.topic);
  const skillCards = buildStudentSkillCards(profile?.skills);
  const hasProfileData = skillCards.length > 0 || legacyTopics.length > 0;
  const practiceQuestions = practiceSet?.questions ?? [];
  const practiceResults = new Map((practiceAttempt?.questionResults ?? []).map(result => [result.id, result]));
  const navigation = <nav aria-label="Không gian học tập" className="mx-auto grid max-w-5xl grid-cols-5 gap-1 px-2 py-1.5">
    {sections.map(({ key, label, icon: Icon }) => <button key={key} type="button" aria-current={section === key ? 'page' : undefined} onClick={() => chooseSection(key)} className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[11px] font-bold focus-visible:outline-2 focus-visible:outline-indigo-600 md:min-h-11 md:flex-row md:gap-2 md:text-sm ${section === key ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}><Icon className="h-5 w-5 shrink-0" /><span>{label}</span></button>)}
  </nav>;
  return <div className="min-h-screen bg-slate-50 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2 sm:px-6">
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-900">{session.studentName}</p><p className="truncate text-xs text-slate-500">{session.className}</p></div>
        <StudentAiCostChip />
        <StudentNotificationBell items={notifications} lastSeenAt={notificationsLastSeenAt} onOpened={onNotificationsOpened} onSelectAssignment={(id, submissionId) => { const row = rows.find(item => item.assignment?.id === id); if (row) { openRow(row); setFeedbackAttempt(submissionId || ''); setFeedbackOpenRequest(value => value + 1); } }} onSelectSubmission={submissionId => { const row = rows.find(item => item.submission?.id === submissionId) ?? buildWorkspaceRows(session.studentId, [], submissions.filter(item => item.id === submissionId), [])[0]; if (row) { openRow(row); setFeedbackAttempt(submissionId); setFeedbackOpenRequest(value => value + 1); } }} />
        <button type="button" onClick={onReload} aria-label="Làm mới" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        <button type="button" onClick={onSignOut} aria-label="Đăng xuất" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><LogOut className="h-4 w-4" /></button>
      </div>
      <div className="hidden border-t border-slate-100 md:block">{navigation}</div>
    </header>
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">{navigation}</div>
    <main className="mx-auto max-w-5xl space-y-4 px-4 pt-4 sm:px-6">
      <input ref={uploadRef} type="file" accept="image/*,application/pdf,.pdf,.docx" multiple className="hidden" onChange={onFileChange} />
        {uploadStep && (
          <div className="flex items-start gap-3 rounded-2xl bg-indigo-600 px-4 py-3 text-white shadow-lg shadow-indigo-200" role="status" aria-live="polite">
            <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" />
            <p className="text-sm font-bold">{uploadStep}</p>
          </div>
        )}
        {successMessage && (
          <div className="flex items-start gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100" role="status" aria-live="polite">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1 break-words">{successMessage}</p>
            <button type="button" onClick={onDismissSuccess} aria-label="Đóng thông báo" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-emerald-500 hover:bg-emerald-100"><X className="h-4 w-4" /></button>
          </div>
        )}
        {warningMessage && <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 ring-1 ring-amber-100"><Info className="mt-0.5 h-4 w-4 shrink-0" /> <span className="break-words">{warningMessage}</span></p>}
        {actionError && <p className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800 ring-1 ring-red-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <span className="break-words">{actionError}</span></p>}
        {dataError && (
          <div className="rounded-2xl bg-red-50 px-4 py-3 ring-1 ring-red-100">
            <p className="flex items-start gap-2 text-sm font-bold text-red-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{dataError}</span></p>
            <button type="button" onClick={onReload} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-700"><RefreshCw className="h-3.5 w-3.5" /> Thử lại</button>
          </div>
        )}

        {pendingFiles.length > 0 && (
          <section ref={pendingSectionRef} aria-labelledby="pending-upload-heading" className="scroll-mt-20 rounded-[1.5rem] border-2 border-rose-300 bg-rose-50 p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-600">Ảnh chưa gửi cho thầy cô</p>
                <h2 id="pending-upload-heading" className="mt-1 break-words text-lg font-black text-slate-900">{pendingAssignmentTitle || 'Bài của em'}</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Đã chụp/chọn {pendingFiles.length}/{maxPendingFiles} tệp. Em có thể chụp tiếp các trang còn lại rồi nộp một lần.</p>
                <p className="mt-1 text-sm font-black leading-6 text-rose-700">Phải bấm “Nộp {pendingFiles.length} tệp” bên dưới thì thầy cô mới nhận được bài. Thoát bây giờ là mất ảnh.</p>
              </div>
              <span className="inline-flex shrink-0 items-center rounded-full bg-rose-600 px-3 py-1.5 text-xs font-black text-white">Chưa gửi</span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5" role="list" aria-label="Các tệp đang chờ nộp">
              {pendingFiles.map((file, index) => {
                const previewUrl = pendingPreviewUrls[index];
                return (
                  <div key={`${file.name}-${file.lastModified}-${index}`} role="listitem" className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
                    <div className="flex aspect-square items-center justify-center bg-slate-100">
                      {previewUrl ? (
                        <img src={previewUrl} alt={`Ảnh ${index + 1}: ${file.name}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="px-3 text-center text-xs font-black leading-5 text-slate-500">{file.name}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 p-2">
                      <p className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-600" title={file.name}>Trang {index + 1}</p>
                      <button type="button" onClick={() => onRemovePendingFile(index)} disabled={uploadingId !== ''} aria-label={`Xóa tệp ${index + 1}`} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><X className="h-4 w-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={onAddMoreImages} disabled={uploadingId !== '' || pendingFiles.length >= maxPendingFiles} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-sm font-black text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50">
                <Camera className="h-4 w-4" />
                {pendingFiles.length >= maxPendingFiles ? 'Đã đủ số tệp' : 'Chụp/chọn thêm'}
              </button>
              <button type="button" onClick={onSubmitPendingFiles} disabled={uploadingId !== ''} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-60">
                {uploadingId !== '' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {uploadingId !== '' ? 'Đang nộp...' : `Nộp ${pendingFiles.length} tệp`}
              </button>
            </div>
            <label className="mt-3 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900">
              <input type="checkbox" checked={handMarked} onChange={event => onHandMarkedChange?.(event.target.checked)} disabled={uploadingId !== ''}
                className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />
              <span>Thầy cô đã chấm tay bài này rồi (có điểm, chữ đỏ trên giấy). Máy sẽ đọc điểm thầy ghi để thầy xác nhận, em không cần làm lại.</span>
            </label>
          </section>
        )}


      {section === 'assignments' && !opened && !showPractice && <section aria-labelledby="assignments-heading">
        <div className="flex flex-wrap items-center justify-between gap-2"><h1 id="assignments-heading" className="text-xl font-black text-slate-900">Bài tập của em</h1>
          <div className="flex gap-2"><button type="button" className={buttonClass} onClick={() => setShowPractice(true)}>Luyện tập</button><button type="button" className={buttonClass} disabled={uploadingId !== ''} onClick={() => onChooseImage(null)}><Camera className="h-4 w-4" />Chấm thử</button></div>
        </div>
        <p className="mt-1 text-sm text-slate-500">{rows.filter(workspaceNeedsAction).length} bài cần xử lý · Chấm thử không tính điểm chính thức.</p>
        <section aria-labelledby="student-discover-heading" className="mt-4 rounded-[1.5rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Discover · Tự học</p>
              <h2 id="student-discover-heading" className="mt-1 text-lg font-black text-slate-900">Tiết kiến thức mới</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">{discoverCatalog.length ? `${discoverCatalog.length} tiết theo khối lớp của em.` : 'Chưa có tiết Discover cho khối lớp này.'}</p>
            </div>
            <BookOpenCheck className="h-6 w-6 shrink-0 text-blue-500" />
          </div>
          {discoverCatalog.length > 0 && <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
            {discoverCatalog.map(seed => {
              const daGiao = (adaptiveAssignments || []).find(item => item.discoverSeedId === seed.id);
              return <article key={seed.id} className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-white/90 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-black text-slate-900">{seed.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Khối {seed.grade} · Tuần {seed.week ?? '—'} · Tiết {seed.period ?? '—'}</p>
                </div>
                {daGiao && onOpenAdaptive
                  ? <button type="button" onClick={() => onOpenAdaptive(daGiao.assignmentId)} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-800 transition hover:bg-blue-100">Học bài này</button>
                  : <button type="button" disabled className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-500">{seed.status === 'available' ? 'Chưa được giao' : 'Chưa sẵn sàng'}</button>}
              </article>;
            })}
          </div>}
          {(adaptiveAssignments || []).length > 0 && (
            <ul className="mt-3 space-y-2">
              {(adaptiveAssignments || []).map(item => <li key={item.assignmentId} className="flex flex-col gap-2 rounded-2xl border border-blue-100 bg-white/90 p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 break-words text-sm font-black text-slate-900">{item.title || 'Bài tự học'}</p>
                {item.closed ? <StudentClosedAdaptive assignmentId={item.assignmentId} /> : onOpenAdaptive && <button type="button" onClick={() => onOpenAdaptive(item.assignmentId)} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-800 transition hover:bg-blue-100">Vào bài</button>}
              </li>)}
            </ul>
          )}
          <a href="/adaptive-library" className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-black text-indigo-800 transition hover:bg-indigo-100">📚 Thư viện học lại — xem tất cả bài tự học để chọn bài ôn</a>
        </section>
        <div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="relative"><span className="sr-only">Tìm bài tập</span><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Tìm tên bài…" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-base" /></label>
          <label><span className="sr-only">Trạng thái bài tập</span><select value={filter} onChange={event => { setFilter(event.target.value as FilterKey); setPage(1); }} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base"><option value="all">Tất cả trạng thái</option><option value="action">Cần xử lý</option><option value="waiting">Chờ chấm / Chờ GV</option><option value="graded">Đã có điểm</option></select></label>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2"><label className="min-w-0 text-xs text-slate-500">Ngày giao từ<input aria-label="Ngày giao từ" type="date" value={from} onChange={event => { setFrom(event.target.value); setPage(1); }} className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-sm" /></label><label className="min-w-0 text-xs text-slate-500">Đến ngày<input aria-label="Ngày giao đến" type="date" value={to} onChange={event => { setTo(event.target.value); setPage(1); }} className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-sm" /></label></div>
        {from && to && from > to && <p role="alert" className="mt-2 text-sm text-red-700">Ngày bắt đầu phải trước ngày kết thúc.</p>}
        <div className="mt-3 space-y-2.5">
          {visibleRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE).map(row => {
            const deadline = submissionDeadlineState(row.assignment?.dueAt, row.submittedAt);
            const isExam = row.assignment?.type === 'exam';
            const isLocked = row.assignment?.submissionLocked === true;
            const hasSubmission = Boolean(row.submission);
            const canDirectPhoto = !isExam && row.assignment?.deliveryMode !== 'online' && !isLocked && Boolean(row.assignment);
            return (
              <article key={row.id} data-assignment-row={row.id} className="group rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={() => openRow(row)} className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-indigo-600">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-black ${deadline.className}`}>{deadline.label}</span>
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{row.state.label}</span>
                      {isLocked && <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">Đã khóa</span>}
                    </div>
                    <h2 className="mt-1.5 break-words text-base font-black leading-snug text-slate-900 group-hover:text-indigo-600">{row.title}</h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {deadline.dueLabel ? `Hạn nộp: ${deadline.dueLabel}` : dayLabel(row.date)}
                      {row.attempts > 0 ? ` · ${row.attempts} lượt` : ''}
                    </p>
                    {row.clarificationCount > 0 && <span className="mt-1.5 inline-block rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">Cần xác nhận {row.clarificationCount} câu</span>}
                    {!isLocked && row.submission?.errorReason === 'exam_code' && <span className="mt-1.5 block text-xs font-bold text-amber-800">Cần chọn mã đề</span>}
                  </button>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 pt-2 border-t border-slate-100 sm:border-t-0 sm:pt-0">
                    {row.score !== null && <span className="mr-1 text-sm font-black text-emerald-700">{row.score}/{row.maxScore}</span>}
                    {canDirectPhoto && !hasSubmission && (
                      <button type="button" disabled={uploadingId !== ''} onClick={() => onChooseImage(row.assignment!.id)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50">
                        <Camera className="h-4 w-4" /> Nộp ảnh
                      </button>
                    )}
                    {canDirectPhoto && hasSubmission && (
                      <>
                        <button type="button" disabled={uploadingId !== ''} onClick={() => onChooseImage(row.assignment!.id, row.submission!.id)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-black text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                          Bổ sung ảnh
                        </button>
                        <button type="button" disabled={uploadingId !== ''} onClick={() => onChooseImage(row.assignment!.id)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:border-indigo-300 disabled:opacity-50">
                          Nộp lại
                        </button>
                      </>
                    )}
                    {isExam && (
                      <button type="button" onClick={() => onOpenAssignment(row.assignment, row.submission)} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-indigo-600 px-3 text-xs font-black text-white hover:bg-indigo-700">
                        Vào thi
                      </button>
                    )}
                    <button type="button" onClick={() => openRow(row)} aria-label={`Xem chi tiết ${row.title}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          {visibleRows.length === 0 && <p className="p-5 text-sm text-slate-500 rounded-2xl border border-slate-200 bg-white">{loading ? 'Đang tải bài tập…' : 'Không có bài phù hợp. Thử đổi bộ lọc.'}</p>}
        </div>
        <Pagination page={safePage} count={visibleRows.length} onPage={setPage} />
      </section>}
      {opened && <section hidden={section !== 'assignments'} aria-label="Chi tiết bài tập" className="space-y-3">
        <button type="button" className={buttonClass} onClick={() => { ++requestId.current; setOpened(null); setDetail(null); setDetailError(''); }}><ArrowLeft className="h-4 w-4" />Danh sách bài tập</button>
        <h1 className="break-words text-xl font-black text-slate-900">{opened.title}</h1>
        {detailLoading && <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Đang tải bài…</p>}
        {detailError && <div className="rounded-xl bg-red-50 p-3"><p role="alert" className="text-sm text-red-700">{detailError}</p><button type="button" className={`${buttonClass} mt-2`} onClick={() => void loadDetail(opened, true)}>Thử tải lại</button></div>}
        {detail && <>
          {detailAssignment ? <StudentAssignmentCard assignment={detailAssignment} submission={detailLatest} submissions={ownDetail} state={detailState}
            detailView feedbackSubmissionId={feedbackAttempt} feedbackOpenRequest={feedbackOpenRequest} onFeedbackChanged={reloadDetail} uploading={uploadingId !== ''} onUpload={onChooseImage} onOpen={onOpenAssignment} onAnswerExamCode={onAnswerExamCode}
            deletedNotice={!detailLatest ? notifications.find(item => item.kind === 'submission_deleted' && item.assignmentId === detailAssignment.id)?.body : undefined} />
          : <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">Chấm thử không tính điểm chính thức.</p><StudentSubmittedWork submissions={ownDetail} feedbackSubmissionId={feedbackAttempt} feedbackOpenRequest={feedbackOpenRequest} onFeedbackChanged={reloadDetail} />
            {detailLatest?.grade && !scoreHiddenFromStudent(detailLatest) && !detailLatest.grade.awaitingClarification && <div className="mt-3 space-y-2"><NhanXetMarkdown>{detailLatest.grade.feedback}</NhanXetMarkdown><QuestionResultsList results={detailLatest.grade.questionResults} compact /></div>}
          </div>}
          {detailAssignment?.submissionLocked === true && detailLatest?.grade?.awaitingClarification && <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">Bài đã khóa chốt. Em xem lại bài đã nộp; phần cần xác nhận đang chờ thầy cô soát.</p>}
          {detailAssignment?.submissionLocked !== true && clarifyItems.length > 0 && <ClarifyPanel items={clarifyItems} onChanged={reloadDetail} pollingExternally />}
        </>}
      </section>}
      {section === 'scores' && <StudentScoreBoard scores={scores} homework={homeworkScores} />}
      {section === 'stats' && <section aria-labelledby="student-statistics-heading" className="space-y-3">
        <h1 id="student-statistics-heading" className="text-xl font-black text-slate-900">Thống kê từng bài</h1>
        <p className="text-sm leading-6 text-slate-500">Theo ngày nộp của lượt mới nhất; bài chưa nộp dùng ngày giao. Điểm AI phân tích bài thi định kì không thay điểm chính thức trong sổ.</p>
        <div className="grid grid-cols-2 gap-2"><label className="min-w-0 text-xs text-slate-500">Từ ngày<input aria-label="Thống kê từ ngày" type="date" value={statsFrom} onChange={event => { setStatsFrom(event.target.value); setStatsPage(1); }} className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-slate-200 px-2 text-sm" /></label><label className="min-w-0 text-xs text-slate-500">Đến ngày<input aria-label="Thống kê đến ngày" type="date" value={statsTo} onChange={event => { setStatsTo(event.target.value); setStatsPage(1); }} className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-slate-200 px-2 text-sm" /></label></div>
        <div className="grid grid-cols-3 gap-2" aria-label="Tổng toàn bộ kết quả lọc"><div className="rounded-xl bg-white p-3"><p className="text-xl font-black">{statisticalRows.length}</p><p className="text-xs text-slate-500">Bài được giao</p></div><div className="rounded-xl bg-white p-3"><p className="text-xl font-black">{official.length}</p><p className="text-xs text-slate-500">Đã có điểm</p></div><div className="rounded-xl bg-white p-3"><p className="text-xl font-black">{average === null ? '—' : `${average.toFixed(1)}/10`}</p><p className="text-xs text-slate-500">TB bài có điểm</p></div></div>
        <p className="text-xs text-slate-500">TB các bài trong khoảng chọn; điểm TB có hệ số chính thức xem tại Sổ điểm.</p>
        {official.length >= 2 && <figure className="rounded-xl bg-white p-3"><figcaption className="mb-2 text-sm font-bold text-slate-700">Xu hướng 12 bài có điểm gần nhất</figcaption><div className="flex h-24 items-end gap-1" aria-label="Xu hướng điểm">{[...official].slice(0, 12).reverse().map(row => <div key={row.id} className="min-w-0 flex-1"><div className="rounded-t bg-indigo-500" style={{ height: `${Math.max(2, row.score! / row.maxScore * 70)}px` }} /><p className="mt-1 text-center text-[10px] text-slate-600" title={row.title}>{(row.score! / row.maxScore * 10).toFixed(1)}</p></div>)}</div><p className="mt-2 text-xs text-slate-500">Từ cũ đến mới · thang 10</p></figure>}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{statisticalRows.slice((safeStatsPage - 1) * PAGE_SIZE, safeStatsPage * PAGE_SIZE).map(row => <button type="button" key={row.id} onClick={() => openRow(row)} className="flex min-h-16 w-full items-center gap-3 border-b border-slate-100 p-3 text-left last:border-b-0 hover:bg-indigo-50"><span className="min-w-0 flex-1"><span className="block break-words text-sm font-bold">{row.title}</span><span className="mt-1 block text-xs text-slate-500">{dayLabel(row.statDate)} · {row.attempts} lượt · {row.assignment?.periodicTest ? 'Phân tích bài thi · Điểm tại Sổ điểm' : row.state.label}{row.attempts === 0 ? ' · Ngày giao' : ''}</span></span><span className="shrink-0 text-sm font-bold text-emerald-700">{row.score === null ? '—' : `${row.score}/${row.maxScore}`}</span><ChevronRight className="h-4 w-4 text-slate-400" /></button>)}{!statisticalRows.length && <p className="p-4 text-sm text-slate-500">Chưa có bài trong khoảng này.</p>}</div>
        <Pagination page={safeStatsPage} count={statisticalRows.length} onPage={setStatsPage} />
      </section>}
      {visitedCompetencies && <div hidden={section !== 'competencies'} className="space-y-4"><StudentCompetencyPortfolio />
        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">Tích lũy</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">Hồ sơ học tập</h2>
            </div>
            <Target className="h-5 w-5 text-indigo-400" />
          </div>
          {!hasProfileData ? (
            <div className="mt-3 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-9 text-center shadow-sm">
              <Sparkles className="mx-auto mb-2 h-8 w-8 text-indigo-200" />
              <p className="text-sm font-medium leading-6 text-slate-500">Sau vài bài đã chấm, chỗ này sẽ ghi em đang vững phần nào và nên luyện thêm phần nào.</p>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {skillCards.length > 0 && (
                <div className="rounded-[1.5rem] border border-indigo-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-sm font-black text-indigo-700"><Target className="h-4 w-4" /> Kỹ năng đã theo dõi</p>
                    <span className="text-xs font-bold text-slate-400">{skillCards.length} kỹ năng</span>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {skillCards.map(card => (
                      <article key={card.skillId} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="min-w-0 text-sm font-black leading-5 text-slate-900">{card.title}</h3>
                          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-indigo-700 ring-1 ring-indigo-100">{card.statusLabel}</span>
                        </div>
                        <div className="mt-3" aria-label={`Mức độ hiện tại ${card.masteryPercent}%`}>
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500"><span>Mức độ hiện tại</span><span>{card.masteryPercent}%</span></div>
                          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${card.masteryPercent}%` }} /></div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-slate-500">
                          <span>{card.trendLabel}</span>
                          <span>Độ tin cậy {card.confidencePercent}%</span>
                        </div>
                        <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-400">{card.sourceLabel} · {card.evidenceCount} minh chứng</p>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {legacyTopics.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="mb-3 flex items-center gap-2 text-sm font-black text-emerald-700"><TrendingUp className="h-4 w-4" /> Em đang vững</p><div className="flex flex-wrap gap-2">{strongTopics.map(topic => <span key={topic} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">{topic}</span>)}{strongTopics.length === 0 && <span className="text-sm font-semibold text-slate-400">Chưa đủ dữ liệu.</span>}</div></div>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="mb-3 flex items-center gap-2 text-sm font-black text-amber-700"><Target className="h-4 w-4" /> Nên luyện thêm</p><div className="flex flex-wrap gap-2">{weakTopics.map(topic => <span key={topic} className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">{topic}</span>)}{weakTopics.length === 0 && <span className="text-sm font-semibold text-slate-400">Chưa đủ dữ liệu.</span>}</div></div>
                </div>
              )}
            </div>
          )}
        </section>

      </div>}
      {section === 'reports' && <Suspense fallback={<p role="status" className="text-sm text-slate-500">Đang mở báo cáo…</p>}><StudentPublishedReports /></Suspense>}
      {section === 'assignments' && showPractice && <div className="space-y-3"><button type="button" className={buttonClass} onClick={() => setShowPractice(false)}><ArrowLeft className="h-4 w-4" />Danh sách bài tập</button>
        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">Luyện tập</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">Luyện thêm theo chủ đề</h2>
            </div>
            <BookOpenCheck className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="mt-3 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            {practiceQuestions.length === 0 ? (
              <>
                <p className="text-sm font-medium leading-6 text-slate-500">Máy ra 6 câu từ dễ đến khó, nhắm đúng những lỗi em mắc trong các bài BTVN đã chấm. Làm xong bấm "Tạo đề tiếp" để nhận đề khác, không trùng đề cũ.</p>
                {practiceError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700" role="alert">{practiceError}</p>}
                <button type="button" onClick={onLoadPractice} disabled={loadingPractice} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-60">
                  {loadingPractice && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loadingPractice ? 'Đang soạn bài...' : 'Lấy bài luyện'}
                </button>
              </>
            ) : (
              <>
                {practiceSet?.topics && practiceSet.topics.length > 0 && <p className="mb-4 text-xs font-black uppercase tracking-wide text-indigo-600">Chủ đề: {practiceSet.topics.join(' · ')}</p>}
                <ol className="space-y-3">
                  {practiceQuestions.map((question, index) => {
                    const result = practiceResults.get(question.id);
                    return (
                      <li key={question.id} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-slate-900">Câu {index + 1}</span>
                          {question.level && PRACTICE_LEVEL_LABEL[question.level] && (
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${PRACTICE_LEVEL_LABEL[question.level].className}`}>{PRACTICE_LEVEL_LABEL[question.level].label}</span>
                          )}
                        </div>
                        {question.basis && <p className="mt-1 break-words text-xs font-semibold text-indigo-600">{question.basis}</p>}
                        <div className="mt-2 break-words font-semibold text-slate-900"><NhanXetMarkdown>{question.question}</NhanXetMarkdown></div>
                        {question.hint && (
                          <div className="mt-2 break-words rounded-xl bg-white/70 px-3 py-2 text-slate-500">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-400">Gợi ý</span>
                            <NhanXetMarkdown>{question.hint}</NhanXetMarkdown>
                          </div>
                        )}
                        {question.steps && question.steps.length > 0 && <PracticeScaffold key={`${practiceSet?.setId}-${question.id}`} steps={question.steps} />}
                        <label className="mt-3 block">
                          <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-400">Câu trả lời của em</span>
                          <textarea
                            value={practiceAnswers[question.id] || ''}
                            onChange={event => onPracticeAnswerChange(question.id, event.target.value)}
                            disabled={submittingPractice || practiceAttempt?.status === 'graded'}
                            rows={3}
                            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium leading-6 text-slate-800 outline-none transition focus:border-indigo-400 disabled:bg-slate-100"
                            placeholder="Viết cách làm hoặc đáp án của em..."
                          />
                        </label>
                        {practiceAttempt?.status === 'graded' && result && (
                          <div className="mt-3 space-y-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm">
                            <p className="font-black text-emerald-800">{result.score}/{result.maxScore} điểm</p>
                            <NhanXetMarkdown tone="sang">{result.feedback}</NhanXetMarkdown>
                            {result.expectedAnswer && (
                              <div className="break-words">
                                <p className="font-black text-indigo-700">Đáp án tham khảo</p>
                                <NhanXetMarkdown>{result.expectedAnswer}</NhanXetMarkdown>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
                {practiceError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700" role="alert">{practiceError}</p>}
                {practiceAttempt?.status === 'graded' && (
                  <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">Tổng: {practiceAttempt.score}/{practiceAttempt.maxScore} điểm. Đây là kết quả luyện tập, không thay thế điểm chính thức.</p>
                )}
                <button type="button" onClick={onSubmitPractice} disabled={submittingPractice || practiceAttempt?.status === 'graded'} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-60">
                  {submittingPractice && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submittingPractice ? 'Đang chấm...' : practiceAttempt?.status === 'error' ? 'Thử chấm lại' : 'Nộp bài luyện'}
                </button>
                {practiceAttempt?.status === 'graded' && <button type="button" onClick={onLoadPractice} disabled={loadingPractice} className="ml-2 mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-indigo-200 px-4 py-3 text-sm font-black text-indigo-700 hover:bg-indigo-50 disabled:opacity-60">{loadingPractice && <Loader2 className="h-4 w-4 animate-spin" />}{loadingPractice ? 'Đang soạn đề mới...' : 'Tạo đề tiếp'}</button>}
              </>
            )}
          </div>
        </section>
      </div>}
    </main>
  </div>;
};
