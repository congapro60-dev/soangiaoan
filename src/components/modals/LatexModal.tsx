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
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Layout className="w-5 h-5 text-emerald-600" /> Xuất bản LaTeX (Bản in chất lượng cao)
                </h3>
                <div className="mt-3 text-sm text-slate-600 space-y-2">
                   <p className="font-bold text-emerald-700">🚀 Hướng dẫn biên dịch sang PDF cực đẹp:</p>
                   <ol className="list-decimal pl-5 space-y-1">
                      <li>Cách 1 (Nhanh nhất): Bấm nút <strong>"Mở thẳng trên Overleaf"</strong> bên dưới. Website sẽ tự tạo dự án mới cho bạn. Dán mã nguồn vào đây và bấm <em>Compile</em>.</li>
                      <li>Cách 2 (Thủ công): Bấm <strong>"Sao chép"</strong> -> Truy cập <a href="https://www.overleaf.com" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Overleaf.com</a> -> New Project -> Dán đè toàn bộ mã -> File pdf sẽ tự tạo ở bên phải.</li>
                   </ol>
                </div>
              </div>
              <button onClick={onClose} className="p-2 bg-white hover:bg-slate-200 rounded-xl transition-colors shadow-sm" title="Đóng">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-0">
              <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-6 text-sm font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed border-y-4 border-emerald-500/20">
                {latexContent}
              </pre>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3 flex-wrap">
              <button 
                onClick={openInOverleaf}
                className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all hover:scale-[1.02]"
              >
                <Layout className="w-5 h-5" /> Mở thẳng trên Overleaf
              </button>
              <button 
                onClick={downloadLaTeXFile}
                className="py-3.5 px-6 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
              >
                <Download className="w-5 h-5" /> Tải .tex
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(latexContent);
                  showToast('Đã sao chép mã vào bộ nhớ tạm!');
                }}
                className="py-3.5 px-6 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
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
