import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { StudentAiCostView } from '../../../../lib/classroom/studentAiCost';
import { StudentAiCostPanel, studentAiChipLabel } from './StudentAiCostChip';

const view = (over: Partial<StudentAiCostView> = {}): StudentAiCostView => ({
  today: '2026-10-01',
  totals: {
    today: { calls: 2, tokens: 3_000, vnd: 120 },
    week: { calls: 5, tokens: 9_000, vnd: 480 },
    all: { calls: 9, tokens: 20_000, vnd: 1_250 },
  },
  recent: [{ id: 'a', at: new Date().toISOString(), label: 'AI chấm bài nộp', inputTokens: 2_000, outputTokens: 1_000, tokens: 3_000, vnd: 120, assignmentTitle: 'BTVN Bài 5' }],
  truncated: false,
  ...over,
});

const empty = { calls: 0, tokens: 0, vnd: 0 };

describe('Chi phí AI của em — chip và hộp', () => {
  it('chip: tiền hôm nay; chưa tải xong thì dấu ba chấm; chưa dùng thì 0đ; lượt dưới 1đ không thành "miễn phí"', () => {
    expect(studentAiChipLabel(view())).toBe('AI hôm nay 120đ');
    expect(studentAiChipLabel(view(), true)).toBe('120đ'); // điện thoại hẹp: chỉ số tiền (có biểu tượng đồng xu bên cạnh)
    expect(studentAiChipLabel(null)).toBe('AI…');
    expect(studentAiChipLabel(view({ totals: { today: empty, week: empty, all: empty } }))).toBe('AI hôm nay 0đ');
    expect(studentAiChipLabel(view({ totals: { today: { calls: 1, tokens: 10, vnd: 0 }, week: empty, all: empty } }))).toBe('AI hôm nay <1đ');
  });

  it('hộp: 3 tổng, hoạt động gần đây kèm tên bài và token vào/ra', () => {
    const html = renderToStaticMarkup(<StudentAiCostPanel view={view()} />);
    for (const text of ['Hôm nay', '7 ngày', 'Tất cả', '1.250đ', '9 lượt', 'AI chấm bài nộp', 'BTVN Bài 5', '2.000 vào', '1.000 ra', 'bảng giá của nhà cung cấp AI']) {
      expect(html, text).toContain(text);
    }
  });

  it('hộp: chưa dùng AI thì nói rõ; đang tải thì hiện "Đang tải"; bị cắt thì báo chỉ tính lượt gần đây', () => {
    expect(renderToStaticMarkup(<StudentAiCostPanel view={view({ totals: { today: empty, week: empty, all: empty }, recent: [] })} />)).toContain('Em chưa dùng AI lần nào');
    expect(renderToStaticMarkup(<StudentAiCostPanel view={null} />)).toContain('Đang tải');
    expect(renderToStaticMarkup(<StudentAiCostPanel view={view({ truncated: true })} />)).toContain('Chỉ tính các lượt gần đây nhất');
  });
});
