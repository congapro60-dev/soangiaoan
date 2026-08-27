import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import {
  canLeaveClass,
  canRemoveClassMember,
  classMemberId,
  deriveClassAccess,
  memberDoc,
  memberFromData,
  normalizeTeacherEmail,
  readClassAccess,
  type ClassAccess,
} from './_classroom-access.js';
import type {
  AssignmentDoc,
  ClassDoc,
  ClassInvitationDoc,
  ClassInvitationRole,
  ClassMemberDoc,
  StudentDoc,
  SubmissionDoc,
} from '../src/lib/classroom/types.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

interface AuthIdentity {
  uid: string;
  email: string;
  displayName?: string;
}

interface TeacherClassContext {
  uid: string;
  classId: string;
  classRef: FirebaseFirestore.DocumentReference;
  classData: FirebaseFirestore.DocumentData;
  access: ClassAccess;
}

const nowIso = (): string => new Date().toISOString();

const compact = <T extends Record<string, unknown>>(value: T): T => Object.fromEntries(
  Object.entries(value).filter(([, item]) => item !== undefined),
) as T;

const safeId = (value: unknown, fallback: string): string => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text && text.length <= 150 && !text.includes('/') ? text : fallback;
};

const identityFromIdToken = async (idToken: unknown): Promise<AuthIdentity | null> => {
  if (typeof idToken !== 'string' || !idToken) return null;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    const record = await getAuth().getUser(decoded.uid).catch(() => null);
    return {
      uid: decoded.uid,
      email: normalizeTeacherEmail(decoded.email || record?.email || ''),
      displayName: decoded.name || record?.displayName || undefined,
    };
  } catch {
    return null;
  }
};

const teacherContext = async (
  db: Db,
  body: Body,
  res: VercelResponse,
  options: { classId?: unknown; manageMembers?: boolean } = {},
): Promise<TeacherClassContext | null> => {
  const identity = await identityFromIdToken(body.idToken);
  if (!identity) {
    res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });
    return null;
  }
  const classId = typeof options.classId === 'string'
    ? options.classId.trim()
    : typeof body.classId === 'string' ? body.classId.trim() : '';
  if (!classId || classId.includes('/')) {
    res.status(400).json({ error: 'Thiếu mã lớp hợp lệ.' });
    return null;
  }
  const record = await readClassAccess(db, classId, identity.uid);
  if (!record) {
    res.status(403).json({ error: 'Bạn không thuộc lớp này hoặc lớp không còn tồn tại.' });
    return null;
  }
  if (options.manageMembers && !record.access.canManageMembers) {
    res.status(403).json({ error: 'Chỉ chủ lớp hiện tại hoặc chủ gốc mới quản lý được thành viên.' });
    return null;
  }
  return { uid: identity.uid, classId, classRef: record.ref, classData: record.data, access: record.access };
};

const assignmentFromSnapshot = (id: string, data: FirebaseFirestore.DocumentData): AssignmentDoc => ({
  id,
  ...data,
}) as AssignmentDoc;

const submissionFromSnapshot = (id: string, data: FirebaseFirestore.DocumentData): SubmissionDoc => ({
  id,
  ...data,
}) as SubmissionDoc;

const studentFromSnapshot = (id: string, data: FirebaseFirestore.DocumentData, classId: string): StudentDoc => ({
  id,
  classId,
  ...data,
}) as StudentDoc;

const classOwnerId = (data: FirebaseFirestore.DocumentData): string =>
  typeof data.ownerId === 'string' && data.ownerId.trim() ? data.ownerId.trim() : String(data.teacherId || '');

const classTeacherIds = (data: FirebaseFirestore.DocumentData): string[] => [...new Set([
  ...(Array.isArray(data.teacherIds) ? data.teacherIds.filter((id: unknown): id is string => typeof id === 'string') : []),
  typeof data.teacherId === 'string' ? data.teacherId : '',
  classOwnerId(data),
].filter(Boolean))];

