import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir } from 'node:fs/promises';
import { createLessonService } from '../lib/lesson/service.js';
import { createLessonSourceService } from '../lib/lesson/source-service.js';
import { createLessonGenerationService } from '../lib/lesson/generation-service.js';
import { pilotDraft } from '../lib/lesson/director.js';
import { createLessonClassService } from '../lib/lesson/class-service.js';

const pilot = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));
async function setup() {
  const database = new DatabaseSync(':memory:');
  for (const file of (await readdir(new URL('../drizzle/', import.meta.url))).filter(name => /^\d{4}_.*\.sql$/.test(name)).sort()) database.exec(await readFile(new URL('../drizzle/' + file, import.meta.url), 'utf8'));
  database.exec('PRAGMA foreign_keys=ON');
  for (const id of ['owner', 'other']) database.prepare('INSERT INTO accounts(id,email,created_at) VALUES(?,?,?)').run(id, id + '@example.invalid', 1);
  const env = { beforeRun: () => {} };
  const db = { prepare: sql => ({ bind: (...args) => ({ first: async () => database.prepare(sql).get(...args) ?? null, all: async () => ({ results: database.prepare(sql).all(...args) }), run: async () => { env.beforeRun(sql); return { meta: { changes: Number(database.prepare(sql).run(...args).changes) } }; } }) }), batch: async statements => { database.exec('BEGIN'); try { const results = []; for (const statement of statements) results.push(await statement.run()); database.exec('COMMIT'); return results; } catch (error) { database.exec('ROLLBACK'); throw error; } } };
  const objects = new Map();
  const bucket = { async put(key, bytes) { objects.set(key, new Uint8Array(bytes)); return {}; }, async get(key) { const bytes = objects.get(key); return bytes ? { size: bytes.length, arrayBuffer: async () => bytes.slice().buffer } : null; } };
  const sourceService = createLessonSourceService({ db, bucket, importText: ({ text }) => ({ ok: true, segments: [{ id: 's1', text }], uncertainties: [] }) });
  const service = createLessonService({ db, now: () => 1000 });
  const tombstone = (kind, id) => database.prepare('INSERT INTO lesson_content_deletions VALUES(?,?,?,?)').run(kind, id, 'owner', 1000);
  return { ...env, env, database, db, objects, bucket, sourceService, service, tombstone };
}
const uploadInput = { ownerAccountId: 'owner', requestId: 'source-req', originalName: 'Ý tưởng.txt', mime: 'text/plain', bytes: new TextEncoder().encode('Toán 11 Dãy số') };

