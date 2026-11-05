// Việc 4 — HS chụp bài gửi bot Zalo tự chấm.
//
// Luồng: HS nhắn 8 → chọn bài (chấm <số>) → gửi ảnh (tối đa 3, trong 60 phút) → nhắn xong
// → bot tải ảnh Zalo (URL tạm thời) về, đẩy Firebase Storage đúng đường `accepted-homework/`
// như luồng web, tạo submission rồi chấm bằng CHÍNH `gradeOneSubmission` của luồng web
// (điểm/nhận xét/lịch sử khớp 100% web). Chấm chạy trong `chayNgam`; xong thì bot gửi tin
// điểm qua Zalo. Hạn mức dùng đúng quota có sẵn: 5 bài/em/ngày, 100 bài/lớp/ngày.
//
// Phạm vi lần này: chỉ HỌC SINH đã liên kết; không exam/online/khóa nộp; PH không nộp thay;
// không bổ sung ảnh bài đã có điểm (nhờ thầy cô trên web).
// Nộp hộ (2026-10-27): HS gửi bài hộ bạn CÙNG LỚP — gõ tên bạn (không cần PIN của bạn),
// chọn bài đang chờ của bạn đó, gửi ảnh như thường. Mọi kiểm tra/quota/submission tính cho
// EM ĐƯỢC NỘP HỘ; `submittedBy` ghi NGƯỜI GỬI THẬT; thêm `assistBy` để web hiển thị badge.
import { randomUUID } from 'node:crypto';
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
/** Ngân sách chấm bot: function webhook ~90s → chấm phải xong trước đó, kèm margin tải ảnh + ghi doc. */
const GRADE_BUDGET_MS = 55_000;
const GRADE_MARGIN_MS = 10_000;

