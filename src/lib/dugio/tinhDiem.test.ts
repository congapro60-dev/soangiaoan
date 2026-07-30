import { describe, expect, it } from 'vitest';
import { bienBanRong, type BienBanDuGio } from './types';
import {
  chonThanhToGopY,
  diemDeXuatTuTieuChiCon,
  soSanhTuDanhGia,
  soVN,
  thanhToTheoBo,
  thieuMinhChungChamNguong,
  tinhDiem,
} from './tinhDiem';

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

describe('diemDeXuatTuTieuChiCon', () => {
  it('trung bình các tiêu chí con, làm tròn tới 0,5', () => {
    // 3b có 3 tiêu chí con. (3 + 2 + 2)/3 = 2,33 → 2,5
    const kq = diemDeXuatTuTieuChiCon(
      bb({ diemTieuChiCon: { '3b.1': 3, '3b.2': 2, '3b.3': 2 } }),
      '3b',
    );
    expect(kq.diem).toBe(2.5);
    expect(kq.soDaCham).toBe(3);
    expect(kq.tong).toBe(3);
  });

  it('chỉ tính mục đã chấm, mục chưa chấm không kéo xuống 0', () => {
    const kq = diemDeXuatTuTieuChiCon(bb({ diemTieuChiCon: { '3b.1': 4 } }), '3b');
    expect(kq.diem).toBe(4);
    expect(kq.soDaCham).toBe(1);
  });

  it('chưa chấm mục nào thì null, không phải 0', () => {
    expect(diemDeXuatTuTieuChiCon(bb(), '3b').diem).toBeNull();
  });

  it('null tường minh cũng là chưa chấm', () => {
    expect(diemDeXuatTuTieuChiCon(bb({ diemTieuChiCon: { '3b.1': null } }), '3b').diem).toBeNull();
  });
});

// Lỗi user QA phát hiện: ngưỡng "điểm < 3" ra 0 mục trên bảng điểm thật của
// trường (thấp nhất là 3) nên nhận xét rỗng hoàn toàn.
describe('chonThanhToGopY', () => {
  const toanBa = () => {
    const diemChot: BienBanDuGio['diemChot'] = {};
    (['1a', '1b', '1c', '1d', '1e', '1f'] as const).forEach(m => (diemChot[m] = 3));
    (['2a', '2c', '2d', '2e'] as const).forEach(m => (diemChot[m] = 3.5));
    (['3a', '3b', '3c', '3d', '3e'] as const).forEach(m => (diemChot[m] = 3.5));
    return bb({ diemChot });
  };

  it('bảng điểm toàn 3 và 3,5 vẫn ra danh sách góp ý, không rỗng', () => {
    const ds = chonThanhToGopY(toanBa());
    expect(ds.length).toBeGreaterThan(0);
  });

  it('mọi thành tố ≤ 3 đều vào danh sách, vì mức 3 là sàn', () => {
    const ds = chonThanhToGopY(toanBa()).map(x => x.ma);
    (['1a', '1b', '1c', '1d', '1e', '1f'] as const).forEach(m => expect(ds).toContain(m));
  });

  it('nêu rõ lí do chọn để người dùng còn kiểm', () => {
    const ds = chonThanhToGopY(toanBa());
    expect(ds[0].lyDo.length).toBeGreaterThan(0);
    expect(ds.some(x => x.lyDo.includes('mức 3 là sàn, chưa phải đích'))).toBe(true);
  });

  it('luôn lấy đủ nhóm điểm thấp nhất dù mọi điểm đều cao', () => {
    const diemChot: BienBanDuGio['diemChot'] = {};
    (['3a', '3b', '3c', '3d', '3e'] as const).forEach(m => (diemChot[m] = 4));
    diemChot['3b'] = 3.5;
    const ds = chonThanhToGopY(bb({ diemChot }), 2);
    expect(ds.length).toBeGreaterThanOrEqual(2);
    // Mục thấp nhất phải đứng đầu
    expect(ds[0].ma).toBe('3b');
  });

  it('thành tố thuộc trọng tâm 26-27 mà chưa đạt 3,5 thì được nêu lí do riêng', () => {
    // 3c thuộc trọng tâm; cho nó 3 để vào diện
    const diemChot: BienBanDuGio['diemChot'] = { '3c': 3, '2a': 4, '2c': 4, '2d': 4 };
    const ds = chonThanhToGopY(bb({ diemChot }));
    const x = ds.find(v => v.ma === '3c')!;
    expect(x.lyDo).toContain('trọng tâm quan sát năm 26-27');
  });

  it('sắp xếp điểm thấp lên trước', () => {
    const diemChot: BienBanDuGio['diemChot'] = { '3a': 3.5, '3b': 2, '3c': 3 };
    const ds = chonThanhToGopY(bb({ diemChot }));
    expect(ds.map(x => x.ma).slice(0, 2)).toEqual(['3b', '3c']);
  });

  it('chưa chấm gì thì không có mục nào để góp ý', () => {
    expect(chonThanhToGopY(bb())).toEqual([]);
  });
});

