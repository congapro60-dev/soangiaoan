/**
 * Gọi SSM qua tiện ích Edge "SmartPlan ↔ SSM" (thư mục `extension/ssm-bridge`).
 * App không bao giờ cầm vé đăng nhập SSM: tiện ích tự lấy phiên trong tab SSM, gọi API, chỉ trả JSON.
 */

import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { getLinkedGoogleEmail } from '../adminLink';
import { ADMIN_EMAILS, isAdminEmail } from '../admin/adminConfig';

export type SsmOp = 'ping' | 'profile' | 'schoolYears' | 'teacherClasses' | 'classStudents' | 'attachLoFile' | 'autofillSsm'
  | 'evaluationQuarters' | 'subjectClass' | 'criteriaAssessment' | 'classSubjectAssessment' | 'writeLoGrades';

// Service worker của tiện ích (MV3) NGỦ khi rảnh; lần đầu đánh thức trên máy chậm có thể mất vài giây → thử 2 lần, lần sau chờ lâu hơn.
const PING_TIMEOUTS_MS = [2000, 8000] as const;
const REQUEST_TIMEOUT_MS = 20000;

let seq = 0;

const NO_EXTENSION_MESSAGE =
  'Chưa thấy tiện ích "SmartPlan ↔ SSM" trả lời. Nếu đã cài: mở edge://extensions, kiểm tra tiện ích đang BẬT, bấm nút tải lại (↻) của nó, rồi bấm F5 trang app này.';

export const ssmRequest = (op: SsmOp, params?: Record<string, unknown>, timeoutOverrideMs?: number): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const expectedEmails = [...new Set([auth.currentUser?.email, getLinkedGoogleEmail(), ...(isAdminEmail(auth.currentUser?.email) ? ADMIN_EMAILS : [])].filter((email): email is string => typeof email === 'string' && email.includes('@')).map(email => email.trim().toLowerCase()))];
    if (op !== 'ping' && (!auth.currentUser || auth.currentUser.isAnonymous || !expectedEmails.length)) { reject(new Error('Đăng nhập tài khoản giáo viên trước khi dùng SSM.')); return; }
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
    window.postMessage({ source: 'smartplan-app', kind: 'ssm-request', id, op, params: { ...params, expectedEmails } }, window.location.origin);
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

const LINK_KEY = (classId: string) => `ssmClassLink:${auth.currentUser?.uid || ''}:${classId}`;

export interface SsmClassLink {
  id: number;
  name: string;
  workspace?: string;
}

/** Lớp SSM đã ghép với lớp app — đọc từ cache trình duyệt (nhanh, offline). */
export const readSsmLink = (classId: string): SsmClassLink | null => {
  try {
    if (!auth.currentUser || auth.currentUser.isAnonymous) return null;
    const raw = localStorage.getItem(LINK_KEY(classId));
    const parsed = raw ? JSON.parse(raw) as { id?: unknown; name?: unknown } : null;
    return parsed && typeof parsed.id === 'number' && typeof parsed.name === 'string' ? { id: parsed.id, name: parsed.name, ...(typeof (parsed as {workspace?:unknown}).workspace==='string'?{workspace:(parsed as {workspace:string}).workspace}:{}) } : null;
  } catch {
    return null;
  }
};

