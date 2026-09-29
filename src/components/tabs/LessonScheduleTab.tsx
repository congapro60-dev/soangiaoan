import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { CalendarRange, Plus, Settings2, Trash2, X } from 'lucide-react';
import type { AppData } from '../../types';
import { loadPpct, type PpctLesson } from '../../data/ppct';
import { mondayOf } from '../../lib/schedule/lessonCalendar';
import {
  loadScheduleState, saveScheduleState,
  type ScheduleState, type SchedulePlan,
} from '../../lib/schedule/schedulePlan';
import { CalendarCard } from '../features/lessonSchedule/CalendarCard';
import { TimetableCard } from '../features/lessonSchedule/TimetableCard';
import { ClassesCard } from '../features/lessonSchedule/ClassesCard';
import { OutputCard } from '../features/lessonSchedule/OutputCard';
import { Card, Notice, btn, input, small, vnDate, type ShowToast } from '../features/lessonSchedule/ui';

interface Props {
  data: AppData;
  user: User | null;
  showToast: ShowToast;
}

const newPlan = (name: string): SchedulePlan => ({
  id: `plan-${Date.now()}`, name, week1Monday: '', skippedWeeks: [], messageSubject: 'Toán', subjectLabels: {}, timetables: [], classes: [],
});

/**
 * Lịch báo giảng: TKB + lịch năm học + PPCT → lịch từng tiết theo ngày/giờ,
 * ra tin tuần gửi phụ huynh và sổ báo giảng Excel. Không gửi đi đâu — cô tự chép/tải.
 */
