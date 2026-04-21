import { useRef } from 'react';
import { CheckCircle2, Upload, Users, Loader2, ClipboardCheck, Download, Plus, X, FileDown } from 'lucide-react';
import { AppData, TemplateFile, GradingResult } from '../../../types';
import { processUploadedFile } from '../../../utils/fileUtils';
import { GradingResultsList, FilterScore } from './GradingResultsList';
import { GradingWeaknessPanel } from './GradingWeaknessPanel';
import { generateAnswerSheetHTML, generateAnswerKeyTemplateHTML } from '../../../utils/answerSheetTemplate';

const openInNewTab = (html: string) => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

interface Props {
  masterFiles: TemplateFile[];
  setMasterFiles: React.Dispatch<React.SetStateAction<TemplateFile[]>>;
  studentFiles: TemplateFile[];
  setStudentFiles: React.Dispatch<React.SetStateAction<TemplateFile[]>>;
  results: GradingResult[];
  setResults: React.Dispatch<React.SetStateAction<GradingResult[]>>;
  sessionTitle: string;
  setSessionTitle: (t: string) => void;
  maxScore: number;
  setMaxScore: (v: number) => void;
  isProcessing: boolean;
  sessionSaved: boolean;
  eta: string;
  filterScore: FilterScore;
  setFilterScore: (f: FilterScore) => void;
  data: AppData;
  setIsLoading: (v: boolean) => void;
  showToast: (msg: string, type?: any) => void;
  onStartGrading: () => void;
  onSaveSession: () => void;
  onExportExcel: () => void;
  onViewResult: (r: GradingResult) => void;
  onDeleteResult: (r: GradingResult) => void;
  onRegradeResult: (r: GradingResult) => void;
  onRenameResult: (r: GradingResult, name: string) => void;
}

