import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Key, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AppData } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  showToast: (msg: string) => void;
}

export const SettingsModal = ({
  isOpen,
  onClose,
  data,
  setData,
  showToast
}: SettingsModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                Cài đặt hệ thống
              </h3>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                title="Đóng"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2"><Key className="w-4 h-4" /> Gemini API Key</div>
                  <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">Lấy Key tại đây</a>
                </label>
                <input 
                  type="password" 
                  value={data.settings.geminiApiKey}
                  onChange={(e) => setData(prev => ({ ...prev, settings: { ...prev.settings, geminiApiKey: e.target.value } }))}
                  placeholder="Nhập API Key của bạn..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-[10px] text-slate-400">API Key được lưu an toàn trong trình duyệt của bạn.</p>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700">Mô hình AI</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Nhanh, hiệu suất cao (Default)' },
                    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: 'Thông minh, suy luận chuyên sâu' },
                    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp', desc: 'Sáng tạo, tốc độ phản hồi cực nhanh' }
                  ].map(m => (
                    <div 
                      key={m.id}
                      onClick={() => setData(prev => ({ ...prev, settings: { ...prev.settings, selectedModel: m.id } }))}
                      className={cn(
                        "p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between",
                        data.settings.selectedModel === m.id ? "border-blue-500 bg-blue-50" : "border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div>
                        <div className={cn("font-bold text-sm", data.settings.selectedModel === m.id ? "text-blue-700" : "text-slate-700")}>{m.name}</div>
                        <div className="text-xs text-slate-500">{m.desc}</div>
                      </div>
                      {data.settings.selectedModel === m.id && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <span className="text-sm font-medium text-slate-700">Tự động lưu</span>
                <div 
                  onClick={() => setData(prev => ({ ...prev, settings: { ...prev.settings, autoSave: !prev.settings.autoSave } }))}
                  className={cn(
                    "w-12 h-6 rounded-full p-1 cursor-pointer transition-colors",
                    data.settings.autoSave ? "bg-blue-600" : "bg-slate-300"
                  )}
                >
                  <div className={cn("w-4 h-4 bg-white rounded-full transition-transform", data.settings.autoSave ? "translate-x-6" : "translate-x-0")} />
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button 
                onClick={onClose}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold"
              >
                Đóng
              </button>
              <button 
                onClick={() => {
                  onClose();
                  showToast('Đã lưu cài đặt!');
                }}
                className="flex-1 py-3 gradient-bg text-white rounded-xl font-bold shadow-lg shadow-blue-200"
              >
                Lưu thay đổi
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
