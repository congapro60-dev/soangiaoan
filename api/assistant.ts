import type { VercelRequest, VercelResponse } from '@vercel/node';
import { consumeLinkCode, createLinkCode, revokeChannelLink, verifyFirebaseIdToken } from './_assistant-auth.js';

const bearer = (value: string | undefined) => value?.startsWith('Bearer ') ? value.slice(7) : '';
const bodyOf = (req: VercelRequest): Record<string, unknown> => {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>;
  try { return JSON.parse(String(req.body || '{}')) as Record<string, unknown>; } catch { return {}; }
};
const text = (v: unknown) => typeof v === 'string' ? v : '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = bodyOf(req);
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
    if (body.action === 'consumeLinkCode') {
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