test('package and plan removal are owner-confirmed, hide new uses, preserve existing session snapshots', async () => {
  const { service, database } = await setup();
  const saved = await service.savePackage({ ownerAccountId: 'owner', package: structuredClone(pilot) });
  const approved = await service.approvePackage({ actorAccountId: 'owner', id: saved.row.rowId, parentHash: saved.row.contentHash, version: '1.0.1', sourceReviewAck: pilot.sourceRefs.map(ref => ({ ...ref, numericReviewConfirmed: true })) });
  const draft = pilotDraft({ package: { ...approved.package, rowId: approved.row.rowId } });
  const plan = await service.approvePlan({ actorAccountId: 'owner', packageRowId: approved.row.rowId, packageVersion: approved.row.version, packageHash: approved.row.contentHash, planHash: draft.plan.contentHash, sourceReview: approved.package.sourceRefs });
  const input = { ownerAccountId: 'owner', packageRowId: approved.row.rowId, planRowId: plan.row.rowId, planHash: plan.row.planHash, mode: 'live', title: 'Tiết học', requestId: 'session-old' };
  const session = await service.createSession(input);
  await assert.rejects(() => service.removeContent({ ownerAccountId: 'other', kind: 'package', id: approved.row.rowId, confirmId: approved.row.rowId }), /NOT_FOUND/);
  await assert.rejects(() => service.removeContent({ ownerAccountId: 'owner', kind: 'package', id: approved.row.rowId, confirmId: 'wrong' }), /CONFIRM_REQUIRED/);
  await service.removeContent({ ownerAccountId: 'owner', kind: 'plan', id: plan.row.rowId, confirmId: plan.row.rowId });
  assert.equal((await service.listPlans({ ownerAccountId: 'owner' })).length, 0);
  await assert.rejects(() => service.createSession({ ...input, requestId: 'blocked-plan' }), /PLAN_TUPLE_MISMATCH/);
  await assert.rejects(() => service.restoreContent({ ownerAccountId: 'other', kind: 'plan', id: plan.row.rowId }), /NOT_FOUND/);
  await service.restoreContent({ ownerAccountId: 'owner', kind: 'plan', id: plan.row.rowId });
  assert.equal((await service.listPlans({ ownerAccountId: 'owner' }))[0].row_id, plan.row.rowId);
  assert.equal(database.prepare('SELECT plan_hash FROM lesson_session_plans WHERE row_id=?').get(plan.row.rowId).plan_hash, plan.row.planHash);
  await service.removeContent({ ownerAccountId: 'owner', kind: 'plan', id: plan.row.rowId, confirmId: plan.row.rowId });
  await service.removeContent({ ownerAccountId: 'owner', kind: 'package', id: approved.row.rowId, confirmId: approved.row.rowId });
  await service.removeContent({ ownerAccountId: 'owner', kind: 'package', id: approved.row.rowId, confirmId: approved.row.rowId });
  assert.equal((await service.listPackages({ actorAccountId: 'owner', isRoot: true })).some(row => row.row_id === approved.row.rowId), false);
  await assert.rejects(() => service.getPackage({ actorAccountId: 'owner', isRoot: true, id: approved.row.rowId }), /NOT_FOUND/);
  await assert.rejects(() => service.getDirectorDraft({ actorAccountId: 'owner', id: approved.row.rowId }), /NOT_FOUND/);
  await assert.rejects(() => service.createSession({ ...input, requestId: 'blocked-package' }), /FORBIDDEN/);
  await assert.rejects(() => service.approvePackage({ actorAccountId: 'owner', id: approved.row.rowId, parentHash: approved.row.contentHash, version: '1.0.2', sourceReviewAck: approved.package.sourceRefs }), /APPROVAL_CONFLICT/);
  assert.equal((await service.getSession({ id: session.session.id, accountId: 'owner' })).view.role, 'teacher');
  assert.equal(database.prepare('SELECT COUNT(*) n FROM lesson_packages').get().n, 2);
  assert.equal(database.prepare('SELECT COUNT(*) n FROM lesson_session_plans').get().n, 1);
});

test('source removal retains storage/quota, denies downloads, retries and new package bindings', async () => {
  const { sourceService, objects, database, service } = await setup();
  const source = await sourceService.upload(uploadInput);
  await assert.rejects(() => sourceService.remove({ ownerAccountId: 'other', id: source.id, confirmName: source.originalName }), /NOT_FOUND/);
  await assert.rejects(() => sourceService.remove({ ownerAccountId: 'owner', id: source.id, confirmName: 'wrong' }), /CONFIRM_REQUIRED/);
  await sourceService.remove({ ownerAccountId: 'owner', id: source.id, confirmName: source.originalName });
  assert.equal((await sourceService.list('owner')).length, 0);
  for (const action of [() => sourceService.get('owner', source.id), () => sourceService.downloadOriginal('owner', source.id), () => sourceService.upload(uploadInput)]) await assert.rejects(action, /NOT_FOUND/);
  assert.equal(objects.size, 2);
  assert.equal(database.prepare('SELECT COUNT(*) n,SUM(bytes) bytes FROM lesson_sources').get().bytes, uploadInput.bytes.length);
  const pkg = structuredClone(pilot);
  pkg.sourceRefs = [{ id: source.id, kind: 'external', hash: source.sha256, locator: `lesson-source:${source.id}:${source.parserRevision}:${source.extractionHash}`, label: source.originalName, verification: 'teacher_review_required' }];
  pkg.tasks.forEach(task => { task.sourceRefs = [source.id]; });
  await assert.rejects(() => service.savePackage({ ownerAccountId: 'owner', package: pkg }), /SOURCE_REVIEW_REQUIRED/);
});

test('in-flight upload never resurrects a deleted source', async () => {
  const { bucket, sourceService, database, tombstone } = await setup();
  const put = bucket.put;
  bucket.put = async (key, bytes) => { if (key.endsWith('/original')) tombstone('source', key.split('/')[1]); return put(key, bytes); };
  await assert.rejects(() => sourceService.upload(uploadInput), /NOT_FOUND/);
  assert.equal((await sourceService.list('owner')).length, 0);
  assert.equal(database.prepare('SELECT COUNT(*) n FROM lesson_sources').get().n, 1);
});

