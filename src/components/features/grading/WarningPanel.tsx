import { GradingWarning } from '../../../types';

interface WarningPanelProps {
  warnings: GradingWarning[];
}

const LEVEL_STYLE: Record<GradingWarning['level'], { bg: string; border: string; text: string; icon: string }> = {
  error:   { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',   icon: '🔴' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: '🟡' },
  info:    { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-600',  icon: '🔵' },
};

const LEVEL_ORDER: GradingWarning['level'][] = ['error', 'warning', 'info'];

export const WarningPanel = ({ warnings }: WarningPanelProps) => {
  if (warnings.length === 0) return null;

  const sorted = [...warnings].sort(
    (a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)
  );

  return (
    <div className="flex-shrink-0">
      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
        ⚠️ Cảnh báo
        <span className="bg-orange-100 text-orange-700 rounded-full px-2 py-0.5 text-[10px] font-bold">{warnings.length}</span>
      </h4>
      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
        {sorted.map((w, i) => {
          const s = LEVEL_STYLE[w.level];
          return (
            <div key={i} className={`${s.bg} ${s.border} ${s.text} border rounded-lg px-3 py-2`}>
              <p className="text-xs font-medium">{s.icon} {w.message}</p>
              {w.suggestion && (
                <p className="text-[10px] opacity-75 mt-0.5">{w.suggestion}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
