// Small helpers shared by the two exam routes.
export const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

const STATUS = {
  AUTH_REQUIRED: 401,
  REVIEW_UNAVAILABLE: 403,
  NOT_FOUND: 404,
  ROOM_NOT_FOUND: 404,
  BODY_TOO_LARGE: 413,
  NAME_TAKEN: 409,
  BAD_STATE: 409,
  ACCOMMODATION_CHANGED: 409,
  KEY_MISSING: 409,
  QUESTIONS_LOCKED: 409,
  EXAM_CLOSED: 410,
  EXAM_ENDED: 410,
  ALREADY_SUBMITTED: 409,
  EXAM_NOT_STARTED: 409,
  EXAM_NOT_OPEN: 409,
  EXAM_LOCKED: 403,
  MASCOT_LOCKED: 409,
  INTEGRITY_REQUIRED: 409,
  INTEGRITY_LOCKED: 409,
  TOO_MANY_PHOTOS: 409,
  AI_PROVIDER_NOT_CONFIGURED: 503,
  AI_CONSENT_REQUIRED: 400,
  SOURCE_CHANGED: 409,
  AI_QUOTA_EXCEEDED: 429,
  AI_TIMEOUT: 504,
  AI_GENERATION_FAILED: 503,
  AI_OUTPUT_TRUNCATED: 400,
  INVALID_PROPOSAL: 400,
  VARIANT_NOT_ALLOWED: 400,
  PROPOSAL_TOO_LARGE: 413,
};
const KNOWN = new Set([...Object.keys(STATUS), 'INVALID_EXAM', 'INVALID_BODY', 'INVALID_REQUEST_ID', 'INVALID_ACTION', 'INVALID_NAME', 'INVALID_IMAGE', 'INVALID_SCORE', 'ANSWER_TOO_LARGE', 'CODE_UNAVAILABLE']);

/** Only machine codes reach the client; anything else (database text, stack traces) becomes EXAM_UNAVAILABLE. */
export function errorResponse(error) {
  const code = String(error?.message || '');
  if (KNOWN.has(code)) return json({ error: code }, STATUS[code] || 400);
  console.error('exam request failed');
  return json({ error: 'EXAM_UNAVAILABLE' }, 503);
}

export async function readJson(request, limit = 64 * 1024) {
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > limit)) throw new Error('BODY_TOO_LARGE');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID_BODY');
  const chunks = [];
  let total = 0;
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    total += part.value.byteLength;
    if (total > limit) {
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
  try {
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('INVALID_BODY');
    return body;
  } catch {
    throw new Error('INVALID_BODY');
  }
}

export function imageResponse(asset) {
  const bytes = Uint8Array.from(atob(asset.data), (c) => c.charCodeAt(0));
  return new Response(bytes, { status: 200, headers: { 'Content-Type': asset.mime, 'Content-Length': String(bytes.byteLength), 'Cache-Control': 'private, max-age=600', 'X-Content-Type-Options': 'nosniff' } });
}

export const bearer = (request) => request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
