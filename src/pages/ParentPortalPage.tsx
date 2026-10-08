import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CalendarRange, CheckCircle2, Download, FileText, HeartHandshake, KeyRound, Loader2 } from 'lucide-react';
import { normalizeJoinCode } from '../lib/classroom/joinCode';
import { REPORT_KINDS, type ReportKind } from '../lib/classroom/reportKinds';
import { PARENT_PIN_LENGTH, PARENT_PING_MS, isValidParentPin, type PublishedParentReport } from '../lib/classroom/parentAccess';
import { periodError, vnDay } from '../lib/classroom/reportPeriod';
import { PARENT_REPORT_ROOT_ID, buildParentReportPrintDoc, type ParentReportPrintInput } from '../lib/classroom/parentReportPrintDoc';
import { ParentApiError, changeParentPin, fetchParentCustomReport, fetchParentReports, fetchParentRoster, sendParentEvent, type ParentRoster } from '../services/parentPortalApi';

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

const TU_CHON_ID = 'tu-chon';

type Stage = 'nhap-ma-lop' | 'chon-ten' | 'doi-pin' | 'xem';

const pinInput = 'w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-2xl font-black tracking-[0.5em] outline-none focus:border-emerald-500';
/** PIN gồm đúng 4 ký tự bất kỳ (đếm theo ký tự, không phải byte); bỏ khoảng trắng. */
// Chuẩn hoá NFC TRƯỚC khi cắt: chữ có dấu gõ dạng tổ hợp (e + dấu) vẫn tính là 1 ký tự như máy chủ đếm.
const gotPin = (value: string) => [...value.normalize('NFC').replace(/\s/g, '')].slice(0, PARENT_PIN_LENGTH).join('');
/** Enter / nút "Đi" trên bàn phím điện thoại gửi biểu mẫu. */
const guiForm = (action: () => void) => (event: FormEvent) => { event.preventDefault(); action(); };

/**
 * Đặt PIN riêng của phụ huynh. `batBuoc` = lần đầu vào (mã do thầy cô cấp) → không có nút bỏ qua;
 * ngược lại là phụ huynh chủ động đổi và có nút quay lại.
 */
