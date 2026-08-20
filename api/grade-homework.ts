/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from './_exam-core.js';
import {
  QUOTA_LIMITS,
  bumpQuota,
  callGeminiVision,
  getGradingApiKey,
  remainingQuota,
  rollQuota,
  today,
  type GradeKind,
  type InlineImage,
  type QuotaDoc,
} from './_grading-core.js';
import {
  buildHomeworkGradingPrompt,
  buildPracticePrompt,
  parseHomeworkGrade,
  parsePracticeQuestions,
} from '../src/lib/classroom/gradingPrompt.js';

/**
 * Chấm bài tập bằng khoá AI của chủ dự án.
 *
 *   POST { action: 'gradeAssignment', assignmentId, idToken }  → giáo viên chấm cả lớp
 *   POST { action: 'gradeOne', submissionId, idToken }         → một bài (học sinh tự nộp)
 *
 * Mỗi lượt gọi chỉ chấm TỐI ĐA `BATCH_SIZE` bài rồi trả về số còn lại, vì Vercel có trần thời
 * gian chạy còn một lớp 40 em thì không kịp trong một lượt. Client gọi lại đến khi hết —
 * đổi lại được thanh tiến độ thật thay vì một lượt chờ dài rồi timeout mất trắng.
 */
const BATCH_SIZE = 4;
const MAX_IMAGES_PER_SUBMISSION = 4;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const readBody = (req: VercelRequest): Record<string, unknown> => {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>;
  try {
    return JSON.parse(String(req.body || '{}'));
  } catch {
    return {};
  }
};

const uidFromIdToken = async (idToken: unknown): Promise<string | null> => {
  if (typeof idToken !== 'string' || !idToken) return null;
  try {
    return (await getAuth().verifyIdToken(idToken)).uid;
  } catch {
    return null;
  }
};

const fetchImage = async (url: string): Promise<InlineImage | null> => {
  const res = await fetch(url);
  if (!res.ok) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) return null;
  return {
    mimeType: res.headers.get('content-type')?.split(';')[0] || 'image/jpeg',
    data: buffer.toString('base64'),
  };
};

interface GradeContext {
  answerKey: string;
  rubric: string;
  maxScore: number;
  assignmentTitle: string;
}

const gradeOneSubmission = async (
  db: FirebaseFirestore.Firestore,
  submissionId: string,
  data: FirebaseFirestore.DocumentData,
  ctx: GradeContext,
  apiKey: string,
): Promise<boolean> => {
  const ref = db.collection('submissions').doc(submissionId);
  await ref.update({ status: 'grading', updatedAt: new Date().toISOString() });

  try {
    const urls = (Array.isArray(data.fileUrls) ? data.fileUrls : []).slice(0, MAX_IMAGES_PER_SUBMISSION);
    const images = (await Promise.all(urls.map((u: string) => fetchImage(u).catch(() => null))))
      .filter((img): img is InlineImage => img !== null);

    if (images.length === 0) throw new Error('Không tải được ảnh bài làm. Em thử chụp và nộp lại.');

    const prompt = buildHomeworkGradingPrompt({
      answerKey: ctx.answerKey,
      rubric: ctx.rubric,
      maxScore: ctx.maxScore,
      assignmentTitle: ctx.assignmentTitle,
    });
    const raw = await callGeminiVision(prompt, images, apiKey);
    const parsed = parseHomeworkGrade(raw, ctx.maxScore, ctx.answerKey.trim().length === 0);
    const now = new Date().toISOString();

    await ref.update({
      status: 'graded',
      grade: {
        score: parsed.score,
        maxScore: parsed.maxScore,
        feedback: parsed.feedbackForStudent,
        noteForTeacher: parsed.noteForTeacher,
        strengths: parsed.strengths,
        weaknesses: parsed.weaknesses,
        weakTopics: parsed.weakTopics,
        gradedWithoutAnswerKey: parsed.gradedWithoutAnswerKey,
        gradedAt: now,
        // Máy chấm KHÔNG tự duyệt cho mình. Điểm chỉ vào hồ sơ tích luỹ sau khi giáo viên xác nhận.
        teacherApproved: false,
      },
      errorMessage: '',
      updatedAt: now,
    });
    return true;
  } catch (error) {
    // Bài lỗi phải nhìn thấy được để chấm lại — KHÔNG lặng lẽ cho 0 điểm.
    await ref.update({
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Chấm thất bại',
      updatedAt: new Date().toISOString(),
    });
    return false;
  }
};

const loadQuota = async (db: FirebaseFirestore.Firestore, teacherId: string): Promise<[QuotaDoc, FirebaseFirestore.DocumentReference]> => {
  const ref = db.collection('gradingQuota').doc(teacherId);
  const snap = await ref.get();
  return [rollQuota(snap.exists ? (snap.data() as Partial<QuotaDoc>) : null, today()), ref];
};

