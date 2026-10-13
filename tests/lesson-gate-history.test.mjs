import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { createLessonSession, reduceLessonSession } from '../lib/lesson/runtime.js';
import { serializeForTeacher, serializeForStudent, serializeForPresenter } from '../lib/lesson/serialize.js';
import { createLessonService } from '../lib/lesson/service.js';
import { hashPackage } from '../lib/lesson/schema.js';

const pkg = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));
const teacher = { role: 'teacher', id: 'host-1' };
const pupil = { role: 'student', id: 'pupil-1' };
const system = { role: 'system', id: 'system' };

function classroom() {
  let state = createLessonSession({ package: pkg, hostId: teacher.id, sessionId: 'gate-session', now: 0,
    learners: [{ id: pupil.id, name: 'An' }, { id: 'pupil-2', name: 'Bình' }] });
  let sequence = 0;
  const event = (type, payload = {}) => ({ eventId: `gate-${++sequence}`, type, round: state.round,
    revision: state.revision, activityId: state.timeline.currentActivityId, payload });
  const apply = (type, now, payload = {}, actor = teacher) => {
    const changed = reduceLessonSession(state, event(type, payload), { actor, now });
    assert.equal(changed.result.ok, true, JSON.stringify(changed.result));
    state = changed.state;
    return changed;
  };
  return { get state() { return state; }, set state(value) { state = value; }, event, apply };
}

function arrived() {
  const room = classroom();
  room.apply('START', 1000);
  room.state.diceTrack[pupil.id].position = 7;
  room.apply('ROLL', 2000, {}, pupil);
  return room;
}

function timing(room, now = room.state.clock.lastNow) {
  return serializeForTeacher(room.state, now).gateTiming?.[pupil.id];
}

function authorizeArena(room) {
  room.state.package.status = 'approved';
  room.state.package.map = 'historical';
  room.state.package.budget.reserveMinutes = 4;
  room.state.package.activities[0].taskIds = ['gate-task'];
  room.state.package.tasks.push({ id: 'gate-task', type: 'closed', prompt: '2 + 2',
    evaluation: { checkerId: 'numeric_exact', answerKey: 4 } });
}

test('teacher gate clock uses server wall even without learner history; expiry disables the support clock', () => {
  const room = classroom();
  assert.equal(serializeForTeacher(room.state, 1000).gateClockActive, false);
  room.apply('START', 1000);
  assert.equal(serializeForTeacher(room.state, 2000).gateClockActive, true);
  room.state.clock.activityDeadline = 5000;
  assert.equal(serializeForTeacher(room.state, 4999).gateClockActive, true);
  assert.equal(serializeForTeacher(room.state, 5000).gateClockActive, false);
  room.apply('PAUSE', 3000);
  assert.equal(serializeForTeacher(room.state, 4000).gateClockActive, false);
  room.apply('RESUME', 4000);
  room.apply('LOCK', 4500);
  assert.equal(serializeForTeacher(room.state, 5000).gateClockActive, false);
  room.apply('UNLOCK', 5000);
  assert.equal(serializeForTeacher(room.state, 5500).gateClockActive, true);
});

test('teacher gate clock excludes an arena until resumeAt, then honors adjusted expiry', () => {
  const room = arrived();
  room.state.clock.activityDeadline = 5000;
  authorizeArena(room);
  room.apply('ARENA_OPEN', 3000, { seed: 1 });
  const resumeAt = room.state.arena.event.resumeAt;
  assert.equal(serializeForTeacher(room.state, resumeAt - 1).gateClockActive, false);
  assert.equal(serializeForTeacher(room.state, resumeAt).gateClockActive, true);
  assert.equal(serializeForTeacher(room.state, resumeAt + 2000).gateClockActive, false);
});

test('gate timing starts only at a real core boundary arrival, using server time', () => {
  const room = classroom();
  assert.deepEqual(serializeForTeacher(room.state).gateTiming, {});
  room.apply('START', 1000);
  room.apply('ROLL', 1500, {}, pupil);
  assert.equal(timing(room), undefined);
  room.state.diceTrack[pupil.id].position = 7;
  room.apply('ROLL', 2000, {}, pupil);
  assert.deepEqual(timing(room), { activityId: room.state.timeline.currentActivityId,
    gatePosition: 8, enteredAt: 2000, activeMs: 0 });
  assert.equal(timing(room, 2500).activeMs, 500);
});

