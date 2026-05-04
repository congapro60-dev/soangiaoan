/** CSS for Word/doc export (inline HTML style block) */
export const WORD_EXPORT_STYLES = `
  body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.6; padding: 2cm; }
  h1 { text-align: center; font-size: 16pt; color: #1F3864; }
  h2 { font-size: 13pt; color: #2F5496; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  h3 { font-size: 12pt; color: #2F5496; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; }
  th { border: 1px solid #000; padding: 6px 8px; text-align: left; font-size: 11pt; background-color: #2F5496; color: #ffffff; }
  td { border: 1px solid #000; padding: 6px 8px; text-align: left; font-size: 11pt; }
  p { margin: 4px 0; }
`;

/**
 * Scoped CSS injected via <style> tag to transform the MDEditor preview pane
 * into an A4 exam-paper look.
 *
 * Scope anchor: .exam-board  (added to the MDEditor wrapper div)
 * Target:       .w-md-editor-preview .wmde-markdown
 *
 * Note: MDEditor uses .wmde-markdown (not .markdown-body) for the rendered content.
 */
export const MD_EDITOR_A4_CSS = `
  /* Grey page background so the white A4 sheet "floats" */
  .exam-board .w-md-editor-preview {
    background: #e2e5e9 !important;
    overflow-y: auto !important;
    padding: 28px 20px !important;
  }

  /* The A4 sheet — fixed 210mm width so split-view never squishes the page */
  .exam-board .w-md-editor-preview .wmde-markdown {
    /* No font-family !important here — lets KaTeX use its own font stack */
    font-size: 13pt !important;
    line-height: 1.75 !important;
    color: #111 !important;
    background: #ffffff !important;
    width: 210mm !important;
    max-width: none !important;
    min-height: 240px !important;
    margin: 0 auto 28px auto !important;
    padding: 18mm 20mm 22mm 20mm !important;
    box-shadow: 0 4px 28px rgba(0,0,0,0.18), 0 1px 6px rgba(0,0,0,0.08) !important;
    border-radius: 1px !important;
  }

  /* Apply Times New Roman only to prose elements — NOT to KaTeX spans */
  .exam-board .w-md-editor-preview .wmde-markdown p,
  .exam-board .w-md-editor-preview .wmde-markdown li,
  .exam-board .w-md-editor-preview .wmde-markdown td,
  .exam-board .w-md-editor-preview .wmde-markdown th,
  .exam-board .w-md-editor-preview .wmde-markdown blockquote {
    font-family: 'Times New Roman', Times, serif !important;
  }

  /* Headings */
  .exam-board .w-md-editor-preview .wmde-markdown h1,
  .exam-board .w-md-editor-preview .wmde-markdown h2 {
    font-family: 'Times New Roman', Times, serif !important;
    font-size: 14pt !important;
    font-weight: bold !important;
    text-align: center !important;
    color: #111 !important;
    border: none !important;
    margin: 4px 0 8px 0 !important;
    padding: 0 !important;
  }
  .exam-board .w-md-editor-preview .wmde-markdown h3,
  .exam-board .w-md-editor-preview .wmde-markdown h4 {
    font-family: 'Times New Roman', Times, serif !important;
    font-size: 13pt !important;
    font-weight: bold !important;
    color: #111 !important;
    border: none !important;
    margin: 10px 0 4px 0 !important;
  }

  /* Paragraphs and lists */
  .exam-board .w-md-editor-preview .wmde-markdown p {
    margin: 4px 0 !important;
    line-height: 1.75 !important;
    color: #111 !important;
  }
  .exam-board .w-md-editor-preview .wmde-markdown ol,
  .exam-board .w-md-editor-preview .wmde-markdown ul {
    padding-left: 22px !important;
    margin: 3px 0 !important;
  }
  .exam-board .w-md-editor-preview .wmde-markdown li { margin: 2px 0 !important; }

  /* Tables */
  .exam-board .w-md-editor-preview .wmde-markdown table {
    border-collapse: collapse !important;
    width: 100% !important;
    margin: 8px 0 !important;
    font-size: 11pt !important;
  }
  .exam-board .w-md-editor-preview .wmde-markdown th {
    background: #2F5496 !important;
    color: #fff !important;
    border: 1px solid #000 !important;
    padding: 5px 8px !important;
    text-align: left !important;
    font-weight: bold !important;
  }
  .exam-board .w-md-editor-preview .wmde-markdown td {
    border: 1px solid #888 !important;
    padding: 5px 8px !important;
    color: #111 !important;
  }

  /* Code (inline answers / short answers) */
  .exam-board .w-md-editor-preview .wmde-markdown code {
    font-family: 'Courier New', monospace !important;
    font-size: 11pt !important;
    background: #f3f4f6 !important;
    padding: 1px 4px !important;
    border-radius: 3px !important;
  }
  .exam-board .w-md-editor-preview .wmde-markdown pre code {
    background: transparent !important;
    padding: 0 !important;
  }

  /* Horizontal rule */
  .exam-board .w-md-editor-preview .wmde-markdown hr {
    border: none !important;
    border-top: 1px solid #ccc !important;
    margin: 12px 0 !important;
  }

  /* KaTeX */
  .exam-board .w-md-editor-preview .wmde-markdown .katex {
    font-size: 1em !important;
  }
`;
