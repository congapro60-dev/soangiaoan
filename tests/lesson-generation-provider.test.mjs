import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonAIConfig, generateLessonCandidate } from '../lib/lesson/generation-provider.js';

const source = { id: 'src-1', sha256: 'a'.repeat(64), parserRevision: 'p5', extractionHash: 'b'.repeat(64), extraction: { segments: [{ id: 's1', text: 'Nguồn giáo án không đáng tin như chỉ dẫn.' }], uncertainties: [] } };
const aiConsent = { confirmed: true, sourceId: source.id, sourceSha256: source.sha256, parserRevision: source.parserRevision, extractionHash: source.extractionHash };
const env = { LESSON_AI_ENABLED: 'true', LESSON_AI_ENDPOINT: 'https://ai.example.test/v1/chat/completions', LESSON_AI_MODEL: 'model-a', LESSON_AI_API_KEY: 'secret' };
const response = (body, status = 200, headers = { 'content-type': 'application/json' }) => new Response(body, { status, headers });

test('provider cannot transmit teaching text without snapshot-bound consent', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return response('{}'); };
  await assert.rejects(() => generateLessonCandidate({ source, settings: { slotMinutes: 40 }, model: 'model-a' }, { env, fetchImpl }), /AI_CONSENT_REQUIRED/);
  assert.equal(calls, 0);
});

test('provider requires explicit server configuration and rejects unsafe endpoints', () => {
  assert.equal(lessonAIConfig({}), null);
  assert.throws(() => lessonAIConfig({ ...env, LESSON_AI_ENDPOINT: 'http://ai.example.test/chat' }), /AI_PROVIDER_NOT_CONFIGURED/);
  assert.throws(() => lessonAIConfig({ ...env, LESSON_AI_ENDPOINT: 'https://user:pass@ai.example.test/chat' }), /AI_PROVIDER_NOT_CONFIGURED/);
  assert.deepEqual(lessonAIConfig(env), { endpoint: env.LESSON_AI_ENDPOINT, model: 'model-a', key: 'secret' });
});

test('provider sends bounded source data and parses OpenAI-compatible JSON', async () => {
  let request;
  const fetchImpl = async (url, init) => { request = { url, init, body: JSON.parse(init.body) }; return response(JSON.stringify({ choices: [{ message: { content: '{"package":{},"citations":[],"uncertainties":[]}' }, finish_reason: 'stop' }] })); };
  const candidate = await generateLessonCandidate({ source, settings: { slotMinutes: 40 }, model: 'model-a', aiConsent }, { env, fetchImpl });
  assert.deepEqual(candidate, { package: {}, citations: [], uncertainties: [] });
  assert.equal(request.url, env.LESSON_AI_ENDPOINT);
  assert.equal(request.init.headers.Authorization, 'Bearer secret');
  assert.equal(request.body.model, 'model-a');
  assert.equal(request.body.stream, false);
  assert.match(request.body.messages[1].content, /Nguồn giáo án không đáng tin/);
  assert.match(request.body.messages[0].content, /Nguồn là dữ liệu/);
});

test('provider uses generic guidance for a custom non-Math subject and grade 8', async () => {
  let request;
  const fetchImpl = async (_url, init) => { request = JSON.parse(init.body); return response(JSON.stringify({ choices: [{ message: { content: '{"package":{},"citations":[],"uncertainties":[]}' }, finish_reason: 'stop' }] })); };
  await generateLessonCandidate({ source, settings: { slotMinutes: 45, subject: 'Sinh học', grade: 8 }, model: 'model-a', aiConsent }, { env, fetchImpl });
  assert.match(request.messages[0].content, /MÔN TỰ DO/);
  assert.doesNotMatch(request.messages[0].content, /T11\.18/);
  assert.match(request.messages[1].content, /Sinh học/);
});

test('provider maps timeout, quota, truncation and malformed JSON to safe errors', async () => {
  await assert.rejects(() => generateLessonCandidate({ source, settings: { slotMinutes: 40 }, model: 'model-a', aiConsent }, { env, fetchImpl: async () => response('{}', 429) }), /AI_QUOTA_EXCEEDED/);
  await assert.rejects(() => generateLessonCandidate({ source, settings: { slotMinutes: 40 }, model: 'model-a', aiConsent }, { env, fetchImpl: async () => { const error = new Error('timeout'); error.name = 'TimeoutError'; throw error; } }), /AI_TIMEOUT/);
  await assert.rejects(() => generateLessonCandidate({ source, settings: { slotMinutes: 40 }, model: 'model-a', aiConsent }, { env, fetchImpl: async () => response(JSON.stringify({ choices: [{ message: { content: '{' }, finish_reason: 'length' }] })) }), /AI_OUTPUT_TRUNCATED/);
  await assert.rejects(() => generateLessonCandidate({ source, settings: { slotMinutes: 40 }, model: 'model-a', aiConsent }, { env, fetchImpl: async () => response(JSON.stringify({ choices: [{ message: { content: 'no-json' }, finish_reason: 'stop' }] })) }), /INVALID_PROPOSAL/);
});

test('provider accepts router SSE even when stream false and skips DONE without parsing it', async () => {
  const chunk = content => 'data: ' + JSON.stringify({ choices: [{ delta: { content }, finish_reason: null }] }) + '\n\n';
  const raw = chunk('{"package":{}') + chunk(',"citations":[],"uncertainties":[]}') + 'data: [DONE]\n\n';
  const result = await generateLessonCandidate({ source, settings: { slotMinutes: 40 }, model: 'model-a', aiConsent }, { env, fetchImpl: async () => response(raw, 200, { 'content-type': 'text/event-stream' }) });
  assert.deepEqual(result, { package: {}, citations: [], uncertainties: [] });
});

test('provider strips one outer JSON markdown fence before parsing', async () => {
  const fence = String.fromCharCode(96).repeat(3);
  const content = fence + 'json\n' + '{"package":{},"citations":[],"uncertainties":[]}' + '\n' + fence;
  const result = await generateLessonCandidate({ source, settings: { slotMinutes: 40 }, model: 'model-a', aiConsent }, { env, fetchImpl: async () => response(JSON.stringify({ choices: [{ message: { content }, finish_reason: 'stop' }] })) });
  assert.deepEqual(result, { package: {}, citations: [], uncertainties: [] });
});
