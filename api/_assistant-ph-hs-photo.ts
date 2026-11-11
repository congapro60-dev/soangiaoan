import { notifyHomeworkSheet } from './_assistant-homework-sheet.js';
// Việc 4 — HS chụp bài gửi bot Zalo tự chấm.
//
// Luồng: HS nhắn 8 → chọn bài (chấm <số>) → gửi ảnh (tối đa 10, trong 60 phút) → nhắn xong
// → bot tải ảnh Zalo (URL tạm thời) về, đẩy Firebase Storage đúng đường `accepted-homework/`
// như luồng web, tạo submission rồi chấm bằng CHÍNH `gradeOneSubmission` của luồng web
// (điểm/nhận xét/lịch sử khớp 100% web). Chấm chạy trong `chayNgam`; xong thì bot gửi tin
// điểm qua Zalo. Hạn mức dùng đúng quota có sẵn: 5 bài/em/ngày, 100 bài/lớp/ngày.
//
// HS/PH đã liên kết; không exam/online/khóa nộp. Bổ sung/nộp lại tạo lượt mới,
// giữ lịch sử và điểm chính thức trước đó tới khi GV duyệt lượt mới.
// Nộp hộ (2026-10-27): HS gửi bài hộ bạn CÙNG LỚP — gõ tên bạn (không cần PIN của bạn),
// chọn bài đang chờ của bạn đó, gửi ảnh như thường. Mọi kiểm tra/quota/submission tính cho
// EM ĐƯỢC NỘP HỘ; `submittedBy` ghi NGƯỜI GỬI THẬT; thêm `assistBy` để web hiển thị badge.
import { createHash, randomUUID } from 'node:crypto';
import { getAdminDb, getAdminStorage } from './_exam-core.js';
import { chayNgam, getGradingChain, remainingQuota, bumpQuota, rollQuota, today } from './_grading-core.js';
import type { QuotaDoc } from './_grading-core.js';
import { AiKeyRequiredError } from './_ai-keys.js';
import { gradeContextFor, gradeOneSubmission } from './grade-homework.js';
import { sendStyled, sendSticker } from './_assistant-zalo-send.js';
import { MENU_HINT, fitZaloList } from './_assistant-ph-hs-menu.js';
import { notifyTeacherNewSubmission } from './_assistant-ph-hs-teacher.js';
import { notifyParentSubmission, notifyParentGraded } from './_assistant-ph-hs-parent-notify.js';
import { downloadImage } from './_assistant-photo-file.js';
import type { SubmissionDoc } from '../src/lib/classroom/types.js';
import { mergeSubmissionEvidence } from '../src/lib/classroom/submissionRevision.js';
import { buildPhotoReviewReply } from './_assistant-photo-review.js';
import { submissionRevisionLockId } from './_submission-revision-lock.js';
import { issueWebHandoff } from './_assistant-web-handoff.js';
import { awaitsClarification } from '../src/lib/classroom/clarification.js';
import { submissionDeadlineState } from '../src/lib/classroom/hanNop.js';

const db = () => getAdminDb();
const SESSIONS = 'assistantPhotoSessions';// 60 phút (sửa 4/11): trước đây 10 phút — HS chọn bài xong làm bài rồi mới chụp, quá 10 phút là
// phiên hết hạn nên ảnh bị coi là "đề nhờ giải": bot báo lỗi, web không có ảnh nào. 60 phút đủ cho
// một buổi làm bài mà vẫn tự dọn phiên cũ.
const SESSION_MINUTES = 60;
const SESSION_MS = SESSION_MINUTES * 60 * 1000;
export const MAX_PHOTOS = 10;
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Có nên gửi sticker chúc mừng không (chốt 4/11): chỉ khi điểm đã được GV duyệt và đạt ≥ 80%.
 * Không chúc mừng điểm thấp/chưa duyệt — tránh phản cảm và tránh báo "chính thức" sai.
 */
export const isCongratulation = (score: number, maxScore: number, approved: boolean): boolean => {
  if (!approved) return false;
  const max = Number(maxScore);
  const got = Number(score);
  if (!Number.isFinite(max) || !Number.isFinite(got) || max <= 0) return false;
  return got / max >= 0.8;
};

/**
 * Sticker chúc mừng — để trong env vì Zalo yêu cầu ID sticker do tài khoản bot cấp
 * (`ZALO_BOT_CONGRA_STICKER`). Rỗng = không gửi sticker, mọi thứ khác giữ nguyên.
 */
export const CONGRATS_STICKER = () => String(process.env.ZALO_BOT_CONGRA_STICKER || '').trim();

export interface PhotoSessionData {
  pendingUploads?: Record<string, number>;
  receivedImages?: string[];
  assignmentChoices?: string[];
  revisionOf?: string;
  revisionMode?: 'supplement' | 'replace';
  cancelRequested?: boolean;
  revisionChoices?: string[];
  /** Phiên lưu trước bản sửa chưa có mã; mọi phiên mới đều có mã riêng. */
  sessionKey?: string;
  botId: string;
  userId: string;
  studentId: string;
  classId: string;
  teacherId: string;
  assignmentId: string;
  assignmentTitle: string;
  expiresAt: number;
  photos: Array<{ url: string; name: string; mimeType: string; size: number }>;
  /** Vai trò người gửi ảnh: 'student' (chính học sinh) hoặc 'parent' (phụ huynh nộp hộ con). */
  role?: 'student' | 'parent';
  /** Nộp hộ: bài nộp tính cho bạn cùng lớp này; người gửi thật ghi ở `submittedBy` + `assistBy`. */
  assist?: { targetStudentId: string; targetName: string };
  /** Trạng thái luồng nộp hộ CHƯA chọn xong bạn + bài: name → (pick khi trùng tên) → list. */
  assistState?: 'name' | 'pick' | 'list';
  /** Trùng tên: ưng viên chờ lệnh `chọn <số>`. */
  targetCandidates?: Array<{ id: string; name: string }>;
  /**
   * Vừa hiện DANH SÁCH BÀI chờ chọn (nhắn 8). Giữ cờ này để nhắn số thuần ("1", "2"…)
   * được hiểu là CHỌN BÀI, không rơi vào menu mục 1–7 (lỗi thật 29/10: HS chọn bài 1
   * lại nhận "Tổng quan học tập" của một bài khác).
   */
  awaitingPick?: true;
}

export interface PhotoActorScope { classId: string; studentId: string; role: 'student' | 'parent'; linkId?: string }
const samePhotoScope = (session: PhotoSessionData, actor?: PhotoActorScope) => !actor ||
  session.classId === actor.classId && session.studentId === actor.studentId && (session.role ?? 'student') === actor.role;
const scopeWarning = 'Phiên ảnh thuộc hồ sơ trước. Ảnh vẫn được giữ; quay về đúng hồ sơ để nộp, hoặc nhắn hủy để bỏ phiên.';
const currentPhotoActor = async (tx: FirebaseFirestore.Transaction, actor?: PhotoActorScope): Promise<boolean> => {
  if (!actor?.linkId) return true;
  const link = (await tx.get(db().collection('channelLinks').doc(actor.linkId))).data();
  const student = await tx.get(db().collection('classes').doc(actor.classId).collection('students').doc(actor.studentId));
  return Boolean(student.exists && link?.active && link.classId === actor.classId && link.studentId === actor.studentId && link.role === actor.role);
};

export const PHOTO_REPLIES = {
  noSession: '📸 Chưa có ảnh nào được nhận.\n\nNhắn 8 để chọn bài rồi gửi ảnh nhé.\n\n' + MENU_HINT,
  pickFirst: '👉 Em chọn bài trước đã:\nNhắn số thứ tự bài trong danh sách vừa hiện (ví dụ: 1), rồi gửi ảnh nhé.\n\nNhắn 8 để xem lại danh sách.',
  max: `📸 Đã nhận đủ ${MAX_PHOTOS} ảnh — nhắn: xong để máy bắt đầu chấm nhé.\n\n` + MENU_HINT,
  badImage: '⚠️ Không nhận được ảnh này (ảnh quá lớn hoặc sai định dạng).\n\nEm gửi lại ảnh rõ nét khác nhé.\n\n' + MENU_HINT,
  assistIncomplete: '⚠️ Chưa chọn xong bạn và bài để nộp hộ nên chưa thể nhận ảnh.\n\nNhắn "nộp hộ" để làm lại, hoặc nhắn hủy để bỏ phiên.\n\n' + MENU_HINT,
  sessionChanged: 'ℹ️ Phiên nộp bài đã thay đổi.\n\nEm tiếp tục phiên hiện tại rồi gửi lại lệnh nhé.\n\n' + MENU_HINT,
  cancelSuccess: '🔄 Đã hủy phiên chọn bài.\n\nEm nhắn 8 để chọn lại bài khác, hoặc nhắn 0 để xem menu.\n\n' + MENU_HINT,
  expiredSession: `⏰ Phiên nộp bài trước đã hết hạn.\n\n📌 HƯỚNG DẪN:\n   • Nhắn 8 để xem lại danh sách bài.\n   • Chọn số thứ tự bài rồi gửi ảnh bài làm.\n\n⚠️ LƯU Ý: Ảnh chỉ được tính là BÀI NỘP khi em đã chọn bài. Muốn nhờ giải đề trong ảnh thì nhắn hủy để bỏ phiên trước, rồi gửi ảnh.\n\n` + MENU_HINT,
} as const;

