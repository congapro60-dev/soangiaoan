import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import { createLessonService, MAX_EVENT_BYTES, validateSessionBody } from '../lib/lesson/service.js';
import { createLessonClassService } from '../lib/lesson/class-service.js';
import { createLessonDeviceService } from '../lib/lesson/device-service.js';
import { resolveIdentity } from '../lib/account-room-access.js';

const fixture = JSON.parse(readFileSync(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));
function setup(beforeWrite = () => {}) {
  const database = new DatabaseSync(':memory:'); database.exec('PRAGMA foreign_keys=ON');
  const journal = JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8')).entries;
  const migrations = [...journal.map(entry => entry.tag + '.sql'), ...['0018_lesson_leagues.sql', '0019_lesson_devices.sql'].filter(file => !journal.some(entry => entry.tag + '.sql' === file))];
  for (const file of migrations) for (const sql of readFileSync(new URL('../drizzle/' + file, import.meta.url), 'utf8').split('--> statement-breakpoint')) if (sql.trim()) database.exec(sql);
  for (const id of ['owner-1', 'other']) database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(id, id + '@test', id, 1);
  const prepare = sql => ({ bind: (...args) => ({ first: async () => { if (/^(UPDATE|INSERT|DELETE)/.test(sql)) beforeWrite(sql, database); return database.prepare(sql).get(...args) ?? null; }, all: async () => ({ results: database.prepare(sql).all(...args) }), run: async () => { beforeWrite(sql, database); return { meta: { changes: Number(database.prepare(sql).run(...args).changes) } }; } }) });
  let tail = Promise.resolve();
  const db = { prepare, batch: statements => { const result = tail.then(async () => { database.exec('BEGIN'); try { const out = []; for (const statement of statements) out.push(await statement.run()); database.exec('COMMIT'); return out; } catch (error) { database.exec('ROLLBACK'); throw error; } }); tail = result.catch(() => {}); return result; } };
  const clock = { t: 1_000_000 };
  return { database, db, clock, service: createLessonService({ db, now: () => clock.t }), classes: createLessonClassService({ db, now: () => clock.t }), devices: createLessonDeviceService({ db, now: () => clock.t }) };
}
const owner = 'owner-1';
async function room(env, count = 2) {
  const { class: cls } = await env.classes.createClass({ ownerAccountId: owner, title: 'QA class', requestId: 'class-request' });
  const saved = await env.service.savePackage({ ownerAccountId: owner, package: structuredClone(fixture) });
  const created = await env.service.createSession({ ownerAccountId: owner, packageRowId: saved.row.rowId, mode: 'preview', title: 'Synthetic class', requestId: 'session-request', classId: cls.id });
  const pupils = [];
  for (let index = 0; index < count; index++) {
    const member = await env.classes.addMember({ ownerAccountId: owner, classId: cls.id, name: 'Private student ' + index, requestId: 'member-request-' + index });
    const identity = await env.classes.joinClass({ classCode: cls.code, memberCode: member.member.code, pin: member.pin });
    const learnerToken = randomBytes(32).toString('base64url');
    const joined = await env.service.joinSession({ code: created.session.code, name: 'FORGED NAME', classToken: identity.token, token: learnerToken });
    pupils.push({ member, identity, learnerToken, joined });
  }
  return { cls, saved, created, pupils };
}
async function event(env, data, type, payload = {}, credentials = { accountId: owner }, eventId) {
  const current = await env.service.getSession({ id: data.created.session.id, accountId: owner });
  return env.service.event({ sessionId: data.created.session.id, ...credentials, event: { type, payload, activityId: ['SUBMIT', 'SAVE_DRAFT', 'HINT', 'TEACHER_RESPONSE'].includes(type) ? current.view.timeline.currentActivityId : undefined, eventId: eventId || type + '-' + current.revision, round: current.view.round, revision: current.revision } });
}

test('class identity replaces body name; duplicate profile cannot join a room twice, own bearer stays private', async () => {
  const env = setup(), data = await room(env);
  const rows = env.database.prepare('SELECT name,class_member_id FROM lesson_learners ORDER BY created_at,rowid').all();
  assert.deepEqual(rows.map(row => row.name), ['Private student 0', 'Private student 1']);
  const rotated = await env.service.joinSession({ code: data.created.session.code, name: '', classToken: data.pupils[0].identity.token, token: randomBytes(32).toString('base64url') });
  assert.equal(rotated.learnerId, data.pupils[0].joined.learnerId);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_learners').get().n, 2);
  const own = { view: rotated.projection };
  assert.equal(own.view.passport.learnerId, data.pupils[0].joined.learnerId);
  assert.equal(own.view.passports, undefined); assert.equal(own.view.roster, undefined);
});

