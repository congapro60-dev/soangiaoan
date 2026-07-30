/**
 * Kiểm thử bộ đọc nhiều biên bản trong một sheet + ghép giáo án.
 *
 * Fixture dựng bằng SheetJS mô phỏng đúng cấu trúc mẫu của trường (khối hành
 * chính rồi hàng tiêu đề rồi các dòng ghi chép), lặp nhiều lần với độ dài khác
 * nhau — vì đó là chỗ bộ đọc theo số dòng cố định sẽ vỡ.
 */
import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { docNhieuBienBan, ghepGiaoAn, khongDau, tachGiaoAn } from './nhieuBienBan';
import { bienBanRong, type BienBanDuGio } from './types';

interface KhoiThu {
  lop: string;
  tuan: string;
  bai: string;
  ngay: string;
  nguoiDu: string;
  soDong: number;
}

/** Dựng file .xlsx nhiều khối, mỗi khối dài khác nhau. */
function taoFile(khoi: KhoiThu[], tenSheet = 'Cô Lan'): ArrayBuffer {
  const rows: (string | number)[][] = [];
  khoi.forEach(k => {
    rows.push(['', 'BIÊN BẢN DỰ GIỜ KHÔNG CHÍNH THỨC']);
    rows.push(['Lớp:', k.lop, `Ngày và thời gian dự giờ: ${k.ngay}`]);
    rows.push(['Tuần:', k.tuan, `Người dự giờ: ${k.nguoiDu}`]);
    rows.push(['Tên bài dạy:', k.bai, 'Năm học & Kỳ học: Kì 2; năm 2025-2026']);
    rows.push([]);
    rows.push(['Thời gian', 'Hoạt động', 'Hoạt động của giáo viên', 'Hoạt động của học sinh', 'Ghi chú']);
    for (let i = 0; i < k.soDong; i++) {
      rows.push([`9h${i * 5}`, `HĐ ${i + 1}`, `GV làm việc ${i + 1}`, `HS làm việc ${i + 1}`, `ghi chú ${i + 1}`]);
    }
    rows.push([]);
    rows.push([]);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, tenSheet);
  // XLSX.write với type:'array' trả về ArrayBuffer sẵn, không phải Uint8Array.
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

const BA_KHOI: KhoiThu[] = [
  { lop: '10A1', tuan: '5', bai: 'Định lí Vi-ét', ngay: '12/01/2026', nguoiDu: 'Mr. Cường', soDong: 3 },
  { lop: '11B2', tuan: '12', bai: 'Cấp số nhân', ngay: '05/03/2026', nguoiDu: 'Mr. Cường', soDong: 7 },
  { lop: '12C3', tuan: '20', bai: 'Khoảng cách từ điểm đến đường thẳng', ngay: '18/04/2026', nguoiDu: 'Ms. Hoa', soDong: 2 },
];

describe('docNhieuBienBan', () => {
  it('tách đúng số biên bản dù mỗi khối dài khác nhau', () => {
    const { bienBan, canhBao } = docNhieuBienBan(taoFile(BA_KHOI), 'u1');
    expect(bienBan).toHaveLength(3);
    expect(canhBao).toEqual([]);
  });

  it('đọc đúng phần hành chính của từng khối, không lẫn sang khối khác', () => {
    const { bienBan } = docNhieuBienBan(taoFile(BA_KHOI), 'u1');
    expect(bienBan.map(b => b.lop)).toEqual(['10A1', '11B2', '12C3']);
    expect(bienBan.map(b => b.tuan)).toEqual(['5', '12', '20']);
    expect(bienBan.map(b => b.bai)).toEqual([
      'Định lí Vi-ét',
      'Cấp số nhân',
      'Khoảng cách từ điểm đến đường thẳng',
    ]);
    expect(bienBan.map(b => b.ngay)).toEqual(['12/01/2026', '05/03/2026', '18/04/2026']);
    expect(bienBan.map(b => b.nguoiDu)).toEqual(['Mr. Cường', 'Mr. Cường', 'Ms. Hoa']);
  });

  it('đếm đúng số dòng ghi chép của từng khối', () => {
    const { bienBan } = docNhieuBienBan(taoFile(BA_KHOI), 'u1');
    expect(bienBan.map(b => b.dongQuanSat.length)).toEqual([3, 7, 2]);
    expect(bienBan[1].dongQuanSat[6].cuaGiaoVien).toBe('GV làm việc 7');
    // Dòng của khối sau không được lọt vào khối trước.
    expect(bienBan[0].dongQuanSat.every(d => !d.hoatDong.includes('HĐ 4'))).toBe(true);
  });

  it('gán userId truyền vào, không lấy từ file', () => {
    const { bienBan } = docNhieuBienBan(taoFile(BA_KHOI), 'u-abc');
    expect(bienBan.every(b => b.userId === 'u-abc')).toBe(true);
  });

  it('lấy tên sheet làm tên giáo viên, theo thói quen của mẫu trường', () => {
    const { bienBan } = docNhieuBienBan(taoFile(BA_KHOI, 'Nguyễn Văn A'), 'u1');
    expect(bienBan[0].gvHoTen).toBe('Nguyễn Văn A');
  });

  it('một khối vẫn chạy đúng, không cần nhiều khối', () => {
    const { bienBan } = docNhieuBienBan(taoFile([BA_KHOI[0]]), 'u1');
    expect(bienBan).toHaveLength(1);
    expect(bienBan[0].dongQuanSat).toHaveLength(3);
  });

  // Thà báo rõ còn hơn nạp ra biên bản rỗng mà người dùng không biết vì sao.
  it('file không có hàng tiêu đề nào thì báo cảnh báo, không trả biên bản rỗng', () => {
    const ws = XLSX.utils.aoa_to_sheet([['Bảng lương'], ['Tháng 1', 100]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'X');
    const { bienBan, canhBao } = docNhieuBienBan(
      XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer,
      'u1',
    );
    expect(bienBan).toEqual([]);
    expect(canhBao[0]).toContain('Không tìm thấy hàng tiêu đề');
  });

  // Fixture tự dựng có thể trùng khớp giả định của chính mình. Ca này chạy trên
  // FILE MẪU THẬT của trường để bộ đọc nhiều khối không làm hỏng đường một khối.
  it('đọc được chính file mẫu thật của trường', async () => {
    const { readFile } = await import('node:fs/promises');
    const buf = await readFile('public/mau/bien-ban-du-gio.xlsx');
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    const { bienBan } = docNhieuBienBan(ab, 'u1');

    expect(bienBan).toHaveLength(1);
    expect(bienBan[0].lop).toBe('10Victoria');
    expect(bienBan[0].tuan).toBe('23');
    expect(bienBan[0].bai).toContain('Khoảng cách');
    expect(bienBan[0].nguoiDu).toBe('Mr. Cường');
    expect(bienBan[0].dongQuanSat.length).toBeGreaterThan(3);
  });

  it('khối thiếu tên bài thì cảnh báo là sẽ khó ghép giáo án', () => {
    const { canhBao } = docNhieuBienBan(taoFile([{ ...BA_KHOI[0], bai: '' }]), 'u1');
    expect(canhBao.some(c => c.includes('thiếu tên bài dạy'))).toBe(true);
  });
});

describe('tachGiaoAn', () => {
  it('cắt theo mốc tiêu đề giáo án', () => {
    const chu = [
      'KẾ HOẠCH BÀI DẠY',
      'Bài: Định lí Vi-ét. Ngày 12/01/2026. ' + 'x'.repeat(100),
      'KẾ HOẠCH BÀI DẠY',
      'Bài: Cấp số nhân. Ngày 05/03/2026. ' + 'y'.repeat(100),
    ].join('\n');
    const ds = tachGiaoAn(chu);
    expect(ds).toHaveLength(2);
    expect(ds[0]).toContain('Vi-ét');
    expect(ds[1]).toContain('Cấp số nhân');
  });

  it('không thấy mốc nào thì trả về đúng một bản', () => {
    expect(tachGiaoAn('Một giáo án duy nhất, không có tiêu đề đặc biệt.')).toHaveLength(1);
  });

  it('văn bản rỗng trả về mảng rỗng', () => {
    expect(tachGiaoAn('   ')).toEqual([]);
  });
});

describe('ghepGiaoAn', () => {
  const bb = (bai: string, ngay: string): BienBanDuGio => ({ ...bienBanRong('u1'), bai, ngay });

  it('khớp cả tên bài và ngày thì tin cậy CAO', () => {
    const cap = ghepGiaoAn(
      [bb('Cấp số nhân', '05/03/2026')],
      ['Giáo án bài Cấp số nhân, dạy ngày 05/03/2026. ' + 'x'.repeat(100)],
    );
    expect(cap[0].chiSoGiaoAn).toBe(0);
    expect(cap[0].tinCay).toBe('cao');
    expect(cap[0].tinHieu).toContain('trùng tên bài');
    expect(cap[0].tinHieu).toContain('trùng ngày');
  });

  it('ghép đúng cặp dù giáo án xếp lộn thứ tự', () => {
    const cap = ghepGiaoAn(
      [bb('Định lí Vi-ét', '12/01/2026'), bb('Cấp số nhân', '05/03/2026')],
      ['Giáo án Cấp số nhân ngày 05/03/2026', 'Giáo án Định lí Vi-ét ngày 12/01/2026'],
    );
    expect(cap[0].chiSoGiaoAn).toBe(1);
    expect(cap[1].chiSoGiaoAn).toBe(0);
  });

  // Chỉ dựa vào thứ tự là tín hiệu yếu — phải nói rõ để người dùng còn kiểm.
  it('chỉ khớp được thứ tự thì tin cậy THẤP và nêu rõ lí do', () => {
    const cap = ghepGiaoAn([bb('Bài A', '01/01/2026')], ['Một giáo án không nêu tên bài hay ngày']);
    expect(cap[0].chiSoGiaoAn).toBe(0);
    expect(cap[0].tinCay).toBe('thap');
    expect(cap[0].tinHieu).toContain('chỉ theo thứ tự còn lại');
  });

  it('thiếu giáo án thì để trống chứ không ghép bừa', () => {
    const cap = ghepGiaoAn([bb('Bài A', '01/01/2026'), bb('Bài B', '02/02/2026')], ['Giáo án Bài A']);
    expect(cap.filter(c => c.chiSoGiaoAn === null)).toHaveLength(1);
  });

  it('một giáo án không bị gán cho hai biên bản', () => {
    const cap = ghepGiaoAn(
      [bb('Cấp số nhân', '05/03/2026'), bb('Cấp số nhân', '06/03/2026')],
      ['Giáo án Cấp số nhân ngày 05/03/2026'],
    );
    const daGan = cap.map(c => c.chiSoGiaoAn).filter(x => x !== null);
    expect(new Set(daGan).size).toBe(daGan.length);
  });

  it('so tên bài chịu được khác dấu và khác hoa thường', () => {
    const cap = ghepGiaoAn([bb('Định lí Vi-ét', '')], ['Giao an DINH LI VI-ET ' + 'x'.repeat(100)]);
    expect(cap[0].tinHieu).toContain('trùng tên bài');
  });
});

describe('khongDau', () => {
  it('bỏ dấu, hạ chữ thường, chuẩn hóa khoảng trắng', () => {
    expect(khongDau('Định lí Vi-ét')).toBe('dinh li vi et');
    expect(khongDau('CẤP  SỐ   NHÂN')).toBe('cap so nhan');
  });
});