/**
 * HS/PH hỏi tự nhiên về bài chưa nộp ("còn bài nào chưa nộp?", "hạn nộp bài?", "phải nộp gì?")
 * → hệ trả DỮ LIỆU THẬT thay vì để AI trả lời "chưa có thông tin". So khớp trên chuỗi BỎ DẤU
 * nên "chua nop", "chưa nộp" đều ăn. Không khớp ⇒ null để câu đi tiếp luồng AI bình thường.
 */
export const isPendingListQuestion = (raw: string): boolean => {
  const plain = String(raw ?? '').normalize('NFC').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ').trim().toLowerCase();
  if (!plain || plain.length > 120) return false;
  return /(con|co)\s+bai\s+(nao|gi)\s+(chua\s+)?(nop|lam)/.test(plain)
    || /bai\s+(nao|gi)\s+(chua\s+|can\s+|phai\s+)?nop/.test(plain)
    || /chua\s+nop\s+bai/.test(plain)
    || /(han|deadline)\s*(nop|bai)/.test(plain)
    || /con\s+(phai|can)\s+nop/.test(plain)
    || /(phai|can)\s+nop\s+(bai|gi)/.test(plain)
    || /nop\s+bai\s+(gi|nao)/.test(plain);
};

export type PhotoCommand =
  | { kind: 'list' } | { kind: 'pick'; n: number } | { kind: 'done' } | { kind: 'cancel' }
  | { kind: 'revision'; mode: 'supplement' | 'replace'; n?: number }
  | { kind: 'assist' } | { kind: 'assistPick'; n: number } | { kind: 'assistChoose'; n: number };

/** Nhận lệnh chấm: '8' do menu trả, ở đây 'chấm', 'chấm <số>', 'xong', 'nộp hộ [số]', 'chọn <số>' và 'đổi bài'/'hủy'. Bỏ dấu để 'cham 2' / 'nop ho' / 'doi bai' vẫn ăn. */
export const parsePhotoCommand = (raw: string): PhotoCommand | null => {
  const plain = raw.normalize('NFC').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').trim().toLowerCase();
  if (/^cham$/.test(plain)) return { kind: 'list' };
  const pick = /^cham\s*(\d+)$/.exec(plain);
  if (pick) return { kind: 'pick', n: Number(pick[1]) };
  if (/^(xong|gui)$/.test(plain)) return { kind: 'done' };
  const revision = /^(bo sung|nop lai)(?:\s+(\d+))?$/.exec(plain);
  if (revision) return { kind: 'revision', mode: revision[1] === 'bo sung' ? 'supplement' : 'replace', ...(revision[2] ? { n: Number(revision[2]) } : {}) };
  if (/^(doi bai|chua xong|huy|bo qua|xac nhan huy)$/.test(plain)) return { kind: 'cancel' };
  const assist = /^nop\s+ho(?:\s+(\d+))?$/.exec(plain);
  if (assist) return assist[1] ? { kind: 'assistPick', n: Number(assist[1]) } : { kind: 'assist' };
  const choose = /^chon\s*(\d+)$/.exec(plain);
  if (choose) return { kind: 'assistChoose', n: Number(choose[1]) };
  return null;
};

/**
 * Bài giao đang chờ em nộp: cùng điều kiện chặn của luồng web (`assertActorCurrent`) —
 * không exam, không online, chưa khóa nộp, đúng đối tượng được giao, và em CHƯA có bài nộp nào
 * cho bài đó (bài đang lỗi/chờ chấm nhờ thầy cô xử lý trên web, không nộp trùng qua bot).
 * teacherId đọc từ class doc (link chỉ mang classId + studentId) — phiên nộp phải theo đúng GV chủ lớp.
 * Trả đầy đủ bài chưa nộp theo ngày tạo mới nhất; tầng gửi chia danh sách dài thành nhiều tin.
 */
/**
 * Mô tả file đính kèm (PDF/Word/Ảnh) cho đề bài.
 */
export interface AssignmentAttachment {
  name: string;           // Tên file (vd: "de-thi.pdf")
  url: string;            // Link Firebase Storage (public)
  type: 'pdf' | 'word' | 'image' | 'other'; // Loại file
}

export const pendingAssignmentsForStudent = async (
  classId: string,
  studentId: string,
): Promise<{ teacherId: string; items: Array<{ id: string; title: string; dueAt?: string; overdue?: boolean; description?: string; attachments: AssignmentAttachment[] }>; total: number }> => {
  const [classSnap, assignmentsSnap, submissionsSnap] = await Promise.all([
    db().collection('classes').doc(classId).get(),
    db().collection('assignments').where('classId', '==', classId).get(),
    db().collection('submissions').where('studentId', '==', studentId).get(),
  ]);
  const cls = classSnap.data() as Record<string, unknown> | undefined;
  if (!cls) return { teacherId: '', items: [], total: 0 };
  const teacherId = String(cls.teacherId ?? '');
  const submittedAssignmentIds = new Set(submissionsSnap.docs.filter(doc => doc.data().classId === classId)
    .map(doc => String(doc.data()?.assignmentId ?? '')).filter(Boolean));
  const now = Date.now();
  const raw = assignmentsSnap.docs
    .map(doc => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as { id: string } & Record<string, unknown>)
    .filter(item => item.teacherId === teacherId && item.type !== 'exam' && item.deliveryMode !== 'online' && item.submissionLocked !== true
      && (!Array.isArray(item.targetStudentIds) || !item.targetStudentIds.length || item.targetStudentIds.includes(studentId))
      && !submittedAssignmentIds.has(item.id));
  const decorated = raw.map(item => {
    const dueAt = item.dueAt ? String(item.dueAt) : '';
    const overdue = submissionDeadlineState(dueAt, undefined, now).key === 'overdue';
    // Đọc mảng attachments từ Firestore (nếu có)
    const rawAttachments = Array.isArray(item.attachments) ? item.attachments : [];
    const attachments: AssignmentAttachment[] = rawAttachments
      .filter((a: unknown) => a && typeof a === 'object')
      .map((a: Record<string, unknown>) => ({
        name: String(a.name ?? 'file'),
        url: String(a.url ?? ''),
        type: (String(a.type ?? 'other').toLowerCase() as 'pdf' | 'word' | 'image' | 'other'),
      }))
      .filter((a, index, all) => a.url && all.findIndex(other => other.url === a.url) === index);
    return { id: item.id, title: String(item.title ?? '').slice(0, 120), dueAt, overdue, attachments,
      description: String(item.description ?? '').slice(0, 4000), createdAt: String(item.createdAt ?? '') };
  });
  decorated.sort((a, b) => {
    return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
  });
  return { teacherId, items: decorated, total: decorated.length };
};

/**
 * Icon cho loại file.
 */
const fileIcon = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'pdf': return '📄';
    case 'word': return '📝';
    case 'image': return '🖼️';
    default: return '📎';
  }
};

/**
 * Hiển thị danh sách bài chờ nộp (kèm file đính kèm nếu có).
 */
export const photoListReply = (
  items: Array<{ id: string; title: string; dueAt?: string; overdue?: boolean; attachments: AssignmentAttachment[] }>,
  total = items.length,
): string => {
  if (!items.length) {
    return ['🎉 Hiện không có bài nào đang chờ em nộp.', '👉 Bài đã nộp hoặc đang chờ chấm: nhắn 2 để xem.', '', MENU_HINT].join('\n');
  }
  const lines: string[] = [];
  items.forEach((item, index) => {
    const dueLabel = submissionDeadlineState(item.dueAt).dueLabel.replace(',', '') || item.dueAt;
    const prefix = `${String(index + 1).padStart(2, '0')} — ${item.title}${item.dueAt ? `\nHạn: ${dueLabel}${item.overdue ? ' (quá hạn)' : ''}` : ''}`;
    lines.push(prefix);
    // Thêm file đính kèm (nếu có)
    if (item.attachments.length > 0) lines.push(`Đề bài: ${item.attachments.length} tệp — xem sau khi chọn bài.`);
    lines.push('');
  });
  return [`📸 BÀI CHƯA NỘP (${total} bài) — mới nhất trước`, '', ...lines,
    'Nhắn số thứ tự để chọn bài (ví dụ: 12).', 'Nộp hộ bạn cùng lớp: nhắn "nộp hộ".',
    `Mỗi lượt tối đa ${MAX_PHOTOS} ảnh, trong ${SESSION_MINUTES} phút.`, MENU_HINT].join('\n');
};

