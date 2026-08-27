import { doc, setDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes, uploadString } from 'firebase/storage';
import { auth, db, removeUndefinedFields, storage } from '../firebase';
import type { ManualGradeInput } from './manualGrade';
import {
  SUBMISSIONS_COL,
  type AssignmentAttachment,
  type AssignmentDoc,
  type SubmissionAttachment,
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
  sourceText?: string;
  sourceImageUrls?: string[];
  gradingInstructions?: string;
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
    ket.push({ name: file.name, url: await getDownloadURL(fileRef), mimeType: file.type || undefined, size: file.size });
  }
  return ket;
};

/** Ảnh tham chiếu (data URL) lên Storage. Dùng cho ảnh đề/ảnh đáp án/PDF scan. */
export const uploadAssignmentImages = async (teacherUid: string, images: string[], prefix: string): Promise<string[]> => {
  const urls: string[] = [];
  for (const dataUrl of images) {
    const mime = /^data:([^;,]+);/.exec(dataUrl)?.[1] || 'image/jpeg';
    const fileRef = ref(storage, `assignments/${teacherUid}/${newId(prefix)}.${mime.split('/')[1] || 'jpg'}`);
    await uploadString(fileRef, dataUrl, 'data_url', { contentType: mime });
    urls.push(await getDownloadURL(fileRef));
  }
  return urls;
};

const callClassroomTeacherApi = async <T>(payload: Record<string, unknown>): Promise<T> => {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.isAnonymous) {
    throw new Error('Cần đăng nhập bằng tài khoản giáo viên để thực hiện thao tác này.');
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch('/api/classroom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, idToken }),
  });
  const data = await response.json().catch(() => null) as { error?: unknown } | null;
  if (!response.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `Máy chủ trả lỗi ${response.status}.`);
  }
  return data as T;
};

const callClassroomStudentApi = async <T>(payload: Record<string, unknown>): Promise<T> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Phiên đăng nhập đã hết hạn. Tải lại trang rồi đăng nhập lại.');
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch('/api/classroom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, idToken }),
  });
  const data = await response.json().catch(() => null) as { error?: unknown } | null;
  if (!response.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `Máy chủ trả lỗi ${response.status}.`);
  }
  return data as T;
};

/** Ảnh đáp án (data URL) lên Storage. Chỉ dùng khi file gốc không rút được chữ. */
export const uploadAnswerKeyImages = async (teacherUid: string, images: string[]): Promise<string[]> =>
  uploadAssignmentImages(teacherUid, images, 'dapan');

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
    sourceText: input.sourceText?.trim() || undefined,
    sourceImageUrls: input.sourceImageUrls || [],
    gradingInstructions: input.gradingInstructions?.trim() || undefined,
    answerKeyImageUrls: input.answerKeyImageUrls || [],
    answerKeyByAi: input.answerKeyByAi === true,
    isOpen: true,
    createdAt: now,
    updatedAt: now,
    answerKey: input.answerKey || '',
    rubric: input.rubric || '',
    maxScore: input.maxScore ?? 10,
  };
  const result = await callClassroomTeacherApi<{ assignment: AssignmentDoc }>({
    action: 'createAssignment',
    assignment: removeUndefinedFields(assignment),
  });
  return result.assignment;
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
  void teacherId;
  const result = await callClassroomTeacherApi<{ assignments: AssignmentDoc[] }>({ action: 'teacherAssignments', classId });
  return moiNhatTruoc(result.assignments || []);
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
  patch: { answerKey?: string; rubric?: string; gradingInstructions?: string },
): Promise<void> => {
  await callClassroomTeacherApi({ action: 'updateAssignmentContent', assignmentId, patch });
};

/** Xoá bài giao và toàn bộ file đề/ảnh đáp án trên Storage qua Admin SDK. */
export const deleteAssignment = async (assignmentId: string): Promise<void> => {
  await callClassroomTeacherApi({ action: 'deleteAssignment', assignmentId });
};

export const setAssignmentOpen = async (assignmentId: string, isOpen: boolean): Promise<void> => {
  await callClassroomTeacherApi({ action: 'setAssignmentOpen', assignmentId, isOpen });
};

