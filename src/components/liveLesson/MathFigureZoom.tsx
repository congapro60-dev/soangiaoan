import { useEffect, useRef, useState } from 'react';

/**
 * ASS-MDP-01 × Math Diagram Standard — bọc khối nội dung Toán (đề/hình/KaTeX) để
 * phóng to trên màn nhỏ. Mobile: pinch-zoom + pan (pointer events); mọi thiết bị: nút
 * +/-/reset. Không đổi nội dung/bằng chứng — chỉ là chế độ xem; zoom không ăn vào input.
 * Fallback: nội dung gốc vẫn hiển thị đầy đủ khi không bật chế độ phóng.
 */
const MIN_SCALE = 1;
const MAX_SCALE = 4;

export const clampScale = (value: number): number => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number.isFinite(value) ? value : 1));

export function MathFigureZoom({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);

  useEffect(() => {
    if (!open) { setScale(1); setOffset({ x: 0, y: 0 }); }
  }, [open]);

  const onPointerDown = (event: React.PointerEvent) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
    }
  };
  const onPointerMove = (event: React.PointerEvent) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      setScale(clampScale(pinchStart.current.scale * (dist / pinchStart.current.dist)));
    } else if (pointers.current.size === 1 && scale > 1) {
      const prev = [...pointers.current.values()][0];
      setOffset((o) => ({ x: o.x + event.movementX, y: o.y + event.movementY }));
      void prev;
    }
  };
  const onPointerUp = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  };

  return <>
    {children}
    <button type="button" className="math-zoom-open" onClick={() => setOpen(true)} aria-label={`Phóng to ${title}`}>
      🔍 Phóng to
    </button>
    {open && <div className="math-zoom-overlay" role="dialog" aria-label={`${title} — chế độ phóng to`}>
      <div className="math-zoom-toolbar">
        <span className="math-zoom-title">{title}</span>
        <button type="button" onClick={() => setScale((s) => clampScale(s - 0.5))} aria-label="Thu nhỏ">−</button>
        <span className="math-zoom-scale">{Math.round(scale * 100)}%</span>
        <button type="button" onClick={() => setScale((s) => clampScale(s + 0.5))} aria-label="Phóng to">+</button>
        <button type="button" onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} aria-label="Về vừa màn hình">Vừa</button>
        <button type="button" onClick={() => setOpen(false)} aria-label="Đóng">Đóng</button>
      </div>
      <div
        className="math-zoom-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="math-zoom-content" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>
          {children}
        </div>
      </div>
    </div>}
  </>;
}
