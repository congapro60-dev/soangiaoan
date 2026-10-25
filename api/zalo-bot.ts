/**
 * Webhook Zalo Bot — route riêng để không phụ thuộc query `?transport=zalo_bot`.
 * Zalo Bot Platform không giữ query string trong URL webhook ở một số trường hợp,
 * nên tách path riêng là cách chắc chắn nhất.
 *
 * GET/HEAD: Zalo dùng để VERIFY webhook ngay sau setWebhook — phải trả 2xx.
 * POST: tin nhắn thật, chuyển cho handleZaloBotWebhook.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleZaloBotWebhook } from './_assistant-zalo-bot.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    // Verify của Zalo; các method khác không mang tin nhắn nên trả 2xx vô hại.
    res.status(200).json({ ok: true });
    return;
  }
  await handleZaloBotWebhook(req, res);
}
