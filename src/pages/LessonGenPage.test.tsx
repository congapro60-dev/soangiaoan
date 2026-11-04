import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { LessonGenPage } from './LessonGenPage';

describe('LessonGenPage', () => {
  it('renders the source review entry point before a lesson is generated', () => {
    const html = renderToStaticMarkup(<MemoryRouter><LessonGenPage /></MemoryRouter>);

    expect(html).toContain('Tạo bài học tương tác');
    expect(html).toContain('Tải giáo án');
    expect(html).toContain('Nguồn và kiểm tra');
    expect(html).toContain('Vùng cần xác minh');
    expect(html).toContain('Tạo bản nháp bằng AI');
    expect(html).toContain('Duyệt kế hoạch');
    expect(html).toContain('Tạo bài dạy V8.8.1');
    expect(html).toContain('Soạn bản nháp V8.8.1 từ nguồn đã duyệt');
    expect(html).toContain('Luyện tập');
    expect(html).toContain('Ôn tập và chẩn đoán');
    expect(html).toContain('DOCX, PDF có chữ');
    expect(html).not.toContain('.png,.jpg');
  });
});
