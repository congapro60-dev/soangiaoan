import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';

// ponytail: fixed offline backup allowlist; add a reviewed snapshot, never a live DB path.
const root = resolve(import.meta.dirname, '../..');
const artifact = join(root, 'tasks/codex-release-migration-20261009.json');
const sources = ['local-before-lesson-20261004.sqlite', 'local-before-plan-0009-20261004.sqlite'];
const journal = JSON.parse(await readFile(join(root, 'drizzle/meta/_journal.json'), 'utf8')).entries;
const contract = JSON.parse(await readFile(join(root, 'drizzle/meta/0013_snapshot.json'), 'utf8')).tables;
const migrations = await Promise.all(journal.map(async entry => {
  const file = `${entry.tag}.sql`;
  const sql = await readFile(join(root, 'drizzle', file), 'utf8');
  return { index: entry.idx, file, sql, sha256: sha(sql) };
}));
assert.deepEqual(migrations.map(item => item.index), Array.from({ length: 14 }, (_, index) => index), 'Expected contiguous migrations 0000–0013');
const json = value => JSON.stringify(value);
function sha(value) { return createHash('sha256').update(value).digest('hex'); }
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 }).trim();
const snapshot = () => ({ branch: git('branch', '--show-current'), head: git('rev-parse', 'HEAD'), trackedDiffSha256: sha(git('diff', 'HEAD', '--binary')), status: git('status', '--short').split('\n') });
const objects = db => db.prepare("SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_%' ESCAPE '\\' ORDER BY type,name").all();
const exists = (db, type, name) => Boolean(db.prepare('SELECT 1 FROM sqlite_master WHERE type=? AND name=?').get(type, name));
const columns = (db, table) => db.prepare(`PRAGMA table_info("${table}")`).all().map(row => row.name);
const integrity = db => {
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
  return { integrityCheck: 'ok', foreignKeyViolations: 0, foreignKeysEnabled: true };
};
const dataSnapshot = db => Object.fromEntries(objects(db).filter(row => row.type === 'table').map(({ name }) => [name, {
  columns: columns(db, name),
  rows: db.prepare(`SELECT * FROM "${name}"`).all(),
}]));
function preserved(db, before) {
  return Object.fromEntries(Object.entries(before).map(([table, value]) => {
    assert(exists(db, 'table', table), `Removed table: ${table}`);
    assert(value.columns.every(column => columns(db, table).includes(column)), `Removed column: ${table}`);
    const fingerprint = rows => sha(json(rows.map(row => value.columns.map(column => row[column])).map(json).sort()));
    const rows = db.prepare(`SELECT * FROM "${table}"`).all();
    const beforeHash = fingerprint(value.rows), afterHash = fingerprint(rows);
    assert.equal(afterHash, beforeHash, `Rows changed: ${table}`);
    return [table, { beforeCount: value.rows.length, afterCount: rows.length, columnsChecked: value.columns, beforeHash, afterHash }];
  }));
}
function apply(db, migration) {
  db.exec('BEGIN');
  try {
    db.exec(migration.sql);
    integrity(db);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw new Error(`${migration.file}: ${error.message}`, { cause: error }); }
}
function stage(db) {
  const groups = [
    ['lesson_packages', 'lesson_approvals', 'lesson_sessions', 'lesson_learners', 'lesson_event_receipts'],
    ['lesson_session_plans'], ['lesson_sources', 'lesson_package_sources'], [], ['lesson_generation_jobs'],
    ['exams', 'exam_attempts', 'exam_answers', 'exam_assets'],
  ];
  const states = groups.map((tables, index) => {
    if (index === 3) return exists(db, 'index', 'idx_lesson_source_hash') && !db.prepare('PRAGMA index_list(lesson_sources)').all().find(row => row.name === 'idx_lesson_source_hash').unique;
    const found = tables.filter(table => exists(db, 'table', table));
    assert(found.length === 0 || found.length === tables.length, `Partial migration: ${index + 8}`);
    return found.length > 0;
  });
  assert(!states.some((value, index) => value && states.slice(0, index).includes(false)), 'Noncontiguous schema');
  if (states[1]) assert(columns(db, 'lesson_sessions').includes('plan_row_id') && columns(db, 'lesson_sessions').includes('plan_hash'), 'Partial 0009');
  return 7 + states.filter(Boolean).length;
}
function seedLesson(db) {
  db.exec(`
    INSERT INTO accounts VALUES ('qa-owner','qa@example.invalid','QA',1);
    INSERT INTO rooms (id,code,admin_hash,title,created,owner_account_id) VALUES ('qa-room','QA0001','hash','QA',1,'qa-owner');
    INSERT INTO lesson_packages VALUES ('qa-package','qa-owner','qa','1','package-hash','approved','{}',NULL,1);
    INSERT INTO lesson_approvals VALUES ('qa-approval','qa-package','qa-owner','parent','package-hash','{}',1);
    INSERT INTO lesson_sessions VALUES ('qa-session','qa-room','qa-package','1','package-hash','qa-owner','request','fingerprint','{}',3,'waiting','nonce','presenter-hash',1,2);
    INSERT INTO lesson_learners VALUES ('qa-learner','qa-session','qa-learner','QA learner','qa learner','token-hash',1,1);
    INSERT INTO lesson_event_receipts VALUES ('qa-receipt','qa-session','actor','event','fingerprint','{"accepted":true}',1);
  `);
}
function constraints(db) {
  assert.throws(() => db.exec("UPDATE lesson_packages SET status='draft'"), /immutable/);
  assert.throws(() => db.exec("DELETE FROM lesson_packages"), /immutable/);
  db.exec("INSERT INTO lesson_session_plans VALUES ('qa-plan','qa-owner','qa-package','1','package-hash','plan-hash','{}','{}','qa-owner',1)");
  assert.throws(() => db.exec("UPDATE lesson_session_plans SET data='changed'"), /immutable/);
  assert.throws(() => db.exec("DELETE FROM lesson_session_plans"), /immutable/);
  assert.throws(() => db.exec("UPDATE lesson_sessions SET plan_row_id='qa-plan',plan_hash='wrong' WHERE id='qa-session'"), /FOREIGN KEY/);
  db.exec("UPDATE lesson_sessions SET plan_row_id='qa-plan',plan_hash='plan-hash' WHERE id='qa-session'");
  const insertSource = db.prepare('INSERT INTO lesson_sources VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  insertSource.run('qa-source-2', 'qa-owner', 'qa-source-2', 'fingerprint', 'qa.txt', 'text/plain', 1, 'same-source-hash', 'ready', 'parser', 'extraction', null, 1, 1);
  db.exec("INSERT INTO lesson_package_sources VALUES ('qa-package','1','package-hash','qa-source-1','same-source-hash','parser','extraction','qa-owner')");
  db.exec("INSERT INTO lesson_generation_jobs VALUES ('qa-job','qa-owner','qa-source-1','same-source-hash','parser','extraction','qa-request','fingerprint','{}','offline','done','{}',NULL,1,1,1,1)");
  db.exec("INSERT INTO exams VALUES ('qa-exam','qa-owner','QAEXAM','QA','waiting',40,'{}','[]',NULL,NULL,NULL,NULL,1,1)");
  db.exec("INSERT INTO exam_attempts VALUES ('qa-attempt','qa-exam','QA learner','qa learner','exam-token',0,0,1,1,NULL)");
  db.exec("INSERT INTO exam_answers VALUES ('qa-attempt','q1','{}',1,NULL,1)");
  db.exec("INSERT INTO exam_assets VALUES ('qa-asset','qa-exam','qa-attempt','q1','answer','image/png','synthetic',1,1)");
  assert.throws(() => db.exec("INSERT INTO exam_answers VALUES ('missing','q1','{}',1,NULL,1)"), /FOREIGN KEY/);
  assert.equal(db.prepare('PRAGMA index_list(lesson_sources)').all().find(row => row.name === 'idx_lesson_source_hash').unique, 0);
  integrity(db);
  return ['package/plan immutable triggers', 'matching composite plan FK', 'duplicate source hash permitted after 0011', 'source/job/exam table inserts', 'invalid exam answer FK rejected'];
}
function schemaContract(db) {
  for (const [table, expected] of Object.entries(contract)) {
    const actual = db.prepare(`PRAGMA table_info("${table}")`).all();
    assert.deepEqual(actual.map(row => row.name).sort(), Object.keys(expected.columns).sort(), `Column contract: ${table}`);
    for (const [column, definition] of Object.entries(expected.columns)) {
      const row = actual.find(item => item.name === column);
      assert.equal(row.type.toLowerCase(), definition.type.toLowerCase(), `Type contract: ${table}.${column}`);
      assert.equal(Boolean(row.notnull), definition.notNull, `Nullability contract: ${table}.${column}`);
      assert.equal(Boolean(row.pk), definition.primaryKey, `Primary key contract: ${table}.${column}`);
    }
    for (const [index, definition] of Object.entries(expected.indexes)) {
      const row = db.prepare(`PRAGMA index_list("${table}")`).all().find(item => item.name === index);
      assert(row, `Index contract: ${index}`);
      assert.equal(Boolean(row.unique), definition.isUnique, `Unique contract: ${index}`);
      assert.deepEqual(db.prepare(`PRAGMA index_info("${index}")`).all().map(item => item.name), definition.columns, `Index columns: ${index}`);
    }
    const fks = db.prepare(`PRAGMA foreign_key_list("${table}")`).all();
    const actualFks = [...new Set(fks.map(row => row.id))].map(id => fks.filter(row => row.id === id).sort((a, b) => a.seq - b.seq));
    const normalize = (target, from, to, onUpdate, onDelete) => json([target, from, to, onUpdate.toLowerCase(), onDelete.toLowerCase()]);
    assert.deepEqual(actualFks.map(group => normalize(group[0].table, group.map(row => row.from), group.map(row => row.to), group[0].on_update, group[0].on_delete)).sort(), Object.values(expected.foreignKeys).map(fk => normalize(fk.tableTo, fk.columnsFrom, fk.columnsTo, fk.onUpdate, fk.onDelete)).sort(), `FK contract: ${table}`);
  }
  return { snapshot: 'drizzle/meta/0013_snapshot.json', tables: Object.keys(contract).length, columnsTypesNullabilityPrimaryKeysIndexesForeignKeys: 'PASS' };
}

const worktreeBefore = snapshot();
await rm(artifact, { force: true });
const reference = new DatabaseSync(':memory:');
reference.exec('PRAGMA foreign_keys=ON');
const schemas = {};
for (const migration of migrations) {
  apply(reference, migration);
  schemas[migration.index] = objects(reference);
}
reference.close();
const result = [];
for (const name of sources) {
  const source = join(root, '.sites-runtime', name);
  const sourceBytes = await readFile(source), sourceSha256 = sha(sourceBytes);
  const temp = await mkdtemp(join(tmpdir(), 'codex-release-'));
  let db, sourceDb;
  try {
    sourceDb = new DatabaseSync(source, { readOnly: true });
    sourceDb.exec('PRAGMA foreign_keys=ON');
    const sourceChecks = integrity(sourceDb), detectedStage = stage(sourceDb);
    assert.deepEqual(objects(sourceDb), schemas[detectedStage], 'Backup schema does not match detected stage');
    await backup(sourceDb, join(temp, 'copy.sqlite'));
    sourceDb.close(); sourceDb = undefined;
    db = new DatabaseSync(join(temp, 'copy.sqlite'));
    db.exec('PRAGMA foreign_keys=ON');
    const before = dataSnapshot(db), steps = [];
    for (const migration of migrations.filter(item => item.index > detectedStage)) {
      const stepBefore = dataSnapshot(db);
      apply(db, migration);
      const preservation = preserved(db, stepBefore);
      if (migration.index === 9) assert.equal(db.prepare('SELECT count(*) AS n FROM lesson_sessions WHERE plan_row_id IS NULL AND plan_hash IS NULL').get().n, stepBefore.lesson_sessions.rows.length);
      assert.deepEqual(objects(db), schemas[migration.index], `Schema mismatch: ${migration.file}`);
      steps.push({ file: migration.file, sha256: migration.sha256, schemaSha256: sha(json(objects(db))), objects: objects(db).map(({ type, name, sql }) => ({ type, name, sqlSha256: sha(sql) })), preserved: preservation, ...integrity(db) });
    }
    result.push({ source: relative(root, source), sourceBytes: sourceBytes.length, sourceSha256, detectedStage, sourceChecks, applied: steps, preservedAcrossChain: preserved(db, before), schemaCompatible: true, schemaContract: schemaContract(db), ...integrity(db) });
  } finally {
    db?.close(); sourceDb?.close();
    assert.equal(sha(await readFile(source)), sourceSha256, 'Source backup changed');
    assert.equal(dirname(resolve(temp)), resolve(tmpdir()), 'Cleanup must remain in OS temp');
    await rm(temp, { recursive: true, force: true });
  }
}
const seeded = new DatabaseSync(':memory:');
seeded.exec('PRAGMA foreign_keys=ON');
for (const migration of migrations.filter(item => item.index <= 8)) apply(seeded, migration);
seedLesson(seeded);
const seededBefore = dataSnapshot(seeded), seededSteps = [];
for (const migration of migrations.filter(item => item.index > 8)) {
  const before = dataSnapshot(seeded);
  apply(seeded, migration);
  seededSteps.push({ file: migration.file, preserved: preserved(seeded, before), ...integrity(seeded) });
  if (migration.index === 10) seeded.exec("INSERT INTO lesson_sources VALUES ('qa-source-1','qa-owner','qa-source-1','fingerprint','qa.txt','text/plain',1,'same-source-hash','ready','parser','extraction',NULL,1,1)");
}
assert.equal(seeded.prepare('SELECT count(*) AS n FROM lesson_sessions WHERE plan_row_id IS NULL AND plan_hash IS NULL').get().n, 1);
const seededPreserved = preserved(seeded, seededBefore), constraintChecks = constraints(seeded);
seeded.close();
const worktreeAfter = snapshot();
assert.equal(worktreeBefore.head, worktreeAfter.head, 'HEAD changed during rehearsal');
const report = {
  result: 'PASS', generatedAt: new Date().toISOString(), node: process.version, command: 'node scripts/qa/codex-release-migration.mjs',
  sourceReadOnly: true, sourceFilesUnchanged: true, copiesInOsTempRemoved: true, liveDatabaseTouched: false,
  worktreeBefore, worktreeAfter, sourceFreeze: false,
  migrations: migrations.filter(item => item.index >= 8).map(({ index, file, sha256 }) => ({ index, file, sha256 })),
  backups: result, seededOlderSchema: { applied: seededSteps, preservedAcrossChain: seededPreserved, legacyPlanFieldsRemainNull: true, constraintChecks },
};
await writeFile(artifact, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(json({ artifact, backups: result.map(({ source, detectedStage, applied }) => ({ source, detectedStage, applied: applied.map(item => item.file) })), seededConstraintChecks: constraintChecks, result: 'PASS', sourceFreeze: false }));