export interface PhotoSessionData {
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

export const PHOTO_REPLIES = {
  noSession: '📸 Chưa có ảnh nào được nhận.\n\nNhắn 8 để chọn bài rồi gửi ảnh nhé.\n\n' + MENU_HINT,
  pickFirst: '👉 Em chọn bài trước đã:\nNhắn số thứ tự bài trong danh sách vừa hiện (ví dụ: 1), rồi gửi ảnh nhé.\n\nNhắn 8 để xem lại danh sách.',
  max: `📸 Đã nhận đủ ${MAX_PHOTOS} ảnh — nhắn: xong để máy bắt đầu chấm nhé.\n\n` + MENU_HINT,
  badImage: '⚠️ Không nhận được ảnh này (ảnh quá lớn hoặc sai định dạng).\n\nEm gửi lại ảnh rõ nét khác nhé.\n\n' + MENU_HINT,
  assistIncomplete: '⚠️ Chưa chọn xong bạn và bài để nộp hộ nên chưa thể nhận ảnh.\n\nNhắn "nộp hộ" để làm lại, hoặc nhắn 0 để hủy.\n\n' + MENU_HINT,
  sessionChanged: 'ℹ️ Phiên nộp bài đã thay đổi.\n\nEm tiếp tục phiên hiện tại rồi gửi lại lệnh nhé.\n\n' + MENU_HINT,
  cancelSuccess: '🔄 Đã hủy phiên chọn bài.\n\nEm nhắn 8 để chọn lại bài khác, hoặc nhắn 0 để xem menu.\n\n' + MENU_HINT,
  expiredSession: `⏰ Phiên nộp bài trước đã hết hạn.\n\n📌 HƯỚNG DẪN:\n   • Nhắn 8 để xem lại danh sách bài.\n   • Chọn số thứ tự bài rồi gửi ảnh bài làm.\n\n⚠️ LƯU Ý: Ảnh chỉ được tính là BÀI NỘP khi em đã chọn bài. Muốn nhờ giải đề trong ảnh thì nhắn 0 về menu rồi gửi ảnh.\n\n` + MENU_HINT,
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
  | { kind: 'assist' } | { kind: 'assistPick'; n: number } | { kind: 'assistChoose'; n: number };

/** Nhận lệnh chấm: '8' do menu trả, ở đây 'chấm', 'chấm <số>', 'xong', 'nộp hộ [số]', 'chọn <số>' và 'đổi bài'/'hủy'. Bỏ dấu để 'cham 2' / 'nop ho' / 'doi bai' vẫn ăn. */
export const parsePhotoCommand = (raw: string): PhotoCommand | null => {
  const plain = raw.normalize('NFC').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').trim().toLowerCase();
  if (/^cham$/.test(plain)) return { kind: 'list' };
  const pick = /^cham\s*(\d{1,2})$/.exec(plain);
  if (pick) return { kind: 'pick', n: Number(pick[1]) };
  if (/^(xong|gui)$/.test(plain)) return { kind: 'done' };
  if (/^(doi bai|chua xong|huy|bo qua)$/.test(plain)) return { kind: 'cancel' };
  const assist = /^nop\s+ho(?:\s+(\d{1,2}))?$/.exec(plain);
  if (assist) return assist[1] ? { kind: 'assistPick', n: Number(assist[1]) } : { kind: 'assist' };
  const choose = /^chon\s*(\d{1,2})$/.exec(plain);
  if (choose) return { kind: 'assistChoose', n: Number(choose[1]) };
  return null;
};

/**
 * Bài giao đang chờ em nộp: cùng điều kiện chặn của luồng web (`assertActorCurrent`) —
 * không exam, không online, chưa khóa nộp, đúng đối tượng được giao, và em CHƯA có bài nộp nào
 * cho bài đó (bài đang lỗi/chờ chấm nhờ thầy cô xử lý trên web, không nộp trùng qua bot).
 * teacherId đọc từ class doc (link chỉ mang classId + studentId) — phiên nộp phải theo đúng GV chủ lớp.
 * Dữ liệu query TRỰC TIẾP Firestore mỗi lần gọi → luôn real-time. Chốt 3/11: trả ĐỦ mọi bài chờ
 * (không cắt 5/10 bài nữa) — sắp: bài còn hạn trước (hạn gần nhất lên đầu), bài KHÔNG hạn kế
 * tiếp, bài QUÁ HẠN xuống cuối (gắn cờ overdue). Chỉ chặn hiển thị khi vượt trần ký tự Zalo.
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
): Promise<{ teacherId: string; items: Array<{ id: string; title: string; dueAt?: string; overdue?: boolean; attachments: AssignmentAttachment[] }>; total: number }> => {
  const [classSnap, assignmentsSnap, submissionsSnap] = await Promise.all([
    db().collection('classes').doc(classId).get(),
    db().collection('assignments').where('classId', '==', classId).get(),
    db().collection('submissions').where('studentId', '==', studentId).get(),
  ]);
  const cls = classSnap.data() as Record<string, unknown> | undefined;
  if (!cls) return { teacherId: '', items: [], total: 0 };
  const teacherId = String(cls.teacherId ?? '');
  const submittedAssignmentIds = new Set(submissionsSnap.docs.map(doc => String(doc.data()?.assignmentId ?? '')).filter(Boolean));
  const today = new Date().toISOString().slice(0, 10);
  const raw = assignmentsSnap.docs
    .map(doc => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as { id: string } & Record<string, unknown>)
    .filter(item => item.type !== 'exam' && item.deliveryMode !== 'online' && item.submissionLocked !== true
      && (!Array.isArray(item.targetStudentIds) || !item.targetStudentIds.length || item.targetStudentIds.includes(studentId))
      && !submittedAssignmentIds.has(item.id));
  const decorated = raw.map(item => {
    const dueAt = item.dueAt ? String(item.dueAt) : '';
    // dueAt dạng ISO (date hoặc datetime) so sánh từ điển với YYYY-MM-DD vẫn đúng thứ tự thời gian.
    const overdue = Boolean(dueAt) && dueAt < today;
    // Đọc mảng attachments từ Firestore (nếu có)
    const rawAttachments = Array.isArray(item.attachments) ? item.attachments : [];
    const attachments: AssignmentAttachment[] = rawAttachments
      .filter((a: unknown) => a && typeof a === 'object')
      .map((a: Record<string, unknown>) => ({
        name: String(a.name ?? 'file'),
        url: String(a.url ?? ''),
        type: (String(a.type ?? 'other').toLowerCase() as 'pdf' | 'word' | 'image' | 'other'),
      }))
      .filter(a => a.url);
    return { id: item.id, title: String(item.title ?? '').slice(0, 120), dueAt, overdue, attachments };
  });
  decorated.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? 1 : -1; // bài quá hạn xuống cuối
    const da = a.dueAt || '9999'; const db_ = b.dueAt || '9999';
    if (da !== db_) return da.localeCompare(db_); // hạn gần nhất lên đầu
    return a.title.localeCompare(b.title, 'vi');
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
    const prefix = item.overdue
      ? `${index + 1}. ${item.title} — [quá hạn${item.dueAt ? `: ${item.dueAt.slice(0, 10)}` : ''}]`
      : `${index + 1}. ${item.title}${item.dueAt ? ` — [hạn: ${item.dueAt.slice(0, 10)}]` : ''}`;
    lines.push(prefix);
    // Thêm file đính kèm (nếu có)
    if (item.attachments.length > 0) {
      const fileLines = item.attachments.map(f => `   ${fileIcon(f.type)} ${f.name}: ${f.url}`);
      lines.push(...fileLines);
    }
  });
  const body = fitZaloList(
    [`📸 BÀI CHỜ NỘP (${items.length} bài):`],
    lines,
    [
      '📌 HƯỚNG DẪN:',
      '   • Nhắn SỐ THỨ TỰ bài (ví dụ: 1) để chọn bài nộp.',
      '   • Nộp hộ bạn cùng lớp: nhắn "nộp hộ".',
      '⚠️ LƯU Ý:',
      '   • Bài [quá hạn] vẫn nộp được, nhưng điểm có thể bị trừ.',
      `   • Mỗi bài tối đa ${MAX_PHOTOS} ảnh, trong ${SESSION_MINUTES} phút.`,
      '   • Nhấn link file (nếu có) để xem đề bài trước khi làm.',
    ],
  );
  return body;
};

const sessionId = (botId: string, userId: string): string => `${botId}_${userId}`;

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
  '👉 Đổi ý: nhắn 0 để hủy.',
  '', MENU_HINT,
].join('\n');

/** Giữ ảnh đã nhận; chỉ thay phiên chưa có ảnh để vẫn hồi phục được luồng nộp hộ. */
const unfinishedPhotos = (session: PhotoSessionData): string | null =>
  session.expiresAt > Date.now() && session.photos.length > 0
    ? [`Em đang nộp bài "${session.assignmentTitle}" với ${session.photos.length} ảnh chưa gửi xong.`,
      'Nhắn: xong để máy chấm, hoặc 0 để hủy rồi chọn bài khác nhé.', '', MENU_HINT].join('\n')
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
    targetCandidates: [], expiresAt: Date.now() + SESSION_MS })) return PHOTO_REPLIES.sessionChanged;
  const lines = items.map((item, index) => {
    const due = item.overdue
      ? ` — quá hạn${item.dueAt ? `: ${item.dueAt.slice(0, 10)}` : ''}`
      : item.dueAt ? ` — hạn ${item.dueAt.slice(0, 10)}` : '';
    return `${index + 1}. ${item.title}${due}`;
  });
  return fitZaloList([`Bài đang chờ nộp của ${target.name} (${items.length} bài):`], lines, ['Nhắn: nộp hộ <số> (ví dụ: nộp hộ 1).']);
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
    return [`Đang nộp hộ ${session.data.assist?.targetName ?? 'bạn'}. Nhắn: nộp hộ <số> để chọn bài, hoặc 0 để hủy.`, '', MENU_HINT].join('\n');
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
  const target = n >= 1 && n <= items.length ? items[n - 1] : null;
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
  await db().runTransaction(async tx => {
    const current = (await tx.get(ref)).data() as PhotoSessionData | undefined;
    // Không đè phiên đang có ảnh chưa gửi xong — người dùng cần "xong" hoặc 0 trước.
    if (current && unfinishedPhotos(current)) return;
    tx.set(ref, {
      botId, userId, studentId, classId, teacherId: '',
      assignmentId: '', assignmentTitle: '',
      expiresAt: Date.now() + SESSION_MS, photos: [], awaitingPick: true,
      sessionKey: current?.sessionKey ?? randomUUID(),
      ...(role ? { role } : {}),
    } satisfies PhotoSessionData);
  });
  return photoListReply(items, total);
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
  const target = n >= 1 && n <= items.length ? items[n - 1] : null;
  if (!target) {
    // Số không khớp: giữ trạng thái chờ chọn để em nhắn lại đúng số.
    return [`Số không khớp danh sách (có ${items.length} bài).`, '', photoListReply(items, total)].join('\n');
  }
  // Xoá cờ chờ chọn rồi mới mở phiên (openPhotoSession ghi đè doc).
  await db().collection(SESSIONS).doc(session.id).delete().catch(() => undefined);
  return openPhotoSession(botId, userId, { studentId, classId, teacherId, role: userRole }, target);
};

