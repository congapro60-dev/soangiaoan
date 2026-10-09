import { createHash } from 'node:crypto';
import { unzipSync } from 'fflate';
import katex from 'katex';

/**
 * DOCX Parser Bounds & Security Constants:
 * Strict bounded resource limits to prevent zip-bomb / memory exhaustion attacks.
 */
export const DOCX_MAX_BYTES = 10 * 1024 * 1024; // 10MB input file limit
export const DOCX_MAX_ENTRIES = 1000; // max entries in ZIP central directory
export const DOCX_MAX_DECOMPRESSED_BYTES = 50 * 1024 * 1024; // 50MB total decompressed limit
export const DOCX_MAX_ENTRY_BYTES = 20 * 1024 * 1024; // 20MB single entry decompressed limit
export const DOCX_MAX_RATIO = 100; // max decompression ratio

export const ALLOWED_DOCX_SEGMENT_KINDS = Object.freeze(new Set([
  'heading',
  'list',
  'paragraph',
  'table',
  'display_math',
  'fenced',
  'fenced_code'
]));

export const ALLOWED_DOCX_EXTRACTION_KEYS = Object.freeze(new Set([
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
 * Deep freezes an object to enforce immutability.
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
 * Normalizes user input into a standardized format.
 *
 * @param {unknown} input
 * @returns {{ bytes: Uint8Array, originalName: string, maxBytes?: number, maxEntries?: number, maxDecompressedBytes?: number, maxEntryBytes?: number, maxRatio?: number } | null}
 */
function normalizeInput(input) {
  if (!input) return null;

  if (input instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(input))) {
    const buf = /** @type {Uint8Array} */ (input);
    return {
      bytes: new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength),
      originalName: 'document.docx'
    };
  }

  if (input instanceof ArrayBuffer) {
    return {
      bytes: new Uint8Array(input),
      originalName: 'document.docx'
    };
  }

  if (typeof input === 'object') {
    const raw = /** @type {Record<string, unknown>} */ (input);
    const data = raw.bytes || raw.buffer || raw.data;
    let bytes = null;

    if (data instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(data))) {
      const b = /** @type {Uint8Array} */ (data);
      bytes = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
    } else if (data instanceof ArrayBuffer) {
      bytes = new Uint8Array(data);
    }

    if (!bytes) return null;

    const originalName = typeof raw.originalName === 'string' && raw.originalName.trim().length > 0
      ? raw.originalName.trim()
      : 'document.docx';

    return {
      bytes,
      originalName,
      maxBytes: typeof raw.maxBytes === 'number' ? raw.maxBytes : undefined,
      maxEntries: typeof raw.maxEntries === 'number' ? raw.maxEntries : undefined,
      maxDecompressedBytes: typeof raw.maxDecompressedBytes === 'number' ? raw.maxDecompressedBytes : undefined,
      maxEntryBytes: typeof raw.maxEntryBytes === 'number' ? raw.maxEntryBytes : undefined,
      maxRatio: typeof raw.maxRatio === 'number' ? raw.maxRatio : undefined
    };
  }

  return null;
}

/**
 * Validates input parameters for DOCX extraction.
 *
 * @param {unknown} input
 * @param {Record<string, unknown>} [options]
 * @returns {{ ok: boolean, status?: string, errors: Array<{code: string, path: string, message: string}> }}
 */
export function validateDocxInput(input, options = {}) {
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

  const effectiveMaxBytes = options.maxBytes ?? normalized.maxBytes ?? DOCX_MAX_BYTES;
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
      message: `DOCX file size (${normalized.bytes.length} bytes) exceeds maximum limit (${effectiveMaxBytes} bytes)`
    });
  }

  // Check standard ZIP magic bytes: 'PK\x03\x04' (0x50, 0x4B, 0x03, 0x04)
  if (normalized.bytes.length < 4 ||
      normalized.bytes[0] !== 0x50 ||
      normalized.bytes[1] !== 0x4b ||
      normalized.bytes[2] !== 0x03 ||
      normalized.bytes[3] !== 0x04) {
    errors.push({
      code: 'INVALID_ZIP_ARCHIVE',
      path: 'bytes',
      message: 'Input does not start with valid ZIP archive signature (PK\\x03\\x04)'
    });
  }

  return {
    ok: errors.length === 0,
    status: errors.length === 0 ? 'ok' : 'error',
    errors
  };
}

/**
 * Official WordprocessingML namespace URIs.
 */
export const WORD_NAMESPACES = Object.freeze(new Set([
  'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  'http://purl.oclc.org/ooxml/wordprocessingml/main'
]));

/**
 * Official Office Math Markup Language (OMML) namespace URIs.
 */
export const MATH_NAMESPACES = Object.freeze(new Set([
  'http://schemas.openxmlformats.org/officeDocument/2006/math',
  'http://purl.oclc.org/ooxml/officeDocument/math'
]));

/**
 * DrawingML / WordprocessingDrawing / VML namespace URIs.
 */
export const DRAWING_NAMESPACES = Object.freeze(new Set([
  'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
  'http://purl.oclc.org/ooxml/drawingml/wordprocessingDrawing',
  'http://schemas.openxmlformats.org/drawingml/2006/main',
  'http://purl.oclc.org/ooxml/drawingml/main',
  'http://schemas.openxmlformats.org/drawingml/2006/picture',
  'http://purl.oclc.org/ooxml/drawingml/picture',
  'urn:schemas-microsoft-com:vml'
]));

/**
 * IEEE 802.3 CRC-32 table and calculator.
 */
const CRC_TABLE = new Int32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[i] = c;
}

/**
 * Computes standard IEEE 802.3 CRC-32 checksum.
 *
 * @param {Uint8Array} bytes
 * @returns {number} Unsigned 32-bit integer CRC-32
 */
