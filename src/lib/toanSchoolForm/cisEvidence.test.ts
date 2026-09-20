import { describe, it, expect } from 'vitest';
import { CIS_COLORS, detectCisColor, isCisEvidenceLine } from './cisEvidence';

describe('cisEvidence — nhãn minh chứng HQT/CIS', () => {
  it('4 nhãn gốc tô đúng màu', () => {
    expect(detectCisColor('[PHÂN HÓA] HS chọn nhánh')).toBe(CIS_COLORS.phanHoa);
    expect(detectCisColor('[ĐGTX] GV thu phiếu thoát')).toBe(CIS_COLORS.dgtx);
    expect(detectCisColor('[CÔNG DÂN SỐ] HS kiểm chứng nguồn')).toBe(CIS_COLORS.congDanSo);
    expect(detectCisColor('[CÔNG DÂN TOÀN CẦU] bối cảnh CO2')).toBe(CIS_COLORS.congDanToanCau);
    expect(detectCisColor('[LIÊN VĂN HÓA] so sánh cách trình bày')).toBe(CIS_COLORS.lienVanHoa);
  });

  it('4 nhãn mở rộng theo mẫu vàng TDS', () => {
    expect(detectCisColor('[KIỂM ĐỊNH AI] HS bắt lỗi lời giải AI')).toBe(CIS_COLORS.kiemDinhAi);
    expect(detectCisColor('[TỰ ĐỊNH HƯỚNG] HS tự chọn mức')).toBe(CIS_COLORS.tuDinhHuong);
    expect(detectCisColor('[PHẢN TƯ] HS hoàn thành phiếu thoát')).toBe(CIS_COLORS.phanTu);
    expect(detectCisColor('[TRẢI NGHIỆM] HS dự đoán từ tình huống')).toBe(CIS_COLORS.traiNghiem);
  });

  it('emoji đứng trước nhãn vẫn nhận', () => {
    expect(detectCisColor('[🔴 PHÂN HÓA] ...')).toBe(CIS_COLORS.phanHoa);
  });

  it('nhãn giữa câu (trích dẫn) không tính là minh chứng', () => {
    expect(detectCisColor('GV nói về [PHÂN HÓA] trong lớp')).toBeUndefined();
    expect(isCisEvidenceLine('Danielson 1c: mục tiêu 3 mức')).toBe(false);
  });
});
