import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const updateActions = vi.hoisted(() => ({ clicks: [] as Array<() => void> }));
vi.mock('react/jsx-dev-runtime', async importOriginal => {
  const actual = await importOriginal<typeof import('react/jsx-dev-runtime')>();
  return { ...actual, jsxDEV: (...args: Parameters<typeof actual.jsxDEV>) => {
    const [type, props] = args;
    const button = props as { 'aria-label'?: string; onClick?: () => void };
    if (type === 'button' && button['aria-label'] === 'Cập nhật bài nộp' && button.onClick) updateActions.clicks.push(button.onClick);
    return actual.jsxDEV(...args);
  } };
});
beforeEach(() => { updateActions.clicks = []; });
import { StudentAssignmentCard } from './StudentAssignmentCard';
import { getStudentAssignmentState } from '../../../../lib/classroom/portalViewModel';
import type { AssignmentDoc, SubmissionDoc } from '../../../../lib/classroom/types';

const assignment = { id: 'a1', title: 'BTVN Hình', description: '', type: 'upload', isOpen: true, attachments: [] } as unknown as AssignmentDoc;
const submission = (grade: Partial<NonNullable<SubmissionDoc['grade']>>): SubmissionDoc => ({
  id: 's1', teacherId: 't', classId: 'c', studentId: 'h', assignmentId: 'a1', fileUrls: [], note: '', status: 'graded',
  grade: { score: 0, maxScore: 10, feedback: '', strengths: [], weaknesses: [], gradedAt: '2026-10-09T01:00:00.000Z', teacherApproved: false, ...grade },
  createdAt: '2026-10-09T00:00:00.000Z', updatedAt: '2026-10-09T01:00:00.000Z',
} as SubmissionDoc);

const render = (sub: SubmissionDoc) => renderToStaticMarkup(
  <StudentAssignmentCard assignment={assignment} submission={sub} state={getStudentAssignmentState(assignment, sub)} uploading={false} onUpload={() => undefined} onOpen={() => undefined} onAnswerExamCode={async () => undefined} />,
);

