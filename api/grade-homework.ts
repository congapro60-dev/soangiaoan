/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from './_exam-core.js';
import {
  GRADING_MODEL,
  QUOTA_LIMITS,
  bumpQuota,
  callGeminiVision,
  getGradingApiKey,
  loadQuotaDoc,
  remainingQuota,
  reserveQuota,
  rollQuota,
  today,
  type GradeKind,
  parseDataUrl,
  type InlineImage,
  type QuotaDoc,
} from './_grading-core.js';
import {
  buildHomeworkGradingPrompt,
  buildPracticeGradingPrompt,
  buildPracticePrompt,
  buildRewriteFeedbackPrompt,
  buildRubricPrompt,
  buildSolveExamPrompt,
  parseHomeworkGrade,
  parsePracticeAssessment,
  parsePracticeQuestions,
  parseRewrittenFeedback,
  parseRubric,
  parseSolvedAnswerKey,
  toPublicPracticeQuestions,
} from '../src/lib/classroom/gradingPrompt.js';
import { applyPracticeEvidence } from '../src/lib/classroom/profileMerge.js';
import {
  buildPracticeSkillEvidence,
  skillIdsForTopics,
} from '../src/lib/learning/skillProfile.js';
import {
  PRACTICE_ATTEMPTS_COL,
  PRACTICE_KEYS_COL,
  PRACTICE_SETS_COL,
  type PracticeAttemptDoc,
  type PracticeKeyDoc,
  type PracticeQuestionPublic,
  type PracticeQuestionKey,
  type PracticeSetDoc,
  type ProfileTopic,
} from '../src/lib/classroom/types.js';
import { handleAiGateway } from './_ai-gateway-handler.js';
import { upsertSkillEvidenceAndRebuild } from './_skill-profile.js';

/**
 * Chấm bài tập bằng khoá AI của chủ dự án + gateway GLM 5.2 (gộp chung một function để
 * không vượt trần 12 Serverless Functions của Vercel Hobby).
 *
 *   POST { action: 'gradeAssignment', assignmentId, idToken }  → giáo viên chấm cả lớp
 *   POST { action: 'gradeOne', submissionId, idToken }         → một bài (học sinh tự nộp)
 *   POST { action: 'aiGateway', prompt, stream, Authorization: Bearer idToken } → GLM 5.2
 *
 * Mỗi lượt chấm chỉ TỐI ĐA `BATCH_SIZE` bài rồi trả về số còn lại, vì Vercel có trần thời
 * gian chạy còn một lớp 40 em thì không kịp trong một lượt. Client gọi lại đến khi hết —
 * đổi lại được thanh tiến độ thật thay vì một lượt chờ dài rồi timeout mất trắng.
 */
const BATCH_SIZE = 4;
export const STALE_GRADING_MS = 10 * 60 * 1000;
const isStaleGradingTimestamp = (updatedAt: unknown, nowMs = Date.now()): boolean => {
  const timestamp = Date.parse(String(updatedAt || ''));
  return !Number.isFinite(timestamp) || nowMs - timestamp > STALE_GRADING_MS;
};
/** Khop voi tran phia hoc sinh: bo sot anh la cham thieu bai ma khong ai biet. */
const MAX_SUBMISSION_FILES = 12;
/** Chỉ gửi một số trang đề cần thiết làm ngữ cảnh chung; file gốc vẫn giữ đủ cho học sinh mở. */
const MAX_ASSIGNMENT_SOURCE_IMAGES = 6;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
/** Khai tường minh thay vì dựa default của Vercel — Hobby cap ở 60s. */
export const maxDuration = 60;

