import { collection, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes, uploadString } from 'firebase/storage';
import { auth, db, removeUndefinedFields, storage } from '../firebase';
import { mergeTopics, removeEvidence } from './profileMerge';
import {
  ASSIGNMENTS_COL,
  STUDENT_PROFILES_COL,
  SUBMISSIONS_COL,
  type AssignmentAttachment,
  type AssignmentDoc,
  type StudentProfileDoc,
  type SubmissionDoc,
} from './types';

const newId = (prefix: string): string => {
  const rand = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${rand}`;
};

// ── Giáo viên: giao bài ──────────────────────────────────────────────────────

export interface NewAssignment {
  teacherId: string;
  classId: string;
  title: string;
  description?: string;
  /** Đáp án chuẩn dạng văn bản. Rỗng nghĩa là AI phải tự đọc đề trong ảnh học sinh nộp. */
  answerKey?: string;
  rubric?: string;
  maxScore?: number;
  dueAt?: string;
  attachments?: AssignmentAttachment[];
  answerKeyImageUrls?: string[];
}

/**
 * Tải file đề (PDF, ảnh, Word) lên Storage để học sinh mở ra xem.
 *
 * Đường dẫn gắn theo uid giáo viên vì rules của Storage không đọc được Firestore. Học sinh mở
 * bằng link tải có token nằm trong document bài giao — document đó đã được firestore.rules canh.
 */
export const uploadAssignmentFiles = async (
  teacherUid: string,
  files: File[],
): Promise<AssignmentAttachment[]> => {
  const ket: AssignmentAttachment[] = [];
  for (const file of files) {
    const an = file.name.replace(/[^\w.\-]+/g, '_');
    const fileRef = ref(storage, `assignments/${teacherUid}/${newId('de')}-${an}`);
    await uploadBytes(fileRef, file, { contentType: file.type || 'application/octet-stream' });
    ket.push({ name: file.name, url: await getDownloadURL(fileRef) });
  }
  return ket;
};

/** Ảnh đáp án (data URL) lên Storage. Chỉ dùng khi file gốc không rút được chữ. */
export const uploadAnswerKeyImages = async (teacherUid: string, images: string[]): Promise<string[]> => {
  const urls: string[] = [];
  for (const dataUrl of images) {
    const mime = /^data:([^;,]+);/.exec(dataUrl)?.[1] || 'image/jpeg';
    const fileRef = ref(storage, `assignments/${teacherUid}/${newId('dapan')}.${mime.split('/')[1] || 'jpg'}`);
    await uploadString(fileRef, dataUrl, 'data_url', { contentType: mime });
    urls.push(await getDownloadURL(fileRef));
  }
  return urls;
};

export const createAssignment = async (input: NewAssignment): Promise<AssignmentDoc> => {
  const now = new Date().toISOString();
  const assignment: AssignmentDoc & { answerKey: string; rubric: string; maxScore: number } = {
    id: newId('asg'),
    teacherId: input.teacherId,
    classId: input.classId,
    title: input.title,
    description: input.description || '',
    type: 'upload',
    dueAt: input.dueAt,
    attachments: input.attachments || [],
    answerKeyImageUrls: input.answerKeyImageUrls || [],
    isOpen: true,
    createdAt: now,
    updatedAt: now,
    answerKey: input.answerKey || '',
    rubric: input.rubric || '',
    maxScore: input.maxScore ?? 10,
  };
  await setDoc(doc(db, ASSIGNMENTS_COL, assignment.id), removeUndefinedFields(assignment));
  return assignment;
};

export const listAssignmentsForClass = async (classId: string): Promise<AssignmentDoc[]> => {
  const snap = await getDocs(query(
    collection(db, ASSIGNMENTS_COL),
    where('classId', '==', classId),
    orderBy('createdAt', 'desc'),
  ));
  return snap.docs.map(d => d.data() as AssignmentDoc);
};

export const setAssignmentOpen = async (assignmentId: string, isOpen: boolean): Promise<void> => {
  await updateDoc(doc(db, ASSIGNMENTS_COL, assignmentId), { isOpen, updatedAt: new Date().toISOString() });
};

export const listSubmissionsForAssignment = async (assignmentId: string): Promise<SubmissionDoc[]> => {
  const snap = await getDocs(query(
    collection(db, SUBMISSIONS_COL),
    where('assignmentId', '==', assignmentId),
    orderBy('createdAt', 'desc'),
  ));
  return snap.docs.map(d => d.data() as SubmissionDoc);
};

/**
 * Giáo viên duyệt điểm. Đây là CỬA DUY NHẤT để kết luận của máy đi vào hồ sơ tích luỹ —
 * bỏ duyệt thì bằng chứng của bài đó cũng bị gỡ ra, không để lại nhãn mồ côi.
 */
export const approveGrade = async (submission: SubmissionDoc, approved: boolean): Promise<void> => {
  const now = new Date().toISOString();
  await updateDoc(doc(db, SUBMISSIONS_COL, submission.id), {
    'grade.teacherApproved': approved,
    updatedAt: now,
  });

  const profileRef = doc(db, STUDENT_PROFILES_COL, submission.studentId);
  const snap = await getDoc(profileRef);
  const existing = snap.exists() ? ((snap.data() as StudentProfileDoc).topics || []) : [];

  const topics = approved
    ? mergeTopics({
        existing,
        weakTopics: (submission.grade as { weakTopics?: string[] } | undefined)?.weakTopics || [],
        submissionId: submission.id,
        now,
      })
    : removeEvidence(existing, submission.id, now);

  const profile: StudentProfileDoc = {
    studentId: submission.studentId,
    classId: submission.classId,
    teacherId: submission.teacherId,
    topics,
    updatedAt: now,
  };
  await setDoc(profileRef, removeUndefinedFields(profile));
};

// ── Học sinh: nộp bài ────────────────────────────────────────────────────────

export interface SubmitInput {
  classId: string;
  studentId: string;
  teacherId: string;
  /** null = bài em tự nộp, không phải bài được giao. */
  assignmentId: string | null;
  /** Ảnh dạng data URL. */
  images: string[];
  note?: string;
}

export const submitHomework = async (input: SubmitInput): Promise<SubmissionDoc> => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Phiên đăng nhập đã hết hạn. Tải lại trang rồi đăng nhập lại.');
  if (input.images.length === 0) throw new Error('Chưa chọn ảnh bài làm.');

  const submissionId = newId('sub');
  const fileUrls: string[] = [];

  for (let i = 0; i < input.images.length; i += 1) {
    const dataUrl = input.images[i];
    const mime = /^data:([^;,]+);/.exec(dataUrl)?.[1] || 'image/jpeg';
    // Đường dẫn gắn theo uid vì storage.rules không đọc được Firestore để kiểm studentLinks.
    const path = `homework/${uid}/${submissionId}-${i}.${mime.split('/')[1] || 'jpg'}`;
    const fileRef = ref(storage, path);
    await uploadString(fileRef, dataUrl, 'data_url', { contentType: mime });
    fileUrls.push(await getDownloadURL(fileRef));
  }

  const now = new Date().toISOString();
  const submission: SubmissionDoc = {
    id: submissionId,
    teacherId: input.teacherId,
    classId: input.classId,
    studentId: input.studentId,
    assignmentId: input.assignmentId,
    fileUrls,
    note: input.note || '',
    status: 'submitted',
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, SUBMISSIONS_COL, submissionId), removeUndefinedFields(submission));
  return submission;
};
