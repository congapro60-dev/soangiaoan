import { useState } from 'react';
import { ClipboardPaste } from 'lucide-react';
import { keyRestUntil, MAX_OWN_GEMINI_KEYS, normalizeKeys, splitPastedKeys } from '../../../lib/geminiKeyRing';

const hhmm = (ms: number): string => new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

/** Trạng thái một khoá trong kho: sẵn sàng, hay đang nghỉ (hết hạn mức / lỗi) tới giờ nào. */
export const KeyStatusChip = ({ value }: { value: string }) => {
  if (!value.trim()) return null;
  const until = keyRestUntil(value);
  return until
    ? <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700" title="Khoá vừa hết hạn mức hoặc bị từ chối; web tạm bỏ qua rồi tự thử lại.">Nghỉ tới {hhmm(until)}</span>
    : <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">Sẵn sàng</span>;
};

/** Đếm trên kho: "3 sẵn sàng · 1 đang nghỉ". */
export const KeyPoolSummary = ({ rows }: { rows: readonly string[] }) => {
  const keys = normalizeKeys(rows);
  if (keys.length === 0) return null;
  const resting = keys.filter(key => keyRestUntil(key) > 0).length;
  return (
    <span className="flex gap-1.5 text-[11px] font-black">
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">{keys.length - resting} sẵn sàng</span>
      {resting > 0 && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">{resting} đang nghỉ</span>}
    </span>
  );
};

/** Dán nhiều khoá một lần (mỗi dòng một khoá, hoặc ngăn bằng dấu phẩy); gộp vào kho, bỏ trùng, cắt ở trần. */
export const BulkPasteKeys = ({ rows, onChange, label }: { rows: readonly string[]; onChange: (rows: string[]) => void; label: string }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const pasted = splitPastedKeys(text);
  const apply = () => {
    const merged = normalizeKeys([...rows, ...pasted]);
    onChange(merged.length > 0 ? merged : ['']);
    setText('');
    setOpen(false);
  };
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-[var(--dewey-blue)] hover:text-[var(--dewey-blue)]">
        <ClipboardPaste className="h-3.5 w-3.5" /> Dán nhiều khoá {label}
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <textarea
        value={text}
        onChange={event => setText(event.target.value)}
        rows={4}
        autoComplete="off"
        spellCheck={false}
        placeholder={`Dán ${label} API key — mỗi dòng một khoá, hoặc ngăn bằng dấu phẩy (tối đa ${MAX_OWN_GEMINI_KEYS} khoá)`}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-[var(--dewey-blue)]"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-500">{pasted.length} khoá hợp lệ</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => { setText(''); setOpen(false); }} className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-white">Huỷ</button>
          <button type="button" disabled={pasted.length === 0} onClick={apply} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">Thêm vào kho</button>
        </div>
      </div>
    </div>
  );
};
