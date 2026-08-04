/**
 * Tầng B — hàng rào chặn "sửa chính tả" trượt thành "viết lại biên bản".
 *
 * Prompt có dặn kỹ đến mấy thì AI vẫn có lúc viết lại cả câu hoặc bịa đoạn không tồn tại.
 * Bộ lọc ở đây mới là thứ chặn thật. Nhóm "PHẢI LOẠI" dưới đây là các đường AI đi vòng —
 * ai nới ra thì biên bản đánh giá giáo viên có thể bị máy sửa nội dung mà không ai biết.
 */
import { describe, expect, it } from 'vitest';
import { apDungDeXuat, khoangCach, laSuaChinhTa, locDeXuat, promptSuaLoi } from './deXuatSuaLoi';
import type { DongQuanSat } from './types';

const d = (p: Partial<DongQuanSat>): DongQuanSat => ({
  thoiGian: '',
  hoatDong: '',
  cuaGiaoVien: '',
  cuaHocSinh: '',
  ghiChu: '',
  ...p,
});

const dong: DongQuanSat[] = [
  d({ thoiGian: '13:52', cuaGiaoVien: 'GV chot lai khai niem phan so', ghiChu: 'HS noi nhieu' }),
  d({ thoiGian: '13:55', cuaHocSinh: 'Hà Linh lên bảng giải bài 200000 đồng' }),
];

describe('khoangCach', () => {
  // Chuỗi đã chuẩn NFC nên "ô" là MỘT điểm mã: "khong"→"không" chỉ lệch 1, không phải 2.
  it.each([
    ['a', 'a', 0],
    ['khong', 'không', 1],
    ['chưa', 'chứa', 1],
    ['chot lai', 'chốt lại', 2],
    ['', 'abc', 3],
  ])('%s → %s = %i', (a, b, mong) => {
    expect(khoangCach(a as string, b as string)).toBe(mong);
  });
});

describe('laSuaChinhTa — chấp nhận', () => {
  it.each([
    ['khong', 'không'],
    ['chot lai', 'chốt lại'],
    ['hoc sinh', 'học sinh'],
  ])('nhận lỗi thiếu dấu: %s → %s', (a, b) => {
    expect(laSuaChinhTa(a, b)).toBe(true);
  });
});

describe('laSuaChinhTa — PHẢI LOẠI', () => {
  it('loại khi đổi SỐ TỪ (thêm ý)', () => {
    expect(laSuaChinhTa('GV chốt bài', 'GV chốt bài rất tốt')).toBe(false);
  });

  it('loại khi bớt từ', () => {
    expect(laSuaChinhTa('GV chốt lại bài', 'GV chốt bài')).toBe(false);
  });

  it('loại khi viết lại cả câu dù giữ số từ', () => {
    expect(laSuaChinhTa('HS noi nhieu', 'HS trật tự tốt')).toBe(false);
  });

  it('loại khi xoá sạch nội dung', () => {
    expect(laSuaChinhTa('GV chốt bài', '')).toBe(false);
  });

  it('loại khi không đổi gì', () => {
    expect(laSuaChinhTa('GV chốt bài', 'GV chốt bài')).toBe(false);
  });

  // "chưa"→"chứa" chỉ lệch 1 ký tự nên lọt bộ lọc — đúng như thiết kế:
  // tầng B KHÔNG tự áp, người dự giờ mới là người quyết. Test này ghim rõ điều đó.
  it('lỗi đổi nghĩa vẫn lọt bộ lọc — nên tầng B BẮT BUỘC phải có người duyệt', () => {
    expect(laSuaChinhTa('chưa', 'chứa')).toBe(true);
  });
});

