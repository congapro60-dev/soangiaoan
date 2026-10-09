import { createHash } from 'node:crypto';
import katex from 'katex';
import {
  DEFAULT_MAX_BYTES,
  detectUnsupportedBinaryFormat,
  validateImportInput
} from './validate.js';

export { DEFAULT_MAX_BYTES };

/**
 * FUTURE PARSER PATH (DOCX / PDF IMPORTER ARCHITECTURE):
 * -------------------------------------------------------
 * Full DOCX and PDF parsing is intentionally deferred to later slices (e.g., P5.2+).
 *
 * 1. DOCX Parser Path:
 *    - In a future slice, integrate a zero-dependency, worker-safe OpenXML parser
 *      (e.g., streaming JSZip / unzlib + XML SAX / DOM parser without external native binaries).
 *    - Pipeline:
 *      a) Decompress package and parse `word/document.xml`, `word/_rels/document.xml.rels`, and `word/styles.xml`.
 *      b) Map XML structures to SourceExtraction segments:
 *         - `<w:pStyle w:val="Heading1..6"/>` -> Heading segments.
 *         - `<w:tbl>` -> Table segments preserving row/col matrix.
 *         - `<w:numPr>` -> List segments preserving numbering hierarchy.
 *         - `<w:r>` (runs) with math:
 *           - Native OMML (`<m:oMath>` / `<m:oMathPara>`): Convert Office Math Markup to standard LaTeX.
 *           - MathType OLE binary objects (`word/embeddings/oleObject*.bin`): Transpile MTEF to LaTeX.
 *         - Retain exact character offsets by projecting XML character offsets into reconstructed plain source.
 *      c) Emit normalized SourceExtraction segments with character and line offsets, preserving raw text.
 *
 * 2. PDF Parser Path:
 *    - In a future slice, integrate a canvas-free PDF text layout extractor (e.g. pdfjs-dist worker-safe build).
 *    - Pipeline:
 *      a) Parse font dictionaries and font encoding maps (ToUnicode CMap).
 *      b) Extract TextItems with geometric bounding boxes `(x, y, width, height)`.
 *      c) Sort TextItems reading order (top-to-bottom, left-to-right, multi-column layout detection).
 *      d) Cluster lines into paragraphs, detect font-size deltas for headings, detect tabular column alignments.
 *      e) Math formulas in PDF: Detect formula regions via sub/superscript baseline jumps and Greek/math symbol font subsets;
 *         transcribe to LaTeX source strings with math uncertainty markers for ambiguous ligatures.
 *      f) Scanned PDF fallback: Flag OCR_REQUIRED uncertainty or reject encrypted/image-only PDFs gracefully.
 *
 * For this early slice, manual copy-paste fallback is enforced to guarantee deterministic,
 * zero-network, zero-storage, zero-AI, 100% faithful source offset extraction without introducing
 * heavy or vulnerable binary parsing dependencies.
 */

/**
 * Recursively freezes an object and all its properties to enforce absolute immutability.
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
 * Calculates 1-based line number for a given 0-based character offset in text.
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
 * Splits source text into line records with exact start/end offsets and 1-based line numbers.
 * Supports both LF (\n) and CRLF (\r\n) while preserving character offset arithmetic.
 *
 * @param {string} text
 * @returns {Array<{start: number, end: number, content: string, lineNumber: number}>}
 */
function getLines(text) {
  const lines = [];
  let lineStart = 0;
  let i = 0;
  const len = text.length;

  while (i < len) {
    if (text[i] === '\r') {
      if (i + 1 < len && text[i + 1] === '\n') {
        lines.push({
          start: lineStart,
          end: i,
          content: text.slice(lineStart, i),
          lineNumber: lines.length + 1
        });
        i += 2;
        lineStart = i;
      } else {
        lines.push({
          start: lineStart,
          end: i,
          content: text.slice(lineStart, i),
          lineNumber: lines.length + 1
        });
        i += 1;
        lineStart = i;
      }
    } else if (text[i] === '\n') {
      lines.push({
        start: lineStart,
        end: i,
        content: text.slice(lineStart, i),
        lineNumber: lines.length + 1
      });
      i += 1;
      lineStart = i;
    } else {
      i++;
    }
  }

  if (lineStart < len) {
    lines.push({
      start: lineStart,
      end: len,
      content: text.slice(lineStart, len),
      lineNumber: lines.length + 1
    });
  }

  return lines;
}

/**
 * Validates a closed LaTeX expression using KaTeX if available.
 * If invalid syntax is encountered, registers an uncertainty without modifying the source string.
 *
 * @param {string} expr
 * @param {boolean} isDisplay
 * @param {{id: string, start: number}} seg
 * @param {number} offset
 * @param {string} fullText
 * @param {Array<Record<string, unknown>>} uncertainties
 */
