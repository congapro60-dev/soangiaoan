import type { VercelRequest, VercelResponse } from '@vercel/node';
import { renderWordBuffer, safeFilename } from './render-word-core.js';
import type { WordOrientation } from './render-word-core.js';

const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_CONTENT_LENGTH = 900_000;

const isOrientation = (value: unknown): value is WordOrientation =>
  value === 'portrait' || value === 'landscape';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, content, orientation } = req.body || {};

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Missing content' });
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return res.status(413).json({ error: 'Content too large' });
  }

  const normalizedTitle = typeof title === 'string' && title.trim() ? title.trim() : 'Giao an';
  const normalizedOrientation = isOrientation(orientation) ? orientation : 'portrait';

  try {
    const buffer = await renderWordBuffer({
      title: normalizedTitle,
      content,
      orientation: normalizedOrientation,
    });
    const filename = `${safeFilename(normalizedTitle)}_A4.docx`;

    res.setHeader('Content-Type', DOCX_MIME_TYPE);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Length', String(buffer.length));
    return res.status(200).send(buffer);
  } catch (err: any) {
    console.error('Word render failed:', err);
    return res.status(500).json({ error: err?.message || 'Word render failed' });
  }
}
