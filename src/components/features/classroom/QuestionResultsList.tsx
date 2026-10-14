import { AlertTriangle } from 'lucide-react';
import type { QuestionResult } from '../../../lib/classroom/types';
import { QuestionDetail, questionAppearance } from './QuestionDetail';
interface Props { results?: QuestionResult[]; title?: string; compact?: boolean; hideScores?: boolean }
export const QuestionResultsList = ({ results, title = 'Phân tích từng câu', compact = false, hideScores = false }: Props) => {
  if (!results?.length) return null;
  return <section className={compact ? 'mt-3' : 'mt-4'} aria-label={title}>
    <div className="mb-2 flex items-center justify-between gap-2"><p className="text-xs font-black text-slate-500">{title}</p><span className="text-xs text-slate-400">{results.length} câu/phần</span></div>
    <div className="space-y-2">{results.map((question, index) => {
      const appearance = questionAppearance(question);
      return <details key={`${question.questionNumber}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-2 p-3 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1 break-words text-sm font-black text-slate-800">{question.questionNumber}</span>
          <span className={`rounded-full px-2 py-1 text-xs font-black ${appearance.className}`}>{appearance.label}</span>
          {!hideScores && <span className="shrink-0 text-xs font-black text-slate-700">{question.score}/{question.maxScore}</span>}
          {question.needsTeacherReview && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-label="Cần giáo viên xem lại" />}
        </summary><div className="border-t border-slate-100 bg-slate-50"><QuestionDetail question={question} hideScores={hideScores} /></div>
      </details>;
    })}</div>
  </section>;
};
