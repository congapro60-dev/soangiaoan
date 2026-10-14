import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import type { AssignmentDoc, SubmissionDoc } from '../../../../lib/classroom/types';
import { buildWorkspaceRows, filterWorkspaceRows, studentClarificationQuestions, StudentPortalDashboard } from './StudentPortalDashboard';

vi.mock('./StudentAiCostChip', () => ({ StudentAiCostChip: () => null }));
vi.mock('./StudentCompetencyPortfolio', () => ({ StudentCompetencyPortfolio: () => null }));
const notificationActions = vi.hoisted(() => ({ onSelectSubmission: undefined as ((id: string) => void) | undefined }));
vi.mock('./StudentNotificationBell', () => ({ StudentNotificationBell: (props: { onSelectSubmission: (id: string) => void }) => { notificationActions.onSelectSubmission = props.onSelectSubmission; return null; } }));
vi.mock('./StudentPublishedReports', () => ({ StudentPublishedReports: () => null }));
const assignment = (id: string, extra: Partial<AssignmentDoc> = {}): AssignmentDoc => ({
  id, teacherId: 't', classId: 'c', title: `Bài ${id}`, description: '', type: 'upload', isOpen: true,
  createdAt: '2026-09-01T00:00:00Z', updatedAt: '', ...extra,
} as AssignmentDoc);
const work = (id: string, assignmentId: string | null, extra: Partial<SubmissionDoc> = {}): SubmissionDoc => ({
  id, assignmentId, studentId: 'own', teacherId: 't', classId: 'c', fileUrls: [], note: '',
  createdAt: '2026-10-13T10:00:00Z', updatedAt: '', status: 'submitted', ...extra,
} as SubmissionDoc);
const pendingGrade = { score: 0, maxScore: 10, feedback: 'SECRET', strengths: [], weaknesses: [], teacherApproved: false,
  awaitingClarification: true, scoreHidden: true, questionResults: [{ questionNumber: 'Câu 1', status: 'unreadable', studentAnswer: 'B',
    score: 0, maxScore: 1, clarify: { kind: 'mcq', state: 'open', reading: 'B' } }], gradedAt: '' } as NonNullable<SubmissionDoc['grade']>;

