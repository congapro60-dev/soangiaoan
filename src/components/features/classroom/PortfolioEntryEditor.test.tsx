import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { competencyById } from '../../../lib/classroom/competency/framework';
import { PortfolioEntryEditor } from './PortfolioEntryEditor';

const competency = competencyById('g10-ham-so-bac-hai')!;
const months = ['tháng 10/2026', 'tháng 11/2026'];

describe('PortfolioEntryEditor', () => {
  it('HS: hiện 4 mức kèm mô tả file mẫu, hướng dẫn từng ô, nút Gợi ý; không có ô của GV', () => {
    const html = renderToStaticMarkup(
      <PortfolioEntryEditor competency={competency} entry={{ selfLevel: 'Tốt', teacherComment: 'Cố lên em' }} role="student" months={months} onChange={() => {}} />,
    );
    expect(html).toContain('Vẽ chính xác Parabola và giải quyết đúng bài toán thực tiễn');
    expect(html).toContain('HS tự đánh giá');
    expect(html).toContain('Viết theo SMART');
    expect(html).toContain('Gợi ý');
    expect(html).toContain('tháng 11/2026');
    expect(html).toContain('Ý kiến thầy cô:');
    expect(html).not.toContain('GV chốt mức này');
    expect(html).not.toContain('Ý kiến của giáo viên hướng dẫn');
  });

  it('GV: có nút chốt mức, ô ý kiến; mức đề xuất từ bài đã chấm được đánh dấu', () => {
    const html = renderToStaticMarkup(
      <PortfolioEntryEditor competency={competency} entry={{}} role="teacher" suggestedLevel="Đạt yêu cầu" months={months} onChange={() => {}} />,
    );
    expect(html).toContain('GV chốt mức này');
    expect(html).toContain('Ý kiến của giáo viên hướng dẫn');
    expect(html).toContain('Đề xuất từ bài đã chấm');
  });
});
