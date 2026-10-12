import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createContext, runInContext, SourceTextModule, SyntheticModule } from 'node:vm';
import ts from 'typescript';
import { resolveIdentity } from '../lib/account-room-access.js';
import { createLessonClassService } from '../lib/lesson/class-service.js';
import { createLessonLeagueService } from '../lib/lesson/league-service.js';

function setup(beforeWrite = () => {}) {
  const database = new DatabaseSync(':memory:');
  database.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE accounts(id TEXT PRIMARY KEY,email TEXT NOT NULL,display_name TEXT,created_at INTEGER NOT NULL);
    CREATE TABLE lesson_packages(row_id TEXT PRIMARY KEY,content_hash TEXT NOT NULL,status TEXT NOT NULL,data TEXT NOT NULL);
    CREATE TABLE lesson_sessions(id TEXT PRIMARY KEY,owner_account_id TEXT NOT NULL,package_row_id TEXT NOT NULL,package_hash TEXT NOT NULL,state TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL);
    CREATE TABLE lesson_learners(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,learner_id TEXT NOT NULL,name TEXT NOT NULL,token_hash TEXT NOT NULL,present INTEGER NOT NULL DEFAULT 1);
    INSERT INTO accounts VALUES('teacher-1','t1@test','Teacher',1),('teacher-2','t2@test','Teacher',1);
    INSERT INTO lesson_packages VALUES('pkg','approved-hash','approved','{}');`);
  for (const file of ['0017_lesson_classes.sql', '0018_lesson_leagues.sql']) for (const part of readFileSync(new URL('../drizzle/' + file, import.meta.url), 'utf8').split('--> statement-breakpoint')) if (part.trim()) database.exec(part);
  const prepare = sql => ({ bind: (...args) => ({ first: async () => { if (/^(UPDATE|INSERT|DELETE)/.test(sql)) beforeWrite(sql, database); return database.prepare(sql).get(...args) ?? null; }, all: async () => ({ results: database.prepare(sql).all(...args) }), run: async () => { beforeWrite(sql, database); return { meta: { changes: Number(database.prepare(sql).run(...args).changes) } }; } }) });
  let tail = Promise.resolve();
  const db = { prepare, batch: statements => { const result = tail.then(async () => { database.exec('BEGIN'); try { const out = []; for (const statement of statements) out.push(await statement.run()); database.exec('COMMIT'); return out; } catch (error) { database.exec('ROLLBACK'); throw error; } }); tail = result.catch(() => {}); return result; } };
  const clock = { t: 1_000_000 };
  return { db, database, clock, classes: createLessonClassService({ db, now: () => clock.t }), service: createLessonLeagueService({ db, now: () => clock.t }) };
}
const owner = 'teacher-1';
async function classroom(env, id, scores, teacher = owner) {
  const { class: cls } = await env.classes.createClass({ ownerAccountId: teacher, title: 'Lớp ' + id, requestId: 'class-' + id + '-request' });
  const roster = {}, wallets = {}, members = [];
  for (const [index, score] of scores.entries()) {
    const member = await env.classes.addMember({ ownerAccountId: teacher, classId: cls.id, name: 'PRIVATE ' + id + index, requestId: 'member-' + id + index + '-request' }); members.push(member);
    const learner = 'learner-' + id + index; roster[learner] = { id: learner, name: member.member.name, present: true }; wallets[learner] = { earned: score, bonus: 0 };
  }
  const state = { status: 'active', roster, gameWallets: { learners: wallets }, submissions: { PRIVATE: { answer: 'SECRET ANSWER', ok: true } }, passports: { PRIVATE: { mastery: 999999 } } };
  env.database.prepare('INSERT INTO lesson_sessions(id,owner_account_id,package_row_id,package_hash,state,revision,status,class_id) VALUES(?,?,?,?,?,?,?,?)').run(id, teacher, 'pkg', 'approved-hash', JSON.stringify(state), 1, 'active', cls.id);
  for (const [index, member] of members.entries()) env.database.prepare('INSERT INTO lesson_learners(id,session_id,learner_id,name,token_hash,class_member_id) VALUES(?,?,?,?,?,?)').run('row-' + id + index, id, 'learner-' + id + index, member.member.name, 'private-token-' + id + index, member.member.id);
  return { cls, state, members, sessionId: id };
}
async function league(env, format = 'async') { return (await env.service.createLeague({ ownerAccountId: owner, title: 'Giải QA', format, requestId: 'league-request-' + format })).league; }
const finish = (env, room, scores) => {
  for (const [index, score] of scores.entries()) room.state.gameWallets.learners['learner-' + room.sessionId + index].earned = score;
  room.state.status = 'concluded';
  env.database.prepare('UPDATE lesson_sessions SET state=?,status=?,revision=revision+1 WHERE id=?').run(JSON.stringify(room.state), 'concluded', room.sessionId);
};

test('league create/list/get is teacher-owned and idempotent; foreign classes and mismatched session cannot join', async () => {
  const env = setup(), own = await classroom(env, 'own', [0]), foreign = await classroom(env, 'foreign', [0], 'teacher-2'), l = await league(env);
  assert.equal((await league(env)).id, l.id);
  await assert.rejects(() => env.service.createLeague({ ownerAccountId: owner, title: 'Changed', format: 'async', requestId: 'league-request-async' }), /REQUEST_CONFLICT/);
  assert.equal((await env.service.listLeagues('teacher-2')).leagues.length, 0);
  await assert.rejects(() => env.service.getLeague({ ownerAccountId: 'teacher-2', leagueId: l.id }), /NOT_FOUND/);
  await assert.rejects(() => env.service.addClass({ ownerAccountId: owner, leagueId: l.id, classId: foreign.cls.id }), /NOT_FOUND/);
  await env.service.addClass({ ownerAccountId: owner, leagueId: l.id, classId: own.cls.id });
  await env.service.addClass({ ownerAccountId: owner, leagueId: l.id, classId: own.cls.id });
  await assert.rejects(() => env.service.linkSession({ ownerAccountId: owner, leagueId: l.id, classId: own.cls.id, sessionId: foreign.sessionId, round: 1 }), /NOT_FOUND/);
  assert.equal((await env.service.getLeague({ ownerAccountId: owner, leagueId: l.id })).classes.length, 1);
});

test('average denominator freezes registered present pupils at link; later join/leave and forged mastery cannot affect it', async () => {
  const env = setup(), a = await classroom(env, 'a', [10, 20]), l = await league(env);
  await env.service.addClass({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id });
  const linked = await env.service.linkSession({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id, sessionId: a.sessionId, round: 1 });
  assert.equal(linked.round.participantCount, 2);
  const late = await env.classes.addMember({ ownerAccountId: owner, classId: a.cls.id, name: 'PRIVATE late', requestId: 'late-member-request' });
  env.database.prepare('INSERT INTO lesson_learners(id,session_id,learner_id,name,token_hash,class_member_id) VALUES(?,?,?,?,?,?)').run('late-row', a.sessionId, 'late', late.member.name, 'late-token', late.member.id);
  a.state.roster.late = { id: 'late', present: true }; a.state.roster['learner-a0'].present = false; a.state.gameWallets.learners.late = { earned: 999999, bonus: 0 };
  finish(env, a, [20, 40]);
  const finalized = await env.service.finalizeRound({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id, round: 1 });
  assert.equal(finalized.round.meanScore, 30); assert.equal(finalized.round.participantCount, 2); assert.equal(finalized.round.improvement, 15);
  const again = await env.service.finalizeRound({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id, round: 1 }); assert.equal(again.round.meanScore, 30);
  finish(env, a, [900, 900]);
  assert.equal((await env.service.getLeague({ ownerAccountId: owner, leagueId: l.id })).classes[0].latest.meanScore, 30);
  assert.equal((await env.service.linkSession({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id, sessionId: a.sessionId, round: 1 })).round.participantCount, 2);
});

test('live league requires all enrolled classes linked to the same round; snapshots finalize once, cooperative average weights pupils', async () => {
  const env = setup(), a = await classroom(env, 'a', [0]), b = await classroom(env, 'b', [0, 0, 0]), l = await league(env, 'live');
  for (const cls of [a.cls, b.cls]) await env.service.addClass({ ownerAccountId: owner, leagueId: l.id, classId: cls.id });
  await env.service.linkSession({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id, sessionId: a.sessionId, round: 1 });
  assert.equal((await env.service.getLeague({ ownerAccountId: owner, leagueId: l.id })).liveReady, false);
  finish(env, a, [100]);
  await assert.rejects(() => env.service.finalizeRound({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id, round: 1 }), /LIVE_NOT_READY/);
  await env.service.linkSession({ ownerAccountId: owner, leagueId: l.id, classId: b.cls.id, sessionId: b.sessionId, round: 1 });
  assert.equal((await env.service.getLeague({ ownerAccountId: owner, leagueId: l.id })).liveReady, true);
  await env.service.finalizeRound({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id, round: 1 }); finish(env, b, [20, 20, 20]);
  await env.service.finalizeRound({ ownerAccountId: owner, leagueId: l.id, classId: b.cls.id, round: 1 });
  const board = await env.service.getLeague({ ownerAccountId: owner, leagueId: l.id });
  assert.equal(board.cooperativeMean, 40); assert.equal(board.highest[0].classTitle, a.cls.title); assert.equal(board.mostImproved[0].improvement, 100);
  assert.equal(/PRIVATE|SECRET ANSWER|private-token|learner-a|participant_ids_json|999999/.test(JSON.stringify(board)), false);
});

test('link/finalize CAS reject session mutation races, duplicate-class round conflicts and unapproved scores', async () => {
  let armed = '';
  const env = setup((sql, database) => { if (armed && sql.startsWith(armed)) { armed = ''; database.exec("UPDATE lesson_sessions SET revision=revision+1 WHERE id='a'"); } });
  const a = await classroom(env, 'a', [0]), l = await league(env); await env.service.addClass({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id });
  armed = 'INSERT INTO lesson_league_round_results';
  await assert.rejects(() => env.service.linkSession({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id, sessionId: a.sessionId, round: 1 }), /LEAGUE_CONFLICT/);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_league_round_results').get().n, 0);
  await env.service.linkSession({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id, sessionId: a.sessionId, round: 1 });
  await assert.rejects(() => env.service.finalizeRound({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id, round: 1 }), /SESSION_NOT_CONCLUDED/);
  finish(env, a, [12]); armed = 'UPDATE lesson_league_round_results';
  await assert.rejects(() => env.service.finalizeRound({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id, round: 1 }), /LEAGUE_CONFLICT/);
  assert.equal(env.database.prepare('SELECT mean_score FROM lesson_league_round_results').get().mean_score, null);
  await env.service.finalizeRound({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id, round: 1 });
});

test('class PIN bearer sees only enrolled league aggregates, remains read-only and cannot impersonate teacher or root', async () => {
  const env = setup(), a = await classroom(env, 'a', [0]), b = await classroom(env, 'b', [0]), l = await league(env);
  await env.service.addClass({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id });
  const own = await env.classes.joinClass({ classCode: a.cls.code, memberCode: a.members[0].member.code, pin: a.members[0].pin });
  const foreign = await env.classes.joinClass({ classCode: b.cls.code, memberCode: b.members[0].member.code, pin: b.members[0].pin });
  const board = await env.service.getLeague({ leagueId: l.id, memberToken: own.token }); assert.equal(board.readOnly, true);
  await assert.rejects(() => env.service.getLeague({ leagueId: l.id, memberToken: foreign.token, ownerAccountId: owner }), /NOT_FOUND/);
  assert.equal(JSON.stringify(board).includes('ownerAccountId'), false);
  await env.classes.revokeMember({ ownerAccountId: owner, classId: a.cls.id, memberId: a.members[0].member.id });
  await assert.rejects(() => env.service.getLeague({ leagueId: l.id, memberToken: own.token }), /AUTH_REQUIRED/);
});

async function route(env) {
  const context = createContext({ Request, Response, URL, TextEncoder, TextDecoder, Uint8Array, console });
  const storage = new SyntheticModule(['db', 'stmt', 'getEnv'], function() { this.setExport('db', () => env.db); this.setExport('stmt', (sql, ...args) => env.db.prepare(sql).bind(...args)); this.setExport('getEnv', () => ({ SITE_OWNER_USER_ID: 'root', SITE_OWNER_EMAIL: 'root@test' })); }, { context });
  const identity = new SyntheticModule(['resolveIdentity'], function() { this.setExport('resolveIdentity', resolveIdentity); }, { context });
  const leagueModule = new SyntheticModule(['createLessonLeagueService'], function() { this.setExport('createLessonLeagueService', () => env.service); }, { context });
  const http = new SourceTextModule(readFileSync(new URL('../lib/exam/http.js', import.meta.url), 'utf8'), { context });
  const api = new SourceTextModule(readFileSync(new URL('../app/api/lesson-leagues/route.js', import.meta.url), 'utf8'), { context });
  await api.link(specifier => specifier.endsWith('storage.js') ? storage : specifier.endsWith('account-room-access.js') ? identity : specifier.endsWith('league-service.js') ? leagueModule : http); await api.evaluate(); return api.namespace;
}
test('HTTP ignores forged score/identity, denies anonymous and root cross-owner access, bounded JSON and bearer writes', async () => {
  const env = setup(), a = await classroom(env, 'a', [0]), l = await league(env); await env.service.addClass({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id });
  const joined = await env.classes.joinClass({ classCode: a.cls.code, memberCode: a.members[0].member.code, pin: a.members[0].pin }); const api = await route(env);
  const teacher = { 'oai-authenticated-user-id': owner, 'oai-authenticated-user-email': 't1@test' }, root = { 'oai-authenticated-user-id': 'root', 'oai-authenticated-user-email': 'root@test' };
  const post = (body, headers = {}) => api.POST(new Request('https://test/api/lesson-leagues', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }));
  assert.equal((await api.GET(new Request('https://test/api/lesson-leagues'))).status, 401);
  assert.equal((await api.GET(new Request('https://test/api/lesson-leagues?id=' + l.id, { headers: root }))).status, 404);
  assert.equal((await post({ action: 'create', title: 'Fake', format: 'async', requestId: 'fake-league', ownerAccountId: owner })).status, 401);
  assert.equal((await post({ action: 'link', leagueId: l.id, classId: a.cls.id, sessionId: a.sessionId, round: 1, meanScore: 999999 }, teacher)).status, 400);
  assert.equal((await post({ action: 'class-add', leagueId: l.id, classId: a.cls.id }, { ...teacher, Authorization: 'Bearer ' + joined.token })).status, 401);
  const board = await api.GET(new Request('https://test/api/lesson-leagues?id=' + l.id, { headers: { ...root, Authorization: 'Bearer ' + joined.token } })); assert.equal(board.status, 200); assert.equal((await board.json()).readOnly, true);
  assert.equal((await post({ action: 'create', title: 'x'.repeat(20000), format: 'async', requestId: 'large-request' }, teacher)).status, 413);
});

test('live provisional scoreboard reads current server wallets only after all class sessions are linked', async () => {
  const env = setup(), a = await classroom(env, 'a', [0]), b = await classroom(env, 'b', [0, 0]), l = await league(env, 'live');
  for (const cls of [a.cls, b.cls]) await env.service.addClass({ ownerAccountId: owner, leagueId: l.id, classId: cls.id });
  await env.service.linkSession({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id, sessionId: a.sessionId, round: 1 });
  assert.deepEqual((await env.service.getLeague({ ownerAccountId: owner, leagueId: l.id })).highest, []);
  await env.service.linkSession({ ownerAccountId: owner, leagueId: l.id, classId: b.cls.id, sessionId: b.sessionId, round: 1 });
  a.state.gameWallets.learners['learner-a0'].earned = 40;
  b.state.gameWallets.learners['learner-b0'].earned = 10; b.state.gameWallets.learners['learner-b1'].earned = 20;
  for (const room of [a, b]) env.database.prepare('UPDATE lesson_sessions SET state=?,revision=revision+1 WHERE id=?').run(JSON.stringify(room.state), room.sessionId);
  const board = await env.service.getLeague({ ownerAccountId: owner, leagueId: l.id });
  assert.equal(board.highest[0].meanScore, 40); assert.equal(board.highest[1].meanScore, 15);
  assert.equal(board.cooperativeMean, 70 / 3); assert.equal(board.scoresFinal, false);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_league_round_results WHERE finalized_at IS NOT NULL').get().n, 0);
});

test('rounds cannot reuse a scored session and later rounds never mix older class results into the board', async () => {
  const env = setup(), a = await classroom(env, 'a', [0]), b = await classroom(env, 'b', [0]), l = await league(env);
  for (const room of [a, b]) await env.service.addClass({ ownerAccountId: owner, leagueId: l.id, classId: room.cls.id });
  for (const room of [a, b]) { await env.service.linkSession({ ownerAccountId: owner, leagueId: l.id, classId: room.cls.id, sessionId: room.sessionId, round: 1 }); finish(env, room, [10]); await env.service.finalizeRound({ ownerAccountId: owner, leagueId: l.id, classId: room.cls.id, round: 1 }); }
  await assert.rejects(() => env.service.linkSession({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id, sessionId: a.sessionId, round: 2 }), /ROUND_CONFLICT/);
  env.database.prepare('INSERT INTO lesson_sessions(id,owner_account_id,package_row_id,package_hash,state,revision,status,class_id) VALUES(?,?,?,?,?,?,?,?)').run('a2', owner, 'pkg', 'approved-hash', JSON.stringify(a.state), 1, 'concluded', a.cls.id);
  env.database.prepare('INSERT INTO lesson_learners(id,session_id,learner_id,name,token_hash,class_member_id) VALUES(?,?,?,?,?,?)').run('row-a2', 'a2', 'learner-a0', 'PRIVATE', 'a2-private-token', a.members[0].member.id);
  await env.service.linkSession({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id, sessionId: 'a2', round: 2 });
  const before = await env.service.getLeague({ ownerAccountId: owner, leagueId: l.id }); assert.equal(before.round, 2); assert.equal(before.highest.length, 0);
  await env.service.finalizeRound({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id, round: 2 });
  const after = await env.service.getLeague({ ownerAccountId: owner, leagueId: l.id }); assert.equal(after.highest.length, 1); assert.equal(after.highest[0].classTitle, a.cls.title); assert.equal(after.scoresFinal, false);
});

test('cooperative single-class scoring remains a weighted server aggregate and no pupil names enter its view', async () => {
  const env = setup(), a = await classroom(env, 'a', [10, 20]), l = await league(env, 'cooperative');
  await env.service.addClass({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id }); await env.service.linkSession({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id, sessionId: a.sessionId, round: 1 });
  const board = await env.service.getLeague({ ownerAccountId: owner, leagueId: l.id });
  assert.equal(board.cooperativeMean, 15); assert.equal(board.participantCount, 2); assert.equal(board.liveReady, false); assert.equal(board.scoresFinal, false);
  assert.equal(/PRIVATE|SECRET ANSWER|learner-a/.test(JSON.stringify(board)), false);
});

test('teacher panel sends owned selected session/class IDs without scores and preserves create request ID across lost replies', async () => {
  let cursor = 0; const state = [], effects = [], calls = [];
  const react = { createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(child => child !== false && child != null) }), useState: initial => { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; }, useRef: initial => { const index = cursor++; if (!(index in state)) state[index] = { current: initial }; return state[index]; }, useEffect: effect => effects.push(effect) };
  const source = readFileSync(new URL('../components/lesson/LeaguePanel.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const exports = {}, context = createContext({ exports, require: () => react, crypto: globalThis.crypto, AbortController, console, window: {}, fetch: async (url, options) => { calls.push({ url, options }); throw new Error('offline'); } });
  runInContext(code, context);
  const render = () => { cursor = 0; return exports.LeaguePanel({ classId: 'owned-class', sessionId: 'owned-session' }); };
  const elements = (root, predicate) => !root || typeof root !== 'object' ? [] : [...(predicate(root) ? [root] : []), ...root.children.flatMap(child => elements(child, predicate))];
  let tree = render(); elements(tree, node => node.type === 'input')[0].props.onChange({ target: { value: 'Giải QA' } });
  tree = render(); elements(tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} }); await new Promise(resolve => setImmediate(resolve));
  tree = render(); elements(tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(JSON.parse(calls[0].options.body).requestId, JSON.parse(calls[1].options.body).requestId);
  state[2] = 'league-1'; tree = render();
  elements(tree, node => node.type === 'button' && node.children.includes('Gắn tiết và chốt số người'))[0].props.onClick(); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(JSON.parse(calls.at(-1).options.body), { action: 'link', leagueId: 'league-1', classId: 'owned-class', sessionId: 'owned-session', round: 1 });
});

test('revoking a participant between link precheck and insert cannot freeze an unauthorized pupil into the denominator', async () => {
  let armed = false;
  const env = setup((sql, database) => { if (armed && sql.startsWith('INSERT INTO lesson_league_round_results')) { armed = false; database.exec('UPDATE lesson_class_members SET revoked_at=1'); } });
  const a = await classroom(env, 'a', [0]), l = await league(env); await env.service.addClass({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id }); armed = true;
  await assert.rejects(() => env.service.linkSession({ ownerAccountId: owner, leagueId: l.id, classId: a.cls.id, sessionId: a.sessionId, round: 1 }), /LEAGUE_CONFLICT/);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_league_round_results').get().n, 0);
});
