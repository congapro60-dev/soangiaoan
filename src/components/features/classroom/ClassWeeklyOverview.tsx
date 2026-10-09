import { useMemo } from 'react';
import { CalendarRange } from 'lucide-react';
import type { ClassAssignmentReport } from '../../../lib/classroom/classReportModel';
import { buildWeeklyOverview } from '../../../lib/classroom/classWeeklyOverview';
import type { WeekPlan } from '../../../lib/classroom/reportWeeks';

const tone = (value: number | null, good: number, ok: number): string => (
  value === null ? 'bg-slate-300' : value >= good ? 'bg-emerald-500' : value >= ok ? 'bg-amber-500' : 'bg-rose-500'
);

const Meter = ({ label, value, good, ok }: { label: string; value: number | null; good: number; ok: number }) => (
  <div className="min-w-0">
    <p className="whitespace-nowrap text-[11px] font-bold text-slate-500">{label}</p>
    <div className="mt-1 flex items-center gap-2">
      <span className="h-2 min-w-[48px] flex-1 overflow-hidden rounded-full bg-slate-100">
        <span className={`block h-full rounded-full ${tone(value, good, ok)}`} style={{ width: `${Math.max(2, Math.min(100, value ?? 0))}%` }} />
      </span>
      <span className="w-12 whitespace-nowrap text-right text-sm font-black text-slate-900">{value === null ? '—' : `${value}%`}</span>
    </div>
  </div>
);

/** Cả lớp theo tuần học: tuần nào nộp ít, điểm tụt — một dòng một tuần, tuần mới nhất trước. */
export const ClassWeeklyOverview = ({ reports, weekPlan }: { reports: readonly ClassAssignmentReport[]; weekPlan: WeekPlan | null }) => {
  const rows = useMemo(() => buildWeeklyOverview(reports, weekPlan), [reports, weekPlan]);
  if (rows.length === 0) return null;
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-4">
      <p className="flex items-center gap-2 text-sm font-black text-slate-900"><CalendarRange className="h-4 w-4 text-indigo-600" /> Cả lớp theo tuần học</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-500">Tỉ lệ nộp và điểm trung bình của các bài có hạn nộp trong tuần đó.</p>
      <ul className="mt-3 divide-y divide-slate-100">
        {rows.map(row => (
          <li key={row.monday || 'khong-ngay'} className="grid gap-x-4 gap-y-2 py-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_130px] sm:items-center">
            <div className="min-w-0">
              <p className="text-sm font-black text-indigo-700">{row.title}</p>
              <p className="text-xs font-semibold text-slate-500"><span className="whitespace-nowrap">{row.assignments} bài giao</span> · <span className="whitespace-nowrap">nộp {row.submitted}/{row.expected}</span></p>
            </div>
            <Meter label="Tỉ lệ nộp" value={row.submitRate} good={85} ok={60} />
            <Meter label="Điểm trung bình" value={row.averagePercent} good={80} ok={50} />
            <p className="whitespace-nowrap text-xs font-black text-slate-500 sm:text-right">{row.missing > 0 ? `${row.missing} lượt chưa nộp` : 'Không ai nợ bài'}</p>
          </li>
        ))}
      </ul>
    </section>
  );
};