test('preview class event commits normally without trying to create cumulative evidence', async () => {
  const env = setup(), data = await room(env, 1);
  assert.equal((await event(env, data, 'START')).result.ok, true);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_class_evidence').get().n, 0);
});

test('revoked profile cannot read, write or replay a personal lesson bearer', async () => {
  const env = setup(), data = await room(env, 1); await event(env, data, 'START');
  const credentials = { learnerToken: data.pupils[0].learnerToken };
  const applied = await event(env, data, 'CHOOSE_MASCOT', { mascot: 1 }, credentials, 'mascot-replay');
  assert.equal(applied.result.ok, true);
  await env.classes.revokeMember({ ownerAccountId: owner, classId: data.cls.id, memberId: data.pupils[0].member.member.id });
  await assert.rejects(() => env.service.getSession({ id: data.created.session.id, learnerToken: data.pupils[0].learnerToken }), /FORBIDDEN/);
  await assert.rejects(() => event(env, data, 'CHOOSE_MASCOT', { mascot: 1 }, credentials, 'mascot-replay'), /FORBIDDEN/);
});

test('class deletion after create precheck cannot insert a room, membership, audit or session', async () => {
  let armed = false;
  const env = setup((sql, database) => { if (armed && sql.startsWith('INSERT INTO rooms')) { armed = false; database.exec('UPDATE lesson_classes SET deleted_at=1'); } });
  const { class: cls } = await env.classes.createClass({ ownerAccountId: owner, title: 'QA', requestId: 'class-race-request' });
  const saved = await env.service.savePackage({ ownerAccountId: owner, package: structuredClone(fixture) }); armed = true;
  await assert.rejects(() => env.service.createSession({ ownerAccountId: owner, packageRowId: saved.row.rowId, mode: 'preview', title: 'Synthetic', requestId: 'race-create-request', classId: cls.id }), /FORBIDDEN/);
  for (const table of ['rooms', 'lesson_sessions', 'room_memberships', 'admin_audit']) assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM ' + table).get().n, 0, table);
});

test('device B acts only as selected assigned pupil, personal bearer cannot choose another pupil', async () => {
  const env = setup(), data = await room(env); await event(env, data, 'START');
  const ids = data.pupils.map(pupil => pupil.joined.learnerId);
  const device = await env.devices.issueDevice({ accountId: owner, sessionId: data.created.session.id, kind: 'B', memberIds: ids, requestId: 'device-request' });
  const own = await env.service.getSession({ id: data.created.session.id, learnerToken: device.token, actingLearnerId: ids[1] });
  assert.equal(own.view.passport.learnerId, ids[1]);
  await assert.rejects(() => env.service.getSession({ id: data.created.session.id, learnerToken: device.token }), /DEVICE_UNAVAILABLE/);
  await assert.rejects(() => env.service.getSession({ id: data.created.session.id, learnerToken: data.pupils[0].learnerToken, actingLearnerId: ids[1] }), /FORBIDDEN/);
  assert.equal((await event(env, data, 'CHOOSE_MASCOT', { mascot: 3 }, { learnerToken: device.token, actingLearnerId: ids[1] })).result.ok, true);
  const latest = await env.service.getSession({ id: data.created.session.id, accountId: owner });
  assert.equal(latest.view.roster[ids[1]].mascot, 3); assert.notEqual(latest.view.roster[ids[0]].mascot, 3);
});

test('device revoke between resolve and CAS rejects write; issuer revoke and expiry reject replay/read', async () => {
  let revokeDevice = false;
  const env = setup((sql, database) => { if (revokeDevice && sql.startsWith('UPDATE lesson_sessions SET state=')) { revokeDevice = false; database.exec('UPDATE lesson_devices SET revoked_at=1'); } });
  const data = await room(env, 1); await event(env, data, 'START');
  const learnerId = data.pupils[0].joined.learnerId;
  const device = await env.devices.issueDevice({ accountId: owner, sessionId: data.created.session.id, kind: 'B', memberIds: [learnerId], requestId: 'device-revoke-request', ttlMs: 1000 });
  revokeDevice = true;
  await assert.rejects(() => event(env, data, 'CHOOSE_MASCOT', { mascot: 1 }, { learnerToken: device.token, actingLearnerId: learnerId }), /FORBIDDEN/);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_event_receipts WHERE actor_key=?').get(learnerId).n, 0);
  env.database.exec('UPDATE lesson_devices SET revoked_at=NULL');
  await event(env, data, 'CHOOSE_MASCOT', { mascot: 1 }, { learnerToken: device.token, actingLearnerId: learnerId }, 'device-valid-replay');
  env.clock.t += 1001;
  await assert.rejects(() => env.service.getSession({ id: data.created.session.id, learnerToken: device.token, actingLearnerId: learnerId }), /DEVICE_UNAVAILABLE/);
  await assert.rejects(() => event(env, data, 'CHOOSE_MASCOT', { mascot: 1 }, { learnerToken: device.token, actingLearnerId: learnerId }, 'device-valid-replay'), /DEVICE_UNAVAILABLE/);
});

