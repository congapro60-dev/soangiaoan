import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Presentation, Loader2 } from 'lucide-react';
import { AppData } from '../../types';
import { generateTextToSlideData } from '../../utils/exportUtils';

interface TextToSlideModalProps {
  data: AppData;
  showToast: (msg: string, type?: any) => void;
  onClose: () => void;
  onGenerateSuccess: (slidesData: any[]) => void;
  setIsLoading: (val: boolean) => void;
}

export const TextToSlideModal = ({ data, showToast, onClose, onGenerateSuccess, setIsLoading }: TextToSlideModalProps) => {
  const [rawText, setRawText] = useState('');
  const [isGeneratingLocal, setIsGeneratingLocal] = useState(false);

  const handleGenerate = async () => {
    if (!rawText.trim()) {
      showToast('Vui lòng nhập văn bản thô để tạo Slide.', 'warning');
      return;
    }
    
    setIsGeneratingLocal(true);
    const slidesData = await generateTextToSlideData(rawText, data, setIsLoading, showToast);
    setIsGeneratingLocal(false);
    
    if (slidesData) {
      onGenerateSuccess(slidesData);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                <Presentation className="w-5 h-5" />
              </div>
              Text-to-Slide Automation
            </h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl">
              <p className="text-sm text-orange-800 font-medium">
                Tính năng độc lập: Dán bất kỳ văn bản, dàn ý, bài viết hoặc tài liệu thô nào vào đây. AI sẽ tự động phân tích cấu trúc, chia tách các ý chính và dựng sẵn bố cục Slide (gồm Title, Bullet points, Ghi chú diễn giả và Gợi ý hình ảnh).
              </p>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 block">Nội dung văn bản gốc</label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Ví dụ: Bài phát biểu về lịch sử trí tuệ nhân tạo, quy trình 5 bước bán hàng, tóm tắt tác phẩm văn học..."
                className="w-full h-64 p-5 border border-slate-200 bg-slate-50/50 rounded-2xl focus:bg-white focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none resize-none transition-all text-slate-700 leading-relaxed custom-scrollbar"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGeneratingLocal || !rawText.trim()}
              className="w-full py-4 bg-orange-600 text-white font-bold rounded-2xl hover:bg-orange-700 hover:shadow-lg hover:shadow-orange-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isGeneratingLocal ? <Loader2 className="w-5 h-5 animate-spin" /> : <Presentation className="w-5 h-5" />}
              {isGeneratingLocal ? 'AI đang thiết kế cấu trúc Slide...' : 'Bắt đầu tạo Slide'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
