import { useState } from 'react';
import { FileDown, FileText, Presentation, FileSpreadsheet, BookOpen, Headphones, ChevronDown } from 'lucide-react';

interface CreatorToolbarProps {
  exportToPDF: () => void;
  exportToWord: () => void;
  exportToWordA4: () => void;
  handleGenerateSlide: () => void;
  exportToLaTeX: () => void;
  handleGenerateStudyGuide: () => void;
  setShowAudioOverview: (val: boolean) => void;
}

export const CreatorToolbar = ({
  exportToPDF,
  exportToWord,
  exportToWordA4,
  handleGenerateSlide,
  exportToLaTeX,
  handleGenerateStudyGuide,
  setShowAudioOverview
}: CreatorToolbarProps) => {
  const [showWordMenu, setShowWordMenu] = useState(false);

  return (
    <div className="flex gap-2">
      <button onClick={exportToPDF} className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Xuất PDF">
        <FileDown className="w-5 h-5" />
      </button>
      
      <div className="relative">
        <button 
          onClick={() => setShowWordMenu(!showWordMenu)} 
          onBlur={() => setTimeout(() => setShowWordMenu(false), 200)}
          className="flex items-center gap-1 p-2.5 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" 
          title="Tùy chọn xuất Word"
        >
          <FileText className="w-5 h-5" />
          <ChevronDown className="w-3 h-3" />
        </button>
        
        {showWordMenu && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
            <button 
              onClick={() => { exportToWord(); setShowWordMenu(false); }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600"
            >
              Dạng thông thường (Có Toán)
            </button>
            <button 
              onClick={() => { exportToWordA4(); setShowWordMenu(false); }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600"
            >
              Chuẩn A4 (Bảng không vỡ - Mới)
            </button>
          </div>
        )}
      </div>

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
