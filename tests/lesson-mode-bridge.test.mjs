import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RULES } from '../lib/mode-engine/index.js';
import { initLessonMode, applyLessonMode, applyLessonModeAction, syncLessonModeLearner, tickLessonMode, serializeLessonMode, LESSON_MODE_RULES } from '../lib/lesson/mode-bridge.js';

function fixture(rule = 'campaign', count = 2, participation = 'individual') {
  const roster = Object.fromEntries(Array.from({ length: count }, (_, i) => ['l' + i, { id: 'l' + i, name: 'PRIVATE_' + i, present: true }]));
  const state = { id: 'room', hostId: 'teacher', status: 'active', round: 1, seed: 7, roster, timeline: { currentActivityId: 'a', activityIndex: 0, locked: false }, clock: { arenaPausedAt: null },
    package: { contentHash: 'package-hash', activities: [{ id: 'a', taskIds: ['q1', 'q2'] }, { id: 'future', taskIds: ['future-q'] }], tasks: [{ id: 'q1', activityId: 'a', type: 'closed', participation: 'individual', branch: 'shared', evaluation: { checkerId: 'numeric_exact', answerKey: 4 } }, { id: 'q2', activityId: 'a', type: 'closed', participation: 'individual', branch: 'shared', evaluation: { checkerId: 'numeric_exact', answerKey: 9 } }, { id: 'future-q', activityId: 'future', type: 'closed', participation: 'individual', branch: 'shared', evaluation: { checkerId: 'numeric_exact', answerKey: 7 } }] },
    submissions: { s1: { submissionId: 's1', learnerId: 'l0', taskId: 'q1', activityId: 'a', answer: 4, ok: true, assessmentStatus: 'assessed', at: 1 }, s2: { submissionId: 's2', learnerId: 'l0', taskId: 'q2', activityId: 'a', answer: 9, ok: true, assessmentStatus: 'assessed', at: 2 } }, passports: { l0: { submissions: [] } }, gameWallets: { learners: {} } };
  state.gamePlan = { participation };
  if (participation !== 'individual') for (const learner of Object.values(roster)) learner.teamId = 'fixed-team';
  const result = initLessonMode(state, rule);
  assert.equal(result.ok, true, result.code);
  return result.state;
}
const input = { learnerId: 'l0', taskId: 'q1', submissionId: 's1' };
test('mode participation projects the current engine choice, never an outdated game plan',()=>{
 const state=fixture('campaign',2,'individual');state.gamePlan.participation='group';state.modeParticipation='pairs';assert.equal(serializeLessonMode(state,'l0').participation,'individual');
 const pairs=fixture('campaign',2,'pairs');assert.equal(serializeLessonMode(pairs,'l0').participation,'pairs');
});

test('bridge exposes exactly the actual nine registered rules and supports 150 trusted learners', () => {
  assert.deepEqual(LESSON_MODE_RULES, Object.keys(RULES));
  for (const rule of LESSON_MODE_RULES) {
    const state = fixture(rule, 150);
    assert.equal(state.lessonMode.units.length, 150);
    assert.equal(Object.keys(state.lessonMode.ruleState.players).length, 150);
    assert.equal(state.lessonMode.rule, rule);
  }
});

test('each registered rule changes its real engine state from a stored checked lesson submission only', () => {
  for (const rule of LESSON_MODE_RULES) {
    const state = fixture(rule), before = JSON.stringify(state);
    const result = applyLessonMode(state, input, 1);
    assert.equal(result.ok, true, rule + ': ' + result.code);
    assert.equal(result.result.correct, true);
    assert.notDeepEqual(result.state.lessonMode.ruleState, state.lessonMode.ruleState, rule);
    assert.deepEqual(result.state.passports, state.passports, rule);
    assert.deepEqual(result.state.gameWallets, state.gameWallets, rule);
    assert.equal(JSON.stringify(state), before, rule);
  }
});

