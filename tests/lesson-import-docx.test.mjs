import assert from 'node:assert/strict';
import test from 'node:test';
import katex from 'katex';
import { createHash } from 'node:crypto';
import { zipSync, strToU8 } from 'fflate';
import {
  importDocx,
  validateDocxInput,
  validateDocxExtraction,
  parseDocxArchive,
  parseXml,
  detectCapability,
  DOCX_MAX_BYTES,
  DOCX_MAX_ENTRIES,
  DOCX_MAX_DECOMPRESSED_BYTES,
  DOCX_MAX_ENTRY_BYTES,
  DOCX_MAX_RATIO,
  ALLOWED_DOCX_SEGMENT_KINDS,
  ALLOWED_DOCX_EXTRACTION_KEYS
} from '../lib/lesson/import/docx.js';

/**
 * Creates a real, valid in-memory DOCX ZIP archive using fflate.
 *
 * @param {string} documentXml
 * @param {Record<string, Uint8Array>} [extraFiles]
 * @returns {Uint8Array}
 */
function createDocxFixture(documentXml, extraFiles = {}) {
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const files = {
    '[Content_Types].xml': strToU8(contentTypesXml),
    '_rels/.rels': strToU8(relsXml),
    'word/document.xml': strToU8(documentXml),
    ...extraFiles
  };

  return zipSync(files);
}

