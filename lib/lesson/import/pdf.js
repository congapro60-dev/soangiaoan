import { createHash } from 'node:crypto';
import katex from 'katex';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';

// PDF.js otherwise tries to dynamically import its worker when Workers are unavailable.
// Keep this registration server-only so browser callers retain the normal PDF.js path.
if (typeof window === 'undefined' && typeof document === 'undefined') {
  globalThis.pdfjsWorker = pdfjsWorker;
}

/**
 * PDF Parser Bounds & Security Constants:
 * Strict bounded resource limits to prevent memory exhaustion, DoS, and zip/decompression bombs.
 */
export const PDF_MAX_BYTES = 10 * 1024 * 1024; // 10MB input file limit
export const PDF_MAX_PAGES = 100; // 100 pages maximum limit per document
export const PDF_MAX_TOTAL_TEXT_BYTES = 5 * 1024 * 1024; // 5MB total extracted text limit
export const PDF_MAX_PAGE_TEXT_BYTES = 1 * 1024 * 1024; // 1MB single page text limit

export const ALLOWED_PDF_SEGMENT_KINDS = Object.freeze(new Set([
  'heading',
  'list',
  'paragraph',
  'table',
  'display_math',
  'fenced',
  'fenced_code'
]));

export const ALLOWED_PDF_EXTRACTION_KEYS = Object.freeze(new Set([
  'schemaVersion',
  'id',
  'kind',
  'originalName',
  'sha256',
  'bytes',
  'status',
  'segments',
  'uncertainties',
  'warnings'
]));

/**
 * Checks whether the pdfjs-dist runtime is functional and available.
 *
 * @returns {boolean}
 */
export function isPdfjsAvailable() {
  return typeof pdfjsLib !== 'undefined' &&
    pdfjsLib !== null &&
    typeof pdfjsLib.getDocument === 'function';
}

/**
 * Reports whether the statically bundled worker handler is registered for server parsing.
 *
 * @returns {boolean}
 */
export function isPdfjsWorkerHandlerAvailable() {
  return typeof globalThis.pdfjsWorker?.WorkerMessageHandler === 'object' ||
    typeof globalThis.pdfjsWorker?.WorkerMessageHandler === 'function';
}

/**
 * Deep freezes an object recursively to enforce complete immutability.
 *
 * @template T
 * @param {T} obj
 * @returns {Readonly<T>}
 */
function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const val = /** @type {Record<string, unknown>} */ (obj)[key];
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

/**
 * Calculates 1-based line number for a character offset in text.
 *
 * @param {string} text
 * @param {number} offset
 * @returns {number}
 */
function getLineNumber(text, offset) {
  let line = 1;
  const limit = Math.min(offset, text.length);
  for (let i = 0; i < limit; i++) {
    if (text[i] === '\n') {
      line++;
    }
  }
  return line;
}

/**
 * Creates an independent clone of a byte array to protect caller buffers from detachment.
 *
 * @param {Uint8Array} source
 * @returns {Uint8Array}
 */
function cloneBytes(source) {
  const dest = new Uint8Array(source.byteLength);
  dest.set(new Uint8Array(source.buffer, source.byteOffset, source.byteLength));
  return dest;
}

/**
 * Normalizes user input into a standardized byte payload and configuration object.
 * Worker-safe: accepts Uint8Array, Buffer, ArrayBuffer, or structured input.
 *
 * @param {unknown} input
 * @returns {{ bytes: Uint8Array, originalName: string, maxBytes?: number, maxPages?: number, maxTotalTextBytes?: number, maxPageTextBytes?: number } | null}
 */
function normalizeInput(input) {
  if (!input) return null;

  if (input instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(input))) {
    const buf = /** @type {Uint8Array} */ (input);
    return {
      bytes: cloneBytes(buf),
      originalName: 'document.pdf'
    };
  }

  if (input instanceof ArrayBuffer) {
    return {
      bytes: cloneBytes(new Uint8Array(input)),
      originalName: 'document.pdf'
    };
  }

  if (typeof input === 'object') {
    const raw = /** @type {Record<string, unknown>} */ (input);
    const data = raw.bytes || raw.buffer || raw.data;
    let bytes = null;

    if (data instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(data))) {
      const b = /** @type {Uint8Array} */ (data);
      bytes = cloneBytes(b);
    } else if (data instanceof ArrayBuffer) {
      bytes = cloneBytes(new Uint8Array(data));
    }

    if (!bytes) return null;

    const originalName = typeof raw.originalName === 'string' && raw.originalName.trim().length > 0
      ? raw.originalName.trim()
      : 'document.pdf';

    return {
      bytes,
      originalName,
      maxBytes: typeof raw.maxBytes === 'number' ? raw.maxBytes : undefined,
      maxPages: typeof raw.maxPages === 'number' ? raw.maxPages : undefined,
      maxTotalTextBytes: typeof raw.maxTotalTextBytes === 'number' ? raw.maxTotalTextBytes : undefined,
      maxPageTextBytes: typeof raw.maxPageTextBytes === 'number' ? raw.maxPageTextBytes : undefined
    };
  }

  return null;
}

