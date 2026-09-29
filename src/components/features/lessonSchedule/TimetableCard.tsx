import { useState } from 'react';
import { Link as LinkIcon, Loader2, Plus, Table2, Trash2 } from 'lucide-react';
import { fetchPrimeTimetableByLink } from '../../../lib/classroom/teacherService';
import {
  findTeacher, numberedPeriods, parsePrimeTimetable, primeTimetableId, teacherCourses,
  type Course, type PrimeTimetable, type WeeklySlot,
} from '../../../lib/schedule/primeTimetable';
import { mondayOf } from '../../../lib/schedule/lessonCalendar';
import { periodsFromCourses, type SavedTimetable, type SchedulePlan } from '../../../lib/schedule/schedulePlan';
import { Card, Notice, btn, btnPrimary, dayName, errorText, input, small, vnDate, type ShowToast } from './ui';

interface Props {
  plan: SchedulePlan;
  onChange: (patch: Partial<SchedulePlan>) => void;
  userEmail: string | null;
  userName: string | null;
  showToast: ShowToast;
}

interface Pending {
  link: string;
  tt: PrimeTimetable;
  teacherId: string;
  level: string;
  from: string;
  to: string;
}

type ManualRow = Pick<WeeklySlot, 'day' | 'start' | 'end'> & { periodNo: string; className: string; subject: string };
const EMPTY_ROW: ManualRow = { day: 1, start: '08:00', end: '08:45', periodNo: '1', className: '', subject: '' };

const manualCourses = (rows: readonly ManualRow[]): Course[] => {
  const map = new Map<string, Course>();
  for (const r of rows) {
    const className = r.className.trim();
    const subject = r.subject.trim();
    if (!className || !subject) continue;
    const key = `${className}|${subject}`;
    const c = map.get(key) ?? { key, classNames: [className], subject, slots: [] };
    const periodNo = Number(r.periodNo);
    c.slots.push({ day: r.day, start: r.start, end: r.end, periodNo: Number.isInteger(periodNo) && periodNo > 0 ? periodNo : null, classNames: [className], subject });
    map.set(key, c);
  }
  return [...map.values()].map((c) => ({ ...c, slots: c.slots.sort((a, b) => a.day - b.day || a.start.localeCompare(b.start)) }));
};

