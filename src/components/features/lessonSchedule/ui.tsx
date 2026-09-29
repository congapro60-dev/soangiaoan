import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type ShowToast = (title: string, icon?: 'success' | 'error' | 'warning' | 'info') => void;

export const btn = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-100 disabled:opacity-60';
export const btnPrimary = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60';
export const input = 'min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm';
export const small = 'min-h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm';

export const errorText = (e: unknown): string => (e instanceof Error ? e.message : 'Có lỗi, thử lại sau.');

export const Card = ({ icon: Icon, title, desc, children, right }: { icon: LucideIcon; title: string; desc?: string; children: ReactNode; right?: ReactNode }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-indigo-50 p-2 text-indigo-600"><Icon className="h-5 w-5" /></div>
        <div>
          <h3 className="text-base font-black text-slate-800">{title}</h3>
          {desc && <p className="mt-0.5 text-sm text-slate-500">{desc}</p>}
        </div>
      </div>
      {right}
    </div>
    <div className="mt-4 space-y-3">{children}</div>
  </section>
);

export const Notice = ({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error'; children: ReactNode }) => (
  <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${tone === 'error' ? 'bg-rose-50 text-rose-700' : tone === 'warn' ? 'bg-amber-50 text-amber-800' : 'bg-indigo-50 text-indigo-700'}`}>{children}</p>
);

const DAY = ['', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];
export const dayName = (d: number): string => DAY[d] ?? '';
export const vnDate = (iso: string): string => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
export const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
