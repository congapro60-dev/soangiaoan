/**
 * LÀM RÕ VỚI HỌC SINH (phía máy chủ): xem `src/lib/classroom/clarification.ts`.
 *
 * - `applyClarification`: ngay sau khi máy chấm xong một bài học sinh TỰ nộp, đánh dấu câu máy đọc chưa chắc để hỏi lại.
 * - `clarifyAnswers` (action): học sinh gửi đáp án gõ tay / chọn bỏ qua cho các câu đang `open`. Chấm tất định, không gọi AI.
 *   Mỗi lần gửi được LƯU NGAY — em thoát giữa chừng thì lần sau vào làm tiếp, phần đã xác nhận không mất.
 * - `clarifyPhoto` (action): câu tự luận — em chụp lại bài làm của đúng câu đó. Ảnh được LƯU NGAY vào câu rồi máy chấm lại
 *   riêng câu ấy ở nền (em tắt máy vẫn xong). Ảnh không bao giờ bị xoá; chấm lỗi thì em bấm thử lại, không phải chụp lại.
 * - Tới khi MỌI câu được làm rõ (hoặc bỏ qua) mới đồng bộ minh chứng vào hồ sơ học tập (trước đó điểm còn tạm).
 */
import type { VercelResponse } from '@vercel/node';
import { actorStamp, assertActorCurrent, authorizeSubmissionActor, discardActorFiles, consumeActorGrant, prepareActorFiles, SubmissionAccessError } from './_submission-actors.js';
import {
  answerClarifyRow, buildClarifyRows, canonicalAnswer, failPhotoRegrade, finishPhotoRegrade,
  isOwnClarifyPhotoUrl, pendingClarifyCount, skipClarifyRow, startPhotoRegrade,
} from '../src/lib/classroom/clarification.js';
import { recomputeTotal } from '../src/lib/classroom/questionRescore.js';
import type { QuestionResult, SubmissionDoc, SubmissionGrade } from '../src/lib/classroom/types.js';
import { syncApprovedGradeEvidence } from './_skill-profile.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

/** Trần số câu xử lý mỗi lần gửi (một bài tối đa 100 câu theo bộ đọc kết quả chấm). */
const MAX_ITEMS_PER_CALL = 100;
/** Số ảnh em gửi cho một câu trong một lần. */
const MAX_PHOTOS_PER_CALL = 8;

/**
 * Bài vừa được MÁY chấm lần đầu: đánh dấu các câu máy đọc chưa chắc để hỏi lại học sinh (luôn bật, không cần công tắc lớp).
 * `shouldAsk` = false (chấm lại về sau do thầy cô quyết định) hoặc không có câu nào chưa chắc → trả nguyên điểm, `asked = 0`.
 */
export const applyClarification = async (
  db: Db,
  submission: Pick<SubmissionDoc, 'classId'>,
  grade: SubmissionGrade,
  shouldAsk: boolean,
): Promise<{ grade: SubmissionGrade; asked: number }> => {
  const rows = grade.questionResults;
  if (!shouldAsk || !rows || rows.length === 0) return { grade, asked: 0 };
  const { rows: marked, asked } = buildClarifyRows(rows);
  return asked === 0 ? { grade, asked: 0 } : { grade: { ...grade, questionResults: marked }, asked };
};

interface Rejected { questionNumber: string; reason: string }

/** Việc cần máy chủ hỗ trợ từ `grade-homework.ts` (chấm lại một câu bằng AI, chạy nền). */
export interface ClarifyDeps {
  regradeQuestion: (submission: SubmissionDoc, question: QuestionResult) => Promise<QuestionResult>;
  /** Chạy việc nền sau khi đã trả lời em; false nếu nền tảng không hỗ trợ (khi đó chờ xong rồi mới trả lời). */
  runInBackground: (work: Promise<unknown>) => boolean;
}

interface Outcome { grade: SubmissionGrade; before: number; after: number; previous: SubmissionDoc }

/** Xác thực phiên em + đúng chủ bài nộp. Trả null (đã trả lỗi) nếu không hợp lệ. */
const authorizeStudent = authorizeSubmissionActor;

