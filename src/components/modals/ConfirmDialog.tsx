import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  isOpen, title, description,
  confirmLabel = 'Xóa',
  cancelLabel = 'Quay lại',
  onConfirm, onCancel,
}: Props) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-sm flex flex-col items-center gap-5"
          >
            <div className="w-14 h-14 bg-red-50 rounded-3xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-slate-800">{title}</h3>
              {description && <p className="text-xs text-slate-400 mt-1.5">{description}</p>}
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-2xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-100"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
