import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createLessonClassService } from '../lib/lesson/class-service.js';
import { createLessonLeagueService } from '../lib/lesson/league-service.js';

function setup(beforeWrite = () => {}, beforeRead = () => {}) {
  const database = new DatabaseSync(':memory:');
  database.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE accounts(id TEXT PRIMARY KEY);
    CREATE TABLE lesson_packages(row_id TEXT PRIMARY KEY,content_hash TEXT,status TEXT,data TEXT);
    CREATE TABLE rooms(id TEXT PRIMARY KEY,owner_account_id TEXT,deleted_at INTEGER);
    CREATE TABLE lesson_sessions(id TEXT PRIMARY KEY,owner_account_id TEXT,package_row_id TEXT,package_hash TEXT,state TEXT,revision INTEGER,status TEXT);
    CREATE TABLE lesson_learners(id TEXT PRIMARY KEY,session_id TEXT,learner_id TEXT,name TEXT,token_hash TEXT,present INTEGER DEFAULT 1);
    INSERT INTO accounts VALUES('teacher'),('other');
    INSERT INTO lesson_packages VALUES('pkg','hash','approved','{}');`);
  for (const file of ['0017_lesson_classes.sql', '0018_lesson_leagues.sql', '0021_lesson_content_deletions.sql', '0022_site_trash.sql']) {
    for (const sql of readFileSync(new URL('../drizzle/' + file, import.meta.url), 'utf8').split('--> statement-breakpoint')) if (sql.trim()) database.exec(sql);
  }
  database.exec("ALTER TABLE lesson_sessions ADD room_id TEXT DEFAULT 'room'; INSERT INTO rooms VALUES('room','teacher',NULL);");
  const db = { prepare: sql => ({ bind: (...args) => ({
    first: async () => { beforeRead(sql,database); return database.prepare(sql).get(...args) ?? null; },
    all: async () => { beforeRead(sql,database); return { results: database.prepare(sql).all(...args) }; },
    run: async () => { beforeWrite(sql, database); return { meta: { changes: Number(database.prepare(sql).run(...args).changes) } }; }
  }) }), batch: async statements => { database.exec('BEGIN'); try { const result = []; for (const stmt of statements) result.push(await stmt.run()); database.exec('COMMIT'); return result; } catch (error) { database.exec('ROLLBACK'); throw error; } } };
  return { database, classes: createLessonClassService({ db, now: () => 1000 }), leagues: createLessonLeagueService({ db, now: () => 1000 }) };
}
const owner = 'teacher';
async function classroom(env, request = 'class-request') {
  const { class: cls } = await env.classes.createClass({ ownerAccountId: owner, title: '11A', requestId: request });
  const member = await env.classes.addMember({ ownerAccountId: owner, classId: cls.id, name: 'An', requestId: 'member-request' });
  return { cls, member, credentials: { classCode: cls.code, memberCode: member.member.code, pin: member.pin } };
}
async function linked(env, round = 1) {
  const room = await classroom(env);
  const { league } = await env.leagues.createLeague({ ownerAccountId: owner, title: 'Giải thử', requestId: 'league-request' });
  await env.leagues.addClass({ ownerAccountId: owner, leagueId: league.id, classId: room.cls.id });
  const state = { roster: { student: { present: true } }, gameWallets: { learners: { student: { earned: 8 } } } };
  env.database.prepare('INSERT INTO lesson_sessions(id,owner_account_id,package_row_id,package_hash,state,revision,status,class_id) VALUES(?,?,?,?,?,?,?,?)').run('session', owner, 'pkg', 'hash', JSON.stringify(state), 1, 'concluded', room.cls.id);
  env.database.prepare('INSERT INTO lesson_learners(id,session_id,learner_id,name,token_hash,class_member_id) VALUES(?,?,?,?,?,?)').run('learner', 'session', 'student', 'An', 'token-hash', room.member.member.id);
  await env.leagues.linkSession({ ownerAccountId: owner, leagueId: league.id, classId: room.cls.id, sessionId: 'session', round });
  return { ...room, league, args: { ownerAccountId: owner, leagueId: league.id, classId: room.cls.id, round } };
}

test('team deletion requires exact title/owner; atomically unlinks members and keeps session evidence', async () => {
  const env = setup(), { cls, member } = await classroom(env);
  const { team } = await env.classes.createTeam({ ownerAccountId: owner, classId: cls.id, title: 'Nhóm 1', requestId: 'team-request' });
  const args = { ownerAccountId: owner, classId: cls.id, teamId: team.id, confirmTitle: team.title };
  await env.classes.updateMember({ ...args, memberId: member.member.id, teamId: team.id });
  await assert.rejects(env.classes.deleteTeam({ ...args, ownerAccountId: 'other' }), /NOT_FOUND/);
  await assert.rejects(env.classes.deleteTeam({ ...args, confirmTitle: 'Wrong' }), /CONFIRM_REQUIRED/);
  await env.classes.deleteTeam(args);
  assert.equal(env.database.prepare('SELECT team_id FROM lesson_class_members').get().team_id, null);
  assert.equal((await env.classes.getClass(args)).teams.length, 0);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_class_members').get().n, 1);
});

test('member deletion hides active access, keeps identity/history, restores only via fresh PIN', async () => {
  const env = setup(), { cls, member, credentials } = await classroom(env);
  const login = await env.classes.joinClass(credentials);
  const args = { ownerAccountId: owner, classId: cls.id, memberId: member.member.id, confirmName: 'An', confirmCode: member.member.code };
  await assert.rejects(env.classes.deleteMember({ ...args, confirmCode: 'other' }), /CONFIRM_REQUIRED/);
  await assert.rejects(env.classes.deleteMember({ ...args, ownerAccountId: 'other' }), /NOT_FOUND/);
  await env.classes.deleteMember(args);
  await assert.rejects(env.classes.resolveMemberToken(login.token), /AUTH_REQUIRED/);
  await assert.rejects(env.classes.joinClass(credentials), /CLASS_LOGIN_UNAVAILABLE/);
  const removed = await env.classes.getClass(args);
  assert.equal(removed.members.length, 0); assert.equal(removed.class.activeMemberCount, 0);
  await assert.rejects(env.classes.resetMemberPin(args), /RESTORE_REQUIRED/);
  const restoredIdentity = await env.classes.restoreTrash({ ownerAccountId: owner, kind: 'class-member', id: member.member.id });
  assert.equal(restoredIdentity.requiresNewPin, true);
  assert.equal((await env.classes.getClass(args)).members[0].revoked, true);
  const restored = await env.classes.resetMemberPin(args);
  assert.equal(restored.member.id, member.member.id); assert.equal(restored.member.revoked, false);
  await assert.rejects(env.classes.resolveMemberToken(login.token), /AUTH_REQUIRED/);
  assert.equal((await env.classes.joinClass({ ...credentials, pin: restored.pin })).member.id, member.member.id);
});

test('class deletion keeps rows but denies owner reads and pupil tokens', async () => {
  const env = setup(), { cls, credentials } = await classroom(env), login = await env.classes.joinClass(credentials);
  await assert.rejects(env.classes.deleteClass({ ownerAccountId: owner, classId: cls.id, confirmTitle: 'Wrong' }), /CONFIRM_REQUIRED/);
  await env.classes.deleteClass({ ownerAccountId: owner, classId: cls.id, confirmTitle: cls.title });
  assert.equal((await env.classes.listClasses(owner)).classes.length, 0);
  await assert.rejects(env.classes.resolveMemberToken(login.token), /AUTH_REQUIRED/);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_class_members').get().n, 1);
});

test('unlink finalized round excludes scores, retains immutable result and blocks silent replay', async () => {
  const env = setup(), fixture = await linked(env), { args } = fixture;
  await env.leagues.finalizeRound(args);
  const old = env.database.prepare('SELECT * FROM lesson_league_round_results').get();
  await assert.rejects(env.leagues.unlinkSession({ ...args, ownerAccountId: 'other', confirmSessionId: 'session' }), /NOT_FOUND/);
  await assert.rejects(env.leagues.unlinkSession({ ...args, confirmSessionId: 'wrong' }), /CONFIRM_REQUIRED/);
  await env.leagues.unlinkSession({ ...args, confirmSessionId: 'session' });
  const result = env.database.prepare('SELECT * FROM lesson_league_round_results').get();
  assert.equal(result.mean_score, old.mean_score); assert.equal(result.finalized_at, old.finalized_at); assert.equal(result.deleted_at, 1000);
  const view = await env.leagues.getLeague(args);
  assert.equal(view.round, null); assert.equal(view.highest.length, 0); assert.equal(view.classes[0].rounds.length, 0);
  assert.equal(view.classes[0].baselineMean, null);
  await assert.rejects(env.leagues.linkSession({ ...args, sessionId: 'session' }), /RELATION_DELETED/);
  await assert.rejects(env.leagues.finalizeRound(args), /NOT_FOUND/);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_sessions').get().n, 1);
});

test('removing enrolled class retains finalized audit; pupil loses league and cannot silently re-add', async () => {
  const env = setup(), { args, cls, credentials } = await linked(env);
  await env.leagues.finalizeRound(args);
  const login = await env.classes.joinClass(credentials);
  await assert.rejects(env.leagues.removeClass({ ...args, confirmTitle: 'Wrong' }), /CONFIRM_REQUIRED/);
  await env.leagues.removeClass({ ...args, confirmTitle: cls.title });
  const view = await env.leagues.getLeague(args);
  assert.equal(view.classes.length, 0); assert.equal(view.highest.length, 0);
  assert.equal((await env.classes.getPassport({ token: login.token })).leagues.length, 0);
  await assert.rejects(env.leagues.getLeague({ leagueId: args.leagueId, memberToken: login.token }), /NOT_FOUND/);
  await assert.rejects(env.leagues.addClass(args), /RELATION_DELETED/);
  assert.equal(env.database.prepare('SELECT finalized_at FROM lesson_league_round_results').get().finalized_at, 1000);
});

test('delete league checks confirmation/owner, preserves audit and denies old reads/replays', async () => {
  const env = setup(), { args, league } = await linked(env);
  await env.leagues.finalizeRound(args);
  await assert.rejects(env.leagues.deleteLeague({ ...args, ownerAccountId: 'other', confirmTitle: league.title }), /NOT_FOUND/);
  await assert.rejects(env.leagues.deleteLeague({ ...args, confirmTitle: 'Wrong' }), /CONFIRM_REQUIRED/);
  await env.leagues.deleteLeague({ ...args, confirmTitle: league.title });
  assert.equal((await env.leagues.listLeagues(owner)).leagues.length, 0);
  await assert.rejects(env.leagues.getLeague(args), /NOT_FOUND/);
  await assert.rejects(env.leagues.finalizeRound(args), /NOT_FOUND/);
  await assert.rejects(env.leagues.createLeague({ ownerAccountId: owner, title: league.title, requestId: 'league-request' }), /REQUEST_CONFLICT/);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_league_round_results').get().n, 1);
});

test('concurrent ownership change prevents team unlink and delete together', async () => {
  let armed = false;
  const env = setup((sql, database) => { if (armed && sql.startsWith('UPDATE lesson_class_members SET team_id=NULL')) { armed = false; database.exec("UPDATE lesson_classes SET owner_account_id='other'"); } });
  const { cls, member } = await classroom(env);
  const { team } = await env.classes.createTeam({ ownerAccountId: owner, classId: cls.id, title: 'Nhóm', requestId: 'team-request' });
  await env.classes.updateMember({ ownerAccountId: owner, classId: cls.id, memberId: member.member.id, teamId: team.id });
  armed = true;
  await assert.rejects(env.classes.deleteTeam({ ownerAccountId: owner, classId: cls.id, teamId: team.id, confirmTitle: team.title }), /NOT_FOUND/);
  assert.equal(env.database.prepare('SELECT team_id FROM lesson_class_members').get().team_id, team.id);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_class_teams').get().n, 1);
});
import vm from 'node:vm';
import ts from 'typescript';
function ui(relative, extra = {}) {
  let cursor = 0; const states = [], effects = [];
  const react = { createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(child => child !== false && child != null) }), useState: initial => { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], next => states[index] = typeof next === 'function' ? next(states[index]) : next]; }, useRef: initial => { const index = cursor++; if (!(index in states)) states[index] = { current: initial }; return states[index]; }, useId: () => 'roster', useEffect: effect => effects.push(effect) };
  const code = ts.transpileModule(readFileSync(new URL(relative, import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => name === 'react' ? react : 'Link', crypto: globalThis.crypto, AbortController, console, ...extra });
  return { states, effects, render: (name, props = {}) => { cursor = 0; effects.length = 0; return exports[name](props); } };
}
const nodes = (root, predicate) => !root || typeof root !== 'object' ? [] : [...(predicate(root) ? [root] : []), ...root.children.flatMap(child => nodes(child, predicate))];
const button = (tree, label) => nodes(tree, node => node.type === 'button' && node.children.includes(label))[0];
const flush = async () => { for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve)); };

test('roster removal requires typed confirmation, hides removed pupils, clears selection without fetching deleted class', async () => {
  const calls = [], selections = []; let removed = false;
  const cls = { id: 'class', title: '11A', code: 'ABC234' }, members = [{ id: 'active', name: 'An', code: 'AN2345', revoked: false }, { id: 'removed', name: 'Bình', code: 'BI2345', revoked: true }];
  const env = ui('../components/lesson/ClassRosterPanel.tsx', { fetch: async (url, options) => { calls.push({ url, options }); if (options?.method === 'POST') { removed = true; return { ok: true, json: async () => ({ ok: true }) }; } return { ok: true, json: async () => url.includes('?') ? { members, teams: [] } : { classes: removed ? [] : [cls] } }; } });
  const props = { onSelectClass: value => selections.push(value) };
  env.render('ClassRosterPanel', props); env.effects[0](); await flush();
  let tree = env.render('ClassRosterPanel', props);
  nodes(tree, node => node.props.id === 'roster-class')[0].props.onChange({ target: { value: cls.id } });
  env.render('ClassRosterPanel', props); env.effects[1](); await flush();
  tree = env.render('ClassRosterPanel', props);
  assert.equal(nodes(tree, node => node.type === 'li').length, 1);
  nodes(tree, node => node.type === 'input' && node.props.type === 'checkbox')[0].props.onChange({ target: { checked: true } });
  tree = env.render('ClassRosterPanel', props); assert.equal(nodes(tree, node => node.type === 'li').length, 2);
  button(tree, 'Xóa lớp').props.onClick(); tree = env.render('ClassRosterPanel', props);
  assert.equal(button(tree, 'Xác nhận xóa').props.disabled, true);
  button(tree, 'Hủy').props.onClick(); tree = env.render('ClassRosterPanel', props);
  assert.equal(button(tree, 'Xác nhận xóa'), undefined); assert.equal(calls.filter(call => call.options?.method === 'POST').length, 0);
  button(tree, 'Xóa lớp').props.onClick(); tree = env.render('ClassRosterPanel', props);
  nodes(tree, node => node.props.id === 'roster-delete-confirm')[0].props.onChange({ target: { value: cls.title } });
  tree = env.render('ClassRosterPanel', props); assert.equal(button(tree, 'Xác nhận xóa').props.disabled, false);
  const before = calls.length;
  nodes(tree, node => node.type === 'form' && node.props['aria-label'] === 'Xóa lớp')[0].props.onSubmit({ preventDefault() {} }); await flush();
  tree = env.render('ClassRosterPanel', props);
  assert.equal(nodes(tree, node => node.props.id === 'roster-class')[0].props.value, '');
  assert.equal(selections.at(-1), ''); assert.equal(calls.slice(before).some(call => call.url.includes('?')), false);
  assert.deepEqual(JSON.parse(calls[before].options.body), { action: 'delete', classId: cls.id, confirmTitle: cls.title });
});

test('deleted room evidence stays stored but disappears from passport and cannot sync again', async () => {
  const env = setup(), { args, credentials, member } = await linked(env);
  const pkg = { objectives: [{ id: 'lo', code: 'T11.18', statement: 'Dãy số' }], tasks: [{ id: 'recheck', participation: 'individual', branch: 'shared', type: 'closed' }], evidenceRules: [{ taskId: 'recheck', kind: 'individual_recheck', individual: true, countsForMastery: true, objectiveIds: ['lo'] }] };
  env.database.prepare('UPDATE lesson_packages SET data=?').run(JSON.stringify(pkg));
  const state = JSON.parse(env.database.prepare('SELECT state FROM lesson_sessions').get().state);
  state.passports = { student: { submissions: [{ taskId: 'recheck', submissionId: 'submission', assessmentStatus: 'assessed', ok: true, at: 20 }], supportHistory: [], revealedTasks: {} } };
  env.database.prepare('UPDATE lesson_sessions SET state=?').run(JSON.stringify(state));
  const login = await env.classes.joinClass(credentials);
  assert.equal(login.passport.objectives[0].independentCount, 1);
  await env.leagues.finalizeRound(args);
  env.database.exec('UPDATE rooms SET deleted_at=123');
  const view = await env.classes.getPassport({ token: login.token });
  assert.equal(view.sessions.length, 0); assert.equal(view.passport.objectives.length, 0);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_class_evidence WHERE member_id=?').get(member.member.id).n, 1);
  await assert.rejects(env.classes.syncSessionEvidence({ ownerAccountId: owner, sessionId: 'session' }), /NOT_FOUND/);
  assert.equal((await env.leagues.getLeague(args)).highest.length, 0);
});

test('removing one of two active rounds preserves fixed baseline and historical scores', async () => {
  const env = setup(), { args } = await linked(env);
  await env.leagues.finalizeRound(args);
  env.database.exec("INSERT INTO lesson_sessions(id,owner_account_id,package_row_id,package_hash,state,revision,status,class_id,room_id) SELECT 'session2',owner_account_id,package_row_id,package_hash,state,revision,status,class_id,room_id FROM lesson_sessions; INSERT INTO lesson_learners(id,session_id,learner_id,name,token_hash,class_member_id) SELECT 'learner2','session2',learner_id,name,token_hash,class_member_id FROM lesson_learners;");
  await env.leagues.linkSession({ ...args, round: 2, sessionId: 'session2' });
  await env.leagues.unlinkSession({ ...args, confirmSessionId: 'session' });
  assert.equal((await env.leagues.getLeague(args)).classes[0].baselineMean, 8);
  assert.equal(env.database.prepare('SELECT mean_score FROM lesson_league_round_results WHERE round=1').get().mean_score, 8);
});

test('league delete has explicit cancel/typed confirmation; clears board without reloading removed league', async () => {
  const calls = [], league = { id: 'league', title: 'Giải thử', format: 'async' };
  const env = ui('../components/lesson/LeaguePanel.tsx', { fetch: async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ ok: true }) }; } });
  env.render('LeaguePanel'); env.states[0] = [league]; env.states[2] = league.id;
  env.states[3] = { league, round: null, classes: [], highest: [], mostImproved: [], cooperativeMean: null, participantCount: 0, liveReady: false, scoresFinal: false };
  let tree = env.render('LeaguePanel'); button(tree, 'Xóa giải').props.onClick(); tree = env.render('LeaguePanel');
  assert.equal(button(tree, 'Xác nhận xóa').props.disabled, true);
  button(tree, 'Hủy').props.onClick(); assert.equal(calls.length, 0);
  tree = env.render('LeaguePanel'); button(tree, 'Xóa giải').props.onClick(); tree = env.render('LeaguePanel');
  const form = nodes(tree, node => node.type === 'form' && node.props['aria-label'] === 'Xóa giải')[0];
  nodes(form, node => node.type === 'input')[0].props.onChange({ target: { value: league.title } });
  tree = env.render('LeaguePanel'); assert.equal(button(tree, 'Xác nhận xóa').props.disabled, false);
  nodes(tree, node => node.type === 'form' && node.props['aria-label'] === 'Xóa giải')[0].props.onSubmit({ preventDefault() {} }); await flush();
  tree = env.render('LeaguePanel'); assert.equal(button(tree, 'Xóa giải'), undefined);
  assert.equal(calls.length, 1); assert.deepEqual(JSON.parse(calls[0].options.body), { action: 'delete', leagueId: league.id, confirmTitle: league.title });
});

test('room deletion between evidence snapshot and CAS cannot append historical evidence', async () => {
  let armed = false;
  const env = setup((sql, database) => { if (armed && sql.startsWith('INSERT INTO lesson_class_evidence')) { armed = false; database.exec('UPDATE rooms SET deleted_at=44'); } });
  await linked(env);
  const pkg = { objectives: [{ id: 'lo', code: 'T11.18' }], tasks: [{ id: 'recheck', participation: 'individual', type: 'closed' }], evidenceRules: [{ taskId: 'recheck', objectiveIds: ['lo'], kind: 'individual_recheck', individual: true, countsForMastery: true }] };
  env.database.prepare('UPDATE lesson_packages SET data=?').run(JSON.stringify(pkg));
  env.database.prepare('UPDATE lesson_sessions SET state=?').run(JSON.stringify({ passports: { student: { submissions: [{ taskId: 'recheck', submissionId: 'submission', assessmentStatus: 'assessed', ok: true, at: 20 }] } } }));
  armed = true;
  await assert.rejects(env.classes.syncSessionEvidence({ ownerAccountId: owner, sessionId: 'session' }), /EVIDENCE_SNAPSHOT_CHANGED/);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_class_evidence').get().n, 0);
});

test('member league reply rechecks active enrollment and league after reading scores', async () => {
  for (const table of ['lesson_leagues', 'lesson_league_classes']) {
    let armed = false;
    const env = setup(() => {}, (sql, database) => { if (armed && sql.startsWith('SELECT r.* FROM lesson_league_round_results')) { armed = false; database.exec('UPDATE ' + table + ' SET deleted_at=44'); } });
    const { args, credentials } = await linked(env);
    await env.leagues.finalizeRound(args);
    const login = await env.classes.joinClass(credentials); armed = true;
    await assert.rejects(env.leagues.getLeague({ leagueId: args.leagueId, memberToken: login.token }), /NOT_FOUND/);
    assert.equal(armed, false);
  }
});

test('passport reply rejects room deleted after its session snapshot was selected', async () => {
  let armed = false;
  const env = setup(() => {}, (sql, database) => { if (armed && sql.startsWith('SELECT e.* FROM lesson_class_evidence')) { armed = false; database.exec('UPDATE rooms SET deleted_at=44'); } });
  const { credentials } = await linked(env);
  const login = await env.classes.joinClass(credentials); armed = true;
  await assert.rejects(env.classes.getPassport({ token: login.token }), /EVIDENCE_SNAPSHOT_CHANGED/);
  assert.equal(armed, false);
});

test('class and member trash recovery is owner-scoped, repeatable, never revives member PIN', async () => {
  const env = setup(), { cls, member, credentials } = await classroom(env);
  const args = { ownerAccountId: owner, classId: cls.id, memberId: member.member.id, confirmName: member.member.name, confirmCode: member.member.code };
  await env.classes.deleteMember(args);
  await assert.rejects(env.classes.restoreTrash({ ownerAccountId: 'other', kind: 'class-member', id: member.member.id }), /NOT_FOUND/);
  await env.classes.restoreTrash({ ownerAccountId: owner, kind: 'class-member', id: member.member.id });
  await assert.rejects(env.classes.joinClass(credentials), /CLASS_LOGIN_UNAVAILABLE/);
  assert.equal((await env.classes.getClass(args)).members[0].revoked, true);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM site_trash').get().n, 0);
  await env.classes.deleteMember(args);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM site_trash').get().n, 1);
  await env.classes.deleteClass({ ownerAccountId: owner, classId: cls.id, confirmTitle: cls.title });
  await assert.rejects(env.classes.restoreTrash({ ownerAccountId: owner, kind: 'class-member', id: member.member.id }), /NOT_FOUND/);
  await env.classes.restoreTrash({ ownerAccountId: owner, kind: 'class', id: cls.id });
  assert.equal((await env.classes.listClasses(owner)).classes[0].id, cls.id);
  assert.equal(env.database.prepare("SELECT COUNT(*) AS n FROM site_trash WHERE kind='class-member'").get().n, 1);
  await env.classes.deleteClass({ ownerAccountId: owner, classId: cls.id, confirmTitle: cls.title });
  await env.classes.restoreTrash({ ownerAccountId: owner, kind: 'class', id: cls.id });
});

test('team snapshot restore keeps original identity, preserves reassignment, consumes marker atomically', async () => {
  const env = setup(), { cls, member } = await classroom(env);
  const { team } = await env.classes.createTeam({ ownerAccountId: owner, classId: cls.id, title: 'Nhóm 1', requestId: 'team-request' });
  const second = await env.classes.addMember({ ownerAccountId: owner, classId: cls.id, name: 'Bình', requestId: 'second-member' });
  for (const id of [member.member.id, second.member.id]) await env.classes.updateMember({ ownerAccountId: owner, classId: cls.id, memberId: id, teamId: team.id });
  const args = { ownerAccountId: owner, classId: cls.id, teamId: team.id, confirmTitle: team.title };
  await env.classes.deleteTeam(args);
  const snapshot = env.database.prepare("SELECT data FROM site_trash WHERE kind='class-team'").get().data;
  assert.equal(snapshot.includes('pin'), false);
  const other = await env.classes.createTeam({ ownerAccountId: owner, classId: cls.id, title: 'Nhóm 2', requestId: 'other-team-request' });
  await env.classes.updateMember({ ownerAccountId: owner, classId: cls.id, memberId: second.member.id, teamId: other.team.id });
  await env.classes.restoreTrash({ ownerAccountId: owner, kind: 'class-team', id: team.id });
  const roster = await env.classes.getClass(args);
  assert.equal(roster.members.find(entry => entry.id === member.member.id).teamId, team.id);
  assert.equal(roster.members.find(entry => entry.id === second.member.id).teamId, other.team.id);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM site_trash').get().n, 0);
  await env.classes.deleteTeam(args); await env.classes.restoreTrash({ ownerAccountId: owner, kind: 'class-team', id: team.id });
  assert.equal((await env.classes.getClass(args)).teams.length, 2);
});

test('league recovery restores explicit parent then individual finalized rounds with immutable scores', async () => {
  const env = setup(), { args, cls, league } = await linked(env);
  await env.leagues.finalizeRound(args);
  const old = env.database.prepare('SELECT * FROM lesson_league_round_results').get();
  await env.leagues.removeClass({ ...args, confirmTitle: cls.title });
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM site_trash').get().n, 2);
  await assert.rejects(env.leagues.restoreTrash({ ownerAccountId: owner, kind: 'league-round', id: old.id }), /RESTORE_CONFLICT/);
  await env.leagues.restoreTrash({ ownerAccountId: owner, kind: 'league-class', id: JSON.stringify([league.id, cls.id]) });
  assert.equal((await env.leagues.getLeague(args)).highest.length, 0);
  await env.leagues.restoreTrash({ ownerAccountId: owner, kind: 'league-round', id: old.id });
  assert.equal((await env.leagues.getLeague(args)).highest[0].meanScore, 8);
  assert.equal(env.database.prepare('SELECT finalized_at FROM lesson_league_round_results').get().finalized_at, old.finalized_at);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM site_trash').get().n, 0);
  await env.leagues.deleteLeague({ ...args, confirmTitle: league.title });
  await assert.rejects(env.leagues.restoreTrash({ ownerAccountId: 'other', kind: 'league', id: league.id }), /NOT_FOUND/);
  await env.leagues.restoreTrash({ ownerAccountId: owner, kind: 'league', id: league.id });
  assert.equal((await env.leagues.getLeague(args)).highest[0].meanScore, 8);
});

test('unlink recovery restores original baseline and checks active room before consuming Trash', async () => {
  const env = setup(), { args } = await linked(env);
  await env.leagues.finalizeRound(args);
  const old = env.database.prepare('SELECT * FROM lesson_league_round_results').get();
  await env.leagues.unlinkSession({ ...args, confirmSessionId: 'session' });
  env.database.exec('UPDATE rooms SET deleted_at=5');
  await assert.rejects(env.leagues.restoreTrash({ ownerAccountId: owner, kind: 'league-round', id: old.id }), /RESTORE_CONFLICT/);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM site_trash').get().n, 1);
  env.database.exec('UPDATE rooms SET deleted_at=NULL');
  await env.leagues.restoreTrash({ ownerAccountId: owner, kind: 'league-round', id: old.id });
  assert.equal((await env.leagues.getLeague(args)).classes[0].baselineMean, 8);
  await env.leagues.unlinkSession({ ...args, confirmSessionId: 'session' });
  await env.leagues.restoreTrash({ ownerAccountId: owner, kind: 'league-round', id: old.id });
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM site_trash').get().n, 0);
});

test('storage failure rolls back deletions and restore without losing Trash snapshots', async () => {
  let failure = '';
  const env = setup(sql => { if (failure && sql.startsWith(failure)) { failure = ''; throw new Error('storage failed'); } });
  const { cls } = await classroom(env);
  failure = 'UPDATE lesson_classes SET deleted_at=';
  await assert.rejects(env.classes.deleteClass({ ownerAccountId: owner, classId: cls.id, confirmTitle: cls.title }), /storage failed/);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM site_trash').get().n, 0);
  assert.equal((await env.classes.listClasses(owner)).classes.length, 1);
  await env.classes.deleteClass({ ownerAccountId: owner, classId: cls.id, confirmTitle: cls.title });
  failure = 'DELETE FROM site_trash';
  await assert.rejects(env.classes.restoreTrash({ ownerAccountId: owner, kind: 'class', id: cls.id }), /storage failed/);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM site_trash').get().n, 1);
  assert.equal((await env.classes.listClasses(owner)).classes.length, 0);
});

test('same-clock membership changes survive team recovery; create replay cannot bypass Trash', async () => {
  const env = setup(), { cls, member } = await classroom(env);
  const creation = { ownerAccountId: owner, classId: cls.id, title: 'Nhóm', requestId: 'same-team-request' };
  const { team } = await env.classes.createTeam(creation);
  const assignment = { ownerAccountId: owner, classId: cls.id, memberId: member.member.id };
  await env.classes.updateMember({ ...assignment, teamId: team.id });
  await env.classes.deleteTeam({ ...creation, teamId: team.id, confirmTitle: team.title });
  await assert.rejects(env.classes.createTeam(creation), /REQUEST_CONFLICT/);
  await env.classes.updateMember({ ...assignment, teamId: null });
  await env.classes.restoreTrash({ ownerAccountId: owner, kind: 'class-team', id: team.id });
  assert.equal((await env.classes.getClass({ ownerAccountId: owner, classId: cls.id })).members[0].teamId, null);
  assert.equal((await env.classes.createTeam(creation)).team.id, team.id);
});

test('restoring an old league round cannot mix its score with a changed baseline', async () => {
  const env = setup(), { args } = await linked(env);
  await env.leagues.finalizeRound(args);
  const old = env.database.prepare('SELECT id FROM lesson_league_round_results').get();
  await env.leagues.unlinkSession({ ...args, confirmSessionId: 'session' });
  env.database.exec('UPDATE lesson_league_classes SET baseline_mean=99,baseline_count=1');
  await assert.rejects(env.leagues.restoreTrash({ ownerAccountId: owner, kind: 'league-round', id: old.id }), /RESTORE_CONFLICT/);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM site_trash').get().n, 1);
  assert.equal(env.database.prepare('SELECT baseline_mean FROM lesson_league_classes').get().baseline_mean, 99);
});