test('receipt replay and a second correct retry of the same task never grant another game reward', () => {
  const initial = fixture('merchant'), first = applyLessonMode(initial, input, 1);
  const replay = applyLessonMode(first.state, input, 1);
  assert.equal(replay.ok, true); assert.equal(replay.result.replay, true);
  assert.deepEqual(replay.state.lessonMode, first.state.lessonMode);
  const retryState = structuredClone(first.state);
  retryState.submissions.retry = { ...retryState.submissions.s1, submissionId: 'retry', at: 3 };
  const retry = applyLessonMode(retryState, { ...input, submissionId: 'retry' }, 2);
  assert.equal(retry.ok, true); assert.equal(retry.result.replay, true);
  assert.equal(retry.state.lessonMode.ruleState.players['mode-1'].coins, first.state.lessonMode.ruleState.players['mode-1'].coins);
});

test('student payload cannot forge scores, correctness, another pupil receipt or a future/hidden task', () => {
  const state = fixture('merchant');
  for (const forged of [{ ...input, correct: true }, { ...input, score: 999 }, { ...input, answer: 999 }, { ...input, learnerId: 'l1' }, { ...input, learnerId: 'outside' }, { ...input, taskId: 'future-q' }, { ...input, action: { type: 'earn', points: 999 } }, { ...input, submissionId: 'missing' }]) assert.equal(applyLessonMode(state, forged, 1).ok, false, JSON.stringify(forged));
  const hidden = structuredClone(state); hidden.package.tasks[0].branch = 'extension'; hidden.branches = { a: { l0: 'support' } };
  assert.equal(applyLessonMode(hidden, input, 1).code, 'TASK_NOT_AVAILABLE');
  const tampered = structuredClone(state); tampered.submissions.s1.answer = 999;
  assert.equal(applyLessonMode(tampered, input, 1).ok, false);
});

test('pending and reflection work cannot power games, incorrect checked answers give no math reward', () => {
  const pending = fixture('merchant'); pending.submissions.s1.assessmentStatus = 'pending';
  assert.equal(applyLessonMode(pending, input, 1).code, 'MODE_SUBMISSION_UNASSESSED');
  const reflection = fixture('merchant'); reflection.package.tasks[0].type = 'reflection';
  assert.equal(applyLessonMode(reflection, input, 1).ok, false);
  const wrong = fixture('merchant'); wrong.submissions.s1.ok = false; wrong.submissions.s1.answer = 3;
  const result = applyLessonMode(wrong, input, 1);
  assert.equal(result.ok, true); assert.equal(result.result.correct, false);
  assert.equal(result.state.lessonMode.ruleState.players['mode-1'].coins, 4);
});

test('active-time ticks are monotonic and stay frozen during lesson and arena pauses', () => {
  const state = fixture('survival');
  const tick = tickLessonMode(state, 10000);
  assert.equal(tick.ok, true); assert.equal(tick.state.lessonMode.gameNow, 10000);
  assert.equal(tick.state.lessonMode.ruleState.players['mode-1'].energy, 90);
  assert.equal(tickLessonMode(tick.state, 9999).code, 'INVALID_MODE_CLOCK');
  for (const paused of [{ ...tick.state, status: 'paused' }, { ...tick.state, clock: { arenaPausedAt: 10000 } }]) {
    assert.equal(tickLessonMode(paused, 10000).ok, true);
    assert.equal(tickLessonMode(paused, 10001).code, 'MODE_PAUSED_CLOCK_ADVANCED');
    assert.equal(applyLessonMode(paused, input, 10000).code, 'MODE_PAUSED');
  }
});

