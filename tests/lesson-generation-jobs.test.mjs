import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir } from 'node:fs/promises';
import { createLessonGenerationService } from '../lib/lesson/generation-service.js';

const source = { id: 'src-1', status: 'ready', sha256: 'a'.repeat(64), parserRevision: 'p5-binary-1', extractionHash: 'b'.repeat(64), originalName: 'lesson.docx', extraction: { sha256: 'a'.repeat(64), segments: [{ id: 's1', text: 'Toán 11 Dãy số' }], uncertainties: [] } };
const aiConsent = { confirmed: true, sourceId: source.id, sourceSha256: source.sha256, parserRevision: source.parserRevision, extractionHash: source.extractionHash };
const pilot = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));
const candidate = () => ({ package: structuredClone(pilot), citations: [...pilot.objectives, ...pilot.activities, ...pilot.tasks, ...pilot.hints, ...pilot.evidenceRules].map(entity => ({ entityId: entity.id, segmentId: 's1', quote: 'Toán 11 Dãy số', origin: 'adapted' })), uncertainties: [] });
const outlineCandidate = () => ({
  format: 'lesson-outline-v1', essentialQuestion: 'Tính một số hạng.',
  objectives: [{ statement: 'Tính số hạng.', source: { segmentId: 's1', quote: 'Toán 11 Dãy số', origin: 'adapted' } }],
  activities: ['experience', 'practice', 'recheck', 'recheck', 'exit'].map((phase, index) => ({
    phase, minutes: 8, participation: phase === 'practice' ? 'group' : 'individual', objectiveIndexes: [0],
    studentAction: 'Giải và giải thích.', expectedProduct: 'Kết quả.', teacherLookFor: 'Thay đúng chỉ số.',
    source: { segmentId: 's1', quote: 'Toán 11 Dãy số', origin: 'adapted' },
    tasks: [{ type: 'closed', prompt: 'Tính số hạng ở bước ' + (index + 1) + '.', minutes: 1, evaluation: { checkerId: 'numeric_exact', answerKey: 18 }, hints: ['Thay số vào công thức.'], source: { segmentId: 's1', quote: 'Toán 11 Dãy số', origin: 'adapted' } }]
  })),
  uncertainties: []
});

async function fixture({ generate = async () => candidate(), clock = () => 1000 } = {}) {
  const database = new DatabaseSync(':memory:');
  for (const file of (await readdir(new URL('../drizzle/', import.meta.url))).filter(name => /^\d{4}_.*\.sql$/.test(name)).sort()) database.exec(await readFile(new URL('../drizzle/' + file, import.meta.url), 'utf8'));
  database.exec('PRAGMA foreign_keys=ON');
  database.prepare('INSERT INTO accounts(id,email,created_at) VALUES(?,?,?)').run('teacher', 'teacher@example.invalid', 1);
  database.prepare('INSERT INTO lesson_sources(id,owner_account_id,request_id,request_fingerprint,original_name,mime,bytes,sha256,status,parser_revision,extraction_hash,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(source.id, 'teacher', 'source-upload', 'c'.repeat(64), source.originalName, 'application/pdf', 100, source.sha256, 'ready', source.parserRevision, source.extractionHash, 1, 1);
  const db = { prepare: sql => ({ bind: (...args) => { const stmt = database.prepare(sql); return { first: () => stmt.get(...args) || null, all: () => ({ results: stmt.all(...args) }), run: () => ({ meta: { changes: Number(stmt.run(...args).changes) } }) }; } }) };
  const sourceService = { get: async (owner, id) => { if (owner !== 'teacher' || id !== 'src-1') throw Error('NOT_FOUND'); return source; } };
  const service = createLessonGenerationService({ db, sourceService, generate, now: clock });
  return { database, service, sourceService };
}

test('latest saved draft recovers by owner and exact source snapshot without provider calls or writes', async () => {
  let calls=0;
  const {database,service}=await fixture({generate:async()=>{calls++;return candidate();}});
  assert.equal(await service.latest({ownerAccountId:'teacher',sourceId:source.id}),null);
  const input={ownerAccountId:'teacher',sourceId:source.id,settings:{slotMinutes:40,subject:'math',grade:11},model:'local-model'};
  const job=await service.start({...input,requestId:'saved'});
  const done=await service.run({ownerAccountId:'teacher',id:job.id,aiConsent});
  await service.start({...input,requestId:'queued-new'});
  const before=database.prepare('SELECT * FROM lesson_generation_jobs ORDER BY id').all();
  assert.deepEqual(await service.latest({ownerAccountId:'teacher',sourceId:source.id}),done);
  assert.equal(calls,1);
  assert.deepEqual(database.prepare('SELECT * FROM lesson_generation_jobs ORDER BY id').all(),before);
  await assert.rejects(()=>service.latest({ownerAccountId:'other',sourceId:source.id}),/NOT_FOUND/);
  await assert.rejects(()=>service.latest({sourceId:source.id}),/AUTH_REQUIRED/);
  database.prepare('UPDATE lesson_generation_jobs SET extraction_hash=? WHERE id=?').run('c'.repeat(64),job.id);
  assert.equal(await service.latest({ownerAccountId:'teacher',sourceId:source.id}),null);
});

test('queued generation requires fresh consent for its exact source before provider access', async () => {
  let calls = 0;
  const { database, service } = await fixture({ generate: async () => { calls++; return candidate(); } });
  const job = await service.start({ ownerAccountId: 'teacher', sourceId: source.id, requestId: 'consent', settings: { slotMinutes: 40, subject: 'math', grade: 11 }, model: 'local-model' });
  for (const aiConsent of [undefined, { confirmed: false }, { confirmed: true, sourceId: source.id, sourceSha256: source.sha256, parserRevision: source.parserRevision, extractionHash: 'c'.repeat(64) }]) {
    await assert.rejects(() => service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent }), /AI_CONSENT_REQUIRED/);
    assert.equal(database.prepare('SELECT status FROM lesson_generation_jobs WHERE id=?').get(job.id).status, 'queued');
    assert.equal(calls, 0);
  }
});

