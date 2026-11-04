import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StudentScoreBoard } from './StudentScoreBoard';
import type { StudentScoreView } from '../../../../lib/classroom/scoreBook';

describe('Sổ điểm HS · nguồn chuẩn và danh sách gọn', () => {
  it('20/300 dòng; TB BTVN vẫn từ300 bài, điểm có hệ số dùng server', () => {
    const scores = { exams: { moet: [], tds: [] }, hs1: [{ label: 'HS1', date: '2026-10-01', score: 10 }], average: 7.25 } as StudentScoreView;
    const homework = Array.from({ length: 300 }, (_, index) => ({ id: `${index}`, title: `Bài ${index}`, score: index < 20 ? 10 : 0, maxScore: 10 }));
    const html = renderToStaticMarkup(<StudentScoreBoard scores={scores} homework={homework} />);
    expect(html).toContain('TB 7.25/10');
    expect(html).toContain('TB 0.67/10');
    expect(html).toContain('300 mục');
    expect(html).toContain('Bài 19');
    expect(html).not.toContain('Bài 20');
  });
  it('null điểm TB từ server không tự suy thành điểm hệ số1', () => {
    const scores = { exams: { moet: [], tds: [] }, hs1: [{ label: 'HS1', date: '2026-10-01', score: 10 }], average: null } as StudentScoreView;
    const html = renderToStaticMarkup(<StudentScoreBoard scores={scores} homework={[]} />);
    expect(html).not.toContain('TB 10/10');
    expect(html).toContain('Chưa có bài được thầy cô duyệt điểm');
  });
});
