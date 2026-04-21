import { motion, AnimatePresence } from 'motion/react';
import { User, Award, AlertTriangle, Download, Printer, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { marked } from 'marked';
import { GradingResult } from '../../../types';
import { downloadBlob } from '../../../utils/fileUtils';

interface Props {
  result: GradingResult | null;
  onClose: () => void;
}

export const GradingResultDetail = ({ result, onClose }: Props) => {
  const handlePrint = () => {
    if (!result) return;
    const grade = result.score >= 8 ? 'Giỏi' : result.score >= 6.5 ? 'Khá' : result.score >= 5 ? 'Trung bình' : 'Yếu';
    const detailsHtml = marked.parse(result.details || result.improvementPlan || '');
    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo cáo: ${result.studentName}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 720px; margin: 40px auto; color: #1e293b; font-size: 13px; }
    h1 { font-size: 20px; font-weight: 900; margin: 0 0 4px; }
    .meta { color: #64748b; font-size: 12px; margin-bottom: 24px; }
    .score-box { display: inline-flex; align-items: baseline; gap: 6px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 10px 20px; margin-bottom: 24px; }
    .score-num { font-size: 36px; font-weight: 900; color: #1d4ed8; }
    .score-max { font-size: 14px; color: #64748b; }
    .grade { font-size: 14px; font-weight: 700; padding: 2px 10px; border-radius: 20px; background: ${result.score >= 8 ? '#d1fae5' : result.score >= 5 ? '#fef9c3' : '#fee2e2'}; color: ${result.score >= 8 ? '#065f46' : result.score >= 5 ? '#713f12' : '#991b1b'}; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px; }
    .strengths h2 { color: #047857; }
    .weaknesses h2 { color: #b45309; }
    ul { margin: 0; padding-left: 18px; line-height: 1.8; }
    .details { border-top: 1px solid #e2e8f0; padding-top: 20px; }
    .details table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .details th, .details td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; }
    .details th { background: #f8fafc; font-weight: 700; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>${result.studentName}</h1>
  <div class="meta">${result.fileName} — Ngày in: ${new Date().toLocaleDateString('vi-VN')}</div>
  <div class="score-box">
    <span class="score-num">${result.score}</span>
    <span class="score-max">/ ${result.maxScore}</span>
    <span class="grade">${grade}</span>
  </div>
  <div class="section strengths">
    <h2>✓ Điểm mạnh</h2>
    <ul>${(result.strengths || []).map(s => `<li>${s}</li>`).join('')}</ul>
  </div>
  <div class="section weaknesses">
    <h2>⚠ Cần khắc phục</h2>
    <ul>${(result.weaknesses || []).map(w => `<li>${w}</li>`).join('')}</ul>
  </div>
  <div class="section details">${detailsHtml}</div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

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
                onClick={handlePrint}
                className="px-5 py-2.5 bg-white text-slate-600 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 text-sm flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> In / PDF
              </button>
              <button
                onClick={handleDownload}
                className="px-5 py-2.5 bg-white text-slate-600 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Tải (.txt)
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