/**
 * Đổi hạn nộp của bài đã giao (hoặc bỏ hẳn hạn khi truyền null). Chỉ đụng `dueAt` —
 * nhãn nộp sớm/muộn của học sinh tính ĐỘNG lúc hiển thị nên mọi bài cũ tự phân loại lại theo hạn mới.
 */
export const updateAssignmentDeadline = async (
  assignmentId: string,
  dueAt: string | null,
): Promise<void> => {
  await callClassroomTeacherApi({ action: 'updateAssignmentDeadline', assignmentId, dueAt });
};

export const listSubmissionsForAssignment = async (assignmentId: string, teacherId: string): Promise<SubmissionDoc[]> => {
  void teacherId;
  const result = await callClassroomTeacherApi<{ submissions: SubmissionDoc[] }>({ action: 'teacherSubmissions', assignmentId });
  return moiNhatTruoc(result.submissions || []);
};

/** Bài nộp của một học sinh, dùng cho báo cáo phía giáo viên. */
export const listSubmissionsForStudent = async (studentId: string, teacherId: string): Promise<SubmissionDoc[]> => {
  void teacherId;
  const result = await callClassroomTeacherApi<{ submissions: SubmissionDoc[] }>({ action: 'teacherSubmissions', studentId });
  return moiNhatTruoc(result.submissions || []);
};

/**
 * MỌI bài nộp của một lớp — nạp MỘT lần để bảng giáo viên làm đủ ba việc:
 * đếm "x/y đã nộp" trên từng bài, lọc bài nộp khi mở bài, và tính tiến độ thật từng học sinh.
 * Hai ràng buộc bằng nhau (teacherId + classId) nên không cần index tổ hợp.
 */
export const listSubmissionsForClass = async (classId: string, teacherId: string): Promise<SubmissionDoc[]> => {
  void teacherId;
  const result = await callClassroomTeacherApi<{ submissions: SubmissionDoc[] }>({ action: 'teacherSubmissions', classId });
  return moiNhatTruoc(result.submissions || []);
};

/** Danh sách tên học sinh của lớp — để gắn tên vào từng bài nộp và liệt kê em nào chưa nộp. */
export interface RosterStudent {
  studentId: string;
  name: string;
}

export const listClassRoster = async (classId: string): Promise<RosterStudent[]> => {
  const result = await callClassroomTeacherApi<{ students: RosterStudent[] }>({ action: 'teacherRoster', classId });
  return (result.students || []).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
};

/**
 * GV xoá HẲN một lượt nộp. Nếu còn attempt cũ, attempt cũ vẫn là lịch sử để đối chiếu;
 * học sinh vẫn có thể nộp attempt mới. (Khác với "Nộp lại" tạo attempt mới chồng lên lịch sử.)
 * Bài đã duyệt thì gỡ bằng chứng
 * khỏi hồ sơ tích luỹ và dọn file Storage qua server TRƯỚC khi xoá document. Nếu Storage lỗi,
 * API giữ nguyên document để giáo viên thử lại, không tạo trạng thái xoá nửa chừng trên giao diện.
 */
export const xoaBaiNopHocSinh = async (submission: SubmissionDoc): Promise<void> => {
  await callClassroomTeacherApi({ action: 'deleteSubmission', submissionId: submission.id });
};

/** Xóa riêng kết quả chấm; bài nộp, file và lịch sử vẫn được giữ để chấm lại. */
export const xoaDiemBaiNopHocSinh = async (submission: SubmissionDoc): Promise<void> => {
  await callClassroomTeacherApi({ action: 'deleteSubmissionGrade', submissionId: submission.id });
};

/**
 * Giáo viên sửa tay điểm/nhận xét sau khi máy chấm. Chỉ đụng các trường điểm —
 * không đụng định danh bài nộp; cờ editedByTeacher để màn hình phân biệt điểm máy và điểm người.
 */
export const updateSubmissionGradeManually = async (
  submission: SubmissionDoc,
  patch: ManualGradeInput,
): Promise<void> => {
  await callClassroomTeacherApi({ action: 'saveSubmissionGrade', submissionId: submission.id, grade: patch });
};

