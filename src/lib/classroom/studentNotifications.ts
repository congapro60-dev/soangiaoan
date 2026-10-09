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

type FeedAssignment = Pick<AssignmentDoc, 'id' | 'title' | 'periodicTest'>;

const tenBai = (
  submission: Pick<SubmissionDoc, 'assignmentId'>,
  assignments: readonly FeedAssignment[],
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
  assignments: readonly FeedAssignment[],
): StudentFeedItem | null => {
  const ten = tenBai(submission, assignments);
  // Bài kiểm tra định kì: không nêu điểm AI chấm lại (điểm chính thức là điểm thầy cô chấm trên giấy).
  const periodic = Boolean(assignments.find(item => item.id === submission.assignmentId)?.periodicTest);
  const gradedAt = asTime(submission.grade?.gradedAt);
  const updatedAt = asTime(submission.updatedAt) || asTime(submission.createdAt);

  if (submission.status === 'graded' && submission.grade?.awaitingClarification) {
    // Điểm tạm bị ẩn tới khi em xác nhận xong các câu máy hỏi lại — không báo "đã có kết quả" lúc chưa có điểm.
    return {
      id: `${submission.id}:clarify`,
      kind: 'graded',
      title: 'Máy cần em xác nhận vài câu',
      body: `Bài "${ten}" còn vài câu máy đọc chưa chắc. Em mở trang chủ, trả lời ở khung màu vàng rồi chờ thầy cô duyệt nhé.`,
      at: gradedAt || updatedAt,
      assignmentId: submission.assignmentId || undefined,
      needsAction: true,
    };
  }

  // Máy / thầy cô đã chấm nhưng CHƯA duyệt: em không đọc được điểm hay nhận xét — chỉ báo "đã nộp, chờ thầy cô duyệt".
  if (submission.status === 'graded' && submission.grade && submission.grade.teacherApproved !== true) {
    return {
      id: `${submission.id}:pending-approval`,
      kind: 'submitted',
      title: 'Chờ thầy cô duyệt',
      body: `Bài "${ten}" em đã nộp xong. Điểm và nhận xét sẽ hiện sau khi thầy cô duyệt.`,
      at: gradedAt || updatedAt,
      assignmentId: submission.assignmentId || undefined,
    };
  }

  if (submission.status === 'graded' && submission.grade) {
    const diem = periodic ? '' : formatScore(submission.grade.score, submission.grade.maxScore);
    const daDuyet = submission.grade.teacherApproved === true;
    return {
      id: `${submission.id}:${daDuyet ? 'approved' : 'graded'}`,
      kind: daDuyet ? 'teacher_approved' : 'graded',
      title: periodic ? 'Đã phân tích bài kiểm tra' : daDuyet ? 'Thầy cô đã duyệt điểm' : 'Máy đã chấm xong',
      body: periodic
        ? `Bài "${ten}" đã có phân tích từng câu. Mở ra xem nhận xét nhé.`
        : daDuyet
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
  assignments: readonly FeedAssignment[];
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
