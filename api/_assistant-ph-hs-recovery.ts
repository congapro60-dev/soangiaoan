/**
 * Phase 1.6 — `/khoiphuc` cho PH đã liên kết nhưng quên PIN.
 * Luồng: `/khoiphuc <mã HS> <SĐT PH>` — hoặc dạng rành mạch hơn khi trùng: `/khoiphuc <lớp> <mã HS> <SĐT>`.
 * Bot đối chiếu cặp (mã HS, SĐT) trong studentContacts của CÁC LỚP người gửi đang liên kết
 * role=parent → cấp PIN tạm 4 số (đúng chuẩn PIN PH, đi được qua parser link thường), hết hạn 15 phút, dùng đúng 1 lần → PH nhắn
 * `<mã lớp> <PIN tạm> phụ huynh` để liên kết lại qua đường linkByPin bình thường.
 *
 * An toàn:
 * - Thử sai tính 1 lần vào trần 20 lần/giờ của guard PIN (chống dò cặp mã HS + SĐT).
 * - Cấp PIN tạm tối đa 3 lần/giờ/người gửi.
 * - Chỉ tra trong các lớp người gửi đã liên kết — không quét toàn DB, không lộ lớp khác.
 * - Người chưa có link parent coi như người lạ: đi qua cooldown hướng dẫn (5 phút/lần).
 * - Mỗi lần xử lý ghi 1 bản ghi audit để thầy cô soát về sau.
 */
import crypto from 'node:crypto';
import { hashPin, verifyPin } from './_classroom-core.js';
import { recordBotPinFailure, checkBotPinGuard, canReplyToStranger } from './_bot-pin-guard.js';
export const RECOVERY_TTL_MS = 15 * 60_000;
export const RECOVERY_ISSUE_LIMIT = 3;

export const RECOVERY_REPLIES = {
  /** Chuẩn hóa SĐT xong không hợp lệ — chỉ dừng ở cú pháp, không đụng dữ liệu. */
  syntax: 'Cú pháp: /khoiphuc <mã học sinh> <số điện thoại phụ huynh>',
  /** Sai mã HS / SĐT / số điện thoại lạ — mọi nhánh sai dùng chung để chống dò. */
  wrong: 'Thông tin chưa khớp. Vui lòng kiểm tra lại mã học sinh và số điện thoại đã đăng ký.',
  throttled: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.',
  ambiguous: 'Tìm thấy nhiều học sinh trùng thông tin. Nhắn lại kèm lớp: /khoiphuc <lớp> <mã học sinh> <số điện thoại>',
} as const;

/** Chuẩn hóa SĐT Việt Nam về dạng 84xxxxxxxxx; trả '' nếu không thuộc dạng đã biết. */
export const normalizePhone = (raw: unknown): string => {
  const s = raw == null ? '' : String(raw).replace(/\u00A0/g, ' ').trim();
  if (!s || /[\/,;]|\svà\s|\sva\s/i.test(s)) return '';
  let d = s.replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (d.startsWith('0084')) d = d.slice(2);
  else if (d.startsWith('00')) d = d.replace(/^0+/, '');
  if (d.startsWith('84') && d.length === 11 && /^[35789]/.test(d.slice(2))) return d;
  if (d.startsWith('0') && d.length === 10 && /^[35789]/.test(d.slice(1))) return '84' + d.slice(1);
  if (d.length === 9 && /^[35789]/.test(d)) return '84' + d;
  return '';
};

const normCode = (value: unknown): string => String(value ?? '').trim().toLowerCase().replace(/\s+/g, '');

const audit = async (db: FirebaseFirestore.Firestore, entry: Record<string, unknown>): Promise<void> => {
  // Best effort — audit không được làm hỏng luồng cấp PIN tạm.
  try {
    await db.collection('recoveryAudit').add({ ...entry, at: new Date().toISOString() });
  } catch (error) { console.error('[assistant-recovery] audit failed', error); }
};

export interface RecoveryUrls { pin: string; className: string; joinCode: string; studentName: string; expiresAt: Date }

/** Cấp PIN tạm cho 1 học sinh (ghi đè PIN tạm cũ nếu còn — bản mới nhất là bản có hiệu lực).
 *  PIN tạm khóa theo người nhận (issuedTo) — kẻ đánh cắp PIN từ tài khoản khác không dùng được. */
export const issueRecoveryPin = async (db: FirebaseFirestore.Firestore, botId: string, userId: string, classId: string, studentId: string, studentName: string, now = new Date()): Promise<string | null> => {
  const cls = db.collection('classes').doc(classId);
  const [parents, recoveries] = await Promise.all([cls.collection('parentSecrets').get(), cls.collection('recoveryPins').get()]);
  const excluded = [...parents.docs.map(doc => doc.data()), ...recoveries.docs.map(doc => doc.data()).filter(data =>
    (data.issuedTo?.botId === botId && data.issuedTo?.userId === userId)
    || (!data.used && Date.parse(String(data.expiresAt ?? '')) > now.getTime()))];
  let pin = '';
  // ponytail: tối đa 10 lần sinh; hết ngân sách trả từ chối, không cấp PIN đang trùng.
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = String(crypto.randomInt(0, 10_000)).padStart(4, '0');
    if (!excluded.some(data => data.pinHash && verifyPin(candidate, String(data.pinHash)))) { pin = candidate; break; }
  }
  if (!pin) return null;
  const expiresAt = new Date(now.getTime() + RECOVERY_TTL_MS);
  const recovery = {
    pinHash: hashPin(pin), expiresAt: expiresAt.toISOString(), attempts: 0, issuedAt: now.toISOString(), used: false, issuedTo: { botId, userId },
  };
  const ref = db.collection('recoveryIssues').doc(`${botId}_${userId}`);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const issuedAt = ((snap.data() as any)?.issuedAt ?? []).filter((t: unknown) => typeof t === 'number' && t > now.getTime() - 60 * 60_000);
    if (issuedAt.length >= RECOVERY_ISSUE_LIMIT) return null;
    tx.set(ref, { issuedAt: [...issuedAt, now.getTime()], updatedAt: now.toISOString() }, { merge: true });
    tx.set(db.collection('classes').doc(classId).collection('recoveryPins').doc(studentId), recovery);
    return pin;
  });
};