function extractBody(body) {
  const xml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><w:body>${body}</w:body></w:document>`;
  return { xml, extraction: importDocx(createDocxFixture(xml)) };
}

const mathRun = text => `<m:r><m:t>${text}</m:t></m:r>`;
test('fidelity: metadata markers do not demote display equations or produce placeholders', () => {
  const markers = '<w:bookmarkStart w:id="0" w:name="equation"/><w:bookmarkEnd w:id="0"/><w:proofErr w:type="spellStart"/><w:lastRenderedPageBreak/><w:commentRangeStart w:id="1"/><w:commentRangeEnd w:id="1"/>';
  for (const mathTag of ['oMath', 'oMathPara']) {
    const { extraction } = extractBody(`<w:p>${markers}<m:${mathTag}>${mathTag === 'oMathPara' ? `<m:oMath>${mathRun('x')}</m:oMath>` : mathRun('x')}</m:${mathTag}>${markers}</w:p>`);
    assert.equal(extraction.ok, true);
    assert.equal(extraction.segments.length, 1);
    assert.equal(extraction.segments[0].kind, 'display_math');
    assert.equal(extraction.text, '$$x$$');
    assert.ok(extraction.uncertainties.every(u => u.kind === 'omml_math_preserved'));
  }
  const { extraction } = extractBody(`<w:p><w:r><w:t>before</w:t>${markers}<w:t>after</w:t></w:r></w:p>`);
  assert.equal(extraction.text, 'beforeafter');
  assert.equal(extraction.uncertainties.length, 0);
});

test('fidelity: no-break hyphens preserve a literal dash and soft hyphens are omitted', () => {
  const { extraction } = extractBody('<w:p><w:r><w:t>non</w:t><w:noBreakHyphen/><w:t>breaking dis</w:t><w:softHyphen/><w:t>cretionary</w:t></w:r></w:p>');
  assert.equal(extraction.ok, true);
  assert.equal(extraction.text, 'non-breaking discretionary');
  assert.equal(extraction.uncertainties.length, 0);
  assert.equal(validateDocxExtraction(extraction).ok, true);
});

for (const [name, structure, expected] of [
  ['separator', `<m:d><m:dPr><m:sepChr m:val=";"/></m:dPr><m:e>${mathRun('a')}</m:e><m:e>${mathRun('b')}</m:e></m:d>`, '\\left(a;b\\right)'],
  ['hidden degree', `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg>${mathRun('3')}</m:deg><m:e>${mathRun('x')}</m:e></m:rad>`, '\\sqrt{x}'],
  ['hidden limits', `<m:nary><m:naryPr><m:subHide m:val="1"/><m:supHide m:val="true"/></m:naryPr><m:sub>${mathRun('a')}</m:sub><m:sup>${mathRun('b')}</m:sup><m:e>${mathRun('x')}</m:e></m:nary>`, '\\int{x}'],
  ['lower operator', `<m:limLow><m:e>${mathRun('max')}</m:e><m:lim>${mathRun('k')}</m:lim></m:limLow>`, '\\max\\limits_{k}'],
  ['upper operator', `<m:limUpp><m:e>${mathRun('min')}</m:e><m:lim>${mathRun('k')}</m:lim></m:limUpp>`, '\\min\\limits^{k}'],
]) {
  test(`fidelity: ${name} has exact KaTeX output`, () => {
    const { extraction } = extractBody(`<w:p><m:oMath>${structure}</m:oMath></w:p>`);
    const latex = extraction.uncertainties.find(u => u.kind === 'omml_math_preserved').latex;
    assert.equal(latex, expected);
    assert.equal(katex.renderToString(latex, { throwOnError: true }), katex.renderToString(expected, { throwOnError: true }));
  });
}

for (const structure of [
  `<m:bar><m:barPr><m:pos m:val="unknown"/></m:barPr><m:e>${mathRun('x')}</m:e></m:bar>`,
  `<m:limLow><m:e>${mathRun('unknown')}</m:e><m:lim>${mathRun('k')}</m:lim></m:limLow>`,
  '<m:r><m:unknown>source</m:unknown></m:r>',
]) {
  test(`fidelity: unknown math preserved ${structure}`, () => {
    const { xml, extraction } = extractBody(`<w:p><m:oMath>${structure}</m:oMath></w:p>`);
    const uncertainty = extraction.uncertainties.find(u => u.kind === 'unsupported_math_object');
    assert.ok(uncertainty);
    assert.equal(xml.slice(uncertainty.xmlLocation.startOffset, uncertainty.xmlLocation.endOffset), uncertainty.rawXml);
    assert.match(extraction.text, /UNSUPPORTED_MATH_OBJECT/);
  });
}

test('fidelity: OMML text is literal, never authored TeX', () => {
  const { extraction } = extractBody(`<w:p><m:oMath>${mathRun('50% \\frac $ # &amp; _ ^ { }')}</m:oMath></w:p>`);
  const latex = extraction.uncertainties.find(u => u.kind === 'omml_math_preserved').latex;
  const expected = '50\\% \\backslash frac \\$ \\# \\& \\_ \\text{\\textasciicircum} \\{ \\}';
  assert.equal(latex, expected);
  const rendered = katex.renderToString(latex, { throwOnError: true, output: 'mathml' });
  assert.match(rendered, /<mn>50<\/mn>/);
  assert.match(rendered, /%/);
  assert.doesNotMatch(rendered, /<mfrac>/);
});

for (const content of [
  '<w:ins><w:r><w:t>inserted</w:t></w:r></w:ins>',
  '<w:del><w:r><w:delText>deleted</w:delText></w:r></w:del>',
  '<w:smartTag><w:r><w:t>tagged</w:t></w:r></w:smartTag>',
  '<w:fldSimple w:instr="DATE"><w:r><w:t>date</w:t></w:r></w:fldSimple>',
  '<w:r><w:sym w:font="Symbol" w:char="F061"/></w:r>',
  '<w:customXml><w:r><w:t>custom</w:t></w:r></w:customXml>',
  '<w:unknown>unknown</w:unknown>',
  '<w:r><w:unknown>run</w:unknown></w:r>',
]) {
  test(`fidelity: Word content has source preservation ${content}`, () => {
    for (const body of [`<w:p>${content}</w:p>`, content]) {
      const { xml, extraction } = extractBody(body);
      assert.ok(extraction.text.length > 0);
      const uncertainty = extraction.uncertainties.find(u => u.rawXml && u.rawXml.includes(content.includes('<w:sym') ? '<w:sym' : 'w:'));
      assert.ok(uncertainty);
      assert.equal(xml.slice(uncertainty.xmlLocation.startOffset, uncertainty.xmlLocation.endOffset), uncertainty.rawXml);
      assert.ok(extraction.segments.some(s => s.id === uncertainty.segmentId));
    }
  });
}

test('fidelity: missing segment text returns structured validation error', () => {
  const { extraction } = extractBody('<w:p><w:r><w:t>text</w:t></w:r></w:p>');
  const invalid = { ...extraction, segments: extraction.segments.map(({ text, ...rest }) => rest) };
  const result = validateDocxExtraction(invalid);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.code === 'INVALID_SEGMENT_TEXT'));
});

test('fidelity: delimiter defaults, empty separators and visible hide flags retain exact forms', () => {
  for (const [properties, separator] of [['', '|'], ['<m:sepChr m:val=""/>', ''], ['<m:sepChr m:val="&amp;"/>', '\\&']]) {
    const { extraction } = extractBody(`<w:p><m:oMath><m:d><m:dPr>${properties}</m:dPr><m:e>${mathRun('a')}</m:e><m:e>${mathRun('b')}</m:e></m:d></m:oMath></w:p>`);
    assert.equal(extraction.text, `$$\\left(a${separator}b\\right)$$`);
    assert.doesNotThrow(() => katex.renderToString(extraction.text.slice(2, -2), { throwOnError: true }));
  }
  const { extraction } = extractBody(`<w:p><m:oMath><m:rad><m:radPr><m:degHide m:val="0"/></m:radPr><m:deg>${mathRun('3')}</m:deg><m:e>${mathRun('x')}</m:e></m:rad><m:nary><m:naryPr><m:subHide m:val="0"/><m:supHide m:val="false"/></m:naryPr><m:sub>${mathRun('a')}</m:sub><m:sup>${mathRun('b')}</m:sup><m:e>${mathRun('x')}</m:e></m:nary><m:sSup><m:e>${mathRun('x')}</m:e><m:sup>${mathRun('2')}</m:sup></m:sSup></m:oMath></w:p>`);
  assert.equal(extraction.text, '$$\\sqrt[3]{x}\\int_{a}^{b}{x}{x}^{2}$$');
  assert.match(katex.renderToString(extraction.text.slice(2, -2), { output: 'mathml', throwOnError: true }), /<msup>/);
});

test('fidelity: mixed known text and unknown content retain order and exact source spans', () => {
  const unknown = '<w:customXml><w:r><w:t>middle</w:t></w:r></w:customXml>';
  const { xml, extraction } = extractBody(`<w:p><w:r><w:t>before</w:t></w:r></w:p>${unknown}<w:p><w:hyperlink><w:r><w:t>after</w:t><w:sym w:char="F061"/></w:r></w:hyperlink></w:p>`);
  assert.equal(extraction.segments[0].text, 'before');
  assert.match(extraction.segments[1].text, /UNSUPPORTED_WORD_CONTENT/);
  assert.match(extraction.segments[2].text, /^after\[UNSUPPORTED_WORD_CONTENT/);
  for (const uncertainty of extraction.uncertainties) {
    assert.equal(xml.slice(uncertainty.xmlLocation.startOffset, uncertainty.xmlLocation.endOffset), uncertainty.rawXml);
    const segment = extraction.segments.find(s => s.id === uncertainty.segmentId);
    assert.ok(segment);
    assert.equal(extraction.text.slice(segment.start, segment.end), segment.text);
  }
  assert.equal(validateDocxExtraction(extraction).ok, true);
});

for (const [name, structure, wrongLatex] of [
  ['nary intersection', '<m:nary><m:naryPr><m:chr m:val="∩"/></m:naryPr><m:e><m:r><m:t>A</m:t></m:r></m:e></m:nary>', '\\int'],
  ['accent macron', '<m:acc><m:accPr><m:chr m:val="¯"/></m:accPr><m:e><m:r><m:t>x</m:t></m:r></m:e></m:acc>', '\\hat'],
  ['fraction noBar', '<m:f><m:fPr><m:type m:val="noBar"/></m:fPr><m:num><m:r><m:t>n</m:t></m:r></m:num><m:den><m:r><m:t>k</m:t></m:r></m:den></m:f>', '\\frac'],
  ['unknown operator', '<m:nary><m:naryPr><m:chr m:val="?"/></m:naryPr><m:e><m:r><m:t>x</m:t></m:r></m:e></m:nary>', '\\int'],
  ['unknown accent', '<m:acc><m:accPr><m:chr m:val="?"/></m:accPr><m:e><m:r><m:t>x</m:t></m:r></m:e></m:acc>', '\\hat'],
  ['unknown fraction style', '<m:f><m:fPr><m:type m:val="unknown"/></m:fPr><m:num><m:r><m:t>n</m:t></m:r></m:num><m:den><m:r><m:t>k</m:t></m:r></m:den></m:f>', '\\frac'],
]) {
  test(`OMML preserves unsupported ${name} instead of guessing`, () => {
    const xml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><w:body><w:p><m:oMath>${structure}</m:oMath></w:p></w:body></w:document>`;
    const bytes = createDocxFixture(xml);
    const extraction = importDocx(bytes);
    assert.equal(extraction.ok, true);
    assert.ok(extraction.text.includes('[UNSUPPORTED_MATH_OBJECT:'));
    assert.ok(!extraction.text.includes(wrongLatex));
    const uncertainty = extraction.uncertainties.find(u => u.kind === 'unsupported_math_object');
    assert.ok(uncertainty);
    assert.equal(uncertainty.rawXml, structure);
    assert.equal(xml.slice(uncertainty.xmlLocation.startOffset, uncertainty.xmlLocation.endOffset), structure);
    assert.equal(uncertainty.xmlLocation.file, 'word/document.xml');
    assert.equal(uncertainty.segmentId, extraction.segments[0].id);
    assert.equal(validateDocxExtraction(extraction, bytes).ok, true);
  });
}

