/**
 * Mô hình dữ liệu lớp học — bộ xương dùng chung cho cả hai cửa vào:
 * giáo viên giao bài cho lớp, và học sinh tự nộp bài ("máy chấm bài về nhà").
 *
 * Khác với `TeacherClass` cũ trong `src/types.ts` (một mảng nằm trong document
 * `userSettings/{uid}`), các kiểu ở đây là document Firestore thật, để học sinh
 * đọc được phần của mình mà không đọc được của bạn khác.
 */

/** Lớp học của một giáo viên. */
export interface ClassDoc {
  id: string;
  teacherId: string;
  name: string;
  /** Ghi chú tự do: "Lớp chủ nhiệm", "Lộ trình Toán 1"... */
  track: string;
  grade: string;
  /** Mã học sinh gõ vào để vào lớp. Không chứa ký tự dễ nhìn nhầm. */
  joinCode: string;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

export type StudentStatus = 'active' | 'needs_support' | 'excellent';

/**
 * Học sinh trong lớp. CỐ Ý không chứa mã PIN — PIN nằm ở `studentSecrets`,
 * collection mà client không có quyền đọc, vì rules chỉ chặn được cả document
 * chứ không giấu được từng trường.
 */
export interface StudentDoc {
  id: string;
  classId: string;
  teacherId: string;
  name: string;
  /** Mã học sinh của trường, dùng làm tên đăng nhập. */
  code: string;
  status: StudentStatus;
  progress: number;
  createdAt: string;
}

/** PIN đã băm. Chỉ server (Admin SDK) đọc/ghi — rules từ chối mọi client. */
export interface StudentSecretDoc {
  studentId: string;
  classId: string;
  pinHash: string;
  updatedAt: string;
}

/**
 * Gắn một phiên đăng nhập ẩn danh với một học sinh cụ thể. Chỉ server ghi,
 * sau khi đã kiểm mã lớp + mã học sinh + PIN. Rules đọc document này để biết
 * người đang gọi là học sinh nào.
 */
export interface StudentLinkDoc {
  uid: string;
  studentId: string;
  classId: string;
  teacherId: string;
  createdAt: string;
}

export interface AssignmentAttachment {
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
}

export type AssignmentType = 'upload' | 'exam';

/** Một bài giáo viên giao cho lớp. */
export interface AssignmentDoc {
  id: string;
  teacherId: string;
  classId: string;
  title: string;
  description: string;
  type: AssignmentType;
  /** Chỉ có khi type === 'exam' — trỏ sang đề trong collection `exams`. */
  examId?: string;
  dueAt?: string;
  /** Đáp án chuẩn dạng văn bản — học sinh dùng để chọn chế độ "Tự chấm ngay". */
  answerKey?: string;
  /** Hướng dẫn chấm cho AI. */
  rubric?: string;
  /** Điểm tối đa, mặc định 10 khi không ghi. */
  maxScore?: number;
  /** File đề giáo viên đính kèm để học sinh mở ra xem (PDF, ảnh, Word). */
  attachments?: AssignmentAttachment[];
  /** Chữ rút từ file đề, dùng làm nguồn tham chiếu chung khi AI chấm cả lớp. */
  sourceText?: string;
  /** Ảnh đề/ảnh PDF scan đã chuẩn hoá, gửi một lần làm ngữ cảnh chấm. */
  sourceImageUrls?: string[];
  /** Lệnh nội bộ của giáo viên cho AI: phạm vi câu/bài, phần cần bỏ qua, cách xử lý đặc biệt. */
  gradingInstructions?: string;
  /** Ảnh đáp án khi không rút được chữ — gửi kèm MỖI lượt chấm nên tốn hơn bản có chữ. */
  answerKeyImageUrls?: string[];
  /** true khi đáp án do AI giải ra (giáo viên vẫn soát và sửa được trước khi giao). */
  answerKeyByAi?: boolean;
  isOpen: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SubmissionStatus = 'submitted' | 'grading' | 'graded' | 'error';

export type QuestionResultStatus =
  | 'correct'
  | 'partially_correct'
  | 'incorrect'
  | 'unreadable'
  | 'not_attempted';

/** Chi tiết có cấu trúc của một câu — để học sinh biết mình sai ở đâu, không chỉ nhận một điểm tổng. */
export interface QuestionResult {
  /** Giữ đúng số câu trong đề: "Câu 1", "Bài 2a"... */
  questionNumber: string;
  status: QuestionResultStatus;
  score: number;
  maxScore: number;
  /** Trích phần học sinh đã làm; không được AI tự bịa nếu ảnh/chữ không đọc được. */
  studentAnswer: string;
  /** Đáp án hoặc mốc chấm tương ứng của câu. */
  expectedAnswer: string;
  /** Ví dụ: "Sai dấu", "Thiếu bước biến đổi", "Chưa trả lời". */
  errorType: string;
  /** Vì sao phần làm đó đúng/sai. */
  explanation: string;
  /** Một chỉ dẫn sửa cụ thể, có thể làm theo. */
  correction: string;
  /** Bài luyện tiếp theo, không phải một nhãn yếu chung chung. */
  nextPractice: string;
  /** 0..1; chỉ có khi AI tự đánh giá được độ chắc chắn. */
  confidence?: number;
  /** true khi phần này được bỏ qua có chủ đích theo lệnh riêng của giáo viên. */
  ignoredByTeacherInstruction?: boolean;
  /** true khi giáo viên cần xem lại vì dữ liệu mờ, thiếu hoặc AI không chắc. */
  needsTeacherReview: boolean;
}

/** Kết quả AI chấm, tách riêng để phân biệt rõ phần học sinh ghi và phần máy ghi. */
export interface SubmissionGrade {
  score: number;
  maxScore: number;
  /** Nhận xét viết cho học sinh đọc. */
  feedback: string;
  /** Ghi chú cho giáo viên — KHÔNG đưa nguyên văn cho học sinh. */
  noteForTeacher?: string;
  strengths: string[];
  weaknesses: string[];
  /** Chi tiết từng câu; optional để đọc được các bài chấm trước khi có schema này. */
  questionResults?: QuestionResult[];
  /** Chủ đề còn yếu, chỉ vào hồ sơ sau khi giáo viên duyệt. */
  weakTopics?: string[];
  /** true khi chấm mà không có đáp án chuẩn — kết quả kém tin cậy hơn. */
  gradedWithoutAnswerKey?: boolean;
  gradedAt: string;
  /** Nhận xét thô của giáo viên, nguồn để AI viết lại lời cho học sinh. Giữ để truy nguồn. */
  teacherNote?: string;
  /** true khi giáo viên đã xem và đồng ý — điều kiện để vào hồ sơ tích luỹ. */
  teacherApproved: boolean;
  /** true khi giáo viên sửa tay điểm/nhận xét sau khi máy chấm. */
  editedByTeacher?: boolean;
}

/**
 * Một bài nộp. `assignmentId` rỗng nghĩa là học sinh tự nộp, không phải bài
 * được giao — đó chính là cửa "máy chấm bài về nhà".
 */
export interface SubmissionDoc {
  id: string;
  teacherId: string;
  classId: string;
  studentId: string;
  assignmentId: string | null;
  /** Đường dẫn ảnh/PDF/Word trên Firebase Storage. */
  fileUrls: string[];
  /** Chữ rút từ file Word — đường AI dùng khi bài không phải ảnh. */
  textContent?: string;
  /** Metadata để giao diện mở đúng loại file thay vì cố render mọi file thành ảnh. */
  attachments?: SubmissionAttachment[];
  note: string;
  status: SubmissionStatus;
  grade?: SubmissionGrade;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export type SubmissionAttachmentKind = 'image' | 'pdf' | 'document' | 'unknown';

export interface SubmissionAttachment {
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  kind?: SubmissionAttachmentKind;
}

export type MasteryLevel = 'weak' | 'developing' | 'solid';

/** Một chủ đề trong hồ sơ, kèm bài làm làm bằng chứng. */
export interface ProfileTopic {
  topic: string;
  level: MasteryLevel;
  /** Bài nộp đã dẫn tới kết luận này. Không có bằng chứng thì không được ghi. */
  evidenceSubmissionIds: string[];
  updatedAt: string;
}

/** Hồ sơ tích luỹ của một học sinh. Học sinh đọc được, không ghi được. */
export interface StudentProfileDoc {
  studentId: string;
  classId: string;
  teacherId: string;
  topics: ProfileTopic[];
  updatedAt: string;
}

export const CLASSES_COL = 'classes';
export const STUDENTS_SUB = 'students';
export const STUDENT_SECRETS_SUB = 'studentSecrets';
export const STUDENT_LINKS_COL = 'studentLinks';
export const ASSIGNMENTS_COL = 'assignments';
export const SUBMISSIONS_COL = 'submissions';
export const STUDENT_PROFILES_COL = 'studentProfiles';
