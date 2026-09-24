import { describe, expect, it } from 'vitest';
import { parseStudentExamScores } from './examScores';

// Mô phỏng đúng cấu trúc file lớp thật: dòng 1 trống, dòng 2 tiêu đề phụ, dòng 3 header, dòng 4 số
// cột, dữ liệu từ dòng 5. Cột "Phân loại điểm"/"Điểm chữ" là CÔNG THỨC nội bộ — phải bị bỏ.
const MOET = [
  [],
  ['', 'NĂM HỌC 26-27'],
  ['Mã HS', 'Tên HS', 'Điểm T9 KSĐN', 'Phân loại điểm (CÔNG THỨC - giữ nguyên)', 'Điểm T10 ĐGGHKI', 'Phân loại điểm (CÔNG THỨC - giữ nguyên)', 'Điểm T12 ĐGCHKI'],
  ['1', '2', '3', '4', '5', '6', '7'],
  ['GB0117010125', 'Trần Thùy Anh', 2.35, 'x<5', '', 'x<5', 5.5],
  ['82814836', 'Trần Anh Thư', 3.75, 'x<5', 6, '5<=x<7', ''],
];

const TDS = [
  [],
  ['', 'NĂM HỌC 26-27'],
  ['Mã HS', 'Tên HS', 'Điểm Quý 1', 'Điểm chữ (CÔNG THỨC - KHÔNG SỬA)', 'Điểm Quý 2', 'Điểm chữ (CÔNG THỨC - KHÔNG SỬA)'],
  ['1', '2', '3', '4', '5', '6'],
  ['GB0117010125', 'Trần Thùy Anh', 7, 'B', '', ''],
  ['82814836', 'Trần Anh Thư', 8, 'A', 7.5, 'B'],
];

describe('parseStudentExamScores', () => {
  it('rút điểm MOET (thang 10) đúng mốc, việt hoá tên, bỏ ô trống', () => {
    const { moet } = parseStudentExamScores(MOET, TDS, 'GB0117010125');
    expect(moet).toEqual([
      { label: 'Khảo sát đầu năm', score: 2.35 },
      { label: 'Cuối học kì I', score: 5.5 },
    ]);
  });

  it('rút điểm TDS kèm điểm chữ, bỏ quý chưa có điểm', () => {
    const { tds } = parseStudentExamScores(MOET, TDS, 'GB0117010125');
    expect(tds).toEqual([{ label: 'Quý 1', score: 7, letter: 'B' }]);
  });

  it('khớp cả Mã HS dạng số (không bị ép kiểu)', () => {
    const { moet, tds } = parseStudentExamScores(MOET, TDS, '82814836');
    expect(moet).toEqual([
      { label: 'Khảo sát đầu năm', score: 3.75 },
      { label: 'Giữa học kì I', score: 6 },
    ]);
    expect(tds).toEqual([
      { label: 'Quý 1', score: 8, letter: 'A' },
      { label: 'Quý 2', score: 7.5, letter: 'B' },
    ]);
  });

  it('không khớp học sinh thì trả rỗng', () => {
    const scores = parseStudentExamScores(MOET, TDS, 'KHONG-CO');
    expect(scores).toEqual({ moet: [], tds: [] });
  });

  it('KHÔNG lộ cột công thức / phân loại nội bộ', () => {
    const blob = JSON.stringify(parseStudentExamScores(MOET, TDS, 'GB0117010125'));
    expect(blob).not.toContain('Phân loại điểm');
    expect(blob).not.toContain('CÔNG THỨC');
    expect(blob).not.toContain('x<5');
  });
});