test('queued jobs cannot run after deletion; running jobs cannot be deleted; quota receipts remain', async () => {
  const { db, database, sourceService, env, tombstone } = await setup();
  const source = await sourceService.upload(uploadInput);
  let calls = 0;
  const jobs = createLessonGenerationService({ db, sourceService, generate: async () => { calls++; throw Error('AI_TIMEOUT'); }, now: () => 1000 });
  const input = { ownerAccountId: 'owner', sourceId: source.id, settings: { slotMinutes: 40, subject: 'math', grade: 11 }, model: 'local' };
  const aiConsent = { confirmed: true, sourceId: source.id, sourceSha256: source.sha256, parserRevision: source.parserRevision, extractionHash: source.extractionHash };
  const job = await jobs.start({ ...input, requestId: 'queued' });
  await assert.rejects(() => jobs.remove({ ownerAccountId: 'other', id: job.id, confirmId: job.id }), /NOT_FOUND/);
  await jobs.remove({ ownerAccountId: 'owner', id: job.id, confirmId: job.id });
  await assert.rejects(() => jobs.run({ ownerAccountId: 'owner', id: job.id, aiConsent }), /NOT_FOUND/);
  await assert.rejects(() => jobs.start({ ...input, requestId: 'queued' }), /NOT_FOUND/);
  assert.equal((await jobs.list('owner')).length, 0);
  assert.equal(database.prepare('SELECT COUNT(*) n FROM lesson_generation_jobs').get().n, 1);
  const racing = await jobs.start({ ...input, requestId: 'racing' });
  env.beforeRun = sql => { if (sql.startsWith('UPDATE lesson_generation_jobs SET status=\'running\'')) { env.beforeRun = () => {}; tombstone('job', racing.id); } };
  await assert.rejects(() => jobs.run({ ownerAccountId: 'owner', id: racing.id, aiConsent }), /NOT_FOUND/);
  assert.equal(calls, 0);
  const running = await jobs.start({ ...input, requestId: 'running' });
  database.prepare("UPDATE lesson_generation_jobs SET status='running',started_at=1000 WHERE id=?").run(running.id);
  await assert.rejects(() => jobs.remove({ ownerAccountId: 'owner', id: running.id, confirmId: running.id }), /GENERATION_RUNNING/);
  assert.equal((await jobs.get({ ownerAccountId: 'owner', id: running.id })).status, 'running');
  const deleteRace = await jobs.start({ ...input, requestId: 'delete-race' });
  env.beforeRun = sql => { if (sql.startsWith('INSERT INTO lesson_content_deletions')) { env.beforeRun = () => {}; database.prepare("UPDATE lesson_generation_jobs SET status='running',started_at=1000 WHERE id=?").run(deleteRace.id); } };
  await assert.rejects(() => jobs.remove({ ownerAccountId: 'owner', id: deleteRace.id, confirmId: deleteRace.id }), /GENERATION_RUNNING/);
  database.prepare('UPDATE lesson_generation_jobs SET started_at=? WHERE id=?').run(-120001, deleteRace.id);
  await jobs.remove({ ownerAccountId: 'owner', id: deleteRace.id, confirmId: deleteRace.id });
  assert.equal(database.prepare('SELECT status FROM lesson_generation_jobs WHERE id=?').get(deleteRace.id).status, 'interrupted');
});

test('concurrent content deletion prevents new session insertion without orphan room', async () => {
  const { service, env, tombstone, database } = await setup();
  const saved = await service.savePackage({ ownerAccountId: 'owner', package: structuredClone(pilot) });
  env.beforeRun = sql => { if (sql.startsWith('INSERT INTO rooms(')) { env.beforeRun = () => {}; tombstone('package', saved.row.rowId); } };
  await assert.rejects(() => service.createSession({ ownerAccountId: 'owner', packageRowId: saved.row.rowId, mode: 'preview', title: 'Race', requestId: 'race-session' }), /FORBIDDEN/);
  assert.equal(database.prepare('SELECT COUNT(*) n FROM rooms').get().n, 0);
  assert.equal(database.prepare('SELECT COUNT(*) n FROM lesson_sessions').get().n, 0);
});