test('DOCX constants and key allowlists align with architecture contracts', () => {
  assert.equal(DOCX_MAX_BYTES, 10 * 1024 * 1024);
  assert.equal(DOCX_MAX_ENTRIES, 1000);
  assert.equal(DOCX_MAX_DECOMPRESSED_BYTES, 50 * 1024 * 1024);
  assert.equal(DOCX_MAX_ENTRY_BYTES, 20 * 1024 * 1024);
  assert.equal(DOCX_MAX_RATIO, 100);

  assert.ok(ALLOWED_DOCX_SEGMENT_KINDS.has('heading'));
  assert.ok(ALLOWED_DOCX_SEGMENT_KINDS.has('list'));
  assert.ok(ALLOWED_DOCX_SEGMENT_KINDS.has('paragraph'));
  assert.ok(ALLOWED_DOCX_SEGMENT_KINDS.has('table'));
  assert.ok(ALLOWED_DOCX_SEGMENT_KINDS.has('display_math'));

  assert.deepEqual(
    [...ALLOWED_DOCX_EXTRACTION_KEYS].sort(),
    ['bytes', 'id', 'kind', 'originalName', 'schemaVersion', 'segments', 'sha256', 'status', 'uncertainties', 'warnings'].sort()
  );
});

test('detectCapability correctly reports DOCX as supported and PDF as deferred', () => {
  // DOCX supported
  assert.equal(detectCapability({ kind: 'docx' }).supported, true);
  assert.equal(detectCapability({ kind: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }).supported, true);
  assert.equal(detectCapability({ originalName: 'lesson-math.docx' }).supported, true);

  // PDF deferred
  const pdfCap = detectCapability({ kind: 'pdf' });
  assert.equal(pdfCap.supported, false);
  assert.equal(pdfCap.format, 'pdf');
  assert.equal(pdfCap.fallback, 'manual_paste');
  assert.equal(pdfCap.manualPasteFallback, true);

  const pdfNameCap = detectCapability({ originalName: 'chapter.pdf' });
  assert.equal(pdfNameCap.supported, false);
  assert.equal(pdfNameCap.fallback, 'manual_paste');
});

test('importDocx extracts paragraphs and preserves exact character spans', () => {
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>Đoạn văn thứ nhất của bài học.</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t xml:space="preserve">Đoạn văn thứ hai </w:t>
      </w:r>
      <w:r>
        <w:t>với nhiều text runs và khoảng trắng.</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

  const zipBytes = createDocxFixture(docXml);
  const extraction = importDocx({ bytes: zipBytes, originalName: 'bai-hoc.docx' });

  assert.equal(extraction.ok, true);
  assert.equal(extraction.kind, 'docx');
  assert.equal(extraction.originalName, 'bai-hoc.docx');
  assert.equal(extraction.status, 'needs_review');
  assert.equal(extraction.segments.length, 2);

  // Segment 1
  const seg1 = extraction.segments[0];
  assert.equal(seg1.kind, 'paragraph');
  assert.equal(seg1.text, 'Đoạn văn thứ nhất của bài học.');
  assert.equal(seg1.start, 0);
  assert.equal(seg1.end, seg1.text.length);
  assert.equal(seg1.lineStart, 1);
  assert.equal(seg1.lineEnd, 1);

  // Segment 2
  const seg2 = extraction.segments[1];
  assert.equal(seg2.kind, 'paragraph');
  assert.equal(seg2.text, 'Đoạn văn thứ hai với nhiều text runs và khoảng trắng.');
  assert.equal(seg2.start, seg1.end + 2); // 2 newlines between paragraphs
  assert.equal(seg2.end, seg2.start + seg2.text.length);

  // Reconstructed fullText check
  assert.equal(extraction.text.slice(seg1.start, seg1.end), seg1.text);
  assert.equal(extraction.text.slice(seg2.start, seg2.end), seg2.text);

  // Non-enumerable XML location metadata check
  assert.ok(seg1.xmlLocation);
  assert.equal(seg1.xmlLocation.file, 'word/document.xml');
  assert.equal(seg1.xmlLocation.tag, 'w:p');
  assert.ok(seg1.xmlLocation.startOffset >= 0);
  assert.ok(seg1.xmlLocation.endOffset > seg1.xmlLocation.startOffset);

  // Passes strict extraction validation
  const validation = validateDocxExtraction(extraction, zipBytes);
  assert.equal(validation.ok, true);
});

