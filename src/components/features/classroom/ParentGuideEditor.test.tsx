import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AssignmentDoc } from '../../../lib/classroom/types';
import { ParentGuideEditor } from './ParentGuideEditor';

const assignment = (extra: Record<string, unknown> = {}) => ({ id: 'a1', teacherId: 't1', classId: 'c1', title: 'Bài 1', description: '', type: 'assignment', isOpen: true, createdAt: '2026-11-01', updatedAt: '2026-11-01', ...extra }) as unknown as AssignmentDoc;
const guide = { version: 'v1', status: 'draft', generatedAt: 't', goal: 'Mục tiêu A', askFirst: [], steps: ['Bước 1'], commonMistakes: [], askTeacher: '' };

describe('ParentGuideEditor', () => {
  it('bài chưa có hướng dẫn thì mời soạn bằng AI, chưa có nút đăng', () => {
    const html = renderToStaticMarkup(<ParentGuideEditor assignment={assignment()} classId="c1" studentId="s1" onChanged={() => {}} />);
    expect(html).toContain('Soạn hướng dẫn bằng AI');
    expect(html).not.toContain('Đăng cho phụ huynh');
  });
  it('bản nháp hiện nhãn phụ huynh chưa thấy, có nút lưu nháp và đăng', () => {
    const html = renderToStaticMarkup(<ParentGuideEditor assignment={assignment({ parentGuide: guide })} classId="c1" studentId="s1" onChanged={() => {}} />);
    expect(html).toContain('Nháp, phụ huynh chưa thấy');
    expect(html).toContain('Lưu nháp');
    expect(html).toContain('Đăng cho phụ huynh');
    expect(html).toContain('Mục tiêu A');
  });
  it('bản đã đăng hiện nhãn đang hiển thị', () => {
    const html = renderToStaticMarkup(<ParentGuideEditor assignment={assignment({ parentGuide: { ...guide, status: 'published' } })} classId="c1" studentId="s1" onChanged={() => {}} />);
    expect(html).toContain('Đang hiển thị cho phụ huynh');
  });
  it('bài có nhiều mã đề thì hiện ô chọn mã đề', () => {
    const html = renderToStaticMarkup(<ParentGuideEditor assignment={assignment({ examVariants: [{ code: '1202' }, { code: '1203' }] })} classId="c1" studentId="s1" onChanged={() => {}} />);
    expect(html).toContain('Mã đề soạn hướng dẫn');
    expect(html).toContain('1203');
  });
});
