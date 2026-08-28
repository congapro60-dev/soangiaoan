import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { stripAnswerKey } from './_exam-core.js';
import {
  buildExamContentSnapshot,
  type ExamContentSnapshot,
} from '../src/lib/classroom/activitySnapshot.js';
import {
  evaluateStudentExamStart,
  findResumableExamAttempt,
  type StudentExamAssignmentPolicy,
  type StudentExamAttemptContext,
  type StudentExamDefinitionPolicy,
  type VerifiedStudentLink,
} from '../src/lib/classroom/studentExamPolicy.js';
import type { Exam, ExamQuestion, ExamSubmission, StudentAnswer } from '../src/types.js';
import type { StudentAssignmentView, StudentActivityExportBundle } from '../src/lib/classroom/types.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

interface ResponseLike {
  status(code: number): ResponseLike;
  json(payload: unknown): ResponseLike;
}

interface StudentOnlineContext {
  uid: string;
  link: VerifiedStudentLink;
  classData: FirebaseFirestore.DocumentData;
  studentData: FirebaseFirestore.DocumentData;
  assignmentRef: FirebaseFirestore.DocumentReference;
  assignment: FirebaseFirestore.DocumentData;
  examRef: FirebaseFirestore.DocumentReference;
  exam: FirebaseFirestore.DocumentData;
  snapshot: ExamContentSnapshot;
}

interface StoredOnlineAttempt extends StudentExamAttemptContext {
  examId?: string;
  examCode?: string;
  studentName?: string;
  studentClass?: string;
  answers?: unknown;
  maxScore?: number;
  contentVersion?: string;
  contentHash?: string;
  attemptNumber?: number;
  submittedAt?: string;
  tabSwitches?: number;
  lastSubmitNonce?: string;
  activityPurpose?: string;
  gradeState?: string;
  gradingSource?: string;
}

class ClassroomOnlineError extends Error {
  constructor(readonly statusCode: number, message: string) {
    super(message);
    this.name = 'ClassroomOnlineError';
  }
}

const nowIso = (): string => new Date().toISOString();

const validId = (value: unknown): value is string => (
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 200 && !value.includes('/')
);

const finiteNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const asString = (value: unknown): string => typeof value === 'string' ? value : '';

const verifyStudentUid = async (idToken: unknown): Promise<string> => {
  if (typeof idToken !== 'string' || !idToken.trim()) {
    throw new ClassroomOnlineError(401, 'Phiên đăng nhập học sinh không hợp lệ.');
  }
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    if (!decoded.uid) throw new Error('missing uid');
    return decoded.uid;
  } catch {
    throw new ClassroomOnlineError(401, 'Phiên đăng nhập học sinh không hợp lệ.');
  }
};

const readDocData = async (
  ref: FirebaseFirestore.DocumentReference,
  notFoundMessage: string,
): Promise<FirebaseFirestore.DocumentData> => {
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new ClassroomOnlineError(404, notFoundMessage);
  return snapshot.data() || {};
};

const readStudentLink = async (db: Db, uid: string): Promise<VerifiedStudentLink> => {
  const link = await readDocData(db.collection('studentLinks').doc(uid), 'Phiên học sinh chưa được xác nhận. Hãy đăng nhập lại bằng mã lớp và PIN.');
  const result: VerifiedStudentLink = {
    uid,
    studentId: asString(link.studentId).trim(),
    classId: asString(link.classId).trim(),
    teacherId: asString(link.teacherId).trim(),
  };
  if (!result.studentId || !result.classId || !result.teacherId) {
    throw new ClassroomOnlineError(403, 'Phiên học sinh thiếu thông tin lớp.');
  }
  return result;
};

const exportBundleForStudent = (value: unknown): StudentActivityExportBundle | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  if (!['pending', 'ready', 'error'].includes(String(raw.status))) return undefined;
  if (!asString(raw.contentVersion) || !asString(raw.contentHash)) return undefined;
  return {
    status: raw.status as StudentActivityExportBundle['status'],
    contentVersion: asString(raw.contentVersion),
    contentHash: asString(raw.contentHash),
    ...(asString(raw.studentPdfUrl) ? { studentPdfUrl: asString(raw.studentPdfUrl) } : {}),
    ...(asString(raw.studentDocxUrl) ? { studentDocxUrl: asString(raw.studentDocxUrl) } : {}),
    ...(asString(raw.generatedAt) ? { generatedAt: asString(raw.generatedAt) } : {}),
  };
};