export const issueResult = (result: RecoveryUrls): string =>
  `Mã PIN tạm cho ${result.studentName}: ${result.pin}\nCó hiệu lực 15 phút, dùng 1 lần.\nNhắn đúng cú pháp: ${result.joinCode} ${result.pin} phụ huynh`;

/**
 * Xử lý nguyên vẹn 1 tin `/khoiphuc`. `strangerReplyFor` do caller truyền vào để dùng đúng
 * câu hướng dẫn người lạ của bot (tránh phụ thuộc ngược vào module zalo-bot).
 */
export const recoveryReply = async (
  db: FirebaseFirestore.Firestore,
  botId: string,
  userId: string,
  args: string[],
  strangerReplyFor: (userId: string) => Promise<string>,
  now = new Date(),
): Promise<string> => {
  // Dạng đầy đủ: /khoiphuc [lớp] <mã HS> <SĐT>
  const wantClass = args.length === 3;
  if ((args.length !== 2 && !wantClass) || !args[args.length - 1] || !args[args.length - 2]) return RECOVERY_REPLIES.syntax;
  const className = wantClass ? normCode(args[0]) : '';
  const maHS = normCode(wantClass ? args[1] : args[0]);
  const phone = normalizePhone(args[wantClass ? 2 : 1]);
  if (!maHS || !phone) return RECOVERY_REPLIES.syntax;

  const guard = await checkBotPinGuard(db, botId, userId, now);
  if (!guard.allowed) return RECOVERY_REPLIES.throttled;

  // Chỉ tra trong các lớp người gửi TỪNG liên kết role=parent (kể cả link đã thu hồi —
  // mục đích chính của /khoiphuc là lấy lại quyền khi link bị mất/đặt lại).
  const links = await db.collection('channelLinks')
    .where('channel', '==', 'zalo_bot').where('channelAccountId', '==', botId)
    .where('channelUserId', '==', userId).get();
  const classIds = [...new Set(links.docs.map(d => (d.data() as any)).filter(l => l.role === 'parent').map(l => String(l.classId)))];
  if (!classIds.length) {
    // Người chưa từng liên kết parent coi như người lạ: đúng cooldown 5 phút/lần do module này
    // tự quản (caller không được kiểm nữa — kiểm 2 lần sẽ nuốt luôn lần đầu vì mốc vừa được ghi).
    if (!(await canReplyToStranger(db, botId, userId, now))) return '';
    audit(db, { botId, userId, action: 'khoiphuc', result: 'stranger', maHS });
    return strangerReplyFor(userId);
  }

  const matches: Array<{ classId: string; className: string; joinCode: string; studentId: string; studentName: string }> = [];
  for (const classId of classIds) {
    const classSnap = await db.collection('classes').doc(classId).get();
    const cls = classSnap.data() as any ?? {};
    if (wantClass && normCode(cls.name) !== className && normCode(cls.joinCode) !== className) continue;
    const contacts = await db.collection('classes').doc(classId).collection('studentContacts')
      .where('codeNorm', '==', maHS).get();
    for (const doc of contacts.docs) {
      const data = doc.data() as any;
      if (Array.isArray(data.parentPhones) && data.parentPhones.includes(phone)) {
        matches.push({ classId, className: String(cls.name ?? ''), joinCode: String(cls.joinCode ?? ''), studentId: doc.id, studentName: String(data.name ?? '') });
      }
    }
  }

  if (matches.length === 0) {
    // Sai cặp (mã HS, SĐT) — tính 1 lượt trần chung như đi sai PIN, trả cùng câu.
    await recordBotPinFailure(db, botId, userId, undefined, now);
    audit(db, { botId, userId, action: 'khoiphuc', result: 'wrong', maHS });
    return RECOVERY_REPLIES.wrong;
  }
  if (matches.length > 1) {
    audit(db, { botId, userId, action: 'khoiphuc', result: 'ambiguous', maHS });
    return RECOVERY_REPLIES.ambiguous;
  }

  const match = matches[0];
  const pin = await issueRecoveryPin(db, botId, userId, match.classId, match.studentId, match.studentName, now);
  if (pin === null) return RECOVERY_REPLIES.throttled;
  audit(db, { botId, userId, action: 'khoiphuc', result: 'issued', classId: match.classId, studentId: match.studentId });
  return issueResult({ pin, className: match.className, joinCode: match.joinCode, studentName: match.studentName, expiresAt: new Date(now.getTime() + RECOVERY_TTL_MS) });
};
