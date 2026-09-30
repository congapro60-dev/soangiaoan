import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2, QrCode, RefreshCw, Ticket, Wallet } from 'lucide-react';
import {
  deleteAiKey,
  getAiKeyStatus,
  redeemAiVoucher,
  saveAiKey,
  setAiMode,
  setAiSpendCap,
  type AiKeyStatus,
} from '../../../lib/ai/aiBillingApi';
import type { AiKeyMode } from '../../../lib/admin/aiKeyPolicy';
import { aiModeOptions, needsConsent, sourceStates, type SourceState } from '../../../lib/ai/aiModeView';
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

const KEY_PILL = {
  ok: { text: 'Đang dùng được', className: 'bg-emerald-50 text-emerald-700' },
  exhausted: { text: 'Hết hạn mức (thử lại sau 60 phút)', className: 'bg-amber-50 text-amber-700' },
  invalid: { text: 'Khoá không dùng được', className: 'bg-rose-50 text-rose-700' },
} as const;

/** Nhãn trạng thái của một nguồn: xanh khi đang chạy, xám khi bị tắt bởi chế độ đã chọn. */
const StateBadge = ({ state }: { state: SourceState }) => (
  <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${state.active ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{state.label}</span>
);

/**
 * "AI của tôi": chọn dùng khoá riêng, ví web hay cả hai; mỗi nguồn một thẻ (khoá Gemini riêng · ví web gồm số dư, nạp QR,
 * mã giảm giá, trần tháng); bài học sinh đang chờ vì AI tạm dừng; và cách tính tiền (công khai).
 */
export const AiWalletPanel = ({ compact = false, onStatus }: Props) => {
  const [status, setStatus] = useState<AiKeyStatus | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [voucherInput, setVoucherInput] = useState('');
  const [capInput, setCapInput] = useState('');
  const [pendingMode, setPendingMode] = useState<AiKeyMode | null>(null);
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

  const options = aiModeOptions(status.exempt);
  const states = sourceStates(status.mode);
  const capPct = status.capVnd ? Math.min(100, Math.round((status.spentVnd / status.capVnd) * 100)) : null;
  const keyPill = status.keyStatus ? KEY_PILL[status.keyStatus] : null;

  const chooseMode = (mode: AiKeyMode) => {
    if (mode === status.mode || busy) return;
    if (needsConsent(status, mode)) {
      setPendingMode(mode);
      setConsentTick(false);
      return;
    }
    setPendingMode(null);
    void run('mode', () => setAiMode(mode), 'Đã đổi nguồn khoá AI.');
  };

  const confirmPending = () => {
    if (!pendingMode) return;
    const mode = pendingMode;
    void run('mode', () => setAiMode(mode, true), 'Đã đồng ý và đổi nguồn khoá AI.').then(() => setPendingMode(null));
  };

  const cardClass = (state: SourceState) => `rounded-2xl border bg-white p-4 ${state.active ? 'border-slate-200' : 'border-slate-200 opacity-60'}`;

  return (
    <div className="space-y-4">
      {!status.gateEnabled && (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">Web chưa bật tính phí: mọi lượt AI dùng khoá chung hiện đều miễn phí, ví chưa bị trừ. Lựa chọn bên dưới có hiệu lực khi web bật tính phí.</p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-black text-slate-900">AI của thầy/cô chạy bằng gì?</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Nguồn khoá AI">
          {options.map(option => {
            const selected = (pendingMode ?? status.mode) === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={Boolean(busy)}
                onClick={() => chooseMode(option.id)}
                className={`rounded-xl border p-3 text-left transition-colors disabled:opacity-60 ${selected ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <span className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${selected ? 'border-indigo-600' : 'border-slate-300'}`}>
                    {selected && <span className="h-2 w-2 rounded-full bg-indigo-600" />}
                  </span>
                  {option.title}
                </span>
                <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{option.desc}</span>
              </button>
            );
          })}
        </div>
        {pendingMode && (
          <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
            <label className="flex items-start gap-2 text-xs font-semibold leading-5 text-slate-600">
              <input type="checkbox" checked={consentTick} onChange={event => setConsentTick(event.target.checked)} className="mt-1" />
              Tôi đồng ý: khi AI chạy bằng khoá chung của web, mỗi lượt trừ ví đúng giá niêm yết của Google (quy đổi VNĐ theo tỷ giá Vietcombank), trừ mã giảm giá nếu có; sao kê chi tiết từng lượt có trong trang này.
            </label>
            <div className="mt-2 flex gap-2">
              <button type="button" disabled={!consentTick || Boolean(busy)} onClick={confirmPending} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50">Đồng ý và dùng</button>
              <button type="button" onClick={() => setPendingMode(null)} className="rounded-lg px-3 py-1.5 text-xs font-black text-slate-500 hover:bg-slate-100">Bỏ qua</button>
            </div>
          </div>
        )}
        <p className="mt-3 text-[11px] font-semibold leading-4 text-slate-400">
          Áp dụng cho chấm bài, bài luyện, ảnh AI và các tính năng chạy trên máy chủ. Soạn giáo án, nâng cấp, dự giờ, ra đề hiện vẫn dùng khoá nhập trong Cài đặt; ví web cho các tính năng đó sẽ có sau.
        </p>
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

      <div className="grid gap-3 lg:grid-cols-2">
        <section className={cardClass(states.own)}>
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-black text-slate-900"><KeyRound className="h-4 w-4" /> Khoá Gemini riêng</p>
            <StateBadge state={states.own} />
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">Lấy miễn phí ở aistudio.google.com. Khoá lưu trên máy chủ, không hiện lại; thầy/cô tự trả Google, không trừ ví.</p>
          {status.hasKey && keyPill ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono font-black text-slate-800">AIza…{status.last4}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${keyPill.className}`}>{keyPill.text}</span>
              <button type="button" disabled={Boolean(busy)} onClick={() => void run('delkey', deleteAiKey, 'Đã gỡ khoá riêng.')} className="rounded-lg px-2 py-1 text-xs font-black text-slate-500 hover:bg-slate-100">Gỡ khoá</button>
            </div>
          ) : (
            <p className="mt-2 text-xs font-bold text-slate-400">Chưa có khoá riêng.</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <input value={keyInput} onChange={event => setKeyInput(event.target.value)} placeholder="Dán khoá AIza…" type="password" autoComplete="off" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold outline-none focus:border-indigo-400" />
            <button type="button" disabled={!keyInput.trim() || Boolean(busy)} onClick={() => void run('key', () => saveAiKey(keyInput), 'Đã lưu khoá riêng (máy chủ giữ, không hiện lại).').then(() => setKeyInput(''))}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-black text-white hover:bg-slate-900 disabled:opacity-50">
              {busy === 'key' && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {status.hasKey ? 'Thay khoá' : 'Lưu khoá'}
            </button>
          </div>
        </section>

        <section className={cardClass(states.wallet)}>
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-black text-slate-900"><Wallet className="h-4 w-4" /> Ví web</p>
            <StateBadge state={states.wallet} />
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className={`text-2xl font-black ${status.exempt || status.balanceVnd > 0 ? 'text-slate-900' : 'text-rose-700'}`}>{status.exempt ? 'Không trừ' : vnd(status.balanceVnd)}</p>
              <p className="text-xs font-semibold text-slate-500">
                Đã dùng {monthLabel(status.month)}: {vnd(status.spentVnd)} · {status.spentCalls} lượt
                {status.charged && status.grossVnd > status.spentVnd ? ` · giá gốc ${vnd(status.grossVnd)}, đã giảm ${vnd(status.grossVnd - status.spentVnd)}` : ''}
              </p>
            </div>
            {!status.exempt && (
              <button type="button" onClick={() => setShowTopup(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700">
                <QrCode className="h-4 w-4" /> Nạp tiền (QR)
              </button>
            )}
          </div>
          {capPct !== null && (
            <div className="mt-2">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${capPct >= 90 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${capPct}%` }} /></div>
              <p className="mt-1 text-[11px] font-bold text-slate-500">{capPct}% trần {vnd(status.capVnd ?? 0)}</p>
            </div>
          )}

          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="flex items-center gap-2 text-xs font-black text-violet-700"><Ticket className="h-4 w-4" /> Mã giảm giá</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-600">
              {status.activeVoucher ? `Giảm ${status.activeVoucher.percent}% · ${status.activeVoucher.code} · đến ${status.activeVoucher.validTo.split('-').reverse().join('/')}` : 'Chưa có mã đang áp dụng'}
            </p>
            <div className="mt-1.5 flex gap-2">
              <input value={voucherInput} onChange={event => setVoucherInput(event.target.value)} placeholder="Nhập mã" className="min-w-0 flex-1 rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-xs font-bold uppercase outline-none focus:border-violet-400" />
              <button type="button" disabled={!voucherInput.trim() || Boolean(busy)} onClick={() => void run('voucher', () => redeemAiVoucher(voucherInput), 'Đã áp dụng mã giảm giá.').then(() => setVoucherInput(''))}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-50">Áp dụng</button>
            </div>
          </div>

          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="text-xs font-black text-slate-900">Trần chi tiêu mỗi tháng (tự đặt)</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Chạm trần thì AI dùng khoá web tạm dừng tới khi nâng trần hoặc sang tháng. Để trống = không giới hạn.</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <input value={capInput} onChange={event => setCapInput(event.target.value)} inputMode="numeric" placeholder={status.capVnd ? String(status.capVnd) : 'VD 200000'} className="w-36 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold outline-none focus:border-indigo-400" />
              <button type="button" disabled={Boolean(busy)} onClick={() => void run('cap', () => setAiSpendCap(capInput.trim() ? Number(capInput.replace(/[^\d]/g, '')) : null), 'Đã lưu trần chi tiêu.').then(() => setCapInput(''))}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50">Lưu trần</button>
              {status.capVnd && <button type="button" disabled={Boolean(busy)} onClick={() => void run('cap', () => setAiSpendCap(null), 'Đã bỏ trần.')} className="rounded-lg px-3 py-1.5 text-xs font-black text-slate-500 hover:bg-slate-100">Bỏ trần</button>}
            </div>
          </div>
        </section>
      </div>

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
