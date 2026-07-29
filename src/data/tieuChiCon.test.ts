/**
 * Canh toàn vẹn tầng tiêu chí con.
 *
 * Cùng lý do với khungDanielson.test.ts: file này SINH TỰ ĐỘNG từ .xlsx của
 * trường, mà file gốc có lỗ hổng thật (3b.1 bỏ trống cả 4 mức). Sinh lại dữ
 * liệu thì chạy bộ này TRƯỚC khi tin kết quả.
 */
import { describe, expect, it } from 'vitest';
import { COMPONENTS, type MaThanhTo } from './khungDanielson';
import { TIEU_CHI_CON, TIEU_CHI_CON_THEO_MA, tieuChiConCua } from './tieuChiCon';

const CO_DAU_TIENG_VIET =
  /[àáâãèéêìíòóôõùúăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹýÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯ]/;

/**
 * Mục mà cả hai nguồn của trường (.xlsx và .pdf) đều bỏ trống 4 mức, và đã được
 * soạn bổ sung. Trường ban hành bản chính thức thì thay nội dung và bỏ khỏi đây.
 */
const TU_BO_SUNG = ['3b.1'];

describe('cấu trúc tiêu chí con', () => {
  it('đủ 77 mục, mã không trùng', () => {
    expect(TIEU_CHI_CON).toHaveLength(77);
    expect(new Set(TIEU_CHI_CON.map(t => t.ma)).size).toBe(77);
  });

  it('mọi tiêu chí con đều thuộc một thành tố có thật trong khung 22', () => {
    const hopLe = new Set(COMPONENTS.map(c => c.ma));
    TIEU_CHI_CON.forEach(t => {
      expect(hopLe.has(t.thanhTo), `${t.ma} trỏ tới thành tố lạ: ${t.thanhTo}`).toBe(true);
    });
  });

  it('mã tiêu chí con khớp tiền tố thành tố của nó', () => {
    TIEU_CHI_CON.forEach(t => {
      expect(t.ma.startsWith(t.thanhTo + '.'), `${t.ma} không khớp ${t.thanhTo}`).toBe(true);
    });
  });

  it('cả 22 thành tố đều có tiêu chí con, không mục nào bị bỏ quên', () => {
    COMPONENTS.forEach(c => {
      expect(tieuChiConCua(c.ma).length, `${c.ma} không có tiêu chí con nào`).toBeGreaterThan(0);
    });
  });

  it('tra theo mã hoạt động', () => {
    expect(TIEU_CHI_CON_THEO_MA['3a.2']?.ten).toBe('Kì vọng cụ thể');
    expect(TIEU_CHI_CON_THEO_MA['1e.3']?.ten).toBe('Phối hợp nhóm');
    expect(TIEU_CHI_CON_THEO_MA['khong-co']).toBeUndefined();
  });
});

describe('nội dung tiêu chí con', () => {
  const ma = TIEU_CHI_CON.map(t => t.ma);

  it.each(ma)('%s — có tên và định nghĩa bằng tiếng Việt', m => {
    const t = TIEU_CHI_CON_THEO_MA[m];
    expect(t.ten.length, `${m} thiếu tên`).toBeGreaterThan(3);
    expect(CO_DAU_TIENG_VIET.test(t.ten + t.dinhNghia), `${m} không phải tiếng Việt`).toBe(true);
  });

  it.each(ma)('%s — có đủ 4 mức khác nhau', m => {
    const t = TIEU_CHI_CON_THEO_MA[m];
    expect(t.muc, `${m} phải có đúng 4 mức`).toHaveLength(4);
    expect(new Set(t.muc).size, `${m} có mức trùng nhau`).toBe(4);
    t.muc.forEach((x, i) => {
      expect(CO_DAU_TIENG_VIET.test(x), `${m} mức ${i + 1} không phải tiếng Việt`).toBe(true);
      expect(x.length, `${m} mức ${i + 1} quá ngắn`).toBeGreaterThan(30);
    });
  });

  it('không mục nào còn trống 4 mức', () => {
    expect(TIEU_CHI_CON.filter(t => t.muc.length === 0).map(t => t.ma)).toEqual([]);
  });

  // Cờ tuBoSung phải khớp đúng danh sách đã biết. Sinh lại dữ liệu từ .xlsx mà
  // quên áp lại phần bổ sung thì ca này gãy ngay, thay vì im lặng mất nội dung.
  it('đúng những mục đã biết mới được đánh dấu là bổ sung', () => {
    const co = TIEU_CHI_CON.filter(t => t.tuBoSung).map(t => t.ma).sort();
    expect(co).toEqual([...TU_BO_SUNG].sort());
  });

  it('mục bổ sung vẫn phải đạt cùng chuẩn chất lượng như mục chính thức', () => {
    TU_BO_SUNG.forEach(m => {
      const t = TIEU_CHI_CON_THEO_MA[m];
      expect(t.muc).toHaveLength(4);
      expect(new Set(t.muc).size).toBe(4);
      t.muc.forEach(x => expect(x.length).toBeGreaterThan(30));
    });
  });
});
