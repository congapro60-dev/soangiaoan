import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, FileText, Loader2 } from 'lucide-react';
import { getStudentReport, loadStudentReports } from '../../../../services/studentWorkspaceApi';
import type { PublishedStudentReport, StudentReportSummary } from '../../../../lib/classroom/studentWorkspace';
import { buildParentReportPrintDoc, PARENT_REPORT_ROOT_ID } from '../../../../lib/classroom/parentReportPrintDoc';

const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50';

/** Uses exactly the published parent document, without parent PIN or parent activity events. */
export const StudentPublishedReports = () => {
  const [reports, setReports] = useState<StudentReportSummary[]>([]);
  const [report, setReport] = useState<PublishedStudentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const ticket = useRef(0);
  const loadList = useCallback(async () => {
    const request = ++ticket.current;
    setReport(null); setLoading(true); setError('');
    try { const result = await loadStudentReports(); if (ticket.current === request) setReports(result); }
    catch (reason) { if (ticket.current === request) setError(reason instanceof Error ? reason.message : 'Chưa tải được báo cáo.'); }
    finally { if (ticket.current === request) setLoading(false); }
  }, []);
  useEffect(() => { void loadList(); return () => { ++ticket.current; }; }, [loadList]);
  const rendered = useMemo(() => {
    if (!report) return { html: '', error: '' };
    try { return { html: buildParentReportPrintDoc(report.input, 'web'), error: '' }; }
    catch { return { html: '', error: 'Báo cáo chưa sẵn sàng. Em báo thầy cô kiểm tra lại nhé.' }; }
  }, [report]);
  const open = async (id: string) => {
    const request = ++ticket.current;
    setReport(null); setLoading(true); setError('');
    try { const result = await getStudentReport(id); if (ticket.current === request) setReport(result); }
    catch (reason) { if (ticket.current === request) setError(reason instanceof Error ? reason.message : 'Chưa mở được báo cáo.'); }
    finally { if (ticket.current === request) setLoading(false); }
  };
  const download = async () => {
    if (!report) return;
    const request = ++ticket.current;
    setPdfLoading(true); setError('');
    try {
      // Recheck publication and enrollment before exporting a previously opened document.
      const current = await getStudentReport(report.id);
      if (ticket.current !== request) return;
      const { exportParentReportToPdf } = await import('../../../../lib/classroom/parentReportPrintDoc');
      if (ticket.current !== request) return;
      await exportParentReportToPdf(current.input);
    } catch (reason) { if (ticket.current === request) { setReport(null); setError(reason instanceof Error ? reason.message : 'Chưa tải được PDF.'); } }
    finally { if (ticket.current === request) setPdfLoading(false); }
  };
  return <section aria-labelledby="student-reports-heading" className="space-y-3">
    <div className="flex items-center justify-between gap-3"><h1 id="student-reports-heading" className="text-xl font-black text-slate-900">Báo cáo học tập</h1>
      {report && <button type="button" className={buttonClass} disabled={pdfLoading || Boolean(rendered.error)} onClick={() => void download()}>{pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Tải PDF</button>}
    </div>
    <p className="text-sm leading-6 text-slate-500">Báo cáo thầy cô đã công bố cho em và gia đình.</p>
    {(error || rendered.error) && <div className="rounded-xl bg-red-50 p-3"><p role="alert" className="text-sm text-red-700">{error || rendered.error}</p><button type="button" className={`${buttonClass} mt-2`} onClick={() => void loadList()}>Thử lại</button></div>}
    {loading && <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Đang tải báo cáo…</p>}
    {report ? <>
      <button type="button" className={buttonClass} onClick={() => { ++ticket.current; setReport(null); setPdfLoading(false); }}><ArrowLeft className="h-4 w-4" />Danh sách báo cáo</button>
      <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div id={PARENT_REPORT_ROOT_ID} dangerouslySetInnerHTML={{ __html: rendered.html }} /></div>
    </> : !loading && <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {reports.map(item => <button key={item.id} type="button" onClick={() => void open(item.id)} className="flex min-h-16 w-full items-center gap-3 border-b border-slate-100 p-3 text-left last:border-b-0 hover:bg-indigo-50"><FileText className="h-5 w-5 shrink-0 text-indigo-500" /><span className="min-w-0"><span className="block break-words text-sm font-bold text-slate-800">{item.title || item.range}</span><span className="mt-1 block text-xs text-slate-500">{item.range} · Công bố {new Date(item.publishedAt).toLocaleDateString('vi-VN')}</span></span></button>)}
      {!reports.length && <p className="p-5 text-sm text-slate-500">Thầy cô chưa công bố báo cáo nào. Báo cáo mới sẽ xuất hiện tại đây.</p>}
    </div>}
  </section>;
};
