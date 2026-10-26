// Việc 4 — HS chụp bài gửi bot Zalo tự chấm.
//
// Luồng: HS nhắn 8 → chọn bài (chấm <số>) → gửi ảnh (tối đa 3, trong 10 phút) → nhắn xong
// → bot tải ảnh Zalo (URL tạm thời) về, đẩy Firebase Storage đúng đường `accepted-homework/`
// như luồng web, tạo submission rồi chấm bằng CHÍNH `gradeOneSubmission` của luồng web
// (điểm/nhận xét/lịch sử khớp 100% web). Chấm chạy trong `chayNgam`; xong thì bot gửi tin
// điểm qua Zalo. Hạn mức dùng đúng quota có sẵn: 5 bài/em/ngày, 100 bài/lớp/ngày.
//
// Phạm vi lần này: chỉ HỌC SINH đã liên kết; không exam/online/khóa nộp; không PH nộp thay;
// không bổ sung ảnh bài đã có điểm (nhờ thầy cô trên web).
import { randomUUID } from 'node:crypto';
import { getAdminDb, getAdminStorage } from './_exam-core.js';
import { chayNgam, getGradingApiKey, loadQuotaDoc, remainingQuota, bumpQuota } from './_grading-core.js';
import { AiKeyRequiredError, ensureGeminiKey } from './_ai-keys.js';
import { gradeContextFor, gradeOneSubmission } from './grade-homework.js';
import { sendStyled } from './_assistant-zalo-send.js';
import { MENU_HINT } from './_assistant-ph-hs-menu.js';
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
  botId: string;
  userId: string;
  studentId: string;
  classId: string;
  teacherId: string;
  assignmentId: string;
  assignmentTitle: string;
  expiresAt: number;
  photos: Array<{ url: string; name: string; mimeType: string; size: number }>;
}

export const PHOTO_REPLIES = {
  noSession: 'Chưa có ảnh nào được nhận. Nhắn 8 để chọn bài rồi gửi ảnh nhé.\n\n' + MENU_HINT,
  max: `Đã đủ ${MAX_PHOTOS} ảnh — nhắn xong để máy chấm nhé.\n\n` + MENU_HINT,
  badImage: 'Không nhận được ảnh này (quá lớn hoặc sai định dạng). Em gửi lại ảnh khác nhé.\n\n' + MENU_HINT,
} as const;

export type PhotoCommand = { kind: 'list' } | { kind: 'pick'; n: number } | { kind: 'done' };

/** Nhận lệnh chấm: '8' do menu trả, ở đây chỉ 'chấm', 'chấm <số>' và 'xong'. Bỏ dấu để 'cham 2' vẫn ăn. */
export const parsePhotoCommand = (raw: string): PhotoCommand | null => {
  const plain = raw.normalize('NFC').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').trim().toLowerCase();
  if (/^cham$/.test(plain)) return { kind: 'list' };
  const pick = /^cham\s*(\d{1,2})$/.exec(plain);
  if (pick) return { kind: 'pick', n: Number(pick[1]) };
  if (/^(xong|gui)$/.test(plain)) return { kind: 'done' };
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
  return ['Chọn bài để gửi ảnh chấm:', ...lines, '', 'Nhắn: chấm <số> (ví dụ: chấm 1).', '', MENU_HINT].join('\n');
};

const sessionId = (botId: string, userId: string): string => `${botId}_${userId}`;

/** Mở phiên nhận ảnh cho 1 bài — phiên mới đè phiên cũ (1 em chỉ có 1 phiên tại một thời điểm). */
export const openPhotoSession = async (
  botId: string,
  userId: string,
  ctx: { studentId: string; classId: string; teacherId: string },
  assignment: { id: string; title: string },
): Promise<string> => {
  const session: PhotoSessionData = {
    botId, userId,
    studentId: ctx.studentId, classId: ctx.classId, teacherId: ctx.teacherId,
    assignmentId: assignment.id, assignmentTitle: assignment.title,
    expiresAt: Date.now() + SESSION_MS,
    photos: [],
  };
  await db().collection(SESSIONS).doc(sessionId(botId, userId)).set(session);
  return [`Bài: ${session.assignmentTitle}`,
    `Em gửi ảnh bài làm nhé — tối đa ${MAX_PHOTOS} ảnh, trong 10 phút.`,
    'Gửi xong nhắn: xong để máy chấm.',
    'Muốn chọn lại bài: nhắn chấm.',
    '', MENU_HINT].join('\n');
};

