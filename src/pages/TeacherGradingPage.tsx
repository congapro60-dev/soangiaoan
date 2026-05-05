import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Loader2, AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { Exam, ExamSubmission } from '../types';
import { getExamById, getSubmissions, updateSubmission } from '../hooks/useExams';

export const TeacherGradingPage = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | null>(null);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});

  const loadSubState = (sub: ExamSubmission) => {
    const s: Record<string, number> = {};
    const f: Record<string, string> = {};
    for (const a of sub.answers) {
      if (a.aiScore !== undefined) s[a.questionId] = a.aiScore;
      if (a.aiFeedback) f[a.questionId] = a.aiFeedback;
    }
    setScores(s);
    setFeedbacks(f);
  };

  useEffect(() => {
    if (!examId) { setError('Thiếu ID đề thi'); setLoading(false); return; }
    Promise.all([getExamById(examId), getSubmissions(examId)])
      .then(([e, subs]) => {
        if (!e) { setError('Không tìm thấy đề thi'); return; }
        setExam(e);
        const pending = subs.filter(s => s.status !== 'in_progress');
        setSubmissions(pending);
        if (pending.length > 0) loadSubState(pending[0]);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [examId]);

  const currentSub = submissions[idx];

  const handleNav = (newIdx: number) => {
    setIdx(newIdx);
    loadSubState(submissions[newIdx]);
  };

  const handleSave = async () => {
    if (!exam || !currentSub) return;
    setSaving(true);
    try {
      const updatedAnswers = currentSub.answers.map(a => ({
        ...a,
        ...(a.questionId in scores ? { aiScore: scores[a.questionId] } : {}),
        ...(feedbacks[a.questionId] ? { aiFeedback: feedbacks[a.questionId] } : {}),
      }));

      const total = updatedAnswers.reduce((sum, a) => {
        const q = exam.questions.find(q => q.id === a.questionId);
        if (!q) return sum;
        const score = q.type === 'essay' ? (a.aiScore ?? 0) : (a.autoScore ?? 0);
        return sum + Math.min(score, q.points);
      }, 0);

      const hasUngraded = exam.questions
        .filter(q => q.type === 'essay')
        .some(q => {
          const a = updatedAnswers.find(a => a.questionId === q.id);
          return a?.answer && a.aiScore === undefined;
        });

      await updateSubmission(currentSub.id, {
        answers: updatedAnswers,
        totalScore: total,
        status: hasUngraded ? 'submitted' : 'graded',
      });

      const updated: ExamSubmission = {
        ...currentSub,
        answers: updatedAnswers,
        totalScore: total,
        status: hasUngraded ? 'submitted' : 'graded',
      };
      setSubmissions(prev => prev.map((s, i) => i === idx ? updated : s));

      if (idx < submissions.length - 1) handleNav(idx + 1);
    } catch (e: any) {
      alert('Lưu thất bại: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  if (error || !exam) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center max-w-md w-full">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <p className="text-sm text-slate-500">{error || 'Không tìm thấy đề thi'}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-blue-600 font-bold">← Quay lại</button>
      </div>
    </div>
  );

  if (submissions.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center max-w-md w-full">
        <p className="text-lg font-black text-slate-800 mb-2">Không có bài nào cần chấm</p>
        <p className="text-sm text-slate-500 mb-4">Chưa có bài làm nào đã nộp.</p>
        <button onClick={() => navigate(-1)} className="text-sm text-blue-600 font-bold">← Quay lại</button>
      </div>
    </div>
  );

  const essayQuestions = exam.questions.filter(q => q.type === 'essay');
  const autoScore = currentSub.answers.reduce((s, a) => {
    const q = exam.questions.find(q => q.id === a.questionId);
    return q?.type !== 'essay' ? s + (a.autoScore ?? 0) : s;
  }, 0);
  const gradedCount = submissions.filter(s => s.status === 'graded').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black text-slate-800 truncate">{exam.title}</h1>
            <p className="text-xs text-slate-400">
              <span className="font-bold text-slate-600">{currentSub.studentName}</span>
              {currentSub.studentClass && ` • Lớp ${currentSub.studentClass}`}
              {' • '}Điểm trắc nghiệm:{' '}
              <span className="font-bold text-slate-700">{autoScore.toFixed(2)}/{exam.maxScore}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleNav(idx - 1)}
              disabled={idx === 0}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-500 min-w-[48px] text-center">{idx + 1}/{submissions.length}</span>
            <button
              onClick={() => handleNav(idx + 1)}
              disabled={idx === submissions.length - 1}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 max-w-3xl w-full mx-auto py-6 px-4 space-y-4">
        {essayQuestions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center text-slate-500 text-sm">
            Đề thi này không có câu tự luận.
          </div>
        ) : (
          essayQuestions.map((q, i) => {
            const sa = currentSub.answers.find(a => a.questionId === q.id);
            return (
              <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-slate-500">Câu tự luận {i + 1}</span>
                  <span className="text-xs text-slate-400">• Tối đa {q.points} điểm</span>
                </div>
                <div className="prose prose-sm max-w-none text-slate-800 mb-4">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {q.content}
                  </ReactMarkdown>
                </div>
                {q.imageUrl && (
                  <div className="mb-4 rounded-2xl overflow-hidden border border-slate-100 shadow-sm max-w-fit">
                    <img src={q.imageUrl} alt="minh họa" className="max-h-64 object-contain bg-slate-50" />
                  </div>
                )}
                {sa?.answer ? (
                  <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-700 mb-4 whitespace-pre-wrap border border-slate-100">
                    {sa.answer}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic mb-4">(Học sinh bỏ trống)</p>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="sm:w-32 shrink-0">
                    <label className="text-xs font-bold text-slate-500 block mb-1">Điểm (0–{q.points})</label>
                    <input
                      type="number"
                      min={0}
                      max={q.points}
                      step={0.25}
                      value={scores[q.id] ?? ''}
                      onChange={e => {
                        const v = parseFloat(e.target.value);
                        setScores(prev => ({ ...prev, [q.id]: isNaN(v) ? 0 : Math.min(Math.max(v, 0), q.points) }));
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 block mb-1">Nhận xét (tùy chọn)</label>
                    <textarea
                      rows={2}
                      value={feedbacks[q.id] ?? ''}
                      onChange={e => setFeedbacks(prev => ({ ...prev, [q.id]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      placeholder="Nhận xét cho học sinh..."
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            <span className="font-bold text-slate-700">{gradedCount}</span>/{submissions.length} bài đã chấm xong
          </p>
          <button
            onClick={handleSave}
            disabled={saving || essayQuestions.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-bold disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {idx < submissions.length - 1 ? 'Lưu & Tiếp theo' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
};
