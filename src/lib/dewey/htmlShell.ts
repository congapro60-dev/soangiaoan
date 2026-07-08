import type { DeweyLessonContent, DeweyTheme } from './types';
import { getThemeCss } from './themes';
import { getAdaptiveEngineScript } from './adaptiveEngine';

interface HtmlShellOptions {
  content: DeweyLessonContent;
  theme: DeweyTheme;
  bodyHtml: string;
  /** Mã học sinh — scope localStorage vở ghi theo từng em (F3). */
  studentCode?: string;
}

export const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const escapeAttribute = (value: string): string => escapeHtml(value).replace(/`/g, '&#96;');

export const escapeJsonForHtml = (value: unknown): string => JSON.stringify(value)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

const BASE_CSS = String.raw`
  * { box-sizing: border-box; }
  /* F6: KHÔNG dùng scroll-behavior:smooth ở html — nghi phạm làm wheel scroll chết/ì trong iframe;
     cuộn mượt khi điều hướng đã có JS scrollTo({behavior:'smooth'}) trong engine. */
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text-main);
    font-family: var(--font-family);
    line-height: 1.55;
  }
  .top-header {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 24px;
    background: var(--primary);
    color: white;
    box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  }
  .lesson-title { margin: 0; font-size: 20px; font-weight: 800; }
  .lesson-subtitle { margin: 2px 0 0; opacity: 0.9; font-size: 13px; }
  .timers { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .timer-box {
    background: var(--timer-bg);
    color: white;
    border-radius: 12px;
    padding: 8px 12px;
    font-weight: 800;
    min-width: 86px;
    text-align: center;
  }
  .timer-warning { background: var(--accent); animation: blink 1s step-start infinite; }
  @keyframes blink { 50% { opacity: 0.45; } }
  .btn-toc, .btn {
    border: 0;
    border-radius: 12px;
    padding: 10px 14px;
    background: var(--secondary);
    color: #111827;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 3px 0 rgba(0,0,0,0.18);
  }
  .btn:hover, .btn-toc:hover { transform: translateY(-1px); }
  .btn.secondary { background: white; color: var(--primary); border: 2px solid var(--primary); }
  .btn.success { background: var(--success); color: white; }
  .toc-menu {
    position: fixed;
    right: 24px;
    top: 76px;
    z-index: 60;
    width: min(320px, calc(100vw - 48px));
    border-radius: 18px;
    background: white;
    box-shadow: 0 16px 40px rgba(0,0,0,0.22);
    overflow: hidden;
  }
  .toc-item {
    display: block;
    width: 100%;
    border: 0;
    border-bottom: 1px solid #eef2f7;
    background: white;
    padding: 13px 16px;
    text-align: left;
    cursor: pointer;
    font-weight: 700;
  }
  .toc-item:hover, .toc-item.active { background: #eef6ff; color: var(--primary); }
  .toc-item.locked { opacity: 0.45; }
  .main-wrapper {
    display: grid;
    grid-template-columns: minmax(0, 7fr) minmax(280px, 3fr);
    gap: 24px;
    max-width: 1440px;
    margin: 0 auto;
    padding: 24px;
  }
  .lesson-area { min-width: 0; }
  .notebook-area {
    position: sticky;
    top: 92px;
    height: calc(100vh - 116px);
    overflow: auto;
    padding: 18px;
    border: 3px solid #e7d27c;
    border-radius: 22px;
    background: var(--bg-paper);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.55), 0 8px 22px rgba(0,0,0,0.08);
  }
  .notebook-title { margin: 0 0 12px; color: var(--primary); font-size: 18px; }
  .note-item {
    margin: 10px 0;
    padding: 10px 12px;
    border-left: 4px solid var(--secondary);
    background: rgba(255,255,255,0.72);
    border-radius: 10px;
    font-weight: 650;
    white-space: pre-line;
  }
  .nb-section { margin: 14px 0; }
  .nb-head {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 900;
    color: var(--primary);
    border-bottom: 2px solid var(--secondary);
    padding-bottom: 4px;
  }
  .nb-body:empty::after {
    content: 'Sẽ tự điền khi em học tới phần này…';
    font-size: 13px; font-weight: 600; color: #94a3b8; font-style: italic;
  }
  .nb-body .note-item:first-child { margin-top: 4px; }
  .screen {
    display: none;
    margin-bottom: 28px;
    padding: 26px;
    border-radius: 26px;
    background: white;
    box-shadow: 0 10px 30px rgba(15, 76, 129, 0.09);
    scroll-margin-top: 96px;
  }
  .screen.active {
    display: block;
    animation: deweyFadeIn 0.4s ease;
  }
  @keyframes deweyFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .screen h2 { margin-top: 0; color: var(--primary); font-size: 28px; }
  .box {
    border-radius: 18px;
    padding: 16px 18px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    margin: 14px 0;
  }
  .question-card, .scaffold-step, .oly-card {
    border: 2px solid #e5e7eb;
    border-radius: 20px;
    padding: 18px;
    margin: 16px 0;
    background: #fff;
  }
  .step-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 34px;
    height: 34px;
    border-radius: 999px;
    background: var(--primary);
    color: white;
    font-weight: 900;
    margin-right: 8px;
  }
  .option-lbl {
    display: block;
    padding: 10px 12px;
    margin: 8px 0;
    border: 1px solid #dbe3ef;
    border-radius: 12px;
    cursor: pointer;
    background: #fff;
  }
  .option-lbl:hover { border-color: var(--primary); background: #f4f9ff; }
  .feedback-msg {
    margin-top: 12px;
    padding: 12px 14px;
    border-radius: 14px;
    font-weight: 750;
    white-space: pre-line;
  }
  .feedback-correct { background: #e9f8ef; color: #176b35; border: 1px solid #bce7ca; }
  .feedback-wrong { background: #fff1f1; color: #a12121; border: 1px solid #ffc8c8; }
  .feedback-info { background: #eef6ff; color: var(--primary); border: 1px solid #cfe5ff; }
  .theory-box, .hint1-box, .hint2-box, .hint3-box, .solution-box, .eval-box {
    margin-top: 12px;
    padding: 12px 14px;
    border-radius: 14px;
    background: #fff8df;
    border: 1px dashed var(--secondary);
    white-space: pre-line;
  }
  .eval-true { color: var(--success); font-weight: 800; }
  .eval-false { color: var(--accent); font-weight: 800; }
  .svg-enigma, .enigma-container, .lightbulb-container, .robot-grid, .oly-grid {
    display: grid;
    gap: 14px;
    margin: 16px 0;
  }
  .enigma-container, .robot-grid, .oly-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
  .dial, .bulb {
    min-height: 110px;
    border-radius: 20px;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: white;
    font-weight: 900;
    font-size: 26px;
  }
  .engage-illustration iframe { display: block; }
  .unit-simulation { margin: 16px 0; }
  .unit-simulation .sim-frame { background: white; margin-top: 10px; }
  .step-illustration { margin: 10px 0; }
  .step-illustration img, .step-illustration svg { max-width: 100%; height: auto; border-radius: 10px; }
  .tikz-figure { margin: 10px 0; text-align: center; }
  .tikz-figure svg { max-width: 100%; height: auto; }
  .question-figure { margin: 12px 0; text-align: center; }
  .question-figure svg, .question-figure img { max-width: 100%; height: auto; border-radius: 12px; }
  .extend-figure { margin: 14px 0; }
  .extend-figure svg, .extend-figure img { max-width: 100%; height: auto; border-radius: 12px; }
  .extend-figure .sim-frame { background: white; border-radius: 12px; }
  .bonus-box { border: 2px dashed var(--primary, #2563eb); background: #f5f9ff; }
  .bonus-box h3 { margin-top: 0; }
  .bonus-text { white-space: pre-line; margin-top: 6px; }
  .bonus-box details { margin-top: 8px; }
  .bonus-box details summary { cursor: pointer; font-weight: 650; color: var(--primary, #2563eb); }
  .bonus-video { font-weight: 650; color: var(--primary, #2563eb); text-decoration: underline; }
  .tf-table .tf-answer { font-weight: 700; white-space: nowrap; color: #0f172a; }
  .tf-table tr.tf-right { background: #ecfdf5; }
  .tf-table tr.tf-wrong { background: #fef2f2; }
  .tf-hint-wrap { margin-top: 6px; }
  .tf-hint-btn { font-size: 12px; font-weight: 650; color: var(--primary, #2563eb); background: none; border: 1px dashed var(--primary, #2563eb); border-radius: 8px; padding: 2px 8px; cursor: pointer; }
  .tf-hint { margin-top: 6px; padding: 6px 10px; background: #f5f9ff; border-radius: 8px; font-size: 14px; white-space: pre-line; }
  .essay-parts { margin: 8px 0; padding-left: 22px; }
  .essay-parts li { margin-bottom: 6px; }
  .essay-actions { display: flex; gap: 10px; flex-wrap: wrap; margin: 10px 0; }
  .essay-selfscore .btn { margin: 4px 8px 4px 0; }
  .oly-hint { font-size: 14px; font-weight: 650; color: var(--text-secondary, #64748b); margin: 4px 0 0; }
  .oly-tabs { display: flex; gap: 10px; flex-wrap: wrap; margin: 14px 0; }
  .oly-tab {
    padding: 10px 18px;
    border-radius: 999px;
    border: 2px solid var(--secondary);
    background: white;
    font-weight: 850;
    cursor: pointer;
    color: var(--primary);
  }
  .oly-tab .oly-tab-count { font-size: 12px; font-weight: 700; opacity: 0.7; margin-left: 4px; }
  .oly-tab.active { background: var(--secondary); color: #3a2c00; }
  .oly-panel { margin-top: 4px; }
  .oly-card { display: none; }
  .oly-card.active { display: block; }
  .score-board {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 999px;
    background: var(--timer-bg);
    color: white;
    font-weight: 900;
  }
  .tf-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  .tf-table th, .tf-table td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
  textarea, input[type="text"], input[type="number"] {
    width: 100%;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    padding: 10px 12px;
    font: inherit;
  }
  .hidden { display: none !important; }
  @media (max-width: 980px) {
    .main-wrapper { grid-template-columns: 1fr; padding: 14px; }
    .notebook-area { position: static; height: auto; }
    .top-header { align-items: flex-start; flex-direction: column; }
  }

  header .left-cluster { display: flex; align-items: center; gap: 16px; min-width: 0; }
  header .timers { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .lesson-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .step-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: var(--primary);
    color: white;
    font-weight: 900;
    padding: 6px 12px;
  }
  .question-card {
    border: 1px solid var(--border);
    border-left: 4px solid var(--primary);
    border-radius: 8px;
    background: var(--bg-card);
  }
  .option-lbl {
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  .option-lbl:hover { border-color: var(--primary); }
  .activity-box {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-left: 4px solid var(--primary);
    border-radius: 14px;
    padding: 14px 16px;
    margin: 14px 0;
  }
  .guiding-question-card {
    background: #EFF6FF;
    border-left: 4px solid var(--info);
    border-radius: 14px;
    padding: 14px 16px;
    margin: 14px 0;
  }
  .guiding-question-box {
    border: 2px dashed var(--accent);
    border-radius: 16px;
    padding: 14px 16px;
    background: var(--bg-card);
  }
  .feedback-card {
    border-radius: 14px;
    border: 1px solid var(--border);
    padding: 12px 14px;
    background: var(--bg-card);
  }
  .feedback-card.correct { border-left: 4px solid var(--success); }
  .feedback-card.wrong { border-left: 4px solid var(--accent); }
  .bloom-framework {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    margin: 16px 0;
  }
  .bloom-framework > * { border-radius: 14px; padding: 12px 14px; border: 1px solid var(--border); }
  .bloom-nhanbiet { border-left: 4px solid var(--info); }
  .bloom-thonghieu { border-left: 4px solid var(--secondary); }
  .bloom-vandung { border-left: 4px solid var(--accent); }
  .notebook-title {
    border: 2px dashed var(--primary);
    border-radius: 16px;
    color: var(--primary);
    text-align: center;
    padding: 10px 12px;
  }
  .btn-primary-navy {
    border: 0;
    border-radius: 12px;
    padding: 12px 16px;
    background: var(--primary);
    color: white;
    font-weight: 900;
    cursor: pointer;
    box-shadow: 0 3px 0 rgba(0,0,0,0.18);
  }
  .btn-outline-navy {
    border: 2px solid var(--primary);
    border-radius: 12px;
    padding: 10px 14px;
    background: transparent;
    color: var(--primary);
    font-weight: 900;
    cursor: pointer;
  }
  .full-width { width: 100%; }
  .timer-box {
    background: var(--timer-bg);
    font-family: var(--font-mono);
  }
  .timer-box .label { color: var(--timer-label); font-size: 11px; line-height: 1; opacity: 0.95; }
  .timer-box .value { color: var(--timer-value); font-size: 17px; line-height: 1.2; }
  .notebook-area {
    background-image: repeating-linear-gradient(to bottom, transparent 0, transparent 31px, var(--notebook-line) 31px, var(--notebook-line) 32px);
  }
  .toc-item.locked { pointer-events: none; cursor: not-allowed; }
`;

export function renderHtmlShell({ content, theme, bodyHtml, studentCode }: HtmlShellOptions): string {
  const title = `${content.title} - Dewey Lesson`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <script>
    MathJax = { tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']] } };
  </script>
  <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  <style>
${getThemeCss(theme)}
${BASE_CSS}
  </style>
</head>
<body data-duration-minutes="${content.durationMinutes}" data-initial-screen="${content.skipPretest ? 'screen-engage' : 'screen-pretest'}">
  <script id="dewey-content" type="application/json">${escapeJsonForHtml(content)}</script>
${bodyHtml}
  <script>${getAdaptiveEngineScript(content.lessonId, studentCode)}</script>
</body>
</html>`;
}