const assignmentProjection = (id: string, data: FirebaseFirestore.DocumentData): StudentAssignmentView => {
  const attachments = Array.isArray(data.attachments)
    ? data.attachments
      .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
      .map(item => ({
        name: asString(item.name),
        url: asString(item.url),
        ...(asString(item.mimeType) ? { mimeType: asString(item.mimeType) } : {}),
        ...(finiteNumber(item.size) !== null ? { size: finiteNumber(item.size)! } : {}),
      }))
      .filter(item => item.name && item.url)
    : [];

  return {
    id,
    teacherId: asString(data.teacherId),
    classId: asString(data.classId),
    title: asString(data.title),
    description: asString(data.description),
    type: 'exam',
    ...(asString(data.examId) ? { examId: asString(data.examId) } : {}),
    ...(asString(data.dueAt) ? { dueAt: asString(data.dueAt) } : {}),
    ...(finiteNumber(data.maxScore) !== null ? { maxScore: finiteNumber(data.maxScore)! } : {}),
    attachments,
    isOpen: data.isOpen !== false,
    createdAt: asString(data.createdAt),
    updatedAt: asString(data.updatedAt),
    ...(data.purpose ? { purpose: data.purpose } : {}),
    deliveryMode: data.deliveryMode || 'online',
    ...(Array.isArray(data.skillIds) ? { skillIds: data.skillIds.filter((id: unknown): id is string => typeof id === 'string') } : {}),
    ...(asString(data.sourceReportId) ? { sourceReportId: asString(data.sourceReportId) } : {}),
    ...(data.gradingPolicy ? { gradingPolicy: data.gradingPolicy } : {}),
    ...(asString(data.contentVersion) ? { contentVersion: asString(data.contentVersion) } : {}),
    ...(exportBundleForStudent(data.exportBundle) ? { exportBundle: exportBundleForStudent(data.exportBundle) } : {}),
    hasAnswerKey: true,
  } as StudentAssignmentView;
};

const publicExam = (id: string, data: FirebaseFirestore.DocumentData): Exam => {
  const rawQuestions = Array.isArray(data.questions) ? data.questions : [];
  const { password: _password, ...withoutPassword } = data;
  return {
    id,
    ...withoutPassword,
    questions: rawQuestions
      .filter((question: unknown): question is ExamQuestion => Boolean(question && typeof question === 'object'))
      .map(question => stripAnswerKey(question)),
  } as Exam;
};

const studentAnswers = (value: unknown, questions: readonly ExamQuestion[]): StudentAnswer[] => {
  if (!Array.isArray(value)) throw new ClassroomOnlineError(422, 'Dữ liệu câu trả lời không hợp lệ.');
  const validQuestionIds = new Set(questions.map(question => question.id));
  const byQuestion = new Map<string, StudentAnswer>();
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const raw = item as Record<string, unknown>;
    const questionId = asString(raw.questionId).trim();
    const answer = asString(raw.answer);
    if (!validQuestionIds.has(questionId)) continue;
    if (answer.length > 20_000) throw new ClassroomOnlineError(422, 'Câu trả lời quá dài.');
    byQuestion.set(questionId, { questionId, answer });
  }
  return questions
    .map(question => byQuestion.get(question.id))
    .filter((answer): answer is StudentAnswer => Boolean(answer));
};

const safeAttempt = (id: string, data: StoredOnlineAttempt): ExamSubmission => ({
  id,
  examId: asString(data.examId),
  examCode: asString(data.examCode),
  studentName: asString(data.studentName),
  studentClass: asString(data.studentClass),
  studentId: asString(data.studentId),
  startedAt: asString(data.startedAt),
  ...(asString(data.submittedAt) ? { submittedAt: asString(data.submittedAt) } : {}),
  answers: Array.isArray(data.answers)
    ? data.answers
      .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
      .map(item => ({ questionId: asString(item.questionId), answer: asString(item.answer) }))
    : [],
  ...(finiteNumber(data.maxScore) !== null ? { maxScore: finiteNumber(data.maxScore)! } : { maxScore: 0 }),
  status: ['in_progress', 'submitted', 'graded'].includes(asString(data.status))
    ? data.status as ExamSubmission['status']
    : 'in_progress',
  ...(finiteNumber(data.tabSwitches) !== null ? { tabSwitches: finiteNumber(data.tabSwitches)! } : {}),
  classId: asString(data.classId),
  assignmentId: asString(data.assignmentId),
  attemptNumber: finiteNumber(data.attemptNumber) ?? 1,
  ...(asString(data.activityPurpose) ? { activityPurpose: data.activityPurpose as ExamSubmission['activityPurpose'] } : {}),
  ...(asString(data.gradeState) ? { gradeState: data.gradeState as ExamSubmission['gradeState'] } : {}),
  ...(asString(data.gradingSource) ? { gradingSource: data.gradingSource as ExamSubmission['gradingSource'] } : {}),
});

