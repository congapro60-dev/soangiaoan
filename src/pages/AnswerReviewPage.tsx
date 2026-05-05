import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  Loader2, CheckCircle2, XCircle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, ArrowLeft,
} from 'lucide-react';
import { Exam, ExamSubmission, ExamQuestion } from '../types';
import { findExamByCode, getSubmission } from '../hooks/useExams';

// ─── Helpers (shared with StudentResultPage) ──────────────────────────────────

const normalizeText = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

const isCompoundTF = (q: ExamQuestion) =>
  q.type === 'true_false' && Array.isArray(q.options) && q.options.length > 0;

const parseTFSub = (v: string): Partial<Record<'a' | 'b' | 'c' | 'd', 'Đ' | 'S'>> => {
  try { return JSON.parse(v); } catch { return {}; }
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export const AnswerReviewPage = () => {
  const { code, submissionId } = useParams<{ code: string; submissionId: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | null>(null);
  const [submission, setSubmission] = useState<ExamSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeQ, setActiveQ] = useState<string | null>(null);

  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!code || !submissionId) { setError('Thiếu thông tin'); setLoading(false); return; }
    Promise.all([findExamByCode(code), getSubmission(submissionId)])
      .then(([e, s]) => {
        if (!e) { setError('Không tìm thấy đề thi'); return; }
        if (!s) { setError('Không tìm thấy bài làm'); return; }
        setExam(e); setSubmission(s);
        if (e.questions[0]) setActiveQ(e.questions[0].id);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [code, submissionId]);

  const scrollTo = (qId: string) => {
    setActiveQ(qId);
    questionRefs.current[qId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  if (error || !exam || !submission) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-black text-slate-800">Không tải được bài làm</h1>
        <p className="text-sm text-slate-500 mt-2">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ── Sidebar ── */}
      <aside className="w-56 bg-white border-r border-slate-100 fixed top-0 left-0 h-full flex flex-col z-10">
        <div className="px-4 pt-5 pb-3 border-b border-slate-50 shrink-0">
          <button
            onClick={() => navigate(`/exam/${code}/result/${submissionId}`)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-3 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Quay lại kết quả
          </button>
          <h2 className="text-sm font-black text-slate-800 leading-tight">{exam.title}</h2>
          <p className="text-xs text-slate-400 mt-1">{submission.studentName}</p>
          {submission.studentClass && (
            <p className="text-xs text-slate-400">Lớp {submission.studentClass}</p>
          )}
        </div>

        <div className="overflow-y-auto flex-1 py-2 px-2">
          {exam.questions.map((q, idx) => {
            const sa = submission.answers.find(a => a.questionId === q.id);
            const isCorrect = sa?.autoScore !== undefined && sa.autoScore === q.points;
            const isWrong = sa?.autoScore !== undefined && sa.autoScore < q.points;

            return (
              <button
                key={q.id}
                onClick={() => scrollTo(q.id)}
                className={`w-full text-left flex items-center gap-2 px-2 py-2 rounded-xl text-xs font-medium transition-all mb-0.5 ${
                  activeQ === q.id
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  isCorrect ? 'bg-emerald-100 text-emerald-700'
                    : isWrong ? 'bg-red-100 text-red-700'
                      : 'bg-slate-100 text-slate-500'
                }`}>{idx + 1}</span>
                <span className="truncate leading-tight">{q.content.replace(/\$[^$]*\$/g, '[CT]').replace(/[#*`]/g, '').slice(0, 35)}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="ml-56 flex-1 py-8 px-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1">
              <h1 className="text-xl font-black text-slate-800">{exam.title}</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Xem lại bài làm • {submission.studentName}
                {submission.studentClass && ` • Lớp ${submission.studentClass}`}
              </p>
            </div>
            {submission.totalScore !== undefined && (
              <div className="text-right">
                <p className="text-3xl font-black text-slate-800">{submission.totalScore.toFixed(2)}</p>
                <p className="text-xs text-slate-400">/ {exam.maxScore} điểm</p>
              </div>
            )}
          </div>

          {exam.questions.map((q, idx) => {
            const sa = submission.answers.find(a => a.questionId === q.id);
            const isCorrect = sa?.autoScore !== undefined && sa.autoScore === q.points;
            const isWrong = sa?.autoScore !== undefined && sa.autoScore < q.points;

            return (
              <div key={q.id} ref={el => { questionRefs.current[q.id] = el; }}>
                <QuestionReviewCard
                  num={idx + 1}
                  question={q}
                  studentAnswer={sa?.answer || ''}
                  isCorrect={isCorrect}
                  isWrong={isWrong}
                />
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

// ─── QuestionReviewCard ───────────────────────────────────────────────────────

const QuestionReviewCard = ({ num, question, studentAnswer, isCorrect, isWrong }: {
  num: number;
  question: ExamQuestion;
  studentAnswer: string;
  isCorrect: boolean;
  isWrong: boolean;
}) => {
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div className={`border rounded-2xl p-4 bg-white ${
      isCorrect ? 'border-emerald-200'
        : isWrong ? 'border-red-200'
          : 'border-slate-100'
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="shrink-0">
          {isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            : isWrong ? <XCircle className="w-5 h-5 text-red-500" />
              : <Clock className="w-5 h-5 text-amber-500" />}
        </div>
        <span className="text-xs font-bold text-slate-500">Câu {num}</span>
        <span className="text-xs text-slate-400">• {question.points} điểm</span>
        {isCorrect && (
          <span className="ml-auto text-xs font-black text-emerald-600">+{question.points}</span>
        )}
        {isWrong && (
          <span className="ml-auto text-xs font-black text-red-500">+0</span>
        )}
      </div>

      <div className="prose prose-sm max-w-none text-slate-800 mb-4">
        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
          {question.content}
        </ReactMarkdown>
      </div>

      {/* MCQ */}
      {question.type === 'multiple_choice' && question.options && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {question.options.map((opt, i) => {
            const letter = ['A', 'B', 'C', 'D'][i];
            const isStudentChoice = normalizeText(studentAnswer) === letter.toLowerCase();
            const isCorrectChoice = normalizeText(question.correctAnswer || '') === letter.toLowerCase();
            return (
              <div key={i} className={`flex items-start gap-2 p-2 rounded-xl text-xs border ${
                isCorrectChoice ? 'border-emerald-400 bg-emerald-50 text-emerald-800 font-bold'
                  : isStudentChoice && !isCorrectChoice ? 'border-red-400 bg-red-50 text-red-700'
                    : 'border-slate-100 text-slate-600'
              }`}>
                <span className="font-bold shrink-0">{letter}.</span>
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}
                  components={{ p: ({ children }) => <span>{children}</span> }}>
                  {opt.replace(/^[A-D][.)]\s*/, '')}
                </ReactMarkdown>
                {isCorrectChoice && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 ml-auto text-emerald-600 mt-0.5" />}
                {isStudentChoice && !isCorrectChoice && <XCircle className="w-3.5 h-3.5 shrink-0 ml-auto text-red-500 mt-0.5" />}
              </div>
            );
          })}
        </div>
      )}

      {/* Compound T/F */}
      {isCompoundTF(question) && question.options && (
        <div className="border border-slate-100 rounded-xl overflow-hidden mb-3">
          {(['a', 'b', 'c', 'd'] as const).map((key, i) => {
            const sub = parseTFSub(studentAnswer);
            const correctParts = (question.correctAnswer || '').split(',');
            const correctForKey = (correctParts[i] || '').trim().toUpperCase();
            const studentForKey = (sub[key] || '').toString().toUpperCase();
            const subCorrect = studentForKey && (
              (correctForKey === 'Đ' || correctForKey === 'ĐÚNG') === (studentForKey === 'Đ' || studentForKey === 'ĐÚNG')
            );
            return (
              <div key={key} className={`flex items-center gap-3 px-4 py-2.5 text-xs ${i < 3 ? 'border-b border-slate-100' : ''}`}>
                <span className="font-bold text-slate-500 w-5 shrink-0">{key})</span>
                <span className="flex-1 text-slate-700">{question.options![i].replace(/^[a-d][.)]\s*/i, '')}</span>
                <span className={`font-bold px-2 py-0.5 rounded-lg ${
                  sub[key] ? (subCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700') : 'bg-slate-100 text-slate-400'
                }`}>
                  {sub[key] === 'Đ' ? 'Đúng' : sub[key] === 'S' ? 'Sai' : '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Simple T/F */}
      {question.type === 'true_false' && !isCompoundTF(question) && (
        <div className="flex gap-4 text-sm mb-3">
          <span><span className="text-slate-500">Bạn chọn: </span>
            <span className={isCorrect ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
              {studentAnswer || '(chưa chọn)'}
            </span></span>
          {!isCorrect && question.correctAnswer && (
            <span><span className="text-slate-500">Đáp án: </span>
              <span className="text-emerald-700 font-bold">{question.correctAnswer}</span></span>
          )}
        </div>
      )}

      {/* Short answer */}
      {question.type === 'short_answer' && (
        <div className="flex gap-4 text-sm mb-3">
          <span><span className="text-slate-500">Bạn nhập: </span>
            <span className={isCorrect ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
              {studentAnswer || '(bỏ trống)'}
            </span></span>
          {!isCorrect && question.correctAnswer && (
            <span><span className="text-slate-500">Đáp án đúng: </span>
              <span className="text-emerald-700 font-bold">[{question.correctAnswer}]</span></span>
          )}
        </div>
      )}

      {/* Essay */}
      {question.type === 'essay' && studentAnswer && (
        <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 mb-3 whitespace-pre-wrap border border-slate-100">
          {studentAnswer}
        </div>
      )}

      {/* Explanation */}
      {question.explanation && (
        <div>
          <button onClick={() => setShowExplanation(v => !v)}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700">
            {showExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Giải thích
          </button>
          {showExplanation && (
            <div className="mt-2 p-3 bg-blue-50 rounded-xl text-xs text-slate-700 prose prose-xs max-w-none border border-blue-100">
              <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                {question.explanation}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
