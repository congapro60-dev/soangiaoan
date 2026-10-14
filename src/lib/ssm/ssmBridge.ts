/**
 * Gọi SSM qua tiện ích Edge "SmartPlan ↔ SSM" (thư mục `extension/ssm-bridge`).
 * App không bao giờ cầm vé đăng nhập SSM: tiện ích tự lấy phiên trong tab SSM, gọi API, chỉ trả JSON.
 */

import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type SsmOp = 'ping' | 'profile' | 'schoolYears' | 'teacherClasses' | 'classStudents' | 'attachLoFile';

// Service worker của tiện ích (MV3) NGỦ khi rảnh; lần đầu đánh thức trên máy chậm có thể mất vài giây → thử 2 lần, lần sau chờ lâu hơn.
const PING_TIMEOUTS_MS = [2000, 8000] as const;
const REQUEST_TIMEOUT_MS = 20000;

let seq = 0;

const NO_EXTENSION_MESSAGE =
  'Chưa thấy tiện ích "SmartPlan ↔ SSM" trả lời. Nếu đã cài: mở edge://extensions, kiểm tra tiện ích đang BẬT, bấm nút tải lại (↻) của nó, rồi bấm F5 trang app này.';

export const ssmRequest = (op: SsmOp, params?: Record<string, unknown>, timeoutOverrideMs?: number): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const id = `ssm-${Date.now()}-${++seq}`;
    const timeoutMs = timeoutOverrideMs ?? REQUEST_TIMEOUT_MS;

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
      reject(new Error(op === 'ping' ? NO_EXTENSION_MESSAGE : 'SSM không phản hồi — thử lại sau.'));
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
    };

    window.addEventListener('message', onMessage);
    window.postMessage({ source: 'smartplan-app', kind: 'ssm-request', id, op, params }, window.location.origin);
  });

/** Hỏi xem tiện ích có đang chạy không. Lần đầu không trả lời thì thử lại với thời gian chờ dài hơn (đánh thức service worker). */
export const pingSsmBridge = async (): Promise<void> => {
  let lastError: unknown;
  for (const timeoutMs of PING_TIMEOUTS_MS) {
    try {
      await ssmRequest('ping', undefined, timeoutMs);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

const LINK_KEY = (classId: string) => `ssmClassLink:${classId}`;

export interface SsmClassLink {
  id: number;
  name: string;
}

/** Lớp SSM đã ghép với lớp app — đọc từ cache trình duyệt (nhanh, offline). */
export const readSsmLink = (classId: string): SsmClassLink | null => {
  try {
    const raw = localStorage.getItem(LINK_KEY(classId));
    const parsed = raw ? JSON.parse(raw) as { id?: unknown; name?: unknown } : null;
    return parsed && typeof parsed.id === 'number' && typeof parsed.name === 'string' ? { id: parsed.id, name: parsed.name } : null;
  } catch {
    return null;
  }
};

/** Lưu ghép lớp vào cache trình duyệt. */
export const saveSsmLink = (classId: string, link: SsmClassLink | null): void => {
  try {
    if (link) localStorage.setItem(LINK_KEY(classId), JSON.stringify(link));
    else localStorage.removeItem(LINK_KEY(classId));
  } catch {
    // Trình duyệt chặn lưu trữ: lần sau giáo viên chọn lại lớp, không mất dữ liệu gì.
  }
};

// ── HẠNG MỤC 4: Cloud Sync — lưu ghép lớp lên Firestore để đổi máy không phải ghép lại ──

const cloudLinkDoc = (uid: string, classId: string) => doc(db, 'ssmClassLinks', `${uid}_${classId}`);

/** Đọc ghép lớp từ Firestore (đồng bộ giữa các máy). */
export const readSsmLinkCloud = async (uid: string, classId: string): Promise<SsmClassLink | null> => {
  try {
    const snap = await getDoc(cloudLinkDoc(uid, classId));
    if (!snap.exists()) return null;
    const data = snap.data() as { ssmClassId?: unknown; ssmClassName?: unknown };
    return typeof data.ssmClassId === 'number' && typeof data.ssmClassName === 'string'
      ? { id: data.ssmClassId, name: data.ssmClassName }
      : null;
  } catch {
    return null;
  }
};

/**
 * HẠNG MỤC 1 (1-Click Excel Relay): gửi file Excel điểm LO đã điền (dạng bytes)
 * cho tiện ích để tự gắn vào ô input file trên trang SSM đang mở.
 * Tiện ích chỉ ĐIỀN và TÔ VIỀN — giáo viên tự bấm Lưu trên SSM.
 */
export const attachLoFileToSsm = async (bytes: Uint8Array, fileName: string): Promise<void> => {
  // Chuyển bytes thành base64 để gửi qua postMessage.
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const fileData = btoa(binary);
  await ssmRequest('attachLoFile', { fileData, fileName });
};

/** Lưu ghép lớp lên Firestore + cache local. */
export const saveSsmLinkCloud = async (uid: string, classId: string, link: SsmClassLink | null): Promise<void> => {
  saveSsmLink(classId, link); // luôn cập nhật cache local trước
  try {
    if (link) {
      await setDoc(cloudLinkDoc(uid, classId), {
        userId: uid,
        classId,
        ssmClassId: link.id,
        ssmClassName: link.name,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } else {
      await deleteDoc(cloudLinkDoc(uid, classId));
    }
  } catch {
    // Mất mạng: cache local vẫn giữ, lần sau có mạng sẽ đồng bộ lại.
  }
};