/**
 * Validates input parameters for PDF extraction.
 *
 * @param {unknown} input
 * @param {Record<string, unknown>} [options]
 * @returns {{ ok: boolean, status?: string, errors: Array<{code: string, path: string, message: string}> }}
 */
export function validatePdfInput(input, options = {}) {
  const errors = [];
  const normalized = normalizeInput(input);

  if (!normalized) {
    return {
      ok: false,
      status: 'error',
      errors: [{
        code: 'INVALID_INPUT',
        path: '',
        message: 'Input must be a Uint8Array, Buffer, ArrayBuffer, or an object with bytes/buffer property'
      }]
    };
  }

  const effectiveMaxBytes = options.maxBytes ?? normalized.maxBytes ?? PDF_MAX_BYTES;
  if (typeof effectiveMaxBytes !== 'number' || effectiveMaxBytes <= 0) {
    errors.push({
      code: 'INVALID_MAX_BYTES',
      path: 'maxBytes',
      message: 'maxBytes must be a positive number'
    });
  } else if (normalized.bytes.length > effectiveMaxBytes) {
    errors.push({
      code: 'MAX_BYTES_EXCEEDED',
      path: 'bytes',
      message: `PDF file size (${normalized.bytes.length} bytes) exceeds maximum limit (${effectiveMaxBytes} bytes)`
    });
  }

  // Check PDF magic header '%PDF-' (0x25, 0x50, 0x44, 0x46, 0x2D)
  if (normalized.bytes.length < 5 ||
      normalized.bytes[0] !== 0x25 || // '%'
      normalized.bytes[1] !== 0x50 || // 'P'
      normalized.bytes[2] !== 0x44 || // 'D'
      normalized.bytes[3] !== 0x46 || // 'F'
      normalized.bytes[4] !== 0x2d) { // '-'
    errors.push({
      code: 'INVALID_PDF_SIGNATURE',
      path: 'bytes',
      message: 'Input does not start with valid PDF magic header (%PDF-)'
    });
  }

  return {
    ok: errors.length === 0,
    status: errors.length === 0 ? 'ok' : 'error',
    errors
  };
}

/**
 * Capability detector for PDF import format.
 * Reports supported status when pdfjs-dist is operational;
 * preserves explicit fallback otherwise.
 *
 * @param {unknown} input
 * @returns {{ ok: boolean, supported: boolean, format?: string, fallback?: string | null, manualPasteFallback?: boolean, message: string }}
 */
export function detectCapability(input) {
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      supported: false,
      message: 'Input must be a non-null object'
    };
  }

  const kind = typeof (/** @type {any} */ (input).kind) === 'string'
    ? /** @type {any} */ (input).kind.toLowerCase()
    : '';
  const name = typeof (/** @type {any} */ (input).originalName) === 'string'
    ? /** @type {any} */ (input).originalName.toLowerCase()
    : '';

  const isPdf = kind === 'pdf' ||
    kind === 'application/pdf' ||
    /\.pdf$/i.test(name);

  if (isPdf) {
    if (isPdfjsAvailable()) {
      return {
        ok: true,
        supported: true,
        format: 'pdf',
        fallback: null,
        manualPasteFallback: false,
        message: 'PDF binary format is fully supported for deterministic extraction.'
      };
    }
    return {
      ok: false,
      supported: false,
      format: 'pdf',
      fallback: 'manual_paste',
      manualPasteFallback: true,
      message: 'PDF parser runtime is unavailable. Please use manual paste fallback.'
    };
  }

  if (kind === 'docx' ||
      kind === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      /\.docx$/i.test(name)) {
    return {
      ok: true,
      supported: true,
      format: 'docx',
      fallback: null,
      manualPasteFallback: false,
      message: 'DOCX binary format is supported.'
    };
  }

  return {
    ok: false,
    supported: false,
    format: kind || 'unknown',
    fallback: 'manual_paste',
    manualPasteFallback: true,
    message: `Format "${kind}" is unsupported. Please use manual paste fallback.`
  };
}

/**
 * Validates math syntax using KaTeX without throwing.
 *
 * @param {string} expr
 * @param {boolean} isDisplay
 * @param {string} segId
 * @param {number} offset
 * @param {string} fullText
 * @param {Array<Record<string, unknown>>} uncertainties
 */
