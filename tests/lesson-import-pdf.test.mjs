import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import {
  importPdf,
  validatePdfInput,
  validatePdfExtraction,
  detectCapability,
  PDF_MAX_BYTES,
  PDF_MAX_PAGES,
  PDF_MAX_TOTAL_TEXT_BYTES,
  PDF_MAX_PAGE_TEXT_BYTES,
  ALLOWED_PDF_SEGMENT_KINDS,
  ALLOWED_PDF_EXTRACTION_KEYS
} from '../lib/lesson/import/pdf.js';
import { isPdfjsWorkerHandlerAvailable } from '../lib/lesson/import/pdf.js';

/**
 * Helper to construct valid in-memory PDF 1.4 documents without native or external dependencies.
 *
 * @param {Array<string | Array<string | { text: string, fontSize?: number, x?: number, y?: number }>>} pages
 * @returns {Uint8Array}
 */
function createPdfFixture(pages) {
  const objects = [];
  let currentObj = 1;

  const catalogObjNum = currentObj++;
  const pagesObjNum = currentObj++;
  const fontObjNum = currentObj++;

  const pageObjNums = [];
  const contentObjNums = [];

  for (let i = 0; i < pages.length; i++) {
    pageObjNums.push(currentObj++);
    contentObjNums.push(currentObj++);
  }

  // 1: Catalog
  objects.push(`${catalogObjNum} 0 obj\n<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>\nendobj`);

  // 2: Pages
  const kidsStr = pageObjNums.map(n => `${n} 0 R`).join(' ');
  objects.push(`${pagesObjNum} 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${pages.length} >>\nendobj`);

  // 3: Font
  objects.push(`${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);

  // Pages and Contents
  for (let i = 0; i < pages.length; i++) {
    const pageObjNum = pageObjNums[i];
    const contentObjNum = contentObjNums[i];
    const pageData = pages[i];

    objects.push(`${pageObjNum} 0 obj\n<< /Type /Page /Parent ${pagesObjNum} 0 R /MediaBox [0 0 612 792] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> >>\nendobj`);

    let streamContent = '';
    const hasData = pageData && (typeof pageData === 'string' ? pageData.length > 0 : pageData.length > 0);

    if (hasData) {
      const items = Array.isArray(pageData) ? pageData : pageData.split('\n');
      let currentY = 700;
      streamContent += 'BT\n';

      for (const item of items) {
        let text = '';
        let fontSize = 12;
        let x = 100;
        let y = currentY;

        if (typeof item === 'string') {
          text = item;
        } else if (item && typeof item === 'object') {
          text = item.text || '';
          if (item.fontSize) fontSize = item.fontSize;
          if (item.x !== undefined) x = item.x;
          if (item.y !== undefined) y = item.y;
        }

        const escaped = text
          .replace(/\\/g, '\\\\')
          .replace(/\(/g, '\\(')
          .replace(/\)/g, '\\)');

        streamContent += `/F1 ${fontSize} Tf\n${x} ${y} Td\n(${escaped}) Tj\n-${x} -${y} Td\n`;
        currentY = y - (fontSize * 1.5);
      }

      streamContent += 'ET\n';
    }

    const streamBytes = new TextEncoder().encode(streamContent);
    objects.push(`${contentObjNum} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${streamContent}\nendstream\nendobj`);
  }

  // Build PDF file with cross-reference table
  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (const objStr of objects) {
    offsets.push(pdf.length);
    pdf += objStr + '\n';
  }

  const startXref = pdf.length;
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }

  pdf += `trailer\n<< /Size ${offsets.length} /Root ${catalogObjNum} 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}

/**
 * Constructs an encrypted/password-protected PDF fixture for testing security error boundaries.
 *
 * @returns {Uint8Array}
 */
function createEncryptedPdfFixture() {
  const pdf = [
    '%PDF-1.4',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj',
    '4 0 obj << /Filter /Standard /V 1 /R 2 /O (12345678901234567890123456789012) /U (12345678901234567890123456789012) /P -4 >> endobj',
    'xref',
    '0 5',
    '0000000000 65535 f ',
    '0000000009 00000 n ',
    '0000000058 00000 n ',
    '0000000115 00000 n ',
    '0000000192 00000 n ',
    'trailer << /Size 5 /Root 1 0 R /Encrypt 4 0 R /ID [<12345678901234567890123456789012><12345678901234567890123456789012>] >>',
    'startxref',
    '320',
    '%%EOF'
  ].join('\n');
  return new TextEncoder().encode(pdf);
}

test('PDF constants and key allowlists align with architecture contracts', () => {
  assert.equal(isPdfjsWorkerHandlerAvailable(), true);
  assert.equal(PDF_MAX_BYTES, 10 * 1024 * 1024);
  assert.equal(PDF_MAX_PAGES, 100);
  assert.equal(PDF_MAX_TOTAL_TEXT_BYTES, 5 * 1024 * 1024);
  assert.equal(PDF_MAX_PAGE_TEXT_BYTES, 1 * 1024 * 1024);

  assert.ok(ALLOWED_PDF_SEGMENT_KINDS.has('heading'));
  assert.ok(ALLOWED_PDF_SEGMENT_KINDS.has('list'));
  assert.ok(ALLOWED_PDF_SEGMENT_KINDS.has('paragraph'));
  assert.ok(ALLOWED_PDF_SEGMENT_KINDS.has('table'));
  assert.ok(ALLOWED_PDF_SEGMENT_KINDS.has('display_math'));

  assert.deepEqual(
    [...ALLOWED_PDF_EXTRACTION_KEYS].sort(),
    ['bytes', 'id', 'kind', 'originalName', 'schemaVersion', 'segments', 'sha256', 'status', 'uncertainties', 'warnings'].sort()
  );
});

test('importPdf is stable across concurrent and repeated server parses', async () => {
  const pdfBytes = createPdfFixture([['Concurrent parser text.']]);
  const results = await Promise.all([
    importPdf(pdfBytes),
    importPdf(pdfBytes),
    importPdf(pdfBytes),
    importPdf(pdfBytes)
  ]);

  assert.ok(results.every(result => result.ok === true));
  assert.equal(new Set(results.map(result => result.sha256)).size, 1);
  assert.equal(new Set(results.map(result => result.segments[0].text)).size, 1);
});

test('detectCapability correctly reports PDF format capability', () => {
  const pdfCap = detectCapability({ kind: 'pdf' });
  assert.equal(pdfCap.ok, true);
  assert.equal(pdfCap.supported, true);
  assert.equal(pdfCap.format, 'pdf');
  assert.equal(pdfCap.fallback, null);
  assert.equal(pdfCap.manualPasteFallback, false);

  const pdfAppCap = detectCapability({ kind: 'application/pdf' });
  assert.equal(pdfAppCap.supported, true);

  const pdfNameCap = detectCapability({ originalName: 'grade11-math.pdf' });
  assert.equal(pdfNameCap.supported, true);

  const unknownCap = detectCapability({ kind: 'xyz_unknown' });
  assert.equal(unknownCap.supported, false);
  assert.equal(unknownCap.fallback, 'manual_paste');
  assert.equal(unknownCap.manualPasteFallback, true);
});

test('validatePdfInput enforces type bounds, magic bytes, and maxBytes limits', () => {
  // Invalid inputs
  assert.equal(validatePdfInput(null).ok, false);
  assert.equal(validatePdfInput('not a buffer').ok, false);
  assert.equal(validatePdfInput(12345).ok, false);

  // Missing magic header '%PDF-'
  const invalidHeader = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);
  const resBadHeader = validatePdfInput(invalidHeader);
  assert.equal(resBadHeader.ok, false);
  assert.equal(resBadHeader.errors[0].code, 'INVALID_PDF_SIGNATURE');

  // Valid header
  const validHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]);
  assert.equal(validatePdfInput(validHeader).ok, true);

  // Exceeds maxBytes
  const resOversize = validatePdfInput(validHeader, { maxBytes: 4 });
  assert.equal(resOversize.ok, false);
  assert.equal(resOversize.errors[0].code, 'MAX_BYTES_EXCEEDED');
});

