import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleAiRelay } from './_ai-relay-handler.js';

// POST { model?, prompt, system?, images? } + Authorization: Bearer idToken → { text, model, truncated }
// maxDuration khai ở vercel.json (RELAY_MAX_DURATION_S trong _ai-relay-core.ts phải khớp).
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  return handleAiRelay(req, res);
}