const teacherAssignmentProjection = (id: string, data: FirebaseFirestore.DocumentData): AssignmentDoc => {
  const allowed = compact({
    id,
    teacherId: data.teacherId,
    classId: data.classId,
    title: data.title,
    description: data.description,
    type: data.type,
    examId: data.examId,
    dueAt: data.dueAt,
    maxScore: data.maxScore,
    answerKey: data.answerKey,
    rubric: data.rubric,
    attachments: data.attachments,
    sourceText: data.sourceText,
    sourceImageUrls: data.sourceImageUrls,
    gradingInstructions: data.gradingInstructions,
    answerKeyImageUrls: data.answerKeyImageUrls,
    answerKeyByAi: data.answerKeyByAi,
    teacherNote: data.teacherNote,
    hasAnswerKey: data.hasAnswerKey,
    isOpen: data.isOpen,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
  });
  return allowed as AssignmentDoc;
};

export const handleListAccessibleClasses = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const identity = await identityFromIdToken(body.idToken);
  if (!identity) return void res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });

  const owned = await db.collection('classes').where('teacherId', '==', identity.uid).get();
  const memberships = await db.collection('classMembers').where('uid', '==', identity.uid).get();
  const ids = new Set<string>(owned.docs.map(document => document.id));
  for (const document of memberships.docs) {
    const data = document.data() || {};
    if (data.status === 'active' && typeof data.classId === 'string') ids.add(data.classId);
  }

  const classes = (await Promise.all([...ids].map(async classId => {
    const context = await readClassAccess(db, classId, identity.uid);
    if (!context) return null;
    const [students, assignments] = await Promise.all([
      context.ref.collection('students').get(),
      db.collection('assignments').where('classId', '==', classId).get(),
    ]);
    return {
      id: classId,
      ...context.data,
      students: students.docs.map(document => studentFromSnapshot(document.id, document.data() || {}, classId)),
      assignments: assignments.docs.map(document => teacherAssignmentProjection(document.id, document.data() || {})),
      access: {
        role: context.access.role,
        isOwner: context.access.isOwner,
        isOriginalOwner: context.access.isOriginalOwner,
      },
    };
  }))).filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => String((left as Record<string, unknown>).name || '')
      .localeCompare(String((right as Record<string, unknown>).name || ''), 'vi'));

  return void res.status(200).json({ classes });
};

export const handleGetAccessibleClass = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  return void res.status(200).json({ class: { id: context.classId, ...context.classData } });
};

export const handleTeacherAssignments = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const snapshot = await db.collection('assignments').where('classId', '==', context.classId).get();
  const assignments = snapshot.docs
    .map(document => teacherAssignmentProjection(document.id, document.data() || {}))
    .filter(assignment => assignment.teacherId === context.classData.teacherId)
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
  return void res.status(200).json({ assignments });
};

const examContext = async (db: Db, body: Body, res: VercelResponse): Promise<{
  context: TeacherClassContext;
  examRef: FirebaseFirestore.DocumentReference;
  exam: FirebaseFirestore.DocumentData;
} | null> => {
  const examId = typeof body.examId === 'string' ? body.examId.trim() : '';
  if (!examId || examId.includes('/')) {
    res.status(400).json({ error: 'Thiếu mã đề hợp lệ.' });
    return null;
  }
  const context = await teacherContext(db, body, res);
  if (!context) return null;
  const examRef = db.collection('exams').doc(examId);
  const snapshot = await examRef.get();
  if (!snapshot.exists) {
    res.status(404).json({ error: 'Không tìm thấy đề thi.' });
    return null;
  }
  const exam = snapshot.data() || {};
  if (exam.teacherId !== context.classData.teacherId) {
    res.status(403).json({ error: 'Đề thi không thuộc không gian dữ liệu của lớp này.' });
    return null;
  }
  return { context, examRef, exam };
};

export const handleTeacherExams = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const snapshot = await db.collection('exams').where('teacherId', '==', context.classData.teacherId).get();
  const exams = snapshot.docs
    .map(document => ({ id: document.id, ...(document.data() || {}) }))
    .sort((left, right) => String((right as Record<string, unknown>).createdAt || '')
      .localeCompare(String((left as Record<string, unknown>).createdAt || '')));
  return void res.status(200).json({ exams });
};