test('public projection exposes own progress and aggregate outcomes without private IDs, ranks or work', () => {
  const state = fixture('merchant'), result = applyLessonMode(state, input, 1);
  const view = serializeLessonMode(result.state, 'l0');
  assert.equal(view.rule, 'merchant'); assert.equal(view.own.coins, 9); assert.equal(view.own.contracts, 0); assert.equal(view.aggregate.total, 2);
  assert.doesNotMatch(JSON.stringify(view), /PRIVATE_|mode-1|mode-2|l0|l1|answer|submission|learnerId|ranking/);
  assert.equal(serializeLessonMode(result.state, 'outside'), null);
  const presenter = serializeLessonMode(result.state);
  assert.equal(presenter.own, undefined); assert.equal(presenter.aggregate.total, 2);
});

test('campaign and lockdown adapters never generate unrelated math tasks', async () => {
  const source = await readFile(new URL('../lib/lesson/mode-bridge.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /issueChallenge\(|contextQuestion\(|createGame\(|curriculumPlan\(|roomView\(/);
  const campaign = fixture('campaign');
  assert.ok(campaign.lessonMode.ruleState.players['mode-1'].race.eventOrder.every(event => event !== 'math'));
  const first = applyLessonMode(campaign, input, 1);
  let travel = first.state;
  for (let i = 0; travel.lessonMode.ruleState.players['mode-1'].race.phase === 'travel' && i < 32; i++) travel = action(travel, { type: 'roll' }, i + 2).state;
  const second = applyLessonMode(travel, { learnerId: 'l0', taskId: 'q2', submissionId: 's2' }, 40);
  assert.equal(second.ok, true, second.code);
  assert.equal(second.state.lessonMode.ruleState.players['mode-1'].race.outcomes.length, 2);
  const locked = applyLessonMode(fixture('lockdown'), input, 1);
  assert.equal(locked.state.lessonMode.ruleState.players['mode-1'].room, 0);
  assert.equal(action(locked.state, { type: 'unlock' }, 2).state.lessonMode.ruleState.players['mode-1'].room, 1);
});

test('malformed inputs, stale package binding and replay clock rollback are rejected without throwing', () => {
  for (const state of [null, undefined, {}]) assert.doesNotThrow(() => assert.equal(applyLessonMode(state, input, 0).ok, false));
  const state = fixture('merchant'), first = applyLessonMode(state, input, 10);
  assert.equal(applyLessonMode(first.state, input, 9).code, 'INVALID_MODE_CLOCK');
  const swapped = structuredClone(first.state); swapped.package.contentHash = 'other-package';
  assert.equal(applyLessonMode(swapped, { learnerId: 'l0', taskId: 'q2', submissionId: 's2' }, 11).code, 'MODE_PACKAGE_MISMATCH');
  const departed = structuredClone(first.state); departed.roster.l0.present = false;
  assert.equal(serializeLessonMode(departed, 'l0'), null);
});

let actionSerial = 0;
function action(state, selected, now = state.lessonMode.gameNow, learnerId = 'l0') {
  const unit = state.lessonMode.units.find(unit => unit.members.some(member => member.id === learnerId));
  const result = applyLessonModeAction(state, { requestId: 'action-' + (++actionSerial), rule: state.lessonMode.rule, round: state.lessonMode.round, startedAt: state.lessonMode.startedAt, instanceId: state.lessonMode.instanceId, sequence: (state.lessonMode.actionReceipts?.[unit.id]?.sequence || 0) + 1, action: selected }, { role: 'learner', id: learnerId }, now);
  assert.equal(result.ok, true, `${state.lessonMode.rule}/${selected.type}: ${result.code}`);
  return result;
}
function assessed(state, serial, now = state.lessonMode.gameNow + 1, learnerId = 'l0') {
  const next = structuredClone(state), taskId = 'scoped-' + serial, submissionId = learnerId + '-receipt-' + serial;
  if (!next.package.tasks.some(task => task.id === taskId)) {
    next.package.activities[0].taskIds.push(taskId);
    next.package.tasks.push({ ...next.package.tasks[0], id: taskId });
  }
  next.submissions[submissionId] = { ...next.submissions.s1, learnerId, submissionId, taskId, at: now };
  const applied = applyLessonMode(next, { learnerId, taskId, submissionId }, now);
  assert.equal(applied.ok, true, `${state.lessonMode.rule}/${serial}: ${applied.code}`);
  return applied.state;
}

test('registered mechanical choices require the authenticated own pupil and never replay rewards', () => {
  const initial = fixture('merchant');
  const selected = { requestId: 'buy-ore', rule: 'merchant', round: 1, startedAt: 0, instanceId: initial.lessonMode.instanceId, sequence: 1, action: { type: 'buy', item: 'ore', quantity: 1 } };
  const before = JSON.stringify(initial);
  for (const actor of [null, { role: 'teacher', id: 'teacher' }, { role: 'learner', id: 'outside' }]) assert.equal(applyLessonModeAction(initial, selected, actor, 1).ok, false);
  for (const input of [{ ...selected, learnerId: 'l1' }, { ...selected, action: { ...selected.action, correct: true } }, { ...selected, action: { type: 'buy', item: 'ore', quantity: -1 } }]) assert.equal(applyLessonModeAction(initial, input, { role: 'learner', id: 'l0' }, 1).ok, false);
  const applied = applyLessonModeAction(initial, selected, { role: 'learner', id: 'l0' }, 1);
  assert.equal(applied.ok, true); assert.equal(applied.state.lessonMode.ruleState.players['mode-1'].coins, 1);
  const replay = applyLessonModeAction(applied.state, selected, { role: 'learner', id: 'l0' }, 1);
  assert.equal(replay.result.replay, true); assert.deepEqual(replay.state, applied.state);
  assert.equal(applyLessonModeAction(applied.state, { ...selected, action: { type: 'sell', item: 'ore', quantity: 1 } }, { role: 'learner', id: 'l0' }, 2).code, 'MODE_REQUEST_CONFLICT');
  assert.equal(JSON.stringify(initial), before);
  assert.deepEqual(applied.state.passports, initial.passports); assert.deepEqual(applied.state.gameWallets, initial.gameWallets);
});

test('mathematical choices queue only; the next assessed task supplies the verdict', () => {
  let state = fixture('zones');
  state = action(state, { type: 'objective' }).state;
  assert.equal(state.lessonMode.ruleState.factions[0].objective, 0);
  assert.deepEqual(serializeLessonMode(state, 'l0').own.selectedAction, { type: 'objective' });
  state = assessed(state, 1);
  assert.equal(state.lessonMode.ruleState.factions[0].objective, 1);
  assert.equal(serializeLessonMode(state, 'l0').own.selectedAction, null);
  assert.equal(serializeLessonMode(state, 'l0').own.actions.some(choice => choice.kind === 'assessment' && choice.action.type === 'capture'), true);
  assert.equal(serializeLessonMode(state).own, undefined);
  for (const paused of [{ ...state, status: 'paused' }, { ...state, clock: { classEventPausedAt: 1 } }, { ...state, timeline: { ...state.timeline, locked: true } }]) assert.equal(applyLessonModeAction(paused, { requestId: 'pause', sequence: 2, action: { type: 'objective' } }, { role: 'learner', id: 'l0' }, state.lessonMode.gameNow).code, 'MODE_PAUSED');
});

test('mechanical choices reach the actual campaign, escort, treasure, relay, lockdown and merchant endpoints', () => {
  for (const [rule, steps] of [['campaign', 5], ['escort', 6], ['treasure', 12], ['relay', 1], ['lockdown', 4], ['merchant', 3]]) {
    let state = fixture(rule);
    for (let i = 0; i < steps; i++) {
      state = assessed(state, i);
      const p = state.lessonMode.ruleState.players['mode-1'];
      if (rule === 'campaign') {
        for (let n = 0; p.race.phase === 'travel' && n < 32; n++) { state = action(state, { type: 'roll' }).state; Object.assign(p, state.lessonMode.ruleState.players['mode-1']); }
        if (p.race.phase === 'gate') state = action(state, { type: 'gate' }).state;
      } else if (rule === 'escort') state = action(state, { type: 'advance' }).state;
      else if (rule === 'treasure') {
        if (p.fragments.length === 3) state = action(state, { type: 'assemble' }).state;
        else if (p.clues > 0 && p.branch === null) state = action(state, { type: 'choose', branch: ['sun', 'moon', 'star'].find(branch => !p.fragments.includes(branch)) }).state;
      } else if (rule === 'relay') state = action(state, { type: 'handoff' }).state;
      else if (rule === 'lockdown') state = action(state, { type: 'unlock' }).state;
      else if (rule === 'merchant') {
        state = action(state, { type: 'buy', item: 'ore', quantity: 2 }).state;
        state = action(state, { type: 'buy', item: 'wood', quantity: 1 }).state;
        state = action(state, { type: 'contract' }).state;
      }
    }
    assert.equal(state.lessonMode.units[0].outcome, 'completed', rule);
    assert.deepEqual(state.passports, { l0: { submissions: [] } }, rule);
  }
});

test('duel settles all five rounds; zones and survival finish from their registered active-time rules', () => {
  let duel = fixture('duel');
  for (let round = 0; round < 5; round++) {
    duel = assessed(duel, round, round * 75000 + 1, 'l0');
    duel = assessed(duel, round, round * 75000 + 2, 'l1');
    duel = tickLessonMode(duel, (round + 1) * 75000).state;
  }
  assert.equal(duel.lessonMode.finished, true);
  assert.equal(duel.lessonMode.ruleState.round, 5);
  assert.equal(duel.lessonMode.ruleState.players['mode-1'].matchPoints, 15);
  let zones = assessed(fixture('zones'), 0, 1);
  zones = tickLessonMode(zones, 120000).state;
  assert.equal(zones.lessonMode.finished, true);
  assert.equal(zones.lessonMode.ruleState.factions[0].control, 12);
  let survival = fixture('survival');
  for (let round = 0; round < 6; round++) {
    survival = action(survival, { type: 'recover' }, round * 30000).state;
    survival = assessed(survival, round, round * 30000 + 1);
    survival = tickLessonMode(survival, (round + 1) * 30000).state;
  }
  assert.equal(survival.lessonMode.finished, true);
  assert.equal(survival.lessonMode.ruleState.players['mode-1'].rounds, 6);
});

test('mode panel presents only own choices, explicit lesson verdict boundary and aggregate-only TV', async () => {
  const source = await readFile(new URL('../components/lesson/LessonModePanel.tsx', import.meta.url), 'utf8');
  const component = { exports: {} };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module: component, exports: component.exports, require: () => React });
  for (const rule of LESSON_MODE_RULES) {
    const state = fixture(rule), pupilView = serializeLessonMode(state, 'l0');
    const html = renderToStaticMarkup(React.createElement(component.exports.LessonModePanel, { view: pupilView, onAction() {} }));
    assert.match(html, /Lựa chọn hành động chơi/); assert.match(html, /bài tiếp theo/); assert.doesNotMatch(html, /PRIVATE_|answerKey|mode-1/);
    const presenter = renderToStaticMarkup(React.createElement(component.exports.LessonModePanel, { view: serializeLessonMode(state), onAction() {} }));
    assert.doesNotMatch(presenter, /<button|<dl|Lựa chọn hành động chơi/);
  }
});

