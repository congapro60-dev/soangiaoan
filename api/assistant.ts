import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ASSISTANT_SIGNATURE_WINDOW_SECONDS, cancelLinkCode, consumeLinkCode, createLinkCode, revokeChannelLink, verifyAssistantServiceSignature } from './_assistant-auth.js';

const bearer = (value: string | undefined) => value?.startsWith('Bearer ') ? value.slice(7) : '';
export const config = { api: { bodyParser: false } };
const bodyOf = (rawBody: string, parsedBody?: unknown): Record<string, unknown> => {
  if (parsedBody && typeof parsedBody === 'object') return parsedBody as Record<string, unknown>;
  try { return JSON.parse(rawBody || '{}') as Record<string, unknown>; } catch { return {}; }
};
const text = (v: unknown) => typeof v === 'string' ? v : '';
const consumedNonces = new Map<string, number>();
const header = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] || '' : value || '';
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const rawBody = await readRequestBody(req);
  const body = bodyOf(rawBody, typeof req.body === 'object' ? req.body : undefined);
  try {
    if (body.action === 'createLinkCode') {
      const token = bearer(req.headers.authorization);
      if (!token) return res.status(401).json({ error: 'Authentication required' });
      return res.status(200).json(await createLinkCode(token));
    }
    if (body.action === 'revokeChannelLink') {
      const token = bearer(req.headers.authorization);
      if (!token) return res.status(401).json({ error: 'Authentication required' });
      await revokeChannelLink(token, text(body.linkId));
      return res.status(200).json({ ok: true });
    }
    if (body.action === 'cancelLinkCode') {
      const token = bearer(req.headers.authorization);
      if (!token) return res.status(401).json({ error: 'Authentication required' });
      await cancelLinkCode(token, text(body.linkId));
      return res.status(200).json({ ok: true });
    }
    if (body.action === 'consumeLinkCode') {
      const timestamp = header(req.headers['x-assistant-timestamp']);
      const nonce = header(req.headers['x-assistant-nonce']);
      const signature = header(req.headers['x-assistant-signature']);
      const secret = process.env.SMARTPLAN_ASSISTANT_SECRET;
      if (!verifyAssistantServiceSignature(rawBody, timestamp, nonce, signature, secret)) {
        return res.status(401).json({ error: 'Assistant adapter authentication required' });
      }
      const now = Date.now();
      for (const [seenNonce, seenAt] of consumedNonces) if (now - seenAt > ASSISTANT_SIGNATURE_WINDOW_SECONDS * 1000) consumedNonces.delete(seenNonce);
      if (consumedNonces.has(nonce)) return res.status(401).json({ error: 'Replay detected' });
      consumedNonces.set(nonce, now);
      const channel = body.channel === 'telegram' || body.channel === 'zalo_oa' ? body.channel : '';
      if (!channel) return res.status(400).json({ error: 'Unsupported channel' });
      const result = await consumeLinkCode(text(body.code), {
        channel,
        channelAccountId: text(body.channelAccountId),
        channelUserId: text(body.channelUserId),
        channelChatId: text(body.channelChatId) || undefined,
        verifiedChannelAccountId: text(body.verifiedChannelAccountId) || undefined,
      });
      return res.status(200).json(result);
    }
    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Assistant request failed';
    const status = /authentication|required|token|not found|used|expired|invalid|private chat/i.test(message) ? 401 : 400;
    return res.status(status).json({ error: message });
  }
}
