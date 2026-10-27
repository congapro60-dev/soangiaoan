// Việc 4 — HS chụp bài gửi bot Zalo tự chấm.
//
// Luồng: HS nhắn 8 → chọn bài (chấm <số>) → gửi ảnh (tối đa 3, trong 10 phút) → nhắn xong
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
import { chayNgam, getGradingApiKey, remainingQuota, bumpQuota, rollQuota, today } from './_grading-core.js';
import type { QuotaDoc } from './_grading-core.js';
import { AiKeyRequiredError, ensureGeminiKey } from './_ai-keys.js';
import { gradeContextFor, gradeOneSubmission } from './grade-homework.js';
import { sendStyled } from './_assistant-zalo-send.js';
import { MENU_HINT } from './_assistant-ph-hs-menu.js';
import { notifyTeacherNewSubmission } from './_assistant-ph-hs-teacher.js';
import type { SubmissionDoc } from '../src/lib/classroom/types.js';

const db = () => getAdminDb();
const SESSIONS = 'assistantPhotoSessions';
const SESSION_MS = 10 * 60 * 1000;
const MAX_PHOTOS = 3;
const MAX_BYTES = 10 * 1024 * 1024;
/** Ngân sách chấm bot: function webhook ~90s → chấm phải xong trước đó, kèm margin tải ảnh + ghi doc. */
const GRADE_BUDGET_MS = 55_000;
const GRADE_MARGIN_MS = 10_000;
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

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
  /** Nộp hộ: bài nộp tính cho bạn cùng lớp này; người gửi thật ghi ở `submittedBy` + `assistBy`. */
  assist?: { targetStudentId: string; targetName: string };
  /** Trạng thái luồng nộp hộ CHƯA chọn xong bạn + bài: name → (pick khi trùng tên) → list. */
  assistState?: 'name' | 'pick' | 'list';
  /** Trùng tên: ưng viên chờ lệnh `chọn <số>`. */
  targetCandidates?: Array<{ id: string; name: string }>;
}

export const PHOTO_REPLIES = {
  noSession: 'Chưa có ảnh nào được nhận. Nhắn 8 để chọn bài rồi gửi ảnh nhé.\n\n' + MENU_HINT,
  max: `Đã đủ ${MAX_PHOTOS} ảnh — nhắn xong để máy chấm nhé.\n\n` + MENU_HINT,
  badImage: 'Không nhận được ảnh này (quá lớn hoặc sai định dạng). Em gửi lại ảnh khác nhé.\n\n' + MENU_HINT,
  assistIncomplete: 'Chưa chọn xong bạn và bài để nộp hộ nên chưa nhận ảnh. Nhắn nộp hộ để làm lại, hoặc 0 để hủy.\n\n' + MENU_HINT,
  sessionChanged: 'Phiên nộp bài đã thay đổi. Em tiếp tục phiên hiện tại rồi gửi lại lệnh nhé.\n\n' + MENU_HINT,
} as const;

export type PhotoCommand =
  | { kind: 'list' } | { kind: 'pick'; n: number } | { kind: 'done' }
  | { kind: 'assist' } | { kind: 'assistPick'; n: number } | { kind: 'assistChoose'; n: number };

