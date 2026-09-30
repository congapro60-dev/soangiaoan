import { useEffect, useMemo, useState } from 'react';
import { Award, ChevronDown, ChevronRight, Loader2, Save } from 'lucide-react';
import { asCompetencyGrade, competenciesByGrade, type Competency } from '../../../../lib/classroom/competency/framework';
import { STUDENT_INTRO } from '../../../../lib/classroom/competency/portfolioGuide';
import { schoolYearMonths, type PortfolioEntry } from '../../../../lib/classroom/competency/studentPortfolio';
import { fetchStudentPortfolio, saveStudentPortfolio } from '../../../../services/studentPortalApi';
import { PortfolioEntryEditor } from '../PortfolioEntryEditor';

const today = (): string => new Date().toISOString().slice(0, 10);
const STUDENT_KEYS = ['selfLevel', 'goal', 'plan', 'timeframe', 'difficulty', 'progress'] as const;
const studentPart = (entry: PortfolioEntry): PortfolioEntry =>
  Object.fromEntries(STUDENT_KEYS.filter(k => entry[k] !== undefined).map(k => [k, entry[k]])) as PortfolioEntry;

/**
 * Hồ sơ năng lực trên trang HS: em tự đánh giá mức + lập kế hoạch cho từng năng lực, thấy mức và
 * ý kiến thầy cô. Mỗi năng lực lưu riêng (bấm Lưu), máy chủ chỉ nhận ô của HS.
 */
export const StudentCompetencyPortfolio = () => {
  const [grade, setGrade] = useState<ReturnType<typeof asCompetencyGrade>>(null);
  const [entries, setEntries] = useState<Record<string, PortfolioEntry>>({});
  const [saved, setSaved] = useState<Record<string, PortfolioEntry>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const months = useMemo(() => schoolYearMonths(today()), []);

  useEffect(() => {
    fetchStudentPortfolio()
      .then(({ grade: g, portfolio }) => {
        setGrade(asCompetencyGrade(g));
        setEntries(portfolio.entries);
        setSaved(portfolio.entries);
        setState('ready');
      })
      .catch(e => { setError(e instanceof Error ? e.message : 'Không tải được hồ sơ.'); setState('error'); });
  }, []);

  const areas = useMemo(() => {
    const map = new Map<string, Competency[]>();
    for (const c of grade ? competenciesByGrade(grade) : []) map.set(c.area, [...(map.get(c.area) ?? []), c]);
    return [...map.entries()];
  }, [grade]);

  const done = Object.values(entries).filter(e => e.selfLevel).length;
  const total = grade ? competenciesByGrade(grade).length : 0;

  const save = async (id: string) => {
    setSaving(id);
    setError('');
    try {
      const doc = await saveStudentPortfolio({ [id]: studentPart(entries[id] ?? {}) });
      setEntries(prev => ({ ...prev, [id]: doc.entries[id] }));
      setSaved(prev => ({ ...prev, [id]: doc.entries[id] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được.');
    } finally {
      setSaving(null);
    }
  };

  if (state === 'loading') return null;
  if (state === 'error' || !grade) {
    return state === 'error' ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">Hồ sơ năng lực: {error}</p> : null;
  }

  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">Tự đánh giá cùng thầy cô</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">Hồ sơ năng lực Toán</h2>
        </div>
        <span className="text-xs font-bold text-slate-500">Đã tự đánh giá {done}/{total}</span>
      </div>
      <ol className="mt-2 list-decimal space-y-0.5 rounded-2xl bg-indigo-50 px-8 py-3 text-xs font-semibold leading-5 text-indigo-900">
        {STUDENT_INTRO.map(line => <li key={line}>{line}</li>)}
      </ol>
      {error && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
      <div className="mt-3 space-y-3">
        {areas.map(([area, list]) => (
          <div key={area} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-indigo-500">{area}</p>
            <div className="mt-2 space-y-2">
              {list.map(c => {
                const entry = entries[c.id] ?? {};
                const dirty = JSON.stringify(studentPart(entry)) !== JSON.stringify(studentPart(saved[c.id] ?? {}));
                const isOpen = open === c.id;
                return (
                  <div key={c.id} className="rounded-xl bg-slate-50">
                    <button type="button" onClick={() => setOpen(isOpen ? null : c.id)} className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left">
                      {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
                      <span className="min-w-0 flex-1 text-sm font-black text-slate-800">{c.topic}</span>
                      {entry.selfLevel && <span className="shrink-0 rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black text-amber-900">Em: {entry.selfLevel}</span>}
                      {entry.teacherLevel && <span className="shrink-0 rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-900">Thầy cô: {entry.teacherLevel}</span>}
                    </button>
                    {isOpen && (
                      <div className="border-t border-slate-200 px-3 pb-3 pt-2">
                        <p className="mb-2 text-xs font-semibold text-slate-500">Năng lực cần đạt: {c.competency}</p>
                        <PortfolioEntryEditor competency={c} entry={entry} role="student" months={months}
                          onChange={next => setEntries(prev => ({ ...prev, [c.id]: next }))} />
                        <button type="button" disabled={!dirty || saving === c.id} onClick={() => void save(c.id)}
                          className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-50">
                          {saving === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {dirty ? 'Lưu' : 'Đã lưu'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-slate-400"><Award className="h-3.5 w-3.5" /> Thầy cô xem được và có thể sửa, ghi ý kiến cho em.</p>
    </section>
  );
};
