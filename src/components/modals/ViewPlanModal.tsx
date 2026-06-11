import { motion, AnimatePresence } from 'motion/react';
import { X, Edit3, FileText, Calendar, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import dayjs from 'dayjs';
import { AppData, LessonPlan } from '../../types';
import * as exportUtils from '../../utils/exportUtils';
import * as worksheetUtils from '../../utils/worksheetUtils';
import * as scormUtils from '../../utils/scormUtils';
import { Presentation, Loader2, FilePenLine, Package } from 'lucide-react';
import { useState } from 'react';
import { withGuardrail } from '../../utils/guardrailUtils';

interface ViewPlanModalProps {
  plan: LessonPlan | null;
  data: AppData;
  showToast: (msg: string, type?: any) => void;
  onClose: () => void;
  onEdit: (plan: LessonPlan) => void;
}

export const ViewPlanModal = ({ plan, data, showToast, onClose, onEdit }: ViewPlanModalProps) => {
  const [isGeneratingSlide, setIsGeneratingSlide] = useState(false);

  const handleGeneratePPTX = async () => {
    if (!plan) return;
    const slides = await exportUtils.generateSlideData(plan, data, setIsGeneratingSlide, showToast);
    if (slides) {
      setIsGeneratingSlide(true);
      showToast('Đang tạo file PPTX (đang render công thức Toán)...', 'info');
      try {
        await exportUtils.downloadPPTX(slides, plan.title || 'baigiang');
        showToast('Đã lưu file trình chiếu!', 'success');
      } catch (e) {
        console.error(e);
        showToast('Lỗi khi tạo file PPTX, vui lòng thử lại.', 'error');
      } finally {
        setIsGeneratingSlide(false);
      }
    }
  };

  const handleGenerateWorksheet = async () => {
    if (!plan) return;
    setIsGeneratingSlide(true); // Re-use loading state
    const worksheetMarkdown = await worksheetUtils.generateWorksheetMarkdown(plan, data, showToast);
    
    if (worksheetMarkdown) {
      try {
        const fakePlan: Partial<LessonPlan> = {
          title: (plan.title || 'GiaoAn') + ' - Phieu hoc tap',
          content: worksheetMarkdown,
          templateId: plan.templateId
        };
        // Export the generated markdown as a docx file so teachers can edit and print
        await exportUtils.exportLessonViaAPI(fakePlan, 'docx', 'portrait', showToast);
        showToast('Đã tải Phiếu học tập (Word)!', 'success');
      } catch (err) {
        console.error(err);
        showToast('Lỗi tải Phiếu học tập.', 'error');
      }
    }
    setIsGeneratingSlide(false);
  };

  const handleExportSCORM = async () => {
    if (!plan) return;
    await scormUtils.exportToSCORM(plan, showToast);
  };

  return (
    <AnimatePresence>
      {plan && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                  <h3 className="text-xl font-bold text-slate-800 truncate">{plan.title}</h3>
                </div>
                <div className="flex flex-wrap gap-2 items-center text-xs font-bold">
                  <span className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase">Lớp {plan.grade || '?'}</span>
                  <span className="text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg uppercase">Tuần {plan.week || '?'}</span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <User className="w-3 h-3" /> {plan.authorName || 'Ẩn danh'}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Calendar className="w-3 h-3" /> {dayjs(plan.updatedAt).format('DD/MM/YYYY')}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-white hover:bg-slate-200 rounded-xl transition-colors shadow-sm shrink-0"
                title="Đóng"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="prose prose-slate max-w-none markdown-body">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeRaw, rehypeKatex]}
                >
                  {plan.content || '*(Chưa có nội dung)*'}
                </ReactMarkdown>
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-3 justify-end items-center">
              <button
                onClick={() => withGuardrail(plan.content, data.templates?.find(t => t.id === plan.templateId)?.files?.find(f => !!f.skeleton)?.skeleton, 'export_word', handleExportSCORM)}
                className="px-6 py-2.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 rounded-xl font-bold text-sm flex items-center gap-2 transition-all mr-auto"
                title="Đóng gói SCORM 1.2 đưa lên LMS"
              >
                <Package className="w-4 h-4" />
                Xuất SCORM
              </button>
              
              <button
                onClick={() => withGuardrail(plan.content, data.templates?.find(t => t.id === plan.templateId)?.files?.find(f => !!f.skeleton)?.skeleton, 'export_word', handleGenerateWorksheet)}
                disabled={isGeneratingSlide}
                className="px-6 py-2.5 bg-white border border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-300 rounded-xl font-bold text-sm flex items-center gap-2 transition-all mr-auto disabled:opacity-50 disabled:cursor-not-allowed"
                title="Dùng AI sinh Phiếu bài tập/Worksheet từ giáo án và tải về file Word"
              >
                {isGeneratingSlide ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePenLine className="w-4 h-4" />}
                {isGeneratingSlide ? 'Đang xử lý...' : 'Tạo Phiếu học tập'}
              </button>
              <button
                onClick={() => withGuardrail(plan.content, data.templates?.find(t => t.id === plan.templateId)?.files?.find(f => !!f.skeleton)?.skeleton, 'export_word', handleGeneratePPTX)}
                disabled={isGeneratingSlide}
                className="px-6 py-2.5 bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300 rounded-xl font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingSlide ? <Loader2 className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
                {isGeneratingSlide ? 'Đang xử lý...' : 'Tạo Slide PPTX'}
              </button>
              <button
                onClick={() => withGuardrail(plan.content, data.templates?.find(t => t.id === plan.templateId)?.files?.find(f => !!f.skeleton)?.skeleton, 'export_pdf', () => exportUtils.exportLessonViaAPI(plan, 'pdf', 'portrait', showToast))}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm"
              >
                Tải PDF
              </button>
              <button
                onClick={() => withGuardrail(plan.content, data.templates?.find(t => t.id === plan.templateId)?.files?.find(f => !!f.skeleton)?.skeleton, 'export_word', () => exportUtils.exportLessonViaAPI(plan, 'docx', 'portrait', showToast))}
                className="px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-200"
              >
                Xuất Word (.docx)
              </button>
              
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() => onEdit(plan)}
                className="px-6 py-2.5 gradient-bg text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-200 hover:opacity-90 transition-opacity"
              >
                <Edit3 className="w-4 h-4" /> Mở để chỉnh sửa
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
