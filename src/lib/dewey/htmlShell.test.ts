import { describe, expect, it } from 'vitest';
import { renderHtmlShell } from './htmlShell';
import type { DeweyLessonContent } from './types';

describe('renderHtmlShell — công thức dài trong cổng tự học', () => {
  it('giới hạn vùng math của kết luận/vở ghi để không tạo tràn ngang toàn trang', () => {
    const html = renderHtmlShell({
      content: {
        title: 'Bài kiểm tra',
        subtitle: 'Tuyến Cơ bản',
        durationMinutes: 40,
      } as DeweyLessonContent,
      theme: 'classic',
      bodyHtml: '<section class="unit-completion-panel"><span>$ax+by\\le c$</span></section>',
    });

    expect(html).toContain('.unit-completion-panel > mjx-container');
    expect(html).toContain('.unit-completion-panel .theory-box mjx-container');
    expect(html).toContain('.notebook-area .note-item mjx-container');
    expect(html).toContain('overflow-x: auto');
  });
});
