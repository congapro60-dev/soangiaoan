import { loadStoredAI } from '../../../../lib/ai-settings.js';
import { db, getEnv } from '../../../../lib/storage.js';
import { resolveIdentity } from '../../../../lib/account-room-access.js';
import { createLessonSourceService } from '../../../../lib/lesson/source-service.js';
import { importDocx } from '../../../../lib/lesson/import/docx.js';
import { importPdf } from '../../../../lib/lesson/import/pdf.js';
import { buildLessonProposal } from '../../../../lib/lesson/proposal.js';
import { MAX_PROPOSAL_BYTES, normalizeLessonProposal } from '../../../../lib/lesson/proposal-result.js';
import { createLessonGenerationService } from '../../../../lib/lesson/generation-service.js';
import { lessonAIConfig, generateLessonCandidate } from '../../../../lib/lesson/generation-provider.js';

export const dynamic = 'force-dynamic';
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const statuses = { AUTH_REQUIRED: 401, INVALID_QUERY: 400, INVALID_BODY: 400, INVALID_PROPOSAL: 400, INVALID_PROPOSAL_CITATIONS: 400, INVALID_SLOT_MINUTES: 400, INVALID_SETTINGS: 400, INVALID_REQUEST_ID: 400, INVALID_MODEL: 400, PROPOSAL_TOO_LARGE: 413, NOT_FOUND: 404, SOURCE_NOT_READY: 409, REQUEST_ID_CONFLICT: 409, SOURCE_CHANGED: 409, SCOPE_SOURCE_MISMATCH: 409, SOURCE_STORAGE_UNAVAILABLE: 503, SOURCE_INTEGRITY_MISMATCH: 503, GENERATION_QUOTA_EXCEEDED: 429, AI_PROVIDER_NOT_CONFIGURED: 503, AI_CONSENT_REQUIRED: 409, AI_QUOTA_EXCEEDED: 503, AI_TIMEOUT: 504, AI_OUTCOME_UNKNOWN: 409, AI_GENERATION_FAILED: 503 };
const error = issue => Object.hasOwn(statuses, issue?.message) ? json({ error: issue.message }, statuses[issue.message]) : json({ error: 'LESSON_PROPOSAL_UNAVAILABLE' }, 503);
statuses.CONFIRM_REQUIRED = 409;
statuses.GENERATION_RUNNING = 409;
const service = () => createLessonSourceService({ db: db(), bucket: getEnv().LESSON_SOURCES, importDocx, importPdf });
const jobs = () => createLessonGenerationService({ db: db(), sourceService: service(), providerEndpoint: lessonAIConfig(getEnv())?.endpoint, generate: input => generateLessonCandidate(input, { env: getEnv() }) });
async function verifyExtractionHash(extraction, expectedHash) {
  const bytes = new TextEncoder().encode(JSON.stringify(extraction));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const actual = [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (actual !== expectedHash) throw Error('SOURCE_INTEGRITY_MISMATCH');
}
async function readBody(request) {
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_PROPOSAL_BYTES)) throw Error('PROPOSAL_TOO_LARGE');
  const reader = request.body?.getReader();
  if (!reader) throw Error('INVALID_BODY');
  const chunks = []; let size = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_PROPOSAL_BYTES) { await reader.cancel(); throw Error('PROPOSAL_TOO_LARGE'); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw Error('INVALID_BODY'); }
}

