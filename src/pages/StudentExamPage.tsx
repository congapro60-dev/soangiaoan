import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import {
  Clock, AlertTriangle, CheckCircle2, Loader2, Send, ChevronRight, ChevronLeft
} from 'lucide-react';
import { Exam, ExamQuestion, ExamSubmission, StudentAnswer } from '../types';
import { findExamByCode, createSubmission, updateSubmission } from '../hooks/useExams';

type PageState = 'loading' | 'not_found' | 'intro' | 'taking' | 'submitting' | 'done';

const shuffle = <T,>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const normalizeText = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

const computeAutoScore = (question: ExamQuestion, answer: string): number | undefined => {
  if (!answer) return 0;
  if (question.type === 'multiple_choice') {
    if (!question.correctAnswer) return undefined;
    return answer.toUpperCase() === question.correctAnswer.toUpperCase() ? question.points : 0;
  }
  if (question.type === 'true_false') {
    if (!question.correctAnswer) return undefined;
    return normalizeText(answer) === normalizeText(question.correctAnswer) ? question.points : 0;
  }
  if (question.type === 'short_answer') {
    if (!question.correctAnswer) return undefined;
    return normalizeText(answer) === normalizeText(question.correctAnswer) ? question.points : 0;
  }
  return undefined;
};

export const StudentExamPage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<PageState>('loading');
  const [exam, setExam] = useState<Exam | null>(null);

  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [orderedQuestions, setOrderedQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!code) { setState('not_found'); return; }
    findExamByCode(code)
      .then(e => {
        if (!e) { setState('not_found'); return; }
        setExam(e);
        setState('intro');
      })
      .catch(() => setState('not_found'));
  }, [code]);

  useEffect(() => {
    if (state !== 'taking') return;
    const handler = () => {
      if (document.hidden) setTabSwitches(n => n + 1);
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [state]);

  const handleSubmit = useCallback(async (auto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setState('submitting');
    if (!exam || !submissionId) return;

    const studentAnswers: StudentAnswer[] = orderedQuestions.map(q => {
      const a = answers[q.id] || '';
      const autoScore = computeAutoScore(q, a);
      return {
        questionId: q.id,
        answer: a,
        ...(autoScore !== undefined ? { autoScore } : {}),
      };
    });

    const totalAuto = studentAnswers.reduce((sum, a) => sum + (a.autoScore || 0), 0);
    const hasUngraded = studentAnswers.some(a => a.autoScore === undefined);

    try {
      await updateSubmission(submissionId, {
        status: hasUngraded ? 'submitted' : 'graded',
        submittedAt: new Date().toISOString(),
        answers: studentAnswers,
        totalScore: totalAuto,
        tabSwitches,
      });
      navigate(`/exam/${exam.code}/result/${submissionId}${auto ? '?auto=1' : ''}`);
    } catch (err) {
      console.error('Lỗi nộp bài:', err);
      submittedRef.current = false;
      setState('taking');
      alert('Không nộp được bài — kiểm tra kết nối mạng và thử lại.');
    }
  }, [exam, submissionId, orderedQuestions, answers, tabSwitches, navigate]);

  useEffect(() => {
    if (state !== 'taking' || remainingSeconds <= 0) return;
    const iv = setInterval(() => {
      setRemainingSeconds(s => {
        if (s <= 1) {
          clearInterval(iv);
          handleSubmit(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [state, remainingSeconds, handleSubmit]);

  useEffect(() => {
    if (state !== 'taking' || !submissionId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const partial: StudentAnswer[] = orderedQuestions.map(q => ({
        questionId: q.id,
        answer: answers[q.id] || '',
      }));
      updateSubmission(submissionId, { answers: partial, tabSwitches }).catch(console.error);
    }, 3000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [answers, state, submissionId, orderedQuestions, tabSwitches]);

  const handleStart = async () => {
    if (!exam || !studentName.trim()) return;
    const ordered = exam.shuffleQuestions ? shuffle(exam.questions) : exam.questions;
    setOrderedQuestions(ordered);
    const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const newSubmission: ExamSubmission = {
      id,
      examId: exam.id,
      examCode: exam.code,
      studentName: studentName.trim(),
      studentClass: studentClass.trim() || undefined,
      startedAt: new Date().toISOString(),
      answers: [],
      maxScore: exam.maxScore,
      status: 'in_progress',
      tabSwitches: 0,
    };

    try {
      await createSubmission(newSubmission);
      setSubmissionId(id);
      setRemainingSeconds(exam.durationMinutes * 60);
      setState('taking');
    } catch (err) {
      console.error(err);
      alert('Không khởi tạo được bài thi. Vui lòng thử lại.');
    }
  };

  const currentQ = orderedQuestions[currentIdx];
  const answeredCount = orderedQuestions.filter(q => (answers[q.id] || '').trim()).length;

  if (state === 'loading') {
    return <FullPageLoader message="Đang tải đề thi..." />;
  }

  if (state === 'not_found') {
    return (
      <FullPageMessage
        icon={<AlertTriangle className="w-8 h-8" />}
        iconBg="bg-red-50 text-red-500"
        title="Không tìm thấy đề thi"
        message={`Mã đề "${code}" không tồn tại hoặc đã ngừng phát hành.`}
      />
    );
  }

  if (state === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className="text-2xl font-black text-slate-800">{exam!.title}</h1>
            <p className="text-sm text-slate-500 mt-2">
              Giáo viên: <strong>{exam!.teacherName}</strong>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6 text-center">
            <InfoCell label="Số câu" value={exam!.questions.length.toString()} />
            <InfoCell label="Thời gian" value={`${exam!.durationMinutes} phút`} />
            <InfoCell label="Tổng điểm" value={exam!.maxScore.toString()} />
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              placeholder="Họ và tên *"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
            />
            <input
              type="text"
              value={studentClass}
              onChange={e => setStudentClass(e.target.value)}
              placeholder="Lớp (VD: 10A1)"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
            />
          </div>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Sau khi bắt đầu, bộ đếm thời gian sẽ chạy và không thể dừng. Hãy đảm bảo bạn có đủ thời gian và kết nối mạng ổn định.
            </span>
          </div>

          <button
            onClick={handleStart}
            disabled={!studentName.trim()}
            className="w-full mt-5 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Bắt đầu làm bài
          </button>
        </motion.div>
      </div>
    );
  }

  if (state === 'submitting') {
    return <FullPageLoader message="Đang nộp bài..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="min-w-0">
          <h1 className="font-bold text-slate-800 truncate text-sm">{exam!.title}</h1>
          <p className="text-xs text-slate-500">{studentName} {studentClass && `• ${studentClass}`}</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            Đã trả lời: <strong className="text-slate-800">{answeredCount}/{orderedQuestions.length}</strong>
          </div>
          <TimerBadge seconds={remainingSeconds} />
          <button
            onClick={() => handleSubmit(false)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-100"
          >
            <Send className="w-4 h-4" /> Nộp bài
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 grid md:grid-cols-[1fr_200px] gap-6">
        <div className="space-y-4">
          {currentQ && (
            <motion.div
              key={currentQ.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-100 p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-100 text-blue-700 uppercase tracking-wider">
                  Câu {currentIdx + 1}
                </span>
                <span className="text-xs text-slate-400">{currentQ.points} điểm</span>
              </div>

              <div className="prose prose-sm max-w-none mb-5 text-slate-800">
                <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                  {currentQ.content}
                </ReactMarkdown>
              </div>

              <QuestionInput
                question={currentQ}
                value={answers[currentQ.id] || ''}
                onChange={v => setAnswers(a => ({ ...a, [currentQ.id]: v }))}
              />

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                  disabled={currentIdx === 0}
                  className="flex items-center gap-1 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-bold text-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" /> Câu trước
                </button>
                <button
                  onClick={() => setCurrentIdx(i => Math.min(orderedQuestions.length - 1, i + 1))}
                  disabled={currentIdx === orderedQuestions.length - 1}
                  className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold disabled:opacity-40"
                >
                  Câu sau <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </div>

        <QuestionGrid
          questions={orderedQuestions}
          answers={answers}
          currentIdx={currentIdx}
          onJump={setCurrentIdx}
        />
      </div>
    </div>
  );
};

const QuestionInput = ({ question, value, onChange }: { question: ExamQuestion; value: string; onChange: (v: string) => void }) => {
  if (question.type === 'multiple_choice' && question.options) {
    return (
      <div className="space-y-2">
        {question.options.map((opt, idx) => {
          const letter = ['A', 'B', 'C', 'D'][idx];
          const selected = value === letter;
          return (
            <label
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selected ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:bg-slate-50'}`}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={selected}
                onChange={() => onChange(letter)}
                className="mt-1"
              />
              <div className="flex-1 prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {opt}
                </ReactMarkdown>
              </div>
            </label>
          );
        })}
      </div>
    );
  }

  if (question.type === 'true_false') {
    return (
      <div className="grid grid-cols-2 gap-3">
        {['Đúng', 'Sai'].map(opt => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`p-4 rounded-xl border-2 font-bold transition-all ${selected ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === 'short_answer') {
    return (
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Nhập đáp án ngắn..."
        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
      />
    );
  }

  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Viết bài làm của bạn..."
      rows={8}
      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white resize-y"
    />
  );
};

const TimerBadge = ({ seconds }: { seconds: number }) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const warn = seconds < 300;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl font-mono font-bold text-sm ${warn ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
      <Clock className="w-4 h-4" />
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </div>
  );
};

const QuestionGrid = ({ questions, answers, currentIdx, onJump }: {
  questions: ExamQuestion[]; answers: Record<string, string>; currentIdx: number; onJump: (i: number) => void;
}) => (
  <aside className="bg-white rounded-2xl border border-slate-100 p-4 self-start sticky top-20 hidden md:block">
    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Danh sách câu</h3>
    <div className="grid grid-cols-5 gap-1.5">
      {questions.map((q, i) => {
        const answered = (answers[q.id] || '').trim().length > 0;
        const active = i === currentIdx;
        return (
          <button
            key={q.id}
            onClick={() => onJump(i)}
            className={`aspect-square rounded-lg text-xs font-bold transition-all ${
              active ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                : answered ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  </aside>
);

const InfoCell = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-slate-50 rounded-xl py-3">
    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{label}</p>
    <p className="text-lg font-black text-slate-800 mt-1">{value}</p>
  </div>
);

const FullPageLoader = ({ message }: { message: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
      <p className="text-sm text-slate-500 mt-3">{message}</p>
    </div>
  </div>
);

const FullPageMessage = ({ icon, iconBg, title, message }: { icon: React.ReactNode; iconBg: string; title: string; message: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
    <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 p-8 text-center">
      <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${iconBg}`}>{icon}</div>
      <h1 className="text-xl font-black text-slate-800">{title}</h1>
      <p className="text-sm text-slate-500 mt-2">{message}</p>
    </div>
  </div>
);
