import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileCheck, FilePlus, Shuffle, Upload, Download, FileCode,
  ShieldCheck, AlertCircle, Loader2, X, CheckCircle2, History, Trash2, LibraryBig
} from 'lucide-react';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { marked } from 'marked';
import { generateAnswerSheetHTML, generateAnswerKeyTemplateHTML } from '../../utils/answerSheetTemplate';
import { ExamDocsModal } from '../features/testing/ExamDocsModal';
import { ExamContentBoard } from '../features/testing/ExamContentBoard';
import { WORD_EXPORT_STYLES } from '../../utils/examPaperStyles';

const openInNewTab = (html: string) => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

import { AppData, TemplateFile, LessonPlan } from '../../types';
import { examUtils } from '../../utils/examUtils';
import { downloadBlob } from '../../utils/fileUtils';
import { callAI, callAIStream, getActiveApiKey } from '../../lib/aiProviders';
import { LatexModal } from '../modals/LatexModal';
import { openInOverleaf } from '../../utils/exportUtils';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface TestingTabProps {
  data: AppData;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  showToast: (msg: string, type?: any) => void;
  initialContent?: string;
  onConsumeInitialContent?: () => void;
}

type TestingMode = 'create' | 'audit' | 'shuffle';

interface HistoryEntry {
  id: string;
  timestamp: number;
  mode: TestingMode;
  title: string;
  content: string;
}

const HISTORY_KEY = 'testing_history';
const LAST_RESULT_KEY = 'testing_last_result';
const LAST_MODE_KEY = 'testing_last_mode';
const MAX_HISTORY = 20;
const EXPIRE_DAYS = 7;

const loadHistory = (): HistoryEntry[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const entries: HistoryEntry[] = JSON.parse(raw);
    const cutoff = Date.now() - EXPIRE_DAYS * 24 * 60 * 60 * 1000;
    return entries.filter(e => e.timestamp > cutoff);
  } catch { return []; }
};

const saveHistory = (entries: HistoryEntry[]) => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
};

const modeBadge: Record<TestingMode, { label: string; color: string }> = {
  create: { label: 'Soạn đề', color: 'bg-blue-100 text-blue-700' },
  audit:  { label: 'Soát lỗi', color: 'bg-purple-100 text-purple-700' },
  shuffle:{ label: 'Trộn đề', color: 'bg-orange-100 text-orange-700' },
};

