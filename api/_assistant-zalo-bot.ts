import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { claimAssistantRequestNonce, consumeLinkCode, resolveChannelActor } from './_assistant-auth.js';
import { cancelAssistantConfirmation, executeAssistantConfirmation, inspectAssistantConfirmation } from './_assistant-confirmations.js';
import { linkByPin, parsePinLinkMessage, PIN_LINK_REPLIES } from './_assistant-ph-hs-link.js';
import { recoveryReply } from './_assistant-ph-hs-recovery.js';
import { parentMenuReply, parseMenuChoice, loadParentReport, MENU_REPLIES } from './_assistant-ph-hs-menu.js';
import { AI_CHAT_REPLIES, answerParentQuestion, vilaoCaller } from './_assistant-ph-hs-chat.js';
import { canReplyToStranger } from './_bot-pin-guard.js';import { getAssistantJobStatus } from './_assistant-jobs.js';
import { runAssistantReadTool } from './_assistant-tools.js';
import { getAdminDb } from './_exam-core.js';

const ORIGIN = 'https://bot-api.zaloplatforms.com';
const MAX_BODY = 16_384;
const text = (v: unknown) => typeof v === 'string' ? v.trim() : '';
const set = (v: string | undefined) => new Set((v || '').split(',').map(x => x.trim()).filter(Boolean));
const h = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] || '' : v || '';
const secretEqual = (a: string, b: string) => {
  const aa = Buffer.from(a); const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
};
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
 */
const resolveAnyActor = async (botId: string, userId: string, chatId: string): Promise<ZaloActor | 'ambiguous' | null> => {
  let ambiguous = false;
  for (const preferredRole of ['teacher', 'parent', 'student'] as const) {
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
  if (command === '/help') return 'Lệnh: /link CODE, /classes, /confirm ID HASH, /cancel ID HASH, /status ID\nPH quên mã PIN: /khoiphuc <mã học sinh> <số điện thoại>';
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
    // Menu (0–7) đi trước; tin không khớp menu thì chuyển cho trợ lý AI trả lời tự do.
    const choice = parseMenuChoice(message);
    if (choice.kind !== 'invalid') return parentMenuReply(getAdminDb(), classId, studentId, message);
    const bundle = await loadParentReport(getAdminDb(), classId, studentId);
    if (!bundle) return MENU_REPLIES.noData;
    // AI CHAT PH chỉ dùng key RIÊNG (PH_CHAT_VILAO_KEY) — tách khỏi key chấm bài để theo dõi
    // chi phí độc lập và không tiêu nhầm hạn mức chấm bài. Không có key thì báo "bận", không im lặng.
    const apiKey = String(process.env.PH_CHAT_VILAO_KEY || '');
    if (!apiKey) return AI_CHAT_REPLIES.unavailable;
    try {
      const aiReply = await answerParentQuestion(vilaoCaller(apiKey), message, bundle.report, bundle.periodicIds);
      return aiReply ?? MENU_REPLIES.invalid;
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
  if (!token || !botId || !allowedBots.has(botId) || !configuredSecret) { res.status(503).json({ kind: 'error', code: 'ZALO_BOT_UNAVAILABLE' }); return true; }
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
  console.log('[zalo-diag] RAW:', raw.slice(0, 600));
  const fromId = text(m?.from?.id); const chatId = text(m?.chat?.id ?? m?.chat_id);
  const msgDate = Number(m?.date); const msgId = text(m?.message_id);
  const msgText = text(m?.text);
  if (eventName !== 'message.text.received' || !m || m.from?.is_bot !== false
    || text(m?.chat?.chat_type) !== 'PRIVATE' || fromId !== chatId
    || !msgId || !msgText || msgText.length > 2000
    || !Number.isInteger(msgDate) || msgDate < 1e12
    || Date.now() - msgDate > 300000 || msgDate - Date.now() > 60000) {
    console.log('[zalo-diag] reject:', JSON.stringify({ eventName, fromId: fromId.slice(0, 6), chatId: chatId.slice(0, 6), msgDate, now: Date.now() }));
    res.status(400).json({ kind: 'error', code: 'INVALID_REQUEST' }); return true;
  }
  const me = await fetch(`${ORIGIN}/bot${encodeURIComponent(token)}/getMe`, { method: 'POST', redirect: 'error', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => null);
  const meBody = me && await me.json().catch(() => null);
  if (!me?.ok || meBody?.ok !== true || text(meBody?.result?.id) !== botId) { res.status(503).json({ kind: 'error', code: 'ZALO_BOT_UNAVAILABLE' }); return true; }
  const senderId = fromId;
  const command = msgText.split(/\s+/, 1)[0];
  if (allowedUsers.size && !allowedUsers.has(senderId)) { res.status(200).json({ ok: true }); return true; }
  if (!allowedUsers.size && command.startsWith('/') && command !== '/link' && command !== '/khoiphuc') {
    try { await resolveChannelActor('zalo_bot' as any, botId, senderId, chatId); }
    catch (error) {
      // Ambiguous = người gửi ĐÃ liên kết (vd PH 2 con) — cho vào dispatch xử lý bình thường.
      if (!/Ambiguous channel links/i.test((error as Error).message ?? '')) { res.status(200).json({ ok: true }); return true; }
    }
  }
  const nonce = `zalo_bot_${crypto.createHash('sha256').update(`${botId}:${senderId}:${chatId}:${msgId}`).digest('hex')}`;
  try { await claimAssistantRequestNonce(nonce); } catch (error) { if (/replay/i.test(error instanceof Error ? error.message : '')) { res.status(200).json({ ok: true }); return true; } console.log('[zalo-diag] nonce loi:', (error as Error)?.message?.slice(0, 300)); res.status(503).json({ kind: 'error', code: 'ZALO_BOT_UNAVAILABLE' }); return true; }
  let reply = 'Tính năng chưa khả dụng.';
  try { reply = await dispatch(token, botId, senderId, chatId, msgText); } catch (error) { console.log('[zalo-diag] dispatch loi:', (error as Error)?.message?.slice(0, 300)); reply = 'Không thể thực hiện yêu cầu. Dùng /help để xem lệnh.'; }
  if (reply) await send(token, chatId, reply); res.status(200).json({ ok: true }); return true;
}
