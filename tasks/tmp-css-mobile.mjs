import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/components/liveLesson/liveClassroom.css';
let t = readFileSync(p, 'utf8');
const anchor = '@media (max-width: 600px) {';
if (!t.includes(anchor)) throw new Error('anchor missing');
const add = anchor + `
  .student-ask-bar { flex-direction: column; align-items: stretch; padding: 0 0 4px; }
  .student-ask-btn { width: 100%; min-height: 44px; }
  .student-ask-modal { position: relative; }
  .student-ask-input { font-size: 16px; }
  .student-pulse { padding: 10px; }
  .student-pulse-btn { width: 100%; min-height: 44px; }
  .student-published-question { padding: 10px; }
  .student-published-body { font-size: 14px; }
  .student-tv-reference { padding: 18px; }
  .student-answer-input, .student-practice-input { font-size: 16px; }
  .student-answer-input, .student-practice-input { min-height: 44px; padding: 10px; }
  .tv-questions-list { max-height: 220px; }
  .live-student { padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px)); }
  .student-ask-bar, .student-pulse { margin-bottom: env(safe-area-inset-bottom, 0px); }
  button { touch-action: manipulation; }`;
t = t.split(anchor).join(add);
// Nút nhỏ (hint/glossary/pulse link) touch target ≥40px trên mọi viewport — thêm rule chung cuối file
t += `
/* ASS-MDP-01 — touch target tối thiểu cho nút phụ trên mobile (44px theo HIG/Material) */
@media (pointer: coarse) {
  .student-ask-btn, .student-pulse-btn, .student-practice-footer button,
  .student-ask-primary, .student-ask-secondary { min-height: 44px; }
  .student-support-modes button, .student-support-terms button, .student-slot button { min-height: 40px; }
}
`;
writeFileSync(p, t, 'utf8');
console.log('css mobile patched');
