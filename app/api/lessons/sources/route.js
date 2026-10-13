import { db, getEnv, stmt } from '../../../../lib/storage.js';
import { resolveIdentity } from '../../../../lib/account-room-access.js';
import { createLessonSourceService, MAX_SOURCE_BYTES } from '../../../../lib/lesson/source-service.js';
import { importDocx } from '../../../../lib/lesson/import/docx.js';
import { importPdf } from '../../../../lib/lesson/import/pdf.js';
import { importText } from '../../../../lib/lesson/import/text.js';

export const dynamic = 'force-dynamic';
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const errors = { NOT_FOUND: 404, AUTH_REQUIRED: 401, CONFIRM_REQUIRED: 409, BODY_TOO_LARGE: 413, INVALID_BODY: 400, INVALID_MIME: 415, INVALID_SIGNATURE: 415, INVALID_REQUEST_ID: 400, REQUEST_ID_CONFLICT: 409, SOURCE_QUOTA_EXCEEDED: 413 };
const error = e => Object.hasOwn(errors, e?.message) ? json({ error: e.message }, errors[e.message]) : json({ error: 'SOURCE_UNAVAILABLE' }, 503);
const service = () => createLessonSourceService({ db: db(), bucket: getEnv().LESSON_SOURCES, importDocx, importPdf, importText });
const disposition = name => {
  const clean = String(name || 'source').replace(/[\u0000-\u001f\u007f"\\]/g, '_').replace(/[\r\n;]/g, '_').trim() || 'source';
  const fallback = clean.replace(/[^A-Za-z0-9._-]/g, '_').slice(-120) || 'source';
  const encoded = encodeURIComponent(clean).replace(/[\'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
};

async function body(request, maxBytes = MAX_SOURCE_BYTES) {
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes)) throw Error('BODY_TOO_LARGE');
  const reader = request.body?.getReader();
  if (!reader) throw Error('INVALID_BODY');
  const chunks = []; let total = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > maxBytes) { await reader.cancel(); throw Error('BODY_TOO_LARGE'); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total); let at = 0;
  for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.byteLength; }
  return bytes;
}

export async function GET(request) {
  const { user } = resolveIdentity(request, getEnv());
  if (!user) return json({ error: 'AUTH_REQUIRED' }, 401);
  try {
    const q = new URL(request.url).searchParams;
    if (q.get('download') === 'original') {
      const source = await service().downloadOriginal(user.userId, q.get('id'));
      return new Response(source.bytes, { status: 200, headers: {
        'Content-Type': source.mime,
        'Content-Length': String(source.bytes.byteLength),
        'Content-Disposition': disposition(source.originalName),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      } });
    }
    return json(q.get('id') ? { source: await service().get(user.userId, q.get('id')) } : { sources: await service().list(user.userId) });
  } catch (e) { return error(e); }
}

export async function POST(request) {
  const { user } = resolveIdentity(request, getEnv());
  if (!user) return json({ error: 'AUTH_REQUIRED' }, 401);
  try {
    if (request.headers.get('content-type')?.split(';')[0].trim() === 'application/json') {
      const raw = await body(request, 4096);
      let input;
      try { input = JSON.parse(new TextDecoder().decode(raw)); } catch { throw Error('INVALID_BODY'); }
      if (!input || typeof input !== 'object' || Array.isArray(input) || input.action !== 'restore' || Object.keys(input).some(key => !['action', 'id'].includes(key))) throw Error('INVALID_BODY');
      return json(await service().restore({ ownerAccountId: user.userId, id: input.id }));
    }
    const bytes = await body(request);
    const encodedName = request.headers.get('x-file-name') || 'source';
    if (encodedName.length > 2048) throw Error('INVALID_BODY');
    let originalName;
    try { originalName = decodeURIComponent(encodedName); } catch { throw Error('INVALID_BODY'); }
    await stmt('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING', user.userId, user.email, user.displayName || user.email, Date.now()).run();
    const source = await service().upload({ ownerAccountId: user.userId, requestId: request.headers.get('x-request-id'), originalName, mime: request.headers.get('content-type')?.split(';')[0].trim(), bytes });
    return json({ source }, source.status === 'pending' ? 202 : 201);
  } catch (e) { return error(e); }
}

export async function DELETE(request) {
  const { user } = resolveIdentity(request, getEnv());
  if (!user) return json({ error: 'AUTH_REQUIRED' }, 401);
  try {
    const bytes = await body(request, 4096);
    let input;
    try { input = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw Error('INVALID_BODY'); }
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['id', 'confirmName'].includes(key)) || typeof input.id !== 'string' || !input.id || input.id.length > 128 || typeof input.confirmName !== 'string') throw Error('INVALID_BODY');
    return json(await service().remove({ ownerAccountId: user.userId, id: input.id, confirmName: input.confirmName }));
  } catch (e) { return error(e); }
}
