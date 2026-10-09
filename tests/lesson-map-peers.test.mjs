import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createLessonSession, reduceLessonSession, DICE_UNITS_PER_ACTIVITY } from '../lib/lesson/runtime.js';
import { serializeForStudent, serializeForTeacher, serializeForPresenter } from '../lib/lesson/serialize.js';

const pkg = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));

function classroom(names) {
  const learners = names.map((name, i) => ({ id: `learner-secret-${i}`, name }));
  return createLessonSession({ package: pkg, hostId: 'host-1', sessionId: 'session-1', now: 0, learners });
}

function startAndRoll(state, learnerId, eventId, revision) {
  const started = reduceLessonSession(state, { eventId: `start-${eventId}`, type: 'START', round: 1, revision, payload: {} }, { now: 1000, actor: { role: 'teacher', id: 'host-1' } });
  assert.equal(started.result.ok, true);
  const rolled = reduceLessonSession(started.state, { eventId: `roll-${eventId}`, type: 'ROLL', round: 1, revision: started.state.revision, payload: {} }, { now: 2000, actor: { role: 'student', id: learnerId } });
  assert.equal(rolled.result.ok, true);
  return rolled.state;
}

test('map peers: every present pupil is listed with a mascot, position and a scale shared by all screens', () => {
  const state = startAndRoll(classroom(['An', 'Bình', 'Chi']), 'learner-secret-1', 'a', 0);
  const view = serializeForStudent(state, 'learner-secret-0');
  assert.equal(view.map.peers.length, 3);
  assert.equal(view.map.totalPosition, pkg.activities.length * DICE_UNITS_PER_ACTIVITY);
  for (const peer of view.map.peers) {
    assert.equal(Number.isInteger(peer.mascot) && peer.mascot >= 0 && peer.mascot < 8, true);
    assert.equal(typeof peer.position, 'number');
  }
  const mover = view.map.peers.find(peer => peer.name === 'Bình');
  assert.equal(mover.position, state.diceTrack['learner-secret-1'].position);
  assert.equal(mover.position > 0, true);
});

test('map peers: a pupil sees their own marker but never another pupil\'s real learner id', () => {
  const state = classroom(['An', 'Bình']);
  const view = serializeForStudent(state, 'learner-secret-0');
  assert.equal(view.map.peers.filter(peer => peer.own).length, 1);
  assert.equal(view.map.peers.find(peer => peer.own).name, 'An');
  assert.equal(JSON.stringify(view.map).includes('learner-secret'), false);
});

test('map peers: the TV view shows mascots without names or ids', () => {
  const state = classroom(['An', 'Bình']);
  const view = serializeForPresenter(state);
  assert.equal(view.map.peers.length, 2);
  const raw = JSON.stringify(view.map);
  assert.equal(raw.includes('An') && raw.includes('Bình'), false);
  assert.equal(raw.includes('learner-secret'), false);
  assert.equal(view.map.peers.every(peer => peer.name === undefined && peer.own === undefined), true);
});

test('map peers: the teacher sees names; absent pupils are left off the map', () => {
  let state = classroom(['An', 'Bình']);
  state.roster['learner-secret-1'].present = false;
  const view = serializeForTeacher(state);
  assert.deepEqual(view.map.peers.map(peer => peer.name), ['An']);
});

test('map peers: a mascot stays the same for the same pupil on every screen', () => {
  const state = classroom(['An', 'Bình', 'Chi', 'Dũng']);
  const fromStudent = serializeForStudent(state, 'learner-secret-2').map.peers.map(peer => peer.mascot);
  const fromTeacher = serializeForTeacher(state).map.peers.map(peer => peer.mascot);
  const fromTv = serializeForPresenter(state).map.peers.map(peer => peer.mascot);
  assert.deepEqual(fromStudent, fromTeacher);
  assert.deepEqual(fromStudent, fromTv);
});

function choose(state, learnerId, mascot, eventId = 'choose-1', actor = { role: 'student', id: learnerId }, now = 500) {
  return reduceLessonSession(state, { eventId, type: 'CHOOSE_MASCOT', round: 1, revision: state.revision, payload: { mascot } }, { now, actor });
}

test('choose mascot: a pupil picks their own mascot while the room is still waiting', () => {
  const state = classroom(['An', 'Bình']);
  assert.equal(state.status, 'waiting');
  const chosen = choose(state, 'learner-secret-0', 5);
  assert.equal(chosen.result.ok, true);
  assert.equal(chosen.state.roster['learner-secret-0'].mascot, 5);
  assert.equal(chosen.state.roster['learner-secret-1'].mascot, undefined);
});

