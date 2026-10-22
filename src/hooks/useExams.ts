import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, getDocs, doc, setDoc, deleteDoc, deleteField,
  getDoc, orderBy, updateDoc
} from 'firebase/firestore';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { Exam, ExamSubmission, StudentAnswer } from '../types';
import { moTaLoiHttp } from '../lib/httpErrorText';

/**
 * Chờ Firebase Auth ổn định state đầu tiên rồi trả về user hiện tại.
 * Doc đề nay chỉ giáo viên chủ đề đọc được → trang Cài đặt/Chấm bài (mở bằng URL trực tiếp)
 * phải chờ auth trước khi đọc, nếu không sẽ dính permission-denied lúc auth chưa kịp load.
 */
export const waitForAuth = (): Promise<User | null> => new Promise(resolve => {
  if (auth.currentUser) { resolve(auth.currentUser); return; }
  const unsub = onAuthStateChanged(auth, user => {
    unsub();
    resolve(user);
  });
});

const normalizeExam = (e: Exam): Exam => {
  const {
    proctorMode = 'off',
    showResultWhen = 'submit',
    hideLeaderboard = false,
    tfScoringMode = 'all_or_nothing',
    allowReview = true,
    shuffleQuestions = false,
    maxAttempts = 0,
    ...rest
  } = e;

  return {
    ...rest,
    proctorMode,
    showResultWhen,
    hideLeaderboard,
    tfScoringMode,
    allowReview,
    shuffleQuestions,
    maxAttempts,
  };
};

export const getSubmissions = async (examId: string): Promise<ExamSubmission[]> => {
  const q = query(collection(db, 'examSubmissions'), where('examId', '==', examId));
  const snap = await getDocs(q);
  const examSnap = await getDoc(doc(db, 'exams', examId));
  const questions = (examSnap.exists() && Array.isArray(examSnap.data().questions) ? examSnap.data().questions : []) as Exam['questions'];
  const list: ExamSubmission[] = [];
  snap.forEach(d => {
    const submission = d.data() as ExamSubmission;
    // Raw student answer maps are untrusted until a server/teacher grading write stamps their provenance.
    if (submission.status !== 'graded' && !submission.publicAutoGradedAt) {
      const { totalScore: _score, ...raw } = submission;
      const rawAnswers = Array.isArray(submission.answers) ? submission.answers : [];
      const requiresScoreReview = rawAnswers.some(a => a &&
        (!questions.some(q => q.id === a.questionId) || questions.some(q => q.id === a.questionId && q.type === 'essay'))
        && (a.aiScore !== undefined || a.autoScore !== undefined || a.aiFeedback !== undefined));
      list.push({ ...raw, ...(requiresScoreReview ? { requiresScoreReview: true } : {}), answers: rawAnswers.flatMap(answer =>
        answer && typeof answer.questionId === 'string' ? [{ questionId: answer.questionId, answer: typeof answer.answer === 'string' ? answer.answer : '' }] : []) });
    } else list.push(submission);
  });
  return list.sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
};

export const useExams = (user: User | null) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMyExams = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'exams'),
        where('teacherId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const list: Exam[] = [];
      snap.forEach(d => list.push(normalizeExam(d.data() as Exam)));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setExams(list);
    } catch (e) {
      console.error('Lỗi tải danh sách đề thi:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchMyExams();
  }, [user, fetchMyExams]);

  const saveExam = async (exam: Exam) => {
    if (!user) throw new Error('Chưa đăng nhập');
    await setDoc(doc(db, 'exams', exam.id), exam);
    setExams(prev => {
      const idx = prev.findIndex(e => e.id === exam.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = exam;
        return copy;
      }
      return [exam, ...prev];
    });
  };

  const deleteExam = async (id: string) => {
    await deleteDoc(doc(db, 'exams', id));
    setExams(prev => prev.filter(e => e.id !== id));
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await updateDoc(doc(db, 'exams', id), { isActive, updatedAt: new Date().toISOString() });
    setExams(prev => prev.map(e => e.id === id ? { ...e, isActive } : e));
  };

  return { exams, loading, fetchMyExams, saveExam, deleteExam, toggleActive };
};

// ── Đường HỌC SINH: đọc đề đã lược đáp án qua serverless (rules cấm học sinh đọc doc đề trực tiếp) ──

const fetchPublicExam = async (params: string): Promise<Exam | null> => {
  const res = await fetch(`/api/exam?${params}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Không tải được đề thi. ${moTaLoiHttp(res.status)}`);
  const data = await res.json();
  return data.exam ? normalizeExam(data.exam as Exam) : null;
};

/** Đề theo mã cho học sinh vào làm — đã lược correctAnswer/explanation. */
export const findPublicExamByCode = (code: string): Promise<Exam | null> =>
  fetchPublicExam(`code=${encodeURIComponent(code.toUpperCase())}`);

export interface PublicAttemptResponse {
  sessionToken: string;
  exam?: Exam;
  attempt: Pick<ExamSubmission, 'id' | 'status' | 'answers' | 'startedAt'> & { deadlineAt?: string | null; totalScore?: number };
}

