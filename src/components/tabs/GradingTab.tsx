import { useState, useRef, useMemo } from 'react'; // useMemo dùng cho classInsights
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardCheck, Upload, Users, FileText, CheckCircle2,
  AlertCircle, Loader2, Download, Search, ChevronRight,
  TrendingUp, Award, AlertTriangle, User, Eye, FileDown
} from 'lucide-react';
import { AppData, TemplateFile, GradingResult, GradingSession } from '../../types';
import { processUploadedFile, downloadBlob } from '../../utils/fileUtils';
import { gradingUtils } from '../../utils/gradingUtils';
import { getActiveApiKey } from '../../lib/aiProviders';
import ReactMarkdown from 'react-markdown';
import { generateAnswerSheetHTML, generateAnswerKeyTemplateHTML } from '../../utils/answerSheetTemplate';

interface GradingTabProps {
  data: AppData;
  setData: (val: any) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  showToast: (msg: string, type?: any) => void;
}

const openInNewTab = (html: string) => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

export const GradingTab = ({ data, setData, isLoading, setIsLoading, showToast }: GradingTabProps) => {
  const [masterFile, setMasterFile] = useState<TemplateFile | null>(null);
  const [studentFiles, setStudentFiles] = useState<TemplateFile[]>([]);
  const [results, setResults] = useState<GradingResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewingResult, setViewingResult] = useState<GradingResult | null>(null);
  
  const fileInputRefMaster = useRef<HTMLInputElement>(null);
  const fileInputRefStudent = useRef<HTMLInputElement>(null);

  const handleMasterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const processed = await processUploadedFile(file, 'test', 0);
      setMasterFile(processed);
      showToast('Đã tải lên Đề bài & Đáp án chuẩn!');
    } catch (err) {
      showToast('Lỗi đọc tệp đề thi', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setIsLoading(true);
    try {
      const processedList: TemplateFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const processed = await processUploadedFile(files[i], 'sample', i);
        processedList.push(processed);
      }
      setStudentFiles(prev => [...prev, ...processedList]);
      
      // Khởi tạo kết quả ở trạng thái pending
      const newResults: GradingResult[] = processedList.map(f => ({
        id: crypto.randomUUID(),
        studentName: f.name.split('.')[0],
        score: 0,
        maxScore: 10,
        strengths: [],
        weaknesses: [],
        improvementPlan: '',
        details: '',
        status: 'pending',
        fileName: f.name
      }));
      setResults(prev => [...prev, ...newResults]);
      showToast(`Đã nhận ${files.length} bài làm của học sinh!`);
    } catch (err) {
      showToast('Lỗi đọc tệp bài làm', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const startGrading = async () => {
    if (!masterFile || studentFiles.length === 0) return;
    if (!getActiveApiKey(data.settings)) {
      showToast('Cần nhập API Key trong Cài đặt trước khi chấm bài', 'error');
      return;
    }

    setIsProcessing(true);
    const updatedResults = [...results];

    for (let i = 0; i < studentFiles.length; i++) {
      const studentFile = studentFiles[i];
      const resultIndex = updatedResults.findIndex(r => r.fileName === studentFile.name);

      if (resultIndex === -1 || updatedResults[resultIndex].status === 'completed') continue;

      updatedResults[resultIndex].status = 'processing';
      setResults([...updatedResults]);

      try {
        const gradeData = await gradingUtils.gradeSubmission(
          masterFile,
          studentFile,
          data.settings
        );
        
        updatedResults[resultIndex] = {
          ...updatedResults[resultIndex],
          ...gradeData,
          status: gradeData.status || 'completed'
        } as GradingResult;
      } catch (err) {
        updatedResults[resultIndex].status = 'error';
      }
      
      setResults([...updatedResults]);
    }

    setIsProcessing(false);
    showToast('Đã hoàn thành chấm điểm cả lớp!');
    
    // Lưu phiên chấm điểm vào AppData
    const newSession: GradingSession = {
      id: `session-${Date.now()}`,
      title: masterFile.name,
      testFile: masterFile,
      results: [...updatedResults],
      createdAt: new Date().toISOString()
    };
    
    setData((prev: AppData) => ({
      ...prev,
      gradingSessions: [newSession, ...(prev.gradingSessions || [])]
    }));
  };

  const completed = results.filter(r => r.status === 'completed');
  const stats = {
    avg: completed.length ? (completed.reduce((acc, r) => acc + (r.score || 0), 0) / completed.length).toFixed(1) : '—',
    completed: completed.length,
    total: results.length,
    above8: completed.filter(r => r.score >= 8).length,
    below5: completed.filter(r => r.score < 5).length,
    topWeaknesses: completed
      .flatMap(r => r.weaknesses || [])
      .reduce((acc: Record<string, number>, w) => { acc[w] = (acc[w] || 0) + 1; return acc; }, {}),
  };

  const classInsights = useMemo(() => {
    if (!completed.length) return [];
    const insights: string[] = [];
    if (stats.above8 > 0) insights.push(`${stats.above8} học sinh đạt điểm giỏi (≥8)`);
    if (stats.below5 > 0) insights.push(`${stats.below5} học sinh dưới trung bình (<5) — cần hỗ trợ thêm`);
    const topWeak = Object.entries(stats.topWeaknesses).sort((a, b) => b[1] - a[1]).slice(0, 2);
    topWeak.forEach(([w, count]) => insights.push(`${count} em gặp vấn đề: ${w}`));
    if (!insights.length) insights.push('Chưa có đủ dữ liệu phân tích');
    return insights;
  }, [completed.length, stats.above8, stats.below5]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8"
    >
      {/* Header & Stats Dashboard */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex items-center gap-6">
           <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
              <ClipboardCheck className="w-8 h-8" />
           </div>
           <div>
              <h1 className="text-2xl font-black text-slate-800">Trung tâm Chấm điểm AI</h1>
              <p className="text-sm text-slate-400 font-medium">Hỗ trợ 30+ học sinh • Đa phương thức (Ảnh/PDF/Docx)</p>
           </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
           <div className="bg-green-50 p-6 rounded-[32px] border border-green-100 flex flex-col items-center justify-center min-w-[140px]">
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest px-2 py-0.5 bg-white rounded-full border border-green-100 mb-2">Trung bình</span>
              <span className="text-3xl font-black text-green-700">{stats.avg}</span>
           </div>
           <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100 flex flex-col items-center justify-center min-w-[140px]">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest px-2 py-0.5 bg-white rounded-full border border-blue-100 mb-2">Đã chấm</span>
              <span className="text-3xl font-black text-blue-700">{stats.completed}/{stats.total}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Uploads & Control */}
        <div className="lg:col-span-4 space-y-6">
          {/* Tải mẫu phiếu */}
          <div className="bg-blue-50 p-5 rounded-[32px] border border-blue-100 space-y-3">
            <h4 className="text-xs font-black text-blue-700 uppercase tracking-wider flex items-center gap-2">
              <FileDown className="w-4 h-4" /> Tải mẫu trước khi chấm
            </h4>
            <p className="text-[11px] text-blue-600 leading-relaxed">
              Dùng <strong>Phiếu trả lời</strong> để học sinh điền bài → chụp ảnh → tải lên chấm.<br/>
              Dùng <strong>Mẫu đáp án</strong> để điền đáp án + thang điểm → tải lên cùng đề bài.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => openInNewTab(generateAnswerSheetHTML())}
                className="w-full py-2.5 bg-white text-blue-700 border border-blue-200 rounded-2xl font-bold text-xs hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" /> Phiếu trả lời học sinh (In/PDF)
              </button>
              <button
                onClick={() => openInNewTab(generateAnswerKeyTemplateHTML())}
                className="w-full py-2.5 bg-white text-emerald-700 border border-emerald-200 rounded-2xl font-bold text-xs hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" /> Mẫu đáp án + thang điểm (In/PDF)
              </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
             <div className="space-y-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Bước 1: Đề bài & Đáp án chuẩn</label>
                <div 
                  onClick={() => fileInputRefMaster.current?.click()}
                  className={`p-6 rounded-3xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                    masterFile ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-blue-200'
                  }`}
                >
                  {masterFile ? <CheckCircle2 className="w-8 h-8 text-green-500" /> : <Download className="w-8 h-8 text-slate-300" />}
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-700">{masterFile ? masterFile.name : 'Chọn Đề thi chuẩn'}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Hỗ trợ PDF, Word</p>
                  </div>
                  <input type="file" ref={fileInputRefMaster} className="hidden" onChange={handleMasterUpload} />
                </div>
             </div>

             <div className="space-y-4 pt-4 border-t border-slate-50">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Bước 2: Bài làm của học sinh</label>
                <div 
                  onClick={() => fileInputRefStudent.current?.click()}
                  className="p-6 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-100 hover:bg-white hover:border-blue-200 cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
                >
                  <Users className="w-8 h-8 text-slate-300" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-700">Tải lên bài của cả lớp</p>
                    <p className="text-[10px] text-slate-400 mt-1">Hỗ trợ Ảnh chụp, PDF, Word</p>
                  </div>
                  <input type="file" ref={fileInputRefStudent} multiple className="hidden" onChange={handleStudentUpload} />
                </div>
             </div>

             <button 
                onClick={startGrading}
                disabled={isProcessing || !masterFile || studentFiles.length === 0}
                className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
             >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ClipboardCheck className="w-5 h-5" />}
                {isProcessing ? 'Đang thực hiện chấm...' : 'Bắt đầu Chấm điểm AI'}
             </button>
          </div>

          {/* Quick Analysis Summary — dynamic */}
          {completed.length > 0 && (
            <div className="bg-amber-50 p-8 rounded-[40px] border border-amber-100 space-y-4">
               <h4 className="font-bold text-amber-800 flex items-center gap-2 text-sm uppercase">
                  <AlertTriangle className="w-4 h-4" /> Phân tích lớp học ({completed.length}/{results.length} đã chấm)
               </h4>
               <ul className="text-xs text-amber-700 space-y-2 font-medium">
                  {classInsights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2">• {insight}</li>
                  ))}
               </ul>
            </div>
          )}
        </div>

        {/* Right Side: Student List & Detailed Results */}
        <div className="lg:col-span-8 space-y-6 overflow-hidden">
           <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                 <h3 className="font-black text-slate-800 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" /> Danh sách Học sinh ({results.length})
                 </h3>
                 <div className="flex items-center gap-2">
                    <div className="text-[10px] font-bold text-slate-400 px-3 py-1 bg-white rounded-full border border-slate-100 uppercase tracking-widest">
                       Lọc theo điểm
                    </div>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                 <AnimatePresence>
                    {results.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4 opacity-30">
                         <FileText className="w-16 h-16 text-slate-200" />
                         <p className="text-sm font-medium text-slate-400 underline underline-offset-4 decoration-slate-200">Kéo thả bài làm của các em vào đây để bắt đầu!</p>
                      </div>
                    ) : (
                      results.map((res) => (
                        <motion.div
                          key={res.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-4 bg-white rounded-3xl border border-slate-100 hover:border-blue-200/50 hover:shadow-lg hover:shadow-blue-50/50 transition-all group"
                        >
                          <div className="flex items-center gap-4">
                             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
                               res.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'
                             }`}>
                                {res.status === 'processing' ? <Loader2 className="w-5 h-5 animate-spin" /> : <User className="w-6 h-6" />}
                             </div>
                             <div>
                                <h4 className="text-sm font-black text-slate-800">{res.studentName}</h4>
                                <p className="text-[10px] text-slate-400 font-medium">{res.fileName}</p>
                             </div>
                          </div>

                          <div className="flex items-center gap-6">
                             {res.status === 'completed' && (
                                <div className="text-right">
                                   <div className="text-lg font-black text-blue-600 leading-none">{res.score}<span className="text-[10px] text-slate-400">/10</span></div>
                                   <div className="text-[9px] font-bold text-green-500 uppercase tracking-tighter">Hoàn thành</div>
                                </div>
                             )}
                             <button
                               onClick={() => setViewingResult(res)} 
                               className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all transform group-hover:scale-110 active:scale-95 shadow-sm"
                             >
                                <Eye className="w-5 h-5" />
                             </button>
                          </div>
                        </motion.div>
                      ))
                    )}
                 </AnimatePresence>
              </div>
           </div>
        </div>
      </div>

      {/* Result Detail Modal */}
      <AnimatePresence>
         {viewingResult && (
           <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[48px] shadow-2xl overflow-hidden flex flex-col"
              >
                 <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
                          <User className="w-6 h-6" />
                       </div>
                       <div>
                          <h2 className="text-xl font-black text-slate-800 tracking-tight">Chi tiết bài chấm: {viewingResult.studentName}</h2>
                          <div className="flex items-center gap-3 mt-1">
                             <span className="text-xs font-bold text-blue-500 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Điểm: {viewingResult.score}/{viewingResult.maxScore}</span>
                             <span className="text-[10px] text-slate-400 font-medium">Tệp: {viewingResult.fileName}</span>
                          </div>
                       </div>
                    </div>
                    <button onClick={() => setViewingResult(null)} className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center">
                       <Search className="w-5 h-5 rotate-45" />
                    </button>
                 </div>

                 <div className="flex-1 overflow-y-auto p-8 bg-slate-50/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                       <div className="bg-green-50/80 p-6 rounded-[32px] border border-green-100 flex items-start gap-4">
                          <Award className="w-6 h-6 text-green-600 shrink-0 mt-1" />
                          <div>
                             <h4 className="font-bold text-green-700 text-sm mb-2">Điểm mạnh & Ưu điểm</h4>
                             <ul className="text-xs text-green-600 space-y-1 font-medium">
                                {viewingResult.strengths?.map((s, i) => <li key={i}>✓ {s}</li>)}
                             </ul>
                          </div>
                       </div>
                       <div className="bg-red-50/80 p-6 rounded-[32px] border border-red-100 flex items-start gap-4">
                          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-1" />
                          <div>
                             <h4 className="font-bold text-red-700 text-sm mb-2">Phần cần khắc phục</h4>
                             <ul className="text-xs text-red-600 space-y-1 font-medium">
                                {viewingResult.weaknesses?.map((w, i) => <li key={i}>⚠ {w}</li>)}
                             </ul>
                          </div>
                       </div>
                    </div>

                    <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm font-serif prose prose-slate max-w-none">
                       <ReactMarkdown>{viewingResult.details || viewingResult.improvementPlan}</ReactMarkdown>
                    </div>
                 </div>

                 <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        if (!viewingResult) return;
                        const content = [
                          `BÁO CÁO CHẤM ĐIỂM`,
                          `Học sinh: ${viewingResult.studentName}`,
                          `Điểm: ${viewingResult.score}/${viewingResult.maxScore}`,
                          `File: ${viewingResult.fileName}`,
                          '',
                          '--- ĐIỂM MẠNH ---',
                          ...(viewingResult.strengths || []).map(s => `• ${s}`),
                          '',
                          '--- CẦN CẢI THIỆN ---',
                          ...(viewingResult.weaknesses || []).map(w => `• ${w}`),
                          '',
                          '--- LỘ TRÌNH ---',
                          viewingResult.improvementPlan || '',
                          '',
                          '--- BÁO CÁO CHI TIẾT ---',
                          viewingResult.details || '',
                        ].join('\n');
                        const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
                        downloadBlob(blob, `BaoCao_${viewingResult.studentName}_${Date.now()}.txt`);
                      }}
                      className="px-6 py-3 bg-white text-slate-600 rounded-2xl font-bold border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-2"
                    >
                       <Download className="w-4 h-4" /> Tải báo cáo (.txt)
                    </button>
                    <button
                      onClick={() => setViewingResult(null)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold border border-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center gap-2"
                    >
                       Đóng
                    </button>
                 </div>
              </motion.div>
           </div>
         )}
      </AnimatePresence>
    </motion.div>
  );
};