function validateKatexMath(expr, isDisplay, segId, offset, fullText, uncertainties) {
  if (!katex || typeof katex.renderToString !== 'function') return;
  try {
    katex.renderToString(expr.trim(), {
      throwOnError: true,
      displayMode: isDisplay
    });
  } catch (err) {
    uncertainties.push({
      id: `unc-${uncertainties.length + 1}`,
      kind: 'invalid_math_syntax',
      type: 'invalid_math_syntax',
      segmentId: segId,
      delimiter: isDisplay ? '$$' : '$',
      message: `LaTeX formula syntax error: ${err instanceof Error ? err.message : String(err)}`,
      offset,
      line: getLineNumber(fullText, offset),
      raw: expr
    });
  }
}

/**
 * Scans segment text for inline and display math expressions.
 * Detects malformed/unclosed delimiters and syntax errors while leaving the source formula string intact.
 *
 * @param {{id: string, start: number, text: string}} seg
 * @param {string} fullText
 * @param {Array<Record<string, unknown>>} uncertainties
 */
function scanMathUncertainties(seg, fullText, uncertainties) {
  const str = seg.text;
  const len = str.length;
  let i = 0;

  function countBackslashes(idx) {
    let c = 0;
    for (let j = idx - 1; j >= 0 && str[j] === '\\'; j--) c++;
    return c;
  }

  while (i < len) {
    // Escaped dollar in text (\$): not a delimiter
    if (str[i] === '\\' && str[i + 1] === '$' && countBackslashes(i) % 2 === 0) {
      i += 2;
      continue;
    }

    // \( ... \) inline math
    if (str[i] === '\\' && str[i + 1] === '(' && countBackslashes(i) % 2 === 0) {
      const openOffset = seg.start + i;
      const start = i + 2;
      let closeIdx = -1;
      for (let j = start; j < len; j++) {
        if (str.startsWith('\\)', j) && countBackslashes(j) % 2 === 0) {
          closeIdx = j;
          break;
        }
      }
      if (closeIdx === -1) {
        const nextNl = str.indexOf('\n', i);
        const raw = nextNl === -1 ? str.slice(i) : str.slice(i, nextNl);
        uncertainties.push({
          id: `unc-${uncertainties.length + 1}`,
          kind: 'math_delimiter_malformed',
          type: 'math_delimiter_malformed',
          segmentId: seg.id,
          delimiter: '\\(',
          message: 'Unclosed inline math delimiter "\\(" detected',
          offset: openOffset,
          line: getLineNumber(fullText, openOffset),
          raw
        });
        i += 2;
        continue;
      } else {
        validateKatexMath(str.slice(start, closeIdx), false, seg.id, openOffset, fullText, uncertainties);
        i = closeIdx + 2;
        continue;
      }
    }

    // \[ ... \] display math
    if (str[i] === '\\' && str[i + 1] === '[' && countBackslashes(i) % 2 === 0) {
      const openOffset = seg.start + i;
      const start = i + 2;
      let closeIdx = -1;
      for (let j = start; j < len; j++) {
        if (str.startsWith('\\]', j) && countBackslashes(j) % 2 === 0) {
          closeIdx = j;
          break;
        }
      }
      if (closeIdx === -1) {
        const nextNl = str.indexOf('\n', i);
        const raw = nextNl === -1 ? str.slice(i) : str.slice(i, nextNl);
        uncertainties.push({
          id: `unc-${uncertainties.length + 1}`,
          kind: 'math_delimiter_malformed',
          type: 'math_delimiter_malformed',
          segmentId: seg.id,
          delimiter: '\\[',
          message: 'Unclosed display math delimiter "\\[" detected',
          offset: openOffset,
          line: getLineNumber(fullText, openOffset),
          raw
        });
        i += 2;
        continue;
      } else {
        validateKatexMath(str.slice(start, closeIdx), true, seg.id, openOffset, fullText, uncertainties);
        i = closeIdx + 2;
        continue;
      }
    }

    // $$ ... $$ display math
    if (str[i] === '$' && str[i + 1] === '$' && countBackslashes(i) % 2 === 0) {
      const openOffset = seg.start + i;
      const start = i + 2;
      let closeIdx = -1;
      for (let j = start; j < len; j++) {
        if (str.startsWith('$$', j) && countBackslashes(j) % 2 === 0) {
          closeIdx = j;
          break;
        }
      }
      if (closeIdx === -1) {
        const nextNl = str.indexOf('\n', i);
        const raw = nextNl === -1 ? str.slice(i) : str.slice(i, nextNl);
        uncertainties.push({
          id: `unc-${uncertainties.length + 1}`,
          kind: 'math_delimiter_malformed',
          type: 'math_delimiter_malformed',
          segmentId: seg.id,
          delimiter: '$$',
          message: 'Unclosed display math delimiter "$$" detected',
          offset: openOffset,
          line: getLineNumber(fullText, openOffset),
          raw
        });
        i += 2;
        continue;
      } else {
        validateKatexMath(str.slice(start, closeIdx), true, seg.id, openOffset, fullText, uncertainties);
        i = closeIdx + 2;
        continue;
      }
    }

    // $ ... $ inline math
    if (str[i] === '$' && countBackslashes(i) % 2 === 0) {
      const openOffset = seg.start + i;
      const start = i + 1;
      let closeIdx = -1;
      for (let j = start; j < len; j++) {
        if (str[j] === '$' && countBackslashes(j) % 2 === 0) {
          closeIdx = j;
          break;
        }
      }
      if (closeIdx === -1) {
        const nextNl = str.indexOf('\n', i);
        const raw = nextNl === -1 ? str.slice(i) : str.slice(i, nextNl);
        uncertainties.push({
          id: `unc-${uncertainties.length + 1}`,
          kind: 'math_delimiter_malformed',
          type: 'math_delimiter_malformed',
          segmentId: seg.id,
          delimiter: '$',
          message: 'Unclosed inline math delimiter "$" detected',
          offset: openOffset,
          line: getLineNumber(fullText, openOffset),
          raw
        });
        i += 1;
        continue;
      } else {
        validateKatexMath(str.slice(start, closeIdx), false, seg.id, openOffset, fullText, uncertainties);
        i = closeIdx + 1;
        continue;
      }
    }

    i++;
  }
}

