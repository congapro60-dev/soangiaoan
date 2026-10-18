import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  cancelLinkCode, claimAssistantRequestNonce, consumeLinkCode, createLinkCode,
  isAllowedZaloOaId, listActiveChannelLinks, resolveChannelActor, revokeLink,
  validateChannelIdentity, verifyAssistantServiceSignature,
} from './_assistant-auth.js';
import { runAssistantReadTool } from './_assistant-tools.js';
import type { Channel } from './_assistant-types.js';

export const config = { api: { bodyParser: false } };
const bearer = (value: string | undefined) => value?.startsWith('Bearer ') ? value.slice(7).trim() : '';
const header = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] || '' : value || '';
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const requestId = (value: unknown) => {
  const id = text(value);
  return id && /^[A-Za-z0-9._:-]{1,128}$/.test(id) ? id : '';
};

export interface GatewayEnvelope {
  action: string;
  requestId: string;
  channel?: Channel;
  channelAccountId?: string;
  channelUserId?: string;
  channelChatId?: string;
  payload: Record<string, unknown>;
}

export const normalizeGatewayEnvelope = (body: Record<string, unknown>): GatewayEnvelope => {
  const action = text(body.action);
  const suppliedRequestId = requestId(body.requestId);
  if (!action || (body.requestId !== undefined && !suppliedRequestId)) throw new Error('Invalid request');
  const rawChannel = text(body.channel);
  if (rawChannel && rawChannel !== 'telegram' && rawChannel !== 'zalo_oa') throw new Error('Unsupported channel');
  const channel = rawChannel as Channel | undefined;
  const account = text(body.channelAccountId);
  const user = text(body.channelUserId);
  const chat = text(body.channelChatId);
  if (channel && (!account || !user)) throw new Error('Invalid request');
  if (channel === 'telegram' && !/^\d+$/.test(user)) throw new Error('Invalid Telegram user ID');
  if (channel === 'telegram' && chat !== user) throw new Error('Telegram linking requires a private chat');
  return {
    action,
    requestId: suppliedRequestId || crypto.randomUUID(),
    ...(channel ? { channel, channelAccountId: account, channelUserId: user, ...(chat ? { channelChatId: chat } : {}) } : {}),
    payload: body,
  };
};

const rawRequestBody = (req: VercelRequest): string => {
  const raw = (req as VercelRequest & { rawBody?: string | Buffer }).rawBody;
  if (Buffer.isBuffer(raw)) return raw.toString('utf8');
  if (typeof raw === 'string') return raw;
  return typeof req.body === 'string' ? req.body : '';
};
const readRequestBody = async (req: VercelRequest): Promise<string> => {
  const existing = rawRequestBody(req);
  if (existing) return existing;
  const stream = req as unknown as AsyncIterable<Buffer | string>;
  if (typeof stream[Symbol.asyncIterator] !== 'function') return '';
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
};
const parseBody = (raw: string): Record<string, unknown> => {
  if (!raw) throw new Error('Invalid request');
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid request');
  return parsed as Record<string, unknown>;
};
const safeError = (res: VercelResponse, status: number, requestIdValue: string, code: string) =>
  res.status(status).json({ kind: 'error', code, requestId: requestIdValue });
const notImplemented = (res: VercelResponse, id: string) => safeError(res, 501, id, 'NOT_IMPLEMENTED');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ kind: 'error', code: 'METHOD_NOT_ALLOWED' });
  let envelope: GatewayEnvelope | undefined;
  try {
    const rawBody = await readRequestBody(req);
    const body = parseBody(rawBody);
    envelope = normalizeGatewayEnvelope(body);
    const { action, requestId: id } = envelope;
    const adapterAction = action === 'consumeLinkCode' || Boolean(envelope.channel);
    if (adapterAction) {
      const timestamp = header(req.headers['x-assistant-timestamp']);
      const nonce = header(req.headers['x-assistant-nonce']);
      const signature = header(req.headers['x-assistant-signature']);
      if (!verifyAssistantServiceSignature(rawBody, timestamp, nonce, signature, process.env.SMARTPLAN_ASSISTANT_SECRET)) return safeError(res, 401, id, 'UNAUTHORIZED');
      await claimAssistantRequestNonce(nonce);
      if (envelope.channel === 'zalo_oa' && !isAllowedZaloOaId(envelope.channelAccountId || '')) return safeError(res, 401, id, 'UNAUTHORIZED');
      if (envelope.channel) validateChannelIdentity({
        channel: envelope.channel,
        channelAccountId: envelope.channelAccountId!,
        channelUserId: envelope.channelUserId!,
        channelChatId: envelope.channelChatId,
        verifiedChannelAccountId: envelope.channel === 'zalo_oa' ? envelope.channelAccountId : undefined,
      });
    }
    if (action === 'createLinkCode') {
      const token = bearer(req.headers.authorization);
      if (!token) return safeError(res, 401, id, 'UNAUTHORIZED');
      return res.status(200).json({ kind: 'answer', requestId: id, result: await createLinkCode(token) });
    }
    if (action === 'consumeLinkCode') {
      if (!envelope.channel) throw new Error('Invalid request');
      const result = await consumeLinkCode(text(envelope.payload.code), {
        channel: envelope.channel, channelAccountId: envelope.channelAccountId!, channelUserId: envelope.channelUserId!,
        channelChatId: envelope.channelChatId,
        verifiedChannelAccountId: envelope.channel === 'zalo_oa' ? envelope.channelAccountId : undefined,
      });
      return res.status(200).json({ kind: 'answer', requestId: id, result });
    }
    if (action === 'revokeLink' || action === 'revokeChannelLink' || action === 'cancelLinkCode') {
      const token = bearer(req.headers.authorization);
      if (!token) return safeError(res, 401, id, 'UNAUTHORIZED');
      const linkId = text(envelope.payload.linkId);
      if (!linkId) throw new Error('Invalid request');
      if (action === 'cancelLinkCode') await cancelLinkCode(token, linkId);
      else await revokeLink(token, linkId);
      return res.status(200).json({ kind: 'answer', requestId: id, result: { ok: true } });
    }
    if (action === 'listChannelLinks') {
      const token = bearer(req.headers.authorization);
      if (!token) return safeError(res, 401, id, 'UNAUTHORIZED');
      return res.status(200).json({ kind: 'answer', requestId: id, result: { links: await listActiveChannelLinks(token) } });
    }
    if (action === 'readTool') {
      if (!envelope.channel) throw new Error('Invalid request');
      const actor = await resolveChannelActor(envelope.channel, envelope.channelAccountId!, envelope.channelUserId!, envelope.channelChatId);
      const toolName = text(envelope.payload.toolName);
      const args = envelope.payload.args && typeof envelope.payload.args === 'object' && !Array.isArray(envelope.payload.args) ? envelope.payload.args as Record<string, unknown> : {};
      const result = await runAssistantReadTool(toolName, args, actor);
      return res.status(200).json({ kind: 'answer', requestId: id, result });
    }
    if (action === 'chat' || action === 'confirm' || action === 'cancel' || action === 'jobStatus') return notImplemented(res, id);
    return safeError(res, 400, id, 'UNKNOWN_ACTION');
  } catch (error) {
    const id = envelope?.requestId || '';
    const message = error instanceof Error ? error.message : '';
    const auth = /authentication|required|token|unauthorized|replay|private chat|unknown oa|already linked/i.test(message);
    return safeError(res, auth ? 401 : 400, id, auth ? 'UNAUTHORIZED' : 'INVALID_REQUEST');
  }
}