const decisionMessage = (reason: string): string => {
  const messages: Record<string, string> = {
    invalid_student_link: 'Phiên học sinh không hợp lệ. Hãy đăng nhập lại.',
    assignment_not_in_class: 'Bài này không thuộc lớp của em.',
    assignment_not_exam: 'Bài này không phải hoạt động online.',
    exam_not_linked: 'Bài giao chưa liên kết đúng với đề online.',
    assignment_closed: 'Bài giao đã đóng. Em không thể bắt đầu lượt mới.',
    student_not_targeted: 'Hoạt động này chỉ dành cho nhóm học sinh được chỉ định.',
    exam_not_found: 'Không tìm thấy đề online.',
    exam_not_started: 'Đề chưa mở. Em hãy quay lại đúng thời gian được thông báo.',
    exam_ended: 'Đề đã đóng, không thể bắt đầu lượt mới.',
    assignment_due: 'Bài đã quá hạn nộp.',
    max_attempts_reached: 'Em đã dùng hết số lượt làm bài.',
  };
  return messages[reason] || 'Không thể bắt đầu hoạt động online.';
};

const statusForReason = (reason: string): number => (
  ['assignment_not_in_class', 'assignment_not_exam', 'exam_not_linked', 'student_not_targeted', 'invalid_student_link'].includes(reason)
    ? 403
    : ['exam_not_found'].includes(reason) ? 404 : 409
);

const loadAssignmentContext = async (
  db: Db,
  uid: string,
  assignmentId: string,
): Promise<StudentOnlineContext> => {
  if (!validId(assignmentId)) throw new ClassroomOnlineError(400, 'Thiếu mã bài giao hợp lệ.');
  const link = await readStudentLink(db, uid);
  const classRef = db.collection('classes').doc(link.classId);
  const classData = await readDocData(classRef, 'Lớp học không còn tồn tại.');
  const studentData = await readDocData(classRef.collection('students').doc(link.studentId), 'Học sinh không còn trong lớp này.');
  const assignmentRef = db.collection('assignments').doc(assignmentId);
  const assignment = await readDocData(assignmentRef, 'Bài giao không còn tồn tại.');

  const examId = asString(assignment.examId).trim();
  if (assignment.classId !== link.classId) throw new ClassroomOnlineError(403, 'Bài này không thuộc lớp của em.');
  if (assignment.teacherId && assignment.teacherId !== link.teacherId) throw new ClassroomOnlineError(403, 'Bài giao không thuộc giáo viên của lớp này.');
  if (assignment.type !== 'exam' || !validId(examId)) throw new ClassroomOnlineError(403, 'Bài này không phải hoạt động online.');

  const examRef = db.collection('exams').doc(examId);
  const exam = await readDocData(examRef, 'Không tìm thấy đề online.');
  if (exam.teacherId && assignment.teacherId && exam.teacherId !== assignment.teacherId) {
    throw new ClassroomOnlineError(403, 'Đề online không thuộc bài giao này.');
  }
  const examValue = { id: examId, ...exam } as Exam;
  const snapshot = buildExamContentSnapshot(examValue);
  return { uid, link, classData, studentData, assignmentRef, assignment, examRef, exam, snapshot };
};