test('generation start is owner-scoped and idempotent by request plus source snapshot', async () => {
  const { database, service } = await fixture();
  const input = { ownerAccountId: 'teacher', sourceId: 'src-1', requestId: 'request-1', settings: { slotMinutes: 40, subject: 'math', grade: 11 }, model: 'local-model' };
  const a = await service.start(input);
  const b = await service.start(input);
  assert.equal(a.id, b.id);
  assert.equal(a.status, 'queued');
  assert.equal(database.prepare('SELECT count(*) AS n FROM lesson_generation_jobs').get().n, 1);
  await assert.rejects(() => service.start({ ...input, settings: { slotMinutes: 45, subject: 'math', grade: 11 } }), /REQUEST_ID_CONFLICT/);
  await assert.rejects(() => service.start({ ...input, ownerAccountId: 'other' }), /NOT_FOUND/);
});

test('one job run calls generate once and polls its durable teacher-only result', async () => {
  let calls = 0;
  const { service } = await fixture({ generate: async () => { calls++; return candidate(); } });
  const job = await service.start({ ownerAccountId: 'teacher', sourceId: 'src-1', requestId: 'request-1', settings: { slotMinutes: 40, subject: 'math', grade: 11 }, model: 'local-model' });
  await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent });
  await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent });
  const ready = await service.get({ ownerAccountId: 'teacher', id: job.id });
  assert.equal(calls, 1);
  assert.equal(ready.status, 'needs_review');
  assert.equal(ready.result.package.id, 'proposal-' + job.id);
  assert.equal(ready.result.package.status, 'needs_review');
  assert.equal(ready.result.validation.ok, true);
  assert.equal(ready.result.package.sourceRefs[0].hash, source.sha256);
  assert.deepEqual(ready.result.citations, candidate().citations);
  await assert.rejects(() => service.get({ ownerAccountId: 'other', id: job.id }), /NOT_FOUND/);
});

test('generation failures persist a safe code and cannot silently call the model again', async () => {
  let calls = 0;
  const { service } = await fixture({ generate: async () => { calls++; throw Error('AI_QUOTA_EXCEEDED'); } });
  const job = await service.start({ ownerAccountId: 'teacher', sourceId: 'src-1', requestId: 'request-1', settings: { slotMinutes: 40, subject: 'math', grade: 11 }, model: 'local-model' });
  await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent });
  const failed = await service.get({ ownerAccountId: 'teacher', id: job.id });
  assert.equal(failed.status, 'failed');
  assert.equal(failed.errorCode, 'AI_QUOTA_EXCEEDED');
  await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent });
  assert.equal(calls, 1);
  assert.equal(failed.result, undefined);
});