describe('locDeXuat', () => {
  it('giữ đề xuất hợp lệ', () => {
    const { deXuat, soBiLoai } = locDeXuat(
      [{ dong: 0, cot: 'cuaGiaoVien', truoc: 'chot lai', sau: 'chốt lại', ly_do: 'thiếu dấu' }],
      dong,
    );
    expect(deXuat).toHaveLength(1);
    expect(soBiLoai).toBe(0);
    expect(deXuat[0].lyDo).toBe('thiếu dấu');
  });

  it('LOẠI khi "truoc" không có thật trong ô — AI bịa', () => {
    const { deXuat, soBiLoai } = locDeXuat(
      [{ dong: 0, cot: 'cuaGiaoVien', truoc: 'GV quát học sinh', sau: 'GV nhắc học sinh' }],
      dong,
    );
    expect(deXuat).toHaveLength(0);
    expect(soBiLoai).toBe(1);
  });

  it('LOẠI khi trỏ sai dòng hoặc dòng không tồn tại', () => {
    expect(
      locDeXuat([{ dong: 99, cot: 'cuaGiaoVien', truoc: 'chot lai', sau: 'chốt lại' }], dong).deXuat,
    ).toHaveLength(0);
    // đúng chữ nhưng sai dòng: dòng 1 không chứa "chot lai"
    expect(
      locDeXuat([{ dong: 1, cot: 'cuaGiaoVien', truoc: 'chot lai', sau: 'chốt lại' }], dong).deXuat,
    ).toHaveLength(0);
  });

  it('LOẠI khi nhắm vào cột thời gian — sai giờ là sai dữ kiện, không phải chính tả', () => {
    expect(
      locDeXuat([{ dong: 0, cot: 'thoiGian', truoc: '13:52', sau: '13:53' }], dong).deXuat,
    ).toHaveLength(0);
  });

  it('LOẠI khi định đụng vào con số / tên riêng bằng cách viết lại', () => {
    expect(
      locDeXuat(
        [{ dong: 1, cot: 'cuaHocSinh', truoc: '200000 đồng', sau: '200.000 đồng nữa' }],
        dong,
      ).deXuat,
    ).toHaveLength(0);
  });

  it('chịu được dữ liệu rác', () => {
    expect(locDeXuat(null, dong).deXuat).toEqual([]);
    expect(locDeXuat([{}, 'x', 7], dong).soBiLoai).toBe(3);
  });
});

describe('apDungDeXuat', () => {
  it('chỉ áp mục được chọn, không đụng mảng gốc', () => {
    const ra = apDungDeXuat(dong, [
      { dong: 0, cot: 'cuaGiaoVien', truoc: 'chot lai', sau: 'chốt lại', lyDo: '' },
    ]);
    expect(ra[0].cuaGiaoVien).toBe('GV chốt lại khai niem phan so');
    expect(ra[0].ghiChu).toBe('HS noi nhieu');
    expect(dong[0].cuaGiaoVien).toBe('GV chot lai khai niem phan so');
  });

  it('bỏ qua im lặng nếu nội dung đã đổi từ lúc đề xuất', () => {
    const ra = apDungDeXuat(dong, [
      { dong: 0, cot: 'cuaGiaoVien', truoc: 'khong ton tai', sau: 'không tồn tại', lyDo: '' },
    ]);
    expect(ra[0].cuaGiaoVien).toBe(dong[0].cuaGiaoVien);
  });
});

describe('promptSuaLoi', () => {
  const p = promptSuaLoi(dong);

  it('cấm rõ các đường AI hay đi vòng', () => {
    expect(p).toMatch(/Số từ trước và sau phải BẰNG NHAU/);
    expect(p).toMatch(/KHÔNG điền vào chỗ người dự giờ bỏ trống/);
    expect(p).toMatch(/Thà sót còn hơn sửa sai nghĩa/);
  });

  it('đánh số dòng để trỏ ngược lại đúng ô, và không gửi cột thời gian', () => {
    expect(p).toContain('dòng 0 | cuaGiaoVien |');
    expect(p).not.toContain('thoiGian');
  });
});