test('mode reset invalidates old actions and bounded sequence receipts cannot replay older trades', () => {
  const initial = fixture('merchant');
  const input = { requestId: 'buy', rule: 'merchant', round: 1, startedAt: 0, instanceId: initial.lessonMode.instanceId, sequence: 1, action: { type: 'buy', item: 'wood', quantity: 1 } };
  const first = applyLessonModeAction(initial, input, { role: 'learner', id: 'l0' }, 1);
  assert.equal(first.ok, true);
  const second = action(first.state, { type: 'sell', item: 'wood', quantity: 1 }).state;
  assert.equal(applyLessonModeAction(second, input, { role: 'learner', id: 'l0' }, 1).code, 'STALE_MODE_ACTION');
  const reset = initLessonMode(initial, 'merchant', 0).state;
  assert.equal(applyLessonModeAction(reset, input, { role: 'learner', id: 'l0' }, 1).code, 'MODE_PACKAGE_MISMATCH');
  let state = fixture('survival', 150);
  for (let i = 0; i < 150; i++) for (let n = 0; n < 8; n++) state = action(state, { type: 'move', position: n % 2 }, 0, 'l' + i).state;
  assert.equal(Object.keys(state.lessonMode.actionReceipts).length, 150);
  assert.ok(Buffer.byteLength(JSON.stringify(state.lessonMode.actionReceipts)) < 60000);
  assert.equal(serializeLessonMode(state, 'l0').own.actionSequence, 8);
});

