import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { stripAnswerKey } from './_exam-core.js';
import { readClassAccess, type ClassAccess } from './_classroom-access.js';
import { callGeminiVision, getGradingApiKey, GRADING_MODEL, reserveQuota } from './_grading-core.js';
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
import {
  applyTeacherOnlineGradeEdit,
  approveOnlineGrade,
  buildAutomaticOnlineGrade,
  applyAiOnlineGradeSuggestion,
  projectOnlineGradeForStudent,
  removeOnlineGrade,
  OnlineGradeValidationError,
  type OnlineGradeSource,
  type TeacherOnlineGradeEdit,
} from '../src/lib/classroom/onlineGradeLifecycle.js';
import { buildOnlineSkillEvidence } from '../src/lib/learning/skillProfile.js';
import { replaceSkillEvidenceAndRebuild } from './_skill-profile.js';
import type {
  GradingPolicy,
  StudentAssignmentView,
  StudentActivityExportBundle,
  SubmissionGrade,
  SubmissionGradeHistoryDoc,
  SubmissionGradeRevisionAction,
} from '../src/lib/classroom/types.js';
import { buildHomeworkGradingPrompt, parseHomeworkGradeForCommit } from '../src/lib/classroom/gradingPrompt.js';

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
  approvalMode?: ExamSubmission['approvalMode'];
  teacherApprovedAt?: string;
  totalScore?: number;
  grade?: SubmissionGrade;
}

