import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Trophy, Clock } from 'lucide-react';
import { Exam, ExamSubmission } from '../types';
import { findExamByCode, getSubmission } from '../hooks/useExams';

export const StudentResultPage = () => {
  const { code, submissionId } = useParams<{ code: string; submissionId: string }>();
  const [searchParams] = useSearchParams();
  const autoSubmitted = searchParams.get('auto') === '1';

  const [exam, setExam] = useState<Exam | null>(null);
  const [submission, setSubmission] = useState<ExamSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code || !submissionId) { setError('Thiếu thông tin'); setLoading(false); return; }
    Promise.all([findExamByCode(code), getSubmission(submissionId)])
      .then(([e, s]) => {
        if (!e) { setError('Không tìm thấy đề thi'); return; }
        if (!s) { setError('Không tìm thấy bài làm'); return; }
        setExam(e);
        setSubmission(s);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [code, submissionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !exam || !submission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-black text-slate-800">Không tải được kết quả</h1>
          <p className="text-sm text-slate-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const score = submission.totalScore ?? 0;
  const pct = exam.maxScore > 0 ? (score / exam.maxScore) * 100 : 0;
  const pending = submission.status === 'submitted';

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-100 p-8 mb-6 text-center">
          <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${pct >= 50 ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-800">{exam.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{submission.studentName} {submission.studentClass && `• ${submission.studentClass}`}</p>

          {autoSubmitted && (
            <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Clock className="w-3.5 h-3.5" /> Hết giờ — bài đã tự nộp
            </div>
          )}

          <div className="my-8">
            <p className="text-6xl font-black text-slate-800">
              {score.toFixed(2)}
              <span className="text-2xl text-slate-400"> / {exam.maxScore}</span>
            </p>
            {pending && (
              <p className="text-xs text-amber-600 mt-3 font-medium">
                * Phần tự luận đang chờ giáo viên chấm — điểm cuối có thể thay đổi.
              </p>
            )}
          </div>
        </div>

        {exam.allowReview && (
          <div className="bg-white rounded-3xl border border-slate-100 p-6">
            <h2 className="text-lg font-black text-slate-800 mb-4">Xem lại bài làm</h2>
            <div className="space-y-4">
              {exam.questions.map((q, idx) => {
                const sa = submission.answers.find(a => a.questionId === q.id);
                const isCorrect = sa?.autoScore !== undefined && sa.autoScore === q.points;
                const isWrong = sa?.autoScore !== undefined && sa.autoScore < q.points;

                return (
                  <div key={q.id} className="border border-slate-100 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0">
                        {isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : isWrong ? (
                          <XCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-slate-500">Câu {idx + 1}</span>
                          <span className="text-xs text-slate-400">• {q.points} điểm</span>
                        </div>
                        <div className="prose prose-sm max-w-none text-slate-800">
                          <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                            {q.content}
                          </ReactMarkdown>
                        </div>
                        <div className="mt-3 space-y-1 text-xs">
                          <p>
                            <span className="font-bold text-slate-500">Bạn trả lời: </span>
                            <span className={isCorrect ? 'text-emerald-700' : isWrong ? 'text-red-700' : 'text-slate-700'}>
                              {sa?.answer || '(bỏ trống)'}
                            </span>
                          </p>
                          {q.correctAnswer && !isCorrect && (
                            <p>
                              <span className="font-bold text-slate-500">Đáp án đúng: </span>
                              <span className="text-emerald-700">{q.correctAnswer}</span>
                            </p>
                          )}
                          {q.explanation && (
                            <div className="mt-2 p-3 bg-blue-50 rounded-lg text-slate-700 prose prose-xs max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                                {q.explanation}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