test('invalid generation job settings and client authority fields are rejected before writes', async () => {
  const { database, service } = await fixture();
  const base = { ownerAccountId: 'teacher', sourceId: 'src-1', requestId: 'request-1', settings: { slotMinutes: 40, subject: 'math', grade: 11 }, model: 'local-model' };
  await assert.rejects(() => service.start({ ...base, settings: { slotMinutes: 0 } }), /INVALID_SETTINGS/);
  await assert.rejects(() => service.start({ ...base, settings: { slotMinutes: 40, approved: true } }), /INVALID_SETTINGS/);
  await assert.rejects(() => service.start({ ...base, requestId: '' }), /INVALID_REQUEST_ID/);
  assert.equal(database.prepare('SELECT count(*) AS n FROM lesson_generation_jobs').get().n, 0);
});

test('concurrent run claims one model call; interrupted polling never retries it', async () => {
  let release; let entered; let calls = 0; let time = 1000;
  const started = new Promise(resolve => { entered = resolve; });
  const waiting = new Promise(resolve => { release = resolve; });
  const { service } = await fixture({ clock: () => time, generate: async () => { calls++; entered(); await waiting; return candidate(); } });
  const job = await service.start({ ownerAccountId: 'teacher', sourceId: 'src-1', requestId: 'concurrent', settings: { slotMinutes: 40, subject: 'math', grade: 11 }, model: 'local-model' });
  const running = service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent });
  await started;
  await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent });
  assert.equal(calls, 1);
  time += 120001;
  assert.equal((await service.get({ ownerAccountId: 'teacher', id: job.id })).status, 'interrupted');
  await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent });
  assert.equal(calls, 1);
  release();
  assert.equal((await running).status, 'interrupted');
  assert.equal((await service.get({ ownerAccountId: 'teacher', id: job.id })).result, undefined);
});

test('source changed during generation rejects result; pending quota preserves replay', async () => {
  const { database, service, sourceService } = await fixture();
  const job = await service.start({ ownerAccountId: 'teacher', sourceId: 'src-1', requestId: 'drift', settings: { slotMinutes: 40, subject: 'math', grade: 11 }, model: 'local-model' });
  database.prepare('UPDATE lesson_sources SET extraction_hash=? WHERE id=?').run('c'.repeat(64), source.id);
  sourceService.get = async () => ({ ...source, extractionHash: 'c'.repeat(64) });
  const failed = await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent });
  assert.equal(failed.status, 'failed');
  assert.equal(failed.errorCode, 'SOURCE_CHANGED');
  assert.equal(failed.result, undefined);
});

test('generation migration snapshot matches actual table and index metadata', async () => {
  const { database } = await fixture();
  const journal = JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'));
  const current = JSON.parse(await readFile(new URL('../drizzle/meta/0012_snapshot.json', import.meta.url), 'utf8'));
  const previous = JSON.parse(await readFile(new URL('../drizzle/meta/0011_snapshot.json', import.meta.url), 'utf8'));
  assert.equal(current.prevId, previous.id);
  assert.equal(journal.entries.find(entry => entry.idx === 12).tag, '0012_lesson_generation_jobs');
  assert.deepEqual(database.prepare('PRAGMA table_info(lesson_generation_jobs)').all().map(column => column.name).sort(), Object.keys(current.tables.lesson_generation_jobs.columns).sort());
  assert.deepEqual(database.prepare('PRAGMA index_list(lesson_generation_jobs)').all().filter(index => index.origin === 'c').map(index => index.name).sort(), Object.keys(current.tables.lesson_generation_jobs.indexes).sort());
  assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(), []);
});

test('generation does not silently accept a model answer for a different selected subject or grade', async () => {
  for (const overrides of [{ subject: 'literature' }, { grade: 12 }]) {
    const { service } = await fixture({ generate: async () => { const output = candidate(); Object.assign(output.package, overrides); return output; } });
    const job = await service.start({ ownerAccountId: 'teacher', sourceId: 'src-1', requestId: 'settings-check', settings: { slotMinutes: 40, subject: 'math', grade: 11 }, model: 'local-model' });
    const done = await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent });
    assert.equal(done.status, 'needs_review');
    assert.equal(done.result.validation.ok, false);
    assert.ok(done.result.validation.errors.some(issue => issue.code === 'ERR_PROPOSAL_SETTINGS_MISMATCH'));
  }
});

test('generation allows one validator repair attempt, then persists the repaired needs_review result', async () => {
  let calls = 0; let repairErrors = null; let repairCandidate = null;
  const { service } = await fixture({ generate: async input => { calls++; repairErrors = input.repairErrors || repairErrors; repairCandidate = input.repairCandidate || repairCandidate; const output = candidate(); if (calls === 1) output.package.subject = 'literature'; return output; } });
  const job = await service.start({ ownerAccountId: 'teacher', sourceId: 'src-1', requestId: 'repair', settings: { slotMinutes: 40, subject: 'math', grade: 11 }, model: 'local-model' });
  const done = await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent });
  assert.equal(calls, 2);
  assert.ok(Array.isArray(repairErrors));
  assert.equal(repairCandidate.package.subject, 'literature');
  assert.equal(done.status, 'needs_review');
  assert.equal(done.result.validation.ok, true);
});