export const GradingNewSession = ({
  masterFiles, setMasterFiles, studentFiles, setStudentFiles,
  results, setResults, sessionTitle, setSessionTitle,
  isProcessing, sessionSaved, filterScore, setFilterScore,
  data, setIsLoading, showToast,
  maxScore, setMaxScore, eta,
  onStartGrading, onSaveSession, onExportExcel, onViewResult, onDeleteResult, onRegradeResult, onRenameResult,
}: Props) => {
  const masterRef = useRef<HTMLInputElement>(null);
  const studentRef = useRef<HTMLInputElement>(null);

  const stats = (() => {
    const done = results.filter(r => r.status === 'completed');
    return {
      avg: done.length ? (done.reduce((a, r) => a + r.score, 0) / done.length).toFixed(1) : '—',
      completed: done.length,
      total: results.length,
      above8: done.filter(r => r.score >= 8).length,
      below5: done.filter(r => r.score < 5).length,
    };
  })();

  const handleMasterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setIsLoading(true);
    try {
      const list: TemplateFile[] = [];
      for (let i = 0; i < files.length; i++) {
        list.push(await processUploadedFile(files[i], 'test', i));
      }
      setMasterFiles(prev => [...prev, ...list]);
      if (!sessionTitle && files[0]) setSessionTitle(files[0].name.replace(/\.[^.]+$/, ''));
      showToast(`Đã tải lên ${files.length} file đề/đáp án!`);
    } catch { showToast('Lỗi đọc tệp đề thi', 'error'); }
    finally { setIsLoading(false); if (masterRef.current) masterRef.current.value = ''; }
  };

  const handleStudentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setIsLoading(true);
    try {
      const list: TemplateFile[] = [];
      for (let i = 0; i < files.length; i++) {
        list.push(await processUploadedFile(files[i], 'sample', i));
      }
      setStudentFiles(prev => [...prev, ...list]);
      setResults(prev => [...prev, ...list.map(f => ({
        id: crypto.randomUUID(),
        studentName: f.name.replace(/\.[^.]+$/, ''),
        score: 0, maxScore: 10,
        strengths: [], weaknesses: [],
        improvementPlan: '', details: '',
        status: 'pending' as const,
        fileName: f.name,
      }))]);
      showToast(`Đã nhận ${files.length} bài làm!`);
    } catch { showToast('Lỗi đọc tệp bài làm', 'error'); }
    finally { setIsLoading(false); if (studentRef.current) studentRef.current.value = ''; }
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      {/* Answer sheet templates row */}
      <div className="bg-blue-50 p-4 rounded-[24px] border border-blue-100 flex items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h4 className="text-xs font-black text-blue-700 flex items-center gap-1.5 mb-0.5">
            <FileDown className="w-3.5 h-3.5" /> Mẫu phiếu trả lời & đáp án
          </h4>
          <p className="text-[10px] text-blue-600">In phiếu → học sinh điền → chụp ảnh → tải lên chấm</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => openInNewTab(generateAnswerSheetHTML())}
            className="px-3 py-2 bg-white text-blue-700 border border-blue-200 rounded-xl font-bold text-xs hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5">
            <Download className="w-3 h-3" /> Phiếu trả lời
          </button>
          <button onClick={() => openInNewTab(generateAnswerKeyTemplateHTML())}
            className="px-3 py-2 bg-white text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1.5">
            <Download className="w-3 h-3" /> Mẫu đáp án
          </button>
        </div>
      </div>

      {/* Upload row */}
      <div className="grid grid-cols-3 gap-4 flex-shrink-0">
        {/* Session title + maxScore */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tên phiên chấm</label>
          <input type="text" value={sessionTitle} onChange={e => setSessionTitle(e.target.value)}
            placeholder="VD: Kiểm tra 15p Toán 10A1..."
            className="w-full px-3 py-2.5 rounded-xl border border-slate-100 bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
          <div className="flex items-center gap-2 mt-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Thang điểm</label>
            <input
              type="number" min={1} max={1000} value={maxScore}
              onChange={e => setMaxScore(Math.max(1, Number(e.target.value)))}
              className="w-20 px-2 py-1 rounded-lg border border-slate-100 bg-white text-sm font-bold text-center focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="text-[10px] text-slate-400">điểm</span>
          </div>
        </div>

        {/* Master files */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đề + Đáp án ({masterFiles.length})</label>
            <button onClick={() => masterRef.current?.click()} className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5">
              <Plus className="w-3 h-3" /> Thêm
            </button>
          </div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {masterFiles.length === 0 ? (
              <div onClick={() => masterRef.current?.click()}
                className="p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-300 cursor-pointer flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all">
                <Upload className="w-4 h-4" />
                <span className="text-xs font-medium">Chọn file đề & đáp án</span>
              </div>
            ) : masterFiles.map(f => (
              <div key={f.id} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-100">
                <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                <span className="text-[10px] font-medium text-slate-700 truncate flex-1">{f.name}</span>
                <button onClick={() => setMasterFiles(prev => prev.filter(mf => mf.id !== f.id))} className="text-red-400 hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <input ref={masterRef} type="file" multiple accept=".pdf,.docx,.jpg,.jpeg,.png" className="hidden" onChange={handleMasterUpload} />
        </div>

        {/* Student files */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bài làm HS ({studentFiles.length})</label>
            <button onClick={() => studentRef.current?.click()} className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5">
              <Plus className="w-3 h-3" /> Thêm
            </button>
          </div>
          <div onClick={() => studentRef.current?.click()}
            className="p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-300 cursor-pointer flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium">
              {studentFiles.length > 0 ? `${studentFiles.length} bài — thêm tiếp` : 'Chọn bài cả lớp (nhiều file)'}
            </span>
          </div>
          <input ref={studentRef} type="file" multiple accept=".pdf,.docx,.jpg,.jpeg,.png" className="hidden" onChange={handleStudentUpload} />
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button onClick={onStartGrading}
          disabled={isProcessing || masterFiles.length === 0 || studentFiles.length === 0}
          className="px-6 py-2.5 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50 disabled:grayscale shadow-xl shadow-slate-200 text-sm">
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
          {isProcessing ? `Đang chấm... (${stats.completed}/${stats.total})` : 'Bắt đầu Chấm điểm AI'}
        </button>
        {results.length > 0 && !isProcessing && (
          <>
            <button onClick={onExportExcel}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all flex items-center gap-2">
              <Download className="w-4 h-4" /> Excel
            </button>
            {!sessionSaved && (
              <button onClick={onSaveSession}
                className="px-4 py-2.5 bg-blue-100 text-blue-700 rounded-2xl font-bold text-sm hover:bg-blue-200 transition-all">
                💾 Lưu lịch sử
              </button>
            )}
            {sessionSaved && <span className="text-xs text-green-600 font-medium">✓ Đã lưu</span>}
          </>
        )}
        {isProcessing && (
          <span className="text-xs text-slate-400 font-medium ml-1">
            {eta ? `⏱ Còn khoảng ${eta}` : stats.total > 0 ? '⏱ Đang ước tính...' : ''}
          </span>
        )}
        {stats.total > 0 && (
          <div className="flex items-center gap-4 ml-auto">
            {[
              { label: 'Trung bình', value: stats.avg, color: 'text-blue-600' },
              { label: 'Đã chấm', value: `${stats.completed}/${stats.total}`, color: 'text-slate-700' },
              ...(stats.above8 > 0 ? [{ label: 'Giỏi (≥8)', value: stats.above8, color: 'text-emerald-600' }] : []),
              ...(stats.below5 > 0 ? [{ label: 'Yếu (<5)', value: stats.below5, color: 'text-red-500' }] : []),
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
                <div className="text-[9px] text-slate-400 uppercase">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weakness aggregation */}
      <GradingWeaknessPanel results={results} />

      {/* Results list */}
      <GradingResultsList
        results={results}
        filterScore={filterScore}
        setFilterScore={setFilterScore}
        onView={onViewResult}
        onDelete={onDeleteResult}
        onRegrade={onRegradeResult}
        onRename={onRenameResult}
      />
    </div>
  );
};
