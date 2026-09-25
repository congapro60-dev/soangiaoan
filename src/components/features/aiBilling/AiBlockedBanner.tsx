import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getAiKeyStatus, type AiKeyStatus } from '../../../lib/ai/aiBillingApi';
import { aiBannerMessage } from '../../../lib/ai/aiBanner';

const DISMISS_KEY = 'aiBannerDismissed';

const wasDismissed = (): boolean => {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Báo khi giáo viên đăng nhập: bài học sinh đang chờ vì AI tạm dừng, chưa chọn cách dùng AI (khoá riêng / đồng ý
 * trả phí), hoặc ví sắp/đã hết. "Để sau" chỉ ẩn trong phiên này — lần đăng nhập sau vẫn nhắc.
 */
export const AiBlockedBanner = ({ onOpen }: { onOpen: () => void }) => {
  const [status, setStatus] = useState<AiKeyStatus | null>(null);
  const [dismissed, setDismissed] = useState(wasDismissed);

  useEffect(() => {
    getAiKeyStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  const message = status ? aiBannerMessage(status) : null;
  if (!message || dismissed) return null;

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* chỉ ẩn tạm trong trang này */ }
    setDismissed(true);
  };

  return (
    <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${message.urgent ? 'border-amber-300 bg-amber-50' : 'border-indigo-200 bg-indigo-50'}`}>
      <p className={`flex items-center gap-2 text-sm font-bold ${message.urgent ? 'text-amber-900' : 'text-indigo-900'}`}><AlertTriangle className="h-4 w-4 shrink-0" /> {message.text}</p>
      <div className="flex gap-2">
        <button type="button" onClick={dismiss} className="rounded-xl px-3 py-2 text-xs font-black text-slate-500 hover:bg-white/70">Để sau</button>
        <button type="button" onClick={onOpen} className={`rounded-xl px-3 py-2 text-xs font-black text-white ${message.urgent ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>Mở Chi phí AI</button>
      </div>
    </div>
  );
};
