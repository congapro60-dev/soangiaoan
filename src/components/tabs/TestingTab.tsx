import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileCheck, FilePlus, Shuffle, Upload, Download, 
  Search, ShieldCheck, AlertCircle, Loader2, X, CheckCircle2, ChevronRight
} from 'lucide-react';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

import { AppData, TemplateFile, LessonPlan } from '../../types';
import { examUtils } from '../../utils/examUtils';
import { downloadBlob } from '../../utils/fileUtils';

// Cấu hình worker cho PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface TestingTabProps {
  data: AppData;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  showToast: (msg: string, type?: any) => void;
}

type TestingMode = 'create' | 'audit' | 'shuffle';

export const TestingTab = ({ data, isLoading, setIsLoading, showToast }: TestingTabProps) => {
  const [activeMode, setActiveMode] = useState<TestingMode>('create');
  const [uploadedFiles, setUploadedFiles] = useState<TemplateFile[]>([]);
  const [matrixFile, setMatrixFile] = useState<TemplateFile | null>(null);
  const [requirement, setRequirement] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [shuffledCount, setShuffledCount] = useState(4);

  const handleDownloadPDF = () => {
    const element = document.getElementById('report-paper-container');
    if (!element) return;
    
    showToast('Đang tạo bản in PDF...');
    const opt = {
      margin: 10,
      filename: `Bao_cao_kiem_tra_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    // @ts-ignore
    window.html2pdf().from(element).set(opt).save();
  };

  const handleDownloadWord = () => {
    if (!testResult) return;
    const element = document.getElementById('report-paper-container');
    if (!element) return;
    
    // Tạo cấu trúc HTML giống Word với font Times New Roman
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><style>
        body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.5; padding: 2cm; }
        h1, h2, h3 { color: #2F5496; }
        table { border-collapse: collapse; width: 100%; border: 1px solid #000; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background-color: #2F5496; color: #ffffff; }
        .status-ok { background-color: #E2EFDA; color: #375623; }
        .status-error { background-color: #FCE4D6; color: #C00000; }
      </style></head>
      <body>${element.innerHTML}</body></html>
    `;
    
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    downloadBlob(blob, `Bao_cao_kiem_tra_${new Date().getTime()}.doc`);
    showToast('Đang tải bản Word (.doc)...');
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
    try {
      const content = await extractTextFromFile(file);
      const newFile: TemplateFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.name.split('.').pop() || '',
        content: content,
        category: category as any
      };

      if (category === 'matrix') {
        setMatrixFile(newFile);
        showToast('Đã nhận diện Ma trận đề!');
      } else {
        setUploadedFiles(prev => [...prev, newFile]);
        showToast('Đã tải lên tệp đề thi!');
      }
    } catch (err) {
      showToast('Lỗi khi đọc tệp!', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExamAction = async () => {
    if (!data.settings.geminiApiKey) {
      showToast('Cần nhập Gemini API Key trong Cài đặt', 'error');
      return;
    }
    
    setIsLoading(true);
    setTestResult(null);

    try {
      let result = '';
      const modelIdx = Math.max(0, data.settings.models?.indexOf(data.settings.selectedModel) || 0);

      if (activeMode === 'create') {
        result = await examUtils.generateExam(matrixFile, requirement, data.settings.geminiApiKey, modelIdx);
      } else if (activeMode === 'audit') {
        const fullContent = uploadedFiles.map(f => f.content).join('\n---\n');
        if (!fullContent.trim()) throw new Error("Nội dung tệp trống hoặc không thể trích xuất.");
        result = await examUtils.auditExam(fullContent, data.settings.geminiApiKey, modelIdx);
      } else if (activeMode === 'shuffle') {
        const fullContent = uploadedFiles.map(f => f.content).join('\n---\n');
        if (!fullContent.trim()) throw new Error("Nội dung tệp trống.");
        await examUtils.shuffleExam(fullContent, shuffledCount, data.settings.geminiApiKey, modelIdx);
        showToast(`Đã hoán vị thành ${shuffledCount} mã đề!`);
        setIsLoading(false);
        return;
      }

      if (result) {
        // Tách kết quả từ các thẻ XML (Claude-style)
        const contentMatch = result.match(/<audit_report>([\s\S]*?)<\/audit_report>/) || 
                           result.match(/<exam_content>([\s\S]*?)<\/exam_content>/);
        
        const finalOutput = contentMatch ? contentMatch[1] : result;
        setTestResult(finalOutput);
        showToast('Xử lý hoàn tất!');
      }
    } catch (err: any) {
      console.error("Exam Action Error:", err);
      showToast(`Lỗi hệ thống: ${err.message || 'Vui lòng kiểm tra lại API Key hoặc tệp tin'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  const modeContent = {
    create: {
      title: "Soạn đề Kiểm tra",
      desc: "Thiết kế đề thi chuẩn ma trận Bloom (Nhận biết - Thông hiểu - Vận dụng)",
      icon: <FilePlus className="w-6 h-6" />,
      action: "Bắt đầu soạn đề AI"
    },
    audit: {
      title: "Soát lỗi & Biên tập",
      desc: "AI đóng vai 'Biên tập viên khó tính' rà soát chính tả, định dạng và độ chuẩn xác toán học",
      icon: <FileCheck className="w-6 h-6" />,
      action: "Bắt đầu soát lỗi"
    },
    shuffle: {
      title: "Trộn đề hoán vị",
      desc: "Hoán vị câu hỏi và phương án, tự động tạo mã đề và file đáp án tương ứng",
      icon: <Shuffle className="w-6 h-6" />,
      action: "Bắt đầu trộn đề"
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
              <div className="space-y-4">
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
                      <p className="text-[11px] text-slate-400 mt-1">Hỗ trợ .docx, .pdf, .zip</p>
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
                placeholder={activeMode === 'audit' ? "Ví dụ: Soát kỹ các ký hiệu Mathtype, kiểm tra chính tả dấu chấm/phẩy..." : "Ví dụ: Tăng độ khó phần Vận dụng cao..."}
                className="w-full px-5 py-4 rounded-3xl border border-slate-100 bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[120px] text-sm"
              />
            </div>

            <button 
              onClick={handleExamAction}
              disabled={isLoading || (activeMode !== 'create' && uploadedFiles.length === 0)}
              className="w-full py-4 bg-slate-900 text-white rounded-3xl font-black shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : modeContent[activeMode].icon}
              {modeContent[activeMode].action}
            </button>
          </div>
        </div>

        {/* Right Preview/Result Panel */}
        <div className="lg:w-2/3 flex flex-col bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden min-h-[600px]">
           <div className="p-8 border-b border-slate-50 bg-slate-50/30 backdrop-blur-md">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
                   <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                   <h2 className="text-xl font-black text-slate-800">Review & Kết quả</h2>
                   <p className="text-sm text-slate-400 font-medium">Đầu ra đạt chuẩn Claude 4.5 Agentic</p>
                </div>
             </div>
           </div>

           <div className="flex-1 p-8 overflow-y-auto">
              {!testResult ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto">
                    <AlertCircle className="w-10 h-10 text-slate-200" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-300">Chưa có kết quả xử lý</h3>
                  <p className="text-sm text-slate-400">Hãy thiết lập dữ liệu bên trái và bấm nút bắt đầu để AI thực hiện tư duy đa cấp độ.</p>
                </div>
              ) : (
                <div className="w-full text-left space-y-6">
                  <div className="p-6 bg-green-50 text-green-700 rounded-3xl border border-green-100 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-bold">Đã hoàn tất quá trình tư duy và xử lý!</span>
                  </div>
                  <div 
                    id="report-paper-container"
                    className="bg-white p-12 rounded-[40px] border border-slate-100 shadow-2xl font-serif leading-relaxed text-slate-800 report-paper min-h-[800px]"
                  >
                    <article className="prose prose-slate max-w-none prose-p:my-2 prose-table:border-collapse prose-table:border-slate-300 prose-th:bg-[#2F5496] prose-th:text-white prose-td:border-slate-300 overflow-hidden">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm, remarkMath]} 
                          rehypePlugins={[rehypeKatex, rehypeRaw]}
                        >
                            {testResult || ''}
                        </ReactMarkdown>
                    </article>
                  </div>
                </div>
              )}
           </div>

           {testResult && (
             <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
               <button 
                 onClick={handleDownloadPDF} 
                 className="px-6 py-3 bg-white text-slate-600 rounded-2xl font-bold border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-2"
               >
                 <Download className="w-4 h-4" /> Tải báo cáo (.pdf)
               </button>
               <button 
                 onClick={handleDownloadWord} 
                 className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
               >
                 <Download className="w-4 h-4" /> Xuất bản Word (.docx)
               </button>
             </div>
           )}
        </div>
      </div>
    </motion.div>
  );
};