interface TeacherOnlineAttemptContext {
  uid: string;
  classId: string;
  access: ClassAccess;
  assignmentRef: FirebaseFirestore.DocumentReference;
  assignment: FirebaseFirestore.DocumentData;
  examRef: FirebaseFirestore.DocumentReference;
  exam: FirebaseFirestore.DocumentData;
  attemptRef: FirebaseFirestore.DocumentReference;
  attempt: StoredOnlineAttempt;
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

const verifyTeacherUid = async (idToken: unknown): Promise<string> => {
  if (typeof idToken !== 'string' || !idToken.trim()) {
    throw new ClassroomOnlineError(401, 'Phiên đăng nhập giáo viên không hợp lệ.');
  }
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    if (!decoded.uid) throw new Error('missing uid');
    return decoded.uid;
  } catch {
    throw new ClassroomOnlineError(401, 'Phiên đăng nhập giáo viên không hợp lệ.');
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

const safeAttempt = (id: string, data: StoredOnlineAttempt, allowReview = false): ExamSubmission => ({
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
  ...(finiteNumber(data.totalScore) !== null ? { totalScore: finiteNumber(data.totalScore)! } : {}),
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
  ...(data.grade && typeof data.grade === 'object' ? { grade: projectOnlineGradeForStudent(data.grade, allowReview) } : {}),
  ...(asString(data.approvalMode) ? { approvalMode: data.approvalMode } : {}),
  ...(asString(data.teacherApprovedAt) ? { teacherApprovedAt: data.teacherApprovedAt } : {}),
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
}, context.exam.allowReview === true);

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

/** Projection gọn cho dashboard học sinh; không trả answer text hay ghi chú chấm nội bộ. */
const studentOnlineAttemptProjection = (
  id: string,
  data: FirebaseFirestore.DocumentData,
  link: VerifiedStudentLink,
): ExamSubmission => ({
  id,
  examId: asString(data.examId),
  examCode: '',
  studentName: '',
  studentId: link.studentId,
  studentClass: '',
  classId: link.classId,
  assignmentId: asString(data.assignmentId),
  startedAt: asString(data.startedAt),
  ...(asString(data.submittedAt) ? { submittedAt: asString(data.submittedAt) } : {}),
  answers: [],
  ...(finiteNumber(data.totalScore) !== null ? { totalScore: finiteNumber(data.totalScore)! } : {}),
  maxScore: finiteNumber(data.maxScore) ?? 0,
  status: ['in_progress', 'submitted', 'graded'].includes(asString(data.status))
    ? data.status as ExamSubmission['status']
    : 'submitted',
  ...(asString(data.activityPurpose) ? { activityPurpose: data.activityPurpose as ExamSubmission['activityPurpose'] } : {}),
  ...(asString(data.gradeState) ? { gradeState: data.gradeState as ExamSubmission['gradeState'] } : {}),
  ...(asString(data.gradingSource) ? { gradingSource: data.gradingSource as ExamSubmission['gradingSource'] } : {}),
  ...(asString(data.approvalMode) ? { approvalMode: data.approvalMode as ExamSubmission['approvalMode'] } : {}),
  ...(asString(data.teacherApprovedAt) ? { teacherApprovedAt: data.teacherApprovedAt } : {}),
  ...(data.grade && typeof data.grade === 'object'
    ? { grade: projectOnlineGradeForStudent(data.grade as SubmissionGrade, false) }
    : {}),
});

const studentOnlineSubmissions = async (db: Db, body: Body, res: ResponseLike): Promise<void> => {
  const uid = await verifyStudentUid(body.idToken);
  const link = await readStudentLink(db, uid);
  const snapshot = await db.collection('examSubmissions')
    .where('studentId', '==', link.studentId)
    .limit(100)
    .get();
  const submissions = snapshot.docs
    .filter(document => document.data().classId === link.classId)
    .map(document => studentOnlineAttemptProjection(document.id, document.data(), link))
    .sort((left, right) => String(right.submittedAt || right.startedAt).localeCompare(String(left.submittedAt || left.startedAt)));
  return void res.status(200).json({ submissions });
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

const storedAnswers = (value: unknown, questions: readonly ExamQuestion[]): StudentAnswer[] => {
  if (!Array.isArray(value)) return [];
  const validQuestionIds = new Set(questions.map(question => question.id));
  const answers: StudentAnswer[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const raw = item as Record<string, unknown>;
    const questionId = asString(raw.questionId).trim();
    if (!validQuestionIds.has(questionId)) continue;
    const answer: StudentAnswer = { questionId, answer: asString(raw.answer) };
    for (const key of ['autoScore', 'aiScore', 'teacherScore'] as const) {
      const score = finiteNumber(raw[key]);
      if (score !== null) answer[key] = score;
    }
    if (typeof raw.aiFeedback === 'string') answer.aiFeedback = raw.aiFeedback.slice(0, 4000);
    if (typeof raw.teacherFeedback === 'string') answer.teacherFeedback = raw.teacherFeedback.slice(0, 4000);
    answers.push(answer);
  }
  return answers;
};

const examQuestions = (exam: FirebaseFirestore.DocumentData): ExamQuestion[] => (
  Array.isArray(exam.questions)
    ? exam.questions.filter((question: unknown): question is ExamQuestion => Boolean(question && typeof question === 'object' && !Array.isArray(question)))
    : []
);

const gradingPolicyFor = (assignment: FirebaseFirestore.DocumentData, questions: readonly ExamQuestion[]): GradingPolicy => {
  const configured = asString(assignment.gradingPolicy);
  if (configured === 'automatic' || configured === 'mixed' || configured === 'teacher_review') return configured;
  return questions.some(question => question.type === 'essay') ? 'mixed' : 'automatic';
};

const teacherGradeEdit = (value: unknown): TeacherOnlineGradeEdit => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new OnlineGradeValidationError('Dữ liệu sửa điểm không hợp lệ.');
  }
  const raw = value as Record<string, unknown>;
  const edit: TeacherOnlineGradeEdit = {};
  const scores = raw.questionScores;
  if (scores !== undefined) {
    if (!scores || typeof scores !== 'object' || Array.isArray(scores)) throw new OnlineGradeValidationError('Điểm theo câu không hợp lệ.');
    edit.questionScores = {};
    for (const [questionId, valueForQuestion] of Object.entries(scores)) {
      const score = finiteNumber(valueForQuestion);
      if (!validId(questionId) || score === null) throw new OnlineGradeValidationError('Điểm theo câu không hợp lệ.');
      edit.questionScores[questionId] = score;
    }
  }
  const feedbacks = raw.questionFeedback;
  if (feedbacks !== undefined) {
    if (!feedbacks || typeof feedbacks !== 'object' || Array.isArray(feedbacks)) throw new OnlineGradeValidationError('Nhận xét theo câu không hợp lệ.');
    edit.questionFeedback = {};
    for (const [questionId, valueForQuestion] of Object.entries(feedbacks)) {
      if (!validId(questionId) || typeof valueForQuestion !== 'string' || valueForQuestion.length > 4000) {
        throw new OnlineGradeValidationError('Nhận xét theo câu không hợp lệ.');
      }
      edit.questionFeedback[questionId] = valueForQuestion;
    }
  }
  for (const key of ['feedback', 'teacherNote'] as const) {
    if (raw[key] !== undefined) {
      if (typeof raw[key] !== 'string' || raw[key].length > 4000) throw new OnlineGradeValidationError('Nhận xét không hợp lệ.');
      edit[key] = raw[key];
    }
  }
  for (const key of ['weakTopics', 'strengths', 'weaknesses'] as const) {
    if (raw[key] !== undefined) {
      if (!Array.isArray(raw[key])) throw new OnlineGradeValidationError('Danh sách nhận xét không hợp lệ.');
      edit[key] = raw[key]
        .filter((item): item is string => typeof item === 'string')
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, 50);
    }
  }
  if (raw.score !== undefined) {
    const score = finiteNumber(raw.score);
    if (score === null) throw new OnlineGradeValidationError('Điểm tổng không hợp lệ.');
    edit.score = score;
  }
  return edit;
};

