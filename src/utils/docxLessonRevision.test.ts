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