/**
 * Giáo viên duyệt điểm. Đây là CỬA DUY NHẤT để kết luận của máy đi vào hồ sơ tích luỹ —
 * bỏ duyệt thì bằng chứng của bài đó cũng bị gỡ ra, không để lại nhãn mồ côi.
 */
export const approveGrade = async (submission: SubmissionDoc, approved: boolean): Promise<void> => {
  await callClassroomTeacherApi({ action: 'approveSubmissionGrade', submissionId: submission.id, approved });
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
  /** File giữ nguyên (PDF/DOCX) để giáo viên mở bản gốc. */
  rawFiles?: File[];
  /** Chữ rút từ DOCX — đường chấm dùng khi không có ảnh. */
  textContent?: string;
  note?: string;
  /** Nếu có, tạo revision mới ghép với lượt này thay vì ghi một bài độc lập. */
  supplementOf?: string;
}

const attachmentKind = (file: File): SubmissionAttachment['kind'] => {
  const type = file.type.toLowerCase();
  if (type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name)) return 'image';
  if (type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf';
  if (type.includes('word') || /\.docx?$/i.test(file.name)) return 'document';
  return 'unknown';
};

export const submitHomework = async (input: SubmitInput): Promise<SubmissionDoc> => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Phiên đăng nhập đã hết hạn. Tải lại trang rồi đăng nhập lại.');
  if (input.images.length === 0 && (input.rawFiles || []).length === 0) throw new Error('Chưa chọn bài làm để nộp.');

  const submissionId = newId('sub');
  const fileUrls: string[] = [];
  const attachments: SubmissionAttachment[] = [];
  const uploadedRefs: ReturnType<typeof ref>[] = [];

  try {
    for (let i = 0; i < input.images.length; i += 1) {
      const dataUrl = input.images[i];
      const mime = /^data:([^;,]+);/.exec(dataUrl)?.[1] || 'image/jpeg';
      // Đường dẫn gắn theo uid vì storage.rules không đọc được Firestore để kiểm studentLinks.
      const path = `homework/${uid}/${submissionId}-${i}.${mime.split('/')[1] || 'jpg'}`;
      const fileRef = ref(storage, path);
      uploadedRefs.push(fileRef);
      await uploadString(fileRef, dataUrl, 'data_url', { contentType: mime });
      const url = await getDownloadURL(fileRef);
      fileUrls.push(url);
      attachments.push({ name: `Ảnh bài làm ${i + 1}`, url, mimeType: mime, kind: 'image' });
    }

    for (const file of input.rawFiles || []) {
      const an = file.name.replace(/[^\w.\-]+/g, '_');
      const fileRef = ref(storage, `homework/${uid}/${submissionId}-${an}`);
      uploadedRefs.push(fileRef);
      await uploadBytes(fileRef, file, { contentType: file.type || 'application/octet-stream' });
      const url = await getDownloadURL(fileRef);
      fileUrls.push(url);
      attachments.push({ name: file.name, url, mimeType: file.type || undefined, size: file.size, kind: attachmentKind(file) });
    }

    const now = new Date().toISOString();
    const submission: SubmissionDoc = {
      id: submissionId,
      teacherId: input.teacherId,
      classId: input.classId,
      studentId: input.studentId,
      assignmentId: input.assignmentId,
      ...(input.supplementOf ? { supplementOf: input.supplementOf } : {}),
      fileUrls,
      textContent: input.textContent?.trim() || '',
      attachments,
      note: input.note || '',
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    };

    if (input.supplementOf) {
      const result = await callClassroomStudentApi<{ submission: SubmissionDoc }>({
        action: 'createSupplementSubmission',
        submission: removeUndefinedFields(submission),
      });
      return result.submission;
    }

    await setDoc(doc(db, SUBMISSIONS_COL, submissionId), removeUndefinedFields(submission));
    return submission;
  } catch (error) {
    // Action revision có thể bị từ chối sau khi Storage đã nhận file (parent sai, quá 12 tệp,
    // hoặc mạng lỗi). Dọn các object vừa tạo để không để rác mồ côi; lượt nộp cũ vẫn nguyên.
    if (input.supplementOf && uploadedRefs.length > 0) {
      await Promise.allSettled(uploadedRefs.map(fileRef => deleteObject(fileRef)));
    }
    throw error;
  }
};
