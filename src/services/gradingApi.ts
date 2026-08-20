import { auth } from '../lib/firebase';

export interface GradeBatchResult {
  graded: number;
  failed: number;
  remaining: number;
}

const call = async (payload: Record<string, unknown>): Promise<GradeBatchResult> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Phiên đăng nhập đã hết hạn. Tải lại trang rồi thử lại.');

  const res = await fetch('/api/grade-homework', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, idToken: await user.getIdToken() }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Máy chủ trả lỗi ${res.status}`);
  return data as GradeBatchResult;
};

/**
 * Chấm cả lớp. Máy chủ chỉ chấm vài bài mỗi lượt (trần thời gian chạy của Vercel), nên ở đây lặp
 * cho tới khi hết và báo tiến độ ra ngoài.
 *
 * Dừng khi: hết bài, người dùng bấm huỷ, hoặc chạy quá số vòng an toàn — vòng lặp gọi mạng không
 * có phanh là cách chắc chắn để đốt sạch hạn mức khi máy chủ trả `remaining` sai.
 */
export const gradeAssignmentAll = async (
  assignmentId: string,
  onProgress?: (done: number, remaining: number) => void,
  shouldStop?: () => boolean,
): Promise<GradeBatchResult> => {
  const total: GradeBatchResult = { graded: 0, failed: 0, remaining: 0 };

  for (let round = 0; round < 60; round += 1) {
    if (shouldStop?.()) break;

    const result = await call({ action: 'gradeAssignment', assignmentId });
    total.graded += result.graded;
    total.failed += result.failed;
    total.remaining = result.remaining;
    onProgress?.(total.graded + total.failed, result.remaining);

    if (result.remaining <= 0) break;
    if (result.graded + result.failed === 0) break; // không tiến thêm được thì dừng, tránh lặp vô hạn
  }
  return total;
};

/** Chấm một bài — dùng cho luồng học sinh tự nộp. */
export const gradeOneSubmission = (submissionId: string): Promise<GradeBatchResult> =>
  call({ action: 'gradeOne', submissionId });

export interface PracticeQuestion {
  question: string;
  hint: string;
  solution: string;
}

/** Bài luyện thêm sinh từ chủ đề còn yếu trong hồ sơ của chính học sinh đang đăng nhập. */
export const fetchPractice = async (): Promise<{ questions: PracticeQuestion[]; reason?: string }> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Phiên đăng nhập đã hết hạn.');

  const res = await fetch('/api/grade-homework', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'practice', idToken: await user.getIdToken() }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Máy chủ trả lỗi ${res.status}`);
  return data as { questions: PracticeQuestion[]; reason?: string };
};
