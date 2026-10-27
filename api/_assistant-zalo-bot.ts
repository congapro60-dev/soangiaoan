import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { claimAssistantRequestNonce, consumeLinkCode, resolveChannelActor } from './_assistant-auth.js';
import { cancelAssistantConfirmation, executeAssistantConfirmation, inspectAssistantConfirmation } from './_assistant-confirmations.js';
import { dualRoleAllowed, linkByPin, parsePinLinkMessage, PIN_LINK_REPLIES, switchBotRole } from './_assistant-ph-hs-link.js';
import { recoveryReply } from './_assistant-ph-hs-recovery.js';
import { parentMenuReply, parseMenuChoice, loadParentReport, MENU_REPLIES, withWebPortalLink } from './_assistant-ph-hs-menu.js';
import { AI_CHAT_REPLIES, answerParentQuestionDetailed, vilaoCaller } from './_assistant-ph-hs-chat.js';
import { canReplyToStranger } from './_bot-pin-guard.js';import { getAssistantJobStatus } from './_assistant-jobs.js';
import { runAssistantReadTool } from './_assistant-tools.js';
import { getAdminDb } from './_exam-core.js';
import { secretEqual, sendPhoto, sendStyled, sendTyping } from './_assistant-zalo-send.js';
import { sendGeometryPhoto } from './_assistant-geometry-render.js';
import { PHOTO_REPLIES, assistChooseReply, assistFreeTextReply, assistOpenReply, assistStartReply, cancelPhotoSession, finishPhotoSession, openPhotoSession, parsePhotoCommand, pendingAssignmentsForStudent, photoListReply, photoReceivedReply } from './_assistant-ph-hs-photo.js';
import { teacherBotReply } from './_assistant-ph-hs-teacher.js';

const ORIGIN = 'https://bot-api.zaloplatforms.com';
const MAX_BODY = 16_384;
const text = (v: unknown) => typeof v === 'string' ? v.trim() : '';
const set = (v: string | undefined) => new Set((v || '').split(',').map(x => x.trim()).filter(Boolean));
const h = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] || '' : v || '';
const output = (value: unknown): string => {
  let s = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  s = s.replace(/https?:\/\/\S+/gi, '[đã ẩn liên kết]').replace(/(?:token|secret|password|api[-_ ]?key)["']?\s*[=:]\s*["']?[^\s,}"']+/gi, '[đã ẩn]').replace(/("(?:privateToken|accessToken|apiKey|secret|password)"\s*:\s*)"[^"]*"/gi, '$1"[đã ẩn]"').replace(/\b[^\s"',}]{0,64}(?:token|secret|password|api[-_ ]?key)[^\s"',}]{0,64}\b/gi, '[đã ẩn]');
  return s.slice(0, 2000);
};
const send = async (token: string, chatId: string, message: string) => {
  try {
    await fetch(`${ORIGIN}/bot${encodeURIComponent(token)}/sendMessage`, { method: 'POST', redirect: 'error', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: output(message) }) });
  } catch { /* ambiguous send: never retry or expose credentials */ }
};
const identity = (botId: string, userId: string) => ({ channel: 'zalo_bot' as any, channelAccountId: botId, channelUserId: userId, channelChatId: userId, verifiedChannelAccountId: botId });
const TEACHER_COMMANDS = new Set(['/classes', '/confirm', '/cancel', '/status']);
const STRANGER_HINT = 'Để liên kết, gửi tin theo mẫu: phụ huynh <mã lớp> <mã PIN> hoặc học sinh <mã lớp> <mã PIN> (mã PIN do thầy cô cấp).';
type ZaloActor = Awaited<ReturnType<typeof resolveChannelActor>>;
/**
 * Gửi đúng 1 câu hướng dẫn mỗi 5 phút với người chưa liên kết; còn lại im lặng.
 * Lỗi "Ambiguous channel links" nghĩa là người đó ĐÃ liên kết (vd PH có 2 con)
 * — không được coi như người lạ.
 * GV-1: thử PH/HS TRƯỚC teacher — tài khoản giữ song song vai GV + PH/HS (test) vẫn
 * thấy menu PH/HS với tin thường; lệnh GV có resolve teacher riêng ở teacherBotReply.
 */
