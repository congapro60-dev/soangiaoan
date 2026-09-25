import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgePercent, KeyRound, Landmark, Loader2, ReceiptText, Wallet } from 'lucide-react';
import {
  adminAdjustWallet, adminAssignUnmatchedTopup, adminAssignVoucher, adminGetAiAccess, adminGetStatement, adminGetVouchers,
  adminGetWallets, adminMonthOverview, adminPaymentAccount, adminSaveAiAccess, adminSaveVoucher,
  type AdminAiAccess, type AdminWalletRow, type MonthOverviewRow, type PaymentAccount, type UnmatchedTopup,
} from '../../../lib/ai/aiBillingApi';
import { VOUCHER_MAX_PERCENT, VOUCHER_MIN_PERCENT, type VoucherDef } from '../../../lib/admin/aiWallet';
import { monthLabel, vnd } from '../../../lib/ai/statementPrintDoc';
import { AiStatementView } from '../aiBilling/AiStatementView';

interface Teacher {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}

/** Nhóm dùng khoá chung không tính tiền mà chủ dự án đã chốt (chủ dự án luôn được máy chủ tự thêm). */
const DEFAULT_GROUP = ['hanh.nguyenthi01@thedeweyschools.edu.vn', 'van.vucam@thedeweyschools.edu.vn', 'hong.tranminh@thedeweyschools.edu.vn'];
const WEBHOOK_URL = 'https://giaoandewey.vercel.app/api/classroom?hook=sepay';

const card = 'rounded-3xl border border-slate-100 bg-white p-5 shadow-sm';
const input = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400';
const btn = 'inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50';
const btnGhost = 'inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50';

const vnMonth = (): string => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 7);
const today = (): string => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const parseEmails = (text: string): string[] => text.split(/[\s,;]+/).map(e => e.trim().toLowerCase()).filter(Boolean);

/**
 * Quản trị ví AI: ai dùng khoá chung miễn phí, tài khoản nhận tiền (SePay), mã giảm giá, số dư từng giáo viên
 * (điều chỉnh có lý do — hiện trên sao kê của họ), giao dịch chưa khớp mã và sao kê tháng của từng người.
 */
