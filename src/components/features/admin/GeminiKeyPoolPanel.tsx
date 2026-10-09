import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2, Trash2 } from 'lucide-react';
import { adminDeleteGeminiKey, adminGetGeminiKeys, adminSaveGeminiKey, type AdminGeminiKeys } from '../../../lib/ai/aiBillingApi';
import type { PoolKeyView } from '../../../lib/admin/geminiKeyPool';

const card = 'rounded-3xl border border-slate-100 bg-white p-5 shadow-sm';
const input = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400';
const btn = 'inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50';
const btnGhost = 'inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50';

const hhmm = (iso: string): string => new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

const statusOf = (key: PoolKeyView): { label: string; className: string } => {
  if (!key.enabled) return { label: 'Đang tắt', className: 'bg-slate-100 text-slate-600' };
  if (key.status === 'invalid') return { label: 'Khoá hỏng — không dùng', className: 'bg-red-50 text-red-700' };
  const resumes = Object.values(key.cooldowns).sort().pop();
  if (resumes) return { label: `Nghỉ tới ${hhmm(resumes)}`, className: 'bg-amber-50 text-amber-800' };
  return { label: 'Sẵn sàng', className: 'bg-emerald-50 text-emerald-700' };
};

/**
 * Danh sách nhiều khoá Gemini của chủ dự án. Khoá chung được dùng theo thứ tự: khoá "miễn phí" → khoá "trả phí" → khoá ở
 * biến môi trường (chốt cuối). Khoá hết hạn mức tự nghỉ rồi quay lại. Số tiền trừ ví của giáo viên KHÔNG đổi theo khoá nào phục vụ.
 */
export const GeminiKeyPoolPanel = () => {
  const [data, setData] = useState<AdminGeminiKeys | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ label: '', key: '', tier: 'free' as 'free' | 'paid' });

  const run = useCallback(async (name: string, work: () => Promise<AdminGeminiKeys>): Promise<boolean> => {
    setBusy(name);
    setError('');
    try {
      setData(await work());
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thực hiện được.');
      return false;
    } finally {
      setBusy('');
    }
  }, []);

  useEffect(() => { void run('load', adminGetGeminiKeys); }, [run]);

  const save = (key: PoolKeyView, patch: Partial<{ label: string; tier: 'free' | 'paid'; enabled: boolean; clearStatus: boolean }>) =>
    run(key.id, () => adminSaveGeminiKey({ id: key.id, label: key.label, tier: key.tier, enabled: key.enabled, ...patch }));

  return (
    <section className={card}>
      <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800"><KeyRound className="h-4 w-4" /> Nhiều khoá Gemini</h2>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
        Thêm các khoá Gemini API (từ Google AI Studio) của thầy. Khi AI chạy bằng khoá chung, web dùng khoá <b>miễn phí</b> trước, hết thì sang khoá <b>trả phí</b>,
        cuối cùng là khoá đặt sẵn trên máy chủ{data && !data.envKeyConfigured ? ' (CHƯA đặt — hết khoá trong danh sách là AI dừng)' : ''}. Khoá bị Google báo hết hạn mức sẽ tự nghỉ rồi quay lại.
        Số tiền trừ ví của giáo viên vẫn tính theo giá gốc như cũ, không đổi theo khoá nào phục vụ.
      </p>
      <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-900">
        Chỉ đặt "miễn phí" cho khoá thuộc dự án Google CHƯA gắn thanh toán. Theo điều khoản của Google, nội dung gửi qua gói miễn phí có thể được Google dùng để cải thiện sản phẩm —
        ảnh bài làm của học sinh sẽ đi qua các khoá này. Thầy tự cân nhắc và tự kiểm điều khoản về việc dùng nhiều tài khoản/dự án trước khi thêm.
      </p>

      {error && <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-xs font-bold text-red-800" role="alert">{error}</p>}

      {!data ? (
        <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải…</p>
      ) : (
        <div className="mt-3 space-y-2">
          {data.keys.length === 0 && <p className="text-xs font-semibold text-slate-500">Chưa có khoá nào trong danh sách — AI đang chạy bằng khoá đặt sẵn trên máy chủ.</p>}
          {data.keys.map(key => {
            const status = statusOf(key);
            const working = busy === key.id;
            return (
              <div key={key.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-800">{key.label || 'Khoá không tên'} <span className="font-mono text-xs font-semibold text-slate-400">…{key.last4}</span></p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-black ${status.className}`} title={key.statusMessage}>{status.label}</span>
                </div>
                <select
                  className={input}
                  value={key.tier}
                  disabled={working}
                  aria-label={`Hạng khoá ${key.label || key.last4}`}
                  onChange={event => void save(key, { tier: event.target.value === 'paid' ? 'paid' : 'free' })}
                >
                  <option value="free">Miễn phí</option>
                  <option value="paid">Trả phí</option>
                </select>
                <button type="button" disabled={working} className={btnGhost} onClick={() => void save(key, { enabled: !key.enabled })}>{key.enabled ? 'Tắt' : 'Bật'}</button>
                {(key.status !== 'ok' || Object.keys(key.cooldowns).length > 0) && (
                  <button type="button" disabled={working} className={btnGhost} onClick={() => void save(key, { clearStatus: true, enabled: true })}>Dùng lại ngay</button>
                )}
                <button
                  type="button"
                  disabled={working}
                  className={btnGhost}
                  aria-label={`Xoá khoá ${key.label || key.last4}`}
                  onClick={() => { if (window.confirm('Xoá khoá này khỏi danh sách?')) void run(key.id, () => adminDeleteGeminiKey(key.id)); }}
                >
                  {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            );
          })}

          {data.keys.length < data.maxKeys && (
            <form
              className="flex flex-wrap items-end gap-2 pt-2"
              onSubmit={event => {
                event.preventDefault();
                void run('add', () => adminSaveGeminiKey({ key: form.key, label: form.label, tier: form.tier, enabled: true }))
                  .then(ok => { if (ok) setForm(prev => ({ ...prev, key: '', label: '' })); });
              }}
            >
              <label className="text-xs font-black text-slate-500">Tên gợi nhớ<input className={`${input} mt-1 block w-40`} value={form.label} onChange={event => setForm(prev => ({ ...prev, label: event.target.value }))} placeholder="VD: TK Pro 1" /></label>
              <label className="text-xs font-black text-slate-500">Khoá Gemini<input className={`${input} mt-1 block w-64`} type="password" autoComplete="off" value={form.key} onChange={event => setForm(prev => ({ ...prev, key: event.target.value }))} placeholder="AIza…" /></label>
              <label className="text-xs font-black text-slate-500">Hạng
                <select className={`${input} mt-1 block`} value={form.tier} onChange={event => setForm(prev => ({ ...prev, tier: event.target.value === 'paid' ? 'paid' : 'free' }))}>
                  <option value="free">Miễn phí</option>
                  <option value="paid">Trả phí</option>
                </select>
              </label>
              <button type="submit" disabled={busy !== '' || !form.key.trim()} className={btn}>{busy === 'add' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Thêm &amp; thử khoá</button>
            </form>
          )}
        </div>
      )}
    </section>
  );
};
