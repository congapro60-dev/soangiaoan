import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AssignmentDoc } from '../../../lib/classroom/types';
import { ExamVariantsEditor } from './ExamVariantsEditor';

vi.mock('../../../lib/classroom/submissionService', () => ({ updateAssignmentContent: vi.fn(async () => undefined) }));

const assignment = (variants: AssignmentDoc['examVariants']): AssignmentDoc => ({
  id: 'kt-1', classId: 'lop-1', teacherId: 'gv-1', type: 'upload', title: 'Thi giữa HK1', isOpen: true,
  periodicTest: { sheetLabel: 'GHKI' },
  examVariants: variants,
} as AssignmentDoc);

describe('sửa mã đề + đáp án của bài kiểm tra định kì', () => {
  it('hiện từng mã đề kèm ô sửa đáp án, có nút thêm mã đề và lưu', () => {
    const html = renderToStaticMarkup(<ExamVariantsEditor assignment={assignment([
      { code: '101', sourceText: 'Câu 1: ...', answerKey: 'Phần I – Câu 1: A' },
      { code: '102', sourceText: 'Câu 1: ...', answerKey: 'Phần I – Câu 1: B' },
    ])} />);
    expect(html).toContain('Mã đề 1');
    expect(html).toContain('value="101"');
    expect(html).toContain('value="102"');
    expect(html).toContain('Phần I – Câu 1: A');
    expect(html).toContain('Thêm mã đề');
    expect(html).toContain('Lưu mã đề + đáp án');
    expect(html).toContain('1 câu có đáp án');
  });
});