export function calculateCrc32(bytes) {
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

/**
 * Finds End of Central Directory (EOCD) signature offset in ZIP archive.
 *
 * @param {Uint8Array} zipBytes
 * @returns {number} Offset of EOCD or -1 if not found
 */
function findEocd(zipBytes) {
  if (zipBytes.length < 22) return -1;
  const maxScan = Math.min(zipBytes.length - 22, 65535 + 22);
  const minPos = zipBytes.length - maxScan;
  for (let i = zipBytes.length - 22; i >= minPos; i--) {
    if (zipBytes[i] === 0x50 && zipBytes[i + 1] === 0x4b && zipBytes[i + 2] === 0x05 && zipBytes[i + 3] === 0x06) {
      return i;
    }
  }
  return -1;
}

/**
 * Bounded DOCX ZIP parser using fflate.
 * Limits entry count, single-entry size, cumulative decompressed size, and compression ratio
 * BEFORE allocation to prevent zip-bombs.
 * Verifies CRC-32 of central directory and local headers against decompressed payloads.
 *
 * @param {Uint8Array} zipBytes
 * @param {Record<string, unknown>} [options]
 * @returns {{ documentXml: string, stylesXml?: string, numberingXml?: string }}
 */
export function parseDocxArchive(zipBytes, options = {}) {
  const maxEntries = typeof options.maxEntries === 'number' ? options.maxEntries : DOCX_MAX_ENTRIES;
  const maxDecompressedBytes = typeof options.maxDecompressedBytes === 'number' ? options.maxDecompressedBytes : DOCX_MAX_DECOMPRESSED_BYTES;
  const maxEntryBytes = typeof options.maxEntryBytes === 'number' ? options.maxEntryBytes : DOCX_MAX_ENTRY_BYTES;
  const maxRatio = typeof options.maxRatio === 'number' ? options.maxRatio : DOCX_MAX_RATIO;

  // 1. Locate End of Central Directory (EOCD)
  const eocdPos = findEocd(zipBytes);
  if (eocdPos === -1) {
    const error = new Error('CORRUPTED_ZIP_ARCHIVE: Invalid ZIP archive (EOCD record not found)');
    /** @type {any} */ (error).code = 'CORRUPTED_ZIP_ARCHIVE';
    throw error;
  }

  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);
  const totalEntries = view.getUint16(eocdPos + 10, true);
  const cdSize = view.getUint32(eocdPos + 12, true);
  const cdOffset = view.getUint32(eocdPos + 16, true);

  if (totalEntries > maxEntries) {
    const error = new Error(`ZIP_ENTRY_LIMIT_EXCEEDED: entry count (${totalEntries}) exceeds maximum allowed (${maxEntries})`);
    /** @type {any} */ (error).code = 'ZIP_ENTRY_LIMIT_EXCEEDED';
    throw error;
  }

  if (cdOffset < 0 || cdOffset + cdSize > zipBytes.length) {
    const error = new Error('CORRUPTED_ZIP_ARCHIVE: Central directory offset out of bounds');
    /** @type {any} */ (error).code = 'CORRUPTED_ZIP_ARCHIVE';
    throw error;
  }

  const cdEntries = new Map();
  let pos = cdOffset;
  const decoder = new TextDecoder('utf-8');

  for (let i = 0; i < totalEntries; i++) {
    if (pos + 46 > zipBytes.length) {
      const error = new Error('CORRUPTED_ZIP_ARCHIVE: Truncated central directory entry');
      /** @type {any} */ (error).code = 'CORRUPTED_ZIP_ARCHIVE';
      throw error;
    }
    const sig = view.getUint32(pos, true);
    if (sig !== 0x02014b50) {
      const error = new Error('CORRUPTED_ZIP_ARCHIVE: Invalid central directory entry signature');
      /** @type {any} */ (error).code = 'CORRUPTED_ZIP_ARCHIVE';
      throw error;
    }
    const flags = view.getUint16(pos + 8, true);
    const compMethod = view.getUint16(pos + 10, true);
    const crc32 = view.getUint32(pos + 16, true);
    const compSize = view.getUint32(pos + 20, true);
    const uncompSize = view.getUint32(pos + 24, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localHeaderOffset = view.getUint32(pos + 42, true);

    if (pos + 46 + nameLen > zipBytes.length) {
      const error = new Error('CORRUPTED_ZIP_ARCHIVE: Central directory entry filename out of bounds');
      /** @type {any} */ (error).code = 'CORRUPTED_ZIP_ARCHIVE';
      throw error;
    }
    const name = decoder.decode(zipBytes.subarray(pos + 46, pos + 46 + nameLen));

    // Bound-before-allocation limits on each entry from Central Directory metadata
    if (uncompSize > maxEntryBytes) {
      const error = new Error(`ZIP_ENTRY_SIZE_EXCEEDED: entry "${name}" size (${uncompSize} bytes) exceeds limit (${maxEntryBytes} bytes)`);
      /** @type {any} */ (error).code = 'ZIP_ENTRY_SIZE_EXCEEDED';
      throw error;
    }

    const ratio = uncompSize / (compSize || 1);
    if (compSize > 0 && ratio > maxRatio && uncompSize > 64 * 1024) {
      const error = new Error(`ZIP_BOMB_DETECTED: compression ratio (${ratio.toFixed(1)}:1) for entry "${name}" exceeds threshold (${maxRatio}:1)`);
      /** @type {any} */ (error).code = 'ZIP_BOMB_DETECTED';
      throw error;
    }

    if (localHeaderOffset + 30 > zipBytes.length) {
      const error = new Error(`CORRUPTED_ZIP_ARCHIVE: Local header offset out of bounds for "${name}"`);
      /** @type {any} */ (error).code = 'CORRUPTED_ZIP_ARCHIVE';
      throw error;
    }
    const localSig = view.getUint32(localHeaderOffset, true);
    if (localSig !== 0x04034b50) {
      const error = new Error(`CORRUPTED_ZIP_ARCHIVE: Invalid local header signature for "${name}"`);
      /** @type {any} */ (error).code = 'CORRUPTED_ZIP_ARCHIVE';
      throw error;
    }
    const localFlags = view.getUint16(localHeaderOffset + 6, true);
    const localCrc = view.getUint32(localHeaderOffset + 14, true);
    const localCompSize = view.getUint32(localHeaderOffset + 18, true);
    const localUncompSize = view.getUint32(localHeaderOffset + 22, true);

    if ((flags & 0x08) === 0 && (localFlags & 0x08) === 0) {
      if (localCrc !== crc32) {
        const error = new Error(`CORRUPTED_ZIP_ARCHIVE: CRC-32 mismatch between local header (0x${localCrc.toString(16)}) and central directory (0x${crc32.toString(16)}) for "${name}"`);
        /** @type {any} */ (error).code = 'CORRUPTED_ZIP_ARCHIVE';
        throw error;
      }
      if (localCompSize !== compSize || localUncompSize !== uncompSize) {
        const error = new Error(`CORRUPTED_ZIP_ARCHIVE: Size mismatch between local header and central directory for "${name}"`);
        /** @type {any} */ (error).code = 'CORRUPTED_ZIP_ARCHIVE';
        throw error;
      }
    } else if (localCrc !== 0 && localCrc !== crc32) {
      const error = new Error(`CORRUPTED_ZIP_ARCHIVE: CRC-32 mismatch between local header (0x${localCrc.toString(16)}) and central directory (0x${crc32.toString(16)}) for "${name}"`);
      /** @type {any} */ (error).code = 'CORRUPTED_ZIP_ARCHIVE';
      throw error;
    }

    cdEntries.set(name, {
      name,
      flags,
      compMethod,
      crc32,
      compSize,
      uncompSize,
      localHeaderOffset
    });

    pos += 46 + nameLen + extraLen + commentLen;
  }

  if (!cdEntries.has('word/document.xml')) {
    const error = new Error('MISSING_DOCUMENT_XML: DOCX archive does not contain word/document.xml');
    /** @type {any} */ (error).code = 'MISSING_DOCUMENT_XML';
    throw error;
  }

  let entryCount = 0;
  let totalDecompressed = 0;

  let files;
  try {
    files = unzipSync(zipBytes, {
      filter(file) {
        entryCount++;
        if (entryCount > maxEntries) {
          throw new Error(`ZIP_ENTRY_LIMIT_EXCEEDED: entry count (${entryCount}) exceeds maximum allowed (${maxEntries})`);
        }

        if (file.originalSize > maxEntryBytes) {
          throw new Error(`ZIP_ENTRY_SIZE_EXCEEDED: entry "${file.name}" size (${file.originalSize} bytes) exceeds limit (${maxEntryBytes} bytes)`);
        }

        // Zip-bomb ratio check for non-trivial entries
        const ratio = file.originalSize / (file.size || 1);
        if (file.size > 0 && ratio > maxRatio && file.originalSize > 64 * 1024) {
          throw new Error(`ZIP_BOMB_DETECTED: compression ratio (${ratio.toFixed(1)}:1) for entry "${file.name}" exceeds threshold (${maxRatio}:1)`);
        }

        // Only decompress necessary DOCX XML files; skip all media and unnecessary files
        const name = file.name;
        const isDocXml = name === 'word/document.xml';
        const isStylesXml = name === 'word/styles.xml';
        const isNumberingXml = name === 'word/numbering.xml';

        if (isDocXml || isStylesXml || isNumberingXml) {
          totalDecompressed += file.originalSize;
          if (totalDecompressed > maxDecompressedBytes) {
            throw new Error(`ZIP_DECOMPRESSED_LIMIT_EXCEEDED: cumulative decompressed size (${totalDecompressed} bytes) exceeds limit (${maxDecompressedBytes} bytes)`);
          }
          return true;
        }

        return false;
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith('ZIP_') || msg.startsWith('CORRUPTED_ZIP_ARCHIVE') || msg.startsWith('MISSING_DOCUMENT_XML')) {
      const code = msg.split(':')[0].trim();
      const error = new Error(msg);
      /** @type {any} */ (error).code = code;
      throw error;
    }
    const error = new Error(`CORRUPTED_ZIP_ARCHIVE: ${msg}`);
    /** @type {any} */ (error).code = 'CORRUPTED_ZIP_ARCHIVE';
    throw error;
  }

  // Verify decompressed sizes and CRC-32 against Central Directory metadata
  for (const [fileName, decompressedBytes] of Object.entries(files)) {
    const meta = cdEntries.get(fileName);
    if (!meta) {
      const error = new Error(`CORRUPTED_ZIP_ARCHIVE: Extracted file "${fileName}" not found in central directory`);
      /** @type {any} */ (error).code = 'CORRUPTED_ZIP_ARCHIVE';
      throw error;
    }

    if (decompressedBytes.byteLength !== meta.uncompSize) {
      const error = new Error(`CORRUPTED_ZIP_ARCHIVE: Decompressed size mismatch for "${fileName}" (expected ${meta.uncompSize}, got ${decompressedBytes.byteLength})`);
      /** @type {any} */ (error).code = 'CORRUPTED_ZIP_ARCHIVE';
      throw error;
    }

    const computedCrc = calculateCrc32(decompressedBytes);
    if (computedCrc !== meta.crc32) {
      const error = new Error(`CORRUPTED_ZIP_ARCHIVE: CRC-32 checksum mismatch for entry "${fileName}" (expected 0x${meta.crc32.toString(16)}, got 0x${computedCrc.toString(16)})`);
      /** @type {any} */ (error).code = 'CORRUPTED_ZIP_ARCHIVE';
      throw error;
    }
  }

  const docBytes = files['word/document.xml'];
  if (!docBytes) {
    const error = new Error('MISSING_DOCUMENT_XML: DOCX archive does not contain word/document.xml');
    /** @type {any} */ (error).code = 'MISSING_DOCUMENT_XML';
    throw error;
  }

  return {
    documentXml: decoder.decode(docBytes),
    stylesXml: files['word/styles.xml'] ? decoder.decode(files['word/styles.xml']) : undefined,
    numberingXml: files['word/numbering.xml'] ? decoder.decode(files['word/numbering.xml']) : undefined
  };
}

/**
 * Lightweight, DOM-free, zero-eval, zero-network XML Parser.
 * Strictly rejects DTD, ENTITY declarations, and external stylesheets.
 * Retains exact start/end character offsets and line numbers in document.xml.
 */

/**
 * @typedef {{
 *   tag: string,
 *   prefix: string,
 *   localName: string,
 *   nsUri: string,
 *   attrs: Record<string, string>,
 *   resolvedAttrs: Array<{ name: string, prefix: string, localName: string, nsUri: string, value: string }>,
 *   nsMap: Record<string, string>,
 *   children: Array<XmlNode | string>,
 *   startOffset: number,
 *   endOffset: number,
 *   line: number
 * }} XmlNode
 */

/**
 * Checks whether a Unicode code point is a valid XML character.
 *
 * @param {number} cp
 * @returns {boolean}
 */
function isValidXmlChar(cp) {
  if (typeof cp !== 'number' || Number.isNaN(cp) || cp < 0 || cp > 0x10FFFF) return false;
  if (cp >= 0xD800 && cp <= 0xDFFF) return false; // UTF-16 surrogate
  if (cp === 0x9 || cp === 0xA || cp === 0xD) return true;
  if (cp >= 0x20 && cp <= 0xD7FF) return true;
  if (cp >= 0xE000 && cp <= 0xFFFD) return true;
  if (cp >= 0x10000 && cp <= 0x10FFFF) return true;
  return false;
}

/**
 * Safely decodes predefined XML entities and numeric character references strictly.
 * Rejects bare ampersands and undefined entities.
 *
 * @param {string} str
 * @returns {string}
 */
function decodeXmlEntities(str) {
  let result = '';
  let i = 0;
  const len = str.length;
  while (i < len) {
    const ch = str[i];
    if (ch === '&') {
      const semiIdx = str.indexOf(';', i + 1);
      if (semiIdx === -1) {
        const err = new Error(`MALFORMED_XML: Unclosed entity reference starting at character ${i}`);
        /** @type {any} */ (err).code = 'MALFORMED_XML';
        throw err;
      }
      const entity = str.slice(i + 1, semiIdx);
      if (entity === 'amp') {
        result += '&';
      } else if (entity === 'lt') {
        result += '<';
      } else if (entity === 'gt') {
        result += '>';
      } else if (entity === 'quot') {
        result += '"';
      } else if (entity === 'apos') {
        result += "'";
      } else if (/^#[0-9]+$/.test(entity)) {
        const cp = parseInt(entity.slice(1), 10);
        if (!isValidXmlChar(cp)) {
          const err = new Error(`MALFORMED_XML: Invalid XML character reference &#${entity.slice(1)};`);
          /** @type {any} */ (err).code = 'MALFORMED_XML';
          throw err;
        }
        result += String.fromCodePoint(cp);
      } else if (/^#[xX][0-9a-fA-F]+$/.test(entity)) {
        const cp = parseInt(entity.slice(2), 16);
        if (!isValidXmlChar(cp)) {
          const err = new Error(`MALFORMED_XML: Invalid XML character reference &#${entity.slice(1)};`);
          /** @type {any} */ (err).code = 'MALFORMED_XML';
          throw err;
        }
        result += String.fromCodePoint(cp);
      } else {
        const err = new Error(`MALFORMED_XML: Undefined entity reference "&${entity};"`);
        /** @type {any} */ (err).code = 'MALFORMED_XML';
        throw err;
      }
      i = semiIdx + 1;
    } else {
      result += ch;
      i++;
    }
  }
  return result;
}

/**
 * Parses XML attributes enforcing quoted values and well-formedness.
 *
 * @param {string} attrStr
 * @returns {Record<string, string>}
 */
function parseAttributes(attrStr) {
  const attrs = {};
  let i = 0;
  const len = attrStr.length;

  while (i < len) {
    while (i < len && (attrStr[i] === ' ' || attrStr[i] === '\t' || attrStr[i] === '\n' || attrStr[i] === '\r')) {
      i++;
    }
    if (i >= len) break;

    const nameStart = i;
    while (i < len && attrStr[i] !== '=' && attrStr[i] !== ' ' && attrStr[i] !== '\t' && attrStr[i] !== '\n' && attrStr[i] !== '\r' && attrStr[i] !== '/' && attrStr[i] !== '>') {
      i++;
    }
    const attrName = attrStr.slice(nameStart, i);
    if (!/^[a-zA-Z_:][a-zA-Z0-9._:-]*$/.test(attrName)) {
      const err = new Error(`MALFORMED_XML: Invalid attribute name "${attrName}"`);
      /** @type {any} */ (err).code = 'MALFORMED_XML';
      throw err;
    }

    while (i < len && (attrStr[i] === ' ' || attrStr[i] === '\t' || attrStr[i] === '\n' || attrStr[i] === '\r')) {
      i++;
    }

    if (i >= len || attrStr[i] !== '=') {
      const err = new Error(`MALFORMED_XML: Attribute "${attrName}" must be followed by "=" and a quoted value`);
      /** @type {any} */ (err).code = 'MALFORMED_XML';
      throw err;
    }
    i++; // Skip '='

    while (i < len && (attrStr[i] === ' ' || attrStr[i] === '\t' || attrStr[i] === '\n' || attrStr[i] === '\r')) {
      i++;
    }

    if (i >= len || (attrStr[i] !== '"' && attrStr[i] !== "'")) {
      const err = new Error(`MALFORMED_XML: Attribute value for "${attrName}" must be quoted`);
      /** @type {any} */ (err).code = 'MALFORMED_XML';
      throw err;
    }

    const quote = attrStr[i];
    i++; // Skip quote
    const valStart = i;
    const valEnd = attrStr.indexOf(quote, valStart);
    if (valEnd === -1) {
      const err = new Error(`MALFORMED_XML: Unclosed quoted attribute value for "${attrName}"`);
      /** @type {any} */ (err).code = 'MALFORMED_XML';
      throw err;
    }

    const rawVal = attrStr.slice(valStart, valEnd);
    const decodedVal = decodeXmlEntities(rawVal);
    i = valEnd + 1; // Skip quote

    if (attrs[attrName] !== undefined) {
      const err = new Error(`MALFORMED_XML: Duplicate attribute "${attrName}"`);
      /** @type {any} */ (err).code = 'MALFORMED_XML';
      throw err;
    }

    attrs[attrName] = decodedVal;

    if (i < len && !(attrStr[i] === ' ' || attrStr[i] === '\t' || attrStr[i] === '\n' || attrStr[i] === '\r')) {
      const err = new Error(`MALFORMED_XML: Attributes must be separated by whitespace after "${attrName}"`);
      /** @type {any} */ (err).code = 'MALFORMED_XML';
      throw err;
    }
  }

  return attrs;
}

/**
 * Parses XML string into an XmlNode tree.
 * Enforces single root, quoted attributes, valid entities, and strictly rejects DTD/XXE.
 *
 * @param {string} xml
 * @returns {XmlNode}
 */
export function parseXml(xml) {
  if (typeof xml !== 'string') {
    const err = new Error('MALFORMED_XML: XML input must be a string');
    /** @type {any} */ (err).code = 'MALFORMED_XML';
    throw err;
  }

  if (xml.charCodeAt(0) === 0xFEFF) {
    xml = xml.slice(1);
  }

  if (/<!DOCTYPE/i.test(xml)) {
    const error = new Error('XML_DTD_FORBIDDEN: DTD / DOCTYPE declarations are strictly forbidden for security reasons');
    /** @type {any} */ (error).code = 'XML_DTD_FORBIDDEN';
    throw error;
  }
  if (/<!ENTITY/i.test(xml)) {
    const error = new Error('XML_ENTITY_FORBIDDEN: XML ENTITY declarations are strictly forbidden for security reasons');
    /** @type {any} */ (error).code = 'XML_ENTITY_FORBIDDEN';
    throw error;
  }
  if (/<!(?:ELEMENT|ATTLIST|NOTATION)/i.test(xml)) {
    const error = new Error('XML_DTD_FORBIDDEN: DTD declarations are strictly forbidden for security reasons');
    /** @type {any} */ (error).code = 'XML_DTD_FORBIDDEN';
    throw error;
  }
  if (/<\?xml-stylesheet/i.test(xml)) {
    const error = new Error('XML_STYLESHEET_FORBIDDEN: XML stylesheet processing instructions are forbidden');
    /** @type {any} */ (error).code = 'XML_STYLESHEET_FORBIDDEN';
    throw error;
  }

  let pos = 0;
  const len = xml.length;
  let line = 1;

  const stack = [];
  let root = null;
  let rootClosed = false;

  while (pos < len) {
    const nextLt = xml.indexOf('<', pos);

    if (nextLt === -1) {
      const trailing = xml.slice(pos);
      if (/\S/.test(trailing)) {
        if (rootClosed || !root) {
          const err = new Error('MALFORMED_XML: Trailing text after root element');
          /** @type {any} */ (err).code = 'MALFORMED_XML';
          throw err;
        }
      }
      if (stack.length > 0) {
        const text = decodeXmlEntities(trailing);
        if (text) stack[stack.length - 1].children.push(text);
      }
      for (let j = pos; j < len; j++) {
        if (xml[j] === '\n') line++;
      }
      break;
    }

    if (nextLt > pos) {
      const textBetween = xml.slice(pos, nextLt);
      if (stack.length === 0) {
        if (/\S/.test(textBetween)) {
          if (!root) {
            const err = new Error('MALFORMED_XML: Junk text before root element');
            /** @type {any} */ (err).code = 'MALFORMED_XML';
            throw err;
          }
          if (rootClosed) {
            const err = new Error('MALFORMED_XML: Trailing text after root element');
            /** @type {any} */ (err).code = 'MALFORMED_XML';
            throw err;
          }
        }
      } else {
        const decoded = decodeXmlEntities(textBetween);
        if (decoded) {
          stack[stack.length - 1].children.push(decoded);
        }
      }
      for (let j = pos; j < nextLt; j++) {
        if (xml[j] === '\n') line++;
      }
    }

    pos = nextLt;
    const tagStartOffset = pos;
    const tagStartLine = line;

    // Comments: <!-- ... -->
    if (xml.startsWith('<!--', pos)) {
      const endCmt = xml.indexOf('-->', pos + 4);
      if (endCmt === -1) {
        const err = new Error('MALFORMED_XML: Unclosed XML comment');
        /** @type {any} */ (err).code = 'MALFORMED_XML';
        throw err;
      }
      for (let j = pos; j < endCmt + 3; j++) {
        if (xml[j] === '\n') line++;
      }
      pos = endCmt + 3;
      continue;
    }

    // Processing instructions: <? ... ?>
    if (xml.startsWith('<?', pos)) {
      const endPi = xml.indexOf('?>', pos + 2);
      if (endPi === -1) {
        const err = new Error('MALFORMED_XML: Unclosed processing instruction');
        /** @type {any} */ (err).code = 'MALFORMED_XML';
        throw err;
      }
      for (let j = pos; j < endPi + 2; j++) {
        if (xml[j] === '\n') line++;
      }
      pos = endPi + 2;
      continue;
    }

    // CDATA: <![CDATA[ ... ]]>
    if (xml.startsWith('<![CDATA[', pos)) {
      if (stack.length === 0) {
        const err = new Error('MALFORMED_XML: CDATA not allowed outside root element');
        /** @type {any} */ (err).code = 'MALFORMED_XML';
        throw err;
      }
      const endCdata = xml.indexOf(']]>', pos + 9);
      if (endCdata === -1) {
        const err = new Error('MALFORMED_XML: Unclosed CDATA block');
        /** @type {any} */ (err).code = 'MALFORMED_XML';
        throw err;
      }
      const cdataText = xml.slice(pos + 9, endCdata);
      stack[stack.length - 1].children.push(cdataText);
      for (let j = pos; j < endCdata + 3; j++) {
        if (xml[j] === '\n') line++;
      }
      pos = endCdata + 3;
      continue;
    }

    // Closing tag: </tag>
    if (xml[pos + 1] === '/') {
      const closeEnd = xml.indexOf('>', pos + 2);
      if (closeEnd === -1) {
        const err = new Error('MALFORMED_XML: Unclosed close tag');
        /** @type {any} */ (err).code = 'MALFORMED_XML';
        throw err;
      }
      const closeTag = xml.slice(pos + 2, closeEnd).trim();
      if (stack.length === 0) {
        const err = new Error(`MALFORMED_XML: Unexpected close tag </${closeTag}>`);
        /** @type {any} */ (err).code = 'MALFORMED_XML';
        throw err;
      }
      const top = stack.pop();
      if (top.tag !== closeTag) {
        const err = new Error(`MALFORMED_XML: Mismatched close tag: expected </${top.tag}>, got </${closeTag}>`);
        /** @type {any} */ (err).code = 'MALFORMED_XML';
        throw err;
      }
      top.endOffset = closeEnd + 1;
      if (stack.length === 0) {
        rootClosed = true;
      }
      for (let j = pos; j <= closeEnd; j++) {
        if (xml[j] === '\n') line++;
      }
      pos = closeEnd + 1;
      continue;
    }

    // Opening or self-closing tag
    if (rootClosed) {
      const err = new Error('MALFORMED_XML: Multiple root elements detected');
      /** @type {any} */ (err).code = 'MALFORMED_XML';
      throw err;
    }

    const tagEnd = xml.indexOf('>', pos + 1);
    if (tagEnd === -1) {
      const err = new Error('MALFORMED_XML: Unclosed open tag');
      /** @type {any} */ (err).code = 'MALFORMED_XML';
      throw err;
    }

    const isSelfClosing = xml[tagEnd - 1] === '/';
    const tagContent = xml.slice(pos + 1, isSelfClosing ? tagEnd - 1 : tagEnd).trim();

    const spaceIdx = tagContent.search(/\s/);
    const tagName = spaceIdx === -1 ? tagContent : tagContent.slice(0, spaceIdx);
    if (!/^[a-zA-Z_:][a-zA-Z0-9._:-]*$/.test(tagName)) {
      const err = new Error(`MALFORMED_XML: Invalid tag name "${tagName}"`);
      /** @type {any} */ (err).code = 'MALFORMED_XML';
      throw err;
    }

    const attrStr = spaceIdx === -1 ? '' : tagContent.slice(spaceIdx);
    const attrs = parseAttributes(attrStr);

    // Resolve in-scope namespaces
    const parent = stack.length > 0 ? stack[stack.length - 1] : null;
    const nsMap = Object.assign({}, parent ? parent.nsMap : null);

    for (const [key, val] of Object.entries(attrs)) {
      if (key === 'xmlns') {
        nsMap[''] = val;
      } else if (key.startsWith('xmlns:')) {
        const pfx = key.slice(6);
        nsMap[pfx] = val;
      }
    }

    // Resolve tag prefix and namespace URI
    const colonIdx = tagName.indexOf(':');
    const prefix = colonIdx === -1 ? '' : tagName.slice(0, colonIdx);
    const localName = colonIdx === -1 ? tagName : tagName.slice(colonIdx + 1);
    const nsUri = prefix ? nsMap[prefix] : (nsMap[''] || '');

    // Resolve attributes
    const resolvedAttrs = [];
    for (const [key, val] of Object.entries(attrs)) {
      const aColon = key.indexOf(':');
      const aPrefix = aColon === -1 ? '' : key.slice(0, aColon);
      const aLocal = aColon === -1 ? key : key.slice(aColon + 1);
      const aNs = aPrefix ? (aPrefix === 'xmlns' ? 'http://www.w3.org/2000/xmlns/' : (nsMap[aPrefix] || '')) : '';
      resolvedAttrs.push({
        name: key,
        prefix: aPrefix,
        localName: aLocal,
        nsUri: aNs,
        value: val
      });
    }

    const node = {
      tag: tagName,
      prefix,
      localName,
      nsUri,
      attrs,
      resolvedAttrs,
      nsMap,
      children: [],
      startOffset: tagStartOffset,
      endOffset: isSelfClosing ? tagEnd + 1 : 0,
      line: tagStartLine
    };

    if (stack.length > 0) {
      stack[stack.length - 1].children.push(node);
    } else if (!root) {
      root = node;
    }

    for (let j = pos; j <= tagEnd; j++) {
      if (xml[j] === '\n') line++;
    }

    if (isSelfClosing) {
      if (stack.length === 0) {
        rootClosed = true;
      }
    } else {
      stack.push(node);
    }
    pos = tagEnd + 1;
  }

  if (stack.length > 0) {
    const err = new Error(`MALFORMED_XML: Unclosed tag <${stack[stack.length - 1].tag}> at EOF`);
    /** @type {any} */ (err).code = 'MALFORMED_XML';
    throw err;
  }

  if (!root) {
    const err = new Error('MALFORMED_XML: Empty or invalid XML document');
    /** @type {any} */ (err).code = 'MALFORMED_XML';
    throw err;
  }

  return root;
}

export function isWordNode(node, localName) {
  if (!node || typeof node !== 'object') return false;
  const matchNs = WORD_NAMESPACES.has(node.nsUri);
  return matchNs && (!localName || node.localName === localName);
}

export function isMathNode(node, localName) {
  if (!node || typeof node !== 'object') return false;
  const matchNs = MATH_NAMESPACES.has(node.nsUri);
  return matchNs && (!localName || node.localName === localName);
}

export function isDrawingNode(node, localName) {
  if (!node || typeof node !== 'object') return false;
  if (localName && node.localName !== localName) return false;
  if (DRAWING_NAMESPACES.has(node.nsUri)) return true;
  if (WORD_NAMESPACES.has(node.nsUri) && (node.localName === 'drawing' || node.localName === 'pict' || node.localName === 'shape')) {
    return true;
  }
  return false;
}

export function findWordChild(node, localName) {
  if (!node || !Array.isArray(node.children)) return undefined;
  for (const child of node.children) {
    if (typeof child === 'object' && isWordNode(child, localName)) {
      return child;
    }
  }
  return undefined;
}

export function findWordChildren(node, localName) {
  if (!node || !Array.isArray(node.children)) return [];
  const results = [];
  for (const child of node.children) {
    if (typeof child === 'object' && isWordNode(child, localName)) {
      results.push(child);
    }
  }
  return results;
}

export function findMathChild(node, localName) {
  if (!node || !Array.isArray(node.children)) return undefined;
  for (const child of node.children) {
    if (typeof child === 'object' && isMathNode(child, localName)) {
      return child;
    }
  }
  return undefined;
}

export function findMathChildren(node, localName) {
  if (!node || !Array.isArray(node.children)) return [];
  const results = [];
  for (const child of node.children) {
    if (typeof child === 'object' && isMathNode(child, localName)) {
      results.push(child);
    }
  }
  return results;
}

export function getNodeAttr(node, namespaceSet, localName) {
  if (!node) return undefined;
  if (Array.isArray(node.resolvedAttrs)) {
    for (const attr of node.resolvedAttrs) {
      if (attr.localName === localName && namespaceSet.has(attr.nsUri)) {
        return attr.value;
      }
    }
    for (const attr of node.resolvedAttrs) {
      if (attr.localName === localName && !attr.nsUri) {
        return attr.value;
      }
    }
  }
  if (node.attrs) {
    if (node.attrs[localName] !== undefined) return node.attrs[localName];
    if (node.attrs[`w:${localName}`] !== undefined) return node.attrs[`w:${localName}`];
    if (node.attrs[`m:${localName}`] !== undefined) return node.attrs[`m:${localName}`];
    for (const [k, v] of Object.entries(node.attrs)) {
      if (k.endsWith(`:${localName}`)) return v;
    }
  }
  return undefined;
}

function recordDrawingUncertainty(node, fullXml, uncertainties, segId, offset, line) {
  const rawXml = fullXml.slice(node.startOffset, node.endOffset);
  uncertainties.push({
    id: `unc-${uncertainties.length + 1}`,
    kind: 'unsupported_drawing',
    type: 'unsupported_drawing',
    segmentId: segId,
    message: `Drawing element <${node.tag}> preserved without silent loss`,
    rawXml,
    xmlLocation: {
      file: 'word/document.xml',
      startOffset: node.startOffset,
      endOffset: node.endOffset,
      line: node.line,
      tag: node.tag
    },
    offset,
    line
  });
  return '[UNSUPPORTED_DRAWING]';
}

function recordOleUncertainty(node, fullXml, uncertainties, segId, offset, line) {
  const rawXml = fullXml.slice(node.startOffset, node.endOffset);
  uncertainties.push({
    id: `unc-${uncertainties.length + 1}`,
    kind: 'unsupported_object',
    type: 'unsupported_object',
    segmentId: segId,
    message: 'Embedded OLE binary object cannot be safely transpiled; marked placeholder without inventing content',
    rawXml,
    xmlLocation: {
      file: 'word/document.xml',
      startOffset: node.startOffset,
      endOffset: node.endOffset,
      line: node.line,
      tag: node.tag
    },
    offset,
    line
  });
  return '[UNSUPPORTED_OBJECT: OLE_OBJECT]';
}

/**
 * Finds first direct child node with given tag.
 *
 * @param {XmlNode} node
 * @param {string} tag
 * @returns {XmlNode | undefined}
 */
function findChild(node, tag) {
  if (!node || !Array.isArray(node.children)) return undefined;
  for (const child of node.children) {
    if (typeof child === 'object' && child.tag === tag) {
      return child;
    }
  }
  return undefined;
}

/**
 * Finds all direct child nodes with given tag.
 *
 * @param {XmlNode} node
 * @param {string} tag
 * @returns {Array<XmlNode>}
 */
function findChildren(node, tag) {
  if (!node || !Array.isArray(node.children)) return [];
  const results = [];
  for (const child of node.children) {
    if (typeof child === 'object' && child.tag === tag) {
      results.push(child);
    }
  }
  return results;
}

/**
 * Extracts all concatenated text content from an XmlNode and descendants.
 *
 * @param {XmlNode | string} node
 * @returns {string}
 */
function getTextContent(node) {
  if (typeof node === 'string') return node;
  if (!node || !Array.isArray(node.children)) return '';
  let text = '';
  for (const child of node.children) {
    text += getTextContent(child);
  }
  return text;
}

/**
 * Known math symbol mappings from unicode to LaTeX commands.
 */
const MATH_SYMBOL_MAP = Object.freeze(new Map([
  ['±', '\\pm '],
  ['×', '\\times '],
  ['÷', '\\div '],
  ['≠', '\\ne '],
  ['≤', '\\le '],
  ['≥', '\\ge '],
  ['≈', '\\approx '],
  ['∞', '\\infty '],
  ['→', '\\to '],
  ['←', '\\gets '],
  ['⇒', '\\Rightarrow '],
  ['⇔', '\\Leftrightarrow '],
  ['α', '\\alpha '],
  ['β', '\\beta '],
  ['γ', '\\gamma '],
  ['δ', '\\delta '],
  ['ε', '\\epsilon '],
  ['θ', '\\theta '],
  ['λ', '\\lambda '],
  ['μ', '\\mu '],
  ['π', '\\pi '],
  ['σ', '\\sigma '],
  ['ω', '\\omega '],
  ['Δ', '\\Delta '],
  ['∈', '\\in '],
  ['∉', '\\notin '],
  ['⊂', '\\subset '],
  ['⊆', '\\subseteq '],
  ['∪', '\\cup '],
  ['∩', '\\cap '],
  ['∅', '\\emptyset '],
  ['∀', '\\forall '],
  ['∃', '\\exists '],
  ['·', '\\cdot ']
]));

/**
 * Translates math symbols in plain math text into LaTeX syntax.
 *
 * @param {string} str
 * @returns {string}
 */
function translateMathSymbols(str) {
  const escapes = { '\\': '\\backslash ', '%': '\\%', '$': '\\$', '#': '\\#', '&': '\\&', '_': '\\_', '^': '\\text{\\textasciicircum}', '{': '\\{', '}': '\\}', '~': '\\text{\\textasciitilde}' };
  let out = '';
  for (const ch of str) {
    const repl = escapes[ch] ?? MATH_SYMBOL_MAP.get(ch);
    out += repl !== undefined ? repl : ch;
  }
  return out;
}

/**
 * OMML Transpiler & Exact Simple Structure Converter:
 * Converts known exact simple structures from Office Math Markup Language to LaTeX.
 * Preserves raw XML substring and positions in uncertainties.
 * Marks unsupported constructs / embedded OLE objects explicitly as unsupported instead of faking them.
 * Never invents learning objectives, tasks, or answers.
 *
 * @param {XmlNode} mathNode
 * @param {string} fullXml
 * @param {Array<Record<string, unknown>>} uncertainties
 * @param {number} startOffset
 * @param {number} startLine
 * @param {string} segId
 * @returns {{ latex: string, hasUnsupported: boolean }}
 */
function convertOmmlToLatex(mathNode, fullXml, uncertainties, startOffset, startLine, segId) {
  const rawXml = fullXml.slice(mathNode.startOffset, mathNode.endOffset);
  let hasUnsupported = false;

  function hidden(node, property, flag) {
    const properties = findMathChild(node, property);
    const value = properties && findMathChild(properties, flag);
    return !!value && ['1', 'true', 'on'].includes(getNodeAttr(value, MATH_NAMESPACES, 'val') ?? '1');
  }

  /**
   * Recursive node converter for OMML elements.
   *
   * @param {XmlNode | string} node
   * @returns {string}
   */
  function convert(node) {
    if (typeof node === 'string') {
      if (node.trim().length === 0) return '';
      return translateMathSymbols(node);
    }
    if (!node || typeof node !== 'object') {
      return '';
    }

    const isMath = isMathNode(node);
    const local = node.localName;

    // Math Run
    if (isMath && local === 'r') {
      let runText = '';
      for (const child of node.children) {
        if (typeof child === 'object' && (isMathNode(child, 't') || isWordNode(child, 't'))) {
          runText += translateMathSymbols(getTextContent(child));
        } else if (typeof child === 'object' && !(isMathNode(child, 'rPr') || isWordNode(child, 'rPr'))) {
          runText += unsupported(child);
        }
      }
      return runText;
    }

    // Fraction: <m:f>
    if (isMath && local === 'f') {
      const properties = findMathChild(node, 'fPr');
      const type = properties ? findMathChild(properties, 'type') : null;
      if (type && getNodeAttr(type, MATH_NAMESPACES, 'val') !== 'bar') return unsupported(node);
      const numNode = findMathChild(node, 'num');
      const denNode = findMathChild(node, 'den');
      const num = numNode ? convertChildren(numNode).trim() : '';
      const den = denNode ? convertChildren(denNode).trim() : '';
      return `\\frac{${num}}{${den}}`;
    }

    // Superscript: <m:sSup>
    if (isMath && local === 'sSup') {
      const eNode = findMathChild(node, 'e');
      const supNode = findMathChild(node, 'sup');
      const base = eNode ? convertChildren(eNode).trim() : '';
      const sup = supNode ? convertChildren(supNode).trim() : '';
      return `{${base}}^{${sup}}`;
    }

    // Subscript: <m:sSub>
    if (isMath && local === 'sSub') {
      const eNode = findMathChild(node, 'e');
      const subNode = findMathChild(node, 'sub');
      const base = eNode ? convertChildren(eNode).trim() : '';
      const sub = subNode ? convertChildren(subNode).trim() : '';
      return `{${base}}_{${sub}}`;
    }

    // Sub-Superscript: <m:sSubSup>
    if (isMath && local === 'sSubSup') {
      const eNode = findMathChild(node, 'e');
      const subNode = findMathChild(node, 'sub');
      const supNode = findMathChild(node, 'sup');
      const base = eNode ? convertChildren(eNode).trim() : '';
      const sub = subNode ? convertChildren(subNode).trim() : '';
      const sup = supNode ? convertChildren(supNode).trim() : '';
      return `{${base}}_{${sub}}^{${sup}}`;
    }

    // Radical / Square root: <m:rad>
    if (isMath && local === 'rad') {
      const eNode = findMathChild(node, 'e');
      const degNode = findMathChild(node, 'deg');
      const base = eNode ? convertChildren(eNode).trim() : '';
      const deg = degNode && !hidden(node, 'radPr', 'degHide') ? convertChildren(degNode).trim() : '';
      return deg ? `\\sqrt[${deg}]{${base}}` : `\\sqrt{${base}}`;
    }

    // Delimiter / Parentheses: <m:d>
    if (isMath && local === 'd') {
      const dPr = findMathChild(node, 'dPr');
      const begChrNode = dPr ? findMathChild(dPr, 'begChr') : null;
      const endChrNode = dPr ? findMathChild(dPr, 'endChr') : null;

      let beg = begChrNode ? (getNodeAttr(begChrNode, MATH_NAMESPACES, 'val') ?? '(') : '(';
      let end = endChrNode ? (getNodeAttr(endChrNode, MATH_NAMESPACES, 'val') ?? ')') : ')';

      const eNodes = findMathChildren(node, 'e');
      const sepNode = dPr ? findMathChild(dPr, 'sepChr') : null;
      const separator = sepNode ? getNodeAttr(sepNode, MATH_NAMESPACES, 'val') : '|';
      if (separator === undefined || separator === null) return unsupported(node);
      const inner = eNodes.map(e => convertChildren(e).trim()).join(translateMathSymbols(separator));

      let leftDelim = beg;
      let rightDelim = end;
      if (beg === '{') leftDelim = '\\{';
      if (beg === '') leftDelim = '.';
      if (end === '}') rightDelim = '\\}';
      if (end === '') rightDelim = '.';

      return `\\left${leftDelim}${inner}\\right${rightDelim}`;
    }

    // N-Ary (Sum, Integral, Product): <m:nary>
    if (isMath && local === 'nary') {
      const naryPr = findMathChild(node, 'naryPr');
      const chrNode = naryPr ? findMathChild(naryPr, 'chr') : null;
      const chr = chrNode ? getNodeAttr(chrNode, MATH_NAMESPACES, 'val') : '∫';

      let op = '\\int';
      if (chr === '∑' || chr === '\\sum') op = '\\sum';
      else if (chr === '∏' || chr === '\\prod') op = '\\prod';
      else if (chr === '∬') op = '\\iint';
      else if (chr === '∭') op = '\\iiint';
      else if (chr === '∮') op = '\\oint';
      else if (chr !== '∫') return unsupported(node);

      const subNode = findMathChild(node, 'sub');
      const supNode = findMathChild(node, 'sup');
      const eNode = findMathChild(node, 'e');

      const sub = subNode && !hidden(node, 'naryPr', 'subHide') ? convertChildren(subNode).trim() : '';
      const sup = supNode && !hidden(node, 'naryPr', 'supHide') ? convertChildren(supNode).trim() : '';
      const e = eNode ? convertChildren(eNode).trim() : '';

      let res = op;
      if (sub) res += `_{${sub}}`;
      if (sup) res += `^{${sup}}`;
      if (e) res += `{${e}}`;
      return res;
    }

    // Function: <m:func>
    if (isMath && local === 'func') {
      const fNameNode = findMathChild(node, 'fName');
      const eNode = findMathChild(node, 'e');
      const fName = fNameNode ? convertChildren(fNameNode).trim() : '';
      const e = eNode ? convertChildren(eNode).trim() : '';

      const knownMathFuncs = new Set([
        'lim', 'sin', 'cos', 'tan', 'cot', 'arcsin', 'arccos', 'arctan',
        'ln', 'log', 'exp', 'max', 'min', 'gcd', 'deg'
      ]);

      if (knownMathFuncs.has(fName)) {
        return `\\${fName}(${e})`;
      }
      return `${fName}(${e})`;
    }

    // Lower Limit: <m:limLow>
    if (isMath && (local === 'limLow' || local === 'limUpp')) {
      const eNode = findMathChild(node, 'e');
      const limNode = findMathChild(node, 'lim');
      const e = eNode ? convertChildren(eNode).trim() : '';
      const lim = limNode ? convertChildren(limNode).trim() : '';
      if (!['lim', 'max', 'min', 'sup', 'inf', 'limsup', 'liminf'].includes(e)) return unsupported(node);
      return `\\${e}\\limits${local === 'limLow' ? '_' : '^'}{${lim}}`;
    }

    // Overbar / Underbar: <m:bar>
    if (isMath && local === 'bar') {
      const barPr = findMathChild(node, 'barPr');
      const posNode = barPr ? findMathChild(barPr, 'pos') : null;
      const posVal = posNode ? (getNodeAttr(posNode, MATH_NAMESPACES, 'val') ?? 'top') : 'top';
      if (posVal !== 'top' && posVal !== 'bot') return unsupported(node);
      const eNode = findMathChild(node, 'e');
      const e = eNode ? convertChildren(eNode) : '';
      return posVal === 'bot' ? `\\underline{${e}}` : `\\overline{${e}}`;
    }

    // Accents: <m:acc>
    if (isMath && local === 'acc') {
      const accPr = findMathChild(node, 'accPr');
      const chrNode = accPr ? findMathChild(accPr, 'chr') : null;
      const chr = chrNode ? getNodeAttr(chrNode, MATH_NAMESPACES, 'val') : '^';
      const eNode = findMathChild(node, 'e');
      const e = eNode ? convertChildren(eNode) : '';

      let cmd = '\\hat';
      if (chr === '→' || chr === '⃗') cmd = '\\vec';
      else if (chr === '.' || chr === '̇') cmd = '\\dot';
      else if (chr === '..' || chr === '̈') cmd = '\\ddot';
      else if (chr === '~' || chr === '̃') cmd = '\\tilde';
      else if (chr !== '^' && chr !== '\u0302') return unsupported(node);
      return `${cmd}{${e}}`;
    }

    // Matrix: <m:m>
    if (isMath && local === 'm') {
      const rows = findMathChildren(node, 'mr');
      const rowStrings = rows.map(r => {
        const cols = findMathChildren(r, 'e');
        return cols.map(c => convertChildren(c).trim()).join(' & ');
      });
      return `\\begin{matrix} ${rowStrings.join(' \\\\ ')} \\end{matrix}`;
    }

    // Grouping Box / BorderBox
    if (isMath && (local === 'box' || local === 'borderBox')) {
      const eNode = findMathChild(node, 'e');
      return `{${eNode ? convertChildren(eNode) : ''}}`;
    }

    // Container tags: pass through children
    if (isMath && (local === 'oMath' || local === 'oMathPara' || local === 'e' || local === 'num' || local === 'den' || local === 'sub' || local === 'sup' || local === 'deg')) {
      return convertChildren(node);
    }

    // Ignore known property tags
    if (isMath && local.endsWith('Pr')) {
      return '';
    }

    // Mark unsupported OMML construct explicitly instead of faking math
    return unsupported(node);
  }

  /** @param {XmlNode} node */
  function unsupported(node) {
    const tag = node.tag;
    hasUnsupported = true;
    uncertainties.push({
      id: `unc-${uncertainties.length + 1}`,
      kind: 'unsupported_math_object',
      type: 'unsupported_math_object',
      segmentId: segId,
      message: `Unsupported OMML structure <${tag}> preserved without fake conversion`,
      tag,
      rawXml: fullXml.slice(node.startOffset, node.endOffset),
      xmlLocation: {
        file: 'word/document.xml',
        startOffset: node.startOffset,
        endOffset: node.endOffset,
        line: node.line,
        tag
      },
      offset: startOffset,
      line: startLine
    });

    return `[UNSUPPORTED_MATH_OBJECT: <${tag}>]`;
  }

  function convertChildren(node) {
    if (!node || !Array.isArray(node.children)) return '';
    let result = '';
    for (const child of node.children) {
      result += convert(child);
    }
    return result;
  }

  const latex = convert(mathNode).trim();

  // Preserve raw XML and position uncertainty for all converted OMML formulas
  uncertainties.push({
    id: `unc-${uncertainties.length + 1}`,
    kind: 'omml_math_preserved',
    type: 'omml_math_preserved',
    segmentId: segId,
    latex,
    rawXml,
    xmlLocation: {
      file: 'word/document.xml',
      startOffset: mathNode.startOffset,
      endOffset: mathNode.endOffset,
      line: mathNode.line,
      tag: mathNode.tag
    },
    offset: startOffset,
    line: startLine
  });

  // Validate converted LaTeX against KaTeX without throwing
  if (katex && typeof katex.renderToString === 'function' && !hasUnsupported && latex.length > 0) {
    try {
      katex.renderToString(latex, { throwOnError: true });
    } catch (err) {
      uncertainties.push({
        id: `unc-${uncertainties.length + 1}`,
        kind: 'invalid_math_syntax',
        type: 'invalid_math_syntax',
        segmentId: segId,
        message: `KaTeX parser syntax uncertainty for converted formula: ${err instanceof Error ? err.message : String(err)}`,
        raw: latex,
        offset: startOffset,
        line: startLine
      });
    }
  }

  return { latex, hasUnsupported };
}

/**
 * Extracts structured paragraph text, inline math, and embedded objects from a `<w:p>` node.
 *
 * @param {XmlNode} pNode
 * @param {string} fullXml
 * @param {Array<Record<string, unknown>>} uncertainties
 * @param {string} segId
 * @param {number} estOffset
 * @param {number} estLine
 * @returns {{ text: string, isOnlyDisplayMath: boolean, mathLatex?: string }}
 */
function recordWordUncertainty(node, fullXml, uncertainties, segId, offset, line) {
  uncertainties.push({
    id: `unc-${uncertainties.length + 1}`,
    kind: 'unsupported_word_content',
    type: 'unsupported_word_content',
    segmentId: segId,
    message: 'Word content preserved without interpreting fields, symbols, or tracked revision state',
    rawXml: fullXml.slice(node.startOffset, node.endOffset),
    xmlLocation: { file: 'word/document.xml', startOffset: node.startOffset, endOffset: node.endOffset, line: node.line, tag: node.tag },
    offset,
    line
  });
  return `[UNSUPPORTED_WORD_CONTENT: <${node.tag}>]`;
}

function extractParagraphContent(pNode, fullXml, uncertainties, segId, estOffset, estLine) {
  const metadataMarkers = ['bookmarkStart', 'bookmarkEnd', 'proofErr', 'lastRenderedPageBreak', 'commentRangeStart', 'commentRangeEnd'];
  let text = '';
  let onlyMath = null;
  let childCount = 0;

  for (const child of pNode.children) {
    if (typeof child !== 'object') continue;

    // Ignore paragraph properties
    if (isWordNode(child, 'pPr') || child.tag === 'w:pPr') continue;

    // These markers carry metadata only and must not affect paragraph shape.
    if (metadataMarkers.some(name => isWordNode(child, name))) continue;

    childCount++;

    // Text run
    if (isWordNode(child, 'r') || child.tag === 'w:r') {
      for (const rChild of child.children) {
        if (typeof rChild !== 'object') continue;
        if (metadataMarkers.some(name => isWordNode(rChild, name))) continue;
        if (isWordNode(rChild, 't') || rChild.tag === 'w:t') {
          text += getTextContent(rChild);
        } else if (isWordNode(rChild, 'noBreakHyphen') || rChild.tag === 'w:noBreakHyphen') {
          text += '-';
        } else if (isWordNode(rChild, 'softHyphen') || rChild.tag === 'w:softHyphen') {
          // A soft hyphen is only a line-breaking hint, not document text.
        } else if (isWordNode(rChild, 'tab') || rChild.tag === 'w:tab') {
          text += '\t';
        } else if (isWordNode(rChild, 'br') || isWordNode(rChild, 'cr') || rChild.tag === 'w:br' || rChild.tag === 'w:cr') {
          text += '\n';
        } else if (isDrawingNode(rChild) || rChild.localName === 'drawing' || rChild.localName === 'pict') {
          text += recordDrawingUncertainty(rChild, fullXml, uncertainties, segId, estOffset + text.length, estLine);
        } else if (isWordNode(rChild, 'object') || rChild.tag === 'w:object') {
          text += recordOleUncertainty(rChild, fullXml, uncertainties, segId, estOffset + text.length, estLine);
        } else if (!isWordNode(rChild, 'rPr')) {
          text += recordWordUncertainty(rChild, fullXml, uncertainties, segId, estOffset + text.length, estLine);
        }
      }
      continue;
    }

    // Top-level drawing or pict inside paragraph
    if (isDrawingNode(child) || child.localName === 'drawing' || child.localName === 'pict') {
      text += recordDrawingUncertainty(child, fullXml, uncertainties, segId, estOffset + text.length, estLine);
      continue;
    }

    // Hyperlink
    if (isWordNode(child, 'hyperlink') || child.tag === 'w:hyperlink') {
      text += extractParagraphContent(child, fullXml, uncertainties, segId, estOffset + text.length, estLine).text;
      continue;
    }

    // Inline or Display OMML Math
    if (isMathNode(child, 'oMath') || isMathNode(child, 'oMathPara') || child.tag === 'm:oMath' || child.tag === 'm:oMathPara') {
      const mathRes = convertOmmlToLatex(child, fullXml, uncertainties, estOffset + text.length, estLine, segId);
      if (childCount === 1) {
        onlyMath = mathRes.latex;
      } else {
        onlyMath = null;
      }
      text += `$${mathRes.latex}$`;
      continue;
    }

    // Embedded OLE / MathType object
    if (isWordNode(child, 'object') || child.tag === 'w:object') {
      const rawXml = fullXml.slice(child.startOffset, child.endOffset);
      uncertainties.push({
        id: `unc-${uncertainties.length + 1}`,
        kind: 'unsupported_object',
        type: 'unsupported_object',
        segmentId: segId,
        message: 'Embedded OLE binary object cannot be safely transpiled; marked placeholder without inventing content',
        rawXml,
        xmlLocation: {
          file: 'word/document.xml',
          startOffset: child.startOffset,
          endOffset: child.endOffset,
          line: child.line,
          tag: child.tag
        },
        offset: estOffset + text.length,
        line: estLine
      });
      text += '[UNSUPPORTED_OBJECT: OLE_OBJECT]';
      continue;
    }
    text += recordWordUncertainty(child, fullXml, uncertainties, segId, estOffset + text.length, estLine);
  }

  const isOnlyDisplayMath = childCount === 1 && onlyMath !== null;
  return {
    text: text.trim(),
    isOnlyDisplayMath,
    mathLatex: onlyMath || undefined
  };
}

/**
 * Extracts table rows and cells from `<w:tbl>` into standard Markdown table format.
 *
 * @param {XmlNode} tblNode
 * @param {string} fullXml
 * @param {Array<Record<string, unknown>>} uncertainties
 * @param {string} segId
 * @param {number} estOffset
 * @param {number} estLine
 * @returns {string}
 */
function extractTableMarkdown(tblNode, fullXml, uncertainties, segId, estOffset, estLine) {
  const rows = findWordChildren(tblNode, 'tr');
  const allRows = rows.length > 0 ? rows : findChildren(tblNode, 'w:tr');
  if (allRows.length === 0) return '';

  const tableMatrix = [];
  let maxCols = 0;

  for (const row of allRows) {
    const cells = findWordChildren(row, 'tc');
    const allCells = cells.length > 0 ? cells : findChildren(row, 'w:tc');
    const cellTexts = [];
    for (const cell of allCells) {
      const pNodes = findWordChildren(cell, 'p');
      const allP = pNodes.length > 0 ? pNodes : findChildren(cell, 'w:p');
      const cellContent = allP.map(p => {
        const { text } = extractParagraphContent(p, fullXml, uncertainties, segId, estOffset, estLine);
        return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
      }).filter(Boolean).join(' ');
      cellTexts.push(cellContent);
    }
    if (cellTexts.length > maxCols) {
      maxCols = cellTexts.length;
    }
    tableMatrix.push(cellTexts);
  }

  if (maxCols === 0) return '';

  // Pad cells to equal column count
  const normalizedMatrix = tableMatrix.map(row => {
    const padded = [...row];
    while (padded.length < maxCols) {
      padded.push('');
    }
    return padded;
  });

  const lines = [];
  // Row 0: Header
  lines.push(`| ${normalizedMatrix[0].join(' | ')} |`);
  // Row 1: Delimiter
  lines.push(`| ${new Array(maxCols).fill('---').join(' | ')} |`);
  // Remaining rows
  for (let i = 1; i < normalizedMatrix.length; i++) {
    lines.push(`| ${normalizedMatrix[i].join(' | ')} |`);
  }

  return lines.join('\n');
}

/**
 * Parses raw `word/document.xml` into structured paragraph, list, heading, and table blocks.
 * Retains exact XML offsets and source locations.
 *
 * @param {string} documentXml
 * @returns {{ segments: Array<any>, uncertainties: Array<any>, warnings: Array<string>, fullText: string }}
 */
function parseDocumentBlocks(documentXml) {
  const root = parseXml(documentXml);

  const rootLocal = root.localName || (root.tag.includes(':') ? root.tag.split(':')[1] : root.tag);
  if (rootLocal !== 'document') {
    const err = new Error(`MALFORMED_DOCX_ROOT: Expected root tag <document>, got <${root.tag}>`);
    /** @type {any} */ (err).code = 'MALFORMED_DOCX_ROOT';
    throw err;
  }

  const VALID_WORD_NAMESPACES = new Set([
    'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'http://purl.oclc.org/ooxml/wordprocessingml/main',
    'http://schemas.microsoft.com/office/word/2003/wordml'
  ]);

  if (root.nsUri && !VALID_WORD_NAMESPACES.has(root.nsUri)) {
    const err = new Error(`MALFORMED_DOCX_ROOT: Root element document has invalid or unknown namespace: ${root.nsUri}`);
    /** @type {any} */ (err).code = 'MALFORMED_DOCX_ROOT';
    throw err;
  }

  const body = findWordChild(root, 'body') || findChild(root, 'w:body');
  if (!body) {
    return { segments: [], uncertainties: [], warnings: [], fullText: '' };
  }

  const rawBlocks = [];
  const uncertainties = [];
  const warnings = [];

  let estOffset = 0;
  let estLine = 1;

  // Flatten body children, unwrapping <w:sdt> / <w:sdtContent>
  const elements = [];
  function collectElements(nodes) {
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      if (isWordNode(node, 'sdt') || node.tag === 'w:sdt' || node.localName === 'sdt') {
        const sdtContent = findWordChild(node, 'sdtContent') || findChild(node, 'w:sdtContent');
        if (sdtContent && Array.isArray(sdtContent.children)) {
          collectElements(sdtContent.children);
        } else {
          elements.push(node);
        }
      } else {
        elements.push(node);
      }
    }
  }
  collectElements(body.children);

  for (const child of elements) {
    if (typeof child !== 'object') continue;

    // 1. Table
    if (isWordNode(child, 'tbl') || child.tag === 'w:tbl') {
      const segId = `seg-${rawBlocks.length + 1}`;
      const mdTable = extractTableMarkdown(child, documentXml, uncertainties, segId, estOffset, estLine);
      if (mdTable.length > 0) {
        rawBlocks.push({
          id: segId,
          kind: 'table',
          text: mdTable,
          xmlLocation: {
            file: 'word/document.xml',
            startOffset: child.startOffset,
            endOffset: child.endOffset,
            line: child.line,
            tag: child.tag
          }
        });
      }
      continue;
    }

    // 2. Paragraph
    if (isWordNode(child, 'p') || child.tag === 'w:p') {
      const segId = `seg-${rawBlocks.length + 1}`;
      const pPr = findWordChild(child, 'pPr') || findChild(child, 'w:pPr');

      // Check Heading Style: <w:pStyle w:val="Heading1..6" />
      const pStyle = pPr ? (findWordChild(pPr, 'pStyle') || findChild(pPr, 'w:pStyle')) : null;
      const styleVal = pStyle && pStyle.attrs['w:val'] ? pStyle.attrs['w:val'] : (pStyle && pStyle.attrs['val'] ? pStyle.attrs['val'] : '');

      let headingLevel = 0;
      const headingMatch = styleVal.match(/heading\s*([1-6])/i) || styleVal.match(/Heading([1-6])/i);
      if (headingMatch) {
        headingLevel = parseInt(headingMatch[1], 10);
      } else if (/^title$/i.test(styleVal)) {
        headingLevel = 1;
      } else if (/^subtitle$/i.test(styleVal)) {
        headingLevel = 2;
      }

      // Check List Properties: <w:numPr>
      const numPr = pPr ? (findWordChild(pPr, 'numPr') || findChild(pPr, 'w:numPr')) : null;

      const { text, isOnlyDisplayMath, mathLatex } = extractParagraphContent(
        child,
        documentXml,
        uncertainties,
        segId,
        estOffset,
        estLine
      );

      if (text.length === 0) {
        // Skip empty paragraphs
        continue;
      }

      if (isOnlyDisplayMath && mathLatex) {
        rawBlocks.push({
          id: segId,
          kind: 'display_math',
          text: `$$${mathLatex}$$`,
          xmlLocation: {
            file: 'word/document.xml',
            startOffset: child.startOffset,
            endOffset: child.endOffset,
            line: child.line,
            tag: child.tag
          }
        });
        continue;
      }

      if (headingLevel > 0) {
        rawBlocks.push({
          id: segId,
          kind: 'heading',
          text: `${'#'.repeat(headingLevel)} ${text}`,
          xmlLocation: {
            file: 'word/document.xml',
            startOffset: child.startOffset,
            endOffset: child.endOffset,
            line: child.line,
            tag: child.tag
          }
        });
        continue;
      }

      if (numPr) {
        const ilvlNode = findWordChild(numPr, 'ilvl') || findChild(numPr, 'w:ilvl');
        const ilvlVal = ilvlNode && (ilvlNode.attrs['w:val'] !== undefined ? ilvlNode.attrs['w:val'] : ilvlNode.attrs['val']);
        const ilvl = ilvlVal ? parseInt(ilvlVal, 10) : 0;
        const indent = '  '.repeat(Math.max(0, ilvl));
        const listText = /^\s*(?:[*+-]|\d+[.)])\s+/.test(text) ? `${indent}${text}` : `${indent}- ${text}`;

        rawBlocks.push({
          id: segId,
          kind: 'list',
          text: listText,
          xmlLocation: {
            file: 'word/document.xml',
            startOffset: child.startOffset,
            endOffset: child.endOffset,
            line: child.line,
            tag: child.tag
          }
        });
        continue;
      }

      // Standard paragraph
      rawBlocks.push({
        id: segId,
        kind: 'paragraph',
        text,
        xmlLocation: {
          file: 'word/document.xml',
          startOffset: child.startOffset,
          endOffset: child.endOffset,
          line: child.line,
          tag: child.tag
        }
      });
      continue;
    }
    if (isWordNode(child, 'sectPr')) continue;
    const segId = `seg-${rawBlocks.length + 1}`;
    const text = recordWordUncertainty(child, documentXml, uncertainties, segId, estOffset, estLine);
    rawBlocks.push({ id: segId, kind: 'paragraph', text, xmlLocation: { file: 'word/document.xml', startOffset: child.startOffset, endOffset: child.endOffset, line: child.line, tag: child.tag } });
  }

  // Assemble full reconstructed text and compute deterministic exact character spans
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
      id: block.id,
      kind: block.kind,
      text: block.text,
      start,
      end,
      lineStart,
      lineEnd
    };

    // Attach non-enumerable XML location metadata so it doesn't violate strict key allowlists
    Object.defineProperty(seg, 'xmlLocation', {
      value: Object.freeze(block.xmlLocation),
      enumerable: false,
      configurable: false,
      writable: false
    });

    segments.push(seg);
  }

  const fullText = fullTextParts.join('');

  return {
    segments,
    uncertainties,
    warnings,
    fullText
  };
}

