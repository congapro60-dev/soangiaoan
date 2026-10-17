import { describe, expect, it } from 'vitest';
import { moTaLoiDichVu, moTaLoiHttp } from './httpErrorText';

describe('câu báo lỗi HTTP cho người dùng', () => {
  it.each([401, 403, 409, 429, 500, 503, 504])('mã %s nói lí do bằng chữ, mã chỉ để cuối', status => {
    const text = moTaLoiHttp(status);
    expect(text).toMatch(new RegExp(`^Máy chủ báo lỗi: .{20,} \\(mã ${status}\\)\\.$`));
  });
  it('lỗi dịch vụ ngoài nêu tên dịch vụ và lí do riêng', () => {
    expect(moTaLoiDichVu(429, 'Gemini')).toMatch(/^Gemini báo lỗi: đã hết hạn mức của khoá.*\(mã 429\)\.$/);
    expect(moTaLoiDichVu(503, 'Gemini')).toContain('quá tải');
  });
  it('mã lạ vẫn có câu giải thích', () => {
    expect(moTaLoiHttp(418)).toContain('từ chối yêu cầu');
    expect(moTaLoiDichVu(599, 'Google')).toContain('đang gặp sự cố');
  });
});
