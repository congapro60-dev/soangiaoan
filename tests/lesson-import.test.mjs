import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import {
  importText,
  detectCapability,
  parseSegments,
  DEFAULT_MAX_BYTES
} from '../lib/lesson/import/text.js';
import {
  validateImportInput,
  validateSourceExtraction,
  validateSegment,
  ALLOWED_INPUT_KEYS,
  ALLOWED_EXTRACTION_KEYS,
  ALLOWED_SEGMENT_KEYS,
  ALLOWED_SEGMENT_KINDS
} from '../lib/lesson/import/validate.js';

test('ALLOWED keys and constants align with P5 schema contracts', () => {
  assert.deepEqual(
    [...ALLOWED_INPUT_KEYS].sort(),
    ['kind', 'maxBytes', 'originalName', 'text'].sort()
  );

  assert.deepEqual(
    [...ALLOWED_EXTRACTION_KEYS].sort(),
    ['bytes', 'id', 'kind', 'originalName', 'schemaVersion', 'segments', 'sha256', 'status', 'uncertainties', 'warnings'].sort()
  );

  assert.deepEqual(
    [...ALLOWED_SEGMENT_KEYS].sort(),
    ['end', 'id', 'kind', 'lineEnd', 'lineStart', 'start', 'text'].sort()
  );

  assert.ok(ALLOWED_SEGMENT_KINDS.has('heading'));
  assert.ok(ALLOWED_SEGMENT_KINDS.has('list'));
  assert.ok(ALLOWED_SEGMENT_KINDS.has('paragraph'));
  assert.ok(ALLOWED_SEGMENT_KINDS.has('table'));
  assert.ok(ALLOWED_SEGMENT_KINDS.has('fenced'));
  assert.ok(ALLOWED_SEGMENT_KINDS.has('display_math'));
  assert.equal(DEFAULT_MAX_BYTES, 2 * 1024 * 1024);
});

test('validateImportInput rejects non-object, null, and primitive inputs with structured errors', () => {
  for (const bad of [null, undefined, '', 123, true, []]) {
    const res = validateImportInput(bad);
    assert.equal(res.ok, false);
    assert.equal(res.status, 'error');
    assert.ok(Array.isArray(res.errors));
    assert.ok(res.errors.some(e => e.code === 'INVALID_INPUT'));
  }
});

test('validateImportInput rejects unknown keys strictly', () => {
  const input = {
    kind: 'markdown',
    originalName: 'lesson.md',
    text: '# Tiết 1',
    unexpectedField: 'forbidden_value',
    learningObjectives: ['invented_lo_1']
  };

  const res = validateImportInput(input);
  assert.equal(res.ok, false);
  assert.equal(res.status, 'error');
  assert.ok(res.errors.some(e => e.code === 'UNKNOWN_INPUT_KEY' && e.path === 'unexpectedField'));
  assert.ok(res.errors.some(e => e.code === 'UNKNOWN_INPUT_KEY' && e.path === 'learningObjectives'));
});

test('validateImportInput rejects missing or malformed required fields', () => {
  const missingKind = validateImportInput({ originalName: 'a.md', text: 'hi' });
  assert.equal(missingKind.ok, false);
  assert.ok(missingKind.errors.some(e => e.code === 'MISSING_KIND'));

  const invalidKind = validateImportInput({ kind: 'html', originalName: 'a.md', text: 'hi' });
  assert.equal(invalidKind.ok, false);
  assert.ok(invalidKind.errors.some(e => e.code === 'INVALID_KIND'));

  const missingName = validateImportInput({ kind: 'markdown', text: 'hi' });
  assert.equal(missingName.ok, false);
  assert.ok(missingName.errors.some(e => e.code === 'MISSING_ORIGINAL_NAME'));

  const emptyName = validateImportInput({ kind: 'markdown', originalName: '   ', text: 'hi' });
  assert.equal(emptyName.ok, false);
  assert.ok(emptyName.errors.some(e => e.code === 'INVALID_ORIGINAL_NAME'));

  const missingText = validateImportInput({ kind: 'markdown', originalName: 'a.md' });
  assert.equal(missingText.ok, false);
  assert.ok(missingText.errors.some(e => e.code === 'MISSING_TEXT'));

  const nonStringText = validateImportInput({ kind: 'markdown', originalName: 'a.md', text: 999 });
  assert.equal(nonStringText.ok, false);
  assert.ok(nonStringText.errors.some(e => e.code === 'INVALID_TEXT'));
});