const loadTeacherOnlineAttempt = async (
  db: Db,
  body: Body,
): Promise<TeacherOnlineAttemptContext> => {
  const uid = await verifyTeacherUid(body.idToken);
  const attemptId = asString(body.attemptId).trim();
  if (!validId(attemptId)) throw new ClassroomOnlineError(400, 'Thiếu mã lượt làm bài hợp lệ.');
  const attemptRef = db.collection('examSubmissions').doc(attemptId);
  const attemptData = await readDocData(attemptRef, 'Không tìm thấy lượt làm bài.');
  const attempt = { id: attemptId, ...attemptData } as StoredOnlineAttempt;
  const classId = asString(attempt.classId).trim();
  const assignmentId = asString(attempt.assignmentId).trim();
  const examId = asString(attempt.examId).trim();
  if (!validId(classId) || !validId(assignmentId) || !validId(examId)) {
    throw new ClassroomOnlineError(403, 'Lượt làm bài chưa gắn đủ lớp, bài giao và đề online.');
  }
  const requestedClassId = asString(body.classId).trim();
  if (requestedClassId && requestedClassId !== classId) throw new ClassroomOnlineError(403, 'Lượt làm bài không thuộc lớp được yêu cầu.');
  const accessRecord = await readClassAccess(db, classId, uid);
  if (!accessRecord) throw new ClassroomOnlineError(403, 'Bạn không có quyền chấm bài trong lớp này.');
  const assignmentRef = db.collection('assignments').doc(assignmentId);
  const assignment = await readDocData(assignmentRef, 'Bài giao không còn tồn tại.');
  if (asString(assignment.classId) !== classId || assignment.type !== 'exam' || asString(assignment.examId) !== examId) {
    throw new ClassroomOnlineError(403, 'Bài giao không khớp với lượt làm bài.');
  }
  const examRef = db.collection('exams').doc(examId);
  const exam = await readDocData(examRef, 'Đề online không còn tồn tại.');
  if (exam.teacherId && assignment.teacherId && exam.teacherId !== assignment.teacherId) {
    throw new ClassroomOnlineError(403, 'Đề online không thuộc bài giao này.');
  }
  return { uid, classId, access: accessRecord.access, assignmentRef, assignment, examRef, exam, attemptRef, attempt };
};

const teacherAttemptProjection = (context: TeacherOnlineAttemptContext, attempt: StoredOnlineAttempt): ExamSubmission => {
  const projection = safeAttempt(context.attemptRef.id, {
    ...attempt,
    examId: context.examRef.id,
    examCode: asString(context.exam.code),
    classId: context.classId,
    assignmentId: context.assignmentRef.id,
    maxScore: finiteNumber(context.assignment.maxScore) ?? finiteNumber(context.exam.maxScore) ?? finiteNumber(attempt.maxScore) ?? 0,
  }, true);
  return {
    ...projection,
    ...(attempt.grade ? { grade: attempt.grade } : {}),
  };
};

