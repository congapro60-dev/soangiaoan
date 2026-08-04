/**
 * Kiểm thử phần thuần của module phân tích — không gọi AI thật.
 *
 * Trọng tâm: bộ đọc bằng chứng có nhãn tiêu chí con. Nhãn sai không làm vỡ giao
 * diện ngay mà âm thầm phá thống kê cộng dồn nhiều lần dự giờ, nên phải chặn
 * ngay tại cửa vào.
 */
import { describe, expect, it } from 'vitest';
import { docBangChung, nguonTheoPhan, vanBanQuanSat } from './phanTich';
import { bienBanRong } from './types';

/**
 * Lỗi thật trên production (2026-08-03): chấm Phần I mà minh chứng lại là các dòng
 * biên bản dự giờ ("[13:52] GV: … Ghi chú: …").
 *
 * Quy định Tổ Toán xếp Domain 1 vào nhóm "ĐÁNH GIÁ HỒ SƠ" và cả ba luật Domain 1 chỉ
 * nhắc GIÁO ÁN. Phần I chấm bản kế hoạch soạn TRƯỚC khi lên lớp, nên diễn biến tiết dạy
 * không được là căn cứ. Nới lại luật này là tái lập đúng lỗi cũ.
 */
describe('nguonTheoPhan — mỗi phần chỉ được thấy nguồn của nó', () => {
  const bb = {
    ...bienBanRong('u1'),
    giaoAn: 'MỤC TIÊU PHÂN HÓA: HS yếu làm câu 1, HS giỏi làm câu 4.',
    hoSo: 'Tôi tự nhận thấy cần tăng kiểm tra quá trình.',
  };
  const vanBan = '[13:52] GV: chốt khái niệm phân số HS: ghi bài Ghi chú: nói nhiều';

  it('Phần I chỉ có giáo án, TUYỆT ĐỐI không có biên bản dự giờ', () => {
    const nguon = nguonTheoPhan(1, bb, vanBan);
    expect(nguon).toContain('MỤC TIÊU PHÂN HÓA');
    expect(nguon).not.toContain(vanBan);
    expect(nguon).not.toContain('13:52');
    expect(nguon).not.toContain('Ghi chú:');
  });

  it('Phần I nói rõ cấm suy đoán chuyện đã diễn ra trên lớp', () => {
    expect(nguonTheoPhan(1, bb, vanBan)).toMatch(/chấm bản kế hoạch, không chấm tiết dạy/);
  });

  it('Phần II và III vẫn dùng biên bản, không dính giáo án', () => {
    for (const p of [2, 3] as const) {
      const nguon = nguonTheoPhan(p, bb, vanBan);
      expect(nguon, `phần ${p}`).toContain(vanBan);
      expect(nguon, `phần ${p}`).not.toContain('MỤC TIÊU PHÂN HÓA');
    }
  });

  it('Phần IV dùng hồ sơ tự phản tư', () => {
    expect(nguonTheoPhan(4, bb, vanBan)).toContain('tăng kiểm tra quá trình');
  });
});

describe('docBangChung', () => {
  it('giữ nhãn hợp lệ của đúng thành tố', () => {
    const kq = docBangChung(
      [{ trich: 'GV hỏi "Tại sao?" rồi tự trả lời', tieu_chi_con: '3b.2' }],
      '3b',
    );
    expect(kq.bangChung).toEqual(['GV hỏi "Tại sao?" rồi tự trả lời']);
    expect(kq.bangChungCoNhan[0].tieuChiCon).toBe('3b.2');
  });

  // Nhãn của thành tố khác là lỗi nguy hiểm nhất: dữ liệu trông vẫn hợp lệ.
  it('BỎ nhãn thuộc thành tố khác, giữ lại trích dẫn', () => {
    const kq = docBangChung([{ trich: 'HS thảo luận nhóm', tieu_chi_con: '1e.3' }], '3b');
    expect(kq.bangChung).toEqual(['HS thảo luận nhóm']);
    expect(kq.bangChungCoNhan[0].tieuChiCon).toBe('');
  });

  it('BỎ mã bịa không có trong khung', () => {
    const kq = docBangChung([{ trich: 'x y z', tieu_chi_con: '3b.99' }], '3b');
    expect(kq.bangChungCoNhan[0].tieuChiCon).toBe('');
  });

  it('chấp nhận hợp đồng cũ dạng mảng chuỗi', () => {
    const kq = docBangChung(['câu bằng chứng cũ'], '3b');
    expect(kq.bangChung).toEqual(['câu bằng chứng cũ']);
    expect(kq.bangChungCoNhan[0].tieuChiCon).toBe('');
  });

  it('bỏ phần tử rỗng và cắt còn tối đa 2 trích dẫn', () => {
    const kq = docBangChung(
      [
        { trich: '  ', tieu_chi_con: '3b.2' },
        { trich: 'một', tieu_chi_con: '3b.2' },
        { trich: 'hai', tieu_chi_con: '3b.3' },
      ],
      '3b',
    );
    // slice(0,2) chạy TRƯỚC khi lọc rỗng nên phần tử rỗng vẫn chiếm một suất
    expect(kq.bangChung).toEqual(['một']);
  });

  it('không vỡ khi AI trả về thứ không phải mảng', () => {
    expect(docBangChung(undefined, '3b').bangChung).toEqual([]);
    expect(docBangChung('chuỗi đơn', '3b').bangChung).toEqual([]);
    expect(docBangChung(null, '3b').bangChungCoNhan).toEqual([]);
  });
});

describe('vanBanQuanSat', () => {
  it('ghép bảng quan sát thành văn bản có nhãn cột', () => {
    const bb = {
      ...bienBanRong('u1'),
      dongQuanSat: [
        { thoiGian: '9h00', hoatDong: 'Mở đầu', cuaGiaoVien: 'Nêu tình huống', cuaHocSinh: 'HS thảo luận', ghiChu: 'nên chiếu đề' },
      ],
      bienBan: 'ghi chép thêm',
    };
    const t = vanBanQuanSat(bb);
    expect(t).toContain('[9h00]');
    expect(t).toContain('(Mở đầu)');
    expect(t).toContain('GV: Nêu tình huống');
    expect(t).toContain('HS: HS thảo luận');
    expect(t).toContain('Ghi chú: nên chiếu đề');
    expect(t).toContain('ghi chép thêm');
  });

  it('bỏ dòng trống, không sinh rác cho prompt', () => {
    const bb = {
      ...bienBanRong('u1'),
      dongQuanSat: [
        { thoiGian: '', hoatDong: '', cuaGiaoVien: '', cuaHocSinh: '', ghiChu: '' },
        { thoiGian: '9h', hoatDong: 'X', cuaGiaoVien: '', cuaHocSinh: '', ghiChu: '' },
      ],
    };
    expect(vanBanQuanSat(bb).split('\n').filter(Boolean)).toHaveLength(1);
  });
});
