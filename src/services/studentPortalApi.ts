import { signInAnonymously } from 'firebase/auth';
import { auth } from '../lib/firebase';
import type { StudentAssignmentView, SubmissionDoc } from '../lib/classroom/types';
import type { ExamSubmission } from '../types';
import type { StudentScoreView } from '../lib/classroom/scoreBook';
import type { CompetencyPortfolioDoc, PortfolioEntry } from '../lib/classroom/competency/studentPortfolio';
import type { StudentAiCostView } from '../lib/classroom/studentAiCost';
import type { StudentDiscoverCatalogItem } from '../lib/discover/types';
import type { AdaptiveLesson, AssessmentAttempt } from '../lib/adaptive/types';
import { moTaLoiHttp } from '../lib/httpErrorText';

export interface RosterEntry {
  studentId: string;
  name: string;
}

export interface RosterResponse {
  classId: string;
  className: string;
  students: RosterEntry[];
}

export interface LoginResponse {
  studentId: string;
  classId: string;
  teacherId: string;
  className: string;
  studentName: string;
}

export interface StudentLoginSession extends LoginResponse {
  anonymousUid: string;
}

const STUDENT_LOGIN_SESSION_KEY = 'smartplan-ai:live-student-session';
const LOGIN_RESPONSE_KEYS: (keyof LoginResponse)[] = [
  'studentId',
  'classId',
  'teacherId',
  'className',
  'studentName',
];

const isLoginResponse = (value: unknown): value is LoginResponse => (
  typeof value === 'object'
  && value !== null
  && LOGIN_RESPONSE_KEYS.every((key) => typeof (value as Record<string, unknown>)[key] === 'string'
    && ((value as Record<string, unknown>)[key] as string).trim().length > 0)
);

const isStudentLoginSession = (value: unknown): value is StudentLoginSession => (
  isLoginResponse(value)
  && typeof (value as unknown as { anonymousUid?: unknown }).anonymousUid === 'string'
  && ((value as unknown as { anonymousUid: string }).anonymousUid).trim().length > 0
);

const getSessionStorage = (): Storage | null => {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
};

export const saveStudentLoginSession = (value: LoginResponse, anonymousUid: string): StudentLoginSession | null => {
  if (!isLoginResponse(value) || typeof anonymousUid !== 'string' || !anonymousUid.trim()) return null;
  const payload: StudentLoginSession = {
    studentId: value.studentId,
    classId: value.classId,
    teacherId: value.teacherId,
    className: value.className,
    studentName: value.studentName,
    anonymousUid,
  };
  try {
    getSessionStorage()?.setItem(STUDENT_LOGIN_SESSION_KEY, JSON.stringify(payload));
  } catch {
    // Storage is optional; login behavior must not depend on it.
  }
  return payload;
};

export const getStudentLoginSession = (anonymousUid: string | null | undefined): StudentLoginSession | null => {
  if (typeof anonymousUid !== 'string' || !anonymousUid.trim()) return null;
  try {
    const raw = getSessionStorage()?.getItem(STUDENT_LOGIN_SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isStudentLoginSession(parsed) || parsed.anonymousUid !== anonymousUid) return null;
    return {
      studentId: parsed.studentId,
      classId: parsed.classId,
      teacherId: parsed.teacherId,
      className: parsed.className,
      studentName: parsed.studentName,
      anonymousUid: parsed.anonymousUid,
    };
  } catch {
    return null;
  }
};

export const clearStudentLoginSession = (): void => {
  try {
    getSessionStorage()?.removeItem(STUDENT_LOGIN_SESSION_KEY);
  } catch {
    // Storage is optional; clearing it must remain best-effort.
  }
};

export interface IssuedPin {
  studentId: string;
  name: string;
  pin: string;
}

export interface ViewedPin {
  studentId: string;
  name: string;
  /** null khi mã được cấp trước khi app lưu bản hiển thị — phải cấp lại một lần. */
  pin: string | null;
}