test('replaying a deleted lesson room fails without returning its code or creating an orphan', async () => {
  const { service, database } = await setup();
  const saved = await service.savePackage({ ownerAccountId: 'owner', package: structuredClone(pilot) });
  const input = { ownerAccountId: 'owner', packageRowId: saved.row.rowId, mode: 'preview', title: 'QA room', requestId: 'deleted-room-replay' };
  const first = await service.createSession(input);
  database.prepare('UPDATE rooms SET deleted_at=1000 WHERE id=?').run(first.session.roomId);
  await assert.rejects(() => service.createSession(input), /NOT_FOUND/);
  assert.equal(database.prepare('SELECT COUNT(*) n FROM rooms').get().n, 1);
  assert.equal(database.prepare('SELECT COUNT(*) n FROM lesson_sessions').get().n, 1);
});

test('Trash restore/delete cycles keep hashes and old sessions intact, stay owner-scoped', async () => {
  const { service, database } = await setup();
  const saved = await service.savePackage({ ownerAccountId: 'owner', package: structuredClone(pilot) });
  const snapshot = database.prepare('SELECT * FROM lesson_packages WHERE row_id=?').get(saved.row.rowId);
  const session = await service.createSession({ ownerAccountId: 'owner', packageRowId: saved.row.rowId, mode: 'preview', title: 'History', requestId: 'restore-history' });
  for (let cycle = 0; cycle < 2; cycle++) {
    await service.removeContent({ ownerAccountId: 'owner', kind: 'package', id: saved.row.rowId, confirmId: saved.row.rowId });
    await assert.rejects(() => service.restoreContent({ ownerAccountId: 'other', kind: 'package', id: saved.row.rowId }), /NOT_FOUND/);
    await assert.rejects(() => service.restoreContent({ ownerAccountId: 'owner', kind: 'plan', id: saved.row.rowId }), /NOT_FOUND/);
    await service.restoreContent({ ownerAccountId: 'owner', kind: 'package', id: saved.row.rowId });
    assert.equal((await service.getPackage({ actorAccountId: 'owner', id: saved.row.rowId })).content_hash, saved.row.contentHash);
    assert.deepEqual(database.prepare('SELECT * FROM lesson_packages WHERE row_id=?').get(saved.row.rowId), snapshot);
    assert.equal((await service.getSession({ id: session.session.id, accountId: 'owner' })).view.role, 'teacher');
  }
});

test('source/job restores retain quota, require active source and never restart cancelled AI', async () => {
  const { db, database, sourceService } = await setup();
  const source = await sourceService.upload(uploadInput);
  let calls = 0;
  const jobs = createLessonGenerationService({ db, sourceService, generate: async () => { calls++; }, now: () => 1000 });
  const job = await jobs.start({ ownerAccountId: 'owner', sourceId: source.id, requestId: 'restore-job', settings: { slotMinutes: 40, subject: 'math', grade: 11 }, model: 'local' });
  await jobs.remove({ ownerAccountId: 'owner', id: job.id, confirmId: job.id });
  await sourceService.remove({ ownerAccountId: 'owner', id: source.id, confirmName: source.originalName });
  await assert.rejects(() => sourceService.restore({ ownerAccountId: 'other', id: source.id }), /NOT_FOUND/);
  await assert.rejects(() => jobs.restore({ ownerAccountId: 'other', id: job.id }), /NOT_FOUND/);
  await assert.rejects(() => jobs.restore({ ownerAccountId: 'owner', id: job.id }), /NOT_FOUND/);
  await sourceService.restore({ ownerAccountId: 'owner', id: source.id });
  await jobs.restore({ ownerAccountId: 'owner', id: job.id });
  assert.equal((await sourceService.get('owner', source.id)).sha256, source.sha256);
  assert.equal((await jobs.run({ ownerAccountId: 'owner', id: job.id })).status, 'interrupted');
  assert.equal(calls, 0);
  assert.equal(database.prepare('SELECT COUNT(*) n FROM lesson_generation_jobs').get().n, 1);
  assert.equal(database.prepare('SELECT COUNT(*) n FROM lesson_sources').get().n, 1);
});