const gradeAtOf = (value: FirebaseFirestore.DocumentData | StoredOnlineAttempt): string => (
  value.grade && typeof value.grade === 'object' ? asString(value.grade.gradedAt) : ''
);

const onlineGradeHistoryId = (attempt: StoredOnlineAttempt, action: SubmissionGradeRevisionAction): string => (
  `online_grade_${attempt.id}_${action}_${encodeURIComponent(gradeAtOf(attempt) || asString(attempt.updatedAt) || 'unknown')}`
);

const stringList = (value: unknown): string[] => (
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map(item => item.trim()) : []
);

/** Chỉ đồng bộ năng lực từ kết quả online đã official; mọi bản nháp đều gỡ evidence cũ. */
const syncOnlineSkillEvidence = async (
  db: Db,
  context: TeacherOnlineAttemptContext,
  attempt: StoredOnlineAttempt,
  now: string,
): Promise<void> => {
  const studentId = asString(attempt.studentId).trim();
  const classId = context.classId.trim();
  const teacherId = asString(context.assignment.teacherId).trim()
    || asString(context.exam.teacherId).trim()
    || context.access.ownerId;
  if (!studentId || !classId || !teacherId) return;

  const grade = attempt.grade;
  const maxScore = finiteNumber(grade?.maxScore)
    ?? finiteNumber(context.assignment.maxScore)
    ?? finiteNumber(context.exam.maxScore)
    ?? finiteNumber(attempt.maxScore)
    ?? 0;
  const score = finiteNumber(grade?.score) ?? finiteNumber(attempt.totalScore) ?? 0;
  const skillIds = [...new Set([
    ...stringList(context.assignment.skillIds),
    ...stringList(context.exam.skillIds),
  ])];
  const evidence = buildOnlineSkillEvidence({
    attemptId: attempt.id,
    assignmentId: context.assignmentRef.id,
    skillIds,
    score,
    maxScore,
    teacherApproved: grade?.teacherApproved === true && attempt.gradeState === 'official',
    gradedAt: gradeAtOf(attempt) || asString(attempt.teacherApprovedAt) || asString(attempt.updatedAt) || now,
  });
  await replaceSkillEvidenceAndRebuild(db, { studentId, classId, teacherId }, attempt.id, evidence, now);
};

const commitOnlineGradeChange = async (
  db: Db,
  context: TeacherOnlineAttemptContext,
  update: { answers: StudentAnswer[]; status: ExamSubmission['status']; totalScore?: number; grade?: SubmissionGrade; gradeState?: ExamSubmission['gradeState']; gradingSource?: ExamSubmission['gradingSource']; approvalMode?: ExamSubmission['approvalMode']; teacherApprovedAt?: string },
  action: SubmissionGradeRevisionAction,
  now: string,
): Promise<StoredOnlineAttempt> => {
  let committed: StoredOnlineAttempt | null = null;
  await db.runTransaction(async transaction => {
    const latestSnapshot = await transaction.get(context.attemptRef);
    if (!latestSnapshot.exists) throw new ClassroomOnlineError(404, 'Lượt làm bài không còn tồn tại.');
    const latest = { id: context.attemptRef.id, ...latestSnapshot.data() } as StoredOnlineAttempt;
    if (latest.classId !== context.classId || latest.assignmentId !== context.assignmentRef.id || latest.examId !== context.examRef.id) {
      throw new ClassroomOnlineError(403, 'Lượt làm bài không thuộc lớp hoặc bài giao này.');
    }
    if (latest.updatedAt !== context.attempt.updatedAt || gradeAtOf(latest) !== gradeAtOf(context.attempt) || latest.status !== context.attempt.status) {
      throw new ClassroomOnlineError(409, 'Kết quả vừa thay đổi ở một cửa sổ khác. Tải lại bài rồi thử lại.');
    }

    const nextDocument: Record<string, unknown> = {
      ...latest,
      answers: update.answers,
      status: update.status,
      updatedAt: now,
    };
    const optionalFields: Array<keyof typeof update> = ['totalScore', 'grade', 'gradeState', 'gradingSource', 'approvalMode', 'teacherApprovedAt'];
    for (const field of optionalFields) {
      if (update[field] === undefined) delete nextDocument[field];
      else nextDocument[field] = update[field];
    }

    const previousGrade = latest.grade && typeof latest.grade === 'object' ? latest.grade : undefined;
    const historyGrade = previousGrade || update.grade;
    if (historyGrade) {
      const historyId = onlineGradeHistoryId(latest, action);
      const history: SubmissionGradeHistoryDoc = {
        id: historyId,
        submissionId: latest.id,
        teacherId: asString(context.assignment.teacherId) || asString(context.exam.teacherId) || context.access.ownerId,
        classId: context.classId,
        studentId: asString(latest.studentId),
        assignmentId: context.assignmentRef.id,
        action,
        actorUid: context.uid,
        grade: historyGrade,
        createdAt: now,
      };
      transaction.set(db.collection('submissionGradeHistory').doc(historyId), history);
    }
    transaction.set(context.attemptRef, nextDocument);
    committed = nextDocument as unknown as StoredOnlineAttempt;
  });
  if (!committed) throw new ClassroomOnlineError(500, 'Không thể lưu kết quả chấm.');
  try {
    await syncOnlineSkillEvidence(db, context, committed, now);
  } catch (error) {
    // Điểm/lịch sử đã nằm trong transaction; hồ sơ năng lực là projection phụ và sẽ
    // được đồng bộ lại ở lần thay đổi điểm kế tiếp nếu Firestore tạm thời lỗi.
    console.error('[classroom-online] không đồng bộ hồ sơ năng lực', error);
  }
  return committed;
};

