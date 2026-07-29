/**
 * Canh tính toàn vẹn của dữ liệu khung Danielson.
 *
 * Vì sao cần: file dữ liệu được SINH TỰ ĐỘNG từ bản .docx của trường, mà bản
 * gốc đó có sẵn hai lỗi — mục 2b còn nguyên văn tiếng Anh chưa dịch, mục 3a
 * chép nhầm khiến mức 4 lặp lại mức 1. Cả hai lọt tới tận giao diện mới bị
 * người dùng phát hiện. Bộ test này bắt đúng loại lỗi đó.
 *
 * Sinh lại dữ liệu từ .docx thì chạy lại test này TRƯỚC khi tin vào kết quả.
 */
import { describe, expect, it } from 'vitest';
import {
  BO_DU_GIO,
  COMPONENTS,
  COT_LOI,
  RUBRIC,
  SUY_NGAM,
  TEN_MUC,
  TRONG_SO,
  type MaThanhTo,
} from './khungDanielson';

const CO_DAU_TIENG_VIET =
  /[àáâãèéêìíòóôõùúăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹýÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯ]/;

describe('cấu trúc khung', () => {
  it('đủ 22 thành tố, mã không trùng', () => {
    expect(COMPONENTS).toHaveLength(22);
    expect(new Set(COMPONENTS.map(c => c.ma)).size).toBe(22);
  });

  it('bộ dự giờ 15 cấu phần, đều nằm trong 22 thành tố', () => {
    expect(BO_DU_GIO).toHaveLength(15);
    const tatCa = new Set(COMPONENTS.map(c => c.ma));
    BO_DU_GIO.forEach(ma => expect(tatCa.has(ma)).toBe(true));
  });

  it('trọng số Phần I–III cộng lại bằng 1, Phần IV bằng 0', () => {
    expect(TRONG_SO[1] + TRONG_SO[2] + TRONG_SO[3]).toBeCloseTo(1, 10);
    expect(TRONG_SO[4]).toBe(0);
  });

  it('bốn mức đúng tên bản dịch của trường', () => {
    expect([...TEN_MUC]).toEqual(['Chưa đạt', 'Cơ bản', 'Tốt', 'Xuất sắc']);
  });
});

describe('rubric — mọi thành tố', () => {
  const ma = COMPONENTS.map(c => c.ma);

  it('thành tố nào cũng có đủ 4 mức', () => {
    ma.forEach(m => expect(RUBRIC[m], m).toHaveLength(4));
  });

  // Đây là ca đã bắt hụt lỗi 3a: mức 4 bị chép lại y hệt mức 1.
  it.each(ma)('%s — bốn mức phải KHÁC NHAU', m => {
    expect(new Set(RUBRIC[m]).size).toBe(4);
  });

  // Đây là ca đã bắt hụt lỗi 2b: còn nguyên văn tiếng Anh chưa dịch.
  it.each(ma)('%s — mọi mức đều là tiếng Việt', m => {
    RUBRIC[m].forEach((t, i) => {
      expect(CO_DAU_TIENG_VIET.test(t), `${m} mức ${i + 1}: ${t}`).toBe(true);
    });
  });

  it.each(ma)('%s — mọi mức là câu hoàn chỉnh, không phải mẩu vụn', m => {
    RUBRIC[m].forEach((t, i) => {
      expect(t.length, `${m} mức ${i + 1} quá ngắn: ${t}`).toBeGreaterThan(40);
      expect(t.trim(), `${m} mức ${i + 1} không kết thúc bằng dấu câu`).toMatch(/[.!?]$/);
      expect(t, `${m} mức ${i + 1} còn khoảng trắng đôi`).not.toMatch(/ {2,}/);
    });
  });
});

describe('thành tố cốt lõi và câu hỏi suy ngẫm', () => {
  it('mọi thành tố đều có khoá trong COT_LOI và SUY_NGAM', () => {
    COMPONENTS.forEach(c => {
      expect(Array.isArray(COT_LOI[c.ma]), c.ma).toBe(true);
      expect(Array.isArray(SUY_NGAM[c.ma]), c.ma).toBe(true);
    });
  });

  // Bản .docx không có mục chi tiết cho 1f, 2d, 3c — ghi rõ ở đây để lần sau
  // ai thấy ba mục này rỗng thì biết là do NGUỒN thiếu, không phải trích sai.
  it('đúng 3 thành tố thiếu mục chi tiết trong bản gốc: 1f, 2d, 3c', () => {
    const thieu = COMPONENTS.filter(c => COT_LOI[c.ma].length === 0).map(c => c.ma);
    expect(thieu.sort()).toEqual(['1f', '2d', '3c']);
  });

  it('mục nào có nội dung thì mọi dòng đều là tiếng Việt', () => {
    (Object.keys(COT_LOI) as MaThanhTo[]).forEach(m => {
      [...COT_LOI[m], ...SUY_NGAM[m]].forEach(t => {
        expect(CO_DAU_TIENG_VIET.test(t), `${m}: ${t}`).toBe(true);
      });
    });
  });
});