test('deleting/restoring a pending source prevents its pre-delete parser from committing ready', async () => {
  const { bucket, sourceService, database } = await setup();
  const put = bucket.put;
  bucket.put = async (key, bytes) => {
    if (key.endsWith('/original')) {
      const id = key.split('/')[1];
      await sourceService.remove({ ownerAccountId: 'owner', id, confirmName: uploadInput.originalName });
      await sourceService.restore({ ownerAccountId: 'owner', id });
    }
    return put(key, bytes);
  };
  const source = await sourceService.upload(uploadInput);
  assert.equal(source.status, 'failed');
  assert.equal(source.errorCode, 'SOURCE_PROCESSING_CANCELLED');
  assert.equal(database.prepare('SELECT status FROM lesson_sources WHERE id=?').get(source.id).status, 'failed');
});

test('deleting/restoring source while provider runs prevents pre-delete result from appearing', async () => {
  const { db, sourceService, database } = await setup();
  const source = await sourceService.upload(uploadInput);
  let complete, started;
  const entered = new Promise(resolve => { started = resolve; });
  const jobs = createLessonGenerationService({ db, sourceService, generate: () => { started(); return new Promise(resolve => { complete = resolve; }); }, now: () => 1000 });
  const job = await jobs.start({ ownerAccountId: 'owner', sourceId: source.id, requestId: 'running-source-restore', settings: { slotMinutes: 40, subject: 'math', grade: 11 }, model: 'local' });
  const run = jobs.run({ ownerAccountId: 'owner', id: job.id, aiConsent: { confirmed: true, sourceId: source.id, sourceSha256: source.sha256, parserRevision: source.parserRevision, extractionHash: source.extractionHash } });
  await entered;
  await sourceService.remove({ ownerAccountId: 'owner', id: source.id, confirmName: source.originalName });
  await sourceService.restore({ ownerAccountId: 'owner', id: source.id });
  const citations = [...pilot.objectives, ...pilot.activities, ...pilot.tasks, ...pilot.hints, ...pilot.evidenceRules].map(entity => ({ entityId: entity.id, segmentId: 's1', quote: 'Toán 11 Dãy số', origin: 'adapted' }));
  complete({ package: structuredClone(pilot), citations, uncertainties: [] });
  assert.equal((await run).status, 'interrupted');
  assert.equal(database.prepare('SELECT result_json FROM lesson_generation_jobs WHERE id=?').get(job.id).result_json, null);
});

test('removed lesson learner enters Trash; restore resumes same passport/token without duplicate rows', async () => {
  const { service, database } = await setup();
  const pkg = await service.savePackage({ ownerAccountId: 'owner', package: structuredClone(pilot) });
  const session = await service.createSession({ ownerAccountId: 'owner', packageRowId: pkg.row.rowId, mode: 'preview', title: 'Trash learner', requestId: 'trash-learner' });
  const token = 'A'.repeat(43);
  const learner = await service.joinSession({ code: session.session.code, name: 'An', token });
  const before = await service.getSession({ id: session.session.id, learnerToken: token });
  const remove = async eventId => { const teacher = await service.getSession({ id: session.session.id, accountId: 'owner' }); return service.event({ sessionId: session.session.id, accountId: 'owner', event: { type: 'LEAVE_LEARNER', eventId, round: teacher.view.round, revision: teacher.revision, payload: { learnerId: learner.learnerId } } }); };
  await remove('trash-learner-remove');
  const id = JSON.stringify([session.session.id, learner.learnerId]);
  const marker = database.prepare("SELECT * FROM site_trash WHERE kind='lesson-learner' AND object_id=?").get(id);
  assert.equal(marker.owner_account_id, 'owner');
  assert.equal(JSON.parse(marker.data).title, 'An');
  assert.equal(marker.data.includes(token), false);
  await assert.rejects(() => service.getSession({ id: session.session.id, learnerToken: token }), /FORBIDDEN/);
  await assert.rejects(() => service.restoreTrashLearner({ ownerAccountId: 'other', id }), /NOT_FOUND/);
  await service.restoreTrashLearner({ ownerAccountId: 'owner', id });
  assert.deepEqual((await service.getSession({ id: session.session.id, learnerToken: token })).view.passport, before.view.passport);
  assert.equal(database.prepare('SELECT COUNT(*) n FROM lesson_learners WHERE session_id=?').get(session.session.id).n, 1);
  assert.equal(database.prepare("SELECT COUNT(*) n FROM site_trash WHERE kind='lesson-learner'").get().n, 0);
  await assert.rejects(() => service.restoreTrashLearner({ ownerAccountId: 'owner', id }), /NOT_FOUND/);
  await remove('trash-learner-remove-again');
  assert.ok(database.prepare("SELECT * FROM site_trash WHERE kind='lesson-learner' AND object_id=?").get(id));
});

