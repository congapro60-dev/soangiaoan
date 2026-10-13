import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir } from 'node:fs/promises';
import { createLessonGenerationService } from '../lib/lesson/generation-service.js';
import { generateLessonCandidate } from '../lib/lesson/generation-provider.js';
import { generationScopeFingerprint, resolveLessonGenerationScope } from '../lib/lesson/generation-consent.js';
import catalogue from '../content/lesson-catalogue.json' with { type: 'json' };

const source = { id: 'src', status: 'ready', sha256: 'a'.repeat(64), parserRevision: 'typed-v1', extractionHash: 'b'.repeat(64), extraction: { segments: [{ id: 's1', text: 'Toán 11 Dãy số' }], uncertainties: [] } };
const settings = { slotMinutes: 40, subject: 'math', grade: 11 };
const env = { LESSON_AI_ENABLED: 'true', LESSON_AI_ENDPOINT: 'https://provider.invalid/chat', LESSON_AI_MODEL: 'fake-model', LESSON_AI_API_KEY: 'FAKE_ONLY' };
const legacyConsent = { confirmed: true, sourceId: source.id, sourceSha256: source.sha256, parserRevision: source.parserRevision, extractionHash: source.extractionHash };

async function fixture() {
  const database = new DatabaseSync(':memory:');
  for (const file of (await readdir(new URL('../drizzle/', import.meta.url))).filter(name => /^\d{4}_.*\.sql$/.test(name)).sort()) database.exec(await readFile(new URL('../drizzle/' + file, import.meta.url), 'utf8'));
  database.prepare('INSERT INTO accounts(id,email,created_at)VALUES(?,?,?)').run('teacher', 'purpose@example.invalid', 0);
  database.prepare('INSERT INTO lesson_sources(id,owner_account_id,request_id,request_fingerprint,original_name,mime,bytes,sha256,status,parser_revision,extraction_hash,created_at,updated_at)VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(source.id, 'teacher', 'upload', 'c'.repeat(64), 'brief.txt', 'text/plain', 20, source.sha256, 'ready', source.parserRevision, source.extractionHash, 0, 0);
  const db = { prepare: sql => ({ bind: (...args) => ({ first: () => database.prepare(sql).get(...args) || null, run: () => ({ meta: { changes: Number(database.prepare(sql).run(...args).changes) } }) }) }) };
  const service = createLessonGenerationService({ db, sourceService: { get: async () => source }, providerEndpoint: env.LESSON_AI_ENDPOINT, generate: async () => { throw Error('AI_TIMEOUT'); } });
  return { database, service };
}
const input = { ownerAccountId: 'teacher', sourceId: source.id, model: env.LESSON_AI_MODEL };

test('purpose boundary accepts only three teaching purposes; exams have their own flow', async () => {
  const { database, service } = await fixture();
  for (const purpose of ['exam', 'other', null, 1, {}, 'Formation', '']) {
    assert.throws(() => resolveLessonGenerationScope({ ...settings, purpose }), /INVALID_SETTINGS/);
    await assert.rejects(() => service.start({ ...input, requestId: 'invalid', settings: { ...settings, purpose } }), /INVALID_SETTINGS/);
  }
  assert.equal(database.prepare('SELECT count(*) n FROM lesson_generation_jobs').get().n, 0);
  for (const purpose of ['formation', 'practice', 'review']) {
    const job = await service.start({ ...input, requestId: purpose, settings: { ...settings, purpose } });
    assert.equal(job.settings.purpose, purpose);
  }
});

test('purpose affects durable request and consent even without catalogue scope', async () => {
  const { service } = await fixture();
  const selected = { ...settings, purpose: 'practice' };
  const binding = await service.consent({ ...input, settings: selected });
  const job = await service.start({ ...input, requestId: 'one', settings: selected });
  assert.equal(job.scopeFingerprint, binding.aiConsent.scopeFingerprint);
  const other = await service.consent({ ...input, settings: { ...settings, purpose: 'review' } });
  assert.notEqual(other.aiConsent.scopeFingerprint, binding.aiConsent.scopeFingerprint);
  await assert.rejects(() => service.start({ ...input, requestId: 'one', settings: { ...settings, purpose: 'review' } }), /REQUEST_ID_CONFLICT/);
  await assert.rejects(() => service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent: legacyConsent }), /AI_CONSENT_REQUIRED/);
  await assert.rejects(() => service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent: { ...other.aiConsent, confirmed: true } }), /AI_CONSENT_REQUIRED/);
  assert.equal((await service.get({ ownerAccountId: 'teacher', id: job.id })).status, 'queued');
});

