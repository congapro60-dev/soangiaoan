/**
 * Tầng A phải làm sạch mà KHÔNG đẻ nghĩa mới.
 *
 * Nhóm test quan trọng nhất ở đây là nhóm "KHÔNG được đụng": biên bản dự giờ là hồ sơ
 * đánh giá một giáo viên cụ thể, nên mọi lần tầng A gộp nhầm hai quan sát hoặc cắt mất
 * chữ là làm sai lệch bằng chứng chấm người. Ai nới các ca đó thì test phải đỏ.
 */
import { describe, expect, it } from 'vitest';
import { donO, lamSachDongQuanSat } from './lamSach';
import type { DongQuanSat } from './types';

const d = (p: Partial<DongQuanSat>): DongQuanSat => ({
  thoiGian: '',
  hoatDong: '',
  cuaGiaoVien: '',
  cuaHocSinh: '',
  ghiChu: '',
  ...p,
});

describe('donO — dọn một ô', () => {
  it('bỏ ký tự vô hình dán từ Word/PDF', () => {
    expect(donO('GV​chốt﻿ bài', false)).toBe('GVchốt bài');
  });

  it('ép NBSP và tab về khoảng trắng thường, gộp khoảng trắng thừa', () => {
    expect(donO('GV hỏi\t\tcả  lớp', false)).toBe('GV hỏi cả lớp');
  });

  it('xuống dòng trong ô là ngắt hiển thị, nối lại thành một câu', () => {
    expect(donO('GV nêu tình huống\nlãi kép cho lớp', false)).toBe(
      'GV nêu tình huống lãi kép cho lớp',
    );
  });

  it('chuẩn hóa NFD về NFC', () => {
    const nfd = 'Khoảng cách'.normalize('NFD');
    expect(donO(nfd, false)).toBe('Khoảng cách');
  });

  it('gỡ nhãn thừa ở đầu ô văn (vanBanQuanSat sẽ tự thêm "GV: ")', () => {
    expect(donO('GV: chốt khái niệm phân số', true)).toBe('chốt khái niệm phân số');
    expect(donO('HS : ghi bài', true)).toBe('ghi bài');
    expect(donO('Ghi chú: nói nhiều', true)).toBe('nói nhiều');
  });

  it('gỡ được cả khi người ghi lặp nhãn hai lần', () => {
    expect(donO('GV: GV: chốt bài', true)).toBe('chốt bài');
  });

  // Đây là ca dễ hỏng nhất: cắt theo dấu ':' bất kỳ sẽ nuốt mất phần đầu câu.
  it('KHÔNG cắt dấu hai chấm nằm GIỮA câu', () => {
    expect(donO('GV hỏi: tại sao em nghĩ vậy?', true)).toBe('GV hỏi: tại sao em nghĩ vậy?');
    expect(donO('Kết luận quan trọng: hai phân số bằng nhau', true)).toBe(
      'Kết luận quan trọng: hai phân số bằng nhau',
    );
  });

  it('cột giờ và cột hoạt động KHÔNG bị gỡ nhãn', () => {
    expect(donO('GV: mở đầu', false)).toBe('GV: mở đầu');
  });
});

describe('lamSachDongQuanSat — gộp dòng bị Excel ngắt giữa câu', () => {
  it('gộp dòng nối tiếp vào dòng trên', () => {
    const kq = lamSachDongQuanSat([
      d({ thoiGian: '13:52', cuaGiaoVien: 'GV nêu bài toán mở đầu về lãi kép' }),
      d({ cuaGiaoVien: 'và yêu cầu HS thảo luận cặp đôi' }),
    ]);
    expect(kq.dong).toHaveLength(1);
    expect(kq.dong[0].cuaGiaoVien).toBe(
      'GV nêu bài toán mở đầu về lãi kép và yêu cầu HS thảo luận cặp đôi',
    );
    expect(kq.soDongGop).toBe(1);
  });

  it('KHÔNG gộp khi dòng dưới mở đầu bằng chữ HOA — đó là quan sát mới', () => {
    const kq = lamSachDongQuanSat([
      d({ thoiGian: '13:52', cuaGiaoVien: 'GV nêu bài toán' }),
      d({ cuaGiaoVien: 'HS thảo luận cặp đôi' }),
    ]);
    expect(kq.dong).toHaveLength(2);
    expect(kq.soDongGop).toBe(0);
  });

  it('KHÔNG gộp khi dòng dưới có mốc giờ hoặc tên hoạt động', () => {
    const kq = lamSachDongQuanSat([
      d({ thoiGian: '13:52', cuaGiaoVien: 'GV nêu bài toán' }),
      d({ thoiGian: '13:55', cuaGiaoVien: 'chốt lại công thức' }),
      d({ hoatDong: 'Luyện tập', cuaGiaoVien: 'giao phiếu' }),
    ]);
    expect(kq.dong).toHaveLength(3);
    expect(kq.soDongGop).toBe(0);
  });

  it('KHÔNG gộp khi chỉ MỘT ô là nối tiếp còn ô kia mở đầu chữ hoa', () => {
    const kq = lamSachDongQuanSat([
      d({ thoiGian: '13:52', cuaGiaoVien: 'GV nêu bài toán', cuaHocSinh: 'HS nghe' }),
      d({ cuaGiaoVien: 'và chờ 5 giây', cuaHocSinh: 'Khôi lên bảng' }),
    ]);
    expect(kq.dong).toHaveLength(2);
  });

  it('dòng đầu tiên không bao giờ bị gộp lên đâu cả', () => {
    const kq = lamSachDongQuanSat([d({ cuaGiaoVien: 'và tiếp tục giảng' })]);
    expect(kq.dong).toHaveLength(1);
    expect(kq.soDongGop).toBe(0);
  });
});

describe('lamSachDongQuanSat — số liệu báo cho người dự giờ', () => {
  it('bỏ dòng trống và đếm đúng', () => {
    const kq = lamSachDongQuanSat([
      d({ thoiGian: '13:52', cuaGiaoVien: 'GV chốt bài' }),
      d({}),
      d({ thoiGian: '  ', ghiChu: ' ' }),
    ]);
    expect(kq.dong).toHaveLength(1);
    expect(kq.soDongTrong).toBe(2);
  });

  it('đếm số ô thực sự bị đổi, ô đã sạch thì không tính', () => {
    const kq = lamSachDongQuanSat([
      d({ thoiGian: '13:52', cuaGiaoVien: 'GV:  chốt bài', cuaHocSinh: 'HS ghi bài' }),
    ]);
    // chỉ ô cuaGiaoVien bị đổi (gỡ nhãn + gộp khoảng trắng)
    expect(kq.soODaDon).toBe(1);
    expect(kq.dong[0].cuaGiaoVien).toBe('chốt bài');
    expect(kq.dong[0].cuaHocSinh).toBe('HS ghi bài');
  });

  it('không đụng vào mảng gốc', () => {
    const goc = [d({ thoiGian: '13:52', cuaGiaoVien: 'GV:  chốt bài' })];
    lamSachDongQuanSat(goc);
    expect(goc[0].cuaGiaoVien).toBe('GV:  chốt bài');
  });
});