const loadAttemptContext = async (
  db: Db,
  uid: string,
  attemptId: string,
): Promise<{ context: StudentOnlineContext; attemptRef: FirebaseFirestore.DocumentReference; attempt: StoredOnlineAttempt }> => {
  if (!validId(attemptId)) throw new ClassroomOnlineError(400, 'Thiếu mã lượt làm bài hợp lệ.');
  const link = await readStudentLink(db, uid);
  const attemptRef = db.collection('examSubmissions').doc(attemptId);
  const attempt = await readDocData(attemptRef, 'Không tìm thấy lượt làm bài.');
  if (attempt.studentId !== link.studentId || attempt.classId !== link.classId) {
    throw new ClassroomOnlineError(403, 'Lượt làm bài không thuộc phiên học sinh này.');
  }
  const assignmentId = asString(attempt.assignmentId);
  const context = await loadAssignmentContext(db, uid, assignmentId);
  if (asString(attempt.examId) !== asString(context.examRef.id)) {
    throw new ClassroomOnlineError(403, 'Lượt làm bài không khớp đề được giao.');
  }
  return { context, attemptRef, attempt: { id: attemptId, ...attempt } as StoredOnlineAttempt };
};

const attemptProjection = (context: StudentOnlineContext, id: string, attempt: StoredOnlineAttempt): ExamSubmission => safeAttempt(id, {
  ...attempt,
  examId: context.examRef.id,
  examCode: asString(context.exam.code),
  studentName: asString(context.studentData.name),
  studentClass: asString(context.classData.name),
  classId: context.link.classId,
  studentId: context.link.studentId,
  assignmentId: context.assignmentRef.id,
  maxScore: finiteNumber(context.assignment.maxScore) ?? finiteNumber(context.exam.maxScore) ?? 0,
});

const onlineResponse = (context: StudentOnlineContext, id: string, attempt: StoredOnlineAttempt) => ({
  assignment: assignmentProjection(context.assignmentRef.id, context.assignment),
  exam: publicExam(context.examRef.id, context.exam),
  attempt: attemptProjection(context, id, attempt),
  contentVersion: context.snapshot.contentVersion,
  contentHash: context.snapshot.contentHash,
});

const readRelevantAttempts = async (
  db: Db,
  link: VerifiedStudentLink,
  assignmentId: string,
): Promise<StoredOnlineAttempt[]> => {
  const snapshot = await db.collection('examSubmissions')
    .where('studentId', '==', link.studentId)
    .limit(100)
    .get();
  return snapshot.docs
    .map(document => ({ id: document.id, ...document.data() } as StoredOnlineAttempt))
    .filter(attempt => attempt.studentId === link.studentId
      && attempt.classId === link.classId
      && attempt.assignmentId === assignmentId);
};

