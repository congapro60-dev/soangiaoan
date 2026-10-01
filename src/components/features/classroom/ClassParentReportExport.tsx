import { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { FileArchive, ImagePlus, Loader2, Send, X } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { STUDENT_PROFILES_COL, type StudentProfileDoc } from '../../../lib/classroom/types';
import { listAssignmentsForClass, listSubmissionsForClass } from '../../../lib/classroom/submissionService';
import { draftParentReportComment, loadParentReportNote, loadScoreBook, publishParentReports, saveParentReportNote } from '../../../lib/classroom/teacherService';
import { PUBLISH_CHUNK } from '../../../lib/classroom/parentAccess';
import { requirementsInStage } from '../../../lib/classroom/parentRequirements';
import { stageForPeriod, type Program } from '../../../lib/classroom/reportStage';
import { saveClassProgram } from '../../../lib/classroom/classProgram';
import { effectiveBranding, effectiveClassProgram } from '../../../lib/classroom/ownerDefaults';
import { brandingForReport, fileToLogoDataUrl, saveParentBranding, type ParentBranding } from '../../../lib/classroom/parentBranding';
import { ClassParentAccessPanel } from './ClassParentAccessPanel';
import { studentScoreView } from '../../../lib/classroom/scoreBook';
import { buildPeriodParentReport } from '../../../lib/classroom/parentReportBuilder';
import { exportParentReportToPdf, parentReportFileName } from '../../../lib/classroom/parentReportPrintDoc';
import { REPORT_KINDS, defaultPeriod, periodError, rangeLabel, reportTitle, vnDay, type ReportKind, type ReportPeriod } from '../../../lib/classroom/reportPeriod';
import type { Student } from '../../../types';

interface Props {
  classId: string;
  className: string;
  classGrade?: string;
  students: readonly Student[];
  showToast: (msg: string, icon?: any) => void;
}

const today = () => vnDay(new Date().toISOString());

/**
 * Xuất báo cáo phụ huynh CẢ LỚP một lần: mỗi em một PDF (cùng nội dung với xuất từng em), gói trong một ZIP —
 * hoặc CÔNG BỐ thẳng lên cổng phụ huynh (/ph) để phụ huynh tự xem trên màn hình, khỏi gửi file.
 * Dùng nhận xét giáo viên đã lưu cho đúng kì; tuỳ chọn cho AI soạn nhận xét cho em chưa có (lưu lại để sửa sau).
 */
export const ClassParentReportExport = ({ classId, className, classGrade, students, showToast }: Props) => {
  const [ky, setKy] = useState<ReportPeriod>(() => defaultPeriod('month', today()));
  const [aiChoEmChuaCo, setAiChoEmChuaCo] = useState(false);
  const [tienDo, setTienDo] = useState('');
  const [lanCongBo, setLanCongBo] = useState(0);
  const [nhanDien, setNhanDien] = useState<ParentBranding>(effectiveBranding);
  const [chuongTrinh, setChuongTrinh] = useState<Program | null>(() => effectiveClassProgram(classId, className));
  const doiChuongTrinh = (value: string) => {
    const next: Program | null = value === 'TDS' || value === 'MOET' ? value : null;
    setChuongTrinh(next);
    saveClassProgram(classId, next);
  };
  const doiNhanDien = (patch: Partial<ParentBranding>) => {
    const next = { ...nhanDien, ...patch };
    setNhanDien(next);
    saveParentBranding(next);
  };
  const chonLogo = async (file: File | undefined) => {
    if (!file) return;
    try {
      doiNhanDien({ logoDataUrl: await fileToLogoDataUrl(file) });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không đọc được logo.', 'error');
    }
  };
  const loi = periodError(ky);

  const chay = async (cheDo: 'zip' | 'congBo') => {
    if (loi || tienDo) return;
    const key = (studentId: string) => ({ classId, studentId, kind: ky.kind, from: ky.from, to: ky.to });
    setTienDo('Đang tải dữ liệu lớp…');
    try {
      const [assignments, submissions, scoreBook] = await Promise.all([
        listAssignmentsForClass(classId, ''),
        listSubmissionsForClass(classId, ''),
        loadScoreBook(classId).catch(() => null),
      ]);
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const choCongBo: Array<{ studentId: string; input: unknown }> = [];
      let daDang = 0;
      const dayLen = async () => {
        if (choCongBo.length === 0) return;
        const lot = choCongBo.splice(0, choCongBo.length);
        const { saved } = await publishParentReports(classId, ky, lot);
        daDang += saved;
      };
      let daXuat = 0;
      let loiEm = 0;
      for (let i = 0; i < students.length; i += 1) {
        const hs = students[i];
        setTienDo(`Đang làm ${i + 1}/${students.length}: ${hs.name}…`);
        try {
          const profileSnap = await getDoc(doc(db, STUDENT_PROFILES_COL, hs.id)).catch(() => null);
          const built = buildPeriodParentReport({
            studentId: hs.id,
            studentName: hs.name,
            className,
            studentCode: hs.code,
            classGrade,
            program: chuongTrinh,
            assignments,
            submissions: submissions.filter(s => s.studentId === hs.id),
            profile: profileSnap?.exists() ? (profileSnap.data() as StudentProfileDoc) : null,
            scoreView: scoreBook ? studentScoreView(scoreBook, hs.id) : null,
          }, ky);
          let ghi = await loadParentReportNote(key(hs.id)).catch(() => ({ text: '', requirements: [] }));
          if (!ghi.text && aiChoEmChuaCo) {
            ghi = await draftParentReportComment(key(hs.id), built.facts, chuongTrinh);
            await saveParentReportNote(key(hs.id), ghi).catch(() => undefined);
          }
          const input = { ...built.printInput, teacherComment: ghi.text, requirements: requirementsInStage(ghi.requirements ?? [], classGrade, stageForPeriod(ky, chuongTrinh)), branding: brandingForReport(nhanDien) };
          if (cheDo === 'zip') {
            zip.file(parentReportFileName(input), await exportParentReportToPdf(input, 'blob'));
          } else {
            choCongBo.push({ studentId: hs.id, input });
            if (choCongBo.length >= PUBLISH_CHUNK) await dayLen();
          }
          daXuat += 1;
        } catch (error) {
          console.error('Không xuất được báo cáo của', hs.name, error);
          loiEm += 1;
        }
      }
      if (cheDo === 'congBo') {
        setTienDo('Đang gửi lên cổng phụ huynh…');
        await dayLen();
        setLanCongBo(n => n + 1);
        showToast(`Đã công bố ${daDang} báo cáo cho phụ huynh${loiEm > 0 ? `; ${loiEm} em lỗi, thử lại riêng từng em` : ''}.`, loiEm > 0 ? 'warning' : 'success');
        return;
      }
      setTienDo('Đang đóng gói ZIP…');
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportTitle(ky).split(' — ')[0]} - ${className}.zip`.replace(/[\\/:*?"<>|]+/g, ' ');
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Đã xuất ${daXuat} báo cáo${loiEm > 0 ? `; ${loiEm} em lỗi, thử xuất riêng từng em` : ''}.`, loiEm > 0 ? 'warning' : 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không xuất được báo cáo cả lớp.', 'error');
    } finally {
      setTienDo('');
    }
  };

  return (
    <>
    <section className="mt-5 rounded-3xl border border-indigo-100 bg-indigo-50/50 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-sm font-black text-slate-900"><FileArchive className="h-4 w-4 text-indigo-600" /> Xuất báo cáo phụ huynh cả lớp</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">Mỗi em một file PDF, gói chung một ZIP. Muốn xem trước hoặc sửa nhận xét từng em: mở học sinh → Bản phụ huynh.</p>
      <div className="mt-3 flex flex-wrap items-end gap-2 rounded-2xl border border-indigo-100 bg-white p-3">
        <p className="w-full text-xs font-black uppercase tracking-wide text-slate-500">Đầu báo cáo (nhập một lần, lưu trên máy này)</p>
        <input value={nhanDien.schoolName} onChange={event => doiNhanDien({ schoolName: event.target.value })} maxLength={120} placeholder="Tên trường" className="min-w-[180px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" />
        <input value={nhanDien.teacherName} onChange={event => doiNhanDien({ teacherName: event.target.value })} maxLength={80} placeholder="Tên giáo viên (in cuối báo cáo)" className="min-w-[160px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" />
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
          {nhanDien.logoDataUrl ? <img src={nhanDien.logoDataUrl} alt="Logo trường" className="h-6 w-6 object-contain" /> : <ImagePlus className="h-4 w-4" />} {nhanDien.logoDataUrl ? 'Đổi logo' : 'Tải logo trường'}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event => { void chonLogo(event.target.files?.[0]); event.target.value = ''; }} />
        </label>
        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">
          Chương trình lớp
          <select value={chuongTrinh ?? ''} onChange={event => doiChuongTrinh(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-bold">
            <option value="">Chưa chọn</option>
            <option value="TDS">TDS</option>
            <option value="MOET">MOET</option>
          </select>
        </label>
        {nhanDien.logoDataUrl && <button type="button" onClick={() => doiNhanDien({ logoDataUrl: '' })} title="Bỏ logo" className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button>}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <select value={ky.kind} onChange={event => setKy(defaultPeriod(event.target.value as ReportKind, today()))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold">
          {REPORT_KINDS.map(item => <option key={item.kind} value={item.kind}>{item.label}</option>)}
        </select>
        {ky.kind === 'month' ? (
          <input type="month" value={ky.from.slice(0, 7)} onChange={event => event.target.value && setKy(defaultPeriod('month', ky.from, event.target.value))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" />
        ) : (
          <>
            <label className="text-xs font-bold text-slate-500">Từ<input type="date" value={ky.from} onChange={event => setKy({ ...ky, from: event.target.value })} className="ml-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm font-bold text-slate-800" /></label>
            <label className="text-xs font-bold text-slate-500">đến<input type="date" value={ky.to} onChange={event => setKy({ ...ky, to: event.target.value })} className="ml-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm font-bold text-slate-800" /></label>
            {ky.kind === 'year' && (
              <label className="text-xs font-bold text-slate-500">HK2 bắt đầu<input type="date" value={ky.hk2From ?? ''} onChange={event => setKy({ ...ky, hk2From: event.target.value })} className="ml-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm font-bold text-slate-800" /></label>
            )}
          </>
        )}
        <button type="button" onClick={() => void chay('zip')} disabled={Boolean(loi) || tienDo !== '' || students.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-50">
          {tienDo ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />} Xuất {students.length} báo cáo
        </button>
        <button type="button" onClick={() => void chay('congBo')} disabled={Boolean(loi) || tienDo !== '' || students.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50">
          <Send className="h-4 w-4" /> Công bố cho phụ huynh
        </button>
      </div>
      <label className="mt-2 flex items-start gap-2 text-xs font-semibold text-slate-600">
        <input type="checkbox" checked={aiChoEmChuaCo} onChange={event => setAiChoEmChuaCo(event.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo-600" />
        Em nào chưa có nhận xét đã lưu cho kì này thì để AI soạn nhận xét và kết quả theo yêu cầu cần đạt (mỗi em một lượt AI; được lưu để thầy cô soát sau).
      </label>
      <p className="mt-1 text-xs font-semibold text-slate-500">{loi ? <span className="text-rose-600">{loi}</span> : tienDo || `${rangeLabel(ky)} — sửa ngày cho khớp lịch trường mình.`}</p>
    </section>
    <ClassParentAccessPanel classId={classId} className={className} refreshKey={lanCongBo} showToast={showToast} />
    </>
  );
};