/**
 * Extracts and clusters TextItems from a single PDF page into ordered reading lines.
 *
 * @param {Array<any>} items
 * @param {number} pageNum
 * @returns {Array<{ text: string, y: number, x: number, fontSize: number, height: number, pageNumber: number }>}
 */
function extractPageLines(items, pageNum) {
  if (!items || items.length === 0) return [];

  // Filter valid items that contain non-empty string content
  const validItems = [];
  for (const item of items) {
    if (!item || typeof item.str !== 'string') continue;
    // transform: [scaleX, skewY, skewX, scaleY, tx, ty]
    const transform = Array.isArray(item.transform) ? item.transform : [1, 0, 0, 1, 0, 0];
    const x = transform[4] ?? 0;
    const y = transform[5] ?? 0;
    const fontSize = Math.abs(transform[3] ?? 12);
    const height = item.height || fontSize;
    const width = item.width || 0;

    validItems.push({
      str: item.str,
      x,
      y,
      fontSize,
      height,
      width,
      hasEOL: Boolean(item.hasEOL)
    });
  }

  if (validItems.length === 0) return [];

  // Sort items primarily by vertical coordinate Y descending (top to bottom)
  // and secondarily by horizontal coordinate X ascending (left to right)
  validItems.sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > 3) {
      return yDiff;
    }
    return a.x - b.x;
  });

  // Group items into lines based on Y coordinate tolerance
  const lines = [];
  let currentLine = null;

  for (const item of validItems) {
    if (!currentLine) {
      currentLine = {
        items: [item],
        y: item.y,
        x: item.x,
        fontSize: item.fontSize,
        height: item.height,
        pageNumber: pageNum
      };
      continue;
    }

    const yDelta = Math.abs(currentLine.y - item.y);
    const lineTolerance = Math.max(3, currentLine.fontSize * 0.35);

    if (yDelta <= lineTolerance) {
      currentLine.items.push(item);
      currentLine.fontSize = Math.max(currentLine.fontSize, item.fontSize);
      currentLine.height = Math.max(currentLine.height, item.height);
    } else {
      lines.push(currentLine);
      currentLine = {
        items: [item],
        y: item.y,
        x: item.x,
        fontSize: item.fontSize,
        height: item.height,
        pageNumber: pageNum
      };
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  // Assemble text for each line, inserting whitespace between separated items
  const resultLines = [];
  for (const line of lines) {
    // Sort items left-to-right within the line
    line.items.sort((a, b) => a.x - b.x);

    let lineText = '';
    let lastRight = null;

    for (let idx = 0; idx < line.items.length; idx++) {
      const it = line.items[idx];
      const str = it.str;

      if (idx > 0 && lastRight !== null) {
        const gap = it.x - lastRight;
        const needsSpace = gap > (it.fontSize * 0.2) &&
          !lineText.endsWith(' ') &&
          !str.startsWith(' ');
        if (needsSpace) {
          lineText += ' ';
        }
      }

      lineText += str;
      lastRight = it.x + it.width;
    }

    const trimmed = lineText.trim();
    if (trimmed.length > 0) {
      resultLines.push({
        text: trimmed,
        y: line.y,
        x: line.x,
        fontSize: line.fontSize,
        height: line.height,
        pageNumber: line.pageNumber
      });
    }
  }

  return resultLines;
}

/**
 * Groups lines into structured text blocks (headings, lists, display math, tables, paragraphs).
 *
 * @param {Array<{ text: string, y: number, x: number, fontSize: number, height: number, pageNumber: number }>} allLines
 * @returns {Array<{ kind: string, text: string, pageStart: number, pageEnd: number, y: number }>}
 */
function clusterLinesIntoBlocks(allLines) {
  if (allLines.length === 0) return [];

  // Compute median font size for relative heading detection
  const fontSizes = allLines.map(l => l.fontSize).sort((a, b) => a - b);
  const medianFontSize = fontSizes[Math.floor(fontSizes.length / 2)] || 12;

  const blocks = [];
  let currentBlock = null;

  for (let idx = 0; idx < allLines.length; idx++) {
    const line = allLines[idx];
    const text = line.text;

    // 1. Heading check: explicit ATX markdown heading or prominent font size
    const atxMatch = text.match(/^\s{0,3}(#{1,6})(\s+.*)?$/);
    const isFontHeading = line.fontSize >= medianFontSize * 1.25 && text.length < 120 && !text.endsWith('.');
    const isHeading = atxMatch || isFontHeading;

    // 2. Display math check: starts with $$ or \[
    const isDisplayMath = text.startsWith('$$') || text.startsWith('\\[');

    // 3. List check: begins with bullet or ordered number
    const isList = /^\s{0,3}(?:[*+-]|\d+[.)])\s+/.test(text);

    // 4. Markdown table delimiter row check
    const isTable = text.includes('|');

    // Determine target kind for this line
    let lineKind = 'paragraph';
    let formattedText = text;

    if (isDisplayMath) {
      lineKind = 'display_math';
    } else if (isHeading) {
      lineKind = 'heading';
      if (!atxMatch) {
        // Synthesize heading prefix based on font scale
        const level = line.fontSize >= medianFontSize * 1.5 ? 1 : 2;
        formattedText = `${'#'.repeat(level)} ${text}`;
      }
    } else if (isList) {
      lineKind = 'list';
    } else if (isTable) {
      lineKind = 'table';
    }

    if (!currentBlock) {
      currentBlock = {
        kind: lineKind,
        lines: [formattedText],
        pageStart: line.pageNumber,
        pageEnd: line.pageNumber,
        lastY: line.y,
        lastPage: line.pageNumber,
        fontSize: line.fontSize
      };
      continue;
    }

    // Determine if line belongs to current block or starts a new block
    const isSamePage = currentBlock.lastPage === line.pageNumber;
    const verticalGap = isSamePage ? (currentBlock.lastY - line.y) : 999;
    const isSignificantGap = verticalGap > Math.max(20, line.fontSize * 2.2);

    // Headings and display math always start their own distinct block
    if (lineKind === 'heading' || lineKind === 'display_math' || currentBlock.kind === 'heading' || currentBlock.kind === 'display_math') {
      blocks.push(finalizeBlock(currentBlock));
      currentBlock = {
        kind: lineKind,
        lines: [formattedText],
        pageStart: line.pageNumber,
        pageEnd: line.pageNumber,
        lastY: line.y,
        lastPage: line.pageNumber,
        fontSize: line.fontSize
      };
      continue;
    }

    // Different kind (e.g. list vs paragraph vs table) or page boundary with gap
    if (currentBlock.kind !== lineKind || isSignificantGap) {
      blocks.push(finalizeBlock(currentBlock));
      currentBlock = {
        kind: lineKind,
        lines: [formattedText],
        pageStart: line.pageNumber,
        pageEnd: line.pageNumber,
        lastY: line.y,
        lastPage: line.pageNumber,
        fontSize: line.fontSize
      };
      continue;
    }

    // Append to current block
    currentBlock.lines.push(formattedText);
    currentBlock.pageEnd = line.pageNumber;
    currentBlock.lastY = line.y;
    currentBlock.lastPage = line.pageNumber;
  }

  if (currentBlock) {
    blocks.push(finalizeBlock(currentBlock));
  }

  return blocks;
}

/**
 * Finalizes raw clustered block lines into a normalized block record.
 *
 * @param {{ kind: string, lines: Array<string>, pageStart: number, pageEnd: number, lastY: number }} raw
 * @returns {{ kind: string, text: string, pageStart: number, pageEnd: number }}
 */
function finalizeBlock(raw) {
  let joinedText = '';
  if (raw.kind === 'list' || raw.kind === 'table') {
    joinedText = raw.lines.join('\n');
  } else {
    joinedText = raw.lines.join(' ');
  }

  return {
    kind: raw.kind,
    text: joinedText.trim(),
    pageStart: raw.pageStart,
    pageEnd: raw.pageEnd
  };
}

/**
 * Validates a SourceExtraction object produced by PDF importer.
 *
 * @param {unknown} extraction
 * @param {Uint8Array} [originalBytes]
 * @returns {{ ok: boolean, errors: Array<{code: string, path: string, message: string}> }}
 */
export function validatePdfExtraction(extraction, originalBytes) {
  const errors = [];

  if (!extraction || typeof extraction !== 'object' || Array.isArray(extraction)) {
    return {
      ok: false,
      errors: [{ code: 'INVALID_EXTRACTION', path: '', message: 'SourceExtraction must be a non-null object' }]
    };
  }

  const ext = /** @type {Record<string, any>} */ (extraction);

  for (const key of Object.keys(ext)) {
    if (!ALLOWED_PDF_EXTRACTION_KEYS.has(key)) {
      errors.push({ code: 'UNKNOWN_EXTRACTION_KEY', path: key, message: `Unknown SourceExtraction key: ${key}` });
    }
  }

  if (ext.schemaVersion !== '1.0.0') {
    errors.push({ code: 'INVALID_SCHEMA_VERSION', path: 'schemaVersion', message: 'schemaVersion must be "1.0.0"' });
  }

  if (ext.kind !== 'pdf') {
    errors.push({ code: 'INVALID_KIND', path: 'kind', message: 'kind must be "pdf"' });
  }

  if (typeof ext.id !== 'string' || !ext.id.startsWith('src-')) {
    errors.push({ code: 'INVALID_ID', path: 'id', message: 'id must be a string starting with src-' });
  }

  if (typeof ext.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(ext.sha256)) {
    errors.push({ code: 'INVALID_SHA256', path: 'sha256', message: 'sha256 must be a 64-char lowercase hex string' });
  }

  if (typeof ext.bytes !== 'number' || ext.bytes < 0) {
    errors.push({ code: 'INVALID_BYTES', path: 'bytes', message: 'bytes must be a non-negative integer' });
  }

  if (ext.status !== 'needs_review') {
    errors.push({ code: 'INVALID_STATUS', path: 'status', message: 'status must be "needs_review"' });
  }

  if (!Array.isArray(ext.segments)) {
    errors.push({ code: 'INVALID_SEGMENTS', path: 'segments', message: 'segments must be an array' });
  } else {
    let lastEnd = 0;
    for (let i = 0; i < ext.segments.length; i++) {
      const seg = ext.segments[i];
      const prefix = `segments[${i}]`;

      if (!seg || typeof seg !== 'object') {
        errors.push({ code: 'INVALID_SEGMENT', path: prefix, message: 'Segment must be an object' });
        continue;
      }

      if (!ALLOWED_PDF_SEGMENT_KINDS.has(seg.kind)) {
        errors.push({ code: 'INVALID_SEGMENT_KIND', path: `${prefix}.kind`, message: `Invalid kind: ${seg.kind}` });
      }

      if (typeof seg.text !== 'string') {
        errors.push({ code: 'INVALID_SEGMENT_TEXT', path: `${prefix}.text`, message: 'text must be string' });
      }

      if (typeof seg.start !== 'number' || seg.start < 0) {
        errors.push({ code: 'INVALID_SEGMENT_START', path: `${prefix}.start`, message: 'start must be non-negative integer' });
      }

      if (typeof seg.end !== 'number' || seg.end < seg.start) {
        errors.push({ code: 'INVALID_SEGMENT_END', path: `${prefix}.end`, message: 'end must be >= start' });
      }

      if (seg.end - seg.start !== seg.text.length) {
        errors.push({ code: 'SPAN_LENGTH_MISMATCH', path: prefix, message: 'Span length does not match text length' });
      }

      if (seg.start < lastEnd) {
        errors.push({ code: 'OVERLAPPING_SEGMENT', path: `${prefix}.start`, message: 'Segment overlaps previous segment' });
      }
      lastEnd = seg.end;

      // Validate location metadata on segment
      const loc = seg.pdfLocation;
      if (!loc || typeof loc !== 'object' || typeof loc.pageNumber !== 'number' || loc.pageNumber < 1) {
        errors.push({ code: 'INVALID_LOCATION_METADATA', path: `${prefix}.pdfLocation`, message: 'Segment must have valid pdfLocation metadata with pageNumber >= 1' });
      }
    }
  }

  if (!Array.isArray(ext.uncertainties)) {
    errors.push({ code: 'INVALID_UNCERTAINTIES', path: 'uncertainties', message: 'uncertainties must be an array' });
  }

  if (!Array.isArray(ext.warnings)) {
    errors.push({ code: 'INVALID_WARNINGS', path: 'warnings', message: 'warnings must be an array' });
  }

  if (originalBytes instanceof Uint8Array) {
    const expectedSha256 = createHash('sha256').update(originalBytes).digest('hex');
    if (ext.sha256 !== expectedSha256) {
      errors.push({ code: 'SHA256_MISMATCH', path: 'sha256', message: 'sha256 does not match original bytes' });
    }
    if (ext.bytes !== originalBytes.byteLength) {
      errors.push({ code: 'BYTES_MISMATCH', path: 'bytes', message: 'bytes does not match original bytes length' });
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

/**
 * Primary PDF Importer:
 * - Worker-safe: accepts Uint8Array or ArrayBuffer; operates purely in-memory.
 * - Enforces strict byte, page count, and extracted text limits before allocation.
 * - Extracts deterministic text layout segments (headings, lists, math, tables, paragraphs).
 * - Tracks exact character offsets, line spans, and page location metadata.
 * - Calculates cryptographic SHA-256 on original binary bytes.
 * - Explicitly marks image-only pages with OCR_REQUIRED uncertainties.
 * - Captures math uncertainties for invalid or unclosed formulas via KaTeX validation.
 * - Returns structured error results for encrypted, malformed, or oversized documents.
 * - Never invents learning objectives, tasks, or answers; makes zero network, storage, or AI calls.
 * - Deeply freezes final SourceExtraction output.
 *
 * @param {unknown} input
 * @param {Record<string, unknown>} [options]
 * @returns {Promise<Record<string, unknown>>} SourceExtraction or structured error result
 */
export async function importPdf(input, options = {}) {
  // Validate input parameters and binary signature
  const valResult = validatePdfInput(input, options);
  if (!valResult.ok) {
    return valResult;
  }

  if (!isPdfjsAvailable()) {
    return {
      ok: false,
      status: 'unsupported_format',
      code: 'UNSUPPORTED_FORMAT',
      fallback: 'manual_paste',
      manualPasteFallback: true,
      message: 'PDF parser runtime is unavailable. Please use manual paste fallback.',
      errors: [{
        code: 'UNSUPPORTED_FORMAT',
        path: '',
        message: 'PDF parsing is unsupported in current runtime. Use manual paste fallback.'
      }]
    };
  }

  const normalized = normalizeInput(input);
  if (!normalized) {
    return {
      ok: false,
      status: 'error',
      errors: [{ code: 'INVALID_INPUT', path: '', message: 'Failed to normalize input' }]
    };
  }

  const originalBytes = normalized.bytes;
  const originalName = normalized.originalName;

  // Cryptographic hash of original binary bytes
  const sha256 = createHash('sha256').update(originalBytes).digest('hex');
  const bytes = originalBytes.byteLength;
  const id = `src-${sha256.slice(0, 16)}`;

  // Bounded execution limits
  const maxPages = options.maxPages ?? normalized.maxPages ?? PDF_MAX_PAGES;
  const maxTotalTextBytes = options.maxTotalTextBytes ?? normalized.maxTotalTextBytes ?? PDF_MAX_TOTAL_TEXT_BYTES;
  const maxPageTextBytes = options.maxPageTextBytes ?? normalized.maxPageTextBytes ?? PDF_MAX_PAGE_TEXT_BYTES;

  // Load PDF document using pdfjs-dist in worker-safe / eval-free mode
  let loadingTask;
  let doc;
  try {
  try {
    loadingTask = pdfjsLib.getDocument({
      data: cloneBytes(originalBytes),
      disableWorker: true,
      isEvalSupported: false,
      useSystemFonts: true,
      verbosity: 0
    });
    doc = await loadingTask.promise;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const errName = err && typeof err === 'object' && 'name' in err ? String(err.name) : '';

    if (errName === 'PasswordException' || /password/i.test(msg) || /encrypt/i.test(msg)) {
      return {
        ok: false,
        status: 'error',
        errors: [{
          code: 'ENCRYPTED_PDF',
          path: 'bytes',
          message: 'PDF document is password-protected or encrypted. Decrypt or remove password before importing.'
        }]
      };
    }

    if (errName === 'InvalidPDFException' || /invalid\s*pdf/i.test(msg) || /corrupt/i.test(msg)) {
      return {
        ok: false,
        status: 'error',
        errors: [{
          code: 'CORRUPTED_PDF',
          path: 'bytes',
          message: `Invalid or corrupted PDF document: ${msg}`
        }]
      };
    }

    return {
      ok: false,
      status: 'error',
      errors: [{
        code: 'PDF_PARSE_ERROR',
        path: 'bytes',
        message: `Failed to parse PDF document: ${msg}`
      }]
    };
  }

  // Check page count limit
  const numPages = doc.numPages;
  if (numPages > maxPages) {
    return {
      ok: false,
      status: 'error',
      errors: [{
        code: 'MAX_PAGES_EXCEEDED',
        path: 'pages',
        message: `PDF page count (${numPages}) exceeds maximum allowed limit (${maxPages})`
      }]
    };
  }

  const uncertainties = [];
  const warnings = [];
  const allExtractedLines = [];
  const textEncoder = new TextEncoder();
  let cumulativeTextBytes = 0;
  let emptyPageCount = 0;
  let failedPageCount = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    let textContent;
    try {
      const page = await doc.getPage(pageNum);
      textContent = await page.getTextContent();
    } catch {
      failedPageCount++;
      const message = `Failed to read text from page ${pageNum}.`;
      uncertainties.push({
        id: `unc-${uncertainties.length + 1}`,
        kind: 'page_read_error',
        type: 'page_read_error',
        page: pageNum,
        message,
        pdfLocation: { pageNumber: pageNum }
      });
      warnings.push(message);
      continue;
    }

    const items = textContent && Array.isArray(textContent.items) ? textContent.items : [];
    const pageLines = extractPageLines(items, pageNum);

    // Compute text length for bounded limits check
    const pageTextLen = pageLines.reduce((acc, l) => acc + textEncoder.encode(l.text).byteLength, 0);

    if (pageTextLen > maxPageTextBytes) {
      return {
        ok: false,
        status: 'error',
        errors: [{
          code: 'MAX_PAGE_TEXT_EXCEEDED',
          path: `pages[${pageNum}]`,
          message: `Extracted text size on page ${pageNum} (${pageTextLen} bytes) exceeds limit (${maxPageTextBytes} bytes)`
        }]
      };
    }

    cumulativeTextBytes += pageTextLen;
    if (cumulativeTextBytes > maxTotalTextBytes) {
      return {
        ok: false,
        status: 'error',
        errors: [{
          code: 'MAX_TOTAL_TEXT_EXCEEDED',
          path: 'text',
          message: `Cumulative extracted text size (${cumulativeTextBytes} bytes) exceeds limit (${maxTotalTextBytes} bytes)`
        }]
      };
    }

    // Check for image-only / scanned pages requiring OCR
    if (pageLines.length === 0) {
      emptyPageCount++;
      uncertainties.push({
        id: `unc-${uncertainties.length + 1}`,
        kind: 'ocr_required',
        type: 'ocr_required',
        page: pageNum,
        message: `Page ${pageNum} contains no extractable text (image-only or scanned page). OCR is required to extract content.`,
        pdfLocation: {
          pageNumber: pageNum
        }
      });
      warnings.push(`Page ${pageNum} is image-only or lacks extractable text; marked OCR_REQUIRED.`);
    } else {
      for (const line of pageLines) {
        allExtractedLines.push(line);
      }
    }
  }

  if (numPages > 0 && failedPageCount === numPages) {
    return {
      ok: false,
      status: 'error',
      errors: [{ code: 'PDF_PAGE_READ_ERROR', path: 'pages', message: 'Failed to read text from every PDF page.' }]
    };
  }

  if (emptyPageCount === numPages && numPages > 0) {
    warnings.push('Document contains no extractable text layers across all pages. OCR is required.');
  }

  // Cluster lines into semantic blocks
  const rawBlocks = clusterLinesIntoBlocks(allExtractedLines);

  // Assemble full reconstructed text and compute exact character spans
  const fullTextParts = [];
  const segments = [];
  let curOffset = 0;

  for (let i = 0; i < rawBlocks.length; i++) {
    const block = rawBlocks[i];
    if (i > 0) {
      fullTextParts.push('\n\n');
      curOffset += 2;
    }
    const start = curOffset;
    fullTextParts.push(block.text);
    const end = start + block.text.length;
    curOffset = end;

    const partialText = fullTextParts.join('');
    const lineStart = getLineNumber(partialText, start);
    const lineEnd = getLineNumber(partialText, end > start ? end - 1 : start);

    const seg = {
      id: `seg-${segments.length + 1}`,
      kind: block.kind,
      text: block.text,
      start,
      end,
      lineStart,
      lineEnd
    };

    // Attach non-enumerable location metadata
    Object.defineProperty(seg, 'pdfLocation', {
      value: Object.freeze({
        pageNumber: block.pageStart,
        pageSpan: {
          start: block.pageStart,
          end: block.pageEnd
        }
      }),
      enumerable: false,
      configurable: false,
      writable: false
    });

    Object.defineProperty(seg, 'pageNumber', {
      value: block.pageStart,
      enumerable: false,
      configurable: false,
      writable: false
    });

    segments.push(seg);

    // Validate math formulas in segment text
    scanMathUncertainties(seg, partialText, uncertainties);
  }

  const fullText = fullTextParts.join('');

  const extraction = {
    schemaVersion: '1.0.0',
    id,
    kind: 'pdf',
    originalName,
    sha256,
    bytes,
    status: 'needs_review',
    segments,
    uncertainties,
    warnings
  };

  // Define non-enumerable helper properties
  Object.defineProperty(extraction, 'ok', {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false
  });

  Object.defineProperty(extraction, 'text', {
    value: fullText,
    enumerable: false,
    configurable: false,
    writable: false
  });

  return deepFreeze(extraction);
  } finally {
    try {
      await loadingTask?.destroy();
    } catch {
      // Preserve the extraction or primary parse error if PDF.js cleanup also fails.
    }
  }
}