const lockIdFor = (link: VerifiedStudentLink, assignmentId: string): string => {
  const raw = `${link.classId}__${link.studentId}__${assignmentId}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < raw.length; index += 1) hash = Math.imul(hash ^ raw.charCodeAt(index), 0x01000193);
  return `lock_${(hash >>> 0).toString(16)}`;
};

const newAttemptId = (): string => `class_attempt_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

const startExam = async (db: Db, body: Body, res: ResponseLike): Promise<void> => {
  const uid = await verifyStudentUid(body.idToken);
  const assignmentId = asString(body.assignmentId).trim();
  const context = await loadAssignmentContext(db, uid, assignmentId);
  const attempts = await readRelevantAttempts(db, context.link, assignmentId);
  const assignmentPolicy: StudentExamAssignmentPolicy = {
    id: assignmentId,
    classId: asString(context.assignment.classId),
    type: context.assignment.type === 'exam' ? 'exam' : 'upload',
    examId: asString(context.assignment.examId),
    isOpen: context.assignment.isOpen !== false,
    ...(asString(context.assignment.dueAt) ? { dueAt: asString(context.assignment.dueAt) } : {}),
    ...(Array.isArray(context.assignment.targetStudentIds) ? { targetStudentIds: context.assignment.targetStudentIds.filter((id: unknown): id is string => typeof id === 'string') } : {}),
  };
  const examPolicy: StudentExamDefinitionPolicy = {
    id: context.examRef.id,
    isActive: context.exam.isActive === true,
    ...(asString(context.exam.startAt) ? { startAt: asString(context.exam.startAt) } : {}),
    ...(asString(context.exam.endAt) ? { endAt: asString(context.exam.endAt) } : {}),
    ...(finiteNumber(context.exam.maxAttempts) !== null ? { maxAttempts: finiteNumber(context.exam.maxAttempts)! } : {}),
  };
  const policyAttempts: StudentExamAttemptContext[] = attempts.map(attempt => ({
    id: attempt.id,
    studentId: attempt.studentId,
    classId: attempt.classId,
    assignmentId: attempt.assignmentId,
    status: ['in_progress', 'submitted', 'graded'].includes(asString(attempt.status)) ? attempt.status as StudentExamAttemptContext['status'] : 'submitted',
    updatedAt: attempt.updatedAt,
    startedAt: attempt.startedAt,
  }));
  const decision = evaluateStudentExamStart({ now: new Date(), link: context.link, assignment: assignmentPolicy, exam: examPolicy, attempts: policyAttempts });
  if (!decision.allowed) return void res.status(statusForReason(decision.reason)).json({ error: decisionMessage(decision.reason), reason: decision.reason });

  const resumable = findResumableExamAttempt(policyAttempts, context.link.studentId, context.link.classId, assignmentId);
  const lockRef = db.collection('classroomAttemptLocks').doc(lockIdFor(context.link, assignmentId));
  const selected = await db.runTransaction(async transaction => {
    const lockSnapshot = await transaction.get(lockRef);
    const lockedId = lockSnapshot.exists ? asString((lockSnapshot.data() || {}).attemptId) : '';
    if (lockedId) {
      const lockedRef = db.collection('examSubmissions').doc(lockedId);
      const lockedSnapshot = await transaction.get(lockedRef);
      if (lockedSnapshot.exists) {
        const locked = { id: lockedId, ...lockedSnapshot.data() } as StoredOnlineAttempt;
        if (locked.status === 'in_progress' && locked.studentId === context.link.studentId && locked.assignmentId === assignmentId) {
          return { id: lockedId, attempt: locked, resumed: true };
        }
      }
    }

    if (resumable) {
      const existing = attempts.find(attempt => attempt.id === resumable.id);
      if (existing) {
        transaction.set(lockRef, { attemptId: existing.id, updatedAt: nowIso() }, { merge: true });
        return { id: existing.id, attempt: existing, resumed: true };
      }
    }

    const id = newAttemptId();
    const now = nowIso();
    const attempt: StoredOnlineAttempt = {
      id,
      examId: context.examRef.id,
      examCode: asString(context.exam.code),
      studentId: context.link.studentId,
      studentName: asString(context.studentData.name),
      studentClass: asString(context.classData.name),
      classId: context.link.classId,
      assignmentId,
      status: 'in_progress',
      startedAt: now,
      updatedAt: now,
      answers: [],
      maxScore: finiteNumber(context.assignment.maxScore) ?? finiteNumber(context.exam.maxScore) ?? 0,
      attemptNumber: attempts.length + 1,
      contentVersion: context.snapshot.contentVersion,
      contentHash: context.snapshot.contentHash,
      activityPurpose: context.assignment.purpose || 'assignment',
    };
    transaction.set(db.collection('examSubmissions').doc(id), attempt);
    transaction.set(lockRef, { attemptId: id, updatedAt: now }, { merge: true });
    return { id, attempt, resumed: false };
  });

  return void res.status(200).json({ ...onlineResponse(context, selected.id, selected.attempt), resumed: selected.resumed });
};

const resumeExam = async (db: Db, body: Body, res: ResponseLike): Promise<void> => {
  const uid = await verifyStudentUid(body.idToken);
  const loaded = await loadAttemptContext(db, uid, asString(body.attemptId).trim());
  if (loaded.attempt.status !== 'in_progress') {
    return void res.status(409).json({ error: 'Lượt làm bài này đã nộp và không thể tiếp tục.', reason: 'already_submitted' });
  }
  return void res.status(200).json(onlineResponse(loaded.context, loaded.attemptRef.id, loaded.attempt));
};

const saveExam = async (db: Db, body: Body, res: ResponseLike): Promise<void> => {
  const uid = await verifyStudentUid(body.idToken);
  const loaded = await loadAttemptContext(db, uid, asString(body.attemptId).trim());
  if (loaded.attempt.status !== 'in_progress') return void res.status(409).json({ error: 'Lượt làm bài đã nộp, không thể sửa nữa.' });
  const questions = Array.isArray(loaded.context.exam.questions) ? loaded.context.exam.questions as ExamQuestion[] : [];
  const answers = studentAnswers(body.answers, questions);
  const tabSwitches = finiteNumber(body.tabSwitches);
  const now = nowIso();
  let next: StoredOnlineAttempt | null = null;
  await db.runTransaction(async transaction => {
    const currentSnapshot = await transaction.get(loaded.attemptRef);
    if (!currentSnapshot.exists) throw new ClassroomOnlineError(404, 'Lượt làm bài không còn tồn tại.');
    const current = { id: loaded.attemptRef.id, ...currentSnapshot.data() } as StoredOnlineAttempt;
    if (current.studentId !== loaded.context.link.studentId || current.classId !== loaded.context.link.classId || current.assignmentId !== loaded.context.assignmentRef.id) {
      throw new ClassroomOnlineError(403, 'Lượt làm bài không thuộc phiên học sinh này.');
    }
    if (current.status !== 'in_progress') throw new ClassroomOnlineError(409, 'Lượt làm bài đã nộp, không thể sửa nữa.');
    next = {
      ...current,
      answers,
      ...(tabSwitches !== null ? { tabSwitches: Math.min(1000, Math.max(0, Math.floor(tabSwitches))) } : {}),
      updatedAt: now,
    };
    transaction.update(loaded.attemptRef, { answers, ...(tabSwitches !== null ? { tabSwitches: Math.min(1000, Math.max(0, Math.floor(tabSwitches))) } : {}), updatedAt: now });
  });
  return void res.status(200).json({ saved: true, attempt: attemptProjection(loaded.context, loaded.attemptRef.id, next || loaded.attempt) });
};

const submitExam = async (db: Db, body: Body, res: ResponseLike): Promise<void> => {
  const uid = await verifyStudentUid(body.idToken);
  const loaded = await loadAttemptContext(db, uid, asString(body.attemptId).trim());
  const nonce = asString(body.nonce).trim();
  if (loaded.attempt.status !== 'in_progress') {
    return void res.status(200).json({ submitted: true, alreadySubmitted: true, attempt: attemptProjection(loaded.context, loaded.attemptRef.id, loaded.attempt) });
  }
  const questions = Array.isArray(loaded.context.exam.questions) ? loaded.context.exam.questions as ExamQuestion[] : [];
  const answers = studentAnswers(body.answers, questions);
  const now = nowIso();
  let next: StoredOnlineAttempt | null = null;
  await db.runTransaction(async transaction => {
    const currentSnapshot = await transaction.get(loaded.attemptRef);
    if (!currentSnapshot.exists) throw new ClassroomOnlineError(404, 'Lượt làm bài không còn tồn tại.');
    const current = { id: loaded.attemptRef.id, ...currentSnapshot.data() } as StoredOnlineAttempt;
    if (current.studentId !== loaded.context.link.studentId || current.classId !== loaded.context.link.classId || current.assignmentId !== loaded.context.assignmentRef.id) {
      throw new ClassroomOnlineError(403, 'Lượt làm bài không thuộc phiên học sinh này.');
    }
    if (current.status !== 'in_progress') {
      next = current;
      return;
    }
    next = {
      ...current,
      answers,
      status: 'submitted',
      submittedAt: now,
      updatedAt: now,
      ...(nonce ? { lastSubmitNonce: nonce.slice(0, 200) } : {}),
    };
    transaction.update(loaded.attemptRef, {
      answers,
      status: 'submitted',
      submittedAt: now,
      updatedAt: now,
      ...(nonce ? { lastSubmitNonce: nonce.slice(0, 200) } : {}),
    });
  });
  return void res.status(200).json({ submitted: true, alreadySubmitted: false, attempt: attemptProjection(loaded.context, loaded.attemptRef.id, next || loaded.attempt) });
};

export const handleClassroomOnlineAction = async (db: Db, body: Body, res: ResponseLike): Promise<boolean> => {
  const action = asString(body.action);
  try {
    if (action === 'studentExamStart') { await startExam(db, body, res); return true; }
    if (action === 'studentExamResume') { await resumeExam(db, body, res); return true; }
    if (action === 'studentExamSave') { await saveExam(db, body, res); return true; }
    if (action === 'studentExamSubmit') { await submitExam(db, body, res); return true; }
    return false;
  } catch (error) {
    if (error instanceof ClassroomOnlineError) {
      res.status(error.statusCode).json({ error: error.message });
      return true;
    }
    throw error;
  }
};

export { publicExam, assignmentProjection, studentAnswers };
