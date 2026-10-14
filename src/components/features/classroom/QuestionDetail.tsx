import type { QuestionResult } from '../../../lib/classroom/types';
import { isClarifyPending } from '../../../lib/classroom/clarification';
import { NhanXetMarkdown } from './NhanXetMarkdown';

export const questionAppearance = (question: QuestionResult) => {
  if (question.ignoredByTeacherInstruction) return { label: 'Bỏ qua theo lệnh GV', className: 'border-slate-300 bg-slate-100 text-slate-600', color: '#64748b', kind: 'ignored' };
  if (isClarifyPending(question) || question.status === 'unreadable') return { label: 'Cần đối chiếu', className: 'border-slate-400 bg-slate-100 text-slate-700', color: '#64748b', kind: 'uncertain' };
  if (question.status === 'correct') return { label: 'Đúng', className: 'border-emerald-500 bg-emerald-50 text-emerald-800', color: '#059669', kind: 'correct' };
  if (question.status === 'partially_correct') return { label: 'Đúng một phần', className: 'border-amber-500 bg-amber-50 text-amber-800', color: '#d97706', kind: 'partial' };
  return { label: question.status === 'not_attempted' ? 'Bỏ trống' : 'Cần sửa', className: 'border-red-500 bg-red-50 text-red-800', color: '#dc2626', kind: 'wrong' };
};

/** Cả danh sách lẫn ảnh đọc cùng một nguồn; lời giải chuẩn tách nhận xét bài em. */
export const QuestionDetail = ({ question, hideScores = false, pending = false }: { question: QuestionResult; hideScores?: boolean; pending?: boolean }) => {
  const appearance = pending ? { label: 'Cần đối chiếu', className: 'border-slate-400 bg-slate-100 text-slate-700' } : questionAppearance(question);
  const blocks = pending ? [['Máy đọc được', question.clarify?.reading || question.studentAnswer]] : [
    ['Bài làm của em', question.studentAnswer], ['Đáp án / mốc cần đạt', question.expectedAnswer],
    ['Vì sao', question.explanation], [question.status === 'correct' ? 'Lưu ý / bổ sung' : 'Cách sửa', question.correction],
    ['Lời giải chi tiết', question.workedSolution], ['Luyện tiếp theo', question.nextPractice],
  ];
  return <div className="min-w-0 space-y-4 p-3">
    <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-black text-slate-900">{question.questionNumber}</h3>
      <span className={`rounded-full border px-2 py-1 text-xs font-bold ${appearance.className}`}>{appearance.label}</span>
      {!hideScores && !pending && Number.isFinite(question.score) && Number.isFinite(question.maxScore) && <b className="ml-auto text-sm">{question.score}/{question.maxScore} điểm</b>}</div>
    {blocks.map(([label, value]) => value?.trim() ? <div key={label} className="min-w-0"><p className="mb-1 text-xs font-black text-slate-500">{label}</p><NhanXetMarkdown>{value}</NhanXetMarkdown></div> : null)}
    {!pending && !question.workedSolution?.trim() && !question.ignoredByTeacherInstruction && <p className="text-xs leading-5 text-slate-500">Chưa có lời giải chi tiết đã xác minh cho câu này. Thầy cô có thể bổ sung lời giải.</p>}
    {question.ignoredByTeacherInstruction && <p className="text-xs text-slate-600">Phần này không tính theo lệnh riêng của giáo viên; không phải lỗi của em.</p>}
    {!pending && question.needsTeacherReview && <p className="text-xs font-bold leading-5 text-amber-800">Thầy cô cần đối chiếu bản gốc trước khi kết luận. Cảnh báo này không có nghĩa câu trả lời của em sai.</p>}
  </div>;
};
