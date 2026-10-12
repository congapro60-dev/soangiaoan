import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const deviceModule = await import('../lib/lesson/device-service.js').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
  throw error;
});
const check = (title, run) => test(title, { skip: !deviceModule }, run);
test('teacher-issued device service exists', () => assert.ok(deviceModule));

check('duel pairs derive only from active two-person devices; overlaps and revoked issuer/member never bind a pair',async()=>{
 const {service,database}=setup();
 const first=await service.issueDevice({accountId:'cohost',sessionId:'session',kind:'B',memberIds:['a','b'],requestId:'duel-one'});
 assert.deepEqual(await service.duelDevicePairs({accountId:'owner',sessionId:'session'}),[['a','b']]);
 await assert.rejects(()=>service.duelDevicePairs({accountId:'other',sessionId:'session'}),/FORBIDDEN/);
 const second=await service.issueDevice({accountId:'owner',sessionId:'session',kind:'B',memberIds:['a','b'],requestId:'duel-two'});
 assert.deepEqual(await service.duelDevicePairs({accountId:'owner',sessionId:'session'}),[]);
 await service.revokeDevice({accountId:'owner',sessionId:'session',deviceId:second.device.id});
 database.prepare('UPDATE room_memberships SET revoked_at=1 WHERE account_id=?').run('cohost');
 assert.deepEqual(await service.duelDevicePairs({accountId:'owner',sessionId:'session'}),[]);
 database.prepare('UPDATE room_memberships SET revoked_at=NULL WHERE account_id=?').run('cohost');
 database.prepare('UPDATE lesson_class_members SET revoked_at=1 WHERE id=?').run('m2');
 assert.deepEqual(await service.duelDevicePairs({accountId:'owner',sessionId:'session'}),[]);
 assert.ok(first.device.id);database.close();
});

