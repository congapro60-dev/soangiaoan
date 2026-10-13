import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import { resolveIdentity } from '../lib/account-room-access.js';
import { createLessonClassService } from '../lib/lesson/class-service.js';

const migration = () => readFileSync(new URL('../drizzle/0017_lesson_classes.sql', import.meta.url), 'utf8');
function setup(beforeWrite = () => {}) {
  const database = new DatabaseSync(':memory:');
  database.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE accounts(id TEXT PRIMARY KEY,email TEXT NOT NULL,display_name TEXT,created_at INTEGER NOT NULL);
    CREATE TABLE lesson_packages(row_id TEXT PRIMARY KEY,content_hash TEXT NOT NULL,status TEXT NOT NULL,data TEXT NOT NULL);
    CREATE TABLE rooms(id TEXT PRIMARY KEY,owner_account_id TEXT,deleted_at INTEGER);
    CREATE TABLE lesson_sessions(id TEXT PRIMARY KEY,owner_account_id TEXT NOT NULL,package_row_id TEXT NOT NULL,package_hash TEXT NOT NULL,state TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE lesson_learners(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,learner_id TEXT NOT NULL,name TEXT NOT NULL,token_hash TEXT NOT NULL);
    INSERT INTO accounts VALUES('teacher-1','t1@test','Teacher',1),('teacher-2','t2@test','Teacher',1);
    INSERT INTO lesson_sessions VALUES('legacy','teacher-1','legacy-pkg','legacy-hash','{}',0);
    INSERT INTO lesson_learners VALUES('legacy-learner','legacy','learner-1','Old','legacy-token');`);
  database.exec("ALTER TABLE lesson_sessions ADD room_id TEXT DEFAULT 'room'; INSERT INTO rooms VALUES('room','teacher-1',NULL);");
  const oldSession = database.prepare('SELECT * FROM lesson_sessions').get();
  const oldLearner = database.prepare('SELECT * FROM lesson_learners').get();
  for (const part of (migration() + '\n' + readFileSync(new URL('../drizzle/0022_site_trash.sql', import.meta.url), 'utf8')).split('--> statement-breakpoint')) if (part.trim()) database.exec(part);
  const prepare = sql => ({ bind: (...values) => ({
    first: async () => { if (/^(UPDATE|INSERT|DELETE)/.test(sql)) beforeWrite(sql, database); return database.prepare(sql).get(...values) ?? null; },
    all: async () => ({ results: database.prepare(sql).all(...values) }),
    run: async () => { beforeWrite(sql, database); return { meta: { changes: Number(database.prepare(sql).run(...values).changes) } }; }
  }) });
  let tail = Promise.resolve();
  const db = { prepare, batch: statements => {
    const result = tail.then(async () => { database.exec('BEGIN'); try { const out = []; for (const statement of statements) out.push(await statement.run()); database.exec('COMMIT'); return out; } catch (error) { database.exec('ROLLBACK'); throw error; } });
    tail = result.catch(() => {}); return result;
  } };
  const clock = { t: 1_000_000 };
  return { database, db, clock, oldSession, oldLearner, service: createLessonClassService({ db, now: () => clock.t }) };
}
const owner = 'teacher-1';
async function roster(env) {
  const { class: classroom } = await env.service.createClass({ ownerAccountId: owner, title: 'Lớp QA', requestId: 'class-req-1' });
  const first = await env.service.addMember({ ownerAccountId: owner, classId: classroom.id, name: 'An', requestId: 'member-req-1' });
  const second = await env.service.addMember({ ownerAccountId: owner, classId: classroom.id, name: 'An', requestId: 'member-req-2' });
  const credentials = { classCode: classroom.code, memberCode: first.member.code, pin: first.pin };
  return { classroom, first, second, credentials };
}

test('0017 appends nullable identity bindings and preserves old sessions and pupil tokens', () => {
  const env = setup();
  const session = env.database.prepare('SELECT * FROM lesson_sessions WHERE id=?').get('legacy');
  const learner = env.database.prepare('SELECT * FROM lesson_learners WHERE id=?').get('legacy-learner');
  assert.equal(session.class_id, null); delete session.class_id;
  assert.equal(learner.class_member_id, null); delete learner.class_member_id;
  assert.deepEqual(session, env.oldSession); assert.deepEqual(learner, env.oldLearner);
  assert.throws(() => env.database.exec("UPDATE lesson_sessions SET class_id='missing' WHERE id='legacy'"), /FOREIGN KEY/);
});

test('teacher-owned class CRUD, fixed teams, distinct duplicate names and one-time PIN disclosure', async () => {
  const env = setup(); const { classroom, first, second } = await roster(env);
  assert.notEqual(first.member.id, second.member.id); assert.notEqual(first.member.code, second.member.code);
  assert.match(first.pin, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
  const row = env.database.prepare('SELECT * FROM lesson_class_members WHERE id=?').get(first.member.id);
  assert.match(row.pin_hash, /^pbkdf2-sha256:100000:/); assert.equal(JSON.stringify(row).includes(first.pin), false);
  const replay = await env.service.addMember({ ownerAccountId: owner, classId: classroom.id, name: 'An', requestId: 'member-req-1' });
  assert.equal(replay.member.id, first.member.id); assert.equal('pin' in replay, false);
  await assert.rejects(() => env.service.addMember({ ownerAccountId: owner, classId: classroom.id, name: 'Different', requestId: 'member-req-1' }), /REQUEST_CONFLICT/);
  for (const method of ['getClass', 'updateClass', 'deleteClass', 'addMember']) await assert.rejects(() => env.service[method]({ ownerAccountId: 'teacher-2', classId: classroom.id, title: 'Other', name: 'Other', requestId: 'member-req-3', confirmTitle: classroom.title }), /NOT_FOUND/);
  const team = await env.service.createTeam({ ownerAccountId: owner, classId: classroom.id, title: 'Nhóm 1', requestId: 'team-req-1' });
  await env.service.updateMember({ ownerAccountId: owner, classId: classroom.id, memberId: first.member.id, name: 'An mới', teamId: team.team.id });
  const view = await env.service.getClass({ ownerAccountId: owner, classId: classroom.id });
  assert.equal(view.members[0].teamId, team.team.id);
  assert.equal(/pin|hash|token/i.test(JSON.stringify(view)), false);
  assert.equal((await env.service.listClasses('teacher-2')).classes.length, 0);
  await env.service.updateClass({ ownerAccountId: owner, classId: classroom.id, title: 'Lớp mới' });
  await assert.rejects(() => env.service.deleteClass({ ownerAccountId: owner, classId: classroom.id, confirmTitle: classroom.title }), /CONFIRM_REQUIRED/);
  await env.service.deleteClass({ ownerAccountId: owner, classId: classroom.id, confirmTitle: 'Lớp mới' });
  await assert.rejects(() => env.service.getClass({ ownerAccountId: owner, classId: classroom.id }), /NOT_FOUND/);
});

test('login authenticates one member, rate reservations atomically bound parallel PIN guesses to five per fifteen minutes', async () => {
  const env = setup(); const { credentials, first } = await roster(env);
  const failures = await Promise.allSettled(Array.from({ length: 8 }, () => env.service.joinClass({ ...credentials, pin: 'ZZZZZZZZ' })));
  assert.equal(failures.every(result => result.status === 'rejected' && result.reason.message === 'CLASS_LOGIN_UNAVAILABLE'), true);
  assert.equal(env.database.prepare('SELECT login_fail_count FROM lesson_class_members WHERE id=?').get(first.member.id).login_fail_count, 5);
  await assert.rejects(() => env.service.joinClass(credentials), /CLASS_LOGIN_UNAVAILABLE/);
  env.clock.t += 15 * 60 * 1000;
  const joined = await env.service.joinClass(credentials);
  assert.match(joined.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(env.database.prepare('SELECT login_fail_count FROM lesson_class_members WHERE id=?').get(first.member.id).login_fail_count, 0);
  assert.equal(JSON.stringify(env.database.prepare('SELECT * FROM lesson_class_login_sessions').all()).includes(joined.token), false);
  const own = await env.service.getPassport({ token: joined.token });
  assert.equal(own.member.id, first.member.id); assert.deepEqual(own.passport.objectives, []);
  await assert.rejects(() => env.service.getPassport({ token: joined.token.slice(0, -1) + '=' }), /AUTH_REQUIRED/);
  await env.service.revokeMember({ ownerAccountId: owner, classId: own.class.id, memberId: first.member.id });
  await assert.rejects(() => env.service.getPassport({ token: joined.token }), /AUTH_REQUIRED/);
  await assert.rejects(() => env.service.joinClass(credentials), /CLASS_LOGIN_UNAVAILABLE/);
});

test('PIN rotation revokes issued sessions; revocation during hash verification cannot issue a bearer', async () => {
  let armed = false;
  const env = setup((sql, database) => { if (armed && sql.startsWith('INSERT INTO lesson_class_login_sessions')) { armed = false; database.exec('UPDATE lesson_class_members SET revoked_at=7'); } });
  const { credentials, first, classroom } = await roster(env);
  const login = await env.service.joinClass(credentials);
  const reset = await env.service.resetMemberPin({ ownerAccountId: owner, classId: classroom.id, memberId: first.member.id });
  assert.match(reset.pin, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
  await assert.rejects(() => env.service.getPassport({ token: login.token }), /AUTH_REQUIRED/);
  await assert.rejects(() => env.service.joinClass(credentials), /CLASS_LOGIN_UNAVAILABLE/);
  armed = true;
  await assert.rejects(() => env.service.joinClass({ ...credentials, pin: reset.pin }), /CLASS_LOGIN_UNAVAILABLE/);
  assert.equal(armed, false);
});

function evidenceFixture(env, classroom, first, second) {
  const pkg = { objectives: [{ id: 'lo', code: 'T11.18', level: 'must', statement: 'Nhận biết dãy số' }], tasks: [{ id: 'recheck', participation: 'individual', branch: 'shared', type: 'closed' }, { id: 'exit', participation: 'individual', branch: 'core', type: 'closed' }, { id: 'game', participation: 'group', branch: 'extension', type: 'closed' }], evidenceRules: [{ taskId: 'recheck', kind: 'individual_recheck', countsForMastery: true, individual: true, objectiveIds: ['lo'] }, { taskId: 'exit', kind: 'exit', countsForMastery: true, individual: true, objectiveIds: ['lo'] }, { taskId: 'game', kind: 'group_product', countsForMastery: true, individual: false, objectiveIds: ['lo'] }] };
  env.database.prepare('INSERT INTO lesson_packages VALUES(?,?,?,?)').run('pkg', 'approved-hash', 'approved', JSON.stringify(pkg));
  const state = { passports: { 'learner-a': { submissions: [{ taskId: 'recheck', submissionId: 's1', assessmentStatus: 'assessed', ok: true, at: 1 }, { taskId: 'exit', submissionId: 's2', assessmentStatus: 'assessed', ok: true, at: 2 }, { taskId: 'game', submissionId: 's3', assessmentStatus: 'assessed', ok: true, at: 3 }], supportHistory: [], revealedTasks: {} }, 'learner-b': { submissions: [{ taskId: 'recheck', submissionId: 'foreign', assessmentStatus: 'assessed', ok: true, answer: 'PRIVATE ANSWER', at: 1 }] } }, gateStars: { 'learner-a': 999 }, gameWallets: { learners: { 'learner-a': { earned: 99999 } } } };
  env.database.prepare('INSERT INTO lesson_sessions(id,owner_account_id,package_row_id,package_hash,state,revision,class_id) VALUES(?,?,?,?,?,?,?)').run('lesson-1', owner, 'pkg', 'approved-hash', JSON.stringify(state), 1, classroom.id);
  for (const [id, learner, member] of [['bind-a', 'learner-a', first], ['bind-b', 'learner-b', second]]) env.database.prepare('INSERT INTO lesson_learners(id,session_id,learner_id,name,token_hash,class_member_id) VALUES(?,?,?,?,?,?)').run(id, 'lesson-1', learner, member.member.name, 'token-' + id, member.member.id);
  return { pkg, state };
}

test('trusted server evidence sync is idempotent, own-only, no answer leakage; game success cannot grant mastery', async () => {
  const env = setup(); const { classroom, first, second, credentials } = await roster(env);
  evidenceFixture(env, classroom, first, second);
  const joined = await env.service.joinClass(credentials);
  await assert.rejects(() => env.service.syncSessionEvidence({ ownerAccountId: 'teacher-2', sessionId: 'lesson-1' }), /NOT_FOUND/);
  await env.service.syncSessionEvidence({ ownerAccountId: owner, sessionId: 'lesson-1' });
  const before = env.database.prepare('SELECT COUNT(*) AS n FROM lesson_class_evidence').get().n;
  await env.service.syncSessionEvidence({ ownerAccountId: owner, sessionId: 'lesson-1', evidence: [{ ok: true, objectiveCode: 'FORGED' }] });
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_class_evidence').get().n, before);
  const own = await env.service.getPassport({ token: joined.token, memberId: second.member.id });
  assert.equal(own.member.id, first.member.id);
  assert.equal(own.passport.objectives[0].status, 'standard_mastery');
  assert.equal(own.passport.objectives[0].independentCount, 2);
  assert.equal(/PRIVATE ANSWER|foreign|FORGED|99999/.test(JSON.stringify(own)), false);
  assert.equal(env.database.prepare('SELECT * FROM lesson_class_evidence').all().some(row => 'answer' in row), false);
});

test('own cumulative passport keeps tutor recognition separate from maths evidence and hides peer work',async()=>{
 const env=setup();const {classroom,first,second,credentials}=await roster(env);const {state}=evidenceFixture(env,classroom,first,second);
 state.passports['learner-a'].tutorHistory=[{id:'help-1',recipientName:'Bạn đã đồng ý',activityId:'a1',recheckSubmissionId:'private-link',at:25},{id:'help-revoked',recipientName:'Bạn khác',at:30,revokedAt:35}];
 state.passports['learner-b'].tutorHistory=[{id:'peer-private',recipientName:'PRIVATE_OTHER_HELP',at:20}];
 env.database.prepare('UPDATE lesson_sessions SET state=? WHERE id=?').run(JSON.stringify(state),'lesson-1');
 const joined=await env.service.joinClass(credentials);const own=await env.service.getPassport({token:joined.token});
 assert.deepEqual(own.passport.tutorHistory,[{id:'help-1',recipientName:'Bạn đã đồng ý',at:25},{id:'help-revoked',recipientName:'Bạn khác',at:30,revokedAt:35}]);
 assert.equal(own.passport.objectives[0].independentCount,2);assert.equal(JSON.stringify(own).includes('PRIVATE_OTHER_HELP'),false);assert.equal(JSON.stringify(own).includes('private-link'),false);
});

test('support, same task replay across sessions and shared checks cannot grant standard mastery; a Should check can', async () => {
  const env = setup(); const { classroom, first, second, credentials } = await roster(env);
  const { pkg, state } = evidenceFixture(env, classroom, first, second);
  state.passports['learner-a'].supportHistory = [{ taskId: 'exit' }];
  env.database.prepare('UPDATE lesson_sessions SET state=?').run(JSON.stringify(state));
  await env.service.syncSessionEvidence({ ownerAccountId: owner, sessionId: 'lesson-1' });
  const joined = await env.service.joinClass(credentials);
  let own = await env.service.getPassport(joined);
  assert.equal(own.passport.objectives[0].status, 'supported');
  assert.equal(own.passport.objectives[0].independentCount, 1);
  env.database.prepare('INSERT INTO lesson_sessions(id,owner_account_id,package_row_id,package_hash,state,revision,class_id) VALUES(?,?,?,?,?,?,?)').run('lesson-2', owner, 'pkg', 'approved-hash', JSON.stringify(state), 1, classroom.id);
  env.database.prepare('INSERT INTO lesson_learners(id,session_id,learner_id,name,token_hash,class_member_id) VALUES(?,?,?,?,?,?)').run('bind-2', 'lesson-2', 'learner-a', 'An', 'token-2', first.member.id);
  await env.service.syncSessionEvidence({ ownerAccountId: owner, sessionId: 'lesson-2' });
  assert.equal((await env.service.getPassport(joined)).passport.objectives[0].independentCount, 1);
  pkg.tasks.push({ id: 'should-check', participation: 'individual', branch: 'core', type: 'closed' });
  pkg.evidenceRules.push({ taskId: 'should-check', kind: 'exit', countsForMastery: true, individual: true, objectiveIds: ['lo'] });
  state.passports['learner-a'].submissions.push({ taskId: 'should-check', submissionId: 'should-sub', assessmentStatus: 'assessed', ok: true, at: 3 });
  env.database.prepare('UPDATE lesson_packages SET data=?').run(JSON.stringify(pkg));
  env.database.prepare('UPDATE lesson_sessions SET state=?,revision=2 WHERE id=?').run(JSON.stringify(state), 'lesson-2');
  await env.service.syncSessionEvidence({ ownerAccountId: owner, sessionId: 'lesson-2' });
  own = await env.service.getPassport(joined);
  assert.equal(own.passport.objectives[0].status, 'standard_mastery');
  assert.equal(own.passport.objectives[0].independentCount, 2);
});

async function route(env) {
  const context = createContext({ Request, Response, URL, TextEncoder, TextDecoder, Uint8Array, console });
  const storage = new SyntheticModule(['db', 'stmt', 'getEnv'], function() { this.setExport('db', () => env.db); this.setExport('stmt', (sql, ...args) => env.db.prepare(sql).bind(...args)); this.setExport('getEnv', () => ({ SITE_OWNER_USER_ID: 'root', SITE_OWNER_EMAIL: 'root@test' })); }, { context });
  const identity = new SyntheticModule(['resolveIdentity'], function() { this.setExport('resolveIdentity', resolveIdentity); }, { context });
  const classes = new SyntheticModule(['createLessonClassService'], function() { this.setExport('createLessonClassService', () => env.service); }, { context });
  const http = new SourceTextModule(readFileSync(new URL('../lib/exam/http.js', import.meta.url), 'utf8'), { context });
  const api = new SourceTextModule(readFileSync(new URL('../app/api/lesson-classes/route.js', import.meta.url), 'utf8'), { context });
  await api.link(specifier => specifier.endsWith('storage.js') ? storage : specifier.endsWith('account-room-access.js') ? identity : specifier.endsWith('class-service.js') ? classes : http);
  await api.evaluate(); return api.namespace;
}
const teacherHeaders = id => ({ 'oai-authenticated-user-id': id, 'oai-authenticated-user-email': id === 'root' ? 'root@test' : id + '@test' });
test('HTTP Sites identity scopes teacher; bearer overrides root; pupils cannot forge evidence or read peers', async () => {
  const env = setup(); const { classroom, first, credentials } = await roster(env); const api = await route(env);
  const post = (body, headers = {}) => api.POST(new Request('https://test/api/lesson-classes', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }));
  assert.equal((await post({ action: 'create', title: 'Forged', requestId: 'class-body', ownerAccountId: owner })).status, 401);
  assert.equal((await api.GET(new Request('https://test/api/lesson-classes?id=' + classroom.id, { headers: teacherHeaders('root') }))).status, 404);
  const joinedResponse = await post({ action: 'join', ...credentials }); assert.equal(joinedResponse.status, 200);
  const joined = await joinedResponse.json();
  const own = await api.GET(new Request('https://test/api/lesson-classes?id=foreign&memberId=foreign', { headers: { authorization: 'Bearer ' + joined.token, ...teacherHeaders('root') } }));
  assert.equal(own.status, 200); assert.equal((await own.json()).member.id, first.member.id);
  for (const action of ['evidence', 'sync', 'member-add', 'create']) assert.equal((await post({ action, classId: classroom.id, ok: true }, { authorization: 'Bearer ' + joined.token, ...teacherHeaders(owner) })).status, 401);
  const unknown = await post({ action: 'join', classCode: 'ZZZZZZ', memberCode: 'ZZZZZZ', pin: 'ZZZZZZZZ' });
  const wrong = await post({ action: 'join', ...credentials, pin: 'ZZZZZZZZ' });
  assert.equal(unknown.status, 403); assert.deepEqual(await unknown.json(), await wrong.json());
  assert.equal(own.headers.get('Cache-Control'), 'no-store');
  const long = await post({ action: 'create', title: 'x'.repeat(33000), requestId: 'class-big' }, teacherHeaders(owner)); assert.equal(long.status, 413);
});

test('one evidence instance may cover two objectives; latest assessed failure replaces its former success', async () => {
  const env = setup(); const { classroom, first, second, credentials } = await roster(env);
  const { pkg, state } = evidenceFixture(env, classroom, first, second);
  pkg.objectives.push({ id: 'lo2', code: 'T11.19', statement: 'Biểu diễn dãy số', level: 'must' });
  pkg.evidenceRules.find(rule => rule.taskId === 'exit').objectiveIds.push('lo2');
  env.database.prepare('UPDATE lesson_packages SET data=?').run(JSON.stringify(pkg));
  await env.service.syncSessionEvidence({ ownerAccountId: owner, sessionId: 'lesson-1' });
  assert.equal(env.database.prepare("SELECT COUNT(*) AS n FROM lesson_class_evidence WHERE member_id=? AND submission_id='s2'").get(first.member.id).n, 2);
  const joined = await env.service.joinClass(credentials);
  state.passports['learner-a'].submissions.push({ taskId: 'recheck', submissionId: 'failed-latest', assessmentStatus: 'assessed', ok: false, at: 4 });
  env.database.prepare('UPDATE lesson_sessions SET state=?,revision=2').run(JSON.stringify(state));
  await env.service.syncSessionEvidence({ ownerAccountId: owner, sessionId: 'lesson-1' });
  const own = await env.service.getPassport(joined);
  assert.equal(own.passport.objectives.find(objective => objective.code === 'T11.18').independentCount, 1);
  assert.equal(own.passport.objectives.find(objective => objective.code === 'T11.18').status, 'supported');
});

test('a stale snapshot cannot write evidence after a newer lesson revision; cross-class team assignment is rejected', async () => {
  let armed = false;
  const env = setup((sql, database) => { if (armed && sql.startsWith('INSERT INTO lesson_class_evidence')) { armed = false; database.exec("UPDATE lesson_sessions SET revision=revision+1 WHERE id='lesson-1'"); } });
  const { classroom, first, second } = await roster(env); evidenceFixture(env, classroom, first, second);
  armed = true;
  await assert.rejects(() => env.service.syncSessionEvidence({ ownerAccountId: owner, sessionId: 'lesson-1' }), /EVIDENCE_SNAPSHOT_CHANGED/);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_class_evidence').get().n, 0);
  const { class: other } = await env.service.createClass({ ownerAccountId: owner, title: 'Other', requestId: 'other-class' });
  const { team } = await env.service.createTeam({ ownerAccountId: owner, classId: other.id, title: 'Other team', requestId: 'other-team' });
  await assert.rejects(() => env.service.updateMember({ ownerAccountId: owner, classId: classroom.id, memberId: first.member.id, teamId: team.id }), /INVALID_TEAM/);
  assert.throws(() => env.database.prepare('UPDATE lesson_class_members SET team_id=? WHERE id=?').run(team.id, first.member.id), /FOREIGN KEY/);
});

test('Should ability is separate from mastery task count; a new package version cannot double-count the same task', async () => {
  const env = setup(); const { classroom, first, second, credentials } = await roster(env);
  const { pkg, state } = evidenceFixture(env, classroom, first, second);
  pkg.tasks.find(task => task.id === 'exit').branch = 'shared';
  pkg.tasks.push({ id: 'practice', participation: 'individual', branch: 'core', type: 'closed' });
  pkg.evidenceRules.push({ taskId: 'practice', kind: 'individual_reasoning', countsForMastery: false, individual: true, objectiveIds: ['lo'] });
  state.passports['learner-a'].submissions.push({ taskId: 'practice', submissionId: 's-practice', assessmentStatus: 'assessed', ok: true, at: 5 });
  env.database.prepare('UPDATE lesson_packages SET data=?').run(JSON.stringify(pkg));
  env.database.prepare('UPDATE lesson_sessions SET state=?').run(JSON.stringify(state));
  await env.service.syncSessionEvidence({ ownerAccountId: owner, sessionId: 'lesson-1' });
  const joined = await env.service.joinClass(credentials);
  let own = await env.service.getPassport(joined);
  assert.equal(own.passport.objectives[0].status, 'standard_mastery');
  assert.equal(own.passport.objectives[0].independentCount, 2);
  env.database.prepare('INSERT INTO lesson_packages VALUES(?,?,?,?)').run('pkg-v2', 'new-hash', 'approved', JSON.stringify(pkg));
  env.database.prepare('INSERT INTO lesson_sessions(id,owner_account_id,package_row_id,package_hash,state,revision,class_id) VALUES(?,?,?,?,?,?,?)').run('lesson-v2', owner, 'pkg-v2', 'new-hash', JSON.stringify(state), 1, classroom.id);
  env.database.prepare('INSERT INTO lesson_learners(id,session_id,learner_id,name,token_hash,class_member_id) VALUES(?,?,?,?,?,?)').run('bind-v2', 'lesson-v2', 'learner-a', 'An', 'token-v2', first.member.id);
  await env.service.syncSessionEvidence({ ownerAccountId: owner, sessionId: 'lesson-v2' });
  own = await env.service.getPassport(joined);
  assert.equal(own.passport.objectives[0].independentCount, 2);
  state.passports['learner-a'].supportHistory.push({ taskId: 'practice' });
  env.database.prepare('UPDATE lesson_sessions SET state=?,revision=2 WHERE id=?').run(JSON.stringify(state), 'lesson-v2');
  await env.service.syncSessionEvidence({ ownerAccountId: owner, sessionId: 'lesson-v2' });
  assert.equal((await env.service.getPassport(joined)).passport.objectives[0].status, 'minimum_mastery');
});

test('pending, reflection, group and assisted core tasks never satisfy the independent Should indicator', async () => {
  const env = setup(); const { classroom, first, second, credentials } = await roster(env);
  const { pkg, state } = evidenceFixture(env, classroom, first, second);
  pkg.tasks.find(task => task.id === 'exit').branch = 'shared';
  pkg.tasks.push({ id: 'core-check', participation: 'individual', branch: 'core', type: 'closed' });
  pkg.evidenceRules.push({ taskId: 'core-check', kind: 'individual_reasoning', countsForMastery: false, individual: true, objectiveIds: ['lo'] });
  const core = { taskId: 'core-check', submissionId: 'core-sub', assessmentStatus: 'assessed', ok: true, at: 6 };
  state.passports['learner-a'].submissions.push(core);
  const joined = await env.service.joinClass(credentials);
  for (const kind of ['pending', 'reflection', 'group', 'assisted']) {
    pkg.tasks.at(-1).participation = kind === 'group' ? 'group' : 'individual';
    pkg.tasks.at(-1).type = kind === 'reflection' ? 'reflection' : 'closed';
    core.assessmentStatus = kind === 'pending' ? 'pending' : 'assessed'; core.assisted = kind === 'assisted';
    env.database.prepare('UPDATE lesson_packages SET data=?').run(JSON.stringify(pkg));
    env.database.prepare('UPDATE lesson_sessions SET state=?,revision=revision+1').run(JSON.stringify(state));
    await env.service.syncSessionEvidence({ ownerAccountId: owner, sessionId: 'lesson-1' });
    assert.equal((await env.service.getPassport(joined)).passport.objectives[0].status, 'minimum_mastery', kind);
  }
});

test('own passport lazily reconciles all linked server sessions without writing a classmate evidence row', async () => {
  const env = setup(); const { classroom, first, second, credentials } = await roster(env);
  evidenceFixture(env, classroom, first, second);
  const joined = await env.service.joinClass(credentials);
  assert.equal(joined.passport.objectives[0]?.status, 'standard_mastery');
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_class_evidence WHERE member_id=?').get(second.member.id).n, 0);
  const state = JSON.parse(env.database.prepare("SELECT state FROM lesson_sessions WHERE id='lesson-1'").get().state);
  state.passports['learner-a'].submissions.push({ taskId: 'recheck', submissionId: 'later-failed', assessmentStatus: 'assessed', ok: false, at: 8 });
  env.database.prepare('UPDATE lesson_sessions SET state=?,revision=2 WHERE id=?').run(JSON.stringify(state), 'lesson-1');
  const own = await env.service.getPassport(joined);
  assert.equal(own.passport.objectives[0].independentCount, 1);
  assert.equal(own.passport.objectives[0].status, 'supported');
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_class_evidence WHERE member_id=?').get(second.member.id).n, 0);
  const written = env.database.prepare('SELECT MAX(synced_at) AS n FROM lesson_class_evidence').get().n;
  env.clock.t += 2000;
  await env.service.getPassport(joined);
  assert.equal(env.database.prepare('SELECT MAX(synced_at) AS n FROM lesson_class_evidence').get().n, written, 'unchanged mirrored records are not rewritten');
});

test('lazy passport tolerates a moving snapshot, flags pending evidence and rejects revocation during its server write', async () => {
  let mode;
  const env = setup((sql, database) => {
    if (!mode || !sql.startsWith('INSERT INTO lesson_class_evidence')) return;
    if (mode === 'revision') database.exec("UPDATE lesson_sessions SET revision=revision+1 WHERE id='lesson-1'");
    if (mode === 'revoke') database.exec('UPDATE lesson_class_members SET revoked_at=1');
    mode = null;
  });
  const { classroom, first, second, credentials } = await roster(env);
  const joined = await env.service.joinClass(credentials);
  evidenceFixture(env, classroom, first, second);
  mode = 'revision';
  const pending = await env.service.getPassport(joined);
  assert.equal(pending.passportSyncPending, true); assert.equal(pending.passport.objectives.length, 0);
  assert.equal((await env.service.getPassport(joined)).passport.objectives[0].status, 'standard_mastery');
  env.database.exec('DELETE FROM lesson_class_evidence');
  mode = 'revoke';
  await assert.rejects(() => env.service.getPassport(joined), /AUTH_REQUIRED/);
});

test('published approved-source sessions still reconcile own evidence',async()=>{const env=setup();const {classroom,first,second,credentials}=await roster(env);evidenceFixture(env,classroom,first,second);env.database.exec("UPDATE lesson_packages SET status='published'");const own=await env.service.joinClass(credentials);assert.equal(own.passport.objectives[0].independentCount,2);});
