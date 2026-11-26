import { BulkPasteKeys, KeyPoolSummary, KeyStatusChip } from './KeyPoolTools';
import { ArrowUp, LockKeyhole, Plus, Shuffle, Trash2 } from 'lucide-react';
import type { AppData } from '../../../types';
import { MAX_OWN_GEMINI_KEYS } from '../../../lib/geminiKeyRing';
import { providerKeysOf, ROTATABLE_PROVIDERS, SINGLE_KEY_FIELD, type RotatableProvider } from '../../../lib/ownKeyRotation';

type Settings = AppData['settings'];
type OtherProvider = Exclude<RotatableProvider, 'gemini'>;

/** Các ô hiện trong Cài đặt cho một hãng (không phải Gemini): danh sách đã lưu, hoặc ô khoá đơn cũ; luôn có ít nhất một ô. */
export const ownKeyRowsOf = (settings: Settings, provider: OtherProvider): string[] => {
  const rows = settings.ownApiKeys?.[provider];
  return rows && rows.length > 0 ? [...rows] : [String(settings[SINGLE_KEY_FIELD[provider]] ?? '')];
};

/** Bản vá khi đang GÕ: giữ ô trống để ô không nhảy chỗ; ô khoá đơn cũ = khoá không rỗng đầu tiên (mọi nơi kiểm "có khoá" vẫn đúng). */
export const ownKeysPatch = (settings: Settings, provider: OtherProvider, rows: readonly string[]): Partial<Settings> => {
  const list = rows.slice(0, MAX_OWN_GEMINI_KEYS).map(row => String(row ?? ''));
  return {
    ownApiKeys: { ...settings.ownApiKeys, [provider]: list },
    [SINGLE_KEY_FIELD[provider]]: list.map(row => row.trim()).find(Boolean) ?? '',
  };
};

interface FieldProps {
  label: string;
  rows: readonly string[];
  onChange: (rows: string[]) => void;
}

/** Ô nhập NHIỀU khoá cho một hãng: khoá hết hạn mức / hết tiền nạp tự nghỉ, web đổi sang khoá kế (xem `ownKeyRotation.ts`). */
export const OwnKeysField = ({ label, rows, onChange }: FieldProps) => {
  const filled = rows.filter(row => row.trim()).length;
  const setRow = (index: number, value: string) => onChange(rows.map((row, i) => (i === index ? value : row)));
  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              autoComplete="off"
              value={row}
              onChange={event => setRow(index, event.target.value)}
              placeholder={index === 0 ? `Nhập ${label} API Key...` : `Khoá ${label} thứ ${index + 1}...`}
              aria-label={`Khoá ${label} ${index + 1}`}
              className="w-full rounded-2xl border border-slate-200 bg-blue-50/40 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[var(--dewey-blue)] focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
          <KeyStatusChip value={row} />
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              aria-label={`Xoá khoá ${label} ${index + 1}`}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {rows.length < MAX_OWN_GEMINI_KEYS && (
        <button
          type="button"
          onClick={() => onChange([...rows, ''])}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-[var(--dewey-blue)] hover:text-[var(--dewey-blue)]"
        >
          <Plus className="h-3.5 w-3.5" /> Thêm khoá {label} khác
        </button>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <BulkPasteKeys rows={rows} onChange={onChange} label={label} />
        <KeyPoolSummary rows={rows} />
      </div>
      <p className="text-[11px] font-medium leading-4 text-slate-400">
        {filled > 1 ? `Đang có ${filled} khoá. ` : ''}Có nhiều khoá (nhiều tài khoản) thì dán thêm. Khoá nào hết hạn mức, hết tiền nạp hoặc bị thu hồi, web tự đổi sang khoá kế tiếp.
      </p>
    </div>
  );
};

const PROVIDER_LABEL: Record<RotatableProvider, string> = {
  gemini: 'Gemini', claude: 'Claude', openai: 'ChatGPT', grok: 'Grok', deepseek: 'DeepSeek', nvidia: 'NVIDIA', vilao: 'Vilao',
};

interface RotationProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

/**
 * Công tắc "tự chuyển hãng": hết sạch khoá của hãng đang chọn thì thử hãng khác giáo viên CÓ khoá riêng, theo thứ tự ở đây.
 * Mặc định TẮT — mỗi hãng tính tiền khác nhau, giáo viên phải tự chọn.
 */
export const KeyRotationCard = ({ settings, onChange }: RotationProps) => {
  const enabled = Boolean(settings.keyRotation?.crossProvider);
  const saved = (settings.keyRotation?.order ?? []).filter((p): p is RotatableProvider => ROTATABLE_PROVIDERS.includes(p as RotatableProvider));
  const order = [...saved, ...ROTATABLE_PROVIDERS.filter(p => !saved.includes(p))];
  const withKeys = order.filter(p => providerKeysOf(p, settings).length > 0);
  const setRotation = (patch: NonNullable<Settings['keyRotation']>) => onChange({ keyRotation: { ...settings.keyRotation, ...patch } });
  const moveUp = (provider: RotatableProvider) => {
    const next = [...order];
    const at = next.indexOf(provider);
    if (at > 0) [next[at - 1], next[at]] = [next[at], next[at - 1]];
    setRotation({ order: next });
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" className="mt-1 h-4 w-4" checked={enabled} onChange={e => setRotation({ crossProvider: e.target.checked })} />
        <span>
          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800"><Shuffle className="h-4 w-4" /> Tự chuyển sang hãng khác khi hết khoá</span>
          <span className="mt-1 block text-[11px] font-medium leading-4 text-slate-500">
            Khi mọi khoá của hãng đang chọn đều hết hạn mức hoặc hỏng, web thử tiếp các hãng thầy/cô có khoá riêng theo thứ tự dưới đây (dùng model mặc định của hãng đó). Mỗi hãng tính tiền khác nhau.
          </span>
        </span>
      </label>
      {enabled && (
        <ol className="mt-3 space-y-1.5">
          {withKeys.length === 0 && <li className="text-[11px] font-semibold text-amber-700">Chưa có hãng nào khác có khoá riêng — dán khoá ở từng hãng trước.</li>}
          {withKeys.map((provider, index) => (
            <li key={provider} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
              <span>{index + 1}. {PROVIDER_LABEL[provider]} · {providerKeysOf(provider, settings).length} khoá{provider === settings.selectedProvider ? ' (đang chọn — luôn thử trước)' : ''}</span>
              {index > 0 && (
                <button type="button" onClick={() => moveUp(provider)} aria-label={`Đưa ${PROVIDER_LABEL[provider]} lên trước`} className="rounded-lg p-1 text-slate-500 hover:bg-white hover:text-[var(--dewey-blue)]">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
