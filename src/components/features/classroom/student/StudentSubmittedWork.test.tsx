import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubmissionDoc } from '../../../../lib/classroom/types';

const view = vi.hoisted(() => ({ open: false, stateIndex: 0 }));
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => [view.stateIndex++ === 0 ? view.open : initial, () => undefined],
}));
import { StudentSubmittedWork } from './StudentSubmittedWork';

const render = (submissions: SubmissionDoc[]) => {
  view.stateIndex = 0;
  return renderToStaticMarkup(<StudentSubmittedWork submissions={submissions} />);
};

const submission = {
  id: 'own', studentId: 'hs', fileUrls: ['https://example.test/first.jpg', 'https://example.test/second.jpg'],
  attachments: [{ name: 'Ảnh 2', url: 'https://example.test/second.jpg', kind: 'image' }],
  createdAt: '2026-10-13T10:00:00Z', grade: { score: 8, feedback: 'PRIVATE FEEDBACK', teacherApproved: false },
} as SubmissionDoc;

describe('HS xem lại ảnh đã nộp', () => {
  beforeEach(() => { view.open = false; });
  it('có nút xem trước duyệt, chỉ tải ảnh khi mở', () => {
    const html = render([submission]);
    expect(html).toContain('Xem bài đã nộp');
    expect(html).not.toContain('<img');
  });
  it('giữ ảnh thiếu metadata, không trùng, không lộ điểm/nhận xét', () => {
    view.open = true;
    const html = render([submission]);
    expect(html.match(/<img /g)).toHaveLength(2);
    expect(html.indexOf('first.jpg')).toBeLessThan(html.indexOf('second.jpg'));
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('noopener noreferrer');
    expect(html).not.toContain('PRIVATE FEEDBACK');
    expect(html).not.toContain('8/10');
  });
  it('hiện mọi lượt cũ; từ chối URL nguy hiểm và không vẽ PDF thành ảnh', () => {
    view.open = true;
    const other = { ...submission, id: 'older', fileUrls: ['javascript:alert(1)', 'https://example.test/old%2Epdf'], attachments: [] };
    const html = render([submission, other]);
    expect(html).not.toContain('javascript:');
    expect(html).toContain('old%2Epdf');
    expect(html.match(/<img /g)).toHaveLength(2);
    expect(html).toContain('Lượt 2');
  });
  it('chỉ hiện dấu đúng ảnh sau duyệt; ẩn khi còn hỏi lại hoặc ẩn điểm', () => {
    view.open = true;
    const question = { questionNumber: 'Câu 3', status: 'incorrect', studentAnswer: 'x=2', explanation: 'PRIVATE EXPLANATION', correction: 'PRIVATE CORRECTION',
      photoMarks: [{ imageIndex: 1, imageUrl: submission.fileUrls[0], x: .1, y: .2, width: .2, height: .1, confidence: .9 }] };
    const approved = { ...submission, grade: { ...submission.grade, teacherApproved: true, questionResults: [question] } } as SubmissionDoc;
    expect(render([approved])).toContain('<ellipse');
    for (const hidden of [
      { teacherApproved: false }, { awaitingClarification: true }, { scoreHidden: true },
    ]) {
      const html = render([{ ...approved, grade: { ...approved.grade!, ...hidden } }]);
      expect(html).not.toContain('<ellipse');
      expect(html).not.toContain('PRIVATE');
      expect(html).toContain('<img');
    }
  });
  it('hiện ảnh chụp lại cùng dấu mới, không nhân đôi ảnh cũ', () => {
    view.open = true;
    const photo = 'https://example.test/clarify-upload';
    const approved = { ...submission, grade: { ...submission.grade, teacherApproved: true, questionResults: [{
      questionNumber: 'Câu 4', status: 'incorrect', studentAnswer: '2',
      clarify: { kind: 'photo', state: 'done', reading: '', photoUrls: [photo, submission.fileUrls[0]] },
      photoMarks: [{ imageIndex: 1, imageUrl: photo, x: .1, y: .2, width: .2, height: .1, confidence: .9 }],
    }] } } as SubmissionDoc;
    const html = render([approved]);
    expect(html.match(/<img /g)).toHaveLength(3);
    expect(html.match(/<ellipse /g)).toHaveLength(1);
    expect(html).toContain(photo);
  });
});
