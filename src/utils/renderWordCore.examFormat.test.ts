import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { Packer } from 'docx';
import { buildWordDocument } from './renderWordCore';
import { preprocessOptionGridsForWord } from './examMarkdown';

/**
 * Golden test cho phần "làm cứng" định dạng đề kiểm tra khi xuất Word:
 * khung đề 2 cột không viền, dòng HẾT căn giữa, ĐÁP ÁN sang trang riêng.
 * Chạy ĐÚNG pipeline thật (preprocessOptionGridsForWord → buildWordDocument) như
 * examWordExport.exportExamToDocx, không test buildWordDocument một mình.
 */

async function renderXml(content: string): Promise<string> {
  const doc = buildWordDocument({ title: 'De thi test', content: preprocessOptionGridsForWord(content) });
  const buffer = await Packer.toBuffer(doc);
  const zip = await JSZip.loadAsync(buffer);
  return zip.file('word/document.xml')!.async('string');
}

const EXAM_FIXTURE = `| SỞ GIÁO DỤC VÀ ĐÀO TẠO HÀ NỘI | ĐỀ KIỂM TRA HỌC KÌ II |
| --- | --- |
| TRƯỜNG THPT CHUYÊN MẪU | NĂM HỌC 2025 - 2026 |
| | Môn: Toán — Lớp: 10 |
| | Thời gian làm bài: 45 phút |
| | Mã đề: 101 |

**Câu 1.** Tính đạo hàm của $f(x) = x^2$.

- A. $2x$
- B. $x$
- C. $2$
- D. $0$

**--- HẾT ---**

## ĐÁP ÁN

| Câu | Đáp án |
| --- | --- |
| 1 | A |
`;

describe('renderWordCore — làm cứng định dạng đề kiểm tra', () => {
  it('khung đề 2 cột render KHÔNG VIỀN, tách biệt bảng lưới phương án + bảng đáp án (có viền)', async () => {
    const xml = await renderXml(EXAM_FIXTURE);

    // 3 bảng: khung đề (không viền) + lưới phương án A/B/C/D + bảng đáp án (2 bảng sau có viền).
    const tableCount = (xml.match(/<w:tbl>/g) || []).length;
    expect(tableCount).toBe(3);
    expect(xml).toContain('SỞ GIÁO DỤC VÀ ĐÀO TẠO HÀ NỘI');

    // Bảng khung đề dùng border "none" (docx.js xuất BorderStyle.NONE thành val="none")...
    expect(xml).toMatch(/w:val="none"/);
    // ...nhưng KHÔNG PHẢI mọi bảng đều không viền — lưới phương án/đáp án vẫn viền "single" như cũ.
    expect(xml).toMatch(/w:val="single"/);
  });

  it('dòng "--- HẾT ---" căn giữa (w:jc val="center")', async () => {
    const xml = await renderXml(EXAM_FIXTURE);
    // Tìm đoạn văn chứa "HẾT" và xác nhận có jc center ngay trong cùng khối paragraph.
    const hetParaMatch = xml.match(/<w:p\b[^>]*>(?:(?!<w:p\b)[\s\S])*?HẾT[\s\S]*?<\/w:p>/);
    expect(hetParaMatch).toBeTruthy();
    expect(hetParaMatch![0]).toContain('w:val="center"');
  });

  it('heading "ĐÁP ÁN" có pageBreakBefore (sang trang riêng)', async () => {
    const xml = await renderXml(EXAM_FIXTURE);
    const headingParaMatch = xml.match(/<w:p\b[^>]*>(?:(?!<w:p\b)[\s\S])*?ĐÁP ÁN[\s\S]*?<\/w:p>/);
    expect(headingParaMatch).toBeTruthy();
    // docx.js xuất thuộc tính đoạn văn <w:pageBreakBefore/> (chuẩn Word "Page break before"),
    // không phải ký tự ngắt trang thủ công <w:br w:type="page"/>.
    expect(headingParaMatch![0]).toContain('<w:pageBreakBefore/>');
  });

  it('4 phương án A/B/C/D ngắn gộp thành 1 bảng lưới với công thức OMML (không phải 4 dòng list rời)', async () => {
    const xml = await renderXml(EXAM_FIXTURE);
    // Tổng cộng: khung đề (1) + lưới phương án (1) + bảng đáp án (1) = 3 bảng.
    const tableCount = (xml.match(/<w:tbl>/g) || []).length;
    expect(tableCount).toBe(3);
    // Công thức trong phương án phải là OMML gốc (native), không phải text "$2x$" thô.
    expect(xml).toMatch(/<m:oMath[\s>]/);
  });

  it('không có bảng khung đề khi nội dung không khớp từ khoá (không đụng đề không có header)', async () => {
    const noHeaderContent = `**Câu 1.** $1+1=?$\n\n- A. 1\n- B. 2\n- C. 3\n- D. 4\n`;
    const xml = await renderXml(noHeaderContent);
    // Chỉ có 1 bảng (lưới phương án), không có bảng khung đề nào bị nhận nhầm.
    const tableCount = (xml.match(/<w:tbl>/g) || []).length;
    expect(tableCount).toBe(1);
  });
});
