/**
 * LÀM RÕ VỚI HỌC SINH (phía máy chủ): xem `src/lib/classroom/clarification.ts`.
 *
 * - `applyClarification`: ngay sau khi máy chấm xong một bài học sinh TỰ nộp, đánh dấu câu máy đọc chưa chắc để hỏi lại.
 * - `clarifyAnswers` (action): học sinh gửi đáp án gõ tay / chọn bỏ qua cho các câu đang `open`. Chấm tất định, không gọi AI.
 *   Mỗi lần gửi được LƯU NGAY — em thoát giữa chừng thì lần sau vào làm tiếp, phần đã xác nhận không mất.
 * - Tới khi MỌI câu được làm rõ (hoặc bỏ qua) mới đồng bộ minh chứng vào hồ sơ học tập (trước đó điểm còn tạm).
 */
import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import {
  answerClarifyRow, buildClarifyRows, canonicalAnswer, clarifyEnabledFor, pendingClarifyCount, skipClarifyRow,
} from '../src/lib/classroom/clarification.js';
import { recomputeTotal } from '../src/lib/classroom/questionRescore.js';
import type { QuestionResult, SubmissionDoc, SubmissionGrade } from '../src/lib/classroom/types.js';
import { syncApprovedGradeEvidence } from './_skill-profile.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

/** Trần số câu xử lý mỗi lần gửi (một bài tối đa 100 câu theo bộ đọc kết quả chấm). */
const MAX_ITEMS_PER_CALL = 100;

const uidFromIdToken = async (idToken: unknown): Promise<string | null> => {
  if (typeof idToken !== 'string' || !idToken) return null;
  try {
    return (await getAuth().verifyIdToken(idToken)).uid;
  } catch {
    return null;
  }
};

/**
 * Bài vừa được MÁY chấm cho học sinh tự nộp: nếu lớp bật tính năng thì đánh dấu các câu chưa chắc để hỏi lại.
 * Không phải học sinh tự chấm, hoặc lớp chưa bật, hoặc không có câu nào chưa chắc → trả nguyên điểm, `asked = 0`.
 */
export const applyClarification = async (
  db: Db,
  submission: Pick<SubmissionDoc, 'classId'>,
  grade: SubmissionGrade,
  isStudentActor: boolean,
): Promise<{ grade: SubmissionGrade; asked: number }> => {
  const rows = grade.questionResults;
  if (!isStudentActor || !rows || rows.length === 0) return { grade, asked: 0 };
  const classSnap = await db.collection('classes').doc(String(submission.classId || '')).get();
  if (!clarifyEnabledFor(classSnap.exists ? classSnap.data() : null)) return { grade, asked: 0 };
  const { rows: marked, asked } = buildClarifyRows(rows);
  return asked === 0 ? { grade, asked: 0 } : { grade: { ...grade, questionResults: marked }, asked };
};

interface Rejected { questionNumber: string; reason: string }

/** Học sinh gửi đáp án: `answers: [{ questionNumber, answer }]`, `skip: [questionNumber]` (để thầy cô xem). */
const handleClarifyAnswers = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return void res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.' });
  const submissionId = typeof body.submissionId === 'string' ? body.submissionId : '';
  if (!submissionId || submissionId.includes('/')) return void res.status(400).json({ error: 'Thiếu mã bài nộp.' });
  const answers = Array.isArray(body.answers) ? body.answers.slice(0, MAX_ITEMS_PER_CALL) : [];
  const skips = Array.isArray(body.skip) ? body.skip.slice(0, MAX_ITEMS_PER_CALL) : [];
  if (answers.length === 0 && skips.length === 0) return void res.status(400).json({ error: 'Chưa có câu nào để gửi.' });

  const ref = db.collection('submissions').doc(submissionId);
  const first = await ref.get();
  if (!first.exists) return void res.status(404).json({ error: 'Không tìm thấy bài nộp.' });
  const data = first.data() as FirebaseFirestore.DocumentData;
  const linkSnap = await db.collection('studentLinks').doc(uid).get();
  const link = linkSnap.exists ? linkSnap.data() as FirebaseFirestore.DocumentData : null;
  if (!link || link.studentId !== data.studentId || link.classId !== data.classId || link.teacherId !== data.teacherId) {
    return void res.status(403).json({ error: 'Không có quyền với bài này.' });
  }

  const rejected: Rejected[] = [];
  let outcome: { grade: SubmissionGrade; before: number; after: number; previous: SubmissionDoc } | null = null;
  await db.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    if (!snap.exists) return;
    const current = { id: submissionId, ...snap.data() } as SubmissionDoc;
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
      if (!canonical.ok) { rejected.push({ questionNumber: label, reason: canonical.error }); continue; }
      const next = answerClarifyRow(q, canonical.value, now);
      if (next) rows[index] = next;
    }
    for (const item of skips) {
      const index = indexOf(item);
      if (index < 0) { rejected.push({ questionNumber: String(item ?? ''), reason: 'Không có câu này.' }); continue; }
      const next = skipClarifyRow(rows[index], now);
      if (next) rows[index] = next;
      else rejected.push({ questionNumber: String(item), reason: 'Câu này đã xong.' });
    }
    const before = pendingClarifyCount(grade.questionResults);
    const after = pendingClarifyCount(rows);
    const nextGrade: SubmissionGrade = { ...grade, questionResults: rows, score: recomputeTotal(grade, rows) };
    transaction.update(ref, { grade: nextGrade, updatedAt: now });
    outcome = { grade: nextGrade, before, after, previous: current };
  });

  const done = outcome as { grade: SubmissionGrade; before: number; after: number; previous: SubmissionDoc } | null;
  if (done && done.before > 0 && done.after === 0 && done.grade.teacherApproved) {
    // Mọi câu đã làm rõ → điểm chốt → mới ghi vào hồ sơ học tập (trước đó điểm còn tạm).
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
  }
  res.status(200).json({ pending: done ? done.after : null, rejected });
};

export const handleClarifyAction = async (db: Db, body: Body, res: VercelResponse): Promise<boolean> => {
  if (body.action === 'clarifyAnswers') { await handleClarifyAnswers(db, body, res); return true; }
  return false;
};
