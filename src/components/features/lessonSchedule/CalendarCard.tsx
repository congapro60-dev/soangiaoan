import { useRef, useState } from 'react';
import { CalendarDays, Loader2, Plus, Sparkles, Trash2, Upload } from 'lucide-react';
import type { AppData } from '../../../types';
import { callAI } from '../../../lib/aiProviders';
import { buildCalendarPrompt, CALENDAR_KIND_LABELS, MAX_CALENDAR_CHARS, parseCalendarResponse, type CalendarEvent, type CalendarEventKind } from '../../../lib/schedule/calendarImport';
import { parseGoogleLink } from '../../../lib/schedule/googleLink';
import { readFileText, readGoogleLinkText } from '../../../lib/schedule/sourceText';
import { CALENDAR_SHEET_HINT } from '../../../lib/schedule/sheetText';

const HINT = { sheetHint: CALENDAR_SHEET_HINT, budget: MAX_CALENDAR_CHARS };
import { Card, Notice, btn, btnPrimary, errorText, input, small, todayIso, vnDate, type ShowToast } from './ui';

interface Props {
  events: CalendarEvent[];
  sourceName: string;
  settings: AppData['settings'];
  onChange: (events: CalendarEvent[], sourceName: string) => void;
  /** Lịch có đánh số tuần → gợi ý ngày bắt đầu tuần 1 cho bộ lịch đang mở. */
  onSuggestWeek1: (monday: string) => void;
  showToast: ShowToast;
}

const KINDS = Object.keys(CALENDAR_KIND_LABELS) as CalendarEventKind[];

export const CalendarCard = ({ events, sourceName, settings, onChange, onSuggestWeek1, showToast }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [week1, setWeek1] = useState<string | null>(null);
  const [open, setOpen] = useState(events.length === 0);

  const readWithAi = async (getText: () => Promise<{ name: string; text: string }>) => {
    setError('');
    setWeek1(null);
    setBusy('Đang đọc tài liệu…');
    try {
      const { name, text } = await getText();
      if (!text.trim()) throw new Error('Tài liệu trống hoặc không có chữ đọc được.');
      setBusy('AI đang tìm các ngày nghỉ…');
      const result = parseCalendarResponse(await callAI(buildCalendarPrompt(text), settings));
      if (result.events.length === 0) throw new Error('AI không tìm thấy ngày nào trong tài liệu — kiểm tra lại file/tab, hoặc tự thêm ngày nghỉ bên dưới.');
      onChange(result.events, name);
      setWeek1(result.week1Monday);
      setOpen(true);
      showToast(`Đã đọc ${result.events.length} mục — cô soát lại trước khi dùng.`, 'success');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy('');
    }
  };

  const onPickLink = () => {
    const g = parseGoogleLink(link);
    if (!g) { setError('Link chưa đúng — dán link Google Sheet, Google Docs hoặc file trên Google Drive.'); return; }
    void readWithAi(() => readGoogleLinkText(g, HINT));
  };

  const patch = (i: number, p: Partial<CalendarEvent>) =>
    onChange(events.map((e, k) => (k === i ? { ...e, ...p, ...(p.from && p.from > e.to ? { to: p.from } : {}) } : e)), sourceName);

  const applied = events.filter((e) => e.applied).length;

  return (
    <Card icon={CalendarDays} title="Lịch năm học"
      desc="Dùng chung cho mọi bộ lịch: những ngày học sinh nghỉ sẽ không xếp tiết. Tải file bất kỳ (Excel, Word, PDF) hoặc dán link Google."
      right={events.length > 0 ? <button type="button" className={btn} onClick={() => setOpen(!open)}>{open ? 'Thu gọn' : `Xem ${events.length} mục`}</button> : undefined}>
      <div className="flex flex-wrap gap-2">
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.ods,.docx,.pdf,.txt" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void readWithAi(async () => ({ name: f.name, text: await readFileText(f, HINT) })); e.target.value = ''; }} />
        <button type="button" className={btn} disabled={!!busy} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Tải file lịch</button>
        <div className="flex min-w-[16rem] flex-1 gap-1">
          <input className={`${input} flex-1`} value={link} onChange={(e) => setLink(e.target.value)} placeholder="…hoặc dán link Google Sheet / Docs / Drive" />
          <button type="button" className={btnPrimary} disabled={!!busy || !link.trim()} onClick={onPickLink}><Sparkles className="h-4 w-4" /> Đọc</button>
        </div>
      </div>
      {busy && <p className="flex items-center gap-2 text-sm font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> {busy}</p>}
      {error && <Notice tone="error">{error}</Notice>}
      {sourceName && <p className="text-xs font-semibold text-slate-500">Nguồn: {sourceName} · {applied} mục đang tính là ngày nghỉ</p>}
      {week1 && (
        <Notice>
          Lịch ghi tuần 1 bắt đầu thứ Hai {vnDate(week1)}.{' '}
          <button type="button" className="underline" onClick={() => { onSuggestWeek1(week1); setWeek1(null); }}>Dùng cho bộ lịch đang mở</button>
        </Notice>
      )}

      {open && (
        <div className="space-y-2">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-2 py-2" title="Tính là ngày học sinh nghỉ (không xếp tiết)">Nghỉ?</th>
                  <th className="px-2 py-2">Từ</th>
                  <th className="px-2 py-2">Đến</th>
                  <th className="px-2 py-2">Loại</th>
                  <th className="px-2 py-2">Ghi chú</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={`${e.from}-${i}`} className="border-t border-slate-100">
                    <td className="px-2 py-1"><input type="checkbox" checked={e.applied} onChange={(ev) => patch(i, { applied: ev.target.checked })} /></td>
                    <td className="px-2 py-1"><input type="date" className={small} value={e.from} onChange={(ev) => ev.target.value && patch(i, { from: ev.target.value })} /></td>
                    <td className="px-2 py-1"><input type="date" className={small} value={e.to} min={e.from} onChange={(ev) => ev.target.value && patch(i, { to: ev.target.value })} /></td>
                    <td className="px-2 py-1">
                      <select className={small} value={e.kind} onChange={(ev) => patch(i, { kind: ev.target.value as CalendarEventKind })}>
                        {KINDS.map((k) => <option key={k} value={k}>{CALENDAR_KIND_LABELS[k]}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1"><input className={`${small} w-full min-w-[14rem]`} value={e.note} onChange={(ev) => patch(i, { note: ev.target.value })} /></td>
                    <td className="px-2 py-1">
                      <button type="button" aria-label="Xoá" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => onChange(events.filter((_, k) => k !== i), sourceName)}><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className={btn} onClick={() => {
            const d = todayIso();
            const added: CalendarEvent = { from: d, to: d, kind: 'nghi', note: '', applied: true };
            onChange([...events, added].sort((a, b) => a.from.localeCompare(b.from)), sourceName);
          }}><Plus className="h-4 w-4" /> Thêm ngày nghỉ</button>
        </div>
      )}
    </Card>
  );
};