test('repeated ROLL and JSON reload preserve the original arrival; projection never mutates history', () => {
  const room = arrived();
  room.apply('ROLL', 2500, {}, pupil);
  assert.equal(timing(room).enteredAt, 2000);
  assert.equal(timing(room).activeMs, 500);
  room.state = JSON.parse(JSON.stringify(room.state));
  const before = JSON.stringify(room.state);
  assert.equal(timing(room, 3500).activeMs, 1500);
  assert.equal(timing(room, 1000).activeMs, 500);
  assert.equal(JSON.stringify(room.state), before);
  room.apply('TICK', 4000, {}, system);
  assert.equal(timing(room).activeMs, 2000);
  assert.equal(Object.keys(room.state.gateHistory).length, 1);
});

test('teacher pause excludes time before resume and does not reset arrival', () => {
  const room = arrived();
  room.apply('PAUSE', 3000);
  assert.equal(timing(room, 6000).activeMs, 1000);
  room.apply('RESUME', 7000);
  room.apply('TICK', 8000, {}, system);
  assert.equal(timing(room).activeMs, 2000);
  assert.equal(timing(room).enteredAt, 2000);
});

test('LOCK blocks elapsed time, including repeated successful events while locked', () => {
  const room = arrived();
  room.apply('LOCK', 3000);
  room.apply('TICK', 5000, {}, system);
  assert.equal(timing(room, 6000).activeMs, 1000);
  room.apply('UNLOCK', 7000);
  assert.equal(timing(room, 8000).activeMs, 2000);
});

test('deadline stops elapsed; a later EXTEND restarts now without filling the expired gap', () => {
  const room = arrived();
  room.state.clock.activityDeadline = 5000;
  assert.equal(timing(room, 8000).activeMs, 3000);
  room.apply('TICK', 8000, {}, system);
  room.apply('EXTEND', 9000, { minutes: 1 });
  assert.equal(timing(room).activeMs, 3000);
  assert.equal(timing(room, 10000).activeMs, 4000);
});

test('arena interval ends at resumeAt in polling and automatic settlement', () => {
  const room = arrived();
  authorizeArena(room);
  room.apply('ARENA_OPEN', 3000, { seed: 1 });
  const resumeAt = room.state.arena.event.resumeAt;
  assert.equal(timing(room, resumeAt - 1).activeMs, 1000);
  assert.equal(timing(room, resumeAt + 500).activeMs, 1500);
  room.apply('TICK', resumeAt + 500, {}, system);
  assert.equal(room.state.arena.settled, true);
  assert.equal(timing(room).activeMs, 1500);
  assert.equal(timing(room, resumeAt + 1000).activeMs, 2000);
});

test('overlapping teacher pause and arena are excluded once; shifted arena resumes exactly', () => {
  const room = arrived();
  authorizeArena(room);
  room.apply('ARENA_OPEN', 3000, { seed: 1 });
  const originalResume = room.state.arena.event.resumeAt;
  room.apply('PAUSE', 4000);
  assert.equal(timing(room, originalResume + 1000).activeMs, 1000);
  room.apply('RESUME', 8000);
  const resumeAt = room.state.arena.event.resumeAt;
  assert.equal(resumeAt, originalResume + 4000);
  room.apply('TICK', resumeAt + 500, {}, system);
  assert.equal(timing(room).activeMs, 1500);
});

test('LOCK overlapping an arena remains blocked after its end until UNLOCK', () => {
  const room = arrived();
  authorizeArena(room);
  room.apply('ARENA_OPEN', 3000, { seed: 1 });
  const resumeAt = room.state.arena.event.resumeAt;
  room.apply('LOCK', 4000);
  assert.equal(timing(room, resumeAt + 500).activeMs, 1000);
  room.apply('UNLOCK', resumeAt + 1000);
  assert.equal(timing(room, resumeAt + 1500).activeMs, 1500);
});

test('arena extending the deadline does not count its interval or time beyond adjusted expiry', () => {
  const room = arrived();
  room.state.clock.activityDeadline = 5000;
  authorizeArena(room);
  room.apply('ARENA_OPEN', 3000, { seed: 1 });
  const resumeAt = room.state.arena.event.resumeAt;
  assert.equal(timing(room, resumeAt + 10000).activeMs, 3000);
  room.apply('TICK', resumeAt + 10000, {}, system);
  assert.equal(timing(room).activeMs, 3000);
});