export const LessonScheduleTab = ({ data, user, showToast }: Props) => {
  const uid = user?.uid ?? 'khach';
  const [state, setState] = useState<ScheduleState>(() => loadScheduleState(uid));
  const [activeId, setActiveId] = useState<string>(() => state.plans[0]?.id ?? '');
  const [newName, setNewName] = useState('');
  const [builtin, setBuiltin] = useState<Record<string, PpctLesson[]>>({});
  const loadedUid = useRef(uid);
  const warned = useRef(false);

  useEffect(() => {
    if (loadedUid.current === uid) return;
    loadedUid.current = uid;
    const next = loadScheduleState(uid);
    setState(next);
    setActiveId(next.plans[0]?.id ?? '');
  }, [uid]);

  useEffect(() => {
    if (!saveScheduleState(uid, state) && !warned.current) {
      warned.current = true;
      showToast('Trình duyệt không cho lưu — cấu hình sẽ mất khi tải lại trang.', 'warning');
    }
  }, [uid, state, showToast]);

  const plan = state.plans.find((p) => p.id === activeId) ?? state.plans[0] ?? null;
  const updatePlan = (patch: Partial<SchedulePlan>) => plan && setState((s) => ({ ...s, plans: s.plans.map((p) => (p.id === plan.id ? { ...p, ...patch } : p)) }));

  // Nạp PPCT có sẵn trong app cho các lớp đang chọn.
  useEffect(() => {
    const need = new Set<string>();
    for (const p of state.plans) for (const c of p.classes) if (c.ppct?.kind === 'builtin') need.add(`${c.ppct.source}:${c.ppct.grade}`);
    for (const key of need) {
      if (builtin[key]) continue;
      const [source, grade] = key.split(':');
      void loadPpct(source as 'TDS' | 'MOET', Number(grade)).then((prog) => {
        if (prog) setBuiltin((b) => ({ ...b, [key]: prog.lessons }));
      });
    }
  }, [state.plans, builtin]);

  const lessonsByClass = useMemo(() => {
    const out: Record<string, PpctLesson[]> = {};
    for (const c of plan?.classes ?? []) {
      if (c.ppct?.kind === 'custom') out[c.classKey] = c.ppct.lessons;
      if (c.ppct?.kind === 'builtin') out[c.classKey] = builtin[`${c.ppct.source}:${c.ppct.grade}`] ?? [];
    }
    return out;
  }, [plan, builtin]);

  const addPlan = () => {
    const p = newPlan(newName.trim() || `Bộ lịch ${state.plans.length + 1}`);
    setState((s) => ({ ...s, plans: [...s.plans, p] }));
    setActiveId(p.id);
    setNewName('');
  };

  const subjects = plan ? [...new Set(plan.classes.flatMap((c) => c.subjects))].sort((a, b) => a.localeCompare(b, 'vi')) : [];
  const defaultSignature = user?.displayName || plan?.timetables.find((t) => t.teacherName)?.teacherName || '';
  const teacherName = plan?.signature?.trim() || defaultSignature;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-black text-slate-800"><CalendarRange className="h-7 w-7 text-indigo-600" /> Lịch báo giảng</h2>
        <p className="mt-1 text-sm text-slate-500">
          Đưa thời khoá biểu, lịch năm học và phân phối chương trình vào một lần — app xếp từng tiết theo ngày giờ,
          ra tin báo giảng tuần gửi phụ huynh và sổ báo giảng Excel. App không tự gửi đi đâu: cô xem, sửa, rồi tự chép / tải.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {state.plans.map((p) => (
          <button key={p.id} type="button" onClick={() => setActiveId(p.id)}
            className={`min-h-10 rounded-xl px-4 text-sm font-black ${plan?.id === p.id ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}>
            {p.name}
          </button>
        ))}
        <div className="flex gap-1">
          <input className={`${input} w-44`} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Tên bộ lịch (vd MOET)" onKeyDown={(e) => e.key === 'Enter' && addPlan()} />
          <button type="button" className={btn} onClick={addPlan}><Plus className="h-4 w-4" /> Thêm bộ lịch</button>
        </div>
      </div>

      {!plan && (
        <Notice>
          Mỗi chương trình có TKB và PPCT riêng thì tạo một bộ lịch riêng (vd "TDS" và "MOET"). Gõ tên rồi bấm "Thêm bộ lịch" để bắt đầu.
        </Notice>
      )}

      <CalendarCard
        events={state.calendar.events}
        sourceName={state.calendar.sourceName}
        settings={data.settings}
        onChange={(events, sourceName) => setState((s) => ({ ...s, calendar: { events, sourceName } }))}
        onSuggestWeek1={(monday) => (plan ? updatePlan({ week1Monday: monday }) : showToast('Tạo một bộ lịch trước.', 'info'))}
        showToast={showToast}
      />

      {plan && (
        <>
          <Card icon={Settings2} title={`Bộ lịch "${plan.name}"`}
            right={(
              <button type="button" className={btn} onClick={() => {
                if (!window.confirm(`Xoá bộ lịch "${plan.name}"?`)) return;
                setState((s) => ({ ...s, plans: s.plans.filter((p) => p.id !== plan.id) }));
                setActiveId('');
              }}><Trash2 className="h-4 w-4" /> Xoá bộ lịch</button>
            )}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm font-semibold text-slate-600">Tên bộ lịch
                <input className={`${input} mt-1 w-full`} value={plan.name} onChange={(e) => updatePlan({ name: e.target.value })} />
              </label>
              <label className="text-sm font-semibold text-slate-600" title="Tuần 1 của PPCT bắt đầu từ thứ Hai này">Tuần 1 bắt đầu (thứ Hai)
                <input type="date" className={`${input} mt-1 w-full`} value={plan.week1Monday} onChange={(e) => e.target.value && updatePlan({ week1Monday: mondayOf(e.target.value) })} />
              </label>
              <label className="text-sm font-semibold text-slate-600">Tên môn trong tin gửi PH
                <input className={`${input} mt-1 w-full`} value={plan.messageSubject} onChange={(e) => updatePlan({ messageSubject: e.target.value })} />
              </label>
              <label className="text-sm font-semibold text-slate-600">Ký tên
                <input className={`${input} mt-1 w-full`} value={plan.signature ?? ''} placeholder={defaultSignature} onChange={(e) => updatePlan({ signature: e.target.value })} />
              </label>
            </div>
            {subjects.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-slate-600">Tên môn ghi sổ:</span>
                {subjects.map((s) => (
                  <label key={s} className="flex items-center gap-1">{s} →
                    <input className={`${small} w-28`} value={plan.subjectLabels[s] ?? s}
                      onChange={(e) => updatePlan({ subjectLabels: { ...plan.subjectLabels, [s]: e.target.value } })} />
                  </label>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-slate-600" title="Tuần vẫn có thể đi học nhưng không tính số tuần PPCT (tuần đệm…). Tuần nghỉ trọn đã tự bỏ.">Tuần không đánh số:</span>
              {plan.skippedWeeks.map((w) => (
                <span key={w} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1">
                  tuần từ {vnDate(w)}
                  <button type="button" aria-label="Bỏ" onClick={() => updatePlan({ skippedWeeks: plan.skippedWeeks.filter((x) => x !== w) })}><X className="h-3.5 w-3.5" /></button>
                </span>
              ))}
              <input type="date" className={small} value="" onChange={(e) => {
                const m = e.target.value && mondayOf(e.target.value);
                if (m && !plan.skippedWeeks.includes(m)) updatePlan({ skippedWeeks: [...plan.skippedWeeks, m].sort() });
              }} />
            </div>
          </Card>

          <TimetableCard plan={plan} onChange={updatePlan} userEmail={user?.email ?? null} userName={user?.displayName ?? null} showToast={showToast} />
          <ClassesCard plan={plan} onChange={updatePlan} lessonsByClass={lessonsByClass} settings={data.settings} showToast={showToast} />
          {plan.week1Monday
            ? <OutputCard plan={plan} lessonsByClass={lessonsByClass} events={state.calendar.events} teacherName={teacherName} showToast={showToast} />
            : plan.timetables.length > 0 && <Notice tone="warn">Chọn ngày bắt đầu tuần 1 ở trên để xếp lịch.</Notice>}
        </>
      )}
    </div>
  );
};