const resolveAnyActor = async (botId: string, userId: string, chatId: string): Promise<ZaloActor | 'ambiguous' | null> => {
  let ambiguous = false;
  for (const preferredRole of ['parent', 'student', 'teacher'] as const) {
    try { return await resolveChannelActor('zalo_bot' as any, botId, userId, chatId, undefined, { preferredRole }); }
    catch (error) { if (/Ambiguous channel links/i.test((error as Error).message ?? '')) ambiguous = true; /* thử vai kế tiếp */ }
  }
  return ambiguous ? 'ambiguous' : null;
};
const pinLinkReply = async (botId: string, userId: string, message: string): Promise<string> => {
  try { return (await linkByPin(getAdminDb(), botId, userId, message)).reply; }
  catch (error) {
    const reason = error instanceof Error ? error.message : '';
    if (/PIN_LOCKED/i.test(reason)) return PIN_LINK_REPLIES.throttled;
    throw error;
  }
};
/**
 * Việc 4 — HS chọn bài rồi mở phiên nhận ảnh. Trả nội dung tin để caller sendStyled một chỗ.
 * 'chấm'/'cham' = xem danh sách bài chờ nộp; 'chấm <số>' = chọn bài đó.
 */
const chooseAndOpen = async (botId: string, userId: string, classId: string, studentId: string, cmd: { kind: 'list' } | { kind: 'pick'; n: number }): Promise<string> => {
  const { teacherId, items } = await pendingAssignmentsForStudent(classId, studentId);
  if (cmd.kind === 'list' || !items.length) return photoListReply(items);
  const target = cmd.n >= 1 && cmd.n <= items.length ? items[cmd.n - 1] : null;
  if (!target) return `Số không khớp danh sách.\n\n${photoListReply(items)}`;
  return openPhotoSession(botId, userId, { studentId, classId, teacherId }, target);
};
/** Ảnh HS gửi: chỉ HỌC SINH đã liên kết mới đi tiếp. Người lạ vẫn nhận hướng dẫn (guard 1 tin/5 phút chống spam). */
const dispatchPhotoMessage = async (botId: string, userId: string, chatId: string, photoUrl: string): Promise<string> => {
  const linked = await resolveAnyActor(botId, userId, chatId);
  // HS hay gửi ảnh bài làm trước cả khi liên kết — im lặng khiến bot có vẻ "chết".
  if (!linked) return (await canReplyToStranger(getAdminDb(), botId, userId)) ? STRANGER_HINT : '';
  if (linked === 'ambiguous') return '';
  const role = (linked as any).role ?? 'teacher';
  if (role !== 'student') return role === 'teacher'
    ? 'Gửi ảnh bài làm là chức năng của học sinh. Nhắn: gv để xem menu thầy cô.'
    : 'Gửi ảnh bài làm là chức năng của học sinh. Phụ huynh nhắn 0 để xem menu.';
  const classId = String((linked as any).classId ?? ''); const studentId = String((linked as any).studentId ?? '');
  if (!classId || !studentId) return MENU_REPLIES.noData;
  return photoReceivedReply(botId, userId, photoUrl);
};
const readBody = async (req: VercelRequest): Promise<string> => {
  const raw = (req as VercelRequest & { rawBody?: string | Buffer }).rawBody;
  if (Buffer.isBuffer(raw)) return raw.toString('utf8');
  if (typeof raw === 'string') return raw;
  if (typeof req.body === 'string') return req.body;
  const stream = req as unknown as AsyncIterable<Buffer | string>;
  if (typeof stream[Symbol.asyncIterator] === 'function') {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return Buffer.concat(chunks).toString('utf8');
  }
  return req.body && typeof req.body === 'object' ? JSON.stringify(req.body) : '';
};

