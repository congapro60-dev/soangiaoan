import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { Clock, AlertTriangle, CheckCircle2, Loader2, Send, BookOpen } from 'lucide-react';
import { Exam, ExamQuestion, ExamSubmission, StudentAnswer, QuestionType } from '../types';
import { findExamByCode, createSubmission, updateSubmission } from '../hooks/useExams';
import { computeAutoScore, isCompoundTF, parseTFSub, ensureMathWrapped, getOptionCols } from '../utils/examScoring';

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

const isAnswered = (q: ExamQuestion, v: string): boolean => {
  if (!v) return false;
  if (isCompoundTF(q)) {
    const sub = parseTFSub(v);
    return (['a', 'b', 'c', 'd'] as const).every(k => sub[k]);
  }
  return v.trim().length > 0;
};

// ─── Section config ───────────────────────────────────────────────────────────

const SECTION: Record<QuestionType, { label: string; desc: string }> = {
  multiple_choice: {
    label: 'PHẦN I. TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN',
    desc: 'Mỗi câu hỏi chỉ chọn một phương án trả lời đúng.',
  },
  true_false: {
    label: 'PHẦN II. TRẮC NGHIỆM ĐÚNG SAI',
    desc: 'Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.',
  },
  short_answer: {
    label: 'PHẦN III. TRẢ LỜI NGẮN',
    desc: 'Thí sinh điền đáp án vào ô tương ứng.',
  },
  essay: {
    label: 'PHẦN IV. TỰ LUẬN',
    desc: 'Thí sinh trình bày bài làm chi tiết.',
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
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedRef = useRef(false);
  const submissionIdRef = useRef<string | null>(null);

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
    const handler = () => {
      if (document.hidden) {
        setTabSwitches(n => {
          const next = n + 1;
          if (submissionIdRef.current) {
            updateSubmission(submissionIdRef.current, { tabSwitches: next }).catch(console.error);
          }
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [pageState]);

  useEffect(() => {
    if (tabSwitches === 0) return;
    setShowTabWarning(true);
    const t = setTimeout(() => setShowTabWarning(false), 5000);
    return () => clearTimeout(t);
  }, [tabSwitches]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (auto = false) => {
    if (submittedRef.current) return;
    setPageState('submitting');
    if (!exam || !submissionId) return;
    submittedRef.current = true;

    const studentAnswers: StudentAnswer[] = orderedQuestions.map(q => {
      const a = answers[q.id] || '';
      const autoScore = computeAutoScore(q, a, exam!.tfScoringMode);
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
      alert('Không nộp được bài. Vui lòng kiểm tra kết nối mạng và thử lại.');
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
      updateSubmission(submissionId, { answers: partial }).catch(console.error);
    }, 3000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [answers, pageState, submissionId, orderedQuestions]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const startExam = async () => {
    if (!exam || !studentName.trim()) return;
    setPageState('loading');
    try {
      const qs = exam.shuffleQuestions ? shuffle(exam.questions) : [...exam.questions];
      const newId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const subId = await createSubmission({
        id: newId,
        examId: exam.id,
        examCode: exam.code,
        studentName,
        studentClass,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        answers: [],
        maxScore: exam.maxScore,
        tabSwitches: 0,
      });
      setSubmissionId(subId);
      submissionIdRef.current = subId;
      setOrderedQuestions(qs);
      setRemainingSeconds(exam.durationMinutes * 60);
      setPageState('taking');
    } catch (err) {
      console.error(err);
      setPageState('intro');
    }
  };

  const handleAnswerChange = (qId: string, val: string) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${m}:${ss.toString().padStart(2, '0')}`;
  };

  // ── Render States ─────────────────────────────────────────────────────────
  if (pageState === 'loading') return <FullPageLoader message="Đang tải đề thi..." />;
  if (pageState === 'not_found') return <FullPageMessage icon={<AlertTriangle className="w-8 h-8 text-amber-500" />} iconBg="bg-amber-50" title="Không tìm thấy đề thi" message="Mã đề thi không tồn tại hoặc đã bị xóa." />;

  if (pageState === 'intro') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full bg-white rounded-3xl border border-slate-100 p-8 shadow-2xl">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-xl font-black text-slate-800 text-center mb-2 uppercase">{exam?.title}</h1>
          <p className="text-sm text-slate-500 text-center mb-8 italic">Môn: {exam?.subjectName || 'Toán'} • Thời gian: {exam?.durationMinutes} phút</p>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên</label>
              <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Nhập tên của bạn..." className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lớp</label>
              <input type="text" value={studentClass} onChange={e => setStudentClass(e.target.value)} placeholder="Ví dụ: 12A1..." className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={startExam} disabled={!studentName.trim()} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-95">
              BẮT ĐẦU LÀM BÀI
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (pageState === 'taking' || pageState === 'submitting') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col no-print">
        {/* Header Bar (Web only) */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800 leading-tight uppercase truncate max-w-[200px] sm:max-w-md">
                {exam?.title}
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Thí sinh: {studentName} • {studentClass}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
             <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-colors ${
               remainingSeconds < 300 ? 'border-red-100 bg-red-50 text-red-600 animate-pulse' : 'border-slate-100 bg-slate-50 text-slate-600'
             }`}>
               <Clock className="w-4 h-4" />
               <span className="text-sm font-black tabular-nums">{formatTime(remainingSeconds)}</span>
             </div>
             <button onClick={() => setConfirmOpen(true)} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95">
               Nộp bài
             </button>
          </div>
        </header>

        {/* Exam Content Area */}
        <main className="flex-1 overflow-y-auto print:overflow-visible">
          <div className="max-w-6xl mx-auto p-4 sm:p-8 flex flex-col lg:flex-row gap-8">
            
            {/* The Actual Exam Paper */}
            <div className="flex-1 exam-paper shadow-xl print:shadow-none print:w-full print:p-0">
              
              {/* MOET Standard Header (Visible in print or clean view) */}
              <div className="hidden print:grid grid-cols-2 gap-4 mb-8 border-b-2 border-black pb-4">
                <div className="text-center">
                  <p className="text-xs uppercase font-bold">SỞ GIÁO DỤC VÀ ĐÀO TẠO TP. HÀ NỘI</p>
                  <p className="text-xs uppercase font-bold border-b border-black w-fit mx-auto pb-0.5">TRƯỜNG THPT CHUYÊN MẪU</p>
                  <p className="text-[10px] mt-1 italic">(Đề thi có {Math.ceil(orderedQuestions.length / 5)} trang)</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold uppercase">KIỂM TRA HỌC KỲ II - NĂM HỌC 2024 - 2025</p>
                  <p className="text-xs font-bold">Môn: TOÁN — Lớp: 12</p>
                  <p className="text-xs italic">Thời gian làm bài: 90 phút (Không kể thời gian phát đề)</p>
                  <p className="text-xs font-bold mt-1">Mã đề thi: 102</p>
                </div>
              </div>

              <div className="hidden print:block text-center mb-8">
                <h1 className="text-xl font-bold uppercase tracking-tight">{exam?.title}</h1>
              </div>

              {sections.map(({ type, questions }) => (
                <div key={type} className="mb-10 last:mb-0">
                  <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-lg mb-6 no-print">
                    <h2 className="text-xs font-black tracking-widest uppercase">{SECTION[type].label}</h2>
                    <p className="text-[10px] opacity-70 mt-0.5">{SECTION[type].desc}</p>
                  </div>
                  
                  {/* Print-only section title */}
                  <div className="hidden print:block font-bold border-l-4 border-black pl-3 my-4">
                    <span className="uppercase">{SECTION[type].label}</span>
                    <p className="text-[11pt] font-normal italic mt-0.5">{SECTION[type].desc}</p>
                  </div>

                  <div className="space-y-6">
                    {questions.map(q => {
                      const cols = q.type === 'multiple_choice' ? getOptionCols(q.options || []) : 1;
                      return (
                        <div key={q.id} ref={el => { questionRefs.current[q.id] = el; }} className="question-block group bg-white print:bg-transparent rounded-3xl border border-slate-100 print:border-none p-6 print:p-0 shadow-sm print:shadow-none hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 no-print">
                              <span className="text-sm font-black text-slate-400">{globalNum[q.id]}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="hidden print:inline font-bold mr-1">Câu {globalNum[q.id]}.</div>
                              <div className="prose prose-sm max-w-none mb-4 text-slate-800 print:text-black print:text-[13pt]">
                                <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                                  {ensureMathWrapped(q.content)}
                                </ReactMarkdown>
                              </div>

                              {q.imageUrl && (
                                <div className="mb-4 rounded-2xl overflow-hidden border border-slate-100 max-w-fit shadow-sm print:shadow-none">
                                  <img src={q.imageUrl} alt="minh họa" className="max-h-64 object-contain bg-slate-50 print:bg-transparent" />
                                </div>
                              )}

                              <QuestionRenderer
                                question={q}
                                value={answers[q.id] || ''}
                                onChange={val => handleAnswerChange(q.id, val)}
                                cols={cols}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Sidebar Control (Web Only) */}
            <aside className="w-full lg:w-80 shrink-0 space-y-6 no-print">
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Tiến độ</h3>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{answeredCount}/{orderedQuestions.length} câu</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {orderedQuestions.map(q => (
                    <button
                      key={q.id}
                      onClick={() => questionRefs.current[q.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                      className={`h-10 rounded-xl text-xs font-black transition-all ${
                        answers[q.id] ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {globalNum[q.id]}
                    </button>
                  ))}
                </div>
                <div className="mt-8">
                  <button onClick={() => setConfirmOpen(true)} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                    <Send className="w-5 h-5" /> Nộp bài ngay
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </main>

        {/* Modals */}
        {showTabWarning && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-black uppercase">CẢNH BÁO: KHÔNG ĐƯỢC CHUYỂN TAB!</span>
          </div>
        )}

        {confirmOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="max-w-sm w-full bg-white rounded-3xl border border-slate-100 p-8 text-center shadow-2xl">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                <Send className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-black text-slate-800">Xác nhận nộp bài?</h2>
              <p className="text-sm text-slate-500 mt-2">Bạn đã hoàn thành {answeredCount}/{orderedQuestions.length} câu hỏi. Bạn chắc chắn muốn kết thúc?</p>
              <div className="grid grid-cols-2 gap-3 mt-8">
                <button onClick={() => setConfirmOpen(false)} className="py-3 rounded-2xl text-sm font-black text-slate-400 hover:bg-slate-50 transition-all">Quay lại</button>
                <button onClick={() => handleSubmit()} className="py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">Đồng ý nộp</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const QuestionRenderer = ({ question, value, onChange, cols = 1 }: { 
  question: ExamQuestion; value: string; onChange: (v: string) => void; cols?: number 
}) => {
  if (question.type === 'multiple_choice' && question.options) {
    return (
      <div className={`options-grid no-print ${
        cols === 4 ? 'options-4-cols' : cols === 2 ? 'options-2-cols' : 'options-1-col'
      }`}>
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
              <div className="flex-1 prose prose-sm max-w-none text-slate-800 print:text-black">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {ensureMathWrapped(opt)}
                </ReactMarkdown>
              </div>
            </label>
          );
        })}
      </div>
    );
  }

  if (isCompoundTF(question)) {
    const vals = parseTFSub(value);
    return (
      <div className="space-y-3 no-print">
        {['a', 'b', 'c', 'd'].map((label, idx) => (
          <div key={label} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-start gap-3">
              <span className="text-xs font-black text-slate-400 mt-1">{label})</span>
              <div className="prose prose-sm max-w-none text-slate-800">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {ensureMathWrapped(question.options![idx])}
                </ReactMarkdown>
              </div>
            </div>
            <div className="flex gap-2">
              {(['Đ', 'S'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => {
                    const next = { ...vals, [label]: v };
                    onChange(JSON.stringify(next));
                  }}
                  className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                    vals[label as keyof typeof vals] === v
                      ? v === 'Đ' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-red-500 text-white shadow-lg shadow-red-100'
                      : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (question.type === 'short_answer') {
    return (
      <div className="no-print">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Nhập đáp án của bạn..."
          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    );
  }

  if (question.type === 'essay') {
    return (
      <div className="no-print">
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Trình bày bài làm chi tiết tại đây..."
          rows={6}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
    );
  }

  return null;
};

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
