import { describe, expect, it } from 'vitest';
import type { Student } from '../../types';
import {
  emailsMatch,
  guessSsmClass,
  listOf,
  matchRoster,
  parseClasses,
  parseProfileEmail,
  parseStudents,
  pickCurrentSchoolYear,
} from './ssmModel';

const student = (id: string, code: string): Student => ({ id, name: `HS ${id}`, code, progress: 0, status: 'active' });

describe('listOf', () => {
  it('đọc cả mảng trần, {data: []} và phân trang lồng', () => {
    expect(listOf([1])).toEqual([1]);
    expect(listOf({ data: [2] })).toEqual([2]);
    expect(listOf({ data: { data: [3] } })).toEqual([3]);
    expect(listOf({ data: 'x' })).toEqual([]);
    expect(listOf(null)).toEqual([]);
  });
});

describe('hồ sơ và năm học', () => {
  it('lấy email thường hoá từ /profile', () => {
    expect(parseProfileEmail({ data: { email: 'Cuong.Vu@TheDeweySchools.edu.vn' } })).toBe('cuong.vu@thedeweyschools.edu.vn');
    expect(parseProfileEmail({})).toBe('');
  });

  it('so email không phân biệt hoa thường, rỗng thì không khớp', () => {
    expect(emailsMatch('A@x.vn', ' a@x.vn ')).toBe(true);
    expect(emailsMatch('', '')).toBe(false);
    expect(emailsMatch('a@x.vn', 'b@x.vn')).toBe(false);
  });

  it('năm học đang chạy là status 2', () => {
    const body = { data: [
      { id: 7, name: 'Năm học 2027-2028', status: 3 },
      { id: 6, name: 'Năm học 2026-2027', status: 2 },
    ] };
    expect(pickCurrentSchoolYear(body)).toEqual({ id: 6, name: 'Năm học 2026-2027' });
    expect(pickCurrentSchoolYear({ data: [] })).toBeNull();
  });
});

describe('parseClasses', () => {
  it('bỏ trùng, bỏ dòng hỏng, xếp theo tên', () => {
    const body = { data: [
      { id: 9681, name: '11Columbus' },
      { id: 9681, name: '11Columbus' },
      { class: { id: 9665, name: '10Olinda' } },
      { id: 0, name: 'Hỏng' },
      { name: 'Thiếu id' },
    ] };
    expect(parseClasses(body)).toEqual([{ id: 9665, name: '10Olinda' }, { id: 9681, name: '11Columbus' }]);
  });

  it('đoán lớp SSM trùng tên lớp app', () => {
    const classes = [{ id: 1, name: '11 Columbus' }, { id: 2, name: '10Olinda' }];
    expect(guessSsmClass('11columbus', classes)?.id).toBe(1);
    expect(guessSsmClass('12Austin', classes)).toBeNull();
  });
});

describe('parseStudents', () => {
  it('đọc đúng ô SSM thật: student_code + full_name, đủ 3 dạng mã của trường', () => {
    const body = { data: [
      { id: 1, code: 'KHONG-PHAI-MA-HS', student_code: 'GB0116011256', full_name: 'Đặng Lam Anh' },
      { id: 2, student_code: '82185676', full_name: 'Trịnh Tường Anh' },
      { id: 3, student_code: 'S22070263', full_name: 'Trần Đức Khải' },
    ] };
    expect(parseStudents(body).students.map(s => s.code)).toEqual(['GB0116011256', '82185676', 'S22070263']);
  });

  it('nhận nhiều kiểu tên ô mã/tên, cả dạng lồng student', () => {
    const body = { data: [
      { code: 'GB001', full_name: 'Nguyễn A' },
      { student: { code: 'GB002', name: 'Trần B' } },
    ] };
    expect(parseStudents(body)).toEqual({
      students: [{ code: 'GB001', name: 'Nguyễn A' }, { code: 'GB002', name: 'Trần B' }],
      unknownKeys: null,
    });
  });

  it('không nhận ra ô mã thì trả tên khoá để chẩn đoán, không trả giá trị', () => {
    const result = parseStudents({ data: [{ ma: 'GB001', ten: 'Nguyễn A' }] });
    expect(result.students).toEqual([]);
    expect(result.unknownKeys).toEqual(['ma', 'ten']);
  });

  it('lớp rỗng không phải lỗi cấu trúc', () => {
    expect(parseStudents({ data: [] })).toEqual({ students: [], unknownKeys: null });
  });
});

describe('matchRoster', () => {
  it('khớp theo Mã HS, bỏ khoảng trắng và hoa thường', () => {
    const app = [student('a', 'gb 001'), student('b', 'GB002'), student('c', '')];
    const ssm = [{ code: 'GB001', name: 'A' }, { code: 'GB003', name: 'C' }];
    const result = matchRoster(app, ssm);
    expect(result.matched.map(m => m.app.id)).toEqual(['a']);
    expect(result.onlyInApp.map(s => s.id)).toEqual(['b', 'c']);
    expect(result.onlyInSsm.map(s => s.code)).toEqual(['GB003']);
  });
});
