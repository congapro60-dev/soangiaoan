import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Save, MessageSquare, Monitor, Layers, Loader2, Sparkles, X, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AppData, LessonPlan, TemplateFile } from '../../types';
import * as exportUtils from '../../utils/exportUtils';
import { callGeminiAI } from '../../lib/gemini';
import { AudioOverview } from '../features/AudioOverview';

// Subcomponents
import { CreatorToolbar } from '../features/creator/CreatorToolbar';
import { LessonControls } from '../features/creator/LessonControls';
import { SlidePreviewBoard } from '../features/creator/SlidePreviewBoard';
import { LessonContentBoard } from '../features/creator/LessonContentBoard';

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
  setIsLoading: (val: boolean) => void;
  bulkProgress: { current: number; total: number };
  handleCreateLesson: () => void;
  saveLessonPlan: () => void;
  exportToPDF: () => void;
  exportToWord: () => void;
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

export const CreatorTab = (props: CreatorTabProps) => {

  const [slidePreview, setSlidePreview] = useState<any[] | null>(null);
  const [showAudioOverview, setShowAudioOverview] = useState(false);
  const [studyGuide, setStudyGuide] = useState<string | null>(null);

  const handleGenerateSlide = async () => {
    const slides = await exportUtils.generateSlideData(props.currentPlan, props.data, props.setIsLoading, props.showToast);
    if (slides) setSlidePreview(slides);
  };

  const handleDownloadSlide = () => {
    if (slidePreview) {
      exportUtils.downloadPPTX(slidePreview, props.currentPlan.title || 'baigiang');
      props.showToast('Đã lưu file trình chiếu!', 'success');
      setSlidePreview(null);
    }
  };

  const handleGenerateStudyGuide = async () => {
    if(!props.currentPlan.content || !props.data.settings.geminiApiKey) {
       props.showToast("Vui lòng soạn giáo án và cài API Key trước!", "warning");
       return;
    }
    props.setIsLoading(true);
    props.showToast("Đang trích xuất cốt lõi bài học để làm hướng dẫn ôn tập...", "info");
    try {
      const prompt = `BẠN LÀ CHUYÊN GIA BIÊN SOẠN TÀI LIỆU HỌC TẬP (NOTEBOOK LM STYLE).
 Hãy trích xuất từ Giáo án sau đây thành một bản "Hướng dẫn Học tập (Study Guide)" dành trực tiếp cho Học sinh.
 Giáo án:
 ${props.currentPlan.content}
 
 Yêu cầu:
 1. Định dạng Markdown rõ ràng, dễ đọc.
 2. Cấu trúc gồm 3 phần:
    - 🎯 Tóm tắt Kiến thức Trọng tâm (Bullet points).
    - ❓ Câu hỏi Thường gặp (FAQ - giải đáp 2-3 thắc mắc phổ biến).
    - 📝 Gợi ý Tự học / Luyện tập thêm.
 3. Văn phong thân thiện, tạo động lực cho học sinh.`;
      const doc = await callGeminiAI(prompt, props.data.settings.geminiApiKey, 0);
      if(doc) {
        setStudyGuide(doc);
        props.showToast("Đã tạo Hướng dẫn ôn tập!");
      }
    } catch(e) {
      props.showToast("Lỗi khi tạo Study Guide", "error");
    } finally {
      props.setIsLoading(false);
    }
  };

  const hasResult = (props.generationMode === 'single' && props.currentPlan.content) || (props.generationMode === 'bulk' && props.bulkResults.length > 0);

  return (
    <motion.div 
      key="creator"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col md:flex-row gap-6 relative"
    >
      <aside className="w-full md:w-80 shrink-0 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 border-r border-slate-100 pb-20 md:pb-0">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex-1">
           <LessonControls {...props} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0" style={{ position: 'relative' }}>
         <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" 
              style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        {!hasResult && (
           <div className="flex-1 flex flex-col justify-center items-center p-8 z-10 relative">
              <div className="max-w-md w-full bg-slate-900 rounded-[40px] p-10 text-center shadow-2xl relative overflow-hidden group">
                 <div className="relative z-10">
                    <div className="w-20 h-20 bg-blue-500/20 backdrop-blur-md rounded-3xl mx-auto flex items-center justify-center mb-6 border border-blue-500/30">
                       <Sparkles className="w-10 h-10 text-blue-400 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-3">AI Editor Workspace</h2>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8">
                      {props.generationMode === 'single' 
                        ? "Hãy nhập yêu cầu chi tiết hoặc tải lên tài liệu tham khảo. Trợ lý AI sẽ giúp thầy cô xây dựng một giáo án khoa học, đầy đủ các hoạt động chỉ trong vài giây." 
                        : "Chọn một Phân phối chương trình (PPCN) đã tải lên, Trợ lý AI sẽ đọc toàn bộ phân phối và soạn hàng loạt giáo án theo yêu cầu của thầy cô."}
                    </p>
                 </div>
                 <div className="flex-shrink-0 flex items-center justify-center">
                    {props.generationMode === 'single' ? <Monitor className="w-32 h-32 opacity-20" /> : <Layers className="w-32 h-32 opacity-20" />}
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
                 {props.generationMode === 'single' ? "Yêu cầu chi tiết cho bài soạn này" : "Lệnh điều khiển soạn thảo hàng loạt"}
              </label>
              <textarea 
                value={props.generationMode === 'single' ? props.singleRequirement : props.bulkCommand}
                onChange={(e) => props.generationMode === 'single' ? props.setSingleRequirement(e.target.value) : props.setBulkCommand(e.target.value)}
                placeholder={props.generationMode === 'single' 
                  ? "Ví dụ: Tập trung vào các ví dụ thực tế liên quan đến tài liệu đính kèm, thêm phần thảo luận nhóm và bài tập về nhà..." 
                  : "Ví dụ: Hãy soạn cho tôi các bài từ bài 10 đến 15 dựa trên phân phối đã chọn..."}
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[150px] leading-relaxed"
              />
              <button 
                onClick={props.handleCreateLesson}
                disabled={props.isLoading || (props.generationMode === 'bulk' && !props.selectedDistributionId)}
                className="w-full py-4 gradient-bg text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <Sparkles className="w-5 h-5" />
                {props.generationMode === 'single' ? 'Bắt đầu Soạn giáo án (AI Single)' : 'Bắt đầu Soạn hàng loạt (AI Bulk)'}
              </button>
           </div>
        )}

        {/* Result Area */}
        {hasResult && (
           <motion.div 
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             className="flex-1 flex flex-col bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden min-h-0 relative z-10"
           >
              {/* Header with actions */}
              <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 backdrop-blur-md sticky top-0 z-20">
                 <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600 rounded-xl">
                       <FileText className="text-white w-5 h-5" />
                    </div>
                    <div>
                       <h3 className="font-bold text-slate-900 line-clamp-1">{props.generationMode === 'single' ? props.currentPlan.title : `Kết quả soạn hàng loạt (${props.bulkResults.length} bài)`}</h3>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lớp {props.currentPlan.grade} · Tuần {props.currentPlan.week}</p>
                    </div>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={props.generationMode === 'single' ? props.saveLessonPlan : props.saveBulkPlans}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all text-sm shadow-lg shadow-blue-100"
                    >
                      <Save className="w-4 h-4" /> 
                      {props.generationMode === 'single' ? 'Lưu bài này' : 'Lưu tất cả'}
                    </button>
                    {props.generationMode === 'single' && (
                       <CreatorToolbar 
                          exportToPDF={props.exportToPDF}
                          exportToWord={props.exportToWord}
                          handleGenerateSlide={handleGenerateSlide}
                          exportToLaTeX={props.exportToLaTeX}
                          handleGenerateStudyGuide={handleGenerateStudyGuide}
                          setShowAudioOverview={setShowAudioOverview}
                       />
                    )}
                 </div>
              </div>

              {/* View area switching */}
              {studyGuide ? (
                <div className="flex-1 overflow-y-auto p-4 sm:p-10 custom-scrollbar scroll-smooth">
                  <div className="max-w-4xl mx-auto space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-50 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                          <BookOpen className="text-white w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Hướng dẫn Học tập</h2>
                          <p className="text-sm text-slate-500 font-medium">Bản tinh hoa dành cho Học sinh (NotebookLM Style)</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setStudyGuide(null)} 
                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-200 transition-all text-sm"
                      >
                        <X className="w-4 h-4" /> Quay lại giáo án
                      </button>
                    </div>
                    
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="prose prose-indigo max-w-none markdown-body bg-white p-8 sm:p-12 rounded-[40px] border border-slate-100 shadow-xl relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                      <ReactMarkdown>{studyGuide}</ReactMarkdown>
                    </motion.div>
                  </div>
                </div>
              ) : slidePreview ? (
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar scroll-smooth">
                   <SlidePreviewBoard 
                      slidePreview={slidePreview} 
                      setSlidePreview={setSlidePreview} 
                      handleDownloadSlide={handleDownloadSlide} 
                   />
                </div>
              ) : (
                 <LessonContentBoard 
                    generationMode={props.generationMode}
                    currentPlan={props.currentPlan}
                    bulkResults={props.bulkResults}
                    revisionPrompt={props.revisionPrompt}
                    setRevisionPrompt={props.setRevisionPrompt}
                    handleReviseLesson={props.handleReviseLesson}
                    isLoading={props.isLoading}
                 />
              )}
           </motion.div>
        )}
      </main>
      
      {showAudioOverview && props.currentPlan.content && (
        <AudioOverview 
          content={props.currentPlan.content}
          apiKey={props.data.settings.geminiApiKey}
          modelIndex={0}
          onClose={() => setShowAudioOverview(false)}
        />
      )}
      
      {props.isLoading && (
        <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center rounded-[40px]">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <div className="text-center">
              <h3 className="font-bold text-slate-800">Hệ thống AI đang xử lý...</h3>
              <p className="text-sm text-slate-500 font-medium">Bạn có thấy tiến độ đang chạy không?</p>
            </div>
            {props.generationMode === 'bulk' && props.bulkProgress.total > 0 && (
              <div className="w-full mt-2">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>Tiến độ</span>
                  <span>{props.bulkProgress.current} / {props.bulkProgress.total}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(props.bulkProgress.current / props.bulkProgress.total) * 100}%` }}
                    className="h-full gradient-bg"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