export const ParentPinChangeForm = ({ batBuoc, dangGoi, loiMay, onSubmit, onCancel }: {
  batBuoc: boolean;
  dangGoi: boolean;
  loiMay: string;
  onSubmit: (newPin: string) => void;
  onCancel?: () => void;
}) => {
  const [moi, setMoi] = useState('');
  const [lai, setLai] = useState('');
  const khongKhop = isValidParentPin(lai) && lai !== moi;
  const hopLe = isValidParentPin(moi) && lai === moi;
  const loi = khongKhop ? 'Hai lần nhập chưa giống nhau.' : loiMay;
  return (
    <>
      <h1 className="flex items-center gap-2 text-xl font-black text-slate-900"><KeyRound className="h-5 w-5 text-emerald-600" /> {batBuoc ? 'Đặt mã PIN riêng của bạn' : 'Đổi mã PIN'}</h1>
      <p className="mt-1 text-sm font-semibold text-slate-500">
        {batBuoc
          ? 'Đây là lần đầu vào. Vì an toàn, hãy đặt mã PIN do chính bạn chọn — đúng 4 ký tự, có thể là số, chữ hoặc ký tự đặc biệt. Các lần sau dùng mã này để xem báo cáo.'
          : 'Chọn mã PIN mới gồm đúng 4 ký tự (số, chữ hoặc ký tự đặc biệt). Từ lần sau dùng mã mới này để vào xem báo cáo.'}
      </p>
      {loi && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800 ring-1 ring-red-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {loi}
        </p>
      )}
      <form onSubmit={guiForm(() => { if (hopLe && !dangGoi) onSubmit(moi); })} className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Mã PIN mới (4 ký tự)</span>
          <input type="password" value={moi} onChange={event => setMoi(gotPin(event.target.value))} autoComplete="new-password" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="••••" className={pinInput} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Nhập lại mã PIN mới</span>
          <input type="password" value={lai} onChange={event => setLai(gotPin(event.target.value))} autoComplete="new-password" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="••••" className={pinInput} />
        </label>
        <button type="submit" disabled={dangGoi || !hopLe} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50">
          {dangGoi ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lưu mã PIN mới'}
        </button>
        {!batBuoc && onCancel && (
          <button type="button" onClick={onCancel} className="min-h-11 w-full rounded-2xl py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50">Để sau</button>
        )}
        <p className="text-center text-xs font-semibold text-slate-400">Thầy cô xem được mã PIN này để hỗ trợ khi bạn quên, nên đừng dùng mã trùng với mật khẩu ngân hàng hay thẻ.</p>
        <p className="text-center text-xs font-bold text-amber-700">Mỗi em chỉ có một mã PIN: sau khi đổi, hãy báo mã mới cho người thân cùng xem báo cáo (bố/mẹ) để họ vẫn vào được.</p>
      </form>
    </>
  );
};

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
  const [thongBao, setThongBao] = useState('');
  /** Lần đầu vào (PIN còn là mã thầy cô cấp) → màn đặt PIN không có nút bỏ qua. */
  const [batBuocDoi, setBatBuocDoi] = useState(false);
  // Báo cáo tự chọn khoảng ngày: phụ huynh chủ động xem ngoài các kì thầy cô công bố.
  const homNay = vnDay(new Date().toISOString());
  const [tuNgay, setTuNgay] = useState(`${homNay.slice(0, 8)}01`);
  const [denNgay, setDenNgay] = useState(homNay);
  const [tuChon, setTuChon] = useState<PublishedParentReport | null>(null);
  const [dangTaoTuChon, setDangTaoTuChon] = useState(false);
  /** Tăng mỗi khi đăng nhập lại / quay lại: kết quả của yêu cầu cũ về muộn (của em khác) bị bỏ, không lọt sang phiên mới. */
  const phien = useRef(0);
  const daGhiMo = useRef('');
  const vungXem = useRef<HTMLDivElement>(null);

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
    const luot = phien.current + 1;
    phien.current = luot;
    try {
      const data = await fetchParentReports(joinCode, studentId, pin);
      if (phien.current !== luot) return;
      daGhiMo.current = '';
      setTuChon(null);
      setStudentName(data.studentName);
      setReports(data.reports);
      setOpenId(data.reports[0]?.id ?? '');
      setKind('all');
      setBatBuocDoi(data.mustChange);
      setThongBao('');
      setStage(data.mustChange ? 'doi-pin' : 'xem');
    } catch (error) {
      if (phien.current === luot) setLoi(error instanceof Error ? error.message : 'Không xem được báo cáo.');
    } finally {
      setDangGoi(false);
    }
  };

  /** Đặt PIN mới rồi vào xem luôn bằng PIN mới (không bắt gõ lại). Lưu xong là ĐÃ ĐỔI — lỗi mạng sau đó không được làm phụ huynh kẹt với mã cũ. */
  const luuPinMoi = async (newPin: string) => {
    setLoi('');
    setDangGoi(true);
    const luot = phien.current + 1;
    phien.current = luot;
    const vao = async () => {
      const data = await fetchParentReports(joinCode, studentId, newPin);
      if (phien.current !== luot) return;
      setPin(newPin);
      daGhiMo.current = '';
      setTuChon(null);
      setStudentName(data.studentName);
      setReports(data.reports);
      setOpenId(data.reports[0]?.id ?? '');
      setKind('all');
      setBatBuocDoi(false);
      setThongBao('Đã đổi mã PIN. Từ lần sau, dùng mã PIN mới để vào xem báo cáo. Nhớ báo mã mới cho người thân cùng xem (bố/mẹ).');
      setStage('xem');
    };
    try {
      try {
        await changeParentPin(joinCode, studentId, pin, newPin);
      } catch (error) {
        // Lỗi nghiệp vụ (PIN hiện tại sai, PIN mới không hợp lệ…) báo thẳng. Chỉ lỗi mạng/máy chủ mới có khả năng máy chủ ĐÃ lưu mà phản hồi mất —
        // khi đó thử vào bằng mã mới trước khi báo lỗi.
        if (error instanceof ParentApiError && error.status >= 400 && error.status < 500) throw error;
        try { await vao(); return; } catch { throw error; }
      }
      try {
        await vao();
      } catch {
        // Đã lưu mã mới nhưng chưa tải được báo cáo → về màn đăng nhập, nói rõ phải dùng mã nào.
        if (phien.current !== luot) return;
        setPin('');
        setStage('chon-ten');
        setLoi('Mã PIN mới của bạn đã được lưu. Hãy nhập mã PIN mới để vào xem báo cáo.');
      }
    } catch (error) {
      if (phien.current === luot) setLoi(error instanceof Error ? error.message : 'Không đổi được mã PIN.');
    } finally {
      setDangGoi(false);
    }
  };

  const kinds = useMemo(() => [...new Set(reports.map(r => r.kind))], [reports]);
  const shown = useMemo(() => reports.filter(r => kind === 'all' || r.kind === kind), [reports, kind]);
  const open = (tuChon && openId === tuChon.id ? tuChon : reports.find(r => r.id === openId)) ?? null;

  // Báo hiệu "đang xem" cho thầy cô: mỗi 30 giây khi trang đang mở và đang hiện trên màn hình. Mã bị đổi/đặt lại ở nơi khác → dừng và hỏi lại mã.
  useEffect(() => {
    if (stage !== 'xem') return undefined;
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      if ((await sendParentEvent(joinCode, studentId, pin, 'ping')) === 'denied') {
        window.clearInterval(timer);
        phien.current += 1;
        setPin('');
        setReports([]);
        setTuChon(null);
        setStage('chon-ten');
        setLoi('Mã PIN đã được đổi hoặc đặt lại. Vui lòng nhập lại mã PIN hiện tại.');
      }
    }, PARENT_PING_MS);
    return () => window.clearInterval(timer);
  }, [stage, joinCode, studentId, pin]);

  // Ghi lại báo cáo phụ huynh đã mở — mỗi báo cáo một lần trong một lượt đăng nhập (báo cáo tự chọn được máy chủ ghi riêng khi dựng).
  useEffect(() => {
    if (stage !== 'xem' || !open || open.id === TU_CHON_ID || daGhiMo.current === `${studentId}|${open.id}`) return;
    daGhiMo.current = `${studentId}|${open.id}`;
    void sendParentEvent(joinCode, studentId, pin, 'open', open.title || open.range);
    // Chỉ chạy khi đổi báo cáo đang mở.
  }, [stage, openId]);

  // Báo cáo tự chọn dựng xong thì cuộn tới chỗ hiển thị (điện thoại: nằm dưới khung chọn ngày).
  useEffect(() => {
    if (tuChon) vungXem.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [tuChon]);

  const xemTuChon = async () => {
    const loiKy = periodError({ kind: 'custom', from: tuNgay, to: denNgay });
    if (loiKy) { setLoi(loiKy); return; }
    setLoi('');
    setDangTaoTuChon(true);
    const luot = phien.current;
    try {
      const { input } = await fetchParentCustomReport(joinCode, studentId, pin, tuNgay, denNgay);
      if (phien.current !== luot) return;
      setTuChon({ id: TU_CHON_ID, kind: 'custom', from: tuNgay, to: denNgay, title: input.period?.title ?? 'Báo cáo tự chọn', range: input.period?.range ?? '', publishedAt: new Date().toISOString(), input });
      setOpenId(TU_CHON_ID);
    } catch (error) {
      if (phien.current === luot) setLoi(error instanceof Error ? error.message : 'Không dựng được báo cáo.');
    } finally {
      setDangTaoTuChon(false);
    }
  };

  const taiPdf = async () => {
    if (!open) return;
    setDangTaiPdf(true);
    try {
      const { exportParentReportToPdf } = await import('../lib/classroom/parentReportPrintDoc');
      await exportParentReportToPdf(open.input as ParentReportPrintInput);
      void sendParentEvent(joinCode, studentId, pin, 'pdf', open.title || open.range);
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
    <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800 ring-1 ring-red-100">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {loi}
    </p>
  );

  if (stage === 'nhap-ma-lop') {
    return khung(
      <>
        <h1 className="text-xl font-black text-slate-900">Nhập mã lớp của con</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">Mã lớp gồm 6 ký tự, thầy cô đã gửi kèm đường dẫn.</p>
        {loiBox}
        <form onSubmit={guiForm(() => { if (!dangGoi && joinCode.length >= 4) void moLop(joinCode); })} className="mt-5 space-y-4">
          <input aria-label="Mã lớp" value={joinCode} onChange={event => setJoinCode(normalizeJoinCode(event.target.value))} maxLength={8} placeholder="VD: ABCD23" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-lg font-black uppercase tracking-[0.3em] outline-none focus:border-emerald-500" />
          <button type="submit" disabled={dangGoi || joinCode.length < 4} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50">
            {dangGoi ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tiếp tục'}
          </button>
        </form>
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
          <form onSubmit={guiForm(() => { if (!dangGoi && studentId && isValidParentPin(pin)) void xem(); })} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Tên của con</span>
              <select value={studentId} onChange={event => setStudentId(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold outline-none focus:border-emerald-500">
                <option value="">— Chọn tên —</option>
                {roster.students.map(s => <option key={s.studentId} value={s.studentId}>{s.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Mã PIN phụ huynh (4 ký tự)</span>
              <input type="password" value={pin} onChange={event => setPin(gotPin(event.target.value))} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="••••" className={pinInput} />
            </label>
            <button type="submit" disabled={dangGoi || !studentId || !isValidParentPin(pin)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50">
              {dangGoi ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xem báo cáo'}
            </button>
            <p className="text-center text-[11px] font-semibold text-slate-400">Thầy cô có thể xem thời gian phụ huynh truy cập cổng này để hỗ trợ khi cần.</p>
          </form>
        )}
      </>,
    );
  }

  if (stage === 'doi-pin') {
    return khung(
      <ParentPinChangeForm
        batBuoc={batBuocDoi}
        dangGoi={dangGoi}
        loiMay={loi}
        onSubmit={newPin => void luuPinMoi(newPin)}
        onCancel={() => { setLoi(''); setStage('xem'); }}
      />,
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[840px] items-center gap-3">
          <button type="button" onClick={() => { phien.current += 1; setStage('chon-ten'); setPin(''); setReports([]); setTuChon(null); setThongBao(''); setLoi(''); setDangTaoTuChon(false); }} aria-label="Quay lại" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><ArrowLeft className="h-5 w-5" /></button>
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
        {thongBao && (
          <p role="status" className="mb-3 flex items-start gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {thongBao}
          </p>
        )}
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="min-w-0 text-xs font-bold text-amber-900">Bảo mật: bạn có thể tự đổi mã PIN bất cứ lúc nào.</p>
          <button type="button" onClick={() => { setLoi(''); setThongBao(''); setBatBuocDoi(false); setStage('doi-pin'); }} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-black text-white shadow-sm hover:bg-amber-600">
            <KeyRound className="h-4 w-4" /> Đổi mã PIN
          </button>
        </div>
        {loiBox}
        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-black text-slate-900"><CalendarRange className="h-4 w-4 text-emerald-600" /> Xem theo khoảng ngày bạn chọn</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Ngoài các báo cáo thầy cô gửi, bạn có thể tự xem kết quả của con trong khoảng thời gian bất kỳ.</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block min-w-0 text-xs font-bold text-slate-500">Từ ngày
              <input type="date" value={tuNgay} max={denNgay || undefined} onChange={event => { setLoi(''); setTuNgay(event.target.value); }} className="mt-1 w-full min-w-0 rounded-xl border border-slate-200 px-2 py-2 text-sm font-bold text-slate-800 outline-none focus:border-emerald-500" />
            </label>
            <label className="block min-w-0 text-xs font-bold text-slate-500">Đến ngày
              <input type="date" value={denNgay} min={tuNgay || undefined} onChange={event => { setLoi(''); setDenNgay(event.target.value); }} className="mt-1 w-full min-w-0 rounded-xl border border-slate-200 px-2 py-2 text-sm font-bold text-slate-800 outline-none focus:border-emerald-500" />
            </label>
          </div>
          <button type="button" onClick={() => void xemTuChon()} disabled={dangTaoTuChon || !tuNgay || !denNgay} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50">
            {dangTaoTuChon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xem báo cáo khoảng này'}
          </button>
        </section>
        {reports.length === 0 && !tuChon ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-black text-slate-700">Thầy cô chưa gửi báo cáo nào cho con.</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Khi có báo cáo mới, xem lại tại cùng đường dẫn này. Bạn vẫn có thể tự chọn khoảng ngày ở trên.</p>
          </div>
        ) : (
          <>
            {kinds.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {(['all', ...kinds] as const).map(item => (
                  <button key={item} type="button" aria-pressed={kind === item} onClick={() => { setKind(item); const first = reports.find(r => item === 'all' || r.kind === item); if (first && !(tuChon && openId === tuChon.id)) setOpenId(first.id); }} className={`rounded-full px-3.5 py-1.5 text-xs font-black transition ${kind === item ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'}`}>
                    {item === 'all' ? 'Tất cả' : kindLabel(item)}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {[...(tuChon ? [tuChon] : []), ...shown].map(r => (
                <button key={r.id} type="button" aria-pressed={r.id === openId} onClick={() => { setLoi(''); setOpenId(r.id); }} className={`min-w-[170px] rounded-2xl border px-4 py-3 text-left transition ${r.id === openId ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300'}`}>
                  <p className="text-xs font-black text-emerald-700">{r.id === TU_CHON_ID ? 'Bạn tự chọn' : kindLabel(r.kind)}</p>
                  <p className="mt-0.5 text-sm font-black text-slate-900">{r.range}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{r.id === TU_CHON_ID ? 'Tính từ kết quả đã duyệt' : `Gửi ngày ${dayLabel(r.publishedAt)}`}</p>
                </button>
              ))}
            </div>
            {open && open.id === TU_CHON_ID && (
              <p className="mt-2 rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900 ring-1 ring-sky-100">Báo cáo này do bạn tự chọn khoảng ngày, hệ thống tính từ kết quả đã được thầy cô duyệt và chưa có nhận xét riêng của thầy cô.</p>
            )}
            {open && <div ref={vungXem} className="mt-3 scroll-mt-20"><ReportViewer input={open.input as ParentReportPrintInput} /></div>}
          </>
        )}
        <p className="mt-6 text-center text-[11px] font-semibold text-slate-400">Thầy cô có thể xem thời gian bạn truy cập cổng này để hỗ trợ khi cần.</p>
      </main>
    </div>
  );
};
