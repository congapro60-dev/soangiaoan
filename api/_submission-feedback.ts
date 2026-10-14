import type { VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import type { SubmissionDoc, SubmissionFeedbackDoc, SubmissionFeedbackSummary } from '../src/lib/classroom/types.js';
import { awaitsClarification } from '../src/lib/classroom/clarification.js';
import { assertActorCurrent, authorizeSubmissionActor, SubmissionAccessError } from './_submission-actors.js';
type Db = FirebaseFirestore.Firestore;
type Data = FirebaseFirestore.DocumentData;
const message = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 2000) throw new SubmissionAccessError(422, 'Lời nhắn cần từ 1 đến 2000 ký tự.');
  return value.trim();
};
const owns = (submission: SubmissionDoc, current: Data) => submission.studentId === current.studentId && submission.classId === current.classId && submission.teacherId === current.teacherId;
export const isPublishedSubmission = (submission: SubmissionDoc): boolean => submission.status === 'graded' && !!submission.grade && !awaitsClarification(submission.grade.questionResults) && (!submission.assignmentId || submission.grade.teacherApproved === true);
export const handleSubmissionFeedbackAction = async (db: Db, body: Data, res: VercelResponse): Promise<boolean> => {
  if (!['submissionFeedback', 'sendSubmissionFeedback', 'replySubmissionFeedback', 'readSubmissionFeedback'].includes(body.action)) return false;
  try {
    const auth = await authorizeSubmissionActor(db, body, res);
    if (!auth) return true;
    const { actor, submission, submissionId } = auth;
    if (actor.role === 'parent') throw new SubmissionAccessError(403, 'Trao đổi bài chấm dành cho học sinh và giáo viên.');
    const submissionRef = db.collection('submissions').doc(submissionId);
    if (body.action === 'submissionFeedback') {
      await db.runTransaction(tx => assertActorCurrent(db, tx, actor, submission.assignmentId));
      const docs = await db.collection('submissionFeedback').where('submissionId', '==', submissionId).get();
      res.status(200).json({ feedback: docs.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(doc => owns(submission, doc)).sort((a: Data, b: Data) => a.createdAt.localeCompare(b.createdAt)) }); return true;
    }
    if (body.action === 'readSubmissionFeedback') {
      if (actor.role !== 'student') throw new SubmissionAccessError(403, 'Chỉ học sinh xác nhận đã đọc.');
      await db.runTransaction(async tx => { await assertActorCurrent(db, tx, actor, submission.assignmentId); const fresh = await tx.get(submissionRef); if (!fresh.exists || !owns(submission, fresh.data()!)) throw new SubmissionAccessError(409, 'Bài nộp đã thay đổi.'); const observed = typeof body.lastReplyAt === 'string' ? body.lastReplyAt : ''; const latest = fresh.data()?.feedbackSummary?.lastReplyAt || ''; if (!observed || observed > latest) throw new SubmissionAccessError(422, 'Mốc đã đọc không hợp lệ.'); tx.update(submissionRef, { feedbackReadAt: observed > (fresh.data()?.feedbackReadAt || '') ? observed : (fresh.data()?.feedbackReadAt || '') }); });
      res.status(200).json({ read: true }); return true;
    }
    const now = new Date().toISOString();
    let result: SubmissionFeedbackDoc | undefined;
    await db.runTransaction(async tx => {
      await assertActorCurrent(db, tx, actor, submission.assignmentId);
      const fresh = await tx.get(submissionRef), current = { id: submissionId, ...fresh.data() } as SubmissionDoc;
      if (!fresh.exists || !owns(submission, current)) throw new SubmissionAccessError(409, 'Bài nộp đã thay đổi.');
      const summary: SubmissionFeedbackSummary = { pending: Number(current.feedbackSummary?.pending) || 0, replies: Number(current.feedbackSummary?.replies) || 0, ...(current.feedbackSummary?.lastReplyAt ? { lastReplyAt: current.feedbackSummary.lastReplyAt } : {}) };
      if (body.action === 'sendSubmissionFeedback') {
        if (actor.role !== 'student') throw new SubmissionAccessError(403, 'Chỉ học sinh gửi phản hồi bài của mình.');
        if (!isPublishedSubmission(current)) throw new SubmissionAccessError(409, 'Chờ bài chấm được công bố trước khi phản hồi.');
        const questionNumber = typeof body.questionNumber === 'string' ? body.questionNumber.trim() : '';
        if (questionNumber && !current.grade?.questionResults?.some(row => row.questionNumber === questionNumber)) throw new SubmissionAccessError(422, 'Không có câu này trong bài chấm.');
        const id = randomUUID();
        result = { id, submissionId, studentId: actor.studentId, classId: actor.classId, teacherId: actor.teacherId, ...(questionNumber ? { questionNumber } : {}), status: 'pending', messages: [{ id: randomUUID(), role: 'student', text: message(body.message), at: now }], createdAt: now, updatedAt: now };
        tx.create(db.collection('submissionFeedback').doc(id), result); summary.pending += 1;
      } else {
        if (actor.role !== 'teacher') throw new SubmissionAccessError(403, 'Chỉ giáo viên trả lời phản hồi.');
        if (typeof body.feedbackId !== 'string' || !body.feedbackId || body.feedbackId.includes('/')) throw new SubmissionAccessError(422, 'Thiếu mã phản hồi.');
        const ref = db.collection('submissionFeedback').doc(body.feedbackId), previous = (await tx.get(ref)).data() as SubmissionFeedbackDoc | undefined;
        if (!previous || previous.submissionId !== submissionId || !owns(submission, previous)) throw new SubmissionAccessError(404, 'Không tìm thấy phản hồi trong bài này.');
        const reply = typeof body.message === 'string' && body.message.trim() ? message(body.message) : '';
        if (!reply && body.resolved !== true) throw new SubmissionAccessError(422, 'Nhập câu trả lời hoặc đánh dấu đã xử lý.');
        // ponytail: thread tối đa 100 lời nhắn; chuyển sang subcollection nếu cần trao đổi dài hơn.
        if (previous.messages.length >= 100 && reply) throw new SubmissionAccessError(422, 'Cuộc trao đổi đã dài. Tạo phản hồi mới để tiếp tục.');
        result = { ...previous, status: body.resolved === true ? 'resolved' : 'answered', messages: [...previous.messages, ...(reply ? [{ id: randomUUID(), role: 'teacher' as const, text: reply, at: now }] : [])], updatedAt: now };
        if (previous.status === 'pending') summary.pending = Math.max(0, summary.pending - 1);
        if (reply) { summary.replies += 1; summary.lastReplyAt = now; }
        tx.update(ref, { ...result });
      }
      tx.update(submissionRef, { feedbackSummary: summary });
    });
    res.status(200).json({ feedback: result }); return true;
  } catch (reason) { if (reason instanceof SubmissionAccessError) { res.status(reason.statusCode).json({ error: reason.message }); return true; } throw reason; }
};
