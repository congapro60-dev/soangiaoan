import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ParentPinChangeForm, ParentPortalPage } from './ParentPortalPage';

const render = (path: string) => renderToStaticMarkup(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/ph" element={<ParentPortalPage />} />
      <Route path="/ph/:joinCode" element={<ParentPortalPage />} />
    </Routes>
  </MemoryRouter>,
);

describe('ParentPortalPage', () => {
  it('không có mã lớp trên link → hỏi mã lớp', () => {
    const html = render('/ph');
    expect(html).toContain('Cổng phụ huynh');
    expect(html).toContain('Nhập mã lớp của con');
  });

  it('có mã lớp trên link → sang bước chọn tên + PIN (không bắt nhập mã)', () => {
    const html = render('/ph/ABCD23');
    expect(html).toContain('Chọn tên con và nhập mã PIN dành cho phụ huynh');
    expect(html).not.toContain('Nhập mã lớp của con');
  });

  it('đặt PIN lần đầu: bắt buộc, không có nút "Để sau"; đổi PIN chủ động thì có', () => {
    const first = renderToStaticMarkup(<ParentPinChangeForm batBuoc dangGoi={false} loiMay="" onSubmit={() => undefined} onCancel={() => undefined} />);
    expect(first).toContain('Đặt mã PIN riêng của bạn');
    expect(first).toContain('Nhập lại mã PIN mới');
    expect(first).not.toContain('Để sau');
    const later = renderToStaticMarkup(<ParentPinChangeForm batBuoc={false} dangGoi={false} loiMay="Mã PIN không đúng." onSubmit={() => undefined} onCancel={() => undefined} />);
    expect(later).toContain('Đổi mã PIN');
    expect(later).toContain('Để sau');
    expect(later).toContain('Mã PIN không đúng.');
    expect(first).toContain('số, chữ hoặc ký tự đặc biệt');
  });
});
