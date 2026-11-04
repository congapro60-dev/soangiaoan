import { Brain } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { EFFORT_LEVEL_INFO, effortSupportFor } from '../../../data/reasoningEffort';

interface EffortPickerProps {
  provider: string;
  /** Model sẽ chạy (mỗi model có danh sách mức riêng). */
  model: string;
  /** Mức đã chọn của hãng này; vắng = mặc định của model. */
  value: string | undefined;
  onChange: (level: string | undefined) => void;
}

/**
 * Chọn MỨC SUY NGHĨ của model (như ô "mức" trong Gemini/Claude/ChatGPT). Mỗi mức là một tham số API thật gửi kèm lượt gọi:
 * mức cao model nghĩ lâu hơn nên chính xác hơn ở bài khó nhưng chậm hơn và tốn token (tiền) hơn. Model nào không có mức thì
 * không hiện ô này.
 */
export const EffortPicker = ({ provider, model, value, onChange }: EffortPickerProps) => {
  const support = effortSupportFor(provider, model);
  if (!support) return null;

  const chosen = value && support.levels.includes(value) ? value : undefined;
  const shown = chosen ?? support.defaultLevel;
  const defaultLabel = support.defaultLevel ? `Mặc định (${EFFORT_LEVEL_INFO[support.defaultLevel]?.label ?? support.defaultLevel})` : 'Mặc định của model';

  const button = (id: string | undefined, label: string) => {
    const active = chosen === id;
    return (
      <button
        key={id ?? 'default'}
        type="button"
        onClick={() => onChange(id)}
        aria-pressed={active}
        className={cn(
          'rounded-xl border px-3 py-2 text-xs font-bold transition',
          active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/60',
        )}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><Brain className="h-4 w-4 text-blue-600" /> Mức suy nghĩ</div>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Mức cao: model nghĩ kỹ hơn nên chính xác hơn ở việc khó, nhưng chậm hơn và tốn nhiều token (tiền) hơn. Áp dụng cho mọi tính năng AI của hãng này.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {button(undefined, defaultLabel)}
        {support.levels.map(level => button(level, EFFORT_LEVEL_INFO[level]?.label ?? level))}
      </div>
      {shown && EFFORT_LEVEL_INFO[shown] && (
        <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">
          <span className="font-black text-slate-800">{EFFORT_LEVEL_INFO[shown].label}:</span> {EFFORT_LEVEL_INFO[shown].desc}
        </p>
      )}
    </div>
  );
};