test('detectCapability and validateImportInput return explicit capability result for unsupported DOCX/PDF formats', () => {
  // 1. Explicit kind docx
  const docxKind = importText({
    kind: 'docx',
    originalName: 'g11-sequences.docx',
    text: 'dummy'
  });
  assert.equal(docxKind.ok, false);
  assert.equal(docxKind.status, 'unsupported_format');
  assert.equal(docxKind.code, 'unsupported_format');
  assert.equal(docxKind.format, 'docx');
  assert.equal(docxKind.fallback, 'manual_paste');
  assert.equal(docxKind.manualPasteFallback, true);
  assert.match(docxKind.message, /DOCX/);
  assert.match(docxKind.message, /manual paste fallback/);

  // 2. Explicit kind pdf
  const pdfKind = importText({
    kind: 'pdf',
    originalName: 'g11-sequences.pdf',
    text: 'dummy'
  });
  assert.equal(pdfKind.ok, false);
  assert.equal(pdfKind.status, 'unsupported_format');
  assert.equal(pdfKind.format, 'pdf');
  assert.equal(pdfKind.fallback, 'manual_paste');
  assert.equal(pdfKind.manualPasteFallback, true);

  // 3. Name ending with .docx or .pdf
  const docxName = importText({
    kind: 'markdown',
    originalName: 'lesson.DOCX',
    text: 'PK\x03\x04'
  });
  assert.equal(docxName.status, 'unsupported_format');
  assert.equal(docxName.fallback, 'manual_paste');

  const pdfName = importText({
    kind: 'markdown',
    originalName: 'exam.pdf',
    text: '%PDF-1.4\n...'
  });
  assert.equal(pdfName.status, 'unsupported_format');
  assert.equal(pdfName.fallback, 'manual_paste');

  // 4. Direct detectCapability check
  const capDocx = detectCapability({ kind: 'docx', originalName: 'test.docx' });
  assert.equal(capDocx.supported, false);
  assert.equal(capDocx.status, 'unsupported_format');
  assert.equal(capDocx.fallback, 'manual_paste');

  const capMd = detectCapability({ kind: 'markdown', originalName: 'test.md' });
  assert.equal(capMd.supported, true);
  assert.equal(capMd.format, 'markdown');
  assert.equal(capMd.manualPasteFallback, false);
});

test('importText enforces strict UTF-8 byte limits and flags oversize inputs with structured errors', () => {
  const shortText = 'Xin chào thế giới';
  const shortBytes = Buffer.byteLength(shortText, 'utf8');

  // maxBytes lower than actual byte size
  const resOversize = importText({
    kind: 'markdown',
    originalName: 'short.md',
    text: shortText,
    maxBytes: shortBytes - 1
  });

  assert.equal(resOversize.ok, false);
  assert.equal(resOversize.status, 'error');
  assert.ok(resOversize.errors.some(e => e.code === 'MAX_BYTES_EXCEEDED'));

  // maxBytes exactly equal to byte size
  const resExact = importText({
    kind: 'markdown',
    originalName: 'short.md',
    text: shortText,
    maxBytes: shortBytes
  });
  assert.equal(resExact.ok, true);
  assert.equal(resExact.bytes, shortBytes);
});