test('fixed-team relay requires three own checked legs and explicit handoff, keeps individual evidence unchanged', () => {
  let state = fixture('relay', 3, 'group');
  assert.equal(state.lessonMode.units.length, 1); assert.equal(state.lessonMode.units[0].members.length, 3);
  const initialPassport = structuredClone(state.passports), ownTasks = structuredClone(state.submissions);
  for (let leg = 0; leg < 3; leg++) {
    const learnerId = 'l' + leg, waitingId = 'l' + ((leg + 1) % 3);
    const own = serializeLessonMode(state, learnerId), waiting = serializeLessonMode(state, waitingId);
    assert.equal(own.own.isController, true); assert.equal(own.own.teamSize, 3);
    assert.deepEqual(waiting.own.actions, []); assert.equal(waiting.own.isController, false);
    const blocked = { rule: 'relay', round: 1, startedAt: 0, instanceId: own.instanceId, sequence: own.own.actionSequence + 1, requestId: 'blocked-' + leg, action: { type: 'solve' } };
    assert.equal(applyLessonModeAction(state, blocked, { role: 'learner', id: waitingId }, state.lessonMode.gameNow).code, 'WRONG_CONTROLLER');
    const waitingSubmission = structuredClone(state), submissionId = 'waiting-' + leg;
    waitingSubmission.submissions[submissionId] = { ...waitingSubmission.submissions.s1, submissionId, learnerId: waitingId };
    assert.equal(applyLessonMode(waitingSubmission, { learnerId: waitingId, taskId: 'q1', submissionId }, state.lessonMode.gameNow).code, 'WRONG_CONTROLLER');
    state = assessed(state, leg, state.lessonMode.gameNow + 1, learnerId);
    assert.equal(state.lessonMode.units[0].outcome, 'active');
    state = action(state, { type: 'handoff' }, state.lessonMode.gameNow, learnerId).state;
    assert.equal(state.lessonMode.ruleState.players['mode-1'].legs, leg + 1);
  }
  assert.equal(state.lessonMode.units[0].outcome, 'completed'); assert.equal(state.lessonMode.finished, true);
  assert.deepEqual(state.passports, initialPassport);
  for (const [key, sub] of Object.entries(ownTasks)) assert.deepEqual(state.submissions[key], sub);
  assert.deepEqual(state.lessonMode.ruleState.players['mode-1'].coverage, ['l0', 'l1', 'l2']);
});