export const handleTeacherExam = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const found = await examContext(db, body, res);
  if (!found) return;
  return void res.status(200).json({ exam: { id: found.examRef.id, ...found.exam } });
};

const normalizePersonName = (value: unknown): string => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLocaleLowerCase('vi-VN');

export const handleTeacherExamSubmissions = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const found = await examContext(db, body, res);
  if (!found) return;
  const rosterSnapshot = await found.context.classRef.collection('students').get();
  const roster = rosterSnapshot.docs.map(document => ({
    id: document.id,
    name: normalizePersonName(document.data()?.name),
  }));
  const byId = new Map(roster.map(student => [student.id, student]));
  const byName = new Map<string, typeof roster>();
  for (const student of roster) byName.set(student.name, [...(byName.get(student.name) || []), student]);
  const classNames = new Set([
    found.context.classData.name,
    ...(Array.isArray(found.context.classData.previousNames) ? found.context.classData.previousNames : []),
  ].map(normalizePersonName).filter(Boolean));
  const submissionsSnapshot = await db.collection('examSubmissions').where('examId', '==', found.examRef.id).get();
  const submissions = submissionsSnapshot.docs
    .map(document => ({ id: document.id, ...(document.data() || {}) }) as Record<string, unknown>)
    .filter(submission => {
      const studentId = typeof submission.studentId === 'string' ? submission.studentId : '';
      if (studentId) {
        const student = byId.get(studentId);
        return Boolean(student) && (!submission.studentName || normalizePersonName(submission.studentName) === student?.name);
      }
      const matches = byName.get(normalizePersonName(submission.studentName));
      const submittedClass = normalizePersonName(submission.studentClass);
      return matches?.length === 1 && (!submittedClass || classNames.has(submittedClass));
    });
  submissions.sort((left, right) => String(right.submittedAt || right.startedAt || '').localeCompare(String(left.submittedAt || left.startedAt || '')));
  return void res.status(200).json({ submissions });
};

export const handleTeacherSubmissions = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  let classId = typeof body.classId === 'string' ? body.classId.trim() : '';
  const assignmentId = typeof body.assignmentId === 'string' ? body.assignmentId.trim() : '';
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  if (!classId && assignmentId) {
    const assignmentSnapshot = await db.collection('assignments').doc(assignmentId).get();
    classId = typeof assignmentSnapshot.data()?.classId === 'string' ? assignmentSnapshot.data()?.classId : '';
  }
  if (!classId && studentId) {
    const identity = await identityFromIdToken(body.idToken);
    if (!identity) return void res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });
    const snapshot = await db.collection('submissions').where('studentId', '==', studentId).get();
    const submissions: SubmissionDoc[] = [];
    for (const document of snapshot.docs) {
      const submission = submissionFromSnapshot(document.id, document.data() || {});
      const context = await readClassAccess(db, String(submission.classId || ''), identity.uid);
      if (context && submission.teacherId === context.data.teacherId) submissions.push(submission);
    }
    submissions.sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
    return void res.status(200).json({ submissions });
  }
  const context = await teacherContext(db, { ...body, classId }, res);
  if (!context) return;
  const snapshot = await db.collection('submissions').where('classId', '==', context.classId).get();
  const submissions = snapshot.docs
    .map(document => submissionFromSnapshot(document.id, document.data() || {}))
    .filter(submission => submission.teacherId === context.classData.teacherId)
    .filter(submission => !assignmentId || submission.assignmentId === assignmentId)
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
  return void res.status(200).json({ submissions });
};

export const handleTeacherRoster = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const snapshot = await context.classRef.collection('students').get();
  const students = snapshot.docs
    .map(document => ({ studentId: document.id, name: String(document.data()?.name || '') }))
    .filter(student => student.name)
    .sort((left, right) => left.name.localeCompare(right.name, 'vi'));
  return void res.status(200).json({ students });
};

