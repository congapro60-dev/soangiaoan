import { motion, AnimatePresence } from 'motion/react';
import { BarChart3, X, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  isOpen: boolean;
  isLoading: boolean;
  content: string;
  sessionTitle: string;
  onClose: () => void;
}

export const ClassAnalysisModal = ({ isOpen, isLoading, content, sessionTitle, onClose }: Props) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-3xl max-h-[90vh] rounded-[48px] shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-violet-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-violet-100">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Phân tích cả lớp</h2>
                  {sessionTitle && <p className="text-xs text-slate-400 mt-0.5">{sessionTitle}</p>}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                  <p className="text-sm font-medium">AI đang phân tích kết quả cả lớp...</p>
                </div>
              ) : (
                <div className="prose prose-slate max-w-none">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-violet-600 text-white rounded-2xl font-bold hover:bg-violet-700 shadow-lg shadow-violet-100 text-sm"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