test('all nine rules use fixed identity teams, pair size two, no merge by equal pupil names', () => {
  for (const rule of LESSON_MODE_RULES) {
    const groups = fixture(rule, 150, 'group'); assert.equal(groups.lessonMode.units.length, 1);
    const pairs = fixture(rule, 5, 'pairs'); assert.deepEqual(pairs.lessonMode.units.map(unit => unit.members.length), [2, 2, 1]);
    const state = fixture(rule, 2), raw = { ...state, gamePlan: { participation: 'group' }, roster: { ...state.roster, l2: { id: 'l2', name: state.roster.l0.name, present: true } } };
    const independent = initLessonMode(raw, rule).state; assert.equal(independent.lessonMode.units.length, 3);
    const view = serializeLessonMode(groups, 'l1'); assert.equal(view.own.isController, false); assert.deepEqual(view.own.actions, []);
    assert.doesNotMatch(JSON.stringify(view), /PRIVATE_|fixed-team|learnerId|coverage|l0|l1/);
  }
});

test('late teammate preserves state, absent controller uses native rotation; completed team never reopens', () => {
  let state = fixture('merchant', 2, 'group');
  state = assessed(state, 1);
  const coins = state.lessonMode.ruleState.players['mode-1'].coins;
  state.roster.late = { id: 'late', name: 'PRIVATE_LATE', teamId: 'fixed-team', present: true };
  syncLessonModeLearner(state, 'late');
  assert.equal(state.lessonMode.units.length, 1); assert.equal(state.lessonMode.units[0].members.length, 3);
  assert.equal(state.lessonMode.ruleState.players['mode-1'].coins, coins);
  const controller = state.lessonMode.units[0].members[state.lessonMode.units[0].controller].id;
  state.roster[controller].present = false; syncLessonModeLearner(state, controller);
  assert.notEqual(state.lessonMode.units[0].members[state.lessonMode.units[0].controller].id, controller);
  assert.equal(state.lessonMode.units[0].outcome, 'active');
  state.lessonMode.units[0].outcome = 'completed'; state.roster.another = { id: 'another', name: 'Em', teamId: 'fixed-team', present: true };
  syncLessonModeLearner(state, 'another'); assert.equal(state.lessonMode.units[0].outcome, 'completed');
});