export const handleCreateAssignment = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const raw = body.assignment;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return void res.status(400).json({ error: 'Thiếu dữ liệu bài giao.' });
  const input = raw as Body;
  const context = await teacherContext(db, { ...body, classId: input.classId }, res);
  if (!context) return;
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) return void res.status(422).json({ error: 'Tên bài giao không được để trống.' });
  const id = safeId(input.id, `asg_${Date.now()}_${Math.random().toString(16).slice(2)}`);
  const now = nowIso();
  const assignment = compact({
    ...input,
    id,
    teacherId: String(context.classData.teacherId || context.uid),
    classId: context.classId,
    title,
    description: typeof input.description === 'string' ? input.description : '',
    type: 'upload',
    isOpen: input.isOpen !== false,
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : now,
    updatedAt: now,
    createdBy: context.uid,
    updatedBy: context.uid,
  });
  await db.collection('assignments').doc(id).set(assignment);
  return void res.status(200).json({ assignment });
};

/** Tạo projection bài giao cho đề online, không sao chép đáp án vào assignment. */
export const handleCreateExamAssignment = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const examId = typeof body.examId === 'string' ? body.examId.trim() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!examId || examId.includes('/') || !title) return void res.status(422).json({ error: 'Thiếu mã đề hoặc tên bài giao.' });
  const examRef = db.collection('exams').doc(examId);
  const examSnapshot = await examRef.get();
  if (!examSnapshot.exists) return void res.status(404).json({ error: 'Không tìm thấy đề thi.' });
  const exam = examSnapshot.data() || {};
  if (exam.teacherId !== context.classData.teacherId) return void res.status(403).json({ error: 'Đề thi không thuộc lớp này.' });

  const existing = await db.collection('assignments').where('classId', '==', context.classId).get();
  const current = existing.docs.find(document => document.data()?.type === 'exam' && document.data()?.examId === examId);
  const now = nowIso();
  const id = current?.id || `exam_${encodeURIComponent(context.classId)}_${encodeURIComponent(examId)}`;
  const assignment = compact({
    id,
    teacherId: String(context.classData.teacherId || context.uid),
    classId: context.classId,
    title,
    description: '',
    type: 'exam',
    examId,
    dueAt: typeof body.dueAt === 'string' ? body.dueAt : undefined,
    maxScore: typeof body.maxScore === 'number' && Number.isFinite(body.maxScore) ? body.maxScore : exam.maxScore,
    isOpen: body.isOpen !== false,
    createdAt: current?.data()?.createdAt || now,
    updatedAt: now,
    createdBy: current?.data()?.createdBy || context.uid,
    updatedBy: context.uid,
  });
  await db.collection('assignments').doc(id).set(assignment);
  return void res.status(200).json({ assignment });
};

const assignmentContext = async (db: Db, body: Body, res: VercelResponse): Promise<{
  context: TeacherClassContext;
  assignmentRef: FirebaseFirestore.DocumentReference;
  assignment: FirebaseFirestore.DocumentData;
} | null> => {
  const assignmentId = typeof body.assignmentId === 'string' ? body.assignmentId.trim() : '';
  if (!assignmentId || assignmentId.includes('/')) {
    res.status(400).json({ error: 'Thiếu mã bài giao hợp lệ.' });
    return null;
  }
  const assignmentRef = db.collection('assignments').doc(assignmentId);
  const snapshot = await assignmentRef.get();
  if (!snapshot.exists) {
    res.status(404).json({ error: 'Bài giao không còn tồn tại.' });
    return null;
  }
  const assignment = snapshot.data() || {};
  const context = await teacherContext(db, { ...body, classId: assignment.classId }, res);
  if (!context) return null;
  if (assignment.teacherId !== context.classData.teacherId || assignment.classId !== context.classId) {
    res.status(403).json({ error: 'Bài giao không thuộc lớp được cấp quyền.' });
    return null;
  }
  return { context, assignmentRef, assignment };
};