describe('Không gian HS · danh sách đầy đủ, chi tiết theo yêu cầu', () => {
  it('trả lời trên lượt chấm thử cũ vẫn mở đúng lượt sau khi em bổ sung ảnh', () => {
    const submissions = [work('root', null, { createdAt: '2026-09-01T00:00:00Z' }), work('new', null, { supplementOf: 'root' })];
    const onLoadDetail = vi.fn().mockResolvedValue({ submissions, assignment: undefined });
    const props = { session: { studentId: 'own', studentName: 'Em', className: 'QA' }, assignments: [], submissions,
      onlineSubmissions: [], profile: null, scores: null, notifications: [], pendingFiles: [], practiceAnswers: {}, uploadRef: { current: null }, onLoadDetail,
    } as unknown as ComponentProps<typeof StudentPortalDashboard>;
    vi.stubGlobal('window', { scrollTo: vi.fn() });
    try {
      renderToStaticMarkup(<StudentPortalDashboard {...props} />);
      notificationActions.onSelectSubmission!('root');
      expect(onLoadDetail).toHaveBeenCalledWith(null, 'root');
    } finally { vi.unstubAllGlobals(); }
  });
  it('bài thi online đã nộp dùng thời điểm thi cho nhãn hạn', () => {
    const assignments = [assignment('exam', { type: 'exam', examId: 'e', dueAt: '2026-10-13T12:00:00Z' })];
    const props = { session: { studentId: 'own', studentName: 'Em', className: 'QA' }, assignments, submissions: [],
      onlineSubmissions: [{ id: 'online', examId: 'e', assignmentId: 'exam', studentId: 'own', status: 'submitted', submittedAt: '2026-10-13T10:00:00Z', startedAt: '2026-10-13T09:00:00Z', answers: [], maxScore: 10 }],
      profile: null, scores: null, notifications: [], pendingFiles: [], practiceAnswers: {}, uploadRef: { current: null },
    } as unknown as ComponentProps<typeof StudentPortalDashboard>;
    const html = renderToStaticMarkup(<StudentPortalDashboard {...props} />);
    expect(html).toContain('Đúng hạn');
    expect(html).not.toContain('Quá hạn chưa nộp');
  });
  it('300 bài / 500 lượt: một dòng mỗi bài; 20 dòng một trang; tìm được bài cũ; tổng không theo trang', () => {
    const assignments = Array.from({ length: 300 }, (_, index) => assignment(String(index)));
    const submissions = Array.from({ length: 500 }, (_, index) => work(`s${index}`, String(index % 300), {
      createdAt: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(),
    }));
    const rows = buildWorkspaceRows('own', assignments, submissions, []);
    expect(rows).toHaveLength(300);
    expect(rows.find(row => row.id === '0')?.attempts).toBe(2);
    expect(filterWorkspaceRows(rows, 'Bài 299', 'all', '', '')).toHaveLength(1);
    const props = {
      session: { studentId: 'own', studentName: 'Em QA', className: 'Lớp QA' }, assignments, submissions,
      onlineSubmissions: [], profile: null, scores: null, notifications: [], pendingFiles: [], practiceAnswers: {},
      uploadRef: { current: null }, onReload: () => undefined, onLoadDetail: vi.fn(),
    } as unknown as ComponentProps<typeof StudentPortalDashboard>;
    const html = renderToStaticMarkup(<StudentPortalDashboard {...props} />);
    expect(html.match(/data-assignment-row=/g)).toHaveLength(20);
    expect(html).toContain('300 kết quả');
    expect(html).not.toContain('Xem bài đã nộp');
    expect(props.onLoadDetail).not.toHaveBeenCalled();
    for (const name of ['Bài tập', 'Sổ điểm', 'Thống kê', 'Năng lực', 'Báo cáo']) expect(html).toContain(name);
  });
  it('chỉ latest đúng HS tạo badge; câu hỏi không bung ở đầu trang', () => {
    const assignments = [assignment('a'), assignment('b')];
    const submissions = [work('old', 'a', { grade: pendingGrade, status: 'graded', createdAt: '2026-01-01T00:00:00Z' }),
      work('new', 'a'), work('active', 'b', { grade: pendingGrade, status: 'graded' }),
      work('other', 'b', { studentId: 'other', grade: pendingGrade, createdAt: '2026-11-01T00:00:00Z' })];
    const rows = buildWorkspaceRows('own', assignments, submissions, []);
    expect(rows.find(row => row.id === 'a')?.clarificationCount).toBe(0);
    expect(rows.find(row => row.id === 'b')?.clarificationCount).toBe(1);
    expect(filterWorkspaceRows(rows, '', 'action', '', '').map(row => row.id)).toEqual(['b']);
    const props = { session: { studentId: 'own', studentName: 'Em', className: 'QA' }, assignments, submissions,
      onlineSubmissions: [], profile: null, scores: null, notifications: [], pendingFiles: [], practiceAnswers: {}, uploadRef: { current: null },
    } as unknown as ComponentProps<typeof StudentPortalDashboard>;
    const html = renderToStaticMarkup(<StudentPortalDashboard {...props} />);
    expect(html).toContain('Cần xác nhận 1 câu');
    expect(html).not.toContain('Máy cần em xác nhận vài câu');
    expect(html).not.toContain('SECRET');
  });
  it('blank lịch sử vẫn giấu điểm; chỉ chờ GV, không bắt em xác nhận', () => {
    const rows = buildWorkspaceRows('own', [assignment('blank')], [work('blank', 'blank', { status: 'graded', grade: {
      ...pendingGrade, questionResults: [{ ...pendingGrade.questionResults![0], studentAnswer: 'Bỏ trống', clarify: { kind: 'mcq', state: 'open', reading: 'Bỏ trống' } }],
    } })], []);
    expect(rows[0].clarificationCount).toBe(0);
    expect(rows[0].state.label).toBe('Chờ thầy cô soát');
    expect(rows[0].score).toBeNull();
  });
  it('ngày giao lọc bài, ngày nộp lọc thống kê; khóa chốt không trở thành bài cần nộp', () => {
    const rows = buildWorkspaceRows('own', [assignment('closed', { isOpen: false, submissionLocked: true }), assignment('done')], [work('s', 'done')], []);
    expect(filterWorkspaceRows(rows, '', 'all', '2026-10-01', '2026-10-31')).toHaveLength(0);
    expect(filterWorkspaceRows(rows, '', 'all', '2026-10-01', '2026-10-31', true).map(row => row.id)).toEqual(['done']);
    expect(filterWorkspaceRows(rows, '', 'action', '', '')).toHaveLength(0);
  });
  it('bài khóa pending: chỉ đọc ảnh, không câu hỏi hoặc tác vụ mã đề', () => {
    const closed = assignment('closed', { isOpen: false, submissionLocked: true });
    const pending = work('pending', 'closed', { status: 'graded', grade: pendingGrade });
    const rows = buildWorkspaceRows('own', [closed], [pending], []);
    expect(rows[0].clarificationCount).toBe(0);
    expect(filterWorkspaceRows(rows, '', 'action', '', '')).toHaveLength(0);
    expect(studentClarificationQuestions(pending, closed)).toEqual([]);
    expect(studentClarificationQuestions(pending, { ...closed, isOpen: false, submissionLocked: false })).toHaveLength(1);
    expect(filterWorkspaceRows(buildWorkspaceRows('own', [closed], [{ ...pending, status: 'error', errorReason: 'exam_code' }], []), '', 'action', '', '')).toHaveLength(0);
  });
  it('bài tự nộp bổ sung: một dòng latest, giữ số lượt; không hỏi lại attempt cũ', () => {
    const rows = buildWorkspaceRows('own', [], [work('root', null, { status: 'graded', grade: pendingGrade, createdAt: '2026-09-01T00:00:00Z' }),
      work('revision', null, { supplementOf: 'root' })], []);
    expect(rows).toHaveLength(1);
    expect(rows[0].submission?.id).toBe('revision');
    expect(rows[0].attempts).toBe(2);
    expect(rows[0].clarificationCount).toBe(0);
  });
  it('chấm thử và AI bài định kì không vào điểm chính thức; bài duyệt mới có điểm', () => {
    const grade = { ...pendingGrade, teacherApproved: true, scoreHidden: false, awaitingClarification: false, score: 8 };
    const rows = buildWorkspaceRows('own', [assignment('regular'), assignment('periodic', { periodicTest: { sheetLabel: 'GHKI' } })],
      [work('r', 'regular', { status: 'graded', grade }), work('p', 'periodic', { status: 'graded', grade }), work('self', null, { status: 'graded', grade }), work('otherSelf', null, { studentId: 'other' })], []);
    expect(rows.filter(row => row.score !== null).map(row => row.id)).toEqual(['regular']);
    expect(rows.map(row => row.id)).toContain('submission:self');
    expect(rows.map(row => row.id)).not.toContain('submission:otherSelf');
  });
});


it('bài đóng chưa khóa vẫn nộp và xác nhận; khóa chốt mới chặn', () => {
  const closed = assignment('closed', { isOpen: false, submissionLocked: false });
  const pending = work('pending', 'closed', { status: 'graded', grade: pendingGrade });
  const rows = buildWorkspaceRows('own', [closed], [pending], []);
  expect(rows[0].clarificationCount).toBe(1); expect(studentClarificationQuestions(pending, closed)).toHaveLength(1);
  const locked = buildWorkspaceRows('own', [{ ...closed, submissionLocked: true }], [pending], []);
  expect(locked[0].clarificationCount).toBe(0); expect(studentClarificationQuestions(pending, { ...closed, submissionLocked: true })).toEqual([]);
});
