import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AppData, LessonPlan } from '../../types';
import { ViewPlanModal } from './ViewPlanModal';

vi.mock('../../utils/exportUtils', () => ({
  generateSlideData: vi.fn(),
  downloadPPTX: vi.fn(),
  exportToPDF: vi.fn(),
}));
vi.mock('../../utils/worksheetUtils', () => ({
  generateInclassWorksheetMarkdown: vi.fn(),
  generateHomeworkWorksheetMarkdown: vi.fn(),
}));
vi.mock('../../utils/scormUtils', () => ({ exportToSCORM: vi.fn() }));

const plan: LessonPlan = {
  id: 'plan-1',
  subjectId: 'math',
  title: 'Hàm số bậc hai',
  content: '# Mục tiêu\n\nHọc sinh nhận biết $y=ax^2$.',
  status: 'completed',
  createdAt: '2026-10-15T00:00:00.000Z',
  updatedAt: '2026-10-15T00:00:00.000Z',
};

it('renders saved lesson markdown in the preview body', () => {
  const html = renderToStaticMarkup(
    <ViewPlanModal
      plan={plan}
      data={{ templates: [] } as unknown as AppData}
      showToast={vi.fn()}
      onClose={vi.fn()}
      onEdit={vi.fn()}
    />,
  );

  expect(html).toContain('Mục tiêu');
  expect(html).toContain('Học sinh nhận biết');
  expect(html).toContain('katex');
});
