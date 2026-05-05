import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Download, Table } from 'lucide-react';
import { ExamQuestion, QuestionType } from '../../../types';
import { parseExamFromFiles, summarizeQuestions, MAX_IMPORT_MB, pdfToImages } from '../../../utils/examImportUtils';
import type { AppData } from '../../../types';

interface Props {
  onClose: () => void;
  onImport: (questions: ExamQuestion[], title: string, pageImages?: string[]) => void;
  settings: AppData['settings'];
  showToast: (msg: string, type?: any) => void;
}

type Step = 'upload' | 'parsing' | 'review';
type Mode = 'ai' | 'excel';

// ─── Excel helpers ─────────────────────────────────────────────────────────────

const EXCEL_HEADERS = ['type', 'content', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'points', 'explanation'];

const SAMPLE_ROWS = [
  ['multiple_choice', 'Thủ đô của Việt Nam là?', 'Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Huế', 'A', 0.25, ''],
  ['true_false', 'Câu hỏi đúng/sai có 4 ý (a,b,c,d). Nhập correctAnswer dạng "Đ,S,Đ,S"', 'a. Ý a', 'b. Ý b', 'c. Ý c', 'd. Ý d', 'Đ,S,Đ,S', 1, ''],
  ['short_answer', 'Căn bậc hai của 144 là?', '', '', '', '', '12', 0.5, 'Vì 12² = 144'],
  ['essay', 'Trình bày ý nghĩa của Cách mạng tháng Tám 1945.', '', '', '', '', '', 2, ''],
];

const downloadTemplate = () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([EXCEL_HEADERS, ...SAMPLE_ROWS]);
  ws['!cols'] = [10, 40, 20, 20, 20, 20, 15, 8, 25].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'CauHoi');
  XLSX.writeFile(wb, 'template_de_thi.xlsx');
};

const VALID_TYPES = new Set(['multiple_choice', 'true_false', 'short_answer', 'essay']);

const parseExcelFile = (file: File): Promise<ExamQuestion[]> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
        if (rows.length === 0) throw new Error('File Excel không có dữ liệu.');

        const questions: ExamQuestion[] = rows
          .filter(r => String(r.content || '').trim())
          .map((r, idx) => {
            const type = VALID_TYPES.has(String(r.type || '').trim())
              ? (String(r.type).trim() as QuestionType)
              : 'essay';
            const content = String(r.content || '').trim();
            const points = parseFloat(String(r.points)) || 0.25;
            const correctAnswer = String(r.correctAnswer || '').trim();
            const explanation = String(r.explanation || '').trim();

            const q: ExamQuestion = { id: `q${idx + 1}`, type, content, points };

            if (type === 'multiple_choice') {
              const opts = ['optionA', 'optionB', 'optionC', 'optionD']
                .map(k => String(r[k] || '').trim())
                .filter(Boolean);
              if (opts.length > 0) q.options = opts;
              if (correctAnswer) q.correctAnswer = correctAnswer.toUpperCase().charAt(0);
            } else if (type === 'true_false') {
              const opts = ['optionA', 'optionB', 'optionC', 'optionD']
                .map(k => String(r[k] || '').trim())
                .filter(Boolean);
              if (opts.length > 0) {
                q.options = opts;
                q.correctAnswer = correctAnswer; // "Đ,S,Đ,S"
              } else {
                q.correctAnswer = /^(đ|d|t|true|1)/i.test(correctAnswer) ? 'Đúng' : 'Sai';
              }
            } else if (type === 'short_answer' && correctAnswer) {
              q.correctAnswer = correctAnswer;
            }

            if (explanation) q.explanation = explanation;
            return q;
          });

        if (questions.length === 0) throw new Error('Không tìm thấy câu hỏi hợp lệ (cột content bị trống).');
        resolve(questions);
      } catch (err: any) {
        reject(new Error(err.message || 'Lỗi đọc file Excel.'));
      }
    };
    reader.onerror = () => reject(new Error('Không đọc được file.'));
    reader.readAsBinaryString(file);
  });

// ─── Component ─────────────────────────────────────────────────────────────────

