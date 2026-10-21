import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '../..');
const source = 'C:/Users/ADMIN/.codex/backups/signal-station-site/release6-production-20261011/reconstructed-production-verified.sqlite';
const baseline = join(root, '.sites-runtime/release5-checkout-20261010');
const qaRoot = join(root, '.sites-runtime/takeover-migration-qa');
const directory = join(qaRoot, new Date().toISOString().replace(/[:.]/g, '-'));
const artifact = join(root, 'tasks/codex-takeover-migration-qa.json');
const migrationFiles=['0017_lesson_classes.sql','0018_lesson_leagues.sql','0019_lesson_devices.sql'];
const sha = value => createHash('sha256').update(value).digest('hex');
const quote = name => '"' + name.replaceAll('"', '""') + '"';
const tables = db => db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row => row.name);
const snapshot = db => Object.fromEntries(tables(db).map(table => [table, { columns: db.prepare('PRAGMA table_info(' + quote(table) + ')').all().map(row => row.name), rows: db.prepare('SELECT * FROM ' + quote(table)).all() }]));
const fingerprint = (rows, columns) => sha(JSON.stringify(rows.map(row => JSON.stringify(columns.map(column => row[column]))).sort()));
function integrity(db) { assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok'); assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []); return { integrityCheck: 'ok', foreignKeyViolations: 0 }; }
function preserved(db, before) {
  return Object.fromEntries(Object.entries(before).map(([table, value]) => {
    const after = db.prepare('SELECT * FROM ' + quote(table)).all();
    const afterColumns = db.prepare('PRAGMA table_info(' + quote(table) + ')').all().map(row => row.name);
    assert(value.columns.every(column => afterColumns.includes(column)), 'Removed column in ' + table);
    const beforeHash = fingerprint(value.rows, value.columns), afterHash = fingerprint(after, value.columns);
    assert.equal(afterHash, beforeHash, 'Rows changed in ' + table);
    return [table, { beforeRows: value.rows.length, afterRows: after.length, columnsChecked: value.columns, beforeHash, afterHash }];
  }));
}
const report = { generatedAt: new Date().toISOString(), command: 'node scripts/qa/codex-takeover-migration.mjs', result: 'HOLD', sourceReadOnly: true, productionTouched: false, externalProviderRequests: 0, sqlite: null, oldWorker: null };
await mkdir(directory, { recursive: true });
let readonly, copy, rollbackCopy, mf;
const sourceHash = sha(await readFile(source));
try {
  const migrations=await Promise.all(migrationFiles.map(file=>readFile(join(root,'drizzle',file),'utf8')));const migration=migrations.join('\n--> statement-breakpoint\n');
  readonly = new DatabaseSync(source, { readOnly: true }); readonly.exec('PRAGMA foreign_keys=ON');
  const before = snapshot(readonly); integrity(readonly);
  const copied = join(directory, 'extended.sqlite');
  await backup(readonly, copied);
  await backup(readonly, join(directory, 'rollback.sqlite'));
  copy = new DatabaseSync(copied); copy.exec('PRAGMA foreign_keys=ON');
  copy.exec('BEGIN');
  try { copy.exec(migration); integrity(copy); copy.exec('COMMIT'); } catch (error) { copy.exec('ROLLBACK'); throw error; }
  const preservation = preserved(copy, before);
  const newTables = tables(copy).filter(table => !(table in before));
  assert.deepEqual(newTables.sort(), ['lesson_class_evidence','lesson_class_login_sessions','lesson_class_members','lesson_class_teams','lesson_classes','lesson_devices','lesson_device_members','lesson_leagues','lesson_league_classes','lesson_league_round_results'].sort());
  assert.equal(copy.prepare('SELECT COUNT(*) AS n FROM lesson_sessions WHERE class_id IS NOT NULL').get().n, 0);
  assert.equal(copy.prepare('SELECT COUNT(*) AS n FROM lesson_learners WHERE class_member_id IS NOT NULL').get().n, 0);
  rollbackCopy = new DatabaseSync(join(directory, 'rollback.sqlite')); rollbackCopy.exec('PRAGMA foreign_keys=ON');
  rollbackCopy.exec('BEGIN'); rollbackCopy.exec(migration); rollbackCopy.exec('ROLLBACK');
  assert.deepEqual(tables(rollbackCopy), Object.keys(before).sort()); preserved(rollbackCopy, before); integrity(rollbackCopy);
  rollbackCopy.close(); rollbackCopy = undefined;
  report.sqlite = { result: 'PASS', source, sourceSha256: sourceHash, copy: copied, migrations: migrationFiles, migrationSha256: sha(migration), preserved: preservation, newTables, nullableOldBindings: true, transactionalRollback: 'PASS', ...integrity(copy) };
  const extendedSnapshot = snapshot(copy); copy.close(); copy = undefined;
  readonly.close(); readonly = undefined;

  const require = createRequire(import.meta.url), wrangler = require.resolve('wrangler');
  const { Miniflare } = await import(pathToFileURL(require.resolve('miniflare', { paths: [wrangler] })).href);
  const workerIndex = join(baseline, 'dist/server/index.js');
  const workerDirectory = join(baseline, 'dist/server');
  const workerModules = (await readdir(workerDirectory, { recursive: true })).filter(file => file.endsWith('.js') && file !== 'index.js').sort().map(file => ({ type: 'ESModule', path: join(workerDirectory, file) }));
  const oldHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: baseline, encoding: 'utf8' }).trim();
  assert.equal(oldHead, 'c370a1661126d04855f94326bf20d5774627fc9a');
  mf = new Miniflare({
    rootPath: workerDirectory, modules: [{ type: 'ESModule', path: workerIndex }, ...workerModules],
    compatibilityDate: '2026-05-15', compatibilityFlags: ['nodejs_compat'], d1Databases: { DB: 'takeover-old-worker-qa' }, d1Persist: join(directory, 'd1'), r2Buckets: { LESSON_SOURCES: 'takeover-old-worker-qa' }, r2Persist: join(directory, 'r2'), port: 5195, host: '127.0.0.1',
    outboundService: () => { report.externalProviderRequests++; return new Response('External requests disabled in migration QA', { status: 403 }); }
  });
  const database = await mf.getD1Database('DB');
  const oldJournal = JSON.parse(await readFile(join(baseline, 'drizzle/meta/_journal.json'), 'utf8')).entries;
  assert.equal(oldJournal.at(-1).tag, '0016_exam_review_access');
  for (const entry of oldJournal) {
    const sql = await readFile(join(baseline, 'drizzle', entry.tag + '.sql'), 'utf8');
    for (const part of sql.split('--> statement-breakpoint').filter(part => part.trim())) await database.prepare(part).run();
  }
  for (const [table, value] of Object.entries(before)) {
    for (const row of value.rows) await database.prepare('INSERT INTO ' + quote(table) + '(' + value.columns.map(quote).join(',') + ') VALUES(' + value.columns.map(() => '?').join(',') + ')').bind(...value.columns.map(column => row[column])).run();
  }
  await database.batch(migration.split('--> statement-breakpoint').filter(part => part.trim()).map(part => database.prepare(part)));
  const runtimePreserved = {};
  for (const [table, value] of Object.entries(extendedSnapshot)) {
    const rows = (await database.prepare('SELECT * FROM ' + quote(table)).all()).results;
    assert.equal(fingerprint(rows, value.columns), fingerprint(value.rows, value.columns), 'Worker D1 imported snapshot ' + table);
    runtimePreserved[table] = { rows: rows.length, hash: fingerprint(rows, value.columns) };
  }
  const checks = [];
  const owner = 'qa-takeover-migration-' + Date.now();
  const teacher = { 'oai-authenticated-user-id': owner, 'oai-authenticated-user-email': owner + '@example.invalid' };
  const request = async (path, body, headers = {}, expected = 200) => {
    const response = await fetch('http://127.0.0.1:5195' + path, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json(); checks.push({ path: path.split('?')[0], action: body?.action || 'GET', status: response.status, expected, ...(data.error ? { error: data.error } : {}) });
    assert.equal(response.status, expected, JSON.stringify(checks.at(-1))); return data;
  };
  await request('/api/lessons', undefined, {}, 401);
  const fixture = JSON.parse(await readFile(join(baseline, 'content/lessons/g11-sequences-p1.json'), 'utf8'));
  fixture.id = 'qa-takeover-migration'; fixture.version = '0.0.1'; fixture.status = 'draft'; delete fixture.contentHash;
  const saved = await request('/api/lessons', { action: 'save', package: fixture }, teacher);
  assert(saved.row.rowId && saved.package.contentHash);
  const listed = await request('/api/lessons', undefined, teacher); assert.equal(listed.packages.length, 1); assert.equal(listed.packages[0].row_id, saved.row.rowId);
  const created = await request('/api/lesson-sessions', { action: 'create', packageRowId: saved.row.rowId, packageVersion: fixture.version, packageHash: saved.package.contentHash, mode: 'preview', title: 'Synthetic migration QA', requestId: 'qa-create-migration-' + Date.now() }, teacher);
  assert(created.session.id && created.session.code);
  const token = randomBytes(32).toString('base64url');
  const joined = await request('/api/lesson-sessions', { action: 'join', code: created.session.code, name: 'HS giả migration', requestId: 'qa-join-migration' }, { Authorization: 'Bearer ' + token });
  assert(joined.learnerId);
  const own = await request('/api/lesson-sessions?id=' + encodeURIComponent(created.session.id), undefined, { Authorization: 'Bearer ' + token }); assert.equal(own.view.status, 'waiting');
  const started = await request('/api/lesson-sessions', { action: 'event', id: created.session.id, event: { type: 'START', payload: {}, round: own.view.round, revision: own.view.revision, eventId: 'qa-start-migration' } }, teacher);
  const running = await request('/api/lesson-sessions?id=' + encodeURIComponent(created.session.id), undefined, { Authorization: 'Bearer ' + token }); assert.equal(running.view.status, 'active'); assert(running.view.tasks.length > 0);
  assert.equal(JSON.stringify(running.view.tasks).includes('answerKey'), false);
  await request('/api/lesson-sessions?id=' + encodeURIComponent(created.session.id), undefined, { Authorization: 'Bearer ' + randomBytes(32).toString('base64url') }, 403);
  assert.equal(started.result.ok, true);
  const nullable = await database.prepare('SELECT s.class_id,l.class_member_id FROM lesson_sessions s JOIN lesson_learners l ON l.session_id=s.id WHERE s.id=?').bind(created.session.id).first();
  assert.equal(nullable.class_id, null); assert.equal(nullable.class_member_id, null);
  const userCounts = { accounts: (await database.prepare('SELECT COUNT(*) AS n FROM accounts').first()).n, lessonPackages: (await database.prepare('SELECT COUNT(*) AS n FROM lesson_packages').first()).n, lessonSessions: (await database.prepare('SELECT COUNT(*) AS n FROM lesson_sessions').first()).n, classMembers: (await database.prepare('SELECT COUNT(*) AS n FROM lesson_class_members').first()).n };
  await database.batch([
    database.prepare('DELETE FROM lesson_event_receipts WHERE session_id=?').bind(created.session.id),
    database.prepare('DELETE FROM lesson_learners WHERE session_id=?').bind(created.session.id),
    database.prepare('DELETE FROM lesson_sessions WHERE id=?').bind(created.session.id),
    database.prepare('DELETE FROM admin_audit WHERE room_id=?').bind(created.session.roomId),
    database.prepare('DELETE FROM room_memberships WHERE room_id=?').bind(created.session.roomId),
    database.prepare('DELETE FROM rooms WHERE id=?').bind(created.session.roomId)
  ]);
  assert.equal((await database.prepare('SELECT COUNT(*) AS n FROM lesson_sessions').first()).n, before.lesson_sessions.rows.length);
  assert.equal(report.externalProviderRequests, 0);
  report.oldWorker = { result: 'PASS', baselineHead: oldHead, workerSha256: sha(await readFile(workerIndex)), url: 'http://127.0.0.1:5195', runtime: 'actual workerd + D1; released compiled Worker, unchanged', persistence: directory, importedTables: runtimePreserved, checks, syntheticCountsDuringQA: userCounts, oldWorkerInsertedNullClassBindings: true, syntheticRoomRemoved: true, syntheticPackageRetainedLocalOnly: true, limits: ['Logical production backup; no provider physical/system ledger proof', 'R2 contents not copied; no source-file lifecycle exercised', 'Immutable local synthetic package/owner remains in disposable QA persistence; no production fixtures', 'Current candidate Worker is not built or certified by this rollback check'] };
  report.result = 'PASS';
} catch (error) {
  report.failure = String(error?.message || error); throw error;
} finally {
  copy?.close(); readonly?.close(); rollbackCopy?.close(); await mf?.dispose();
  if (report.oldWorker?.result === 'PASS') {
    const d1Directory = join(directory, 'd1');
    const d1Files = (await readdir(d1Directory, { recursive: true })).filter(file => /(?:^|[\\/])[0-9a-f]{64}\.sqlite$/.test(file));
    assert.equal(d1Files.length, 1, 'Expected exactly one isolated D1 SQLite database');
    const checked = new DatabaseSync(join(d1Directory, d1Files[0]), { readOnly: true });
    try { checked.exec('PRAGMA foreign_keys=ON'); report.oldWorker.persistedSqlite = integrity(checked); } finally { checked.close(); }
  }
  assert.equal(sha(await readFile(source)), sourceHash, 'Read-only recovery backup changed');
  report.sourceUnchanged = true; await writeFile(artifact, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ artifact, result: report.result, sqlite: report.sqlite?.result, oldWorker: report.oldWorker?.result, externalProviderRequests: report.externalProviderRequests, ...(report.failure ? { failure: report.failure } : {}) }));
}