export const TimetableCard = ({ plan, onChange, userEmail, userName, showToast }: Props) => {
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [manual, setManual] = useState<{ from: string; to: string; rows: ManualRow[] } | null>(null);

  const saveTimetable = (t: SavedTimetable) => {
    const timetables = [...plan.timetables.filter((x) => x.id !== t.id), t].sort((a, b) => a.from.localeCompare(b.from));
    onChange({ timetables, ...(plan.week1Monday ? {} : { week1Monday: mondayOf(timetables[0].from) }) });
  };

  const loadLink = async () => {
    setError('');
    if (!primeTimetableId(link)) { setError('Link chưa đúng — dán link xem TKB của Prime Timetable (primetimetable.com/publish/?id=…).'); return; }
    setBusy(true);
    try {
      const tt = parsePrimeTimetable(await fetchPrimeTimetableByLink(link.trim()));
      const me = findTeacher(tt, { email: userEmail, name: userName });
      setPending({ link: link.trim(), tt, teacherId: me?.id ?? '', level: tt.levels.length ? '' : '-', from: tt.dateRange?.from ?? '', to: tt.dateRange?.to ?? '' });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmPending = () => {
    if (!pending) return;
    const level = pending.level === '-' ? null : pending.level;
    const courses = teacherCourses(pending.tt, pending.teacherId, level);
    if (courses.length === 0) { setError('Giáo viên này không có tiết nào trong TKB — chọn lại tên.'); return; }
    saveTimetable({
      id: pending.tt.id || `tt-${Date.now()}`, link: pending.link, title: pending.tt.title, from: pending.from, to: pending.to, level,
      teacherId: pending.teacherId, teacherName: pending.tt.teachers.find((t) => t.id === pending.teacherId)?.name ?? '',
      courses, periods: numberedPeriods(pending.tt, level),
    });
    showToast(`Đã thêm TKB — ${courses.length} lớp/môn của cô.`, 'success');
    setPending(null);
    setLink('');
  };

  const confirmManual = () => {
    if (!manual) return;
    const courses = manualCourses(manual.rows);
    if (!manual.from || !manual.to || manual.from > manual.to) { setError('Chọn ngày bắt đầu và kết thúc của TKB.'); return; }
    if (courses.length === 0) { setError('Nhập ít nhất một tiết có tên lớp và môn.'); return; }
    saveTimetable({ id: `manual-${Date.now()}`, link: '', title: `TKB tự nhập ${vnDate(manual.from)} – ${vnDate(manual.to)}`, from: manual.from, to: manual.to, level: null, teacherId: '', teacherName: userName ?? '', courses, periods: periodsFromCourses(courses) });
    setManual(null);
    setError('');
  };

  const sortedTeachers = pending ? [...pending.tt.teachers].sort((a, b) => a.name.localeCompare(b.name, 'vi')) : [];
  const setRow = (i: number, p: Partial<ManualRow>) => manual && setManual({ ...manual, rows: manual.rows.map((r, k) => (k === i ? { ...r, ...p } : r)) });

  return (
    <Card icon={Table2} title="Thời khoá biểu"
      desc="Mỗi giai đoạn (quý/học kỳ) một TKB, kèm khoảng ngày áp dụng. TKB đổi giữa chừng thì thêm bản mới với ngày bắt đầu mới.">
      {plan.timetables.length > 0 && (
        <ul className="space-y-2">
          {plan.timetables.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2 text-sm">
              <div className="min-w-[12rem] flex-1">
                <div className="font-bold text-slate-800">{t.title}</div>
                <div className="text-xs text-slate-500">{t.teacherName}{t.level ? ` · giờ ${t.level}` : ''} · {t.courses.length} lớp/môn</div>
              </div>
              <input type="date" className={small} value={t.from} onChange={(e) => e.target.value && saveTimetable({ ...t, from: e.target.value })} />
              <span className="text-slate-400">→</span>
              <input type="date" className={small} value={t.to} min={t.from} onChange={(e) => e.target.value && saveTimetable({ ...t, to: e.target.value })} />
              <button type="button" aria-label="Xoá TKB" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                onClick={() => window.confirm('Xoá TKB này khỏi bộ lịch?') && onChange({ timetables: plan.timetables.filter((x) => x.id !== t.id) })}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!pending && !manual && (
        <div className="flex flex-wrap gap-2">
          <div className="flex min-w-[16rem] flex-1 gap-1">
            <input className={`${input} flex-1`} value={link} onChange={(e) => setLink(e.target.value)} placeholder="Dán link TKB Prime Timetable" />
            <button type="button" className={btnPrimary} disabled={busy || !link.trim()} onClick={() => void loadLink()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />} Tải
            </button>
          </div>
          <button type="button" className={btn} onClick={() => { setError(''); setManual({ from: '', to: '', rows: [{ ...EMPTY_ROW }] }); }}><Plus className="h-4 w-4" /> Tự nhập TKB</button>
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}

      {pending && (
        <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
          <p className="text-sm font-bold text-slate-800">{pending.tt.title}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-600">Cô/thầy là
              <select className={`${input} mt-1 w-full`} value={pending.teacherId} onChange={(e) => setPending({ ...pending, teacherId: e.target.value })}>
                <option value="">— Chọn tên trong TKB —</option>
                {sortedTeachers.map((t) => <option key={t.id} value={t.id}>{t.name}{t.email ? ` (${t.email})` : ''}</option>)}
              </select>
            </label>
            {pending.tt.levels.length > 0 && (
              <label className="text-sm font-semibold text-slate-600">Lấy giờ học của cấp
                <select className={`${input} mt-1 w-full`} value={pending.level} onChange={(e) => setPending({ ...pending, level: e.target.value })}>
                  <option value="">— Chọn cấp —</option>
                  {pending.tt.levels.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
            )}
            <label className="text-sm font-semibold text-slate-600">Áp dụng từ
              <input type="date" className={`${input} mt-1 w-full`} value={pending.from} onChange={(e) => setPending({ ...pending, from: e.target.value })} />
            </label>
            <label className="text-sm font-semibold text-slate-600">đến
              <input type="date" className={`${input} mt-1 w-full`} value={pending.to} min={pending.from} onChange={(e) => setPending({ ...pending, to: e.target.value })} />
            </label>
          </div>
          {pending.teacherId && pending.level && (
            <ul className="text-sm text-slate-600">
              {teacherCourses(pending.tt, pending.teacherId, pending.level === '-' ? null : pending.level).map((c) => (
                <li key={c.key}>• {c.classNames.join(' + ')} — {c.subject}: {c.slots.map((s) => `${dayName(s.day)} ${s.start}`).join(', ')}</li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <button type="button" className={btnPrimary} disabled={!pending.teacherId || !pending.level || !pending.from || !pending.to || pending.from > pending.to} onClick={confirmPending}>Thêm TKB này</button>
            <button type="button" className={btn} onClick={() => setPending(null)}>Huỷ</button>
          </div>
        </div>
      )}

      {manual && (
        <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600">
            Áp dụng từ <input type="date" className={small} value={manual.from} onChange={(e) => setManual({ ...manual, from: e.target.value })} />
            đến <input type="date" className={small} value={manual.to} min={manual.from} onChange={(e) => setManual({ ...manual, to: e.target.value })} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-600"><tr><th className="px-1">Thứ</th><th className="px-1">Tiết</th><th className="px-1">Bắt đầu</th><th className="px-1">Kết thúc</th><th className="px-1">Lớp</th><th className="px-1">Môn</th><th /></tr></thead>
              <tbody>
                {manual.rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-1 py-1"><select className={small} value={r.day} onChange={(e) => setRow(i, { day: Number(e.target.value) })}>{[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{dayName(d)}</option>)}</select></td>
                    <td className="px-1 py-1"><input className={`${small} w-14`} value={r.periodNo} onChange={(e) => setRow(i, { periodNo: e.target.value })} /></td>
                    <td className="px-1 py-1"><input type="time" className={small} value={r.start} onChange={(e) => setRow(i, { start: e.target.value })} /></td>
                    <td className="px-1 py-1"><input type="time" className={small} value={r.end} onChange={(e) => setRow(i, { end: e.target.value })} /></td>
                    <td className="px-1 py-1"><input className={`${small} w-28`} value={r.className} onChange={(e) => setRow(i, { className: e.target.value })} placeholder="10A1" /></td>
                    <td className="px-1 py-1"><input className={`${small} w-28`} value={r.subject} onChange={(e) => setRow(i, { subject: e.target.value })} placeholder="Toán" /></td>
                    <td className="px-1 py-1"><button type="button" aria-label="Xoá dòng" className="rounded-lg p-2 text-slate-400 hover:text-rose-600" onClick={() => setManual({ ...manual, rows: manual.rows.filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => setManual({ ...manual, rows: [...manual.rows, { ...(manual.rows.at(-1) ?? EMPTY_ROW) }] })}><Plus className="h-4 w-4" /> Thêm tiết</button>
            <button type="button" className={btnPrimary} onClick={confirmManual}>Lưu TKB</button>
            <button type="button" className={btn} onClick={() => setManual(null)}>Huỷ</button>
          </div>
        </div>
      )}
    </Card>
  );
};