const sessionId = (botId: string, userId: string): string => `${botId}_${userId}`;

/** Leave a list-only selection when returning to the menu; never discard received or pending photos. */
export const exitPhotoSelection = async (botId: string, userId: string, classId: string, studentId: string): Promise<void> => {
  const ref = db().collection(SESSIONS).doc(sessionId(botId, userId));
  await db().runTransaction(async tx => {
    const current = (await tx.get(ref)).data() as PhotoSessionData | undefined;
    if (current?.awaitingPick === true && current.classId === classId && current.studentId === studentId
      && !current.assignmentId && !current.assistState && !current.revisionChoices
      && !current.photos?.length && !current.receivedImages?.length && !Object.keys(current.pendingUploads ?? {}).length) tx.delete(ref);
  });
};

/** Khớp tên bạn: chuẩn hóa dấu/hoa/thường; tên gọi là đuôi của họ tên ("minh anh" khớp "Nguyễn Thị Minh Anh"). */
const normName = (value: string): string =>
  value.normalize('NFC').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/\s+/g, ' ').trim().toLowerCase();

const nameMatches = (fullName: string, input: string): boolean => {
  const full = normName(fullName); const want = normName(input);
  return want.length >= 2 && (full === want || full.endsWith(` ${want}`));
};

/**
 * Luồng nộp hộ — HS gửi bài hộ bạn cùng lớp. Không cần PIN của bạn (biết PIN là đăng nhập được
 * cả vai bạn): định danh target qua TÊN do chính bot tra trong danh sách lớp. Chốt chặn cuối
 * vẫn là GV duyệt điểm trên web, nơi badge `assistBy` cho biết ai đã gửi bài này.
 */
const assistAskName = [
  '👥 NỘP HỘ BẠN CÙNG LỚP',
  '📌 HƯỚNG DẪN:',
  '   • Gõ TÊN ĐẦY ĐỦ của bạn trong lớp (ví dụ: "Nguyễn Văn A" hoặc "Minh Anh").',
  '   • Chỉ nộp hộ được cho bạn CÙNG LỚP với em.',
  '⚠️ LƯU Ý:',
  '   • Bài nộp hộ sẽ tính vào hạn mức của BẠN ĐƯỢC NỘP HỘ (không phải em).',
  '   • Kết quả sẽ hiện trên tài khoản của bạn ấy.',
  '   • Em không xem được kết quả bài nộp hộ.',
  '',
  '👉 Đổi ý: nhắn hủy để bỏ phiên.',
  '', MENU_HINT,
].join('\n');

/** Giữ ảnh đã nhận; chỉ thay phiên chưa có ảnh để vẫn hồi phục được luồng nộp hộ. */
const unfinishedPhotos = (session: PhotoSessionData): string | null =>
  session.expiresAt > Date.now() && (session.photos.length > 0 || Object.keys(session.pendingUploads ?? {}).length > 0)
    ? [`Em đang nộp bài "${session.assignmentTitle}" với ${session.photos.length} ảnh chưa gửi xong.`,
      'Nhắn: xong để nộp; muốn bỏ ảnh, nhắn hủy rồi xác nhận hủy. Nhắn 0 chỉ xem menu.', '', MENU_HINT].join('\n')
    : null;

/** Bước đầu luồng nộp hộ: ghi pre-session chờ tên bạn, không đè ảnh đã nhận. */
export const assistStartReply = async (botId: string, userId: string, classId: string, studentId: string): Promise<string> => {
  const ref = db().collection(SESSIONS).doc(sessionId(botId, userId));
  return db().runTransaction(async tx => {
    const current = (await tx.get(ref)).data() as PhotoSessionData | undefined;
    const blocked = current && unfinishedPhotos(current);
    if (blocked) return blocked;
    tx.set(ref, {
      sessionKey: randomUUID(),
      botId, userId, studentId, classId, teacherId: '', assignmentId: '', assignmentTitle: '',
      expiresAt: Date.now() + SESSION_MS, photos: [], assistState: 'name',
    } satisfies PhotoSessionData);
    return assistAskName;
  });
};

/** Callback tên/chọn cũ không được đổi hoặc xóa phiên đã thay thế. */
const changePreSession = async (
  session: { id: string; data: PhotoSessionData }, patch: Partial<PhotoSessionData> | null,
): Promise<boolean> => {
  const ref = db().collection(SESSIONS).doc(session.id);
  return db().runTransaction(async tx => {
    const current = (await tx.get(ref)).data() as PhotoSessionData | undefined;
    if (!current || current.expiresAt <= Date.now() || current.sessionKey !== session.data.sessionKey
      || !current.assistState || current.assistState !== session.data.assistState || current.photos.length) return false;
    if (patch) tx.update(ref, patch);
    else tx.delete(ref);
    return true;
  });
};

/** Liệt kê bài chờ nộp CỦA BẠN ĐƯỢC NỘP HỘ và lưu target vào pre-session (chờ `nộp hộ <số>`). */
const saveTargetAndList = async (
  classId: string, target: { id: string; name: string }, session: { id: string; data: PhotoSessionData },
): Promise<string> => {
  const { items, total } = await pendingAssignmentsForStudent(classId, target.id);
  if (!items.length) {
    if (!await changePreSession(session, null)) return PHOTO_REPLIES.sessionChanged;
    return [`Bạn ${target.name} hiện không có bài nào đang chờ nộp.`, '', MENU_HINT].join('\n');
  }
  if (!await changePreSession(session, { assistState: 'list', assist: { targetStudentId: target.id, targetName: target.name },
    targetCandidates: [], assignmentChoices: items.map(item => item.id), expiresAt: Date.now() + SESSION_MS })) return PHOTO_REPLIES.sessionChanged;
  const lines = items.map((item, index) => {
    const due = item.overdue
      ? ` — quá hạn${item.dueAt ? `: ${item.dueAt.slice(0, 10)}` : ''}`
      : item.dueAt ? ` — hạn ${item.dueAt.slice(0, 10)}` : '';
    return `${index + 1}. ${item.title}${due}`;
  });
  return [`Bài đang chờ nộp của ${target.name} (${items.length} bài):`, ...lines, 'Nhắn: nộp hộ <số> (ví dụ: nộp hộ 1).'].join('\n');
};

/** Nhận tên bạn gõ vào: khớp 1 → liệt kê bài của bạn đó; trùng → liệt kê chọn số; không thấy → mời gõ lại. */
export const assistTargetReply = async (botId: string, userId: string, classId: string, rawName: string): Promise<string> => {
  const session = await liveSession(botId, userId);
  if (!session || (session.data.assistState !== 'name' && session.data.assistState !== 'pick')) {
    return ['Nhắn nộp hộ để bắt đầu nộp bài cho bạn.', '', MENU_HINT].join('\n');
  }
  if (!normName(rawName)) return assistAskName;
  const roster = await db().collection('classes').doc(classId).collection('students').get();
  const matches = roster.docs
    .map(doc => ({ id: doc.id, name: String((doc.data() as Record<string, unknown>)?.name ?? '').trim() }))
    .filter(stu => stu.name && nameMatches(stu.name, rawName));
  if (matches.length > 5) return ['Tên này khớp nhiều bạn trong lớp. Gõ ĐỦ họ và tên giúp mình nhé.', '', MENU_HINT].join('\n');
  if (!matches.length) return ['Chưa thấy bạn nào tên này trong lớp. Em gõ lại ĐỦ họ và tên giúp mình nhé.', '', MENU_HINT].join('\n');
  if (matches.length > 1) {
    if (!await changePreSession(session, { assistState: 'pick', targetCandidates: matches,
      expiresAt: Date.now() + SESSION_MS })) return PHOTO_REPLIES.sessionChanged;
    return [`Có ${matches.length} bạn khớp tên này:`, ...matches.map((stu, i) => `${i + 1}. ${stu.name}`), '', 'Nhắn: chọn <số> (ví dụ: chọn 2).', '', MENU_HINT].join('\n');
  }
  return saveTargetAndList(classId, matches[0], session);
};

/**
 * Tin nhắn tự do khi đang GIỮA luồng nộp hộ (chưa mở phiên ảnh): tên bạn gõ vào → tra danh sách lớp.
 * Trả null khi không trong luồng — dòng tin chảy tiếp sang AI chat như thường. Số menu (0–8) và lệnh
 * chấm đã bị chặn ở bước trước nên không lọt vào đây.
 */