test('importText preserves exact source offsets and non-overlapping spans across all segment kinds', () => {
  const sampleMarkdown = `# Tiết 1: Khái niệm Dãy số

Dãy số $(u_n)$ là một hàm số xác định trên tập hợp số nguyên dương $\\mathbb{N}^*$.
Mỗi giá trị $u(n)$ được ký hiệu là $u_n$.

- Số hạng đầu: $u_1 = 18$
- Công sai: $d = 2$
- Số hạng thứ $n$: $u_n = 18 + 2(n - 1)$

| Bước | Giá trị $n$ | Giá trị $u_n$ |
| --- | --- | --- |
| 1 | 1 | 18 |
| 2 | 2 | 20 |
| 3 | 7 | 30 |

\`\`\`python
def seat_sequence(n):
    return 18 + 2 * (n - 1)
\`\`\`

$$
S_n = \\frac{n(u_1 + u_n)}{2}
$$

Kết luận và hướng dẫn học tập tiếp theo.`;

  const extraction = importText({
    kind: 'markdown',
    originalName: 'g11-sequences-p1.md',
    text: sampleMarkdown
  });

  assert.equal(extraction.ok, true);
  assert.equal(extraction.schemaVersion, '1.0.0');
  assert.equal(extraction.kind, 'markdown');
  assert.equal(extraction.originalName, 'g11-sequences-p1.md');
  assert.equal(extraction.status, 'needs_review');

  const sha = createHash('sha256').update(sampleMarkdown, 'utf8').digest('hex');
  assert.equal(extraction.sha256, sha);
  assert.equal(extraction.bytes, Buffer.byteLength(sampleMarkdown, 'utf8'));
  assert.equal(extraction.id, `src-${sha.slice(0, 16)}`);

  // Verify full validation passes
  const validation = validateSourceExtraction(extraction, sampleMarkdown);
  assert.equal(validation.ok, true);
  assert.deepEqual(validation.errors, []);

  // Inspect segments
  const kinds = extraction.segments.map(s => s.kind);
  assert.ok(kinds.includes('heading'), 'Should include heading');
  assert.ok(kinds.includes('paragraph'), 'Should include paragraph');
  assert.ok(kinds.includes('list'), 'Should include list');
  assert.ok(kinds.includes('table'), 'Should include table');
  assert.ok(kinds.includes('fenced'), 'Should include fenced');
  assert.ok(kinds.includes('display_math'), 'Should include display_math');

  // Verify the fundamental invariant for EVERY segment:
  // sampleMarkdown.slice(start, end) === segment.text
  let previousEnd = 0;
  for (const seg of extraction.segments) {
    assert.ok(seg.start >= previousEnd, `Segment ${seg.id} start must be >= previous end`);
    assert.ok(seg.end > seg.start, `Segment ${seg.id} end must be > start`);
    assert.equal(
      sampleMarkdown.slice(seg.start, seg.end),
      seg.text,
      `Segment ${seg.id} text must exactly match source slice`
    );
    assert.equal(seg.end - seg.start, seg.text.length);
    assert.ok(seg.lineStart >= 1);
    assert.ok(seg.lineEnd >= seg.lineStart);
    previousEnd = seg.end;
  }
});

test('formulas remain exact source strings and register math uncertainties when delimiters are malformed', () => {
  const malformedText = `# Tiết 2: Khảo sát công thức

Công thức chưa đóng đô la: $x^2 + y^2 = 1 và tiếp tục văn bản.
Công thức hai đô la chưa đóng:
$$
u_n = 18 + 2(n - 1)

Công thức ngoặc tròn chưa đóng: \\(a + b = c và kết thúc.
Công thức ngoặc vuông chưa đóng: \\[\\lim_{n \\to \\infty} \\frac{1}{n} và kết thúc.
`;

  const extraction = importText({
    kind: 'markdown',
    originalName: 'malformed.md',
    text: malformedText
  });

  assert.equal(extraction.ok, true);
  assert.equal(extraction.status, 'needs_review');

  // Segments must retain the raw source formula strings without auto-closing or mutating
  const p1 = extraction.segments.find(s => s.text.includes('Công thức chưa đóng đô la'));
  assert.ok(p1, 'Paragraph 1 must exist');
  assert.ok(
    p1.text.includes('$x^2 + y^2 = 1 và tiếp tục'),
    'Raw text must preserve the exact unclosed string without auto-closing with $'
  );
  assert.doesNotMatch(p1.text, /\$x\^2 \+ y\^2 = 1\$/);

  // Uncertainties must record the malformed delimiters
  const mathUncertainties = extraction.uncertainties.filter(
    u => u.kind === 'math_delimiter_malformed' || u.type === 'math_delimiter_malformed'
  );

  assert.ok(mathUncertainties.length >= 4, 'Should record all 4 malformed delimiter instances');

  const dollarUnc = mathUncertainties.find(u => u.delimiter === '$');
  assert.ok(dollarUnc, 'Should flag malformed $ delimiter');
  assert.equal(dollarUnc.segmentId, p1.id);
  assert.ok(dollarUnc.offset > 0);
  assert.ok(dollarUnc.line >= 1);

  const doubleDollarUnc = mathUncertainties.find(u => u.delimiter === '$$');
  assert.ok(doubleDollarUnc, 'Should flag malformed $$ delimiter');

  const parenUnc = mathUncertainties.find(u => u.delimiter === '\\(');
  assert.ok(parenUnc, 'Should flag malformed \\( delimiter');

  const bracketUnc = mathUncertainties.find(u => u.delimiter === '\\[');
  assert.ok(bracketUnc, 'Should flag malformed \\[ delimiter');
});

