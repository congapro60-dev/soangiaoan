import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Loader2, Save, Send } from 'lucide-react';
import type { Exam, ExamQuestion } from '../types';
import { createSubmissionNonce } from '../hooks/useExams';
import {
  resumeStudentExam,
  saveStudentExam,
  startStudentExam,
  submitStudentExam,
  type StudentExamResponse,
} from '../services/studentExamApi';
import {
  answersFromSubmission,
  remainingSecondsForAttempt,
  submissionAnswersForQuestions,
} from '../lib/classroom/studentExamView';
import { ensureMathWrapped, isCompoundTF, parseTFSub } from '../utils/examScoring';

type PageState = 'loading' | 'intro' | 'taking' | 'submitting' | 'done' | 'error';

const formatTime = (seconds: number): string => {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

const answered = (question: ExamQuestion, value: string): boolean => {
  if (!value.trim()) return false;
  if (!isCompoundTF(question)) return true;
  const parsed = parseTFSub(value);
  return ['a', 'b', 'c', 'd'].every(key => parsed[key]);
};

const setTrueFalseAnswer = (value: string, key: string, next: 'Đ' | 'S'): string => {
  const current = parseTFSub(value);
  return JSON.stringify({ ...current, [key]: next });
};

const questionNumber = (questions: readonly ExamQuestion[], id: string): number => {
  const index = questions.findIndex(question => question.id === id);
  return index >= 0 ? index + 1 : 0;
};

const StudentMarkdown = ({ children }: { children: string }) => (
  <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
    {ensureMathWrapped(children)}
  </ReactMarkdown>
);

const ErrorPanel = ({ message, onBack }: { message: string; onBack: () => void }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
    <div className="w-full max-w-md rounded-[2rem] border border-red-100 bg-white p-7 text-center shadow-xl shadow-slate-200/50">
      <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
      <h1 className="mt-4 text-xl font-black text-slate-900">Không mở được bài online</h1>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{message}</p>
      <button type="button" onClick={onBack} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700">
        <ArrowLeft className="h-4 w-4" /> Về bảng việc
      </button>
    </div>
  </div>
);

export const StudentClassExamPage = () => {
  const { joinCode, assignmentId } = useParams<{ joinCode?: string; assignmentId?: string }>();
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [bundle, setBundle] = useState<StudentExamResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'offline'>('saved');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);
  const nonceRef = useRef(createSubmissionNonce());

  const exam = bundle?.exam || null;
  const attempt = bundle?.attempt || null;
  const questions = useMemo(() => exam?.questions || [], [exam]);
  const answeredCount = useMemo(() => questions.filter(question => answered(question, answers[question.id] || '')).length, [answers, questions]);
  const backToDashboard = useCallback(() => navigate(joinCode ? `/lop/${encodeURIComponent(joinCode)}` : '/lop'), [joinCode, navigate]);

  const applyBundle = useCallback((next: StudentExamResponse) => {
    setBundle(next);
    setAnswers(answersFromSubmission(next.attempt.answers));
    setRemainingSeconds(remainingSecondsForAttempt({
      durationMinutes: next.exam.durationMinutes,
      startedAt: next.attempt.startedAt,
      endAt: next.exam.endAt,
    }));
  }, []);

  useEffect(() => {
    if (!assignmentId) {
      setError('Thiếu mã bài giao.');
      setPageState('error');
      return;
    }
    startStudentExam(assignmentId)
      .then(next => { applyBundle(next); setPageState('intro'); })
      .catch(async startError => {
        // Người học có thể mở lại bằng URL cũ sau khi server đã tạo attempt. Nếu start bị
        // từ chối do hết lượt thì giữ thông báo thật, không tự đoán attempt khác.
        setError(startError instanceof Error ? startError.message : 'Không mở được bài online.');
        setPageState('error');
      });
  }, [applyBundle, assignmentId]);

  useEffect(() => {
    if (pageState !== 'taking' || !attempt || !exam) return;
    const interval = window.setInterval(() => {
      const next = remainingSecondsForAttempt({ durationMinutes: exam.durationMinutes, startedAt: attempt.startedAt, endAt: exam.endAt });
      setRemainingSeconds(next);
      if (next <= 0) setConfirmOpen(true);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [attempt, exam, pageState]);

  useEffect(() => {
    if (pageState !== 'taking' || !attempt) return;
    const onVisibilityChange = () => {
      if (!document.hidden) return;
      setTabSwitches(value => value + 1);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [attempt, pageState]);

  useEffect(() => {
    if (pageState !== 'taking' || !attempt) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState('saving');
    saveTimer.current = setTimeout(() => {
      void saveStudentExam(attempt.id, submissionAnswersForQuestions(questions, answers), tabSwitches)
        .then(next => { setBundle(current => current ? { ...current, attempt: next.attempt } : current); setSaveState('saved'); })
        .catch(() => setSaveState('offline'));
    }, 900);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [answers, attempt, pageState, questions, tabSwitches]);

  const begin = () => {
    if (!bundle?.attempt || bundle.attempt.status !== 'in_progress') return;
    setRemainingSeconds(remainingSecondsForAttempt({ durationMinutes: bundle.exam.durationMinutes, startedAt: bundle.attempt.startedAt, endAt: bundle.exam.endAt }));
    setPageState('taking');
  };

  const submit = useCallback(async () => {
    if (!attempt || !exam || submittingRef.current) return;
    submittingRef.current = true;
    setConfirmOpen(false);
    setPageState('submitting');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      const next = await submitStudentExam(attempt.id, submissionAnswersForQuestions(exam.questions, answers), nonceRef.current);
      setBundle(current => current ? { ...current, ...next } : next);
      setPageState('done');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không nộp được bài. Em kiểm tra mạng rồi thử lại.');
      setPageState('taking');
      submittingRef.current = false;
    }
  }, [answers, attempt, exam]);

  useEffect(() => {
    if (pageState === 'taking' && remainingSeconds <= 0 && attempt && !submittingRef.current) void submit();
  }, [attempt, pageState, remainingSeconds, submit]);

  const updateAnswer = (questionId: string, value: string) => {
    setAnswers(previous => ({ ...previous, [questionId]: value }));
    setError('');
  };

  const resume = async () => {
    if (!attempt) return;
    try {
      const next = await resumeStudentExam(attempt.id);
      applyBundle(next);
      setPageState('taking');
    } catch (resumeError) {
      setError(resumeError instanceof Error ? resumeError.message : 'Không tiếp tục được lượt làm bài.');
    }
  };

  if (pageState === 'loading') return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-9 w-9 animate-spin text-indigo-600" /></div>;
  if (pageState === 'error' || !bundle || !exam || !attempt) return <ErrorPanel message={error || 'Không có dữ liệu bài online.'} onBack={backToDashboard} />;

  if (pageState === 'intro') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 via-white to-white p-4">
        <div className="w-full max-w-xl rounded-[2rem] border border-slate-100 bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-9">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white"><Clock className="h-6 w-6" /></div>
            <div className="min-w-0"><p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">Bài online trong lớp</p><h1 className="mt-1 break-words text-2xl font-black text-slate-900">{exam.title}</h1></div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Info label="Thời gian" value={`${exam.durationMinutes} phút`} />
            <Info label="Số câu" value={`${exam.questions.length} câu`} />
            <Info label="Điểm tối đa" value={`${exam.maxScore}`} />
            <Info label="Lượt làm" value={`${attempt.attemptNumber || 1}`} />
          </div>
          <div className="mt-6 rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-semibold leading-6 text-indigo-900">
            Bài làm được lưu tự động. Nếu mất mạng, em kiểm tra trạng thái lưu rồi kết nối lại trước khi nộp. Sau khi nộp, em không thể sửa lượt này.
          </div>
          {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
          <button type="button" onClick={begin} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700">
            {bundle.resumed ? 'Tiếp tục làm bài' : 'Bắt đầu làm bài'} <Send className="h-4 w-4" />
          </button>
          <button type="button" onClick={resume} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50">Tải lại lượt đang làm</button>
        </div>
      </div>
    );
  }

  if (pageState === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-[2rem] border border-emerald-100 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
          <h1 className="mt-4 text-2xl font-black text-slate-900">Đã nộp bài thành công</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Bài của em đã được ghi nhận. Điểm sẽ hiển thị sau khi hệ thống hoặc thầy cô hoàn tất chấm.</p>
          <button type="button" onClick={backToDashboard} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700"><ArrowLeft className="h-4 w-4" /> Về bảng việc</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <button type="button" onClick={backToDashboard} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="Về bảng việc"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-900">{exam.title}</p><p className="text-xs font-semibold text-slate-400">{attempt.studentName} · Đã làm {answeredCount}/{questions.length} câu</p></div>
          <span className={`hidden items-center gap-2 rounded-xl border px-3 py-2 text-sm font-black sm:inline-flex ${remainingSeconds < 300 ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}><Clock className="h-4 w-4" /> {formatTime(remainingSeconds)}</span>
          <span className="hidden items-center gap-1 text-xs font-bold text-slate-400 md:inline-flex">{saveState === 'saving' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu</> : saveState === 'offline' ? 'Mất kết nối' : <><Save className="h-3.5 w-3.5 text-emerald-500" /> Đã lưu</>}</span>
          <button type="button" onClick={() => setConfirmOpen(true)} disabled={pageState === 'submitting'} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60"><Send className="h-4 w-4" /> Nộp bài</button>
        </div>
      </header>

      {error && <div className="mx-auto mt-4 flex max-w-6xl items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>}
      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pt-5 sm:px-6 lg:flex-row">
        <section className="min-w-0 flex-1 space-y-4">
          {questions.map((question, index) => (
            <QuestionCard key={question.id} question={question} index={index} value={answers[question.id] || ''} onChange={value => updateAnswer(question.id, value)} />
          ))}
        </section>
        <aside className="h-fit shrink-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24 lg:w-64">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">Tiến độ</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{answeredCount}<span className="text-lg text-slate-400">/{questions.length}</span></p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }} /></div>
          <div className="mt-4 grid grid-cols-5 gap-1.5">{questions.map((question, index) => <a key={question.id} href={`#question-${question.id}`} className={`flex h-8 items-center justify-center rounded-lg text-xs font-black ${answered(question, answers[question.id] || '') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{index + 1}</a>)}</div>
          <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">Lượt chuyển tab: {tabSwitches}. Hệ thống lưu câu trả lời theo lượt của em.</p>
        </aside>
      </main>

      {confirmOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-black text-slate-900">Nộp bài?</h2><p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Em đã trả lời {answeredCount}/{questions.length} câu. Sau khi nộp sẽ không sửa được lượt này.</p>{remainingSeconds <= 0 && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">Đã hết thời gian. Hệ thống sẽ ghi nhận các câu em đã làm.</p>}<div className="mt-5 flex gap-2"><button type="button" onClick={() => setConfirmOpen(false)} className="min-h-11 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-600 hover:bg-slate-50">Xem lại</button><button type="button" onClick={() => void submit()} className="min-h-11 flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white hover:bg-indigo-700">Xác nhận nộp</button></div></div></div>}
    </div>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-black text-slate-800">{value}</p></div>;

const QuestionCard = ({ question, index, value, onChange }: { question: ExamQuestion; index: number; value: string; onChange: (value: string) => void }) => (
  <article id={`question-${question.id}`} className="scroll-mt-24 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-black text-indigo-700">{index + 1}</span><div className="prose prose-sm max-w-none flex-1 text-slate-800"><StudentMarkdown>{question.content}</StudentMarkdown></div><span className="shrink-0 text-xs font-black text-slate-400">{question.points}đ</span></div>
    {question.imageUrl && <img src={question.imageUrl} alt={`Minh họa câu ${index + 1}`} className="mt-4 max-h-64 max-w-full rounded-xl object-contain" />}
    {question.type === 'multiple_choice' && <div className="mt-5 grid gap-2 sm:grid-cols-2">{(question.options || []).map((option, optionIndex) => { const letter = String.fromCharCode(65 + optionIndex); return <label key={letter} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 text-sm font-semibold transition ${value === letter ? 'border-indigo-400 bg-indigo-50 text-indigo-900' : 'border-slate-200 hover:border-indigo-200'}`}><input type="radio" name={`q-${question.id}`} checked={value === letter} onChange={() => onChange(letter)} className="mt-1 accent-indigo-600" /><span className="font-black">{letter}.</span><span className="prose prose-sm max-w-none"><StudentMarkdown>{option}</StudentMarkdown></span></label>; })}</div>}
    {question.type === 'true_false' && <div className="mt-5 space-y-2">{(question.options || []).map((option, optionIndex) => { const key = String.fromCharCode(97 + optionIndex); const selected = parseTFSub(value)[key]; return <div key={key} className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-3 sm:flex-row sm:items-center"><div className="prose prose-sm min-w-0 flex-1 text-slate-700"><strong>{key}) </strong><StudentMarkdown>{option}</StudentMarkdown></div><div className="flex gap-2"><button type="button" onClick={() => onChange(setTrueFalseAnswer(value, key, 'Đ'))} className={`min-h-10 rounded-xl px-4 text-xs font-black ${selected === 'Đ' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}>Đúng</button><button type="button" onClick={() => onChange(setTrueFalseAnswer(value, key, 'S'))} className={`min-h-10 rounded-xl px-4 text-xs font-black ${selected === 'S' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700'}`}>Sai</button></div></div>; })}</div>}
    {(question.type === 'short_answer' || question.type === 'essay') && <textarea value={value} onChange={event => onChange(event.target.value)} rows={question.type === 'essay' ? 6 : 2} placeholder={question.type === 'essay' ? 'Trình bày bài làm của em...' : 'Nhập đáp án...'} className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-indigo-400 focus:bg-white" />}
  </article>
);