/** Mọi câu đã làm rõ → điểm chốt → mới ghi vào hồ sơ học tập (trước đó điểm còn tạm). */
const syncIfFinished = async (db: Db, submissionId: string, done: Outcome | null): Promise<void> => {
  if (!done || done.before <= 0 || done.after !== 0 || !done.grade.teacherApproved) return;
  const ref = db.collection('submissions').doc(submissionId);
  try {
    await syncApprovedGradeEvidence(db, {
      submissionId,
      assignmentId: done.previous.assignmentId,
      grade: done.grade,
      owner: { studentId: done.previous.studentId, classId: done.previous.classId, teacherId: done.previous.teacherId },
      now: new Date().toISOString(),
      approved: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Đồng bộ minh chứng thất bại';
    await ref.update({ evidenceSyncError: message }).catch(() => undefined);
  }
};

/** Học sinh gửi đáp án: `answers: [{ questionNumber, answer }]`, `skip: [questionNumber]` (để thầy cô xem). */
const handleClarifyAnswers = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const auth = await authorizeStudent(db, body, res);
  if (!auth) return;
  const { submissionId } = auth;
  const answers = Array.isArray(body.answers) ? body.answers.slice(0, MAX_ITEMS_PER_CALL) : [];
  const skips = Array.isArray(body.skip) ? body.skip.slice(0, MAX_ITEMS_PER_CALL) : [];
  if (answers.length === 0 && skips.length === 0) return void res.status(400).json({ error: 'Chưa có câu nào để gửi.' });

  const ref = db.collection('submissions').doc(submissionId);
  const rejected: Rejected[] = [];
  let outcome: Outcome | null = null;
  await db.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    if (!snap.exists) return;
    const current = { id: submissionId, ...snap.data() } as SubmissionDoc;
    if (current.studentId !== auth.actor.studentId || current.classId !== auth.actor.classId || current.teacherId !== auth.actor.teacherId) throw new SubmissionAccessError(403, 'Bài nộp không thuộc tài khoản này.');
    await assertActorCurrent(db, transaction, auth.actor, current.assignmentId, true);
    const grade = current.grade;
    if (current.status !== 'graded' || !grade?.questionResults) {
      rejected.push({ questionNumber: '', reason: 'Bài chưa chấm xong hoặc đã đổi — em tải lại trang rồi thử lại.' });
      return;
    }
    const now = new Date().toISOString();
    const rows: QuestionResult[] = [...grade.questionResults];
    const indexOf = (questionNumber: unknown) => rows.findIndex(q => q.questionNumber === questionNumber);
    for (const item of answers) {
      const entry = (item && typeof item === 'object' ? item : {}) as { questionNumber?: unknown; answer?: unknown };
      const index = indexOf(entry.questionNumber);
      const label = String(entry.questionNumber ?? '');
      if (index < 0) { rejected.push({ questionNumber: label, reason: 'Không có câu này.' }); continue; }
      const q = rows[index];
      if (!q.clarify || q.clarify.state !== 'open' || q.clarify.kind === 'photo') { rejected.push({ questionNumber: label, reason: 'Câu này đã được trả lời hoặc không cần gõ.' }); continue; }
      const canonical = canonicalAnswer(q.clarify.kind, entry.answer, q.clarify.parts);
      if (canonical.ok === false) { rejected.push({ questionNumber: label, reason: canonical.error }); continue; }
      const next = answerClarifyRow(q, canonical.value, now);
      if (next) rows[index] = { ...next, clarify: next.clarify ? { ...next.clarify, confirmedBy: actorStamp(auth.actor, now) } : undefined };
    }
    for (const item of skips) {
      const index = indexOf(item);
      if (index < 0) { rejected.push({ questionNumber: String(item ?? ''), reason: 'Không có câu này.' }); continue; }
      const next = skipClarifyRow(rows[index], now);
      if (next) rows[index] = { ...next, clarify: next.clarify ? { ...next.clarify, confirmedBy: actorStamp(auth.actor, now) } : undefined };
      else rejected.push({ questionNumber: String(item), reason: 'Câu này đã xong.' });
    }
    const before = pendingClarifyCount(grade.questionResults);
    const after = pendingClarifyCount(rows);
    const nextGrade: SubmissionGrade = { ...grade, questionResults: rows, score: recomputeTotal(grade, rows) };
    transaction.update(ref, { grade: nextGrade, updatedAt: now });
    outcome = { grade: nextGrade, before, after, previous: current };
  });


  const done = outcome as Outcome | null;
  await syncIfFinished(db, submissionId, done);
  res.status(200).json({ pending: done ? done.after : null, rejected });
};

/**
 * Câu tự luận: em gửi ảnh chụp lại (hoặc bấm "thử lại" không kèm ảnh mới khi lượt chấm trước lỗi).
 * Lưu ảnh vào câu + đặt `regrading` NGAY trong một giao dịch, rồi chấm lại riêng câu đó ở nền.
 */