function validateKatexMath(expr, isDisplay, seg, offset, fullText, uncertainties) {
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
      segmentId: seg.id,
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
        validateKatexMath(str.slice(start, closeIdx), false, seg, openOffset, fullText, uncertainties);
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
        validateKatexMath(str.slice(start, closeIdx), true, seg, openOffset, fullText, uncertainties);
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
        validateKatexMath(str.slice(start, closeIdx), true, seg, openOffset, fullText, uncertainties);
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
        validateKatexMath(str.slice(start, closeIdx), false, seg, openOffset, fullText, uncertainties);
        i = closeIdx + 1;
        continue;
      }
    }

    i++;
  }
}

/**
 * Parses raw text or markdown into deterministic Segments with exact character and line spans.
 *
 * @param {string} text
 * @param {'markdown' | 'text'} kind
 * @returns {{ segments: Array<{id: string, kind: string, text: string, start: number, end: number, lineStart: number, lineEnd: number}>, uncertainties: Array<Record<string, unknown>>, warnings: Array<string> }}
 */
export function parseSegments(text, kind = 'markdown') {
  if (!text || text.length === 0) {
    return { segments: [], uncertainties: [], warnings: [] };
  }

  const lines = getLines(text);
  const segments = [];
  const uncertainties = [];
  const warnings = [];

  let lineIdx = 0;
  const isMarkdown = kind === 'markdown';

  while (lineIdx < lines.length) {
    const line = lines[lineIdx];
    const trimmed = line.content.trim();

    // 1. Skip blank lines between blocks
    if (trimmed.length === 0) {
      lineIdx++;
      continue;
    }

    // 2. Fenced code/math block (Markdown only)
    if (isMarkdown) {
      const fenceMatch = line.content.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (fenceMatch) {
        const fenceChar = fenceMatch[1][0];
        const minLen = fenceMatch[1].length;
        const startLine = line;
        let endLine = line;
        lineIdx++;
        let closed = false;

        while (lineIdx < lines.length) {
          const current = lines[lineIdx];
          endLine = current;
          lineIdx++;
          const closeRegex = new RegExp(`^\\s{0,3}${fenceChar === '`' ? '`' : '~'}{${minLen},}\\s*$`);
          if (closeRegex.test(current.content)) {
            closed = true;
            break;
          }
        }

        const seg = {
          id: `seg-${segments.length + 1}`,
          kind: 'fenced',
          text: text.slice(startLine.start, endLine.end),
          start: startLine.start,
          end: endLine.end,
          lineStart: startLine.lineNumber,
          lineEnd: endLine.lineNumber
        };
        segments.push(seg);

        if (!closed) {
          uncertainties.push({
            id: `unc-${uncertainties.length + 1}`,
            kind: 'unclosed_fence',
            type: 'unclosed_fence',
            segmentId: seg.id,
            message: 'Unclosed fenced code block detected',
            offset: startLine.start,
            line: startLine.lineNumber,
            raw: seg.text
          });
        }
        continue;
      }
    }

    // 3. Block Display Math ($$ or \[)
    if (trimmed.startsWith('$$')) {
      if (trimmed.length >= 4 && trimmed.endsWith('$$')) {
        // Single line display math
        const seg = {
          id: `seg-${segments.length + 1}`,
          kind: 'display_math',
          text: text.slice(line.start, line.end),
          start: line.start,
          end: line.end,
          lineStart: line.lineNumber,
          lineEnd: line.lineNumber
        };
        segments.push(seg);
        scanMathUncertainties(seg, text, uncertainties);
        lineIdx++;
        continue;
      } else {
        // Multi-line display math
        const startLine = line;
        let endLine = line;
        lineIdx++;
        let closed = false;

        while (lineIdx < lines.length) {
          const current = lines[lineIdx];
          if (current.content.trim().length === 0) {
            // Blank line terminates unclosed display math block
            break;
          }
          endLine = current;
          lineIdx++;
          if (current.content.includes('$$')) {
            closed = true;
            break;
          }
        }

        const seg = {
          id: `seg-${segments.length + 1}`,
          kind: 'display_math',
          text: text.slice(startLine.start, endLine.end),
          start: startLine.start,
          end: endLine.end,
          lineStart: startLine.lineNumber,
          lineEnd: endLine.lineNumber
        };
        segments.push(seg);

        if (!closed) {
          uncertainties.push({
            id: `unc-${uncertainties.length + 1}`,
            kind: 'math_delimiter_malformed',
            type: 'math_delimiter_malformed',
            segmentId: seg.id,
            delimiter: '$$',
            message: 'Unclosed display math block "$$" detected',
            offset: startLine.start,
            line: startLine.lineNumber,
            raw: seg.text
          });
        } else {
          scanMathUncertainties(seg, text, uncertainties);
        }
        continue;
      }
    }

    if (trimmed.startsWith('\\[')) {
      if (trimmed.endsWith('\\]') && trimmed.length >= 4) {
        // Single line display math
        const seg = {
          id: `seg-${segments.length + 1}`,
          kind: 'display_math',
          text: text.slice(line.start, line.end),
          start: line.start,
          end: line.end,
          lineStart: line.lineNumber,
          lineEnd: line.lineNumber
        };
        segments.push(seg);
        scanMathUncertainties(seg, text, uncertainties);
        lineIdx++;
        continue;
      } else {
        // Multi-line display math
        const startLine = line;
        let endLine = line;
        lineIdx++;
        let closed = false;

        while (lineIdx < lines.length) {
          const current = lines[lineIdx];
          if (current.content.trim().length === 0) {
            // Blank line terminates unclosed display math block
            break;
          }
          endLine = current;
          lineIdx++;
          if (current.content.includes('\\]')) {
            closed = true;
            break;
          }
        }

        const seg = {
          id: `seg-${segments.length + 1}`,
          kind: 'display_math',
          text: text.slice(startLine.start, endLine.end),
          start: startLine.start,
          end: endLine.end,
          lineStart: startLine.lineNumber,
          lineEnd: endLine.lineNumber
        };
        segments.push(seg);

        if (!closed) {
          uncertainties.push({
            id: `unc-${uncertainties.length + 1}`,
            kind: 'math_delimiter_malformed',
            type: 'math_delimiter_malformed',
            segmentId: seg.id,
            delimiter: '\\[',
            message: 'Unclosed display math block "\\[" detected',
            offset: startLine.start,
            line: startLine.lineNumber,
            raw: seg.text
          });
        } else {
          scanMathUncertainties(seg, text, uncertainties);
        }
        continue;
      }
    }

    // 4. Markdown Table (Markdown only)
    if (isMarkdown && line.content.includes('|')) {
      const nextLine = lineIdx + 1 < lines.length ? lines[lineIdx + 1] : null;
      const isDelimiterRow = nextLine && /^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(nextLine.content);
      if (isDelimiterRow) {
        const startLine = line;
        let endLine = nextLine;
        lineIdx += 2;

        while (lineIdx < lines.length) {
          const current = lines[lineIdx];
          if (current.content.trim().length === 0 || !current.content.includes('|')) {
            break;
          }
          endLine = current;
          lineIdx++;
        }

        const seg = {
          id: `seg-${segments.length + 1}`,
          kind: 'table',
          text: text.slice(startLine.start, endLine.end),
          start: startLine.start,
          end: endLine.end,
          lineStart: startLine.lineNumber,
          lineEnd: endLine.lineNumber
        };
        segments.push(seg);
        scanMathUncertainties(seg, text, uncertainties);
        continue;
      }
    }

    // 5. ATX Heading
    const headingMatch = line.content.match(/^\s{0,3}(#{1,6})(\s+.*)?$/);
    if (headingMatch && (isMarkdown || headingMatch[2])) {
      const seg = {
        id: `seg-${segments.length + 1}`,
        kind: 'heading',
        text: text.slice(line.start, line.end),
        start: line.start,
        end: line.end,
        lineStart: line.lineNumber,
        lineEnd: line.lineNumber
      };
      segments.push(seg);
      scanMathUncertainties(seg, text, uncertainties);
      lineIdx++;
      continue;
    }

    // 6. List Block
    const isListMarker = /^\s{0,3}(?:[*+-]|\d+[.)])\s+/.test(line.content);
    if (isListMarker) {
      const startLine = line;
      let endLine = line;
      lineIdx++;

      while (lineIdx < lines.length) {
        const current = lines[lineIdx];
        if (current.content.trim().length === 0) {
          break;
        }
        // Stop if a subsequent block starts
        if (/^\s{0,3}#{1,6}\s+/.test(current.content)) break;
        if (/^\s{0,3}(`{3,}|~{3,})/.test(current.content)) break;
        if (/^\s{0,3}(\$\$|\\\[)/.test(current.content)) break;

        endLine = current;
        lineIdx++;
      }

      const seg = {
        id: `seg-${segments.length + 1}`,
        kind: 'list',
        text: text.slice(startLine.start, endLine.end),
        start: startLine.start,
        end: endLine.end,
        lineStart: startLine.lineNumber,
        lineEnd: endLine.lineNumber
      };
      segments.push(seg);
      scanMathUncertainties(seg, text, uncertainties);
      continue;
    }

    // 7. General Paragraph
    const startLine = line;
    let endLine = line;
    lineIdx++;

    while (lineIdx < lines.length) {
      const current = lines[lineIdx];
      if (current.content.trim().length === 0) {
        break;
      }
      // Stop if a new block element starts
      if (/^\s{0,3}#{1,6}\s+/.test(current.content)) break;
      if (isMarkdown && /^\s{0,3}(`{3,}|~{3,})/.test(current.content)) break;
      if (/^\s{0,3}(\$\$|\\\[)/.test(current.content)) break;
      if (/^\s{0,3}(?:[*+-]|\d+[.)])\s+/.test(current.content)) break;

      if (isMarkdown && current.content.includes('|')) {
        const nextL = lineIdx + 1 < lines.length ? lines[lineIdx + 1] : null;
        if (nextL && /^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(nextL.content)) {
          break;
        }
      }

      endLine = current;
      lineIdx++;
    }

    const seg = {
      id: `seg-${segments.length + 1}`,
      kind: 'paragraph',
      text: text.slice(startLine.start, endLine.end),
      start: startLine.start,
      end: endLine.end,
      lineStart: startLine.lineNumber,
      lineEnd: endLine.lineNumber
    };
    segments.push(seg);
    scanMathUncertainties(seg, text, uncertainties);
  }

  return { segments, uncertainties, warnings };
}

/**
 * Checks format capabilities for importing lesson sources.
 *
 * @param {unknown} input
 * @returns {{ ok: boolean, supported: boolean, format?: string, status?: string, code?: string, fallback?: string | null, manualPasteFallback?: boolean, message: string, errors?: Array<{code: string, path: string, message: string}> }}
 */
export function detectCapability(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      supported: false,
      status: 'error',
      message: 'Input must be a non-null object'
    };
  }

  const unsupportedCheck = detectUnsupportedBinaryFormat(/** @type {Record<string, unknown>} */ (input));
  if (unsupportedCheck.isUnsupported) {
    const fmt = unsupportedCheck.format || 'docx';
    return {
      ok: false,
      supported: false,
      status: 'unsupported_format',
      code: 'unsupported_format',
      format: fmt,
      fallback: 'manual_paste',
      manualPasteFallback: true,
      message: `${fmt.toUpperCase()} binary format is not supported in this importer slice. Please use manual paste fallback (copy and paste text as Markdown or plain text).`,
      errors: [{
        code: 'UNSUPPORTED_FORMAT',
        path: 'kind',
        message: `${fmt.toUpperCase()} format requires manual paste fallback`
      }]
    };
  }

  const kind = /** @type {{kind?: string}} */ (input).kind;
  if (kind !== 'markdown' && kind !== 'text') {
    return {
      ok: false,
      supported: false,
      status: 'unsupported_format',
      code: 'unsupported_format',
      format: String(kind),
      fallback: 'manual_paste',
      manualPasteFallback: true,
      message: `Format "${kind}" is unsupported. Please use manual paste fallback.`,
      errors: [{
        code: 'UNSUPPORTED_FORMAT',
        path: 'kind',
        message: `Format "${kind}" is not supported.`
      }]
    };
  }

  return {
    ok: true,
    supported: true,
    format: kind,
    fallback: null,
    manualPasteFallback: false,
    message: `Format "${kind}" is fully supported for direct text extraction.`
  };
}

/**
 * Imports markdown or plain text input and generates an immutable SourceExtraction object.
 *
 * Guarantees:
 * - Deterministic SHA-256 hash computed on exact UTF-8 bytes.
 * - Exact source offsets preserved for every segment: `input.text.slice(start, end) === segment.text`.
 * - Formulas remain verbatim source strings; malformed delimiters record math uncertainties.
 * - No tasks, answers, or learning objectives invented.
 * - HTML injection strings preserved as literal string data, never rendered to HTML.
 * - Deeply frozen immutable output structure.
 * - Zero network, storage, or AI calls.
 *
 * @param {unknown} input
 * @returns {Record<string, unknown>} SourceExtraction or structured error/capability object
 */
export function importText(input) {
  // Validate input schema and detect unsupported binary formats
  const valResult = validateImportInput(input);
  if (!valResult.ok) {
    return valResult;
  }

  const valid = /** @type {{kind: 'markdown' | 'text', originalName: string, text: string}} */ (input);
  const rawText = valid.text;

  // Exact bytes and cryptographic hash
  const sha256 = createHash('sha256').update(rawText, 'utf8').digest('hex');
  const bytes = Buffer.byteLength(rawText, 'utf8');
  const id = `src-${sha256.slice(0, 16)}`;

  // Parse segments and collect math uncertainties
  const { segments, uncertainties, warnings } = parseSegments(rawText, valid.kind);

  const extraction = {
    schemaVersion: '1.0.0',
    id,
    kind: valid.kind,
    originalName: valid.originalName,
    sha256,
    bytes,
    status: 'needs_review',
    segments,
    uncertainties,
    warnings
  };

  // Define non-enumerable ok: true for consumers checking result.ok
  Object.defineProperty(extraction, 'ok', {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false
  });

  return deepFreeze(extraction);
}
