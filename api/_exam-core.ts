/// <reference types="node" />
// File prefix "_" → Vercel KHÔNG biến thành Serverless Function (tránh vượt giới hạn số hàm),
// nhưng vẫn import được từ api/exam.ts. Gồm: khởi tạo Firebase Admin + logic chấm thuần.
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// ── Firebase Admin (giống pattern adaptive-progress.ts) ──────────────────────

const parseJsonSecret = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return JSON.parse(value.replace(/\r?\n/g, '\\n'));
  }
};

const parseServiceAccount = () => {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const rawBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (rawJson) return parseJsonSecret(rawJson);
  if (rawBase64) return parseJsonSecret(Buffer.from(rawBase64, 'base64').toString('utf8'));

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) return { projectId, clientEmail, privateKey };
  return null;
};

let adminDb: ReturnType<typeof getFirestore> | null = null;

export const getAdminDb = () => {
  if (adminDb) return adminDb;
  if (!getApps().length) {
    const serviceAccount = parseServiceAccount();
    if (!serviceAccount) {
      throw new Error('Missing Firebase Admin service account environment variables');
    }
    const projectId = String(
      serviceAccount.projectId
      || serviceAccount.project_id
      || process.env.FIREBASE_PROJECT_ID
      || '',
    );
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET
      || process.env.VITE_FIREBASE_STORAGE_BUCKET
      || (projectId ? `${projectId}.firebasestorage.app` : '');
    initializeApp({
      credential: cert(serviceAccount),
      ...(storageBucket ? { storageBucket } : {}),
    });
  }
  const db = getFirestore();
  // Admin SDK KHÔNG tự bỏ field undefined như đường client (removeUndefinedFields đệ quy).
  // Bật ở chỗ init DUY NHẤT này để mọi write server — hiện tại và về sau — không bao giờ ném
  // "Cannot use undefined as a Firestore value". Đây là lưới đỡ CHỒNG LÊN builder canonical sạch,
  // không thay cho nó. settings() chỉ gọi được một lần trước thao tác đầu, nên cache lại instance.
  db.settings({ ignoreUndefinedProperties: true });
  adminDb = db;
  return adminDb;
};

export const getAdminStorage = () => getStorage().bucket();

// ── Logic chấm thuần — mirror src/utils/examScoring.computeAutoScore ──────────

export type TfScoringMode = 'all_or_nothing' | 'thpt2025';

export interface CoreQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  points: number;
}

export interface CoreAnswer {
  questionId: string;
  answer: string;
  autoScore?: number;
  aiScore?: number;
  aiFeedback?: string;
  correctAnswer?: string;
  explanation?: string;
}

const isCompoundTF = (q: CoreQuestion) =>
  q.type === 'true_false' && Array.isArray(q.options) && q.options.length > 0;

const parseTFSub = (v: string): Record<string, string> => {
  try {
    const parsed = JSON.parse(v);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const normalize = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

export const computeAutoScoreCore = (
  q: CoreQuestion,
  answer: string,
  tfScoringMode?: TfScoringMode
): number | undefined => {
  if (q.type === 'essay') return undefined;
  if (!answer) return 0;

  if (q.type === 'multiple_choice') {
    return answer === q.correctAnswer ? q.points : 0;
  }

  if (isCompoundTF(q)) {
    const studentTF = parseTFSub(answer);
    const correctTF = parseTFSub(q.correctAnswer || '');
    const keys = ['a', 'b', 'c', 'd'];
    const correctCount = keys.filter(k => studentTF[k] === correctTF[k]).length;

    if (tfScoringMode === 'thpt2025') {
      if (correctCount === 4) return q.points;
      if (correctCount === 3) return q.points * 0.5;
      if (correctCount === 2) return q.points * 0.25;
      if (correctCount === 1) return q.points * 0.1;
      return 0;
    }
    return correctCount === 4 ? q.points : 0;
  }

  if (q.type === 'true_false' || q.type === 'short_answer') {
    return normalize(answer) === normalize(q.correctAnswer || '') ? q.points : 0;
  }

  return 0;
};

export interface GradeResult {
  answers: CoreAnswer[];
  totalScore: number;
  status: 'submitted' | 'graded';
}

export const gradeSubmissionCore = (
  questions: CoreQuestion[],
  submissionAnswers: CoreAnswer[],
  allowReview: boolean,
  tfScoringMode?: TfScoringMode
): GradeResult => {
  const answers: CoreAnswer[] = submissionAnswers.map(a => {
    const q = questions.find(item => item.id === a.questionId);
    if (!q) return a;

    const next: CoreAnswer = { questionId: a.questionId, answer: a.answer };
    if (a.aiScore !== undefined) next.aiScore = a.aiScore;
    if (a.aiFeedback !== undefined) next.aiFeedback = a.aiFeedback;

    if (q.type === 'essay') {
      if (a.autoScore !== undefined) next.autoScore = a.autoScore;
    } else {
      const autoScore = computeAutoScoreCore(q, a.answer, tfScoringMode);
      if (autoScore !== undefined) next.autoScore = autoScore;
    }

    if (allowReview) {
      if (q.correctAnswer !== undefined) next.correctAnswer = q.correctAnswer;
      if (q.explanation !== undefined) next.explanation = q.explanation;
    }
    return next;
  });

  const totalScore = Math.round(answers.reduce((sum, a) => {
    if (a.autoScore !== undefined) return sum + a.autoScore;
    if (a.aiScore !== undefined) return sum + a.aiScore;
    return sum;
  }, 0) * 100) / 100;

  const fullyGraded = questions.every(q => {
    const a = answers.find(item => item.questionId === q.id);
    if (!a) return false;
    return q.type === 'essay' ? (a.aiScore !== undefined || a.autoScore !== undefined) : true;
  });

  return { answers, totalScore, status: fullyGraded ? 'graded' : 'submitted' };
};

/** Bỏ đáp án + giải thích khỏi câu hỏi trước khi gửi cho học sinh (chống xem đáp án qua DevTools). */
export const stripAnswerKey = <T extends { correctAnswer?: unknown; explanation?: unknown }>(
  question: T
): Omit<T, 'correctAnswer' | 'explanation'> => {
  const { correctAnswer, explanation, ...rest } = question;
  return rest;
};
