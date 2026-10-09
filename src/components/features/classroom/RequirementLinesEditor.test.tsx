import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RequirementLinesEditor } from './RequirementLinesEditor';

describe('RequirementLinesEditor', () => {
  it('xem trước bản đồ theo bài SGK mà phụ huynh sẽ thấy, mỗi bài một chip không ngắt dòng', () => {
    const html = renderToStaticMarkup(
      <RequirementLinesEditor
        lines={[
          { id: 'T11.01', level: 'vung', evidence: 4, percent: 90, note: '' },
          { id: 'T11.05', level: 'chua', evidence: 5, percent: 40, note: '' },
          { id: 'T11.14', level: 'chua', evidence: 1, percent: 0, note: '' },
        ]}
        onChange={() => undefined}
      />,
    );
    expect(html).toContain('Bản đồ theo bài SGK');
    expect(html).toContain('Bài 1 · Vững 90%');
    expect(html).toContain('Bài 2 · Chưa đạt 40%');
    expect(html).toContain('Bài 4 · Chưa đủ căn cứ');
    expect(html.match(/<li class="whitespace-nowrap/g)).toHaveLength(3);
  });

  it('gom theo tập, chương và mạch; mỗi yêu cầu ghi rõ chương chứa bài', () => {
    const html = renderToStaticMarkup(
      <RequirementLinesEditor
        lines={[
          { id: 'T11.01', level: 'vung', evidence: 4, percent: 90, note: '' },
          { id: 'T11.29', level: 'chua', evidence: 5, percent: 30, note: '' },
        ]}
        onChange={() => undefined}
      />,
    );
    expect(html).toContain('Tập 1 · Chương I');
    expect(html).toContain('Tập 2 · Chương V');
    expect(html).toContain('Giải tích');
    expect(html).toContain('1/1 bài vững');
    expect(html).toContain('Tập 2 · Chương V · Bài 15');
  });

  it('không có dòng nào thì không hiện ô xem trước', () => {
    expect(renderToStaticMarkup(<RequirementLinesEditor lines={[]} onChange={() => undefined} />)).not.toContain('Bản đồ theo bài SGK');
  });
});
