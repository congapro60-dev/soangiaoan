import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { GradingResult } from '../../../types';

interface Props {
  results: GradingResult[];
}

export const GradingWeaknessPanel = ({ results }: Props) => {
  const [open, setOpen] = useState(true);

  const analysis = useMemo(() => {
    const completed = results.filter(r => r.status === 'completed' && r.weaknesses?.length);
    if (completed.length < 2) return null;

    // Count by question number (Câu X / Question X)
    const questionCount: Record<string, { label: string; count: number; examples: string[] }> = {};
    // Count raw weakness phrases
    const phraseCount: Record<string, number> = {};

    for (const r of completed) {
      for (const w of r.weaknesses) {
        // Normalize key for phrase counting
        const key = w.trim().toLowerCase().slice(0, 60);
        phraseCount[key] = (phraseCount[key] || 0) + 1;

        // Extract question references like "Câu 3", "câu 10", "Question 2"
        const matches = w.match(/(?:câu|question|q)\s*(\d+)/gi) || [];
        for (const m of matches) {
          const normalized = m.toLowerCase().replace(/\s+/g, ' ').trim();
          const label = normalized.replace(/^(câu|question|q)\s*/i, 'Câu ').replace(/câu\s*/i, 'Câu ');
          if (!questionCount[label]) questionCount[label] = { label, count: 0, examples: [] };
          questionCount[label].count++;
          if (questionCount[label].examples.length < 2) questionCount[label].examples.push(r.studentName);
        }
      }
    }

    // Top question hotspots
    const topQuestions = Object.values(questionCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top raw phrases (count >= 2, not already in topQuestions)
    const topPhrases = Object.entries(phraseCount)
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([phrase, count]) => ({ phrase, count }));

    if (topQuestions.length === 0 && topPhrases.length === 0) return null;
    return { topQuestions, topPhrases, total: completed.length };
  }, [results]);

  if (!analysis) return null;

  return (
    <div className="bg-amber-50 border border-amber-100 rounded-[24px] flex-shrink-0 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-xs font-black text-amber-700 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Điểm yếu phổ biến toàn lớp ({analysis.total} bài)
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-amber-500" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-500" />}
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-2">
          {analysis.topQuestions.length > 0 && (
            <div>
              <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider mb-1.5">Câu hỏi nhiều học sinh sai nhất</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.topQuestions.map(q => (
                  <div key={q.label} className="flex items-center gap-1 bg-white border border-amber-200 rounded-lg px-2 py-1">
                    <span className="text-xs font-black text-amber-700">{q.label}</span>
                    <span className="text-[10px] text-amber-500 font-medium">
                      {q.count}/{analysis.total} HS
                    </span>
                    {q.examples.length > 0 && (
                      <span className="text-[9px] text-slate-400 ml-0.5">({q.examples.join(', ')}...)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.topPhrases.length > 0 && (
            <div>
              <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider mb-1.5">Lỗi lặp lại nhiều lần</p>
              <ul className="space-y-0.5">
                {analysis.topPhrases.map(({ phrase, count }) => (
                  <li key={phrase} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                    <span className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-200 text-amber-700 font-black text-[9px]">{count}</span>
                    <span className="capitalize">{phrase}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