export const handleUpdateAssignment = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const found = await assignmentContext(db, body, res);
  if (!found) return;
  const action = String(body.action || '');
  const patch: Body = { updatedAt: nowIso(), updatedBy: found.context.uid };
  if (action === 'renameAssignment') {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return void res.status(422).json({ error: 'Tên bài giao không được để trống.' });
    patch.title = title;
  } else if (action === 'updateAssignmentContent') {
    const raw = body.patch;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return void res.status(422).json({ error: 'Nội dung cập nhật không hợp lệ.' });
    for (const key of ['answerKey', 'rubric', 'gradingInstructions', 'sourceText', 'teacherNote']) {
      if (typeof (raw as Body)[key] === 'string') patch[key] = (raw as Body)[key];
    }
  } else if (action === 'updateAssignmentDeadline') {
    if (body.dueAt !== null && typeof body.dueAt !== 'string') return void res.status(422).json({ error: 'Hạn nộp không hợp lệ.' });
    patch.dueAt = body.dueAt || null;
  } else if (action === 'setAssignmentOpen') {
    if (typeof body.isOpen !== 'boolean') return void res.status(422).json({ error: 'Trạng thái bài giao không hợp lệ.' });
    patch.isOpen = body.isOpen;
  } else {
    return void res.status(400).json({ error: 'Thao tác bài giao không hợp lệ.' });
  }
  await found.assignmentRef.update(patch);
  return void res.status(200).json({ updated: true, assignmentId: found.assignmentRef.id });
};

export const handleRenameClass = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return void res.status(422).json({ error: 'Tên lớp không được để trống.' });
  const currentName = typeof context.classData.name === 'string' ? context.classData.name.trim() : '';
  const previousNames = Array.isArray(context.classData.previousNames)
    ? context.classData.previousNames.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
  const patch = compact({
    name,
    ...(typeof body.track === 'string' ? { track: body.track.trim() } : {}),
    updatedAt: nowIso(),
    updatedBy: context.uid,
    ...(currentName && currentName !== name
      ? { previousNames: [...new Set([...previousNames, currentName])].slice(-20) }
      : {}),
  });
  await context.classRef.update(patch);
  return void res.status(200).json({ updated: true, classId: context.classId, ...patch });
};

export const handleRenameStudent = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!studentId || !name) return void res.status(422).json({ error: 'Tên học sinh không được để trống.' });
  const studentRef = context.classRef.collection('students').doc(studentId);
  const snapshot = await studentRef.get();
  if (!snapshot.exists) return void res.status(404).json({ error: 'Không tìm thấy học sinh trong lớp.' });
  await studentRef.update({ name, updatedAt: nowIso(), updatedBy: context.uid });
  return void res.status(200).json({ updated: true, classId: context.classId, studentId, name });
};

export const handleAddStudent = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const studentId = safeId(body.studentId, `student_${Date.now()}_${Math.random().toString(16).slice(2)}`);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!name || !code) return void res.status(422).json({ error: 'Thiếu tên hoặc mã học sinh.' });
  const studentRef = context.classRef.collection('students').doc(studentId);
  if ((await studentRef.get()).exists) return void res.status(409).json({ error: 'Mã học sinh đã tồn tại.' });
  const student = compact({ id: studentId, classId: context.classId, teacherId: context.classData.teacherId, name, code, status: 'active', progress: 0, createdAt: nowIso(), updatedBy: context.uid });
  await studentRef.set(student);
  await context.classRef.update({ studentCount: Number(context.classData.studentCount || 0) + 1, updatedAt: nowIso(), updatedBy: context.uid });
  return void res.status(200).json({ student });
};

const memberRows = async (db: Db, classId: string): Promise<ClassMemberDoc[]> => {
  const snapshot = await db.collection('classMembers').where('classId', '==', classId).get();
  return snapshot.docs.map(document => ({ id: document.id, ...(document.data() || {}) } as ClassMemberDoc));
};

