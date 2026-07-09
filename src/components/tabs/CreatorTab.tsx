import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Save, MessageSquare, Monitor, Layers, Loader2, Sparkles, X, BookOpen, FilePlus, Download, Presentation } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { AppData, LessonPlan, TemplateFile, BuiltinFormat, ToanKeHoach } from '../../types';
import * as exportUtils from '../../utils/exportUtils';
import * as worksheetUtils from '../../utils/worksheetUtils';
import { exportToWordA4 } from '../../utils/wordExportA4';
import { DiagramRenderer } from '../features/creator/DiagramRenderer';
import { callAI, getActiveApiKey } from '../../lib/aiProviders';
import { AudioOverview } from '../features/AudioOverview';
import { PushToDriveModal } from '../modals/PushToDriveModal';
import { TextToSlideModal } from '../modals/TextToSlideModal';
import { withGuardrail } from '../../utils/guardrailUtils';

// Subcomponents
import { CreatorToolbar } from '../features/creator/CreatorToolbar';
import { LessonControls } from '../features/creator/LessonControls';
import { SlidePreviewBoard } from '../features/creator/SlidePreviewBoard';
import { LessonContentBoard } from '../features/creator/LessonContentBoard';

const SimulatedProgress = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => {
        if (p < 60) return p + Math.floor(Math.random() * 8) + 2;
        if (p < 85) return p + Math.floor(Math.random() * 4) + 1;
        if (p < 99) return p + 1;
        return p;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <span className="text-blue-600 font-black ml-1">{progress}%</span>;
};

interface CreatorTabProps {
  data: AppData;
  generationMode: 'single' | 'bulk';
  setGenerationMode: (mode: 'single' | 'bulk') => void;
  builtinFormat: BuiltinFormat;
  setBuiltinFormat: (f: BuiltinFormat) => void;
  toanKeHoach: ToanKeHoach;
  setToanKeHoach: (k: ToanKeHoach) => void;
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
  bulkProgress: { current: number; total: number; currentTitle: string };
  handleCreateLesson: () => void;
  cancelBulk: () => void;
  saveLessonPlan: () => void;
  exportToPDF: (orientation: 'portrait' | 'landscape') => void;
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
  onCreateExam?: () => void;
}

