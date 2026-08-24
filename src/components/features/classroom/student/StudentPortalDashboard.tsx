import { type ChangeEventHandler, type RefObject, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpenCheck, Camera, CheckCircle2, Clock3, GraduationCap, Info, Loader2, LogOut, RefreshCw, Sparkles, Target, TrendingUp, X } from 'lucide-react';
import type { PracticeAttemptResult, PracticeSetResult } from '../../../../services/gradingApi';
import type { AssignmentDoc, StudentProfileDoc, SubmissionDoc } from '../../../../lib/classroom/types';
import { getStudentAssignmentState, latestSubmissionByAssignment, type StudentAssignmentStatus } from '../../../../lib/classroom/portalViewModel';
import { buildStudentSkillCards } from '../../../../lib/classroom/skillViewModel';
import { StudentAssignmentCard } from './StudentAssignmentCard';

interface SessionInfo {
  studentName: string;
  className: string;
}

interface Props {
  session: SessionInfo;
  assignments: AssignmentDoc[];
  submissions: SubmissionDoc[];
  profile: StudentProfileDoc | null;
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
  onOpenAssignment: (assignment: AssignmentDoc | undefined, submission?: SubmissionDoc) => void;
  onSignOut: () => void;
  onReload: () => void;
  onLoadPractice: () => void;
  onPracticeAnswerChange: (questionId: string, answer: string) => void;
  onSubmitPractice: () => void;
  onDismissSuccess: () => void;
}

type FilterKey = 'all' | 'todo' | 'waiting' | 'retry' | 'graded';

const filterMeta: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'todo', label: 'Cần nộp' },
  { key: 'waiting', label: 'Đang chờ chấm' },
  { key: 'retry', label: 'Cần nộp lại' },
  { key: 'graded', label: 'Đã chấm' },
];

const statusFilterMatch = (status: StudentAssignmentStatus, filter: FilterKey): boolean => {
  if (filter === 'all') return true;
  if (filter === 'waiting') return status === 'waiting' || status === 'grading';
  return status === filter;
};

const statusLabel = (status: StudentAssignmentStatus): string => {
  if (status === 'todo') return 'Chưa nộp';
  if (status === 'retry') return 'Cần nộp lại';
  if (status === 'graded') return 'Đã có nhận xét';
  return 'Đang xử lý';
};

