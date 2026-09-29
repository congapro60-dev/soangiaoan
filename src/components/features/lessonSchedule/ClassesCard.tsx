import { useRef, useState } from 'react';
import { Loader2, Sparkles, Upload, Users } from 'lucide-react';
import type { AppData } from '../../../types';
import { PPCT_GRADES, PPCT_SOURCE_LABELS, type PpctLesson, type PpctSource } from '../../../data/ppct';
import { callAI } from '../../../lib/aiProviders';
import { slotKey } from '../../../lib/schedule/lessonCalendar';
import { parseGoogleLink } from '../../../lib/schedule/googleLink';
import { buildPpctPrompt, parsePpctResponse } from '../../../lib/schedule/ppctImport';
import { classOptions, classTimetables, defaultClassLabel, guessGrade, type PlanClass, type PlanPpct, type SchedulePlan } from '../../../lib/schedule/schedulePlan';
import { readFileText, readGoogleLinkText } from '../../../lib/schedule/sourceText';
import { Card, Notice, btn, btnPrimary, dayName, errorText, input, small, todayIso, type ShowToast } from './ui';

interface Props {
  plan: SchedulePlan;
  onChange: (patch: Partial<SchedulePlan>) => void;
  /** PPCT đã nạp theo lớp (khoá classKey). */
  lessonsByClass: Record<string, PpctLesson[]>;
  settings: AppData['settings'];
  showToast: ShowToast;
}

/** Môn không thuộc PPCT (chủ nhiệm, sinh hoạt…) — chỉ để bỏ tick mặc định, GV tick lại được. */
const NON_TEACHING = /chủ nhiệm|sinh hoạt|chào cờ|homeroom|morning|wrap|meeting|lunch|nap|\bsel\b/i;

const ppctValue = (p: PlanPpct | null): string => (p?.kind === 'builtin' ? `${p.source}:${p.grade}` : p?.kind === 'custom' ? 'custom' : '');

