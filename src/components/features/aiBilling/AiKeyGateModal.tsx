import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, PauseCircle, Wallet, X } from 'lucide-react';
import { blockReasonText, type AiKeyBlockReason } from '../../../lib/admin/aiKeyPolicy';
import { AI_WALLET_EMPTY_EVENT, setAiKeyGateResolver } from '../../../lib/ai/aiKeyGate';
import { getAiKeyStatus, type AiKeyStatus } from '../../../lib/ai/aiBillingApi';
import { AiWalletPanel } from './AiWalletPanel';
import { TopupQrForm } from './TopupDialog';

/** Thao tác bị chặn (có lượt chờ gửi lại) hoặc ví vừa về 0đ sau một lượt dùng (chỉ mời nạp). */
type GateRequest =
  | { kind: 'blocked'; reason: AiKeyBlockReason; resolve: (retry: boolean) => void }
  | { kind: 'emptied' };

/** Sau khi báo "Đã nhận tiền" chờ chừng này cho giáo viên kịp đọc rồi tự chạy tiếp thao tác vừa dừng. */
const AUTO_RETRY_MS = 1_500;

/**
 * Hộp "AI đang tạm dừng" — mở khi máy chủ trả 402 AI_KEY_REQUIRED cho bất kỳ thao tác AI nào của giáo viên.
 *
 * Hết tiền là lúc dễ mất khách nhất: hộp mở THẲNG mã QR nạp tiền (không bắt bấm thêm), tiền về thì tự báo và tự gửi
 * lại thao tác vừa dừng — giáo viên chỉ việc quét mã. Cách khác (khoá riêng, mã giảm giá) gập ở dưới.
 * Lí do khác (khoá hỏng, chạm trần, chưa đồng ý…) giữ bảng ví đầy đủ để xử lý tại chỗ rồi bấm "Thử lại".
 */
export const AiKeyGateModal = () => {
  const [request, setRequest] = useState<GateRequest | null>(null);
  const requestRef = useRef<GateRequest | null>(null);
  requestRef.current = request;

  useEffect(() => {
    setAiKeyGateResolver(reason => new Promise<boolean>(resolve => setRequest({ kind: 'blocked', reason, resolve })));
    const onEmptied = () => { if (!requestRef.current) setRequest({ kind: 'emptied' }); };
    window.addEventListener(AI_WALLET_EMPTY_EVENT, onEmptied);
    return () => {
      setAiKeyGateResolver(null);
      window.removeEventListener(AI_WALLET_EMPTY_EVENT, onEmptied);
    };
  }, []);

  if (!request) return null;
  const finish = (retry: boolean) => {
    if (request.kind === 'blocked') request.resolve(retry);
    setRequest(null);
  };

  if (request.kind === 'emptied' || request.reason === 'no_balance') {
    return <TopupFirstDialog blocked={request.kind === 'blocked'} onFinish={finish} />;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8">
      <div className="w-full max-w-3xl rounded-[1.75rem] bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <PauseCircle className="mt-0.5 h-7 w-7 shrink-0 text-amber-500" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-600">AI đang tạm dừng</p>
              <p className="mt-1 text-base font-black leading-6 text-slate-900">{blockReasonText(request.reason)}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Xử lý ở dưới rồi bấm “Thử lại” — thao tác vừa rồi sẽ tự chạy tiếp. Bài học sinh nộp trong lúc dừng vẫn được lưu và chờ chấm.</p>
            </div>
          </div>
          <button type="button" onClick={() => finish(false)} aria-label="Đóng" className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4"><AiWalletPanel compact /></div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => finish(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50">Để sau</button>
          <button type="button" onClick={() => finish(true)} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700">Thử lại</button>
        </div>
      </div>
    </div>
  );
};

/** Ví hết tiền: QR nạp ngay trên cùng; tiền về → tự chạy tiếp (khi có thao tác đang chờ) hoặc báo dùng tiếp được. */
const TopupFirstDialog = ({ blocked, onFinish }: { blocked: boolean; onFinish: (retry: boolean) => void }) => {
  const [status, setStatus] = useState<AiKeyStatus | null>(null);
  const [loadError, setLoadError] = useState('');
  const [showOther, setShowOther] = useState(false);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    getAiKeyStatus().then(setStatus).catch(error => setLoadError(error instanceof Error ? error.message : 'Chưa đọc được ví AI. Tải lại trang rồi thử lại.'));
  }, []);

  const onCredited = () => {
    if (blocked) window.setTimeout(() => finishRef.current(true), AUTO_RETRY_MS);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8">
      <div role="dialog" aria-modal="true" aria-labelledby="ai-topup-title" className="w-full max-w-lg rounded-[1.75rem] bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Wallet className="h-5 w-5" /></span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-600">Ví AI đã hết tiền</p>
              <h3 id="ai-topup-title" className="mt-1 text-xl font-black leading-7 text-slate-900">Nạp thêm để dùng tiếp</h3>
              <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">
                {blocked
                  ? 'Quét mã QR bằng app ngân hàng. Tiền về là thao tác vừa rồi tự chạy tiếp, không cần bấm lại.'
                  : 'Lượt AI vừa rồi đã dùng hết số dư. Quét mã QR bằng app ngân hàng để lần sau không bị gián đoạn.'}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => onFinish(false)} aria-label="Đóng" className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        {loadError ? (
          <p className="mt-4 rounded-xl bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-800">{loadError}</p>
        ) : !status ? (
          <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Đang mở mã nạp tiền…</p>
        ) : (
          <TopupQrForm
            status={status}
            onUpdated={setStatus}
            onCredited={onCredited}
            creditedNote={blocked ? 'Đang chạy tiếp thao tác vừa rồi…' : 'AI dùng tiếp được ngay.'}
            onDone={blocked ? undefined : () => onFinish(false)}
          />
        )}

        <button type="button" onClick={() => setShowOther(value => !value)} aria-expanded={showOther}
          className="mt-4 flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm font-black text-slate-700 hover:bg-slate-50">
          Cách khác: dùng khoá Gemini riêng (miễn phí) hoặc nhập mã giảm giá
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${showOther ? 'rotate-180' : ''}`} />
        </button>
        {showOther && <div className="mt-3"><AiWalletPanel compact /></div>}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => onFinish(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50">Để sau</button>
          {blocked && <button type="button" onClick={() => onFinish(true)} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700">Đã nạp xong, chạy tiếp</button>}
        </div>
      </div>
    </div>
  );
};
