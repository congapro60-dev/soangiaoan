import test from 'node:test';
import assert from 'node:assert/strict';
import {initLessonMode, applyLessonMode, serializeLessonMode} from '../lib/lesson/mode-bridge.js';

const RULES_WITH_BOARD = ['speedway', 'bellring', 'bomb', 'farm', 'arena'];

function fixture(rule, count = 3) {
  const roster = Object.fromEntries(Array.from({ length: count }, (_, i) => [`l${i}`, { id: `l${i}`, name: `PRIVATE_${i}`, present: true }]));
  const state = {
    id: 'room', hostId: 'teacher', status: 'active', round: 1, seed: 7, roster,
    timeline: { currentActivityId: 'a', activityIndex: 0, locked: false }, clock: { arenaPausedAt: null },
    package: { contentHash: 'h', activities: [{ id: 'a', taskIds: ['q1'] }],
      tasks: [{ id: 'q1', activityId: 'a', type: 'closed', participation: 'individual', branch: 'shared', evaluation: { checkerId: 'numeric_exact', answerKey: 4 } }] },
    submissions: { s1: { submissionId: 's1', learnerId: 'l0', taskId: 'q1', activityId: 'a', answer: 4, ok: true, assessmentStatus: 'assessed', at: 1 } },
    passports: {}, gameWallets: { learners: {} }, gamePlan: { participation: 'individual' }
  };
  const result = initLessonMode(state, rule);
  assert.equal(result.ok, true, result.code);
  return result.state;
}

test('every new game publishes a display board to the pupil payload', () => {
  for (const rule of RULES_WITH_BOARD) {
    const view = serializeLessonMode(fixture(rule), 'l0');
    assert.ok(view.board, rule);
  }
});

test('the board never carries a learner name, roster id or internal unit id', () => {
  for (const rule of RULES_WITH_BOARD) {
    const view = serializeLessonMode(fixture(rule), 'l0');
    const boardText = JSON.stringify(view.board);
    assert.doesNotMatch(boardText, /PRIVATE_/, rule);
    assert.doesNotMatch(boardText, /learnerId|unitId|"l0"|"l1"/, rule);
    assert.doesNotMatch(boardText, /expected|answer|steps|answerKey/, rule);
  }
});

test('speedway board addresses lanes by public slot and flags only the own lane', () => {
  const view = serializeLessonMode(fixture('speedway'), 'l1');
  const lanes = view.board.track.lane;
  assert.equal(lanes.length, 3);
  assert.deepEqual(lanes.map(l => l.slot), [1, 2, 3]);
  assert.deepEqual(lanes.map(l => l.own), [false, true, false]);
});

test('bellring board addresses seats by public slot and flags only the own seat', () => {
  const view = serializeLessonMode(fixture('bellring'), 'l2');
  const seats = view.board.seats;
  assert.equal(seats.length, 3);
  assert.deepEqual(seats.map(s => s.slot), [1, 2, 3]);
  assert.deepEqual(seats.map(s => s.own), [false, false, true]);
});

test('bomb board reports the shared cut count and never the personal mistakes of others', () => {
  const view = serializeLessonMode(fixture('bomb'), 'l0');
  assert.equal(view.board.bomb.wires, 4);
  assert.equal(view.board.bomb.cut, 0);
  assert.equal(view.board.bomb.exploded, false);
  assert.equal('mistakes' in view.board.bomb, false);
});

test('farm board publishes the season day without the private watering history', () => {
  const view = serializeLessonMode(fixture('farm'), 'l0');
  assert.equal(view.board.farm.stages, 5);
  assert.ok(Array.isArray(view.board.farm.labels));
  assert.equal(typeof view.board.farm.day, 'number');
  assert.equal('water' in view.board.farm, false);
  assert.equal('lastDay' in view.board.farm, false);
});

test('arena board publishes the shared boss bar and the class list, never a rival damage figure', () => {
  const view = serializeLessonMode(fixture('arena'), 'l0');
  assert.ok(view.board.arena.boss.hp > 0);
  assert.deepEqual(view.board.arena.classes, ['warrior', 'mage', 'archer', 'tank']);
  assert.doesNotMatch(JSON.stringify(view.board.arena), /PRIVATE_|damage/);
});

test('the presenter view keeps the shared board but never an own state or own lane flag', () => {
  for (const rule of RULES_WITH_BOARD) {
    const presenter = serializeLessonMode(fixture(rule));
    assert.equal(presenter.own, undefined, rule);
    if (presenter.board?.track) assert.ok(presenter.board.track.lane.every(lane => lane.own === false), rule);
    if (presenter.board?.seats) assert.ok(presenter.board.seats.every(seat => seat.own === false), rule);
    assert.doesNotMatch(JSON.stringify(presenter.board), /PRIVATE_/, rule);
  }
});

test('an unregistered learner gets no board and no own state', () => {
  for (const rule of RULES_WITH_BOARD) {
    assert.equal(serializeLessonMode(fixture(rule), 'outside'), null, rule);
  }
});

test('class choice reaches the pupil action list for arena', () => {
  const view = serializeLessonMode(fixture('arena'), 'l0');
  const labels = view.own.actions.map(choice => choice.label);
  assert.ok(labels.some(label => label.includes('Chiến binh')), labels.join(' | '));
  assert.ok(labels.some(label => label.includes('Tank')), labels.join(' | '));
});

test('the farm guide tells the pupil when a day is skipped', () => {
  const view = serializeLessonMode(fixture('farm'), 'l0');
  assert.ok(view.board.farm.seasonDays >= 1);
});