/** Nhắn 0 (xem lại menu) → hủy phiên ảnh đang mở nếu có. Không có phiên thì vô hại. */
export const cancelPhotoSession = async (botId: string, userId: string): Promise<void> => {
  await db().collection(SESSIONS).doc(sessionId(botId, userId)).delete().catch(() => undefined);
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
  const path = `accepted-homework/${session.data.classId}/${session.data.studentId}/${batchId}-${session.data.photos.length}`;
  const token = randomUUID();
  const bucket = getAdminStorage();
  const file = bucket.file(path);
  await file.save(buffer, { contentType: mimeType, resumable: false });
  await file.setMetadata({ contentType: mimeType, metadata: { firebaseStorageDownloadTokens: token } });
  const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
  const photos = [...session.data.photos, { url, name: `zalo-${String(session.data.photos.length + 1).padStart(2, '0')}.${mimeType.split('/')[1] || 'jpg'}`, mimeType, size: buffer.byteLength }];
  await db().collection(SESSIONS).doc(session.id).update({ photos, expiresAt: Date.now() + SESSION_MS });
  return [`Đã nhận ảnh ${photos.length}/${MAX_PHOTOS}.`,
    photos.length >= MAX_PHOTOS ? 'Nhắn: xong để máy chấm.' : 'Gửi tiếp hoặc nhắn: xong để máy chấm.',
    '', MENU_HINT].join('\n');
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
  if (!s.photos.length) return ['Em chưa gửi ảnh nào. Gửi ảnh bài làm rồi nhắn xong nhé.', '', MENU_HINT].join('\n');

  const aSnap = await db().collection('assignments').doc(s.assignmentId).get();
  const a = aSnap.data() as Record<string, unknown> | undefined;
  const hong = !aSnap.exists || !a || String(a.classId ?? '') !== s.classId || String(a.teacherId ?? '') !== s.teacherId
    || a.type === 'exam' || a.deliveryMode === 'online' || a.submissionLocked === true
    || (Array.isArray(a.targetStudentIds) && a.targetStudentIds.length && !a.targetStudentIds.includes(s.studentId));
  if (hong) {
    await cancelPhotoSession(botId, userId);
    return ['Bài này đã đổi hoặc không còn nhận nộp. Nhắn 8 để chọn bài khác.', '', MENU_HINT].join('\n');
  }

  const pending = await db().collection('submissions')
    .where('studentId', '==', s.studentId).where('assignmentId', '==', s.assignmentId).get();
  const choCham = pending.docs.map(doc => doc.data() as SubmissionDoc)
    .find(item => item.status === 'submitted' || item.status === 'grading');
  if (choCham) {
    await cancelPhotoSession(botId, userId);
    return ['Bài này đang chờ chấm rồi, không nộp trùng. Nhắn 2 để xem tiến độ.', '', MENU_HINT].join('\n');
  }

  const [quota, quotaRef] = await loadQuotaDoc(db(), s.teacherId);
  const verdict = remainingQuota(quota, 'self', s.studentId);
  if (verdict.allowed <= 0) {
    await cancelPhotoSession(botId, userId);
    return [verdict.reason, '', MENU_HINT].join('\n');
  }

  const submissionId = randomUUID();
  const now = new Date().toISOString();
  const submission: Record<string, unknown> = {
    id: submissionId,
    teacherId: s.teacherId, classId: s.classId, studentId: s.studentId,
    assignmentId: s.assignmentId,
    fileUrls: s.photos.map(photo => photo.url),
    attachments: s.photos.map(photo => ({ name: photo.name, url: photo.url, mimeType: photo.mimeType, size: photo.size, kind: 'image' as const })),
    textContent: '',
    note: '',
    status: 'submitted',
    submittedBy: { role: 'student', studentId: s.studentId, at: now },
    createdAt: now, updatedAt: now,
  };
  await db().runTransaction(async tx => {
    tx.create(db().collection('submissions').doc(submissionId), submission);
    tx.delete(db().collection(SESSIONS).doc(session.id));
  });
  await quotaRef.set(bumpQuota(quota, 'self', s.studentId, 1));

  const token = String(process.env.ZALO_BOT_TOKEN || '');
  const chatId = userId;
  chayNgam(gradeAndNotify(token, chatId, submissionId, s));
  return [`Đã nhận bài "${s.assignmentTitle}" (${s.photos.length} ảnh).`,
    'Máy đang chấm, em đợi chút rồi nhắn 2 để xem kết quả.',
    '', MENU_HINT].join('\n');
};

const gradeAndNotify = async (token: string, chatId: string, submissionId: string, s: PhotoSessionData): Promise<void> => {
  const khongChamDuoc = async (loi: string): Promise<void> => {
    await sendStyled(token, chatId, [`Chưa chấm được bài "${s.assignmentTitle}"`, loi, 'Bài vẫn được lưu để thầy cô chấm trên web.', '', MENU_HINT].join('\n'));
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
      await sendStyled(token, chatId, [`Chấm xong bài "${s.assignmentTitle}": ${fresh.grade.score}/${fresh.grade.maxScore} điểm`,
        approved ? 'Thầy cô đã duyệt — điểm chính thức.' : 'Máy chấm trước, thầy cô duyệt sau rồi điểm mới chính thức.',
        'Xem chi tiết từng câu: nhắn 2.',
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
