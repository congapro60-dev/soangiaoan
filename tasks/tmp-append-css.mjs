import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/components/liveLesson/liveClassroom.css';
let t = readFileSync(p, 'utf8');
const anchor = '/* COMM-AQ-01';
if (!t.includes(anchor)) {
  t += `
/* COMM-AQ-01 — Giơ tay + Hỏi ẩn danh + Understanding Pulse */
.student-ask-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 0; }
.student-ask-btn { min-height: 44px; padding: 8px 14px; border-radius: 12px; border: 1px solid #93c5fd; background: #eff6ff; color: #1e3a8a; font-weight: 800; font-size: 13px; cursor: pointer; }
.student-ask-btn.is-raised { border-color: #f59e0b; background: #fef3c7; color: #92400e; }
.student-ask-modal { width: 100%; margin-top: 8px; padding: 12px; border-radius: 16px; border: 1px solid #bae6fd; background: #fff; box-shadow: 0 8px 24px rgb(2 6 23 / 0.08); }
.student-ask-title { margin: 0 0 6px; font-weight: 900; font-size: 14px; color: #0c4a6e; }
.student-ask-label { display: block; margin-bottom: 4px; font-size: 12px; font-weight: 700; color: #475569; }
.student-ask-input { width: 100%; min-height: 72px; padding: 8px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 14px; resize: vertical; }
.student-ask-hint { margin: 6px 0 0; font-size: 11px; color: #64748b; }
.student-ask-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.student-ask-secondary, .student-ask-primary { min-height: 40px; padding: 6px 14px; border-radius: 10px; font-weight: 800; font-size: 13px; cursor: pointer; }
.student-ask-secondary { border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; }
.student-ask-primary { border: 0; background: #0284c7; color: #fff; }
.student-ask-primary:disabled { opacity: 0.6; cursor: wait; }
.student-ask-note { font-size: 12px; font-weight: 700; color: #047857; }
.student-ask-note.is-error { color: #b91c1c; }

.student-pulse { width: 100%; margin-top: 8px; padding: 10px 12px; border-radius: 16px; border: 1px dashed #a5b4fc; background: #eef2ff; }
.student-pulse-title { margin: 0 0 6px; font-weight: 900; font-size: 13px; color: #3730a3; }
.student-pulse-options { display: flex; flex-wrap: wrap; gap: 6px; }
.student-pulse-btn { min-height: 38px; padding: 6px 10px; border-radius: 10px; border: 1px solid #c7d2fe; background: #fff; color: #312e81; font-weight: 700; font-size: 12px; cursor: pointer; }
.student-pulse-btn.is-selected { border-color: #4f46e5; background: #4f46e5; color: #fff; }
.student-pulse-note { margin: 8px 0 0; font-size: 12px; color: #475569; }
.student-pulse-link { border: 0; background: none; color: #0284c7; font-weight: 800; cursor: pointer; text-decoration: underline; }

.student-published-question { padding: 10px 12px; border-radius: 16px; border: 1px solid #fcd34d; background: #fffbeb; }
.student-published-title { margin: 0 0 4px; font-weight: 900; font-size: 12px; text-transform: uppercase; color: #92400e; }
.student-published-body { margin: 0; font-size: 14px; font-weight: 700; color: #78350f; }

.tv-hand-raise { margin-top: 8px; padding: 8px 12px; border-radius: 12px; border: 1px solid #fbbf24; background: #fffbeb; color: #92400e; font-weight: 900; font-size: 13px; }
.tv-questions { margin-top: 8px; padding: 8px 12px; border-radius: 12px; border: 1px solid #bae6fd; background: #f0f9ff; }
.tv-questions-toggle { border: 0; background: none; font-weight: 900; font-size: 13px; color: #0c4a6e; cursor: pointer; }
.tv-questions-list { margin: 8px 0 0; padding: 0; list-style: none; display: grid; gap: 8px; max-height: 260px; overflow: auto; }
.tv-question-item { padding: 8px 10px; border-radius: 10px; background: #fff; border: 1px solid #e2e8f0; }
.tv-question-meta { margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; }
.tv-question-body { margin: 4px 0 6px; font-size: 13px; font-weight: 700; color: #0f172a; }
.tv-question-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.tv-question-actions button { min-height: 32px; padding: 4px 10px; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: 800; font-size: 12px; cursor: pointer; }
.tv-question-actions button:first-child { border-color: #0284c7; background: #0284c7; color: #fff; }
`;
  writeFileSync(p, t, 'utf8');
  console.log('css appended');
} else {
  console.log('css đã có');
}