test('importPdf extracts text from single-page PDF with exact character spans and metadata', async () => {
  const pdfBytes = createPdfFixture([
    ['Doan van dau tien cua bai hoc.', 'Noi dung chi tiet cua bai hoc Toan hoc.']
  ]);

  const extraction = await importPdf({ bytes: pdfBytes, originalName: 'bai-tap.pdf' });

  assert.equal(extraction.ok, true);
  assert.equal(extraction.kind, 'pdf');
  assert.equal(extraction.originalName, 'bai-tap.pdf');
  assert.equal(extraction.status, 'needs_review');
  assert.ok(extraction.segments.length >= 1);

  // Verify exact spans in extraction.text
  for (const seg of extraction.segments) {
    assert.equal(extraction.text.slice(seg.start, seg.end), seg.text);
    assert.equal(seg.end - seg.start, seg.text.length);
    assert.ok(seg.lineStart >= 1);
    assert.ok(seg.lineEnd >= seg.lineStart);

    // Verify location metadata
    assert.ok(seg.pdfLocation);
    assert.equal(seg.pdfLocation.pageNumber, 1);
    assert.equal(seg.pageNumber, 1);
  }

  // Schema validation
  const validation = validatePdfExtraction(extraction, pdfBytes);
  assert.equal(validation.ok, true);
  assert.equal(validation.errors.length, 0);
});

