import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2, QrCode, RefreshCw, Ticket, Wallet } from 'lucide-react';
import {
  deleteAiKey,
  getAiKeyStatus,
  redeemAiVoucher,
  saveAiKey,
  setAiConsent,
  setAiSpendCap,
  type AiKeyStatus,
} from '../../../lib/ai/aiBillingApi';
import { gradeOneSubmission } from '../../../services/gradingApi';
import { PRICE_SOURCES } from '../../../lib/admin/aiPricing';
import { vnd, monthLabel } from '../../../lib/ai/statementPrintDoc';
import { TopupDialog } from './TopupDialog';

interface Props {
  /** Bản gọn trong hộp "AI đang tạm dừng": ẩn phần cách tính + chấm lại bài chờ. */
  compact?: boolean;
  onStatus?: (status: AiKeyStatus) => void;
}

const errorText = (error: unknown): string => (error instanceof Error ? error.message : 'Có lỗi, thử lại sau.');

/**
 * Ví AI của giáo viên: số dư + nạp QR, mã giảm giá, trần tự đặt, khoá Gemini riêng, đồng ý dùng khoá chung,
 * bài học sinh đang chờ vì AI tạm dừng, và cách tính tiền (công khai).
 */
export const AiWalletPanel = ({ compact = false, onStatus }: Props) => {
  const [status, setStatus] = useState<AiKeyStatus | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [voucherInput, setVoucherInput] = useState('');
  const [capInput, setCapInput] = useState('');
  const [consentTick, setConsentTick] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [regrade, setRegrade] = useState<{ done: number; total: number } | null>(null);

  const apply = useCallback((next: AiKeyStatus) => {
    setStatus(next);
    onStatus?.(next);
  }, [onStatus]);

  useEffect(() => {
    getAiKeyStatus().then(apply).catch(err => setError(errorText(err)));
  }, [apply]);

  const run = async (label: string, work: () => Promise<AiKeyStatus>, done?: string) => {
    setBusy(label);
    setError('');
    setNotice('');
    try {
      apply(await work());
      if (done) setNotice(done);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy('');
    }
  };

  const regradeBlocked = async () => {
    if (!status) return;
    const ids = status.blockedSubmissionIds;
    setRegrade({ done: 0, total: ids.length });
    for (let i = 0; i < ids.length; i += 1) {
      await gradeOneSubmission(ids[i]).catch(() => undefined);
      setRegrade({ done: i + 1, total: ids.length });
    }
    setRegrade(null);
    apply(await getAiKeyStatus());
  };

  if (!status) {
    return error
      ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>
      : <p className="flex items-center gap-2 py-6 text-sm font-semibold text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải ví AI…</p>;
  }

  const capPct = status.capVnd ? Math.min(100, Math.round((status.spentVnd / status.capVnd) * 100)) : null;
  // Nói rõ ví có đang bị trừ không — tránh giáo viên thấy "0đ" đỏ mà tưởng bị dừng.
  const modeNote = !status.gateEnabled
    ? 'Web chưa bật tính phí: mọi lượt AI dùng khoá chung hiện đều miễn phí, ví chưa bị trừ.'
    : status.exempt ? ''
      : status.shared ? 'Thầy/cô dùng thẳng khoá AI chung của web (không cần khoá riêng); mỗi lượt trừ ví theo giá Google, có mã giảm giá thì trừ theo mã. Có khoá riêng thì khoá riêng chạy trước, không trừ ví.'
        : status.consent ? ''
          : 'Ví chỉ bị trừ khi thầy/cô đồng ý dùng khoá chung của web (ô cuối trang). Chạy bằng khoá riêng thì không trừ ví.';

  return (
    <div className="space-y-4">
      {modeNote && <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">{modeNote}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-700"><Wallet className="h-4 w-4" /> Số dư ví</p>
          <p className={`mt-1 text-2xl font-black ${status.exempt || status.balanceVnd > 0 ? 'text-emerald-900' : 'text-rose-700'}`}>{status.exempt ? 'Không trừ' : vnd(status.balanceVnd)}</p>
          {!status.exempt && (
            <button type="button" onClick={() => setShowTopup(true)} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700">
              <QrCode className="h-4 w-4" /> Nạp tiền (QR)
            </button>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Đã dùng {monthLabel(status.month)}</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{vnd(status.spentVnd)}</p>
          <p className="text-xs font-semibold text-slate-500">
            {status.spentCalls} lượt dùng khoá chung{status.charged && status.grossVnd > status.spentVnd ? ` · giá gốc ${vnd(status.grossVnd)}, đã giảm ${vnd(status.grossVnd - status.spentVnd)}` : ''}
          </p>
          {capPct !== null && (
            <div className="mt-2">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${capPct >= 90 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${capPct}%` }} /></div>
              <p className="mt-1 text-[11px] font-bold text-slate-500">{capPct}% trần {vnd(status.capVnd ?? 0)}</p>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-violet-700"><Ticket className="h-4 w-4" /> Mã giảm giá</p>
          <p className="mt-1 text-lg font-black text-violet-900">{status.activeVoucher ? `Giảm ${status.activeVoucher.percent}%` : 'Chưa có mã đang áp dụng'}</p>
          {status.activeVoucher && <p className="text-xs font-semibold text-violet-700">{status.activeVoucher.code} · đến {status.activeVoucher.validTo.split('-').reverse().join('/')}</p>}
          <div className="mt-2 flex gap-2">
            <input value={voucherInput} onChange={event => setVoucherInput(event.target.value)} placeholder="Nhập mã" className="min-w-0 flex-1 rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-xs font-bold uppercase outline-none focus:border-violet-400" />
            <button type="button" disabled={!voucherInput.trim() || Boolean(busy)} onClick={() => void run('voucher', () => redeemAiVoucher(voucherInput), 'Đã áp dụng mã giảm giá.').then(() => setVoucherInput(''))}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-50">Áp dụng</button>
          </div>
        </div>
      </div>

      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
      {notice && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{notice}</p>}

      {!compact && status.blockedSubmissionIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">Có {status.blockedSubmissionIds.length} bài học sinh đang chờ chấm vì AI tạm dừng.</p>
          <button type="button" disabled={Boolean(regrade)} onClick={() => void regradeBlocked()} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-xs font-black text-white hover:bg-amber-700 disabled:opacity-60">
            {regrade ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang chấm {regrade.done}/{regrade.total}</> : <><RefreshCw className="h-4 w-4" /> Chấm lại các bài đang chờ</>}
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-black text-slate-900">Trần chi tiêu mỗi tháng (tự đặt)</p>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">Giống ngân sách của Google: chạm trần thì AI dùng khoá chung tạm dừng tới khi thầy/cô nâng trần hoặc sang tháng. Để trống = không giới hạn.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input value={capInput} onChange={event => setCapInput(event.target.value)} inputMode="numeric" placeholder={status.capVnd ? String(status.capVnd) : 'VD 200000'} className="w-40 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold outline-none focus:border-indigo-400" />
          <button type="button" disabled={Boolean(busy)} onClick={() => void run('cap', () => setAiSpendCap(capInput.trim() ? Number(capInput.replace(/[^\d]/g, '')) : null), 'Đã lưu trần chi tiêu.').then(() => setCapInput(''))}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50">Lưu trần</button>
          {status.capVnd && <button type="button" disabled={Boolean(busy)} onClick={() => void run('cap', () => setAiSpendCap(null), 'Đã bỏ trần.')} className="rounded-lg px-3 py-1.5 text-xs font-black text-slate-500 hover:bg-slate-100">Bỏ trần</button>}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="flex items-center gap-2 text-sm font-black text-slate-900"><KeyRound className="h-4 w-4" /> Khoá AI (Gemini) riêng của thầy/cô</p>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">
          {status.exempt
            ? 'Không cần: tài khoản của thầy/cô dùng khoá chung không bị trừ ví.'
            : !status.gateEnabled
              ? 'Không bắt buộc. Khi web bật tính phí, có khoá riêng thì AI chạy bằng khoá riêng trước (thầy/cô tự trả Google, không trừ ví).'
              : `Có khoá riêng thì AI chạy bằng khoá riêng trước — thầy/cô tự trả Google, không trừ ví. Khoá hết thì ${status.shared ? 'tự chuyển sang khoá chung của web (trừ ví).' : 'mới dùng khoá chung (nếu đã đồng ý bên dưới).'}`}
        </p>
        {status.hasKey ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-mono font-black text-slate-800">AIza…{status.last4}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${status.keyStatus === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {status.keyStatus === 'ok' ? 'Đang dùng được' : status.keyStatus === 'exhausted' ? 'Hết hạn mức (thử lại sau 60 phút)' : 'Khoá không dùng được'}
            </span>
            <button type="button" disabled={Boolean(busy)} onClick={() => void run('delkey', deleteAiKey, 'Đã gỡ khoá riêng.')} className="rounded-lg px-2 py-1 text-xs font-black text-slate-500 hover:bg-slate-100">Gỡ khoá</button>
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          <input value={keyInput} onChange={event => setKeyInput(event.target.value)} placeholder="Dán khoá AIza… lấy ở aistudio.google.com" type="password" autoComplete="off" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold outline-none focus:border-indigo-400" />
          <button type="button" disabled={!keyInput.trim() || Boolean(busy)} onClick={() => void run('key', () => saveAiKey(keyInput), 'Đã lưu khoá riêng (máy chủ giữ, không hiện lại).').then(() => setKeyInput(''))}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-black text-white hover:bg-slate-900 disabled:opacity-50">
            {busy === 'key' && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {status.hasKey ? 'Thay khoá' : 'Lưu khoá'}
          </button>
        </div>
      </div>

      {!status.shared && !status.exempt && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-black text-slate-900">Dùng khoá AI chung của web (tính phí theo mức dùng)</p>
          {status.consent ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold text-emerald-700">Đã đồng ý {status.consentAt ? `lúc ${new Date(status.consentAt).toLocaleString('vi-VN')}` : ''}. Khi khoá riêng hết (hoặc không có), AI dùng khoá chung và trừ ví.</p>
              <button type="button" disabled={Boolean(busy)} onClick={() => void run('consent', () => setAiConsent(false), 'Đã tắt dùng khoá chung.')} className="rounded-lg px-2 py-1 text-xs font-black text-slate-500 hover:bg-slate-100">Tắt</button>
            </div>
          ) : (
            <>
              <label className="mt-2 flex items-start gap-2 text-xs font-semibold leading-5 text-slate-600">
                <input type="checkbox" checked={consentTick} onChange={event => setConsentTick(event.target.checked)} className="mt-1" />
                Tôi đồng ý: khi không có hoặc hết khoá riêng, AI chạy bằng khoá chung; mỗi lượt trừ ví đúng giá niêm yết của Google (quy đổi VNĐ theo tỷ giá Vietcombank), trừ mã giảm giá nếu có; sao kê chi tiết từng lượt có trong trang này.
              </label>
              <button type="button" disabled={!consentTick || Boolean(busy)} onClick={() => void run('consent', () => setAiConsent(true), 'Đã đồng ý dùng khoá chung.')}
                className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50">Đồng ý dùng khoá chung</button>
            </>
          )}
        </div>
      )}

      {!compact && (
        <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold leading-6 text-slate-600">
          <summary className="cursor-pointer text-sm font-black text-slate-800">Cách tính tiền (công khai)</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Mỗi lượt AI ghi lại số token Google/Vercel báo về. Giá gốc = token × giá niêm yết đúng ngày dùng (nguồn: {PRICE_SOURCES.gemini}; {PRICE_SOURCES.gateway}).</li>
            <li>Quy ra VNĐ theo tỷ giá USD bán ra của Vietcombank do quản trị cập nhật — hiện tại 1 USD = {status.usdVnd.toLocaleString('vi-VN')}đ; tỷ giá của từng lượt được ghi trên sao kê.</li>
            <li>Trừ ví = giá gốc × (100% − mức giảm của mã giảm giá tốt nhất đang hiệu lực). Làm tròn tới đồng từng lượt.</li>
            <li>Lượt chạy bằng khoá riêng của thầy/cô: không trừ ví. Tiền nạp chỉ dùng cho AI trong web này.</li>
          </ul>
        </details>
      )}

      {showTopup && <TopupDialog status={status} onClose={() => setShowTopup(false)} onUpdated={apply} />}
    </div>
  );
};
