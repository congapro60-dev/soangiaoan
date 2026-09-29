import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Copy, Loader2, X } from 'lucide-react';
import { getAiKeyStatus, type AiKeyStatus } from '../../../lib/ai/aiBillingApi';
import { sepayQrUrl, TOPUP_MIN_VND, TOPUP_PRESETS_VND } from '../../../lib/admin/aiWallet';
import { vnd } from '../../../lib/ai/statementPrintDoc';

interface Props {
  status: AiKeyStatus;
  onClose: () => void;
  onUpdated: (status: AiKeyStatus) => void;
}

/**
 * Nạp tiền ví AI: QR chuyển khoản (SePay/VietQR) điền sẵn số tiền + NỘI DUNG riêng của giáo viên. Tiền vào tài
 * khoản thì SePay báo máy chủ, máy chủ cộng ví theo mã trong nội dung — hộp này tự hỏi lại mỗi 5 giây để báo ngay.
 * Tài khoản có ảnh QR do quản trị tải lên thì cho chọn ảnh đó (phải tự gõ số tiền + nội dung); QR tự tạo lỗi thì
 * tự chuyển sang ảnh này.
 */
export const TopupDialog = ({ status, onClose, onUpdated }: Props) => {
  const [amount, setAmount] = useState<number>(TOPUP_PRESETS_VND[1]);
  const [custom, setCustom] = useState('');
  const [credited, setCredited] = useState<number | null>(null);
  const [copied, setCopied] = useState('');
  const [qrMode, setQrMode] = useState<'auto' | 'uploaded'>('auto');
  const startBalance = useRef(status.balanceVnd);
  const onUpdatedRef = useRef(onUpdated);
  onUpdatedRef.current = onUpdated;

  useEffect(() => {
    const timer = window.setInterval(() => {
      getAiKeyStatus().then(next => {
        onUpdatedRef.current(next);
        if (next.balanceVnd > startBalance.current) setCredited(next.balanceVnd - startBalance.current);
      }).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const account = status.paymentAccount;
  const showUploaded = qrMode === 'uploaded' && Boolean(account?.qrImageUrl);
  const chosen = custom ? Math.round(Number(custom.replace(/[^\d]/g, ''))) : amount;
  const validAmount = Number.isFinite(chosen) && chosen >= TOPUP_MIN_VND;
  const copy = (text: string, label: string) => {
    void navigator.clipboard?.writeText(text).then(() => { setCopied(label); window.setTimeout(() => setCopied(''), 1500); });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8" onClick={onClose}>
      <div className="w-full max-w-lg rounded-[1.75rem] bg-white p-5 shadow-2xl sm:p-6" onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Nạp tiền ví AI</p>
            <h3 className="mt-1 text-xl font-black text-slate-900">Chuyển khoản bằng mã QR</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        {!account ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-900">Quản trị chưa cài tài khoản nhận tiền nên chưa nạp được. Thầy/cô báo quản trị giúp.</p>
        ) : credited !== null ? (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-5 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <p className="mt-2 text-lg font-black text-emerald-900">Đã nhận +{vnd(credited)}</p>
            <p className="text-sm font-semibold text-emerald-800">Số dư mới: {vnd(credited + startBalance.current)}. AI dùng tiếp được ngay.</p>
            <button type="button" onClick={onClose} className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-700">Xong</button>
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {TOPUP_PRESETS_VND.map(value => (
                <button key={value} type="button" onClick={() => { setAmount(value); setCustom(''); }}
                  className={`rounded-xl border px-3 py-2 text-sm font-black ${!custom && amount === value ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                  {vnd(value)}
                </button>
              ))}
              <input value={custom} onChange={event => setCustom(event.target.value)} inputMode="numeric" placeholder="Số khác"
                className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-emerald-400" />
            </div>
            {!validAmount && <p className="mt-2 text-xs font-semibold text-rose-600">Tối thiểu {vnd(TOPUP_MIN_VND)}.</p>}
            {validAmount && (
              <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr] sm:items-start">
                <div>
                  {account.qrImageUrl && (
                    <div className="mb-2 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-[11px] font-black">
                      <button type="button" onClick={() => setQrMode('auto')} className={`rounded-md px-2 py-1 ${showUploaded ? 'text-slate-500' : 'bg-white text-slate-900 shadow-sm'}`}>QR điền sẵn</button>
                      <button type="button" onClick={() => setQrMode('uploaded')} className={`rounded-md px-2 py-1 ${showUploaded ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>QR ngân hàng</button>
                    </div>
                  )}
                  {showUploaded
                    ? <img src={account.qrImageUrl} alt="Ảnh QR tài khoản" className="mx-auto h-44 w-44 rounded-xl border border-slate-200 bg-white object-contain" />
                    : <img src={sepayQrUrl(account, chosen, status.topupCode)} alt="Mã QR chuyển khoản" onError={() => { if (account.qrImageUrl) setQrMode('uploaded'); }} className="mx-auto h-44 w-44 rounded-xl border border-slate-200" />}
                  {showUploaded && <p className="mt-1 text-center text-[11px] font-bold leading-4 text-amber-700">Quét ảnh này thì tự gõ số tiền và nội dung bên cạnh.</p>}
                </div>
                <dl className="space-y-1.5 text-sm">
                  <div><dt className="text-xs font-bold text-slate-400">Ngân hàng</dt><dd className="font-black text-slate-800">{account.bank}</dd></div>
                  <div><dt className="text-xs font-bold text-slate-400">Số tài khoản</dt><dd className="flex items-center gap-2 font-black text-slate-800">{account.accountNumber}<button type="button" onClick={() => copy(account.accountNumber, 'stk')} aria-label="Chép số tài khoản" className="text-slate-400 hover:text-slate-700"><Copy className="h-3.5 w-3.5" /></button></dd></div>
                  {account.accountName && <div><dt className="text-xs font-bold text-slate-400">Chủ tài khoản</dt><dd className="font-black text-slate-800">{account.accountName}</dd></div>}
                  <div><dt className="text-xs font-bold text-slate-400">Số tiền</dt><dd className="font-black text-emerald-700">{vnd(chosen)}</dd></div>
                  <div><dt className="text-xs font-bold text-slate-400">Nội dung (bắt buộc giữ nguyên)</dt><dd className="flex items-center gap-2 font-mono text-base font-black text-indigo-700">{status.topupCode}<button type="button" onClick={() => copy(status.topupCode, 'nd')} aria-label="Chép nội dung" className="text-slate-400 hover:text-slate-700"><Copy className="h-3.5 w-3.5" /></button></dd></div>
                  {copied && <p className="text-xs font-bold text-emerald-600">Đã chép.</p>}
                </dl>
              </div>
            )}
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang chờ tiền về — thường dưới 1 phút sau khi chuyển. Có thể đóng hộp này, số dư tự cập nhật.
            </p>
            <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-400">Nội dung chuyển khoản là mã riêng của thầy/cô — nhờ nó máy mới biết cộng vào ví ai. Quên ghi nội dung thì báo quản trị gán tay (giao dịch vẫn được lưu).</p>
          </>
        )}
      </div>
    </div>
  );
};