/** Nhận lệnh chấm: '8' do menu trả, ở đây 'chấm', 'chấm <số>', 'xong', 'nộp hộ [số]' và 'chọn <số>'. Bỏ dấu để 'cham 2' / 'nop ho' vẫn ăn. */
export const parsePhotoCommand = (raw: string): PhotoCommand | null => {
  const plain = raw.normalize('NFC').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').trim().toLowerCase();
  if (/^cham$/.test(plain)) return { kind: 'list' };
  const pick = /^cham\s*(\d{1,2})$/.exec(plain);
  if (pick) return { kind: 'pick', n: Number(pick[1]) };
  if (/^(xong|gui)$/.test(plain)) return { kind: 'done' };
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
 */
export const pendingAssignmentsForStudent = async (
  classId: string,
  studentId: string,
): Promise<{ teacherId: string; items: Array<{ id: string; title: string; dueAt?: string }> }> => {
  const [classSnap, assignmentsSnap, submissionsSnap] = await Promise.all([
    db().collection('classes').doc(classId).get(),
    db().collection('assignments').where('classId', '==', classId).get(),
    db().collection('submissions').where('studentId', '==', studentId).get(),
  ]);
  const cls = classSnap.data() as Record<string, unknown> | undefined;
  if (!cls) return { teacherId: '', items: [] };
  const teacherId = String(cls.teacherId ?? '');
  const submittedAssignmentIds = new Set(submissionsSnap.docs.map(doc => String(doc.data()?.assignmentId ?? '')).filter(Boolean));
  const items = assignmentsSnap.docs
    .map(doc => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as { id: string } & Record<string, unknown>)
    .filter(item => item.type !== 'exam' && item.deliveryMode !== 'online' && item.submissionLocked !== true
      && (!Array.isArray(item.targetStudentIds) || !item.targetStudentIds.length || item.targetStudentIds.includes(studentId))
      && !submittedAssignmentIds.has(item.id))
    .map(item => ({ id: item.id, title: String(item.title ?? '').slice(0, 120), ...(item.dueAt ? { dueAt: String(item.dueAt) } : {}) }))
    .sort((a, b) => (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999'))
    .slice(0, 5);
  return { teacherId, items };
};

export const photoListReply = (items: Array<{ id: string; title: string; dueAt?: string }>): string => {
  if (!items.length) {
    return ['Hiện không có bài nào đang chờ em nộp.', 'Bài đã nộp / đang chờ chấm: nhắn 2 để xem.', '', MENU_HINT].join('\n');
  }
  const lines = items.map((item, index) => {
    const due = item.dueAt ? ` — hạn ${item.dueAt.slice(0, 10)}` : '';
    return `${index + 1}. ${item.title}${due}`;
  });
  return ['Chọn bài để gửi ảnh chấm:', ...lines, '', 'Nhắn: chấm <số> (ví dụ: chấm 1).', 'Nộp hộ bạn cùng lớp: nhắn nộp hộ.', '', MENU_HINT].join('\n');
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
const assistAskName = ['Muốn nộp hộ bạn nào? Gõ tên bạn trong lớp (ví dụ: Minh Anh).', 'Đổi ý: nhắn 0 để hủy.', '', MENU_HINT].join('\n');

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
  const { items } = await pendingAssignmentsForStudent(classId, target.id);
  if (!items.length) {
    if (!await changePreSession(session, null)) return PHOTO_REPLIES.sessionChanged;
    return [`Bạn ${target.name} hiện không có bài nào đang chờ nộp.`, '', MENU_HINT].join('\n');
  }
  if (!await changePreSession(session, { assistState: 'list', assist: { targetStudentId: target.id, targetName: target.name },
    targetCandidates: [], expiresAt: Date.now() + SESSION_MS })) return PHOTO_REPLIES.sessionChanged;
  const lines = items.map((item, index) => {
    const due = item.dueAt ? ` — hạn ${item.dueAt.slice(0, 10)}` : '';
    return `${index + 1}. ${item.title}${due}`;
  });
  return [`Bài đang chờ nộp của ${target.name}:`, ...lines, '', 'Nhắn: nộp hộ <số> (ví dụ: nộp hộ 1).', '', MENU_HINT].join('\n');
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
  if (!target) return ['Số không khớp danh sách tên.', '', MENU_HINT].join('\n');
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
    return [`Bạn ${assist.targetName} hiện không có bài nào đang chờ nộp.`, '', MENU_HINT].join('\n');
  }
  const target = n >= 1 && n <= items.length ? items[n - 1] : null;
  if (!target) return [`Số không khớp danh sách bài của ${assist.targetName}.`, '', MENU_HINT].join('\n');
  return openPhotoSession(botId, userId, { studentId, classId, teacherId }, target, assist, session.data);
};

/** Mở phiên nhận ảnh cho 1 bài, chỉ thay phiên chưa có ảnh. Nộp hộ thì kèm target. */
export const openPhotoSession = async (
  botId: string,
  userId: string,
  ctx: { studentId: string; classId: string; teacherId: string },
  assignment: { id: string; title: string },
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
  return [`Bài: ${session.assignmentTitle}${assist ? ` — nộp hộ bạn ${assist.targetName}` : ''}`,
    `Em gửi ảnh bài làm nhé — tối đa ${MAX_PHOTOS} ảnh, trong 10 phút.`,
    'Gửi xong nhắn: xong để máy chấm.',
    'Muốn chọn lại bài: nhắn chấm.',
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
 * Nhận 1 ảnh từ Zalo: tải về (URL tạm thời), đẩy Storage `accepted-homework/` + download token —
 * URL đúng format web nên `gradeOneSubmission` và GV xem trên web dùng như ảnh nộp thường.
 */
export const photoReceivedReply = async (botId: string, userId: string, photoUrl: string): Promise<string> => {
  const session = await liveSession(botId, userId);
  if (!session) return PHOTO_REPLIES.noSession;
  // Luồng nộp hộ chưa chọn xong bạn + bài: chưa biết ảnh thuộc bài nào của ai — không nhận.
  if (session.data.assistState) return PHOTO_REPLIES.assistIncomplete;
  if (session.data.photos.length >= MAX_PHOTOS) return PHOTO_REPLIES.max;
  let buffer: Buffer;
  let mimeType = '';
  try {
    const res = await fetch(photoUrl, { signal: AbortSignal.timeout(15_000), redirect: 'follow' });
    if (!res.ok) return PHOTO_REPLIES.badImage;
    mimeType = (res.headers.get('content-type') || '').split(';')[0].trim();
    const array = await res.arrayBuffer();
    if (array.byteLength < 1 || array.byteLength >= MAX_BYTES) return PHOTO_REPLIES.badImage;
    buffer = Buffer.from(array);
  } catch { return PHOTO_REPLIES.badImage; }
  if (!IMAGE_MIMES.includes(mimeType)) return PHOTO_REPLIES.badImage;
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
    return [`Đã nhận ảnh ${photos.length}/${MAX_PHOTOS}.`,
      photos.length >= MAX_PHOTOS ? 'Nhắn: xong để máy chấm.' : 'Gửi tiếp hoặc nhắn: xong để máy chấm.',
      '', MENU_HINT].join('\n');
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
    // Nộp thường: người gửi = chính em. Nộp hộ: người gửi = bạn được nhờ (khác `studentId`).
    submittedBy: { role: 'student', studentId: s.studentId, at: now },
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
  // A3 (2026-10-27): người nộp hộ nhắn 2 chỉ xem được bài của CHÍNH EM — kết quả của bạn nằm
  // trên tài khoản của bạn ấy, đừng dẫn nhầm.
  return [`Đã nhận bài "${s.assignmentTitle}"${targetName ? ` của ${targetName}` : ''} (${outcome.session.photos.length} ảnh).`,
    targetName
      ? `Máy đang chấm; điểm sẽ hiện trên tài khoản của ${targetName} (mục 2 chỉ hiện bài của chính em).`
      : 'Máy đang chấm, em đợi chút rồi nhắn 2 để xem kết quả.',
    '', MENU_HINT].join('\n');
};

const gradeAndNotify = async (token: string, chatId: string, submissionId: string, s: PhotoSessionData): Promise<void> => {
  const baiCua = s.assist ? ` của ${s.assist.targetName}` : '';
  const khongChamDuoc = async (loi: string): Promise<void> => {
    await sendStyled(token, chatId, [`Chưa chấm được bài "${s.assignmentTitle}"${baiCua}`, loi, 'Bài vẫn được lưu để thầy cô chấm trên web.', '', MENU_HINT].join('\n'));
  };
  try {
    const apiKey = getGradingApiKey();
    await ensureGeminiKey(apiKey);
    const aSnap = await db().collection('assignments').doc(s.assignmentId).get();
    if (!aSnap.exists) { await khongChamDuoc('Bài không còn tồn tại.'); return; }
    const ctx = await gradeContextFor(aSnap.data() as Record<string, unknown>);
    await gradeOneSubmission(db(), submissionId, ctx, apiKey, s.teacherId, false, 'quick', undefined, GRADE_BUDGET_MS, GRADE_MARGIN_MS);
    const fresh = (await db().collection('submissions').doc(submissionId).get()).data() as (SubmissionDoc & { errorMessage?: string }) | undefined;
    if (fresh?.status === 'graded' && fresh.grade) {
      const approved = fresh.grade.teacherApproved === true;
      await sendStyled(token, chatId, [`Chấm xong bài "${s.assignmentTitle}"${baiCua}: ${fresh.grade.score}/${fresh.grade.maxScore} điểm`,
        approved ? 'Thầy cô đã duyệt — điểm chính thức.' : 'Máy chấm trước, thầy cô duyệt sau rồi điểm mới chính thức.',
        // A3: người nộp hộ không xem được bài của bạn qua mục 2 — dẫn đúng nơi xem.
        s.assist ? `Điểm và nhận xét hiện trên tài khoản của ${s.assist.targetName}.` : 'Xem chi tiết từng câu: nhắn 2.',
        '', MENU_HINT].join('\n'));
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
