import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { fillLoWorkbook, readLoWorkbook } from './loWorkbook';
import type { LoMark } from './loScore';

// Dựng xlsx tối giản GIỐNG bố cục SSM (không tên HS thật): dòng 6 = mã LO, cột A = Mã HS, ô điểm tự đóng.
const buildXlsx = async (): Promise<Uint8Array> => {
  const ss = ['Mã Học sinh', 'LO_DIS_TO_100:\nHiểu A', 'LO_DIS_TO_101:\nHiểu B', 'HS001', 'HS002'];
  const sharedStrings = `<?xml version="1.0"?><sst count="5" uniqueCount="5">${ss.map((s) => `<si><t xml:space="preserve">${s}</t></si>`).join('')}</sst>`;
  const sheet1 = `<?xml version="1.0"?><worksheet><sheetData>` +
    `<row r="6"><c r="D6" t="s"><v>1</v></c><c r="E6" t="s"><v>2</v></c></row>` +
    `<row r="7"><c r="A7" t="s"><v>3</v></c><c r="D7" s="9"/><c r="E7" s="9"/></row>` +
    `<row r="8"><c r="A8" t="s"><v>4</v></c><c r="D8" s="9"/><c r="E8" s="9"/></row>` +
    `</sheetData></worksheet>`;
  const sheet2 = `<?xml version="1.0"?><worksheet><sheetData/></worksheet>`;
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types/>');
  zip.file('xl/sharedStrings.xml', sharedStrings);
  zip.file('xl/worksheets/sheet1.xml', sheet2); // sheet1 là sheet RỖNG (bẫy: phải tìm sheet có LO)
  zip.file('xl/worksheets/sheet2.xml', sheet1); // sheet2 mới là bảng điểm
  return zip.generateAsync({ type: 'uint8array' });
};

describe('loWorkbook — điền cả file', () => {
  it('readLoWorkbook đọc đúng LO và Mã HS, dù sheet dữ liệu không phải sheet1', async () => {
    const info = await readLoWorkbook(await buildXlsx());
    expect(info.loCodes).toEqual(['LO_DIS_TO_100', 'LO_DIS_TO_101']);
    expect(info.maHSList).toEqual(['HS001', 'HS002']);
    expect(info.loHeaders[0]).toContain('Hiểu A');
  });

  it('fillLoWorkbook điền điểm và trả file mở lại được', async () => {
    const marks = new Map<string, Map<string, LoMark>>([
      ['HS001', new Map<string, LoMark>([['LO_DIS_TO_100', 3.5], ['LO_DIS_TO_101', 'N']])],
      ['HS002', new Map<string, LoMark>([['LO_DIS_TO_100', 4]])],
    ]);
    const out = await fillLoWorkbook(await buildXlsx(), marks);
    expect(out.written).toBe(3);
    expect(out.unmatchedStudents).toEqual([]);

    // mở lại file kết quả, đọc ô D7/E7/D8
    const zip = await JSZip.loadAsync(out.bytes);
    const xml = await zip.file('xl/worksheets/sheet2.xml')!.async('string');
    expect(xml).toContain('<c r="D7" s="9" t="inlineStr"><is><t xml:space="preserve">3.5</t></is></c>');
    expect(xml).toContain('<c r="E7" s="9" t="inlineStr"><is><t xml:space="preserve">N</t></is></c>');
    expect(xml).toContain('<c r="D8" s="9" t="inlineStr"><is><t xml:space="preserve">4</t></is></c>');
  });

  it('file sai (không có cột LO) → lỗi tiếng Việt', async () => {
    const zip = new JSZip();
    zip.file('xl/worksheets/sheet1.xml', '<worksheet><sheetData/></worksheet>');
    await expect(fillLoWorkbook(await zip.generateAsync({ type: 'uint8array' }), new Map())).rejects.toThrow(/mẫu điểm LO/);
  });

  it('file không phải zip → lỗi tiếng Việt', async () => {
    await expect(fillLoWorkbook(new TextEncoder().encode('rác'), new Map())).rejects.toThrow(/Excel tải từ SSM/);
  });
});
