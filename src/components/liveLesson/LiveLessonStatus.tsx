import type { ReactNode } from 'react';

export type LiveLessonStatusTone = 'neutral' | 'success' | 'warning' | 'error';

const toneClasses: Record<LiveLessonStatusTone, string> = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
};

export const LiveLessonStatus = ({ children, tone = 'neutral' }: { children: ReactNode; tone?: LiveLessonStatusTone }) => (
  <div role="status" className={`rounded-xl border px-3 py-2 text-sm font-bold ${toneClasses[tone]}`}>{children}</div>
);