export const assistFreeTextReply = async (botId: string, userId: string, classId: string, message: string): Promise<string | null> => {
  const session = await liveSession(botId, userId);
  if (!session?.data.assistState) return null;
  if (session.data.assistState === 'list') {
    return [`Đang nộp hộ ${session.data.assist?.targetName ?? 'bạn'}. Nhắn: nộp hộ <số> để chọn bài, hoặc nhắn hủy để bỏ phiên.`, '', MENU_HINT].join('\n');
  }
  return assistTargetReply(botId, userId, classId, message);
};

/** Trùng tên — `chọn <số>` một bạn từ danh sách ưng viên. */
export const assistChooseReply = async (botId: string, userId: string, classId: string, n: number): Promise<string> => {
  const session = await liveSession(botId, userId);
  const candidates = session?.data.targetCandidates ?? [];
  if (!session || session.data.assistState !== 'pick' || !candidates.length) {
    return ['Không có danh sách tên để chọn. Nhắn nộp hộ để bắt đầu.', '', MENU_HINT].join('\n');
  }
  const target = n >= 1 && n <= candidates.length ? candidates[n - 1] : null;
  if (!target) return [`❌ Số không khớp danh sách tên.`,
    `📌 HƯỚNG DẪN: Nhắn SỐ THỨ TỰ bạn (ví dụ: 1) từ danh sách.`,
    `⚠️ LƯU Ý: Chỉ chọn bạn CÙNG LỚP với em.`,
    '', MENU_HINT].join('\n');
  return saveTargetAndList(classId, target, session);
};

/** `nộp hộ <số>` — chọn bài trong danh sách của bạn được nộp hộ rồi mở phiên nhận ảnh như thường. */
export const assistOpenReply = async (botId: string, userId: string, classId: string, studentId: string, n: number): Promise<string> => {
  const session = await liveSession(botId, userId);
  const assist = session?.data.assist;
  if (!session || session.data.assistState !== 'list' || !assist) {
    return ['Chưa chọn bạn để nộp hộ. Nhắn nộp hộ để bắt đầu.', '', MENU_HINT].join('\n');
  }
  const { teacherId, items } = await pendingAssignmentsForStudent(classId, assist.targetStudentId);
  if (!items.length) {
    if (!await changePreSession(session, null)) return PHOTO_REPLIES.sessionChanged;
    return [`❌ Bạn ${assist.targetName} hiện không có bài nào đang chờ nộp.`,
      `📌 HƯỚNG DẪN: Bạn ấy có thể đã nộp xong hoặc chưa có bài mới.`,
      `⚠️ LƯU Ý: Chỉ nộp hộ được bài CHƯA NỘP của bạn cùng lớp.`,
      '', MENU_HINT].join('\n');
  }
  const targetId = session.data.assignmentChoices?.[n - 1];
  const target = targetId ? items.find(item => item.id === targetId) : !session.data.assignmentChoices && n >= 1 ? items[n - 1] : null;
  if (!target) return [`❌ Số không khớp danh sách bài của ${assist.targetName}.`,
    `📌 HƯỚNG DẪN: Nhắn SỐ THỨ TỰ bài (ví dụ: 1) từ danh sách.`,
    `⚠️ LƯU Ý: Chỉ chọn bài CHƯA NỘP.`,
    '', MENU_HINT].join('\n');
  return openPhotoSession(botId, userId, { studentId, classId, teacherId }, target, assist, session.data);
};

/**
 * Nhắn 8 / "chấm": hiện danh sách bài và GHI CỜ `awaitingPick` để nhắn số thuần sau đó
 * được hiểu là chọn bài (không rơi vào menu mục 1–7).
 */
export const listPendingReply = async (botId: string, userId: string, classId: string, studentId: string, role?: 'student' | 'parent'): Promise<string> => {
  const { items, total } = await pendingAssignmentsForStudent(classId, studentId);
  if (!items.length) return photoListReply(items, total);
  const ref = db().collection(SESSIONS).doc(sessionId(botId, userId));
  const warning = await db().runTransaction(async tx => {
    const current = (await tx.get(ref)).data() as PhotoSessionData | undefined;
    // Không đè phiên đang có ảnh chưa gửi xong — người dùng cần "xong" hoặc 0 trước.
    if (current && unfinishedPhotos(current)) return unfinishedPhotos(current);
    tx.set(ref, {
      botId, userId, studentId, classId, teacherId: '',
      assignmentId: '', assignmentTitle: '',
      expiresAt: Date.now() + SESSION_MS, photos: [], awaitingPick: true,
      assignmentChoices: items.map(item => item.id),
      sessionKey: randomUUID(),
      ...(role ? { role } : {}),
    } satisfies PhotoSessionData);
  });
  return warning || photoListReply(items, total);
};

/**
 * Nhắn số thuần ("1", "2"…) khi ĐANG chờ chọn bài → mở phiên nhận ảnh cho bài đó.
 * Trả null nếu không ở trạng thái chờ chọn (caller để tin đi tiếp luồng menu/AI bình thường).
 */
export const pickAssignmentByNumber = async (
  botId: string, userId: string, classId: string, studentId: string, n: number, role?: 'student' | 'parent',
): Promise<string | null> => {
  const session = await liveSession(botId, userId);
  if (!session || session.data.awaitingPick !== true) return null;
  const userRole = role ?? session.data.role;
  const { teacherId, items, total } = await pendingAssignmentsForStudent(classId, studentId);
  const targetId = session.data.assignmentChoices?.[n - 1];
  const target = targetId ? items.find(item => item.id === targetId) : !session.data.assignmentChoices && n >= 1 ? items[n - 1] : null;
  if (!target) {
    // Số không khớp: giữ trạng thái chờ chọn để em nhắn lại đúng số.
    return 'Số không khớp hoặc bài đã thay đổi. Nhắn chấm để tải lại danh sách rồi chọn bài nhé.';
  }
  // Xoá cờ chờ chọn rồi mới mở phiên (openPhotoSession ghi đè doc).
  return openPhotoSession(botId, userId, { studentId, classId, teacherId, role: userRole }, target, undefined, session.data);
};

