import type { AssignmentDoc, StudentNotificationDoc, SubmissionDoc } from './types';

/**
 * Dòng thời gian thông báo của học sinh.
 *
 * Chỉ sự kiện "giáo viên xoá bài" là được LƯU: bài nộp bị xoá thì document biến mất, không còn
 * gì để dựng lại. Mọi việc khác suy thẳng ra từ bài nộp mà cổng học sinh đã tải — giữ thêm một
 * bản sao trong Firestore chỉ tạo cơ hội cho hai nguồn nói khác nhau.
 */
export type StudentFeedKind =
  | 'submitted'
  | 'graded'
  | 'grade_error'
  | 'teacher_approved'
  | 'submission_deleted';

export interface StudentFeedItem {
  id: string;
  kind: StudentFeedKind;
  title: string;
  body: string;
  /** Mốc thời gian ISO dùng để sắp xếp và so với lần đọc gần nhất. */
  at: string;
  assignmentId?: string;
  /** Việc cần em làm tiếp; dùng để làm nổi bật trong bảng thông báo. */
  needsAction?: boolean;
}

const asTime = (value: unknown): string => {
  const text = String(value ?? '').trim();
  return text && Number.isFinite(Date.parse(text)) ? text : '';
};

const tenBai = (
  submission: Pick<SubmissionDoc, 'assignmentId'>,
  assignments: readonly Pick<AssignmentDoc, 'id' | 'title'>[],
): string => {
  const title = assignments.find(item => item.id === submission.assignmentId)?.title?.trim();
  return title || 'bài tự nộp';
};

const formatScore = (score: unknown, maxScore: unknown): string => {
  const diem = Number(score);
  const thang = Number(maxScore);
  if (!Number.isFinite(diem)) return '';
  return Number.isFinite(thang) && thang > 0 ? `${diem}/${thang}` : String(diem);
};

/**
 * Suy các việc đã xảy ra với một bài nộp. Một bài chỉ sinh MỘT mục — mục mới nhất — để bảng
 * thông báo không thành một chồng dòng cùng nói về một bài.
 */
const feedFromSubmission = (
  submission: SubmissionDoc,
  assignments: readonly Pick<AssignmentDoc, 'id' | 'title'>[],
): StudentFeedItem | null => {
  const ten = tenBai(submission, assignments);
  const gradedAt = asTime(submission.grade?.gradedAt);
  const updatedAt = asTime(submission.updatedAt) || asTime(submission.createdAt);

  if (submission.status === 'graded' && submission.grade) {
    const diem = formatScore(submission.grade.score, submission.grade.maxScore);
    const daDuyet = submission.grade.teacherApproved === true;
    return {
      id: `${submission.id}:${daDuyet ? 'approved' : 'graded'}`,
      kind: daDuyet ? 'teacher_approved' : 'graded',
      title: daDuyet ? 'Thầy cô đã duyệt điểm' : 'Máy đã chấm xong',
      body: daDuyet
        ? `Điểm bài "${ten}" đã được thầy cô duyệt${diem ? `: ${diem}` : ''}. Mở ra xem nhận xét nhé.`
        : `Bài "${ten}" đã có kết quả${diem ? `: ${diem}` : ''}. Mở ra xem nhận xét nhé.`,
      at: gradedAt || updatedAt,
      assignmentId: submission.assignmentId || undefined,
    };
  }

  if (submission.status === 'error') {
    return {
      id: `${submission.id}:error`,
      kind: 'grade_error',
      title: 'Chưa chấm được bài',
      body: `${submission.errorMessage?.trim() || 'Máy chưa chấm được bài này.'} (bài "${ten}")`,
      at: updatedAt,
      assignmentId: submission.assignmentId || undefined,
      needsAction: true,
    };
  }

  if (submission.status === 'submitted') {
    return {
      id: `${submission.id}:submitted`,
      kind: 'submitted',
      title: 'Đã nộp bài thành công',
      body: `Bài "${ten}" đã lên máy chủ. Em chờ thầy cô hoặc máy chấm nhé.`,
      at: asTime(submission.createdAt) || updatedAt,
      assignmentId: submission.assignmentId || undefined,
    };
  }

  return null;
};

const feedFromNotification = (notification: StudentNotificationDoc): StudentFeedItem => {
  const ten = notification.assignmentTitle?.trim() || 'bài đã nộp';
  const lyDo = notification.reason?.trim();
  return {
    id: notification.id,
    kind: 'submission_deleted',
    title: 'Thầy cô đã xoá bài nộp',
    body: lyDo
      ? `Bài "${ten}" đã bị xoá. Thầy cô nhắn: "${lyDo}". Em nộp lại giúp thầy cô nhé.`
      : `Bài "${ten}" đã bị xoá. Em nộp lại giúp thầy cô nhé.`,
    at: notification.createdAt,
    assignmentId: notification.assignmentId,
    needsAction: true,
  };
};

/** Gộp hai nguồn thành một dòng thời gian, mới nhất lên trước. */
export const buildStudentFeed = (input: {
  submissions: readonly SubmissionDoc[];
  assignments: readonly Pick<AssignmentDoc, 'id' | 'title'>[];
  notifications: readonly StudentNotificationDoc[];
}): StudentFeedItem[] => {
  const items: StudentFeedItem[] = [];
  for (const submission of input.submissions) {
    const item = feedFromSubmission(submission, input.assignments);
    if (item?.at) items.push(item);
  }
  for (const notification of input.notifications) {
    if (asTime(notification.createdAt)) items.push(feedFromNotification(notification));
  }
  return items.sort((left, right) => right.at.localeCompare(left.at));
};

/** Số mục mới hơn lần em mở chuông gần nhất. Chưa mở lần nào thì tính tất cả là mới. */
export const countUnread = (items: readonly StudentFeedItem[], lastSeenAt: string | null): number => {
  const moc = asTime(lastSeenAt);
  if (!moc) return items.length;
  return items.filter(item => item.at.localeCompare(moc) > 0).length;
};