const handleGradeAssignment = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập tài khoản giáo viên.' });

  const assignmentId = typeof body.assignmentId === 'string' ? body.assignmentId : '';
  const snap = await db.collection('assignments').doc(assignmentId).get();
  if (!snap.exists) return res.status(404).json({ error: 'Không tìm thấy bài đã giao.' });

  const assignment = snap.data() as FirebaseFirestore.DocumentData;
  if (assignment.teacherId !== uid) return res.status(403).json({ error: 'Chỉ giáo viên giao bài mới chấm được.' });

  const pending = await db.collection('submissions')
    .where('assignmentId', '==', assignmentId)
    .where('status', 'in', ['submitted', 'error'])
    .limit(BATCH_SIZE + 1)
    .get();

  if (pending.empty) return res.status(200).json({ graded: 0, failed: 0, remaining: 0 });

  const [quota, quotaRef] = await loadQuota(db, uid);
  const verdict = remainingQuota(quota, 'teacher', '');
  if (verdict.allowed <= 0) return res.status(429).json({ error: verdict.reason });

  const batch = pending.docs.slice(0, Math.min(BATCH_SIZE, verdict.allowed));
  const ctx: GradeContext = {
    answerKey: String(assignment.answerKey || ''),
    rubric: String(assignment.rubric || ''),
    maxScore: Number(assignment.maxScore) || 10,
    assignmentTitle: String(assignment.title || ''),
  };
  const apiKey = getGradingApiKey();

  let graded = 0;
  let failed = 0;
  for (const doc of batch) {
    const ok = await gradeOneSubmission(db, doc.id, doc.data(), ctx, apiKey);
    if (ok) graded += 1; else failed += 1;
  }

  await quotaRef.set(bumpQuota(quota, 'teacher', '', graded + failed));
  return res.status(200).json({
    graded,
    failed,
    remaining: Math.max(0, pending.size - batch.length),
  });
};

const handleGradeOne = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.' });

  const submissionId = typeof body.submissionId === 'string' ? body.submissionId : '';
  const ref = db.collection('submissions').doc(submissionId);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'Không tìm thấy bài nộp.' });

  const submission = snap.data() as FirebaseFirestore.DocumentData;
  const linkSnap = await db.collection('studentLinks').doc(uid).get();
  const isOwnerStudent = linkSnap.exists && linkSnap.data()?.studentId === submission.studentId;
  const isTeacher = submission.teacherId === uid;
  if (!isOwnerStudent && !isTeacher) return res.status(403).json({ error: 'Không có quyền chấm bài này.' });

  const kind: GradeKind = isTeacher ? 'teacher' : 'self';
  const [quota, quotaRef] = await loadQuota(db, String(submission.teacherId || ''));
  const verdict = remainingQuota(quota, kind, String(submission.studentId || ''));
  if (verdict.allowed <= 0) return res.status(429).json({ error: verdict.reason });

  let ctx: GradeContext = { answerKey: '', rubric: '', maxScore: 10, assignmentTitle: '' };
  if (submission.assignmentId) {
    const aSnap = await db.collection('assignments').doc(String(submission.assignmentId)).get();
    if (aSnap.exists) {
      const a = aSnap.data() as FirebaseFirestore.DocumentData;
      ctx = {
        answerKey: String(a.answerKey || ''),
        rubric: String(a.rubric || ''),
        maxScore: Number(a.maxScore) || 10,
        assignmentTitle: String(a.title || ''),
      };
    }
  }

  const ok = await gradeOneSubmission(db, submissionId, submission, ctx, getGradingApiKey());
  await quotaRef.set(bumpQuota(quota, kind, String(submission.studentId || ''), 1));
  return res.status(200).json({ graded: ok ? 1 : 0, failed: ok ? 0 : 1, remaining: 0 });
};

/**
 * Bài luyện thêm từ chủ đề còn yếu trong hồ sơ. Tính vào cùng hạn mức đường học sinh —
 * đây cũng là một lượt gọi AI trả bằng tiền của chủ dự án.
 */
const handlePractice = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.' });

  const linkSnap = await db.collection('studentLinks').doc(uid).get();
  if (!linkSnap.exists) return res.status(403).json({ error: 'Chỉ học sinh đã đăng nhập mới lấy được bài luyện.' });
  const link = linkSnap.data() as { studentId: string; classId: string; teacherId: string };

  const profileSnap = await db.collection('studentProfiles').doc(link.studentId).get();
  const topics = ((profileSnap.data()?.topics || []) as Array<{ topic: string; level: string }>)
    .filter(t => t.level === 'weak' || t.level === 'developing')
    .map(t => t.topic)
    .slice(0, 3);

  if (topics.length === 0) {
    return res.status(200).json({ questions: [], reason: 'Hồ sơ chưa ghi nhận chủ đề nào cần luyện thêm.' });
  }

  const [quota, quotaRef] = await loadQuota(db, link.teacherId);
  const verdict = remainingQuota(quota, 'self', link.studentId);
  if (verdict.allowed <= 0) return res.status(429).json({ error: verdict.reason });

  const classSnap = await db.collection('classes').doc(link.classId).get();
  const raw = await callGeminiVision(
    buildPracticePrompt(topics, String(classSnap.data()?.grade || '')),
    [],
    getGradingApiKey(),
  );
  await quotaRef.set(bumpQuota(quota, 'self', link.studentId, 1));

  return res.status(200).json({ questions: parsePracticeQuestions(raw), topics });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Chỉ nhận POST' });
  }

  const body = readBody(req);
  const action = String(body.action || '');

  try {
    const db = getAdminDb();
    if (action === 'gradeAssignment') return await handleGradeAssignment(db, body, res);
    if (action === 'gradeOne') return await handleGradeOne(db, body, res);
    if (action === 'practice') return await handlePractice(db, body, res);
    return res.status(400).json({ error: `Hành động không hợp lệ: ${action}`, limits: QUOTA_LIMITS });
  } catch (error) {
    console.error('[grade-homework] lỗi', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Máy chủ gặp lỗi khi chấm bài.',
    });
  }
}
