import { describe, expect, it } from 'vitest';
import { classKey, findExistingClass, parseClassFileName, parseRoster, sameName, suggestTeacherUid } from './classSetup';

const users = [
  { uid: 'cuong-main', email: 'congapro60@gmail.com', displayName: 'việt cường vũ' },
  { uid: 'cuong-school', email: 'cuong.vuviet@thedeweyschools.edu.vn', displayName: 'Cường Vũ Việt' },
  { uid: 'van-school', email: 'van.vucam@thedeweyschools.edu.vn', displayName: 'Vũ Cẩm Vân (TDS-THT)' },
  { uid: 'van-gmail', email: 'vucamvan97@gmail.com', displayName: 'Cẩm Vân Vũ' },
  { uid: 'hanh', email: 'hanh.nguyenthi01@thedeweyschools.edu.vn', displayName: 'Nguyễn Thị Hạnh ( TDS - THT )' },
];
const classes = [
  { id: 'olinda', name: '10Olinda', teacherId: 'cuong-main', examSheetId: 'file-olinda' },
  { id: 'lt1', name: '12LoTrinh1', teacherId: 'cuong-main', examSheetId: 'file-12vn1' },
  { id: 'vic', name: 'T_26-27 10Victoria', teacherId: 'hanh', examSheetId: null },
];

describe('đọc tên file lớp', () => {
  it('tách năm học / lớp (có khoảng trắng) / giáo viên', () => {
    expect(parseClassFileName('26-27-12 VN Toán 3-Vũ Cẩm Vân')).toEqual({ schoolYear: '26-27', className: '12 VN Toán 3', teacherName: 'Vũ Cẩm Vân' });
    expect(parseClassFileName('26-27-11Orlando-Nguyễn Thị Hạnh')?.className).toBe('11Orlando');
    expect(parseClassFileName('Thống kê điểm Toán THPT 26-27 - KSĐN T9.xlsx')).toBeNull();
  });

  it('khoá lớp bỏ năm học/tiền tố: "T_26-27 10Victoria" ≡ "10Victoria"', () => {
    expect(classKey('T_26-27 10Victoria')).toBe(classKey('10Victoria'));
    expect(classKey('12 VN Toán 3')).toBe('12vntoan3');
  });

  it('so tên người không phụ thuộc thứ tự, dấu, phần trong ngoặc', () => {
    expect(sameName('Vũ Cẩm Vân (TDS-THT)', 'Vũ Cẩm Vân')).toBe(true);
    expect(sameName('Cẩm Vân Vũ', 'Vũ Cẩm Vân')).toBe(true);
    expect(sameName('Vân Vũ', 'Vũ Cẩm Vân')).toBe(false);
  });
});

describe('khớp giáo viên ↔ tài khoản', () => {
  it('file đã nối vào lớp nào → đúng chủ lớp đó (Cường dùng congapro60, KHÔNG phải email trường)', () => {
    const file = { id: 'file-12vn1', info: parseClassFileName('26-27-12 VN Toán 1-Vũ Việt Cường')! };
    expect(suggestTeacherUid(file, users, classes)).toBe('cuong-main');
  });

  it('nhiều tài khoản trùng tên → ưu tiên email trường', () => {
    const file = { id: 'file-van', info: parseClassFileName('26-27-12 VN Toán 3-Vũ Cẩm Vân')! };
    expect(suggestTeacherUid(file, users, classes)).toBe('van-school');
  });

  it('lớp đã có (trùng khoá tên) được nhận ra để CHỈ nối file, không tạo trùng', () => {
    const file = { id: 'file-vic', info: parseClassFileName('26-27-10Victoria-Nguyễn Thị Hạnh')! };
    const uid = suggestTeacherUid(file, users, classes);
    expect(uid).toBe('hanh');
    expect(findExistingClass(file, uid, classes)?.id).toBe('vic');
    const orlando = { id: 'file-orl', info: parseClassFileName('26-27-11Orlando-Nguyễn Thị Hạnh')! };
    expect(findExistingClass(orlando, 'hanh', classes)).toBeNull();
  });
});

describe('danh sách học sinh từ tab MOET', () => {
  it('bỏ dòng tiêu đề, dòng số cột, dòng trống; Mã HS số hay chữ đều nhận; trùng mã giữ một', () => {
    const rows = [
      [], ['', 'NĂM HỌC 26-27'], ['Mã HS', 'Tên HS'], ['1', '2'],
      ['GB0117010125', 'Trần Thùy Anh'], [82814836, 'Trần Anh Thư'], ['', 'Không mã'], ['GB0117010125', 'Trùng'],
    ];
    expect(parseRoster(rows)).toEqual([
      { code: 'GB0117010125', name: 'Trần Thùy Anh' },
      { code: '82814836', name: 'Trần Anh Thư' },
    ]);
  });
});