/**
 * Mở phiên nhận ảnh cho 1 bài, chỉ thay phiên chưa có ảnh. Nộp hộ thì kèm target.
 * Hiển thị link file đính kèm (nếu có) để HS/PH tải về xem.
 */
export const openPhotoSession = async (
  botId: string,
  userId: string,
  ctx: { studentId: string; classId: string; teacherId: string; role?: 'student' | 'parent' },
  assignment: { id: string; title: string; attachments?: AssignmentAttachment[] },
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
  return openSessionReply(session.assignmentTitle, assignment.attachments, assist?.targetName);
};

/**
 * Câu trả lời khi mở phiên nộp — hàm THUẦN (tách ra để xuất ví dụ/test dùng đúng
 * chuỗi production, không chép tay).
 */
export const openSessionReply = (
  title: string,
  attachments?: AssignmentAttachment[],
  assistTargetName?: string,
): string => {
  const lines = [`Bài: ${title}${assistTargetName ? ` — nộp hộ bạn ${assistTargetName}` : ''}`];
  if (attachments?.length) {
    lines.push('📎 File đề bài:');
    attachments.forEach(f => lines.push(`   ${fileIcon(f.type)} ${f.name}: ${f.url}`));
  }
  lines.push(
    `📤 HƯỚNG DẪN NỘP BÀI:`,
    `   1. Chụp ẢNH RÕ NÉT bài làm (không mờ, không cắt xén).`,
    `   2. Gửi ảnh vào chat này — tối đa ${MAX_PHOTOS} ảnh/bài, trong ${SESSION_MINUTES} phút.`,
    `   3. Gửi xong nhắn: xong — máy sẽ chấm bài và báo điểm cho em.`,
    `⚠️ LƯU Ý:`,
    `   • Ảnh phải là JPG/PNG/WEBP (không hỗ trợ HEIC/HEIF), dưới 10MB.`,
    `   • Chỉ gửi ảnh BÀI LÀM (không chụp màn hình, không ảnh khác).`,
    `   • Ảnh mờ/thiếu sẽ không chấm được.`,
    `   • Muốn chọn lại bài khác: nhắn chấm.`,
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
      ? `📤 Gửi tiếp ${remaining} ảnh nữa hoặc nhắn: xong để máy chấm.`
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
  return [`📝 Chấm xong bài "${title}"${baiCua}: ${score}/${maxScore} điểm`,
    approved ? '✅ Thầy cô đã duyệt — điểm chính thức.' : '⏳ Máy chấm trước, thầy cô duyệt sau rồi điểm mới chính thức.',
    assistTargetName ? `Điểm và nhận xét hiện trên tài khoản của ${assistTargetName}.` : '👉 Xem chi tiết từng câu: nhắn 2.',
    ...(approved || assistTargetName ? [] : ['💡 Thấy điểm chưa đúng? Nhắn: chấm lại']),
    '', MENU_HINT].join('\n');
};

/** Nhắn 0 (xem lại menu) → hủy phiên ảnh đang mở nếu có. Không có phiên thì vô hại. */
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
export const photoReceivedReply = async (botId: string, userId: string, photoUrl: string): Promise<string> => {
  const session = await liveSession(botId, userId);
  if (!session) return PHOTO_REPLIES.noSession;
  // Đang chờ CHỌN BÀI: chưa có assignment nên ảnh không thuộc bài nào — phải chọn bài trước.
  if (session.data.awaitingPick === true) return PHOTO_REPLIES.pickFirst;
  // Luồng nộp hộ chưa chọn xong bạn + bài: chưa biết ảnh thuộc bài nào của ai — không nhận.
  if (session.data.assistState) return PHOTO_REPLIES.assistIncomplete;
  if (session.data.photos.length >= MAX_PHOTOS) return PHOTO_REPLIES.max;
  let buffer: Buffer;
  let mimeType = '';
  const image = await downloadImage(photoUrl, MAX_BYTES);
  if (!image) {
    // Log đã nằm trong downloadImage (chỉ metadata) — HS nhận câu hướng dẫn cụ thể bên dưới.
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
  const ref = db().collection(SESSIONS).doc(session.id);
  return db().runTransaction(async tx => {
    const current = (await tx.get(ref)).data() as PhotoSessionData | undefined;
    if (!current || current.expiresAt <= Date.now()) return PHOTO_REPLIES.noSession;
    if (current.sessionKey !== session.data.sessionKey || current.assistState || current.assignmentId !== session.data.assignmentId
      || current.classId !== session.data.classId || current.studentId !== session.data.studentId
      || current.assist?.targetStudentId !== session.data.assist?.targetStudentId) {
      return ['Phiên nộp bài đã thay đổi trong lúc tải ảnh. Em chọn đúng bài rồi gửi lại ảnh nhé.', '', MENU_HINT].join('\n');
    }
    if (current.photos.length >= MAX_PHOTOS) return PHOTO_REPLIES.max;
    const photos = [...current.photos, { url, name: `zalo-${String(current.photos.length + 1).padStart(2, '0')}.${mimeType.split('/')[1] || 'jpg'}`, mimeType, size: buffer.byteLength }];
    tx.update(ref, { photos, expiresAt: Date.now() + SESSION_MS });
    return photoAcceptedReply(photos.length, buffer.byteLength);
  });
};

/**
 * Nhắn "xong": hợp lệ hoá lại bài, chặn nộp trùng, kiểm hạn mức, tạo submission (status 'submitted')
 * rồi chấm nền như đường web — trừ hạn mức NGAY (web: "trừ hạn mức ngay, không đợi kết quả").
 * Xong chấm thì bot tự gửi tin điểm qua Zalo.
 */
export const finishPhotoSession = async (botId: string, userId: string): Promise<string> => {
  const session = await liveSession(botId, userId);
  if (!session) return PHOTO_REPLIES.noSession;
  const s = session.data;
  if (s.assistState) return PHOTO_REPLIES.assistIncomplete;
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
  const sessionRef = db().collection(SESSIONS).doc(session.id);
  const outcome = await db().runTransaction(async tx => {
    const current = (await tx.get(sessionRef)).data() as PhotoSessionData | undefined;
    if (!current || current.expiresAt <= Date.now() || current.sessionKey !== s.sessionKey
      || current.assistState || current.assignmentId !== s.assignmentId
      || current.studentId !== s.studentId || current.classId !== s.classId
      || current.assist?.targetStudentId !== s.assist?.targetStudentId) return { kind: 'changed' as const };
    const pending = await tx.get(db().collection('submissions')
      .where('studentId', '==', targetId).where('assignmentId', '==', s.assignmentId));
    if (!pending.empty) {
      tx.delete(sessionRef);
      return { kind: 'duplicate' as const,
        pending: pending.docs.some(doc => ['submitted', 'grading'].includes((doc.data() as SubmissionDoc).status)) };
    }
    const quotaSnap = await tx.get(quotaRef);
    const quota = rollQuota(quotaSnap.exists ? (quotaSnap.data() as Partial<QuotaDoc>) : null, today());
    const verdict = remainingQuota(quota, 'self', targetId);
    if (verdict.allowed <= 0) {
      tx.delete(sessionRef);
      return { kind: 'quota' as const, reason: verdict.reason };
    }
    tx.create(db().collection('submissions').doc(submissionId), {
      ...submission,
      fileUrls: current.photos.map(photo => photo.url),
      attachments: current.photos.map(photo => ({ ...photo, kind: 'image' as const })),
    });
    tx.delete(sessionRef);
    tx.set(quotaRef, bumpQuota(quota, 'self', targetId, 1));
    return { kind: 'ok' as const, session: current };
  });
  if (outcome.kind === 'changed') return PHOTO_REPLIES.sessionChanged;
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

  const token = String(process.env.ZALO_BOT_TOKEN || '');
  const chatId = userId;
  chayNgam(gradeAndNotify(token, chatId, submissionId, outcome.session));
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
      ? `⏳ Máy đang chấm; điểm sẽ hiện trên tài khoản của ${targetName} (mục 2 chỉ hiện bài của chính em).\n\n⚠️ Đang load vui lòng đợi — không nhắn thêm câu lệnh để tránh bị gián đoạn nhé.`
      : `⏳ Máy đang chấm, ${s.role === 'parent' ? 'phụ huynh' : 'em'} đợi chút rồi nhắn 2 để xem kết quả nhé.\n\n⚠️ Đang load vui lòng đợi — không nhắn thêm câu lệnh để tránh bị gián đoạn nhé.`,
    '', MENU_HINT].join('\n');
};

const gradeAndNotify = async (token: string, chatId: string, submissionId: string, s: PhotoSessionData): Promise<void> => {
  const baiCua = s.assist ? ` của ${s.assist.targetName}` : '';
  const khongChamDuoc = async (loi: string): Promise<void> => {
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
    await gradeOneSubmission(db(), submissionId, ctx, '', s.teacherId, false, 'quick', undefined, GRADE_BUDGET_MS, GRADE_MARGIN_MS);
    const fresh = (await db().collection('submissions').doc(submissionId).get()).data() as (SubmissionDoc & { errorMessage?: string }) | undefined;
    if (fresh?.status === 'graded' && fresh.grade) {
      const approved = fresh.grade.teacherApproved === true;
      // Sticker chúc mừng (chốt 4/11): chỉ khi đã duyệt và điểm từ 8/10 trở lên — "có cảm xúc"
      // như người thật, không lạm dụng. Sticker lỗi thì bỏ qua, không chặn tin điểm.
      const msg = isCongratulation(fresh.grade.score, fresh.grade.maxScore, approved) ? CONGRATS_STICKER() : '';
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
    if (fresh?.status === 'error' && fresh.errorMessage) { await khongChamDuoc(String(fresh.errorMessage).slice(0, 200)); return; }
    // Khoá AI chờ giáo viên hoặc bài nằm chờ: gửi câu chung, không lộ lỗi kỹ thuật.
    await khongChamDuoc('AI chấm của lớp đang tạm dừng, thầy cô sẽ chấm sớm.');
  } catch (error) {
    if (error instanceof AiKeyRequiredError) { await khongChamDuoc('AI chấm của lớp đang tạm dừng, thầy cô sẽ chấm sớm.'); return; }
    await khongChamDuoc('Có lỗi khi chấm. Em thử lại sau, hoặc nhờ thầy cô chấm trên web.');
  }
};