test('purpose-free legacy requests retain source-only consent and unchanged settings', async () => {
  const { service } = await fixture();
  const binding = await service.consent({ ...input, settings });
  assert.deepEqual(binding, { aiConsent: { ...legacyConsent, confirmed: false } });
  const job = await service.start({ ...input, requestId: 'legacy', settings });
  assert.deepEqual(job.settings, settings);
  assert.deepEqual(await service.start({ ...input, requestId: 'legacy', settings: { ...settings, purpose: undefined } }), job);
  assert.equal(job.scopeFingerprint, undefined);
  const result = await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent: legacyConsent });
  assert.equal(result.errorCode, 'AI_TIMEOUT');
  let body;
  await generateLessonCandidate({ source, settings, model: env.LESSON_AI_MODEL, aiConsent: legacyConsent }, { env, fetchImpl: async (url, init) => { body = JSON.parse(init.body); return Response.json({ choices: [{ message: { content: '{}' }, finish_reason: 'stop' }] }); } });
  assert.doesNotMatch(body.messages[0].content, /LOẠI TIẾT:/);
  assert.deepEqual(JSON.parse(body.messages[1].content).settings, settings);
});

test('provider purpose directs teaching, preserves source bounds and rejects stale consent before sending', async () => {
  let calls = 0;
  for (const [purpose, label, emphasis] of [['formation', 'HÌNH THÀNH KIẾN THỨC', /hướng dẫn.*kiến thức mới/], ['practice', 'LUYỆN TẬP', /phần lớn thời lượng.*luyện tập/], ['review', 'ÔN TẬP', /kết nối.*truy hồi/]]) {
    const selected = { ...settings, purpose };
    const scopeFingerprint = generationScopeFingerprint({ source, settings: selected, model: env.LESSON_AI_MODEL, endpoint: env.LESSON_AI_ENDPOINT });
    const aiConsent = { ...legacyConsent, scopeFingerprint };
    let body;
    const fetchImpl = async (url, init) => { calls++; body = JSON.parse(init.body); return Response.json({ choices: [{ message: { content: '{}' }, finish_reason: 'stop' }] }); };
    await generateLessonCandidate({ source, settings: selected, model: env.LESSON_AI_MODEL, aiConsent }, { env, fetchImpl });
    assert.match(body.messages[0].content, new RegExp(label));
    assert.match(body.messages[0].content, emphasis);
    assert.match(body.messages[0].content, /không bịa mục tiêu/);
    assert.equal(JSON.parse(body.messages[1].content).settings.purpose, purpose);
    await assert.rejects(() => generateLessonCandidate({ source, settings: { ...selected, purpose: purpose === 'practice' ? 'review' : 'practice' }, model: env.LESSON_AI_MODEL, aiConsent }, { env, fetchImpl }), /AI_CONSENT_REQUIRED/);
  }
  assert.equal(calls, 3);
  await assert.rejects(() => generateLessonCandidate({ source, settings: { ...settings, purpose: 'exam' }, model: env.LESSON_AI_MODEL, aiConsent: legacyConsent }, { env, fetchImpl: async () => { calls++; } }), /INVALID_SETTINGS/);
  assert.equal(calls, 3);
});

test('catalogue scope remains authoritative and purpose changes its consent', () => {
  const scoped = { ...settings, scope: { lessonId: 'g11-sequences', sectionIds: ['tds-g11-38'] } };
  const scope = resolveLessonGenerationScope(scoped);
  const formation = generationScopeFingerprint({ source, settings: { ...scoped, purpose: 'formation' }, scope, model: env.LESSON_AI_MODEL, endpoint: env.LESSON_AI_ENDPOINT });
  const review = generationScopeFingerprint({ source, settings: { ...scoped, purpose: 'review' }, scope, model: env.LESSON_AI_MODEL, endpoint: env.LESSON_AI_ENDPOINT });
  assert.notEqual(formation, review);
  assert.deepEqual(resolveLessonGenerationScope({ ...scoped, purpose: 'review' }), scope);
});

test('multi-section scope does not override formation or practice with a review label', async () => {
  const scopeRequest = { selections: catalogue.lessons.slice(0, 2).map(lesson => ({ lessonId: lesson.id, sectionIds: [lesson.sections[0].id] })) };
  for (const purpose of ['formation', 'practice']) {
    const selected = { ...settings, purpose, scope: scopeRequest };
    const scope = resolveLessonGenerationScope(selected);
    const scopeFingerprint = generationScopeFingerprint({ source, settings: selected, scope, model: env.LESSON_AI_MODEL, endpoint: env.LESSON_AI_ENDPOINT });
    let prompt;
    await generateLessonCandidate({ source, settings: selected, model: env.LESSON_AI_MODEL, aiConsent: { ...legacyConsent, scopeFingerprint } }, { env, fetchImpl: async (url, init) => { prompt = JSON.parse(init.body).messages[0].content; return Response.json({ choices: [{ message: { content: '{}' }, finish_reason: 'stop' }] }); } });
    assert.match(prompt, /PHẠM VI NHIỀU BÀI/);
    assert.doesNotMatch(prompt, /ÔN TẬP NHIỀU BÀI|bản nháp ôn tập/);
  }
});