async function dispatch(token: string, botId: string, userId: string, chatId: string, message: string): Promise<string> {
  const id = identity(botId, userId);
  const [command, ...args] = message.trim().split(/\s+/);
  if (command === '/help') return 'Lệnh: /link CODE, /classes, /confirm ID HASH, /cancel ID HASH, /status ID\nPH quên mã PIN: /khoiphuc <mã học sinh> <số điện thoại>\nLệnh thầy cô: gv (menu), lop, chua nop, web';
  if (command === '/link') {
    if (!args[0]) return 'Cần mã liên kết.';
    await consumeLinkCode(args[0], id as any);
    return 'Đã liên kết tài khoản giáo viên.';
  }
  if (!command.startsWith('/') && parsePinLinkMessage(message).status === 'ok') return pinLinkReply(botId, userId, message);
  if (command === '/khoiphuc') {
    // Cooldown người lạ do recoveryReply tự quản — callback chỉ cung cấp nội dung hướng dẫn.
    return recoveryReply(getAdminDb(), botId, userId, args, async () => STRANGER_HINT);
  }
  if (TEACHER_COMMANDS.has(command)) {
    let teacherActor: ZaloActor;
    try { teacherActor = await resolveChannelActor('zalo_bot' as any, botId, userId, chatId, undefined, { preferredRole: 'teacher' }); }
    catch { return 'Chỉ thầy cô mới dùng được lệnh này.'; }
    if (((teacherActor as any).role ?? 'teacher') !== 'teacher') return 'Chỉ thầy cô mới dùng được lệnh này.';
    const actor = teacherActor;
    if (command === '/classes') return output(await runAssistantReadTool('listClasses', {}, actor));
  if (command === '/confirm' || command === '/cancel') {
    if (!args[0] || !/^[0-9a-f]{64}$/i.test(args[1] || '')) return 'Cú pháp: /confirm ID HASH hoặc /cancel ID HASH';
    const confirmationId = args[0]; const requestHash = args[1];
    if (command === '/cancel') return output(await cancelAssistantConfirmation({ actor, confirmationId, requestHash }));
    const confirmation = await inspectAssistantConfirmation({ actor, confirmationId });
    if (confirmation.requestHash !== requestHash) return 'Mã xác nhận không khớp.';
    return output(await executeAssistantConfirmation({ actor, confirmationId, requestHash, execute: async ({ confirmationId: confirmedId, toolName, payload, actor: confirmedActor }) => {
      const { executeAssistantTool } = await import('./_assistant-executors.js');
      return executeAssistantTool({ actor: confirmedActor, confirmationId: confirmedId, toolName, payload });
    } }));
  }
  if (command === '/status') return output(await getAssistantJobStatus({ actor, jobId: args[0] || '' }));
  }
  // Tài khoản test trong danh sách cho phép được giữ song song 2 vai — đổi qua lại ngay trong chat.
  // Đặt TRƯỚC resolveAnyActor để lệnh chạy được bất kể người gửi đang ở vai nào.
  const plain = message.normalize('NFC').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/\s+/g, ' ').trim().toLowerCase();
  if (plain === 'doi vai' && dualRoleAllowed(userId)) return (await switchBotRole(getAdminDb(), botId, userId)).reply;
  // GV-1 — lệnh thầy cô (gv/lop/chua nop/web): resolve link teacher riêng nên tài khoản test
  // giữ song song vai GV + PH/HS vẫn dùng được; ai không có link teacher nhận câu chặn.
  const teacherReply = await teacherBotReply(getAdminDb(), botId, userId, chatId, token, message);
  if (teacherReply !== null) return teacherReply;
  const linked = await resolveAnyActor(botId, userId, chatId);
  if (!linked) {
    if (!(await canReplyToStranger(getAdminDb(), botId, userId))) return '';
    return STRANGER_HINT;
  }
  if (linked === 'ambiguous') return 'Tài khoản đã liên kết nhiều hồ sơ học sinh. Vui lòng liên hệ thầy cô để chọn đúng hồ sơ cần xem.';
  // Phase 2 — chỉ người ĐÃ liên kết role=parent|student mới tới được đây và thấy menu.
  // Chọn link PH/HS; GV (hoặc chỉ có link teacher) giữ câu trả lời cũ.
  const linkedActor: any = linked;
  const role = linkedActor.role ?? 'teacher';
  if (role === 'parent' || role === 'student') {
    const classId = String(linkedActor.classId ?? ''); const studentId = String(linkedActor.studentId ?? '');
    if (!classId || !studentId) return MENU_REPLIES.noData;
    // Việc 4 — mục 8 của HS (nộp bài bằng ảnh): bắt trước parse menu thường.
    if (role === 'student' && message.trim() === '8') {
      const { items } = await pendingAssignmentsForStudent(classId, studentId);
      await sendStyled(token, chatId, photoListReply(items));
      return '';
    }
    // Menu (0–8) + 'web' đi trước; tin không khớp thì chuyển cho trợ lý AI trả lời tự do.
    const choice = parseMenuChoice(message);
    if (choice.kind !== 'invalid') {
      // HS nhắn 0 (xem lại menu): hủy phiên ảnh đang mở nếu có — phiên treo sẽ nhầm với tin "xong" sau này.
      if (choice.kind === 'menu') await cancelPhotoSession(botId, userId);
      const menuReply = await parentMenuReply(getAdminDb(), classId, studentId, message, role);
      // Cả hai đường đều KHÔNG qua output() (che link) vì nội dung do hệ tự dựng:
      // link web gửi THUẦN để URL render được; menu gửi markdown (lỗi parse tự fallback).
      if (choice.kind === 'link') await sendStyled(token, chatId, menuReply, false);
      else await sendStyled(token, chatId, menuReply);
      return '';
    }
    // Việc 4 — lệnh chấm của HS: chấm / chấm <số> / xong / nộp hộ (hộ bạn cùng lớp). PH không có các lệnh này (đi thẳng AI chat).
    if (role === 'student') {
      const photoCmd = parsePhotoCommand(message);
      if (photoCmd) {
        const photoReply = photoCmd.kind === 'done' ? await finishPhotoSession(botId, userId)
          : photoCmd.kind === 'assist' ? await assistStartReply(botId, userId, classId, studentId)
          : photoCmd.kind === 'assistPick' ? await assistOpenReply(botId, userId, classId, studentId, photoCmd.n)
          : photoCmd.kind === 'assistChoose' ? await assistChooseReply(botId, userId, classId, photoCmd.n)
          : await chooseAndOpen(botId, userId, classId, studentId, photoCmd);
        await sendStyled(token, chatId, photoReply);
        return '';
      }
      // Luồng nộp hộ chưa xong: tên bạn gõ tự do → bot tra danh sách lớp (không rơi vào AI chat).
      const assistReply = await assistFreeTextReply(botId, userId, classId, message);
      if (assistReply !== null) {
        await sendStyled(token, chatId, assistReply);
        return '';
      }
    }
    const bundle = await loadParentReport(getAdminDb(), classId, studentId, role);
    if (!bundle) return MENU_REPLIES.noData;
    // AI CHAT PH chỉ dùng key RIÊNG (PH_CHAT_VILAO_KEY) — tách khỏi key chấm bài để theo dõi
    // chi phí độc lập và không tiêu nhầm hạn mức chấm bài. Không có key thì báo "bận", không im lặng.
    const apiKey = String(process.env.PH_CHAT_VILAO_KEY || '');
    if (!apiKey) return AI_CHAT_REPLIES.unavailable;
    sendTyping(token, chatId); // "đang nhập..." trong lúc AI suy nghĩ — lỗi thì bỏ qua
    try {
      const detail = await answerParentQuestionDetailed(vilaoCaller(apiKey), message, bundle.report, bundle.periodicIds, role);
      if (!detail) return MENU_REPLIES.invalid;
      // Link cổng web lấy từ `joinCode` của CHÍNH lớp HS này (bundle vừa nạp theo link),
      // chèn ngay trước "Nhắn 0 để xem lại menu" để em luôn bấm được vào web.
      // Gửi THUẦN (không qua output() che link) như nhánh menu-link, nếu không URL
      // bị đổi thành "[đã ẩn liên kết]" và HS không bấm được.
      const caption = withWebPortalLink(detail.text, role, bundle.joinCode);
      // AI vẽ được hình (khối geometry) → gửi ẢNH kèm caption (chốt 28/10).
      // Bất kỳ bước render/upload/sendPhoto nào hỏng → fallback tin text như cũ.
      const photoSent = detail.geometry
        ? await sendGeometryPhoto(token, chatId, detail.geometry, caption, classId, sendPhoto)
        : false;
      if (!photoSent) await sendStyled(token, chatId, caption, false);
      return '';
    } catch {
      return AI_CHAT_REPLIES.unavailable;
    }
  }
  return 'Tính năng trò chuyện tự nhiên chưa khả dụng. Dùng /help để xem lệnh.';
}