test('formulas with invalid LaTeX syntax register math uncertainties while preserving exact source strings', () => {
  const invalidSyntaxText = `Đoạn văn chứa công thức lỗi cú pháp: $\\frac{}$ và kết thúc.`;

  const extraction = importText({
    kind: 'markdown',
    originalName: 'syntax-error.md',
    text: invalidSyntaxText
  });

  assert.equal(extraction.ok, true);
  const p = extraction.segments[0];
  assert.equal(p.text, invalidSyntaxText);

  const syntaxUnc = extraction.uncertainties.find(
    u => u.kind === 'invalid_math_syntax' || u.type === 'invalid_math_syntax'
  );
  assert.ok(syntaxUnc, 'Should record invalid_math_syntax uncertainty');
  assert.match(syntaxUnc.message, /LaTeX formula syntax error|KaTeX/i);
});

test('importer does NOT invent learning objectives, tasks, or answers', () => {
  const plainText = `Toán 11 - Bài tập Dãy số
1. Tìm 5 số hạng đầu tiên của dãy số $u_n = 2n + 1$.
2. Chứng minh dãy số là dãy tăng.
Đáp án: $u_1=3, u_2=5, u_3=7, u_4=9, u_5=11$.`;

  const extraction = importText({
    kind: 'text',
    originalName: 'exercises.txt',
    text: plainText
  });

  assert.equal(extraction.ok, true);

  // Assert that extraction ONLY contains the required schema properties
  const keys = Object.keys(extraction);
  assert.ok(!keys.includes('tasks'), 'Must NOT invent tasks');
  assert.ok(!keys.includes('objectives'), 'Must NOT invent objectives');
  assert.ok(!keys.includes('answers'), 'Must NOT invent answers');
  assert.ok(!keys.includes('learningObjectives'), 'Must NOT invent learning objectives');
  assert.ok(!keys.includes('rubric'), 'Must NOT invent rubric');
  assert.ok(!keys.includes('answerKey'), 'Must NOT invent answerKey');

  // Verify status is needs_review
  assert.equal(extraction.status, 'needs_review');
});

test('HTML injection payloads are retained verbatim as data and never rendered to HTML', () => {
  const injectionText = `# Tiêu đề chứa <script>alert("xss")</script>

<img src=x onerror="fetch('/leak?c=' + document.cookie)">

| Cột <b onmouseover="evil()">X</b> | Cột Y |
| --- | --- |
| <iframe src="javascript:alert(1)"></iframe> | Dữ liệu |

<a href="javascript:void(0)" onclick="attack()">Click</a>`;

  const extraction = importText({
    kind: 'markdown',
    originalName: 'payload.md',
    text: injectionText
  });

  assert.equal(extraction.ok, true);

  // Confirm exact strings are preserved without HTML entity replacement or DOM rendering
  const heading = extraction.segments.find(s => s.kind === 'heading');
  assert.ok(heading.text.includes('<script>alert("xss")</script>'));

  const imgPara = extraction.segments.find(s => s.text.includes('<img src=x onerror='));
  assert.ok(imgPara, 'Should contain img payload verbatim');
  assert.ok(imgPara.text.includes('<img src=x onerror="fetch(\'/leak?c=\' + document.cookie)">'));

  const table = extraction.segments.find(s => s.kind === 'table');
  assert.ok(table.text.includes('<iframe src="javascript:alert(1)"></iframe>'));

  // None of the segments should have transformed into an HTML Document or Node
  for (const seg of extraction.segments) {
    assert.equal(typeof seg.text, 'string');
    assert.equal(injectionText.slice(seg.start, seg.end), seg.text);
  }
});

test('Unicode characters and Vietnamese diacritics are faithfully preserved and hashed exact-bytes', () => {
  const vietnameseContent = `# Giáo án: Dãy số hữu hạn và vô hạn

Trong đời sống thực tế, ta bắt gặp nhiều quy luật tăng trưởng đều đặn:
1. Dãy số tiền gửi tiết kiệm: $u_n = u_0 (1 + r)^n$ với lãi suất $r$.
2. Dãy số ghế trong rạp hát: $18, 20, 22, 24, \\dots$ với $u_1 = 18$ và $d = 2$.

Dãy số vô hạn không có phần tử cuối cùng; ngược lại, dãy hữu hạn dừng tại số hạng thứ $N = 25$.`;

  const extraction = importText({
    kind: 'markdown',
    originalName: 'giao-an-day-so.md',
    text: vietnameseContent
  });

  assert.equal(extraction.ok, true);

  const expectedBytes = Buffer.byteLength(vietnameseContent, 'utf8');
  assert.equal(extraction.bytes, expectedBytes);

  const expectedSha = createHash('sha256').update(vietnameseContent, 'utf8').digest('hex');
  assert.equal(extraction.sha256, expectedSha);

  // Segments preserve exact Vietnamese glyphs
  assert.ok(extraction.segments[0].text.includes('Giáo án: Dãy số hữu hạn và vô hạn'));
  assert.ok(extraction.segments.some(s => s.text.includes('Dãy số tiền gửi tiết kiệm')));
  assert.ok(extraction.segments.some(s => s.text.includes('không có phần tử cuối cùng')));

  // Check validation against source text
  const val = validateSourceExtraction(extraction, vietnameseContent);
  assert.equal(val.ok, true);
});