test('importPdf extracts multi-page PDF preserving page numbers and spans', async () => {
  const pdfBytes = createPdfFixture([
    ['Noi dung trang mot.'],
    ['Noi dung trang hai.'],
    ['Noi dung trang ba ket thuc.']
  ]);

  const extraction = await importPdf(pdfBytes);

  assert.equal(extraction.ok, true);
  assert.equal(extraction.segments.length, 3);

  assert.equal(extraction.segments[0].pageNumber, 1);
  assert.equal(extraction.segments[0].pdfLocation.pageNumber, 1);
  assert.equal(extraction.segments[0].text, 'Noi dung trang mot.');

  assert.equal(extraction.segments[1].pageNumber, 2);
  assert.equal(extraction.segments[1].pdfLocation.pageNumber, 2);
  assert.equal(extraction.segments[1].text, 'Noi dung trang hai.');

  assert.equal(extraction.segments[2].pageNumber, 3);
  assert.equal(extraction.segments[2].pdfLocation.pageNumber, 3);
  assert.equal(extraction.segments[2].text, 'Noi dung trang ba ket thuc.');

  // Check character span non-overlap
  assert.ok(extraction.segments[1].start >= extraction.segments[0].end);
  assert.ok(extraction.segments[2].start >= extraction.segments[1].end);

  const validation = validatePdfExtraction(extraction, pdfBytes);
  assert.equal(validation.ok, true);
});

test('importPdf detects headings, lists, display math, and tables', async () => {
  const pageItems = [
    { text: 'Chuong 1: Day so va Cap so cong', fontSize: 24, y: 720 },
    { text: '- Dieu kien tien quyet 1', fontSize: 12, y: 670 },
    { text: '- Dieu kien tien quyet 2', fontSize: 12, y: 650 },
    { text: '$$u_n = u_1 + (n - 1)d$$', fontSize: 14, y: 600 },
    { text: '| n | u_n |', fontSize: 12, y: 550 },
    { text: '| 1 | 5 |', fontSize: 12, y: 530 }
  ];

  const pdfBytes = createPdfFixture([pageItems]);
  const extraction = await importPdf(pdfBytes);

  assert.equal(extraction.ok, true);
  const kinds = extraction.segments.map(s => s.kind);

  assert.ok(kinds.includes('heading'));
  assert.ok(kinds.includes('list'));
  assert.ok(kinds.includes('display_math'));
  assert.ok(kinds.includes('table'));

  const mathSeg = extraction.segments.find(s => s.kind === 'display_math');
  assert.ok(mathSeg);
  assert.ok(mathSeg.text.includes('u_n = u_1 + (n - 1)d'));
});

