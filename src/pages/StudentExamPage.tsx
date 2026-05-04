import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { Clock, AlertTriangle, CheckCircle2, Loader2, Send } from 'lucide-react';
import { Exam, ExamQuestion, ExamSubmission, StudentAnswer, QuestionType } from '../types';
import { findExamByCode, createSubmission, updateSubmission } from '../hooks/useExams';

type PageState = 'loading' | 'not_found' | 'intro' | 'taking' | 'submitting';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const shuffle = <T,>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const normalizeText = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

// Compound T/F: question has sub-options (a/b/c/d) with a combined correctAnswer like "Đ,S,Đ,S"
const isCompoundTF = (q: ExamQuestion) =>
  q.type === 'true_false' && Array.isArray(q.options) && q.options.length > 0;

const parseTFSub = (v: string): Partial<Record<'a' | 'b' | 'c' | 'd', 'Đ' | 'S'>> => {
  try { return JSON.parse(v); } catch { return {}; }
};

const isAnswered = (q: ExamQuestion, v: string): boolean => {
  if (!v) return false;
  if (isCompoundTF(q)) {
    const sub = parseTFSub(v);
    return (['a', 'b', 'c', 'd'] as const).every(k => sub[k]);
  }
  return v.trim().length > 0;
};

const computeAutoScore = (q: ExamQuestion, answer: string): number | undefined => {
  if (!answer) return 0;
  if (q.type === 'multiple_choice') {
    if (!q.correctAnswer) return undefined;
    return answer.toUpperCase() === q.correctAnswer.toUpperCase() ? q.points : 0;
  }
  if (q.type === 'true_false') {
    if (!q.correctAnswer) return undefined;
    if (isCompoundTF(q)) {
      const sub = parseTFSub(answer);
      const combined = (['a', 'b', 'c', 'd'] as const).map(k => sub[k] || '').join(',');
      return normalizeText(combined) === normalizeText(q.correctAnswer) ? q.points : 0;
    }
    return normalizeText(answer) === normalizeText(q.correctAnswer) ? q.points : 0;
  }
  if (q.type === 'short_answer') {
    if (!q.correctAnswer) return undefined;
    return normalizeText(answer) === normalizeText(q.correctAnswer) ? q.points : 0;
  }
  return undefined;
};

// ─── Section config ───────────────────────────────────────────────────────────

const SECTION: Record<QuestionType, { label: string; desc: string }> = {
  multiple_choice: {
    label: 'PHẦN I. TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN',
    desc: 'Mỗi câu chỉ chọn một phương án đúng.',
  },
  true_false: {
    label: 'PHẦN II. TRẮC NGHIỆM ĐÚNG SAI',
    desc: 'Trong mỗi ý a, b, c, d — chọn Đúng (Đ) hoặc Sai (S).',
  },
  short_answer: {
    label: 'PHẦN III. TRẢ LỜI NGẮN',
    desc: 'Điền đáp án vào ô trống.',
  },
  essay: {
    label: 'PHẦN IV. TỰ LUẬN',
    desc: 'Viết bài làm đầy đủ.',
  },
};
const TYPE_ORDER: QuestionType[] = ['multiple_choice', 'true_false', 'short_answer', 'essay'];

const SECTION_SHORT: Record<QuestionType, string> = {
  multiple_choice: 'Phần I',
  true_false: 'Phần II',
  short_answer: 'Phần III',
  essay: 'Phần IV',
};

// ─── Main component ───────────────────────────────────────────────────────────

