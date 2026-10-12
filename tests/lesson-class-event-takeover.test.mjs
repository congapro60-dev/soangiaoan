import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLessonSession, reduceLessonSession, groupActiveMs } from '../lib/lesson/runtime.js';
import { serializeForStudent, serializeForPresenter } from '../lib/lesson/serialize.js';
import { hashPackage } from '../lib/lesson/schema.js';

function classroom(type = 'boss') {
  const pkg = JSON.parse(readFileSync(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));
  pkg.budget.reserveMinutes = 3; pkg.budget.slotMinutes = 41;
  pkg.activities.find(activity => activity.budgetRole === 'reserve').minutes = 3; pkg.contentHash = hashPackage(pkg);
  let state = createLessonSession({ package: pkg, sessionId: 'event-integration', hostId: 'teacher', now: 1000, learners: [{ id: 'a', name: 'HS giả A' }, { id: 'b', name: 'HS giả B' }] });
  let serial = 0;
  const teacher = { role: 'teacher', id: 'teacher' }, pupil = { role: 'student', id: 'a' };
  const send = (type, payload = {}, now = state.clock.lastNow + 1, actor = teacher) => {
    const event = { eventId: 'integration-' + ++serial, type, payload, round: state.round, revision: state.revision, activityId: state.timeline.currentActivityId };
    const result = reduceLessonSession(state, event, { now, actor });
    if (result.result.ok) state = result.state;
    return { ...result, event };
  };
  assert.equal(send('START').result.ok, true);
  const openedAt = state.clock.lastNow + 1;
  assert.equal(send('CLASS_EVENT_OPEN', { type, durationMs: 180000, seed: 1 }, openedAt).result.ok, true);
  return { get state() { return state; }, send, teacher, pupil, openedAt };
}

test('event expiry settles once after teacher pause, preserves lesson/group active time', () => {
  const room = classroom(), beforeDeadline = room.state.clock.activityDeadline;
  const beforeActive = groupActiveMs(room.state, room.openedAt);
  room.send('PAUSE', {}, room.openedAt + 1000);
  room.send('TICK', {}, room.openedAt + 61000, { role: 'system', id: 'system' });
  assert.equal(room.state.classEvent.status, 'active');
  assert.equal(groupActiveMs(room.state, room.openedAt + 61000), beforeActive);
  room.send('RESUME', {}, room.openedAt + 61001);
  room.send('TICK', {}, room.openedAt + 240000, { role: 'system', id: 'system' });
  assert.equal(room.state.classEvent.status, 'active');
  room.send('TICK', {}, room.openedAt + 240001, { role: 'system', id: 'system' });
  assert.equal(room.state.classEvent.status, 'closed');
  assert.equal(room.state.clock.classEventBudgetUsedMs, 180000);
  assert.equal(room.state.clock.activityDeadline, beforeDeadline + 240001);
  assert.equal(groupActiveMs(room.state, room.openedAt + 240001), beforeActive);
  const once = structuredClone(room.state.clock);
  room.send('CLASS_EVENT_CLOSE', {}, room.openedAt + 240002);
  assert.equal(room.state.clock.activityDeadline, once.activityDeadline);
  assert.equal(room.state.clock.classEventBudgetUsedMs, once.classEventBudgetUsedMs);
});