export const CreatorTab = (props: CreatorTabProps) => {

  const [slidePreview, setSlidePreview] = useState<any[] | null>(null);
  const [showAudioOverview, setShowAudioOverview] = useState(false);
  const [worksheetPreview, setWorksheetPreview] = useState<{ type: 'inclass' | 'homework', title: string, content: string } | null>(null);
  const [showPushModal, setShowPushModal] = useState(false);
  const [showTextToSlideModal, setShowTextToSlideModal] = useState(false);

  const handleGenerateSlide = async () => {
    const slides = await exportUtils.generateSlideData(props.currentPlan, props.data, props.setIsLoading, props.showToast);
    if (slides) setSlidePreview(slides);
  };

  const handleDownloadSlide = async () => {
    if (slidePreview) {
      props.setIsLoading(true);
      props.showToast('Đang tạo file PPTX (đang render công thức Toán)...', 'info');
      try {
        await exportUtils.downloadPPTX(slidePreview, props.currentPlan.title || 'baigiang');
        props.showToast('Đã lưu file trình chiếu!', 'success');
      } catch (e) {
        console.error(e);
        props.showToast('Lỗi khi tạo file PPTX, vui lòng thử lại.', 'error');
      } finally {
        props.setIsLoading(false);
        setSlidePreview(null);
      }
    }
  };

  const handleGenerateInclassWorksheet = async () => {
    props.setIsLoading(true);
    const content = await worksheetUtils.generateInclassWorksheetMarkdown(props.currentPlan, props.data, props.showToast);
    if (content) {
      setWorksheetPreview({ type: 'inclass', title: 'Phiếu học tập tại lớp', content });
      props.showToast("Đã tạo Phiếu học tập tại lớp!", "success");
    }
    props.setIsLoading(false);
  };

  const handleGenerateHomeworkWorksheet = async () => {
    props.setIsLoading(true);
    const content = await worksheetUtils.generateHomeworkWorksheetMarkdown(props.currentPlan, props.data, props.showToast);
    if (content) {
      setWorksheetPreview({ type: 'homework', title: 'Phiếu bài tập về nhà', content });
      props.showToast("Đã tạo Phiếu bài tập về nhà!", "success");
    }
    props.setIsLoading(false);
  };

  const handleDownloadWorksheetWord = async () => {
    if (!worksheetPreview) return;
    const fakePlan = {
      title: `${props.currentPlan.title || 'GiaoAn'} - ${worksheetPreview.title}`,
      content: worksheetPreview.content,
      templateId: props.currentPlan.templateId,
      grade: props.currentPlan.grade,
      week: props.currentPlan.week,
      subjectId: props.currentPlan.subjectId
    };
    exportToWordA4(fakePlan, props.showToast, 'portrait');
  };

  const hasResult = (props.generationMode === 'single' && props.currentPlan.content) || (props.generationMode === 'bulk' && props.bulkResults.length > 0) || !!slidePreview;

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
              {props.generationMode === 'single' && (
                <button
                  onClick={() => setShowTextToSlideModal(true)}
                  className="w-full py-4 bg-orange-50 text-orange-600 rounded-2xl font-bold hover:bg-orange-100 transition-all flex items-center justify-center gap-3 border border-orange-100"
                >
                  <Presentation className="w-5 h-5" />
                  Tạo Slide nhanh từ Văn bản thô
                </button>
              )}
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
                      onClick={() => props.setCurrentPlan({ title: '', content: '', subjectId: props.currentPlan.subjectId || 'math', templateId: '', grade: props.currentPlan.grade || '10', week: props.currentPlan.week || '1' })}
                      className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title={props.isLoading ? "Đang soạn giáo án, vui lòng đợi..." : "Xóa nội dung hiện tại và soạn bài mới"}
                      disabled={props.isLoading}
                    >
                      <FilePlus className="w-4 h-4" /> Soạn bài mới
                    </button>
                    <button
                      onClick={() => withGuardrail(props.currentPlan.content, props.lessonDocs.find(d => d.id === props.currentPlan.templateId)?.skeleton, 'final_save', props.generationMode === 'single' ? props.saveLessonPlan : props.saveBulkPlans)}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all text-sm shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={props.isLoading}
                      title={props.isLoading ? "Đang soạn giáo án, vui lòng đợi..." : ""}
                    >
                      <Save className="w-4 h-4" />
                      {props.generationMode === 'single' ? 'Lưu bài này' : 'Lưu tất cả'}
                    </button>
                    {props.generationMode === 'single' && (
                       <CreatorToolbar
                          exportToPDF={(orientation) => withGuardrail(props.currentPlan.content, props.lessonDocs.find(d => d.id === props.currentPlan.templateId)?.skeleton, 'export_pdf', () => props.exportToPDF(orientation))}
                          exportToWordA4={(orientation) => withGuardrail(props.currentPlan.content, props.lessonDocs.find(d => d.id === props.currentPlan.templateId)?.skeleton, 'export_word', () => exportToWordA4(props.currentPlan, props.showToast, orientation))}
                          handleGenerateSlide={handleGenerateSlide}
                          exportToLaTeX={() => withGuardrail(props.currentPlan.content, props.lessonDocs.find(d => d.id === props.currentPlan.templateId)?.skeleton, 'export_latex', props.exportToLaTeX)}
                          handleGenerateInclassWorksheet={handleGenerateInclassWorksheet}
                          handleGenerateHomeworkWorksheet={handleGenerateHomeworkWorksheet}
                          setShowAudioOverview={setShowAudioOverview}
                          onCreateExam={props.onCreateExam}
                          onPushToDrive={() => setShowPushModal(true)}
                          isLoading={props.isLoading}
                       />
                    )}
                 </div>
              </div>

              {/* View area switching */}
              {worksheetPreview ? (
                <div className="flex-1 overflow-y-auto p-4 sm:p-10 custom-scrollbar scroll-smooth">
                  <div className="max-w-4xl mx-auto space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-50 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                          <BookOpen className="text-white w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{worksheetPreview.title}</h2>
                          <p className="text-sm text-slate-500 font-medium">Bản tinh hoa dành cho Học sinh (Chuẩn Sư phạm & Bộ GDĐT)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDownloadWorksheetWord}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all text-sm shadow-sm shadow-indigo-200"
                        >
                          <Download className="w-4 h-4" /> Tải Word (.docx)
                        </button>
                        <button
                          onClick={() => setWorksheetPreview(null)}
                          className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-200 transition-all text-sm"
                        >
                          <X className="w-4 h-4" /> Quay lại giáo án
                        </button>
                      </div>
                    </div>
                    
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="prose prose-indigo max-w-none markdown-body bg-white p-8 sm:p-12 rounded-[40px] border border-slate-100 shadow-xl relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeRaw, rehypeKatex]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const lang = match ? match[1] : '';
                            const codeString = String(children).replace(/\n$/, '');

                            const isSvg = codeString.trim().startsWith('<svg') || codeString.trim().startsWith('xml <svg') || codeString.trim().startsWith('html <svg');
                            if (isSvg) {
                               const cleanSvg = codeString.replace(/^(xml|html)\s*/i, '').trim();
                               return <DiagramRenderer code={cleanSvg} type="svg" />;
                            }

                            const isTikz = codeString.includes('\\begin{tikzpicture}') || codeString.trim().startsWith('latex \\begin') || codeString.trim().startsWith('tikz \\begin');
                            if (isTikz) {
                               const cleanTikz = codeString.replace(/^(latex|tikz|tex)\s*/i, '').trim();
                               return <DiagramRenderer code={cleanTikz} type="tikz" />;
                            }
                            
                            const isPrompt = lang === 'prompt' || /^prompt(?:\s|<br\s*\/?>)/i.test(codeString.trim());
                            if (isPrompt) {
                               return (
                                 <div className="my-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3">
                                   <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl shrink-0">
                                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                                   </div>
                                   <div>
                                     <p className="text-sm font-bold text-indigo-900 mb-1">Gợi ý tạo ảnh minh họa (Image Prompt)</p>
                                     <p className="text-xs text-indigo-700 leading-relaxed italic">{codeString.replace(/^prompt(?:\s|<br\s*\/?>)*/i, '')}</p>
                                   </div>
                                 </div>
                               );
                            }

                            return (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >{worksheetPreview.content}</ReactMarkdown>
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
                    setCurrentPlan={props.setCurrentPlan}
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
          settings={props.data.settings}
          onClose={() => setShowAudioOverview(false)}
        />
      )}

      {showPushModal && (
        <PushToDriveModal
          currentPlan={props.currentPlan}
          settings={props.data.settings}
          showToast={props.showToast}
          onClose={() => setShowPushModal(false)}
        />
      )}

      {showTextToSlideModal && (
        <TextToSlideModal
          data={props.data}
          showToast={props.showToast}
          onClose={() => setShowTextToSlideModal(false)}
          onGenerateSuccess={(slidesData) => {
            setSlidePreview(slidesData);
          }}
          setIsLoading={props.setIsLoading}
        />
      )}
      
      {props.isLoading && (
        props.generationMode === 'bulk' && props.bulkProgress.total > 0 ? (
          /* Bulk mode: compact sticky progress bar — don't block content */
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-[500px] max-w-[90%] bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                <span className="text-xs font-bold text-slate-700 truncate">
                  Đang soạn: {props.bulkProgress.currentTitle}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-xs font-black text-blue-600">{props.bulkProgress.current}/{props.bulkProgress.total}</span>
                <button
                  onClick={props.cancelBulk}
                  className="p-1 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                  title="Hủy soạn hàng loạt"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(props.bulkProgress.current / props.bulkProgress.total) * 100}%` }}
                className="h-full gradient-bg"
              />
            </div>
          </div>
        ) : (
          /* Single mode or parsing phase: full overlay */
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center rounded-[40px]">
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <div className="text-center">
                <h3 className="font-bold text-slate-800">
                  Hệ thống AI đang xử lý...
                  <SimulatedProgress />
                </h3>
                <p className="text-sm text-slate-500 font-medium">Vui lòng không đóng trang này</p>
              </div>
            </div>
          </div>
        )
      )}
    </motion.div>
  );
};