export const TestingTab = ({ data, isLoading, setIsLoading, showToast, initialContent, onConsumeInitialContent }: TestingTabProps) => {
  const [activeMode, setActiveMode] = useState<TestingMode>(
    () => (localStorage.getItem(LAST_MODE_KEY) as TestingMode) || 'create'
  );
  const [uploadedFiles, setUploadedFiles] = useState<TemplateFile[]>([]);
  const [matrixFile, setMatrixFile] = useState<TemplateFile | null>(null);
  const [sampleFile, setSampleFile] = useState<TemplateFile | null>(null);
  const [requirement, setRequirement] = useState('');
  const [testResult, setTestResult] = useState<string | null>(
    () => localStorage.getItem(LAST_RESULT_KEY)
  );
  const [shuffledCount, setShuffledCount] = useState(4);
  const [questionStructure, setQuestionStructure] = useState({ mcq: 28, trueFalse4: 4, shortAnswer: 0, essay: 0 });
  const [processStatus, setProcessStatus] = useState<string>('');
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [showHistory, setShowHistory] = useState(false);
  const [latexContent, setLatexContent] = useState('');
  const [isLatexModalOpen, setIsLatexModalOpen] = useState(false);
  const [refineRequest, setRefineRequest] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [docModalEntry, setDocModalEntry] = useState<HistoryEntry | null>(null);

  // Tự xóa entries hết hạn khi mount
  useEffect(() => {
    const cleaned = loadHistory();
    setHistory(cleaned);
    saveHistory(cleaned);
  }, []);

  // Pre-fill requirement khi được chuyển từ giáo án, xóa sau khi dùng
  useEffect(() => {
    if (initialContent) {
      setRequirement(initialContent);
      onConsumeInitialContent?.();
    }
  }, [initialContent]);

  // Lưu kết quả vào localStorage
  useEffect(() => {
    if (testResult) {
      localStorage.setItem(LAST_RESULT_KEY, testResult);
      localStorage.setItem(LAST_MODE_KEY, activeMode);
    }
  }, [testResult, activeMode]);

  const addToHistory = (mode: TestingMode, content: string) => {
    const modeLabel = modeBadge[mode].label;
    const dateStr = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      mode,
      title: `${modeLabel} – ${dateStr}`,
      content,
    };
    const updated = [entry, ...history].slice(0, MAX_HISTORY);
    setHistory(updated);
    saveHistory(updated);
  };

  const deleteHistoryEntry = (id: string) => {
    const updated = history.filter(e => e.id !== id);
    setHistory(updated);
    saveHistory(updated);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const clearResult = () => {
    setTestResult(null);
    localStorage.removeItem(LAST_RESULT_KEY);
    localStorage.removeItem(LAST_MODE_KEY);
  };

  const handleDownloadPDF = async () => {
    const element = document.querySelector<HTMLElement>('.exam-board .w-md-editor-preview .wmde-markdown');
    if (!element) return;
    showToast('Đang tạo PDF, vui lòng chờ...');
    try {
      const { exportElementToPdf } = await import('../../utils/pdfExport');
      await exportElementToPdf(element, {
        filename: `Bao_cao_kiem_tra_${Date.now()}.pdf`,
      });
      showToast('Đã tải PDF thành công!', 'success');
    } catch (e) {
      console.error('PDF export error:', e);
      showToast('Lỗi xuất PDF. Vui lòng thử lại.', 'error');
    }
  };

  const handleDownloadWord = async () => {
    if (!testResult) return;
    showToast('Đang tạo file Word...');
    try {
      // Keep LaTeX as-is ($...$ and $$...$$) — Word cannot render KaTeX HTML.
      // Teachers open the .doc and use MathType "Toggle TeX" to convert LaTeX → native Word equations.
      const htmlBody = await marked(testResult);
      const htmlContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<style>${WORD_EXPORT_STYLES}
/* LaTeX delimiters — visible as plain text; use MathType Toggle TeX to convert */
</style></head>
<body>${htmlBody}</body></html>`;
      const encoder = new TextEncoder();
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const encoded = encoder.encode(htmlContent);
      const blob = new Blob([bom, encoded], { type: 'application/msword' });
      downloadBlob(blob, `De_thi_${Date.now()}.doc`);
      showToast('Đã tải file Word! Mở Word → MathType → Toggle TeX để hiển thị công thức.', 'success');
    } catch (e) {
      showToast('Lỗi xuất Word. Vui lòng thử lại.', 'error');
    }
  };


  const handleExportOverleaf = async () => {
    if (!testResult) return;
    setIsLoading(true);
    try {
      const prompt = `Chuyển đổi nội dung Markdown sau sang mã LaTeX hoàn chỉnh, có thể biên dịch ngay trên Overleaf. Yêu cầu bắt buộc:
- \\documentclass{article} với các gói: inputenc (utf8), fontenc (T5), babel (vietnamese), amsmath, amssymb, geometry (a4paper, margin=2cm), longtable, booktabs, array
- Giữ nguyên 100% nội dung, không tóm tắt hay bỏ bớt
- Công thức toán dùng $...$ (inline) hoặc \\[...\\] (display)
- Trả về CHỈ mã LaTeX thuần, không bọc trong markdown\n\n${testResult}`;
      const latex = await callAI(prompt, data.settings);
      const clean = latex.replace(/^```(?:latex)?\n?/m, '').replace(/\n?```$/m, '').trim();
      setLatexContent(clean);
      setIsLatexModalOpen(true);
    } catch {
      showToast('Lỗi chuyển đổi LaTeX. Vui lòng thử lại.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'docx') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }
    if (extension === 'pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
      }
      return fullText;
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsText(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: 'test' | 'matrix' | 'sample') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setProcessStatus('Đang trích xuất dữ liệu tệp...');
    try {
      const content = await extractTextFromFile(file);
      const newFile: TemplateFile = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.name.split('.').pop() || '',
        content,
        category: category as any
      };
      if (category === 'matrix') {
        setMatrixFile(newFile);
        showToast('Đã nhận diện Ma trận đề!');
      } else if (category === 'sample') {
        setSampleFile(newFile);
        showToast('Đã nhận diện Đề mẫu định dạng!');
      } else {
        setUploadedFiles(prev => [...prev, newFile]);
        showToast('Đã tải lên tệp đề thi!');
      }
    } catch {
      showToast('Lỗi khi đọc tệp!', 'error');
    } finally {
      setIsLoading(false);
      setProcessStatus('');
    }
  };

  const handleExamAction = async () => {
    if (!getActiveApiKey(data.settings)) {
      showToast('Cần nhập API Key trong Cài đặt', 'error');
      return;
    }
    setIsLoading(true);
    setTestResult(null);
    setProcessStatus('Đang chuẩn bị và gửi AI...');

    try {
      // modelIdx unused — provider routing handled inside callAIStream
      let cumulativeText = '';

      const onChunk = (chunk: string) => {
        cumulativeText += chunk;
        setProcessStatus('AI đang phân tích & soạn báo cáo...');
      };

      if (activeMode === 'create') {
        const prompt = examUtils.getGeneratePrompt(matrixFile, requirement, sampleFile, questionStructure);
        await callAIStream(prompt, data.settings, onChunk);
        const match = cumulativeText.match(/<exam_content>([\s\S]*?)<\/exam_content>/);
        const raw = match ? match[1].trim() : cumulativeText.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        const final = raw.normalize('NFC');
        setTestResult(final);
        addToHistory('create', final);

      } else if (activeMode === 'audit') {
        const fullContent = uploadedFiles.map(f => f.content).join('\n---\n');
        if (!fullContent.trim()) throw new Error('Nội dung tệp trống.');
        const prompt = await examUtils.getAuditPrompt(fullContent);
        await callAIStream(prompt, data.settings, onChunk);
        const match = cumulativeText.match(/<audit_report>([\s\S]*?)<\/audit_report>/);
        const raw = match
          ? match[1].trim()
          : cumulativeText
              .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
              .replace(/<\/?(?:thinking|audit_report|exam_content|answer_key)>/g, '')
              .trim();
        const final = raw.normalize('NFC');
        setTestResult(final);
        addToHistory('audit', final);

      } else if (activeMode === 'shuffle') {
        setProcessStatus('Đang trích xuất câu hỏi và thực hiện hoán vị...');
        const fullContent = uploadedFiles.map(f => f.content).join('\n===FILE_SEPARATOR===\n');
        if (!fullContent.trim()) throw new Error('Nội dung tệp trống.');
        const summary = (await examUtils.shuffleExam(fullContent, shuffledCount, data.settings)).normalize('NFC');
        setTestResult(summary);
        addToHistory('shuffle', summary);
        showToast(`Đã hoán vị thành ${shuffledCount} mã đề — ZIP đã tải xuống!`);
      }

      showToast('Xử lý hoàn tất!');
    } catch (err: any) {
      showToast(`Lỗi: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
      setProcessStatus('');
    }
  };

  const handleRefine = async () => {
    if (!testResult || !refineRequest.trim()) return;
    if (!getActiveApiKey(data.settings)) {
      showToast('Cần nhập API Key trong Cài đặt', 'error');
      return;
    }
    setIsRefining(true);
    try {
      const prompt = examUtils.getRefinePrompt(testResult, refineRequest.trim());
      let cumulativeText = '';
      await callAIStream(prompt, data.settings, (chunk) => { cumulativeText += chunk; });
      const match = cumulativeText.match(/<exam_content>([\s\S]*?)<\/exam_content>/);
      const raw = match ? match[1].trim() : cumulativeText.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
      const final = raw.normalize('NFC');
      setTestResult(final);
      addToHistory(activeMode, final);
      setRefineRequest('');
      showToast('Đã cập nhật đề theo yêu cầu!', 'success');
    } catch (err: any) {
      showToast(`Lỗi chỉnh sửa: ${err.message || err}`, 'error');
    } finally {
      setIsRefining(false);
    }
  };

  const modeContent = {
    create: {
      title: 'Soạn đề Kiểm tra',
      desc: 'Thiết kế đề thi chuẩn ma trận Bloom (Nhận biết - Thông hiểu - Vận dụng)',
      icon: <FilePlus className="w-6 h-6" />,
      action: 'Bắt đầu soạn đề AI'
    },
    audit: {
      title: 'Soát lỗi & Biên tập',
      desc: 'AI rà soát chính tả, định dạng và độ chuẩn xác toán học, xuất báo cáo chi tiết',
      icon: <FileCheck className="w-6 h-6" />,
      action: 'Bắt đầu soát lỗi'
    },
    shuffle: {
      title: 'Trộn đề hoán vị',
      desc: 'Hoán vị câu hỏi và phương án, tự động tạo mã đề và file đáp án tương ứng',
      icon: <Shuffle className="w-6 h-6" />,
      action: 'Bắt đầu trộn đề'
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col gap-0 overflow-hidden"
    >
      {/* Mode Selector — compact horizontal cards to save vertical space */}
      <div className="grid grid-cols-3 gap-2 p-4 pb-0 flex-shrink-0">
        {(Object.keys(modeContent) as TestingMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setActiveMode(mode)}
            className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-2.5 text-left ${
              activeMode === mode
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100'
                : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200 shadow-sm'
            }`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${activeMode === mode ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>
              {modeContent[mode].icon}
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-sm leading-tight truncate">{modeContent[mode].title}</h3>
              <p className={`text-[10px] mt-0.5 leading-tight line-clamp-1 ${activeMode === mode ? 'text-blue-100' : 'text-slate-400'}`}>
                {modeContent[mode].desc}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 p-4 flex-1 min-h-0 overflow-hidden">
        {/* Left Control Panel — fixed 320px so MDEditor gets ≥640px */}
        <div className="lg:w-80 shrink-0 overflow-y-auto space-y-4">
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-5">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" />
              Thiết lập dữ liệu đầu vào
            </h4>

            {activeMode === 'create' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Đề mẫu định dạng (Khuyên dùng)</label>
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-blue-100 rounded-3xl cursor-pointer hover:bg-blue-50/40 transition-colors bg-blue-50/10">
                    <div className="flex flex-col items-center justify-center pt-4 pb-4">
                      <FileCheck className="w-7 h-7 text-blue-300 mb-1" />
                      <p className="text-xs text-slate-500 font-semibold">{sampleFile ? sampleFile.name : 'Tải lên Đề mẫu (Docx/Pdf/Txt)'}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">AI sẽ giữ nguyên format, tiêu đề, cách đánh số</p>
                    </div>
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'sample')} />
                  </label>
                  {sampleFile && (
                    <button onClick={() => setSampleFile(null)} className="text-[11px] text-slate-400 hover:text-red-500 flex items-center gap-1">
                      <X className="w-3 h-3" /> Xóa đề mẫu
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Ma trận đề (Tùy chọn)</label>
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-100 rounded-3xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-4 pb-4">
                      <FilePlus className="w-7 h-7 text-slate-200 mb-1" />
                      <p className="text-xs text-slate-400 font-medium">{matrixFile ? matrixFile.name : 'Tải lên Ma trận (Docx/Pdf/Xlsx)'}</p>
                    </div>
                    <input type="file" accept=".docx,.pdf,.xlsx" className="hidden" onChange={(e) => handleFileUpload(e, 'matrix')} />
                  </label>
                  {matrixFile && (
                    <button onClick={() => setMatrixFile(null)} className="text-[11px] text-slate-400 hover:text-red-500 flex items-center gap-1">
                      <X className="w-3 h-3" /> Xóa ma trận
                    </button>
                  )}
                </div>
              </div>
            )}

            {(activeMode === 'audit' || activeMode === 'shuffle') && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tải lên Đề thi gốc</label>
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-blue-100 rounded-[40px] cursor-pointer hover:bg-blue-50/50 transition-colors bg-blue-50/20">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-10 h-10 text-blue-200 mb-3" />
                      <p className="text-sm text-slate-500 font-bold">Thả đề thi vào đây...</p>
                      <p className="text-[11px] text-slate-400 mt-1">Hỗ trợ .docx, .pdf, .txt</p>
                    </div>
                    <input type="file" className="hidden" multiple onChange={(e) => handleFileUpload(e, 'test')} />
                  </label>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadedFiles.map(file => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-600 truncate">{file.name}</span>
                        </div>
                        <button onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))} className="text-slate-300 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeMode === 'shuffle' && (
              <div className="pt-4 border-t border-slate-50">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Số lượng mã đề hoán vị</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range" min="2" max="12" step="1"
                    value={shuffledCount}
                    onChange={(e) => setShuffledCount(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black">{shuffledCount}</span>
                </div>
              </div>
            )}

            {activeMode === 'create' && (
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Cấu trúc câu hỏi</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: 'mcq', label: 'TN 4 phương án', color: 'text-blue-600 bg-blue-50' },
                    { key: 'trueFalse4', label: 'Đúng/Sai 4 ý', color: 'text-purple-600 bg-purple-50' },
                    { key: 'shortAnswer', label: 'Trả lời ngắn', color: 'text-emerald-600 bg-emerald-50' },
                    { key: 'essay', label: 'Tự luận', color: 'text-orange-600 bg-orange-50' },
                  ] as const).map(({ key, label, color }) => (
                    <div key={key} className={`flex flex-col items-center rounded-2xl p-3 ${color}`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-center leading-tight">{label}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setQuestionStructure(s => ({ ...s, [key]: Math.max(0, s[key] - 1) }))}
                          className="w-6 h-6 rounded-lg bg-white/60 hover:bg-white font-black text-base flex items-center justify-center leading-none"
                        >−</button>
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={questionStructure[key]}
                          onChange={e => setQuestionStructure(s => ({ ...s, [key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                          className="w-10 text-center font-black text-lg bg-transparent outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setQuestionStructure(s => ({ ...s, [key]: s[key] + 1 }))}
                          className="w-6 h-6 rounded-lg bg-white/60 hover:bg-white font-black text-base flex items-center justify-center leading-none"
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>
                {(questionStructure.mcq + questionStructure.trueFalse4 + questionStructure.shortAnswer + questionStructure.essay) > 0 && (
                  <p className="text-[10px] text-slate-400 text-center">
                    Tổng: <strong className="text-slate-600">
                      {questionStructure.mcq + questionStructure.trueFalse4 + questionStructure.shortAnswer + questionStructure.essay} câu
                    </strong>
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Yêu cầu cụ thể</label>
              <textarea
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                placeholder={activeMode === 'audit' ? 'Ví dụ: Soát kỹ các ký hiệu Mathtype, kiểm tra chính tả...' : 'Ví dụ: Tăng độ khó phần Vận dụng cao...'}
                className="w-full px-5 py-4 rounded-3xl border border-slate-100 bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[120px] text-sm"
              />
            </div>

            <button
              onClick={handleExamAction}
              disabled={isLoading || (activeMode !== 'create' && uploadedFiles.length === 0)}
              className="w-full py-4 bg-slate-900 text-white rounded-3xl font-black shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale relative overflow-hidden"
            >
              {isLoading && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 30, ease: 'linear' }}
                  className="absolute bottom-0 left-0 h-1 bg-blue-500/50"
                />
              )}
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : modeContent[activeMode].icon}
              {modeContent[activeMode].action}
            </button>

            {processStatus && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 text-[11px] font-bold text-blue-600 bg-blue-50 py-2 rounded-xl border border-blue-100 italic"
              >
                <div className="flex gap-1">
                  <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce"></span>
                </div>
                {processStatus}
              </motion.div>
            )}
          </div>
        </div>

        {/* Right Result Panel — flex-1 so MDEditor's 3-pane split gets max room */}
        <div className="flex-1 min-w-0 flex flex-col bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden min-h-[600px]">
          <div className="p-6 border-b border-slate-50 bg-slate-50/30 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">Review & Kết quả</h2>
                <p className="text-sm text-slate-400 font-medium">Báo cáo đạt chuẩn kiểm định</p>
              </div>
            </div>
            <button
              onClick={() => setShowHistory(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${showHistory ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              <History className="w-4 h-4" />
              Lịch sử {history.length > 0 && `(${history.length})`}
            </button>
          </div>

          {/* History Panel */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-slate-100"
              >
                <div className="p-5 bg-slate-50 space-y-2 max-h-72 overflow-y-auto">
                  {history.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Chưa có lịch sử nào</p>
                  ) : (
                    <>
                      {history.map(entry => (
                        <div key={entry.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${modeBadge[entry.mode].color}`}>
                            {modeBadge[entry.mode].label}
                          </span>
                          <span className="text-xs text-slate-600 font-medium flex-1 truncate">{entry.title}</span>
                          <button
                            onClick={() => { setTestResult(entry.content); setActiveMode(entry.mode); setShowHistory(false); }}
                            className="text-[11px] font-bold text-blue-600 hover:underline shrink-0"
                          >
                            Xem lại
                          </button>
                          {entry.mode === 'create' && (
                            <button
                              onClick={() => setDocModalEntry(entry)}
                              title="Sinh bộ tài liệu"
                              className="text-slate-400 hover:text-indigo-600 shrink-0 transition-colors"
                            >
                              <LibraryBig className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => deleteHistoryEntry(entry.id)} className="text-slate-300 hover:text-red-500 shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={clearHistory}
                        className="w-full py-2 text-xs font-bold text-red-500 hover:text-red-700 flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Xóa tất cả lịch sử
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scrollable body: editor + action buttons always reachable */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            {!testResult ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 p-8">
                <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto">
                  <AlertCircle className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="text-lg font-bold text-slate-300">Chưa có kết quả xử lý</h3>
                <p className="text-sm text-slate-400">Hãy thiết lập dữ liệu bên trái và bấm nút bắt đầu để AI thực hiện phân tích.</p>
              </div>
            ) : (
              <ExamContentBoard
                testResult={testResult}
                setTestResult={v => setTestResult(v)}
                refineRequest={refineRequest}
                setRefineRequest={setRefineRequest}
                onRefine={handleRefine}
                isRefining={isRefining}
              />
            )}

            {testResult && (
              <>
                <div className="p-5 pr-20 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-between gap-3 flex-shrink-0">
                  <button
                    onClick={clearResult}
                    className="px-5 py-2.5 bg-white text-red-500 rounded-2xl font-bold border border-red-100 hover:bg-red-50 transition-all flex items-center gap-2 text-sm"
                  >
                    <Trash2 className="w-4 h-4" /> Xóa kết quả
                  </button>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleDownloadPDF}
                      className="px-5 py-2.5 bg-white text-slate-600 rounded-2xl font-bold border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-2 text-sm"
                    >
                      <Download className="w-4 h-4" /> Tải PDF
                    </button>
                    <button
                      onClick={handleDownloadWord}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2 text-sm"
                    >
                      <Download className="w-4 h-4" /> Xuất Word (.doc)
                    </button>
                    <button
                      onClick={handleExportOverleaf}
                      disabled={isLoading}
                      className="px-5 py-2.5 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                      <FileCode className="w-4 h-4" /> Overleaf / LaTeX
                    </button>
                  </div>
                </div>
                {/* Mẫu phiếu làm bài & đáp án */}
                <div className="px-5 pb-4 bg-slate-50 flex flex-wrap gap-2 border-t border-slate-100 pt-3 flex-shrink-0">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest w-full">Tải mẫu đi kèm đề thi</span>
                  <button
                    onClick={() => openInNewTab(generateAnswerSheetHTML())}
                    className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-2xl font-bold text-xs hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" /> Phiếu trả lời học sinh
                  </button>
                  <button
                    onClick={() => openInNewTab(generateAnswerKeyTemplateHTML())}
                    className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl font-bold text-xs hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" /> Mẫu đáp án + thang điểm
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <LatexModal
        isOpen={isLatexModalOpen}
        onClose={() => setIsLatexModalOpen(false)}
        latexContent={latexContent}
        currentPlan={{ title: 'De_thi_kiem_tra' } as Partial<LessonPlan>}
        downloadLaTeXFile={() => {
          const blob = new Blob([latexContent], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'De_thi_kiem_tra.tex'; a.click();
          URL.revokeObjectURL(url);
        }}
        openInOverleaf={() => openInOverleaf(latexContent, { title: 'De_thi_kiem_tra' } as Partial<LessonPlan>, showToast)}
        showToast={showToast}
      />

      {docModalEntry && (
        <ExamDocsModal
          entry={docModalEntry}
          onClose={() => setDocModalEntry(null)}
          settings={data.settings}
          showToast={showToast}
        />
      )}
    </motion.div>
  );
};
