import { useRef, useState } from 'react';
import { Upload, X, Loader2, Zap, BookOpen } from 'lucide-react';
import { AppData, GradingResult, GradingWarning, ParsedExamBundle, TemplateFile } from '../../../types';
import { processUploadedFile } from '../../../utils/fileUtils';
import { loadBundles } from '../../../utils/examParser';
import { runSmartGrading } from '../../../utils/smartGradingUtils';
import { getActiveApiKey } from '../../../lib/aiProviders';

interface SmartGradingModeProps {
  data: AppData;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  showToast: (msg: string, type?: string) => void;
  onGradingComplete: (results: GradingResult[], warnings: GradingWarning[], title: string) => void;
}

export const SmartGradingMode = ({
  data, isProcessing, setIsProcessing, showToast, onGradingComplete,
}: SmartGradingModeProps) => {
  const [sourceMode, setSourceMode] = useState<'library' | 'upload'>('library');
  const [selectedBundle, setSelectedBundle] = useState<ParsedExamBundle | null>(null);
  const [examFiles, setExamFiles] = useState<TemplateFile[]>([]);
  const [studentFiles, setStudentFiles] = useState<TemplateFile[]>([]);
  const [maxScore, setMaxScore] = useState(10);
  const [sessionTitle, setSessionTitle] = useState('');
  const [autoClean, setAutoClean] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number; name: string } | null>(null);

  const examRef = useRef<HTMLInputElement>(null);
  const studentRef = useRef<HTMLInputElement>(null);

  const bundles = loadBundles();

  const handleExamUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    try {
      const list: TemplateFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const processed = await processUploadedFile(files[i], 'test', i, autoClean);
        list.push(...processed);
      }
      setExamFiles(prev => [...prev, ...list]);
      if (!sessionTitle && files[0]) setSessionTitle(files[0].name.replace(/\.[^.]+$/, ''));
    } catch { showToast('Lỗi đọc file đề thi', 'error'); }
    finally { if (examRef.current) examRef.current.value = ''; }
  };

  const handleStudentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    try {
      const list: TemplateFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const processed = await processUploadedFile(files[i], 'sample', i, autoClean);
        list.push(...processed);
      }
      setStudentFiles(prev => [...prev, ...list]);
      showToast(`Đã nhận ${files.length} bài làm!`);
    } catch { showToast('Lỗi đọc file bài làm', 'error'); }
    finally { if (studentRef.current) studentRef.current.value = ''; }
  };

  const handleSelectBundle = (bundle: ParsedExamBundle) => {
    setSelectedBundle(bundle);
    if (!sessionTitle) setSessionTitle(bundle.title);
  };

  const handleRun = async () => {
    if (!getActiveApiKey(data.settings)) {
      showToast('Cần nhập API Key trong Cài đặt trước khi chấm bài', 'error');
      return;
    }
    if (studentFiles.length === 0) {
      showToast('Chưa upload bài làm học sinh', 'error');
      return;
    }
    if (sourceMode === 'library' && !selectedBundle) {
      showToast('Chưa chọn đề từ thư viện', 'error');
      return;
    }
    if (sourceMode === 'upload' && examFiles.length === 0) {
      showToast('Chưa upload file đề & đáp án', 'error');
      return;
    }

    setIsProcessing(true);
    setProgress({ done: 0, total: studentFiles.length, name: '' });

    try {
      const title = sessionTitle || `Chấm tự động ${new Date().toLocaleDateString('vi-VN')}`;
      const { results, warnings } = await runSmartGrading({
        bundle: sourceMode === 'library' ? selectedBundle ?? undefined : undefined,
        examFiles: sourceMode === 'upload' ? examFiles : undefined,
        studentFiles,
        settings: data.settings,
        maxScore,
        onProgress: (done, total, name) => setProgress({ done, total, name }),
      });
      onGradingComplete(results, warnings, title);
    } catch (err) {
      showToast(`Lỗi chấm bài: ${(err as Error).message}`, 'error');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Section 1 — Source */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Nguồn đề & đáp án</span>
        </div>
        {/* Toggle */}
        <div className="flex gap-2">
          {(['library', 'upload'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setSourceMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                sourceMode === mode
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {mode === 'library' ? <><BookOpen className="w-3.5 h-3.5" /> Từ thư viện đề</> : <><Upload className="w-3.5 h-3.5" /> Upload file</>}
            </button>
          ))}
        </div>

        {sourceMode === 'library' ? (
          bundles.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              Chưa có đề nào — hãy dùng tab Kiểm tra/Đề thi để tạo bộ tài liệu
            </p>
          ) : (
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {bundles.map(b => (
                <button
                  key={b.id}
                  onClick={() => handleSelectBundle(b)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs border transition-all ${
                    selectedBundle?.id === b.id
                      ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                      : 'bg-slate-50 border-slate-100 text-slate-700 hover:border-blue-200'
                  }`}
                >
                  <div className="font-semibold truncate">{b.title}</div>
                  <div className="text-[10px] opacity-60 mt-0.5">
                    {b.questions.length} câu · {new Date(b.parsedAt).toLocaleDateString('vi-VN')}
                  </div>
                </button>
              ))}
            </div>
          )
        ) : (
          <div>
            <div
              onClick={() => examRef.current?.click()}
              className="p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-300 cursor-pointer flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span className="text-xs font-medium">
                {examFiles.length > 0 ? `${examFiles.length} file — thêm tiếp` : 'Chọn file đề & đáp án (.pdf, .docx, .txt, .jpg, .png)'}
              </span>
            </div>
            {examFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {examFiles.map(f => (
                  <div key={f.id} className="flex items-center gap-2 p-1.5 bg-green-50 rounded-lg border border-green-100">
                    <span className="text-[10px] font-medium text-slate-700 truncate flex-1">{f.name}</span>
                    <button onClick={() => setExamFiles(prev => prev.filter(x => x.id !== f.id))} className="text-red-400 hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input ref={examRef} type="file" multiple accept=".pdf,.docx,.txt,.jpg,.jpeg,.png" className="hidden" onChange={handleExamUpload} />
          </div>
        )}
      </div>

      {/* Section 2 — Student files */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-2">
        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Bài làm học sinh ({studentFiles.length})</span>
        <div
          onClick={() => studentRef.current?.click()}
          className="p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-300 cursor-pointer flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-all"
        >
          <Upload className="w-4 h-4" />
          <span className="text-xs font-medium">
            📂 Tải lên nhiều file cùng lúc (.pdf, .jpg, .jpeg, .png, .docx)
          </span>
        </div>
        {studentFiles.length > 0 && (
          <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
            {studentFiles.map(f => (
              <div key={f.id} className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] font-medium text-slate-700 truncate flex-1">{f.name}</span>
                <button onClick={() => setStudentFiles(prev => prev.filter(x => x.id !== f.id))} className="text-red-400 hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <input ref={studentRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.docx" className="hidden" onChange={handleStudentUpload} />
        
        <label className="flex items-center gap-2 mt-2 cursor-pointer group w-fit">
          <input 
            type="checkbox" 
            checked={autoClean} 
            onChange={e => setAutoClean(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
          />
          <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors">
            Làm sạch nền ảnh / Tự động cắt trang PDF scan (khuyên dùng)
          </span>
        </label>
      </div>

      {/* Section 3 — Config */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thang điểm tối đa</label>
          <div className="flex items-center gap-2">
            <input
              type="number" min={1} max={1000} value={maxScore}
              onChange={e => setMaxScore(Math.max(1, Number(e.target.value)))}
              className="w-20 px-2 py-1.5 rounded-xl border border-slate-100 bg-white text-sm font-bold text-center focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="text-[10px] text-slate-400">điểm</span>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tên phiên chấm</label>
          <input
            type="text" value={sessionTitle}
            onChange={e => setSessionTitle(e.target.value)}
            placeholder={`Chấm tự động ${new Date().toLocaleDateString('vi-VN')}`}
            className="w-full px-3 py-1.5 rounded-xl border border-slate-100 bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Action button */}
      <button
        onClick={handleRun}
        disabled={isProcessing || studentFiles.length === 0}
        className="w-full py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale shadow-lg shadow-blue-200"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {progress
              ? `Đang chấm ${progress.done + 1}/${progress.total} — ${progress.name || '...'}`
              : 'Đang xử lý...'}
          </>
        ) : (
          <><Zap className="w-4 h-4" /> Chấm tự động tất cả</>
        )}
      </button>
    </div>
  );
};
