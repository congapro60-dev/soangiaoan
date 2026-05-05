import React, { useState, useRef, useEffect } from 'react';
import { X, Scissors, ChevronLeft, ChevronRight, Check, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ManualCropModalProps {
  pageImages: string[];
  onCrop: (croppedDataUrl: string) => void;
  onClose: () => void;
}

export const ManualCropModal = ({ pageImages, onCrop, onClose }: ManualCropModalProps) => {
  const [pIdx, setPIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [box, setBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Set canvas size to match image aspect ratio while fitting container
      const containerW = containerRef.current?.clientWidth || 800;
      const scale = containerW / img.width;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Draw selection box if exists
      if (box) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(box.x, box.y, box.w, box.h);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.fillRect(box.x, box.y, box.w, box.h);
      }
    };
    img.src = pageImages[pIdx];
  }, [pIdx, box, pageImages]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPos({ x, y });
    setCurrentPos({ x, y });
    setIsDragging(true);
    setBox(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPos({ x, y });
    
    // Preview box
    setBox({
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      w: Math.abs(x - startPos.x),
      h: Math.abs(y - startPos.y)
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleConfirm = () => {
    if (!box || box.w < 10 || box.h < 10) return;
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      const renderScale = canvasRef.current!.width / img.width;
      const sourceX = box.x / renderScale;
      const sourceY = box.y / renderScale;
      const sourceW = box.w / renderScale;
      const sourceH = box.h / renderScale;

      canvas.width = sourceW;
      canvas.height = sourceH;
      ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);
      onCrop(canvas.toDataURL('image/jpeg', 0.9));
      onClose();
    };
    img.src = pageImages[pIdx];
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 leading-none">Cắt ảnh minh họa</h3>
              <p className="text-xs text-slate-400 mt-1">Dùng chuột quét vùng hình ảnh trên trang đề</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPIdx(Math.max(0, pIdx - 1))}
                disabled={pIdx === 0}
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-30 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-600 min-w-[80px] text-center">Trang {pIdx + 1} / {pageImages.length}</span>
              <button 
                onClick={() => setPIdx(Math.min(pageImages.length - 1, pIdx + 1))}
                disabled={pIdx === pageImages.length - 1}
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-30 hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button 
              onClick={handleConfirm}
              disabled={!box}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-100 disabled:opacity-50 disabled:shadow-none transition-all"
             >
               <Check className="w-4 h-4" /> Dùng vùng đã chọn
             </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto bg-slate-200 p-8 flex justify-center items-start scrollbar-hide" ref={containerRef}>
          <div className="relative shadow-2xl bg-white leading-[0]">
            <canvas 
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="cursor-crosshair block"
            />
          </div>
        </div>

        {/* Thumbnail footer */}
        <div className="p-4 bg-white border-t border-slate-100 overflow-x-auto flex gap-3 scrollbar-hide">
          {pageImages.map((img, i) => (
            <button 
              key={i}
              onClick={() => { setPIdx(i); setBox(null); }}
              className={`w-16 h-20 rounded-lg border-2 shrink-0 overflow-hidden transition-all ${
                pIdx === i ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-200 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt={`page ${i}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};
