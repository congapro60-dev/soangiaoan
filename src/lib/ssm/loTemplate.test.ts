import { describe, expect, it } from 'vitest';
import { readSharedStrings, parseLoColumns, parseStudents, setCellString, fillSheet } from './loTemplate';
import type { LoMark } from './loScore';

// XML giả mô phỏng bố cục thật, KHÔNG dùng tên học sinh thật.
const SS = [
  'Mã Học sinh', 'Họ và tên Học sinh', 'Giới tính',
  'FP_DIS_TO_1: Đại số', 'PS_DIS_TO_1: chuẩn',
  'LO_DIS_TO_100:\nHiểu A', 'LO_DIS_TO_101:\nHiểu B', 'LO_DIS_TO_102:\nHiểu C',
  'HS001', 'Nguyễn Văn A', 'Nam', 'HS002', 'Trần Thị B', 'Nữ',
];
const sharedStringsXml = `<sst>${SS.map((s) => `<si><t>${s}</t></si>`).join('')}</sst>`;
const sheetXml = `<worksheet><sheetData>
<row r="6"><c r="D6" t="s"><v>5</v></c><c r="E6" t="s"><v>6</v></c><c r="F6" t="s"><v>7</v></c></row>
<row r="7"><c r="A7" t="s"><v>8</v></c><c r="B7" t="s"><v>9</v></c><c r="C7" t="s"><v>10</v></c><c r="D7" s="9"/><c r="E7" s="9"/><c r="F7" s="9"/></row>
<row r="8"><c r="A8" t="s"><v>11</v></c><c r="B8" t="s"><v>12</v></c><c r="C8" t="s"><v>13</v></c><c r="D8" s="9"/><c r="E8" s="9"/><c r="F8" s="9"/></row>
</sheetData></worksheet>`;

describe('đọc file mẫu SSM', () => {
  it('readSharedStrings gộp đúng', () => {
    expect(readSharedStrings(sharedStringsXml)[5]).toBe('LO_DIS_TO_100:\nHiểu A');
  });

  it('parseLoColumns lấy đúng cột + mã LO ở dòng 6', () => {
    expect(parseLoColumns(sheetXml, SS)).toEqual([
      { col: 'D', loCode: 'LO_DIS_TO_100' },
      { col: 'E', loCode: 'LO_DIS_TO_101' },
      { col: 'F', loCode: 'LO_DIS_TO_102' },
    ]);
  });

  it('parseStudents lấy Mã HS + số dòng từ dòng 7', () => {
    expect(parseStudents(sheetXml, SS)).toEqual([
      { maHS: 'HS001', row: 7 },
      { maHS: 'HS002', row: 8 },
    ]);
  });
});

describe('setCellString', () => {
  it('ghi chuỗi, giữ style, escape XML', () => {
    const out = setCellString(sheetXml, 'D7', '3.5');
    expect(out).toContain('<c r="D7" s="9" t="inlineStr"><is><t xml:space="preserve">3.5</t></is></c>');
  });
  it('ô không có trong file thì không đổi gì', () => {
    expect(setCellString(sheetXml, 'Z99', 'x')).toBe(sheetXml);
  });
});

describe('fillSheet', () => {
  const marks = new Map<string, Map<string, LoMark>>([
    ['HS001', new Map<string, LoMark>([['LO_DIS_TO_100', 3.5], ['LO_DIS_TO_101', 'N'], ['LO_DIS_TO_102', 0]])],
    ['HS002', new Map<string, LoMark>([['LO_DIS_TO_100', 4]])],
  ]);

  it('điền đúng ô, đếm số ô ghi', () => {
    const r = fillSheet(sheetXml, SS, marks);
    expect(r.written).toBe(4);
    expect(r.sheetXml).toContain('<c r="D7" s="9" t="inlineStr"><is><t xml:space="preserve">3.5</t></is></c>');
    expect(r.sheetXml).toContain('<c r="E7" s="9" t="inlineStr"><is><t xml:space="preserve">N</t></is></c>');
    expect(r.sheetXml).toContain('<c r="F7" s="9" t="inlineStr"><is><t xml:space="preserve">0</t></is></c>');
    expect(r.sheetXml).toContain('<c r="D8" s="9" t="inlineStr"><is><t xml:space="preserve">4</t></is></c>');
    expect(r.unmatchedStudents).toEqual([]);
    expect(r.unmatchedLos).toEqual([]);
  });

  it('báo HS lệch và LO lệch, không ghi bừa', () => {
    const bad = new Map<string, Map<string, LoMark>>([
      ['HS999', new Map<string, LoMark>([['LO_DIS_TO_100', 4]])],
      ['HS001', new Map<string, LoMark>([['LO_DIS_TO_888', 3]])],
    ]);
    const r = fillSheet(sheetXml, SS, bad);
    expect(r.written).toBe(0);
    expect(r.unmatchedStudents).toContain('HS999');
    expect(r.unmatchedLos).toContain('LO_DIS_TO_888');
  });
});
