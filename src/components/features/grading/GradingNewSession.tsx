import { useRef } from 'react';
import { CheckCircle2, Upload, Users, Loader2, ClipboardCheck, Download, Plus, X, BarChart3, Sparkles } from 'lucide-react';
import { AppData, TemplateFile, GradingResult } from '../../../types';
import { processUploadedFile } from '../../../utils/fileUtils';
import { GradingResultsList, FilterScore } from './GradingResultsList';
import { GradingWeaknessPanel } from './GradingWeaknessPanel';

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
  completedCount: number;
  totalCount: number;
  filterScore: FilterScore;
  setFilterScore: (f: FilterScore) => void;
  data: AppData;
  setIsLoading: (v: boolean) => void;
  showToast: (msg: string, type?: any) => void;
  onStartGrading: () => void;
  onSaveSession: () => void;
  onExportExcel: () => void;
  onAnalyzeClass: () => void;
  onViewResult: (r: GradingResult) => void;
  onDeleteResult: (r: GradingResult) => void;
  onRegradeResult: (r: GradingResult) => void;
  onRenameResult: (r: GradingResult, name: string) => void;
  onCheckPlagiarism?: () => void;
  isCheckingPlagiarism?: boolean;
  gradingRubric: string;
  setGradingRubric: (v: string) => void;
  noAnswerKey: boolean;
  setNoAnswerKey: (v: boolean) => void;
}

