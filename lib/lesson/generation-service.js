import { randomUUID, createHash } from 'node:crypto';
import { canonicalize } from './schema.js';
import { MAX_PROPOSAL_BYTES, normalizeLessonProposal } from './proposal-result.js';
import { assembleLessonOutline } from './generation-outline.js';
import { requireLessonAIConsent, resolveLessonGenerationScope, generationScopeFingerprint } from './generation-consent.js';
import { validateMultiGenerationScope } from './content-map.js';

const fail = code => { throw new Error(code); };
const fingerprint = value => createHash('sha256').update(canonicalize(value), 'utf8').digest('hex');
const SAFE_ERRORS = new Set(['AI_PROVIDER_NOT_CONFIGURED', 'AI_QUOTA_EXCEEDED', 'AI_TIMEOUT', 'AI_OUTPUT_TRUNCATED', 'AI_CONSENT_REQUIRED', 'INVALID_PROPOSAL', 'INVALID_PROPOSAL_CITATIONS', 'PROPOSAL_TOO_LARGE', 'SOURCE_NOT_READY', 'SOURCE_CHANGED', 'SOURCE_INTEGRITY_MISMATCH', 'SCOPE_SOURCE_MISMATCH']);
const RUN_TIMEOUT_MS = 120000;

// ponytail: repair preserves existing IDs/content; larger rewrites need a new draft.
function preservesDraft(before, after) {
  const fields = { objectives: ['statement', 'code'], tasks: ['prompt', 'branch'], hints: ['text', 'tier'], activities: [], evidenceRules: [] };
  for (const [collection, protectedFields] of Object.entries(fields)) {
    if (before.package[collection].length !== after.package[collection].length) return false;
    if (!before.package[collection].every((item, index) => {
      const next = after.package[collection].find(entity => entity.id === item.id);
      return next && protectedFields.every(field => {
        if (collection === 'hints' && field === 'text' && before.validation.errors.some(issue => issue.code === 'ERR_SCAFFOLD_PENALTY_FORBIDDEN' && issue.path === `hints[${index}].text`)) return true;
        return canonicalize(item[field]) === canonicalize(next[field]);
      });
    })) return false;
  }
  // ponytail: only broaden a rejected numeric task quote; provenance changes need a new draft.
  const numericTaskIds = new Set(before.validation.errors.filter(issue => issue.code === 'ERR_SOURCE_NUMERIC_MISMATCH').map(issue => /^tasks\[(\d+)\]\.prompt$/.exec(issue.path || '')).filter(Boolean).map(match => before.package.tasks[Number(match[1])]?.id).filter(Boolean));
  const quote = value => value.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (before.citations.length !== after.citations.length) return false;
  if (!before.citations.every(item => after.citations.some(next => canonicalize(item) === canonicalize(next) || numericTaskIds.has(item.entityId) && next.entityId === item.entityId && item.segmentId === next.segmentId && item.origin === 'source' && next.origin === 'source' && quote(next.quote).includes(quote(item.quote))))) return false;
  return before.package.tasks.every((task, index) => {
    const invalidEvaluation = before.validation.errors.some(issue => ['ERR_INVALID_TASK_EVALUATION', 'ERR_UNKNOWN_CHECKER'].includes(issue.code) && issue.path?.startsWith(`tasks[${index}].`));
    return invalidEvaluation || canonicalize(task.evaluation) === canonicalize(after.package.tasks.find(next => next.id === task.id).evaluation);
  });
}