const teacherOnlineSaveGrade = async (db: Db, body: Body, res: ResponseLike): Promise<void> => {
  const context = await loadTeacherOnlineAttempt(db, body);
  if (context.attempt.status === 'in_progress') throw new ClassroomOnlineError(409, 'Học sinh chưa nộp bài; chưa thể chấm.');
  const questions = examQuestions(context.exam);
  const maxScore = finiteNumber(context.assignment.maxScore) ?? finiteNumber(context.exam.maxScore) ?? finiteNumber(context.attempt.maxScore) ?? 0;
  const source: OnlineGradeSource = {
    answers: storedAnswers(context.attempt.answers, questions),
    maxScore,
    status: context.attempt.status,
    ...(context.attempt.grade ? { grade: context.attempt.grade } : {}),
  };
  const now = nowIso();
  const update = applyTeacherOnlineGradeEdit(source, questions, teacherGradeEdit(body.edit), now);
  const committed = await commitOnlineGradeChange(db, context, update, 'manual_edit', now);
  return void res.status(200).json({ saved: true, attempt: teacherAttemptProjection(context, committed) });
};

const teacherOnlineApproveGrade = async (db: Db, body: Body, res: ResponseLike): Promise<void> => {
  const context = await loadTeacherOnlineAttempt(db, body);
  if (context.attempt.status === 'in_progress') throw new ClassroomOnlineError(409, 'Học sinh chưa nộp bài; chưa thể duyệt.');
  const storedTotalScore = finiteNumber(context.attempt.totalScore);
  const source: OnlineGradeSource = {
    answers: storedAnswers(context.attempt.answers, examQuestions(context.exam)),
    maxScore: finiteNumber(context.assignment.maxScore) ?? finiteNumber(context.exam.maxScore) ?? finiteNumber(context.attempt.maxScore) ?? 0,
    status: context.attempt.status,
    ...(context.attempt.grade ? { grade: context.attempt.grade } : {}),
    ...(storedTotalScore !== null ? { totalScore: storedTotalScore } : {}),
  };
  const now = nowIso();
  const update = approveOnlineGrade(source, now);
  const committed = await commitOnlineGradeChange(db, context, update, 'approve', now);
  return void res.status(200).json({ approved: true, attempt: teacherAttemptProjection(context, committed) });
};

