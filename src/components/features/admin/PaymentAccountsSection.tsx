import { useEffect, useState } from 'react';
import { ImagePlus, Landmark, Loader2, Pencil, Trash2 } from 'lucide-react';
import {
  adminActivatePaymentAccount, adminDeletePaymentAccount, adminGetPaymentAccounts, adminSavePaymentAccount,
  type AdminPaymentSettings, type PaymentAccount,
} from '../../../lib/ai/aiBillingApi';
import { SEPAY_BANKS } from '../../../lib/admin/aiWallet';
import { nenAnhBaiLam } from '../../../utils/imageCompress';

const WEBHOOK_URL = 'https://giaoandewey.vercel.app/api/classroom?hook=sepay';
const QR_MAX_BYTES = 1_500_000;

const card = 'rounded-3xl border border-slate-100 bg-white p-5 shadow-sm';
const input = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400';
const btn = 'inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50';
const btnGhost = 'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-black text-slate-500 hover:bg-slate-100 disabled:opacity-50';

type Form = Pick<PaymentAccount, 'id' | 'bank' | 'accountNumber' | 'accountName'>;
const EMPTY_FORM: Form = { id: '', bank: '', accountNumber: '', accountName: '' };

/**
 * Mục 7 Quản trị: các tài khoản nhận tiền nạp (chủ dự án có nhiều tài khoản) — mỗi tài khoản có thể kèm ảnh QR
 * tự tải lên; chọn MỘT tài khoản đang dùng để giáo viên chuyển khoản. Kèm trạng thái webhook SePay.
 */
