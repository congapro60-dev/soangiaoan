import { useCallback, useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { CheckCircle2, ChevronDown, ChevronRight, Loader2, PenLine, RefreshCw, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import type { Exam, ExamQuestion, ExamSubmission } from '../../../types';
import type { AssignmentDoc } from '../../../lib/classroom/types';
import {
  approveOnlineGrade,
  autoGradeOnline,
  deleteOnlineGrade,
  getAccessibleExam,
  listOnlineAssignmentSubmissions,
  regradeOnlineGrade,
  saveOnlineGrade,
} from '../../../lib/classroom/teacherService';
import type { TeacherOnlineGradeEdit } from '../../../lib/classroom/onlineGradeLifecycle';
import { NhanXetMarkdown } from './NhanXetMarkdown';
import { onlineAttemptStatus } from '../../../lib/classroom/onlineGradeView';

interface Props {
  classId: string;
  assignment: AssignmentDoc;
  showToast: (message: string, icon?: any) => void;
}

interface EditDraft {
  questionScores: Record<string, string>;
  questionFeedback: Record<string, string>;
  feedback: string;
  teacherNote: string;
}

const timeLabel = (value?: string): string => {
  if (!value) return 'Chưa có thời gian';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa có thời gian' : date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

const resultFor = (attempt: ExamSubmission, index: number) => attempt.grade?.questionResults?.[index];

const draftFor = (attempt: ExamSubmission, questions: readonly ExamQuestion[]): EditDraft => {
  const questionScores: Record<string, string> = {};
  const questionFeedback: Record<string, string> = {};
  questions.forEach((question, index) => {
    const result = resultFor(attempt, index);
    const answer = attempt.answers.find(item => item.questionId === question.id);
    const score = result?.score ?? answer?.teacherScore ?? answer?.aiScore ?? answer?.autoScore;
    if (score !== undefined) questionScores[question.id] = String(score);
    if (result?.explanation) questionFeedback[question.id] = result.explanation;
    else if (answer?.teacherFeedback) questionFeedback[question.id] = answer.teacherFeedback;
  });
  return {
    questionScores,
    questionFeedback,
    feedback: attempt.grade?.feedback || '',
    teacherNote: attempt.grade?.teacherNote || '',
  };
};

const questionAnswer = (attempt: ExamSubmission, question: ExamQuestion): string =>
  attempt.answers.find(answer => answer.questionId === question.id)?.answer || '';

const scoreText = (attempt: ExamSubmission): string => {
  if (!attempt.grade) return 'Chưa có điểm';
  return `${attempt.grade.score}/${attempt.grade.maxScore}`;
};

export const OnlineAssignmentReview = ({ classId, assignment, showToast }: Props) => {
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempts, setAttempts] = useState<ExamSubmission[]>([]);
  const [openId, setOpenId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const refresh = useCallback(async () => {
    if (!assignment.examId) {
      setError('Bài online chưa gắn đề.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [loadedExam, loadedAttempts] = await Promise.all([
        getAccessibleExam(classId, assignment.examId),
        listOnlineAssignmentSubmissions(classId, assignment.id),
      ]);
      setExam(loadedExam);
      setAttempts(loadedAttempts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không tải được lượt làm online.');
    } finally {
      setLoading(false);
    }
  }, [assignment.examId, assignment.id, classId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const sortedAttempts = useMemo(() => [...attempts].sort((a, b) => {
    const byName = a.studentName.localeCompare(b.studentName, 'vi');
    if (byName !== 0) return byName;
    return (b.attemptNumber || 0) - (a.attemptNumber || 0);
  }), [attempts]);

  const updateAttempt = (next: ExamSubmission) => {
    setAttempts(previous => previous.map(attempt => attempt.id === next.id ? next : attempt));
  };

  const openEditor = (attempt: ExamSubmission) => {
    if (!exam) return;
    setOpenId(attempt.id);
    setEditingId(attempt.id);
    setDraft(draftFor(attempt, exam.questions));
  };

  const runAction = async (attempt: ExamSubmission, action: 'auto' | 'ai' | 'approve' | 'delete') => {
    if (action === 'delete') {
      const confirmation = await Swal.fire({
        icon: 'warning',
        title: `Xóa điểm của ${attempt.studentName}?`,
        text: 'Chỉ xóa kết quả điểm hiện hành; lượt làm và câu trả lời vẫn giữ nguyên.',
        showCancelButton: true,
        confirmButtonText: 'Xóa điểm',
        cancelButtonText: 'Giữ lại',
        confirmButtonColor: '#d97706',
      });
      if (!confirmation.isConfirmed) return;
    }
    const key = `${attempt.id}:${action}`;
    setBusy(key);
    try {
      const next = action === 'auto'
        ? await autoGradeOnline(attempt.id, classId)
        : action === 'ai'
          ? await regradeOnlineGrade(attempt.id, classId)
          : action === 'approve'
            ? await approveOnlineGrade(attempt.id, classId)
            : await deleteOnlineGrade(attempt.id, classId);
      updateAttempt(next);
      if (action === 'delete') setDraft(null);
      showToast(
        action === 'approve' ? `Đã duyệt điểm cho ${attempt.studentName}.` : action === 'delete' ? `Đã xóa điểm của ${attempt.studentName}; lượt làm vẫn giữ.` : `Đã cập nhật kết quả cho ${attempt.studentName}.`,
        'success',
      );
    } catch (actionError) {
      Swal.fire({ icon: 'error', title: 'Chưa thực hiện được', text: actionError instanceof Error ? actionError.message : 'Thử lại sau.', confirmButtonColor: '#3085d6' });
    } finally {
      setBusy('');
    }
  };

  const saveDraft = async (attempt: ExamSubmission) => {
    if (!draft) return;
    const questionScores: Record<string, number> = {};
    for (const [questionId, value] of Object.entries(draft.questionScores)) {
      if (value.trim() === '') continue;
      const score = Number(value);
      if (!Number.isFinite(score)) {
        showToast('Có điểm theo câu chưa hợp lệ.', 'warning');
        return;
      }
      questionScores[questionId] = score;
    }
    const edit: TeacherOnlineGradeEdit = {
      questionScores,
      questionFeedback: draft.questionFeedback,
      feedback: draft.feedback,
      teacherNote: draft.teacherNote,
    };
    setBusy(`${attempt.id}:save`);
    try {
      const next = await saveOnlineGrade(attempt.id, edit, classId);
      updateAttempt(next);
      setDraft(draftFor(next, exam?.questions || []));
      showToast(`Đã lưu chấm tay cho ${attempt.studentName}; cần duyệt lại.`, 'success');
    } catch (saveError) {
      Swal.fire({ icon: 'error', title: 'Không lưu được', text: saveError instanceof Error ? saveError.message : 'Thử lại sau.', confirmButtonColor: '#3085d6' });
    } finally {
      setBusy('');
    }
  };

  if (loading) return <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải lượt làm online...</div>;
  if (error) return <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm font-semibold text-red-700"><p>{error}</p><button type="button" onClick={() => void refresh()} className="mt-2 inline-flex items-center gap-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white"><RefreshCw className="h-3.5 w-3.5" /> Thử lại</button></div>;
  if (!exam) return null;

  return (
    <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wide text-indigo-600">Bài làm online</p>
          <p className="mt-1 text-sm font-black text-slate-900">{attempts.length} lượt làm · {exam.questions.length} câu · xem/chấm trong cùng trang</p>
        </div>
        <button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-700"><RefreshCw className="h-3.5 w-3.5" /> Làm mới</button>
      </div>

      {sortedAttempts.length === 0 ? (
        <p className="mt-4 rounded-xl bg-white px-3 py-4 text-sm font-semibold text-slate-500">Chưa có học sinh nộp bài online.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {sortedAttempts.map(attempt => {
            const state = onlineAttemptStatus(attempt);
            const expanded = openId === attempt.id;
            const isBusy = busy.startsWith(`${attempt.id}:`);
            return (
              <div key={attempt.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <button type="button" onClick={() => { setOpenId(expanded ? '' : attempt.id); if (expanded) { setEditingId(''); setDraft(null); } }} className="flex min-h-14 w-full items-center gap-2 px-3 py-3 text-left hover:bg-slate-50" aria-expanded={expanded}>
                  {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-indigo-600" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-black text-indigo-700">{attempt.studentName.charAt(0)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">{attempt.studentName}</span>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-black ${state.className}`}>{state.label}</span>
                  <span className="shrink-0 text-sm font-black text-slate-800">{scoreText(attempt)}</span>
                  <span className="hidden text-[11px] font-semibold text-slate-400 sm:inline">Lượt {attempt.attemptNumber || 1} · {timeLabel(attempt.submittedAt || attempt.startedAt)}</span>
                </button>

                {expanded && (
                  <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {exam.questions.map((question, index) => {
                        const result = resultFor(attempt, index);
                        const answer = questionAnswer(attempt, question);
                        const answerRecord = attempt.answers.find(item => item.questionId === question.id);
                        const currentScore = result?.score ?? answerRecord?.teacherScore ?? answerRecord?.aiScore ?? answerRecord?.autoScore;
                        return (
                          <div key={question.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-black text-slate-700">Câu {index + 1} · tối đa {question.points} điểm</p>
                              <span className="text-xs font-black text-indigo-700">{currentScore === undefined ? '—' : `${currentScore}/${question.points}`}</span>
                            </div>
                            <div className="mt-2 text-sm"><NhanXetMarkdown>{question.content}</NhanXetMarkdown></div>
                            <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm"><p className="mb-1 text-[11px] font-black uppercase tracking-wide text-slate-400">Bài làm</p>{answer ? <NhanXetMarkdown>{answer}</NhanXetMarkdown> : <span className="font-semibold italic text-slate-400">Bỏ trống</span>}</div>
                            {result && <p className="mt-2 text-xs font-semibold text-slate-500">{result.errorType || result.status}{result.needsTeacherReview ? ' · cần GV xem lại' : ''}</p>}
                          </div>
                        );
                      })}
                    </div>

                    {attempt.grade?.feedback && <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3"><p className="mb-1 text-[11px] font-black uppercase tracking-wide text-emerald-700">Nhận xét gửi học sinh</p><NhanXetMarkdown tone="sang">{attempt.grade.feedback}</NhanXetMarkdown></div>}
                    {attempt.grade?.noteForTeacher && <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3"><p className="mb-1 text-[11px] font-black uppercase tracking-wide text-amber-700">Ghi chú nội bộ cho giáo viên</p><NhanXetMarkdown tone="sang">{attempt.grade.noteForTeacher}</NhanXetMarkdown></div>}
                    {attempt.grade?.questionResults && attempt.grade.questionResults.length > 0 && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-500">Phân tích chấm</p>{attempt.grade.questionResults.map((result, index) => <p key={`${result.questionNumber}-${index}`} className="text-xs font-semibold leading-5 text-slate-600"><b>{result.questionNumber}</b>: {result.explanation || result.errorType || result.status}</p>)}</div>
                    )}

                    {editingId === attempt.id && draft ? (
                      <div className="space-y-3 rounded-2xl border border-indigo-200 bg-white p-3">
                        <p className="text-sm font-black text-indigo-800">Sửa điểm và nhận xét theo từng câu</p>
                        {exam.questions.map((question, index) => (
                          <div key={question.id} className="grid gap-2 sm:grid-cols-[7rem_1fr] sm:items-start">
                            <label className="text-xs font-black text-slate-600">Câu {index + 1} / {question.points} điểm<input type="number" min={0} max={question.points} step={0.25} value={draft.questionScores[question.id] || ''} onChange={event => setDraft(previous => previous ? { ...previous, questionScores: { ...previous.questionScores, [question.id]: event.target.value } } : previous)} className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-sm font-black outline-none focus:border-indigo-400" /></label>
                            <textarea value={draft.questionFeedback[question.id] || ''} onChange={event => setDraft(previous => previous ? { ...previous, questionFeedback: { ...previous.questionFeedback, [question.id]: event.target.value } } : previous)} rows={2} placeholder="Nhận xét theo câu (tuỳ chọn)" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                          </div>
                        ))}
                        <textarea value={draft.feedback} onChange={event => setDraft(previous => previous ? { ...previous, feedback: event.target.value } : previous)} rows={3} placeholder="Nhận xét tổng gửi học sinh" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                        <textarea value={draft.teacherNote} onChange={event => setDraft(previous => previous ? { ...previous, teacherNote: event.target.value } : previous)} rows={2} placeholder="Ghi chú nội bộ cho giáo viên" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                        <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => { setEditingId(''); setDraft(null); }} className="rounded-xl px-3 py-2 text-xs font-black text-slate-500">Hủy</button><button type="button" onClick={() => void saveDraft(attempt)} disabled={isBusy} className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{busy === `${attempt.id}:save` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Lưu chấm tay</button></div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {state.canGrade && <><button type="button" onClick={() => void runAction(attempt, 'auto')} disabled={isBusy} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" /> Chấm tự động</button><button type="button" onClick={() => void runAction(attempt, 'ai')} disabled={isBusy} className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white disabled:opacity-50"><Sparkles className="h-3.5 w-3.5" /> Chấm lại bằng AI</button><button type="button" onClick={() => openEditor(attempt)} disabled={isBusy} className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-700 disabled:opacity-50"><PenLine className="h-3.5 w-3.5" /> Sửa/chấm tay</button></>}
                        {state.canApprove && <button type="button" onClick={() => void runAction(attempt, 'approve')} disabled={isBusy} className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"><ShieldCheck className="h-3.5 w-3.5" /> Duyệt điểm</button>}
                        {state.canDeleteGrade && <button type="button" onClick={() => void runAction(attempt, 'delete')} disabled={isBusy} className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-black text-amber-700 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> Xóa điểm</button>}
                        {isBusy && <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang xử lý...</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
