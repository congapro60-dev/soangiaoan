import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GeminiKeysField } from './GeminiKeysField';

describe('GeminiKeysField', () => {
  it('một khoá: không có nút xoá; có nút thêm, cảnh báo hạng miễn phí + dữ liệu học sinh + điều khoản; ô là kiểu mật khẩu', () => {
    const html = renderToStaticMarkup(<GeminiKeysField rows={['AIza1']} onChange={() => undefined} />);
    expect(html).not.toContain('Xoá khoá Gemini');
    expect(html).toContain('Thêm khoá Gemini');
    expect(html).toContain('CHƯA gắn thanh toán');
    expect(html).toContain('dữ liệu nhạy cảm của học sinh');
    expect(html).toContain('điều khoản của Google');
    expect(html).toContain('type="password"');
  });
  it('nhiều khoá: mỗi ô có nút xoá, báo số khoá đang có; đủ trần thì hết nút thêm', () => {
    const rows = ['AIza1', 'AIza2', ''];
    const html = renderToStaticMarkup(<GeminiKeysField rows={rows} onChange={() => undefined} />);
    expect(html).toContain('Đang có 2 khoá');
    expect(html.match(/Xoá khoá Gemini/g)).toHaveLength(3);
    const full = renderToStaticMarkup(<GeminiKeysField rows={Array.from({ length: 10 }, (_, i) => `k${i}`)} onChange={() => undefined} />);
    expect(full).not.toContain('Thêm khoá Gemini');
  });
});