export async function GET(request) {
  const { user } = resolveIdentity(request, getEnv());
  if (!user) return json({ error: 'AUTH_REQUIRED' }, 401);
  try {
    if (new URL(request.url).searchParams.get('kind') === 'list') return json({ jobs: await jobs().list(user.userId) });
    await loadStoredAI(db);
    const query = new URL(request.url).searchParams;
    if (query.get('capabilities') === 'true') {
      const config = lessonAIConfig(getEnv());
      return json({ generation: { configured: Boolean(config), model: config?.model || null, providerHost: config ? new URL(config.endpoint).host : null } });
    }
    const jobId = query.get('jobId');
    if (jobId) return json({ job: await jobs().get({ ownerAccountId: user.userId, id: jobId }) });
    const sourceId = query.get('sourceId');
    if (!sourceId) throw Error('INVALID_QUERY');
    if (query.get('latest') === 'true') return json({ job: await jobs().latest({ ownerAccountId: user.userId, sourceId }) });
    const source = await service().get(user.userId, sourceId);
    if (source.status !== 'ready' || !source.extraction || !source.extractionHash || !source.parserRevision) throw Error('SOURCE_NOT_READY');
    await verifyExtractionHash(source.extraction, source.extractionHash);
    return json({ proposal: buildLessonProposal({ extraction: source.extraction, sourceId: source.id, parserRevision: source.parserRevision, extractionHash: source.extractionHash }) });
  } catch (issue) {
    return error(issue);
  }
}

export async function POST(request) {
  const { user } = resolveIdentity(request, getEnv());
  if (!user) return json({ error: 'AUTH_REQUIRED' }, 401);
  try {
    const body = await readBody(request);
    if (body?.action === 'restore') {
      if (Object.keys(body).some(key => !['action', 'id'].includes(key))) throw Error('INVALID_BODY');
      return json(await jobs().restore({ ownerAccountId: user.userId, id: body.id }));
    }
    if (body?.action === 'delete') {
      if (Object.keys(body).some(key => !['action', 'id', 'confirmId'].includes(key))) throw Error('INVALID_BODY');
      return json(await jobs().remove({ ownerAccountId: user.userId, id: body.id, confirmId: body.confirmId }));
    }
    await loadStoredAI(db);
    if (body?.action === 'consent') {
      if (Object.keys(body).some(key => !['action', 'sourceId', 'settings'].includes(key)) || typeof body.sourceId !== 'string') throw Error('INVALID_BODY');
      const config = lessonAIConfig(getEnv());
      if (!config) throw Error('AI_PROVIDER_NOT_CONFIGURED');
      return json({ ...await jobs().consent({ ownerAccountId: user.userId, sourceId: body.sourceId, settings: body.settings, model: config.model }), generation: { model: config.model, providerHost: new URL(config.endpoint).host } });
    }
    if (body?.action === 'start') {
      if (Object.keys(body).some(key => !['action', 'sourceId', 'requestId', 'settings'].includes(key)) || typeof body.sourceId !== 'string' || typeof body.requestId !== 'string') throw Error('INVALID_BODY');
      const config = lessonAIConfig(getEnv());
      if (!config) throw Error('AI_PROVIDER_NOT_CONFIGURED');
      return json({ job: await jobs().start({ ownerAccountId: user.userId, sourceId: body.sourceId, requestId: body.requestId, settings: body.settings, model: config.model }) }, 202);
    }
    if (body?.action === 'run') {
      if (Object.keys(body).some(key => !['action', 'id', 'aiConsent'].includes(key)) || typeof body.id !== 'string') throw Error('INVALID_BODY');
      return json({ job: await jobs().run({ ownerAccountId: user.userId, id: body.id, aiConsent: body.aiConsent }) });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.sourceId !== 'string' || !body.sourceId || !body.candidate || Object.keys(body).some(key => !['sourceId', 'candidate', 'slotMinutes'].includes(key)) || (body.slotMinutes !== undefined && !Number.isInteger(body.slotMinutes))) throw Error('INVALID_BODY');
    const source = await service().get(user.userId, body.sourceId);
    if (source.status !== 'ready' || !source.extraction || !source.extractionHash || !source.parserRevision) throw Error('SOURCE_NOT_READY');
    await verifyExtractionHash(source.extraction, source.extractionHash);
    return json({ proposal: normalizeLessonProposal({ source, candidate: body.candidate, slotMinutes: body.slotMinutes ?? 40 }) });
  } catch (issue) {
    return error(issue);
  }
}
