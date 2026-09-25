import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getAiKeyStatus, type AiKeyStatus } from '../../../lib/ai/aiBillingApi';
import { vnd } from '../../../lib/ai/statementPrintDoc';

/**
 * Báo khi giáo viên đăng nhập: có bài học sinh đang chờ vì AI tạm dừng, hoặc ví sắp/đã hết.
 * Chỉ hiện khi có việc cần làm — không làm phiền nhóm dùng khoá chung còn tiền.
 */
export const AiBlockedBanner = ({ onOpen }: { onOpen: () => void }) => {
  const [status, setStatus] = useState<AiKeyStatus | null>(null);

  useEffect(() => {
    getAiKeyStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  if (!status) return null;
  const blocked = status.blockedSubmissionIds.length;
  const outOfMoney = status.charged && status.balanceVnd <= 0 && (status.activeVoucher?.percent ?? 0) < 100;
  const lowBalance = status.charged && !outOfMoney && status.balanceVnd > 0 && status.balanceVnd < 20_000 && (status.activeVoucher?.percent ?? 0) < 100;
  if (!blocked && !outOfMoney && !lowBalance) return null;

  const message = blocked > 0
    ? `Có ${blocked} bài học sinh đang chờ chấm vì AI tạm dừng.`
    : outOfMoney ? 'Ví AI đã hết tiền — chấm bài bằng AI sẽ tạm dừng.' : `Ví AI còn ${vnd(status.balanceVnd)} — nên nạp thêm.`;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-bold text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0" /> {message}</p>
      <button type="button" onClick={onOpen} className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-black text-white hover:bg-amber-700">Mở Chi phí AI</button>
    </div>
  );
};
