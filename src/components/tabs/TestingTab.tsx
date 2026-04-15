import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileCheck, FilePlus, Shuffle, Upload, Download,
  ShieldCheck, AlertCircle, Loader2, X, CheckCircle2, History, Trash2
} from 'lucide-react';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { marked } from 'marked';
import 'katex/dist/katex.min.css';

import { AppData, TemplateFile } from '../../types';
import { examUtils } from '../../utils/examUtils';
import { downloadBlob } from '../../utils/fileUtils';
import { callGeminiAIStream } from '../../lib/gemini';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface TestingTabProps {
  data: AppData;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  showToast: (msg: string, type?: any) => void;
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

export const TestingTab = ({ data, isLoading, setIsLoading, showToast }: TestingTabProps) => {
  const [activeMode, setActiveMode] = useState<TestingMode>(
    () => (localStorage.getItem(LAST_MODE_KEY) as TestingMode) || 'create'
  );
  const [uploadedFiles, setUploadedFiles] = useState<TemplateFile[]>([]);
  const [matrixFile, setMatrixFile] = useState<TemplateFile | null>(null);
  const [requirement, setRequirement] = useState('');
  const [testResult, setTestResult] = useState<string | null>(
    () => localStorage.getItem(LAST_RESULT_KEY)
  );
  const [shuffledCount, setShuffledCount] = useState(4);
  const [processStatus, setProcessStatus] = useState<string>('');
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [showHistory, setShowHistory] = useState(false);

  // Tự xóa entries hết hạn khi mount
  useEffect(() => {
    const cleaned = loadHistory();
    setHistory(cleaned);
    saveHistory(cleaned);
  }, []);

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
    const element = document.getElementById('report-paper-container');
    if (!element) return;
    showToast('Đang tạo PDF, vui lòng chờ...');
    try {
      const mod = await import('html2pdf.js');
      const html2pdf = (mod.default ?? mod) as any;
      const opt = {
        margin: [15, 12, 15, 12] as [number, number, number, number],
        filename: `Bao_cao_kiem_tra_${Date.now()}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.92 },
        html2canvas: { scale: 1.5, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };
      await html2pdf().from(element).set(opt).save();
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
      const htmlBody = await marked(testResult);
      const htmlContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<style>
  body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.6; padding: 2cm; }
  h1 { text-align: center; font-size: 16pt; color: #1F3864; }
  h2 { font-size: 13pt; color: #2F5496; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  h3 { font-size: 12pt; color: #2F5496; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; }
  th { border: 1px solid #000; padding: 6px 8px; text-align: left; font-size: 11pt; background-color: #2F5496; color: #ffffff; }
  td { border: 1px solid #000; padding: 6px 8px; text-align: left; font-size: 11pt; }
  p { margin: 4px 0; }
</style></head>
<body>${htmlBody}</body></html>`;
      const encoder = new TextEncoder();
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const encoded = encoder.encode(htmlContent);
      const blob = new Blob([bom, encoded], { type: 'application/msword' });
      downloadBlob(blob, `Bao_cao_kiem_tra_${Date.now()}.doc`);
      showToast('Đã tải file Word thành công!', 'success');
    } catch (e) {
      showToast('Lỗi xuất Word. Vui lòng thử lại.', 'error');
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: 'test' | 'matrix') => {
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
    if (!data.settings.geminiApiKey) {
      showToast('Cần nhập Gemini API Key trong Cài đặt', 'error');
      return;
    }
    setIsLoading(true);
    setTestResult(null);
    setProcessStatus('Đang chuẩn bị và gửi AI...');

    try {
      const modelIdx = Math.max(0, data.settings.models?.indexOf(data.settings.selectedModel) || 0);
      let cumulativeText = '';

      const onChunk = (chunk: string) => {
        cumulativeText += chunk;
        setProcessStatus('AI đang phân tích & soạn báo cáo...');
      };

      if (activeMode === 'create') {
        const prompt = await examUtils.getGeneratePrompt(matrixFile, requirement);
        await callGeminiAIStream(prompt, data.settings.geminiApiKey, onChunk, modelIdx);
        const match = cumulativeText.match(/<exam_content>([\s\S]*?)<\/exam_content>/);
        const final = match ? match[1].trim() : cumulativeText.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        setTestResult(final);
        addToHistory('create', final);

      } else if (activeMode === 'audit') {
        const fullContent = uploadedFiles.map(f => f.content).join('\n---\n');
        if (!fullContent.trim()) throw new Error('Nội dung tệp trống.');
        const prompt = await examUtils.getAuditPrompt(fullContent);
        await callGeminiAIStream(prompt, data.settings.geminiApiKey, onChunk, modelIdx);
        const match = cumulativeText.match(/<audit_report>([\s\S]*?)<\/audit_report>/);
        const final = match
          ? match[1].trim()
          : cumulativeText.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').replace(/<\/?[a-z_]+>/g, '').trim();
        setTestResult(final);
        addToHistory('audit', final);

      } else if (activeMode === 'shuffle') {
        setProcessStatus('Đang thực hiện hoán vị đề...');
        const fullContent = uploadedFiles.map(f => f.content).join('\n---\n');
        if (!fullContent.trim()) throw new Error('Nội dung tệp trống.');
        await examUtils.shuffleExam(fullContent, shuffledCount, data.settings.geminiApiKey, modelIdx);
        addToHistory('shuffle', `[Đã tải xuống bộ ${shuffledCount} mã đề hoán vị]`);
        showToast(`Đã hoán vị thành ${shuffledCount} mã đề!`);
        setIsLoading(false);
        setProcessStatus('');
        return;
      }

      showToast('Xử lý hoàn tất!');
    } catch (err: any) {
      showToast(`Lỗi: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
      setProcessStatus('');
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
      className="max-w-6xl mx-auto p-2 sm:p-6"
    >
      {/* Mode Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {(Object.keys(modeContent) as TestingMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setActiveMode(mode)}
            className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-start gap-3 text-left ${
              activeMode === mode
                ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100 scale-[1.02]'
                : 'bg-white border-slate-50 text-slate-600 hover:border-blue-200 shadow-sm'
            }`}
          >
            <div className={`p-3 rounded-2xl ${activeMode === mode ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>
              {modeContent[mode].icon}
            </div>
            <div>
              <h3 className="font-black text-lg">{modeContent[mode].title}</h3>
              <p className={`text-xs mt-1 leading-relaxed ${activeMode === mode ? 'text-blue-100' : 'text-slate-400'}`}>
                {modeContent[mode].desc}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Control Panel */}
        <div className="lg:w-1/3 space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" />
              Thiết lập dữ liệu đầu vào
            </h4>

            {activeMode === 'create' && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Ma trận đề (Tùy chọn)</label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-100 rounded-3xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FilePlus className="w-8 h-8 text-slate-200 mb-2" />
                    <p className="text-xs text-slate-400 font-medium">{matrixFile ? matrixFile.name : 'Tải lên Ma trận (Docx/Xlsx)'}</p>
                  </div>
                  <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'matrix')} />
                </label>
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

        {/* Right Result Panel */}
        <div className="lg:w-2/3 flex flex-col bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden min-h-[600px]">
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

          <div className="flex-1 p-8 overflow-y-auto">
            {!testResult ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto">
                  <AlertCircle className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="text-lg font-bold text-slate-300">Chưa có kết quả xử lý</h3>
                <p className="text-sm text-slate-400">Hãy thiết lập dữ liệu bên trái và bấm nút bắt đầu để AI thực hiện phân tích.</p>
              </div>
            ) : (
              <div className="w-full text-left space-y-6">
                <div className="p-4 bg-green-50 text-green-700 rounded-2xl border border-green-100 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-sm">Đã hoàn tất phân tích!</span>
                </div>
                <div
                  id="report-paper-container"
                  className="bg-white p-10 rounded-[32px] border border-slate-100 shadow-lg font-serif leading-relaxed text-slate-800 min-h-[600px]"
                >
                  <article className="prose prose-slate max-w-none prose-p:my-2 prose-table:border-collapse prose-th:bg-[#2F5496] prose-th:text-white prose-td:border-slate-300 overflow-hidden">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex, rehypeRaw]}
                    >
                      {testResult}
                    </ReactMarkdown>
                  </article>
                </div>
              </div>
            )}
          </div>

          {testResult && (
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-between gap-3">
              <button
                onClick={clearResult}
                className="px-5 py-2.5 bg-white text-red-500 rounded-2xl font-bold border border-red-100 hover:bg-red-50 transition-all flex items-center gap-2 text-sm"
              >
                <Trash2 className="w-4 h-4" /> Xóa kết quả
              </button>
              <div className="flex gap-3">
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
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
