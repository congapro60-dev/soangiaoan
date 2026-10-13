import { db, stmt, getEnv } from '../../../lib/storage.js';
import { resolveIdentity } from '../../../lib/account-room-access.js';
import { createLessonService, MAX_PACKAGE_BYTES } from '../../../lib/lesson/service.js';
import { importText } from '../../../lib/lesson/import/text.js';
import pilotPackage from '../../../content/lessons/g11-sequences-p1.json';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
const json = (body, status = 200) => Response.json(body, { status, headers });
const fail = (code, status = 400) => json({ error: code }, status);
const service = () => createLessonService({ db: db() });
const actor = (request) => resolveIdentity(request, getEnv());

const RECOGNIZED_POST_ERRORS = Object.assign(Object.create(null), {
  BODY_TOO_LARGE: 413,
  INVALID_BODY: 400,
  CONFIRM_REQUIRED: 409,
  AUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  DUPLICATE_VERSION: 409,
  APPROVAL_CONFLICT: 409,
  SOURCE_ACK_MISMATCH: 409,
  INVALID_PACKAGE: 400,
  INVALID_PACKAGE_STATUS: 400,
  INVALID_APPROVAL: 400,
  INVALID_APPROVED_PACKAGE: 400,
  SOURCE_REVIEW_REQUIRED: 400,
  NUMERIC_REVIEW_REQUIRED: 409,
  PLAN_HASH_MISMATCH: 400,
  INVALID_APPROVED_PLAN: 400
});

async function boundedBody(request, maxBytes = MAX_PACKAGE_BYTES) {
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) throw Object.assign(new Error('BODY_TOO_LARGE'), { status: 413 });
  const reader = request.body?.getReader();
  if (reader) {
    const chunks = []; let total = 0;
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > maxBytes) { await reader.cancel(); throw Object.assign(new Error('BODY_TOO_LARGE'), { status: 413 }); }
      chunks.push(part.value);
    }
    const merged = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
    const raw = new TextDecoder().decode(merged);
    try { return JSON.parse(raw); } catch { throw Object.assign(new Error('INVALID_BODY'), { status: 400 }); }
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) throw Object.assign(new Error('BODY_TOO_LARGE'), { status: 413 });
  try { return JSON.parse(raw); } catch { throw Object.assign(new Error('INVALID_BODY'), { status: 400 }); }
}

async function account(user) {
  await stmt('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,display_name=excluded.display_name', user.userId, user.email, user.displayName, Date.now()).run();
}

export async function GET(request) {
  const { user, isRootUser } = actor(request);
  if (!user) return fail('AUTH_REQUIRED', 401);
  try {
    await account(user); const q = new URL(request.url).searchParams; const kind = q.get('kind') || 'list'; const api = service();
    if (kind === 'list') return json({ packages: await api.listPackages({ actorAccountId: user.userId, isRoot: isRootUser }) });
    if (kind === 'library') return json({ packages: await api.listPackages({ actorAccountId: user.userId }) });
    if (kind === 'plans') return json({ plans: await api.listPlans({ ownerAccountId: user.userId }) });
    if (kind === 'get' && q.get('id')) return json({ package: await api.getPackage({ actorAccountId: user.userId, isRoot: isRootUser, id: q.get('id') }) });
    if (kind === 'director' && q.get('id')) return json(await api.getDirectorDraft({ actorAccountId: user.userId, isRoot: isRootUser, id: q.get('id') }));
    if (kind === 'pilot') {
      if (q.get('id')) return json({ package: await api.getPackage({ actorAccountId: user.userId, isRoot: isRootUser, id: q.get('id') }) });
      return json({ package: pilotPackage });
    }
    return fail('INVALID_QUERY');
  } catch (error) { return fail(error.message === 'NOT_FOUND' ? 'NOT_FOUND' : 'LESSON_UNAVAILABLE', error.message === 'NOT_FOUND' ? 404 : 503); }
}

export async function POST(request) {
  const { user, isRootUser } = actor(request);
  if (!user) return fail('AUTH_REQUIRED', 401);
  try {
    const input = await boundedBody(request, MAX_PACKAGE_BYTES);
    if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('INVALID_BODY');
    await account(user);

    const pathname = new URL(request.url).pathname;
    const isImport = pathname.endsWith('/import') || pathname.endsWith('/import/') || input.action === 'import' || (!input.action && (input.kind !== undefined || input.originalName !== undefined || input.text !== undefined));

    if (isImport) {
      const payload = { ...input };
      delete payload.action;
      if (!payload.maxBytes) payload.maxBytes = MAX_PACKAGE_BYTES;
      const result = importText(payload);
      return json(result, result.ok ? 200 : 400);
    }

    const api = service();
    if (input.action === 'restore' && Object.keys(input).every(key => ['action', 'kind', 'id'].includes(key))) return json(await api.restoreContent({ ownerAccountId: user.userId, kind: input.kind, id: input.id }));
    if (input.action === 'delete' && Object.keys(input).every(key => ['action', 'kind', 'id', 'confirmId'].includes(key))) return json(await api.removeContent({ ownerAccountId: user.userId, kind: input.kind, id: input.id, confirmId: input.confirmId }));
    if (input.action === 'save' && Object.keys(input).every(key => ['action', 'package'].includes(key))) return json(await api.savePackage({ ownerAccountId: user.userId, package: input.package }));
    if (input.action === 'approve' && Object.keys(input).every(key => ['action', 'id', 'parentHash', 'version', 'sourceReviewAck', 'notes'].includes(key))) return json(await api.approvePackage({ actorAccountId: user.userId, isRoot: isRootUser, id: input.id, parentHash: input.parentHash, version: input.version, sourceReviewAck: input.sourceReviewAck, notes: input.notes }));
    if (input.action === 'approve-plan' && Object.keys(input).length === 6 && Object.keys(input).every(key => ['action', 'packageRowId', 'packageVersion', 'packageHash', 'planHash', 'sourceReview'].includes(key))) return json(await api.approvePlan({ actorAccountId: user.userId, isRoot: isRootUser, packageRowId: input.packageRowId, packageVersion: input.packageVersion, packageHash: input.packageHash, planHash: input.planHash, sourceReview: input.sourceReview }));
    return fail('INVALID_BODY');
  } catch (error) {
    if (error?.message === 'INVALID_PACKAGE' && Array.isArray(error.validationErrors)) {
      return json({ error: 'INVALID_PACKAGE', errors: error.validationErrors }, 400);
    }
    const status = Object.hasOwn(RECOGNIZED_POST_ERRORS, error?.message) ? RECOGNIZED_POST_ERRORS[error.message] : undefined;
    if (typeof status === 'number') {
      return fail(error.message, typeof error.status === 'number' && error.status ? error.status : status);
    }
    return fail('LESSON_UNAVAILABLE', 503);
  }
}
