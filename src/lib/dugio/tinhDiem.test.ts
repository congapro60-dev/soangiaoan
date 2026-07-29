import { describe, expect, it } from 'vitest';
import { bienBanRong, type BienBanDuGio } from './types';
import { soVN, thanhToTheoBo, thieuMinhChungChamNguong, tinhDiem } from './tinhDiem';

const bb = (ghiDe: Partial<BienBanDuGio> = {}): BienBanDuGio => ({
  ...bienBanRong('u1'),
  ...ghiDe,
});

describe('thanhToTheoBo', () => {
  it('bộ dự giờ đúng 15 cấu phần như mẫu Excel của trường', () => {
    const ds = thanhToTheoBo('dugio');
    expect(ds).toHaveLength(15);
    expect(ds).not.toContain('2b');
    expect(ds.some(m => m.startsWith('4'))).toBe(false);
  });

  it('bộ đầy đủ là 22 thành tố của khung', () => {
    expect(thanhToTheoBo('daydu')).toHaveLength(22);
  });
});

describe('tinhDiem', () => {
  it('chưa chấm gì thì mọi thứ là null, không phải 0', () => {
    const kq = tinhDiem(bb());
    expect(kq.trungBinh).toBeNull();
    expect(kq.thang10).toBeNull();
    expect(kq.xepLoai).toBeNull();
    expect(kq.soDaCham).toBe(0);
  });

  it('áp đúng trọng số 0,2 / 0,35 / 0,45 cho Phần I–III', () => {
    // Phần I toàn 2, Phần II toàn 4, Phần III toàn 3.
    const diemChot: BienBanDuGio['diemChot'] = {};
    (['1a', '1b', '1c', '1d', '1e', '1f'] as const).forEach(m => (diemChot[m] = 2));
    (['2a', '2c', '2d', '2e'] as const).forEach(m => (diemChot[m] = 4));
    (['3a', '3b', '3c', '3d', '3e'] as const).forEach(m => (diemChot[m] = 3));

    const kq = tinhDiem(bb({ diemChot }));
    expect(kq.trungBinhPhan[1]).toBe(2);
    expect(kq.trungBinhPhan[2]).toBe(4);
    expect(kq.trungBinhPhan[3]).toBe(3);
    // 2*0.2 + 4*0.35 + 3*0.45 = 0.4 + 1.4 + 1.35 = 3.15
    expect(kq.trungBinh).toBeCloseTo(3.15, 5);
    expect(kq.xepLoai).toBe('Tốt');
    expect(kq.soDaCham).toBe(15);
  });

  it('phần chưa chấm bị loại khỏi mẫu số, không kéo điểm chung xuống 0', () => {
    // Chỉ chấm Phần III toàn 3 — điểm chung phải đúng bằng 3.
    const diemChot: BienBanDuGio['diemChot'] = {};
    (['3a', '3b', '3c', '3d', '3e'] as const).forEach(m => (diemChot[m] = 3));
    const kq = tinhDiem(bb({ diemChot }));
    expect(kq.trungBinhPhan[1]).toBeNull();
    expect(kq.trungBinh).toBeCloseTo(3, 5);
  });

  it('Phần IV trọng số 0 nên không đổi điểm chung', () => {
    const diemChot: BienBanDuGio['diemChot'] = {};
    (['3a', '3b', '3c', '3d', '3e'] as const).forEach(m => (diemChot[m] = 3));
    const khongPhanIV = tinhDiem(bb({ boTieuChi: 'daydu', diemChot }));
    const coPhanIV = tinhDiem(
      bb({ boTieuChi: 'daydu', diemChot: { ...diemChot, '4a': 1, '4b': 1 } }),
    );
    expect(coPhanIV.trungBinh).toBe(khongPhanIV.trungBinh);
    expect(coPhanIV.trungBinhPhan[4]).toBe(1);
  });

  // Thành tố không quan sát được là KHÔNG ĐÁNH GIÁ, không phải 0 điểm.
  // Nếu tính là 0 thì một tiết dạy tốt nhưng chấm thiếu vài mục sẽ bị kéo
  // xuống "Chưa đạt" — sai với người bị dự giờ.
  it('thành tố không đánh giá bị loại khỏi trung bình, KHÔNG tính là 0', () => {
    const day = tinhDiem(bb({ diemChot: { '3a': 4, '3b': 4, '3c': 4, '3d': 4, '3e': 4 } }));
    const thieu = tinhDiem(bb({ diemChot: { '3a': 4, '3b': 4 } }));
    expect(day.trungBinhPhan[3]).toBe(4);
    expect(thieu.trungBinhPhan[3]).toBe(4);
    expect(thieu.trungBinh).toBe(day.trungBinh);
    expect(thieu.xepLoai).toBe('Xuất sắc');
    // nhưng vẫn phải thấy rõ là mới chấm 2/15
    expect(thieu.soDaCham).toBe(2);
    expect(thieu.tongThanhTo).toBe(15);
  });

  it('diemChot = null (đã xem nhưng không đủ căn cứ) cũng không tính là 0', () => {
    const kq = tinhDiem(bb({ diemChot: { '3a': 3, '3b': null, '3c': null } }));
    expect(kq.trungBinhPhan[3]).toBe(3);
    expect(kq.soDaCham).toBe(1);
  });

  it('quy đổi thang 10 làm tròn tới 0,5', () => {
    const diemChot: BienBanDuGio['diemChot'] = {};
    (['3a', '3b', '3c', '3d', '3e'] as const).forEach(m => (diemChot[m] = 3));
    // 3/4*10 = 7,5
    expect(tinhDiem(bb({ diemChot })).thang10).toBe(7.5);
  });

  it('ranh giới xếp loại theo đúng mốc 1,5 / 2,5 / 3,5', () => {
    const dat = (d: number) => {
      const diemChot: BienBanDuGio['diemChot'] = {};
      (['3a', '3b', '3c', '3d', '3e'] as const).forEach(m => (diemChot[m] = d));
      return tinhDiem(bb({ diemChot })).xepLoai;
    };
    expect(dat(1)).toBe('Chưa đạt');
    expect(dat(1.5)).toBe('Cơ bản');
    expect(dat(2.5)).toBe('Tốt');
    expect(dat(3.5)).toBe('Xuất sắc');
  });
});

