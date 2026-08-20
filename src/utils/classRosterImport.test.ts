import { describe, it, expect } from 'vitest';
import { parseRosterRows, RosterParseError } from './classRosterImport';

/** Tiêu đề đúng như file trường xuất ra (có xuống dòng giữa ô, có cả tiếng Anh). */
const HEADER_TRUONG = [
  'LEAD ID',
  'Mã HS/\nStudent Code',
  'Tên HS/ Full name',
  'Giới tính/\nGender',
  'Đăng ký thôi học/ withdraw',
  'Tình trạng thôi học/Status',
];

describe('parseRosterRows', () => {
  it('đọc đúng tên và mã từ tiêu đề kiểu file trường', () => {
    const rows = [
      HEADER_TRUONG,
      ['1', 'GB0117010125', 'Trần Thùy Anh', 'Nữ', '', 'Đang học'],
      ['2', '82814836', 'Trần Anh Thư', 'Nữ', '', 'Đang học'],
    ];

    const result = parseRosterRows(rows);

    expect(result.headerRowIndex).toBe(0);
    expect(result.codeGenerated).toBe(false);
    expect(result.students.map(s => s.name)).toEqual(['Trần Thùy Anh', 'Trần Anh Thư']);
    expect(result.students.map(s => s.code)).toEqual(['GB0117010125', '82814836']);
    expect(result.students[0].status).toBe('active');
    expect(result.students[0].progress).toBe(0);
  });

  it('tìm được dòng tiêu đề khi nó không nằm ở dòng đầu', () => {
    const rows = [
      ['TỔNG HỢP THI LỚP 12 NĂM HỌC 2026-2027'],
      [],
      ['STT', 'Mã học sinh', 'Họ và tên', 'Lớp'],
      ['5', '87272487', 'Trần Bảo Lâm', '11Baltimore'],
    ];

    const result = parseRosterRows(rows);

    expect(result.headerRowIndex).toBe(2);
    expect(result.students).toHaveLength(1);
    expect(result.students[0].name).toBe('Trần Bảo Lâm');
  });

  it('chuẩn hoá tên NFD của file Office về NFC', () => {
    const tenNFD = 'Nguyễn Ngọc Diễm'.normalize('NFD');
    const rows = [['Mã HS', 'Tên HS'], ['S23050196', tenNFD]];

    const result = parseRosterRows(rows);

    expect(result.students[0].name).toBe('Nguyễn Ngọc Diễm');
    expect(result.students[0].name.normalize('NFC')).toBe(result.students[0].name);
  });

  it('sinh mã theo tên lớp khi bảng không có cột mã', () => {
    const rows = [['Họ và tên'], ['Vũ Bảo An'], ['Hồ Khánh Phương']];

    const result = parseRosterRows(rows, '10 Olinda');

    expect(result.codeGenerated).toBe(true);
    expect(result.students.map(s => s.code)).toEqual(['10OLINDA-1', '10OLINDA-2']);
  });

  it('bỏ dòng trùng mã và đếm lại', () => {
    const rows = [
      ['Mã HS', 'Họ và tên'],
      ['S21080186', 'Hoàng Lâm'],
      ['s21080186', 'Hoàng Lâm'],
      ['S21080015', 'Nguyễn Lê Gia Phong'],
    ];

    const result = parseRosterRows(rows);

    expect(result.students).toHaveLength(2);
    expect(result.duplicateCount).toBe(1);
  });

  it('bỏ qua dòng trống nhưng KHÔNG tự loại học sinh theo cột thôi học', () => {
    const rows = [
      HEADER_TRUONG,
      ['1', 'A1', 'Đặng Tuệ Minh', 'Nữ', '', 'Đang học'],
      ['', '', '', '', '', ''],
      ['2', 'A2', 'Hoàng Lâm', 'Nam', 'x', 'Đã thôi học'],
    ];

    const result = parseRosterRows(rows);

    expect(result.students.map(s => s.name)).toEqual(['Đặng Tuệ Minh', 'Hoàng Lâm']);
  });

  it('báo lỗi rõ ràng khi không có cột họ tên', () => {
    const rows = [['STT', 'Lớp', 'Ghi chú'], ['1', '10Olinda', '']];

    expect(() => parseRosterRows(rows)).toThrow(RosterParseError);
    expect(() => parseRosterRows(rows)).toThrow(/Họ và tên/);
  });

  it('báo lỗi khi có tiêu đề nhưng không có học sinh nào', () => {
    const rows = [['Mã HS', 'Họ và tên'], ['', ''], ['', '']];

    expect(() => parseRosterRows(rows)).toThrow(/không có dòng học sinh nào/);
  });
});
