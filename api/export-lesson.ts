import type { VercelRequest, VercelResponse } from '@vercel/node';
import chromium from '@sparticuz/chromium';
import { marked } from 'marked';
import puppeteer from 'puppeteer-core';
import { renderWordBuffer, safeFilename } from './render-word-core.js';
import type { WordOrientation } from './render-word-core.js';

const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PDF_MIME_TYPE = 'application/pdf';
const MAX_CONTENT_LENGTH = 900_000;

type LessonType = 'TDS' | 'MOET';

interface ExportLessonPayload {
  grade?: number;
  week?: number;
  type?: LessonType | string;
  lessonName?: string;
  title?: string;
  content?: string;
  orientation?: WordOrientation | string;
}

const isOrientation = (value: unknown): value is WordOrientation =>
  value === 'portrait' || value === 'landscape';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeLessonType = (value: unknown): LessonType => {
  const upper = String(value || '').trim().toUpperCase();
  return upper === 'MOET' ? 'MOET' : 'TDS';
};

const buildTitle = (payload: ExportLessonPayload, type: LessonType): string => {
  if (payload.title && payload.title.trim()) return payload.title.trim();
  const grade = Number.isFinite(Number(payload.grade)) ? `G${Number(payload.grade)}` : '';
  const week = Number.isFinite(Number(payload.week)) ? `Tuần ${Number(payload.week)}` : '';
  const lessonName = payload.lessonName?.trim() || 'Giáo án';
  return [type, grade, week, lessonName].filter(Boolean).join(' - ');
};

const normalizeLatexMarkers = (text: string): string =>
  text
    .replace(/\\\((.*?)\\\)/gs, '$$$1$$')
    .replace(/\\\[(.*?)\\\]/gs, '$$$$ $1 $$$$');

const buildHtml = async (title: string, content: string): Promise<string> => {
  const htmlContent = await marked.parse(normalizeLatexMarkers(content), { async: true, gfm: true, breaks: true });
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
  <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  <style>
    @page { size: A4; margin: 20mm 18mm 20mm 30mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Times New Roman", Times, serif;
      color: #000;
      background: #fff;
      font-size: 14pt;
      line-height: 1.5;
    }
    main { width: 100%; }
    h1 {
      font-size: 18pt;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      margin: 10pt 0 8pt;
      page-break-after: avoid;
    }
    h2 {
      font-size: 15pt;
      color: #1a365d;
      font-weight: 700;
      margin: 8pt 0 4pt;
      page-break-after: avoid;
    }
    h3, h4, h5, h6 {
      font-size: 14pt;
      font-weight: 700;
      margin: 6pt 0 3pt;
      page-break-after: avoid;
    }
    p {
      margin: 6pt 0;
      text-align: justify;
      text-indent: 1cm;
    }
    ul, ol { margin: 6pt 0 6pt 22pt; padding: 0; }
    li { margin: 2pt 0; }
    li p, td p, th p { text-indent: 0; margin: 3pt 0; }
    table {
      border-collapse: collapse;
      width: 100%;
      table-layout: fixed;
      margin: 6pt 0;
      page-break-inside: auto;
    }
    tr { page-break-inside: avoid; page-break-after: auto; }
    th, td {
      border: 1px solid #555;
      padding: 5pt 7pt;
      vertical-align: top;
      text-align: left;
      font-size: 13pt;
      line-height: 1.4;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    th { background: #e2e8f0; font-weight: 700; }
    blockquote {
      border-left: 3px solid #94a3b8;
      margin: 6pt 0;
      padding-left: 12pt;
      font-style: italic;
    }
    code {
      font-family: "Courier New", monospace;
      background: #f1f5f9;
      padding: 1pt 4pt;
      border-radius: 3px;
      font-size: 13pt;
    }
    pre {
      background: #f8fafc;
      padding: 6pt;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12pt;
      line-height: 1.4;
      white-space: pre-wrap;
    }
    .katex, mjx-container { font-size: 1em; }
    mjx-container[display="true"] { margin: 4pt 0; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    ${htmlContent}
  </main>
</body>
</html>`;
};

const renderPdfBuffer = async (title: string, content: string, orientation: WordOrientation): Promise<Buffer> => {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: orientation === 'landscape' ? 1123 : 794, height: orientation === 'landscape' ? 794 : 1123 },
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || (await chromium.executablePath()),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120_000);
    page.setDefaultTimeout(120_000);
    await page.setContent(await buildHtml(title, content), { waitUntil: 'networkidle0', timeout: 120_000 });
    await page.evaluate(async () => {
      const mathJax = (window as any).MathJax;
      if (mathJax?.typesetPromise) {
        await mathJax.typesetPromise();
      }
      if ((document as any).fonts?.ready) {
        await (document as any).fonts.ready;
      }
    });

    const pdf = await page.pdf({
      format: 'A4',
      landscape: orientation === 'landscape',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '20mm', right: '18mm', bottom: '20mm', left: '30mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div style="font-family: Times New Roman, serif; font-size: 10pt; width: 100%; text-align: center; color: #444;"><span class="pageNumber"></span></div>',
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = (req.body || {}) as ExportLessonPayload;
  if (!payload.content || typeof payload.content !== 'string') {
    return res.status(400).json({ error: 'Missing content' });
  }
  if (payload.content.length > MAX_CONTENT_LENGTH) {
    return res.status(413).json({ error: 'Content too large' });
  }

  const type = normalizeLessonType(payload.type);
  const title = buildTitle(payload, type);
  const orientation = isOrientation(payload.orientation) ? payload.orientation : 'portrait';
  const baseFilename = safeFilename(`${title}_${type}`, 'giao-an');

  try {
    const [wordBuffer, pdfBuffer] = await Promise.all([
      renderWordBuffer({ title, content: payload.content, orientation }),
      renderPdfBuffer(title, payload.content, orientation),
    ]);

    return res.status(200).json({
      word: {
        filename: `${baseFilename}.docx`,
        mimeType: DOCX_MIME_TYPE,
        base64: wordBuffer.toString('base64'),
      },
      pdf: {
        filename: `${baseFilename}.pdf`,
        mimeType: PDF_MIME_TYPE,
        base64: pdfBuffer.toString('base64'),
      },
    });
  } catch (err: any) {
    console.error('Lesson export failed:', err);
    return res.status(500).json({ error: err?.message || 'Lesson export failed' });
  }
}
