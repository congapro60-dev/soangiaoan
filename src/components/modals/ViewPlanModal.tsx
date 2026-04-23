import { motion, AnimatePresence } from 'motion/react';
import { X, Edit3, FileText, Calendar, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import dayjs from 'dayjs';
import { LessonPlan } from '../../types';

interface ViewPlanModalProps {
  plan: LessonPlan | null;
  onClose: () => void;
  onEdit: (plan: LessonPlan) => void;
}

export const ViewPlanModal = ({ plan, onClose, onEdit }: ViewPlanModalProps) => {
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

            {/* Footer */}
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
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