export function createLessonGenerationService({ db, sourceService, generate, providerEndpoint, now = () => Date.now() }) {
  const query = (sql, ...args) => db.prepare(sql).bind(...args);
  const rowFor = (owner, id) => query('SELECT * FROM lesson_generation_jobs WHERE owner_account_id=? AND id=?', owner, id).first();
  const project = row => ({
    id: row.id, sourceId: row.source_id, sourceSha256: row.source_sha256, parserRevision: row.parser_revision,
    extractionHash: row.extraction_hash, settings: JSON.parse(row.settings_json),
    model: row.model, status: row.status, result: row.result_json ? JSON.parse(row.result_json) : undefined,
    errorCode: row.error_code || undefined, createdAt: row.created_at, updatedAt: row.updated_at,
    startedAt: row.started_at ?? undefined, completedAt: row.completed_at ?? undefined,
    ...(JSON.parse(row.settings_json).scope ? { scopeFingerprint: row.request_fingerprint } : {})
  });
  const matchesSource = (row, source) => source?.status === 'ready' && source.id === row.source_id && source.sha256 === row.source_sha256 && source.parserRevision === row.parser_revision && source.extractionHash === row.extraction_hash;
  function validateSettings(settings) {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings) || Object.keys(settings).some(key => !['slotMinutes', 'subject', 'grade', 'scope'].includes(key)) || !Number.isInteger(settings.slotMinutes) || settings.slotMinutes < 1 || settings.slotMinutes > 240 || !['math', 'literature', 'english'].includes(settings.subject) || ![10, 11, 12].includes(settings.grade)) fail('INVALID_SETTINGS');
    resolveLessonGenerationScope(settings);
    return structuredClone(settings);
  }
  function assertScopeSource(scope, source) {
    if (!scope) return;
    const normalize = text => String(text).normalize('NFC').toLocaleLowerCase('vi').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const text = normalize(source.extraction?.segments?.map(segment => segment.text).join(' ') || '');
    const names = scope.format === 'lesson-generation-scope-v2'
      ? scope.sections.flatMap(section => [section.lessonTitle, section.title.replace(/^Tiết\s*\d+\s*:\s*/i, '')])
      : [scope.title, ...scope.sections.map(section => (section.sourceTitle || section.title).replace(/^Tiết\s*\d+\s*:\s*/i, ''))];
    if (names.some(name => !text.includes(normalize(name)))) fail('SCOPE_SOURCE_MISMATCH');
  }
  async function consent({ ownerAccountId: owner, sourceId, settings, model }) {
    if (!owner) fail('AUTH_REQUIRED');
    if (typeof model !== 'string' || !model.trim() || model.length > 120) fail('INVALID_MODEL');
    const clean = validateSettings(settings), scope = resolveLessonGenerationScope(clean), source = await sourceService.get(owner, sourceId);
    if (source.status !== 'ready') fail('SOURCE_NOT_READY');
    assertScopeSource(scope, source);
    const aiConsent = { confirmed: false, sourceId: source.id, sourceSha256: source.sha256, parserRevision: source.parserRevision, extractionHash: source.extractionHash };
    if (scope) { if (!providerEndpoint) fail('AI_PROVIDER_NOT_CONFIGURED'); aiConsent.scopeFingerprint = generationScopeFingerprint({ source, settings: clean, scope, model, endpoint: providerEndpoint }); }
    return { aiConsent, ...(scope ? { scope } : {}) };
  }
  async function start({ ownerAccountId: owner, sourceId, requestId, settings, model }) {
    if (!owner) fail('AUTH_REQUIRED');
    if (typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(requestId)) fail('INVALID_REQUEST_ID');
    if (typeof model !== 'string' || !model.trim() || model.length > 120) fail('INVALID_MODEL');
    const validatedSettings = validateSettings(settings);
    const source = await sourceService.get(owner, sourceId);
    if (source.status !== 'ready' || !source.extractionHash || !source.parserRevision || !source.sha256) fail('SOURCE_NOT_READY');
    const scope = resolveLessonGenerationScope(validatedSettings);
    assertScopeSource(scope, source);
    if (scope && !providerEndpoint) fail('AI_PROVIDER_NOT_CONFIGURED');
    const requestFingerprint = scope ? generationScopeFingerprint({ source, settings: validatedSettings, scope, model, endpoint: providerEndpoint }) : fingerprint({ sourceId: source.id, sourceSha256: source.sha256, parserRevision: source.parserRevision, extractionHash: source.extractionHash, settings: validatedSettings, model });
    const time = now();
    // Quota is 20 generation attempts per owner per 24h, including failed/interrupted jobs.
    await query("INSERT INTO lesson_generation_jobs(id,owner_account_id,source_id,source_sha256,parser_revision,extraction_hash,request_id,request_fingerprint,settings_json,model,status,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,'queued',?,? WHERE (SELECT COUNT(*) FROM lesson_generation_jobs WHERE owner_account_id=? AND created_at>?)<20 AND EXISTS(SELECT 1 FROM lesson_sources WHERE id=? AND owner_account_id=? AND status='ready' AND sha256=? AND parser_revision=? AND extraction_hash=?) ON CONFLICT(owner_account_id,request_id) DO NOTHING", randomUUID(), owner, source.id, source.sha256, source.parserRevision, source.extractionHash, requestId, requestFingerprint, JSON.stringify(validatedSettings), model, time, time, owner, time - 86400000, source.id, owner, source.sha256, source.parserRevision, source.extractionHash).run();
    const row = await query('SELECT * FROM lesson_generation_jobs WHERE owner_account_id=? AND request_id=?', owner, requestId).first();
    if (!row) {
      if (!matchesSource({ source_id: source.id, source_sha256: source.sha256, parser_revision: source.parserRevision, extraction_hash: source.extractionHash }, await sourceService.get(owner, sourceId))) fail('SOURCE_CHANGED');
      fail('GENERATION_QUOTA_EXCEEDED');
    }
    if (row.request_fingerprint !== requestFingerprint) fail('REQUEST_ID_CONFLICT');
    return project(row);
  }
  async function get({ ownerAccountId: owner, id }) {
    if (!owner) fail('AUTH_REQUIRED');
    const row = await rowFor(owner, id);
    if (!row) fail('NOT_FOUND');
    if (row.status === 'running' && now() - row.started_at > RUN_TIMEOUT_MS) {
      await query("UPDATE lesson_generation_jobs SET status='interrupted',error_code='AI_OUTCOME_UNKNOWN',updated_at=? WHERE owner_account_id=? AND id=? AND status='running' AND started_at=?", now(), owner, id, row.started_at).run();
      return project(await rowFor(owner, id));
    }
    return project(row);
  }
  async function latest({ ownerAccountId: owner, sourceId }) {
    if (!owner) fail('AUTH_REQUIRED');
    const source = await sourceService.get(owner, sourceId);
    if (source.status !== 'ready') fail('SOURCE_NOT_READY');
    const row = await query("SELECT * FROM lesson_generation_jobs WHERE owner_account_id=? AND source_id=? AND source_sha256=? AND parser_revision=? AND extraction_hash=? AND status='needs_review' ORDER BY completed_at DESC,created_at DESC,id DESC LIMIT 1", owner, source.id, source.sha256, source.parserRevision, source.extractionHash).first();
    return row ? project(row) : null;
  }
  async function run({ ownerAccountId: owner, id, aiConsent }) {
    const current = await get({ ownerAccountId: owner, id });
    if (current.status !== 'queued') return current;
    const scoped = resolveLessonGenerationScope(current.settings), currentRow = scoped ? await rowFor(owner, id) : null;
    requireLessonAIConsent({ id: current.sourceId, sha256: current.sourceSha256, parserRevision: current.parserRevision, extractionHash: current.extractionHash }, aiConsent, currentRow ? { scopeFingerprint: currentRow.request_fingerprint } : {});
    const time = now();
    const claimed = await query("UPDATE lesson_generation_jobs SET status='running',started_at=?,updated_at=? WHERE owner_account_id=? AND id=? AND status='queued'", time, time, owner, id).run();
    if (!claimed.meta.changes) return get({ ownerAccountId: owner, id });
    const row = await rowFor(owner, id);
    try {
      if (typeof generate !== 'function') fail('AI_PROVIDER_NOT_CONFIGURED');
      const source = await sourceService.get(owner, row.source_id);
      if (!matchesSource(row, source)) fail('SOURCE_CHANGED');
      const settings = JSON.parse(row.settings_json);
      const scope = resolveLessonGenerationScope(settings);
      assertScopeSource(scope, source);
      if (scope && generationScopeFingerprint({ source, settings, scope, model: row.model, endpoint: providerEndpoint }) !== row.request_fingerprint) fail('AI_CONSENT_REQUIRED');
      const normalizeCandidate = candidate => {
        if (candidate?.format === 'lesson-outline-v1') candidate = assembleLessonOutline(candidate, { slotMinutes: settings.slotMinutes, subject: settings.subject, grade: settings.grade });
        if (candidate?.package && typeof candidate.package === 'object' && !Array.isArray(candidate.package)) {
          candidate.package.id = 'proposal-' + row.id;
          candidate.package.version = '1.0.0';
        }
        return normalizeLessonProposal({ source, candidate, slotMinutes: settings.slotMinutes });
      };
      const applySettingsErrors = result => {
        if (settings.subject && result.package.subject && result.package.subject !== settings.subject) {
          result.validation.ok = false;
          result.validation.errors.push({ code: 'ERR_PROPOSAL_SETTINGS_MISMATCH', path: 'subject', message: 'Generated subject differs from requested subject' });
        }
        if (settings.grade && result.package.grade && result.package.grade !== settings.grade) {
          result.validation.ok = false;
          result.validation.errors.push({ code: 'ERR_PROPOSAL_SETTINGS_MISMATCH', path: 'grade', message: 'Generated grade differs from requested grade' });
        }
        result.package.objectives.forEach((objective, index) => {
          const curriculumGrade = /^T(10|11|12)\.\d+$/.exec(objective.code || '');
          if (curriculumGrade && (settings.subject !== 'math' || Number(curriculumGrade[1]) !== settings.grade)) {
            result.validation.ok = false;
            result.validation.errors.push({ code: 'ERR_PROPOSAL_SETTINGS_MISMATCH', path: `objectives[${index}].code`, message: 'Source curriculum code differs from requested subject or grade' });
          }
        });
        if (scope) {
          result.scope = scope;
          result.uncertainties = [...new Set([...result.uncertainties, ...scope.uncertainties])];
          const codes = result.package.objectives.map(objective => objective.code);
          if (scope.format === 'lesson-generation-scope-v2') {
            const errors = validateMultiGenerationScope(scope, result.package);
            if (errors.length) { result.validation.ok = false; result.validation.errors.push(...errors); }
            if (scope.sections.some(section => !section.objectiveCodes.length)) result.uncertainties.push('OBJECTIVES_REQUIRE_TEACHER_CONFIRMATION');
          } else if (scope.objectiveCodes.length && (codes.length !== scope.objectiveCodes.length || scope.objectiveCodes.some(code => !codes.includes(code)))) {
            result.validation.ok = false;
            result.validation.errors.push({ code: 'ERR_PROPOSAL_SCOPE_MISMATCH', path: 'objectives', message: 'Generated objectives must match the selected source scope exactly.' });
          }
          if (!scope.objectiveCodes.length) {
            result.uncertainties.push('OBJECTIVES_REQUIRE_TEACHER_CONFIRMATION');
            if (codes.some(code => /^T(?:10|11|12)\.\d+$/.test(code) && !source.extraction.segments.some(segment => new RegExp('(?:^|[^A-Za-z0-9.])' + code.replace('.', '\\.') + '(?![A-Za-z0-9.])').test(segment.text)))) {
              result.validation.ok = false;
              result.validation.errors.push({ code: 'ERR_PROPOSAL_SCOPE_MISMATCH', path: 'objectives', message: 'Unverified sections cannot invent official curriculum objective codes absent from the source.' });
            }
          }
        }
        return result;
      };
      let candidate = await generate({ source, settings, model: row.model, aiConsent, ...(scope ? { scope } : {}) });
      let repairUsed = false;
      let result;
      try {
        result = applySettingsErrors(normalizeCandidate(candidate));
      } catch (firstError) {
        if (!['INVALID_PROPOSAL', 'INVALID_PROPOSAL_CITATIONS'].includes(firstError?.message)) throw firstError;
        repairUsed = true;
        candidate = await generate({ source, settings, model: row.model, aiConsent, ...(scope ? { scope } : {}), repairErrors: [firstError.message], repairCandidate: structuredClone(candidate) });
        result = applySettingsErrors(normalizeCandidate(candidate));
      }
      if (!result.validation.ok && !repairUsed) {
        repairUsed = true;
        try {
          const repaired = await generate({ source, settings, model: row.model, aiConsent, ...(scope ? { scope } : {}), repairErrors: result.validation.errors.map(issue => issue.code + ': ' + issue.message), repairCandidate: structuredClone(candidate) });
          const repairedResult = applySettingsErrors(normalizeCandidate(repaired));
          if (!preservesDraft(result, repairedResult)) result.uncertainties.push('AI_REPAIR_CONTENT_CHANGED');
          else if (!repairedResult.validation.ok) result.uncertainties.push('AI_REPAIR_REJECTED');
          else result = repairedResult;
        } catch {
          result.uncertainties.push('AI_REPAIR_FAILED');
        }
      }
      const serialized = JSON.stringify(result);
      if (new TextEncoder().encode(serialized).byteLength > MAX_PROPOSAL_BYTES) fail('PROPOSAL_TOO_LARGE');
      if (!matchesSource(row, await sourceService.get(owner, row.source_id))) fail('SOURCE_CHANGED');
      const committed = await query("UPDATE lesson_generation_jobs SET status='needs_review',result_json=?,error_code=NULL,updated_at=?,completed_at=? WHERE owner_account_id=? AND id=? AND status='running' AND started_at=? AND EXISTS(SELECT 1 FROM lesson_sources WHERE id=? AND owner_account_id=? AND status='ready' AND sha256=? AND parser_revision=? AND extraction_hash=?)", serialized, now(), now(), owner, id, time, row.source_id, owner, row.source_sha256, row.parser_revision, row.extraction_hash).run();
      if (!committed.meta.changes) fail('SOURCE_CHANGED');
    } catch (error) {
      const code = SAFE_ERRORS.has(error?.message) ? error.message : 'AI_GENERATION_FAILED';
      const completed = now();
      await query("UPDATE lesson_generation_jobs SET status='failed',error_code=?,updated_at=?,completed_at=? WHERE owner_account_id=? AND id=? AND status='running' AND started_at=?", code, completed, completed, owner, id, time).run();
    }
    return get({ ownerAccountId: owner, id });
  }
  return { start, get, latest, run, consent };
}
