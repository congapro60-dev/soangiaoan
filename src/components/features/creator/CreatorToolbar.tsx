import { useEffect, useRef, useState } from 'react';
import { FileDown, FileText, Presentation, FileSpreadsheet, BookOpen, Headphones, ChevronDown, RotateCcw, ClipboardList, CloudUpload, Settings2, Home } from 'lucide-react';
import { ExportTemplateSettings } from '../../export/ExportTemplateSettings';

export type PaperOrientation = 'portrait' | 'landscape';

interface CreatorToolbarProps {
  exportToPDF: (orientation: PaperOrientation) => void;
  exportToWordA4: (orientation: PaperOrientation) => void;
  handleGenerateSlide: () => void;
  exportToLaTeX: () => void;
  handleGenerateInclassWorksheet: () => void;
  handleGenerateHomeworkWorksheet: () => void;
  setShowAudioOverview: (val: boolean) => void;
  onCreateExam?: () => void;
  onPushToDrive?: () => void;
  isLoading?: boolean;
}

export const CreatorToolbar = ({
  exportToPDF,
  exportToWordA4,
  handleGenerateSlide,
  exportToLaTeX,
  handleGenerateInclassWorksheet,
  handleGenerateHomeworkWorksheet,
  setShowAudioOverview,
  onCreateExam,
  onPushToDrive,
  isLoading,
}: CreatorToolbarProps) => {
  const [orientation, setOrientation] = useState<PaperOrientation>('portrait');
  const [showOrientationMenu, setShowOrientationMenu] = useState(false);
  const [showExportSettings, setShowExportSettings] = useState(false);
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
  const disabledClass = 'disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <>
    <div className="flex gap-2 items-center">
      <div className="relative" ref={orientationMenuRef}>
        <button
          onClick={() => setShowOrientationMenu(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2.5 bg-white border border-slate-100 rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm text-sm font-medium ${disabledClass}`}
          title={isLoading ? "Đang soạn giáo án, vui lòng đợi..." : "Khổ giấy"}
          disabled={isLoading}
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
          className={`p-2.5 bg-teal-50 border border-teal-100 rounded-xl text-teal-600 hover:bg-teal-600 hover:text-white transition-all shadow-sm ${disabledClass}`}
          title={isLoading ? "Đang soạn giáo án, vui lòng đợi..." : "Tạo đề kiểm tra từ giáo án này"}
          disabled={isLoading}
        >
          <ClipboardList className="w-5 h-5" />
        </button>
      )}

      <button
        onClick={() => exportToPDF(orientation)}
        className={`p-2.5 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm ${disabledClass}`}
        title={isLoading ? "Đang soạn giáo án, vui lòng đợi..." : `Xuất PDF nhanh (${orientationLabel})`}
        disabled={isLoading}
      >
        <FileDown className="w-5 h-5" />
      </button>

      <button
        onClick={() => exportToWordA4(orientation)}
        className={`p-2.5 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm ${disabledClass}`}
        title={isLoading ? "Đang soạn giáo án, vui lòng đợi..." : `Xuất Word nhanh chuẩn A4 (${orientationLabel})`}
        disabled={isLoading}
      >
        <FileText className="w-5 h-5" />
      </button>

      {/* <button
        onClick={() => setShowExportSettings(true)}
        className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
        title="Cài đặt template xuất file A4"
      >
        <Settings2 className="w-5 h-5" />
      </button> */}

      <button disabled={isLoading} onClick={handleGenerateSlide} className={`p-2.5 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm ${disabledClass}`} title={isLoading ? "Đang soạn giáo án, vui lòng đợi..." : "Tạo Slide"}>
        <Presentation className="w-5 h-5" />
      </button>
      <button disabled={isLoading} onClick={exportToLaTeX} className={`p-2.5 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm ${disabledClass}`} title={isLoading ? "Đang soạn giáo án, vui lòng đợi..." : "Xuất LaTeX"}>
        <FileSpreadsheet className="w-5 h-5" />
      </button>

      <div className="w-[1px] h-8 bg-slate-200 mx-1"></div>

      <button disabled={isLoading} onClick={handleGenerateInclassWorksheet} className={`p-2.5 bg-green-50 border border-green-100 rounded-xl text-green-600 hover:bg-green-600 hover:text-white transition-all shadow-sm ${disabledClass}`} title={isLoading ? "Đang soạn giáo án, vui lòng đợi..." : "Tạo Phiếu học tập tại lớp"}>
        <ClipboardList className="w-5 h-5" />
      </button>
      
      <button disabled={isLoading} onClick={handleGenerateHomeworkWorksheet} className={`p-2.5 bg-orange-50 border border-orange-100 rounded-xl text-orange-600 hover:bg-orange-600 hover:text-white transition-all shadow-sm ${disabledClass}`} title={isLoading ? "Đang soạn giáo án, vui lòng đợi..." : "Tạo Bài tập về nhà"}>
        <Home className="w-5 h-5" />
      </button>
      <button disabled={isLoading} onClick={() => setShowAudioOverview(true)} className={`p-2.5 bg-purple-50 border border-purple-100 rounded-xl text-purple-600 hover:bg-purple-600 hover:text-white transition-all shadow-sm ${disabledClass}`} title={isLoading ? "Đang soạn giáo án, vui lòng đợi..." : "Bản tin Audio bài giảng"}>
        <Headphones className="w-5 h-5" />
      </button>

      {onPushToDrive && (
        <button
          disabled={isLoading}
          onClick={onPushToDrive}
          className={`p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm ${disabledClass}`}
          title={isLoading ? "Đang soạn giáo án, vui lòng đợi..." : "Đẩy lên Google Drive (qua bot)"}
        >
          <CloudUpload className="w-5 h-5" />
        </button>
      )}
    </div>

    {/* <ExportTemplateSettings
      open={showExportSettings}
      orientation={orientation}
      onOrientationChange={setOrientation}
      onClose={() => setShowExportSettings(false)}
      onExportPDF={() => exportToPDF(orientation)}
      onExportWord={() => exportToWordA4(orientation)}
    /> */}
    </>
  );
};
