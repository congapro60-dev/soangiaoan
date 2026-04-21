import { motion, AnimatePresence } from 'motion/react';
import { User, Award, AlertTriangle, Download, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GradingResult } from '../../../types';
import { downloadBlob } from '../../../utils/fileUtils';

interface Props {
  result: GradingResult | null;
  onClose: () => void;
}

export const GradingResultDetail = ({ result, onClose }: Props) => {
  const handleDownload = () => {
    if (!result) return;
    const content = [
      'BÁO CÁO CHẤM ĐIỂM',
      `Học sinh: ${result.studentName}`,
      `Điểm: ${result.score}/${result.maxScore}`,
      '',
      '--- ĐIỂM MẠNH ---',
      ...(result.strengths || []).map(s => `• ${s}`),
      '',
      '--- CẦN CẢI THIỆN ---',
      ...(result.weaknesses || []).map(w => `• ${w}`),
      '',
      '--- BÁO CÁO CHI TIẾT ---',
      result.details || result.improvementPlan || '',
    ].join('\n');
    downloadBlob(
      new Blob(['﻿' + content], { type: 'text/plain;charset=utf-8' }),
      `BaoCao_${result.studentName}.txt`
    );
  };

  return (
    <AnimatePresence>
      {result && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[48px] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Chi tiết: {result.studentName}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-bold text-blue-500 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                      Điểm: {result.score}/{result.maxScore}
                    </span>
                    <span className="text-[10px] text-slate-400">{result.fileName}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-green-50/80 p-6 rounded-[32px] border border-green-100">
                  <h4 className="font-bold text-green-700 text-sm mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4" /> Điểm mạnh
                  </h4>
                  <ul className="text-xs text-green-600 space-y-1 font-medium">
                    {result.strengths?.map((s, i) => <li key={i}>✓ {s}</li>)}
                  </ul>
                </div>
                <div className="bg-red-50/80 p-6 rounded-[32px] border border-red-100">
                  <h4 className="font-bold text-red-700 text-sm mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Cần khắc phục
                  </h4>
                  <ul className="text-xs text-red-600 space-y-1 font-medium">
                    {result.weaknesses?.map((w, i) => <li key={i}>⚠ {w}</li>)}
                  </ul>
                </div>
              </div>
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm prose prose-slate max-w-none">
                <ReactMarkdown>{result.details || result.improvementPlan}</ReactMarkdown>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={handleDownload}
                className="px-5 py-2.5 bg-white text-slate-600 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Tải báo cáo (.txt)
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 text-sm"
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