export const ImportExamModal = ({ onClose, onImport, settings, showToast }: Props) => {
  const [mode, setMode] = useState<Mode>('ai');
  const [step, setStep] = useState<Step>('upload');
  const [examFile, setExamFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [examTitle, setExamTitle] = useState('');
  const [error, setError] = useState('');
  const [parsing, setParsing] = useState(false);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [forceVision, setForceVision] = useState(false);

  const examRef = useRef<HTMLInputElement>(null);
  const answerRef = useRef<HTMLInputElement>(null);
  const xlsxRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined, type: 'exam' | 'answer') => {
    if (!file) return;
    if (file.size > MAX_IMPORT_MB * 1024 * 1024) { showToast(`File vượt quá ${MAX_IMPORT_MB}MB!`, 'error'); return; }
    if (type === 'exam') { setExamFile(file); setExamTitle(file.name.replace(/\.[^.]+$/, '')); }
    else setAnswerFile(file);
  };

  const handleXlsx = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_IMPORT_MB * 1024 * 1024) { showToast(`File vượt quá ${MAX_IMPORT_MB}MB!`, 'error'); return; }
    setXlsxFile(file);
    setExamTitle(file.name.replace(/\.[^.]+$/, ''));
    setError('');
  };

  const handleAIParse = async () => {
    if (!examFile) return;
    setStep('parsing');
    setError('');
    setProgress(5);
    setProgressLabel('Bắt đầu đọc file...');

    try {
      const ext = examFile.name.split('.').pop()?.toLowerCase() ?? '';
      let imgs: string[] = [];
      
      // Step 1: Render PDF for manual cropping tools (Level 2)
      if (ext === 'pdf') {
        setProgressLabel('Đang chuẩn bị ảnh nền PDF...');
        imgs = await pdfToImages(examFile, (p) => {
          setProgress(5 + Math.round(p * 0.25)); // 5% -> 30%
        });
        setPageImages(imgs);
      } else {
        setProgress(30);
      }

      // Step 2: AI Parsing (Level 3 - Fast Mode by default)
      setProgressLabel('AI đang bóc tách câu hỏi...');
      setProgress(40);
      
      const parsed = await parseExamFromFiles(examFile, answerFile, settings, imgs, forceVision);
      
      let p = 40;
      const interval = setInterval(() => {
        p += Math.random() * 10;
        if (p > 95) p = 95;
        setProgress(Math.round(p));
        if (p < 70) setProgressLabel('Đang trích xuất nội dung...');
        else setProgressLabel('Đang định dạng câu hỏi...');
      }, 500);

      setQuestions(parsed);
      clearInterval(interval);
      setProgress(100);
      setProgressLabel('Xong!');
      
      setTimeout(() => {
        setStep('review');
      }, 500);
    } catch (e: any) {
      setError(e.message || 'Có lỗi xảy ra khi phân tích đề.');
      setStep('upload');
      setProgress(0);
    }
  };

  const handleExcelParse = async () => {
    if (!xlsxFile) return;
    setParsing(true);
    setError('');
    try {
      const parsed = await parseExcelFile(xlsxFile);
      setQuestions(parsed);
      setStep('review');
    } catch (e: any) {
      setError(e.message || 'Lỗi đọc file Excel.');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = () => {
    if (questions.length === 0) return;
    onImport(questions, examTitle || 'Đề thi nhập từ file', pageImages);
    onClose();
  };

  const handleReset = () => {
    setStep('upload');
    setExamFile(null);
    setAnswerFile(null);
    setXlsxFile(null);
    setQuestions([]);
    setExamTitle('');
    setError('');
  };

  const summary = questions.length > 0 ? summarizeQuestions(questions) : null;

  const stepLabels: Record<Step, string> = { upload: mode === 'excel' ? 'Upload Excel' : 'Tải file', parsing: 'Phân tích', review: 'Xem trước' };
  const visibleSteps: Step[] = mode === 'excel' ? ['upload', 'review'] : ['upload', 'parsing', 'review'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-800">Nhập đề thi từ file</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {mode === 'ai' ? 'AI tự động bóc tách câu hỏi và đáp án' : 'Nhập từ template Excel — không cần AI'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode + Step bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 space-y-3">
          {/* Mode tabs */}
          {step === 'upload' && (
            <div className="flex gap-2">
              <button
                onClick={() => { setMode('ai'); setError(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  mode === 'ai' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Loader2 className="w-3 h-3" /> AI (PDF / DOCX / Ảnh)
              </button>
              <button
                onClick={() => { setMode('excel'); setError(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  mode === 'excel' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Table className="w-3 h-3" /> Excel
              </button>
            </div>
          )}
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {visibleSteps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s ? (mode === 'excel' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white') :
                  (step === 'review' || (step === 'parsing' && s === 'upload'))
                    ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
                }`}>{i + 1}</div>
                <span className={`text-xs font-bold ${step === s ? (mode === 'excel' ? 'text-emerald-600' : 'text-blue-600') : 'text-slate-400'}`}>
                  {stepLabels[s]}
                </span>
                {i < visibleSteps.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300" />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* AI upload step */}
          {step === 'upload' && mode === 'ai' && (
            <div className="space-y-5">
              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  File Đề thi <span className="text-red-400">*</span>
                  <span className="normal-case font-normal ml-1">(PDF, DOCX, TXT, JPG, PNG)</span>
                </label>
                <div
                  onClick={() => examRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0], 'exam'); }}
                  className={`border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all text-center ${
                    examFile ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                  }`}
                >
                  {examFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm font-bold text-emerald-700">{examFile.name}</span>
                      <button onClick={e => { e.stopPropagation(); setExamFile(null); setExamTitle(''); }} className="text-slate-400 hover:text-red-500 ml-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-500">Kéo thả hoặc click để chọn file đề thi</p>
                      <p className="text-xs text-slate-400 mt-1">Hỗ trợ PDF, DOCX, TXT, JPG, PNG — tối đa {MAX_IMPORT_MB}MB</p>
                    </>
                  )}
                  <input ref={examRef} type="file" accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp" className="hidden"
                    onChange={e => handleFile(e.target.files?.[0], 'exam')} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  File Đáp án <span className="font-normal normal-case">(tùy chọn)</span>
                </label>
                <div
                  onClick={() => answerRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0], 'answer'); }}
                  className={`border-2 border-dashed rounded-2xl p-4 cursor-pointer transition-all text-center ${
                    answerFile ? 'border-emerald-300 bg-emerald-50' : 'border-slate-100 hover:border-blue-200 hover:bg-blue-50/20'
                  }`}
                >
                  {answerFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-bold text-emerald-700">{answerFile.name}</span>
                      <button onClick={e => { e.stopPropagation(); setAnswerFile(null); }} className="text-slate-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">Chọn file đáp án rời (PDF/DOCX)</span>
                    </div>
                  )}
                  <input ref={answerRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
                    onChange={e => handleFile(e.target.files?.[0], 'answer')} />
                </div>
              </div>
              {examFile && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Tên đề thi</label>
                    <input type="text" value={examTitle} onChange={e => setExamTitle(e.target.value)}
                      placeholder="VD: Đề thi HKII Toán 12 - Mã đề 101"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  
                  {/* Magic Mode Toggle */}
                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between">
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-black text-blue-800 flex items-center gap-2">
                        Magic Mode (AI Vision) 
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-white animate-pulse">SLOW</span>
                      </p>
                      <p className="text-[10px] text-blue-600 mt-0.5 leading-relaxed">
                        AI tự quét & cắt ảnh câu hỏi từ PDF. <strong>Chậm hơn 5 lần</strong>, khuyên dùng cho đề nhiều hình vẽ phức tạp.
                      </p>
                    </div>
                    <button 
                      onClick={() => setForceVision(!forceVision)}
                      className={`w-12 h-6 rounded-full transition-all relative ${forceVision ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${forceVision ? 'translate-x-6' : ''}`} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Excel upload step */}
          {step === 'upload' && mode === 'excel' && (
            <div className="space-y-5">
              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
                </div>
              )}

              {/* Template download */}
              <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                <div>
                  <p className="text-sm font-bold text-emerald-800">Template Excel mẫu</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Điền câu hỏi theo đúng định dạng cột rồi upload lên</p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0"
                >
                  <Download className="w-3.5 h-3.5" /> Tải template
                </button>
              </div>

              {/* Column guide */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-600 mb-2">Các cột trong template:</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-slate-500">
                  {[
                    ['type', 'multiple_choice / true_false / short_answer / essay'],
                    ['content', 'Nội dung câu hỏi (bắt buộc)'],
                    ['optionA–D', 'Các phương án (cho trắc nghiệm / đúng-sai)'],
                    ['correctAnswer', 'A/B/C/D hoặc "Đ,S,Đ,S" hoặc đáp án ngắn'],
                    ['points', 'Điểm (mặc định 0.25 nếu để trống)'],
                    ['explanation', 'Lời giải (tùy chọn)'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-1.5">
                      <span className="font-bold text-slate-700 shrink-0">{k}:</span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload zone */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  File Excel <span className="text-red-400">*</span>
                  <span className="normal-case font-normal ml-1">(.xlsx, .xls)</span>
                </label>
                <div
                  onClick={() => xlsxRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleXlsx(e.dataTransfer.files[0]); }}
                  className={`border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all text-center ${
                    xlsxFile ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                  }`}
                >
                  {xlsxFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm font-bold text-emerald-700">{xlsxFile.name}</span>
                      <button onClick={e => { e.stopPropagation(); setXlsxFile(null); setExamTitle(''); }} className="text-slate-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Table className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-500">Kéo thả hoặc click để chọn file Excel</p>
                      <p className="text-xs text-slate-400 mt-1">Định dạng .xlsx hoặc .xls — tối đa {MAX_IMPORT_MB}MB</p>
                    </>
                  )}
                  <input ref={xlsxRef} type="file" accept=".xlsx,.xls" className="hidden"
                    onChange={e => handleXlsx(e.target.files?.[0])} />
                </div>
              </div>

              {xlsxFile && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Tên đề thi</label>
                  <input type="text" value={examTitle} onChange={e => setExamTitle(e.target.value)}
                    placeholder="VD: Đề thi HKII Toán 12 - Mã đề 101"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              )}
            </div>
          )}

          {/* Parsing step (AI only) */}
          {step === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-5">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
              <div className="text-center w-full max-w-xs">
                <p className="text-lg font-black text-slate-800">AI đang phân tích...</p>
                <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{progressLabel}</p>
                  <p className="text-[10px] font-bold text-slate-400">{progress}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Review step */}
          {step === 'review' && summary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Trắc nghiệm', value: summary.mcq, color: 'bg-blue-50 text-blue-700' },
                  { label: 'Đúng/Sai', value: summary.trueFalse, color: 'bg-purple-50 text-purple-700' },
                  { label: 'Trả lời ngắn', value: summary.shortAnswer, color: 'bg-emerald-50 text-emerald-700' },
                  { label: 'Tự luận', value: summary.essay, color: 'bg-amber-50 text-amber-700' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`rounded-2xl p-3 text-center ${color}`}>
                    <p className="text-2xl font-black">{value}</p>
                    <p className="text-xs font-bold mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <div className="flex items-center gap-3 text-sm text-blue-700">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Đã nhận diện <strong>{summary.total} câu hỏi</strong>, tổng điểm <strong>{summary.maxScore.toFixed(2)}</strong></span>
                </div>
                <div className="flex items-start gap-2 text-[10px] text-blue-500 font-medium bg-white/50 p-2 rounded-xl border border-blue-100/50">
                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  <p>Mẹo: Sếp hãy nhấn nút Tạo bên dưới để vào <b>Trình soạn thảo</b>. Ở đó sếp có thể <b>Cắt ảnh từ PDF</b>, <b>Dán ảnh từ Clipboard (Ctrl+V)</b> hoặc chỉnh điểm chi tiết cho từng câu nhé!</p>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div key={q.id} className="bg-white border border-slate-100 rounded-xl p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                        q.type === 'multiple_choice' ? 'bg-blue-100 text-blue-700' :
                        q.type === 'true_false' ? 'bg-purple-100 text-purple-700' :
                        q.type === 'short_answer' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {q.type === 'multiple_choice' ? 'TN' : q.type === 'true_false' ? 'Đ/S' : q.type === 'short_answer' ? 'Ngắn' : 'TL'}
                      </span>
                      <p className="flex-1 text-slate-700 font-medium line-clamp-2">{idx + 1}. {q.content}</p>
                      <span className="shrink-0 text-xs text-slate-400 font-bold">{q.points}đ</span>
                    </div>
                    {q.correctAnswer && (
                      <p className="text-xs text-emerald-600 font-bold mt-1.5 ml-7">✓ {q.correctAnswer}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800">Hủy</button>
          <div className="flex gap-3">
            {step === 'review' && (
              <button onClick={handleReset} className="flex items-center gap-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-100">
                <ChevronLeft className="w-4 h-4" /> Tải lại file khác
              </button>
            )}
            {step === 'upload' && mode === 'ai' && (
              <button onClick={handleAIParse} disabled={!examFile}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                Phân tích với AI →
              </button>
            )}
            {step === 'upload' && mode === 'excel' && (
              <button onClick={handleExcelParse} disabled={!xlsxFile || parsing}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Table className="w-4 h-4" />}
                Nhập từ Excel →
              </button>
            )}
            {step === 'review' && (
              <button onClick={handleConfirm}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> Tạo phòng thi với {questions.length} câu
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
