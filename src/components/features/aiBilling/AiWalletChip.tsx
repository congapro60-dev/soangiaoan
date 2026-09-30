import { useEffect, useRef, useState } from 'react';
import { Wallet } from 'lucide-react';
import { useAiBillingStatus } from '../../../hooks/useAiBillingStatus';
import { chipView, type ChipTone } from '../../../lib/ai/usageToday';
import { AiUsagePopup } from './AiUsagePopup';

const TONE_CLASS: Record<ChipTone, string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
  low: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
  empty: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  info: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
};

/**
 * Chip Ví AI luôn hiện ở Header của giáo viên: "Ví 48.200đ · hôm nay −1.300đ". Bấm mở chi tiết (token, lượt gần đây,
 * còn lại của khoá riêng). Chưa đọc được số liệu thì không hiện gì — không để chip giả.
 */
export const AiWalletChip = ({ onOpenBilling }: { onOpenBilling: () => void }) => {
  const { status, refresh } = useAiBillingStatus();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!status) return null;
  const view = chipView(status);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { if (!open) void refresh(); setOpen(value => !value); }}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Chi phí AI hôm nay"
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition-colors ${TONE_CLASS[view.tone]}`}
      >
        <Wallet className="h-4 w-4 shrink-0" />
        <span className="whitespace-nowrap">{view.wallet}</span>
        <span className="hidden whitespace-nowrap font-bold opacity-70 md:inline">· {view.today}</span>
      </button>
      {open && <AiUsagePopup status={status} onClose={() => setOpen(false)} onOpenBilling={() => { setOpen(false); onOpenBilling(); }} onRefresh={refresh} />}
    </div>
  );
};
