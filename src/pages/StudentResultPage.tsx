import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  Loader2, CheckCircle2, XCircle, AlertTriangle, Trophy, Clock,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { Exam, ExamSubmission, ExamQuestion } from '../types';
import { getPublicExamById, getSubmission, getSubmissions } from '../hooks/useExams';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeText = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

const isCompoundTF = (q: ExamQuestion) =>
  q.type === 'true_false' && Array.isArray(q.options) && q.options.length > 0;

const parseTFSub = (v: string): Partial<Record<'a' | 'b' | 'c' | 'd', 'Đ' | 'S'>> => {
  try { return JSON.parse(v); } catch { return {}; }
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} phút ${s} giây`;
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export const StudentResultPage = () => {
  const { code, submissionId } = useParams<{ code: string; submissionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const autoSubmitted = searchParams.get('auto') === '1';

  const [exam, setExam] = useState<Exam | null>(null);
  const [submission, setSubmission] = useState<ExamSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [leaderboard, setLeaderboard] = useState<ExamSubmission[]>([]);

  useEffect(() => {
    if (!code || !submissionId) { setError('Thiếu thông tin'); setLoading(false); return; }
    // Lấy bài nộp trước để có examId, rồi tải đề (đã lược đáp án) theo id — hoạt động cả khi đề đã đóng.
    getSubmission(submissionId)
      .then(async s => {
        if (!s) { setError('Không tìm thấy bài làm'); return; }
        const e = await getPublicExamById(s.examId);
        if (!e) { setError('Không tìm thấy đề thi'); return; }
        setExam(e); setSubmission(s);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [code, submissionId]);

  useEffect(() => {
    if (!exam) return;
    getSubmissions(exam.id)
      .then(subs => {
        const done = subs
          .filter(s => s.status !== 'in_progress' && s.totalScore !== undefined)
          .sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0))
          .slice(0, 10);
        setLeaderboard(done);
      })
      .catch(() => {});
  }, [exam]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  if (error || !exam || !submission) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-black text-slate-800">Không tải được kết quả</h1>
        <p className="text-sm text-slate-500 mt-2">{error}</p>
      </div>
    </div>
  );

  const score = submission.totalScore ?? 0;
  const pct = exam.maxScore > 0 ? (score / exam.maxScore) * 100 : 0;
  // Chỉ báo "chờ chấm" khi đề thực sự có câu tự luận (học sinh giờ luôn nộp ở status 'submitted')
  const pending = submission.status === 'submitted' && exam.questions.some(q => q.type === 'essay');

  // Enforce cấu hình "Hiện kết quả khi nào" của giáo viên
  const showWhen = exam.showResultWhen ?? 'submit';
  const examEnded = exam.endAt ? Date.now() > new Date(exam.endAt).getTime() : false;
  const canShowScore = showWhen === 'submit'
    || (showWhen === 'all_done' && (examEnded || submission.status === 'graded'));

  if (!canShowScore) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-black text-slate-800">Đã nộp bài thành công!</h1>
          <p className="text-sm text-slate-600 mt-2 font-semibold">{exam.title}</p>
          <div className="mt-4 space-y-1 text-sm text-slate-500">
            <p>Thí sinh: <span className="font-bold text-slate-700">{submission.studentName}{submission.studentClass && ` • ${submission.studentClass}`}</span></p>
          </div>
          <p className="mt-5 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-2.5 rounded-xl">
            {showWhen === 'never'
              ? 'Giáo viên sẽ công bố điểm sau. Kết quả không hiển thị trên trang này.'
              : 'Điểm sẽ hiển thị sau khi kỳ thi kết thúc hoặc khi giáo viên hoàn tất chấm bài. Hãy quay lại trang này sau.'}
          </p>
          <Link to="/" className="mt-5 inline-block text-xs text-slate-400 hover:text-slate-600 font-medium">
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const startMs = new Date(submission.startedAt).getTime();
  const endMs = submission.submittedAt ? new Date(submission.submittedAt).getTime() : Date.now();
  const timeTakenSec = Math.round((endMs - startMs) / 1000);

  const autoCount = submission.answers.filter(a => a.autoScore !== undefined && a.autoScore === exam.questions.find(q => q.id === a.questionId)?.points).length;
  const gradableCount = exam.questions.filter(q => q.type !== 'essay').length;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 2-column: score card + leaderboard */}
        <div className="grid md:grid-cols-[1fr_280px] gap-5 mb-6">
          {/* Score card */}
          <div className="bg-white rounded-3xl border border-slate-100 p-8">
            <p className="text-sm font-bold text-slate-500 mb-1">Bài làm của bạn đã được gửi đi</p>
            <h1 className="text-xl font-black text-slate-800 mb-4">{exam.title}</h1>

            {autoSubmitted && (
              <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700">
                <Clock className="w-3.5 h-3.5" /> Hết giờ — bài đã tự nộp
              </div>
            )}

            <div className="flex items-end gap-3 my-6">
              <p className="text-5xl font-black text-slate-800">
                {score.toFixed(2)}
              </p>
              <p className="text-xl text-slate-400 pb-1">/ {exam.maxScore}</p>
              <div className={`ml-2 px-3 py-1 rounded-xl text-sm font-black ${
                pct >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {pct.toFixed(0)}%
              </div>
            </div>

            {pending && (
              <p className="text-xs text-amber-600 mb-4 font-medium bg-amber-50 px-3 py-2 rounded-xl">
                * Phần tự luận đang chờ giáo viên chấm — điểm cuối có thể thay đổi.
              </p>
            )}

            <div className="space-y-2 text-sm border-t border-slate-100 pt-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Thí sinh</span>
                <span className="font-bold text-slate-800">{submission.studentName}{submission.studentClass && ` • ${submission.studentClass}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Thời gian làm bài</span>
                <span className="font-bold text-slate-800">{formatTime(timeTakenSec)}</span>
              </div>
              {gradableCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Số câu trắc nghiệm đúng</span>
                  <span className="font-bold text-emerald-700">{autoCount}/{gradableCount}</span>
                </div>
              )}
            </div>

            {exam.allowReview && (
              <div className="mt-5 flex flex-col gap-2">
                <button onClick={() => setShowReview(v => !v)}
                  className="w-full py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2">
                  {showReview ? <><ChevronUp className="w-4 h-4" /> Ẩn đáp án</> : <><ChevronDown className="w-4 h-4" /> Xem đáp án</>}
                </button>
                <button
                  onClick={() => navigate(`/exam/${code}/review/${submissionId}`)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                >
                  Xem lại chi tiết từng câu →
                </button>
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6">
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-amber-500" /> Bảng xếp hạng
            </h2>
            {exam.hideLeaderboard ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <Trophy className="w-10 h-10 opacity-20 mb-2" />
                <p className="text-sm font-medium">Giáo viên đã ẩn bảng xếp hạng</p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <Trophy className="w-10 h-10 opacity-30 mb-2" />
                <p className="text-sm font-medium">Chưa có dữ liệu!</p>
              </div>
            ) : (
              <ol className="space-y-2">
                {leaderboard.map((s, i) => {
                  const isMe = s.id === submissionId;
                  const medal = ['🥇', '🥈', '🥉'][i];
                  return (
                    <li key={s.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                      isMe ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'
                    }`}>
                      <span className="text-base shrink-0 w-6 text-center">
                        {medal ?? <span className="text-xs font-bold text-slate-400">{i + 1}</span>}
                      </span>
                      <span className={`flex-1 truncate font-medium ${isMe ? 'text-blue-800 font-bold' : 'text-slate-700'}`}>
                        {s.studentName}
                        {isMe && <span className="ml-1 text-[10px] font-black text-blue-500">(bạn)</span>}
                      </span>
                      <span className={`font-black shrink-0 ${isMe ? 'text-blue-700' : 'text-slate-700'}`}>
                        {s.totalScore?.toFixed(2)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        {/* Answer review */}
        {exam.allowReview && showReview && (
          <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
            <h2 className="text-lg font-black text-slate-800 mb-2">Xem lại bài làm</h2>
            {exam.questions.map((q, idx) => {
              const sa = submission.answers.find(a => a.questionId === q.id);
              const isCorrect = sa?.autoScore !== undefined && sa.autoScore === q.points;
              const isWrong = sa?.autoScore !== undefined && sa.autoScore < q.points;
              // Đề gửi học sinh đã lược đáp án → lấy đáp án/giải thích từ bài nộp đã chấm (server nhúng)
              const effectiveQuestion = {
                ...q,
                correctAnswer: sa?.correctAnswer ?? q.correctAnswer,
                explanation: sa?.explanation ?? q.explanation,
              };

              return (
                <QuestionReview
                  key={q.id}
                  num={idx + 1}
                  question={effectiveQuestion}
                  studentAnswer={sa?.answer || ''}
                  isCorrect={isCorrect}
                  isWrong={isWrong}
                />
              );
            })}
          </div>
        )}

        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-slate-400 hover:text-slate-600 font-medium">
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
};

// ─── QuestionReview ───────────────────────────────────────────────────────────

const QuestionReview = ({ num, question, studentAnswer, isCorrect, isWrong }: {
  num: number;
  question: ExamQuestion;
  studentAnswer: string;
  isCorrect: boolean;
  isWrong: boolean;
}) => {
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div className={`border rounded-2xl p-4 ${
      isCorrect ? 'border-emerald-200 bg-emerald-50/30'
        : isWrong ? 'border-red-200 bg-red-50/30'
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
      </div>

      <div className="prose prose-sm max-w-none text-slate-800 mb-4">
        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
          {question.content}
        </ReactMarkdown>
      </div>

      {/* MCQ: show 4 options with correct/wrong highlighting */}
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

      {/* Individual T/F + short answer */}
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

      {question.type === 'essay' && studentAnswer && (
        <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 mb-3 whitespace-pre-wrap border border-slate-100">
          {studentAnswer}
        </div>
      )}

      {/* Explanation accordion */}
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
