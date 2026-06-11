/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import chromium from '@sparticuz/chromium';
import katex from 'katex';
import { marked } from 'marked';
import puppeteer from 'puppeteer-core';
import { renderWordBuffer, safeFilename, preprocessExamMarkdownForWord } from './render-word-core.js';
import type { WordOrientation } from './render-word-core.js';

// Inline KaTeX CSS + fonts at module init so math glyphs render in Lambda
// (no outbound network to fetch /fonts/*.woff2).
// Wrap in try/catch — if Vercel's file tracer misses the dist files, fall back
// to empty CSS rather than crashing the entire function on cold start.
const loadKatexCss = (): string => {
  try {
    const requireFromHere = createRequire(import.meta.url);
    const katexPackageDir = dirname(requireFromHere.resolve('katex/package.json'));
    const katexFontsDir = join(katexPackageDir, 'dist', 'fonts');
    const css = readFileSync(join(katexPackageDir, 'dist', 'katex.min.css'), 'utf8');
    return css.replace(
      /url\((['"]?)fonts\/([^)'"]+\.woff2)\1\)/g,
      (_match, _quote, fontFile) => {
        try {
          const buf = readFileSync(join(katexFontsDir, fontFile));
          return `url(data:font/woff2;base64,${buf.toString('base64')})`;
        } catch {
          return `url(fonts/${fontFile})`;
        }
      },
    );
  } catch (err) {
    console.error('Failed to load KaTeX CSS at init:', err);
    return '';
  }
};

const KATEX_CSS = loadKatexCss();
const KROKI_FETCH_TIMEOUT_MS = 8_000;

const fetchWithTimeout = async (url: string, timeoutMs = KROKI_FETCH_TIMEOUT_MS): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PDF_MIME_TYPE = 'application/pdf';
const MAX_CONTENT_LENGTH = 900_000;

type LessonType = 'TDS' | 'MOET';
type ExportFormat = 'docx' | 'pdf' | 'both';

interface ExportLessonPayload {
  grade?: number;
  week?: number;
  type?: LessonType | string;
  lessonName?: string;
  title?: string;
  content?: string;
  orientation?: WordOrientation | string;
  format?: ExportFormat | string;
}

const isOrientation = (value: unknown): value is WordOrientation =>
  value === 'portrait' || value === 'landscape';

const isExportFormat = (value: unknown): value is ExportFormat =>
  value === 'docx' || value === 'pdf' || value === 'both';

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

// Pre-render LaTeX server-side with KaTeX BEFORE marked() to avoid:
//   1. marked treating `_` / `*` inside formulas as italic markers
//   2. Lambda having no internet to load MathJax/KaTeX from CDN
// Uses placeholder tokens so the KaTeX HTML survives marked parsing intact.
const stashMathAsPlaceholders = (text: string): { withPlaceholders: string; rendered: string[] } => {
  const normalized = text
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, expr) => `$${expr}$`)
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, expr) => `$$${expr}$$`);

  const rendered: string[] = [];
  const renderKatex = (expr: string, displayMode: boolean): string => {
    try {
      const html = katex.renderToString(expr.trim(), {
        displayMode,
        throwOnError: false,
        strict: 'ignore',
        output: 'html',
        trust: true,
      });
      rendered.push(displayMode ? `<div class="katex-display-wrapper">${html}</div>` : html);
    } catch {
      rendered.push(displayMode ? `<pre>$$${expr}$$</pre>` : `<code>$${expr}$</code>`);
    }
    return `@@KMATH${rendered.length - 1}@@`;
  };

  // Protect code spans/blocks so `$` inside them isn't treated as math.
  const codeBlocks: string[] = [];
  const codeStashed = normalized
    .replace(/```[\s\S]*?```/g, (m) => `@@CODE${codeBlocks.push(m) - 1}@@`)
    .replace(/`[^`\n]+`/g, (m) => `@@CODE${codeBlocks.push(m) - 1}@@`);

  const mathStashed = codeStashed
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => renderKatex(expr, true))
    .replace(/\$([^\$\n]+?)\$/g, (_, expr) => renderKatex(expr, false));

  const withPlaceholders = mathStashed.replace(/@@CODE(\d+)@@/g, (_, i) => codeBlocks[Number(i)] ?? '');
  return { withPlaceholders, rendered };
};

import pako from 'pako';

function encodeKroki(source: string): string {
  const data = Buffer.from(source, 'utf8');
  const compressed = pako.deflate(data, { level: 9 });
  return Buffer.from(compressed)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function processVisualAids(content: string): Promise<string> {
  let result = content;
  
  // 1. Process SVG (handles both ```xml <svg>``` blocks and inline `xml <svg>`)
  result = result.replace(/(?:```(?:xml|html|svg)\s*)?(?:xml|html)?\s*(<svg[\s\S]*?<\/svg>)(?:\s*```)?/gi, '<div style="text-align: center; margin: 10px 0;">$1</div>');

  // 2. Process TikZ sequentially so Kroki cannot hang Puppeteer page loading.
  const tikzPattern = /(?:```(?:latex|tikz|tex)\s*)?(?:latex|tikz|tex)?\s*(\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\})(?:\s*```)?/gi;
  const tikzMatches = Array.from(result.matchAll(tikzPattern));
  for (const match of tikzMatches) {
    const fullMatch = match[0];
    const tikz = match[1];
    let finalTikz = tikz;
    if (!finalTikz.includes('\\documentclass')) {
      finalTikz = `\\documentclass[tikz,border=2mm]{standalone}\n\\usepackage[dvipsnames]{xcolor}\n\\definecolor{indigo}{RGB}{75,0,130}\n\\usepackage{pgfplots}\n\\pgfplotsset{compat=1.18}\n\\begin{document}\n${finalTikz}\n\\end{document}`;
    }

    const encoded = encodeKroki(finalTikz);
    const url = `https://kroki.io/tikz/svg/${encoded}`;
    let replacement = `<div style="text-align: center; margin: 10px 0; padding: 10px; border: 1px dashed #cbd5e1; color: #475569; font-style: italic;">Hình minh họa TikZ chưa render được do dịch vụ hình ảnh phản hồi chậm hoặc lỗi. Nội dung bài học vẫn đầy đủ.</div>`;

    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error(`Kroki SVG returned ${res.status}`);
      const svgText = await res.text();
      if (!/^\s*<svg[\s\S]*<\/svg>\s*$/i.test(svgText)) {
        throw new Error('Kroki response is not a valid SVG');
      }
      const svgBase64 = Buffer.from(svgText, 'utf8').toString('base64');
      replacement = `<div style="text-align: center; margin: 10px 0;"><img src="data:image/svg+xml;base64,${svgBase64}" style="max-width: 100%; height: auto;" /></div>`;
    } catch (err) {
      console.error('Failed to prefetch kroki SVG:', err);
    }

    result = result.replace(fullMatch, replacement);
  }

  // 3. Process Prompt (handles both ```text prompt ... ``` and inline `prompt ...`)
  result = result.replace(/(?:```\w*\s*)?prompt\s+(.*?)(?=\n|<br\s*\/?>|$)(?:\s*```)?/gi, (match, p) => {
    return `<div style="margin: 10px 0; padding: 10px; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px;"><p style="font-size: 12pt; font-weight: bold; color: #312e81; margin: 0 0 4px 0;">Gợi ý tạo ảnh minh họa (Image Prompt)</p><p style="font-size: 11pt; color: #4338ca; margin: 0; font-style: italic;">${p}</p></div>`;
  });

  return result;
}