const PpctImport = ({ settings, onDone }: { settings: AppData['settings']; onDone: (name: string, lessons: PpctLesson[]) => void }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const run = async (get: () => Promise<{ name: string; text: string }>) => {
    setError('');
    setBusy('Đang đọc tài liệu…');
    try {
      const { name, text } = await get();
      setBusy('AI đang đọc PPCT (có thể mất 1–2 phút)…');
      const lessons = parsePpctResponse(await callAI(buildPpctPrompt(text), settings));
      if (lessons.length === 0) throw new Error('AI không đọc ra tiết nào — kiểm tra lại file/tab.');
      onDone(name, lessons);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-2 rounded-xl bg-slate-50 p-2">
      <div className="flex flex-wrap gap-2">
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.ods,.docx,.pdf,.txt" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void run(async () => ({ name: f.name, text: await readFileText(f) })); e.target.value = ''; }} />
        <button type="button" className={btn} disabled={!!busy} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Tải file PPCT</button>
        <div className="flex min-w-[14rem] flex-1 gap-1">
          <input className={`${input} flex-1`} value={link} onChange={(e) => setLink(e.target.value)} placeholder="…hoặc link Google Sheet / Docs / Drive" />
          <button type="button" className={btnPrimary} disabled={!!busy || !link.trim()} onClick={() => {
            const g = parseGoogleLink(link);
            if (!g) { setError('Link chưa đúng — dán link Google Sheet, Docs hoặc Drive.'); return; }
            void run(() => readGoogleLinkText(g));
          }}><Sparkles className="h-4 w-4" /> Đọc</button>
        </div>
      </div>
      {busy && <p className="flex items-center gap-2 text-sm font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> {busy}</p>}
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
};

export const ClassesCard = ({ plan, onChange, lessonsByClass, settings, showToast }: Props) => {
  const [importFor, setImportFor] = useState<string | null>(null);
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const options = classOptions(plan);
  const byKey = new Map(plan.classes.map((c) => [c.classKey, c]));

  const setClass = (classKey: string, patch: Partial<PlanClass> | null) => {
    const others = plan.classes.filter((c) => c.classKey !== classKey);
    if (patch === null) { onChange({ classes: others }); return; }
    const cur = byKey.get(classKey);
    if (!cur) return;
    onChange({ classes: [...others, { ...cur, ...patch }].sort((a, b) => a.classKey.localeCompare(b.classKey, 'vi')) });
  };

  const include = (classKey: string, subjects: string[]) => {
    const grade = guessGrade(classKey);
    const source: PpctSource | null = /moet|bộ/i.test(plan.name) ? 'MOET' : /tds|discover/i.test(plan.name) ? 'TDS' : null;
    const ppct: PlanPpct | null = grade && source && PPCT_GRADES[source].includes(grade) ? { kind: 'builtin', source, grade } : null;
    const picked = subjects.filter((s) => !NON_TEACHING.test(s));
    onChange({ classes: [...plan.classes, { classKey, label: defaultClassLabel(classKey), subjects: picked.length ? picked : subjects, ppct, strandBySlot: {} }] });
  };

  if (plan.timetables.length === 0) {
    return <Card icon={Users} title="Lớp dạy"><Notice>Thêm thời khoá biểu ở trên trước — app lấy danh sách lớp từ TKB.</Notice></Card>;
  }

  return (
    <Card icon={Users} title="Lớp dạy" desc="Tick lớp cần làm báo giảng, chọn môn tính vào PPCT (vd Toán + Chuyên đề Toán dùng chung một dãy tiết) và PPCT của lớp.">
      {options.map((o) => {
        const pc = byKey.get(o.classKey);
        const lessons = lessonsByClass[o.classKey] ?? [];
        // "Tự chọn" không phải phân môn (vài PPCT ghi nhầm vào cột phân môn).
        const strands = [...new Set(lessons.filter((l) => !l.isElective && l.subject && !/^tự chọn$/i.test(l.subject.trim())).map((l) => l.subject))];
        // Ô trong tuần lấy từ TKB đang áp dụng hôm nay (không có thì TKB cuối).
        const periods = pc ? classTimetables(plan, pc) : [];
        const today = todayIso();
        const current = periods.find((p) => p.from <= today && today <= p.to) ?? periods.at(-1);
        return (
          <div key={o.classKey} className={`rounded-xl border p-3 ${pc ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200'}`}>
            <label className="flex items-center gap-2 font-bold text-slate-800">
              <input type="checkbox" checked={!!pc} onChange={(e) => (e.target.checked ? include(o.classKey, o.subjects) : setClass(o.classKey, null))} />
              {o.classKey}
            </label>
            {pc && (
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="font-semibold text-slate-600">Tên ghi ra <input className={`${small} ml-1 w-36`} value={pc.label} onChange={(e) => setClass(o.classKey, { label: e.target.value })} /></label>
                  <span className="font-semibold text-slate-600">Môn:</span>
                  {o.subjects.map((s) => (
                    <label key={s} className="flex items-center gap-1">
                      <input type="checkbox" checked={pc.subjects.includes(s)}
                        onChange={(e) => setClass(o.classKey, { subjects: e.target.checked ? [...pc.subjects, s] : pc.subjects.filter((x) => x !== s) })} />
                      {s}
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-600">PPCT:</span>
                  <select className={small} value={ppctValue(pc.ppct)} onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'import') { setImportFor(o.classKey); return; }
                    if (v === 'custom' || v === '') { setClass(o.classKey, { ppct: v === '' ? null : pc.ppct }); return; }
                    const [source, grade] = v.split(':');
                    setClass(o.classKey, { ppct: { kind: 'builtin', source: source as PpctSource, grade: Number(grade) }, strandBySlot: {} });
                  }}>
                    <option value="">— Chọn PPCT —</option>
                    {(Object.keys(PPCT_GRADES) as PpctSource[]).flatMap((src) => PPCT_GRADES[src].map((g) => (
                      <option key={`${src}:${g}`} value={`${src}:${g}`}>{PPCT_SOURCE_LABELS[src]} · lớp {g}</option>
                    )))}
                    {pc.ppct?.kind === 'custom' && <option value="custom">Tự nhập: {pc.ppct.name}</option>}
                    <option value="import">+ Nhập PPCT của trường (file / link)…</option>
                  </select>
                  {lessons.length > 0 && (
                    <button type="button" className="text-xs font-bold text-indigo-600 underline" onClick={() => setReviewFor(reviewFor === o.classKey ? null : o.classKey)}>
                      {lessons.length} tiết · {reviewFor === o.classKey ? 'ẩn' : 'xem'}
                    </button>
                  )}
                </div>
                {importFor === o.classKey && (
                  <PpctImport settings={settings} onDone={(name, imported) => {
                    setClass(o.classKey, { ppct: { kind: 'custom', name, lessons: imported }, strandBySlot: {} });
                    setImportFor(null);
                    setReviewFor(o.classKey);
                    showToast(`Đã đọc ${imported.length} tiết — cô soát lại danh sách.`, 'success');
                  }} />
                )}
                {reviewFor === o.classKey && (
                  <div className="max-h-72 overflow-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-xs">
                      <thead className="sticky top-0 bg-slate-50 text-left text-slate-600"><tr><th className="px-2 py-1">Tiết</th><th className="px-2 py-1">Tuần</th><th className="px-2 py-1">Phân môn</th><th className="px-2 py-1">Bài</th><th className="px-2 py-1">Nội dung tiết</th></tr></thead>
                      <tbody>
                        {lessons.map((l, i) => (
                          <tr key={l.id} className="border-t border-slate-100">
                            <td className="px-2 py-1">{l.periodNo}</td>
                            <td className="px-2 py-1">{pc.ppct?.kind === 'custom'
                              ? <input className="w-12 rounded border border-slate-200 px-1" value={l.week ?? ''} onChange={(e) => {
                                  const w = Number(e.target.value);
                                  if (!Number.isInteger(w) || w < 1 || pc.ppct?.kind !== 'custom') return;
                                  const next = pc.ppct.lessons.map((x, k) => (k === i ? { ...x, week: w, weeks: [w] } : x));
                                  setClass(o.classKey, { ppct: { ...pc.ppct, lessons: next } });
                                }} />
                              : l.week}</td>
                            <td className="px-2 py-1">{l.isElective ? 'Tự chọn' : l.subject}</td>
                            <td className="px-2 py-1">{pc.ppct?.kind === 'custom'
                              ? <input className="w-full min-w-[12rem] rounded border border-slate-200 px-1" value={l.title} onChange={(e) => {
                                  if (pc.ppct?.kind !== 'custom') return;
                                  const next = pc.ppct.lessons.map((x, k) => (k === i ? { ...x, title: e.target.value } : x));
                                  setClass(o.classKey, { ppct: { ...pc.ppct, lessons: next } });
                                }} />
                              : l.title}</td>
                            <td className="px-2 py-1 text-slate-500">{l.detail.split('\n')[0]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {strands.length >= 2 && current && current.slots.length > 0 && (
                  <div>
                    <p className="font-semibold text-slate-600">Phân môn theo ô (bỏ trống = dạy tiếp theo thứ tự PPCT):</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {current.slots.map((s) => (
                        <label key={slotKey(s)} className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200">
                          {dayName(s.day)} {s.start}
                          <select className="rounded border border-slate-200 px-1" value={pc.strandBySlot[slotKey(s)] ?? ''}
                            onChange={(e) => {
                              const next = { ...pc.strandBySlot };
                              if (e.target.value) next[slotKey(s)] = e.target.value; else delete next[slotKey(s)];
                              setClass(o.classKey, { strandBySlot: next });
                            }}>
                            <option value="">Tuần tự</option>
                            {strands.map((st) => <option key={st} value={st}>{st}</option>)}
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
};