export const handleTeacherMembers = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const members = (await memberRows(db, context.classId)).filter(member => member.status === 'active');
  const ownerId = classOwnerId(context.classData);
  if (!members.some(member => member.uid === ownerId && member.status === 'active')) {
    const ownerRecord = await getAuth().getUser(ownerId).catch(() => null);
    members.unshift(memberDoc(context.classId, ownerId, {
      classId: context.classId,
      uid: ownerId,
      email: normalizeTeacherEmail(ownerRecord?.email || context.classData.ownerEmail || ''),
      displayName: ownerRecord?.displayName,
      role: 'owner',
      status: 'active',
      createdAt: String(context.classData.createdAt || nowIso()),
      updatedAt: String(context.classData.updatedAt || nowIso()),
    }));
  }
  const invitations = await db.collection('classInvitations').where('classId', '==', context.classId).get();
  return void res.status(200).json({
    members,
    invitations: invitations.docs
      .map(document => ({ id: document.id, ...(document.data() || {}) } as ClassInvitationDoc))
      .filter(invitation => invitation.status === 'pending'),
    access: {
      role: context.access.role,
      isOwner: context.access.isOwner,
      isOriginalOwner: context.access.isOriginalOwner,
      originalOwnerId: context.access.originalOwnerId,
      canManageMembers: context.access.canManageMembers,
    },
  });
};

export const handleTeacherInvitations = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const identity = await identityFromIdToken(body.idToken);
  if (!identity) return void res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });
  const snapshot = await db.collection('classInvitations').where('inviteeEmail', '==', identity.email).get();
  const invitations = await Promise.all(snapshot.docs
    .filter(document => document.data()?.status === 'pending')
    .filter(document => !document.data()?.inviteeUid || document.data()?.inviteeUid === identity.uid)
    .map(async document => {
      const invitation = { id: document.id, ...(document.data() || {}) } as ClassInvitationDoc;
      const classSnapshot = await db.collection('classes').doc(invitation.classId).get();
      return { ...invitation, className: String(classSnapshot.data()?.name || invitation.classId) };
    }));
  return void res.status(200).json({ invitations });
};

