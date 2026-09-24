/**
 * Gọi SSM qua tiện ích Edge "SmartPlan ↔ SSM" (thư mục `extension/ssm-bridge`).
 * App không bao giờ cầm vé đăng nhập SSM: tiện ích tự lấy phiên trong tab SSM, gọi API, chỉ trả JSON.
 */

export type SsmOp = 'ping' | 'profile' | 'schoolYears' | 'teacherClasses' | 'classStudents';

const PING_TIMEOUT_MS = 1500;
const REQUEST_TIMEOUT_MS = 20000;

let seq = 0;

export const ssmRequest = (op: SsmOp, params?: Record<string, unknown>): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const id = `ssm-${Date.now()}-${++seq}`;
    const timeoutMs = op === 'ping' ? PING_TIMEOUT_MS : REQUEST_TIMEOUT_MS;

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const msg = event.data as { source?: string; kind?: string; id?: string; ok?: boolean; data?: unknown; error?: string };
      if (msg?.source !== 'ssm-bridge' || msg.kind !== 'ssm-response' || msg.id !== id) return;
      cleanup();
      if (msg.ok) resolve(msg.data);
      else reject(new Error(msg.error || 'SSM trả lỗi không rõ.'));
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(op === 'ping'
        ? 'Chưa cài tiện ích "SmartPlan ↔ SSM" trên Edge, hoặc cần tải lại trang app.'
        : 'SSM không phản hồi — thử lại sau.'));
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
    };

    window.addEventListener('message', onMessage);
    window.postMessage({ source: 'smartplan-app', kind: 'ssm-request', id, op, params }, window.location.origin);
  });

const LINK_KEY = (classId: string) => `ssmClassLink:${classId}`;

/** Lớp SSM đã ghép với lớp app — lưu trên trình duyệt của từng giáo viên. */
export const readSsmLink = (classId: string): { id: number; name: string } | null => {
  try {
    const raw = localStorage.getItem(LINK_KEY(classId));
    const parsed = raw ? JSON.parse(raw) as { id?: unknown; name?: unknown } : null;
    return parsed && typeof parsed.id === 'number' && typeof parsed.name === 'string' ? { id: parsed.id, name: parsed.name } : null;
  } catch {
    return null;
  }
};

export const saveSsmLink = (classId: string, link: { id: number; name: string } | null): void => {
  try {
    if (link) localStorage.setItem(LINK_KEY(classId), JSON.stringify(link));
    else localStorage.removeItem(LINK_KEY(classId));
  } catch {
    // Trình duyệt chặn lưu trữ: lần sau giáo viên chọn lại lớp, không mất dữ liệu gì.
  }
};