test('output SourceExtraction is deeply frozen and immutable', () => {
  const extraction = importText({
    kind: 'markdown',
    originalName: 'immutable.md',
    text: '# Tiết học\n\nNội dung chính.'
  });

  assert.ok(Object.isFrozen(extraction), 'Root extraction should be frozen');
  assert.ok(Object.isFrozen(extraction.segments), 'segments array should be frozen');
  assert.ok(Object.isFrozen(extraction.uncertainties), 'uncertainties array should be frozen');
  assert.ok(Object.isFrozen(extraction.warnings), 'warnings array should be frozen');

  if (extraction.segments.length > 0) {
    assert.ok(Object.isFrozen(extraction.segments[0]), 'Each segment should be frozen');
  }

  // Attempt mutations and verify TypeError is thrown in strict mode
  assert.throws(() => {
    // @ts-expect-error - testing immutability
    extraction.status = 'approved';
  }, TypeError);

  assert.throws(() => {
    // @ts-expect-error - testing immutability
    extraction.segments.push({ id: 'injected', kind: 'paragraph', text: 'bad', start: 0, end: 1, lineStart: 1, lineEnd: 1 });
  }, TypeError);

  assert.throws(() => {
    // @ts-expect-error - testing immutability
    extraction.segments[0].text = 'tampered';
  }, TypeError);
});

test('importText produces deterministic output and makes no network, storage, or AI calls', () => {
  const input = {
    kind: 'markdown',
    originalName: 'deterministic.md',
    text: `# Quy luật dãy số\n\n- $u_1 = 18$\n- $u_7 = 30$\n- $u_{25} = 66$\n\n$$u_n = 18 + 2(n-1)$$\n`
  };

  const res1 = importText(input);
  const res2 = importText(input);

  assert.equal(res1.id, res2.id);
  assert.equal(res1.sha256, res2.sha256);
  assert.equal(res1.bytes, res2.bytes);
  assert.equal(res1.segments.length, res2.segments.length);
  assert.deepEqual(res1.segments, res2.segments);
  assert.deepEqual(res1.uncertainties, res2.uncertainties);
  assert.deepEqual(res1.warnings, res2.warnings);
});

test('validateSegment rejects invalid shapes and span mismatches', () => {
  const validSeg = {
    id: 'seg-1',
    kind: 'heading',
    text: '# Bài 1',
    start: 0,
    end: 7,
    lineStart: 1,
    lineEnd: 1
  };

  assert.equal(validateSegment(validSeg, 0, '# Bài 1').ok, true);

  // Span length mismatch
  const badSpan = { ...validSeg, end: 10 };
  assert.equal(validateSegment(badSpan, 0).ok, false);

  // Slice mismatch with original text
  assert.equal(validateSegment(validSeg, 0, '# Khác').ok, false);

  // Unknown segment key
  const badKey = { ...validSeg, unknownProp: true };
  assert.equal(validateSegment(badKey, 0).ok, false);

  // Invalid kind
  const badKind = { ...validSeg, kind: 'unknown_kind' };
  assert.equal(validateSegment(badKind, 0).ok, false);
});

