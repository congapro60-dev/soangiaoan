import { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { FileArchive, Loader2 } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { STUDENT_PROFILES_COL, type StudentProfileDoc } from '../../../lib/classroom/types';
import { listAssignmentsForClass, listSubmissionsForClass } from '../../../lib/classroom/submissionService';
import { draftParentReportComment, loadParentReportNote, loadScoreBook, saveParentReportNote } from '../../../lib/classroom/teacherService';
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
 * Xuất báo cáo phụ huynh CẢ LỚP một lần: mỗi em một PDF (cùng nội dung với xuất từng em), gói trong một ZIP.
 * Dùng nhận xét giáo viên đã lưu cho đúng kì; tuỳ chọn cho AI soạn nhận xét cho em chưa có (lưu lại để sửa sau).
 */
export const ClassParentReportExport = ({ classId, className, classGrade, students, showToast }: Props) => {
  const [ky, setKy] = useState<ReportPeriod>(() => defaultPeriod('month', today()));
  const [aiChoEmChuaCo, setAiChoEmChuaCo] = useState(false);
  const [tienDo, setTienDo] = useState('');
  const loi = periodError(ky);

  const xuat = async () => {
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
            assignments,
            submissions: submissions.filter(s => s.studentId === hs.id),
            profile: profileSnap?.exists() ? (profileSnap.data() as StudentProfileDoc) : null,
            scoreView: scoreBook ? studentScoreView(scoreBook, hs.id) : null,
          }, ky);
          let nhanXet = (await loadParentReportNote(key(hs.id)).catch(() => ({ text: '' }))).text;
          if (!nhanXet && aiChoEmChuaCo) {
            nhanXet = (await draftParentReportComment(key(hs.id), built.facts)).text;
            await saveParentReportNote(key(hs.id), nhanXet).catch(() => undefined);
          }
          const input = { ...built.printInput, teacherComment: nhanXet };
          zip.file(parentReportFileName(input), await exportParentReportToPdf(input, 'blob'));
          daXuat += 1;
        } catch (error) {
          console.error('Không xuất được báo cáo của', hs.name, error);
          loiEm += 1;
        }
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
    <section className="mt-5 rounded-3xl border border-indigo-100 bg-indigo-50/50 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-sm font-black text-slate-900"><FileArchive className="h-4 w-4 text-indigo-600" /> Xuất báo cáo phụ huynh cả lớp</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">Mỗi em một file PDF, gói chung một ZIP. Muốn xem trước hoặc sửa nhận xét từng em: mở học sinh → Bản phụ huynh.</p>
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
        <button type="button" onClick={() => void xuat()} disabled={Boolean(loi) || tienDo !== '' || students.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-50">
          {tienDo ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />} Xuất {students.length} báo cáo
        </button>
      </div>
      <label className="mt-2 flex items-start gap-2 text-xs font-semibold text-slate-600">
        <input type="checkbox" checked={aiChoEmChuaCo} onChange={event => setAiChoEmChuaCo(event.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo-600" />
        Em nào chưa có nhận xét đã lưu cho kì này thì để AI soạn (mỗi em một lượt AI; nhận xét được lưu để thầy cô sửa sau).
      </label>
      <p className="mt-1 text-xs font-semibold text-slate-500">{loi ? <span className="text-rose-600">{loi}</span> : tienDo || `${rangeLabel(ky)} — sửa ngày cho khớp lịch trường mình.`}</p>
    </section>
  );
};
