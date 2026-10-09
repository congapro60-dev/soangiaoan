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
  <StudentAssignmentCard assignment={assignment} submission={sub} state={getStudentAssignmentState(assignment, sub)} uploading={false} onUpload={() => undefined} onOpen={() => undefined} />,
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
});
