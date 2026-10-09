import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { MAX_PROPOSAL_BYTES, normalizeLessonProposal } from '../lib/lesson/proposal-result.js';
import { lessonAIConfig, generateLessonCandidate } from '../lib/lesson/generation-provider.js';

const context = createContext({ Request, Response, URL, TextEncoder, TextDecoder, console, crypto: globalThis.crypto, JSON, Object, Error, Set, Array, Math });
const extraction = { schemaVersion: '1.0.0', id: 'extract-1', kind: 'docx', originalName: 'Toan 11 Day so.docx', sha256: 'a'.repeat(64), bytes: 100, status: 'needs_review', segments: [{ id: 'seg-1', kind: 'heading', text: 'Toán 11 Dãy số làm việc theo nhóm', start: 0, end: 36, lineStart: 1, lineEnd: 1 }], uncertainties: [], warnings: [] };
const extractionHash = createHash('sha256').update(JSON.stringify(extraction), 'utf8').digest('hex');
const source = { id: 'src-1', originalName: extraction.originalName, mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes: 100, sha256: extraction.sha256, status: 'ready', parserRevision: 'p5', extractionHash, extraction };

async function routeWith(sourceForOwner, { env = {}, generationImpl = {} } = {}) {
  const storage = new SyntheticModule(['db', 'getEnv'], function () { this.setExport('db', () => ({})); this.setExport('getEnv', () => env); }, { context });
  const access = new SyntheticModule(['resolveIdentity'], function () { this.setExport('resolveIdentity', req => { const id = req.headers.get('x-test-user'); return { user: id ? { userId: id, email: `${id}@test` } : null, isRootUser: false }; }); }, { context });
  const sourceService = new SyntheticModule(['createLessonSourceService'], function () { this.setExport('createLessonSourceService', () => ({ get: async owner => { const found = sourceForOwner(owner); if (!found) throw Error('NOT_FOUND'); return found; } })); }, { context });
  const parser = new SyntheticModule(['importDocx'], function () { this.setExport('importDocx', () => ({})); }, { context });
  const pdf = new SyntheticModule(['importPdf'], function () { this.setExport('importPdf', () => ({})); }, { context });
  const proposalResult = new SyntheticModule(['MAX_PROPOSAL_BYTES', 'normalizeLessonProposal'], function () { this.setExport('MAX_PROPOSAL_BYTES', MAX_PROPOSAL_BYTES); this.setExport('normalizeLessonProposal', normalizeLessonProposal); }, { context });
  const generation = new SyntheticModule(['createLessonGenerationService'], function () { this.setExport('createLessonGenerationService', () => ({ start: async () => { throw Error('INVALID_BODY'); }, get: async () => { throw Error('NOT_FOUND'); }, run: async () => { throw Error('NOT_FOUND'); }, ...generationImpl })); }, { context });
  const provider = new SyntheticModule(['lessonAIConfig', 'generateLessonCandidate'], function () { this.setExport('lessonAIConfig', lessonAIConfig); this.setExport('generateLessonCandidate', generateLessonCandidate); }, { context });
  const cache = new Map();
  async function load(path) {
    if (cache.has(path)) return cache.get(path);
    const normalized = path.replaceAll('\\', '/');
    let mod;
    if (normalized.endsWith('/lib/storage.js')) mod = storage;
    else if (normalized.endsWith('/lib/account-room-access.js')) mod = access;
    else if (normalized.endsWith('/lib/lesson/source-service.js')) mod = sourceService;
    else if (normalized.endsWith('/lib/lesson/import/docx.js')) mod = parser;
    else if (normalized.endsWith('/lib/lesson/import/pdf.js')) mod = pdf;
    else if (normalized.endsWith('/lib/lesson/proposal-result.js')) mod = proposalResult;
    else if (normalized.endsWith('/lib/lesson/generation-service.js')) mod = generation;
    else if (normalized.endsWith('/lib/lesson/generation-provider.js')) mod = provider;
    else mod = new SourceTextModule(await readFile(path, 'utf8'), { context, identifier: path });
    cache.set(path, mod); return mod;
  }
  const entryPath = resolve('app/api/lessons/proposal/route.js');
  const entry = await load(entryPath);
  await entry.link((specifier, parent) => load(resolve(dirname(parent.identifier), specifier)));
  await entry.evaluate();
  return entry.namespace;
}

test('proposal route enforces auth, owner isolation, and source readiness', async () => {
  const route = await routeWith(owner => owner === 'teacher-a' ? source : null);
  const url = 'https://test/api/lessons/proposal?sourceId=src-1';
  assert.equal((await route.GET(new Request(url))).status, 401);
  const foreign = await route.GET(new Request(url, { headers: { 'x-test-user': 'teacher-b' } }));
  assert.equal(foreign.status, 404);
  const response = await route.GET(new Request(url, { headers: { 'x-test-user': 'teacher-a' } }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.proposal.status, 'needs_review');
  assert.equal(body.proposal.source.extractionHash, extractionHash);
  assert.equal(body.proposal.recommendation.map, 'historical');
  assert.equal(body.proposal.requiresTeacherReview, true);
});

test('proposal route blocks pending source', async () => {
  const pending = { ...source, status: 'pending', extraction: undefined, extractionHash: null };
  const route = await routeWith(owner => owner === 'teacher-a' ? pending : null);
  const response = await route.GET(new Request('https://test/api/lessons/proposal?sourceId=src-1', { headers: { 'x-test-user': 'teacher-a' } }));
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: 'SOURCE_NOT_READY' });
});