function setup(beforeWrite = () => {}) {
  const database = new DatabaseSync(':memory:');
  database.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE accounts(id TEXT PRIMARY KEY);
    CREATE TABLE lesson_packages(row_id TEXT PRIMARY KEY,owner_account_id TEXT,content_hash TEXT,status TEXT,data TEXT);
    CREATE TABLE rooms(id TEXT PRIMARY KEY,owner_account_id TEXT,deleted_at INTEGER);
    CREATE TABLE room_memberships(room_id TEXT,account_id TEXT,role TEXT,revoked_at INTEGER);
    CREATE TABLE system_hosts(account_id TEXT,revoked_at INTEGER);
    CREATE TABLE lesson_classes(id TEXT PRIMARY KEY,owner_account_id TEXT,deleted_at INTEGER);
    CREATE TABLE lesson_class_members(id TEXT PRIMARY KEY,class_id TEXT,name TEXT,revoked_at INTEGER);
    CREATE TABLE lesson_sessions(id TEXT PRIMARY KEY,room_id TEXT,owner_account_id TEXT,class_id TEXT,status TEXT,state TEXT,package_row_id TEXT,package_hash TEXT,mode TEXT);
    CREATE TABLE lesson_learners(id TEXT PRIMARY KEY,session_id TEXT,learner_id TEXT,name TEXT,present INTEGER,class_member_id TEXT);
    INSERT INTO accounts VALUES('owner'),('cohost'),('other');
    INSERT INTO rooms VALUES('room','owner',NULL),('foreign-room','other',NULL);
    INSERT INTO room_memberships VALUES('room','cohost','cohost',NULL);
    INSERT INTO lesson_classes VALUES('class','owner',NULL),('foreign','other',NULL);
    INSERT INTO lesson_class_members VALUES('m1','class','An',NULL),('m2','class','Bình',NULL),('m3','foreign','Ngoài lớp',NULL);
    INSERT INTO lesson_sessions VALUES('session','room','owner','class','active','{}','pkg','hash','preview'),('foreign-session','foreign-room','other','foreign','active','{}','foreign-pkg','foreign-hash','preview');
    INSERT INTO lesson_learners VALUES('row1','session','a','An',1,'m1'),('row2','session','b','Bình',1,'m2'),('row3','foreign-session','c','Ngoài lớp',1,'m3');`);
  const state = { roster: { a: { present: true }, b: { present: true } }, timeline: { currentActivityId: 'act', activityIndex: 0 },
    package: { activities: [{ id: 'act', taskIds: ['q'] }], tasks: [{ id: 'q', participation: 'individual' }] } };
  database.prepare('UPDATE lesson_sessions SET state=? WHERE id=?').run(JSON.stringify(state), 'session');
  database.prepare('INSERT INTO lesson_packages VALUES(?,?,?,?,?)').run('pkg','owner','hash','draft',JSON.stringify(state.package));
  for (const statement of readFileSync(new URL('../drizzle/0019_lesson_devices.sql', import.meta.url), 'utf8').split('--> statement-breakpoint')) if (statement.trim()) database.exec(statement);
  const prepare = sql => ({ bind: (...values) => ({
    first: async () => database.prepare(sql).get(...values) ?? null,
    all: async () => ({ results: database.prepare(sql).all(...values) }),
    run: async () => { beforeWrite(sql, database); return { meta: { changes: Number(database.prepare(sql).run(...values).changes) } }; }
  }) });
  const db = { prepare, batch: async statements => {
    database.exec('BEGIN'); try { const result = []; for (const statement of statements) result.push(await statement.run()); database.exec('COMMIT'); return result; }
    catch (error) { database.exec('ROLLBACK'); throw error; }
  } };
  const clock = { t: 1000 };
  return { database, clock, service: deviceModule.createLessonDeviceService({ db, now: () => clock.t }) };
}
const issue = (env, extras = {}) => env.service.issueDevice({ accountId: 'owner', sessionId: 'session', kind: 'B', memberIds: ['a', 'b'], requestId: 'issue-001', ...extras });

check('owner/cohost issue controller once, teacher list hides bearer/PIN, pupil sees only device members', async () => {
  const env = setup(), issued = await issue(env);
  assert.match(issued.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(JSON.stringify(env.database.prepare('SELECT * FROM lesson_devices').all()).includes(issued.token), false);
  const again = await issue(env); assert.equal(again.token, undefined); assert.equal(again.device.id, issued.device.id);
  await issue(env, { accountId: 'cohost', requestId: 'issue-002', memberIds: ['a'] });
  const teacher = await env.service.listDevices({ accountId: 'owner', sessionId: 'session' });
  assert.equal(teacher.devices.length, 2); assert.equal(/token|hash|pin/i.test(JSON.stringify(teacher)), false);
  const own = await env.service.listDeviceMembers({ sessionId: 'session', deviceToken: issued.token });
  assert.deepEqual(own.members.map(member => member.learnerId), ['a', 'b']);
  assert.equal(/token|hash|pin/i.test(JSON.stringify(own)), false);
});

check('device resolves only explicitly selected present member, exact session, canonical bearer and live class', async () => {
  const env = setup(), issued = await issue(env, { memberIds: ['a'] });
  const actor = await env.service.resolveActingLearner({ sessionId: 'session', deviceToken: issued.token, learnerId: 'a' });
  assert.equal(actor.learnerId, 'a'); assert.equal(actor.deviceId, issued.device.id); assert.equal(actor.kind, 'B');
  for (const args of [{ learnerId: 'b' }, { learnerId: 'c' }, { sessionId: 'foreign-session' }, { deviceToken: issued.token + '=' }, { deviceToken: issued.token.slice(0, -1) + 'B' }]) {
    await assert.rejects(() => env.service.resolveActingLearner({ sessionId: 'session', deviceToken: issued.token, learnerId: 'a', ...args }), /DEVICE_UNAVAILABLE/);
  }
  env.database.exec("UPDATE lesson_class_members SET revoked_at=7 WHERE id='m1'");
  await assert.rejects(() => env.service.resolveActingLearner({ sessionId: 'session', deviceToken: issued.token, learnerId: 'a' }), /DEVICE_UNAVAILABLE/);
});

check('cross-class injection, unknown member and unauthorised issuer fail closed', async () => {
  const env = setup();
  for (const extras of [{ memberIds: ['c'] }, { memberIds: ['missing'] }, { memberIds: ['a', 'a'] }, { memberIds: [] }, { kind: 'A' }, { ttlMs: 86400001 }, { accountId: 'other' }]) await assert.rejects(() => issue(env, extras));
  const issued = await issue(env);
  await assert.rejects(() => issue(env, { memberIds: ['a'] }), /REQUEST_CONFLICT/);
  await assert.rejects(() => env.service.revokeDevice({ accountId: 'other', sessionId: 'session', deviceId: issued.device.id }), /FORBIDDEN/);
  await env.service.revokeDevice({ accountId: 'cohost', sessionId: 'session', deviceId: issued.device.id });
  await assert.rejects(() => env.service.listDeviceMembers({ sessionId: 'session', deviceToken: issued.token }), /DEVICE_UNAVAILABLE/);
});

check('revocation between authority read and write cannot mint a controller token', async () => {
  let armed = false;
  const env = setup((sql, db) => { if (armed && sql.startsWith('INSERT INTO lesson_devices')) { armed = false; db.exec("UPDATE room_memberships SET revoked_at=7 WHERE account_id='cohost'"); } });
  armed = true;
  await assert.rejects(() => issue(env, { accountId: 'cohost' }), /FORBIDDEN/);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_devices').get().n, 0);
});

check('controller expires after its scope ends, including lesson conclude and room deletion', async () => {
  for (const mutate of [env => { env.clock.t += 86400000; }, env => env.database.exec("UPDATE lesson_sessions SET status='concluded'"), env => env.database.exec("UPDATE rooms SET deleted_at=7")]) {
    const env = setup(), issued = await issue(env); mutate(env);
    await assert.rejects(() => env.service.resolveActingLearner({ sessionId: 'session', deviceToken: issued.token, learnerId: 'a' }), /DEVICE_UNAVAILABLE/);
  }
});

check('TV response requires teacher authority and own individual task; only prepares observed answer, never verdict', async () => {
  const env = setup(), result = await env.service.authorizeBoardResponse({ accountId: 'owner', sessionId: 'session', learnerId: 'a', taskId: 'q', answer: 'Em giơ bảng' });
  assert.deepEqual(result, { learnerId: 'a', taskId: 'q', answer: 'Em giơ bảng', recordedBy: 'owner', source: 'teacher_recorded_response' });
  assert.equal(Object.keys(result).includes('correct'), false);
  await assert.rejects(() => env.service.authorizeBoardResponse({ accountId: 'other', sessionId: 'session', learnerId: 'a', taskId: 'q', answer: 'x' }), /FORBIDDEN/);
  await assert.rejects(() => env.service.authorizeBoardResponse({ accountId: 'owner', sessionId: 'session', learnerId: 'c', taskId: 'q', answer: 'x' }), /INVALID_DEVICE_MEMBER/);
});

check('TV authorization uses durable package binding when lesson state omits its package', async () => {
  const env = setup(), state = JSON.parse(env.database.prepare('SELECT state FROM lesson_sessions WHERE id=?').get('session').state);
  delete state.package; env.database.prepare('UPDATE lesson_sessions SET state=? WHERE id=?').run(JSON.stringify(state),'session');
  const response = await env.service.authorizeBoardResponse({ accountId:'owner',sessionId:'session',learnerId:'a',taskId:'q',answer:'Bảng cá nhân' });
  assert.equal(response.taskId,'q');
  env.database.exec("UPDATE lesson_sessions SET package_hash='foreign-hash' WHERE id='session'");
  await assert.rejects(() => env.service.authorizeBoardResponse({ accountId:'owner',sessionId:'session',learnerId:'a',taskId:'q',answer:'x' }),/INVALID_BOARD_RESPONSE/);
});

check('member revocation during issuance aborts the whole atomic device batch', async () => {
  let armed = true;
  const env = setup((sql, database) => { if (armed && sql.startsWith('INSERT INTO lesson_device_members')) { armed = false; database.exec("UPDATE lesson_class_members SET revoked_at=7 WHERE id='m1'"); } });
  await assert.rejects(() => issue(env), /INVALID_DEVICE_MEMBER/);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_devices').get().n, 0);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_device_members').get().n, 0);
});

check('revoked cohost issuer cannot leave its shared device authority active', async () => {
  const env = setup(), issued = await issue(env, { accountId: 'cohost' });
  env.database.exec("UPDATE room_memberships SET revoked_at=7 WHERE account_id='cohost'");
  await assert.rejects(() => env.service.resolveActingLearner({ sessionId: 'session', deviceToken: issued.token, learnerId: 'a' }), /DEVICE_UNAVAILABLE/);
});

check('shared-device panel explicitly selects pupil ID and contains no teacher credentials', () => {
  const source = readFileSync(new URL('../components/lesson/SharedDevicePanel.tsx', import.meta.url), 'utf8');
  const component = { exports: {} };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText,
    { module: component, exports: component.exports, require: () => React });
  const selected = [], tree = component.exports.SharedDevicePanel({ members: [{ learnerId: 'a', name: 'An' }, { learnerId: 'b', name: 'Bình' }], onActingLearner: id => selected.push(id) });
  const find = node => !node || typeof node !== 'object' ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(find)];
  const buttons = find(tree).filter(node => node.type === 'button');
  assert.equal(buttons.length, 2); buttons[1].props.onClick(); assert.deepEqual(selected, ['b']);
  for (const button of buttons) assert.ok(button.props.style.minHeight >= 44);
  const html = renderToStaticMarkup(tree);
  assert.match(html, /Chọn tên trước/); assert.doesNotMatch(html, /token|pin|password|accountId/i);
});

check('route rejects forged actor fields and bearer create; anonymous issuer gets AUTH_REQUIRED', async () => {
  const source = readFileSync(new URL('../app/api/lesson-devices/route.js', import.meta.url), 'utf8');
  const route = { exports: {} }, calls = [];
  const api = { resolveActingLearner: async args => { calls.push(args); return { learnerId: args.learnerId }; } };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { module: route, exports: route.exports, Response, URL, require(name) {
      if (name.includes('storage')) return { db: () => ({}), getEnv: () => ({}) };
      if (name.includes('account-room-access')) return { resolveIdentity: () => ({ user: null }) };
      if (name.includes('device-service')) return { createLessonDeviceService: () => api };
      return { json: (body, status = 200) => Response.json(body, { status }), readJson: request => request.json(), bearer: request => request.headers.get('authorization')?.replace(/^Bearer /, '') || '' };
    } });
  const post = (body, token) => route.exports.POST(new Request('https://site.test/api/lesson-devices', { method: 'POST', headers: token ? { authorization: 'Bearer ' + token } : {}, body: JSON.stringify(body) }));
  assert.equal((await post({ action: 'create', sessionId: 'session', memberIds: ['a'] })).status, 401);
  assert.equal((await post({ action: 'resolve', sessionId: 'session', learnerId: 'a', accountId: 'owner' }, 'device')).status, 400);
  assert.equal((await post({ action: 'create', sessionId: 'session', kind: 'B', memberIds: ['a'], requestId: 'r' }, 'device')).status, 401);
  const resolved = await post({ action: 'resolve', sessionId: 'session', learnerId: 'b' }, 'device');
  assert.equal(resolved.status, 200); assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{ sessionId: 'session', deviceToken: 'device', learnerId: 'b' }]);
});