const postPublicAttempt = async (body: Record<string, unknown>): Promise<PublicAttemptResponse> => {
  const res = await fetch('/api/exam', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Không cập nhật được bài thi. ${moTaLoiHttp(res.status)}`);
  return data as PublicAttemptResponse;
};

export const startPublicExam = (input: {
  code: string;
  password?: string;
  studentName: string;
  studentClass?: string;
  sessionToken?: string;
}): Promise<PublicAttemptResponse> => postPublicAttempt({ action: 'start', ...input });

export const resumePublicExam = (code: string, sessionToken: string): Promise<PublicAttemptResponse> =>
  postPublicAttempt({ action: 'resume', code, sessionToken });

export const savePublicExamAttempt = (code: string, sessionToken: string, submissionId: string, answers: StudentAnswer[]): Promise<PublicAttemptResponse> =>
  postPublicAttempt({ action: 'save', code, sessionToken, submissionId, answers });

export const submitPublicExamAttempt = (code: string, sessionToken: string, submissionId: string, answers: StudentAnswer[]): Promise<PublicAttemptResponse> =>
  postPublicAttempt({ action: 'submit', code, sessionToken, submissionId, answers });

/** Đề theo id cho trang kết quả/xem lại — đã lược đáp án (đáp án xem lại lấy từ bài nộp đã chấm). */
export const getPublicExamById = (id: string, proofSubmissionId?: string): Promise<Exam | null> =>
  fetchPublicExam(`examId=${encodeURIComponent(id)}${proofSubmissionId ? `&proofSubmissionId=${encodeURIComponent(proofSubmissionId)}` : ''}`);

/** Một dòng bảng xếp hạng trên trang kết quả (máy chủ chỉ trả tên + điểm). */
export interface PublicLeaderboardRow {
  isMe: boolean;
  studentName: string;
  studentClass: string;
  totalScore: number;
}

/** Bài làm cho trang kết quả: chưa tới lúc hiện điểm thì máy chủ đã bỏ điểm và đặt `resultHidden`. */
export type PublicExamResult = ExamSubmission & { resultHidden?: boolean };

/**
 * Kết quả một bài làm theo link kết quả — đọc qua máy chủ (Firestore chỉ cho giáo viên chủ đề đọc bài làm).
 * Máy chủ áp cài đặt hiện điểm / xem lại / ẩn bảng xếp hạng của đề. Không có bài → null.
 */
export const getPublicExamResult = async (submissionId: string): Promise<{ submission: PublicExamResult; leaderboard: PublicLeaderboardRow[]; leaderboardLimited?: boolean } | null> => {
  const res = await fetch(`/api/exam?submissionId=${encodeURIComponent(submissionId)}`);
  if (res.status === 404) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Không tải được kết quả. ${moTaLoiHttp(res.status)}`);
  return { submission: data.submission as PublicExamResult, leaderboard: Array.isArray(data.leaderboard) ? data.leaderboard : [], leaderboardLimited: data.leaderboardLimited === true };
};

/**
 * Chấm bài nộp phía server (nguồn tin cậy). Trả điểm/status.
 * Fail-safe: lỗi thì ném — nơi gọi bắt và để bài ở 'submitted'; giáo viên xác minh sau vẫn đúng.
 */
export const gradeExamSubmission = async (
  submissionId: string, clientNonce?: string
): Promise<PublicExamResult> => {
  const idToken = clientNonce ? undefined : await auth.currentUser?.getIdToken();
  const res = await fetch('/api/exam', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
    body: JSON.stringify({ submissionId, ...(clientNonce ? { clientNonce } : {}) }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.error || `Chưa chấm được điểm. ${moTaLoiHttp(res.status)}`);
  }
  return res.json();
};

const fillSecureRandom = (random: Uint8Array): void => {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(random as Uint8Array<ArrayBuffer>);
    return;
  }
  for (let index = 0; index < random.length; index += 1) {
    random[index] = Math.floor(Math.random() * 256);
  }
};

export const createSubmissionId = (): string => {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return `sub_${globalThis.crypto.randomUUID()}`;
  }
  const random = new Uint8Array(16);
  fillSecureRandom(random);
  return `sub_${Array.from(random, byte => byte.toString(16).padStart(2, '0')).join('')}`;
};

export const createSubmissionNonce = (): string => {
  const random = new Uint8Array(18);
  fillSecureRandom(random);
  return Array.from(random, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const createSubmission = async (submission: ExamSubmission): Promise<string> => {
  await setDoc(doc(db, 'examSubmissions', submission.id), submission);
  return submission.id;
};

export const updateSubmission = async (
  id: string,
  patch: Partial<ExamSubmission>
): Promise<void> => {
  await updateDoc(doc(db, 'examSubmissions', id), { ...patch, ...('totalScore' in patch ? { publicAutoGradedAt: new Date().toISOString() } : {}) });
};


export const getExamById = async (id: string): Promise<Exam | null> => {
  const snap = await getDoc(doc(db, 'exams', id));
  return snap.exists() ? normalizeExam(snap.data() as Exam) : null;
};

export const updateExam = async (id: string, patch: Partial<Exam>): Promise<void> => {
  const firestorePatch = Object.fromEntries(
    Object.entries(patch).map(([key, value]) => [key, value === undefined ? deleteField() : value]),
  );
  await updateDoc(doc(db, 'exams', id), { ...firestorePatch, updatedAt: new Date().toISOString() });
};