test('importDocx parses headings with correct levels', () => {
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
      </w:pPr>
      <w:r><w:t>Chương 1: Dãy số và Giới hạn</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading2"/>
      </w:pPr>
      <w:r><w:t>Mục 1.1: Định nghĩa dãy số</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading3"/>
      </w:pPr>
      <w:r><w:t>Tiểu mục 1.1.1: Dãy số tăng giảm</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

  const zipBytes = createDocxFixture(docXml);
  const extraction = importDocx(zipBytes);

  assert.equal(extraction.segments.length, 3);
  assert.equal(extraction.segments[0].kind, 'heading');
  assert.equal(extraction.segments[0].text, '# Chương 1: Dãy số và Giới hạn');

  assert.equal(extraction.segments[1].kind, 'heading');
  assert.equal(extraction.segments[1].text, '## Mục 1.1: Định nghĩa dãy số');

  assert.equal(extraction.segments[2].kind, 'heading');
  assert.equal(extraction.segments[2].text, '### Tiểu mục 1.1.1: Dãy số tăng giảm');
});

test('importDocx extracts lists with indentation levels', () => {
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:numPr>
          <w:ilvl w:val="0"/>
        </w:numPr>
      </w:pPr>
      <w:r><w:t>Điều kiện tiên quyết 1</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:numPr>
          <w:ilvl w:val="1"/>
        </w:numPr>
      </w:pPr>
      <w:r><w:t>Chi tiết bổ trợ A</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

  const zipBytes = createDocxFixture(docXml);
  const extraction = importDocx({ buffer: zipBytes });

  assert.equal(extraction.segments.length, 2);
  assert.equal(extraction.segments[0].kind, 'list');
  assert.equal(extraction.segments[0].text, '- Điều kiện tiên quyết 1');

  assert.equal(extraction.segments[1].kind, 'list');
  assert.equal(extraction.segments[1].text, '  - Chi tiết bổ trợ A');
});

test('importDocx parses tables into clean Markdown tables with matrix rows and columns', () => {
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Đặc điểm</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Cấp số cộng</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Cấp số nhân</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Số hạng tổng quát</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>u_n = u_1 + (n-1)d</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>u_n = u_1 * q^(n-1)</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Tổng n số hạng</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>S_n = n(u_1 + u_n)/2</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>S_n = u_1(1-q^n)/(1-q)</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;

  const zipBytes = createDocxFixture(docXml);
  const extraction = importDocx(zipBytes);

  assert.equal(extraction.segments.length, 1);
  const tblSeg = extraction.segments[0];
  assert.equal(tblSeg.kind, 'table');

  const lines = tblSeg.text.split('\n');
  assert.equal(lines.length, 4);
  assert.equal(lines[0], '| Đặc điểm | Cấp số cộng | Cấp số nhân |');
  assert.equal(lines[1], '| --- | --- | --- |');
  assert.equal(lines[2], '| Số hạng tổng quát | u_n = u_1 + (n-1)d | u_n = u_1 * q^(n-1) |');
  assert.equal(lines[3], '| Tổng n số hạng | S_n = n(u_1 + u_n)/2 | S_n = u_1(1-q^n)/(1-q) |');

  assert.equal(tblSeg.lineEnd - tblSeg.lineStart + 1, 4);
});

