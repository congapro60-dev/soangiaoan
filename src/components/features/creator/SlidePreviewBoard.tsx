import { Download, Presentation, Image as ImageIcon, MessageSquare, X, Plus, Sigma } from 'lucide-react';
import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface SlidePreviewBoardProps {
  slidePreview: any[];
  setSlidePreview: (val: any[] | null) => void;
  handleDownloadSlide: () => void;
}

export const SlidePreviewBoard = ({ slidePreview, setSlidePreview, handleDownloadSlide }: SlidePreviewBoardProps) => {

  // Resize textareas to fit content on load
  useEffect(() => {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(t => {
      if (t.classList.contains('point-textarea')) {
        t.style.height = 'auto';
        t.style.height = t.scrollHeight + 'px';
      }
    });
  }, [slidePreview]);

  const updateSlide = (idx: number, field: string, value: string) => {
    const newSlides = [...slidePreview];
    newSlides[idx] = { ...newSlides[idx], [field]: value };
    setSlidePreview(newSlides);
  };

  const updatePoint = (slideIdx: number, pointIdx: number, value: string) => {
    const newSlides = [...slidePreview];
    const newPoints = [...newSlides[slideIdx].points];
    newPoints[pointIdx] = value;
    newSlides[slideIdx] = { ...newSlides[slideIdx], points: newPoints };
    setSlidePreview(newSlides);
  };

  const addPoint = (slideIdx: number) => {
    const newSlides = [...slidePreview];
    newSlides[slideIdx] = { ...newSlides[slideIdx], points: [...newSlides[slideIdx].points, 'Ý mới...'] };
    setSlidePreview(newSlides);
  };

  const removePoint = (slideIdx: number, pointIdx: number) => {
    const newSlides = [...slidePreview];
    const newPoints = newSlides[slideIdx].points.filter((_: any, i: number) => i !== pointIdx);
    newSlides[slideIdx] = { ...newSlides[slideIdx], points: newPoints };
    setSlidePreview(newSlides);
  };

  const hasFormula = (text: string) => typeof text === 'string' && /\$[^$\n]+\$|\$\$[\s\S]+?\$\$/.test(text);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => setSlidePreview(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Presentation className="w-6 h-6 text-orange-500"/>Bản thảo Slide ({slidePreview.length} slide nội dung + 1 trang bìa)
            </h2>
            <p className="text-slate-500 text-sm mt-1">Sửa trực tiếp nội dung dưới đây. Giao diện xem trước được thiết kế theo tỷ lệ 16:9 của PowerPoint.</p>
          </div>
        </div>
        <button onClick={handleDownloadSlide} className="px-5 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-bold flex items-center gap-2 hover:opacity-90 shadow-lg shadow-orange-200/50">
          <Download className="w-5 h-5" /> Tải file PPTX
        </button>
      </div>
      
      <div className="grid gap-8">
        {slidePreview.map((slide, idx) => (
          <div key={idx} className="bg-slate-100/50 rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-6">
            
            {/* Top: 16:9 Slide Preview */}
            <div className="w-full flex-shrink-0">
              <div className="aspect-[16/9] bg-[#F8FAFC] border-2 border-slate-300 rounded-xl shadow-lg overflow-hidden flex flex-col relative group">
                 {/* Header / Title */}
                 <div className="bg-[#1A237E] p-4 sm:p-6 flex items-center shrink-0">
                   <input
                     value={slide.title}
                     onChange={(e) => updateSlide(idx, 'title', e.target.value)}
                     className="bg-transparent text-white font-bold text-xl sm:text-3xl w-full border border-transparent hover:border-white/30 focus:border-white focus:ring-1 focus:ring-white rounded px-2 py-1 outline-none transition-all"
                   />
                 </div>
                 
                 {/* Content / Points */}
                 <div className="flex-1 p-5 sm:p-8 flex flex-col gap-3 overflow-y-auto custom-scrollbar relative">
                   {slide.points.map((pt: string, pIdx: number) => (
                     <div key={pIdx} className="flex flex-col gap-1.5 group/point relative">
                       <div className="flex items-start gap-3">
                         <span className="text-slate-700 font-black mt-2 text-xl">•</span>
                         <textarea
                           value={pt}
                           onChange={(e) => updatePoint(idx, pIdx, e.target.value)}
                           className="point-textarea flex-1 bg-transparent text-slate-800 text-lg sm:text-xl leading-relaxed border border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white rounded p-2 resize-none overflow-hidden outline-none transition-all"
                           rows={1}
                           onFocus={(e) => {
                             e.currentTarget.style.height = 'auto';
                             e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                           }}
                           onInput={(e) => {
                             e.currentTarget.style.height = 'auto';
                             e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                           }}
                         />
                         <button onClick={() => removePoint(idx, pIdx)} className="absolute right-0 top-2 opacity-0 group-hover/point:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all z-10" title="Xóa ý này">
                           <X className="w-5 h-5"/>
                         </button>
                       </div>
                       {hasFormula(pt) && (
                         <div className="ml-8 flex items-start gap-2 rounded-lg bg-indigo-50/70 border border-indigo-100 px-3 py-2 text-sm text-slate-700">
                           <Sigma className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                           <div className="prose prose-sm max-w-none">
                             <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{pt}</ReactMarkdown>
                           </div>
                         </div>
                       )}
                     </div>
                   ))}
                   
                   <div className="pt-4">
                     <button onClick={() => addPoint(idx)} className="text-sm sm:text-base font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5">
                       <Plus className="w-4 h-4"/> Thêm ý
                     </button>
                   </div>
                 </div>
                 
                 {/* Slide Number */}
                 <div className="absolute bottom-3 right-5 text-slate-500 text-base font-bold select-none">{idx + 1}</div>
              </div>
            </div>

            {/* Bottom: Notes & Suggestions */}
            <div className="w-full flex flex-col sm:flex-row gap-5">
              <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm flex-1 flex flex-col">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1.5 mb-3 shrink-0"><ImageIcon className="w-4 h-4"/> Gợi ý hình ảnh</h4>
                <textarea
                  value={slide.visualSuggestion || ''}
                  onChange={(e) => updateSlide(idx, 'visualSuggestion', e.target.value)}
                  className="w-full flex-1 min-h-[100px] bg-blue-50/40 text-slate-700 text-sm sm:text-base leading-relaxed border border-transparent hover:border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white rounded-lg p-3 resize-none outline-none transition-all"
                  placeholder="Không có gợi ý."
                />
              </div>
              
              <div className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm flex-1 flex flex-col">
                <h4 className="text-xs font-bold uppercase tracking-wider text-orange-500 flex items-center gap-1.5 mb-3 shrink-0"><MessageSquare className="w-4 h-4"/> Lời thoại (Speaker Notes)</h4>
                <textarea
                  value={slide.speakerNotes || ''}
                  onChange={(e) => updateSlide(idx, 'speakerNotes', e.target.value)}
                  className="w-full flex-1 min-h-[100px] bg-orange-50/40 text-slate-700 text-sm sm:text-base leading-relaxed italic border border-transparent hover:border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:bg-white rounded-lg p-3 resize-none outline-none transition-all"
                  placeholder="Ghi chú diễn giả..."
                />
              </div>
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
};
