import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Download, FileText, HeartHandshake, Loader2 } from 'lucide-react';
import { normalizeJoinCode } from '../lib/classroom/joinCode';
import { REPORT_KINDS, type ReportKind } from '../lib/classroom/reportKinds';
import type { PublishedParentReport } from '../lib/classroom/parentAccess';
import { PARENT_REPORT_ROOT_ID, buildParentReportPrintDoc, type ParentReportPrintInput } from '../lib/classroom/parentReportPrintDoc';
import { fetchParentReports, fetchParentRoster, type ParentRoster } from '../services/parentPortalApi';

/** Bản web của báo cáo (`variant: web`): tự co giãn theo màn hình, chữ ≥15px, cột xếp dọc trên điện thoại. Bản A4 chỉ dùng khi tải PDF. */
const ReportViewer = ({ input }: { input: ParentReportPrintInput }) => {
  const html = useMemo(() => buildParentReportPrintDoc(input, 'web'), [input]);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div id={PARENT_REPORT_ROOT_ID} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};

const kindLabel = (kind: string): string => REPORT_KINDS.find(item => item.kind === kind)?.label ?? kind;
const dayLabel = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN');
};

type Stage = 'nhap-ma-lop' | 'chon-ten' | 'xem';

/**
 * Cổng phụ huynh: mã lớp (trên link) → chọn tên con → PIN riêng của phụ huynh → xem các báo cáo giáo viên đã công bố,
 * hiện ngay trên màn hình đúng như bản PDF (giáo viên không phải tải file rồi gửi từng người).
 */
