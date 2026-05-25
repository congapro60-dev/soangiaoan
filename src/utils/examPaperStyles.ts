/** CSS for legacy Word/doc export (inline HTML style block). */
export const WORD_EXPORT_STYLES = `
  @page { size: A4 portrait; margin: 20mm 18mm 20mm 30mm; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.45; color: #111; }
  h1, h2 { text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 14pt; color: #111; margin: 4px 0 8px; }
  h3 { font-family: 'Times New Roman', Times, serif; font-size: 13pt; color: #111; margin: 8px 0 4px; }
  p, li, td, th { font-family: 'Times New Roman', Times, serif; font-size: 13pt; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; page-break-inside: avoid; break-inside: avoid; }
  th { border: 1px solid #000; padding: 5px 8px; text-align: center; font-weight: bold; }
  td { border: 1px solid #000; padding: 5px 8px; text-align: left; }
  p { margin: 4px 0; }
  img, svg { display: block; max-width: 60%; height: auto; margin: 8px auto; }
`;

/**
 * Scoped CSS injected via <style> tag to transform the MDEditor preview pane
 * into a print-oriented A4 exam-paper look.
 *
 * Scope anchor: .exam-board
 * Target:       .w-md-editor-preview .wmde-markdown
 */
export const MD_EDITOR_A4_CSS = `
  .exam-board {
    --exam-page-bg: #e2e5e9;
    --exam-ink: #111111;
    --exam-paper-width: 210mm;
    --exam-paper-min-height: 297mm;
  }

  .exam-board .w-md-editor,
  .exam-board .w-md-editor-content,
  .exam-board .w-md-editor-preview {
    background: var(--exam-page-bg) !important;
  }

  .exam-board .w-md-editor-preview {
    overflow-y: auto !important;
    padding: 28px 20px !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown {
    font-size: 13pt !important;
    line-height: 1.45 !important;
    color: var(--exam-ink) !important;
    background: #ffffff !important;
    width: var(--exam-paper-width) !important;
    max-width: none !important;
    min-height: var(--exam-paper-min-height) !important;
    margin: 0 auto 28px auto !important;
    padding: 20mm 18mm 20mm 30mm !important;
    box-shadow: 0 8px 30px rgba(15, 23, 42, 0.18), 0 1px 6px rgba(15, 23, 42, 0.08) !important;
    border-radius: 2px !important;
    box-sizing: border-box !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown,
  .exam-board .w-md-editor-preview .wmde-markdown p,
  .exam-board .w-md-editor-preview .wmde-markdown li,
  .exam-board .w-md-editor-preview .wmde-markdown td,
  .exam-board .w-md-editor-preview .wmde-markdown th,
  .exam-board .w-md-editor-preview .wmde-markdown blockquote,
  .exam-board .w-md-editor-preview .wmde-markdown strong,
  .exam-board .w-md-editor-preview .wmde-markdown em {
    font-family: 'Times New Roman', Times, serif !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown .katex,
  .exam-board .w-md-editor-preview .wmde-markdown .katex * {
    font-family: KaTeX_Main, 'Times New Roman', serif !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown h1,
  .exam-board .w-md-editor-preview .wmde-markdown h2 {
    font-family: 'Times New Roman', Times, serif !important;
    font-size: 14pt !important;
    font-weight: 700 !important;
    text-align: center !important;
    color: var(--exam-ink) !important;
    border: none !important;
    margin: 4px 0 8px 0 !important;
    padding: 0 !important;
    line-height: 1.3 !important;
    page-break-after: avoid !important;
    break-after: avoid !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown h3,
  .exam-board .w-md-editor-preview .wmde-markdown h4 {
    font-family: 'Times New Roman', Times, serif !important;
    font-size: 13pt !important;
    font-weight: 700 !important;
    color: var(--exam-ink) !important;
    border: none !important;
    margin: 10px 0 4px 0 !important;
    padding: 0 !important;
    line-height: 1.35 !important;
    page-break-after: avoid !important;
    break-after: avoid !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown p {
    margin: 4px 0 !important;
    line-height: 1.45 !important;
    color: var(--exam-ink) !important;
    font-size: 13pt !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown p:has(strong:first-child),
  .exam-board .w-md-editor-preview .wmde-markdown li:has(strong:first-child),
  .exam-board .w-md-editor-preview .wmde-markdown .exam-question,
  .exam-board .w-md-editor-preview .wmde-markdown .question-block {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown p strong:first-child {
    font-weight: 700 !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown ol,
  .exam-board .w-md-editor-preview .wmde-markdown ul {
    padding-left: 22px !important;
    margin: 3px 0 !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown li {
    margin: 2px 0 !important;
    font-size: 13pt !important;
    line-height: 1.45 !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown table {
    border-collapse: collapse !important;
    width: 100% !important;
    margin: 8px 0 !important;
    font-size: 12pt !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown tr,
  .exam-board .w-md-editor-preview .wmde-markdown thead,
  .exam-board .w-md-editor-preview .wmde-markdown tbody {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown th {
    background: #f8fafc !important;
    color: var(--exam-ink) !important;
    border: 1px solid #000 !important;
    padding: 5px 8px !important;
    text-align: center !important;
    font-weight: 700 !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown td {
    border: 1px solid #000 !important;
    padding: 5px 8px !important;
    color: var(--exam-ink) !important;
    vertical-align: top !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown code {
    font-family: 'Courier New', monospace !important;
    font-size: 11pt !important;
    background: #f3f4f6 !important;
    padding: 1px 4px !important;
    border-radius: 3px !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown pre,
  .exam-board .w-md-editor-preview .wmde-markdown pre code {
    white-space: pre-wrap !important;
    background: transparent !important;
    padding: 0 !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown hr {
    border: none !important;
    border-top: 1px solid #bbb !important;
    margin: 12px 0 !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown img,
  .exam-board .w-md-editor-preview .wmde-markdown svg,
  .exam-board .w-md-editor-preview .wmde-markdown .exam-figure,
  .exam-board .w-md-editor-preview .wmde-markdown .exam-svg,
  .exam-board .w-md-editor-preview .wmde-markdown .variation-table {
    display: block !important;
    max-width: 60% !important;
    height: auto !important;
    margin: 8px auto 10px auto !important;
    text-align: center !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown .exam-figure svg,
  .exam-board .w-md-editor-preview .wmde-markdown .exam-svg svg,
  .exam-board .w-md-editor-preview .wmde-markdown .variation-table svg {
    max-width: 100% !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown .exam-options,
  .exam-board .w-md-editor-preview .wmde-markdown .options-grid {
    display: grid !important;
    gap: 4px 18px !important;
    margin: 4px 0 8px !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .exam-board .w-md-editor-preview .wmde-markdown .options-grid.cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
  .exam-board .w-md-editor-preview .wmde-markdown .options-grid.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .exam-board .w-md-editor-preview .wmde-markdown .options-grid.cols-1 { grid-template-columns: 1fr !important; }

  .exam-board .w-md-editor-preview .wmde-markdown .option-label {
    font-weight: 700 !important;
    margin-right: 4px !important;
  }

  @media print {
    html,
    body,
    #root {
      background: #ffffff !important;
    }

    body * {
      visibility: hidden !important;
    }

    .exam-board,
    .exam-board * {
      visibility: visible !important;
    }

    .exam-board {
      position: static !important;
      display: block !important;
      overflow: visible !important;
      background: #ffffff !important;
    }

    .exam-board .w-md-editor-toolbar,
    .exam-board .w-md-editor-text,
    .exam-board .w-md-editor-bar,
    .exam-board .w-md-editor-preview > .copied,
    .exam-board textarea,
    .exam-board button {
      display: none !important;
    }

    .exam-board .w-md-editor,
    .exam-board .w-md-editor-content,
    .exam-board .w-md-editor-preview {
      display: block !important;
      height: auto !important;
      overflow: visible !important;
      background: #ffffff !important;
      padding: 0 !important;
      box-shadow: none !important;
      border: none !important;
    }

    .exam-board .w-md-editor-preview .wmde-markdown {
      width: auto !important;
      min-height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      background: #ffffff !important;
    }
  }
`;
