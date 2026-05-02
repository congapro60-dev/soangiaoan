import { useState } from 'react';
import { ChevronLeft, Download, Trash2, BarChart3, Printer } from 'lucide-react';
import { marked } from 'marked';
import { GradingResult, GradingSession } from '../../../types';
import { GradingResultsList, FilterScore } from './GradingResultsList';
import { GradingWeaknessPanel } from './GradingWeaknessPanel';
import { ConfirmDialog } from '../../modals/ConfirmDialog';

interface Props {
  session: GradingSession;
  filterScore: FilterScore;
  setFilterScore: (f: FilterScore) => void;
  onBack: () => void;
  onDelete: () => void;
  onExportExcel: () => void;
  onAnalyzeClass: () => void;
  onViewResult: (r: GradingResult) => void;
  onDeleteResult: (r: GradingResult) => void;
  onRenameResult?: (r: GradingResult, name: string) => void;
  onCheckPlagiarism?: () => void;
  isCheckingPlagiarism?: boolean;
}

export const GradingViewSession = ({
  session, filterScore, setFilterScore,
  onBack, onDelete, onExportExcel, onAnalyzeClass, onViewResult, onDeleteResult, onRenameResult,
  onCheckPlagiarism, isCheckingPlagiarism,
}: Props) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handlePrintAll = () => {
    if (!session.results.length) return;
    const pagesHtml = session.results.map(result => {
      const grade = result.score >= 8 ? 'Giỏi' : result.score >= 6.5 ? 'Khá' : result.score >= 5 ? 'Trung bình' : 'Yếu';
      const detailsHtml = marked.parse(result.details || result.improvementPlan || '');
      return `
        <div class="page">
          <h1>${result.studentName}</h1>
          <div class="meta">${result.fileName || 'Chưa rõ file'} — Ngày in: ${new Date().toLocaleDateString('vi-VN')}</div>
          <div class="score-box">
            <span class="score-num">${result.score}</span>
            <span class="score-max">/ ${result.maxScore}</span>
            <span class="grade grade-${grade === 'Giỏi' ? 'good' : grade === 'Yếu' ? 'bad' : 'normal'}">${grade}</span>
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
        </div>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo cáo: ${session.title}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 720px; margin: 0 auto; color: #1e293b; font-size: 13px; }
    .page { page-break-after: always; padding: 40px; }
    .page:last-child { page-break-after: avoid; }
    h1 { font-size: 20px; font-weight: 900; margin: 0 0 4px; }
    .meta { color: #64748b; font-size: 12px; margin-bottom: 24px; }
    .score-box { display: inline-flex; align-items: baseline; gap: 6px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 10px 20px; margin-bottom: 24px; }
    .score-num { font-size: 36px; font-weight: 900; color: #1d4ed8; }
    .score-max { font-size: 14px; color: #64748b; }
    .grade { font-size: 14px; font-weight: 700; padding: 2px 10px; border-radius: 20px; }
    .grade-good { background: #d1fae5; color: #065f46; }
    .grade-normal { background: #fef9c3; color: #713f12; }
    .grade-bad { background: #fee2e2; color: #991b1b; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px; }
    .strengths h2 { color: #047857; }
    .weaknesses h2 { color: #b45309; }
    ul { margin: 0; padding-left: 18px; line-height: 1.8; }
    .details { border-top: 1px solid #e2e8f0; padding-top: 20px; }
    .details table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .details th, .details td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; }
    .details th { background: #f8fafc; font-weight: 700; }
    @media print { 
      body { margin: 0; }
      .page { padding: 20px; }
    }
  </style>
</head>
<body>
  ${pagesHtml}
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const done = session.results.filter(r => r.status === 'completed');
  const avg = done.length
    ? (done.reduce((a, r) => a + r.score, 0) / done.length).toFixed(1)
    : '—';
  const above8 = done.filter(r => r.score >= 8).length;
  const below5 = done.filter(r => r.score < 5).length;

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-black text-slate-800">{session.title}</h2>
            <p className="text-xs text-slate-400">
              {new Date(session.createdAt).toLocaleDateString('vi-VN', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
              {' · '}{session.results.length} học sinh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Stats pill */}
          <div className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 px-4 py-2">
            {[
              { label: 'TB', value: avg, color: 'text-blue-600' },
              { label: 'Giỏi', value: above8, color: 'text-emerald-600' },
              { label: 'Yếu', value: below5, color: 'text-red-500' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className={`text-base font-black ${s.color}`}>{s.value}</div>
                <div className="text-[9px] text-slate-400 uppercase">{s.label}</div>
              </div>
            ))}
          </div>
          <button
            onClick={handlePrintAll}
            className="px-4 py-2 bg-blue-600 text-white rounded-2xl font-bold text-xs hover:bg-blue-700 transition-all flex items-center gap-1.5 shadow-lg shadow-blue-100"
          >
            <Printer className="w-3.5 h-3.5" /> In tất cả
          </button>
          <button
            onClick={onExportExcel}
            className="px-4 py-2 bg-emerald-600 text-white rounded-2xl font-bold text-xs hover:bg-emerald-700 transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
          <button
            onClick={onAnalyzeClass}
            className="px-4 py-2 bg-violet-600 text-white rounded-2xl font-bold text-xs hover:bg-violet-700 transition-all flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5" /> Phân tích lớp
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-2 bg-red-50 text-red-500 rounded-2xl font-bold text-xs hover:bg-red-100 transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Xóa phiên
          </button>
        </div>
      </div>

      {/* Weakness aggregation */}
      <GradingWeaknessPanel results={session.results} />

      {/* Results */}
      <GradingResultsList
        results={session.results}
        filterScore={filterScore}
        setFilterScore={setFilterScore}
        onView={onViewResult}
        onDelete={onDeleteResult}
        onRename={onRenameResult}
        onCheckPlagiarism={onCheckPlagiarism}
        isCheckingPlagiarism={isCheckingPlagiarism}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Xóa phiên chấm này?"
        description="Dữ liệu điểm và nhận xét của tất cả học sinh sẽ bị xóa vĩnh viễn."
        onConfirm={() => { setShowDeleteConfirm(false); onDelete(); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
