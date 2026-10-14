import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubmissionDoc } from '../../../lib/classroom/types';
const view = vi.hoisted(() => ({ saving: false, index: 0 }));
vi.mock('react', async original => {
  const react = await original<typeof import('react')>();
  return { ...react, useState: (initial: unknown) => {
    if (!view.saving) return react.useState(initial);
    const index = view.index++;
    return [index === 0 ? true : index === 1 ? [new Blob(['photo'], { type: 'image/jpeg' })] : index === 5 ? 'save' : initial, () => undefined];
  } };
});
import { CorrectionAttempts } from './CorrectionAttempts';
beforeEach(() => { view.saving = false; view.index = 0; });
const submission = (patch: Partial<SubmissionDoc> = {}): SubmissionDoc => ({
  id: 's', studentId: 'own', classId: 'c', teacherId: 't', assignmentId: 'a',
  status: 'graded', fileUrls: [], note: '', createdAt: '', updatedAt: '',
  grade: { score: 8, maxScore: 10, teacherApproved: true, feedback: '', strengths: [], weaknesses: [], gradedAt: '' },
  ...patch,
});
describe('bài chữa riêng không đổi điểm', () => {
  it('HS được chụp bài chữa sau công bố, không cần nộp lại bài gốc', () => {
    const html = renderToStaticMarkup(<CorrectionAttempts submission={submission()} />);
    expect(html).toContain('Chụp ảnh bài chữa');
    expect(html).not.toContain('8/10');
    expect(html).not.toContain('Nộp lại');
  });
  it('không tạo đường lưu chữa khi điểm chưa được xem hoặc đang xác nhận', () => {
    const original = submission();
    for (const grade of [{ ...original.grade!, teacherApproved: false }, { ...original.grade!, awaitingClarification: true }]) {
      expect(renderToStaticMarkup(<CorrectionAttempts submission={submission({ grade })} />)).toBe('');
    }
  });
  it('GV chỉ xem bài chữa, không giả HS tạo/đánh giá', () => {
    const html = renderToStaticMarkup(<CorrectionAttempts submission={submission()} credentials={{ role: 'teacher', classId: 'c', studentId: 'own' }} />);
    expect(html).toContain('Bài chữa / làm lại');
    expect(html).not.toContain('Chụp ảnh bài chữa');
  });
  it('đang lưu không nhận ảnh hoặc nháp mới để tránh xóa dữ liệu chưa gửi', () => {
    view.saving = true;
    const html = renderToStaticMarkup(<CorrectionAttempts submission={submission()} />);
    expect(html).toMatch(/<input[^>]*disabled=""[^>]*type="file"/);
    expect(html).toMatch(/<textarea[^>]*disabled=""/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?Chụp ảnh bài chữa/);
  });
});
