import { Fragment, useCallback, useEffect, useState } from 'react';
import { Activity, Loader2, RefreshCw, Smartphone, Monitor } from 'lucide-react';
import { loadParentActivity, loadParentActivityDetail } from '../../../lib/classroom/teacherService';
import type { ParentActivityEvent, ParentActivityRow } from '../../../lib/classroom/parentAccess';

const REFRESH_MS = 30_000;

const when = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const ago = (iso: string, now: number): string => {
  const ms = now - Date.parse(iso);
  if (!Number.isFinite(ms)) return 'Chưa vào lần nào';
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
};

const EVENT_LABEL: Record<string, string> = {
  login: 'Vào cổng phụ huynh',
  open: 'Mở báo cáo',
  pdf: 'Tải PDF',
  custom: 'Xem báo cáo tự chọn ngày',
  pinChanged: 'Tự đổi mã PIN',
};

const DeviceIcon = ({ device }: { device: string }) => (device === 'mobile'
  ? <Smartphone className="inline h-3.5 w-3.5 text-slate-400" aria-label="Điện thoại" />
  : device === 'desktop' ? <Monitor className="inline h-3.5 w-3.5 text-slate-400" aria-label="Máy tính" /> : null);

/** Thống kê phụ huynh cả lớp: ai đã vào, mấy lần, lần cuối, đang xem không; bấm một em xem dòng thời gian chi tiết. */
export const ParentActivityPanel = ({ classId, refreshKey = 0 }: { classId: string; refreshKey?: number }) => {
  const [rows, setRows] = useState<ParentActivityRow[] | null>(null);
  const [loi, setLoi] = useState('');
  const [dangTai, setDangTai] = useState(false);
  const [mo, setMo] = useState('');
  const [events, setEvents] = useState<ParentActivityEvent[] | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const tai = useCallback(async () => {
    setDangTai(true);
    try {
      setRows(await loadParentActivity(classId));
      setLoi('');
      setNow(Date.now());
    } catch (error) {
      setLoi(error instanceof Error ? error.message : 'Không tải được thống kê phụ huynh.');
    } finally {
      setDangTai(false);
    }
  }, [classId]);

  const taiChiTiet = useCallback(async (studentId: string) => {
    setEvents(null);
    try { setEvents(await loadParentActivityDetail(classId, studentId)); } catch { setEvents([]); }
  }, [classId]);

  useEffect(() => { setRows(null); setMo(''); void tai(); }, [tai, refreshKey]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void tai();
      if (mo) void taiChiTiet(mo);
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [tai, taiChiTiet, mo]);

  const bam = (studentId: string) => {
    if (mo === studentId) { setMo(''); return; }
    setMo(studentId);
    void taiChiTiet(studentId);
  };

  const dangXem = rows?.filter(r => r.online).length ?? 0;
  const daVao = rows?.filter(r => r.loginCount > 0).length ?? 0;

  return (
    <div className="mt-4 border-t border-emerald-100 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500"><Activity className="h-4 w-4 text-emerald-600" /> Hoạt động của phụ huynh</p>
        {rows && <span className="text-xs font-bold text-slate-500">{daVao}/{rows.length} em đã có phụ huynh vào · {dangXem > 0 ? <span className="text-emerald-700">{dangXem} đang xem</span> : 'chưa ai đang xem'}</span>}
        <button type="button" onClick={() => void tai()} disabled={dangTai} title="Tải lại (tự cập nhật mỗi 30 giây)" className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50">
          {dangTai ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Làm mới
        </button>
      </div>
      {loi && <p className="mt-2 text-xs font-bold text-red-700">{loi}</p>}
      {!rows ? (
        !loi && <div className="mt-3 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-emerald-500" /></div>
      ) : (
        <div className="mt-2 max-h-96 overflow-auto rounded-2xl border border-emerald-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2">Học sinh</th><th className="px-3 py-2">Trạng thái</th><th className="px-3 py-2 text-right">Lần vào</th><th className="px-3 py-2 text-right">Mở BC</th><th className="px-3 py-2 text-right">PDF</th><th className="px-3 py-2 text-right">Tự chọn</th><th className="px-3 py-2 text-right">Sai PIN</th></tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <Fragment key={row.studentId}>
                  <tr onClick={() => bam(row.studentId)} className="cursor-pointer border-t border-slate-100 hover:bg-emerald-50/40">
                    <td className="px-3 py-2 font-bold text-slate-800">{row.name}</td>
                    <td className="px-3 py-2 text-xs font-semibold">
                      {row.online
                        ? <span className="inline-flex items-center gap-1.5 font-black text-emerald-700"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Đang xem</span>
                        : row.lastSeenAt ? <span className="text-slate-600">{ago(row.lastSeenAt, now)} <DeviceIcon device={row.lastDevice} /></span> : <span className="text-slate-400">Chưa vào lần nào</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-black text-slate-900">{row.loginCount}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{row.openCount}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{row.pdfCount}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{row.customCount}</td>
                    <td className={`px-3 py-2 text-right ${row.wrongCount >= 10 ? 'font-black text-red-600' : 'text-slate-700'}`}>{row.wrongCount}</td>
                  </tr>
                  {mo === row.studentId && (
                    <tr className="bg-slate-50/70">
                      <td colSpan={7} className="px-4 py-3">
                        <p className="text-xs font-semibold text-slate-500">
                          Vào lần đầu: <b>{row.firstLoginAt ? when(row.firstLoginAt) : '—'}</b> · Vào gần nhất: <b>{row.lastLoginAt ? when(row.lastLoginAt) : '—'}</b>
                          {row.lastWrongAt && <> · Nhập sai PIN gần nhất: <b>{when(row.lastWrongAt)}</b></>}
                        </p>
                        {!events ? <Loader2 className="mt-2 h-4 w-4 animate-spin text-emerald-500" />
                          : events.length === 0 ? <p className="mt-2 text-xs font-semibold text-slate-400">Chưa có sự kiện nào.</p>
                            : (
                              <ul className="mt-2 max-h-60 space-y-1 overflow-y-auto">
                                {events.map(event => (
                                  <li key={event.id} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                                    <span className="font-mono text-slate-500">{when(event.at)}</span>
                                    <span className="font-black text-slate-800">{EVENT_LABEL[event.type] ?? event.type}</span>
                                    {event.detail && <span className="font-semibold text-slate-600">· {event.detail}</span>}
                                    <DeviceIcon device={event.device} />
                                  </li>
                                ))}
                              </ul>
                            )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[11px] font-semibold text-slate-400">Chỉ biết “phụ huynh của em nào”, không phân biệt bố hay mẹ nếu dùng chung PIN. Không lưu địa chỉ IP. “Sai PIN” tăng nhanh bất thường có thể là có người đang dò mã.</p>
    </div>
  );
};