test('importDocx converts known exact OMML structures and preserves raw XML in uncertainties', () => {
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <w:body>
    <!-- 1. Inline math with fraction and power -->
    <w:p>
      <w:r><w:t>Ta xét giới hạn dãy số: </w:t></w:r>
      <m:oMath>
        <m:f>
          <m:num>
            <m:sSup>
              <m:e><m:r><m:t>n</m:t></m:r></m:e>
              <m:sup><m:r><m:t>2</m:t></m:r></m:sup>
            </m:sSup>
            <m:r><m:t> + 1</m:t></m:r>
          </m:num>
          <m:den>
            <m:r><m:t>2n + 3</m:t></m:r>
          </m:den>
        </m:f>
      </m:oMath>
    </w:p>

    <!-- 2. Display math with square root and delimiter -->
    <w:p>
      <m:oMath>
        <m:rad>
          <m:deg/>
          <m:e>
            <m:d>
              <m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr>
              <m:e><m:r><m:t>x + 5</m:t></m:r></m:e>
            </m:d>
          </m:e>
        </m:rad>
      </m:oMath>
    </w:p>

    <!-- 3. Display math with summation -->
    <w:p>
      <m:oMathPara>
        <m:oMath>
          <m:nary>
            <m:naryPr><m:chr m:val="∑"/></m:naryPr>
            <m:sub><m:r><m:t>k=1</m:t></m:r></m:sub>
            <m:sup><m:r><m:t>n</m:t></m:r></m:sup>
            <m:e><m:r><m:t>k</m:t></m:r></m:e>
          </m:nary>
        </m:oMath>
      </m:oMathPara>
    </w:p>
  </w:body>
</w:document>`;

  const zipBytes = createDocxFixture(docXml);
  const extraction = importDocx(zipBytes);

  assert.equal(extraction.segments.length, 3);

  // Paragraph 1: contains inline math
  const p1 = extraction.segments[0];
  assert.equal(p1.kind, 'paragraph');
  assert.ok(p1.text.includes('$\\frac{{n}^{2} + 1}{2n + 3}$'));

  // Paragraph 2: display math with radical & delimiter
  const p2 = extraction.segments[1];
  assert.equal(p2.kind, 'display_math');
  assert.equal(p2.text, '$$\\sqrt{\\left(x + 5\\right)}$$');

  // Paragraph 3: display math with summation
  const p3 = extraction.segments[2];
  assert.equal(p3.kind, 'display_math');
  assert.equal(p3.text, '$$\\sum_{k=1}^{n}{k}$$');

  // Verify that raw OMML XML was preserved in uncertainties
  const ommlUncerts = extraction.uncertainties.filter(u => u.kind === 'omml_math_preserved');
  assert.equal(ommlUncerts.length, 3);
  for (const unc of ommlUncerts) {
    assert.ok(typeof unc.rawXml === 'string');
    assert.ok(unc.rawXml.includes('m:oMath'));
    assert.ok(unc.xmlLocation);
    assert.equal(unc.xmlLocation.file, 'word/document.xml');
    assert.ok(typeof unc.offset === 'number');
    assert.ok(typeof unc.line === 'number');
  }
});

test('importDocx marks unsupported objects and complex structures instead of faking math', () => {
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <w:body>
    <w:p>
      <w:r><w:t>Công thức phức tạp nhúng OLE: </w:t></w:r>
      <w:object>
        <v:shape id="_x0000_i1025" type="#_x0000_t75" style="width:50pt;height:20pt"/>
      </w:object>
    </w:p>
    <w:p>
      <w:r><w:t>Cấu trúc OMML chưa được hỗ trợ: </w:t></w:r>
      <m:oMath>
        <m:customExoticConstruct>
          <m:opaqueBinaryData>12345</m:opaqueBinaryData>
        </m:customExoticConstruct>
      </m:oMath>
    </w:p>
  </w:body>
</w:document>`;

  const zipBytes = createDocxFixture(docXml);
  const extraction = importDocx(zipBytes);

  assert.equal(extraction.segments.length, 2);

  // Check that no task/answer or fake math was invented
  assert.ok(extraction.segments[0].text.includes('[UNSUPPORTED_OBJECT: OLE_OBJECT]'));
  assert.ok(extraction.segments[1].text.includes('[UNSUPPORTED_MATH_OBJECT: <m:customExoticConstruct>]'));

  // Check structured uncertainties
  assert.ok(extraction.uncertainties.some(u => u.kind === 'unsupported_object'));
  assert.ok(extraction.uncertainties.some(u => u.kind === 'unsupported_math_object'));
});

test('importDocx preserves full Unicode fidelity and Vietnamese diacritics', () => {
  const vietnameseText = 'Định lý Weierstrass: Mọi dãy số thực bị chặn đều có một dãy con hội tụ.';
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>${vietnameseText}</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

  const zipBytes = createDocxFixture(docXml);
  const extraction = importDocx(zipBytes);

  assert.equal(extraction.segments.length, 1);
  assert.equal(extraction.segments[0].text, vietnameseText);
});

test('importDocx computes deterministic SHA-256 hash matching original binary bytes', () => {
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Test hash fidelity</w:t></w:r></w:p>
  </w:body>
</w:document>`;

  const zipBytes = createDocxFixture(docXml);
  const expectedHash = createHash('sha256').update(zipBytes).digest('hex');

  const extraction = importDocx(zipBytes);
  assert.equal(extraction.sha256, expectedHash);
  assert.equal(extraction.bytes, zipBytes.length);
  assert.equal(extraction.id, `src-${expectedHash.slice(0, 16)}`);
});

test('DOCX zip-bomb protection and bounded limits enforce safety before allocation', () => {
  // 1. Max input bytes exceeded
  const hugeInput = new Uint8Array(200);
  const maxBytesRes = validateDocxInput(hugeInput, { maxBytes: 50 });
  assert.equal(maxBytesRes.ok, false);
  assert.ok(maxBytesRes.errors.some(e => e.code === 'MAX_BYTES_EXCEEDED'));

  // 2. Non-ZIP magic header
  const badMagic = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);
  const badMagicRes = validateDocxInput(badMagic);
  assert.equal(badMagicRes.ok, false);
  assert.ok(badMagicRes.errors.some(e => e.code === 'INVALID_ZIP_ARCHIVE'));

  // 3. Zip entry count limit exceeded
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p></w:body>
</w:document>`;

  const extraFiles = {};
  for (let i = 0; i < 10; i++) {
    extraFiles[`dummy_${i}.txt`] = strToU8('abc');
  }
  const multiEntryZip = createDocxFixture(docXml, extraFiles);

  const entryLimitRes = importDocx(multiEntryZip, { maxEntries: 5 });
  assert.equal(entryLimitRes.ok, false);
  assert.ok(entryLimitRes.errors.some(e => e.code === 'ZIP_ENTRY_LIMIT_EXCEEDED'));

  // 4. Zip single entry size exceeded
  const bigEntryZip = createDocxFixture(docXml, {
    'word/document.xml': strToU8(docXml.repeat(10))
  });
  const entrySizeRes = importDocx(bigEntryZip, { maxEntryBytes: 50 });
  assert.equal(entrySizeRes.ok, false);
  assert.ok(entrySizeRes.errors.some(e => e.code === 'ZIP_ENTRY_SIZE_EXCEEDED'));

  // 5. Total decompressed size exceeded
  const decompressedLimitRes = importDocx(bigEntryZip, { maxDecompressedBytes: 50 });
  assert.equal(decompressedLimitRes.ok, false);
  assert.ok(decompressedLimitRes.errors.some(e => e.code === 'ZIP_DECOMPRESSED_LIMIT_EXCEEDED'));

  // 6. Zip-bomb compression ratio exceeded
  const highlyCompressible = new Uint8Array(200000).fill(65); // 200KB of 'A' compresses to ~200 bytes (ratio ~1000:1)
  const zipBombArchive = createDocxFixture(docXml, {
    'word/document.xml': highlyCompressible
  });
  const zipBombRes = importDocx(zipBombArchive, { maxRatio: 20 });
  assert.equal(zipBombRes.ok, false);
  assert.ok(zipBombRes.errors.some(e => e.code === 'ZIP_BOMB_DETECTED'));
});

