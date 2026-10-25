import crypto from 'node:crypto';
import { lookupClassByJoinCode, isLocked, verifyPin, normalizeJoinCode } from './_classroom-core.js';
import { recordBotPinFailure, checkBotPinGuard, refundBotPinAttempt } from './_bot-pin-guard.js';
import { isValidParentPin } from '../src/lib/classroom/parentAccess.js';
import { isValidJoinCode } from '../src/lib/classroom/joinCode.js';

export type LinkRole = 'parent' | 'student';
export type ParsedPinLink = { status: 'ok'; joinCode: string; pin: string; role: LinkRole } | { status: 'invalid' };
export const parsePinLinkMessage = (message: string): ParsedPinLink => {
  const normalized = message.normalize('NFC').trim();
  const roles: LinkRole[] = [];
  const rest = normalized.replace(/(?<!\S)(phụ\s+huynh|phu\s+huynh|học\s+sinh|hoc\s+sinh)(?!\S)/giu, match => {
    roles.push(/^ph/iu.test(match) ? 'parent' : 'student');
    return ' ';
  });
  if (roles.length > 1) return { status: 'invalid' };
  const tokens = rest.trim().split(/\s+/);
  const codes = tokens.filter(token => isValidJoinCode(token) && /\d/.test(token));
  const pins = tokens.filter(isValidParentPin);
  if (codes.length !== 1 || pins.length !== 1) return { status: 'invalid' };
  const pin = pins[0];
  const role = roles[0] ?? (!/^\d{4}$/.test(pin) ? 'parent' : undefined);
  if (!role || (role === 'student' && !/^\d{4}$/.test(pin))) return { status: 'invalid' };
  return { status: 'ok', joinCode: normalizeJoinCode(codes[0]), pin, role };
};

export const PIN_LINK_REPLIES = {
  /** Quá trần chống dò (20 lần/giờ) — không khóa tài khoản, chỉ chờ cửa sổ trượt. */
  throttled: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.',
  /** Dùng chung cho sai PIN / mơ hồ / không tìm thấy lớp — không tiết lộ nguyên nhân cụ thể. */
  wrong: 'Mã lớp hoặc PIN không đúng. Nếu bạn đã nhập đúng, hãy liên hệ thầy cô để được hỗ trợ.',
} as const;

