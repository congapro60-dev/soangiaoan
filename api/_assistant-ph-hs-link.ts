import crypto from 'node:crypto';
import { lookupClassByJoinCode, isLocked, verifyPin, normalizeJoinCode } from './_classroom-core.js';
import { recordBotPinFailure, checkBotPinGuard, refundBotPinAttempt } from './_bot-pin-guard.js';
import { isValidParentPin } from '../src/lib/classroom/parentAccess.js';
import { isValidJoinCode } from '../src/lib/classroom/joinCode.js';

export type LinkRole = 'parent' | 'student';
export type ParsedPinLink = { status: 'ok'; joinCode: string; pin: string; role: LinkRole; switch?: boolean } | { status: 'invalid' };
export const parsePinLinkMessage = (message: string): ParsedPinLink => {
  const normalized = message.normalize('NFC').trim();
  // "đổi vai" ở ĐẦU tin = ý định chuyển vai (mục 9): bắt buộc nhập secret vai ĐÍCH,
  // hệ thống sẽ gỡ vai cũ sau khi xác thực. Không có từ này thì giữ luật 1 tài khoản 1 vai.
  const wantSwitch = /^(?:đổi|doi)\s+vai\s+/i.test(normalized);
  const stripped = normalized.replace(/^(?:đổi|doi)\s+vai\s+/i, ' ');
  const roles: LinkRole[] = [];
  const rest = stripped.replace(/(?<!\S)(phụ\s+huynh|phu\s+huynh|học\s+sinh|hoc\s+sinh)(?!\S)/giu, match => {
    roles.push(/^ph/iu.test(match) ? 'parent' : 'student');
    return ' ';
  });
  if (roles.length > 1) return { status: 'invalid' };
  const tokens = rest.trim().split(/\s+/);
  const codes = tokens.filter(token => isValidJoinCode(token) && /\d/.test(token));
  const pins = tokens.filter(isValidParentPin);
  if (codes.length !== 1 || pins.length !== 1) return { status: 'invalid' };
  const pin = pins[0];
  // Không prefix: PIN 4 số mặc định là HỌC SINH (HS được hướng dẫn nhắn gọn "<mã lớp> <PIN>");
  // PIN khác 4 số là PH. Muốn chắc vai thì ghi "phụ huynh"/"học sinh" ở đầu tin.
  const role = roles[0] ?? (!/^\d{4}$/.test(pin) ? 'parent' : 'student');
  if (!role || (role === 'student' && !/^\d{4}$/.test(pin))) return { status: 'invalid' };
  // `switch` để undefined khi false — test toEqual cũ không bị phá.
  return { status: 'ok', joinCode: normalizeJoinCode(codes[0]), pin, role, ...(wantSwitch ? { switch: true } : {}) };
};

export const PIN_LINK_REPLIES = {
  /** Quá trần chống dò (20 lần/giờ) — không khóa tài khoản, chỉ chờ cửa sổ trượt. */
  throttled: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.',
  /** Dùng chung cho sai PIN / mơ hồ / không tìm thấy lớp — không tiết lộ nguyên nhân cụ thể. */
  wrong: 'Mã lớp hoặc PIN không đúng. Nếu bạn đã nhập đúng, hãy liên hệ thầy cô để được hỗ trợ.',
  /** Tài khoản đã có vai khác đang active — mỗi tài khoản Zalo chỉ dùng 1 vai (trừ danh sách test). */
  roleConflict: 'Tài khoản của bạn đang liên kết với một vai trò khác. Mỗi tài khoản chỉ dùng một vai trên bot; nếu cần đổi vai, hãy liên hệ thầy cô để được hỗ trợ.',
} as const;

/** Danh sách Zalo user được giữ SONG SONG 2 vai (tài khoản test) — env phân tách bằng dấu phẩy. */
export const dualRoleAllowed = (channelUserId: string): boolean =>
  String(process.env.ZALO_BOT_DUAL_ROLE_USER_IDS || '').split(',').map(v => v.trim()).includes(channelUserId);

