import type { PublishedParentReport } from '../lib/classroom/parentAccess';

/**
 * API cổng phụ huynh (/ph). Phụ huynh KHÔNG có phiên Firebase: mỗi lượt xem gửi mã lớp + em + PIN để máy chủ kiểm.
 * Không import `firebase.ts` để trang này không khởi tạo đăng nhập nào — không đụng phiên giáo viên/học sinh trong cùng trình duyệt.
 */
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

export interface ParentRoster {
  className: string;
  students: Array<{ studentId: string; name: string }>;
}

/** Danh sách tên trong lớp (chỉ id + tên) theo mã lớp — cùng API với cổng học sinh. */
export const fetchParentRoster = (joinCode: string): Promise<ParentRoster> =>
  call<ParentRoster>({ action: 'roster', joinCode });

export interface ParentReportsResponse {
  studentName: string;
  className: string;
  reports: PublishedParentReport[];
}

export const fetchParentReports = (joinCode: string, studentId: string, pin: string): Promise<ParentReportsResponse> =>
  call<ParentReportsResponse>({ action: 'parentReports', joinCode, studentId, pin });
