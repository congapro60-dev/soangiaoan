import { useEffect, useMemo, useState } from 'react';
import { Coins, Download, Loader2, RefreshCw, School, ShieldCheck, Users } from 'lucide-react';
import {
  fetchVcbUsdRate, loadAdminOverview, loadAdminUsage, saveAdminSettings, todayVn,
  type AdminBillingSettings, type AdminOverview, type AdminUsage,
} from '../../lib/admin/adminApi';
import { allocateByCount, buildBillingCsv, type BillingLine } from '../../lib/admin/billing';
import { modelLabel, PRICE_SOURCES, usdToVnd } from '../../lib/admin/aiPricing';
import { ClassSetupPanel } from '../features/admin/ClassSetupPanel';

const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} đ`;
const num = (n: number) => Math.round(n).toLocaleString('vi-VN');
const ngay = (value: string | null) => (value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—');

/**
 * Trang quản trị của chủ dự án: ai đã dùng web, lớp của từng giáo viên, token AI + tiền theo giáo viên.
 * Hai loại tiền tách bạch: ĐO THẬT (từ bộ đếm) và ƯỚC TÍNH (giai đoạn trước bộ đếm, chia tổng Google thực thu).
 */
export const AdminTab = () => {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [usage, setUsage] = useState<AdminUsage | null>(null);
  const [settings, setSettings] = useState<AdminBillingSettings | null>(null);
  const [fromDay, setFromDay] = useState('');
  const [toDay, setToDay] = useState(todayVn());
  const [includeEstimate, setIncludeEstimate] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (label: string, work: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    setNotice(null);
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'Có lỗi xảy ra.'); } finally { setBusy(null); }
  };

  const refreshOverview = () => run('overview', async () => {
    const data = await loadAdminOverview();
    setOverview(data);
    setSettings(data.settings);
    setFromDay(prev => prev || data.meteringStartDay);
  });

  const refreshUsage = () => run('usage', async () => {
    setUsage(await loadAdminUsage(fromDay || overview?.meteringStartDay || todayVn(), toDay));
  });

  useEffect(() => { void refreshOverview(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const labelOf = useMemo(() => {
    const byUid = new Map((overview?.users ?? []).map(u => [u.uid, u.displayName ? `${u.displayName} (${u.email ?? u.uid})` : (u.email ?? u.uid)]));
    return (uid: string) => (uid === 'unknown' ? 'Không xác định được người dùng' : byUid.get(uid) ?? uid);
  }, [overview]);

  const classesByTeacher = useMemo(() => {
    const map = new Map<string, AdminOverview['classes']>();
    for (const cls of overview?.classes ?? []) map.set(cls.teacherId, [...(map.get(cls.teacherId) ?? []), cls]);
    return [...map.entries()].sort((a, b) => labelOf(a[0]).localeCompare(labelOf(b[0]), 'vi'));
  }, [overview, labelOf]);

  const lines: BillingLine[] = useMemo(() => {
    if (!settings) return [];
    const estimate = includeEstimate && overview ? allocateByCount(settings.preMeteringVnd, overview.aiEventsBefore) : {};
    const teachers = new Set<string>([...(usage?.rows ?? []).map(r => r.billTo), ...Object.keys(estimate)]);
    return [...teachers].map(uid => {
      const row = usage?.rows.find(r => r.billTo === uid);
      return {
        teacherLabel: labelOf(uid),
        calls: row?.calls ?? 0,
        inputTokens: row?.inputTokens ?? 0,
        outputTokens: (row?.outputTokens ?? 0) + (row?.thoughtsTokens ?? 0),
        costUsd: row?.costUsd ?? 0,
        measuredVnd: usdToVnd(row?.costUsd ?? 0, settings.usdVnd),
        estimatedVnd: estimate[uid] ?? 0,
      };
    }).sort((a, b) => (b.measuredVnd + b.estimatedVnd) - (a.measuredVnd + a.estimatedVnd));
  }, [usage, settings, overview, includeEstimate, labelOf]);

  const unpriced = (usage?.rows ?? []).reduce((acc, r) => acc + r.unpricedCalls, 0);
  const totalVnd = lines.reduce((acc, l) => acc + l.measuredVnd + l.estimatedVnd, 0);

  const exportCsv = () => {
    if (!settings) return;
    const csv = buildBillingCsv(lines, { period: `${usage?.fromDay ?? fromDay} → ${usage?.toDay ?? toDay}`, usdVnd: settings.usdVnd, rateNote: settings.usdVndNote });
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `bang-ke-chi-phi-AI-${usage?.fromDay ?? fromDay}_${usage?.toDay ?? toDay}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const card = 'rounded-3xl border border-slate-100 bg-white p-5 shadow-sm';

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <div className={`${card} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600"><ShieldCheck className="h-4 w-4" /> Quản trị hệ thống</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">Người dùng, lớp học và chi phí AI</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">Chỉ tài khoản chủ dự án xem được trang này. Trang chỉ đọc dữ liệu của giáo viên khác, không sửa gì.</p>
        </div>
        <button type="button" onClick={() => void refreshOverview()} disabled={busy !== null} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {busy === 'overview' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Làm mới
        </button>
      </div>

      {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
      {notice && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</p>}
      {!overview && busy === 'overview' && <p className="py-10 text-center text-sm font-semibold text-slate-400">Đang tải dữ liệu quản trị…</p>}

      {overview && (
        <>
          {/* 1. Người dùng */}
          <section className={card}>
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800"><Users className="h-4 w-4" /> 1. Ai đã dùng web</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">{overview.users.length} tài khoản giáo viên · {num(overview.anonymousCount)} phiên học sinh (vào bằng mã lớp + PIN, ẩn danh).</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">Tài khoản</th><th className="py-2 pr-3">Tạo lúc</th><th className="py-2 pr-3">Đăng nhập gần nhất</th><th className="py-2 pr-3">Hoạt động gần nhất</th><th className="py-2 pr-3 text-right">Số lớp</th>
                </tr></thead>
                <tbody>
                  {[...overview.users].sort((a, b) => String(b.lastActiveAt ?? '').localeCompare(String(a.lastActiveAt ?? ''))).map(u => (
                    <tr key={u.uid} className="border-t border-slate-100">
                      <td className="py-2 pr-3 font-bold text-slate-800">{u.displayName || '—'}<span className="block text-xs font-semibold text-slate-500">{u.email ?? u.uid}</span></td>
                      <td className="py-2 pr-3 text-xs text-slate-600">{ngay(u.createdAt)}</td>
                      <td className="py-2 pr-3 text-xs text-slate-600">{ngay(u.lastSignInAt)}</td>
                      <td className="py-2 pr-3 text-xs text-slate-600">{ngay(u.lastActiveAt)}</td>
                      <td className="py-2 pr-3 text-right font-black text-slate-800">{overview.classes.filter(c => c.teacherId === u.uid).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 2. Lớp theo giáo viên */}
          <section className={card}>
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800"><School className="h-4 w-4" /> 2. Lớp học theo giáo viên</h2>
            <div className="mt-3 space-y-4">
              {classesByTeacher.map(([teacherId, classes]) => (
                <div key={teacherId}>
                  <p className="text-sm font-black text-indigo-900">{labelOf(teacherId)}</p>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead><tr className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        <th className="py-1.5 pr-3">Lớp</th><th className="py-1.5 pr-3 text-right">Sĩ số</th><th className="py-1.5 pr-3 text-right">Bài giao</th><th className="py-1.5 pr-3 text-right">Bài nộp</th><th className="py-1.5 pr-3 text-right">AI đã chấm</th><th className="py-1.5 pr-3">Nối Sheet</th>
                      </tr></thead>
                      <tbody>
                        {classes.map(c => (
                          <tr key={c.id} className="border-t border-slate-100">
                            <td className="py-1.5 pr-3 font-bold text-slate-800">{c.name}</td>
                            <td className="py-1.5 pr-3 text-right">{c.studentCount}</td>
                            <td className="py-1.5 pr-3 text-right">{c.assignmentCount}</td>
                            <td className="py-1.5 pr-3 text-right">{c.submissionCount}</td>
                            <td className="py-1.5 pr-3 text-right">{c.gradedCount}</td>
                            <td className="py-1.5 pr-3 text-xs font-semibold text-slate-500">{[c.hasSheetSync && 'BTVN', c.hasExamSheet && 'Điểm thi'].filter(Boolean).join(' · ') || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {classesByTeacher.length === 0 && <p className="text-sm font-semibold text-slate-400">Chưa có lớp nào.</p>}
            </div>
          </section>

          {/* 3. Cài đặt tính tiền */}
          {settings && (
            <section className={card}>
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800"><Coins className="h-4 w-4" /> 3. Cài đặt tính tiền</h2>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-600">Tỷ giá 1 USD (VNĐ)</label>
                  <div className="flex gap-2">
                    <input type="number" value={settings.usdVnd} onChange={e => setSettings({ ...settings, usdVnd: Number(e.target.value) })} className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" />
                    <button type="button" disabled={busy !== null} onClick={() => void run('vcb', async () => {
                      const r = await fetchVcbUsdRate();
                      setSettings(s => s && { ...s, usdVnd: r.sell, usdVndNote: `Vietcombank bán ra ${r.dateTime}` });
                      setNotice(`Tỷ giá Vietcombank bán ra: ${num(r.sell)} đ (${r.dateTime}). Bấm Lưu để áp dụng.`);
                    })} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                      {busy === 'vcb' && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Lấy tỷ giá VCB hôm nay
                    </button>
                  </div>
                  <input value={settings.usdVndNote} onChange={e => setSettings({ ...settings, usdVndNote: e.target.value })} placeholder="Ghi chú nguồn tỷ giá" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-600">Tổng Google thực thu TRƯỚC {overview.meteringStartDay} (VNĐ, xem AI Studio → Spend)</label>
                  <input type="number" value={settings.preMeteringVnd} onChange={e => setSettings({ ...settings, preMeteringVnd: Number(e.target.value) })} className="w-48 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" />
                  <input value={settings.preMeteringNote} onChange={e => setSettings({ ...settings, preMeteringNote: e.target.value })} placeholder="VD: AI Studio, project Albot, 27/06–23/09/2026" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" />
                </div>
              </div>
              <button type="button" disabled={busy !== null} onClick={() => void run('save', async () => {
                const r = await saveAdminSettings(settings);
                setSettings(r.settings);
                setNotice('Đã lưu cài đặt tính tiền.');
              })} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50">
                {busy === 'save' && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Lưu cài đặt
              </button>
              <p className="mt-2 text-[11px] font-semibold text-slate-400">Giá niêm yết: Gemini — {PRICE_SOURCES.gemini}; GLM — {PRICE_SOURCES.gateway}. Giá Flash tăng gấp đôi từ 01/01/2027, app tự áp theo ngày phát sinh.</p>
            </section>
          )}

          {/* 4. Chi phí AI theo giáo viên */}
          <section className={card}>
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800"><Coins className="h-4 w-4" /> 4. Chi phí AI theo giáo viên</h2>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="text-xs font-black text-slate-600">Từ ngày<input type="date" value={fromDay} onChange={e => setFromDay(e.target.value)} className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="text-xs font-black text-slate-600">Đến ngày<input type="date" value={toDay} onChange={e => setToDay(e.target.value)} className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="flex items-center gap-2 pb-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={includeEstimate} onChange={e => setIncludeEstimate(e.target.checked)} /> Cộng phần ước tính trước bộ đếm</label>
              <button type="button" onClick={() => void refreshUsage()} disabled={busy !== null || !fromDay} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50">
                {busy === 'usage' && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Tính tiền
              </button>
              <button type="button" onClick={exportCsv} disabled={lines.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                <Download className="h-3.5 w-3.5" /> Xuất bảng kê CSV
              </button>
            </div>
            <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-500">
              <b>Đo thật</b>: token từ bộ đếm (bắt đầu {overview.meteringStartDay}) × giá niêm yết × tỷ giá. <b>Ước tính</b>: tổng Google thực thu trước ngày đó, chia theo tỷ lệ số lượt AI chấm bài của từng giáo viên. Lượt học sinh nộp bài tính cho giáo viên chủ lớp.
            </p>
            {unpriced > 0 && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Có {unpriced} lượt dùng model chưa có trong bảng giá — tiền của các lượt này chưa được tính.</p>}
            {usage && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3">Giáo viên</th><th className="py-2 pr-3 text-right">Lượt AI</th><th className="py-2 pr-3 text-right">Token vào</th><th className="py-2 pr-3 text-right">Token ra</th><th className="py-2 pr-3 text-right">Đo thật</th><th className="py-2 pr-3 text-right">Ước tính</th><th className="py-2 pr-3 text-right">Tổng</th>
                  </tr></thead>
                  <tbody>
                    {lines.map(l => (
                      <tr key={l.teacherLabel} className="border-t border-slate-100">
                        <td className="py-2 pr-3 font-bold text-slate-800">{l.teacherLabel}</td>
                        <td className="py-2 pr-3 text-right">{num(l.calls)}</td>
                        <td className="py-2 pr-3 text-right">{num(l.inputTokens)}</td>
                        <td className="py-2 pr-3 text-right">{num(l.outputTokens)}</td>
                        <td className="py-2 pr-3 text-right">{vnd(l.measuredVnd)}<span className="block text-[11px] text-slate-400">${l.costUsd.toFixed(4)}</span></td>
                        <td className="py-2 pr-3 text-right text-amber-700">{l.estimatedVnd ? vnd(l.estimatedVnd) : '—'}</td>
                        <td className="py-2 pr-3 text-right font-black text-slate-900">{vnd(l.measuredVnd + l.estimatedVnd)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-200">
                      <td className="py-2 pr-3 font-black">Tổng cộng</td><td colSpan={5} /><td className="py-2 pr-3 text-right font-black text-indigo-700">{vnd(totalVnd)}</td>
                    </tr>
                  </tbody>
                </table>
                {usage.rows.length > 0 && (
                  <details className="mt-3 text-xs">
                    <summary className="cursor-pointer font-black text-slate-600">Chi tiết theo model</summary>
                    <ul className="mt-2 space-y-1">
                      {usage.rows.map(r => (
                        <li key={r.billTo} className="font-semibold text-slate-600"><b>{labelOf(r.billTo)}</b>: {Object.entries(r.byModel).map(([m, u]) => `${modelLabel(m)} ${u.calls} lượt ($${u.costUsd.toFixed(4)})`).join(' · ')}</li>
                      ))}
                    </ul>
                  </details>
                )}
                <p className="mt-2 text-[11px] font-semibold text-slate-400">{usage.recordCount} lượt dùng AI được đo trong khoảng {usage.fromDay} → {usage.toDay}.</p>
              </div>
            )}
          </section>

          {/* 5. Chuẩn bị lớp cho giáo viên từ folder Drive */}
          <ClassSetupPanel overview={overview} onChanged={async () => { setOverview(await loadAdminOverview()); }} />
        </>
      )}
    </div>
  );
};