/** Lưu ghép lớp vào cache trình duyệt. */
export const saveSsmLink = (classId: string, link: SsmClassLink | null): void => {
  try {
    if (!auth.currentUser || auth.currentUser.isAnonymous) return;
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
  if (!auth.currentUser || auth.currentUser.uid !== uid || auth.currentUser.isAnonymous) throw new Error('Phiên giáo viên đã thay đổi.');
  try {
    const snap = await getDoc(cloudLinkDoc(uid, classId));
    if (!auth.currentUser || auth.currentUser.uid!==uid) throw new Error('Phiên giáo viên đã thay đổi.');
    if (!snap.exists()) return null;
    const data = snap.data() as { ssmClassId?: unknown; ssmClassName?: unknown; workspace?: unknown };
    return typeof data.ssmClassId === 'number' && typeof data.ssmClassName === 'string'
      ? { id: data.ssmClassId, name: data.ssmClassName, ...(typeof data.workspace==='string'?{workspace:data.workspace}:{}) }
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
/**
 * Chi nhánh SSM của lớp đã ghép (nếu có): thao tác GHI gửi kèm để tiện ích từ chối khi tài khoản SSM đang ở chi nhánh khác.
 */
const writeScope = (classId?: string): { expectedWorkspace?: string } => {
  const workspace = classId ? readSsmLink(classId)?.workspace : undefined;
  return workspace ? { expectedWorkspace: workspace } : {};
};

export const attachLoFileToSsm = async (bytes: Uint8Array, fileName: string, classId?: string): Promise<void> => {
  // Chuyển bytes thành base64 để gửi qua postMessage.
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const fileData = btoa(binary);
  await ssmRequest('attachLoFile', { fileData, fileName, ...writeScope(classId) });
};

/** Lưu ghép lớp lên Firestore + cache local. */
export const saveSsmLinkCloud = async (uid: string, classId: string, link: SsmClassLink | null): Promise<void> => {
  if (!auth.currentUser || auth.currentUser.uid !== uid || auth.currentUser.isAnonymous) throw new Error('Phiên giáo viên đã thay đổi.');
  if (link) await setDoc(cloudLinkDoc(uid, classId), { userId: uid, classId, ssmClassId: link.id, ssmClassName: link.name, ...(link.workspace?{workspace:link.workspace}:{}), updatedAt: new Date().toISOString() });
  else await deleteDoc(cloudLinkDoc(uid, classId));
  if (!auth.currentUser || auth.currentUser.uid!==uid) throw new Error('Phiên giáo viên đã thay đổi.');
  saveSsmLink(classId, link);
};
/** Fill only exact fields or the single editable field GV deliberately focused on SSM. */
export const autofillSsmFields = (fields: {key:string;value:string}[], target: 'exact' | 'focused' = 'exact', classId?: string) => ssmRequest('autofillSsm', {fields,target,...writeScope(classId)}) as Promise<{filled:number;total:number}>;

// ── Đợt 4: đọc cây điểm LO (TDS V2) — CHỈ ĐỌC. Trả JSON nguyên dạng SSM để app tự damp/ghi cache. ──

/** 4 quý đánh giá của lớp×môn trong năm: đó là nơi tìm assessment_form_id + criteria_id. */
export const readSsmEvaluationQuarters = (classId: number, subjectId: number, schoolYearId: number) =>
  ssmRequest('evaluationQuarters', { classId, subjectId, schoolYearId });

/** Các môn học của lớp trong năm (vd 12 = VN TOÁN). */
export const readSsmSubjects = (classId: number, schoolYearId: number) =>
  ssmRequest('subjectClass', { classId, schoolYearId });

/** Cây FP → PS → LO + thang điểm của MỘT bài đánh giá (vd F1, IA1). */
export const readSsmCriteriaAssessment = (assessmentFormId: number) =>
  ssmRequest('criteriaAssessment', { assessmentFormId });

/** Trạng thái chấm của bài đánh giá cho lớp: quarter_has_branch_id, result_assessment_form_id, is_approved… */
export const readSsmClassSubjectAssessment = (assessmentFormId: number, criteriaId: number, classId: number) =>
  ssmRequest('classSubjectAssessment', { assessmentFormId, criteriaId, classId });

/** Payload ghi điểm — app xây sẵn từ thang SSM trả về; tiện ích chỉ POST nguyên trạng. */
export interface SsmGradeWriteBody {
  class_id: number;
  criteria_id: number;
  quarter_has_branch_id: number;
  students: Array<{ id: number; name: string; result: SsmGradeResultEntry[] }>;
}

export interface SsmGradeResultEntry {
  learning_outcome_id: number;
  scoring_setting_id: number;
  is_number: boolean;
  point: string;
  /** Chỉ có khi SỬA ô đã chấm trước đó; thiếu = ô mới. */
  grading_student_id?: number;
}

/**
 * Đợt 4 (GHI): gửi điểm LO lên SSM. `resultAssessmentFormId` vắng → endpoint thêm mới;
 * có → endpoint cập nhật kết quả đã có. ĐỌC LẠI sau khi ghi belongs to caller (verify riêng).
 */
export const writeSsmLoGrades = (params: { assessmentFormId: number; resultAssessmentFormId?: number; body: SsmGradeWriteBody }, classId: string) =>
  ssmRequest('writeLoGrades', { ...params, ...writeScope(classId) });
export const syncSsmRosterMissing = async (classId: string, students: {id:string;name:string;code:string}[]) => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Đăng nhập giáo viên trước khi đồng bộ.');
  const response = await fetch('/api/classroom', { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'syncSsmRosterMissing',classId,students,idToken:await user.getIdToken()}) });
  const result = await response.json();
  if (!auth.currentUser || auth.currentUser.uid !== user.uid) throw new Error('Phiên giáo viên đã thay đổi. Tải lại danh sách lớp.');
  if (!response.ok) throw new Error(result.error || 'Chưa đồng bộ được danh sách.');
  return result as {students: import('../../types').Student[];added:number};
};
