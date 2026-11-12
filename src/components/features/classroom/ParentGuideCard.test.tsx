import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ParentGuideCard } from './ParentGuideCard';

describe('ParentGuideCard', () => {
  it('không hiện gì khi chưa có hướng dẫn đã đăng', () => {
    expect(renderToStaticMarkup(<ParentGuideCard />)).toBe('');
  });
  it('hiện đủ các mục khi có hướng dẫn đã đăng', () => {
    const html = renderToStaticMarkup(<ParentGuideCard guide={{ goal: 'Mục tiêu A', askFirst: ['Hỏi B'], steps: ['Bước C'], commonMistakes: ['Lỗi D'], askTeacher: 'Hỏi cô E' }} />);
    for (const text of ['Hướng dẫn phụ huynh', 'Mục tiêu A', 'Hỏi con trước', 'Hỏi B', 'Các bước', 'Bước C', 'Lỗi hay gặp', 'Lỗi D', 'Khi nào nên hỏi giáo viên', 'Hỏi cô E']) {
      expect(html).toContain(text);
    }
  });
});