export const AiBillingAdminPanel = ({ teachers }: { teachers: Teacher[] }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [access, setAccess] = useState<AdminAiAccess | null>(null);
  const [groupText, setGroupText] = useState('');
  const [payment, setPayment] = useState<{ account: PaymentAccount | null; webhookReady: boolean } | null>(null);
  const [accountForm, setAccountForm] = useState<PaymentAccount>({ bank: '', accountNumber: '', accountName: '' });
  const [vouchers, setVouchers] = useState<Array<VoucherDef & { createdAt?: string }>>([]);
  const [voucherForm, setVoucherForm] = useState({ code: '', percent: '100', validFrom: today(), validTo: today(), maxUses: '0', allowedEmails: '', note: '' });
  const [assignForm, setAssignForm] = useState({ code: '', emails: '' });
  const [wallets, setWallets] = useState<AdminWalletRow[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedTopup[]>([]);
  const [adjustForm, setAdjustForm] = useState({ uid: '', amount: '', reason: '' });
  const [month, setMonth] = useState(vnMonth());
  const [overview, setOverview] = useState<MonthOverviewRow[] | null>(null);
  const [statementUid, setStatementUid] = useState<string | null>(null);

  const emailOf = useMemo(() => {
    const map = new Map<string, string>();
    teachers.forEach(t => map.set(t.uid, t.email || t.displayName || t.uid));
    wallets.forEach(w => { if (w.email) map.set(w.uid, w.email); });
    return (uid: string) => map.get(uid) ?? uid;
  }, [teachers, wallets]);

  const run = async (key: string, task: () => Promise<string | void>) => {
    setBusy(key);
    setError('');
    setNotice('');
    try {
      const message = await task();
      if (message) setNotice(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thao tác thất bại.');
    } finally {
      setBusy(null);
    }
  };

  const loadAll = useCallback(async () => {
    const [a, p, v, w] = await Promise.all([adminGetAiAccess(), adminPaymentAccount(), adminGetVouchers(), adminGetWallets()]);
    setAccess(a);
    setGroupText((a.sharedEmails.length ? a.sharedEmails : DEFAULT_GROUP).join('\n'));
    setPayment(p);
    if (p.account) setAccountForm(p.account);
    setVouchers(v.vouchers);
    setWallets(w.wallets);
    setUnmatched(w.unmatched);
  }, []);

  useEffect(() => { void run('load', loadAll); }, [loadAll]);
  useEffect(() => {
    setOverview(null);
    adminMonthOverview(month).then(r => setOverview(r.rows)).catch(err => setError(err instanceof Error ? err.message : 'Không tải được tổng hợp tháng.'));
  }, [month]);

  const loadStatement = useCallback((m?: string) => adminGetStatement(statementUid ?? '', m ?? month), [statementUid, month]);

  const saveVoucher = (voucher: Partial<VoucherDef>, message: string) => run('voucher', async () => {
    await adminSaveVoucher(voucher);
    setVouchers((await adminGetVouchers()).vouchers);
    return message;
  });

  return (
    <div className="space-y-4">
      {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
      {notice && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</p>}
      {busy === 'load' && <p className="flex items-center gap-2 text-sm font-semibold text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải ví AI…</p>}

      {/* 6. Khoá AI chung */}
      {access && (
        <section className={card}>
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800"><KeyRound className="h-4 w-4" /> 6. Ai được dùng khoá AI chung miễn phí</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">Bật công tắc thì giáo viên ngoài nhóm phải dùng khoá Gemini riêng, hoặc đồng ý dùng khoá chung và trả tiền từ ví. Tắt thì mọi người dùng khoá chung như trước (chưa tính tiền).</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <input type="checkbox" checked={access.enabled} onChange={event => setAccess({ ...access, enabled: event.target.checked })} className="h-4 w-4" />
                Bật cổng khoá AI (tính tiền giáo viên ngoài nhóm)
              </label>
              <p className="text-xs font-semibold text-slate-500">Email nhóm dùng miễn phí (mỗi dòng một email; tài khoản của thầy/cô luôn có sẵn):</p>
              <textarea value={groupText} onChange={event => setGroupText(event.target.value)} rows={4} className={`${input} w-full font-mono text-xs`} />
              <button type="button" disabled={busy !== null} className={btn} onClick={() => void run('access', async () => {
                const next = await adminSaveAiAccess(access.enabled, parseEmails(groupText));
                setAccess(next);
                setGroupText(next.sharedEmails.join('\n'));
                return next.enabled ? 'Đã lưu — cổng khoá AI đang BẬT.' : 'Đã lưu — cổng khoá AI đang tắt.';
              })}>{busy === 'access' && <Loader2 className="h-4 w-4 animate-spin" />} Lưu</button>
            </div>
            <div className="overflow-x-auto">
              <p className="mb-1 text-xs font-black text-slate-600">Giáo viên đã nhập khoá riêng / đồng ý trả phí</p>
              <table className="w-full text-left text-xs">
                <thead><tr className="text-[10px] font-black uppercase text-slate-400"><th className="py-1 pr-2">Tài khoản</th><th className="py-1 pr-2">Khoá riêng</th><th className="py-1">Đồng ý trả phí</th></tr></thead>
                <tbody>
                  {access.teachers.length === 0 && <tr><td colSpan={3} className="py-2 text-slate-400">Chưa có ai.</td></tr>}
                  {access.teachers.map(t => (
                    <tr key={t.uid} className="border-t border-slate-100">
                      <td className="py-1 pr-2 font-semibold">{t.email || emailOf(t.uid)}</td>
                      <td className="py-1 pr-2">{t.hasKey ? `…${t.last4} · ${t.keyStatus === 'ok' ? 'ổn' : t.keyStatus === 'exhausted' ? 'hết lượt' : 'lỗi'}` : '—'}</td>
                      <td className="py-1">{t.consent ? `Có · ${t.consentAt?.slice(0, 10) ?? ''}` : 'Chưa'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* 7. Tài khoản nhận tiền */}
      {payment && (
        <section className={card}>
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800"><Landmark className="h-4 w-4" /> 7. Tài khoản nhận tiền nạp (SePay)</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <input className={`${input} w-full`} placeholder="Ngân hàng (mã SePay, vd: MBBank, Vietcombank)" value={accountForm.bank} onChange={e => setAccountForm({ ...accountForm, bank: e.target.value })} />
              <input className={`${input} w-full`} placeholder="Số tài khoản" value={accountForm.accountNumber} onChange={e => setAccountForm({ ...accountForm, accountNumber: e.target.value })} />
              <input className={`${input} w-full`} placeholder="Tên chủ tài khoản" value={accountForm.accountName} onChange={e => setAccountForm({ ...accountForm, accountName: e.target.value })} />
              <button type="button" disabled={busy !== null} className={btn} onClick={() => void run('payment', async () => {
                setPayment(await adminPaymentAccount(accountForm));
                return 'Đã lưu tài khoản nhận tiền — mã QR nạp tiền của giáo viên dùng tài khoản này.';
              })}>{busy === 'payment' && <Loader2 className="h-4 w-4 animate-spin" />} Lưu tài khoản</button>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">
              <p className={payment.webhookReady ? 'font-black text-emerald-700' : 'font-black text-amber-700'}>
                {payment.webhookReady ? '✓ Máy chủ đã có khoá webhook — tiền nạp được cộng tự động.' : '⚠ Chưa có biến SEPAY_WEBHOOK_KEY trên Vercel — tiền nạp CHƯA tự cộng.'}
              </p>
              <p className="mt-2 font-black text-slate-700">Thầy/cô tự làm (một lần):</p>
              <ol className="ml-4 list-decimal">
                <li>SePay → Tích hợp Webhooks → Thêm: URL <code className="break-all">{WEBHOOK_URL}</code>, kiểu chứng thực API Key, chỉ nhận tiền vào.</li>
                <li>Vercel → Settings → Environment Variables: <code>SEPAY_WEBHOOK_KEY</code> = đúng API Key vừa đặt ở SePay, rồi Redeploy.</li>
                <li>Nhập tài khoản nhận tiền ở bên trái.</li>
              </ol>
              <p className="mt-2">Nội dung chuyển khoản phải có mã nạp của giáo viên (dạng SPAI…). Chuyển thiếu mã → nằm ở mục “Giao dịch chưa khớp” để thầy/cô gán tay.</p>
            </div>
          </div>
        </section>
      )}

      {/* 8. Mã giảm giá */}
      <section className={card}>
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800"><BadgePercent className="h-4 w-4" /> 8. Mã giảm giá ({VOUCHER_MIN_PERCENT}–{VOUCHER_MAX_PERCENT}%)</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
          <input className={input} placeholder="Mã, vd THANG10" value={voucherForm.code} onChange={e => setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() })} />
          <label className="flex items-center gap-1 text-xs font-bold text-slate-500"><input className={`${input} w-20`} type="number" min={VOUCHER_MIN_PERCENT} max={VOUCHER_MAX_PERCENT} step={5} value={voucherForm.percent} onChange={e => setVoucherForm({ ...voucherForm, percent: e.target.value })} />%</label>
          <input className={input} type="date" value={voucherForm.validFrom} onChange={e => setVoucherForm({ ...voucherForm, validFrom: e.target.value })} title="Từ ngày" />
          <input className={input} type="date" value={voucherForm.validTo} onChange={e => setVoucherForm({ ...voucherForm, validTo: e.target.value })} title="Đến hết ngày" />
          <input className={input} type="number" min={0} value={voucherForm.maxUses} onChange={e => setVoucherForm({ ...voucherForm, maxUses: e.target.value })} title="Số lượt đổi tối đa (0 = không giới hạn)" />
          <input className={`${input} lg:col-span-2`} placeholder="Chỉ cho email (để trống = ai cũng dùng)" value={voucherForm.allowedEmails} onChange={e => setVoucherForm({ ...voucherForm, allowedEmails: e.target.value })} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input className={`${input} min-w-[16rem] flex-1`} placeholder="Ghi chú (vd: miễn phí tháng 10 cho các cô)" value={voucherForm.note} onChange={e => setVoucherForm({ ...voucherForm, note: e.target.value })} />
          <button type="button" disabled={busy !== null} className={btn} onClick={() => void saveVoucher({
            code: voucherForm.code, percent: Number(voucherForm.percent), validFrom: voucherForm.validFrom, validTo: voucherForm.validTo,
            maxUses: Number(voucherForm.maxUses), allowedEmails: parseEmails(voucherForm.allowedEmails), note: voucherForm.note, active: true,
          }, `Đã lưu mã ${voucherForm.code}.`)}>Tạo / cập nhật mã</button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead><tr className="text-[10px] font-black uppercase text-slate-400"><th className="py-1 pr-2">Mã</th><th className="py-1 pr-2">Giảm</th><th className="py-1 pr-2">Hiệu lực</th><th className="py-1 pr-2">Đã đổi</th><th className="py-1 pr-2">Giới hạn email</th><th className="py-1 pr-2">Ghi chú</th><th className="py-1" /></tr></thead>
            <tbody>
              {vouchers.length === 0 && <tr><td colSpan={7} className="py-2 text-slate-400">Chưa có mã nào.</td></tr>}
              {vouchers.map(v => (
                <tr key={v.code} className={`border-t border-slate-100 ${v.active ? '' : 'text-slate-400 line-through'}`}>
                  <td className="py-1 pr-2 font-black">{v.code}</td>
                  <td className="py-1 pr-2">{v.percent}%</td>
                  <td className="py-1 pr-2">{v.validFrom} → {v.validTo}</td>
                  <td className="py-1 pr-2">{v.usedCount ?? 0}{v.maxUses ? ` / ${v.maxUses}` : ''}</td>
                  <td className="py-1 pr-2">{v.allowedEmails?.length ? v.allowedEmails.join(', ') : 'Mọi người'}</td>
                  <td className="py-1 pr-2">{v.note}</td>
                  <td className="py-1 text-right">
                    <button type="button" disabled={busy !== null} className="font-black text-indigo-600 hover:underline disabled:opacity-50" onClick={() => void saveVoucher({ ...v, active: !v.active }, v.active ? `Đã tắt mã ${v.code}.` : `Đã bật lại mã ${v.code}.`)}>{v.active ? 'Tắt' : 'Bật'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-violet-50 p-3">
          <span className="text-xs font-black text-violet-800">Gán mã thay giáo viên:</span>
          <select className={input} value={assignForm.code} onChange={e => setAssignForm({ ...assignForm, code: e.target.value })}>
            <option value="">— chọn mã —</option>
            {vouchers.filter(v => v.active).map(v => <option key={v.code} value={v.code}>{v.code} ({v.percent}%)</option>)}
          </select>
          <input className={`${input} min-w-[16rem] flex-1`} placeholder="Email giáo viên (nhiều email cách nhau bằng dấu phẩy)" value={assignForm.emails} onChange={e => setAssignForm({ ...assignForm, emails: e.target.value })} />
          <button type="button" disabled={busy !== null || !assignForm.code} className={btn} onClick={() => void run('assign', async () => {
            const done: string[] = [];
            const failed: string[] = [];
            for (const email of parseEmails(assignForm.emails)) {
              await adminAssignVoucher(email, assignForm.code).then(() => done.push(email)).catch(err => failed.push(`${email}: ${err instanceof Error ? err.message : 'lỗi'}`));
            }
            setVouchers((await adminGetVouchers()).vouchers);
            if (failed.length) throw new Error(`Gán được ${done.length}. Lỗi — ${failed.join(' · ')}`);
            return `Đã gán mã ${assignForm.code} cho ${done.length} giáo viên.`;
          })}>Gán mã</button>
        </div>
      </section>

      {/* 9. Ví giáo viên */}
      <section className={card}>
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800"><Wallet className="h-4 w-4" /> 9. Ví của giáo viên</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead><tr className="text-[10px] font-black uppercase text-slate-400"><th className="py-1 pr-2">Tài khoản</th><th className="py-1 pr-2">Mã nạp</th><th className="py-1 text-right">Số dư</th></tr></thead>
            <tbody>
              {wallets.length === 0 && <tr><td colSpan={3} className="py-2 text-slate-400">Chưa có ví nào (ví tạo khi giáo viên mở trang Chi phí AI).</td></tr>}
              {[...wallets].sort((a, b) => b.balanceVnd - a.balanceVnd).map(w => (
                <tr key={w.uid} className="border-t border-slate-100"><td className="py-1 pr-2 font-semibold">{emailOf(w.uid)}</td><td className="py-1 pr-2 font-mono">{w.topupCode}</td><td className="py-1 text-right font-black">{vnd(w.balanceVnd)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-3">
          <span className="text-xs font-black text-slate-700">Điều chỉnh số dư:</span>
          <select className={input} value={adjustForm.uid} onChange={e => setAdjustForm({ ...adjustForm, uid: e.target.value })}>
            <option value="">— chọn giáo viên —</option>
            {teachers.map(t => <option key={t.uid} value={t.uid}>{emailOf(t.uid)}</option>)}
          </select>
          <input className={`${input} w-36`} type="number" placeholder="± số tiền (đ)" value={adjustForm.amount} onChange={e => setAdjustForm({ ...adjustForm, amount: e.target.value })} />
          <input className={`${input} min-w-[14rem] flex-1`} placeholder="Lý do (giáo viên thấy trên sao kê)" value={adjustForm.reason} onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })} />
          <button type="button" disabled={busy !== null || !adjustForm.uid} className={btn} onClick={() => void run('adjust', async () => {
            const result = await adminAdjustWallet(adjustForm.uid, Number(adjustForm.amount), adjustForm.reason);
            setWallets((await adminGetWallets()).wallets);
            setAdjustForm({ uid: '', amount: '', reason: '' });
            return `Đã điều chỉnh — số dư mới ${vnd(result.wallet.balanceVnd)}.`;
          })}>Ghi điều chỉnh</button>
        </div>
        {unmatched.length > 0 && (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-black text-amber-800">Giao dịch chưa khớp mã nạp ({unmatched.length}) — gán cho đúng giáo viên:</p>
            <ul className="mt-2 space-y-2">
              {unmatched.map(t => <UnmatchedRow key={t.id} topup={t} teachers={teachers} emailOf={emailOf} disabled={busy !== null} onAssign={uid => void run('unmatched', async () => {
                await adminAssignUnmatchedTopup(t.id, uid);
                const w = await adminGetWallets();
                setWallets(w.wallets);
                setUnmatched(w.unmatched);
                return `Đã cộng ${vnd(t.amountVnd)} cho ${emailOf(uid)}.`;
              })} />)}
            </ul>
          </div>
        )}
      </section>

      {/* 10. Sao kê tháng */}
      <section className={card}>
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800"><ReceiptText className="h-4 w-4" /> 10. Sao kê theo tháng</h2>
        <div className="mt-3 flex items-center gap-2">
          <input type="month" className={input} value={month} onChange={e => { if (e.target.value) { setMonth(e.target.value); setStatementUid(null); } }} />
          <span className="text-xs font-semibold text-slate-500">{monthLabel(month)} · bấm một dòng để xem sao kê chi tiết kèm minh chứng từng lượt.</span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead><tr className="text-[10px] font-black uppercase text-slate-400"><th className="py-1 pr-2">Giáo viên</th><th className="py-1 pr-2 text-right">Lượt</th><th className="py-1 pr-2 text-right">Giá gốc</th><th className="py-1 pr-2 text-right">Trừ ví</th><th className="py-1 pr-2 text-right">Nạp</th><th className="py-1 text-right">Điều chỉnh</th></tr></thead>
            <tbody>
              {!overview && <tr><td colSpan={6} className="py-2 text-slate-400">Đang tổng hợp…</td></tr>}
              {overview?.length === 0 && <tr><td colSpan={6} className="py-2 text-slate-400">Tháng này chưa có lượt tính tiền, nạp hay điều chỉnh nào.</td></tr>}
              {overview?.map(r => (
                <tr key={r.uid} onClick={() => setStatementUid(r.uid)} className={`cursor-pointer border-t border-slate-100 hover:bg-indigo-50 ${statementUid === r.uid ? 'bg-indigo-50' : ''}`}>
                  <td className="py-1 pr-2 font-semibold">{r.email || emailOf(r.uid)}</td>
                  <td className="py-1 pr-2 text-right">{r.calls}</td>
                  <td className="py-1 pr-2 text-right">{vnd(r.grossVnd)}</td>
                  <td className="py-1 pr-2 text-right font-black">{vnd(r.chargeVnd)}</td>
                  <td className="py-1 pr-2 text-right text-emerald-700">{vnd(r.topupVnd)}</td>
                  <td className="py-1 text-right">{vnd(r.adjustVnd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {statementUid && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-black text-slate-800">Sao kê của {emailOf(statementUid)}</p>
              <button type="button" className={btnGhost} onClick={() => setStatementUid(null)}>Đóng</button>
            </div>
            <AiStatementView key={statementUid} load={loadStatement} teacherLabel={emailOf(statementUid)} />
          </div>
        )}
      </section>
    </div>
  );
};

const UnmatchedRow = ({ topup, teachers, emailOf, disabled, onAssign }: {
  topup: UnmatchedTopup;
  teachers: Teacher[];
  emailOf: (uid: string) => string;
  disabled: boolean;
  onAssign: (uid: string) => void;
}) => {
  const [uid, setUid] = useState('');
  return (
    <li className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-black text-emerald-700">+{vnd(topup.amountVnd)}</span>
      <span className="text-slate-600">{topup.transactionDate || topup.receivedAt} · {topup.gateway} · “{topup.content}”</span>
      <select className={input} value={uid} onChange={e => setUid(e.target.value)}>
        <option value="">— gán cho —</option>
        {teachers.map(t => <option key={t.uid} value={t.uid}>{emailOf(t.uid)}</option>)}
      </select>
      <button type="button" disabled={disabled || !uid} className={btn} onClick={() => onAssign(uid)}>Cộng vào ví</button>
    </li>
  );
};
