import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
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
    expect(photo).toContain('Nộp lại ảnh');
    expect(photo).toContain('Em chụp lại rõ hơn');
  });

  it('nút phụ chỉ ghi "Bổ sung ảnh" (không hứa "chấm lại" khi điểm còn chờ duyệt)', () => {
    const html = render(submission({ scoreHidden: true }));
    expect(html).toContain('Bổ sung ảnh');
    expect(html).not.toContain('chấm lại');
  });
});