describe('soSanhTuDanhGia', () => {
  it('chưa tự đánh giá thì báo rõ, không coi là lệch', () => {
    const kq = soSanhTuDanhGia(bb({ diemChot: { '3b': 3, '3c': 2 } }));
    expect(kq.daTuDanhGia).toBe(false);
    expect(kq.lechLon).toEqual([]);
    expect(kq.dong).toHaveLength(2);
    expect(kq.dong[0].giaoVien).toBeNull();
    expect(kq.dong[0].chenh).toBeNull();
  });

  it('tính chênh theo hướng giáo viên trừ người dự giờ', () => {
    const kq = soSanhTuDanhGia(
      bb({
        diemChot: { '3b': 2, '3c': 4 },
        tuDanhGia: { diem: { '3b': 4, '3c': 3 }, ghiChu: {}, hoanThanhLuc: '2026-04-06' },
      }),
    );
    const b = kq.dong.find(d => d.ma === '3b')!;
    const c = kq.dong.find(d => d.ma === '3c')!;
    expect(b.chenh).toBe(2); // GV tự chấm cao hơn
    expect(c.chenh).toBe(-1); // GV tự chấm thấp hơn
    expect(kq.daTuDanhGia).toBe(true);
  });

  it('chỉ nêu lệch từ 1 mức trở lên; lệch 0,5 là sai số bình thường', () => {
    const kq = soSanhTuDanhGia(
      bb({
        diemChot: { '3a': 3, '3b': 3, '3c': 3 },
        tuDanhGia: {
          diem: { '3a': 3.5, '3b': 4, '3c': 3 },
          ghiChu: {},
          hoanThanhLuc: '2026-04-06',
        },
      }),
    );
    expect(kq.lechLon.map(d => d.ma)).toEqual(['3b']);
  });

  it('sắp xếp lệch lớn nhất lên đầu', () => {
    const kq = soSanhTuDanhGia(
      bb({
        diemChot: { '3a': 1, '3b': 3, '3c': 2 },
        tuDanhGia: { diem: { '3a': 2, '3b': 1, '3c': 4 }, ghiChu: {}, hoanThanhLuc: 'x' },
      }),
    );
    // chênh: 3a=+1, 3b=−2, 3c=+2 → xếp theo trị tuyệt đối giảm dần
    expect(kq.lechLon.map(d => Math.abs(d.chenh as number))).toEqual([2, 2, 1]);
  });

  it('bỏ qua thành tố cả hai bên đều không đánh giá', () => {
    const kq = soSanhTuDanhGia(
      bb({ diemChot: { '3b': 3 }, tuDanhGia: { diem: {}, ghiChu: {}, hoanThanhLuc: 'x' } }),
    );
    expect(kq.dong.map(d => d.ma)).toEqual(['3b']);
  });

  it('mang theo ghi chú của giáo viên để đọc khi trao đổi', () => {
    const kq = soSanhTuDanhGia(
      bb({
        diemChot: { '3b': 2 },
        tuDanhGia: { diem: { '3b': 3 }, ghiChu: { '3b': 'Tôi có chờ 3 giây' }, hoanThanhLuc: 'x' },
      }),
    );
    expect(kq.dong[0].ghiChu).toBe('Tôi có chờ 3 giây');
  });
});

// Mời giáo viên tự chấm là TÙY CHỌN. Người dự giờ phải chạy trọn được phân
// tích, chấm điểm và xuất file mà không cần chờ ai. Khoá lại để sau này không
// ai vô tình biến bước 5 thành điều kiện bắt buộc.
describe('không phụ thuộc bản tự đánh giá', () => {
  const chiNguoiDu = bb({
    gvEmail: '',
    diemChot: { '1a': 3, '3b': 2.5, '3c': 4 },
    chamNguong: { '3b': 'có chia nhóm nhưng quá ngắn' },
  });

  it('tính điểm, xếp loại chạy đủ khi chưa mời ai', () => {
    const kq = tinhDiem(chiNguoiDu);
    expect(kq.trungBinh).not.toBeNull();
    expect(kq.xepLoai).not.toBeNull();
    expect(kq.soDaCham).toBe(3);
  });

  it('ràng buộc điểm lẻ vẫn hoạt động, không liên quan tự đánh giá', () => {
    expect(thieuMinhChungChamNguong(chiNguoiDu)).toEqual([]);
    expect(thieuMinhChungChamNguong({ ...chiNguoiDu, chamNguong: {} })).toHaveLength(1);
  });

  it('bảng đối chiếu báo chưa có bản tự chấm chứ không vỡ', () => {
    const kq = soSanhTuDanhGia(chiNguoiDu);
    expect(kq.daTuDanhGia).toBe(false);
    expect(kq.lechLon).toEqual([]);
    // vẫn liệt kê điểm của người dự giờ để xem lại
    expect(kq.dong.map(d => d.ma)).toEqual(['1a', '3b', '3c']);
    expect(kq.dong.every(d => d.giaoVien === null)).toBe(true);
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
