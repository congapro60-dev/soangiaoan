import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync, strToU8 } from 'fflate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates a valid OpenXML DOCX archive in memory.
 *
 * @param {string} documentXml
 * @param {Record<string, Uint8Array>} [extraFiles]
 * @returns {Uint8Array}
 */
export function createDocxArchive(documentXml, extraFiles = {}) {
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

/**
 * Creates a synthetic bounded DOCX fixture with OMML math equations.
 * Includes display equations, inline fractions, and radicals.
 *
 * @returns {Uint8Array}
 */
export function createDocxEquationFixture() {
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>Chương 1: Dãy số và Cấp số cộng</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Định nghĩa số hạng tổng quát của cấp số cộng:</w:t></w:r>
    </w:p>
    <w:p>
      <m:oMathPara>
        <m:oMath>
          <m:r><m:t>u_n = u_1 + </m:t></m:r>
          <m:d>
            <m:e><m:r><m:t>n - 1</m:t></m:r></m:e>
          </m:d>
          <m:r><m:t>d</m:t></m:r>
        </m:oMath>
      </m:oMathPara>
    </w:p>
    <w:p>
      <w:r><w:t>Công thức tính tổng n số hạng đầu tiên:</w:t></w:r>
    </w:p>
    <w:p>
      <m:oMathPara>
        <m:oMath>
          <m:r><m:t>S_n = </m:t></m:r>
          <m:f>
            <m:num><m:r><m:t>n</m:t></m:r><m:d><m:e><m:r><m:t>u_1 + u_n</m:t></m:r></m:e></m:d></m:num>
            <m:den><m:r><m:t>2</m:t></m:r></m:den>
          </m:f>
        </m:oMath>
      </m:oMathPara>
    </w:p>
    <w:p>
      <w:r><w:t>Và biểu thức căn thức bậc hai: </w:t></w:r>
      <m:oMath>
        <m:rad>
          <m:radPr><m:degHide m:val="1"/></m:radPr>
          <m:deg/>
          <m:e><m:r><m:t>x^2 + 1</m:t></m:r></m:e>
        </m:rad>
      </m:oMath>
    </w:p>
  </w:body>
</w:document>`;

  return createDocxArchive(xml);
}

/**
 * Creates a synthetic bounded DOCX fixture with unsupported objects:
 * drawings, pictures, OLE objects, custom XML, and unknown tags.
 *
 * @returns {Uint8Array}
 */
export function createDocxUnsupportedObjectFixture() {
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml">
  <w:body>
    <w:p>
      <w:r><w:t>Văn bản trước hình ảnh và đối tượng đồ họa.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:drawing>
          <wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
            <wp:docPr id="101" name="Diagram_Sodo.png"/>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Văn bản xen giữa đối tượng hình vẽ và OLE.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:pict>
          <v:shape id="shape01" type="#_x0000_t75"/>
        </w:pict>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:object>
          <o:OLEObject xmlns:o="urn:schemas-microsoft-com:office:office" Type="Embed" ProgID="Excel.Sheet.12" ShapeID="ole01"/>
        </w:object>
      </w:r>
    </w:p>
    <w:p>
      <w:customXml w:element="EducationalAnnotation">
        <w:r><w:t>Nội dung trong thẻ customXml được bảo toàn an toàn.</w:t></w:r>
      </w:customXml>
    </w:p>
    <w:p>
      <w:unknownTag>Thẻ XML không xác định cần ghi nhận uncertainty</w:unknownTag>
      <w:r><w:t>Đoạn kết thúc tài liệu kiểm tra.</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

  return createDocxArchive(xml);
}

/**
 * Creates a valid PDF 1.4 document from an array of pages.
 * Each page can be:
 * - A string of lines
 * - An array of strings or { text, fontSize, x, y }
 * - An empty string '' to create an image-only / scanned page without text streams
 *
 * @param {Array<string | Array<string | { text: string, fontSize?: number, x?: number, y?: number }>>} pages
 * @returns {Uint8Array}
 */
export function createPdfDocument(pages) {
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

  // Cross-reference table
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
 * Creates a synthetic valid text PDF fixture.
 *
 * @returns {Uint8Array}
 */
export function createPdfTextFixture() {
  return createPdfDocument([
    [
      { text: 'Chương 1: Dãy số và Cấp số cộng', fontSize: 20, y: 720 },
      { text: 'Đoạn văn mở đầu bài giảng toán học lớp 11.', fontSize: 12, y: 680 },
      { text: 'Công thức u_n = u_1 + (n - 1)d áp dụng cho mọi n >= 1.', fontSize: 12, y: 650 },
      { text: 'Bài tập 1: Tính số hạng thứ 10 của dãy số.', fontSize: 14, y: 610 }
    ]
  ]);
}

/**
 * Creates a synthetic image-only / scanned PDF fixture.
 * Emulates a scanned document where no text operators (BT/ET/Tj) exist.
 *
 * @returns {Uint8Array}
 */
export function createPdfImageOnlyFixture() {
  return createPdfDocument(['']);
}

/**
 * Creates a synthetic mixed PDF fixture (text page + scanned/image-only page + text page).
 *
 * @returns {Uint8Array}
 */
export function createPdfMixedFixture() {
  return createPdfDocument([
    ['Trang 1: Giới thiệu phần bài giảng lý thuyết.'],
    '', // Trang 2: Ảnh scan đề bài tập viết tay không có lớp văn bản
    ['Trang 3: Đáp án và hướng dẫn giải chi tiết.']
  ]);
}

/**
 * Creates a synthetic malformed / corrupted PDF fixture.
 * Begins with valid PDF magic bytes but contains truncated corrupted stream data.
 *
 * @returns {Uint8Array}
 */
export function createPdfMalformedFixture() {
  return new Uint8Array([
    0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, // %PDF-1.4
    0x0A, 0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A,       // Binary comment
    0x31, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A, // 1 0 obj
    0x3C, 0x3C, 0x20, 0x2F, 0x54, 0x79, 0x70, 0x65, // << /Type
    0xFF, 0xFE, 0xFD, 0xFC, 0x00, 0x00, 0x00        // Corrupted garbage EOF missing
  ]);
}

/**
 * Creates a synthetic encrypted / password-protected PDF fixture.
 * Contains standard security handler dictionary /Encrypt.
 *
 * @returns {Uint8Array}
 */
export function createPdfEncryptedFixture() {
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

/**
 * Generates and writes all synthetic fixtures to the designated target directory.
 *
 * @param {string} targetDir
 * @returns {Record<string, { filePath: string, bytes: number }>}
 */
export function writeAllFixtures(targetDir = path.join(__dirname, 'fixtures')) {
  mkdirSync(targetDir, { recursive: true });

  const fixtures = {
    'docx_equation.docx': createDocxEquationFixture(),
    'docx_unsupported_object.docx': createDocxUnsupportedObjectFixture(),
    'pdf_text.pdf': createPdfTextFixture(),
    'pdf_image_only.pdf': createPdfImageOnlyFixture(),
    'pdf_mixed.pdf': createPdfMixedFixture(),
    'pdf_malformed.pdf': createPdfMalformedFixture(),
    'pdf_encrypted.pdf': createPdfEncryptedFixture()
  };

  const results = {};
  for (const [filename, bytes] of Object.entries(fixtures)) {
    const filePath = path.join(targetDir, filename);
    writeFileSync(filePath, bytes);
    results[filename] = {
      filePath,
      bytes: bytes.byteLength
    };
  }

  return results;
}

// Auto-run if executed directly as script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const res = writeAllFixtures();
  console.log('Generated synthetic fixtures:', res);
}