describe('StudentAssignmentCard · điểm chỉ hiện sau khi duyệt', () => {
  it('ảnh lỗi mở cập nhật đúng lượt cũ; bài chưa nộp không có nút bổ sung', () => {
    const onUpload = vi.fn();
    const photo = { ...submission({}), status: 'error' as const, grade: undefined, errorReason: 'photo' as const };
    renderToStaticMarkup(<StudentAssignmentCard assignment={assignment} submission={photo} state={getStudentAssignmentState(assignment, photo)} detailView uploading={false} onUpload={onUpload} onOpen={() => undefined} onAnswerExamCode={async () => undefined} />);
    expect(updateActions.clicks).toHaveLength(1);
    updateActions.clicks[0]();
    expect(onUpload).toHaveBeenCalledWith('a1', 's1');
    updateActions.clicks = [];
    const empty = renderToStaticMarkup(<StudentAssignmentCard assignment={assignment} state={getStudentAssignmentState(assignment)} uploading={false} onUpload={onUpload} onOpen={() => undefined} onAnswerExamCode={async () => undefined} />);
    expect(updateActions.clicks).toHaveLength(0);
    expect(empty).not.toContain('Bổ sung ảnh');
  });
  it('deliveryMode online không cho nộp/bổ sung ảnh dù legacy state yêu cầu submit', () => {
    const html = renderToStaticMarkup(<StudentAssignmentCard assignment={{ ...assignment, deliveryMode: 'online' }}
      state={{ status: 'todo', action: 'submit', label: 'Xem bài', canResubmit: true }} detailView uploading={false}
      onUpload={() => undefined} onOpen={() => undefined} onAnswerExamCode={async () => undefined} />);
    expect(html).not.toContain('Bổ sung ảnh');
  });
  it('chưa duyệt: chỉ có "chờ thầy cô duyệt", không có điểm hay nhận xét', () => {
    const html = render(submission({ scoreHidden: true }));
    expect(html).toContain('Chờ thầy cô duyệt');
    expect(html).toContain('Điểm và nhận xét sẽ hiện sau khi thầy cô duyệt');
    expect(html).not.toMatch(/\d+\/10 điểm/);
    expect(html).not.toContain('Đã chấm');
  });

  it('đã duyệt: hiện điểm và nhận xét như cũ', () => {
    const html = render(submission({ teacherApproved: true, score: 8, feedback: 'Em làm tốt', approvalSource: 'teacher' }));
    expect(html).toContain('8/10 điểm');
    expect(html).toContain('Em làm tốt');
    expect(html).not.toContain('Chờ thầy cô duyệt');
  });

  it('máy chưa đọc được mã đề: hiện nút chọn từng mã, không bảo em nộp lại', () => {
    const html = render({ ...submission({}), status: 'error', grade: undefined, errorReason: 'exam_code', examCodeAsk: ['101', '102'], errorMessage: 'Em chọn đúng mã đề ghi trên tờ đề để máy đọc tiếp.' });
    expect(html).toContain('Cần em chọn mã đề');
    expect(html).toContain('Mã đề trên tờ đề của em là');
    expect(html).toMatch(/>101<\/button>/);
    expect(html).toMatch(/>102<\/button>/);
    expect(html).not.toContain('Nộp lại');
  });

  it('lỗi hệ thống: báo em không cần nộp lại, nút không ghi "Nộp lại"; ảnh chưa rõ mới ghi "Nộp lại ảnh"', () => {
    const system = render({ ...submission({}), status: 'error', grade: undefined, errorReason: 'system', errorMessage: 'Em không cần nộp lại; thầy cô sẽ xử lý giúp em.' });
    expect(system).toContain('Em không cần nộp lại');
    expect(system).not.toMatch(/>\s*Nộp lại/);
    const photo = render({ ...submission({}), status: 'error', grade: undefined, errorReason: 'photo', errorMessage: 'Em chụp lại rõ hơn rồi nộp lại nhé.' });
    expect(photo).toContain('Cập nhật bài nộp');
    expect(photo).toContain('Em chụp lại rõ hơn');
  });

  it('nút cập nhật không hứa chấm lại khi điểm còn chờ duyệt', () => {
    const html = render(submission({ scoreHidden: true }));
    expect(html).toContain('Cập nhật bài nộp');
    expect(html).not.toContain('chấm lại');
  });

  it('bài khóa không có nút nộp/bổ sung dù state truyền legacy có quyền nộp', () => {
    const closed = { ...assignment, isOpen: false, submissionLocked: true };
    const html = renderToStaticMarkup(<StudentAssignmentCard assignment={closed} submission={submission({ teacherApproved: true })}
      state={{ status: 'graded', action: 'review', label: 'Xem nhận xét', canResubmit: true }} detailView uploading={false}
      onUpload={() => undefined} onOpen={() => undefined} onAnswerExamCode={async () => undefined} />);
    expect(html).not.toContain('Bổ sung ảnh');
    expect(html).not.toContain('Nộp ảnh');
  });
  it('bài khóa: không chọn mã đề; vẫn xem ảnh và chờ GV', () => {
    const sub = { ...submission({}), status: 'error' as const, grade: undefined, errorReason: 'exam_code' as const, examCodeAsk: ['101', '102'] };
    const html = renderToStaticMarkup(<StudentAssignmentCard assignment={{ ...assignment, isOpen: false, submissionLocked: true }} submission={sub}
      state={getStudentAssignmentState(assignment, sub)} detailView uploading={false} onUpload={() => undefined}
      onOpen={() => undefined} onAnswerExamCode={async () => undefined} />);
    expect(html).not.toContain('Mã đề trên tờ đề của em là');
    expect(html).not.toMatch(/>101<\/button>/);
    expect(html).toContain('Bài đã khóa chốt');
  });
  it.each(['submitted', 'grading', 'error', 'graded'] as const)('luôn mở ảnh đã nộp khi %s, không phải chờ duyệt', status => {
    const html = render({ ...submission({ scoreHidden: true }), status, fileUrls: ['https://example.test/own.jpg'] });
    expect(html).toContain('Xem bài đã nộp');
    expect(html).not.toMatch(/\d+\/10 điểm/);
  });
});
