import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ParentActivityPanel } from './ParentActivityPanel';

describe('ParentActivityPanel', () => {
  it('dựng được khung thống kê phụ huynh (đang tải dữ liệu) kèm ghi chú riêng tư', () => {
    const html = renderToStaticMarkup(<ParentActivityPanel classId="lop-1" />);
    expect(html).toContain('Hoạt động của phụ huynh');
    expect(html).toContain('Làm mới');
    expect(html).toContain('Không lưu địa chỉ IP');
  });
});
