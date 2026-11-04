import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubmissionDoc, SubmissionFeedbackDoc } from '../../../lib/classroom/types';
const view = vi.hoisted(() => ({ index: 0, open: false, items: [] as SubmissionFeedbackDoc[] }));
vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useState: (initial: unknown) => { const i = view.index++; return [i === 0 ? view.open : i === 1 ? view.items : typeof initial === 'function' ? (initial as () => unknown)() : initial, () => undefined]; } }));
import { SubmissionFeedback } from './SubmissionFeedback';
const submission = { id: 'attempt2', studentId: 'own', classId: 'class', feedbackSummary: { pending: 1, replies: 1, lastReplyAt: '2026-10-14T00:00:00Z' }, grade: { teacherApproved: true, score: 8, maxScore: 10, questionResults: [{ questionNumber: 'Câu 2' }] } } as SubmissionDoc;
beforeEach(() => { view.index = 0; view.open = false; view.items = []; });
describe('phản hồi theo lượt bài đã được công bố', () => {
  it('nút phản hồi cạnh bài có điểm; chưa duyệt không có nút', () => {
    expect(renderToStaticMarkup(<SubmissionFeedback submission={submission} />)).toContain('Phản hồi bài chấm');
    view.index = 0;
    expect(renderToStaticMarkup(<SubmissionFeedback submission={{ ...submission, grade: { ...submission.grade!, teacherApproved: false, scoreHidden: true } }} />)).toBe('');
  });
  it('khóa chốt không chặn nhắn; phần HS có đúng câu và giới hạn 2000 ký tự', () => {
    view.open = true;
    const html = renderToStaticMarkup(<SubmissionFeedback submission={submission} questionNumber="Câu 2" />);
    expect(html).toContain('maxLength="2000"'); expect(html).toContain('Câu 2'); expect(html).toContain('Gửi thầy cô'); expect(html).not.toContain('Mở sửa điểm');
  });
  it('GV xem tin nhắn như văn bản, trả lời/đánh dấu; không render HTML từ HS', () => {
    view.open = true; view.items = [{ id: 'f', submissionId: 'attempt2', questionNumber: 'Câu 2', status: 'pending', messages: [{ id: 'm', role: 'student', text: '<img src=x onerror=alert(1)>', at: '2026-10-14T00:00:00Z' }] } as SubmissionFeedbackDoc];
    const html = renderToStaticMarkup(<SubmissionFeedback submission={submission} credentials={{ role: 'teacher', classId: 'class', studentId: 'own' }} onEditGrade={() => undefined} />);
    expect(html).toContain('Gửi trả lời'); expect(html).toContain('Đánh dấu đã giải quyết'); expect(html).toContain('Mở sửa điểm'); expect(html).toContain('&lt;img'); expect(html).not.toContain('<img');
  });
});