async function route(env) {
  const context = createContext({ Request, Response, URL, TextEncoder, TextDecoder, Uint8Array, console });
  const storage = new SyntheticModule(['db', 'stmt', 'getEnv'], function() { this.setExport('db', () => env.db); this.setExport('stmt', (sql, ...args) => env.db.prepare(sql).bind(...args)); this.setExport('getEnv', () => ({})); }, { context });
  const identity = new SyntheticModule(['resolveIdentity'], function() { this.setExport('resolveIdentity', resolveIdentity); }, { context });
  const serviceModule = new SyntheticModule(['createLessonService', 'MAX_EVENT_BYTES', 'validateSessionBody'], function() { this.setExport('createLessonService', () => env.service); this.setExport('MAX_EVENT_BYTES', MAX_EVENT_BYTES); this.setExport('validateSessionBody', validateSessionBody); }, { context });
  const api = new SourceTextModule(readFileSync(new URL('../app/api/lesson-sessions/route.js', import.meta.url), 'utf8'), { context });
  await api.link(specifier => specifier.endsWith('storage.js') ? storage : specifier.endsWith('account-room-access.js') ? identity : serviceModule); await api.evaluate(); return api.namespace;
}
test('HTTP passes explicit device actor IDs but rejects payload identity overrides and arbitrary extra body keys', async () => {
  const env = setup(), data = await room(env, 1), id = data.created.session.id; await event(env, data, 'START');
  const learnerId = data.pupils[0].joined.learnerId, device = await env.devices.issueDevice({ accountId: owner, sessionId: id, kind: 'B', memberIds: [learnerId], requestId: 'device-http-request' });
  const api = await route(env), headers = { authorization: 'Bearer ' + device.token, 'content-type': 'application/json' };
  const read = await api.GET(new Request('https://test/api/lesson-sessions?id=' + id + '&actingLearnerId=' + learnerId, { headers })); assert.equal(read.status, 200);
  const view = (await read.json()).view;
  const body = { action: 'event', id, actingLearnerId: learnerId, event: { type: 'CHOOSE_MASCOT', payload: { mascot: 1 }, eventId: 'http-device-mascot', round: view.round, revision: view.revision } };
  const post = payload => api.POST(new Request('https://test/api/lesson-sessions', { method: 'POST', headers, body: JSON.stringify(payload) }));
  assert.equal((await post(body)).status, 200); assert.equal((await post({ ...body, correct: true })).status, 400);
  assert.equal((await post({ ...body, event: { ...body.event, eventId: 'http-forged-identity', payload: { mascot: 1, learnerId: 'foreign' } } })).status, 400);
});

test('class membership revoke at personal CAS and cohost issuer revoke at device CAS cannot create receipts', async () => {
  let armed;
  const env = setup((sql, database) => {
    if (!armed || !sql.startsWith('UPDATE lesson_sessions SET state=')) return;
    if (armed === 'member') database.exec('UPDATE lesson_class_members SET revoked_at=1');
    if (armed === 'issuer') database.exec("UPDATE room_memberships SET revoked_at=1 WHERE account_id='other'");
    armed = null;
  });
  const data = await room(env, 1); await event(env, data, 'START');
  armed = 'member';
  await assert.rejects(() => event(env, data, 'CHOOSE_MASCOT', { mascot: 2 }, { learnerToken: data.pupils[0].learnerToken }), /FORBIDDEN/);
  env.database.exec('UPDATE lesson_class_members SET revoked_at=NULL');
  env.database.prepare('INSERT INTO room_memberships(room_id,account_id,role,granted_at,granted_by) VALUES(?,?,?,?,?)').run(data.created.session.roomId, 'other', 'cohost', 1, owner);
  const learnerId = data.pupils[0].joined.learnerId, device = await env.devices.issueDevice({ accountId: 'other', sessionId: data.created.session.id, kind: 'B', memberIds: [learnerId], requestId: 'cohost-device-request' });
  armed = 'issuer';
  await assert.rejects(() => event(env, data, 'CHOOSE_MASCOT', { mascot: 2 }, { learnerToken: device.token, actingLearnerId: learnerId }), /FORBIDDEN/);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_event_receipts WHERE event_id LIKE ?').get('CHOOSE_MASCOT%').n, 0);
  await assert.rejects(() => env.service.getSession({ id: data.created.session.id, learnerToken: device.token, actingLearnerId: learnerId }), /DEVICE_UNAVAILABLE/);
});