test('choose mascot: the choice is shown on every screen and flagged only to its owner', () => {
  const state = choose(classroom(['An', 'Bình']), 'learner-secret-0', 6).state;
  const own = serializeForStudent(state, 'learner-secret-0').map.peers.find(peer => peer.own);
  assert.equal(own.mascot, 6);
  assert.equal(own.chosen, true);
  const other = serializeForStudent(state, 'learner-secret-1').map.peers;
  assert.equal(other.find(peer => peer.name === 'An').mascot, 6);
  assert.equal(other.every(peer => peer.chosen === undefined || peer.own === true), true);
  assert.equal(serializeForStudent(classroom(['An']), 'learner-secret-0').map.peers[0].chosen, false);
});

test('the teacher counts chosen mascots from the authoritative roster flag', () => {
  const state = choose(classroom(['An', 'Bình']), 'learner-secret-0', 0).state;
  const teacher = serializeForTeacher(state).map.peers;
  assert.equal(teacher.find(peer => peer.name === 'An').chosen, true);
  assert.equal(teacher.find(peer => peer.name === 'Bình').chosen, false);
});

test('choose mascot: invalid choices and other people\'s identities are refused', () => {
  const state = classroom(['An', 'Bình']);
  for (const bad of [-1, 8, 2.5, '3', null]) assert.equal(choose(state, 'learner-secret-0', bad).result.ok, false);
  assert.equal(choose(state, 'learner-secret-0', 3, 'teacher-try', { role: 'teacher', id: 'host-1' }).result.ok, false);
  const forged = reduceLessonSession(state, { eventId: 'forged', type: 'CHOOSE_MASCOT', round: 1, revision: state.revision, payload: { mascot: 2, learnerId: 'learner-secret-1' } }, { now: 500, actor: { role: 'student', id: 'learner-secret-0' } });
  assert.equal(forged.result.ok, false);
});

test('choose mascot: a pupil may change it freely until the lesson starts, then it is locked', () => {
  const waiting = classroom(['An']);
  const first = choose(waiting, 'learner-secret-0', 1, 'c1');
  assert.equal(first.result.ok, true);
  const second = choose(first.state, 'learner-secret-0', 6, 'c2');
  assert.equal(second.result.ok, true);
  assert.equal(second.state.roster['learner-secret-0'].mascot, 6);
  const started = reduceLessonSession(second.state, { eventId: 's', type: 'START', round: 1, revision: second.state.revision, payload: {} }, { now: 1000, actor: { role: 'teacher', id: 'host-1' } }).state;
  const late = choose(started, 'learner-secret-0', 3, 'c3', undefined, 1200);
  assert.equal(late.result.ok, false);
  assert.equal(late.result.code, 'MASCOT_LOCKED');
  assert.equal(started.roster['learner-secret-0'].mascot, 6);
});

test('choose mascot: a pupil who joins after the lesson began still makes their first choice, then it is locked', () => {
  const started = reduceLessonSession(classroom(['An']), { eventId: 's', type: 'START', round: 1, revision: 0, payload: {} }, { now: 1000, actor: { role: 'teacher', id: 'host-1' } }).state;
  const first = choose(started, 'learner-secret-0', 4, 'late-1', undefined, 1200);
  assert.equal(first.result.ok, true);
  const again = choose(first.state, 'learner-secret-0', 5, 'late-2', undefined, 1300);
  assert.equal(again.result.code, 'MASCOT_LOCKED');
});

test('map peers: the map carries the current gate so the dice dock can say how far the pupil is from it', () => {
  const state = classroom(['An']);
  const first = serializeForStudent(state, 'learner-secret-0').map;
  assert.equal(first.gatePosition, DICE_UNITS_PER_ACTIVITY);
  state.timeline.activityIndex = 2;
  assert.equal(serializeForStudent(state, 'learner-secret-0').map.gatePosition, 3 * DICE_UNITS_PER_ACTIVITY);
  state.timeline.activityIndex = 999;
  const last = serializeForStudent(state, 'learner-secret-0').map;
  assert.equal(last.gatePosition, last.totalPosition);
});

test('dice: a roll reports the face that came up, and it matches how far the mascot walked', () => {
  const started = reduceLessonSession(classroom(['An']), { eventId: 's', type: 'START', round: 1, revision: 0, payload: {} }, { now: 1000, actor: { role: 'teacher', id: 'host-1' } }).state;
  const before = started.diceTrack['learner-secret-0'].position;
  const rolled = reduceLessonSession(started, { eventId: 'r1', type: 'ROLL', round: 1, revision: started.revision, payload: {} }, { now: 2000, actor: { role: 'student', id: 'learner-secret-0' } });
  assert.equal(rolled.result.ok, true);
  assert.equal(Number.isInteger(rolled.result.die) && rolled.result.die >= 1 && rolled.result.die <= 6, true);
  assert.equal(rolled.result.from, before);
  assert.equal(rolled.result.position, Math.min(DICE_UNITS_PER_ACTIVITY, before + rolled.result.die));
});

test('dice: the map tells every screen how many dice units one activity gate is worth', () => {
  assert.equal(serializeForStudent(classroom(['An']), 'learner-secret-0').map.unitsPerActivity, DICE_UNITS_PER_ACTIVITY);
});