// Nguyên tắc tổ Toán: điểm lẻ phải có minh chứng, không được chấm theo cảm giác.
describe('thieuMinhChungChamNguong', () => {
  it('điểm lẻ mà chưa ghi minh chứng thì bị nêu tên', () => {
    const thieu = thieuMinhChungChamNguong(bb({ diemChot: { '3b': 2.5, '3c': 3.5 } }));
    expect(thieu.map(t => t.ma).sort()).toEqual(['3b', '3c']);
    expect(thieu[0].diem).toBe(2.5);
  });

  it('điểm nguyên không cần minh chứng chạm ngưỡng', () => {
    expect(thieuMinhChungChamNguong(bb({ diemChot: { '3b': 3, '3c': 4 } }))).toEqual([]);
  });

  it('đã ghi minh chứng thì hợp lệ', () => {
    const ok = bb({
      diemChot: { '3b': 2.5 },
      chamNguong: { '3b': 'GV có chia nhóm thảo luận nhưng quá ngắn, chưa ra kết quả.' },
    });
    expect(thieuMinhChungChamNguong(ok)).toEqual([]);
  });

  it('minh chứng chỉ có khoảng trắng không được tính là đã ghi', () => {
    const rong = bb({ diemChot: { '3b': 2.5 }, chamNguong: { '3b': '   ' } });
    expect(thieuMinhChungChamNguong(rong)).toHaveLength(1);
  });

  it('thành tố ngoài bộ tiêu chí đang chọn thì không xét', () => {
    // 4a chỉ có trong bộ đầy đủ.
    expect(thieuMinhChungChamNguong(bb({ boTieuChi: 'dugio', diemChot: { '4a': 2.5 } }))).toEqual([]);
    expect(thieuMinhChungChamNguong(bb({ boTieuChi: 'daydu', diemChot: { '4a': 2.5 } }))).toHaveLength(1);
  });
});

describe('soVN', () => {
  it('dùng dấu phẩy thập phân và bỏ số 0 thừa', () => {
    expect(soVN(3.15)).toBe('3,15');
    expect(soVN(3)).toBe('3');
    expect(soVN(2.5)).toBe('2,5');
    expect(soVN(null)).toBe('—');
  });
});