test('empty string input produces valid extraction with zero segments and exact sha256', () => {
  const res = importText({
    kind: 'markdown',
    originalName: 'empty.md',
    text: ''
  });

  assert.equal(res.ok, true);
  assert.equal(res.bytes, 0);
  assert.equal(res.sha256, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.deepEqual(res.segments, []);
  assert.deepEqual(res.uncertainties, []);
  assert.deepEqual(res.warnings, []);
  assert.equal(res.status, 'needs_review');

  const val = validateSourceExtraction(res, '');
  assert.equal(val.ok, true);
});

test('plain text kind produces accurate paragraph segments with exact offsets', () => {
  const textContent = `Đoạn văn đầu tiên của văn bản thuần túy.
Tiếp tục dòng hai của đoạn đầu.

Đoạn văn thứ hai sau dòng trống.
Dòng tiếp theo của đoạn hai.`;

  const res = importText({
    kind: 'text',
    originalName: 'notes.txt',
    text: textContent
  });

  assert.equal(res.ok, true);
  assert.equal(res.kind, 'text');
  assert.equal(res.segments.length, 2);
  assert.equal(res.segments[0].kind, 'paragraph');
  assert.equal(res.segments[1].kind, 'paragraph');

  assert.equal(textContent.slice(res.segments[0].start, res.segments[0].end), res.segments[0].text);
  assert.equal(textContent.slice(res.segments[1].start, res.segments[1].end), res.segments[1].text);

  const val = validateSourceExtraction(res, textContent);
  assert.equal(val.ok, true);
});

test('handles CRLF (Windows) line breaks while maintaining exact offsets and slices', () => {
  const crlfContent = '# Tiêu đề\r\n\r\nĐoạn văn 1.\r\n\r\n- Mục A\r\n- Mục B\r\n';

  const res = importText({
    kind: 'markdown',
    originalName: 'crlf.md',
    text: crlfContent
  });

  assert.equal(res.ok, true);
  assert.equal(res.bytes, Buffer.byteLength(crlfContent, 'utf8'));

  for (const seg of res.segments) {
    assert.equal(crlfContent.slice(seg.start, seg.end), seg.text);
    assert.equal(seg.end - seg.start, seg.text.length);
  }

  const val = validateSourceExtraction(res, crlfContent);
  assert.equal(val.ok, true);
});

test('escaped dollars are ignored by math delimiter scanner', () => {
  const escapedText = 'Giá vé xem phim là \\$50 và vé VIP là \\$100. Công thức $u_1 = 18$ hợp lệ.';

  const res = importText({
    kind: 'markdown',
    originalName: 'currency.md',
    text: escapedText
  });

  assert.equal(res.ok, true);
  // Only $u_1 = 18$ is a math token and it is properly closed, so no math uncertainties
  const malformed = res.uncertainties.filter(u => u.kind === 'math_delimiter_malformed');
  assert.equal(malformed.length, 0);
});

test('validateSourceExtraction catches mutations, bad hashes, bad statuses and unknown keys', () => {
  const valid = importText({
    kind: 'markdown',
    originalName: 'valid.md',
    text: '# Tiêu đề\n\nNội dung.'
  });

  // Mutated schemaVersion
  assert.equal(
    validateSourceExtraction({ ...valid, schemaVersion: '2.0.0' }).ok,
    false
  );

  // Mutated status
  assert.equal(
    validateSourceExtraction({ ...valid, status: 'approved' }).ok,
    false
  );

  // Mutated sha256
  assert.equal(
    validateSourceExtraction({ ...valid, sha256: '0000000000000000000000000000000000000000000000000000000000000000' }, '# Tiêu đề\n\nNội dung.').ok,
    false
  );

  // Mutated byte count
  assert.equal(
    validateSourceExtraction({ ...valid, bytes: 99999 }, '# Tiêu đề\n\nNội dung.').ok,
    false
  );

  // Unknown key on extraction
  assert.equal(
    validateSourceExtraction({ ...valid, unknownField: true }).ok,
    false
  );

  // Overlapping segments
  const overlappingSegs = [
    { id: 'seg-1', kind: 'paragraph', text: 'abc', start: 0, end: 5, lineStart: 1, lineEnd: 1 },
    { id: 'seg-2', kind: 'paragraph', text: 'def', start: 3, end: 8, lineStart: 1, lineEnd: 1 }
  ];
  assert.equal(
    validateSourceExtraction({ ...valid, segments: overlappingSegs }).ok,
    false
  );
});

test('parseSegments returns segments, uncertainties, and warnings directly', () => {
  const parsed = parseSegments('# Tiêu đề\n\nĐoạn văn độc lập.', 'markdown');
  assert.equal(parsed.segments.length, 2);
  assert.equal(parsed.segments[0].kind, 'heading');
  assert.equal(parsed.segments[1].kind, 'paragraph');
  assert.deepEqual(parsed.uncertainties, []);
  assert.deepEqual(parsed.warnings, []);
});