const call = async <T,>(payload: Record<string, unknown>): Promise<T> => {
  const res = await fetch('/api/classroom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || moTaLoiHttp(res.status));
  return data as T;
};

export const fetchRoster = (joinCode: string): Promise<RosterResponse> =>
  call<RosterResponse>({ action: 'roster', joinCode: joinCode.trim() });

/** Assignment của học sinh qua projection server-side; không đọc document gốc chứa đáp án. */
export const fetchStudentAssignments = async (): Promise<StudentAssignmentView[]> => {
  const current = auth.currentUser;
  if (!current || !current.isAnonymous) throw new Error('Cần phiên đăng nhập học sinh.');
  const idToken = await current.getIdToken();
  const response = await call<{ assignments: StudentAssignmentView[] }>({ action: 'studentAssignments', idToken });
  return response.assignments || [];
};

/** Bài nộp của học sinh qua projection server-side, không tải grade.noteForTeacher/teacherNote. */
export const fetchStudentSubmissions = async (): Promise<SubmissionDoc[]> => {
  const current = auth.currentUser;
  if (!current || !current.isAnonymous) throw new Error('Cần phiên đăng nhập học sinh.');
  const idToken = await current.getIdToken();
  const response = await call<{ submissions: SubmissionDoc[] }>({ action: 'studentSubmissions', idToken });
  return response.submissions || [];
};

/** Lượt làm bài online của chính học sinh; server đã bỏ đáp án, câu trả lời và ghi chú nội bộ. */
export const fetchStudentOnlineSubmissions = async (): Promise<ExamSubmission[]> => {
  const current = auth.currentUser;
  if (!current || !current.isAnonymous) throw new Error('Cần phiên đăng nhập học sinh.');
  const idToken = await current.getIdToken();
  const response = await call<{ submissions: ExamSubmission[] }>({ action: 'studentOnlineSubmissions', idToken });
  return response.submissions || [];
};

/** Danh mục Discover an toàn theo khối của lớp; máy chủ tự ràng buộc theo phiên HS. */
export const fetchStudentDiscoverCatalog = async (): Promise<StudentDiscoverCatalogItem[]> => {
  const current = auth.currentUser;
  if (!current || !current.isAnonymous) throw new Error('Cần phiên đăng nhập học sinh.');
  const idToken = await current.getIdToken();
  const response = await call<{ catalog: StudentDiscoverCatalogItem[] }>({ action: 'studentDiscoverCatalog', idToken });
  return response.catalog || [];
};

export interface StudentAdaptiveAssignment {
  assignmentId: string;
  lessonId: string;
  title: string;
  /** Mã tiết Discover gốc — dùng để gắn bài giao với danh mục hiển thị cho em. */
  discoverSeedId?: string;
  /** GV đã đóng bài → em chỉ xem nhận xét + BTVN, không nộp thêm được. */
  closed?: boolean;
  createdAt: string;
}

/** Bài học phân hoá GV đã giao cho lớp — máy chủ lọc theo phiên HS (lớp khác bị từ chối). */
export const fetchStudentAdaptiveAssignments = async (): Promise<StudentAdaptiveAssignment[]> => {
  const current = auth.currentUser;
  if (!current || !current.isAnonymous) throw new Error('Cần phiên đăng nhập học sinh.');
  const idToken = await current.getIdToken();
  const response = await call<{ assignments: StudentAdaptiveAssignment[] }>({ action: 'studentAdaptiveList', idToken });
  return response.assignments || [];
};

/**
 * Mở bài học phân hoá được giao. Máy chủ trả bản ĐÃ BỎ ĐÁP ÁN — em không đọc được
 * đáp án trong mạng, mọi lượt nộp đều phải qua máy chủ chấm.
 */
export const openStudentAdaptiveAssignment = async (assignmentId: string): Promise<{ assignmentId: string; lesson: AdaptiveLesson }> => {
  const current = auth.currentUser;
  if (!current || !current.isAnonymous) throw new Error('Cần phiên đăng nhập học sinh.');
  const idToken = await current.getIdToken();
  return call<{ assignmentId: string; lesson: AdaptiveLesson }>({ action: 'studentAdaptiveOpen', idToken, assignmentId });
};

/**
 * Thư viện học lại — mở bài TỰ HỌC công khai (không cần GV giao). Máy chủ trả bản
 * ĐÃ BỎ ĐÁP ÁN; chế độ "học lại không tính điểm" — máy chấm qua server nhưng không
 * ghi tiến độ/điểm/bảng lớp.
 */
export const openStudentAdaptiveLibraryLesson = async (lessonId: string): Promise<{ lesson: AdaptiveLesson }> => {
  // Thư viện công khai: HS chưa có phiên thì tự đăng nhập ẩn danh (chỉ đọc bài đã xuất bản).
  if (!auth.currentUser || !auth.currentUser.isAnonymous) await signInAnonymously(auth);
  const current = auth.currentUser!;
  const idToken = await current.getIdToken();
  return call<{ lesson: AdaptiveLesson }>({ action: 'studentAdaptiveLibraryOpen', idToken, lessonId });
};

/** Nộp bài học lại qua máy chủ chấm — KHÔNG ghi điểm/tiến độ (thầy 28/10, phương án B). */
export const submitStudentAdaptiveLibraryAssessment = async (lessonId: string, payload: { kind: string; answers: Record<string, string>; unitId?: string; durationSeconds: number }): Promise<{ kind: string; unitId?: string; scored: boolean; attempt: AssessmentAttempt; nextRoute?: string }> => {
  if (!auth.currentUser || !auth.currentUser.isAnonymous) await signInAnonymously(auth);
  const current = auth.currentUser!;
  const idToken = await current.getIdToken();
  return call({ action: 'studentAdaptiveLibrarySubmit', idToken, lessonId, ...payload });
};

export interface StudentAdaptiveClosedResult {
  assignmentId: string;
  feedback: string[];
  homework: Array<{ id: string; type: string; prompt: string; options?: string[]; points: number }>;
}

export const fetchStudentAdaptiveClosed = async (assignmentId: string): Promise<StudentAdaptiveClosedResult> => {
  const current = auth.currentUser;
  if (!current || !current.isAnonymous) throw new Error('Can phien dang nhap hoc sinh.');
  return call<StudentAdaptiveClosedResult>({ action: 'studentAdaptiveClosed', idToken: await current.getIdToken(), assignmentId });
};

export interface StudentAdaptiveSubmitResult {
  assignmentId: string;
  kind: 'diagnostic' | 'quickCheck' | 'exitTicket';
  unitId?: string;
  /** true = lượt nộp đầu được tính điểm; false = lượt làm lại (không nâng điểm). */
  scored: boolean;
  status: string;
  attempt: AssessmentAttempt;
  nextRoute?: string;
}

/**
 * Nộp bài: MÁY CHỦ chấm bằng đáp án đầy đủ. Client chỉ gửi câu trả lời — không gửi điểm,
 * nên em không thể tự chấm hoặc soi đáp án trong mạng.
 */
export const submitStudentAdaptiveAssessment = async (
  assignmentId: string,
  body: { kind: 'diagnostic' | 'quickCheck' | 'exitTicket'; unitId?: string; answers: Record<string, string>; durationSeconds?: number },
): Promise<StudentAdaptiveSubmitResult> => {
  const current = auth.currentUser;
  if (!current || !current.isAnonymous) throw new Error('Cần phiên đăng nhập học sinh.');
  const idToken = await current.getIdToken();
  return call<StudentAdaptiveSubmitResult>({ action: 'studentAdaptiveSubmit', idToken, assignmentId, ...body });
};

/** Chi phí AI của chính học sinh (token + tiền ước tính) — chỉ để em biết; máy chủ lọc theo phiên, không nhận studentId. */
export const fetchStudentAiCost = async (): Promise<StudentAiCostView> => {
  const current = auth.currentUser;
  if (!current || !current.isAnonymous) throw new Error('Cần phiên đăng nhập học sinh.');
  const idToken = await current.getIdToken();
  return call<StudentAiCostView>({ action: 'studentAiCost', idToken });
};

/** Khoá Gemini riêng của học sinh — máy chủ không bao giờ trả khoá, chỉ 4 ký tự cuối + trạng thái. */
export interface StudentAiKeyView {
  hasKey: boolean;
  last4: string;
  keyStatus: 'ok' | 'exhausted' | 'invalid' | null;
  /** false = bài của em đang chấm bằng khoá của thầy cô. */
  usable: boolean;
  /** Khoá hết hạn mức: thử lại từ lúc này (ISO). */
  retryAt: string | null;
}

const studentKeyCall = async (payload: Record<string, unknown>): Promise<StudentAiKeyView> => {
  const current = auth.currentUser;
  if (!current || !current.isAnonymous) throw new Error('Cần phiên đăng nhập học sinh.');
  return call<StudentAiKeyView>({ ...payload, idToken: await current.getIdToken() });
};

export const fetchStudentAiKey = () => studentKeyCall({ action: 'studentAiKeyStatus' });
export const saveStudentAiKey = (key: string) => studentKeyCall({ action: 'saveStudentAiKey', key });
export const deleteStudentAiKey = () => studentKeyCall({ action: 'deleteStudentAiKey' });

/** Bảng điểm (điểm thi định kì + hệ số 1) của chính học sinh; máy chủ lọc theo phiên, không nhận studentId. */
export const fetchStudentScoreBook = async (): Promise<StudentScoreView> => {
  const current = auth.currentUser;
  if (!current || !current.isAnonymous) throw new Error('Cần phiên đăng nhập học sinh.');
  const idToken = await current.getIdToken();
  const response = await call<{ scores: StudentScoreView }>({ action: 'studentScoreBook', idToken });
  return response.scores;
};

/** Hồ sơ năng lực của chính học sinh (+ khối lớp); máy chủ lọc theo phiên. */
export const fetchStudentPortfolio = async (): Promise<{ grade: number | null; portfolio: CompetencyPortfolioDoc }> => {
  const current = auth.currentUser;
  if (!current || !current.isAnonymous) throw new Error('Cần phiên đăng nhập học sinh.');
  const idToken = await current.getIdToken();
  return call<{ grade: number | null; portfolio: CompetencyPortfolioDoc }>({ action: 'studentPortfolio', idToken });
};

/** Lưu phần HS tự điền (máy chủ bỏ ô của GV nếu có). */
export const saveStudentPortfolio = async (entries: Record<string, PortfolioEntry>): Promise<CompetencyPortfolioDoc> => {
  const current = auth.currentUser;
  if (!current || !current.isAnonymous) throw new Error('Cần phiên đăng nhập học sinh.');
  const idToken = await current.getIdToken();
  const response = await call<{ portfolio: CompetencyPortfolioDoc }>({ action: 'saveStudentPortfolio', idToken, entries });
  return response.portfolio;
};

/**
 * Đăng nhập ẩn danh rồi nhờ máy chủ gắn phiên đó với đúng một học sinh.
 *
 * Cổng /lop chạy trên app Firebase riêng (`firebase.ts`) nên phiên GV không bị đè. Vẫn giữ lưới chặn:
 * nếu lỡ gọi ở app mặc định đang có phiên Google, `signInAnonymously` sẽ THAY phiên đó — từ chối thẳng.
 */
export const loginStudent = async (joinCode: string, studentId: string, pin: string): Promise<LoginResponse> => {
  const current = auth.currentUser;
  if (current && !current.isAnonymous) {
    throw new Error('Trang học sinh cần mở lại — bấm tải lại trang (F5) rồi đăng nhập.');
  }

  const credential = current ?? (await signInAnonymously(auth)).user;
  const idToken = await credential.getIdToken();
  return call<LoginResponse>({ action: 'login', joinCode, studentId, pin, idToken });
};

/** Giáo viên cấp PIN cho cả lớp. PIN thô chỉ trả về đúng lần gọi này. */
export const issueClassPins = async (classId: string, regenerate = false): Promise<{ issued: IssuedPin[]; total: number }> => {
  const current = auth.currentUser;
  if (!current || current.isAnonymous) throw new Error('Cần đăng nhập tài khoản giáo viên.');
  const idToken = await current.getIdToken();
  return call<{ issued: IssuedPin[]; total: number }>({ action: 'issuePins', classId, idToken, regenerate });
};

/**
 * Cấp lại PIN cho một em. Trả về mã mới ĐÚNG MỘT LẦN — máy chủ giữ cả bản băm lẫn bản hiển thị.
 * Các em khác trong lớp giữ nguyên mã cũ.
 */
export const resetStudentPin = async (classId: string, studentId: string): Promise<IssuedPin> => {
  const current = auth.currentUser;
  if (!current || current.isAnonymous) throw new Error('Cần đăng nhập tài khoản giáo viên.');
  const idToken = await current.getIdToken();
  return call<IssuedPin>({ action: 'resetOnePin', classId, studentId, idToken });
};

/** Xem PIN đang dùng của một em — chỉ chủ lớp xem được, qua API chứ không đọc trực tiếp Firestore. */
export const viewStudentPin = async (classId: string, studentId: string): Promise<ViewedPin> => {
  const current = auth.currentUser;
  if (!current || current.isAnonymous) throw new Error('Cần đăng nhập tài khoản giáo viên.');
  const idToken = await current.getIdToken();
  return call<ViewedPin>({ action: 'viewPin', classId, studentId, idToken });
};

/** Xoá học sinh khỏi server + thu hồi quyền đăng nhập (roster, bí mật PIN, studentLinks). */
export const revokeStudentAccessServer = async (classId: string, studentId: string): Promise<{ revokedLinks: number }> => {
  const current = auth.currentUser;
  if (!current || current.isAnonymous) throw new Error('Cần đăng nhập tài khoản giáo viên.');
  const idToken = await current.getIdToken();
  return call<{ revokedLinks: number }>({ action: 'revokeStudentAccess', classId, studentId, idToken });
};

/** Gỡ toàn bộ dữ liệu lớp khỏi server (roster/bí mật PIN/document lớp) + gỡ link học sinh. */
export const revokeClassData = async (classId: string): Promise<{ removedStudents: number; revokedLinks: number }> => {
  const current = auth.currentUser;
  if (!current || current.isAnonymous) throw new Error('Cần đăng nhập tài khoản giáo viên.');
  const idToken = await current.getIdToken();
  return call<{ removedStudents: number; revokedLinks: number }>({ action: 'revokeClass', classId, idToken });
};

export interface ClassPinRow {
  studentId: string;
  name: string;
  /** null = em này được cấp PIN trước khi máy chủ lưu bản hiển thị. Phải cấp lại mới xem được. */
  pin: string | null;
}

/** Bảng mã PIN cả lớp để giáo viên phát cho học sinh. */
export const viewClassPins = async (classId: string): Promise<{ joinCode: string; className: string; rows: ClassPinRow[] }> => {
  const current = auth.currentUser;
  if (!current || current.isAnonymous) throw new Error('Cần đăng nhập tài khoản giáo viên.');
  const idToken = await current.getIdToken();
  return call({ action: 'viewClassPins', classId, idToken });
};
