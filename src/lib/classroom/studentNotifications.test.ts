import { describe, expect, it } from 'vitest';
import { buildStudentFeed, countUnread } from './studentNotifications';
import type { StudentNotificationDoc, SubmissionDoc } from './types';

const assignments = [
  { id: 'asg-1', title: 'BTVN Hình học 03/09' },
  { id: 'asg-2', title: 'BTVN Đại số 27/08' },
];

const submission = (patch: Partial<SubmissionDoc> = {}): SubmissionDoc => ({
  id: 'sub-1',
  teacherId: 'gv-1',
  classId: 'lop-1',
  studentId: 'hs-1',
  assignmentId: 'asg-1',
  fileUrls: [],
  note: '',
  status: 'submitted',
  createdAt: '2026-09-08T10:00:00.000Z',
  updatedAt: '2026-09-08T10:00:00.000Z',
  ...patch,
} as SubmissionDoc);

const deletedNotification = (patch: Partial<StudentNotificationDoc> = {}): StudentNotificationDoc => ({
  id: 'del-1',
  studentId: 'hs-1',
  classId: 'lop-1',
  teacherId: 'gv-1',
  type: 'submission_deleted',
  assignmentId: 'asg-2',
  assignmentTitle: 'BTVN Đại số 27/08',
  createdAt: '2026-09-08T12:00:00.000Z',
  ...patch,
});

describe('buildStudentFeed', () => {
  it('bài bị xoá hiện kèm lý do của thầy cô và lời nhắc nộp lại', () => {
    const feed = buildStudentFeed({
      submissions: [],
      assignments,
      notifications: [deletedNotification({ reason: 'Ảnh mờ quá, em chụp lại nhé' })],
    });

    expect(feed).toHaveLength(1);
    expect(feed[0]).toMatchObject({ kind: 'submission_deleted', needsAction: true, assignmentId: 'asg-2' });
    expect(feed[0].body).toContain('Ảnh mờ quá, em chụp lại nhé');
    expect(feed[0].body).toContain('nộp lại');
  });

  it('không có lý do thì vẫn nói rõ bài nào bị xoá', () => {
    const feed = buildStudentFeed({ submissions: [], assignments, notifications: [deletedNotification()] });

    expect(feed[0].body).toContain('BTVN Đại số 27/08');
    expect(feed[0].body).toContain('nộp lại');
  });

  it('suy đúng bốn loại việc còn lại từ chính bài nộp', () => {
    const feed = buildStudentFeed({
      submissions: [
        submission({ id: 's-nop', status: 'submitted' }),
        submission({
          id: 's-cham',
          status: 'graded',
          updatedAt: '2026-09-08T11:00:00.000Z',
          grade: { score: 8, maxScore: 10, gradedAt: '2026-09-08T11:00:00.000Z', teacherApproved: false } as SubmissionDoc['grade'],
        }),
        submission({
          id: 's-duyet',
          status: 'graded',
          updatedAt: '2026-09-08T11:30:00.000Z',
          grade: { score: 9, maxScore: 10, gradedAt: '2026-09-08T11:30:00.000Z', teacherApproved: true } as SubmissionDoc['grade'],
        }),
        submission({
          id: 's-loi',
          status: 'error',
          updatedAt: '2026-09-08T10:30:00.000Z',
          errorMessage: 'AI đọc chưa rõ bài này.',
        }),
      ],
      assignments,
      notifications: [],
    });

    // Bài máy chấm xong nhưng chưa duyệt chỉ báo "chờ thầy cô duyệt" — KHÔNG có điểm.
    expect(feed.map(item => item.kind)).toEqual(['teacher_approved', 'submitted', 'grade_error', 'submitted']);
    expect(feed.find(item => item.id === 's-cham:pending-approval')?.body).not.toContain('8/10');
    expect(feed.find(item => item.id === 's-cham:pending-approval')?.title).toBe('Chờ thầy cô duyệt');
    expect(feed.find(item => item.kind === 'teacher_approved')?.body).toContain('9/10');
    expect(feed.find(item => item.kind === 'grade_error')?.needsAction).toBe(true);
    expect(feed.filter(item => item.kind === 'submitted').every(item => item.needsAction === undefined)).toBe(true);
  });

  it('một bài chỉ sinh một mục, không chồng nhiều dòng cùng nói về nó', () => {
    const feed = buildStudentFeed({
      submissions: [submission({
        status: 'graded',
        grade: { score: 7, maxScore: 10, gradedAt: '2026-09-08T11:00:00.000Z', teacherApproved: false } as SubmissionDoc['grade'],
      })],
      assignments,
      notifications: [],
    });

    expect(feed).toHaveLength(1);
    expect(feed[0].kind).toBe('submitted');
    expect(feed[0].body).not.toContain('7/10');
  });

  it('gộp hai nguồn theo thứ tự thời gian, mới nhất lên trước', () => {
    const feed = buildStudentFeed({
      submissions: [submission({ createdAt: '2026-09-08T09:00:00.000Z', updatedAt: '2026-09-08T09:00:00.000Z' })],
      assignments,
      notifications: [deletedNotification()],
    });

    expect(feed.map(item => item.kind)).toEqual(['submission_deleted', 'submitted']);
  });

  it('bỏ mục không có mốc thời gian đọc được, tránh dòng trôi lung tung', () => {
    const feed = buildStudentFeed({
      submissions: [submission({ createdAt: '', updatedAt: '' })],
      assignments,
      notifications: [deletedNotification({ createdAt: 'không phải ngày' })],
    });

    expect(feed).toEqual([]);
  });
});

