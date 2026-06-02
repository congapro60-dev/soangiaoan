import { Activity, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useApiUsage } from '../../hooks/useApiUsage';
import type { ApiProvider } from '../../config/apiLimits';
import type { ProviderModel } from '../../data/models';

interface ApiUsagePanelProps {
  provider: ApiProvider;
  model: ProviderModel;
  onReset?: () => void;
}

const formatNumber = (value: number): string => value.toLocaleString('vi-VN');
const formatDate = (date: string): string => date.replaceAll('-', '/');

const progressColor = (percent: number): string => {
  if (percent > 95) return 'bg-red-500';
  if (percent >= 80) return 'bg-amber-500';
  return 'bg-emerald-600';
};

const statusClasses = {
  safe: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-100 bg-amber-50 text-amber-700',
  danger: 'border-red-100 bg-red-50 text-red-700',
} as const;

export const ApiUsagePanel = ({ provider, model, onReset }: ApiUsagePanelProps) => {
  const usage = useApiUsage(provider, model.id);
  const statusText = usage.statusLevel === 'safe'
    ? `RPM hiện tại: ${formatNumber(usage.rpm)} / ${formatNumber(model.rpmLimit)}. Vẫn trong ngưỡng an toàn.`
    : usage.statusLevel === 'warning'
      ? 'Gần đạt giới hạn giả định. API vẫn hoạt động bình thường.'
      : 'Đã vượt giới hạn ước tính. Nếu gặp lỗi 429, hãy chờ 1 phút.';

  return (
    <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-slate-800">
            <Activity className="h-4 w-4 text-emerald-600" />
            Hạn mức API hôm nay
          </div>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            {model.name} <span className="font-mono">({model.id})</span> · {formatDate(usage.date)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            usage.reset();
            onReset?.();
          }}
          className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span>Requests đã dùng / ngày</span>
            <span>{formatNumber(usage.requestsToday)} / {formatNumber(model.rpdLimit)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div className={cn('h-full rounded-full transition-all', progressColor(usage.rpdPercent))} style={{ width: `${usage.rpdPercent}%` }} />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span>Tokens đã dùng / phút</span>
            <span>{formatNumber(usage.tokensUsedCurrentMinute)} / {formatNumber(model.tpmLimit)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div className={cn('h-full rounded-full transition-all', progressColor(usage.tpmPercent))} style={{ width: `${usage.tpmPercent}%` }} />
          </div>
        </div>
      </div>

      <div className={cn('flex items-start gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold', statusClasses[usage.statusLevel])}>
        {usage.statusLevel === 'safe'
          ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
        <span>{statusText}</span>
      </div>

      <p className="text-[10px] font-semibold leading-relaxed text-slate-500">
        Soft limit chỉ dùng để cảnh báo UI, không chặn request nếu API vẫn phản hồi.
      </p>
      {provider === 'deepseek' && (
        <p className="text-[10px] font-semibold leading-relaxed text-amber-700">
          * Giới hạn ước tính — DeepSeek dùng dynamic throttling.
        </p>
      )}
    </div>
  );
};