test('LEAVE removes history and a known rejoin already at gate begins a new interval', () => {
  const room = arrived();
  room.apply('LEAVE_LEARNER', 3000, { learnerId: pupil.id });
  assert.equal(timing(room, 5000), undefined);
  assert.equal(room.state.gateHistory[pupil.id], undefined);
  room.apply('ADD_LEARNER', 6000, { learner: { id: pupil.id, name: 'An' } });
  assert.equal(timing(room).enteredAt, 6000);
  assert.equal(timing(room, 7000).activeMs, 1000);
});

test('NEXT and round mismatch clear the bounded current history', () => {
  const room = arrived();
  room.apply('NEXT', 3000);
  assert.deepEqual(serializeForTeacher(room.state, 5000).gateTiming, {});
  assert.deepEqual(room.state.gateHistory, {});
  room.state.diceTrack[pupil.id].position = 15;
  room.apply('ROLL', 4000, {}, pupil);
  assert.equal(timing(room).gatePosition, 16);
  room.state.round++;
  assert.deepEqual(serializeForTeacher(room.state).gateTiming, {});
  room.apply('TICK', 5000, {}, system);
  assert.deepEqual(room.state.gateHistory, {});
});

test('legacy standing pupils remain unknown on TICK, polling and repeated ROLL', () => {
  const room = arrived();
  delete room.state.gateHistory;
  room.apply('TICK', 3000, {}, system);
  assert.equal(timing(room, 4000), undefined);
  room.apply('ROLL', 4000, {}, pupil);
  assert.equal(timing(room), undefined);
  room.apply('LEAVE_LEARNER', 5000, { learnerId: pupil.id });
  room.apply('ADD_LEARNER', 6000, { learner: { id: pupil.id, name: 'An' } });
  assert.equal(timing(room).enteredAt, 6000);
});

test('legacy pupils below the current boundary get a genuine new arrival; absent records never project', () => {
  const room = arrived();
  delete room.state.gateHistory;
  room.state.diceTrack['pupil-2'].position = 7;
  room.apply('ROLL', 3000, {}, { role: 'student', id: 'pupil-2' });
  assert.equal(serializeForTeacher(room.state).gateTiming['pupil-2'].enteredAt, 3000);
  room.state.roster['pupil-2'].present = false;
  assert.deepEqual(serializeForTeacher(room.state, 4000).gateTiming, {});
  room.apply('TICK', 4000, {}, system);
  assert.deepEqual(room.state.gateHistory, {});
});

test('rejoin below a gate starts no interval and a duplicate present ADD does not reset it', () => {
  const room = arrived();
  room.apply('ADD_LEARNER', 3000, { learner: { id: pupil.id, name: 'An' } });
  assert.equal(timing(room).enteredAt, 2000);
  room.apply('LEAVE_LEARNER', 4000, { learnerId: 'pupil-2' });
  room.apply('ADD_LEARNER', 5000, { learner: { id: 'pupil-2', name: 'Bình' } });
  assert.equal(serializeForTeacher(room.state).gateTiming['pupil-2'], undefined);
});

test('optional gates do not track; authored mapSegment core gates may track', () => {
  const room = classroom();
  room.state.package.activities[0].budgetRole = 'optional';
  room.apply('START', 1000);
  room.state.diceTrack[pupil.id].position = 7;
  room.apply('ROLL', 2000, {}, pupil);
  assert.equal(timing(room), undefined);
  room.state.gamePlan = { activityPlans: [{ id: room.state.timeline.currentActivityId, mapSegment: { coreGate: true } }] };
  room.state.diceTrack[pupil.id].position = 7;
  room.apply('ROLL', 3000, {}, pupil);
  assert.equal(timing(room).enteredAt, 3000);
});

test('rejected and replayed events never mutate or accrue history', () => {
  const room = arrived();
  const command = room.event('LOCK');
  const changed = reduceLessonSession(room.state, command, { actor: teacher, now: 3000 });
  assert.equal(changed.result.ok, true);
  room.state = changed.state;
  const before = JSON.stringify(room.state);
  const replay = reduceLessonSession(room.state, command, { actor: teacher, now: 7000 });
  assert.equal(replay.result.replay, true);
  assert.equal(replay.state, room.state);
  const rejected = reduceLessonSession(room.state, room.event('ROLL'), { actor: pupil, now: 8000 });
  assert.equal(rejected.result.code, 'LOCKED');
  assert.equal(rejected.state, room.state);
  assert.equal(JSON.stringify(room.state), before);
});

