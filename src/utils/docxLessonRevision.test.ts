import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import {
  markdownToOoxmlParagraphs,
  injectBeforeBodySectPr,
  reviseDocxBytes,
} from './docxLessonRevision';

// Tạo fixture .docx thật (có header/footer + bảng gốc) bằng thư viện docx.
const makeFixtureDocx = async (): Promise<Uint8Array> => {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ children: [new TextRun('ĐOẠN GỐC KHÔNG ĐƯỢC MẤT')] }),
          new Paragraph({ children: [new TextRun('Bảng hoạt động của giáo viên')] }),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc).then((b) => new Uint8Array(b));
};

describe('markdownToOoxmlParagraphs', () => {
  it('escape ký tự XML nguy hiểm', () => {
    const xml = markdownToOoxmlParagraphs('Điều kiện a < b & c > d');
    expect(xml).toContain('&lt;');
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&gt;');
    expect(xml).not.toContain('a < b'); // không còn ký tự < thô chưa escape
  });

  it('heading tạo run đậm và có ngắt trang cho block đầu', () => {
    const xml = markdownToOoxmlParagraphs('# Tiêu đề\nNội dung');
    expect(xml).toContain('<w:pageBreakBefore/>');
    expect(xml).toContain('<w:b/>');
  });

  it('**đậm** thành run bold xen kẽ', () => {
    const xml = markdownToOoxmlParagraphs('Đây là **quan trọng** thôi');
    expect((xml.match(/<w:b\/>/g) || []).length).toBeGreaterThanOrEqual(1);
  });
});

describe('markdownToOoxmlParagraphs — bảng', () => {
  const RUBRIC = [
    '| Tiêu chí | Xuất sắc | Đạt |',
    '|---|:---:|---|',
    '| Lập luận | Chặt chẽ | Có ý |',
    '| Trình bày | Rõ ràng | Tạm được |',
  ].join('\n');

  it('dựng <w:tbl> thật với đủ hàng và cột', () => {
    const xml = markdownToOoxmlParagraphs(RUBRIC);
    expect(xml).toContain('<w:tbl>');
    expect((xml.match(/<w:tr>/g) || []).length).toBe(3); // 1 tiêu đề + 2 dữ liệu
    expect((xml.match(/<w:tc>/g) || []).length).toBe(9); // 3 cột × 3 hàng
    expect(xml).toContain('Lập luận');
    expect(xml).toContain('Tạm được');
    // Không còn dấu | thô của markdown
    expect(xml).not.toContain('Tiêu chí | Xuất sắc');
  });

  it('hàng tiêu đề in đậm và có nền', () => {
    const xml = markdownToOoxmlParagraphs(RUBRIC);
    const firstRow = xml.slice(xml.indexOf('<w:tr>'), xml.indexOf('</w:tr>'));
    expect(firstRow).toContain('<w:b/>');
    expect(firstRow).toContain('<w:shd');
  });

  it('escape ký tự XML trong ô bảng', () => {
    const xml = markdownToOoxmlParagraphs('| a | b |\n|---|---|\n| x < y | p & q |');
    expect(xml).toContain('&lt;');
    expect(xml).toContain('&amp;');
  });

  it('đệm ô thiếu khi hàng ngắn hơn tiêu đề', () => {
    const xml = markdownToOoxmlParagraphs('| a | b | c |\n|---|---|---|\n| chỉ một |');
    expect((xml.match(/<w:tc>/g) || []).length).toBe(6); // 3 cột × 2 hàng
  });

  it('dòng | đơn lẻ không có dòng phân cách thì vẫn là đoạn văn thường', () => {
    const xml = markdownToOoxmlParagraphs('| không phải bảng |');
    expect(xml).not.toContain('<w:tbl>');
    expect(xml).toContain('không phải bảng');
  });

  it('bảng nằm giữa văn bản không nuốt phần sau', () => {
    const xml = markdownToOoxmlParagraphs(`# Rubric\n\n${RUBRIC}\n\nGhi chú sau bảng`);
    expect(xml).toContain('<w:tbl>');
    expect(xml).toContain('Ghi chú sau bảng');
    expect(xml.indexOf('Ghi chú sau bảng')).toBeGreaterThan(xml.indexOf('</w:tbl>'));
  });
});

describe('injectBeforeBodySectPr', () => {
  it('chèn NGAY TRƯỚC sectPr cấp body', () => {
    const doc =
      '<w:body><w:p>gốc</w:p><w:sectPr><w:pgSz w:w="11906"/></w:sectPr></w:body>';
    const out = injectBeforeBodySectPr(doc, '<w:p>MỚI</w:p>');
    expect(out).toBe('<w:body><w:p>gốc</w:p><w:p>MỚI</w:p><w:sectPr><w:pgSz w:w="11906"/></w:sectPr></w:body>');
  });

  it('chèn trước </w:body> khi không có sectPr', () => {
    const out = injectBeforeBodySectPr('<w:body><w:p>gốc</w:p></w:body>', '<w:p>MỚI</w:p>');
    expect(out).toBe('<w:body><w:p>gốc</w:p><w:p>MỚI</w:p></w:body>');
  });
});

describe('reviseDocxBytes', () => {
  it('giữ nguyên nội dung gốc và chèn phần bổ sung', async () => {
    const fixture = await makeFixtureDocx();
    const revised = await reviseDocxBytes(fixture, '## Góp ý\n- Thêm bước Polya');
    const zip = await JSZip.loadAsync(revised);
    const xml = await zip.file('word/document.xml')!.async('string');

    // Đoạn gốc còn nguyên
    expect(xml).toContain('ĐOẠN GỐC KHÔNG ĐƯỢC MẤT');
    expect(xml).toContain('Bảng hoạt động của giáo viên');
    // Phần bổ sung đã được chèn
    expect(xml).toContain('NỘI DUNG ĐÃ BỔ SUNG');
    expect(xml).toContain('Thêm bước Polya');
    // Phần bổ sung nằm TRƯỚC sectPr cấp body
    expect(xml.indexOf('NỘI DUNG ĐÃ BỔ SUNG')).toBeLessThan(xml.lastIndexOf('<w:sectPr'));
  });

  it('ném lỗi khi không phải .docx hợp lệ', async () => {
    const notDocx = new Uint8Array([1, 2, 3, 4, 5]);
    await expect(reviseDocxBytes(notDocx, 'x')).rejects.toThrow();
  });

  it('ném lỗi khi zip thiếu word/document.xml', async () => {
    const zip = new JSZip();
    zip.file('hello.txt', 'not a docx');
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    await expect(reviseDocxBytes(bytes, 'x')).rejects.toThrow(/document\.xml/);
  });
});