test('proposal route fails closed when the stored extraction hash does not match', async () => {
  const route = await routeWith(owner => owner === 'teacher-a' ? { ...source, extractionHash: 'c'.repeat(64) } : null);
  const response = await route.GET(new Request('https://test/api/lessons/proposal?sourceId=src-1', { headers: { 'x-test-user': 'teacher-a' } }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'SOURCE_INTEGRITY_MISMATCH' });
});

test('proposal route POST keeps candidate validation owner-scoped and rejects injected fields', async () => {
  const route = await routeWith(owner => owner === 'teacher-a' ? source : null);
  const body = JSON.stringify({ sourceId: 'src-1', slotMinutes: 40, candidate: { package: {}, citations: [], injected: 'ignore me' } });
  const unauth = await route.POST(new Request('https://test/api/lessons/proposal', { method: 'POST', body }));
  assert.equal(unauth.status, 401);
  const foreign = await route.POST(new Request('https://test/api/lessons/proposal', { method: 'POST', headers: { 'x-test-user': 'teacher-b' }, body }));
  assert.equal(foreign.status, 404);
  const invalid = await route.POST(new Request('https://test/api/lessons/proposal', { method: 'POST', headers: { 'x-test-user': 'teacher-a' }, body }));
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error, 'INVALID_PROPOSAL');
});

test('proposal POST rejects string slotMinutes and oversized streams before source access', async () => {
  const route = await routeWith(owner => owner === 'teacher-a' ? source : null);
  const stringSlot = await route.POST(new Request('https://test/api/lessons/proposal', { method: 'POST', headers: { 'x-test-user': 'teacher-a' }, body: JSON.stringify({ sourceId: 'src-1', slotMinutes: '40', candidate: {} }) }));
  assert.equal(stringSlot.status, 400);
  assert.deepEqual(await stringSlot.json(), { error: 'INVALID_BODY' });
  let cancelled = false;
  const stream = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(256 * 1024 + 1)); }, cancel() { cancelled = true; } });
  const oversized = await route.POST(new Request('https://test/api/lessons/proposal', { method: 'POST', headers: { 'x-test-user': 'teacher-a' }, body: stream, duplex: 'half' }));
  assert.equal(oversized.status, 413);
  assert.equal(cancelled, true);
});

test('capabilities disclose the provider host without credentials and run forwards fresh consent', async () => {
  let received;
  const env = { LESSON_AI_ENABLED: 'true', LESSON_AI_ENDPOINT: 'https://provider.example.test/v1/chat?private=secret', LESSON_AI_MODEL: 'model-a', LESSON_AI_API_KEY: 'secret' };
  const route = await routeWith(() => source, { env, generationImpl: { run: async input => { received = input; if (!input.aiConsent) throw Error('AI_CONSENT_REQUIRED'); return { id: input.id, status: 'needs_review' }; } } });
  const headers = { 'x-test-user': 'teacher-a', 'content-type': 'application/json' };
  const capability = await (await route.GET(new Request('https://test/api/lessons/proposal?capabilities=true', { headers }))).json();
  assert.equal(capability.generation.providerHost, 'provider.example.test');
  assert.ok(!JSON.stringify(capability).includes('secret'));
  const denied = await route.POST(new Request('https://test/api/lessons/proposal', { method: 'POST', headers, body: JSON.stringify({ action: 'run', id: 'job-a' }) }));
  assert.equal(denied.status, 409);
  assert.deepEqual(await denied.json(), { error: 'AI_CONSENT_REQUIRED' });
  const aiConsent = { confirmed: true, sourceId: source.id, sourceSha256: source.sha256, parserRevision: source.parserRevision, extractionHash: source.extractionHash };
  const allowed = await route.POST(new Request('https://test/api/lessons/proposal', { method: 'POST', headers, body: JSON.stringify({ action: 'run', id: 'job-a', aiConsent }) }));
  assert.equal(allowed.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(received)), { ownerAccountId: 'teacher-a', id: 'job-a', aiConsent });
});

test('proposal errors never log source text or provider details', async () => {
  const logs = [];
  const priorConsole = context.console;
  context.console = { log: (...args) => logs.push(args), error: (...args) => logs.push(args), warn: (...args) => logs.push(args) };
  try {
    const route = await routeWith(() => { throw Error('SOURCE_TEACHING_SECRET'); });
    const response = await route.GET(new Request('https://test/api/lessons/proposal?sourceId=src-1', { headers: { 'x-test-user': 'teacher-a' } }));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'LESSON_PROPOSAL_UNAVAILABLE' });
    assert.deepEqual(logs, []);
  } finally { context.console = priorConsole; }
});
