import { AlertTriangle, CheckCircle2, CircleX, HelpCircle, MinusCircle } from 'lucide-react';
import type { QuestionResult, QuestionResultStatus } from '../../../lib/classroom/types';
import { NhanXetMarkdown } from './NhanXetMarkdown';

interface Props {
  results?: QuestionResult[];
  /** Nhãn ngữ cảnh để dùng được cả trong thẻ học sinh và báo cáo người lớn. */
  title?: string;
  compact?: boolean;
}

const meta: Record<QuestionResultStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  correct: { label: 'Đúng', className: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  partially_correct: { label: 'Đúng một phần', className: 'bg-amber-50 text-amber-700', icon: MinusCircle },
  incorrect: { label: 'Cần sửa', className: 'bg-red-50 text-red-700', icon: CircleX },
  unreadable: { label: 'Chưa đọc rõ', className: 'bg-slate-100 text-slate-600', icon: HelpCircle },
  not_attempted: { label: 'Bỏ trống', className: 'bg-slate-100 text-slate-600', icon: HelpCircle },
};

const TextBlock = ({ label, value, markdown = false }: { label: string; value: string; markdown?: boolean }) => {
  if (!value.trim()) return null;
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      {markdown ? (
        <NhanXetMarkdown>{value}</NhanXetMarkdown>
      ) : (
        <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-700">{value}</p>
      )}
    </div>
  );
};

/**
 * Hiển thị bảng phân tích theo câu. Không dùng bảng HTML cứng vì bài làm dài và màn hình điện
 * thoại cần từng câu tự co giãn; mỗi `details` là một điểm chạm rõ ràng để học sinh mở ra xem.
 */
export const QuestionResultsList = ({ results, title = 'Phân tích từng câu', compact = false }: Props) => {
  if (!results || results.length === 0) return null;

  return (
    <section className={compact ? 'mt-3' : 'mt-4'} aria-label={title}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
        <span className="text-[11px] font-bold text-slate-400">{results.length} câu/phần</span>
      </div>
      <div className="space-y-2">
        {results.map((result, index) => {
          const item = meta[result.status] || meta.unreadable;
          const Icon = item.icon;
          return (
            <details key={`${result.questionNumber}-${index}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-3 [&::-webkit-details-marker]:hidden">
                <Icon className={`h-4 w-4 shrink-0 ${item.className.split(' ')[1]}`} />
                <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-800">{result.questionNumber}</span>
                <span className={`rounded-full px-2 py-1 text-[11px] font-black ${result.ignoredByTeacherInstruction ? 'bg-slate-100 text-slate-600' : item.className}`}>
                  {result.ignoredByTeacherInstruction ? 'Bỏ qua theo lệnh GV' : item.label}
                </span>
                <span className="shrink-0 text-xs font-black text-slate-700">{result.score}/{result.maxScore}</span>
                {result.needsTeacherReview && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-label="Cần giáo viên xem lại" />}
              </summary>
              <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-2">
                <TextBlock label="Bài làm của em" value={result.studentAnswer} markdown />
                <TextBlock label="Đáp án / mốc cần đạt" value={result.expectedAnswer} markdown />
                <TextBlock label="Loại lỗi" value={result.errorType} />
                <TextBlock label="Vì sao" value={result.explanation} markdown />
                <TextBlock label="Cách sửa" value={result.correction} markdown />
                <TextBlock label="Luyện tiếp theo" value={result.nextPractice} markdown />
                {result.ignoredByTeacherInstruction && (
                  <p className="text-xs font-bold leading-5 text-slate-600 sm:col-span-2">
                    Phần này không được tính theo lệnh riêng của giáo viên; không phải lỗi của em.
                  </p>
                )}
                {result.confidence !== undefined && (
                  <p className="text-xs font-semibold text-slate-400">Độ chắc chắn của máy: {Math.round(result.confidence * 100)}%</p>
                )}
                {result.needsTeacherReview && (
                  <p className="flex items-start gap-1.5 text-xs font-bold leading-5 text-amber-700 sm:col-span-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Câu này có dữ liệu chưa rõ hoặc máy chưa đủ chắc chắn; thầy cô nên xem bản gốc trước khi kết luận.
                  </p>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
};
