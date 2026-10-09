import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { createLessonService } from '../lib/lesson/service.js';

const fixture = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));
const sha = 'a'.repeat(64);
const extractionHash = 'b'.repeat(64);
const sourceId = '11111111-1111-4111-8111-111111111111';
const sourceRef = { id: sourceId, kind: 'external', hash: sha, locator: `lesson-source:${sourceId}:p5-binary-1:${extractionHash}`, label: 'source.docx', verification: 'teacher_review_required' };
const packageFixture = () => {
  const pkg = structuredClone(fixture);
  pkg.sourceRefs = [sourceRef];
  for (const task of pkg.tasks) task.sourceRefs = [sourceRef.id];
  return pkg;
};

function dbFixture() {
  const database = new DatabaseSync(':memory:');
  database.exec(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE accounts(id TEXT PRIMARY KEY,email TEXT NOT NULL,display_name TEXT,created_at INTEGER NOT NULL);
    CREATE TABLE lesson_packages(row_id TEXT PRIMARY KEY,owner_account_id TEXT NOT NULL,package_id TEXT NOT NULL,version TEXT NOT NULL,content_hash TEXT NOT NULL,status TEXT NOT NULL,data TEXT NOT NULL,parent_row_id TEXT,created_at INTEGER NOT NULL,UNIQUE(owner_account_id,package_id,version),UNIQUE(row_id,version,content_hash));
    CREATE TABLE lesson_approvals(id TEXT PRIMARY KEY,package_row_id TEXT NOT NULL,actor_account_id TEXT NOT NULL,reviewed_parent_hash TEXT NOT NULL,approved_hash TEXT NOT NULL,source_ack TEXT NOT NULL,created_at INTEGER NOT NULL);
    CREATE TABLE lesson_sources(id TEXT PRIMARY KEY,owner_account_id TEXT NOT NULL,request_id TEXT NOT NULL,request_fingerprint TEXT NOT NULL,original_name TEXT NOT NULL,mime TEXT NOT NULL,bytes INTEGER NOT NULL,sha256 TEXT NOT NULL,status TEXT NOT NULL,parser_revision TEXT NOT NULL,extraction_hash TEXT,error_code TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
    CREATE TABLE lesson_package_sources(package_row_id TEXT NOT NULL,package_version TEXT NOT NULL,package_hash TEXT NOT NULL,source_id TEXT NOT NULL,source_sha256 TEXT NOT NULL,extraction_revision TEXT NOT NULL,extraction_hash TEXT NOT NULL,owner_account_id TEXT NOT NULL,UNIQUE(package_row_id,package_version,package_hash,source_id));
  `);
  const prepare = sql => ({ bind: (...args) => ({ first: async () => database.prepare(sql).get(...args) ?? null, all: async () => ({ results: database.prepare(sql).all(...args) }), run: async () => ({ meta: { changes: Number(database.prepare(sql).run(...args).changes) } }) }) });
  const db = { prepare, batch: async statements => { database.exec('BEGIN'); try { const result = []; for (const statement of statements) result.push(await statement.run()); database.exec('COMMIT'); return result; } catch (error) { database.exec('ROLLBACK'); throw error; } } };
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner', 'owner@example.invalid', 'Owner', 1);
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('other', 'other@example.invalid', 'Other', 1);
  database.prepare('INSERT INTO lesson_sources VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(sourceId, 'owner', 'request-1', 'c'.repeat(64), 'source.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 10, sha, 'ready', 'p5-binary-1', extractionHash, null, 1, 1);
  return { db, database };
}

test('uploaded source refs bind exact immutable source snapshots on save and approval', async () => {
  const { db, database } = dbFixture();
  const service = createLessonService({ db, now: () => 1000 });
  const pkg = packageFixture();
  const saved = await service.savePackage({ ownerAccountId: 'owner', package: pkg });
  let assoc = database.prepare('SELECT * FROM lesson_package_sources WHERE package_row_id=?').get(saved.row.rowId);
  assert.equal(assoc.source_id, sourceId);
  assert.equal(assoc.source_sha256, sha);
  assert.equal(assoc.extraction_revision, 'p5-binary-1');
  assert.equal(assoc.extraction_hash, extractionHash);
  const approved = await service.approvePackage({ actorAccountId: 'owner', id: saved.row.rowId, parentHash: saved.row.contentHash, version: '1.0.1', sourceReviewAck: [sourceRef] });
  assoc = database.prepare('SELECT * FROM lesson_package_sources WHERE package_row_id=?').get(approved.row.rowId);
  assert.equal(assoc.source_id, sourceId);
  assert.equal(assoc.package_hash, approved.row.contentHash);
});

test('adapted numeric tasks require an explicit source numeric acknowledgment before approval', async () => {
  const { db, database } = dbFixture();
  const service = createLessonService({ db, now: () => 1000 });
  const pkg = packageFixture();
  const task = pkg.tasks.find(item => item.id === 'task-prac-support-tab');
  task.metadata = { sourceCitation: { segmentId: 's1', quote: 'Dãy số.', origin: 'adapted' }, numericReviewRequired: true };
  const saved = await service.savePackage({ ownerAccountId: 'owner', package: pkg });
  const input = { actorAccountId: 'owner', id: saved.row.rowId, parentHash: saved.row.contentHash, version: '1.0.1', sourceReviewAck: [sourceRef] };
  await assert.rejects(() => service.approvePackage(input), /NUMERIC_REVIEW_REQUIRED/);
  assert.equal(database.prepare('SELECT count(*) AS n FROM lesson_approvals').get().n, 0);
  const approved = await service.approvePackage({ ...input, sourceReviewAck: [{ ...sourceRef, numericReviewConfirmed: true }] });
  assert.equal(approved.package.status, 'approved');
});

test('saving an AI draft cannot silently remove its source provenance', async () => {
  const { db, database } = dbFixture();
  database.exec('CREATE TABLE lesson_generation_jobs(id TEXT PRIMARY KEY, owner_account_id TEXT, result_json TEXT)');
  const pkg = packageFixture();
  pkg.id = 'proposal-job-1';
  for (const task of pkg.tasks) task.metadata = { sourceCitation: { segmentId: 's1', quote: 'Dãy số.', origin: 'adapted' }, numericReviewRequired: true };
  database.prepare('INSERT INTO lesson_generation_jobs VALUES(?,?,?)').run('job-1', 'owner', JSON.stringify({ package: pkg }));
  delete pkg.tasks[0].metadata;
  const service = createLessonService({ db });
  await assert.rejects(() => service.savePackage({ ownerAccountId: 'owner', package: pkg }), /SOURCE_REVIEW_REQUIRED/);
  assert.equal(database.prepare('SELECT count(*) AS n FROM lesson_packages').get().n, 0);
});

test('saving an AI draft cannot replace its originally cited source snapshot', async () => {
  const { db, database } = dbFixture();
  database.exec('CREATE TABLE lesson_generation_jobs(id TEXT PRIMARY KEY, owner_account_id TEXT, result_json TEXT)');
  const pkg = packageFixture();
  pkg.id = 'proposal-job-1';
  for (const task of pkg.tasks) task.metadata = { sourceCitation: { segmentId: 's1', quote: 'Dãy số.', origin: 'adapted' }, numericReviewRequired: true };
  database.prepare('INSERT INTO lesson_generation_jobs VALUES(?,?,?)').run('job-1', 'owner', JSON.stringify({ package: pkg }));
  const nextHash = 'd'.repeat(64);
  pkg.sourceRefs = [{ ...sourceRef, locator: `lesson-source:${sourceId}:p5-binary-1:${nextHash}` }];
  database.prepare('UPDATE lesson_sources SET extraction_hash=? WHERE id=?').run(nextHash, sourceId);
  const service = createLessonService({ db });
  await assert.rejects(() => service.savePackage({ ownerAccountId: 'owner', package: pkg }), /SOURCE_REVIEW_REQUIRED/);
  assert.equal(database.prepare('SELECT count(*) AS n FROM lesson_packages').get().n, 0);
});

test('uploaded source refs cannot cross owner or forge revision/hash', async () => {
  const { db } = dbFixture();
  const service = createLessonService({ db, now: () => 1000 });
  const crossOwner = packageFixture();
  await assert.rejects(() => service.savePackage({ ownerAccountId: 'other', package: crossOwner }), /SOURCE_REVIEW_REQUIRED|SOURCE_NOT_FOUND/);
  const forged = packageFixture(); forged.sourceRefs = [{ ...sourceRef, locator: `lesson-source:${sourceId}:p5-binary-1:${'d'.repeat(64)}` }];
  await assert.rejects(() => service.savePackage({ ownerAccountId: 'owner', package: forged }), /SOURCE_REVIEW_REQUIRED|SOURCE_NOT_FOUND/);
});

test('a source changed between validation and commit cannot leave an unbound package', async () => {
  const { db, database } = dbFixture();
  const batch = db.batch;
  db.batch = statements => {
    database.prepare('UPDATE lesson_sources SET extraction_hash=? WHERE id=?').run('d'.repeat(64), sourceId);
    return batch(statements);
  };
  const service = createLessonService({ db });
  await assert.rejects(() => service.savePackage({ ownerAccountId: 'owner', package: packageFixture() }), /SOURCE_REVIEW_REQUIRED/);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM lesson_packages').get().n, 0);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM lesson_package_sources').get().n, 0);
});

test('approval requires its parent source snapshot and denies a root from reviewing a foreign original', async () => {
  const { db, database } = dbFixture();
  const service = createLessonService({ db });
  const saved = await service.savePackage({ ownerAccountId: 'owner', package: packageFixture() });
  const input = { actorAccountId: 'owner', id: saved.row.rowId, parentHash: saved.row.contentHash, version: '1.0.1', sourceReviewAck: [sourceRef] };
  await assert.rejects(() => service.approvePackage({ ...input, actorAccountId: 'other', isRoot: true }), /SOURCE_REVIEW_REQUIRED/);
  database.prepare('DELETE FROM lesson_package_sources WHERE package_row_id=?').run(saved.row.rowId);
  await assert.rejects(() => service.approvePackage(input), /SOURCE_REVIEW_REQUIRED/);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM lesson_packages').get().n, 1);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM lesson_approvals').get().n, 0);
});