export const PaymentAccountsSection = () => {
  const [settings, setSettings] = useState<AdminPaymentSettings | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [removeQr, setRemoveQr] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    adminGetPaymentAccounts().then(setSettings).catch(err => setError(err instanceof Error ? err.message : 'Không tải được tài khoản nhận tiền.'));
  }, []);

  const run = async (key: string, task: () => Promise<AdminPaymentSettings>, done: string) => {
    setBusy(key);
    setError('');
    setNotice('');
    try {
      setSettings(await task());
      setNotice(done);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thao tác thất bại.');
      return false;
    } finally {
      setBusy('');
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setQrDataUrl('');
    setRemoveQr(false);
  };

  const pickQr = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    try {
      const dataUrl = await nenAnhBaiLam(file);
      if (!/^data:image\/(png|jpeg|webp);base64,/.test(dataUrl)) throw new Error('Ảnh QR phải là PNG, JPG hoặc WEBP.');
      if (dataUrl.length * 0.75 > QR_MAX_BYTES) throw new Error('Ảnh QR quá nặng (tối đa 1,5MB) — chụp màn hình mã QR rồi tải lại.');
      setQrDataUrl(dataUrl);
      setRemoveQr(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đọc được ảnh.');
    }
  };

  if (!settings) {
    return (
      <section className={card}>
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800"><Landmark className="h-4 w-4" /> 7. Tài khoản nhận tiền nạp</h2>
        {error ? <p className="mt-2 text-sm font-semibold text-rose-700">{error}</p> : <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải…</p>}
      </section>
    );
  }

  const editing = settings.accounts.find(a => a.id === form.id);
  const qrPreview = qrDataUrl || (removeQr ? '' : editing?.qrImageUrl ?? '');

  return (
    <section className={card}>
      <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800"><Landmark className="h-4 w-4" /> 7. Tài khoản nhận tiền nạp</h2>
      <p className="mt-1 text-xs font-semibold text-slate-500">
        Lưu được nhiều tài khoản; giáo viên chuyển khoản vào tài khoản <b>đang dùng</b>. Chỉ dùng tài khoản <b>đã liên kết trong SePay</b> — SePay thấy tiền về thì web mới tự cộng ví.
      </p>
      {error && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
      {notice && <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{notice}</p>}

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          {settings.accounts.length === 0 && <p className="rounded-2xl bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-500">Chưa có tài khoản nào — giáo viên chưa nạp tiền được.</p>}
          {settings.accounts.map(account => {
            const active = account.id === settings.activeId;
            return (
              <div key={account.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${active ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200'}`}>
                {account.qrImageUrl
                  ? <img src={account.qrImageUrl} alt="Ảnh QR" className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 bg-white object-contain" />
                  : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-200 text-[10px] font-bold text-slate-400">Chưa có ảnh</div>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-800">{account.bank} · {account.accountNumber}</p>
                  <p className="truncate text-xs font-semibold text-slate-500">{account.accountName || '—'}</p>
                  {active
                    ? <span className="mt-1 inline-block rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">Đang dùng</span>
                    : <button type="button" disabled={Boolean(busy)} className="mt-1 text-xs font-black text-indigo-600 hover:underline disabled:opacity-50"
                      onClick={() => void run('activate', () => adminActivatePaymentAccount(account.id), `Giáo viên sẽ nạp vào ${account.bank} · ${account.accountNumber}.`)}>Dùng tài khoản này</button>}
                </div>
                <button type="button" disabled={Boolean(busy)} className={btnGhost} onClick={() => { setForm({ id: account.id, bank: account.bank, accountNumber: account.accountNumber, accountName: account.accountName }); setQrDataUrl(''); setRemoveQr(false); }}>
                  <Pencil className="h-3.5 w-3.5" /> Sửa
                </button>
                <button type="button" disabled={Boolean(busy)} className={btnGhost} onClick={() => {
                  if (window.confirm(`Xoá tài khoản ${account.bank} · ${account.accountNumber}?`)) {
                    void run('delete', () => adminDeletePaymentAccount(account.id), 'Đã xoá tài khoản.').then(ok => { if (ok && form.id === account.id) resetForm(); });
                  }
                }}>
                  <Trash2 className="h-3.5 w-3.5" /> Xoá
                </button>
              </div>
            );
          })}

          <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-700">{editing ? `Sửa tài khoản ${editing.bank} · ${editing.accountNumber}` : 'Thêm tài khoản'}</p>
            <input className={`${input} w-full`} list="sepay-bank-list" placeholder="Ngân hàng (tên như trong SePay, vd MBBank)" value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })} />
            <datalist id="sepay-bank-list">{SEPAY_BANKS.map(bank => <option key={bank} value={bank} />)}</datalist>
            <input className={`${input} w-full`} inputMode="numeric" placeholder="Số tài khoản" value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} />
            <input className={`${input} w-full`} placeholder="Tên chủ tài khoản" value={form.accountName} onChange={e => setForm({ ...form, accountName: e.target.value })} />
            <div className="flex flex-wrap items-center gap-3">
              {qrPreview && <img src={qrPreview} alt="Ảnh QR sẽ lưu" className="h-20 w-20 rounded-lg border border-slate-200 bg-white object-contain" />}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">
                <ImagePlus className="h-4 w-4" /> {qrPreview ? 'Đổi ảnh QR' : 'Tải ảnh QR của tài khoản (không bắt buộc)'}
                <input type="file" accept="image/*" className="hidden" onChange={event => { void pickQr(event.target.files?.[0]); event.target.value = ''; }} />
              </label>
              {qrPreview && <button type="button" className={btnGhost} onClick={() => { setQrDataUrl(''); setRemoveQr(true); }}>Bỏ ảnh</button>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={Boolean(busy)} className={btn} onClick={() => void run(
                'save',
                () => adminSavePaymentAccount(form, { dataUrl: qrDataUrl || undefined, remove: removeQr }),
                editing ? 'Đã lưu thay đổi.' : 'Đã thêm tài khoản.',
              ).then(ok => { if (ok) resetForm(); })}>
                {busy === 'save' && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? 'Lưu thay đổi' : 'Thêm tài khoản'}
              </button>
              {editing && <button type="button" className={btnGhost} onClick={resetForm}>Huỷ sửa</button>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">
          <p className={settings.webhookReady ? 'font-black text-emerald-700' : 'font-black text-amber-700'}>
            {settings.webhookReady ? '✓ Máy chủ đã có khoá webhook — tiền nạp được cộng tự động.' : '⚠ Chưa có biến SEPAY_WEBHOOK_KEY trên Vercel — tiền nạp CHƯA tự cộng.'}
          </p>
          <p className="mt-2 font-black text-slate-700">Thầy/cô tự làm (một lần):</p>
          <ol className="ml-4 list-decimal">
            <li>SePay → Tích hợp WebHooks → Thêm: sự kiện <b>Có tiền vào</b>, chọn các tài khoản trên, URL <code className="break-all">{WEBHOOK_URL}</code>, kiểu chứng thực <b>API Key</b> (tự đặt một chuỗi bí mật dài).</li>
            <li>Vercel → Settings → Environment Variables: <code>SEPAY_WEBHOOK_KEY</code> = đúng chuỗi bí mật vừa đặt ở SePay, rồi Redeploy.</li>
          </ol>
          <p className="mt-2">Mã QR giáo viên thấy do web tự tạo, điền sẵn số tiền + nội dung (mã nạp SPAI…) nên tiền về là tự cộng đúng ví. Ảnh QR thầy/cô tải lên là phương án dự phòng: giáo viên quét ảnh đó phải tự gõ số tiền + nội dung. Chuyển thiếu mã → nằm ở mục “Giao dịch chưa khớp” để gán tay.</p>
        </div>
      </div>
    </section>
  );
};