test('importDocx converts advanced OMML matrices, limits, functions, accents and bars', () => {
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <w:body>
    <!-- Limit -->
    <w:p>
      <m:oMath>
        <m:limLow>
          <m:e><m:r><m:t>lim</m:t></m:r></m:e>
          <m:lim><m:r><m:t>n→∞</m:t></m:r></m:lim>
        </m:limLow>
        <m:r><m:t>u_n = 0</m:t></m:r>
      </m:oMath>
    </w:p>

    <!-- Function -->
    <w:p>
      <m:oMath>
        <m:func>
          <m:fName><m:r><m:t>sin</m:t></m:r></m:fName>
          <m:e><m:r><m:t>x</m:t></m:r></m:e>
        </m:func>
      </m:oMath>
    </w:p>

    <!-- Accent and Bar -->
    <w:p>
      <m:oMath>
        <m:acc>
          <m:accPr><m:chr m:val="→"/></m:accPr>
          <m:e><m:r><m:t>v</m:t></m:r></m:e>
        </m:acc>
        <m:r><m:t> + </m:t></m:r>
        <m:bar>
          <m:barPr><m:pos m:val="top"/></m:barPr>
          <m:e><m:r><m:t>z</m:t></m:r></m:e>
        </m:bar>
      </m:oMath>
    </w:p>

    <!-- Matrix -->
    <w:p>
      <m:oMath>
        <m:m>
          <m:mr>
            <m:e><m:r><m:t>1</m:t></m:r></m:e>
            <m:e><m:r><m:t>2</m:t></m:r></m:e>
          </m:mr>
          <m:mr>
            <m:e><m:r><m:t>3</m:t></m:r></m:e>
            <m:e><m:r><m:t>4</m:t></m:r></m:e>
          </m:mr>
        </m:m>
      </m:oMath>
    </w:p>
  </w:body>
</w:document>`;

  const zipBytes = createDocxFixture(docXml);
  const extraction = importDocx(zipBytes);

  assert.equal(extraction.segments.length, 4);

  // 1. Limit
  assert.equal(extraction.segments[0].kind, 'display_math');
  assert.equal(extraction.segments[0].text, '$$\\lim\\limits_{n\\to \\infty}u\\_n = 0$$');
  const limitMarkup = katex.renderToString(extraction.segments[0].text.slice(2, -2), { throwOnError: true, output: 'mathml' });
  assert.equal((limitMarkup.match(/<mi[^>]*>lim<\/mi>/g) || []).length, 1);

  // 2. Function
  assert.equal(extraction.segments[1].kind, 'display_math');
  assert.equal(extraction.segments[1].text, '$$\\sin(x)$$');

  // 3. Accent & Bar
  assert.equal(extraction.segments[2].kind, 'display_math');
  assert.ok(extraction.segments[2].text.includes('\\vec{v}'));
  assert.ok(extraction.segments[2].text.includes('\\overline{z}'));

  // 4. Matrix
  assert.equal(extraction.segments[3].kind, 'display_math');
  assert.ok(extraction.segments[3].text.includes('\\begin{matrix} 1 & 2 \\\\ 3 & 4 \\end{matrix}'));
});

test('XML Parser security rejects DTD and external entities strictly', () => {
  // 1. DTD / DOCTYPE attack
  const dtdXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE test [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<w:document><w:body><w:p><w:r><w:t>&xxe;</w:t></w:r></w:p></w:body></w:document>`;

  const dtdZip = createDocxFixture(dtdXml);
  const dtdRes = importDocx(dtdZip);
  assert.equal(dtdRes.ok, false);
  assert.ok(dtdRes.errors.some(e => e.code === 'XML_DTD_FORBIDDEN'));

  // 2. ENTITY injection without DOCTYPE
  const entityXml = `<?xml version="1.0"?>
<!ENTITY evil "payload">
<w:document><w:body><w:p><w:r><w:t>hello</w:t></w:r></w:p></w:body></w:document>`;
  const entityZip = createDocxFixture(entityXml);
  const entityRes = importDocx(entityZip);
  assert.equal(entityRes.ok, false);
  assert.ok(entityRes.errors.some(e => e.code === 'XML_ENTITY_FORBIDDEN'));

  // 3. Stylesheet processing instruction
  const piXml = `<?xml version="1.0"?>
<?xml-stylesheet type="text/xsl" href="exploit.xsl"?>
<w:document><w:body><w:p><w:r><w:t>hello</w:t></w:r></w:p></w:body></w:document>`;
  const piZip = createDocxFixture(piXml);
  const piRes = importDocx(piZip);
  assert.equal(piRes.ok, false);
  assert.ok(piRes.errors.some(e => e.code === 'XML_STYLESHEET_FORBIDDEN'));
});

