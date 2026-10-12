import test from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import { variantCapabilities, variantSource, proposeExamVariants, checkNumberVariant } from '../lib/exam/variants.js';

const env = { LESSON_AI_ENABLED: 'true', LESSON_AI_ENDPOINT: 'https://ai.example.test/v1/chat/completions', LESSON_AI_MODEL: 'model-a', LESSON_AI_API_KEY: 'test-secret' };
const question = { id: '101_q1', section: 'III', label: 'Câu 1', type: 'short', points: .5, text: 'Cho cấp số cộng. Tìm số hạng thứ 5.', key: { accept: ['11'] } };
const consent = (source) => ({ confirmed: true, sourceId: source.id, sourceSha256: source.sha256, parserRevision: source.parserRevision, extractionHash: source.extractionHash });
const source = () => variantSource({ id: 'exam:101', questions: [question], model: 'model-a', providerHost: 'ai.example.test' });
const reply = (body) => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(body) } }] }), { headers: { 'content-type': 'application/json' } });
const candidate = { sourceId: question.id, question: { text: 'Đề AI chưa được tin.', key: { accept: ['14'] }, solution: 'Lời giải AI.' }, numeric: { family: 'arithmetic_term', a1: 2, d: 3, n: 5 }, machineChecked: true };

test('variant source hashes exact selected data, provider and model', async () => {
  const first = await source();
  assert.match(first.sha256, /^[a-f0-9]{64}$/);
  assert.equal(first.parserRevision, 'exam-variants-v1');
  assert.equal(first.sha256, (await source()).sha256);
  assert.notEqual(first.sha256, (await variantSource({ id: 'exam:101', questions: [{ ...question, text: 'changed' }], model: 'model-a', providerHost: 'ai.example.test' })).sha256);
  assert.notEqual(first.sha256, (await variantSource({ id: 'exam:101', questions: [question], model: 'other', providerHost: 'ai.example.test' })).sha256);
});

test('disabled capability, missing consent or changed source never call the provider', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return reply({ questions: [candidate] }); };
  const selected = await source();
  assert.equal(variantCapabilities({}).enabled, false);
  await assert.rejects(() => proposeExamVariants({ source: selected, model: 'model-a', aiConsent: consent(selected) }, { env: {}, fetchImpl }), /AI_PROVIDER_NOT_CONFIGURED/);
  await assert.rejects(() => proposeExamVariants({ source: selected, model: 'model-a' }, { env, fetchImpl }), /AI_CONSENT_REQUIRED/);
  await assert.rejects(() => proposeExamVariants({ source: { ...selected, questions: [{ ...question, text: 'changed' }] }, model: 'model-a', aiConsent: consent(selected) }, { env, fetchImpl }), /SOURCE_CHANGED/);
  await assert.rejects(() => proposeExamVariants({ source: selected, model: 'other', aiConsent: consent(selected) }, { env, fetchImpl }), /AI_PROVIDER_NOT_CONFIGURED/);
  assert.equal(calls, 0);
});

test('numeric verifier accepts declared arithmetic forms and rejects false or nonfinite keys', () => {
  const term = checkNumberVariant(question, candidate);
  assert.equal(term.check.status, 'checked');
  assert.equal(term.question.key.accept[0], '14');
  assert.match(term.question.text, /u_\{5\}/);
  assert.equal(checkNumberVariant({ ...question, text: 'Cho cấp số cộng. Tính tổng 5 số hạng đầu.' }, { ...candidate, numeric: { family: 'arithmetic_sum', a1: 2, d: 3, n: 5 }, question: { ...candidate.question, key: { accept: ['40'] } } }).check.status, 'checked');
  assert.equal(checkNumberVariant(question, { ...candidate, numeric: { family: 'arithmetic_sum', a1: 2, d: 3, n: 5 }, question: { ...candidate.question, key: { accept: ['40'] } } }).check.status, 'review');
  assert.equal(checkNumberVariant({ ...question, text: 'Cho cấp số cộng có số hạng đầu 2 và số hạng thứ 5 là 14. Tìm công sai.' }, candidate).check.status, 'review');
  const twelve = checkNumberVariant({ ...question, text: 'Cho cấp số cộng. Tính tổng 12 số hạng đầu.' }, { ...candidate, numeric: { family: 'arithmetic_sum', a1: 2, d: 3, n: 12 }, question: { ...candidate.question, key: { accept: ['222'] } } });
  const formula = /\$(S_[^$]+)\$/.exec(twelve.question.text)[1];
  assert.match(katex.renderToString(formula, { throwOnError: true, output: 'mathml' }), /<mn>12<\/mn>/);
  assert.match(twelve.question.solution, /S_\{12\}/);
  assert.equal(checkNumberVariant(question, { ...candidate, question: { ...candidate.question, key: { accept: ['999'] } } }).check.status, 'review');
  assert.equal(checkNumberVariant(question, { ...candidate, numeric: { ...candidate.numeric, n: Infinity } }).check.status, 'review');
  assert.equal(checkNumberVariant(question, { ...candidate, numeric: { ...candidate.numeric, n: 0 } }).check.status, 'review');
});

