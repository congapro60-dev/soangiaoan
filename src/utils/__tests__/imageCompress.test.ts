import { describe, expect, it } from 'vitest';
import {
  dichLoiNopBai,
  GIOI_HAN_BYTE_STORAGE,
  LoiKhongGiaiMaDuoc,
  MAX_CANH,
  tinhKichThuocMoi,
} from '../imageCompress';

describe('tinhKichThuocMoi', () => {
  it('giữ nguyên ảnh đã nhỏ hơn max, không phóng to', () => {
    expect(tinhKichThuocMoi(800, 600)).toEqual({ w: 800, h: 600 });
    expect(tinhKichThuocMoi(MAX_CANH, MAX_CANH)).toEqual({ w: MAX_CANH, h: MAX_CANH });
  });

  it('ảnh ngang lớn co theo cạnh rộng', () => {
    expect(tinhKichThuocMoi(4000, 3000)).toEqual({ w: MAX_CANH, h: Math.round(3000 * (MAX_CANH / 4000)) });
  });

  it('ảnh dọc lớn co theo cạnh cao', () => {
    expect(tinhKichThuocMoi(3000, 4000)).toEqual({ w: Math.round(3000 * (MAX_CANH / 4000)), h: MAX_CANH });
  });

  it('ảnh vuông lớn ra đúng max × max', () => {
    expect(tinhKichThuocMoi(4800, 4800)).toEqual({ w: MAX_CANH, h: MAX_CANH });
  });

  it('max tuỳ chọn được tôn trọng', () => {
    expect(tinhKichThuocMoi(2000, 1000, 500)).toEqual({ w: 500, h: 250 });
  });

  it('kích thước vô lý không gây chia cho 0 hay NaN', () => {
    expect(tinhKichThuocMoi(0, 0)).toEqual({ w: 0, h: 0 });
    expect(tinhKichThuocMoi(Number.NaN, Number.NaN)).toEqual({ w: Number.NaN, h: Number.NaN });
  });
});

describe('dichLoiNopBai', () => {
  it('storage/unauthorized nói đúng nguyên nhân dung lượng/quyền', () => {
    const loi = Object.assign(new Error('Firebase Storage: unauthorized'), { code: 'storage/unauthorized' });
    const thongBao = dichLoiNopBai(loi);
    expect(thongBao).toContain('dung lượng');
    expect(thongBao).not.toContain('Firebase Storage:');
  });

  it('storage/unauthenticated hướng dẫn tải lại trang', () => {
    const loi = Object.assign(new Error('x'), { code: 'storage/unauthenticated' });
    expect(dichLoiNopBai(loi)).toContain('hết hạn');
  });

  it('permission-denied của Firestore cũng được dịch', () => {
    const loi = Object.assign(new Error('Missing or insufficient permissions'), { code: 'permission-denied' });
    expect(dichLoiNopBai(loi)).toContain('phiên học');
  });

  it('lỗi mạng chỉ dẫn kiểm tra kết nối', () => {
    const loi = Object.assign(new Error('network request failed'), { code: 'storage/network-request-failed' });
    expect(dichLoiNopBai(loi)).toContain('Mạng');
  });

  it('lỗi tự ném có message tiếng Việt thì giữ nguyên văn', () => {
    const loi = new Error('Ảnh ở định dạng HEIC và quá nặng để tải lên.');
    expect(dichLoiNopBai(loi)).toBe('Ảnh ở định dạng HEIC và quá nặng để tải lên.');
  });

  it('LoiKhongGiaiMaDuoc không bị nuốt thành câu chung chung', () => {
    expect(dichLoiNopBai(new LoiKhongGiaiMaDuoc())).toContain('Trình duyệt');
  });

  it('lỗi lạ không có mã vẫn trả câu dùng được', () => {
    expect(typeof dichLoiNopBai(undefined)).toBe('string');
    expect(dichLoiNopBai(undefined).length).toBeGreaterThan(5);
  });

  it(`ngưỡng storage khớp rules 6MB (${GIOI_HAN_BYTE_STORAGE} byte)`, () => {
    expect(GIOI_HAN_BYTE_STORAGE).toBe(6 * 1024 * 1024);
  });
});