test('generation never makes a second repair call after a malformed repair response', async () => {
  let calls = 0;
  const { service } = await fixture({ generate: async () => { calls++; if (calls === 1) return { package: {}, citations: [], uncertainties: [] }; return { package: {}, citations: [], uncertainties: [] }; } });
  const job = await service.start({ ownerAccountId: 'teacher', sourceId: 'src-1', requestId: 'single-repair', settings: { slotMinutes: 40, subject: 'math', grade: 11 }, model: 'local-model' });
  const done = await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent });
  assert.equal(calls, 2);
  assert.equal(done.status, 'failed');
  assert.equal(done.errorCode, 'INVALID_PROPOSAL');
});

test('generation service assembles and validates the provider outline format before persistence', async () => {
  const { service } = await fixture({ generate: async () => outlineCandidate() });
  const job = await service.start({ ownerAccountId: 'teacher', sourceId: 'src-1', requestId: 'outline-through-service', settings: { slotMinutes: 40, subject: 'math', grade: 11 }, model: 'local-model' });
  const done = await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent });
  assert.equal(done.status, 'needs_review');
  assert.equal(done.result.package.id, 'proposal-' + job.id);
  assert.equal(done.result.validation.ok, true, JSON.stringify(done.result.validation.errors));
  assert.equal(done.result.package.tasks.length, 5);
  assert.equal(done.result.package.evidenceRules.some(item => item.kind === 'precheck'), true);
});

test('a failed or malformed repair retains the first reviewable draft and never retries', async () => {
  for (const repair of [() => { throw Error('AI_TIMEOUT'); }, () => ({ package: {}, citations: [] })]) {
    let calls = 0;
    const first = candidate();
    first.package.subject = 'literature';
    const { service } = await fixture({ generate: async () => ++calls === 1 ? structuredClone(first) : repair() });
    const job = await service.start({ ownerAccountId: 'teacher', sourceId: source.id, requestId: 'retain', settings: { slotMinutes: 40, subject: 'math', grade: 11 }, model: 'local-model' });
    const done = await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent });
    assert.equal(done.status, 'needs_review');
    assert.equal(done.result.validation.ok, false);
    assert.deepEqual(done.result.package.objectives, first.package.objectives);
    assert.deepEqual(done.result.package.hints, first.package.hints);
    assert.ok(done.result.uncertainties.includes('AI_REPAIR_FAILED'));
    await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent });
    assert.equal(calls, 2);
  }
});

test('an otherwise valid repair cannot silently replace objectives, hints, branches, citations or valid keys', async () => {
  const mutations = [
    output => { output.package.objectives[0].statement = 'Một mục tiêu khác.'; },
    output => { output.package.hints[0].text = 'Một gợi ý khác.'; },
    output => { output.package.tasks.find(task => task.branch === 'extension').branch = 'shared'; },
    output => { output.citations[0].quote = 'Dãy số'; },
    output => { output.package.tasks.find(task => task.id === 'task-prac-support-tab').evaluation.answerKey = 21; }
  ];
  for (const mutate of mutations) {
    let calls = 0;
    const first = candidate();
    first.package.subject = 'literature';
    const { service } = await fixture({ generate: async () => { if (++calls === 1) return structuredClone(first); const repaired = candidate(); mutate(repaired); return repaired; } });
    const job = await service.start({ ownerAccountId: 'teacher', sourceId: source.id, requestId: 'retain-content', settings: { slotMinutes: 40, subject: 'math', grade: 11 }, model: 'local-model' });
    const done = await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent });
    assert.equal(done.status, 'needs_review');
    assert.equal(done.result.validation.ok, false);
    assert.deepEqual(done.result.package.objectives, first.package.objectives);
    assert.deepEqual(done.result.package.hints, first.package.hints);
    assert.deepEqual(done.result.package.tasks.map(({ metadata, ...task }) => { assert.ok(metadata.sourceCitation); return task; }), first.package.tasks.map(({ metadata: _metadata, ...task }) => ({ ...task, sourceRefs: [source.id] })));
    assert.deepEqual(done.result.citations, first.citations);
    assert.ok(done.result.uncertainties.includes('AI_REPAIR_CONTENT_CHANGED'));
    assert.equal(calls, 2);
  }
});