const teacherOnlineDeleteGrade = async (db: Db, body: Body, res: ResponseLike): Promise<void> => {
  const context = await loadTeacherOnlineAttempt(db, body);
  const questions = examQuestions(context.exam);
  const source: OnlineGradeSource = {
    answers: storedAnswers(context.attempt.answers, questions),
    maxScore: finiteNumber(context.assignment.maxScore) ?? finiteNumber(context.exam.maxScore) ?? finiteNumber(context.attempt.maxScore) ?? 0,
    status: context.attempt.status,
    ...(context.attempt.grade ? { grade: context.attempt.grade } : {}),
  };
  const update = removeOnlineGrade(source, questions);
  const committed = await commitOnlineGradeChange(db, context, update, 'delete', nowIso());
  return void res.status(200).json({ deleted: true, attempt: teacherAttemptProjection(context, committed) });
};

const teacherOnlineRegrade = async (db: Db, body: Body, res: ResponseLike): Promise<void> => {
  const context = await loadTeacherOnlineAttempt(db, body);
  if (context.attempt.status === 'in_progress') throw new ClassroomOnlineError(409, 'Học sinh chưa nộp bài; chưa thể chấm lại.');
  const questions = examQuestions(context.exam);
  const rawAnswers = storedAnswers(context.attempt.answers, questions).map(answer => ({ questionId: answer.questionId, answer: answer.answer }));
  const maxScore = finiteNumber(context.assignment.maxScore) ?? finiteNumber(context.exam.maxScore) ?? finiteNumber(context.attempt.maxScore) ?? 0;
  const now = nowIso();
  const update = buildAutomaticOnlineGrade({
    questions,
    answers: rawAnswers,
    maxScore,
    gradingPolicy: gradingPolicyFor(context.assignment, questions),
    now,
  });
  const committed = await commitOnlineGradeChange(db, context, update, 'automatic_regrade', now);
  return void res.status(200).json({ regraded: true, attempt: teacherAttemptProjection(context, committed) });
};

const teacherOnlineAiRegrade = async (db: Db, body: Body, res: ResponseLike): Promise<void> => {
  const context = await loadTeacherOnlineAttempt(db, body);
  if (context.attempt.status === 'in_progress') throw new ClassroomOnlineError(409, 'Học sinh chưa nộp bài; chưa thể chấm lại.');
  const questions = examQuestions(context.exam);
  const maxScore = finiteNumber(context.assignment.maxScore) ?? finiteNumber(context.exam.maxScore) ?? finiteNumber(context.attempt.maxScore) ?? 0;
  const rawAnswers = storedAnswers(context.attempt.answers, questions).map(answer => ({
    questionId: answer.questionId,
    answer: answer.answer,
  }));
  const answerKey = questions.map((question, index) => [
    `Câu ${index + 1}: ${asString(question.correctAnswer) || '[không có đáp án chuẩn]'}`,
    question.explanation ? `Mốc giải thích: ${asString(question.explanation)}` : '',
  ].filter(Boolean).join('\n')).join('\n');
  const studentText = JSON.stringify(rawAnswers, null, 2);
  const reservation = await reserveQuota(db, context.uid, 'teacher', asString(context.attempt.studentId));
  if (reservation.verdict.allowed <= 0) throw new ClassroomOnlineError(429, reservation.verdict.reason);

  const raw = await callGeminiVision(
    buildHomeworkGradingPrompt({
      answerKey,
      rubric: asString(context.assignment.rubric),
      maxScore,
      assignmentTitle: asString(context.assignment.title) || asString(context.exam.title),
      assignmentText: questions.map((question, index) => `Câu ${index + 1}: ${question.content}`).join('\n'),
      gradingInstructions: asString(context.assignment.gradingInstructions),
      studentText,
    }),
    [],
    getGradingApiKey(),
    GRADING_MODEL,
    { maxOutputTokens: 8192, jsonMode: true },
  );
  const parsed = parseHomeworkGradeForCommit(raw, maxScore, questions.every(question => !asString(question.correctAnswer).trim()), 0);
  const now = nowIso();
  const update = applyAiOnlineGradeSuggestion({ answers: rawAnswers, maxScore }, questions, {
    score: parsed.grade.score,
    maxScore: parsed.grade.maxScore,
    feedback: parsed.grade.feedbackForStudent,
    noteForTeacher: parsed.grade.noteForTeacher,
    strengths: parsed.grade.strengths,
    weaknesses: parsed.grade.weaknesses,
    weakTopics: parsed.grade.weakTopics,
    questionResults: parsed.grade.questionResults,
    gradedWithoutAnswerKey: parsed.grade.gradedWithoutAnswerKey,
  }, now);
  const committed = await commitOnlineGradeChange(db, context, update, 'ai_regrade', now);
  return void res.status(200).json({ regraded: true, source: 'ai', attempt: teacherAttemptProjection(context, committed) });
};