const buildHtml = async (title: string, content: string): Promise<string> => {
  const preprocessedForWordAndPdf = preprocessExamMarkdownForWord(content);
  const preprocessedContent = await processVisualAids(preprocessedForWordAndPdf);
  const stash = stashMathAsPlaceholders(preprocessedContent);
  const markedHtml = await marked.parse(stash.withPlaceholders, { async: true, gfm: true, breaks: true });
  let htmlContent = markedHtml.replace(/@@KMATH(\d+)@@/g, (_, i) => stash.rendered[Number(i)] ?? '');
  htmlContent = htmlContent.replace(/<!-- OPTION_GRID -->[\s\S]*?<table>/g, '<table class="option-grid">');
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <style>${KATEX_CSS}</style>
  <style>
    @page { size: A4; margin: 20mm 18mm 20mm 30mm; }
    .katex-display-wrapper { margin: 4pt 0; text-align: center; }
    .katex { font-size: 1em; }
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
    
    table.option-grid, table.option-grid th, table.option-grid td { border: none !important; padding: 2pt 4pt !important; }
    table.option-grid th { background: transparent !important; }
    
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
    page.setDefaultNavigationTimeout(60_000);
    page.setDefaultTimeout(60_000);
    await page.setContent(await buildHtml(title, content), { waitUntil: 'networkidle0', timeout: 60_000 });
    await page.evaluate(async () => {
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
  const format = isExportFormat(payload.format) ? payload.format : 'both';
  const baseFilename = safeFilename(`${title}_${type}`, 'giao-an');

  try {
    if (format === 'docx') {
      const wordBuffer = await renderWordBuffer({ title, content: payload.content, orientation });
      return res.status(200).json({
        word: {
          filename: `${baseFilename}.docx`,
          mimeType: DOCX_MIME_TYPE,
          base64: wordBuffer.toString('base64'),
        },
      });
    }

    if (format === 'pdf') {
      const pdfBuffer = await renderPdfBuffer(title, payload.content, orientation);
      return res.status(200).json({
        pdf: {
          filename: `${baseFilename}.pdf`,
          mimeType: PDF_MIME_TYPE,
          base64: pdfBuffer.toString('base64'),
        },
      });
    }

    // format === 'both' — caller should prefer single-format requests for long lessons
    // to avoid exceeding Vercel's 4.5 MB response limit.
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
