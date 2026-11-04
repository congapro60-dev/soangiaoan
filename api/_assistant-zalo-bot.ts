import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { claimAssistantRequestNonce, consumeLinkCode, resolveChannelActor } from './_assistant-auth.js';
import { cancelAssistantConfirmation, executeAssistantConfirmation, inspectAssistantConfirmation } from './_assistant-confirmations.js';
import { getAssistantJobStatus } from './_assistant-jobs.js';
import { runAssistantReadTool } from './_assistant-tools.js';

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
  if (command === '/help') return 'Lệnh: /link CODE, /classes, /confirm ID HASH, /cancel ID HASH, /status ID';
  if (command === '/link') {
    if (!args[0]) return 'Cần mã liên kết.';
    await consumeLinkCode(args[0], id as any);
    return 'Đã liên kết tài khoản giáo viên.';
  }
  const actor = await resolveChannelActor('zalo_bot' as any, botId, userId, chatId);
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
  try { raw = await readBody(req); } catch { res.status(400).json({ kind: 'error', code: 'INVALID_REQUEST' }); return true; }
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY) { res.status(400).json({ kind: 'error', code: 'INVALID_REQUEST' }); return true; }
  let body: any;
  try { body = JSON.parse(raw); } catch { res.status(400).json({ kind: 'error', code: 'INVALID_REQUEST' }); return true; }
  const m = body?.result?.message;
  if (body?.ok !== true || body?.result?.event_name !== 'message.text.received' || !m || m.from?.is_bot !== false || m.chat?.chat_type !== 'PRIVATE' || text(m.from?.id) !== text(m.chat?.id) || !text(m.message_id) || !text(m.text) || text(m.text).length > 2000 || !Number.isInteger(m.date) || m.date < 1e12 || Date.now() - m.date > 300000 || m.date - Date.now() > 60000) { res.status(400).json({ kind: 'error', code: 'INVALID_REQUEST' }); return true; }
  const me = await fetch(`${ORIGIN}/bot${encodeURIComponent(token)}/getMe`, { redirect: 'error' }).catch(() => null);
  const meBody = me && await me.json().catch(() => null);
  if (!me?.ok || meBody?.ok !== true || text(meBody?.result?.id) !== botId) { res.status(503).json({ kind: 'error', code: 'ZALO_BOT_UNAVAILABLE' }); return true; }
  const senderId = text(m.from.id);
  const command = text(m.text).split(/\s+/, 1)[0];
  if (allowedUsers.size && !allowedUsers.has(senderId)) { res.status(200).json({ ok: true }); return true; }
  if (!allowedUsers.size && command !== '/link') {
    try { await resolveChannelActor('zalo_bot' as any, botId, senderId, text(m.chat.id)); }
    catch { res.status(200).json({ ok: true }); return true; }
  }
  const nonce = `zalo_bot_${crypto.createHash('sha256').update(`${botId}:${m.from.id}:${m.chat.id}:${m.message_id}`).digest('hex')}`;
  try { await claimAssistantRequestNonce(nonce); } catch (error) { if (/replay/i.test(error instanceof Error ? error.message : '')) { res.status(200).json({ ok: true }); return true; } res.status(503).json({ kind: 'error', code: 'ZALO_BOT_UNAVAILABLE' }); return true; }
  let reply = 'Tính năng chưa khả dụng.';
  try { reply = await dispatch(token, botId, text(m.from.id), text(m.chat.id), text(m.text)); } catch { reply = 'Không thể thực hiện yêu cầu. Dùng /help để xem lệnh.'; }
  await send(token, text(m.chat.id), reply); res.status(200).json({ ok: true }); return true;
}
