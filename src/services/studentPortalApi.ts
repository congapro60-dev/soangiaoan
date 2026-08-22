import { signInAnonymously } from 'firebase/auth';
import { auth } from '../lib/firebase';

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
  if (!res.ok) throw new Error(data?.error || `Máy chủ trả lỗi ${res.status}`);
  return data as T;
};

export const fetchRoster = (joinCode: string) =>
  call<RosterResponse>({ action: 'roster', joinCode });

/**
 * Đăng nhập ẩn danh rồi nhờ máy chủ gắn phiên đó với đúng một học sinh.
 *
 * CHẶN phiên giáo viên: `signInAnonymously` sẽ THAY phiên Google đang có, kéo theo mọi dữ liệu
 * app gắn với uid cũ. Cùng họ với bẫy đã ghi ở đường đẩy Drive — nên ở đây từ chối thẳng thay vì
 * âm thầm đổi phiên.
 */
export const loginStudent = async (joinCode: string, studentId: string, pin: string): Promise<LoginResponse> => {
  const current = auth.currentUser;
  if (current && !current.isAnonymous) {
    throw new Error('Trình duyệt này đang đăng nhập tài khoản giáo viên. Hãy đăng xuất trước khi vào cổng học sinh.');
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