test('pairs rotate controller after own correct task; a teammate cannot replay another controller trade', () => {
  let state = fixture('merchant', 2, 'pairs');
  const input = { rule: 'merchant', round: 1, startedAt: 0, instanceId: state.lessonMode.instanceId, sequence: 1, requestId: 'shared-trade', action: { type: 'buy', item: 'wood', quantity: 1 } };
  state = applyLessonModeAction(state, input, { role: 'learner', id: 'l0' }, 0).state;
  assert.equal(applyLessonModeAction(state, input, { role: 'learner', id: 'l1' }, 0).code, 'MODE_REQUEST_CONFLICT');
  state = assessed(state, 1);
  assert.equal(serializeLessonMode(state, 'l1').own.isController, true);
  assert.deepEqual(serializeLessonMode(state, 'l0').own.actions, []);
  const traded = action(state, { type: 'sell', item: 'wood', quantity: 1 }, state.lessonMode.gameNow, 'l1');
  assert.equal(traded.ok, true); assert.equal(traded.state.lessonMode.units[0].controller, 1);
});

test('long assessed answers keep bounded hash receipts without weakening exact replay or conflict detection', () => {
  const state = fixture('merchant');
  state.package.tasks[0].type = 'open'; state.package.tasks[0].evaluation = { rubric: { criteria: ['Đúng'] } };
  state.submissions.s1.answer = 'Bài làm dài có dữ kiện. '.repeat(300);
  const first = applyLessonMode(state, input, 1);
  assert.equal(first.ok, true);
  const receipt = first.state.lessonMode.receipts.s1;
  assert.match(receipt.fingerprint, /^[a-f0-9]{64}$/);
  assert.ok(Buffer.byteLength(JSON.stringify(receipt)) < 200);
  assert.equal(applyLessonMode(first.state, input, 1).result.replay, true);
  const changed = structuredClone(first.state); changed.submissions.s1.answer += 'thay dữ kiện';
  assert.equal(applyLessonMode(changed, input, 1).code, 'MODE_RECEIPT_CONFLICT');
  const mechanical = action(first.state, { type: 'buy', item: 'wood', quantity: 1 }).state;
  assert.match(mechanical.lessonMode.actionReceipts['mode-1'].fingerprint, /^[a-f0-9]{64}$/);
});
