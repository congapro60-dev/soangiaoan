import { createHash } from 'node:crypto';

/**
 * DEFAULT_MAX_BYTES: Standard 2MB threshold for text/markdown lesson import.
 * Avoids uncontrolled memory usage in serverless and node workers while comfortably
 * accommodating full chapters and multi-exercise teacher lesson plans.
 */
export const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

export const ALLOWED_INPUT_KEYS = Object.freeze(new Set([
  'kind',
  'originalName',
  'text',
  'maxBytes'
]));

export const ALLOWED_INPUT_KINDS = Object.freeze(new Set([
  'markdown',
  'text'
]));

export const ALLOWED_EXTRACTION_KEYS = Object.freeze(new Set([
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

export const ALLOWED_EXTRACTION_STATUSES = Object.freeze(new Set([
  'needs_review'
]));

export const ALLOWED_SEGMENT_KEYS = Object.freeze(new Set([
  'id',
  'kind',
  'text',
  'start',
  'end',
  'lineStart',
  'lineEnd'
]));

export const ALLOWED_SEGMENT_KINDS = Object.freeze(new Set([
  'heading',
  'list',
  'paragraph',
  'table',
  'fenced',
  'fenced_code',
  'display_math'
]));

/**
 * Helper to record structured validation errors.
 *
 * @param {Array<{code: string, path: string, message: string}>} errors
 * @param {string} code
 * @param {string} path
 * @param {string} message
 */
function fail(errors, code, path, message) {
  errors.push({ code, path, message });
}

/**
 * Detects whether an input represents an unsupported binary document (DOCX or PDF).
 *
 * FUTURE PARSER PATH (DOCX / PDF VALIDATION ARCHITECTURE):
 * --------------------------------------------------------
 * When binary parsing capabilities are introduced in future slices:
 * 1. DOCX validation will verify:
 *    - Valid ZIP archive magic bytes ('PK\x03\x04') and OPC (Open Packaging Conventions) container structure.
 *    - Presence of 'word/document.xml' conforming to ECMA-376 / ISO/IEC 29500 schemas.
 *    - Target namespaces for Office Open XML math ('http://schemas.openxmlformats.org/officeDocument/2006/math').
 * 2. PDF validation will verify:
 *    - Valid PDF header ('%PDF-1.x') and trailer cross-reference table (XRef).
 *    - Encryption dictionary flags to reject DRM-locked/password-protected files.
 *    - Extraction fidelity scoring to detect scanned image-only PDFs needing OCR.
 *
 * In this slice, binary formats are explicitly detected and routed to unsupported_format capability
 * results, directing educators to use the deterministic manual paste fallback.
 *
 * @param {Record<string, unknown>} input
 * @returns {{ isUnsupported: boolean, format?: 'docx' | 'pdf', reason?: string }}
 */
export function detectUnsupportedBinaryFormat(input) {
  if (!input || typeof input !== 'object') {
    return { isUnsupported: false };
  }

  const kind = typeof input.kind === 'string' ? input.kind.toLowerCase() : '';
  const name = typeof input.originalName === 'string' ? input.originalName.toLowerCase() : '';
  const text = typeof input.text === 'string' ? input.text : '';

  if (kind === 'docx' || kind === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return { isUnsupported: true, format: 'docx', reason: 'kind declares DOCX format' };
  }
  if (kind === 'pdf' || kind === 'application/pdf') {
    return { isUnsupported: true, format: 'pdf', reason: 'kind declares PDF format' };
  }

  if (/\.docx$/i.test(name)) {
    return { isUnsupported: true, format: 'docx', reason: 'originalName extension indicates DOCX file' };
  }
  if (/\.pdf$/i.test(name)) {
    return { isUnsupported: true, format: 'pdf', reason: 'originalName extension indicates PDF file' };
  }

  // Detect binary signatures in string payload
  if (text.startsWith('%PDF-')) {
    return { isUnsupported: true, format: 'pdf', reason: 'PDF magic header detected in text' };
  }
  if (text.startsWith('PK\x03\x04') && (text.includes('word/') || text.includes('[Content_Types]'))) {
    return { isUnsupported: true, format: 'docx', reason: 'DOCX ZIP archive magic header detected in text' };
  }

  return { isUnsupported: false };
}

/**
 * Validates input parameters for source text extraction.
 * Enforces strict key allowlists, UTF-8 byte bounds, and explicit format capability checks.
 *
 * @param {unknown} input
 * @returns {{ ok: boolean, status?: string, code?: string, format?: string, fallback?: string, manualPasteFallback?: boolean, message?: string, errors: Array<{code: string, path: string, message: string}> }}
 */
export function validateImportInput(input) {
  const errors = [];

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      status: 'error',
      errors: [{
        code: 'INVALID_INPUT',
        path: '',
        message: 'Input must be a non-null object'
      }]
    };
  }

  // Check for unsupported DOCX/PDF formats first to return explicit capability result
  const unsupportedCheck = detectUnsupportedBinaryFormat(input);
  if (unsupportedCheck.isUnsupported) {
    const fmt = unsupportedCheck.format || 'docx';
    return {
      ok: false,
      status: 'unsupported_format',
      code: 'unsupported_format',
      format: fmt,
      fallback: 'manual_paste',
      manualPasteFallback: true,
      message: `${fmt.toUpperCase()} binary format is not supported in this slice. Please use manual paste fallback (copy text into clipboard and import as markdown or plain text).`,
      errors: [{
        code: 'UNSUPPORTED_FORMAT',
        path: 'kind',
        message: `${fmt.toUpperCase()} binary parsing is deferred. Use manual paste fallback.`
      }]
    };
  }

  // Reject unknown keys strictly
  for (const key of Object.keys(input)) {
    if (!ALLOWED_INPUT_KEYS.has(key)) {
      fail(errors, 'UNKNOWN_INPUT_KEY', key, `Unknown input key: ${key}`);
    }
  }

  // Validate kind
  if (input.kind === undefined || input.kind === null) {
    fail(errors, 'MISSING_KIND', 'kind', 'kind is required');
  } else if (typeof input.kind !== 'string' || !ALLOWED_INPUT_KINDS.has(input.kind)) {
    fail(errors, 'INVALID_KIND', 'kind', `kind must be "markdown" or "text", received "${String(input.kind)}"`);
  }

  // Validate originalName
  if (input.originalName === undefined || input.originalName === null) {
    fail(errors, 'MISSING_ORIGINAL_NAME', 'originalName', 'originalName is required');
  } else if (typeof input.originalName !== 'string' || input.originalName.trim().length === 0) {
    fail(errors, 'INVALID_ORIGINAL_NAME', 'originalName', 'originalName must be a non-empty string');
  }

  // Validate text
  if (input.text === undefined || input.text === null) {
    fail(errors, 'MISSING_TEXT', 'text', 'text is required');
  } else if (typeof input.text !== 'string') {
    fail(errors, 'INVALID_TEXT', 'text', 'text must be a string');
  }

  // Validate maxBytes if provided
  let effectiveMaxBytes = DEFAULT_MAX_BYTES;
  if (input.maxBytes !== undefined && input.maxBytes !== null) {
    if (typeof input.maxBytes !== 'number' || !Number.isInteger(input.maxBytes) || input.maxBytes <= 0) {
      fail(errors, 'INVALID_MAX_BYTES', 'maxBytes', 'maxBytes must be a positive integer');
    } else {
      effectiveMaxBytes = input.maxBytes;
    }
  }

  // Strict UTF-8 byte length verification
  if (typeof input.text === 'string') {
    const byteLength = Buffer.byteLength(input.text, 'utf8');
    if (byteLength > effectiveMaxBytes) {
      fail(
        errors,
        'MAX_BYTES_EXCEEDED',
        'text',
        `Input text size (${byteLength} bytes) exceeds maximum allowed limit (${effectiveMaxBytes} bytes)`
      );
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      status: 'error',
      errors
    };
  }

  return { ok: true, errors: [] };
}

/**
 * Validates a single Segment object.
 *
 * @param {unknown} segment
 * @param {number} index
 * @param {string} [originalText]
 * @returns {{ ok: boolean, errors: Array<{code: string, path: string, message: string}> }}
 */
export function validateSegment(segment, index = 0, originalText) {
  const errors = [];
  const pathPrefix = `segments[${index}]`;

  if (!segment || typeof segment !== 'object' || Array.isArray(segment)) {
    return {
      ok: false,
      errors: [{
        code: 'INVALID_SEGMENT',
        path: pathPrefix,
        message: 'Segment must be a non-null object'
      }]
    };
  }

  for (const key of Object.keys(segment)) {
    if (!ALLOWED_SEGMENT_KEYS.has(key)) {
      fail(errors, 'UNKNOWN_SEGMENT_KEY', `${pathPrefix}.${key}`, `Unknown segment key: ${key}`);
    }
  }

  if (typeof segment.id !== 'string' || segment.id.trim().length === 0) {
    fail(errors, 'INVALID_SEGMENT_ID', `${pathPrefix}.id`, 'id must be a non-empty string');
  }

  if (typeof segment.kind !== 'string' || !ALLOWED_SEGMENT_KINDS.has(segment.kind)) {
    fail(errors, 'INVALID_SEGMENT_KIND', `${pathPrefix}.kind`, `kind must be one of: ${[...ALLOWED_SEGMENT_KINDS].join(', ')}`);
  }

  if (typeof segment.text !== 'string') {
    fail(errors, 'INVALID_SEGMENT_TEXT', `${pathPrefix}.text`, 'text must be a string');
  }

  if (typeof segment.start !== 'number' || !Number.isInteger(segment.start) || segment.start < 0) {
    fail(errors, 'INVALID_SEGMENT_START', `${pathPrefix}.start`, 'start must be a non-negative integer');
  }

  if (typeof segment.end !== 'number' || !Number.isInteger(segment.end) || segment.end < 0) {
    fail(errors, 'INVALID_SEGMENT_END', `${pathPrefix}.end`, 'end must be a non-negative integer');
  }

  if (typeof segment.start === 'number' && typeof segment.end === 'number' && segment.end < segment.start) {
    fail(errors, 'INVALID_SEGMENT_SPAN', `${pathPrefix}.end`, 'end cannot be less than start');
  }

  if (typeof segment.lineStart !== 'number' || !Number.isInteger(segment.lineStart) || segment.lineStart < 1) {
    fail(errors, 'INVALID_SEGMENT_LINE_START', `${pathPrefix}.lineStart`, 'lineStart must be an integer >= 1');
  }

  if (typeof segment.lineEnd !== 'number' || !Number.isInteger(segment.lineEnd) || segment.lineEnd < 1) {
    fail(errors, 'INVALID_SEGMENT_LINE_END', `${pathPrefix}.lineEnd`, 'lineEnd must be an integer >= 1');
  }

  if (typeof segment.lineStart === 'number' && typeof segment.lineEnd === 'number' && segment.lineEnd < segment.lineStart) {
    fail(errors, 'INVALID_SEGMENT_LINES', `${pathPrefix}.lineEnd`, 'lineEnd cannot be less than lineStart');
  }

  // Cross-check text slice with offsets
  if (typeof segment.text === 'string' && typeof segment.start === 'number' && typeof segment.end === 'number') {
    if (segment.end - segment.start !== segment.text.length) {
      fail(
        errors,
        'SPAN_LENGTH_MISMATCH',
        pathPrefix,
        `Span length (${segment.end - segment.start}) does not match text length (${segment.text.length})`
      );
    }

    if (typeof originalText === 'string') {
      const expectedSlice = originalText.slice(segment.start, segment.end);
      if (expectedSlice !== segment.text) {
        fail(
          errors,
          'SOURCE_SLICE_MISMATCH',
          pathPrefix,
          'Segment text does not exactly match source slice at [start, end]'
        );
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Validates a complete SourceExtraction object against the P5 schema.
 * Checks immutability, schema version, deterministic hash, byte count, segment ordering, and unknown keys.
 *
 * @param {unknown} extraction
 * @param {string} [originalText]
 * @returns {{ ok: boolean, errors: Array<{code: string, path: string, message: string}> }}
 */
export function validateSourceExtraction(extraction, originalText) {
  const errors = [];

  if (!extraction || typeof extraction !== 'object' || Array.isArray(extraction)) {
    return {
      ok: false,
      errors: [{
        code: 'INVALID_EXTRACTION',
        path: '',
        message: 'SourceExtraction must be a non-null object'
      }]
    };
  }

  // Reject unknown keys on SourceExtraction
  for (const key of Object.keys(extraction)) {
    if (!ALLOWED_EXTRACTION_KEYS.has(key)) {
      fail(errors, 'UNKNOWN_EXTRACTION_KEY', key, `Unknown SourceExtraction key: ${key}`);
    }
  }

  if (extraction.schemaVersion !== '1.0.0') {
    fail(errors, 'INVALID_SCHEMA_VERSION', 'schemaVersion', 'schemaVersion must be "1.0.0"');
  }

  if (typeof extraction.id !== 'string' || extraction.id.trim().length === 0) {
    fail(errors, 'INVALID_ID', 'id', 'id must be a non-empty string');
  }

  if (typeof extraction.kind !== 'string' || !ALLOWED_INPUT_KINDS.has(extraction.kind)) {
    fail(errors, 'INVALID_KIND', 'kind', 'kind must be "markdown" or "text"');
  }

  if (typeof extraction.originalName !== 'string' || extraction.originalName.trim().length === 0) {
    fail(errors, 'INVALID_ORIGINAL_NAME', 'originalName', 'originalName must be a non-empty string');
  }

  if (typeof extraction.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(extraction.sha256)) {
    fail(errors, 'INVALID_SHA256', 'sha256', 'sha256 must be a 64-character lowercase hex string');
  }

  if (typeof extraction.bytes !== 'number' || !Number.isInteger(extraction.bytes) || extraction.bytes < 0) {
    fail(errors, 'INVALID_BYTES', 'bytes', 'bytes must be a non-negative integer');
  }

  if (extraction.status !== 'needs_review') {
    fail(errors, 'INVALID_STATUS', 'status', 'status must be "needs_review"');
  }

  if (!Array.isArray(extraction.segments)) {
    fail(errors, 'INVALID_SEGMENTS', 'segments', 'segments must be an array');
  } else {
    let lastEnd = 0;
    for (let i = 0; i < extraction.segments.length; i++) {
      const seg = extraction.segments[i];
      const segResult = validateSegment(seg, i, originalText);
      for (const err of segResult.errors) {
        errors.push(err);
      }

      if (seg && typeof seg.start === 'number') {
        if (seg.start < lastEnd) {
          fail(
            errors,
            'OVERLAPPING_SEGMENT',
            `segments[${i}].start`,
            `Segment at index ${i} starts at ${seg.start}, overlapping previous segment ending at ${lastEnd}`
          );
        }
        if (typeof seg.end === 'number') {
          lastEnd = seg.end;
        }
      }
    }
  }

  if (!Array.isArray(extraction.uncertainties)) {
    fail(errors, 'INVALID_UNCERTAINTIES', 'uncertainties', 'uncertainties must be an array');
  }

  if (!Array.isArray(extraction.warnings)) {
    fail(errors, 'INVALID_WARNINGS', 'warnings', 'warnings must be an array');
  }

  // Cross-check text hash and byte count if source text is supplied
  if (typeof originalText === 'string') {
    const expectedSha256 = createHash('sha256').update(originalText, 'utf8').digest('hex');
    const expectedBytes = Buffer.byteLength(originalText, 'utf8');

    if (extraction.sha256 !== expectedSha256) {
      fail(errors, 'SHA256_MISMATCH', 'sha256', 'sha256 does not match sha256 of original text');
    }
    if (extraction.bytes !== expectedBytes) {
      fail(errors, 'BYTES_MISMATCH', 'bytes', 'bytes does not match UTF-8 byte length of original text');
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