test('importPdf detects image-only pages and emits explicit OCR_REQUIRED uncertainty', async () => {
  // Page 1 has text, Page 2 is empty (scanned image-only)
  const pdfBytes = createPdfFixture([
    ['Trang 1 co van ban day du.'],
    '' // Empty content stream (image-only scanned page)
  ]);

  const extraction = await importPdf(pdfBytes);

  assert.equal(extraction.ok, true);
  assert.equal(extraction.segments.length, 1);
  assert.equal(extraction.segments[0].pageNumber, 1);

  // Check OCR_REQUIRED uncertainty on page 2
  const ocrUncertainty = extraction.uncertainties.find(u => u.kind === 'ocr_required');
  assert.ok(ocrUncertainty, 'Should emit an ocr_required uncertainty for empty page');
  assert.equal(ocrUncertainty.page, 2);
  assert.ok(ocrUncertainty.message.includes('OCR is required'));

  // Check warnings
  assert.ok(extraction.warnings.some(w => w.includes('OCR_REQUIRED')));
});

test('importPdf handles completely image-only documents gracefully with OCR_REQUIRED', async () => {
  // All pages have no text layers (pure scan)
  const pdfBytes = createPdfFixture(['', '']);
  const extraction = await importPdf(pdfBytes);

  assert.equal(extraction.ok, true);
  assert.equal(extraction.segments.length, 0);
  assert.equal(extraction.status, 'needs_review');

  const ocrUncertainties = extraction.uncertainties.filter(u => u.kind === 'ocr_required');
  assert.equal(ocrUncertainties.length, 2);

  assert.ok(extraction.warnings.some(w => w.includes('Document contains no extractable text layers')));
  assert.equal(validatePdfExtraction(extraction, pdfBytes).ok, true);
});

test('importPdf returns structured ENCRYPTED_PDF error for password-protected files', async () => {
  const encBytes = createEncryptedPdfFixture();
  const res = await importPdf(encBytes);

  assert.equal(res.ok, false);
  assert.equal(res.status, 'error');
  assert.ok(res.errors && res.errors.length > 0);
  assert.equal(res.errors[0].code, 'ENCRYPTED_PDF');
  assert.ok(res.errors[0].message.includes('password'));
});

test('importPdf returns structured CORRUPTED_PDF error for malformed PDF bytes', async () => {
  const corruptedBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x42, 0x41, 0x44]);
  const res = await importPdf(corruptedBytes);

  assert.equal(res.ok, false);
  assert.equal(res.status, 'error');
  assert.ok(res.errors && res.errors.length > 0);
  assert.equal(res.errors[0].code, 'CORRUPTED_PDF');
});

test('importPdf enforces bounded page limits (MAX_PAGES_EXCEEDED)', async () => {
  const pages = ['Page 1', 'Page 2', 'Page 3', 'Page 4'];
  const pdfBytes = createPdfFixture(pages);

  const res = await importPdf({ bytes: pdfBytes, maxPages: 2 });
  assert.equal(res.ok, false);
  assert.equal(res.status, 'error');
  assert.equal(res.errors[0].code, 'MAX_PAGES_EXCEEDED');
});

test('importPdf enforces bounded text limits (MAX_PAGE_TEXT_EXCEEDED & MAX_TOTAL_TEXT_EXCEEDED)', async () => {
  const lines = [
    'Dong 1: ' + 'A'.repeat(50),
    'Dong 2: ' + 'B'.repeat(50),
    'Dong 3: ' + 'C'.repeat(50)
  ];
  const pdfBytes = createPdfFixture([lines]);

  // Exceeds maxPageTextBytes
  const resPage = await importPdf({ bytes: pdfBytes, maxPageTextBytes: 100 });
  assert.equal(resPage.ok, false);
  assert.equal(resPage.errors[0].code, 'MAX_PAGE_TEXT_EXCEEDED');

  // Exceeds maxTotalTextBytes
  const resTotal = await importPdf({ bytes: pdfBytes, maxTotalTextBytes: 100 });
  assert.equal(resTotal.ok, false);
  assert.equal(resTotal.errors[0].code, 'MAX_TOTAL_TEXT_EXCEEDED');
});