test('PIN reset invalidates old room bearer and shared device, then rejoin retains stable pupil ID and passport', async () => {
  const env = setup(), data = await room(env, 1); await event(env, data, 'START');
  const pupil = data.pupils[0], id = data.created.session.id;
  const device = await env.devices.issueDevice({ accountId: owner, sessionId: id, kind: 'B', memberIds: [pupil.joined.learnerId], requestId: 'reset-device-request' });
  await env.classes.revokeMember({ ownerAccountId: owner, classId: data.cls.id, memberId: pupil.member.member.id });
  const reset = await env.classes.resetMemberPin({ ownerAccountId: owner, classId: data.cls.id, memberId: pupil.member.member.id });
  await assert.rejects(() => env.service.getSession({ id, learnerToken: pupil.learnerToken }), /FORBIDDEN|DEVICE_UNAVAILABLE/);
  await assert.rejects(() => env.service.getSession({ id, learnerToken: device.token, actingLearnerId: pupil.joined.learnerId }), /DEVICE_UNAVAILABLE/);
  const identity = await env.classes.joinClass({ classCode: data.cls.code, memberCode: pupil.member.member.code, pin: reset.pin });
  const rejoined = await env.service.joinSession({ code: data.created.session.code, name: 'Alias', classToken: identity.token, token: randomBytes(32).toString('base64url') });
  assert.equal(rejoined.learnerId, pupil.joined.learnerId); assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM lesson_learners').get().n, 1);
  assert.equal(rejoined.projection.passport.learnerId, pupil.joined.learnerId);
});

test('teacher-recorded board response uses durable approved task, preserves pending assisted evidence and audits identity', async () => {
  const env = setup(), data = await room(env, 1); await event(env, data, 'START');
  const learnerId = data.pupils[0].joined.learnerId, task = fixture.tasks.find(task => task.activityId === fixture.activities[0].id && task.participation !== 'group');
  const recorded = await event(env, data, 'TEACHER_RESPONSE', { learnerId, taskId: task.id, answer: String(task.evaluation.answerKey) });
  assert.equal(recorded.result.pending, true);
  const submission = recorded.view.submissions[recorded.result.submissionId];
  assert.equal(submission.assessmentStatus, 'pending'); assert.equal(submission.assisted, true); assert.equal(submission.recordedBy, owner);
  await assert.rejects(() => event(env, data, 'ASSESS', { submissionId: recorded.result.submissionId, criteriaMet: true }), /INVALID_ASSESSMENT/);
  await event(env, data, 'ASSESS', { submissionId: recorded.result.submissionId, criteriaMet: true, nonMastery: true });
  const own = await env.service.getSession({ id: data.created.session.id, learnerToken: data.pupils[0].learnerToken });
  assert.equal(own.view.passport.submissions.at(-1).assisted, true);
  assert.deepEqual(own.view.passport.submissions.at(-1).evidenceIds, []);
  assert.equal(env.database.prepare("SELECT COUNT(*) AS n FROM admin_audit WHERE action='lesson-event' AND actor_account_id=? AND json_extract(payload,'$.type')='TEACHER_RESPONSE'").get(owner).n, 1);
});

test('recorded-board target revoked at CAS cannot append a submission or audit entry', async () => {
  let armed = false;
  const env = setup((sql, database) => { if (armed && sql.startsWith('UPDATE lesson_sessions SET state=')) { armed = false; database.exec('UPDATE lesson_class_members SET revoked_at=1'); } });
  const data = await room(env, 1); await event(env, data, 'START');
  const task = fixture.tasks.find(task => task.activityId === fixture.activities[0].id && task.participation !== 'group'); armed = true;
  await assert.rejects(() => event(env, data, 'TEACHER_RESPONSE', { learnerId: data.pupils[0].joined.learnerId, taskId: task.id, answer: String(task.evaluation.answerKey) }), /FORBIDDEN_OR_CONFLICT/);
  assert.equal(env.database.prepare("SELECT COUNT(*) AS n FROM admin_audit WHERE json_extract(payload,'$.type')='TEACHER_RESPONSE'").get().n, 0);
});