test('Jeopardy runtime binds own picker, refuses pause/stale/late actions and creates no mastery', () => {
  const room = classroom('mountain');
  const own = serializeForStudent(room.state, 'a').classEvent.own;
  assert.equal(own.task, null);
  const cell = own.board[0];
  const payload = { eventId: room.state.classEvent.id, cellId: cell.id, requestId: 'pick-runtime' };
  const early = room.send('CLASS_EVENT_ANSWER', { eventId: room.state.classEvent.id, step: 0, answer: 0, requestId: 'no-pick' }, room.openedAt + 1, room.pupil);
  assert.equal(early.result.code, 'EVENT_CELL_REQUIRED');
  room.send('PAUSE', {}, room.openedAt + 2);
  assert.equal(room.send('CLASS_EVENT_PICK', payload, room.openedAt + 3, room.pupil).result.code, 'PAUSED');
  room.send('RESUME', {}, room.openedAt + 4);
  assert.equal(room.send('CLASS_EVENT_PICK', { ...payload, eventId: 'stale' }, room.openedAt + 5, room.pupil).result.code, 'STALE_CLASS_EVENT');
  const picked = room.send('CLASS_EVENT_PICK', payload, room.openedAt + 6, room.pupil);
  assert.equal(picked.result.ok, true);
  const cached = reduceLessonSession(room.state, picked.event, { now: room.openedAt + 6, actor: room.pupil });
  assert.equal(cached.result.replay, true);
  assert.deepEqual(cached.state, room.state);
  assert.equal(serializeForStudent(room.state, 'a').classEvent.own.task.id, cell.id);
  const task = room.state.package.tasks.find(task => task.id === cell.id);
  const answered = room.send('CLASS_EVENT_ANSWER', { eventId: payload.eventId, step: 0, answer: task.evaluation.answerKey, requestId: 'chosen-answer' }, room.openedAt + 7, room.pupil);
  assert.equal(answered.result.correct, true);
  assert.equal(answered.result.points, cell.points);
  const score = room.state.classEvent.participants.a.score;
  const replay = room.send('CLASS_EVENT_PICK', payload, room.openedAt + 8, room.pupil).result;
  assert.equal(replay.ok, true, JSON.stringify(replay));
  assert.equal(room.state.classEvent.participants.a.selectedCellId, null, 'inner receipt must not reopen an answered cell');
  assert.equal(room.state.classEvent.participants.a.score, score);
  room.send('ADD_LEARNER', { learner: { id: 'late', name: 'HS giả đến sau' } }, room.openedAt + 9);
  assert.equal(room.send('CLASS_EVENT_PICK', payload, room.openedAt + 10, { role: 'student', id: 'late' }).result.code, 'EVENT_LEARNER_UNAVAILABLE');
  assert.equal(serializeForStudent(room.state, 'late').classEvent.own, null);
  assert.equal(room.state.passports.a.submissions.length, 0);
  assert.equal(room.send('CLASS_EVENT_CLOSE', {}, room.openedAt + 11).result.ok, true);
  assert.equal(room.send('CLASS_EVENT_PICK', { ...payload, requestId: 'new-after-close' }, room.openedAt + 12, room.pupil).result.code, 'EVENT_CLOSED');
  assert.equal(room.state.passports.a.submissions.length, 0);
  assert.equal(/answerKey|prompt|HS giả|selectedCellId/.test(JSON.stringify(serializeForPresenter(room.state).classEvent)), false);
});

test('conclude cancels a live event exactly once, keeps event points separate from learning evidence', () => {
  const room = classroom(), own = serializeForStudent(room.state, 'a');
  const task = room.state.package.tasks.find(task => task.id === own.classEvent.own.task.id);
  const answered = room.send('CLASS_EVENT_ANSWER', { eventId: own.classEvent.id, step: 0, answer: task.evaluation.answerKey, requestId: 'answer' }, room.openedAt + 1000, room.pupil);
  assert.equal(answered.result.correct, true);
  assert.equal(room.state.passports.a.submissions.length, 0);
  assert.equal(room.send('CONCLUDE', {}, room.openedAt + 2000).result.ok, true);
  assert.equal(room.state.classEvent.status, 'closed');
  assert.equal(room.state.clock.classEventBudgetUsedMs, 2000);
  assert.equal(room.state.passports.a.submissions.length, 0);
  const clock = structuredClone(room.state.clock);
  assert.equal(room.send('CONCLUDE', {}, room.openedAt + 3000).result.ok, false);
  assert.deepEqual(room.state.clock, clock);
});

test('event projections keep keys and names off TV; stale IDs and ordinary answers cannot bypass live event', () => {
  const room = classroom(), own = serializeForStudent(room.state, 'a'), tv = serializeForPresenter(room.state);
  assert.equal(tv.classEvent.own, null);
  assert.equal(/HS giả|answerKey|participants|taskIds/.test(JSON.stringify(tv.classEvent)), false);
  assert.equal(JSON.stringify(own.classEvent).includes('answerKey'), false);
  const stale = room.send('CLASS_EVENT_ANSWER', { eventId: 'old', step: 0, answer: 0, requestId: 'stale' }, room.openedAt + 1, room.pupil);
  assert.equal(stale.result.code, 'STALE_CLASS_EVENT');
  const ordinary = room.send('SUBMIT', { taskId: own.tasks[0].id, answer: 0 }, room.openedAt + 2, room.pupil);
  assert.equal(ordinary.result.code, 'CLASS_EVENT_ACTIVE');
  assert.equal(room.state.passports.a.submissions.length, 0);
});

test('late pupil joins class during an event, sees aggregate only, frozen event participants remain unchanged', () => {
  const room = classroom(), participants = Object.keys(room.state.classEvent.participants);
  const joined = room.send('ADD_LEARNER', { learner: { id: 'late', name: 'HS giả đến sau' } }, room.openedAt + 1);
  assert.equal(joined.result.ok, true, joined.result.code);
  assert.deepEqual(Object.keys(room.state.classEvent.participants), participants);
  const own = serializeForStudent(room.state, 'late');
  assert.equal(own.classEvent.own, null); assert.equal(own.classEvent.players, 2);
  assert.equal(own.passport.learnerId, 'late');
  const answer = room.send('CLASS_EVENT_ANSWER', { eventId: own.classEvent.id, step: 0, answer: 0, requestId: 'late-answer' }, room.openedAt + 2, { role: 'student', id: 'late' });
  assert.equal(answer.result.code, 'EVENT_LEARNER_UNAVAILABLE');
});
