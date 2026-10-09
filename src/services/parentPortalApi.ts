import type { ParentDevice, PublishedParentReport } from '../lib/classroom/parentAccess';
import type { ParentReportPrintInput } from '../lib/classroom/parentReportTypes';

/**
 * API cổng phụ huynh (/ph). Phụ huynh KHÔNG có phiên Firebase: mỗi lượt xem gửi mã lớp + em + PIN để máy chủ kiểm.
 * Không import `firebase.ts` để trang này không khởi tạo đăng nhập nào — không đụng phiên giáo viên/học sinh trong cùng trình duyệt.
 */
/** Loại thiết bị thô (điện thoại / máy tính) để giáo viên biết phụ huynh vào bằng gì — không gửi tên máy hay địa chỉ IP. */
const deviceKind = (): ParentDevice => {
  const agent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return agent ? (/Mobi|Android|iPhone|iPad/i.test(agent) ? 'mobile' : 'desktop') : 'khac';
};

/** Lỗi từ máy chủ kèm mã trạng thái, để trang biết khi PIN đã bị đổi/đặt lại (401/403/409). */
export class ParentApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ParentApiError';
  }
}

const call = async <T,>(payload: Record<string, unknown>): Promise<T> => {
  let res: Response;
  try {
    res = await fetch('/api/classroom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, device: deviceKind() }),
    });
  } catch {
    throw new ParentApiError('Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.', 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ParentApiError(data?.error || `Máy chủ đang bận (mã ${res.status}). Vui lòng thử lại sau ít phút.`, res.status);
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
  /** PIN vẫn là mã giáo viên cấp → phải đặt PIN riêng trước khi xem (khi đó `reports` rỗng). */
  mustChange: boolean;
  reports: PublishedParentReport[];
}

export const fetchParentReports = (joinCode: string, studentId: string, pin: string): Promise<ParentReportsResponse> =>
  call<ParentReportsResponse>({ action: 'parentReports', joinCode, studentId, pin });

/** Phụ huynh tự đặt PIN mới (cần PIN hiện tại). Máy chủ lưu để giáo viên xem/cấp lại được. */
export const changeParentPin = (joinCode: string, studentId: string, pin: string, newPin: string): Promise<{ ok: true }> =>
  call<{ ok: true }>({ action: 'changeParentPin', joinCode, studentId, pin, newPin });

/** Báo cáo TỰ CHỌN khoảng ngày (ngoài các kì thầy cô công bố): máy chủ dựng từ kết quả đã duyệt, chưa có nhận xét của giáo viên. */
export const fetchParentCustomReport = (joinCode: string, studentId: string, pin: string, from: string, to: string): Promise<{ input: ParentReportPrintInput }> =>
  call<{ input: ParentReportPrintInput }>({ action: 'parentCustomReport', joinCode, studentId, pin, from, to });

/** Báo cho thầy cô biết phụ huynh đang xem (`ping`), đã mở báo cáo (`open`) hoặc tải PDF (`pdf`). Lỗi mạng thì bỏ qua; `denied` = mã PIN không còn đúng. */
export const sendParentEvent = async (joinCode: string, studentId: string, pin: string, type: 'ping' | 'open' | 'pdf', detail = ''): Promise<'ok' | 'denied' | 'error'> => {
  try {
    await call<{ ok: true }>({ action: 'parentEvent', joinCode, studentId, pin, type, detail });
    return 'ok';
  } catch (error) {
    return error instanceof ParentApiError && [401, 403, 404, 409].includes(error.status) ? 'denied' : 'error';
  }
};

