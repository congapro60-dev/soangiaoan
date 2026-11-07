import test from 'node:test';
import assert from 'node:assert/strict';
import {initLessonMode, applyLessonMode, applyLessonModeAction, tickLessonMode, syncLessonModeLearner, serializeLessonMode} from '../lib/lesson/mode-bridge.js';
import {constants as farm} from '../lib/mode-engine/rules/farm.js';
import {constants as arena} from '../lib/mode-engine/rules/arena.js';

function fixture(rule, now = 0) {
  const state = {status: 'active', round: 1, seed: 7, roster: {synthetic: {present: true}},
    timeline: {activityIndex: 0, currentActivityId: 'a'},
    package: {contentHash: 'qa', activities: [{id: 'a', taskIds: []}], tasks: []}, submissions: {}};
  const result = initLessonMode(state, rule, now);
  assert.equal(result.ok, true, result.code);
  return result.state;
}
const player = state => state.lessonMode.ruleState.players['mode-1'];
function answer(state, correct) {
  state = structuredClone(state);
  const taskId = 'q' + state.package.tasks.length, submissionId = 's' + taskId;
  state.package.activities[0].taskIds.push(taskId);
  state.package.tasks.push({id: taskId, activityId: 'a', type: 'closed', participation: 'individual', branch: 'shared', evaluation: {checkerId: 'numeric_exact', answerKey: 4}});
  state.submissions[submissionId] = {submissionId, learnerId: 'synthetic', taskId, activityId: 'a', answer: correct ? 4 : 3, ok: correct, assessmentStatus: 'assessed', at: state.package.tasks.length};
  const result = applyLessonMode(state, {learnerId: 'synthetic', taskId, submissionId}, state.lessonMode.gameNow);
  assert.equal(result.ok, true, result.code);
  return result.state;
}
function action(state, action) {
  const game = state.lessonMode;
  return applyLessonModeAction(state, {requestId: 'qa-' + (game.actionReceipts?.['mode-1']?.sequence || 0), rule: game.rule, round: game.round, startedAt: game.startedAt, instanceId: game.instanceId, sequence: (game.actionReceipts?.['mode-1']?.sequence || 0) + 1, action}, {role: 'learner', id: 'synthetic'}, game.gameNow);
}
function tick(state, now) {
  const result = tickLessonMode(state, now);
  assert.equal(result.ok, true, result.code);
  return result.state;
}

test('bridge: owned revive restores half class HP, consumes item, permits attack; no free revive', () => {
  for (const cls of Object.keys(arena.classes)) {
    let state = fixture('arena');
    state = action(state, {type: 'chooseClass', class: cls}).state;
    // Earn a revive through assessed answers rather than injecting an inventory item.
    while (!player(state).items.includes('revive')) state = answer(state, true);
    assert.equal(action(state, {type: 'item', item: 'revive'}).code, 'INVALID_MODE_ACTION');
    while (!player(state).down) state = answer(state, false);
    const bossHp = state.lessonMode.ruleState.boss.hp;
    const revived = action(state, {type: 'item', item: 'revive'});
    assert.equal(revived.ok, true, revived.code);
    state = revived.state;
    assert.equal(player(state).down, false);
    assert.equal(player(state).hp, arena.classes[cls].hp / 2);
    assert.equal(player(state).items.includes('revive'), false);
    assert.equal(state.lessonMode.units[0].outcome, 'active');
    assert.equal(action(state, {type: 'revive'}).code, 'INVALID_MODE_ACTION');
    state = answer(state, true);
    assert.ok(state.lessonMode.ruleState.boss.hp < bossHp);
    while (!player(state).down) state = answer(state, false);
    assert.equal(action(state, {type: 'item', item: 'revive'}).code, 'INVALID_MODE_ACTION');
  }
});

test('bridge: class choice closes after either first answer and stays hidden while down', () => {
  for (const correct of [true, false]) {
    let state = answer(fixture('arena'), correct);
    assert.equal(action(state, {type: 'chooseClass', class: 'tank'}).code, 'INVALID_MODE_ACTION');
    assert.ok(!serializeLessonMode(state, 'synthetic').own.actions.some(choice => choice.action.type === 'chooseClass'));
    while (!player(state).down) state = answer(state, false);
    assert.equal(action(state, {type: 'chooseClass', class: 'tank'}).code, 'INVALID_MODE_ACTION');
    assert.ok(!serializeLessonMode(state, 'synthetic').own.actions.some(choice => choice.action.type === 'chooseClass'));
  }
});

test('bridge: farm season starts at game start, not lesson start; rewind remains rejected', () => {
  const start = 20 * 60000;
  let state = tick(fixture('farm', start), start);
  assert.equal(state.lessonMode.ruleState.day, 0);
  state = tick(state, start + 10 * 60000);
  assert.equal(state.lessonMode.ruleState.day, 2);
  assert.equal(state.lessonMode.ruleState.dayStartedAt, start + 10 * 60000);
  assert.equal(state.lessonMode.finished, false);
  assert.equal(tickLessonMode(state, start).code, 'INVALID_MODE_CLOCK');
  state = tick(state, start + farm.dayMs * farm.seasonDays - 1);
  assert.equal(state.lessonMode.finished, false);
  state = tick(state, start + farm.dayMs * farm.seasonDays);
  assert.equal(state.lessonMode.finished, true);
});

test('bridge: late farm joiners receive current-day grace, never earlier dry-day penalties', () => {
  let state = tick(fixture('farm', 20 * 60000), 20 * 60000 + farm.dayMs * 3);
  state.roster.lateSynthetic = {present: true};
  syncLessonModeLearner(state, 'lateSynthetic');
  assert.equal(state.lessonMode.ruleState.players['mode-2'].lastDay, 3);
  state = tick(state, state.lessonMode.startedAt + farm.dayMs * 4);
  assert.equal(state.lessonMode.ruleState.players['mode-2'].dryDays, 0);
  state = tick(state, state.lessonMode.startedAt + farm.dayMs * 5);
  assert.equal(state.lessonMode.ruleState.players['mode-2'].dryDays, 1);
});

test('bridge: blank day zero intentionally receives one grace day, like a late join day', () => {
  let state = tick(fixture('farm'), farm.dayMs);
  assert.equal(player(state).dryDays, 0);
  state = tick(state, farm.dayMs * 2);
  assert.equal(player(state).dryDays, 1);
});
