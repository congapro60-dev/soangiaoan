import { useState, useRef } from 'react';
import { ChevronLeft, Download, Trash2, BarChart3 } from 'lucide-react';
import { GradingResult, GradingSession } from '../../../types';
import { GradingResultsList, FilterScore } from './GradingResultsList';
import { GradingWeaknessPanel } from './GradingWeaknessPanel';

interface Props {
  session: GradingSession;
  filterScore: FilterScore;
  setFilterScore: (f: FilterScore) => void;
  onBack: () => void;
  onDelete: () => void;
  onExportExcel: () => void;
  onAnalyzeClass: () => void;
  onViewResult: (r: GradingResult) => void;
  onDeleteResult: (r: GradingResult) => void;
  onRenameResult?: (r: GradingResult, name: string) => void;
}

export const GradingViewSession = ({
  session, filterScore, setFilterScore,
  onBack, onDelete, onExportExcel, onAnalyzeClass, onViewResult, onDeleteResult, onRenameResult,
}: Props) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDeleteClick = () => {
    if (confirmingDelete) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setConfirmingDelete(false);
      onDelete();
    } else {
      setConfirmingDelete(true);
      timerRef.current = setTimeout(() => setConfirmingDelete(false), 3000);
    }
  };

  const done = session.results.filter(r => r.status === 'completed');
  const avg = done.length
    ? (done.reduce((a, r) => a + r.score, 0) / done.length).toFixed(1)
    : '—';
  const above8 = done.filter(r => r.score >= 8).length;
  const below5 = done.filter(r => r.score < 5).length;

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-black text-slate-800">{session.title}</h2>
            <p className="text-xs text-slate-400">
              {new Date(session.createdAt).toLocaleDateString('vi-VN', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
              {' · '}{session.results.length} học sinh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Stats pill */}
          <div className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 px-4 py-2">
            {[
              { label: 'TB', value: avg, color: 'text-blue-600' },
              { label: 'Giỏi', value: above8, color: 'text-emerald-600' },
              { label: 'Yếu', value: below5, color: 'text-red-500' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className={`text-base font-black ${s.color}`}>{s.value}</div>
                <div className="text-[9px] text-slate-400 uppercase">{s.label}</div>
              </div>
            ))}
          </div>
          <button
            onClick={onExportExcel}
            className="px-4 py-2 bg-emerald-600 text-white rounded-2xl font-bold text-xs hover:bg-emerald-700 transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
          <button
            onClick={onAnalyzeClass}
            className="px-4 py-2 bg-violet-600 text-white rounded-2xl font-bold text-xs hover:bg-violet-700 transition-all flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5" /> Phân tích lớp
          </button>
          <button
            onClick={handleDeleteClick}
            className={`px-3 py-2 rounded-2xl font-bold text-xs transition-all flex items-center gap-1.5 ${
              confirmingDelete
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-red-50 text-red-500 hover:bg-red-100'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {confirmingDelete ? 'Xác nhận xóa?' : 'Xóa phiên'}
          </button>
        </div>
      </div>

      {/* Weakness aggregation */}
      <GradingWeaknessPanel results={session.results} />

      {/* Results */}
      <GradingResultsList
        results={session.results}
        filterScore={filterScore}
        setFilterScore={setFilterScore}
        onView={onViewResult}
        onDelete={onDeleteResult}
        onRename={onRenameResult}
      />
    </div>
  );
};
