import { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { deleteStudentAiKey, saveStudentAiKey, type StudentAiKeyView } from '../../../../services/studentPortalApi';

const gio = (iso: string | null): string => {
  const at = Date.parse(iso || '');
  return Number.isFinite(at) ? new Date(at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
};

/** Một câu cho em biết bài của mình đang chấm bằng khoá nào — thuần, để test. */
export const studentKeyStatusText = (view: StudentAiKeyView | null): string => {
  if (!view || !view.hasKey) return 'Em chưa có khoá — bài của em đang được chấm bằng khoá của thầy cô.';
  if (view.usable) return `Đang dùng khoá của em (…${view.last4}). AI chấm bài, soạn bài luyện cho em tính vào hạn mức khoá của em.`;
  if (view.keyStatus === 'invalid') return 'Google từ chối khoá của em — bài đang được chấm bằng khoá của thầy cô. Em lấy khoá mới rồi bấm "Thay khoá".';
  const at = gio(view.retryAt);
  return `Khoá của em hết hạn mức — trong lúc đó bài được chấm bằng khoá của thầy cô${at ? `; máy thử lại khoá của em lúc ${at}` : ''}.`;
};

/**
 * Học sinh tự nhập khoá Gemini lấy bằng Gmail của mình. Có khoá dùng được thì mọi lượt AI của em chạy bằng khoá đó;
 * không có hoặc khoá lỗi / hết hạn mức thì máy tự chấm bằng khoá của thầy cô — em không phải làm gì thêm.
 */
export const StudentAiKeySection = ({ view, onChange }: { view: StudentAiKeyView | null; onChange: (next: StudentAiKeyView) => void }) => {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (work: () => Promise<StudentAiKeyView>) => {
    setBusy(true);
    setError('');
    try {
      onChange(await work());
      setKey('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Chưa lưu được khoá. Thử lại sau ít phút.');
    } finally {
      setBusy(false);
    }
  };

  const tot = Boolean(view?.hasKey && view.usable);
  return (
    <section aria-label="Khoá AI của em" className={`mt-3 rounded-2xl p-3 ring-1 ${tot ? 'bg-emerald-50 ring-emerald-200' : 'bg-indigo-50 ring-indigo-100'}`}>
      <p className="flex items-center gap-1.5 text-sm font-black text-slate-900"><KeyRound className="h-4 w-4" /> Khoá AI của em</p>
      <p className={`mt-1 text-xs font-bold leading-5 ${tot ? 'text-emerald-800' : 'text-slate-700'}`} role="status">{studentKeyStatusText(view)}</p>
      <form
        className="mt-2 flex flex-wrap gap-2"
        onSubmit={event => { event.preventDefault(); if (key.trim()) void run(() => saveStudentAiKey(key.trim())); }}
      >
        <input
          type="password"
          autoComplete="off"
          value={key}
          onChange={event => setKey(event.target.value)}
          placeholder="Dán khoá AIza…"
          aria-label="Khoá Gemini của em"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
        />
        <button type="submit" disabled={busy || !key.trim()} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-black text-white disabled:opacity-40">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{view?.hasKey ? 'Thay khoá' : 'Lưu khoá'}
        </button>
        {view?.hasKey && (
          <button type="button" disabled={busy} onClick={() => void run(deleteStudentAiKey)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 disabled:opacity-40">
            Gỡ khoá
          </button>
        )}
      </form>
      {error && <p className="mt-1 text-xs font-bold text-red-700">{error}</p>}
      <p className="mt-2 text-[11px] font-semibold leading-4 text-slate-500">
        Lấy khoá miễn phí: vào <b>aistudio.google.com/apikey</b> bằng Gmail của em → <b>Create API key</b> → dán vào đây.
        Khoá chỉ lưu trên máy chủ, không hiện lại. Nội dung gửi qua gói miễn phí của Google có thể được Google dùng để cải thiện sản phẩm.
      </p>
    </section>
  );
};
