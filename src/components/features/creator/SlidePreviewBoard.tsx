import { Download, Presentation, CheckCircle2, Image as ImageIcon, MessageSquare, X } from 'lucide-react';

interface SlidePreviewBoardProps {
  slidePreview: any[];
  setSlidePreview: (val: any[] | null) => void;
  handleDownloadSlide: () => void;
}

export const SlidePreviewBoard = ({ slidePreview, setSlidePreview, handleDownloadSlide }: SlidePreviewBoardProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => setSlidePreview(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Presentation className="w-6 h-6 text-orange-500"/>Bản thảo Slide ({slidePreview.length} trang)
            </h2>
            <p className="text-slate-500 text-sm mt-1">Vui lòng kiểm tra lại cấu trúc slide trước khi xuất bản.</p>
          </div>
        </div>
        <button onClick={handleDownloadSlide} className="px-5 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-bold flex items-center gap-2 hover:opacity-90 shadow-lg shadow-orange-200/50">
          <Download className="w-5 h-5" /> Tải file PPTX
        </button>
      </div>
      <div className="grid gap-6">
        {slidePreview.map((slide, idx) => (
          <div key={idx} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 shrink-0 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center font-black text-slate-400">{idx + 1}</div>
                <h3 className="text-lg font-bold text-slate-800 pt-1">{slide.title}</h3>
              </div>
              <ul className="space-y-2 pl-11">
                {slide.points.map((pt: string, pIdx: number) => (
                  <li key={pIdx} className="flex items-start gap-2 text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:w-1/3 space-y-4">
              <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 mb-2"><ImageIcon className="w-3.5 h-3.5"/> Gợi ý hình ảnh</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{slide.visualSuggestion || 'Không có gợi ý.'}</p>
              </div>
              {slide.speakerNotes && (
                <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5 mb-2"><MessageSquare className="w-3.5 h-3.5"/> Gợi ý lời thoại</h4>
                  <p className="text-xs text-slate-600 leading-relaxed italic">"{slide.speakerNotes}"</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