/** Immutable attempts: only the linked student/parent may revise their own submission. */
export const revisionReply = async (
  botId: string, userId: string, classId: string, studentId: string,
  role: 'student' | 'parent', mode: 'supplement' | 'replace', n?: number,
): Promise<string> => {
  const existing = await liveSession(botId, userId);
  const warning = existing && unfinishedPhotos(existing.data);
  if (warning) return warning;
  const snap = await db().collection('submissions').where('studentId', '==', studentId).get();
  const latest = new Map<string, SubmissionDoc>();
  for (const doc of snap.docs) {
    const row = { ...doc.data(), id: doc.id, createdAt: String(doc.data().createdAt ?? '') } as SubmissionDoc;
    if (row.classId !== classId || !row.assignmentId) continue;
    const old = latest.get(row.assignmentId);
    if (!old || row.createdAt > old.createdAt || row.createdAt === old.createdAt && row.id > old.id) latest.set(row.assignmentId, row);
  }
  const attempts = [...latest.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  if (!attempts.length) return 'Chưa có bài đã nộp để bổ sung. Nhắn 8 để chọn bài mới.';
  if (n === undefined) {
    const choices = [];
    for (const row of attempts) {
      const assignment = (await db().collection('assignments').doc(row.assignmentId!).get()).data();
      choices.push(`${choices.length + 1} — ${String(assignment?.title ?? 'Bài đã nộp')} (${row.status})`);
    }
    const blocked = await db().runTransaction(async tx => {
      const ref = db().collection(SESSIONS).doc(sessionId(botId, userId));
      const current = (await tx.get(ref)).data() as PhotoSessionData | undefined;
      if (current && unfinishedPhotos(current)) return unfinishedPhotos(current);
      tx.set(ref, { sessionKey: randomUUID(), botId, userId, classId, studentId, role,
        teacherId: '', assignmentId: '', assignmentTitle: '', photos: [], expiresAt: Date.now() + SESSION_MS,
        revisionChoices: attempts.map(row => row.id) });
      return null;
    });
    if (blocked) return blocked;
    return [`BÀI ĐÃ NỘP — ${mode === 'supplement' ? 'BỔ SUNG ẢNH' : 'NỘP LẠI TOÀN BỘ'}`, ...choices,
      `Nhắn ${mode === 'supplement' ? 'bổ sung' : 'nộp lại'} <số> để chọn.`,
      'Bổ sung giữ ảnh cũ; nộp lại chỉ dùng ảnh mới. Lịch sử và điểm đã duyệt được giữ.'].join('\n');
  }
  const chosenId = existing?.data.revisionChoices?.[n - 1];
  if (!chosenId) return 'Em nhắn bổ sung hoặc nộp lại để xem danh sách trước, rồi chọn đúng số.';
  const row = attempts.find(item => item.id === chosenId);
  if (!row) return 'Bài đã có lượt nộp mới. Nhắn bổ sung hoặc nộp lại để tải danh sách mới.';
  if (['submitted', 'grading'].includes(row.status) || awaitsClarification(row.grade?.questionResults)) return 'Bài đang xử lý hoặc chờ em xác nhận. Hoàn tất bước đó rồi mới nộp lượt mới nhé.';
  const assignment = (await db().collection('assignments').doc(row.assignmentId!).get()).data();
  if (!assignment || assignment.classId !== classId || assignment.teacherId !== row.teacherId
    || assignment.submissionLocked || assignment.type === 'exam' || assignment.deliveryMode === 'online'
    || Array.isArray(assignment.targetStudentIds) && assignment.targetStudentIds.length && !assignment.targetStudentIds.includes(studentId)) return 'Bài này không còn nhận nộp. Em liên hệ thầy cô nhé.';
  const ref = db().collection(SESSIONS).doc(sessionId(botId, userId));
  const opened = await db().runTransaction(async tx => {
    const current = (await tx.get(ref)).data() as PhotoSessionData | undefined;
    if (!current || current.sessionKey !== existing?.data.sessionKey || unfinishedPhotos(current)) return false;
    tx.set(ref, { sessionKey: randomUUID(), botId, userId, classId, studentId, role, teacherId: row.teacherId,
      assignmentId: row.assignmentId, assignmentTitle: String(assignment.title ?? ''), photos: [], expiresAt: Date.now() + SESSION_MS,
      revisionOf: row.id, revisionMode: mode });
    return true;
  });
  return opened ? [`${mode === 'supplement' ? 'Bổ sung ảnh' : 'Nộp lại toàn bộ'}: ${assignment.title}`,
    'Gửi ảnh mới rồi nhắn xong. Lượt cũ được giữ; điểm mới chờ thầy cô duyệt.'].join('\n') : PHOTO_REPLIES.sessionChanged;
};

export const requestPhotoCancellation = async (botId: string, userId: string, confirmed: boolean): Promise<string> => {
  const ref = db().collection(SESSIONS).doc(sessionId(botId, userId));
  return db().runTransaction(async tx => {
    const current = (await tx.get(ref)).data() as PhotoSessionData | undefined;
    if (current && unfinishedPhotos(current) && (!confirmed || !current.cancelRequested)) {
      tx.update(ref, { cancelRequested: true });
      return `Đang giữ ${current.photos.length} ảnh. Muốn bỏ phiên này, nhắn: xác nhận hủy. Nhắn xong để nộp; nhắn 0 để xem menu và giữ ảnh.`;
    }
    tx.delete(ref);
    return PHOTO_REPLIES.cancelSuccess;
  });
};

/**
 * Mở phiên nhận ảnh cho 1 bài, chỉ thay phiên chưa có ảnh. Nộp hộ thì kèm target.
 * Hiển thị link file đính kèm (nếu có) để HS/PH tải về xem.
 */
export const openPhotoSession = async (
  botId: string,
  userId: string,
  ctx: { studentId: string; classId: string; teacherId: string; role?: 'student' | 'parent' },
  assignment: { id: string; title: string; description?: string; attachments?: AssignmentAttachment[] },
  assist?: { targetStudentId: string; targetName: string },
  expected?: PhotoSessionData,
): Promise<string> => {
  const session: PhotoSessionData = {
    sessionKey: randomUUID(),
    botId, userId,
    studentId: ctx.studentId, classId: ctx.classId, teacherId: ctx.teacherId,
    assignmentId: assignment.id, assignmentTitle: assignment.title,
    expiresAt: Date.now() + SESSION_MS,
    photos: [],
    ...(ctx.role ? { role: ctx.role } : {}),
    ...(assist ? { assist } : {}),
  };
  const ref = db().collection(SESSIONS).doc(sessionId(botId, userId));
  const blocked = await db().runTransaction(async tx => {
    const current = (await tx.get(ref)).data() as PhotoSessionData | undefined;
    if (expected && (!current || current.expiresAt <= Date.now() || current.sessionKey !== expected.sessionKey
      || current.assistState !== expected.assistState || current.assist?.targetStudentId !== expected.assist?.targetStudentId)) {
      return PHOTO_REPLIES.sessionChanged;
    }
    const warning = current && unfinishedPhotos(current);
    if (warning) return warning;
    tx.set(ref, session);
    return null;
  });
  if (blocked) return blocked;
  let portalUrl: string | undefined;
  try { portalUrl = await issueWebHandoff(db(), botId, userId, ctx.role ?? 'student', ctx.classId, ctx.studentId, assist ? undefined : assignment.id); }
  catch { /* No raw Storage links or credentials in chat; offer a fresh web handoff. */ }
  return openSessionReply(session.assignmentTitle, assignment.attachments, assist?.targetName, assignment.description, portalUrl);
};

/**
 * Câu trả lời khi mở phiên nộp — hàm THUẦN (tách ra để xuất ví dụ/test dùng đúng
 * chuỗi production, không chép tay).
 */
export const openSessionReply = (
  title: string,
  attachments?: AssignmentAttachment[],
  assistTargetName?: string,
  description?: string,
  portalUrl?: string,
): string => {
  const lines = [`Bài: ${title}${assistTargetName ? ` — nộp hộ bạn ${assistTargetName}` : ''}`];
  if (description) lines.push(`Yêu cầu của thầy cô: ${description}`);
  if (portalUrl) lines.push(`${assistTargetName ? 'Mở hồ sơ của em trên web' : 'Đề bài & mở trên web'}:\n${portalUrl}`);
  else if (attachments?.length) {
    lines.push(`Đề bài: ${attachments.length} tệp đính kèm. Nhắn web để lấy liên kết mở hồ sơ.`);
    attachments.forEach(f => lines.push(`   ${fileIcon(f.type)} ${f.name}`));
  }
  if (assistTargetName) lines.push(`Đề bài và kết quả của bạn nằm trên tài khoản của ${assistTargetName}.`);
  lines.push(
    `📤 HƯỚNG DẪN NỘP BÀI:`,
    `   1. Chụp ẢNH RÕ NÉT bài làm (không mờ, không cắt xén).`,
    `   2. Gửi ảnh vào chat này — tối đa ${MAX_PHOTOS} ảnh/bài, trong ${SESSION_MINUTES} phút.`,
    `   3. Gửi đủ ảnh rồi nhắn: xong. Điểm sẽ hiện sau khi thầy cô duyệt.`,
    `⚠️ LƯU Ý:`,
    `   • Ảnh phải là JPG/PNG/WEBP (không hỗ trợ HEIC/HEIF), dưới 10MB.`,
    `   • Chỉ gửi ảnh BÀI LÀM (không chụp màn hình, không ảnh khác).`,
    `   • Ảnh mờ/thiếu sẽ không chấm được.`,
    `   • Muốn đổi bài khi đã có ảnh: nhắn hủy, xác nhận hủy, rồi nhắn chấm.`,
    '', MENU_HINT,
  );
  return lines.join('\n');
};

/**
 * Câu xác nhận đã nhận 1 ảnh — hàm THUẦN (dùng chung cho production và ví dụ).
 * Cho biết số ảnh đã nhận, dung lượng, và còn được gửi mấy ảnh.
 */
export const photoAcceptedReply = (count: number, bytes: number): string => {
  const remaining = MAX_PHOTOS - count;
  return [`✅ Đã nhận ảnh ${count}/${MAX_PHOTOS} (${(bytes / 1024 / 1024).toFixed(1)}MB).`,
    remaining > 0
      ? `📤 Có thể gửi thêm tối đa ${remaining} ảnh; đủ bài thì nhắn: xong.`
      : '📤 Nhắn: xong để máy chấm.',
    `⚠️ LƯU Ý: Ảnh phải rõ nét, không mờ, không cắt xén.`,
    '', MENU_HINT].join('\n');
};

/**
 * Câu thông báo điểm sau khi chấm xong — hàm THUẦN (dùng chung production + ví dụ).
 */
export const gradedReply = (
  title: string, score: number, maxScore: number, approved: boolean, assistTargetName?: string,
): string => {
  const baiCua = assistTargetName ? ` của ${assistTargetName}` : '';
  return [`📝 Đã xử lý bài "${title}"${baiCua}${approved && !assistTargetName ? `: ${score}/${maxScore} điểm` : ''}`,
    approved ? '✅ Thầy cô đã duyệt — điểm chính thức.' : '⏳ Đang chờ thầy cô duyệt; điểm và nhận xét chưa công bố.',
    assistTargetName ? `Điểm và nhận xét hiện trên tài khoản của ${assistTargetName}.` : '👉 Xem chi tiết từng câu: nhắn 2.',
    ...(assistTargetName ? [] : ['Cần thêm ảnh: nhắn bổ sung. Muốn gửi bộ ảnh mới: nhắn nộp lại.']),
    '', MENU_HINT].join('\n');
};

/** Xóa phiên khi kết thúc hoặc xác nhận hủy; xem menu không gọi hàm này. */
export const cancelPhotoSession = async (botId: string, userId: string, expected?: PhotoSessionData): Promise<void> => {
  const ref = db().collection(SESSIONS).doc(sessionId(botId, userId));
  if (!expected) { await ref.delete().catch(() => undefined); return; }
  await db().runTransaction(async tx => {
    const current = (await tx.get(ref)).data() as PhotoSessionData | undefined;
    if (current && current.sessionKey === expected.sessionKey && current.assignmentId === expected.assignmentId) tx.delete(ref);
  });
};

const liveSession = async (botId: string, userId: string): Promise<{ id: string; data: PhotoSessionData } | null> => {
  const ref = db().collection(SESSIONS).doc(sessionId(botId, userId));
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() as PhotoSessionData;
  if (!data || data.expiresAt <= Date.now()) return null;
  return { id: snap.id, data };
};

/**
 * Có phiên nộp bài đang mở (đã chọn bài) hay không — để phân biệt ẢNH NỘP BÀI
 * với ẢNH ĐỀ BÀI nhờ giải (lỗi 29/10: gửi đề nhờ giải lại bị coi là nộp bài).
 */
/** A selection step is still submission intent; never solve these photos as a new question. */
export const hasPhotoSubmissionIntent = async (botId: string, userId: string): Promise<boolean> => {
  const session = await liveSession(botId, userId);
  return Boolean(session && (session.data.assignmentId || session.data.awaitingPick || session.data.assistState || session.data.revisionChoices));
};

export const hasLiveAssignmentSession = async (botId: string, userId: string): Promise<boolean> => {
  const session = await liveSession(botId, userId);
  return Boolean(session && session.data.assignmentId && session.data.awaitingPick !== true && !session.data.assistState);
};

/**
 * Phiên nộp bài ĐÃ HẾT HẠN gần đây (còn doc, quá hạn nhưng chưa quá 6 giờ).
 * Dùng để nhắc HS "chọn lại bài" thay vì đem ảnh bài làm đi giải đề — sự cố 3–4/11:
 * HS chọn bài, làm bài quá 10 phút, gửi ảnh thì bot coi là đề nhờ giải và không có bài nộp nào.
 */
export const hasExpiredAssignmentSession = async (botId: string, userId: string): Promise<boolean> => {
  const snap = await db().collection(SESSIONS).doc(sessionId(botId, userId)).get();
  const data = snap.data() as PhotoSessionData | undefined;
  if (!data || !data.assignmentId) return false;
  const age = Date.now() - Number(data.expiresAt ?? 0);
  return age > 0 && age < 6 * 60 * 60 * 1000;
};

/**
 * Nhận 1 ảnh từ Zalo: tải về (URL tạm thời), đẩy Storage `accepted-homework/` + download token —
 * URL đúng format web nên `gradeOneSubmission` và GV xem trên web dùng như ảnh nộp thường.
 */
export const photoReceivedReply = async (botId: string, userId: string, photoUrl: string, actor?: PhotoActorScope): Promise<string> => {
  const session = await liveSession(botId, userId);
  if (!session) return PHOTO_REPLIES.noSession;
  if (!samePhotoScope(session.data, actor)) return scopeWarning;
  // Đang chờ CHỌN BÀI: chưa có assignment nên ảnh không thuộc bài nào — phải chọn bài trước.
  if (session.data.awaitingPick === true || session.data.revisionChoices) return PHOTO_REPLIES.pickFirst;
  // Luồng nộp hộ chưa chọn xong bạn + bài: chưa biết ảnh thuộc bài nào của ai — không nhận.
  if (session.data.assistState) return PHOTO_REPLIES.assistIncomplete;
  if (session.data.photos.length >= MAX_PHOTOS) return PHOTO_REPLIES.max;
  const ref = db().collection(SESSIONS).doc(session.id);
  const imageId = createHash('sha256').update(photoUrl).digest('hex');
  const reservedAt = Date.now();
  const reserved = await db().runTransaction(async tx => {
    const current = (await tx.get(ref)).data() as PhotoSessionData | undefined;
    if (!current || current.sessionKey !== session.data.sessionKey || current.expiresAt <= Date.now()) return PHOTO_REPLIES.sessionChanged;
    if (!samePhotoScope(current, actor) || !await currentPhotoActor(tx, actor)) return scopeWarning;
    if (current.receivedImages?.includes(imageId)) return 'Ảnh này đã được nhận; em không cần gửi lại.';
    if (current.pendingUploads?.[imageId]) return 'Ảnh này đang tải, em đợi thông báo đã nhận nhé.';
    const pendingUploads = current.pendingUploads ?? {};
    if (current.photos.length + Object.keys(pendingUploads).length >= MAX_PHOTOS) return PHOTO_REPLIES.max;
    tx.update(ref, { pendingUploads: { ...pendingUploads, [imageId]: reservedAt }, expiresAt: Date.now() + SESSION_MS });
    return null;
  });
  if (reserved) return reserved;
  const release = async () => db().runTransaction(async tx => {
    const current = (await tx.get(ref)).data() as PhotoSessionData | undefined;
    if (!current || current.sessionKey !== session.data.sessionKey) return;
    const pendingUploads = { ...current.pendingUploads };
    if (pendingUploads[imageId] !== reservedAt) return;
    delete pendingUploads[imageId];
    tx.update(ref, { pendingUploads });
  });
  try {
  let buffer: Buffer;
  let mimeType = '';
  const image = await downloadImage(photoUrl, MAX_BYTES);
  if (!image) {
    // Log đã nằm trong downloadImage (chỉ metadata) — HS nhận câu hướng dẫn cụ thể bên dưới.
    await release();
    return PHOTO_REPLIES.badImage;
  }
  buffer = image.buffer;
  mimeType = image.mimeType;
  const batchId = randomUUID();
  // Ảnh của bài nộp hộ lưu vào thư mục của EM ĐƯỢC NỘP HỘ — như ảnh nộp thường của em đó trên web.
  const targetStudentId = session.data.assist?.targetStudentId ?? session.data.studentId;
  const path = `accepted-homework/${session.data.classId}/${targetStudentId}/${batchId}-${session.data.photos.length}`;
  const token = randomUUID();
  const bucket = getAdminStorage();
  const file = bucket.file(path);
  await file.save(buffer, { contentType: mimeType, resumable: false });
  await file.setMetadata({ contentType: mimeType, metadata: { firebaseStorageDownloadTokens: token } });
  const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
  const reply = await db().runTransaction(async tx => {
    const current = (await tx.get(ref)).data() as PhotoSessionData | undefined;
    if (!current || current.expiresAt <= Date.now()) return PHOTO_REPLIES.noSession;
    if (current.sessionKey !== session.data.sessionKey || current.assistState || current.assignmentId !== session.data.assignmentId
      || current.classId !== session.data.classId || current.studentId !== session.data.studentId
      || current.assist?.targetStudentId !== session.data.assist?.targetStudentId) {
      return ['Phiên nộp bài đã thay đổi trong lúc tải ảnh. Em chọn đúng bài rồi gửi lại ảnh nhé.', '', MENU_HINT].join('\n');
    }
    if (!samePhotoScope(current, actor) || !await currentPhotoActor(tx, actor)) return scopeWarning;
    if (current.pendingUploads?.[imageId] !== reservedAt) return 'Lượt tải ảnh này đã hết hạn. Em gửi lại ảnh nhé.';
    if (current.photos.length >= MAX_PHOTOS) return PHOTO_REPLIES.max;
    const photos = [...current.photos, { url, name: `zalo-${String(current.photos.length + 1).padStart(2, '0')}.${mimeType.split('/')[1] || 'jpg'}`, mimeType, size: buffer.byteLength }];
    const pendingUploads = { ...current.pendingUploads };
    delete pendingUploads[imageId];
    tx.update(ref, { photos, pendingUploads, receivedImages: [...(current.receivedImages ?? []), imageId], expiresAt: Date.now() + SESSION_MS });
    return photoAcceptedReply(photos.length, buffer.byteLength);
  });
  if (!reply.startsWith('✅')) {
    await release();
    await file.delete({ ignoreNotFound: true }).catch(() => undefined);
  }
  return reply;
  } catch {
    await release().catch(() => undefined);
    // ponytail: commit có thể đã thành công dù mất xác nhận; chỉ dọn tệp mồ côi sau khi đối chiếu phiên/bài nộp.
    return 'Chưa xác nhận lưu được ảnh. Những ảnh đã nhận vẫn còn; em gửi lại ảnh này để kiểm tra, bot sẽ không nhận trùng.';
  }
};

/**
 * Nhắn "xong": hợp lệ hoá lại bài, chặn nộp trùng, kiểm hạn mức, tạo submission (status 'submitted')
 * rồi chấm nền như đường web — trừ hạn mức NGAY (web: "trừ hạn mức ngay, không đợi kết quả").
 * Xong chấm thì bot tự gửi tin điểm qua Zalo.
 */
export const finishPhotoSession = async (botId: string, userId: string, actor?: PhotoActorScope): Promise<string> => {
  const session = await liveSession(botId, userId);
  if (!session) return PHOTO_REPLIES.noSession;
  const s = session.data;
  if (!samePhotoScope(s, actor)) return scopeWarning;
  if (s.assistState) return PHOTO_REPLIES.assistIncomplete;
  if (Object.keys(s.pendingUploads ?? {}).length) {
    const stale = Object.entries(s.pendingUploads ?? {}).filter(([, at]) => Date.now() - at > 180_000).map(([key]) => key);
    if (stale.length) {
      await db().runTransaction(async tx => {
        const ref = db().collection(SESSIONS).doc(session.id);
        const current = (await tx.get(ref)).data() as PhotoSessionData | undefined;
        if (!current || current.sessionKey !== s.sessionKey) return;
        const pendingUploads = { ...current.pendingUploads };
        for (const key of stale) {
          if (current.pendingUploads?.[key] === s.pendingUploads?.[key] && Date.now() - pendingUploads[key] > 180_000) delete pendingUploads[key];
        }
        tx.update(ref, { pendingUploads });
      });
      return `Có ${stale.length} ảnh chưa tải xong. Em gửi lại ảnh còn thiếu; đã giữ ${s.photos.length} ảnh nhận thành công. Chưa nộp bài.`;
    }
    return `Ảnh đang tải. Đã lưu ${s.photos.length} ảnh; em chờ thông báo đã nhận đủ rồi nhắn xong. Chưa nộp bài.`;
  }
  if (!s.photos.length) return ['Em chưa gửi ảnh nào. Gửi ảnh bài làm rồi nhắn xong nhé.', '', MENU_HINT].join('\n');

  // Nộp hộ: bài nộp/quota/kiểm tra đều tính cho EM ĐƯỢC NỘP HỘ; s.studentId là NGƯỜI GỬI THẬT.
  const targetId = s.assist?.targetStudentId ?? s.studentId;
  const targetName = s.assist?.targetName ?? '';

  const aSnap = await db().collection('assignments').doc(s.assignmentId).get();
  const a = aSnap.data() as Record<string, unknown> | undefined;
  const hong = !aSnap.exists || !a || String(a.classId ?? '') !== s.classId || String(a.teacherId ?? '') !== s.teacherId
    || a.type === 'exam' || a.deliveryMode === 'online' || a.submissionLocked === true
    || (Array.isArray(a.targetStudentIds) && a.targetStudentIds.length && !a.targetStudentIds.includes(targetId));
  if (hong) {
    await cancelPhotoSession(botId, userId, s);
    return ['Bài này đã đổi hoặc không còn nhận nộp. Nhắn 8 để chọn bài khác.', '', MENU_HINT].join('\n');
  }

  // Nộp hộ: ghi dấu ai đã gửi (tên đọc từ danh sách lớp để web hiện badge không phải tra thêm).
  let assistBy: SubmissionDoc['assistBy'];
  if (s.assist) {
    const senderSnap = await db().collection('classes').doc(s.classId).collection('students').doc(s.studentId).get();
    const senderName = String((senderSnap.data() as Record<string, unknown> | undefined)?.name ?? '').trim();
    assistBy = { studentId: s.studentId, name: senderName || `HS …${s.studentId.slice(-4)}`, via: 'zalo_bot' };
  }

  const submissionId = randomUUID();
  const now = new Date().toISOString();
  const submission: Record<string, unknown> = {
    id: submissionId,
    source: 'zalo_bot',
    teacherId: s.teacherId, classId: s.classId, studentId: targetId,
    assignmentId: s.assignmentId,
    textContent: '',
    note: '',
    status: 'submitted',
    // Nộp thường: người gửi = chính em / phụ huynh nộp hộ. Nộp hộ: người gửi = bạn được nhờ (khác `studentId`).
    submittedBy: { role: s.role ?? 'student', studentId: s.studentId, at: now },
    ...(assistBy ? { assistBy } : {}),
    createdAt: now, updatedAt: now,
  };
  // A1 (2026-10-27): chặn nộp trùng + đọc/trừ hạn mức ĐỀU TRONG transaction — 2 HS nộp hộ cùng
  // một bạn cùng lúc thì tx sau bị Firestore đẩy retry (cả hai cùng đọc doc quota, dù doc chưa
  // tồn tại), đọc lại thấy bài đã nộp → chặn cả khi bài đã chấm/lỗi. Đọc phiên trong cùng tx
  // để giữ mọi ảnh đã nhận và không xóa phiên mở lại — cùng ngữ án `reserveQuota` của luồng web.
  const quotaRef = db().collection('gradingQuota').doc(s.teacherId);
  const revisionLockRef = db().collection('submissionRevisionLocks').doc(submissionRevisionLockId(s.classId, targetId, s.assignmentId));
  const sessionRef = db().collection(SESSIONS).doc(session.id);
  const outcome = await db().runTransaction(async tx => {
    const current = (await tx.get(sessionRef)).data() as PhotoSessionData | undefined;
    if (!current || current.expiresAt <= Date.now() || current.sessionKey !== s.sessionKey
      || current.assistState || current.assignmentId !== s.assignmentId
      || current.studentId !== s.studentId || current.classId !== s.classId
      || current.assist?.targetStudentId !== s.assist?.targetStudentId) return { kind: 'changed' as const };
    if (!samePhotoScope(current, actor) || !await currentPhotoActor(tx, actor)) return { kind: 'scope' as const };
    if (Object.keys(current.pendingUploads ?? {}).length) return { kind: 'uploading' as const };
    const assignment = (await tx.get(db().collection('assignments').doc(s.assignmentId))).data();
    const cls = (await tx.get(db().collection('classes').doc(s.classId))).data();
    const sender = await tx.get(db().collection('classes').doc(s.classId).collection('students').doc(s.studentId));
    const target = targetId === s.studentId ? sender : await tx.get(db().collection('classes').doc(s.classId).collection('students').doc(targetId));
    if (!sender.exists || !target.exists) return { kind: 'notEnrolled' as const };
    await tx.get(revisionLockRef);
    if (!assignment || assignment.classId !== s.classId || assignment.teacherId !== s.teacherId || cls?.teacherId !== s.teacherId
      || assignment.submissionLocked || assignment.type === 'exam' || assignment.deliveryMode === 'online'
      || Array.isArray(assignment.targetStudentIds) && assignment.targetStudentIds.length && !assignment.targetStudentIds.includes(targetId)) return { kind: 'changed' as const };
    const pending = await tx.get(db().collection('submissions')
      .where('studentId', '==', targetId).where('assignmentId', '==', s.assignmentId));
    const attempts = pending.docs.map(doc => ({ ...doc.data(), id: doc.id } as SubmissionDoc))
      .filter(row => row.classId === s.classId && row.teacherId === s.teacherId)
      .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')) || b.id.localeCompare(a.id));
    const previous = attempts[0];
    if (s.revisionOf && (s.assist || previous?.id !== s.revisionOf
      || attempts.some(row => ['submitted', 'grading'].includes(row.status) || awaitsClarification(row.grade?.questionResults)))) return { kind: 'revisionChanged' as const };
    if (!s.revisionOf && !pending.empty) {
      return { kind: 'duplicate' as const,
        pending: pending.docs.some(doc => ['submitted', 'grading'].includes((doc.data() as SubmissionDoc).status)) };
    }
    const quotaSnap = await tx.get(quotaRef);
    const quota = rollQuota(quotaSnap.exists ? (quotaSnap.data() as Partial<QuotaDoc>) : null, today());
    const verdict = remainingQuota(quota, 'self', targetId);
    if (verdict.allowed <= 0) {
      return { kind: 'quota' as const, reason: verdict.reason };
    }
    const incoming = { fileUrls: current.photos.map(photo => photo.url), attachments: current.photos.map(photo => ({ ...photo, kind: 'image' as const })), textContent: '' };
    const evidence = s.revisionMode === 'supplement' && previous
      ? mergeSubmissionEvidence({ fileUrls: previous.fileUrls ?? [], attachments: previous.attachments ?? [], textContent: previous.textContent }, incoming) : incoming;
    if (evidence.fileUrls.length > 12) return { kind: 'tooMany' as const };
    tx.create(db().collection('submissions').doc(submissionId), {
      ...submission,
      ...evidence,
      ...(s.revisionOf ? { supplementOf: s.revisionOf, revisionMode: s.revisionMode ?? 'supplement' } : {}),
    });
    tx.delete(sessionRef);
    tx.set(quotaRef, bumpQuota(quota, 'self', targetId, 1));
    tx.set(revisionLockRef, { submissionId, updatedAt: now });
    return { kind: 'ok' as const, session: current };
  });
  if (outcome.kind === 'changed') return PHOTO_REPLIES.sessionChanged;
  if (outcome.kind === 'uploading') return 'Ảnh đang tải. Em chờ thông báo đã nhận đủ rồi nhắn xong; chưa nộp bài.';
  if (outcome.kind === 'notEnrolled') return 'Hồ sơ học sinh không còn trong lớp. Chưa nộp bài; ảnh vẫn được giữ. Em liên hệ thầy cô để kiểm tra.';
  if (outcome.kind === 'scope') return scopeWarning;
  if (outcome.kind === 'revisionChanged') return 'Bài đã có lượt mới, đang chấm hoặc chờ xác nhận. Ảnh vẫn được giữ; hoàn tất lượt trước rồi chọn lại bổ sung/nộp lại.';
  if (outcome.kind === 'tooMany') return 'Tổng ảnh cũ và mới vượt 12 tệp. Ảnh mới vẫn được giữ; em mở web để chọn bộ ảnh phù hợp hoặc nhờ thầy cô.';
  if (outcome.kind === 'duplicate') {
    // A3: người nộp hộ không xem tiến độ của bạn qua mục 2 — dẫn đúng nơi xem.
    const state = outcome.pending ? 'đang chờ chấm rồi' : 'đã được nộp rồi';
    return [targetName
      ? `Bài của ${targetName} ${state}, không nộp trùng. Kết quả sẽ hiện trên tài khoản của ${targetName}.`
      : `Bài này ${state}, không nộp trùng. Nhắn 2 để xem tiến độ.`, '', MENU_HINT].join('\n');
  }
  if (outcome.kind === 'quota') {
    return [outcome.reason, '', MENU_HINT].join('\n');
  }

  await notifyHomeworkSheet(db(), s.classId);
  const token = String(process.env.ZALO_BOT_TOKEN || '');
  const chatId = userId;
  chayNgam(gradeAndNotify(token, chatId, submissionId, outcome.session, actor));
  // GV-1 (2026-10-27): push "HS vừa nộp bài" tới mọi bot-link teacher của GV (bỏ qua tài khoản
  // vừa nộp — tài khoản test giữ song song vai). Phụ: lỗi bỏ qua, không chặn trả lời HS.
  chayNgam(notifyTeacherNewSubmission(getAdminDb(), token, {
    teacherId: s.teacherId, classId: s.classId, studentId: targetId,
    assignmentTitle: s.assignmentTitle, photoCount: outcome.session.photos.length, fromUserId: userId,
  }));
  chayNgam(notifyParentSubmission(getAdminDb(), token, {
    classId: s.classId, studentId: targetId,
    assignmentTitle: s.assignmentTitle, photoCount: outcome.session.photos.length, fromUserId: userId,
  }));
  // A3 (2026-10-27): người nộp hộ nhắn 2 chỉ xem được bài của CHÍNH EM — kết quả của bạn nằm
  // trên tài khoản của bạn ấy, đừng dẫn nhầm.
  return [`📤 Đã nhận bài "${s.assignmentTitle}"${targetName ? ` của ${targetName}` : ''} (${outcome.session.photos.length} ảnh).`,
    targetName
      ? `⏳ Máy đang chấm; điểm sẽ hiện trên tài khoản của ${targetName} (mục 2 chỉ hiện bài của chính em).\n\nEm có thể tiếp tục dùng menu trong lúc chờ.`
      : `⏳ Bài đã lưu, máy đang xử lý. Nhắn 2 để xem trạng thái; điểm sẽ hiện sau khi thầy cô duyệt.`,
    '', MENU_HINT].join('\n');
};

const gradeAndNotify = async (token: string, chatId: string, submissionId: string, s: PhotoSessionData, actor?: PhotoActorScope): Promise<void> => {
  const mayNotify = () => db().runTransaction(tx => currentPhotoActor(tx, actor));
  const baiCua = s.assist ? ` của ${s.assist.targetName}` : '';
  const khongChamDuoc = async (loi: string): Promise<void> => {
    if (!await mayNotify()) return;
    await sendStyled(token, chatId, [`⚠️ Chưa chấm được bài "${s.assignmentTitle}"${baiCua}`, loi, 'Bài vẫn được lưu để thầy cô chấm trên web.', '', MENU_HINT].join('\n'));
  };
  try {
    // KEY CHẤM BÀI (sửa 30/10): KHÔNG đọc key riêng của GV nữa. Webhook Zalo không có request
    // context của GV (`ensureGeminiKey` trả rỗng), mà khoá Gemini của GV có thể đã cạn hạn mức
    // (thực tế 30/10: keyStatus=exhausted). Chấm bài nay dùng khoá của máy chủ theo chuỗi
    // `getGradingChain()` (GRADING_VILAO_API_KEY, hoặc PH_CHAT_VILAO_KEY dùng chung).
    if (getGradingChain().length === 0) { await khongChamDuoc('AI chấm của lớp đang tạm dừng, thầy cô sẽ chấm sớm.'); return; }
    const aSnap = await db().collection('assignments').doc(s.assignmentId).get();
    if (!aSnap.exists) { await khongChamDuoc('Bài không còn tồn tại.'); return; }
    const ctx = await gradeContextFor(aSnap.data() as Record<string, unknown>);
    await gradeOneSubmission(db(), submissionId, ctx, '', s.teacherId, false, 'quick');
    const fresh = (await db().collection('submissions').doc(submissionId).get()).data() as (SubmissionDoc & { errorMessage?: string }) | undefined;
    if (fresh?.status === 'graded' && fresh.grade) {
      const approved = fresh.grade.teacherApproved === true;
      if (!await mayNotify()) return;
      const review = buildPhotoReviewReply(fresh.grade.photoReview);
      if (review && !s.assist) await sendStyled(token, chatId, review);
      // Sticker chúc mừng (chốt 4/11): chỉ khi đã duyệt và điểm từ 8/10 trở lên — "có cảm xúc"
      // như người thật, không lạm dụng. Sticker lỗi thì bỏ qua, không chặn tin điểm.
      const msg = !s.assist && isCongratulation(fresh.grade.score, fresh.grade.maxScore, approved) ? CONGRATS_STICKER() : '';
      if (msg) await sendSticker(token, chatId, msg).catch(() => false);
      await sendStyled(token, chatId, gradedReply(s.assignmentTitle, fresh.grade.score, fresh.grade.maxScore, approved, s.assist?.targetName));
      const targetStudentId = s.assist?.targetStudentId ?? s.studentId;
      chayNgam(notifyParentGraded(getAdminDb(), token, {
        classId: s.classId, studentId: targetStudentId,
        assignmentTitle: s.assignmentTitle, score: fresh.grade.score, maxScore: fresh.grade.maxScore,
        approved, fromUserId: chatId,
      }));
      return;
    }
    if (fresh?.status === 'error' && fresh.errorMessage) {
      await khongChamDuoc([String(fresh.errorMessage).slice(0, 200), s.assist ? `Nhờ ${s.assist.targetName} mở tài khoản của bạn ấy để kiểm tra hoặc nộp lại.` : 'Nếu ảnh sai, mờ hoặc thiếu, nhắn bổ sung để thêm ảnh hoặc nộp lại để thay bộ ảnh. Lượt cũ vẫn được giữ.'].join('\n'));
      return;
    }
    // Khoá AI chờ giáo viên hoặc bài nằm chờ: gửi câu chung, không lộ lỗi kỹ thuật.
    await khongChamDuoc('AI chấm của lớp đang tạm dừng, thầy cô sẽ chấm sớm.');
  } catch (error) {
    if (error instanceof AiKeyRequiredError) { await khongChamDuoc('AI chấm của lớp đang tạm dừng, thầy cô sẽ chấm sớm.'); return; }
    const failed = await db().collection('submissions').doc(submissionId).get().catch(() => null);
    const saved = failed?.data();
    if (saved?.status === 'error' && saved.errorMessage && !s.assist) {
      await khongChamDuoc(`${String(saved.errorMessage).slice(0, 200)}\nEm nhắn bổ sung để thêm ảnh, hoặc nộp lại để thay bộ ảnh. Bài cũ vẫn được giữ.`);
      return;
    }
    await khongChamDuoc('Có lỗi khi chấm. Em thử lại sau, hoặc nhờ thầy cô chấm trên web.');
  }
};
