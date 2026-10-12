import { createHash } from 'node:crypto';
import catalogue from '../../content/lesson-catalogue.json' with { type: 'json' };
import { canonicalize } from './schema.js';
import { createGenerationScope } from './content-map.js';

export function resolveLessonGenerationScope(settings) {
  if (!Object.hasOwn(settings || {}, 'scope')) return undefined;
  const result = createGenerationScope(catalogue, settings.scope);
  if (!result.ok || result.scope.subject !== settings.subject || result.scope.grade !== settings.grade) throw Error('INVALID_SETTINGS');
  return result.scope;
}

export function generationScopeFingerprint({ source, settings, scope, model, endpoint }) {
  return createHash('sha256').update(canonicalize({ source: { id: source.id, sha256: source.sha256, parserRevision: source.parserRevision, extractionHash: source.extractionHash }, settings, scope, model, endpoint }), 'utf8').digest('hex');
}

export function requireLessonAIConsent(source, consent, { scopeFingerprint } = {}) {
  const keys = ['confirmed', 'sourceId', 'sourceSha256', 'parserRevision', 'extractionHash'];
  if (scopeFingerprint) keys.push('scopeFingerprint');
  if (!source || !consent || typeof consent !== 'object' || Array.isArray(consent) || Object.keys(consent).length !== keys.length || Object.keys(consent).some(key => !keys.includes(key)) || consent.confirmed !== true || typeof source.id !== 'string' || !source.id || !/^[0-9a-f]{64}$/.test(source.sha256 || '') || !/^[0-9a-f]{64}$/.test(source.extractionHash || '') || typeof source.parserRevision !== 'string' || !source.parserRevision || consent.sourceId !== source.id || consent.sourceSha256 !== source.sha256 || consent.parserRevision !== source.parserRevision || consent.extractionHash !== source.extractionHash || scopeFingerprint && consent.scopeFingerprint !== scopeFingerprint) throw Error('AI_CONSENT_REQUIRED');
}