const handleClarifyPhoto = async (db: Db, body: Body, res: VercelResponse, deps: ClarifyDeps): Promise<void> => {
  const auth = await authorizeStudent(db, body, res);
  if (!auth) return;
  const { submissionId } = auth;
  const questionNumber = typeof body.questionNumber === 'string' ? body.questionNumber : '';
  if (!questionNumber) return void res.status(400).json({ error: 'Thiếu số câu.' });
  await db.runTransaction(tx => assertActorCurrent(db, tx, auth.actor, auth.submission.assignmentId, true));
  const rawUrls = Array.isArray(body.photoUrls) ? body.photoUrls.slice(0, MAX_PHOTOS_PER_CALL) : [];
  if (!body.uploadGrantId && rawUrls.some(url => !isOwnClarifyPhotoUrl(url, auth.actor.uid || ''))) return void res.status(400).json({ error: 'Ảnh không hợp lệ. Chọn ảnh rồi gửi lại.' });
  const prepared = rawUrls.length || body.uploadGrantId ? await prepareActorFiles(db, { ...body, fileUrls: rawUrls }, auth.actor, auth.submission.assignmentId, 'clarification') : null;
  const urls = prepared?.fileUrls || [];

  const ref = db.collection('submissions').doc(submissionId);
  const startedAt = new Date().toISOString();
  let claimed: { submission: SubmissionDoc; question: QuestionResult } | null = null;
  let refusal = '';
  try { await db.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    if (!snap.exists) { refusal = 'Không tìm thấy bài nộp.'; return; }
    const current = { id: submissionId, ...snap.data() } as SubmissionDoc;
    if (current.studentId !== auth.actor.studentId || current.classId !== auth.actor.classId || current.teacherId !== auth.actor.teacherId) throw new SubmissionAccessError(403, 'Bài nộp không thuộc tài khoản này.');
    await assertActorCurrent(db, transaction, auth.actor, current.assignmentId, true);
    const grantRef = prepared ? await consumeActorGrant(db, transaction, prepared, auth.actor, current.assignmentId, 'clarification') : undefined;
    const rows = current.grade?.questionResults;
    const index = rows ? rows.findIndex(q => q.questionNumber === questionNumber) : -1;
    if (current.status !== 'graded' || !current.grade || !rows || index < 0) { refusal = 'Bài chưa chấm xong hoặc đã đổi — em tải lại trang rồi thử lại.'; return; }
    const step = startPhotoRegrade(rows[index], urls, startedAt, Date.now());
    if (step.ok === false) { refusal = step.error; return; }
    step.row = { ...step.row, clarify: step.row.clarify ? { ...step.row.clarify, confirmedBy: actorStamp(auth.actor, startedAt) } : undefined };
    const nextRows = rows.map((q, i) => (i === index ? step.row : q));
    transaction.update(ref, { grade: { ...current.grade, questionResults: nextRows }, updatedAt: startedAt });
    if (grantRef) transaction.update(grantRef, { consumed: true, consumedAt: startedAt, submissionId, questionNumber });
    claimed = { submission: current, question: step.row };
  });
  } catch (reason) { if (prepared) await discardActorFiles(prepared); throw reason; }
  const taken = claimed as { submission: SubmissionDoc; question: QuestionResult } | null;
  if (!taken && prepared) await discardActorFiles(prepared);
  if (!taken) return void res.status(409).json({ error: refusal || 'Chưa gửi được ảnh.' });

  const work = (async () => {
    let regraded: QuestionResult | null = null;
    try {
      regraded = await deps.regradeQuestion(taken.submission, taken.question);
    } catch (error) {
      console.error('[clarify] chấm lại câu từ ảnh hỏng', { submissionId, questionNumber, error });
    }
    const finishedAt = new Date().toISOString();
    let outcome: Outcome | null = null;
    await db.runTransaction(async transaction => {
      const snap = await transaction.get(ref);
      if (!snap.exists) return;
      const current = { id: submissionId, ...snap.data() } as SubmissionDoc;
      const grade = current.grade;
      const rows = grade?.questionResults;
      const index = rows ? rows.findIndex(q => q.questionNumber === questionNumber) : -1;
      // Chỉ ghi nếu câu VẪN ở đúng lượt chấm lại này — em bỏ qua / thầy cô chốt / lượt khác thay thế thì bỏ kết quả.
      if (!grade || !rows || index < 0 || rows[index].clarify?.state !== 'regrading' || rows[index].clarify?.at !== startedAt) return;
      const next = regraded ? finishPhotoRegrade(rows[index], regraded, finishedAt) : failPhotoRegrade(rows[index], finishedAt);
      const nextRows = rows.map((q, i) => (i === index ? next : q));
      const nextGrade: SubmissionGrade = { ...grade, questionResults: nextRows, score: recomputeTotal(grade, nextRows) };
      transaction.update(ref, { grade: nextGrade, updatedAt: finishedAt });
      outcome = { grade: nextGrade, before: pendingClarifyCount(rows), after: pendingClarifyCount(nextRows), previous: current };
    });
    await syncIfFinished(db, submissionId, outcome as Outcome | null);
  })().catch(error => console.error('[clarify] ghi kết quả chấm lại hỏng', { submissionId, questionNumber, error }));

  if (deps.runInBackground(work)) return void res.status(202).json({ regrading: true });
  await work;
  const latest = await ref.get();
  const rows = (latest.data() as { grade?: SubmissionGrade } | undefined)?.grade?.questionResults;
  res.status(200).json({ pending: pendingClarifyCount(rows), regrading: false });
};

export const handleClarifyAction = async (db: Db, body: Body, res: VercelResponse, deps: ClarifyDeps): Promise<boolean> => {
  try {
    if (body.action === 'clarifyAnswers') { await handleClarifyAnswers(db, body, res); return true; }
    if (body.action === 'clarifyPhoto') { await handleClarifyPhoto(db, body, res, deps); return true; }
    return false;
  } catch (reason) {
    if (reason instanceof SubmissionAccessError) { res.status(reason.statusCode).json({ error: reason.message }); return true; }
    throw reason;
  }
};