test('importDocx handles missing document.xml or corrupted archive gracefully', () => {
  // Archive without word/document.xml
  const invalidDocx = zipSync({
    'readme.txt': strToU8('not a docx')
  });
  const missingRes = importDocx(invalidDocx);
  assert.equal(missingRes.ok, false);
  assert.ok(missingRes.errors.some(e => e.code === 'MISSING_DOCUMENT_XML'));

  // Corrupted bytes with valid zip header but broken payload
  const corruptedZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0xff, 0xff]);
  const corruptRes = importDocx(corruptedZip);
  assert.equal(corruptRes.ok, false);
  assert.ok(corruptRes.errors.some(e => e.code === 'CORRUPTED_ZIP_ARCHIVE' || e.code === 'ZIP_PARSE_ERROR'));
});

test('output SourceExtraction is deeply frozen and rejects mutations', () => {
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>Bất biến</w:t></w:r></w:p></w:body>
</w:document>`;

  const zipBytes = createDocxFixture(docXml);
  const extraction = importDocx(zipBytes);

  assert.ok(Object.isFrozen(extraction));
  assert.ok(Object.isFrozen(extraction.segments));
  assert.ok(Object.isFrozen(extraction.segments[0]));
  assert.ok(Object.isFrozen(extraction.uncertainties));
  assert.ok(Object.isFrozen(extraction.warnings));

  assert.throws(() => {
    /** @type {any} */ (extraction).status = 'approved';
  }, /TypeError/);

  assert.throws(() => {
    /** @type {any} */ (extraction.segments).push({});
  }, /TypeError/);
});

test('parseXml enforces strict XML well-formedness against multiple roots, junk text, unquoted attrs, and undefined entities', () => {
  // 1. Multiple roots
  assert.throws(() => {
    parseXml('<w:document/><w:document/>');
  }, (err) => err.code === 'MALFORMED_XML' || /multiple root/i.test(err.message));

  // 2. Junk text before root
  assert.throws(() => {
    parseXml('junk <w:document/>');
  }, (err) => err.code === 'MALFORMED_XML' || /junk before root/i.test(err.message));

  // 3. Trailing non-whitespace text after root
  assert.throws(() => {
    parseXml('<w:document/> trailing');
  }, (err) => err.code === 'MALFORMED_XML' || /trailing/i.test(err.message));

  // 4. Unquoted attributes
  assert.throws(() => {
    parseXml('<w:document attr=unquoted/>');
  }, (err) => err.code === 'MALFORMED_XML' || /quoted/i.test(err.message));

  // 5. Undefined entities
  assert.throws(() => {
    parseXml('<w:document><w:body><w:p><w:r><w:t>&undefined;</w:t></w:r></w:p></w:body></w:document>');
  }, (err) => err.code === 'MALFORMED_XML' || /undefined entity/i.test(err.message));

  assert.throws(() => {
    parseXml('<w:document><w:body><w:p><w:r><w:t>bare & character</w:t></w:r></w:p></w:body></w:document>');
  }, (err) => err.code === 'MALFORMED_XML' || /entity|bare/i.test(err.message));

  // 6. Valid predefined XML entities and numeric character references are accepted
  const validXml = '<?xml version="1.0" encoding="UTF-8"?>\n<!-- comment -->\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>&amp; &lt; &gt; &quot; &apos; &#65; &#x42;</w:t></w:r></w:p></w:body></w:document>';
  const parsed = parseXml(validXml);
  assert.equal(parsed.tag, 'w:document');
});

test('ZIP CRC32 verifies central/local metadata and decompressed contents, rejecting corrupted payloads', () => {
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Testing decompression payload integrity check with CRC32</w:t></w:r></w:p>
  </w:body>
</w:document>`;

  const validZip = createDocxFixture(docXml);

  // Normal import succeeds
  const goodRes = importDocx(validZip);
  assert.equal(goodRes.ok, true);

  // 1. Corrupt payload of word/document.xml in ZIP
  const corruptedPayloadZip = new Uint8Array(validZip);
  const target = strToU8('word/document.xml');
  const idx = corruptedPayloadZip.findIndex((_, i) => target.every((tb, j) => corruptedPayloadZip[i + j] === tb));
  assert.ok(idx > 0);
  // Flip bit in the compressed data region after the local file header
  corruptedPayloadZip[idx + target.length + 8] ^= 0x01;

  const corruptRes = importDocx(corruptedPayloadZip);
  assert.equal(corruptRes.ok, false);
  assert.ok(corruptRes.errors.some(e => e.code === 'CORRUPTED_ZIP_ARCHIVE' || e.code === 'ZIP_PARSE_ERROR'));

  // 2. Tampered local header CRC32 mismatching central directory
  const tamperedHeaderZip = new Uint8Array(validZip);
  // Local header offset for word/document.xml is idx - 30
  const localHeaderOffset = idx - 30;
  // CRC-32 is at offset 14 in local file header
  tamperedHeaderZip[localHeaderOffset + 14] ^= 0xff;
  const tamperedRes = importDocx(tamperedHeaderZip);
  assert.equal(tamperedRes.ok, false);
  assert.ok(tamperedRes.errors.some(e => e.code === 'CORRUPTED_ZIP_ARCHIVE' || e.code === 'ZIP_PARSE_ERROR'));
});

