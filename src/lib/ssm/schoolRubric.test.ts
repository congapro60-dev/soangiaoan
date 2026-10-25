import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { readSchoolRubric } from './schoolRubric';

/** Dựng file giống mẫu của trường: sheet Hướng dẫn có bảng LO → Tổng điểm. */
const buildWorkbook = (rows: unknown[][]): ArrayBuffer => {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), 'Hướng dẫn');
  return XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
};

const sampleRows = (totals: number[]): unknown[][] => [
  ['Cách tính điểm LMS từ điểm Moet'],
  [],
  [],
  [],
  [],
  ['Mã tả', 'Learning outcome', 'Các câu trắc nghiệm', '', 'Câu đúng sai', '', 'Các bài tự luận', '', 'Tổng điểm'],
  [],
  ['LO1', 'Học sinh có thể hiểu về mệnh đề trong Toán học', '1.2', '', '', '', '', '', totals[0]],
  ['LO2', 'Học sinh có thể hiểu khái quát về tập hợp', '3,4,5', '', '1', '', '2;5', '', totals[1]],
  ['LO6', 'Học sinh có thể hiểu khái quát các khái niệm liên quan đến vectơ', '', '', '', '', '', '', totals[2]],
  ['Tổng điểm'],
];

describe('readSchoolRubric', () => {
  it('đọc đúng điểm từng LO lớp 10 giữa HKI và tổng đúng 10', () => {
    const rubric = readSchoolRubric(buildWorkbook(sampleRows([0.5, 2.75, 2.5])));

    expect(rubric).toHaveLength(3);
    expect(rubric[0]).toMatchObject({ label: 'LO1', maxPoints: 0.5 });
    expect(rubric[1]).toMatchObject({ label: 'LO2', maxPoints: 2.75 });
    expect(rubric.reduce((sum, row) => sum + row.maxPoints, 0)).toBeCloseTo(5.75, 2);
  });

  it('giữ mô tả LO để khớp với LO của SSM', () => {
    const rubric = readSchoolRubric(buildWorkbook(sampleRows([1, 2, 3])));
    expect(rubric[0].description).toContain('mệnh đề');
  });

  it('LO để trống điểm (LO6 vectơ lớp 10) vẫn đọc ra với 0 điểm', () => {
    const rows = sampleRows([0.5, 2.75, 0]);
    const rubric = readSchoolRubric(buildWorkbook(rows));
    expect(rubric.find((row) => row.label === 'LO6')?.maxPoints).toBe(0);
  });

  it('file không có bảng LO thì trả rỗng thay vì đoán', () => {
    expect(readSchoolRubric(buildWorkbook([['Không có gì'], ['abc']]))).toEqual([]);
  });
});
