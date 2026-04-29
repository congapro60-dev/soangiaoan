import { useEffect, useRef, useState } from 'react';
import { FileDown, FileText, Presentation, FileSpreadsheet, BookOpen, Headphones, ChevronDown, RotateCcw, ClipboardList } from 'lucide-react';

export type PaperOrientation = 'portrait' | 'landscape';

interface CreatorToolbarProps {
  exportToPDF: (orientation: PaperOrientation) => void;
  exportToWordA4: (orientation: PaperOrientation) => void;
  handleGenerateSlide: () => void;
  exportToLaTeX: () => void;
  handleGenerateStudyGuide: () => void;
  setShowAudioOverview: (val: boolean) => void;
  onCreateExam?: () => void;
}

export const CreatorToolbar = ({
  exportToPDF,
  exportToWordA4,
  handleGenerateSlide,
  exportToLaTeX,
  handleGenerateStudyGuide,
  setShowAudioOverview,
  onCreateExam,
}: CreatorToolbarProps) => {
  const [orientation, setOrientation] = useState<PaperOrientation>('portrait');
  const [showOrientationMenu, setShowOrientationMenu] = useState(false);
  const orientationMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showOrientationMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (orientationMenuRef.current && !orientationMenuRef.current.contains(e.target as Node)) {
        setShowOrientationMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showOrientationMenu]);

  const orientationLabel = orientation === 'portrait' ? 'Dọc' : 'Ngang';

  return (
    <div className="flex gap-2 items-center">
      <div className="relative" ref={orientationMenuRef}>
        <button
          onClick={() => setShowOrientationMenu(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-white border border-slate-100 rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm text-sm font-medium"
          title="Khổ giấy"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Khổ: {orientationLabel}</span>
          <ChevronDown className="w-3 h-3" />
        </button>

        {showOrientationMenu && (
          <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
            <button
              type="button"
              onClick={() => { setOrientation('portrait'); setShowOrientationMenu(false); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${orientation === 'portrait' ? 'text-blue-600 font-semibold' : 'text-slate-700'}`}
            >
              Dọc (chuẩn)
            </button>
            <button
              type="button"
              onClick={() => { setOrientation('landscape'); setShowOrientationMenu(false); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${orientation === 'landscape' ? 'text-blue-600 font-semibold' : 'text-slate-700'}`}
            >
              Ngang
            </button>
          </div>
        )}
      </div>

      <div className="w-[1px] h-8 bg-slate-200 mx-1"></div>

      {onCreateExam && (
        <button
          onClick={onCreateExam}
          className="p-2.5 bg-teal-50 border border-teal-100 rounded-xl text-teal-600 hover:bg-teal-600 hover:text-white transition-all shadow-sm"
          title="Tạo đề kiểm tra từ giáo án này"
        >
          <ClipboardList className="w-5 h-5" />
        </button>
      )}

      <button
        onClick={() => exportToPDF(orientation)}
        className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
        title={`Xuất PDF (${orientationLabel})`}
      >
        <FileDown className="w-5 h-5" />
      </button>

      <button
        onClick={() => exportToWordA4(orientation)}
        className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
        title={`Xuất Word chuẩn A4 (${orientationLabel})`}
      >
        <FileText className="w-5 h-5" />
      </button>

      <button onClick={handleGenerateSlide} className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm" title="Tạo Slide">
        <Presentation className="w-5 h-5" />
      </button>
      <button onClick={exportToLaTeX} className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm" title="Xuất LaTeX">
        <FileSpreadsheet className="w-5 h-5" />
      </button>

      <div className="w-[1px] h-8 bg-slate-200 mx-1"></div>

      <button onClick={handleGenerateStudyGuide} className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Tạo Hướng dẫn ôn tập (Study Guide)">
        <BookOpen className="w-5 h-5" />
      </button>
      <button onClick={() => setShowAudioOverview(true)} className="p-2.5 bg-purple-50 border border-purple-100 rounded-xl text-purple-600 hover:bg-purple-600 hover:text-white transition-all shadow-sm" title="Bản tin Audio bài giảng">
        <Headphones className="w-5 h-5" />
      </button>
    </div>
  );
};