/**
 * Validates a SourceExtraction object produced by DOCX importer.
 *
 * @param {unknown} extraction
 * @param {Uint8Array} [originalBytes]
 * @returns {{ ok: boolean, errors: Array<{code: string, path: string, message: string}> }}
 */
export function validateDocxExtraction(extraction, originalBytes) {
  const errors = [];

  if (!extraction || typeof extraction !== 'object' || Array.isArray(extraction)) {
    return {
      ok: false,
      errors: [{ code: 'INVALID_EXTRACTION', path: '', message: 'SourceExtraction must be a non-null object' }]
    };
  }

  const ext = /** @type {Record<string, any>} */ (extraction);

  for (const key of Object.keys(ext)) {
    if (!ALLOWED_DOCX_EXTRACTION_KEYS.has(key)) {
      errors.push({ code: 'UNKNOWN_EXTRACTION_KEY', path: key, message: `Unknown SourceExtraction key: ${key}` });
    }
  }

  if (ext.schemaVersion !== '1.0.0') {
    errors.push({ code: 'INVALID_SCHEMA_VERSION', path: 'schemaVersion', message: 'schemaVersion must be "1.0.0"' });
  }

  if (ext.kind !== 'docx') {
    errors.push({ code: 'INVALID_KIND', path: 'kind', message: 'kind must be "docx"' });
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

      if (!ALLOWED_DOCX_SEGMENT_KINDS.has(seg.kind)) {
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

      if (typeof seg.text === 'string' && seg.end - seg.start !== seg.text.length) {
        errors.push({ code: 'SPAN_LENGTH_MISMATCH', path: prefix, message: 'Span length does not match text length' });
      }

      if (seg.start < lastEnd) {
        errors.push({ code: 'OVERLAPPING_SEGMENT', path: `${prefix}.start`, message: 'Segment overlaps previous segment' });
      }
      lastEnd = seg.end;
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
 * Capability detector for document import formats.
 * DOCX is fully supported in this slice.
 * PDF remains next slice (manual paste fallback).
 *
 * @param {unknown} input
 * @returns {{ ok: boolean, supported: boolean, format?: string, fallback?: string, manualPasteFallback?: boolean, message: string }}
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

  if (kind === 'docx' ||
      kind === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      /\.docx$/i.test(name)) {
    return {
      ok: true,
      supported: true,
      format: 'docx',
      fallback: null,
      manualPasteFallback: false,
      message: 'DOCX binary format is fully supported for deterministic extraction.'
    };
  }

  if (kind === 'pdf' ||
      kind === 'application/pdf' ||
      /\.pdf$/i.test(name)) {
    return {
      ok: false,
      supported: false,
      format: 'pdf',
      fallback: 'manual_paste',
      manualPasteFallback: true,
      message: 'PDF binary format is not supported in this slice. Please use manual paste fallback.'
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
 * Primary DOCX Importer:
 * Parses bounded DOCX ZIP deterministically, extracts word/document.xml to structured blocks,
 * retains XML/source locations, computes deterministic SHA-256 on original binary bytes,
 * converts known exact OMML math structures while recording position uncertainties,
 * and marks unsupported objects explicitly instead of faking them.
 *
 * @param {unknown} input
 * @param {Record<string, unknown>} [options]
 * @returns {Record<string, unknown>} SourceExtraction or structured error result
 */
export function importDocx(input, options = {}) {
  const valResult = validateDocxInput(input, options);
  if (!valResult.ok) {
    return valResult;
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

  // Bounded unzipping
  let docXml;
  try {
    const archive = parseDocxArchive(originalBytes, {
      maxEntries: options.maxEntries ?? normalized.maxEntries,
      maxDecompressedBytes: options.maxDecompressedBytes ?? normalized.maxDecompressedBytes,
      maxEntryBytes: options.maxEntryBytes ?? normalized.maxEntryBytes,
      maxRatio: options.maxRatio ?? normalized.maxRatio
    });
    docXml = archive.documentXml;
  } catch (err) {
    const code = /** @type {any} */ (err).code || 'ZIP_PARSE_ERROR';
    return {
      ok: false,
      status: 'error',
      errors: [{
        code,
        path: 'bytes',
        message: err instanceof Error ? err.message : String(err)
      }]
    };
  }

  // Parse XML and extract structured blocks
  let parsedBlocks;
  try {
    parsedBlocks = parseDocumentBlocks(docXml);
  } catch (err) {
    const code = /** @type {any} */ (err).code || 'XML_PARSE_ERROR';
    return {
      ok: false,
      status: 'error',
      errors: [{
        code,
        path: 'word/document.xml',
        message: err instanceof Error ? err.message : String(err)
      }]
    };
  }

  const extraction = {
    schemaVersion: '1.0.0',
    id,
    kind: 'docx',
    originalName,
    sha256,
    bytes,
    status: 'needs_review',
    segments: parsedBlocks.segments,
    uncertainties: parsedBlocks.uncertainties,
    warnings: parsedBlocks.warnings
  };

  // Define non-enumerable helper properties
  Object.defineProperty(extraction, 'ok', {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false
  });

  Object.defineProperty(extraction, 'text', {
    value: parsedBlocks.fullText,
    enumerable: false,
    configurable: false,
    writable: false
  });

  return deepFreeze(extraction);
}