const teacherOnlineSubmissions = async (db: Db, body: Body, res: ResponseLike): Promise<void> => {
  const uid = await verifyTeacherUid(body.idToken);
  const classId = asString(body.classId).trim();
  const assignmentId = asString(body.assignmentId).trim();
  if (!validId(classId) || !validId(assignmentId)) throw new ClassroomOnlineError(400, 'Thiếu mã lớp hoặc bài giao hợp lệ.');
  const accessRecord = await readClassAccess(db, classId, uid);
  if (!accessRecord) throw new ClassroomOnlineError(403, 'Bạn không có quyền xem bài làm trong lớp này.');
  const assignmentRef = db.collection('assignments').doc(assignmentId);
  const assignment = await readDocData(assignmentRef, 'Bài giao không còn tồn tại.');
  const examId = asString(assignment.examId).trim();
  if (asString(assignment.classId) !== classId || assignment.type !== 'exam' || !validId(examId)) {
    throw new ClassroomOnlineError(403, 'Bài giao không thuộc lớp hoặc không phải hoạt động online.');
  }
  const examRef = db.collection('exams').doc(examId);
  const exam = await readDocData(examRef, 'Đề online không còn tồn tại.');
  const snapshot = await db.collection('examSubmissions')
    .where('classId', '==', classId)
    .limit(500)
    .get();
  const base = { uid, classId, access: accessRecord.access, assignmentRef, assignment, examRef, exam };
  const submissions = snapshot.docs
    .map(document => ({ id: document.id, ...document.data() } as StoredOnlineAttempt))
    .filter(attempt => attempt.assignmentId === assignmentId && attempt.examId === examId)
    .map(attempt => teacherAttemptProjection({
      ...base,
      attemptRef: db.collection('examSubmissions').doc(attempt.id),
      attempt,
    }, attempt));
  return void res.status(200).json({ submissions });
};

export const handleClassroomOnlineAction = async (db: Db, body: Body, res: ResponseLike): Promise<boolean> => {
  const action = asString(body.action);
  try {
    if (action === 'studentOnlineSubmissions') { await studentOnlineSubmissions(db, body, res); return true; }
    if (action === 'studentExamStart') { await startExam(db, body, res); return true; }
    if (action === 'studentExamResume') { await resumeExam(db, body, res); return true; }
    if (action === 'studentExamSave') { await saveExam(db, body, res); return true; }
    if (action === 'studentExamSubmit') { await submitExam(db, body, res); return true; }
    if (action === 'teacherOnlineSaveGrade') { await teacherOnlineSaveGrade(db, body, res); return true; }
    if (action === 'teacherOnlineApproveGrade') { await teacherOnlineApproveGrade(db, body, res); return true; }
    if (action === 'teacherOnlineDeleteGrade') { await teacherOnlineDeleteGrade(db, body, res); return true; }
    if (action === 'teacherOnlineRegrade') { await teacherOnlineRegrade(db, body, res); return true; }
    if (action === 'teacherOnlineAutoGrade') { await teacherOnlineRegrade(db, body, res); return true; }
    if (action === 'teacherOnlineAiRegrade') { await teacherOnlineAiRegrade(db, body, res); return true; }
    if (action === 'teacherOnlineSubmissions') { await teacherOnlineSubmissions(db, body, res); return true; }
    return false;
  } catch (error) {
    if (error instanceof ClassroomOnlineError) {
      res.status(error.statusCode).json({ error: error.message });
      return true;
    }
    if (error instanceof OnlineGradeValidationError) {
      res.status(422).json({ error: error.message });
      return true;
    }
    throw error;
  }
};

export { publicExam, assignmentProjection, studentAnswers };
