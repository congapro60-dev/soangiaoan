import { getEnv } from '../../../../lib/storage.js';
import { resolveIdentity } from '../../../../lib/account-room-access.js';
import { importDocx } from '../../../../lib/lesson/import/docx.js';
import { json, errorResponse } from '../../../../lib/exam/http.js';

// Reads the text of a Word file for the exam importer (formulas become $...$). The file is not stored anywhere:
// the bytes are read, the lines are returned, and nothing is kept on the server.
export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024;

async function readBytes(request) {
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BYTES)) throw new Error('BODY_TOO_LARGE');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID_BODY');
  const chunks = [];
  let total = 0;
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    total += part.value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new Error('BODY_TOO_LARGE');
    }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  return bytes;
}

export async function POST(request) {
  try {
    const { user } = resolveIdentity(request, getEnv());
    if (!user) throw new Error('AUTH_REQUIRED');
    const bytes = await readBytes(request);
    if (bytes.length < 4 || bytes[0] !== 80 || bytes[1] !== 75) throw new Error('INVALID_BODY');
    const parsed = importDocx({ bytes, originalName: 'de-kiem-tra.docx' });
    if (!parsed?.ok) return json({ error: 'INVALID_BODY' }, 400);
    const lines = [];
    for (const segment of parsed.segments) {
      for (const line of String(segment.text ?? '').split(/\r?\n/)) if (line.trim()) lines.push(line);
    }
    return json({ lines: lines.slice(0, 4000), warnings: (parsed.uncertainties || []).length });
  } catch (error) {
    return errorResponse(error);
  }
}
