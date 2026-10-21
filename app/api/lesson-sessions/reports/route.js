import { db, getEnv } from '../../../../lib/storage.js';
import { resolveIdentity } from '../../../../lib/account-room-access.js';
import { createLessonService } from '../../../../lib/lesson/service.js';
import { createPupilReportService } from '../../../../lib/lesson/pupil-reports.js';

export const dynamic = 'force-dynamic';
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const known = new Set(['INVALID_BODY', 'FORBIDDEN', 'DEVICE_UNAVAILABLE', 'NOT_FOUND', 'REPORT_NOT_FOUND', 'REPORT_SENSITIVE_TEXT', 'INVALID_REPORT_CONTEXT', 'REQUEST_ID_CONFLICT', 'REPORT_CONTEXT_CHANGED', 'REPORT_RATE_LIMIT', 'REPORT_ROOM_LIMIT']);
const failure = error => {
  const code = known.has(error.message) ? error.message : 'REPORT_UNAVAILABLE';
  return json({ error: code }, ['FORBIDDEN', 'DEVICE_UNAVAILABLE'].includes(code) ? 403 : ['NOT_FOUND', 'REPORT_NOT_FOUND'].includes(code) ? 404 : code === 'REPORT_RATE_LIMIT' ? 429 : code === 'REPORT_UNAVAILABLE' ? 503 : ['REQUEST_ID_CONFLICT', 'REPORT_CONTEXT_CHANGED'].includes(code) ? 409 : 400);
};
function service() {
  const database = db();
  return createPupilReportService({ db: database, lessonService: createLessonService({ db: database }) });
}

export async function GET(request) {
  const { user } = resolveIdentity(request, getEnv());
  if (!user) return json({ error: 'AUTH_REQUIRED' }, 401);
  try { return json(await service().list({ id: new URL(request.url).searchParams.get('id'), accountId: user.userId })); }
  catch (error) { return failure(error); }
}

export async function POST(request) {
  try {
    const reader = request.body?.getReader();
    if (!reader) throw Error('INVALID_BODY');
    const chunks = []; let bytes = 0;
    for (;;) {
      const part = await reader.read(); if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 8192) { await reader.cancel(); throw Error('INVALID_BODY'); }
      chunks.push(part.value);
    }
    let body; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw Error('INVALID_BODY'); }
    const keys = body?.action === 'submit' ? ['action', 'id', 'requestId', 'category', 'description', 'taskId', 'actingLearnerId'] : ['action', 'id', 'reportId', 'status'];
    if (!body || typeof body !== 'object' || Array.isArray(body) || !['submit', 'update'].includes(body.action) || Object.keys(body).some(key => !keys.includes(key))) throw Error('INVALID_BODY');
    const { action, ...input } = body;
    if (action === 'submit') {
      const learnerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
      if (!learnerToken) return json({ error: 'AUTH_REQUIRED' }, 401);
      return json(await service().submit({ ...input, learnerToken }));
    }
    const { user } = resolveIdentity(request, getEnv());
    if (!user) return json({ error: 'AUTH_REQUIRED' }, 401);
    return json(await service().update({ ...input, accountId: user.userId }));
  } catch (error) { return failure(error); }
}
