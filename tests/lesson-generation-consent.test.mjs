import assert from 'node:assert/strict';
import test from 'node:test';
import { requireLessonAIConsent, resolveLessonGenerationScope, generationScopeFingerprint } from '../lib/lesson/generation-consent.js';

const source = { id: 's', sha256: 'a'.repeat(64), extractionHash: 'b'.repeat(64), parserRevision: 'typed-v1' };
const consent = { confirmed: true, sourceId: source.id, sourceSha256: source.sha256, parserRevision: source.parserRevision, extractionHash: source.extractionHash };
const settings = { subject: 'math', grade: 11, slotMinutes: 20, scope: { lessonId: 'g11-sequences', sectionIds: ['tds-g11-38'] } };

test('legacy consent keeps exactly its five source-bound fields', () => {
  assert.doesNotThrow(() => requireLessonAIConsent(source, consent));
  assert.throws(() => requireLessonAIConsent(source, { ...consent, scopeFingerprint: 'x' }), /AI_CONSENT_REQUIRED/);
});

test('scoped consent binds authoritative catalogue selections, source, settings, model and endpoint', () => {
  const scope = resolveLessonGenerationScope(settings);
  assert.deepEqual(scope.objectiveCodes, ['T11.18', 'T11.19']);
  const input = { source, settings, scope, model: 'model', endpoint: 'https://provider.invalid/chat' };
  const scopeFingerprint = generationScopeFingerprint(input);
  assert.match(scopeFingerprint, /^[a-f0-9]{64}$/);
  assert.doesNotThrow(() => requireLessonAIConsent(source, { ...consent, scopeFingerprint }, { scopeFingerprint }));
  assert.throws(() => requireLessonAIConsent(source, consent, { scopeFingerprint }), /AI_CONSENT_REQUIRED/);
  for (const change of [{ model: 'other' }, { endpoint: 'https://other.invalid/chat' }, { source: { ...source, extractionHash: 'c'.repeat(64) } }, { settings: { ...settings, slotMinutes: 21 } }, { scope: { ...scope, objectiveCodes: ['FAKE'] } }]) assert.notEqual(generationScopeFingerprint({ ...input, ...change }), scopeFingerprint);
});

test('scope resolver rejects forged authority and unknown IDs while unscoped briefs stay unchanged', () => {
  assert.equal(resolveLessonGenerationScope({ subject: 'math', grade: 11, slotMinutes: 20 }), undefined);
  for (const scope of [null, { lessonId: 'missing', sectionIds: ['tds-g11-38'] }, { lessonId: 'g11-sequences', sectionIds: [] }, { ...settings.scope, objectiveCodes: ['FAKE'] }]) assert.throws(() => resolveLessonGenerationScope({ ...settings, scope }), /INVALID_SETTINGS/);
});
