/**
 * Canh ánh xạ dạy học phân hóa.
 *
 * Rủi ro chính: mã tiêu chí con gõ sai hoặc lệch so với khung. Mã sai không làm
 * vỡ gì ngay — nó chỉ khiến ràng buộc "phải có 1 tiêu chí phân hóa" kiểm sai,
 * và không ai phát hiện cho tới khi kế hoạch đã duyệt xong.
 */
import { describe, expect, it } from 'vitest';
import { COMPONENTS } from './khungDanielson';
import { TIEU_CHI_CON_THEO_MA } from './tieuChiCon';
import {
  BIEU_HIEN_PHAN_HOA,
  THANH_TO_PHAN_HOA,
  TIEU_CHI_CON_PHAN_HOA,
  THANH_TO_TRONG_TAM_2627,
  TIEU_CHI_CON_TRONG_TAM_2627,
  bieuHienCua,
  laTieuChiPhanHoa,
  laTrongTam2627,
} from './phanHoa';

describe('ánh xạ phân hóa', () => {
  it('đủ 8 biểu hiện như trang 11 tài liệu tập huấn', () => {
    expect(BIEU_HIEN_PHAN_HOA).toHaveLength(8);
  });

  it('mọi mã tiêu chí con đều CÓ THẬT trong khung 77 mục', () => {
    BIEU_HIEN_PHAN_HOA.forEach(b => {
      b.tieuChiCon.forEach(ma => {
        expect(TIEU_CHI_CON_THEO_MA[ma], `${b.ten}: mã ${ma} không tồn tại`).toBeDefined();
      });
    });
  });

  it('mọi thành tố nêu đích danh đều có thật', () => {
    const hopLe = new Set(COMPONENTS.map(c => c.ma));
    BIEU_HIEN_PHAN_HOA.forEach(b => {
      b.thanhTo.forEach(m => expect(hopLe.has(m), `${b.ten}: thành tố lạ ${m}`).toBe(true));
    });
  });

  it('tiêu chí con phải nằm trong đúng thành tố mà trường nêu', () => {
    BIEU_HIEN_PHAN_HOA.forEach(b => {
      b.tieuChiCon.forEach(ma => {
        const thuoc = TIEU_CHI_CON_THEO_MA[ma].thanhTo;
        // Riêng "ghép nhóm linh hoạt" trường ghi 3c, nhưng khâu LẬP KẾ HOẠCH
        // nhóm nằm ở 1e.3 — nên chấp nhận cả hai.
        const chapNhan = [...b.thanhTo, ...(b.ten.includes('Ghép nhóm') ? ['1e'] : [])];
        expect(chapNhan, `${b.ten}: ${ma} thuộc ${thuoc}, ngoài ${b.thanhTo.join('/')}`).toContain(thuoc);
      });
    });
  });

  // Sáu thành tố tô đỏ ở trang 11.
  it('đúng sáu thành tố trọng tâm 26-27', () => {
    expect([...THANH_TO_TRONG_TAM_2627]).toEqual(['1d', '1e', '1f', '3c', '3d', '3e']);
  });

  // Màu đỏ đánh vào THÀNH TỐ, không vào cả dòng: "Hỗ trợ cho học sinh đa dạng
  // (2c, 3e)" thì 3e đỏ mà 2c đen. Đây là chỗ dễ làm sai nhất.
  it('trong cùng một biểu hiện, chỉ thành tố đỏ mới vào nhóm trọng tâm', () => {
    expect(laTrongTam2627('3e.1')).toBe(true);
    expect(laTrongTam2627('2c.3')).toBe(false);
  });

  it('ba thành tố phân hóa nhưng không trọng tâm: 1c, 2b, 2c', () => {
    const khong = THANH_TO_PHAN_HOA.filter(m => !THANH_TO_TRONG_TAM_2627.includes(m));
    expect([...khong]).toEqual(['1c', '2b', '2c']);
  });

  it('danh sách gộp không trùng lặp và là tập con của toàn bộ', () => {
    expect(new Set(TIEU_CHI_CON_PHAN_HOA).size).toBe(TIEU_CHI_CON_PHAN_HOA.length);
    TIEU_CHI_CON_TRONG_TAM_2627.forEach(m => expect(TIEU_CHI_CON_PHAN_HOA).toContain(m));
  });

  it('THANH_TO_PHAN_HOA khớp đúng 9 thành tố trang 11 nêu', () => {
    expect([...THANH_TO_PHAN_HOA]).toEqual(['1c', '1d', '1e', '1f', '2b', '2c', '3c', '3d', '3e']);
  });
});

describe('tra cứu', () => {
  it('nhận đúng tiêu chí phân hóa và loại tiêu chí không liên quan', () => {
    expect(laTieuChiPhanHoa('1e.2')).toBe(true);
    expect(laTieuChiPhanHoa('3c.2')).toBe(true);
    // 4d.1 là đóng góp cộng đồng nhà trường, không dính phân hóa
    expect(laTieuChiPhanHoa('4d.1')).toBe(false);
    expect(laTieuChiPhanHoa('khong-co')).toBe(false);
  });

  // Kế hoạch 2024-25 có thật của giáo viên chọn 1e.1, 1e.3, 3c.2 và được duyệt
  // — ánh xạ phải công nhận cả ba, nếu không là ánh xạ sai với thực tế.
  it('công nhận đúng bộ tiêu chí trong kế hoạch đã được duyệt', () => {
    ['1e.1', '1e.3', '3c.2'].forEach(m => expect(laTieuChiPhanHoa(m), m).toBe(true));
  });

  it('tra ngược ra biểu hiện tương ứng', () => {
    expect(bieuHienCua('3c.2').map(b => b.ten)).toEqual(['Ghép nhóm linh hoạt và có chủ đích']);
    expect(bieuHienCua('4d.1')).toEqual([]);
  });
});
