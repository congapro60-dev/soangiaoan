import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, X, Loader2, Edit3, Eye, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  isOpen: boolean;
  isLoading: boolean;
  content: string;
  onChange: (c: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const AISolveExamModal = ({ isOpen, isLoading, content, onChange, onCancel, onConfirm }: Props) => {
  const [previewMode, setPreviewMode] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const canConfirm = !isLoading && content.trim().length > 0 && reviewConfirmed;

  useEffect(() => {
    if (!isOpen || isLoading) {
      setReviewConfirmed(false);
    }
  }, [isOpen, isLoading]);

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
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-violet-50/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-violet-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-violet-100">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">AI tự giải đề</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Kiểm tra và chỉnh sửa đáp án trước khi chấm</p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="w-10 h-10 bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                  <p className="text-sm font-medium">AI đang giải đề và tạo đáp án...</p>
                  <p className="text-xs text-slate-300">Có thể mất 30–60 giây tùy độ dài đề</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-8 pt-5 flex-shrink-0">
                    <button
                      onClick={() => setPreviewMode(false)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${!previewMode ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa
                    </button>
                    <button
                      onClick={() => setPreviewMode(true)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${previewMode ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <Eye className="w-3.5 h-3.5" /> Xem trước
                    </button>
                    <span className="ml-auto text-[10px] text-slate-400">Bạn có thể chỉnh sửa đáp án trước khi chấm</span>
                  </div>

                  <div className="flex-1 overflow-y-auto px-8 py-4">
                    {previewMode ? (
                      <div className="prose prose-slate max-w-none">
                        <ReactMarkdown>{content}</ReactMarkdown>
                      </div>
                    ) : (
                      <textarea
                        value={content}
                        onChange={e => onChange(e.target.value)}
                        className="w-full h-full min-h-[300px] px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-mono focus:ring-2 focus:ring-violet-400 outline-none resize-none"
                        placeholder="Đáp án AI tạo sẽ hiển thị ở đây..."
                      />
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex flex-col gap-4 flex-shrink-0">
              <label className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={reviewConfirmed}
                  onChange={e => setReviewConfirmed(e.target.checked)}
                  disabled={isLoading || !content.trim()}
                  className="mt-0.5 h-4 w-4 rounded border-violet-300 text-violet-600 accent-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span>Tôi đã kiểm tra kỹ và chịu trách nhiệm với đáp án do AI sinh ra</span>
              </label>
              <div className="flex justify-between gap-3">
                <button
                  onClick={onCancel}
                  className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={onConfirm}
                  disabled={!canConfirm}
                  className="px-6 py-2.5 bg-violet-600 text-white rounded-2xl font-bold hover:bg-violet-700 shadow-lg shadow-violet-100 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" /> Dùng đáp án này — Bắt đầu chấm
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
