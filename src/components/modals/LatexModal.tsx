import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Layout, FileCheck } from 'lucide-react';
import { LessonPlan } from '../../types';

interface LatexModalProps {
  isOpen: boolean;
  onClose: () => void;
  latexContent: string;
  currentPlan: Partial<LessonPlan>;
  downloadLaTeXFile: () => void;
  openInOverleaf: () => void;
  showToast: (msg: string) => void;
}

export const LatexModal = ({
  isOpen,
  onClose,
  latexContent,
  currentPlan,
  downloadLaTeXFile,
  openInOverleaf,
  showToast
}: LatexModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Mã nguồn LaTeX</h3>
                <p className="text-sm text-slate-500 mt-1">Có thể biên dịch trực tiếp trên Overleaf hoặc TeX Live</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors" title="Đóng">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="bg-slate-900 text-green-300 p-6 rounded-2xl text-sm font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">
                {latexContent}
              </pre>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3 flex-wrap">
              <button 
                onClick={downloadLaTeXFile}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
              >
                <Download className="w-5 h-5" /> Tải file .tex
              </button>
              <button 
                onClick={openInOverleaf}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-colors"
              >
                <Layout className="w-5 h-5" /> Mở trên Overleaf
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(latexContent);
                  showToast('Đã sao chép mã LaTeX!');
                }}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
              >
                <FileCheck className="w-5 h-5" /> Sao chép
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