export async function handleZaloBotWebhook(req: VercelRequest, res: VercelResponse): Promise<boolean> {
  const token = text(process.env.ZALO_BOT_TOKEN); const botId = text(process.env.ZALO_BOT_ID);
  const allowedBots = set(process.env.ZALO_BOT_ALLOWED_IDS); const allowedUsers = set(process.env.ZALO_BOT_ALLOWED_USER_IDS);
  const configuredSecret = text(process.env.ZALO_BOT_WEBHOOK_SECRET);
  if (!token || !botId || !allowedBots.has(botId) || !configuredSecret) { console.error(`[zalo-bot] env check failed: missing=${!token ? 'token ' : ''}${!botId ? 'botId ' : ''}${!allowedBots.has(botId) ? 'allowedBots ' : ''}${!configuredSecret ? 'secret' : ''}`.trimEnd()); res.status(503).json({ kind: 'error', code: 'ZALO_BOT_UNAVAILABLE' }); return true; }
  const providedSecret = h(req.headers['x-bot-api-secret-token']);
  if (!secretEqual(providedSecret, configuredSecret)) { res.status(401).json({ kind: 'error', code: 'UNAUTHORIZED' }); return true; }
  let raw = '';
  // Zalo gọi webhook để VERIFY ngay sau setWebhook: body rỗng hoặc không phải JSON.
  // Trả 2xx để verify đạt; chỉ 400 khi body có nội dung mà sai cấu trúc (rác thật).
  try { raw = await readBody(req); } catch { res.status(200).json({ ok: true }); return true; }
  if (!raw.trim()) { res.status(200).json({ ok: true }); return true; }
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY) { res.status(400).json({ kind: 'error', code: 'INVALID_REQUEST' }); return true; }
  let body: any;
  try { body = JSON.parse(raw); } catch { res.status(400).json({ kind: 'error', code: 'INVALID_REQUEST' }); return true; }
  // Zalo verify webhook bằng event riêng `webhook.test` (body KHÔNG có `ok`/`result` như tin nhắn).
  // Đúng yêu cầu của Zalo: trả 200. Không phải tin nhắn người dùng nên không xử lý gì thêm.
  if (body?.event_name === 'webhook.test') { res.status(200).json({ ok: true }); return true; }
  // Zalo Bot Platform (cấu trúc THẬT, đã xác minh bằng log): { event_name, message } ở cấp gốc.
  // Bản cũ đọc body.result.message (cấu trúc Zalo OA) nên không bao giờ khớp → mọi tin nhắn bị
  // coi là INVALID_REQUEST. Hỗ trợ cả hai để không phá client khác.
  const eventName = text(body?.event_name || body?.result?.event_name);
  const m = body?.message ?? body?.result?.message;
  const fromId = text(m?.from?.id); const chatId = text(m?.chat?.id ?? m?.chat_id);
  const msgDate = Number(m?.date); const msgId = text(m?.message_id);
  const msgText = text(m?.text);
  // Việc 4 — Zalo gửi ảnh (message.image.received): URL TẠM THỜI nằm ở m.photo (chuỗi) hoặc
  // m.photo.url / m.photo.attach_url (đối tượng, tùy phiên bản payload); caption bỏ qua.
  // URL này dùng 1 lần để tải về Storage ngay, không lưu lại.
  const rawPhoto: unknown = m?.photo;
  const photoUrl = eventName === 'message.image.received'
    ? (typeof rawPhoto === 'string' ? rawPhoto.trim()
      : rawPhoto && typeof rawPhoto === 'object' ? text((rawPhoto as Record<string, unknown>).url) || text((rawPhoto as Record<string, unknown>).attach_url) : '')
    : '';
  const isTextEvent = eventName === 'message.text.received';
  const isImageEvent = eventName === 'message.image.received';
  // Sticker/voice/unsupported: event hợp lệ theo docs Zalo Bot nhưng không có nội dung lệnh —
  // chấp nhận để không 400 (bot bị coi "im lặng" trước đây), chỉ trả lời hướng dẫn.
  const isOtherEvent = eventName === 'message.sticker.received'
    || eventName === 'message.voice.received' || eventName === 'message.unsupported.received';
  if ((!isTextEvent && !isImageEvent && !isOtherEvent) || !m || m.from?.is_bot !== false
    || text(m?.chat?.chat_type) !== 'PRIVATE' || fromId !== chatId
    || !msgId || !Number.isInteger(msgDate) || msgDate < 1e12
    || Date.now() - msgDate > 300000 || msgDate - Date.now() > 60000
    || (isTextEvent && (!msgText || msgText.length > 2000))
    || (isImageEvent && (!/^https?:\/\//i.test(photoUrl) || photoUrl.length > 2048))) {
    // Không log nội dung yêu cầu bị từ chối (chứa định danh người gửi).
    res.status(400).json({ kind: 'error', code: 'INVALID_REQUEST' }); return true;
  }
  const me = await fetch(`${ORIGIN}/bot${encodeURIComponent(token)}/getMe`, { method: 'POST', redirect: 'error', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => null);
  const meBody = me && await me.json().catch(() => null);
  if (!me?.ok || meBody?.ok !== true || text(meBody?.result?.id) !== botId) { console.error(`[zalo-bot] getMe failed: http=${me ? me.status : 'fetch-error'} apiOk=${meBody?.ok === true} idMatch=${text(meBody?.result?.id) === botId} body=${JSON.stringify(meBody ?? null).slice(0, 300)}`); res.status(503).json({ kind: 'error', code: 'ZALO_BOT_UNAVAILABLE' }); return true; }
  const senderId = fromId;
  const command = msgText.split(/\s+/, 1)[0];
  if (allowedUsers.size && !allowedUsers.has(senderId)) { res.status(200).json({ ok: true }); return true; }
  if (!allowedUsers.size && command.startsWith('/') && command !== '/link' && command !== '/khoiphuc') {
    try { await resolveChannelActor('zalo_bot' as any, botId, senderId, chatId); }
    catch (error) {
      // Ambiguous = người gửi ĐÃ liên kết (vd PH 2 con) — cho vào dispatch xử lý bình thường.
      if (!/Ambiguous channel links/i.test((error as Error).message ?? '')) {
        // Người lạ nhắn /start hay lệnh gì cũng phải nhận hướng dẫn liên kết (guard 1 tin/5 phút
        // chống spam), không được im lặng — HS mới bấm vào bot thường gửi /start trước tiên.
        if (await canReplyToStranger(getAdminDb(), botId, senderId)) await send(token, chatId, STRANGER_HINT);
        res.status(200).json({ ok: true }); return true;
      }
    }
  }
  const nonce = `zalo_bot_${crypto.createHash('sha256').update(`${botId}:${senderId}:${chatId}:${msgId}`).digest('hex')}`;
  try { await claimAssistantRequestNonce(nonce); } catch (error) { if (/replay/i.test(error instanceof Error ? error.message : '')) { res.status(200).json({ ok: true }); return true; } console.error(`[zalo-bot] nonce claim failed: ${(error instanceof Error ? error.message : 'unknown').slice(0, 200)}`); res.status(503).json({ kind: 'error', code: 'ZALO_BOT_UNAVAILABLE' }); return true; }
  let reply = 'Tính năng chưa khả dụng.';
  try {
    if (isImageEvent) {
      // Ảnh HS gửi: nội dung do hệ tự dựng → gửi sendStyled (không qua output() che nội dung).
      reply = await dispatchPhotoMessage(botId, senderId, chatId, photoUrl);
      if (reply) await sendStyled(token, chatId, reply);
      res.status(200).json({ ok: true }); return true;
    }
    if (isOtherEvent) {
      // HS bấm vào bot thường gửi sticker/voice trước. Người lạ nhận gợi ý liên kết
      // (giữ guard 1 tin/5 phút); đã liên kết → hướng dẫn dùng văn bản/ảnh; không chạy dispatch lệnh.
      const linked = await resolveAnyActor(botId, senderId, chatId);
      reply = '';
      if (linked === 'ambiguous') reply = 'Tài khoản đã liên kết nhiều hồ sơ học sinh. Vui lòng liên hệ thầy cô để chọn đúng hồ sơ cần xem.';
      else if (linked) reply = 'Bot chỉ xử lý tin nhắn văn bản và hình ảnh. Nhắn 0 để xem menu.';
      else if (await canReplyToStranger(getAdminDb(), botId, senderId)) reply = STRANGER_HINT;
      if (reply) await send(token, chatId, reply);
      res.status(200).json({ ok: true }); return true;
    }
    reply = await dispatch(token, botId, senderId, chatId, msgText);
  } catch { reply = 'Không thể thực hiện yêu cầu. Dùng /help để xem lệnh.'; }
  if (reply) await send(token, chatId, reply); res.status(200).json({ ok: true }); return true;
}