test('restoring removed lesson learners rejects inactive class profiles and concluded/deleted rooms', async () => {
  const { service, database, db } = await setup();
  const classes = createLessonClassService({ db, now: () => 1000 });
  const { class: classroom } = await classes.createClass({ ownerAccountId: 'owner', title: 'Lớp QA', requestId: 'trash-classroom' });
  const member = await classes.addMember({ ownerAccountId: 'owner', classId: classroom.id, name: 'An', requestId: 'trash-classmember' });
  const login = await classes.joinClass({ classCode: classroom.code, memberCode: member.member.code, pin: member.pin });
  const pkg = await service.savePackage({ ownerAccountId: 'owner', package: structuredClone(pilot) });
  const session = await service.createSession({ ownerAccountId: 'owner', packageRowId: pkg.row.rowId, classId: classroom.id, mode: 'preview', title: 'Class restore', requestId: 'trash-class-session' });
  const learner = await service.joinSession({ code: session.session.code, name: 'An', classToken: login.token });
  const teacher = await service.getSession({ id: session.session.id, accountId: 'owner' });
  await service.event({ sessionId: session.session.id, accountId: 'owner', event: { type: 'LEAVE_LEARNER', eventId: 'remove-classlearner', round: teacher.view.round, revision: teacher.revision, payload: { learnerId: learner.learnerId } } });
  const id = JSON.stringify([session.session.id, learner.learnerId]);
  await classes.revokeMember({ ownerAccountId: 'owner', classId: classroom.id, memberId: member.member.id });
  await assert.rejects(() => service.restoreTrashLearner({ ownerAccountId: 'owner', id }), /RESTORE_CONFLICT/);
  database.prepare('UPDATE lesson_class_members SET revoked_at=NULL WHERE id=?').run(member.member.id);
  const row = database.prepare('SELECT state FROM lesson_sessions WHERE id=?').get(session.session.id);
  const state = JSON.parse(row.state); state.status = 'concluded';
  database.prepare("UPDATE lesson_sessions SET state=?,status='concluded' WHERE id=?").run(JSON.stringify(state), session.session.id);
  await assert.rejects(() => service.restoreTrashLearner({ ownerAccountId: 'owner', id }), /RESTORE_CONFLICT/);
  database.prepare('UPDATE rooms SET deleted_at=1000 WHERE id=?').run(session.session.roomId);
  await assert.rejects(() => service.restoreTrashLearner({ ownerAccountId: 'owner', id }), /NOT_FOUND/);
  assert.equal(database.prepare('SELECT present FROM lesson_learners WHERE session_id=? AND learner_id=?').get(session.session.id, learner.learnerId).present, 0);
});

test('restoration refuses an overwritten removal marker without consuming the newer deletion', async () => {
  const { service, database, env } = await setup();
  const pkg = await service.savePackage({ ownerAccountId: 'owner', package: structuredClone(pilot) });
  const session = await service.createSession({ ownerAccountId: 'owner', packageRowId: pkg.row.rowId, mode: 'preview', title: 'Race marker', requestId: 'trash-marker-race' });
  const learner = await service.joinSession({ code: session.session.code, name: 'An' });
  const teacher = await service.getSession({ id: session.session.id, accountId: 'owner' });
  await service.event({ sessionId: session.session.id, accountId: 'owner', event: { type: 'LEAVE_LEARNER', eventId: 'race-remove', round: teacher.view.round, revision: teacher.revision, payload: { learnerId: learner.learnerId } } });
  const id = JSON.stringify([session.session.id, learner.learnerId]);
  env.beforeRun = sql => { if (sql.startsWith('UPDATE lesson_sessions SET state=')) { env.beforeRun = () => {}; database.prepare("UPDATE site_trash SET deleted_at=2000,data='{}' WHERE kind='lesson-learner' AND object_id=?").run(id); } };
  await assert.rejects(() => service.restoreTrashLearner({ ownerAccountId: 'owner', id }), /CONFLICT/);
  assert.equal(database.prepare("SELECT deleted_at FROM site_trash WHERE kind='lesson-learner' AND object_id=?").get(id).deleted_at, 2000);
  assert.equal(database.prepare('SELECT present FROM lesson_learners WHERE session_id=? AND learner_id=?').get(session.session.id, learner.learnerId).present, 0);
});
