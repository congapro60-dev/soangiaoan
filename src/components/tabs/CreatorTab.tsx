import { motion } from 'motion/react';
import { 
  FileText, 
  Layers, 
  X, 
  UploadCloud, 
  Sparkles, 
  Save, 
  Download, 
  MessageSquare, 
  FileSpreadsheet,
  Plus,
  Trash2,
  FileDown,
  ChevronRight,
  Monitor,
  Layout
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { cn } from '../../lib/utils';
import { AppData, LessonPlan, TemplateFile } from '../../types';

interface CreatorTabProps {
  data: AppData;
  generationMode: 'single' | 'bulk';
  setGenerationMode: (mode: 'single' | 'bulk') => void;
  currentPlan: Partial<LessonPlan>;
  setCurrentPlan: React.Dispatch<React.SetStateAction<Partial<LessonPlan>>>;
  lessonDocs: TemplateFile[];
  setLessonDocs: React.Dispatch<React.SetStateAction<TemplateFile[]>>;
  singleRequirement: string;
  setSingleRequirement: (val: string) => void;
  distributionFile: TemplateFile | null;
  setDistributionFile: (val: TemplateFile | null) => void;
  bulkCommand: string;
  setBulkCommand: (val: string) => void;
  isLoading: boolean;
  bulkProgress: { current: number; total: number };
  handleCreateLesson: () => void;
  saveLessonPlan: () => void;
  exportToPDF: () => void;
  exportToWord: () => void;
  generatePPTX: () => void;
  exportToLaTeX: () => void;
  handleReviseLesson: () => void;
  revisionPrompt: string;
  setRevisionPrompt: (val: string) => void;
  bulkResults: LessonPlan[];
  saveBulkPlans: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  setUploadingFiles: (val: { category: TemplateFile['category']; templateId?: string } | null) => void;
  showToast: (msg: string, type?: any) => void;
  selectedDistributionId: string;
  setSelectedDistributionId: (id: string) => void;
  deleteDistribution: (id: string) => void;
}

export const CreatorTab = ({
  data,
  generationMode,
  setGenerationMode,
  currentPlan,
  setCurrentPlan,
  lessonDocs,
  setLessonDocs,
  singleRequirement,
  setSingleRequirement,
  bulkCommand,
  setBulkCommand,
  isLoading,
  bulkProgress,
  handleCreateLesson,
  saveLessonPlan,
  exportToPDF,
  exportToWord,
  generatePPTX,
  exportToLaTeX,
  handleReviseLesson,
  revisionPrompt,
  setRevisionPrompt,
  bulkResults,
  saveBulkPlans,
  fileInputRef,
  setUploadingFiles,
  showToast,
  selectedDistributionId,
  setSelectedDistributionId,
  deleteDistribution
}: CreatorTabProps) => {

  const hasResult = (generationMode === 'single' && currentPlan.content) || (generationMode === 'bulk' && bulkResults.length > 0);

  return (
    <motion.div 
      key="creator"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col lg:flex-row gap-6 h-full"
    >
      {/* Sidebar Settings (350px - 400px) */}
      <aside className="lg:w-[380px] flex-shrink-0 flex flex-col gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-800">Cấu hình soạn thảo</h3>
          </div>

          {/* Mode Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-2xl">
            <button 
              onClick={() => setGenerationMode('single')}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                generationMode === 'single' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
              )}
            >
              <FileText className="w-4 h-4" /> Đơn lẻ
            </button>
            <button 
              onClick={() => setGenerationMode('bulk')}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                generationMode === 'bulk' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
              )}
            >
              <Layers className="w-4 h-4" /> Hàng loạt
            </button>
          </div>

          {/* Common Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Khối/Lớp</label>
                  <select 
                    value={currentPlan.grade || '10'}
                    onChange={(e) => setCurrentPlan(prev => ({ ...prev, grade: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i+1} value={(i+1).toString()}>Lớp {i+1}</option>
                    ))}
                  </select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tuần học</label>
                  <select 
                    value={currentPlan.week || '1'}
                    onChange={(e) => setCurrentPlan(prev => ({ ...prev, week: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {[...Array(35)].map((_, i) => (
                      <option key={i+1} value={(i+1).toString()}>Tuần {i+1}</option>
                    ))}
                  </select>
               </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Môn học</label>
              <select 
                value={currentPlan.subjectId || ''}
                onChange={(e) => setCurrentPlan(prev => ({ ...prev, subjectId: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {data.subjects?.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mẫu giáo án</label>
              <select 
                value={currentPlan.templateId || ''}
                onChange={(e) => setCurrentPlan(prev => ({ ...prev, templateId: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- Mẫu mặc định (AI) --</option>
                {data.templates?.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2">
             {generationMode === 'single' ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tiêu đề bài học</label>
                    <input 
                      type="text" 
                      value={currentPlan.title || ''}
                      onChange={(e) => setCurrentPlan(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ví dụ: Đạo hàm cấp 2..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      Phân phối môn
                      <button 
                        onClick={() => { setUploadingFiles({ category: 'distribution' }); fileInputRef.current?.click(); }}
                        className="text-[10px] text-blue-600 font-bold hover:underline"
                      >
                        + Mới
                      </button>
                    </label>
                    <select 
                      value={selectedDistributionId}
                      onChange={(e) => setSelectedDistributionId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">-- Tự chọn --</option>
                      {data.distributions?.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      Tài liệu tham khảo
                      <button 
                         onClick={() => { setUploadingFiles({ category: 'lesson_doc' }); fileInputRef.current?.click(); }}
                         className="text-[10px] text-blue-600 font-bold hover:underline"
                      >
                        + Thêm
                      </button>
                    </label>
                    <div className="space-y-2">
                       {lessonDocs.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs border border-slate-100">
                          <span className="truncate flex-1 font-medium">{doc.name}</span>
                          <button onClick={() => setLessonDocs(prev => prev.filter(d => d.id !== doc.id))} className="text-red-400 hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {lessonDocs.length === 0 && <p className="text-[10px] text-slate-400 italic">Chưa có tài liệu đính kèm</p>}
                    </div>
                  </div>
                </div>
             ) : (
                <div className="space-y-4">
                   <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lên kế hoạch hàng loạt từ PPCN</label>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {data.distributions?.map(dist => (
                        <div 
                          key={dist.id} 
                          className={cn(
                            "p-3 rounded-xl border text-xs cursor-pointer transition-all",
                            selectedDistributionId === dist.id ? "border-blue-500 bg-blue-50" : "border-slate-100 hover:border-blue-200"
                          )}
                          onClick={() => setSelectedDistributionId(dist.id)}
                        >
                          <p className="font-bold line-clamp-1">{dist.name}</p>
                          <p className="text-[9px] text-slate-400 uppercase mt-0.5">Lớp {dist.grade} · {data.subjects?.find(s => s.id === dist.subjectId)?.name}</p>
                        </div>
                      ))}
                      <button 
                         onClick={() => { setUploadingFiles({ category: 'distribution' }); fileInputRef.current?.click(); }}
                         className="w-full p-3 border-2 border-dashed border-slate-100 rounded-xl text-[11px] text-slate-400 font-bold hover:border-blue-300 hover:text-blue-500 transition-all"
                      >
                         + Tải lên phân phối mới
                      </button>
                    </div>
                  </div>
                </div>
             )}
          </div>

          <div className="pt-4 border-t border-slate-50">
             <button 
              onClick={handleCreateLesson}
              disabled={isLoading}
              className="w-full py-4 gradient-bg text-white rounded-2xl font-bold shadow-xl shadow-blue-100 flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {isLoading ? 'Đang soạn thảo...' : (generationMode === 'single' ? 'Khởi tạo giáo án' : 'Soạn hàng loạt')}
            </button>
            {isLoading && bulkProgress.total > 0 && (
              <div className="mt-3 text-center">
                 <p className="text-[10px] font-bold text-blue-600 uppercase">Tiến độ: {bulkProgress.current}/{bulkProgress.total} bài</p>
                 <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }} />
                 </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Author Badge */}
        <div className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-3">
           <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 font-bold text-xs">
              {data.authorName?.charAt(0) || 'A'}
           </div>
           <div>
              <p className="text-[10px] text-slate-400 uppercase font-black">Người soạn bài</p>
              <p className="text-sm font-bold text-slate-700 truncate">{data.authorName || 'Chưa đặt tên'}</p>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full gap-6">
        {/* Top Floating bar for mode description or search */}
        {!hasResult && (
           <div className="bg-blue-600 p-10 rounded-[40px] text-white overflow-hidden relative shadow-2xl shadow-blue-200">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                 <div className="max-w-xl">
                    <h2 className="text-3xl font-black leading-tight italic">
                       {generationMode === 'single' ? "Bắt đầu bài soạn sáng tạo cùng AI" : "Tự động hóa hoàn toàn bài soạn của thầy cô"}
                    </h2>
                    <p className="text-blue-100 mt-4 text-sm font-medium leading-relaxed">
                       {generationMode === 'single' 
                        ? "Hãy nhập yêu cầu chi tiết hoặc tải lên tài liệu tham khảo. Trợ lý AI sẽ giúp thầy cô xây dựng một giáo án khoa học, đầy đủ các hoạt động chỉ trong vài giây." 
                        : "Chọn một Phân phối chương trình (PPCN) đã tải lên, Trợ lý AI sẽ đọc toàn bộ phân phối và soạn hàng loạt giáo án theo yêu cầu của thầy cô."}
                    </p>
                 </div>
                 <div className="flex-shrink-0 flex items-center justify-center">
                    {generationMode === 'single' ? <Monitor className="w-32 h-32 opacity-20" /> : <Layers className="w-32 h-32 opacity-20" />}
                 </div>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse" />
           </div>
        )}

        {/* Input Requirements Area */}
        {!hasResult && (
           <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                 <MessageSquare className="w-4 h-4 text-blue-500" />
                 {generationMode === 'single' ? "Yêu cầu chi tiết cho bài soạn này" : "Lệnh điều khiển soạn thảo hàng loạt"}
              </label>
              <textarea 
                value={generationMode === 'single' ? singleRequirement : bulkCommand}
                onChange={(e) => generationMode === 'single' ? setSingleRequirement(e.target.value) : setBulkCommand(e.target.value)}
                placeholder={generationMode === 'single' 
                  ? "Ví dụ: Tập trung vào các ví dụ thực tế liên quan đến tài liệu đính kèm, thêm phần thảo luận nhóm và bài tập về nhà..." 
                  : "Ví dụ: Hãy soạn cho tôi các bài từ bài 10 đến 15 dựa trên phân phối đã chọn..."}
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[150px] leading-relaxed"
              />
           </div>
        )}

        {/* Result Area */}
        {hasResult && (
           <motion.div 
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             className="flex-1 flex flex-col bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden min-h-0"
           >
              {/* Header with actions */}
              <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 backdrop-blur-md sticky top-0 z-20">
                 <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600 rounded-xl">
                       <FileText className="text-white w-5 h-5" />
                    </div>
                    <div>
                       <h3 className="font-bold text-slate-900 line-clamp-1">{generationMode === 'single' ? currentPlan.title : `Kết quả soạn hàng loạt (${bulkResults.length} bài)`}</h3>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lớp {currentPlan.grade} · Tuần {currentPlan.week}</p>
                    </div>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={generationMode === 'single' ? saveLessonPlan : saveBulkPlans}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all text-sm shadow-lg shadow-blue-100"
                    >
                      <Save className="w-4 h-4" /> 
                      {generationMode === 'single' ? 'Lưu bài này' : 'Lưu tất cả'}
                    </button>
                    {generationMode === 'single' && (
                       <div className="flex gap-2">
                          <button onClick={exportToPDF} className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Xuất PDF"><FileDown className="w-5 h-5" /></button>
                          <button onClick={exportToWord} className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Xuất Word"><FileText className="w-5 h-5" /></button>
                          <button onClick={generatePPTX} className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm" title="Tạo Slide"><Layout className="w-5 h-5" /></button>
                          <button onClick={exportToLaTeX} className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm" title="Xuất LaTeX"><FileSpreadsheet className="w-5 h-5" /></button>
                       </div>
                    )}
                 </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar scroll-smooth">
                 {generationMode === 'single' ? (
                    <div id="lesson-content" className="prose prose-slate max-w-none markdown-body">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeRaw, rehypeKatex]}
                      >{currentPlan.content || ''}</ReactMarkdown>
                    </div>
                 ) : (
                    <div className="space-y-12">
                       {bulkResults.map((result, idx) => (
                        <div key={result.id} className="space-y-6">
                           <div className="flex items-center gap-4 py-4 border-b border-slate-50">
                              <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">{idx + 1}</span>
                              <h4 className="text-xl font-bold text-slate-900">{result.title}</h4>
                           </div>
                           <div className="prose prose-slate max-w-none markdown-body">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeRaw, rehypeKatex]}
                              >{result.content}</ReactMarkdown>
                           </div>
                        </div>
                       ))}
                    </div>
                 )}
              </div>

              {/* Revision Prompt Area */}
              {generationMode === 'single' && (
                <div className="p-6 bg-slate-50 border-t border-slate-100">
                   <div className="flex gap-3">
                      <textarea
                        value={revisionPrompt}
                        onChange={(e) => setRevisionPrompt(e.target.value)}
                        placeholder="Thưa trợ lý, hãy sửa bài này theo yêu cầu này..."
                        className="flex-1 px-4 py-3 rounded-2xl border border-slate-100 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 min-h-[50px] max-h-[150px] transition-all"
                      />
                      <button
                        onClick={handleReviseLesson}
                        disabled={isLoading || !revisionPrompt.trim()}
                        className="self-end px-5 py-3 gradient-bg text-white rounded-xl font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-blue-100"
                      >
                       <Sparkles className="w-4 h-4" /> Gửi
                      </button>
                   </div>
                </div>
              )}
           </motion.div>
        )}
      </main>
    </motion.div>
  );
};