test('AI self certification cannot certify unsupported text, figures or proofs', () => {
  assert.equal(checkNumberVariant({ ...question, text: 'Tính biểu thức.' }, candidate).check.status, 'review');
  assert.equal(checkNumberVariant({ ...question, hasImage: true }, candidate).check.status, 'blocked');
  assert.equal(checkNumberVariant({ ...question, text: 'Chứng minh cấp số cộng.' }, candidate).check.status, 'blocked');
  assert.equal(checkNumberVariant({ ...question, questionImages: [{ id: 'figure' }] }, candidate).check.status, 'blocked');
  assert.equal(checkNumberVariant({ ...question, choiceImages: { A: 'figure' } }, candidate).check.status, 'blocked');
});

test('a given sum is not an instruction to compute a sum', () => {
  const source = { ...question, text: 'Cho cấp số cộng có số hạng đầu 2. Tính số hạng u_5, biết tổng S_3=9.' };
  const sum = { ...candidate, numeric: { family: 'arithmetic_sum', a1: 2, d: 3, n: 5 }, question: { ...candidate.question, key: { accept: ['40'] } } };
  assert.equal(checkNumberVariant(source, sum).check.status, 'review');
  assert.equal(checkNumberVariant({ ...question, text: 'Cho cấp số cộng. Tính tổng 5 số hạng đầu và tính số hạng u_5.' }, sum).check.status, 'review');
});

test('provider uses exact approved model, returns checked local drafts and never exposes credentials', async () => {
  const selected = await source();
  let sent;
  const result = await proposeExamVariants({ source: selected, model: 'model-a', aiConsent: consent(selected) }, { env, fetchImpl: async (url, init) => { sent = { url, init, body: JSON.parse(init.body) }; return reply({ questions: [candidate] }); } });
  assert.equal(sent.body.model, 'model-a');
  assert.equal(sent.init.redirect, 'manual');
  assert.match(sent.body.messages[0].content, /dữ liệu/);
  assert.equal(result.questions[0].check.status, 'checked');
  assert.doesNotMatch(JSON.stringify(result), /test-secret/);
});

test('provider response caps, invalid IDs and duplicate drafts fail closed', async () => {
  const selected = await source();
  const input = { source: selected, model: 'model-a', aiConsent: consent(selected) };
  await assert.rejects(() => proposeExamVariants(input, { env, fetchImpl: async () => reply({ questions: [candidate, candidate] }) }), /INVALID_PROPOSAL/);
  await assert.rejects(() => proposeExamVariants(input, { env, fetchImpl: async () => reply({ questions: [{ ...candidate, sourceId: 'other' }] }) }), /INVALID_PROPOSAL/);
  await assert.rejects(() => proposeExamVariants(input, { env, fetchImpl: async () => new Response('x'.repeat(300000)) }), /PROPOSAL_TOO_LARGE/);
  await assert.rejects(() => proposeExamVariants(input, { env, fetchImpl: async () => { throw Error('secret-provider-key=abc'); } }), (error) => error.message === 'AI_GENERATION_FAILED');
});