test('importDocx resolves alternate official namespace prefix x and rejects wrong namespace or malformed root', () => {
  // 1. Valid alternate official prefix 'x'
  const docXmlWithX = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<x:document xmlns:x="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <x:body>
    <x:p>
      <x:r>
        <x:t>Văn bản sử dụng prefix x chính thức thay vì w.</x:t>
      </x:r>
    </x:p>
  </x:body>
</x:document>`;

  const zipWithX = createDocxFixture(docXmlWithX);
  const resX = importDocx(zipWithX);
  assert.equal(resX.ok, true);
  assert.equal(resX.segments.length, 1);
  assert.equal(resX.segments[0].text, 'Văn bản sử dụng prefix x chính thức thay vì w.');

  // 2. Alternate OMML namespace prefix
  const docXmlWithMath = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:math="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <w:body>
    <w:p>
      <math:oMath>
        <math:r><math:t>a^2 + b^2 = c^2</math:t></math:r>
      </math:oMath>
    </w:p>
  </w:body>
</w:document>`;
  const zipWithMath = createDocxFixture(docXmlWithMath);
  const resMath = importDocx(zipWithMath);
  assert.equal(resMath.ok, true);
  assert.equal(resMath.segments.length, 1);
  assert.equal(resMath.segments[0].text, '$$a\\text{\\textasciicircum}2 + b\\text{\\textasciicircum}2 = c\\text{\\textasciicircum}2$$');
  const literalMarkup = katex.renderToString(resMath.segments[0].text.slice(2, -2), { throwOnError: true, output: 'mathml' });
  assert.doesNotMatch(literalMarkup, /<msup>/);
  assert.equal((literalMarkup.match(/<mtext>\^<\/mtext>/g) || []).length, 3);

  // 3. Wrong namespace on root (e.g. fake URI with prefix w)
  const docXmlWrongNs = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://example.com/fake-word-namespace">
  <w:body>
    <w:p><w:r><w:t>Should be rejected</w:t></w:r></w:p>
  </w:body>
</w:document>`;
  const zipWrongNs = createDocxFixture(docXmlWrongNs);
  const resWrongNs = importDocx(zipWrongNs);
  assert.equal(resWrongNs.ok, false);
  assert.ok(resWrongNs.errors.some(e => e.code === 'MALFORMED_DOCX_ROOT' || e.code === 'XML_PARSE_ERROR'));

  // 4. Malformed DOCX root (not document)
  const docXmlBadRoot = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:unknownRoot xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Should be rejected</w:t></w:r></w:p>
  </w:body>
</w:unknownRoot>`;
  const zipBadRoot = createDocxFixture(docXmlBadRoot);
  const resBadRoot = importDocx(zipBadRoot);
  assert.equal(resBadRoot.ok, false);
  assert.ok(resBadRoot.errors.some(e => e.code === 'MALFORMED_DOCX_ROOT' || e.code === 'XML_PARSE_ERROR'));
});

test('importDocx preserves unsupported drawings, pictures, OLE objects, and custom content with location uncertainties', () => {
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
  <w:body>
    <!-- 1. Drawing inside text run -->
    <w:p>
      <w:r>
        <w:t>Hình vẽ minh họa: </w:t>
        <w:drawing>
          <wp:inline>
            <wp:docPr id="1" name="Figure 1"/>
          </wp:inline>
        </w:drawing>
        <w:t> tiếp tục văn bản.</w:t>
      </w:r>
    </w:p>

    <!-- 2. Paragraph containing only a drawing -->
    <w:p>
      <w:r>
        <w:drawing>
          <wp:inline>
            <wp:docPr id="2" name="Figure 2"/>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>

    <!-- 3. Legacy picture inside run -->
    <w:p>
      <w:r>
        <w:pict>
          <v:shape id="shape1" xmlns:v="urn:schemas-microsoft-com:vml"/>
        </w:pict>
      </w:r>
    </w:p>

    <!-- 4. OLE object inside run -->
    <w:p>
      <w:r>
        <w:object>
          <v:shape id="ole1" xmlns:v="urn:schemas-microsoft-com:vml"/>
        </w:object>
      </w:r>
    </w:p>

    <!-- 5. Structured document tag (custom XML content control) -->
    <w:sdt>
      <w:sdtContent>
        <w:p>
          <w:r><w:t>Văn bản bên trong structured document tag.</w:t></w:r>
        </w:p>
      </w:sdtContent>
    </w:sdt>
  </w:body>
</w:document>`;

  const zipBytes = createDocxFixture(docXml);
  const extraction = importDocx(zipBytes);

  assert.equal(extraction.ok, true);
  // Paragraph with drawing inside run must retain text and placeholder
  assert.ok(extraction.segments[0].text.includes('Hình vẽ minh họa:'));
  assert.ok(extraction.segments[0].text.includes('[UNSUPPORTED_DRAWING]'));
  assert.ok(extraction.segments[0].text.includes('tiếp tục văn bản.'));

  // Paragraph with only drawing must not be silently dropped!
  assert.ok(extraction.segments.some(s => s.text === '[UNSUPPORTED_DRAWING]'));

  // SDT content should be preserved!
  assert.ok(extraction.segments.some(s => s.text.includes('Văn bản bên trong structured document tag.')));

  // Uncertainties must record raw XML and source locations
  const drawingUncerts = extraction.uncertainties.filter(u => u.kind === 'unsupported_drawing');
  assert.ok(drawingUncerts.length >= 2);
  for (const unc of drawingUncerts) {
    assert.ok(unc.rawXml.includes('w:drawing') || unc.rawXml.includes('w:pict'));
    assert.equal(unc.xmlLocation.file, 'word/document.xml');
    assert.ok(typeof unc.offset === 'number');
    assert.ok(typeof unc.line === 'number');
  }

  // OLE object inside run must be preserved in uncertainties
  const oleUncerts = extraction.uncertainties.filter(u => u.kind === 'unsupported_object');
  assert.ok(oleUncerts.length >= 1);
});