export const StudentPortalDashboard = ({
  session,
  assignments,
  submissions,
  profile,
  loading,
  uploadingId,
  uploadStep,
  successMessage,
  warningMessage,
  actionError,
  dataError,
  practiceSet,
  practiceAnswers,
  practiceAttempt,
  loadingPractice,
  submittingPractice,
  practiceError,
  uploadRef,
  pendingFiles,
  pendingAssignmentTitle,
  maxPendingFiles,
  onFileChange,
  onChooseImage,
  onAddMoreImages,
  onRemovePendingFile,
  onSubmitPendingFiles,
  onOpenAssignment,
  onSignOut,
  onReload,
  onLoadPractice,
  onPracticeAnswerChange,
  onSubmitPractice,
  onDismissSuccess,
}: Props) => {
  const [filter, setFilter] = useState<FilterKey>('all');
  const pendingPreviewUrls = useMemo(() => pendingFiles.map(file => (
    file.type.startsWith('image/') && typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(file)
      : null
  )), [pendingFiles]);
  useEffect(() => () => {
    pendingPreviewUrls.forEach(url => {
      if (url) URL.revokeObjectURL(url);
    });
  }, [pendingPreviewUrls]);
  const latest = useMemo(() => latestSubmissionByAssignment(submissions), [submissions]);
  const rows = useMemo(() => assignments.map(assignment => {
    const submission = latest.get(assignment.id);
    return { assignment, submission, state: getStudentAssignmentState(assignment, submission) };
  }), [assignments, latest]);
  const visibleRows = useMemo(() => rows.filter(row => statusFilterMatch(row.state.status, filter)), [filter, rows]);
  const selfSubmissions = useMemo(() => submissions
    .filter(submission => !submission.assignmentId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt)), [submissions]);
  const assignedGraded = useMemo(() => rows
    .filter(row => row.state.status === 'graded')
    .map(row => row.submission)
    .filter((item): item is SubmissionDoc => Boolean(item)), [rows]);
  const allGraded = useMemo(() => [
    ...assignedGraded,
    ...selfSubmissions.filter(submission => submission.status === 'graded'),
  ], [assignedGraded, selfSubmissions]);
  // Điểm AI chưa được thầy cô duyệt chỉ là bản nháp, không đưa vào điểm trung bình chính thức.
  // Đồng thời quy đổi theo phần trăm để bài 20 điểm không làm lệch bài 10 điểm.
  const approvedGraded = allGraded.filter(submission => submission.grade?.teacherApproved === true);
  const scoredAverage = approvedGraded.length > 0
    ? `${(approvedGraded.reduce((sum, submission) => {
        const score = submission.grade?.score ?? 0;
        const max = submission.grade?.maxScore || 0;
        return sum + (max > 0 ? (score / max) * 100 : 0);
      }, 0) / approvedGraded.length).toFixed(1)}%`
    : '—';
  const completedCount = rows.filter(row => row.state.status !== 'todo').length;
  const progress = assignments.length > 0 ? Math.round((completedCount / assignments.length) * 100) : 0;
  const legacyTopics = profile?.topics || [];
  const weakTopics = legacyTopics.filter(topic => topic.level === 'weak');
  const strongTopics = legacyTopics.filter(topic => topic.level === 'solid');
  const skillCards = buildStudentSkillCards(profile?.skills);
  const hasProfileData = skillCards.length > 0 || legacyTopics.length > 0;
  const counts = useMemo(() => ({
    all: rows.length,
    todo: rows.filter(row => row.state.status === 'todo').length,
    waiting: rows.filter(row => row.state.status === 'waiting' || row.state.status === 'grading').length,
    retry: rows.filter(row => row.state.status === 'retry').length,
    graded: rows.filter(row => row.state.status === 'graded').length,
  }), [rows]);
  const practiceQuestions = practiceSet?.questions ?? [];
  const practiceResults = new Map((practiceAttempt?.questionResults ?? []).map(result => [result.id, result]));

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 pb-10">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 font-black text-white shadow-md shadow-indigo-200">
            {session.studentName.charAt(0) || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black leading-tight text-slate-900">{session.studentName}</p>
            <p className="truncate text-xs font-semibold text-slate-400">{session.className}</p>
          </div>
          <button type="button" onClick={onSignOut} title="Đăng xuất" aria-label="Đăng xuất" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 pt-5 sm:px-6 sm:pt-7">
        {/* KHONG dat capture="environment": tren dien thoai capture THANG multiple, may mo thang
            camera va tra ve DUNG MOT anh. Bo di thi trinh chon cho phep chup moi lan nhieu tam
            va lay tu thu vien. Nhan them PDF vi nhieu em nop ban scan nhieu trang. */}
        <input ref={uploadRef} type="file" accept="image/*,application/pdf,.pdf,.docx" multiple className="hidden" onChange={onFileChange} />

        <section className="overflow-hidden rounded-[1.75rem] bg-slate-900 p-5 text-white shadow-xl shadow-slate-200 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-300">Bảng việc của em</p>
              <h1 className="mt-2 break-words text-2xl font-black tracking-tight sm:text-3xl">Hôm nay em cần làm gì?</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">Mỗi bài chỉ có một bước tiếp theo rõ ràng. Em có thể nộp ảnh bằng điện thoại và xem ngay bài đang chờ chấm ở đây.</p>
            </div>
            <button type="button" onClick={() => onChooseImage(null)} disabled={uploadingId !== ''} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-400 disabled:opacity-60">
              {uploadingId === 'tu-do' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {uploadingId === 'tu-do' ? 'Đang xử lý...' : 'Tự chấm bài'}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2 sm:gap-4" aria-label="Tóm tắt tiến độ">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
            <p className="text-xl font-black text-indigo-700 sm:text-2xl">{progress}%</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400 sm:text-xs">Đã xử lý</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
            <p className="text-xl font-black text-emerald-600 sm:text-2xl">{scoredAverage}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400 sm:text-xs">Điểm đã duyệt</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
            <p className="text-xl font-black text-slate-900 sm:text-2xl">{assignedGraded.length}<span className="text-sm font-bold text-slate-300">/{assignments.length}</span></p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400 sm:text-xs">Đã chấm</p>
          </div>
        </section>

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
          <section aria-labelledby="pending-upload-heading" className="rounded-[1.5rem] border-2 border-indigo-200 bg-indigo-50 p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">Bộ tệp đang chờ nộp</p>
                <h2 id="pending-upload-heading" className="mt-1 break-words text-lg font-black text-slate-900">{pendingAssignmentTitle || 'Bài của em'}</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Đã chụp/chọn {pendingFiles.length}/{maxPendingFiles} tệp. Em có thể chụp tiếp các trang còn lại rồi nộp một lần.</p>
              </div>
              <span className="inline-flex shrink-0 items-center rounded-full bg-white px-3 py-1.5 text-xs font-black text-indigo-700 ring-1 ring-indigo-200">Chưa nộp</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" role="list" aria-label="Các tệp đang chờ nộp">
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
                      <button type="button" onClick={() => onRemovePendingFile(index)} disabled={uploadingId !== ''} aria-label={`Xóa tệp ${index + 1}`} className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><X className="h-4 w-4" /></button>
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
          </section>
        )}

        <section aria-labelledby="assignments-heading">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">Việc cần làm</p>
              <h2 id="assignments-heading" className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">Bài tập của em</h2>
            </div>
            <span className="text-xs font-bold text-slate-400">{assignments.length} bài được giao</span>
          </div>

          <div className="mt-4 overflow-x-auto pb-1" role="tablist" aria-label="Lọc trạng thái bài tập">
            <div className="flex min-w-max gap-2">
              {filterMeta.map(item => (
                <button
                  type="button"
                  key={item.key}
                  role="tab"
                  aria-selected={filter === item.key}
                  onClick={() => setFilter(item.key)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition ${filter === item.key ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700'}`}
                >
                  {item.label}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${filter === item.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{counts[item.key]}</span>
                </button>
              ))}
            </div>
          </div>

          {loading && assignments.length === 0 && submissions.length === 0 ? (
            <div className="mt-3 space-y-3" aria-label="Đang tải bài tập">
              <div className="h-40 animate-pulse rounded-[1.5rem] bg-white ring-1 ring-slate-100" />
              <div className="h-40 animate-pulse rounded-[1.5rem] bg-white ring-1 ring-slate-100" />
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="mt-3 rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-emerald-400" />
              <p className="font-black text-slate-800">{filter === 'all' ? 'Chưa có bài tập nào.' : 'Không có bài ở trạng thái này.'}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">Khi có bài mới hoặc cần em thao tác, thầy cô sẽ giao trong lớp này.</p>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {visibleRows.map(row => (
                <StudentAssignmentCard
                  key={row.assignment.id}
                  assignment={row.assignment}
                  submission={row.submission}
                  state={row.state}
                  uploading={uploadingId !== ''}
                  onUpload={onChooseImage}
                  onOpen={onOpenAssignment}
                />
              ))}
            </div>
          )}
        </section>

        {selfSubmissions.length > 0 && (
          <section>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Ngoài bài được giao</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Bài em tự chấm</h2>
              </div>
              <span className="text-xs font-bold text-slate-400">{selfSubmissions.length} lượt</span>
            </div>
            <div className="mt-3 space-y-2">
              {selfSubmissions.slice(0, 3).map(submission => (
                <button type="button" key={submission.id} onClick={() => onOpenAssignment(undefined, submission)} className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100"><GraduationCap className="h-4 w-4 text-slate-500" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-black text-slate-800">Bài tự nộp · {new Date(submission.createdAt).toLocaleDateString('vi-VN')}</span>
                    <span className="mt-0.5 block text-xs font-bold text-slate-400">{statusLabel(submission.status === 'error' ? 'retry' : submission.status === 'submitted' ? 'waiting' : submission.status === 'grading' ? 'grading' : 'graded')}</span>
                  </span>
                  {submission.grade && <span className="text-sm font-black text-emerald-700">{submission.grade.score}/{submission.grade.maxScore}</span>}
                </button>
              ))}
            </div>
          </section>
        )}

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
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="mb-3 flex items-center gap-2 text-sm font-black text-emerald-700"><TrendingUp className="h-4 w-4" /> Em đang vững</p><div className="flex flex-wrap gap-2">{strongTopics.map(topic => <span key={topic.topic} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">{topic.topic}</span>)}{strongTopics.length === 0 && <span className="text-sm font-semibold text-slate-400">Chưa đủ dữ liệu.</span>}</div></div>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="mb-3 flex items-center gap-2 text-sm font-black text-amber-700"><Target className="h-4 w-4" /> Nên luyện thêm</p><div className="flex flex-wrap gap-2">{weakTopics.map(topic => <span key={topic.topic} className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">{topic.topic}</span>)}{weakTopics.length === 0 && <span className="text-sm font-semibold text-slate-400">Chưa đủ dữ liệu.</span>}</div></div>
                </div>
              )}
            </div>
          )}
        </section>

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
                <p className="text-sm font-medium leading-6 text-slate-500">Máy sẽ ra bài luyện bám đúng chủ đề em còn vướng, dựa trên các bài đã chấm.</p>
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
                        <p className="break-words font-bold text-slate-900">Câu {index + 1}. {question.question}</p>
                        {question.hint && <p className="mt-1 break-words text-sm font-semibold text-slate-500">Gợi ý: {question.hint}</p>}
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
                            <p className="font-black text-emerald-800">{result.score}/{result.maxScore} điểm · {result.feedback}</p>
                            {result.expectedAnswer && <p className="whitespace-pre-line break-words font-semibold leading-6 text-slate-700"><span className="font-black text-indigo-700">Đáp án tham khảo:</span> {result.expectedAnswer}</p>}
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
                {practiceAttempt?.status === 'graded' && <button type="button" onClick={onLoadPractice} disabled={loadingPractice} className="ml-2 mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-indigo-200 px-4 py-3 text-sm font-black text-indigo-700 hover:bg-indigo-50 disabled:opacity-60">Luyện lượt mới</button>}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
