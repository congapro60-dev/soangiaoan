import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2, RefreshCw, Wallet, X } from 'lucide-react';
import { getAiStatement, type AiKeyStatus, type AiStatement } from '../../../lib/ai/aiBillingApi';
import { featureLabel } from '../../../lib/ai/featureLabels';
import { formatCount, formatVnd, itemsOfDay, quotaRow, quotaTone, summarizeDay, type QuotaRow } from '../../../lib/ai/usageToday';
import { listTodayTokenUsage, USAGE_UPDATED_EVENT } from '../../../hooks/useTokenTracker';

interface Props {
  status: AiKeyStatus;
  onClose: () => void;
  onOpenBilling: () => void;
  onRefresh: () => Promise<void>;
}

const BAR_COLOR = { ok: 'bg-emerald-500', warn: 'bg-amber-500', danger: 'bg-rose-500', none: 'bg-slate-300' } as const;
const KEY_STATE = {
  ok: { text: 'Đang dùng được', className: 'bg-emerald-50 text-emerald-700' },
  exhausted: { text: 'Hết hạn mức (thử lại sau 60 phút)', className: 'bg-amber-50 text-amber-700' },
  invalid: { text: 'Khoá không dùng được', className: 'bg-rose-50 text-rose-700' },
} as const;

const timeOf = (iso: string): string =>
  new Date(iso).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });

const useOwnKeyRows = (): QuotaRow[] => {
  const [rows, setRows] = useState(() => listTodayTokenUsage().map(quotaRow));
  useEffect(() => {
    const update = () => setRows(listTodayTokenUsage().map(quotaRow));
    window.addEventListener(USAGE_UPDATED_EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(USAGE_UPDATED_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return rows;
};

const Tile = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2">
    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-0.5 text-lg font-black text-slate-900">{value}</p>
    {hint && <p className="text-[10px] font-semibold text-slate-500">{hint}</p>}
  </div>
);

/**
 * Chi tiết "AI hôm nay" mở từ chip Ví AI. Hai nguồn tách bạch:
 *  - Ví web: tiền + token của khoá chung (sao kê máy chủ, đọc một lần khi mở);
 *  - Khoá riêng: còn lại theo hạn mức tham chiếu của model (Google không trả số dư khoá).
 */
export const AiUsagePopup = ({ status, onClose, onOpenBilling, onRefresh }: Props) => {
  const [statement, setStatement] = useState<AiStatement | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const ownRows = useOwnKeyRows();

  const loadStatement = useCallback(async () => {
    if (!status.charged) return;
    setLoading(true);
    setError('');
    try {
      setStatement(await getAiStatement(undefined, { quiet: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được các lượt gần đây.');
    } finally {
      setLoading(false);
    }
  }, [status.charged]);

  // Sao kê đọc toàn bộ sổ của giáo viên → chỉ đọc khi mở hoặc khi bấm làm mới, không đọc theo mỗi lượt AI.
  useEffect(() => { void loadStatement(); }, [loadStatement]);

  const summary = statement ? summarizeDay(statement.items, status.today) : null;
  const recent = statement ? itemsOfDay(statement.items, status.today).slice(0, 6) : [];
  const capPct = status.capVnd ? Math.min(100, Math.round((status.spentVnd / status.capVnd) * 100)) : null;
  const keyState = status.keyStatus ? KEY_STATE[status.keyStatus] : null;

  return (
    <div role="dialog" aria-label="Chi phí AI hôm nay" className="fixed inset-x-4 top-[5.25rem] z-50 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[420px]">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-black text-slate-800">AI hôm nay</h3>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => { void onRefresh(); void loadStatement(); }} title="Làm mới" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" onClick={onClose} title="Đóng" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
        <section className="rounded-2xl border border-slate-200 p-3">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-700"><Wallet className="h-4 w-4" /> Ví web</p>
          {!status.gateEnabled && <p className="mt-2 text-xs font-semibold text-slate-600">Web chưa bật tính phí: lượt dùng khoá chung hiện miễn phí, ví chưa bị trừ. Hôm nay ước tính {formatVnd(status.todayVnd)} ({status.todayCalls} lượt).</p>}
          {status.gateEnabled && status.exempt && <p className="mt-2 text-xs font-semibold text-slate-600">Tài khoản của thầy/cô dùng khoá chung không bị trừ ví. Hôm nay ước tính {formatVnd(status.todayVnd)} ({status.todayCalls} lượt).</p>}
          {status.charged && (
            <>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-2xl font-black text-slate-900">{formatVnd(Math.max(0, status.balanceVnd))}</p>
                  <p className="text-[11px] font-semibold text-slate-500">số dư · hôm nay −{formatVnd(status.todayVnd)} ({status.todayCalls} lượt) · tháng này −{formatVnd(status.spentVnd)}</p>
                </div>
                <button type="button" onClick={onOpenBilling} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-700">Nạp tiền · Sao kê</button>
              </div>
              {capPct !== null && (
                <div className="mt-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${capPct >= 90 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${capPct}%` }} /></div>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">{capPct}% trần tháng {formatVnd(status.capVnd ?? 0)}</p>
                </div>
              )}
              {error && <p className="mt-2 rounded-lg bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-700">{error}</p>}
              {summary && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Tile label="Lượt gọi" value={formatCount(summary.calls)} />
                  <Tile label="Tiền đã trừ" value={formatVnd(summary.chargeVnd)} />
                  <Tile label="Token vào" value={formatCount(summary.inputTokens)} hint={`${formatCount(summary.cachedTokens)} từ bộ nhớ đệm`} />
                  <Tile label="Token ra" value={formatCount(summary.outputTokens)} hint="gồm cả token suy nghĩ" />
                </div>
              )}
              {!statement && loading && <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải các lượt gần đây…</p>}
              {statement && (
                <div className="mt-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Lượt gần đây</p>
                  {recent.length === 0 ? (
                    <p className="mt-1 text-xs font-semibold text-slate-400">Hôm nay chưa có lượt nào trừ ví.</p>
                  ) : (
                    <ul className="mt-1 divide-y divide-slate-100">
                      {recent.map(item => {
                        const context = [item.className, item.assignmentTitle, item.studentName].filter(Boolean).join(' · ');
                        return (
                          <li key={item.id} className="flex items-start justify-between gap-3 py-1.5">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-black text-slate-800">{featureLabel(item.feature)}</p>
                              {context && <p className="truncate text-[11px] font-semibold text-slate-500">{context}</p>}
                              <p className="text-[11px] font-semibold text-slate-400">{formatCount(item.inputTokens)} vào · {formatCount(item.outputTokens + item.thoughtsTokens)} ra</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-xs font-black text-slate-800">−{formatVnd(item.chargeVnd)}</p>
                              <p className="text-[11px] font-semibold text-slate-400">{timeOf(item.at)}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 p-3">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-indigo-700"><KeyRound className="h-4 w-4" /> Khoá riêng của thầy/cô</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {status.hasKey && keyState ? (
              <>
                <span className="font-mono font-black text-slate-800">AIza…{status.last4}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${keyState.className}`}>{keyState.text}</span>
                <span className="font-semibold text-slate-500">(khoá lưu trên máy chủ, dùng khi chấm bài học sinh)</span>
              </>
            ) : (
              <span className="font-semibold text-slate-500">Chưa lưu khoá riêng trên máy chủ.</span>
            )}
          </div>
          <div className="mt-3 space-y-2.5">
            {ownRows.length === 0 && <p className="text-xs font-semibold text-slate-400">Hôm nay chưa có lượt nào bằng khoá riêng ở trình duyệt này.</p>}
            {ownRows.map(row => (
              <div key={`${row.provider}:${row.model}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-xs font-black text-slate-800">{row.label}</p>
                  <p className="shrink-0 text-[11px] font-bold text-slate-500">
                    {row.limit ? `${formatCount(row.requests)} / ${formatCount(row.limit)} lượt` : `${formatCount(row.requests)} lượt`}
                    {row.remainingPct !== null && ` · còn ${row.remainingPct}%`}
                  </p>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${BAR_COLOR[quotaTone(row.remainingPct)]}`} style={{ width: `${row.remainingPct ?? 100}%` }} />
                </div>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{formatCount(row.tokens)} token hôm nay</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] font-semibold leading-4 text-slate-400">
            Ước tính: Google không cho biết số dư khoá. Thanh "còn lại" so số lượt đã gọi từ trình duyệt này với hạn mức tham chiếu của model, nên khoá trả phí hoặc dùng ở nơi khác có thể lệch.
          </p>
        </section>
      </div>
    </div>
  );
};