test('conclusion freezes timing; student, presenter and shared map never expose history', () => {
  const room = arrived();
  room.apply('CONCLUDE', 3000);
  assert.equal(timing(room, 10000).activeMs, 1000);
  const view = serializeForTeacher(room.state);
  assert.equal(view.gateHistory, undefined);
  for (const publicView of [serializeForStudent(room.state, pupil.id), serializeForPresenter(room.state)]) {
    assert.equal(publicView.gateHistory, undefined);
    assert.equal(publicView.gateTiming, undefined);
    assert.equal(publicView.gateClockActive, undefined);
    assert.doesNotMatch(JSON.stringify(publicView.map), /gateTiming|gateHistory|enteredAt|activeMs|updatedAt/);
  }
});

test('service polling rehydrates durable history and uses server wall without writing or leaking to owner TV', async () => {
  const room = arrived();
  const durable = { ...room.state };
  delete durable.package;
  delete durable.eventCache;
  const stored = JSON.stringify(durable);
  const database = new DatabaseSync(':memory:');
  database.exec(`
    CREATE TABLE rooms(id TEXT,owner_account_id TEXT,deleted_at INTEGER,code TEXT);
    CREATE TABLE room_memberships(room_id TEXT,account_id TEXT,role TEXT,revoked_at INTEGER);
    CREATE TABLE system_hosts(account_id TEXT,revoked_at INTEGER);
    CREATE TABLE lesson_packages(row_id TEXT,version TEXT,content_hash TEXT,data TEXT);
    CREATE TABLE lesson_session_plans(row_id TEXT,plan_hash TEXT,package_row_id TEXT,package_version TEXT,package_hash TEXT,data TEXT);
    CREATE TABLE lesson_sessions(id TEXT,room_id TEXT,package_row_id TEXT,package_version TEXT,package_hash TEXT,plan_row_id TEXT,plan_hash TEXT,owner_account_id TEXT,state TEXT,revision INTEGER);
  `);
  database.prepare('INSERT INTO rooms(id,owner_account_id,deleted_at) VALUES(?,?,NULL)').run('gate-room', teacher.id);
  database.prepare('INSERT INTO lesson_packages VALUES(?,?,?,?)').run('package-row', pkg.version, hashPackage(pkg), JSON.stringify(pkg));
  database.prepare('INSERT INTO lesson_sessions VALUES(?,?,?,?,?,NULL,NULL,?,?,?)').run(
    room.state.id, 'gate-room', 'package-row', pkg.version, hashPackage(pkg), teacher.id, stored, room.state.revision);
  const db = { prepare: (sql) => ({ bind: (...args) => ({ first: async () => database.prepare(sql).get(...args) ?? null }) }) };
  let wall = 3500;
  const service = createLessonService({ db, now: () => wall });
  try {
    assert.equal((await service.getSession({ id: room.state.id, accountId: teacher.id })).view.gateTiming[pupil.id].activeMs, 1500);
    wall = 4500;
    const polled = await service.getSession({ id: room.state.id, accountId: teacher.id });
    assert.equal(polled.view.gateTiming[pupil.id].activeMs, 2500);
    assert.equal(polled.serverNow, 4500);
    assert.equal(polled.view.gateClockActive, true);
    wall = room.state.clock.activityDeadline;
    assert.equal((await service.getSession({ id: room.state.id, accountId: teacher.id })).view.gateClockActive, false);
    const tv = (await service.getSession({ id: room.state.id, accountId: teacher.id, presenterViewer: true })).view;
    assert.equal(tv.gateTiming, undefined);
    assert.equal(tv.gateHistory, undefined);
    assert.equal(tv.gateClockActive, undefined);
    assert.equal(tv.roster, undefined);
    assert.equal(tv.map.peers.every(peer => peer.name === undefined), true);
    assert.equal(database.prepare('SELECT state FROM lesson_sessions').get().state, stored);
  } finally {
    database.close();
  }
});
