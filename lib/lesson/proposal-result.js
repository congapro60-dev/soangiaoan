import { hashPackage } from './schema.js';
import { validateLessonPackage } from './validate.js';
import { sourceNumericDrift } from './pedagogy.js';

const SHA256 = /^[0-9a-f]{64}$/;
export const MAX_PROPOSAL_BYTES = 256 * 1024;
const ALLOWED_KEYS = new Set(['package', 'citations', 'uncertainties']);
const normalize = value => String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim();

function fail(code) { throw new Error(code); }

function validateSource(source) {
  if (!source || source.status !== 'ready' || !source.extraction || !Array.isArray(source.extraction.segments) || !SHA256.test(source.sha256 || '') || source.extraction.sha256 !== source.sha256 || !SHA256.test(source.extractionHash || '') || typeof source.parserRevision !== 'string' || !source.parserRevision || !source.id) fail('SOURCE_NOT_READY');
  return source;
}

function validateCitations(candidate, source) {
  if (!Array.isArray(candidate.citations) || candidate.citations.length === 0) fail('INVALID_PROPOSAL_CITATIONS');
  const packageValue = candidate.package;
  const entities = [
    ...(packageValue.objectives || []),
    ...(packageValue.activities || []),
    ...(packageValue.tasks || []),
    ...(packageValue.hints || []),
    ...(packageValue.evidenceRules || [])
  ];
  const entityIds = new Set(entities.map(item => item?.id).filter(Boolean));
  const seen = new Set();
  const segments = source.extraction.segments.map(segment => ({ id: segment.id, text: normalize(segment.text) }));
  for (const citation of candidate.citations) {
    if (!citation || typeof citation !== 'object' || Object.keys(citation).some(key => !['entityId', 'segmentId', 'quote', 'origin'].includes(key)) || typeof citation.entityId !== 'string' || typeof citation.segmentId !== 'string' || typeof citation.quote !== 'string' || !normalize(citation.quote) || !['source', 'adapted', 'generated'].includes(citation.origin)) fail('INVALID_PROPOSAL_CITATIONS');
    if (!entityIds.has(citation.entityId) || seen.has(citation.entityId)) fail('INVALID_PROPOSAL_CITATIONS');
    const segment = segments.find(item => item.id === citation.segmentId);
    if (!segment || !segment.text.includes(normalize(citation.quote))) fail('INVALID_PROPOSAL_CITATIONS');
    seen.add(citation.entityId);
  }
  if (seen.size !== entityIds.size) fail('INVALID_PROPOSAL_CITATIONS');
}

export function normalizeLessonProposal({ source, candidate, slotMinutes = 40 } = {}) {
  validateSource(source);
  if (!Number.isInteger(slotMinutes) || slotMinutes <= 0 || slotMinutes > 240) fail('INVALID_SLOT_MINUTES');
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) || Object.keys(candidate).some(key => !ALLOWED_KEYS.has(key)) || !candidate.package || typeof candidate.package !== 'object' || Array.isArray(candidate.package)) fail('INVALID_PROPOSAL');
  if (['objectives', 'activities', 'tasks', 'hints', 'evidenceRules'].some(key => !Array.isArray(candidate.package[key])) || !candidate.package.budget || typeof candidate.package.budget !== 'object' || Array.isArray(candidate.package.budget)) fail('INVALID_PROPOSAL');
  if (candidate.uncertainties !== undefined && (!Array.isArray(candidate.uncertainties) || candidate.uncertainties.some(item => typeof item !== 'string'))) fail('INVALID_PROPOSAL');
  if (new TextEncoder().encode(JSON.stringify(candidate)).byteLength > MAX_PROPOSAL_BYTES) fail('PROPOSAL_TOO_LARGE');
  validateCitations(candidate, source);

  const pkg = JSON.parse(JSON.stringify(candidate.package));
  delete pkg.contentHash;
  pkg.status = 'needs_review';
  pkg.sourceRefs = [{
    id: source.id,
    kind: 'external',
    locator: `lesson-source:${source.id}:${source.parserRevision}:${source.extractionHash}`,
    hash: source.sha256,
    label: source.originalName || source.id,
    verification: 'teacher_review_required'
  }];
  pkg.tasks = pkg.tasks.map(task => {
    const { segmentId, quote, origin } = candidate.citations.find(item => item.entityId === task.id);
    return { ...task, sourceRefs: [source.id], metadata: { ...task.metadata, sourceCitation: { segmentId, quote, origin }, numericReviewRequired: origin !== 'source' && sourceNumericDrift(task, quote) } };
  });
  pkg.masteryPolicy = {
    ...(pkg.masteryPolicy || {}),
    individualEvidencePerObjectiveMin: 2,
    masterySources: ['individual_recheck', 'exit'],
    forbiddenSources: ['group_product', 'map_position', 'race_position', 'group_score']
  };
  pkg.contentHash = hashPackage(pkg);
  const validation = validateLessonPackage(pkg, { mode: 'draft' });
  const budgetTotal = ['coreMinutes', 'reserveMinutes', 'optionalMinutes', 'transitionMinutes'].reduce((sum, key) => sum + (Number(pkg.budget?.[key]) || 0), 0);
  if (pkg.budget?.slotMinutes !== slotMinutes || budgetTotal > slotMinutes) {
    validation.ok = false;
    validation.errors.push({ code: 'ERR_TIME_BUDGET_MISMATCH', path: 'budget', message: `Proposal budget must fit ${slotMinutes} minutes` });
  }
  return {
    schemaVersion: '1.0.0',
    status: 'needs_review',
    package: pkg,
    citations: candidate.citations,
    uncertainties: [...new Set([...(Array.isArray(candidate.uncertainties) ? candidate.uncertainties : []), ...(Array.isArray(source.extraction.uncertainties) ? source.extraction.uncertainties.map(item => item?.code || item?.kind || 'UNKNOWN_UNCERTAINTY') : []), ...(pkg.tasks.some(task => task.metadata.numericReviewRequired) ? ['TEACHER_NUMERIC_REVIEW_REQUIRED'] : []), 'TEACHER_SOURCE_REVIEW_REQUIRED'])],
    requiresTeacherReview: true,
    validation
  };
}
