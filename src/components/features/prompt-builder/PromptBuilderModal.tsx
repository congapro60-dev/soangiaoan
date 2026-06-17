import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { generateSystemPrompt, StructuredPrompt } from '../../../utils/promptBuilder';
import { AppData } from '../../../types';

interface PromptBuilderModalProps {
  data: AppData;
  showToast: (msg: string, type?: any) => void;
  onClose: () => void;
}

export const PromptBuilderModal = ({ data, showToast, onClose }: PromptBuilderModalProps) => {
  const [idea, setIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<StructuredPrompt | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!idea.trim()) {
      showToast('Vui lòng nhập ý tưởng của bạn.', 'error');
      return;
    }
    setIsGenerating(true);
    setResult(null);
    const parsed = await generateSystemPrompt(idea, data.settings, showToast);
    if (parsed) {
      setResult(parsed);
    }
    setIsGenerating(false);
  };

  const handleCopy = async () => {
    if (!result) return;
    const textToCopy = JSON.stringify(result, null, 2);
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    showToast('Đã sao chép System Prompt (JSON).', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Kiến trúc sư Prompt (LLM-to-LLM)
            </h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Ý tưởng công cụ / trợ lý AI của bạn (Tiếng Việt)</label>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="VD: Mình muốn tạo một chatbot đóng vai Trần Quốc Toản để kể chuyện lịch sử cho học sinh tiểu học..."
                className="w-full h-24 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !idea.trim()}
              className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isGenerating ? 'Đang thiết kế System Prompt...' : 'Sinh System Prompt'}
            </button>

            {result && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">Kết quả (JSON format)</h3>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Đã copy' : 'Copy JSON'}
                  </button>
                </div>
                <div className="bg-slate-900 text-green-400 p-4 rounded-xl overflow-x-auto text-sm font-mono leading-relaxed whitespace-pre">
                  {JSON.stringify(result, null, 2)}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
