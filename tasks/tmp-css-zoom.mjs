import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/components/liveLesson/liveClassroom.css';
let t = readFileSync(p, 'utf8');
t += `
/* ASS-MDP-01 × Math Diagram Standard — chế độ phóng to đề/hình (zoom/pan + fallback) */
.math-zoom-open { margin-top: 8px; min-height: 40px; padding: 6px 12px; border-radius: 10px; border: 1px solid #67e8f9; background: #ecfeff; color: #155e75; font-weight: 800; font-size: 12px; cursor: pointer; }
.math-zoom-overlay { position: fixed; inset: 0; z-index: 80; background: #f8fafc; display: flex; flex-direction: column; }
.math-zoom-toolbar { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; background: #fff; }
.math-zoom-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 900; font-size: 13px; color: #0e7490; }
.math-zoom-toolbar button { min-height: 40px; min-width: 44px; padding: 6px 12px; border-radius: 10px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: 900; font-size: 13px; cursor: pointer; }
.math-zoom-scale { font-weight: 900; font-size: 12px; color: #475569; min-width: 44px; text-align: center; }
.math-zoom-canvas { flex: 1 1 auto; overflow: hidden; touch-action: none; padding: 12px; }
.math-zoom-content { transform-origin: top left; will-change: transform; }
`;
writeFileSync(p, t, 'utf8');
console.log('zoom css added');
