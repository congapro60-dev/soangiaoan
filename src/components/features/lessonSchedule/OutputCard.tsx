import { useMemo, useState } from 'react';
import { saveAs } from 'file-saver';
import { ClipboardCopy, Download, FileSpreadsheet, RotateCcw } from 'lucide-react';
import type { PpctLesson } from '../../../data/ppct';
import type { CalendarEvent } from '../../../lib/schedule/calendarImport';
import { addDays, mondayOf, weekday } from '../../../lib/schedule/lessonCalendar';
import { buildParentWeekMessage, buildRegisterWeek, lessonChains, registerTitle } from '../../../lib/schedule/scheduleFormat';
import { buildRegisterWorkbook, type RegisterWeek } from '../../../lib/schedule/registerWorkbook';
import { planClassCalendar, registerPeriods, type SchedulePlan } from '../../../lib/schedule/schedulePlan';
import { Card, Notice, btn, btnPrimary, todayIso, vnDate, type ShowToast } from './ui';

interface Props {
  plan: SchedulePlan;
  lessonsByClass: Record<string, PpctLesson[]>;
  events: CalendarEvent[];
  teacherName: string;
  showToast: ShowToast;
}

export const OutputCard = ({ plan, lessonsByClass, events, teacherName, showToast }: Props) => {
  const [pickedWeek, setPickedWeek] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});

  const classes = useMemo(() => plan.classes
    .filter((pc) => (lessonsByClass[pc.classKey] ?? []).length > 0)
    .map((pc) => {
      const lessons = lessonsByClass[pc.classKey];
      return { pc, chains: lessonChains(lessons), result: planClassCalendar(plan, pc, lessons, events) };
    }), [plan, lessonsByClass, events]);

  // Tuần có tiết → thứ Hai của tuần đó.
  const weekMonday = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of classes) for (const s of c.result.slots) if (s.week !== null && !m.has(s.week)) m.set(s.week, mondayOf(s.date));
    return new Map([...m.entries()].sort((a, b) => a[0] - b[0]));
  }, [classes]);
  const weeks = [...weekMonday.keys()];

  if (plan.classes.length === 0) return null;
  if (classes.length === 0 || weeks.length === 0) {
    return <Card icon={FileSpreadsheet} title="Lịch báo giảng"><Notice>Chọn PPCT cho lớp và kiểm tra khoảng ngày của TKB — chưa có tiết nào để xếp.</Notice></Card>;
  }

  const thisMonday = mondayOf(todayIso());
  const defaultWeek = weeks.find((w) => weekMonday.get(w)! >= thisMonday) ?? weeks.at(-1)!;
  const week = pickedWeek !== null && weekMonday.has(pickedWeek) ? pickedWeek : defaultWeek;
  const monday = weekMonday.get(week)!;

  const tkbFor = (m: string) => plan.timetables.find((t) => t.from <= addDays(m, 6) && m <= t.to) ?? plan.timetables[0];
  const allDays = new Set(classes.flatMap((c) => c.result.slots.map((s) => weekday(s.date))));
  const days = [1, 2, 3, 4, 5, ...[6, 7].filter((d) => allDays.has(d))];
  const lastDay = allDays.has(7) ? 7 : 6;

  const registerWeek = (w: number): RegisterWeek => {
    const m = weekMonday.get(w)!;
    const tkb = tkbFor(m);
    const rows = buildRegisterWeek(m, days, tkb ? registerPeriods(tkb) : [], classes.map((c) => ({
      className: c.pc.label, subjectLabels: plan.subjectLabels, chains: c.chains, slots: c.result.slots.filter((s) => s.week === w),
    })));
    return { week: w, monday: m, rows };
  };
  const current = registerWeek(week);

  const download = (list: number[], suffix: string) => {
    const bytes = buildRegisterWorkbook(list.map(registerWeek), teacherName, lastDay);
    saveAs(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Lich-bao-giang_${plan.name}_${suffix}.xlsx`.replace(/\s+/g, '-'));
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Đã chép — dán vào tin nhắn gửi phụ huynh.', 'success');
    } catch {
      showToast('Không chép được, hãy bôi đen và copy thủ công.', 'warning');
    }
  };

  return (
    <Card icon={FileSpreadsheet} title="Lịch báo giảng"
      right={(
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-600" htmlFor="lbg-week">Tuần</label>
          <select id="lbg-week" className="min-h-10 rounded-xl border border-slate-200 px-2 text-sm font-bold" value={week} onChange={(e) => setPickedWeek(Number(e.target.value))}>
            {weeks.map((w) => <option key={w} value={w}>Tuần {w} ({vnDate(weekMonday.get(w)!).slice(0, 5)})</option>)}
          </select>
        </div>
      )}>
      {classes.map(({ pc, chains, result }) => {
        const slots = result.slots.filter((s) => s.week === week);
        if (slots.length === 0) return null;
        const key = `${week}|${pc.classKey}`;
        const generated = buildParentWeekMessage({ className: pc.label, subjectName: plan.messageSubject || 'Toán', week, slots, chains, teacherName }).text;
        const text = edits[key] ?? generated;
        const overflow = result.overflow.find((o) => o.week === week);
        const empty = slots.filter((s) => !s.lesson).length;
        return (
          <div key={pc.classKey} className="space-y-2 rounded-xl border border-slate-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-black text-slate-800">{pc.label} — tin gửi phụ huynh</p>
              <div className="flex gap-2">
                {edits[key] !== undefined && (
                  <button type="button" className={btn} onClick={() => setEdits(({ [key]: _drop, ...rest }) => rest)}><RotateCcw className="h-4 w-4" /> Bản gốc</button>
                )}
                <button type="button" className={btnPrimary} onClick={() => void copy(text)}><ClipboardCopy className="h-4 w-4" /> Chép</button>
              </div>
            </div>
            {overflow && (
              <Notice tone="warn">
                Còn {overflow.lessons.length} tiết chưa dạy kịp, đã dồn sang tuần sau: {overflow.lessons.map((l) => `tiết ${l.periodNo} (${registerTitle(l, chains)})`).join('; ')}.
              </Notice>
            )}
            {empty > 0 && <Notice tone="warn">Có {empty} tiết trống (hết bài theo PPCT tuần này) — cô sửa trực tiếp trong khung dưới.</Notice>}
            <textarea className="min-h-[16rem] w-full rounded-xl border border-slate-200 p-3 text-sm leading-relaxed"
              value={text} onChange={(e) => setEdits({ ...edits, [key]: e.target.value })} />
          </div>
        );
      })}

      <div className="space-y-2 rounded-xl border border-slate-200 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-black text-slate-800">Sổ báo giảng tuần {week} ({vnDate(monday)})</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => download([week], `tuan-${week}`)}><Download className="h-4 w-4" /> Excel tuần này</button>
            <button type="button" className={btnPrimary} onClick={() => download(weeks, 'ca-nam')}><Download className="h-4 w-4" /> Excel cả năm ({weeks.length} tuần)</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr><th className="px-2 py-1">Thứ</th><th className="px-2 py-1">Tiết</th><th className="px-2 py-1">PPCT</th><th className="px-2 py-1">Môn</th><th className="px-2 py-1">Lớp</th><th className="px-2 py-1">Tên bài</th></tr>
            </thead>
            <tbody>
              {current.rows.filter((r) => r.title || r.className).map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-2 py-1">{r.dayLabel} {vnDate(r.date).slice(0, 5)}</td>
                  <td className="px-2 py-1">{r.periodNo}</td>
                  <td className="px-2 py-1">{r.ppctNo ?? ''}</td>
                  <td className="px-2 py-1">{r.subject}</td>
                  <td className="px-2 py-1">{r.className}</td>
                  <td className="px-2 py-1">{r.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};