test('importPdf computes deterministic SHA-256 matching original binary bytes', async () => {
  const pdfBytes = createPdfFixture(['Day so va quy nap toan hoc']);
  const expectedHash = createHash('sha256').update(pdfBytes).digest('hex');

  const extraction = await importPdf(pdfBytes);

  assert.equal(extraction.sha256, expectedHash);
  assert.equal(extraction.bytes, pdfBytes.byteLength);
  assert.equal(extraction.id, `src-${expectedHash.slice(0, 16)}`);
});

test('importPdf validates LaTeX math and captures math uncertainties without corrupting text', async () => {
  const pageItems = [
    { text: 'Cong thuc hop le: $S_n = \\frac{n(u_1 + u_n)}{2}$', fontSize: 12, y: 700 },
    { text: 'Cong thuc loi cu phap: $$\\frac{incomplete$$', fontSize: 12, y: 650 }
  ];

  const pdfBytes = createPdfFixture([pageItems]);
  const extraction = await importPdf(pdfBytes);

  assert.equal(extraction.ok, true);

  // Text remains uncorrupted
  assert.ok(extraction.text.includes('S_n = \\frac{n(u_1 + u_n)}{2}'));
  assert.ok(extraction.text.includes('\\frac{incomplete'));

  // Captures math uncertainty
  const mathUnc = extraction.uncertainties.find(u =>
    u.kind === 'invalid_math_syntax' || u.kind === 'math_delimiter_malformed'
  );
  assert.ok(mathUnc, 'Should register a math uncertainty for invalid syntax');
});

test('importPdf does not invent learning objectives, tasks, or answers', async () => {
  const rawText = 'Van ban goc ve toan hoc khong he co cau hoi hay dap an nao.';
  const pdfBytes = createPdfFixture([rawText]);

  const extraction = await importPdf(pdfBytes);

  // Extraction keys are strictly standard
  for (const key of Object.keys(extraction)) {
    assert.ok(ALLOWED_PDF_EXTRACTION_KEYS.has(key));
  }

  // No answerKey, tasks, or LOs invented
  assert.equal(extraction.tasks, undefined);
  assert.equal(extraction.answerKey, undefined);
  assert.equal(extraction.learningObjectives, undefined);
  assert.equal(extraction.status, 'needs_review');
});

test('SourceExtraction output is deeply frozen and rejects mutations', async () => {
  const pdfBytes = createPdfFixture(['Bat bien du lieu']);
  const extraction = await importPdf(pdfBytes);

  assert.ok(Object.isFrozen(extraction));
  assert.ok(Object.isFrozen(extraction.segments));
  if (extraction.segments.length > 0) {
    assert.ok(Object.isFrozen(extraction.segments[0]));
  }

  assert.throws(() => {
    // @ts-expect-error mutating frozen object
    extraction.status = 'tampered';
  }, TypeError);

  assert.throws(() => {
    // @ts-expect-error mutating frozen array
    extraction.segments.push({ kind: 'paragraph', text: 'tampered' });
  }, TypeError);
});

test('importPdf accepts ArrayBuffer and objects with buffer property (worker-safe)', async () => {
  const pdfBytes = createPdfFixture(['Kiem tra ArrayBuffer ho tro']);
  const arrayBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);

  // Pass ArrayBuffer directly
  const ext1 = await importPdf(arrayBuffer);
  assert.equal(ext1.ok, true);
  assert.equal(ext1.bytes, pdfBytes.byteLength);

  // Pass object with buffer property
  const ext2 = await importPdf({ buffer: arrayBuffer, originalName: 'custom.pdf' });
  assert.equal(ext2.ok, true);
  assert.equal(ext2.originalName, 'custom.pdf');
});

test('importPdf observed payload conforms to production canary contract (status needs_review, segmentsCount > 0, errors empty, valid sha256, workerHandler registered)', async () => {
  assert.equal(isPdfjsWorkerHandlerAvailable(), true);
  const pdfBytes = createPdfFixture([['Contract test content']]);
  const res = await importPdf(pdfBytes);
  assert.equal(res.ok, true);
  assert.ok(res.status === 'needs_review' || res.status === 'ok');
  assert.ok(Array.isArray(res.segments) && res.segments.length > 0);
  assert.ok(typeof res.sha256 === 'string' && /^[0-9a-f]{64}$/i.test(res.sha256));
  assert.equal(res.errors, undefined);
});