export const linkByPin = async (db: FirebaseFirestore.Firestore, botId: string, channelUserId: string, message: string, now = new Date()): Promise<{ status: string; reply: string; linkId?: string }> => {
  const parsed = parsePinLinkMessage(message); if (parsed.status === 'invalid') return { status: 'invalid', reply: 'Cú pháp chưa đúng.' };
  const entry = await checkBotPinGuard(db, botId, channelUserId, now); if (!entry.allowed) return { status: 'throttled', reply: PIN_LINK_REPLIES.throttled };
  const lookup = await lookupClassByJoinCode(db, parsed.joinCode);
  if (lookup.status !== 'ok') {
    // legacy-note: ponytail — mọi mã lớp không dùng được đều tính 1 lần thử, để kẻ dò không phân biệt được
    // mã có tồn tại hay không qua việc bị chặn sớm/muộn. GV đọc log để xử lý mã trùng.
    if (lookup.status === 'duplicate') console.error('[assistant-ph-hs-link] duplicate join code', parsed.joinCode);
    await recordBotPinFailure(db, botId, channelUserId, undefined, now);
    return { status: lookup.status, reply: PIN_LINK_REPLIES.wrong };
  }
  const classDoc = lookup.doc; const classId = classDoc.id; const secrets = classDoc.ref.collection(parsed.role === 'parent' ? 'parentSecrets' : 'studentSecrets');
  const classEntry = await checkBotPinGuard(db, botId, channelUserId, now, classId); if (!classEntry.allowed) return { status: 'throttled', reply: PIN_LINK_REPLIES.throttled };
  const matches: Array<{ id: string; data: any; recoveryRef?: FirebaseFirestore.DocumentReference }> = [];
  // PIN tạm của chính người gửi phải được xét trước PIN thường (kể cả link idempotent).
  if (parsed.role === 'parent') {
    for (const snap of (await classDoc.ref.collection('recoveryPins').get()).docs) {
      const data = snap.data() as any;
      // Giữ PIN đã dùng trong cửa sổ TTL để replay không rơi sang PIN thường của em khác.
      if (!data || data.issuedTo?.botId !== botId || data.issuedTo?.userId !== channelUserId) continue;
      const expiry = data.expiresAt ? new Date(data.expiresAt as string).getTime() : 0;
      if (!expiry || expiry <= now.getTime()) continue;
      if (verifyPin(parsed.pin, String(data.pinHash || ''))) matches.push({ id: snap.id, data, recoveryRef: snap.ref });
    }
  }
  // Idempotent theo bản thân: người gửi đã có link active cùng role+class VÀ PIN khớp đúng em của link đó
  // thì trả lại kết quả cũ, không tiêu lượt. Khác studentId (vd PH link con thứ hai cùng lớp) thì đi tiếp.
  const existing = await db.collection('channelLinks').where('channel', '==', 'zalo_bot').where('channelAccountId', '==', botId).where('channelUserId', '==', channelUserId).where('active', '==', true).get();
  const candidates = existing.docs.filter(doc => { const value: any = doc.data(); return value.role === parsed.role && value.classId === classId; });
  for (const doc of matches.length ? [] : candidates) {
    const secretSnap = await secrets.doc(String((doc.data() as any).studentId)).get();
    const pinHash = String((secretSnap.data() as any)?.pinHash ?? '');
    if (pinHash && verifyPin(parsed.pin, pinHash)) return { status: 'linked', reply: 'Đã liên kết thành công.', linkId: doc.id };
  }
  // Tiêu 1 lượt thử ATOMIC trước bước quét scrypt chậm — chặn burst song song vượt trần.
  const consume = await recordBotPinFailure(db, botId, channelUserId, classId, now); if (!consume.allowed) return { status: 'throttled', reply: PIN_LINK_REPLIES.throttled };
  for (const snap of matches.length ? [] : (await secrets.get()).docs) {
    const data = snap.data();
    // Em đang bị khóa PIN từ phía web (lock của classroom-core) coi như KHÔNG khớp — bot không được
    // thành máy xác nhận PIN cho kẻ đã làm khóa tài khoản em.
    if (isLocked({ failedAttempts: data?.failedAttempts ?? 0, lockedUntil: data?.lockedUntil ?? null }, now)) continue;
    if (verifyPin(parsed.pin, String(data.pinHash || ''))) matches.push({ id: snap.id, data });
  }
  // Sai / mơ hồ trả cùng một câu — kẻ dò không phân biệt được PIN có trúng không.
  if (matches.length !== 1) return { status: matches.length ? 'ambiguous' : 'wrong', reply: PIN_LINK_REPLIES.wrong };
  const studentId = matches[0].id; const linkId = crypto.createHash('sha256').update(`${botId}|${channelUserId}|${parsed.role}|${classId}|${studentId}`).digest('hex');
  const linkRef = db.collection('channelLinks').doc(linkId); const secretRef = secrets.doc(studentId);
  const outcome = await db.runTransaction(async tx => {
    const linkSnap = await tx.get(linkRef);
    if (matches[0].recoveryRef) {
      // Link bằng PIN tạm: tiêu PIN NGAY trong transaction dựa trên trạng thái mới nhất —
      // 2 lượt song song chỉ 1 thắng; lượt thua chạy lại sẽ thấy used → báo sai.
      // KHÔNG được rút gọn qua nhánh "link đã active" ở trên, nếu không lượt thua bị tính thành công.
      const recoverySnap = await tx.get(matches[0].recoveryRef);
      const rec = (recoverySnap.data() as any) ?? {};
      const expiry = rec.expiresAt ? new Date(rec.expiresAt as string).getTime() : 0;
      if (rec.used || !expiry || expiry <= now.getTime() || rec.pinHash !== matches[0].data.pinHash
        || rec.issuedTo?.botId !== botId || rec.issuedTo?.userId !== channelUserId) return 'wrong';
      tx.set(matches[0].recoveryRef, { used: true, usedAt: now.toISOString() }, { merge: true });
    } else {
      const secretSnap = await tx.get(secretRef);
      if (linkSnap.exists && (linkSnap.data() as any).active) return 'linked';
      const data = secretSnap.data() as any;
      // PIN đổi giữa lúc quét và lúc ghi (GV/PH vừa đặt lại) — huỷ, báo cùng câu "không đúng" để không xác nhận PIN cũ.
      if (data?.pinHash !== matches[0].data?.pinHash
        || isLocked({ failedAttempts: data?.failedAttempts ?? 0, lockedUntil: data?.lockedUntil ?? null }, now)) return 'wrong';
    }
    const link = { firebaseUid: `pinlink:${parsed.role}:${classId}:${studentId}`, channel: 'zalo_bot', channelAccountId: botId, channelUserId, channelChatId: channelUserId, role: parsed.role, classId, studentId, active: true, createdAt: (linkSnap.data() as any)?.createdAt ?? now.getTime(), updatedAt: now.getTime() };
    tx.set(linkRef, link);
    return 'linked' as const;
  });
  if (outcome === 'wrong') return { status: 'wrong', reply: PIN_LINK_REPLIES.wrong };
  // Link thành công không phải lần sai — hoàn lại lượt đã tiêu để cửa sổ phản ánh đúng số lần sai.
  await refundBotPinAttempt(db, botId, channelUserId, classId, now);
  return { status: 'linked', reply: 'Đã liên kết thành công.', linkId };
};