export const linkByPin = async (db: FirebaseFirestore.Firestore, botId: string, channelUserId: string, message: string, now = new Date(), opts?: { allowSwitch?: boolean }): Promise<{ status: string; reply: string; linkId?: string; switched?: boolean }> => {
  const parsed = parsePinLinkMessage(message); if (parsed.status === 'invalid') return { status: 'invalid', reply: 'Cú pháp chưa đúng.' };
  // 1 tài khoản Zalo chỉ giữ 1 vai (teacher cũng tính là vai) — chặn TRƯỚC khi chạm PIN để không tiêu lượt thử.
  // Tài khoản test trong danh sách cho phép được giữ song song 2 vai để kiểm thử.
  // NGOẠI LỆ (mục 9 "Đổi vai trò", chốt chủ dự án 29/10): tin có tiền tố "đổi vai" (opts.allowSwitch)
  // được chuyển vai — nhưng vẫn phải xác thực PIN vai ĐÍCH bên dưới, và vai cũ bị gỡ sau khi xác thực thành công.
  const existing = await db.collection('channelLinks').where('channel', '==', 'zalo_bot').where('channelAccountId', '==', botId).where('channelUserId', '==', channelUserId).where('active', '==', true).get();
  const hasOtherRole = existing.docs.some(doc => { const value: any = doc.data(); return (value.role ?? 'teacher') !== parsed.role; });
  const switching = hasOtherRole && !dualRoleAllowed(channelUserId) && opts?.allowSwitch === true;
  if (hasOtherRole && !dualRoleAllowed(channelUserId) && !switching) {
    return { status: 'roleConflict', reply: PIN_LINK_REPLIES.roleConflict };
  }
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
  // Link ACTIVE MỚI được tính — link đã bị gỡ (đổi vai sang chỗ khác) phải đi tiếp để kích hoạt lại.
  const candidates = existing.docs.filter(doc => { const value: any = doc.data(); return value.role === parsed.role && value.classId === classId && value.active === true; });
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
    // Chuyển vai (mục 9): gỡ mọi link active vai KHÁC trong cùng transaction — không để lại
    // hai vai cùng active (resolveAnyActor ưu tiên parent sẽ che mất vai mới).
    if (switching) {
      for (const doc of existing.docs) {
        const value: any = doc.data();
        if ((value.role ?? 'teacher') === parsed.role) continue;
        tx.update(doc.ref, { active: false, updatedAt: now.getTime() });
      }
    }
    return 'linked' as const;
  });
  if (outcome === 'wrong') return { status: 'wrong', reply: PIN_LINK_REPLIES.wrong };
  // Link thành công không phải lần sai — hoàn lại lượt đã tiêu để cửa sổ phản ánh đúng số lần sai.
  await refundBotPinAttempt(db, botId, channelUserId, classId, now);
  if (switching) return { status: 'switched', reply: `Đã chuyển sang vai ${parsed.role === 'student' ? 'HỌC SINH' : 'PHỤ HUYNH'}.\n\nNhắn 0 để xem lại menu.`, linkId, switched: true };
  return { status: 'linked', reply: 'Đã liên kết thành công.', linkId };
};

/** Hướng dẫn mục 9 "Đổi vai trò" — theo vai hiện tại, mẫu xác nhận là secret của vai ĐÍCH. */
export const switchRoleGuideReply = (currentRole: 'parent' | 'student' | 'teacher'): string => {
  const current = currentRole === 'student' ? 'HỌC SINH' : currentRole === 'parent' ? 'PHỤ HUYNH' : 'GIÁO VIÊN';
  return [
    `Vai hiện tại của bạn: ${current}.`,
    'Để đổi vai, gửi đúng MỘT trong các mẫu sau (mỗi lần đổi đều phải nhập mã để bảo mật):',
    '• Sang HỌC SINH: đổi vai <mã lớp> <mã PIN 4 số>',
    '• Sang PHỤ HUYNH: đổi vai <mã lớp> <mã PIN> phụ huynh',
    '• Sang GIÁO VIÊN: /link <mã liên kết> (mã tạo trong web, mục quản lý bot)',
    'Mã PIN do thầy cô cấp. Nhập sai quá 20 lần/giờ sẽ bị tạm chặn.',
    '',
    'Nhắn 0 để xem lại menu.',
  ].join('\n');
};

