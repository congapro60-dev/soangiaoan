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
  id: string;
  question: string;
  hint: string;
}

export interface PracticeAttemptQuestionResult {
  id: string;
  score: number;
  maxScore: number;
  feedback: string;
  expectedAnswer?: string;
}

export interface PracticeAttemptResult {
  attemptId: string;
  setId: string;
  status: 'grading' | 'graded' | 'error';
  score?: number;
  maxScore?: number;
  feedback?: string;
  questionResults?: PracticeAttemptQuestionResult[];
  evidenceType: 'practice';
  errorMessage?: string;
}

export interface PracticeSetResult {
  setId: string;
  questions: PracticeQuestion[];
  topics: string[];
  createdAt: string;
  reason?: string;
  attempt?: PracticeAttemptResult;
}

/** Bài luyện thêm sinh từ chủ đề còn yếu trong hồ sơ của chính học sinh đang đăng nhập. */
export const fetchPractice = async (setId?: string, attemptId?: string): Promise<PracticeSetResult> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Phiên đăng nhập đã hết hạn.');

  const payload = {
    action: 'practice',
    idToken: await user.getIdToken(),
    ...(setId ? { setId } : {}),
    ...(attemptId ? { attemptId } : {}),
  };
  const res = await fetch('/api/grade-homework', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.error || `Máy chủ trả lỗi ${res.status}`) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return data as PracticeSetResult;
};

/** Nộp câu trả lời bài luyện; đáp án chuẩn chỉ xuất hiện trong kết quả sau khi server chấm. */
export const submitPractice = async (
  setId: string,
  answers: Record<string, string>,
  attemptId?: string,
): Promise<PracticeAttemptResult> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Phiên đăng nhập đã hết hạn.');

  const res = await fetch('/api/grade-homework', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'submitPractice',
      idToken: await user.getIdToken(),
      setId,
      answers,
      ...(attemptId ? { attemptId } : {}),
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.error || `Máy chủ trả lỗi ${res.status}`) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return data as PracticeAttemptResult;
};

export interface SolvedAnswerKeyResult {
  answerKey: string;
  uncertainties: string[];
}

/**
 * Nhờ AI giải đề để dựng đáp án nháp. Kết quả trả về form cho giáo viên SOÁT rồi mới lưu —
 * cố ý không tự ghi thẳng vào bài giao.
 */
export const solveAnswerKey = async (
  classId: string,
  examText: string,
  examImages: string[],
  maxScore: number,
  gradingInstructions?: string,
): Promise<SolvedAnswerKeyResult> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Phiên đăng nhập đã hết hạn.');

  const res = await fetch('/api/grade-homework', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'solveAnswerKey',
      idToken: await user.getIdToken(),
      classId,
      examText,
      examImages,
      maxScore,
      gradingInstructions: gradingInstructions || '',
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.error || `Máy chủ trả lỗi ${res.status}`) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return data as SolvedAnswerKeyResult;
};

/** Nhờ AI đề xuất hướng dẫn chấm từ đáp án đã có. */
export const suggestRubric = async (
  classId: string,
  answerKey: string,
  maxScore: number,
  gradingInstructions?: string,
): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Phiên đăng nhập đã hết hạn.');

  const res = await fetch('/api/grade-homework', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'suggestRubric',
      idToken: await user.getIdToken(),
      classId,
      answerKey,
      maxScore,
      gradingInstructions: gradingInstructions || '',
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Máy chủ trả lỗi ${res.status}`);
  return String((data as { rubric?: string })?.rubric || '');
};

export interface RewriteFeedbackInput {
  classId: string;
  teacherNote: string;
  currentFeedback?: string;
  score: number;
  maxScore: number;
  weakTopics?: string[];
}

/** AI viết lại nhận xét gửi học sinh, bám theo lời giáo viên. Trả về để giáo viên SOÁT rồi mới lưu. */
export const rewriteFeedback = async (input: RewriteFeedbackInput): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Phiên đăng nhập đã hết hạn.');

  const res = await fetch('/api/grade-homework', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'rewriteFeedback', idToken: await user.getIdToken(), ...input }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Máy chủ trả lỗi ${res.status}`);
  return String((data as { feedback?: string })?.feedback || '');
};