test('a repair may fix an invalid evaluation while preserving source-bound content', async () => {
  let calls = 0;
  const { service } = await fixture({ generate: async () => { const output = candidate(); if (++calls === 1) output.package.tasks.find(task => task.id === 'task-prac-support-tab').evaluation.answerKey = 'not-a-number'; return output; } });
  const job = await service.start({ ownerAccountId: 'teacher', sourceId: source.id, requestId: 'repair-evaluation', settings: { slotMinutes: 40, subject: 'math', grade: 11 }, model: 'local-model' });
  const done = await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent });
  assert.equal(done.status, 'needs_review');
  assert.equal(done.result.validation.ok, true, JSON.stringify(done.result.validation.errors));
  assert.equal(calls, 2);
});

test('retaining a draft after repair failure does not bypass a changed source', async () => {
  let calls = 0;
  const { database, sourceService, service } = await fixture({ generate: async () => {
    const output = candidate();
    if (++calls === 1) output.package.subject = 'literature';
    else {
      database.prepare('UPDATE lesson_sources SET extraction_hash=? WHERE id=?').run('c'.repeat(64), source.id);
      sourceService.get = async () => ({ ...source, extractionHash: 'c'.repeat(64) });
      throw Error('AI_TIMEOUT');
    }
    return output;
  } });
  const job = await service.start({ ownerAccountId: 'teacher', sourceId: source.id, requestId: 'repair-drift', settings: { slotMinutes: 40, subject: 'math', grade: 11 }, model: 'local-model' });
  const done = await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent });
  assert.equal(done.status, 'failed');
  assert.equal(done.errorCode, 'SOURCE_CHANGED');
  assert.equal(done.result, undefined);
});

test('quoted mathematics curriculum codes cannot silently validate a different selected grade or subject', async () => {
  for (const settings of [{ slotMinutes: 40, subject: 'math', grade: 10 }, { slotMinutes: 40, subject: 'english', grade: 11 }]) {
    const { service } = await fixture({ generate: async () => { const output = candidate(); Object.assign(output.package, settings); delete output.package.slotMinutes; return output; } });
    const job = await service.start({ ownerAccountId: 'teacher', sourceId: source.id, requestId: 'curriculum-grade', settings, model: 'local-model' });
    const done = await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent });
    assert.equal(done.status, 'needs_review');
    assert.equal(done.result.validation.ok, false);
    assert.ok(done.result.validation.errors.some(issue => issue.code === 'ERR_PROPOSAL_SETTINGS_MISMATCH' && issue.path.startsWith('objectives[')));
    assert.equal(done.result.package.objectives[0].code, 'T11.18');
  }
});

test('repair removal of tasks, activities or evidence retains the original draft', async () => {
  for (const collection of ['tasks', 'activities', 'evidenceRules']) {
    let calls = 0;
    const { service } = await fixture({ generate: async () => {
      const output = candidate();
      if (++calls === 1) output.package.subject = 'literature';
      else {
        const removed = output.package[collection].pop();
        output.citations = output.citations.filter(citation => citation.entityId !== removed.id);
      }
      return output;
    } });
    const job = await service.start({ ownerAccountId: 'teacher', sourceId: source.id, requestId: 'retain-entities', settings: { slotMinutes: 40, subject: 'math', grade: 11 }, model: 'local-model' });
    const done = await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent });
    assert.equal(done.status, 'needs_review');
    assert.deepEqual(done.result.package.objectives, pilot.objectives);
    assert.equal(done.result.package[collection].length, pilot[collection].length);
    assert.ok(done.result.uncertainties.includes('AI_REPAIR_CONTENT_CHANGED'));
    assert.equal(calls, 2);
  }
});

test('repair can replace a hint whose text is explicitly rejected without changing valid hints', async () => {
  let calls = 0;
  const { service } = await fixture({ generate: async () => {
    const output = candidate();
    if (++calls === 1) output.package.hints.find(hint => hint.taskId === 'task-prac-error-hunt').text = 'Đáp án là 20.';
    return output;
  } });
  const job = await service.start({ ownerAccountId: 'teacher', sourceId: source.id, requestId: 'repair-leaked-hint', settings: { slotMinutes: 40, subject: 'math', grade: 11 }, model: 'local-model' });
  const done = await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent });
  assert.equal(calls, 2);
  assert.equal(done.status, 'needs_review');
  assert.equal(done.result.validation.ok, true, JSON.stringify(done.result.validation.errors));
  assert.deepEqual(done.result.package.hints, pilot.hints);
});