const newPracticeId = (prefix: string): string => {
  const random = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${random}`;
};

const isSafePracticeId = (value: string): boolean => /^[A-Za-z0-9_-]{1,128}$/u.test(value);

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
  // Submission có thể giữ cả PDF/DOCX để giáo viên mở bản gốc. Gemini Vision chỉ nhận ảnh;
  // phần chữ của DOCX đi qua `textContent`, còn file PDF đã có ảnh trang được tạo ở client.
  const mimeType = res.headers.get('content-type')?.split(';')[0] || '';
  if (mimeType && !mimeType.startsWith('image/')) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) return null;
  return {
    mimeType: mimeType || 'image/jpeg',
    data: buffer.toString('base64'),
  };
};

/** Ảnh đáp án chỉ tải một lần cho cả lô, không tải lại cho từng em. */
const loadAnswerKeyImages = async (assignment: FirebaseFirestore.DocumentData): Promise<InlineImage[]> => {
  const urls = (Array.isArray(assignment.answerKeyImageUrls) ? assignment.answerKeyImageUrls : []).slice(0, 4);
  const anh = await Promise.all(urls.map((u: string) => fetchImage(u).catch(() => null)));
  return anh.filter((img): img is InlineImage => img !== null);
};

/** Ảnh đề của giáo viên — tải một lần cho cả lô, đứng trước ảnh đáp án và bài làm. */
const loadAssignmentSourceImages = async (assignment: FirebaseFirestore.DocumentData): Promise<InlineImage[]> => {
  const generatedUrls = Array.isArray(assignment.sourceImageUrls)
    ? assignment.sourceImageUrls.map((url: unknown) => String(url || '')).filter(Boolean)
    : [];
  const attachmentUrls = (Array.isArray(assignment.attachments) ? assignment.attachments : [])
    .map((item: unknown) => item && typeof item === 'object' ? String((item as { url?: unknown }).url || '') : '')
    .filter(Boolean);
  const urls = [...new Set([...generatedUrls, ...attachmentUrls])].slice(0, MAX_ASSIGNMENT_SOURCE_IMAGES);
  const anh = await Promise.all(urls.map((u: string) => fetchImage(u).catch(() => null)));
  return anh.filter((img): img is InlineImage => img !== null);
};

interface GradeContext {
  answerKey: string;
  rubric: string;
  maxScore: number;
  assignmentTitle: string;
  assignmentText: string;
  gradingInstructions: string;
  /** Ảnh đề của giáo viên, gửi trước ảnh đáp án và bài làm. */
  assignmentImages: InlineImage[];
  /** Ảnh đáp án của giáo viên, gửi TRƯỚC ảnh bài làm. Tải một lần rồi dùng cho cả lô. */
  answerKeyImages: InlineImage[];
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
    const urls = (Array.isArray(data.fileUrls) ? data.fileUrls : []).slice(0, MAX_SUBMISSION_FILES);
    const images = (await Promise.all(urls.map((u: string) => fetchImage(u).catch(() => null))))
      .filter((img): img is InlineImage => img !== null);
    const studentText = String(data.textContent || '').trim();

    if (images.length === 0 && !studentText) {
      throw new Error('Không đọc được bài làm. Em thử chụp lại hoặc nộp lại file.');
    }

    const prompt = buildHomeworkGradingPrompt({
      answerKey: ctx.answerKey,
      rubric: ctx.rubric,
      maxScore: ctx.maxScore,
      assignmentTitle: ctx.assignmentTitle,
      assignmentText: ctx.assignmentText,
      assignmentImageCount: ctx.assignmentImages.length,
      answerKeyImageCount: ctx.answerKeyImages.length,
      gradingInstructions: ctx.gradingInstructions,
      studentText,
    });
    const raw = await callGeminiVision(prompt, [...ctx.assignmentImages, ...ctx.answerKeyImages, ...images], apiKey, GRADING_MODEL, {
      maxOutputTokens: 8192,
      jsonMode: true,
    });
    const khongCoDapAn = ctx.answerKey.trim().length === 0 && ctx.answerKeyImages.length === 0;
    const parsed = parseHomeworkGrade(raw, ctx.maxScore, khongCoDapAn);
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
        questionResults: parsed.questionResults,
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

/**
 * Worker có thể bị Vercel dừng sau khi đã khóa bài ở `grading`. Chỉ mở khóa khi dấu thời gian
 * đã quá 10 phút và dùng transaction để không reset nhầm một worker khác vừa bắt đầu xử lý.
 * Các id vừa recovery được loại khỏi batch hiện tại; lượt retry kế tiếp mới chấm lại.
 */
const recoverStaleGradingSubmissions = async (
  db: FirebaseFirestore.Firestore,
  assignmentId: string,
  teacherId: string,
  classId: string,
): Promise<Set<string>> => {
  const nowMs = Date.now();
  const candidates = await db.collection('submissions')
    .where('assignmentId', '==', assignmentId)
    .where('status', '==', 'grading')
    .get();
  const recovered = new Set<string>();

  await Promise.all(candidates.docs.map(async candidate => {
    const snapshotData = candidate.data() as FirebaseFirestore.DocumentData;
    const candidateUpdatedAt = Date.parse(String(snapshotData.updatedAt || ''));
    const isStale = snapshotData.status === 'grading'
      && snapshotData.teacherId === teacherId
      && snapshotData.classId === classId
      && (!Number.isFinite(candidateUpdatedAt) || nowMs - candidateUpdatedAt > STALE_GRADING_MS);
    if (!isStale) return;

    const ref = db.collection('submissions').doc(candidate.id);
    await db.runTransaction(async transaction => {
      const latest = await transaction.get(ref);
      if (!latest.exists) return;
      const current = latest.data() as FirebaseFirestore.DocumentData;
      const latestUpdatedAt = Date.parse(String(current.updatedAt || ''));
      if (current.status !== 'grading'
        || current.teacherId !== teacherId
        || current.classId !== classId
        || current.updatedAt !== snapshotData.updatedAt
        || (Number.isFinite(latestUpdatedAt) && nowMs - latestUpdatedAt <= STALE_GRADING_MS)) {
        return;
      }
      transaction.update(ref, {
        status: 'error',
        errorMessage: 'Lượt chấm trước đã quá lâu. Em hoặc thầy cô có thể thử chấm lại.',
        updatedAt: new Date().toISOString(),
      });
      recovered.add(candidate.id);
    });
  }));

  return recovered;
};

const handleGradeAssignment = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập tài khoản giáo viên.' });

  const assignmentId = typeof body.assignmentId === 'string' ? body.assignmentId : '';
  const snap = await db.collection('assignments').doc(assignmentId).get();
  if (!snap.exists) return res.status(404).json({ error: 'Không tìm thấy bài đã giao.' });

  const assignment = snap.data() as FirebaseFirestore.DocumentData;
  if (assignment.teacherId !== uid) return res.status(403).json({ error: 'Chỉ giáo viên giao bài mới chấm được.' });

  const recovered = await recoverStaleGradingSubmissions(db, assignmentId, uid, String(assignment.classId || ''));

  const pending = await db.collection('submissions')
    .where('assignmentId', '==', assignmentId)
    .where('status', 'in', ['submitted', 'error'])
    .limit(BATCH_SIZE + 20)
    .get();

  if (pending.empty) return res.status(200).json({ graded: 0, failed: 0, remaining: 0 });

  // KHÓA NGUỒN GỐC: chỉ chấm bài nộp thật sự thuộc bài giao này (cùng giáo viên + cùng lớp).
  // Truy vấn không lọc được hai trường này nếu không đòi index tổ hợp mới, nên lọc tại đây —
  // document lệch lớp là rác do client bịa và tuyệt đối không được ăn điểm từ đáp án của bài khác.
  const hopLe = pending.docs.filter(d => {
    const s = d.data() as FirebaseFirestore.DocumentData;
    return !recovered.has(d.id) && s.teacherId === uid && s.classId === assignment.classId;
  });

  if (hopLe.length === 0) return res.status(200).json({ graded: 0, failed: 0, remaining: 0 });

  const [quota, quotaRef] = await loadQuotaDoc(db, uid);
  const verdict = remainingQuota(quota, 'teacher', '');
  if (verdict.allowed <= 0) return res.status(429).json({ error: verdict.reason });

  const batch = hopLe.slice(0, Math.min(hopLe.length, verdict.allowed));
  const ctx: GradeContext = {
    answerKey: String(assignment.answerKey || ''),
    rubric: String(assignment.rubric || ''),
    maxScore: Number(assignment.maxScore) || 10,
    assignmentTitle: String(assignment.title || ''),
    assignmentText: String(assignment.sourceText || ''),
    // Ảnh generated xử lý PDF scan đã nằm trong sourceImageUrls; ảnh đính kèm cũ dùng fallback.
    gradingInstructions: String(assignment.gradingInstructions || ''),
    assignmentImages: await loadAssignmentSourceImages(assignment),
    answerKeyImages: await loadAnswerKeyImages(assignment),
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
    remaining: Math.max(0, hopLe.length - batch.length),
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
  const [quota, quotaRef] = await loadQuotaDoc(db, String(submission.teacherId || ''));
  const verdict = remainingQuota(quota, kind, String(submission.studentId || ''));
  if (verdict.allowed <= 0) return res.status(429).json({ error: verdict.reason });

  let ctx: GradeContext = {
    answerKey: '',
    rubric: '',
    maxScore: 10,
    assignmentTitle: '',
    assignmentText: '',
    gradingInstructions: '',
    assignmentImages: [],
    answerKeyImages: [],
  };
  if (submission.assignmentId) {
    const aSnap = await db.collection('assignments').doc(String(submission.assignmentId)).get();
    if (aSnap.exists) {
      const a = aSnap.data() as FirebaseFirestore.DocumentData;
      // KHÓA NGUỒN ĐÁP ÁN: assignment phải thuộc đúng lớp + giáo viên của bài nộp.
      // Không khớp nghĩa là client đã bịa assignmentId để mượn đáp án của bài khác —
      // từ chối thẳng thay vì im lặng chấm không key (lỗi bịa dữ liệu phải lộ ra).
      if (a.teacherId !== submission.teacherId || a.classId !== submission.classId) {
        return res.status(403).json({ error: 'Bài nộp không khớp với bài đã giao. Báo thầy cô kiểm tra lại.' });
      }
      ctx = {
        answerKey: String(a.answerKey || ''),
        rubric: String(a.rubric || ''),
        maxScore: Number(a.maxScore) || 10,
        assignmentTitle: String(a.title || ''),
        assignmentText: String(a.sourceText || ''),
        // Ảnh generated xử lý PDF scan đã nằm trong sourceImageUrls; ảnh đính kèm cũ dùng fallback.
        gradingInstructions: String(a.gradingInstructions || ''),
        assignmentImages: await loadAssignmentSourceImages(a),
        answerKeyImages: await loadAnswerKeyImages(a),
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

  const requestedSetId = typeof body.setId === 'string' ? body.setId.trim() : '';
  if (requestedSetId) {
    if (!isSafePracticeId(requestedSetId)) return res.status(400).json({ error: 'Mã bài luyện không hợp lệ.' });
    const setSnap = await db.collection(PRACTICE_SETS_COL).doc(requestedSetId).get();
    if (!setSnap.exists) return res.status(404).json({ error: 'Bài luyện không còn tồn tại.' });

    const set = setSnap.data() as PracticeSetDoc;
    if (set.studentId !== link.studentId || set.classId !== link.classId || set.teacherId !== link.teacherId) {
      return res.status(403).json({ error: 'Bài luyện không thuộc tài khoản học sinh này.' });
    }

    const keySnap = await db.collection(PRACTICE_KEYS_COL).doc(requestedSetId).get();
    if (!keySnap.exists) return res.status(409).json({ error: 'Bài luyện chưa sẵn sàng để mở lại. Tạo bài mới rồi thử lại.' });
    const key = keySnap.data() as PracticeKeyDoc;
    if (key.studentId !== link.studentId || key.classId !== link.classId || key.teacherId !== link.teacherId) {
      return res.status(403).json({ error: 'Đáp án bài luyện không thuộc tài khoản học sinh này.' });
    }

    // Chỉ project đúng ba trường công khai và kiểm lại hint bằng private key, kể cả khi
    // document public cũ bị ghi thêm solution hoặc bị AI tạo rò rỉ trước khi có validator.
    const publicQuestions = (Array.isArray(set.questions) ? set.questions : [])
      .map(question => ({
        id: String(question.id || ''),
        question: String(question.question || ''),
        hint: String(question.hint || ''),
      }))
      .filter(question => question.id && question.question);
    const storedKeyQuestions = Array.isArray(key.questions) ? key.questions : [];
    if (storedKeyQuestions.length === 0 || new Set(storedKeyQuestions.map(question => question.id)).size !== storedKeyQuestions.length) {
      return res.status(409).json({ error: 'Đáp án bài luyện không hợp lệ. Tạo bài mới rồi thử lại.' });
    }
    const keyById = new Map(storedKeyQuestions.map(question => [question.id, question]));
    let questions: PracticeQuestionPublic[];
    try {
      questions = toPublicPracticeQuestions(publicQuestions.map(question => {
        const privateQuestion = keyById.get(question.id);
        if (!privateQuestion || !String(privateQuestion.expectedAnswer || '').trim()) {
          throw new Error('Stored practice question has no matching private key.');
        }
        return { ...question, solution: String(privateQuestion.expectedAnswer) };
      }));
    } catch (error) {
      console.error('[grade-homework] stored practice output rejected', error);
      return res.status(409).json({ error: 'Bài luyện cũ không còn an toàn để mở lại. Tạo bài mới rồi thử lại.' });
    }

    const requestedAttemptId = typeof body.attemptId === 'string' ? body.attemptId.trim() : '';
    if (requestedAttemptId && !isSafePracticeId(requestedAttemptId)) return res.status(400).json({ error: 'Mã lượt làm bài không hợp lệ.' });
    let attempt: PracticeAttemptDoc | undefined;
    if (requestedAttemptId) {
      const attemptSnap = await db.collection(PRACTICE_ATTEMPTS_COL).doc(requestedAttemptId).get();
      if (attemptSnap.exists) {
        const candidate = attemptSnap.data() as PracticeAttemptDoc;
        if (candidate.studentId !== link.studentId || candidate.classId !== link.classId || candidate.teacherId !== link.teacherId || candidate.setId !== requestedSetId) {
          return res.status(403).json({ error: 'Lượt làm bài không thuộc tài khoản học sinh này.' });
        }
        attempt = candidate;
      }
    }

    return res.status(200).json({
      setId: requestedSetId,
      questions,
      topics: Array.isArray(set.topics) ? set.topics.map(String) : [],
      ...(Array.isArray(set.skillIds) && set.skillIds.length > 0 ? { skillIds: set.skillIds } : {}),
      createdAt: String(set.createdAt || ''),
      ...(attempt ? { attempt: attemptResponse(attempt) } : {}),
    });
  }

  const profileSnap = await db.collection('studentProfiles').doc(link.studentId).get();
  const profile = (profileSnap.data() || {}) as { classId?: string; teacherId?: string; topics?: Array<{ topic: string; level: string }> };
  if (profileSnap.exists && (profile.classId !== link.classId || profile.teacherId !== link.teacherId)) {
    return res.status(403).json({ error: 'Hồ sơ học tập không thuộc lớp học này.' });
  }
  const topics = (profile.topics || [])
    .filter(t => t.level === 'weak' || t.level === 'developing')
    .map(t => t.topic)
    .slice(0, 3);

  if (topics.length === 0) {
    return res.status(200).json({ setId: '', questions: [], topics: [], createdAt: '', reason: 'Hồ sơ chưa ghi nhận chủ đề nào cần luyện thêm.' });
  }

  const reservation = await reserveQuota(db, link.teacherId, 'self', link.studentId);
  if (reservation.verdict.allowed <= 0) return res.status(429).json({ error: reservation.verdict.reason });

  const classSnap = await db.collection('classes').doc(link.classId).get();
  let raw: string;
  try {
    raw = await callGeminiVision(
      buildPracticePrompt(topics, String(classSnap.data()?.grade || '')),
      [],
      getGradingApiKey(),
      GRADING_MODEL,
      { maxOutputTokens: 6144, jsonMode: true },
    );
  } catch (error) {
    console.error('[grade-homework] practice generation failed', error);
    return res.status(502).json({ error: 'AI chưa tạo được bài luyện. Thử lại sau.' });
  }

  let privateQuestions: ReturnType<typeof parsePracticeQuestions>;
  let publicQuestions: PracticeQuestionPublic[];
  try {
    privateQuestions = parsePracticeQuestions(raw).slice(0, 10);
    publicQuestions = toPublicPracticeQuestions(privateQuestions);
  } catch (error) {
    console.error('[grade-homework] practice output rejected', error);
    return res.status(502).json({ error: 'AI chưa tạo được bài luyện an toàn. Thử lại sau.' });
  }
  if (privateQuestions.length === 0) {
    return res.status(502).json({ error: 'AI chưa tạo được bài luyện có đáp án. Thử lại sau.' });
  }

  const setId = newPracticeId('practice');
  const now = new Date().toISOString();
  const skillIds = skillIdsForTopics(topics);
  const keyQuestions: PracticeQuestionKey[] = privateQuestions.map(question => ({
    id: question.id,
    question: question.question,
    hint: question.hint,
    expectedAnswer: question.solution,
    maxScore: 1,
  }));
  const set: PracticeSetDoc = {
    id: setId,
    studentId: link.studentId,
    classId: link.classId,
    teacherId: link.teacherId,
    topics,
    ...(skillIds.length > 0 ? { skillIds } : {}),
    questions: publicQuestions,
    createdAt: now,
    updatedAt: now,
  };
  const key: PracticeKeyDoc = {
    setId,
    studentId: link.studentId,
    classId: link.classId,
    teacherId: link.teacherId,
    ...(skillIds.length > 0 ? { skillIds } : {}),
    questions: keyQuestions,
    createdAt: now,
  };
  await db.runTransaction(async transaction => {
    transaction.set(db.collection(PRACTICE_KEYS_COL).doc(setId), key);
    transaction.set(db.collection(PRACTICE_SETS_COL).doc(setId), set);
  });

  return res.status(200).json({ setId, questions: publicQuestions, topics, ...(skillIds.length > 0 ? { skillIds } : {}), createdAt: now });
};

const asAnswerMap = (value: unknown, questionIds: Set<string>): Record<string, string> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const result: Record<string, string> = {};
  for (const id of questionIds) {
    const raw = (value as Record<string, unknown>)[id];
    result[id] = typeof raw === 'string' ? raw.trim().slice(0, 20000) : '';
  }
  return result;
};

const attemptResponse = (attempt: PracticeAttemptDoc): Record<string, unknown> => ({
  attemptId: attempt.id,
  setId: attempt.setId,
  status: attempt.status,
  score: attempt.score,
  maxScore: attempt.maxScore,
  feedback: attempt.feedback,
  questionResults: attempt.questionResults,
  evidenceType: attempt.evidenceType,
  ...(Array.isArray(attempt.skillIds) && attempt.skillIds.length > 0 ? { skillIds: attempt.skillIds } : {}),
  errorMessage: attempt.status === 'error' ? 'Chấm bài luyện chưa thành công. Em có thể thử lại.' : undefined,
});

/** Chấm bài luyện bằng private key; tuyệt đối không đọc key từ client hoặc trả key trước khi chấm. */
const handleSubmitPractice = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.' });

  const linkSnap = await db.collection('studentLinks').doc(uid).get();
  if (!linkSnap.exists) return res.status(403).json({ error: 'Chỉ học sinh đã đăng nhập mới nộp bài luyện.' });
  const link = linkSnap.data() as { studentId: string; classId: string; teacherId: string };

  const setId = typeof body.setId === 'string' ? body.setId.trim() : '';
  if (!setId) return res.status(400).json({ error: 'Thiếu mã bài luyện.' });
  if (!isSafePracticeId(setId)) return res.status(400).json({ error: 'Mã bài luyện không hợp lệ.' });

  const setSnap = await db.collection(PRACTICE_SETS_COL).doc(setId).get();
  if (!setSnap.exists) return res.status(404).json({ error: 'Bài luyện không còn tồn tại.' });
  const set = setSnap.data() as PracticeSetDoc;
  if (set.studentId !== link.studentId || set.classId !== link.classId || set.teacherId !== link.teacherId) {
    return res.status(403).json({ error: 'Bài luyện không thuộc tài khoản học sinh này.' });
  }

  const keySnap = await db.collection(PRACTICE_KEYS_COL).doc(setId).get();
  if (!keySnap.exists) return res.status(409).json({ error: 'Bài luyện chưa sẵn sàng để chấm. Thử tạo bài mới.' });
  const key = keySnap.data() as PracticeKeyDoc;
  if (key.studentId !== link.studentId || key.classId !== link.classId || key.teacherId !== link.teacherId) {
    return res.status(403).json({ error: 'Đáp án bài luyện không thuộc tài khoản học sinh này.' });
  }

  const keyQuestions = Array.isArray(key.questions) ? key.questions : [];
  if (keyQuestions.length === 0 || new Set(keyQuestions.map(question => question.id)).size !== keyQuestions.length) {
    return res.status(409).json({ error: 'Đáp án bài luyện không hợp lệ. Tạo bài mới rồi thử lại.' });
  }
  const questionIds = new Set(keyQuestions.map(question => question.id));
  const answers = asAnswerMap(body.answers, questionIds);
  if (!answers) return res.status(400).json({ error: 'Câu trả lời bài luyện không hợp lệ.' });

  const attemptId = typeof body.attemptId === 'string' && body.attemptId.trim()
    ? body.attemptId.trim()
    : newPracticeId('attempt');
  if (!isSafePracticeId(attemptId)) return res.status(400).json({ error: 'Mã lượt làm bài không hợp lệ.' });
  const attemptRef = db.collection(PRACTICE_ATTEMPTS_COL).doc(attemptId);
  const existingSnap = await attemptRef.get();
  if (existingSnap.exists) {
    const existing = existingSnap.data() as PracticeAttemptDoc;
    if (existing.studentId !== link.studentId || existing.setId !== setId) {
      return res.status(403).json({ error: 'Bài làm không thuộc tài khoản học sinh này.' });
    }
    if (existing.status === 'graded') return res.status(200).json(attemptResponse(existing));
    if (existing.status === 'grading' && !isStaleGradingTimestamp(existing.updatedAt)) {
      return res.status(409).json({ error: 'Bài luyện đang được chấm. Chờ một chút rồi tải lại.' });
    }
  }

  type PracticeLockResult =
    | { kind: 'graded'; attempt: PracticeAttemptDoc }
    | { kind: 'locked' }
    | { kind: 'forbidden' }
    | { kind: 'started'; attempt: PracticeAttemptDoc };
  const lockResult: PracticeLockResult = await db.runTransaction(async transaction => {
    const latestSnap = await transaction.get(attemptRef);
    if (latestSnap.exists) {
      const latest = latestSnap.data() as PracticeAttemptDoc;
      if (latest.studentId !== link.studentId || latest.setId !== setId || latest.classId !== link.classId || latest.teacherId !== link.teacherId) {
        return { kind: 'forbidden' };
      }
      if (latest.status === 'graded') return { kind: 'graded', attempt: latest };
      if (latest.status === 'grading' && !isStaleGradingTimestamp(latest.updatedAt)) return { kind: 'locked' };
    }

    const now = new Date().toISOString();
    const baseAttempt: PracticeAttemptDoc = {
      id: attemptId,
      setId,
      studentId: link.studentId,
      classId: link.classId,
      teacherId: link.teacherId,
      ...(Array.isArray(set.skillIds) && set.skillIds.length > 0
        ? { skillIds: set.skillIds.filter(skillId => typeof skillId === 'string').map(String) }
        : {}),
      answers,
      status: 'grading',
      evidenceType: 'practice',
      createdAt: latestSnap.exists ? String((latestSnap.data() as PracticeAttemptDoc).createdAt || now) : now,
      updatedAt: now,
    };
    transaction.set(attemptRef, baseAttempt);
    return { kind: 'started', attempt: baseAttempt };
  });

  if (lockResult.kind === 'forbidden') return res.status(403).json({ error: 'Bài làm không thuộc tài khoản học sinh này.' });
  if (lockResult.kind === 'graded') return res.status(200).json(attemptResponse(lockResult.attempt));
  if (lockResult.kind === 'locked') return res.status(409).json({ error: 'Bài luyện đang được chấm. Chờ một chút rồi tải lại.' });
  const baseAttempt = lockResult.attempt;

  const reservation = await reserveQuota(db, link.teacherId, 'self', link.studentId);
  if (reservation.verdict.allowed <= 0) {
    const blocked: PracticeAttemptDoc = {
      ...baseAttempt,
      status: 'error',
      errorMessage: reservation.verdict.reason,
      updatedAt: new Date().toISOString(),
    };
    await attemptRef.set(blocked);
    return res.status(429).json({ error: reservation.verdict.reason });
  }

  const profileRef = db.collection('studentProfiles').doc(link.studentId);
  try {
    const raw = await callGeminiVision(
      buildPracticeGradingPrompt({
        topics: Array.isArray(set.topics) ? set.topics : [],
        questions: keyQuestions.map(question => ({
          id: question.id,
          question: question.question,
          expectedAnswer: question.expectedAnswer,
          maxScore: question.maxScore,
        })),
        answers,
      }),
      [],
      getGradingApiKey(),
      GRADING_MODEL,
      { maxOutputTokens: 4096, jsonMode: true },
    );
    const assessment = parsePracticeAssessment(raw, keyQuestions.map(question => ({
      id: question.id,
      question: question.question,
      expectedAnswer: question.expectedAnswer,
      maxScore: question.maxScore,
    })));
    const graded: PracticeAttemptDoc = {
      ...baseAttempt,
      status: 'graded',
      score: assessment.score,
      maxScore: assessment.maxScore,
      feedback: assessment.feedback,
      questionResults: assessment.questionResults,
      updatedAt: new Date().toISOString(),
    };

    const finalized = await db.runTransaction(async transaction => {
      const latestSnap = await transaction.get(attemptRef);
      if (!latestSnap.exists) return graded;
      const latest = latestSnap.data() as PracticeAttemptDoc;
      if (latest.status !== 'grading' || latest.updatedAt !== baseAttempt.updatedAt) return latest;

      const profileSnap = await transaction.get(profileRef);
      if (profileSnap.exists) {
        const profileData = (profileSnap.data() || {}) as {
          studentId?: string;
          classId?: string;
          teacherId?: string;
          topics?: ProfileTopic[];
        };
        if (profileData.studentId === link.studentId
          && profileData.classId === link.classId
          && profileData.teacherId === link.teacherId) {
          transaction.set(profileRef, {
            ...profileData,
            topics: applyPracticeEvidence({
              existing: Array.isArray(profileData.topics) ? profileData.topics : [],
              topics: Array.isArray(set.topics) ? set.topics : [],
              attemptId,
              // Practice là tín hiệu formative, không bao giờ có độ tin cậy ngang một grade
              // đã được giáo viên duyệt, kể cả khi học sinh trả lời đúng toàn bộ.
              confidence: assessment.maxScore > 0 ? Math.min(0.5, assessment.score / assessment.maxScore) : 0,
              now: graded.updatedAt,
            }),
            updatedAt: graded.updatedAt,
          }, { merge: true });
        }
      }
      transaction.set(attemptRef, graded);
      return graded;
    });
    const skillEvidence = buildPracticeSkillEvidence({
      attemptId,
      setId,
      skillIds: finalized.skillIds,
      topics: Array.isArray(set.topics) ? set.topics : [],
      score: finalized.score,
      maxScore: finalized.maxScore,
      updatedAt: finalized.updatedAt,
      status: finalized.status,
    });
    if (skillEvidence.length > 0) {
      await upsertSkillEvidenceAndRebuild(db, {
        studentId: link.studentId,
        classId: link.classId,
        teacherId: link.teacherId,
      }, skillEvidence, finalized.updatedAt);
    }
    return res.status(200).json(attemptResponse(finalized));
  } catch (error) {
    const failed: PracticeAttemptDoc = {
      ...baseAttempt,
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Chấm bài luyện thất bại.',
      updatedAt: new Date().toISOString(),
    };
    const persisted = await db.runTransaction(async transaction => {
      const latestSnap = await transaction.get(attemptRef);
      if (!latestSnap.exists) {
        transaction.set(attemptRef, failed);
        return failed;
      }
      const latest = latestSnap.data() as PracticeAttemptDoc;
      if (latest.status !== 'grading' || latest.updatedAt !== baseAttempt.updatedAt) return latest;
      transaction.set(attemptRef, failed);
      return failed;
    });
    return res.status(200).json(attemptResponse(persisted));
  }
};

/**
 * AI giải đề để dựng ĐÁP ÁN NHÁP khi giáo viên không có sẵn.
 *
 * Kết quả trả thẳng về form cho giáo viên SOÁT rồi mới lưu — cố ý không tự ghi vào bài giao.
 * Một đáp án sai ở câu 5 làm cả lớp bị chấm sai câu 5, rồi sai đó nhân tiếp vào hồ sơ từng em.
 * Hai phút giáo viên đọc lại rẻ hơn nhiều so với đi sửa 26 bài đã chấm.
 */
const handleSolveAnswerKey = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập tài khoản giáo viên.' });

  const classId = typeof body.classId === 'string' ? body.classId : '';
  const classSnap = await db.collection('classes').doc(classId).get();
  if (!classSnap.exists || classSnap.data()?.teacherId !== uid) {
    return res.status(403).json({ error: 'Chỉ giáo viên chủ lớp mới dùng được chức năng này.' });
  }

  const examText = String(body.examText || '');
  const rawImages = Array.isArray(body.examImages) ? body.examImages : [];
  const examImages = rawImages
    .slice(0, 3)
    .map(x => parseDataUrl(String(x)))
    .filter((img): img is InlineImage => img !== null);

  if (!examText.trim() && examImages.length === 0) {
    return res.status(400).json({ error: 'Chưa có đề để giải. Tải file đề lên trước đã.' });
  }

  const [quota, quotaRef] = await loadQuotaDoc(db, uid);
  const verdict = remainingQuota(quota, 'teacher', '');
  if (verdict.allowed <= 0) return res.status(429).json({ error: verdict.reason });

  const prompt = buildSolveExamPrompt({
    examText,
    examImageCount: examImages.length,
    maxScore: Number(body.maxScore) || 10,
    gradingInstructions: String(body.gradingInstructions || ''),
  });
  // Giải cả một đề, từng câu kèm các bước — dài hơn hẳn chấm một bài, nên trần phải rộng.
  const raw = await callGeminiVision(prompt, examImages, getGradingApiKey(), GRADING_MODEL, {
    maxOutputTokens: 16384,
    jsonMode: true,
  });
  await quotaRef.set(bumpQuota(quota, 'teacher', '', 1));

  return res.status(200).json(parseSolvedAnswerKey(raw));
};

/** AI đề xuất hướng dẫn chấm từ đáp án đã có. Chỉ là văn bản nên nhẹ hơn hẳn việc giải đề. */
const handleSuggestRubric = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập tài khoản giáo viên.' });

  const classId = typeof body.classId === 'string' ? body.classId : '';
  const classSnap = await db.collection('classes').doc(classId).get();
  if (!classSnap.exists || classSnap.data()?.teacherId !== uid) {
    return res.status(403).json({ error: 'Chỉ giáo viên chủ lớp mới dùng được chức năng này.' });
  }

  const answerKey = String(body.answerKey || '').trim();
  if (!answerKey) {
    return res.status(400).json({ error: 'Cần có đáp án trước đã. Hướng dẫn chấm là cách chia điểm CHO đáp án đó.' });
  }

  const [quota, quotaRef] = await loadQuotaDoc(db, uid);
  const verdict = remainingQuota(quota, 'teacher', '');
  if (verdict.allowed <= 0) return res.status(429).json({ error: verdict.reason });

  const raw = await callGeminiVision(
    buildRubricPrompt(answerKey, Number(body.maxScore) || 10, String(body.gradingInstructions || '')),
    [],
    getGradingApiKey(),
    GRADING_MODEL,
    { maxOutputTokens: 8192, jsonMode: true },
  );
  await quotaRef.set(bumpQuota(quota, 'teacher', '', 1));

  return res.status(200).json({ rubric: parseRubric(raw) });
};

/** AI viết lại nhận xét gửi học sinh, bám theo lời giáo viên. Chỉ văn bản nên nhẹ. */
const handleRewriteFeedback = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập tài khoản giáo viên.' });

  const classId = typeof body.classId === 'string' ? body.classId : '';
  const classSnap = await db.collection('classes').doc(classId).get();
  if (!classSnap.exists || classSnap.data()?.teacherId !== uid) {
    return res.status(403).json({ error: 'Chỉ giáo viên chủ lớp mới dùng được chức năng này.' });
  }

  const teacherNote = String(body.teacherNote || '').trim();
  if (!teacherNote) {
    return res.status(400).json({ error: 'Thầy cô viết nhận xét của mình trước đã — AI chỉ diễn đạt lại cho em dễ đọc.' });
  }

  const [quota, quotaRef] = await loadQuotaDoc(db, uid);
  const verdict = remainingQuota(quota, 'teacher', '');
  if (verdict.allowed <= 0) return res.status(429).json({ error: verdict.reason });

  const raw = await callGeminiVision(
    buildRewriteFeedbackPrompt({
      teacherNote,
      currentFeedback: String(body.currentFeedback || ''),
      score: Number(body.score) || 0,
      maxScore: Number(body.maxScore) || 10,
      weakTopics: Array.isArray(body.weakTopics) ? body.weakTopics.map(String) : [],
    }),
    [],
    getGradingApiKey(),
    GRADING_MODEL,
    { maxOutputTokens: 2048, jsonMode: true },
  );
  await quotaRef.set(bumpQuota(quota, 'teacher', '', 1));

  return res.status(200).json({ feedback: parseRewrittenFeedback(raw) });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Chỉ nhận POST' });
  }

  const body = readBody(req);
  const action = String(body.action || '');

  try {
    // Gateway đặt TRƯỚC khi init Admin: lỗi cấu hình Firebase phải trả lỗi của gateway
    // (nó tự khởi tạo Admin khi cần), chứ không nuốt vào 500 chung của route chấm bài.
    if (action === 'aiGateway') return await handleAiGateway(req, res);
    const db = getAdminDb();
    if (action === 'gradeAssignment') return await handleGradeAssignment(db, body, res);
    if (action === 'gradeOne') return await handleGradeOne(db, body, res);
    if (action === 'practice') return await handlePractice(db, body, res);
    if (action === 'submitPractice') return await handleSubmitPractice(db, body, res);
    if (action === 'solveAnswerKey') return await handleSolveAnswerKey(db, body, res);
    if (action === 'suggestRubric') return await handleSuggestRubric(db, body, res);
    if (action === 'rewriteFeedback') return await handleRewriteFeedback(db, body, res);
    return res.status(400).json({ error: `Hành động không hợp lệ: ${action}`, limits: QUOTA_LIMITS });
  } catch (error) {
    console.error('[grade-homework] lỗi', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Máy chủ gặp lỗi khi chấm bài.',
    });
  }
}