export const handleInviteTeacher = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res, { manageMembers: true });
  if (!context) return;
  const email = normalizeTeacherEmail(body.email);
  if (!email || !email.includes('@') || email.length > 320) return void res.status(422).json({ error: 'Email giáo viên không hợp lệ.' });
  const role = body.role === 'transfer_owner' ? 'transfer_owner' : body.role === 'co_owner' ? 'co_owner' : '';
  if (!role) return void res.status(422).json({ error: 'Vai trò lời mời không hợp lệ.' });
  const inviter = await identityFromIdToken(body.idToken);
  if (!inviter) return void res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn.' });
  if (email === inviter.email) return void res.status(409).json({ error: 'Không thể tự mời chính mình.' });

  const user = await getAuth().getUserByEmail(email).catch(() => null);
  if (user?.uid === classOwnerId(context.classData)) return void res.status(409).json({ error: 'Giáo viên này đã là chủ lớp.' });
  const existing = await memberRows(db, context.classId);
  if (user?.uid && existing.some(member => member.uid === user.uid && member.status === 'active')) {
    return void res.status(409).json({ error: 'Giáo viên này đã ở trong lớp.' });
  }
  const pending = await db.collection('classInvitations').where('classId', '==', context.classId).get();
  if (pending.docs.some(document => document.data()?.inviteeEmail === email && document.data()?.status === 'pending')) {
    return void res.status(409).json({ error: 'Email này đã có lời mời đang chờ.' });
  }
  const id = `inv_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const invitation: ClassInvitationDoc = {
    id,
    classId: context.classId,
    inviterUid: inviter.uid,
    inviterEmail: inviter.email,
    inviteeEmail: email,
    ...(user?.uid ? { inviteeUid: user.uid } : {}),
    role: role as ClassInvitationRole,
    status: 'pending',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await db.collection('classInvitations').doc(id).set(invitation);
  return void res.status(200).json({ invitation, delivery: 'in_app' });
};

export const handleAcceptTeacherInvitation = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const identity = await identityFromIdToken(body.idToken);
  if (!identity) return void res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });
  const invitationId = typeof body.invitationId === 'string' ? body.invitationId.trim() : '';
  if (!invitationId || invitationId.includes('/')) return void res.status(400).json({ error: 'Thiếu mã lời mời.' });
  const invitationRef = db.collection('classInvitations').doc(invitationId);
  const invitationSnap = await invitationRef.get();
  if (!invitationSnap.exists) return void res.status(404).json({ error: 'Lời mời không còn tồn tại.' });
  const invitation = invitationSnap.data() || {};
  if (invitation.status !== 'pending') return void res.status(409).json({ error: 'Lời mời này đã được xử lý.' });
  if (invitation.inviteeEmail !== identity.email || (invitation.inviteeUid && invitation.inviteeUid !== identity.uid)) {
    return void res.status(403).json({ error: 'Lời mời không dành cho tài khoản đang đăng nhập.' });
  }
  const classRef = db.collection('classes').doc(String(invitation.classId || ''));
  const classSnap = await classRef.get();
  if (!classSnap.exists) return void res.status(404).json({ error: 'Lớp không còn tồn tại.' });
  if (typeof db.runTransaction !== 'function') return void res.status(503).json({ error: 'Máy chủ chưa hỗ trợ giao dịch chuyển quyền an toàn.' });

  const now = nowIso();
  await db.runTransaction(async transaction => {
    const [latestInvitation, latestClass] = await Promise.all([transaction.get(invitationRef), transaction.get(classRef)]);
    if (!latestInvitation.exists || latestInvitation.data()?.status !== 'pending' || !latestClass.exists) throw new Error('INVITATION_CONFLICT');
    const classData = latestClass.data() || {};
    const ownerId = classOwnerId(classData);
    const teacherIds = classTeacherIds(classData);
    const targetMemberRef = db.collection('classMembers').doc(classMemberId(String(invitation.classId), identity.uid));
    const targetMember = memberDoc(String(invitation.classId), identity.uid, {
      classId: String(invitation.classId),
      uid: identity.uid,
      email: identity.email,
      displayName: identity.displayName,
      role: invitation.role === 'transfer_owner' ? 'owner' : 'co_owner',
      status: 'active',
      invitedBy: String(invitation.inviterUid || ''),
      createdAt: now,
      updatedAt: now,
    });
    const nextTeacherIds = [...new Set([...teacherIds, identity.uid, ownerId])];
    const classPatch: Record<string, unknown> = { teacherIds: nextTeacherIds, updatedAt: now };
    if (invitation.role === 'transfer_owner') {
      classPatch.ownerId = identity.uid;
      const oldOwnerRef = db.collection('classMembers').doc(classMemberId(String(invitation.classId), ownerId));
      transaction.set(oldOwnerRef, memberDoc(String(invitation.classId), ownerId, {
        classId: String(invitation.classId), uid: ownerId, email: normalizeTeacherEmail(String(classData.ownerEmail || '')),
        role: 'co_owner', status: 'active', createdAt: String(classData.createdAt || now), updatedAt: now,
      }));
    }
    transaction.set(targetMemberRef, targetMember);
    transaction.update(classRef, classPatch as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>);
    transaction.update(invitationRef, { status: 'accepted', acceptedAt: now, updatedAt: now });
  }).catch(error => {
    if (error instanceof Error && error.message === 'INVITATION_CONFLICT') throw new Error('Lời mời vừa được xử lý bởi phiên khác.');
    throw error;
  });
  return void res.status(200).json({ accepted: true, classId: invitation.classId, role: invitation.role === 'transfer_owner' ? 'owner' : 'co_owner' });
};

export const handleDeclineTeacherInvitation = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const identity = await identityFromIdToken(body.idToken);
  if (!identity) return void res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' });
  const invitationId = typeof body.invitationId === 'string' ? body.invitationId.trim() : '';
  const ref = db.collection('classInvitations').doc(invitationId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return void res.status(404).json({ error: 'Lời mời không còn tồn tại.' });
  const invitation = snapshot.data() || {};
  if (invitation.inviteeEmail !== identity.email || invitation.inviteeUid && invitation.inviteeUid !== identity.uid) return void res.status(403).json({ error: 'Bạn không có quyền xử lý lời mời này.' });
  if (invitation.status !== 'pending') return void res.status(409).json({ error: 'Lời mời này đã được xử lý.' });
  await ref.update({ status: 'declined', updatedAt: nowIso() });
  return void res.status(200).json({ declined: true });
};

export const handleLeaveClass = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const members = await memberRows(db, context.classId);
  const hasAnotherOwner = members.some(member => member.status === 'active' && member.role === 'owner' && member.uid !== context.uid)
    || context.access.ownerId !== context.uid;
  if (!canLeaveClass(context.access, hasAnotherOwner)) return void res.status(409).json({ error: 'Chủ lớp hiện tại phải chuyển quyền trước khi rời lớp.' });
  await db.collection('classMembers').doc(classMemberId(context.classId, context.uid)).delete();
  await context.classRef.update({ teacherIds: classTeacherIds(context.classData).filter(id => id !== context.uid), updatedAt: nowIso() });
  return void res.status(200).json({ left: true, classId: context.classId });
};

export const handleRemoveTeacher = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const targetUid = typeof body.targetUid === 'string' ? body.targetUid.trim() : '';
  const context = await teacherContext(db, body, res, { manageMembers: true });
  if (!context) return;
  if (!canRemoveClassMember(context.access, targetUid)) return void res.status(403).json({ error: 'Không thể xóa chủ lớp hiện tại hoặc tài khoản này.' });
  const memberRef = db.collection('classMembers').doc(classMemberId(context.classId, targetUid));
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) return void res.status(404).json({ error: 'Không tìm thấy giáo viên trong lớp.' });
  await memberRef.update({ status: 'removed', updatedAt: nowIso(), removedBy: context.uid });
  await context.classRef.update({ teacherIds: classTeacherIds(context.classData).filter(id => id !== targetUid), updatedAt: nowIso() });
  return void res.status(200).json({ removed: true, classId: context.classId, uid: targetUid });
};

export const handleTeacherAction = async (db: Db, body: Body, res: VercelResponse): Promise<boolean> => {
  const action = String(body.action || '');
  if (action === 'listAccessibleClasses') { await handleListAccessibleClasses(db, body, res); return true; }
  if (action === 'getAccessibleClass') { await handleGetAccessibleClass(db, body, res); return true; }
  if (action === 'teacherAssignments') { await handleTeacherAssignments(db, body, res); return true; }
  if (action === 'teacherSubmissions') { await handleTeacherSubmissions(db, body, res); return true; }
  if (action === 'teacherExams') { await handleTeacherExams(db, body, res); return true; }
  if (action === 'teacherExam') { await handleTeacherExam(db, body, res); return true; }
  if (action === 'teacherExamSubmissions') { await handleTeacherExamSubmissions(db, body, res); return true; }
  if (action === 'teacherRoster') { await handleTeacherRoster(db, body, res); return true; }
  if (action === 'createAssignment') { await handleCreateAssignment(db, body, res); return true; }
  if (action === 'createExamAssignment') { await handleCreateExamAssignment(db, body, res); return true; }
  if (['renameAssignment', 'updateAssignmentContent', 'updateAssignmentDeadline', 'setAssignmentOpen'].includes(action)) { await handleUpdateAssignment(db, body, res); return true; }
  if (action === 'renameClass') { await handleRenameClass(db, body, res); return true; }
  if (action === 'renameStudent') { await handleRenameStudent(db, body, res); return true; }
  if (action === 'addStudent') { await handleAddStudent(db, body, res); return true; }
  if (action === 'teacherMembers') { await handleTeacherMembers(db, body, res); return true; }
  if (action === 'teacherInvitations') { await handleTeacherInvitations(db, body, res); return true; }
  if (action === 'inviteTeacher') { await handleInviteTeacher(db, body, res); return true; }
  if (action === 'acceptTeacherInvitation') { await handleAcceptTeacherInvitation(db, body, res); return true; }
  if (action === 'declineTeacherInvitation') { await handleDeclineTeacherInvitation(db, body, res); return true; }
  if (action === 'leaveClass') { await handleLeaveClass(db, body, res); return true; }
  if (action === 'removeTeacher') { await handleRemoveTeacher(db, body, res); return true; }
  return false;
};
