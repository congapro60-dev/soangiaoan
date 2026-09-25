import { useEffect, useState } from 'react';
import { PauseCircle, X } from 'lucide-react';
import { blockReasonText, type AiKeyBlockReason } from '../../../lib/admin/aiKeyPolicy';
import { setAiKeyGateResolver } from '../../../lib/ai/aiKeyGate';
import { AiWalletPanel } from './AiWalletPanel';

/**
 * Hộp "AI đang tạm dừng" — mở khi máy chủ trả 402 AI_KEY_REQUIRED cho bất kỳ thao tác AI nào của giáo viên.
 * Xử lý ngay tại chỗ (nạp QR / mã giảm giá / khoá riêng / đồng ý / nâng trần) rồi bấm "Thử lại" → yêu cầu cũ
 * được gửi lại tự động.
 */
export const AiKeyGateModal = () => {
  const [request, setRequest] = useState<{ reason: AiKeyBlockReason; resolve: (retry: boolean) => void } | null>(null);

  useEffect(() => {
    setAiKeyGateResolver(reason => new Promise<boolean>(resolve => setRequest({ reason, resolve })));
    return () => setAiKeyGateResolver(null);
  }, []);

  if (!request) return null;
  const finish = (retry: boolean) => {
    request.resolve(retry);
    setRequest(null);
  };

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