export const ParentPortalPage = () => {
  const { joinCode: joinCodeParam } = useParams<{ joinCode?: string }>();
  const [stage, setStage] = useState<Stage>(joinCodeParam ? 'chon-ten' : 'nhap-ma-lop');
  const [joinCode, setJoinCode] = useState(normalizeJoinCode(joinCodeParam || ''));
  const [roster, setRoster] = useState<ParentRoster | null>(null);
  const [studentId, setStudentId] = useState('');
  const [pin, setPin] = useState('');
  const [loi, setLoi] = useState('');
  const [dangGoi, setDangGoi] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [reports, setReports] = useState<PublishedParentReport[]>([]);
  const [kind, setKind] = useState<ReportKind | 'all'>('all');
  const [openId, setOpenId] = useState('');
  const [dangTaiPdf, setDangTaiPdf] = useState(false);

  const moLop = useCallback(async (ma: string) => {
    setLoi('');
    setDangGoi(true);
    try {
      setRoster(await fetchParentRoster(ma));
      setJoinCode(ma);
      setStage('chon-ten');
    } catch (error) {
      setLoi(error instanceof Error ? error.message : 'Không mở được lớp.');
      setStage('nhap-ma-lop');
    } finally {
      setDangGoi(false);
    }
  }, []);

  useEffect(() => {
    if (joinCodeParam) void moLop(normalizeJoinCode(joinCodeParam));
  }, [joinCodeParam, moLop]);

  const xem = async () => {
    setLoi('');
    setDangGoi(true);
    try {
      const data = await fetchParentReports(joinCode, studentId, pin);
      setStudentName(data.studentName);
      setReports(data.reports);
      setOpenId(data.reports[0]?.id ?? '');
      setKind('all');
      setStage('xem');
    } catch (error) {
      setLoi(error instanceof Error ? error.message : 'Không xem được báo cáo.');
    } finally {
      setDangGoi(false);
    }
  };

  const kinds = useMemo(() => [...new Set(reports.map(r => r.kind))], [reports]);
  const shown = useMemo(() => reports.filter(r => kind === 'all' || r.kind === kind), [reports, kind]);
  const open = reports.find(r => r.id === openId) ?? null;

  const taiPdf = async () => {
    if (!open) return;
    setDangTaiPdf(true);
    try {
      const { exportParentReportToPdf } = await import('../lib/classroom/parentReportPrintDoc');
      await exportParentReportToPdf(open.input as ParentReportPrintInput);
    } catch (error) {
      setLoi(error instanceof Error ? error.message : 'Không tải được PDF.');
    } finally {
      setDangTaiPdf(false);
    }
  };

  const khung = (children: ReactNode) => (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-white p-4">
      <div className="w-full max-w-md">
        <div className="mb-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg shadow-emerald-200">
            <HeartHandshake className="h-7 w-7 text-white" />
          </div>
          <p className="mt-3 text-xl font-black tracking-tight text-slate-900">Cổng phụ huynh</p>
          <p className="text-sm font-semibold text-slate-400">SmartPlan AI · Báo cáo học tập của con</p>
        </div>
        <div className="rounded-[2rem] border border-slate-100 bg-white p-7 shadow-xl shadow-slate-200/60">{children}</div>
      </div>
    </div>
  );

  const loiBox = loi && (
    <p className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800 ring-1 ring-red-100">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {loi}
    </p>
  );

  if (stage === 'nhap-ma-lop') {
    return khung(
      <>
        <h1 className="text-xl font-black text-slate-900">Nhập mã lớp của con</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">Mã lớp gồm 6 ký tự, thầy cô đã gửi kèm đường dẫn.</p>
        {loiBox}
        <div className="mt-5 space-y-4">
          <input value={joinCode} onChange={event => setJoinCode(normalizeJoinCode(event.target.value))} maxLength={8} placeholder="VD: ABCD23" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-lg font-black uppercase tracking-[0.3em] outline-none focus:border-emerald-500" />
          <button type="button" onClick={() => void moLop(joinCode)} disabled={dangGoi || joinCode.length < 4} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50">
            {dangGoi ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tiếp tục'}
          </button>
        </div>
      </>,
    );
  }

  if (stage === 'chon-ten') {
    return khung(
      <>
        <h1 className="text-xl font-black text-slate-900">{roster ? `Lớp ${roster.className}` : 'Đang mở lớp…'}</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">Chọn tên con và nhập mã PIN dành cho phụ huynh.</p>
        {loiBox}
        {!roster ? (
          <div className="mt-6 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-emerald-500" /></div>
        ) : (
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Tên của con</span>
              <select value={studentId} onChange={event => setStudentId(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold outline-none focus:border-emerald-500">
                <option value="">— Chọn tên —</option>
                {roster.students.map(s => <option key={s.studentId} value={s.studentId}>{s.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Mã PIN phụ huynh (4 số)</span>
              <input value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" autoComplete="off" placeholder="••••" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-2xl font-black tracking-[0.5em] outline-none focus:border-emerald-500" />
            </label>
            <button type="button" onClick={() => void xem()} disabled={dangGoi || !studentId || pin.length !== 4} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50">
              {dangGoi ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xem báo cáo'}
            </button>
          </div>
        )}
      </>,
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[840px] items-center gap-3">
          <button type="button" onClick={() => { setStage('chon-ten'); setPin(''); setReports([]); }} aria-label="Quay lại" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-slate-900">{studentName}</p>
            <p className="truncate text-xs font-semibold text-slate-500">{roster?.className ? `Lớp ${roster.className} · ` : ''}Báo cáo học tập của con</p>
          </div>
          {open && (
            <button type="button" onClick={() => void taiPdf()} disabled={dangTaiPdf} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-60">
              {dangTaiPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Tải PDF
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[840px] px-4 pt-4">
        {loiBox}
        {reports.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-black text-slate-700">Thầy cô chưa gửi báo cáo nào cho con.</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Khi có báo cáo mới, xem lại tại cùng đường dẫn này.</p>
          </div>
        ) : (
          <>
            {kinds.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {(['all', ...kinds] as const).map(item => (
                  <button key={item} type="button" onClick={() => setKind(item)} className={`rounded-full px-3.5 py-1.5 text-xs font-black transition ${kind === item ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'}`}>
                    {item === 'all' ? 'Tất cả' : kindLabel(item)}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {shown.map(r => (
                <button key={r.id} type="button" onClick={() => setOpenId(r.id)} className={`min-w-[170px] rounded-2xl border px-4 py-3 text-left transition ${r.id === openId ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300'}`}>
                  <p className="text-xs font-black text-emerald-700">{kindLabel(r.kind)}</p>
                  <p className="mt-0.5 text-sm font-black text-slate-900">{r.range}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Gửi ngày {dayLabel(r.publishedAt)}</p>
                </button>
              ))}
            </div>
            {open && <div className="mt-3"><ReportViewer input={open.input as ParentReportPrintInput} /></div>}
          </>
        )}
      </main>
    </div>
  );
};