export const StudentExamPage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [exam, setExam] = useState<Exam | null>(null);
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [orderedQuestions, setOrderedQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedRef = useRef(false);

  // ── Group questions by type ───────────────────────────────────────────────
  const { sections, globalNum } = useMemo(() => {
    const groups: { type: QuestionType; questions: ExamQuestion[] }[] = [];
    const num: Record<string, number> = {};
    let counter = 1;
    for (const type of TYPE_ORDER) {
      const qs = orderedQuestions.filter(q => q.type === type);
      if (qs.length > 0) {
        groups.push({ type, questions: qs });
        qs.forEach(q => { num[q.id] = counter++; });
      }
    }
    return { sections: groups, globalNum: num };
  }, [orderedQuestions]);

  const answeredCount = useMemo(
    () => orderedQuestions.filter(q => isAnswered(q, answers[q.id] || '')).length,
    [orderedQuestions, answers]
  );

  // ── Load exam ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!code) { setPageState('not_found'); return; }
    findExamByCode(code)
      .then(e => { setExam(e ?? null); setPageState(e ? 'intro' : 'not_found'); })
      .catch(() => setPageState('not_found'));
  }, [code]);

  // ── Tab switch detection ──────────────────────────────────────────────────
  useEffect(() => {
    if (pageState !== 'taking') return;
    const handler = () => { if (document.hidden) setTabSwitches(n => n + 1); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [pageState]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (auto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setPageState('submitting');
    if (!exam || !submissionId) return;

    const studentAnswers: StudentAnswer[] = orderedQuestions.map(q => {
      const a = answers[q.id] || '';
      const autoScore = computeAutoScore(q, a);
      return { questionId: q.id, answer: a, ...(autoScore !== undefined ? { autoScore } : {}) };
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
    } catch {
      submittedRef.current = false;
      setPageState('taking');
      alert('Không nộp được bài — kiểm tra kết nối mạng và thử lại.');
    }
  }, [exam, submissionId, orderedQuestions, answers, tabSwitches, navigate]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (pageState !== 'taking' || remainingSeconds <= 0) return;
    const iv = setInterval(() => {
      setRemainingSeconds(s => {
        if (s <= 1) { clearInterval(iv); handleSubmit(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [pageState, remainingSeconds, handleSubmit]);

  // ── Autosave ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (pageState !== 'taking' || !submissionId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const partial: StudentAnswer[] = orderedQuestions.map(q => ({
        questionId: q.id, answer: answers[q.id] || '',
      }));
      updateSubmission(submissionId, { answers: partial, tabSwitches }).catch(console.error);
    }, 3000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [answers, pageState, submissionId, orderedQuestions, tabSwitches]);

  // ── Start exam ────────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!exam || !studentName.trim()) return;
    const ordered = exam.shuffleQuestions ? shuffle(exam.questions) : exam.questions;
    setOrderedQuestions(ordered);
    const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newSub: ExamSubmission = {
      id, examId: exam.id, examCode: exam.code,
      studentName: studentName.trim(),
      studentClass: studentClass.trim() || undefined,
      startedAt: new Date().toISOString(),
      answers: [], maxScore: exam.maxScore,
      status: 'in_progress', tabSwitches: 0,
    };
    try {
      await createSubmission(newSub);
      setSubmissionId(id);
      setRemainingSeconds(exam.durationMinutes * 60);
      setPageState('taking');
    } catch {
      alert('Không khởi tạo được bài thi. Vui lòng thử lại.');
    }
  };

  const scrollTo = (qId: string) =>
    questionRefs.current[qId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // ── Render states ─────────────────────────────────────────────────────────

  if (pageState === 'loading') return <FullPageLoader message="Đang tải đề thi..." />;

  if (pageState === 'not_found') return (
    <FullPageMessage icon={<AlertTriangle className="w-8 h-8" />} iconBg="bg-red-50 text-red-500"
      title="Không tìm thấy đề thi"
      message={`Mã đề "${code}" không tồn tại hoặc đã ngừng phát hành.`} />
  );

  if (pageState === 'intro') return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-800">{exam!.title}</h1>
          <p className="text-sm text-slate-500 mt-1">Giáo viên: <strong>{exam!.teacherName}</strong></p>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6 text-center">
          <InfoCell label="Số câu" value={exam!.questions.length.toString()} />
          <InfoCell label="Thời gian" value={`${exam!.durationMinutes} phút`} />
          <InfoCell label="Tổng điểm" value={exam!.maxScore.toString()} />
        </div>
        <div className="space-y-3">
          <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)}
            placeholder="Họ và tên *"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white" />
          <input type="text" value={studentClass} onChange={e => setStudentClass(e.target.value)}
            placeholder="Lớp (VD: 10A1)"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white" />
        </div>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Sau khi bắt đầu, bộ đếm thời gian sẽ chạy và không thể dừng. Đảm bảo kết nối mạng ổn định.</span>
        </div>
        <button onClick={handleStart} disabled={!studentName.trim()}
          className="w-full mt-5 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
          Bắt đầu làm bài
        </button>
      </motion.div>
    </div>
  );

  if (pageState === 'submitting') return <FullPageLoader message="Đang nộp bài..." />;

  // ── Taking state ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="min-w-0">
          <h1 className="font-bold text-slate-800 truncate text-sm">{exam!.title}</h1>
          <p className="text-xs text-slate-500">Thí sinh: {studentName}{studentClass && ` • ${studentClass}`}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-500 hidden sm:block">
            Đã làm: <strong className="text-slate-800">{answeredCount}/{orderedQuestions.length}</strong>
          </span>
          <TimerBadge seconds={remainingSeconds} />
          <button onClick={() => setConfirmOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-100">
            <Send className="w-4 h-4" /> Nộp bài
          </button>
        </div>
      </header>

      {/* Body: main + sidebar */}
      <div className="max-w-5xl mx-auto flex gap-5 p-4 sm:p-6">
        {/* Main content — all questions */}
        <div className="flex-1 min-w-0 space-y-3">
          {sections.map(section => (
            <div key={section.type}>
              {/* Section header */}
              <div className="bg-blue-600 text-white rounded-2xl px-5 py-3 mb-3">
                <p className="text-xs font-black tracking-wider">{SECTION[section.type].label}</p>
                <p className="text-[11px] opacity-75 mt-0.5">{SECTION[section.type].desc}</p>
              </div>

              {/* Questions in this section */}
              {section.questions.map(q => (
                <div
                  key={q.id}
                  ref={el => { questionRefs.current[q.id] = el; }}
                  className="bg-white rounded-2xl border border-slate-100 p-5 mb-3 scroll-mt-20"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700">
                      Câu {globalNum[q.id]}
                    </span>
                    <span className="text-xs text-slate-400">{q.points} điểm</span>
                    {isAnswered(q, answers[q.id] || '') && (
                      <span className="text-xs font-bold text-emerald-600 ml-auto flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đã trả lời
                      </span>
                    )}
                  </div>

                  <div className="prose prose-sm max-w-none mb-4 text-slate-800">
                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                      {q.content}
                    </ReactMarkdown>
                  </div>

                  <QuestionInput
                    question={q}
                    value={answers[q.id] || ''}
                    onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))}
                  />
                </div>
              ))}
            </div>
          ))}

          <div className="py-6 text-center">
            <button onClick={() => setConfirmOpen(true)}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 flex items-center gap-2 mx-auto">
              <Send className="w-4 h-4" /> Nộp bài
            </button>
          </div>
        </div>

        {/* Sidebar — fixed question list */}
        <aside className="hidden lg:block w-52 shrink-0 self-start sticky top-20 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">Danh sách câu hỏi</h3>
            <div className="space-y-3">
              {sections.map(section => (
                <div key={section.type}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    {SECTION_SHORT[section.type]}
                  </p>
                  <div className="grid grid-cols-5 gap-1">
                    {section.questions.map(q => {
                      const answered = isAnswered(q, answers[q.id] || '');
                      return (
                        <button key={q.id} onClick={() => scrollTo(q.id)}
                          title={`Câu ${globalNum[q.id]}`}
                          className={`aspect-square rounded-lg text-[11px] font-bold transition-all ${
                            answered
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {globalNum[q.id]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Đã làm
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-200 inline-block" /> Chưa làm
              </span>
            </div>
          </div>

          <TimerCard seconds={remainingSeconds} />
        </aside>
      </div>

      {/* Submit confirmation modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-black text-slate-800 mb-2">Xác nhận nộp bài?</h3>
            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                <span className="text-slate-500">Đã trả lời</span>
                <span className="font-bold text-emerald-600">{answeredCount} / {orderedQuestions.length} câu</span>
              </div>
              {orderedQuestions.length - answeredCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl text-xs text-amber-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Còn {orderedQuestions.length - answeredCount} câu chưa trả lời. Sau khi nộp không thể sửa.
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50">
                Tiếp tục làm
              </button>
              <button onClick={() => { setConfirmOpen(false); handleSubmit(false); }}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-100">
                Nộp bài
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const QuestionInput = ({ question, value, onChange }: {
  question: ExamQuestion; value: string; onChange: (v: string) => void;
}) => {
  if (question.type === 'multiple_choice' && question.options) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-400 text-center mb-3">Chọn một đáp án đúng</p>
        {question.options.map((opt, idx) => {
          const letter = ['A', 'B', 'C', 'D'][idx];
          const selected = value === letter;
          return (
            <label key={idx}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                selected ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:bg-slate-50'
              }`}>
              <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                selected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
              }`}>
                {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <input type="radio" name={`q-${question.id}`} checked={selected}
                onChange={() => onChange(letter)} className="sr-only" />
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

  // Compound True/False — 4 sub-items a/b/c/d
  if (question.type === 'true_false' && isCompoundTF(question)) {
    const sub = parseTFSub(value);
    const setSubAnswer = (key: 'a' | 'b' | 'c' | 'd', val: 'Đ' | 'S') => {
      const updated = { ...sub, [key]: val };
      onChange(JSON.stringify(updated));
    };
    const keys = ['a', 'b', 'c', 'd'] as const;

    return (
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        <p className="text-xs text-slate-400 text-center py-2 bg-slate-50 border-b border-slate-100">
          Chọn Đúng hoặc Sai cho mỗi ý
        </p>
        {keys.map((key, i) => {
          const optText = question.options![i].replace(/^[a-dA-D][.)]\s*/, '');
          return (
            <div key={key} className={`flex items-center gap-3 px-4 py-3 ${i < 3 ? 'border-b border-slate-100' : ''}`}>
              <span className="text-xs font-bold text-slate-500 shrink-0 w-5">{key})</span>
              <div className="flex-1 prose prose-sm max-w-none text-slate-700">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {optText}
                </ReactMarkdown>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => setSubAnswer(key, 'Đ')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                    sub[key] === 'Đ' ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-slate-600 hover:border-green-400 hover:text-green-600'
                  }`}>Đúng</button>
                <button onClick={() => setSubAnswer(key, 'S')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                    sub[key] === 'S' ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300 text-slate-600 hover:border-red-400 hover:text-red-600'
                  }`}>Sai</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Individual True/False (from file import — each sub-item is its own question)
  if (question.type === 'true_false') {
    return (
      <div className="flex gap-3">
        {(['Đúng', 'Sai'] as const).map(opt => {
          const selected = value === opt;
          return (
            <button key={opt} type="button" onClick={() => onChange(opt)}
              className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${
                selected
                  ? opt === 'Đúng' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}>
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === 'short_answer') {
    return (
      <div>
        <p className="text-xs text-slate-400 text-center mb-2">Nhập đáp án</p>
        <textarea value={value} onChange={e => onChange(e.target.value)}
          placeholder="Đáp án của bạn" rows={3}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white resize-y" />
      </div>
    );
  }

  return (
    <textarea value={value} onChange={e => onChange(e.target.value)}
      placeholder="Viết bài làm của bạn..." rows={8}
      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white resize-y" />
  );
};

const TimerBadge = ({ seconds }: { seconds: number }) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const warn = seconds < 300;
  const time = h > 0
    ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl font-mono font-bold text-sm ${
      warn ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'
    }`}>
      <Clock className="w-4 h-4" />
      {time}
    </div>
  );
};

const TimerCard = ({ seconds }: { seconds: number }) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const warn = seconds < 300;
  const time = h > 0
    ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return (
    <div className={`bg-white rounded-2xl border p-4 text-center ${warn ? 'border-red-200 bg-red-50' : 'border-slate-100'}`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Thời gian còn lại</p>
      <p className={`text-2xl font-black font-mono ${warn ? 'text-red-600' : 'text-slate-800'}`}>{time}</p>
    </div>
  );
};

const InfoCell = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-slate-50 rounded-xl py-3 text-center">
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

const FullPageMessage = ({ icon, iconBg, title, message }: {
  icon: React.ReactNode; iconBg: string; title: string; message: string;
}) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
    <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 p-8 text-center">
      <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${iconBg}`}>{icon}</div>
      <h1 className="text-xl font-black text-slate-800">{title}</h1>
      <p className="text-sm text-slate-500 mt-2">{message}</p>
    </div>
  </div>
);
