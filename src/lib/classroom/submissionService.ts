import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes, uploadString } from 'firebase/storage';
import { auth, db, removeUndefinedFields, storage } from '../firebase';
import { mergeTopics, removeEvidence } from './profileMerge';
import {
  ASSIGNMENTS_COL,
  CLASSES_COL,
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
  answerKeyByAi?: boolean;
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
    answerKeyByAi: input.answerKeyByAi === true,
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

/**
 * Hai điều bắt buộc với mọi truy vấn phía giáo viên ở đây:
 *
 * 1. PHẢI lọc theo `teacherId`, kể cả khi đã lọc theo `classId` hay `assignmentId`.
 *    Firestore KHÔNG chấm luật trên từng document trả về — nó đòi truy vấn TỰ CHỨNG MINH được
 *    mọi kết quả đều thoả luật. Luật đòi `resource.data.teacherId == request.auth.uid`, nên thiếu
 *    ràng buộc đó trong truy vấn là bị từ chối thẳng, dù dữ liệu hoàn toàn hợp lệ.
 *    Đây chính là lỗi "Missing or insufficient permissions" ngày 2026-08-21.
 *
 * 2. KHÔNG dùng `orderBy`, sắp xếp trong máy. Toàn ràng buộc bằng nhau thì Firestore tự lo,
 *    không cần index tổ hợp; thêm `orderBy` là lại phải khai và deploy index.
 */
const moiNhatTruoc = <T extends { createdAt?: string }>(ds: T[]): T[] =>
  [...ds].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

export const listAssignmentsForClass = async (classId: string, teacherId: string): Promise<AssignmentDoc[]> => {
  const snap = await getDocs(query(
    collection(db, ASSIGNMENTS_COL),
    where('teacherId', '==', teacherId),
    where('classId', '==', classId),
  ));
  return moiNhatTruoc(snap.docs.map(d => d.data() as AssignmentDoc));
};

/**
 * Sửa đáp án / hướng dẫn chấm của bài ĐÃ giao.
 *
 * Thiếu hàm này thì cả cơ chế "đáp án AI giải ra phải để giáo viên soát" chỉ đúng đúng một lần
 * lúc bấm Giao bài. Phát hiện AI giải sai câu 5 sau đó là bó tay, mà cả lớp thì vẫn sắp bị chấm
 * theo câu 5 sai đó.
 */
export const updateAssignmentContent = async (
  assignmentId: string,
  patch: { answerKey?: string; rubric?: string },
): Promise<void> => {
  await updateDoc(doc(db, ASSIGNMENTS_COL, assignmentId), {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
};

/** Xoá bài giao. Nơi gọi phải chặn khi đã có bài nộp, để không bỏ lại bài nộp mồ côi. */
export const deleteAssignment = async (assignmentId: string): Promise<void> => {
  await deleteDoc(doc(db, ASSIGNMENTS_COL, assignmentId));
};

export const setAssignmentOpen = async (assignmentId: string, isOpen: boolean): Promise<void> => {
  await updateDoc(doc(db, ASSIGNMENTS_COL, assignmentId), { isOpen, updatedAt: new Date().toISOString() });
};

/**
 * Đổi hạn nộp của bài đã giao (hoặc bỏ hẳn hạn khi truyền null). Chỉ đụng `dueAt` —
 * nhãn nộp sớm/muộn của học sinh tính ĐỘNG lúc hiển thị nên mọi bài cũ tự phân loại lại theo hạn mới.
 */
export const updateAssignmentDeadline = async (
  assignmentId: string,
  dueAt: string | null,
): Promise<void> => {
  await updateDoc(doc(db, ASSIGNMENTS_COL, assignmentId), {
    dueAt: dueAt ? dueAt : deleteField(),
    updatedAt: new Date().toISOString(),
  });
};

export const listSubmissionsForAssignment = async (assignmentId: string, teacherId: string): Promise<SubmissionDoc[]> => {
  const snap = await getDocs(query(
    collection(db, SUBMISSIONS_COL),
    where('teacherId', '==', teacherId),
    where('assignmentId', '==', assignmentId),
  ));
  return moiNhatTruoc(snap.docs.map(d => d.data() as SubmissionDoc));
};

/** Bài nộp của một học sinh, dùng cho báo cáo phía giáo viên. */
export const listSubmissionsForStudent = async (studentId: string, teacherId: string): Promise<SubmissionDoc[]> => {
  const snap = await getDocs(query(
    collection(db, SUBMISSIONS_COL),
    where('teacherId', '==', teacherId),
    where('studentId', '==', studentId),
  ));
  return moiNhatTruoc(snap.docs.map(d => d.data() as SubmissionDoc));
};

/**
 * MỌI bài nộp của một lớp — nạp MỘT lần để bảng giáo viên làm đủ ba việc:
 * đếm "x/y đã nộp" trên từng bài, lọc bài nộp khi mở bài, và tính tiến độ thật từng học sinh.
 * Hai ràng buộc bằng nhau (teacherId + classId) nên không cần index tổ hợp.
 */
export const listSubmissionsForClass = async (classId: string, teacherId: string): Promise<SubmissionDoc[]> => {
  const snap = await getDocs(query(
    collection(db, SUBMISSIONS_COL),
    where('teacherId', '==', teacherId),
    where('classId', '==', classId),
  ));
  return moiNhatTruoc(snap.docs.map(d => d.data() as SubmissionDoc));
};

/** Danh sách tên học sinh của lớp — để gắn tên vào từng bài nộp và liệt kê em nào chưa nộp. */
export interface RosterStudent {
  studentId: string;
  name: string;
}

export const listClassRoster = async (classId: string): Promise<RosterStudent[]> => {
  const snap = await getDocs(collection(db, CLASSES_COL, classId, 'students'));
  return snap.docs
    .map(d => ({ studentId: d.id, name: String(d.data()?.name || '') }))
    .filter(s => s.name)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
};

/**
 * Giáo viên sửa tay điểm/nhận xét sau khi máy chấm. Chỉ đụng các trường điểm —
 * không đụng định danh bài nộp; cờ editedByTeacher để màn hình phân biệt điểm máy và điểm người.
 */
export const updateSubmissionGradeManually = async (
  submissionId: string,
  patch: { score: number; maxScore: number; feedback: string },
): Promise<void> => {
  await updateDoc(doc(db, SUBMISSIONS_COL, submissionId), {
    'grade.score': patch.score,
    'grade.maxScore': patch.maxScore,
    'grade.feedback': patch.feedback,
    'grade.editedByTeacher': true,
    'grade.gradedAt': new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
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