/**
 * Gỡ link PH/HS khi chuyển sang GIÁO VIÊN (/link <mã>): consumeLinkCode chỉ tự gỡ link
 * teacher cũ, nên helper này hoàn tất nửa còn lại của ngữ nghĩa "đổi vai".
 * Trả true nếu đã gỡ ít nhất 1 link PH/HS (để tin nhắn nói đúng "đã CHUYỂN" hay chỉ "liên kết").
 */
export const deactivateStudentParentLinks = async (db: FirebaseFirestore.Firestore, botId: string, channelUserId: string, now = new Date()): Promise<boolean> => {
  const snaps = await db.collection('channelLinks').where('channel', '==', 'zalo_bot').where('channelAccountId', '==', botId).where('channelUserId', '==', channelUserId).where('active', '==', true).get();
  const targets = snaps.docs.filter(doc => { const role = String((doc.data() as any).role ?? 'teacher'); return role === 'parent' || role === 'student'; });
  for (const doc of targets) await doc.ref.update({ active: false, updatedAt: now.getTime() });
  return targets.length > 0;
};

/**
 * Lệnh "đổi vai" — CHỈ cho tài khoản test trong dualRoleAllowed: giữ song song link PH + HS
 * và bật/tắt `active` để chuyển luồng. Target = vai ĐANG active ? vai còn lại : 'parent'.
 * Chưa từng link vai target → trả câu hướng dẫn nhắn PIN, không đổi gì. Link teacher không đụng tới.
 */
export const switchBotRole = async (db: FirebaseFirestore.Firestore, botId: string, channelUserId: string, now = new Date()): Promise<{ status: string; reply: string }> => {
  const snaps = await db.collection('channelLinks').where('channel', '==', 'zalo_bot').where('channelAccountId', '==', botId).where('channelUserId', '==', channelUserId).get();
  const links = snaps.docs.map(doc => ({ ref: doc.ref, data: doc.data() as any }));
  if (!links.length) {
    return { status: 'not_linked', reply: 'Bạn chưa liên kết với lớp nào trên bot. Gửi tin theo mẫu: <mã lớp> <mã PIN> phụ huynh hoặc <mã lớp> <mã PIN> học sinh (mã PIN do thầy cô cấp).' };
  }
  const roleOf = (link: { data: any }) => String(link.data.role ?? 'teacher');
  const target: LinkRole = links.some(link => roleOf(link) === 'parent' && link.data.active === true) ? 'student' : 'parent';
  if (!links.some(link => roleOf(link) === target)) {
    return { status: 'no_target_link', reply: target === 'student'
      ? 'Bạn chưa từng liên kết vai học sinh. Gửi tin: <mã lớp> <mã PIN> học sinh (mã PIN học sinh do thầy cô cấp) rồi nhắn "đổi vai" lần nữa.'
      : 'Bạn chưa từng liên kết vai phụ huynh. Gửi tin: <mã lớp> <mã PIN> phụ huynh (mã PIN do thầy cô cấp) rồi nhắn "đổi vai" lần nữa.' };
  }
  await db.runTransaction(async tx => {
    for (const link of links) {
      if (roleOf(link) === 'teacher') continue; // link teacher giữ nguyên — đổi vai chỉ rẽ PH ↔ HS
      const shouldActive = roleOf(link) === target;
      if (link.data.active === shouldActive) continue;
      tx.update(link.ref, { active: shouldActive, updatedAt: now.getTime() });
    }
  });
  return { status: 'switched', reply: target === 'student'
    ? 'Đã chuyển sang vai HỌC SINH — các chức năng của học sinh (vd mục 8: nộp bài bằng ảnh) đã bật.\n\nNhắn 0 để xem lại menu.'
    : 'Đã chuyển sang vai PHỤ HUYNH.\n\nNhắn 0 để xem lại menu.' };
};
