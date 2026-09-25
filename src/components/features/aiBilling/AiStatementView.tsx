import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { AiStatement } from '../../../lib/ai/aiBillingApi';
import { featureLabel } from '../../../lib/ai/featureLabels';
import { exportStatementPdf, monthLabel, vnd } from '../../../lib/ai/statementPrintDoc';

interface Props {
  load: (month?: string) => Promise<AiStatement>;
  teacherLabel: string;
}

const when = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('vi-VN', { hour12: false });
};

/** Sao kê ví AI theo tháng: đầu kỳ, nạp, điều chỉnh, từng lượt bị trừ (minh chứng), cuối kỳ + tải PDF. */
export const AiStatementView = ({ load, teacherLabel }: Props) => {
  const [month, setMonth] = useState<string | undefined>(undefined);
  const [data, setData] = useState<AiStatement | null>(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError('');
    load(month).then(result => { if (!cancelled) setData(result); }).catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được sao kê.'); });
    return () => { cancelled = true; };
  }, [load, month]);

  if (error) return <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>;
  if (!data) return <p className="flex items-center gap-2 py-6 text-sm font-semibold text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Đang lập sao kê…</p>;

  const isCurrent = data.month === data.currentMonth;
  const tiles = [
    { label: 'Đầu kỳ', value: vnd(data.openingVnd) },
    { label: 'Nạp vào', value: `+${vnd(data.topupVnd)}` },
    { label: 'Điều chỉnh', value: `${data.adjustVnd >= 0 ? '+' : ''}${vnd(data.adjustVnd)}` },
    { label: `Đã trừ · ${data.items.length} lượt`, value: `−${vnd(data.chargeVnd)}` },
    { label: isCurrent ? 'Tới hiện tại' : 'Cuối kỳ', value: vnd(data.closingVnd) },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select value={data.month} onChange={event => setMonth(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none">
            {data.months.map(m => <option key={m} value={m}>{monthLabel(m)}{m === data.currentMonth ? ' (đang chạy)' : ''}</option>)}
          </select>
          {isCurrent && <span className="text-xs font-semibold text-slate-500">Tháng đang chạy — sao kê chốt ngày 1 tháng sau.</span>}
        </div>
        <button type="button" disabled={exporting} onClick={() => { setExporting(true); void exportStatementPdf(data, teacherLabel).finally(() => setExporting(false)); }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Tải PDF sao kê
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {tiles.map(tile => (
          <div key={tile.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{tile.label}</p>
            <p className="text-base font-black text-slate-900">{tile.value}</p>
          </div>
        ))}
      </div>
      {data.discountVnd > 0 && <p className="text-xs font-semibold text-violet-700">Mã giảm giá đã giảm {vnd(data.discountVnd)} trên giá gốc {vnd(data.grossVnd)}.</p>}

      {data.topups.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-xs">
            <thead><tr className="bg-emerald-50 text-left font-black text-emerald-800"><th className="px-3 py-2">Tiền nạp</th><th className="px-3 py-2">Ngân hàng · mã giao dịch</th><th className="px-3 py-2">Nội dung</th><th className="px-3 py-2 text-right">Số tiền</th></tr></thead>
            <tbody>{data.topups.map(t => (
              <tr key={t.sepayId} className="border-t border-slate-100"><td className="px-3 py-2">{when(t.at)}</td><td className="px-3 py-2">{t.gateway} · {t.referenceCode}</td><td className="px-3 py-2">{t.content}</td><td className="px-3 py-2 text-right font-black text-emerald-700">+{vnd(t.amountVnd)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {data.adjustments.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-xs">
            <thead><tr className="bg-slate-50 text-left font-black text-slate-600"><th className="px-3 py-2">Điều chỉnh</th><th className="px-3 py-2">Lý do</th><th className="px-3 py-2 text-right">Số tiền</th></tr></thead>
            <tbody>{data.adjustments.map((a, index) => (
              <tr key={index} className="border-t border-slate-100"><td className="px-3 py-2">{when(a.at)}</td><td className="px-3 py-2">{a.reason}</td><td className="px-3 py-2 text-right font-black">{a.amountVnd > 0 ? '+' : ''}{vnd(a.amountVnd)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="min-w-full text-xs">
          <thead><tr className="bg-slate-50 text-left font-black text-slate-600">
            <th className="px-3 py-2">Thời gian</th><th className="px-3 py-2">Tính năng · lớp · bài · học sinh</th><th className="px-3 py-2 text-right">Token</th>
            <th className="px-3 py-2 text-right">Giá gốc</th><th className="px-3 py-2 text-right">Giảm</th><th className="px-3 py-2 text-right">Trừ ví</th>
          </tr></thead>
          <tbody>
            {data.items.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center font-semibold text-slate-400">Chưa có lượt nào bị trừ ví trong tháng này.</td></tr>}
            {data.items.map(item => (
              <tr key={item.id} className="border-t border-slate-100 align-top">
                <td className="whitespace-nowrap px-3 py-2">{when(item.at)}</td>
                <td className="px-3 py-2">
                  <p className="font-bold text-slate-800">{featureLabel(item.feature)}</p>
                  <p className="text-slate-500">{[item.className, item.assignmentTitle, item.studentName].filter(Boolean).join(' · ')}</p>
                </td>
                <td className="px-3 py-2 text-right" title={`vào ${item.inputTokens} · ra ${item.outputTokens} · suy nghĩ ${item.thoughtsTokens} · 1 USD = ${item.usdVnd}đ`}>{(item.inputTokens + item.outputTokens + item.thoughtsTokens).toLocaleString('vi-VN')}</td>
                <td className="px-3 py-2 text-right">{vnd(item.grossVnd)}</td>
                <td className="px-3 py-2 text-right">{item.discountPct ? `${item.discountPct}%` : '—'}</td>
                <td className="px-3 py-2 text-right font-black">{vnd(item.chargeVnd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.ownKeyCalls > 0 && <p className="text-[11px] font-semibold text-slate-400">+ {data.ownKeyCalls} lượt chạy bằng khoá riêng — không trừ ví.</p>}
    </div>
  );
};
