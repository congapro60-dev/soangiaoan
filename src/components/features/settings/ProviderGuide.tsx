import { Info, ShieldAlert } from 'lucide-react';
import type { ApiProvider } from '../../../config/apiLimits';
import { PROVIDER_CONFIG_MAP } from '../../../data/models';
import {
  GUIDE_DATE,
  LESSON_PLAN_TOKENS,
  PROVIDER_GUIDES,
  compareRows,
  lessonPlanCostVnd,
} from '../../../data/providerGuide';

const modelName = (provider: ApiProvider, modelId: string): string =>
  PROVIDER_CONFIG_MAP[provider]?.models.find(model => model.id === modelId)?.name ?? modelId;

const vnd = (value: number): string => `${value.toLocaleString('vi-VN')}đ`;
const usd = (value: number): string => `$${value.toLocaleString('en-US', { maximumFractionDigits: 3 })}`;

const Footnote = () => (
  <p className="text-[11px] font-medium leading-4 text-slate-400">
    Giá tra ngày {GUIDE_DATE} từ trang chính thức của từng hãng, chỉ để tham khảo (giá đổi thường xuyên). “Một giáo án” ước tính
    {' '}{LESSON_PLAN_TOKENS.input.toLocaleString('vi-VN')} token vào và {LESSON_PLAN_TOKENS.output.toLocaleString('vi-VN')} token ra, tỷ giá 26.000đ/USD.
  </p>
);

/** Bảng so sánh nhanh các hãng: cái nào có miễn phí, cái nào phải mua API riêng, và tốn chừng bao nhiêu cho một giáo án. */
export const ProviderCompareTable = () => (
  <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
    <p className="flex items-start gap-2 text-sm font-bold leading-6 text-slate-800">
      <Info className="mt-1 h-4 w-4 shrink-0 text-[var(--dewey-blue)]" />
      <span>
        Các gói dùng trên ứng dụng (ChatGPT Plus, Claude Pro/Max, SuperGrok, Google AI Pro) <strong>không kèm API</strong>.
        Muốn dán khoá vào đây thì phải lấy khoá API riêng của hãng — Gemini có bản miễn phí, các hãng còn lại nạp tiền trả theo mức dùng.
      </span>
    </p>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead>
          <tr className="border-b border-blue-100 text-[10px] font-black uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-3">Hãng</th>
            <th className="py-2 pr-3">Cách có API</th>
            <th className="py-2 pr-3">Model nên dùng</th>
            <th className="py-2 text-right">≈ 1 giáo án</th>
          </tr>
        </thead>
        <tbody>
          {compareRows().map(row => {
            const guide = PROVIDER_GUIDES[row.provider]!;
            return (
              <tr key={row.provider} className="border-b border-blue-50 last:border-0">
                <td className="py-2 pr-3 font-black text-slate-800">{PROVIDER_CONFIG_MAP[row.provider].label}</td>
                <td className="py-2 pr-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${guide.hasFreeTier ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {guide.hasFreeTier ? 'Có bản miễn phí' : 'Mua API riêng'}
                  </span>
                </td>
                <td className="py-2 pr-3 font-semibold text-slate-600">{row.pick ? modelName(row.provider, row.pick.modelId) : 'Tuỳ model NVIDIA cấp'}</td>
                <td className="py-2 text-right font-black text-slate-800">{row.costVnd !== null ? vnd(row.costVnd) : 'Miễn phí thử'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    <Footnote />
  </div>
);

/** Hướng dẫn cho hãng đang chọn: có phải mua không, nạp bao nhiêu, các bước lấy khoá, model nên dùng và giá. */
export const ProviderGuideCard = ({ provider }: { provider: ApiProvider }) => {
  const guide = PROVIDER_GUIDES[provider];
  if (!guide) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${guide.hasFreeTier ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {guide.hasFreeTier ? 'Có bản miễn phí' : 'Phải mua API riêng'}
        </span>
        <p className="text-sm font-bold text-slate-800">{guide.verdict}</p>
      </div>

      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-xl bg-white p-3">
          <dt className="font-black uppercase tracking-wide text-slate-400">Gói dùng trên ứng dụng</dt>
          <dd className="mt-1 font-semibold leading-5 text-slate-700">{guide.subscription}</dd>
        </div>
        <div className="rounded-xl bg-white p-3">
          <dt className="font-black uppercase tracking-wide text-slate-400">Chi phí bắt đầu</dt>
          <dd className="mt-1 font-semibold leading-5 text-slate-700">{guide.minTopUp}</dd>
        </div>
      </dl>

      <div>
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Cách lấy khoá</p>
        <ol className="mt-1 space-y-1">
          {guide.steps.map((step, index) => (
            <li key={step} className="flex gap-2 text-xs font-semibold leading-5 text-slate-600">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-black text-slate-500">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {guide.picks.length > 0 && (
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Nên chọn model nào</p>
          <ul className="mt-1 divide-y divide-slate-100 rounded-xl bg-white">
            {guide.picks.map(pick => (
              <li key={pick.modelId} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3 py-2">
                <div>
                  <p className="text-xs font-black text-slate-800">
                    {modelName(provider, pick.modelId)} <span className="ml-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-700">{pick.role}</span>
                  </p>
                  {pick.note && <p className="text-[11px] font-semibold text-slate-400">{pick.note}</p>}
                </div>
                <p className="text-right text-[11px] font-semibold text-slate-500">
                  {usd(pick.inUsd)} vào · {usd(pick.outUsd)} ra / 1 triệu token
                  <span className="ml-2 font-black text-slate-800">≈ {vnd(lessonPlanCostVnd(pick))} / giáo án</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {guide.caution && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {guide.caution}
        </p>
      )}
      <Footnote />
    </div>
  );
};