describe('countUnread', () => {
  const feed = [
    { id: 'a', kind: 'graded' as const, title: '', body: '', at: '2026-09-08T12:00:00.000Z' },
    { id: 'b', kind: 'submitted' as const, title: '', body: '', at: '2026-09-08T10:00:00.000Z' },
  ];

  it('chưa mở chuông lần nào thì tất cả là mới', () => {
    expect(countUnread(feed, null)).toBe(2);
    expect(countUnread(feed, 'không phải ngày')).toBe(2);
  });

  it('chỉ đếm mục mới hơn lần mở gần nhất', () => {
    expect(countUnread(feed, '2026-09-08T11:00:00.000Z')).toBe(1);
    expect(countUnread(feed, '2026-09-08T12:00:00.000Z')).toBe(0);
  });
});

describe('buildStudentFeed · bài kiểm tra định kì', () => {
  it('không nêu điểm AI chấm lại, chỉ báo đã có phân tích từng câu', () => {
    const graded = submission({ status: 'graded', grade: { score: 4, maxScore: 10, feedback: '', strengths: [], weaknesses: [], teacherApproved: true, gradedAt: '2026-09-09T10:00:00.000Z' } });
    const [item] = buildStudentFeed({ submissions: [graded], assignments: [{ id: 'asg-1', title: 'Kiểm tra giữa kì I', periodicTest: {} }], notifications: [] });
    expect(item.title).toBe('Đã phân tích bài kiểm tra');
    expect(item.body).toBe('Bài "Kiểm tra giữa kì I" đã có phân tích từng câu. Mở ra xem nhận xét nhé.');
    expect(item.body).not.toContain('4/10');
  });
});


describe('buildStudentFeed · máy hỏi lại học sinh', () => {
  it('chưa báo "đã có kết quả/điểm" khi bài còn câu chờ em xác nhận', () => {
    const awaiting = submission({ status: 'graded', grade: { score: 0, maxScore: 10, feedback: '', strengths: [], weaknesses: [], teacherApproved: true, awaitingClarification: true, gradedAt: '2026-09-09T10:00:00.000Z' } });
    const [item] = buildStudentFeed({ submissions: [awaiting], assignments, notifications: [] });
    expect(item.title).toBe('Máy cần em xác nhận vài câu');
    expect(item.needsAction).toBe(true);
    expect(item.body).not.toContain('0/10');
  });
});