export const GradingNewSession = ({
  masterFiles, setMasterFiles, studentFiles, setStudentFiles,
  results, setResults, sessionTitle, setSessionTitle,
  isProcessing, sessionSaved, filterScore, setFilterScore,
  data, setIsLoading, showToast,
  maxScore, setMaxScore, eta, completedCount, totalCount,
  gradingRubric, setGradingRubric,
  noAnswerKey, setNoAnswerKey,
  onStartGrading, onSaveSession, onExportExcel, onAnalyzeClass, onViewResult, onDeleteResult, onRegradeResult, onRenameResult,
  onCheckPlagiarism, isCheckingPlagiarism,
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

  const MAX_FILE_MB = 20;
  const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

  const handleMasterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setIsLoading(true);
    try {
      const list: TemplateFile[] = [];
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > MAX_FILE_BYTES) {
          showToast(`"${files[i].name}" vượt quá ${MAX_FILE_MB}MB — bỏ qua`, 'error');
          continue;
        }
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
        if (files[i].size > MAX_FILE_BYTES) {
          showToast(`"${files[i].name}" vượt quá ${MAX_FILE_MB}MB — bỏ qua`, 'error');
          continue;
        }
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Config area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 flex-shrink-0 p-6 bg-white">
        {/* Session title + maxScore */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Tên phiên chấm</label>
          <input type="text" value={sessionTitle} onChange={e => setSessionTitle(e.target.value)}
            placeholder="VD: Kiểm tra 15p Toán 10A1..."
            className="w-full px-3 py-2.5 rounded-lg border border-[#c0c7d3] bg-white text-sm font-medium text-[#121c2c] focus:ring-2 focus:ring-[#3182ce]/20 focus:border-[#3182ce] outline-none" />
          <div className="flex items-center gap-2 mt-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Thang điểm</label>
            <input
              type="number" min={1} max={1000} value={maxScore}
              onChange={e => setMaxScore(Math.max(1, Number(e.target.value)))}
              className="w-20 px-3 py-2 rounded-lg border border-[#c0c7d3] bg-white text-sm font-bold text-center focus:ring-2 focus:ring-[#3182ce]/20 focus:border-[#3182ce] outline-none"
            />
            <span className="text-[10px] text-slate-400">điểm</span>
          </div>
        </div>

        {/* Master files */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Đề + Đáp án ({masterFiles.length})</label>
            <button onClick={() => masterRef.current?.click()} className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5">
              <Plus className="w-3 h-3" /> Thêm
            </button>
          </div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {masterFiles.length === 0 ? (
              <div onClick={() => masterRef.current?.click()}
                className="p-4 rounded-xl border-2 border-dashed border-[#c0c7d3] bg-[#f9f9ff] hover:border-[#3182ce]/50 hover:bg-[#ebf8ff] cursor-pointer flex items-center gap-2 text-slate-500 hover:text-[#005ea1] transition-all">
                <Upload className="w-4 h-4" />
                <span className="text-xs font-medium">Chọn file đề & đáp án</span>
              </div>
            ) : masterFiles.map(f => (
              <div key={f.id} className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                <span className="text-[10px] font-medium text-slate-700 truncate flex-1">{f.name}</span>
                <button onClick={() => setMasterFiles(prev => prev.filter(mf => mf.id !== f.id))} className="text-red-400 hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <input ref={masterRef} type="file" multiple accept=".pdf,.docx,.jpg,.jpeg,.png" className="hidden" onChange={handleMasterUpload} />
          <button
            type="button"
            onClick={() => setNoAnswerKey(!noAnswerKey)}
            className={`flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all w-fit ${
              noAnswerKey
                ? 'bg-violet-100 text-violet-700 border border-violet-200'
                : 'bg-slate-50 text-slate-400 border border-slate-100 hover:border-violet-200 hover:text-violet-500'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            {noAnswerKey ? 'AI tự giải đề ✓' : 'Chưa có đáp án — AI tự giải'}
          </button>
        </div>

        {/* Student files */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Bài làm HS ({studentFiles.length})</label>
            <button onClick={() => studentRef.current?.click()} className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5">
              <Plus className="w-3 h-3" /> Thêm
            </button>
          </div>
          <div onClick={() => studentRef.current?.click()}
            className="p-4 rounded-xl border-2 border-dashed border-[#c0c7d3] bg-[#f9f9ff] hover:border-[#3182ce]/50 hover:bg-[#ebf8ff] cursor-pointer flex items-center gap-2 text-slate-500 hover:text-[#005ea1] transition-all">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium">
              {studentFiles.length > 0 ? `${studentFiles.length} bài — thêm tiếp` : 'Chọn bài cả lớp (nhiều file)'}
            </span>
          </div>
          <input ref={studentRef} type="file" multiple accept=".pdf,.docx,.jpg,.jpeg,.png" className="hidden" onChange={handleStudentUpload} />
        </div>
      </div>

      {/* Grading rubric */}
      <div className="flex-shrink-0 px-6 pb-5 bg-white">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
          Hướng dẫn chấm <span className="normal-case font-normal">(tuỳ chọn)</span>
        </label>
        <textarea
          rows={3}
          value={gradingRubric}
          onChange={e => setGradingRubric(e.target.value)}
          placeholder="VD: Câu 1 = 0.5đ, câu 2 = 1đ. Sai chính tả trừ 0.25đ/lỗi. Phần tự luận: đủ ý = 100%, thiếu 1 ý = 50%..."
          className="w-full px-3 py-2 rounded-lg border border-[#c0c7d3] bg-white text-sm font-medium focus:ring-2 focus:ring-[#3182ce]/20 focus:border-[#3182ce] outline-none resize-none placeholder:text-slate-300"
        />
      </div>

      {/* Action bar */}
      {isProcessing && totalCount > 0 && (
        <div className="flex-shrink-0 rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-blue-700">
            <span>Tiến độ chấm batch</span>
            <span>{completedCount}/{totalCount} bài</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${Math.round((completedCount / totalCount) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] font-medium text-blue-500">
            Giới hạn {Math.min(3, totalCount)} bài song song để giảm lỗi 429/RPM; tiến độ được lưu sau từng bài.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 flex-shrink-0 px-6 py-3 border-y border-[#c0c7d3] bg-[#f9f9ff]">
        <button onClick={onStartGrading}
          disabled={isProcessing || masterFiles.length === 0 || studentFiles.length === 0}
          className="px-6 py-2.5 bg-[#38a169] text-white rounded-full font-black hover:bg-[#2f855a] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm">
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
          {isProcessing ? `Đang chấm... (${stats.completed}/${stats.total})` : 'Bắt đầu Chấm điểm AI'}
        </button>
        {results.length > 0 && !isProcessing && (
          <>
            <button onClick={onExportExcel}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all flex items-center gap-2">
              <Download className="w-4 h-4" /> Excel
            </button>
            {results.filter(r => r.status === 'completed').length > 0 && (
              <button onClick={onAnalyzeClass}
                className="px-4 py-2.5 bg-violet-600 text-white rounded-2xl font-bold text-sm hover:bg-violet-700 transition-all flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Phân tích lớp
              </button>
            )}
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
        <div className="px-6 pt-4 bg-white">
          <GradingWeaknessPanel results={results} />
        </div>

      {/* Results list */}
      <GradingResultsList
        results={results}
        filterScore={filterScore}
        setFilterScore={setFilterScore}
        onView={onViewResult}
        onDelete={onDeleteResult}
        onRegrade={onRegradeResult}
        onRename={onRenameResult}
        onCheckPlagiarism={onCheckPlagiarism}
        isCheckingPlagiarism={isCheckingPlagiarism}
      />
    </div>
  );
};
