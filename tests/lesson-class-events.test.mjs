import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const events = await import('../lib/lesson/class-events.js').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
  throw error;
});
const check = (title, fn) => test(title, { skip: !events }, fn);
const teacher = { role: 'teacher', id: 'teacher' };
const session = () => ({ id: 'session', hostId: 'teacher', status: 'active', seed: 7, round: 1,
  timeline: { currentActivityId: 'practice', activityIndex: 0, locked: false }, clock: { arenaBudgetUsedMs: 0 },
  roster: { a: { id: 'a', present: true }, b: { id: 'b', present: true }, c: { id: 'c', present: true }, d: { id: 'd', present: false } },
  branches: { practice: { a: 'support', b: 'core', c: 'extension' } },
  package: { budget: { reserveMinutes: 5 }, activities: [{ id: 'practice', phase: 'practice', taskIds: ['support', 'core', 'extension'] }],
    tasks: ['support', 'core', 'extension'].map((branch, i) => ({ id: branch, type: 'closed', branch, prompt: 'Tính câu ' + i,
      evaluation: { checkerId: 'numeric_exact', answerKey: 10 + i }, inputSchema: { unit: 'm', privateAnswer: 'secret' } })) } });
const start = (type = 'tug', extras = {}) => events.startClassEvent(session(), { type, seed: 2, durationMs: 180000, ...extras }, teacher, 1000);
const answer = (event, learnerId, value, requestId = 'r1', now = 2000) => {
  if(event.type==='buzzer'&&event.buzzerVersion===1&&!event.participants[learnerId].buzz)event=events.buzzClassEvent(event,{learnerId,step:event.participants[learnerId].step,requestId:'buzz-'+requestId},now);
  if (event.type === 'mountain' && event.boardVersion === 1 && !event.participants[learnerId].selectedCellId) event = events.pickClassEvent(event, { learnerId, cellId: event.participants[learnerId].taskIds[event.participants[learnerId].step], requestId: 'pick-' + requestId }, now);
  return events.answerClassEvent(event, { learnerId, step: event.participants[learnerId].step, answer: value, requestId }, now);
};

test('class events module exists for the approved twelve rules', () => assert.ok(events, 'class-events.js missing'));

check('event selection stays within each pupil lane and reserve/auth/boundary limits', () => {
  const event = start();
  assert.deepEqual(event.participants.a.taskIds, ['support']);
  assert.deepEqual(event.participants.b.taskIds, ['core']);
  assert.deepEqual(event.participants.c.taskIds, ['extension']);
  assert.equal(event.participants.d, undefined);
  for (const durationMs of [0, 179999, 300001, NaN]) assert.throws(() => start('tug', { durationMs }), /INVALID_EVENT_DURATION/);
  const depleted = session(); depleted.clock.classEventBudgetUsedMs = 200000;
  assert.throws(() => events.startClassEvent(depleted, { type: 'tug', seed: 1, durationMs: 180000 }, teacher, 1000), /EVENT_BUDGET_EXCEEDED/);
  assert.throws(() => events.startClassEvent(session(), { type: 'tug', seed: 1, durationMs: 180000 }, { role: 'student', id: 'a' }, 1000), /UNAUTHORIZED/);
  for (const status of ['waiting', 'paused', 'concluded']) assert.throws(() => events.startClassEvent({ ...session(), status }, { type: 'tug', seed: 1, durationMs: 180000 }, teacher, 1000), /EVENT_BOUNDARY/);
  assert.throws(() => events.startClassEvent({ ...session(), classEvent: event }, { type: 'tug', seed: 1, durationMs: 180000 }, teacher, 1000), /EVENT_ALREADY_ACTIVE/);
});

check('server answers reject forged authority, unknown pupil, stale step, replay conflicts and expired input', () => {
  const initial = start();
  assert.throws(() => events.answerClassEvent(initial, { learnerId: 'unknown', step: 0, answer: 10, requestId: 'r1' }, 2000), /EVENT_LEARNER_UNAVAILABLE/);
  assert.throws(() => events.answerClassEvent(initial, { learnerId: 'a', step: 1, answer: 10, requestId: 'r1' }, 2000), /STALE_EVENT_STEP/);
  assert.throws(() => events.answerClassEvent(initial, { learnerId: 'a', step: 0, answer: 0, requestId: 'r1', correct: true }, 2000), /INVALID_EVENT_INPUT/);
  const answered = answer(initial, 'a', 10);
  assert.equal(answered.lastResult.correct, true); assert.equal(answered.participants.a.score, 10);
  const repeated = events.answerClassEvent(answered, { learnerId: 'a', step: 0, answer: 10, requestId: 'r1' }, 2001);
  assert.equal(repeated.lastResult.replay, true); assert.equal(repeated.participants.a.score, 10);
  assert.throws(() => events.answerClassEvent(answered, { learnerId: 'a', step: 0, answer: 0, requestId: 'r1' }, 2001), /EVENT_REQUEST_CONFLICT/);
  assert.throws(() => answer(initial, 'b', 11, 'late', initial.endsAt), /EVENT_EXPIRED/);
  assert.equal(initial.participants.a.step, 0);
});

check('wrong answer waits ten active seconds and pause is represented by unchanged logical time', () => {
  const state = session();
  state.package.tasks.push({ ...state.package.tasks[0], id: 'support2' });
  state.package.activities[0].taskIds.push('support2');
  let event = events.startClassEvent(state, { type: 'boss', seed: 1, durationMs: 180000 }, teacher, 1000);
  event = answer(event, 'a', 0);
  assert.equal(event.lastResult.correct, false);
  assert.throws(() => answer(event, 'a', 10, 'r2', 2000), /EVENT_ANSWER_COOLDOWN/);
  assert.throws(() => answer(event, 'a', 10, 'r2', 11999), /EVENT_ANSWER_COOLDOWN/);
  event = answer(event, 'a', 10, 'r2', 12000);
  assert.equal(event.participants.a.score, 10);
});

check('all twelve types have distinct rule progress and never write passport/mastery', () => {
  assert.deepEqual(events.CLASS_EVENT_TYPES, ['tug', 'boss', 'buzzer', 'mountain', 'castle', 'archery', 'surf', 'duel', 'relay', 'treasure', 'estimate', 'bingo']);
  const observed = [];
  for (const type of events.CLASS_EVENT_TYPES) {
    let event = start(type);
    const learner = type === 'relay' ? event.teams[0].memberIds[event.teams[0].turn] : 'a';
    const key = event.tasks.find(task => task.id === event.participants[learner].taskIds[0]).evaluation.answerKey;
    event = answer(event, learner, key);
    const view = events.classEventView(event, learner, 2000);
    assert.equal(view.type, type); assert.ok(view.progress.label); assert.ok(Number.isFinite(view.progress.value));
    observed.push(view.progress.label);
    assert.equal(JSON.stringify(event).includes('passport'), false);
    assert.equal(JSON.stringify(event).includes('mastery'), false);
  }
  assert.equal(new Set(observed).size, 12);
});

check('projection strips answer keys/private input schema and presenter has aggregates only', () => {
  assert.equal(events.classEventView(undefined, null, 1000), null);
  const event = start(), own = events.classEventView(event, 'a', 1000), presenter = events.classEventView(event, null, 1000, { presenter: true });
  assert.equal(own.own.task.id, 'support');
  assert.deepEqual(own.own.task.evaluation, { checkerId: 'numeric_exact' });
  const raw = JSON.stringify(own);
  assert.equal(raw.includes('answerKey') || raw.includes('secret') || raw.includes('privateAnswer'), false);
  assert.equal(presenter.own, null);
  assert.equal(JSON.stringify(presenter).includes('participants'), false);
  assert.equal(JSON.stringify(presenter).includes('taskIds'), false);
  assert.equal(JSON.stringify(presenter).includes('prompt'), false);
  assert.throws(() => events.classEventView(event, 'unknown', 1000), /EVENT_LEARNER_UNAVAILABLE/);
});

check('teacher finishes event, exact replay remains harmless, late new requests fail', () => {
  const event = answer(start(), 'a', 10);
  assert.throws(() => events.finishClassEvent(event, { role: 'teacher', id: 'outsider' }, 2001), /UNAUTHORIZED/);
  const closed = events.finishClassEvent(event, teacher, 2001);
  assert.equal(closed.status, 'closed');
  assert.equal(events.answerClassEvent(closed, { learnerId: 'a', step: 0, answer: 10, requestId: 'r1' }, 2002).lastResult.replay, true);
  assert.throws(() => answer(closed, 'b', 11, 'new', 2002), /EVENT_CLOSED/);
});

check('relay denies out of turn; estimation scores only from the server numeric answer', () => {
  const relay = start('relay'), team = relay.teams.find(item => item.memberIds.length > 1);
  const outsider = team.memberIds[1];
  assert.throws(() => answer(relay, outsider, 11), /NOT_EVENT_TURN/);
  const estimated = answer(start('estimate'), 'a', 9);
  assert.equal(estimated.lastResult.correct, false); assert.ok(estimated.participants.a.score > 0 && estimated.participants.a.score < 10);
  assert.equal(JSON.stringify(events.classEventView(estimated, 'a', 2000)).includes('answerKey'), false);
});

check('student panel uses the sanitized task editor; presenter shows no answer input', async () => {
  const source = await readFile(new URL('../components/lesson/ClassEventPanel.tsx', import.meta.url), 'utf8');
  const component = { exports: {} };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module: component, exports: component.exports, require: name => name === 'react' ? React : name.endsWith('/MathText') ? {__esModule:true,default:({text})=>React.createElement('span',null,text)} : name.endsWith('/ClassEventScene') ? {__esModule:true,default:()=>null} : name.endsWith('/TaskImage') ? {__esModule:true,default:()=>null,taskImageOf:()=>undefined,taskSolidOf:()=>undefined} : { default: props => React.createElement('form', { 'aria-label': 'Nhiệm vụ sự kiện' }, props.task.prompt), __esModule: true } });
  const view = events.classEventView(start(), 'a', 1000);
  const html = renderToStaticMarkup(React.createElement(component.exports.ClassEventPanel, { view, onAnswer() {} }));
  assert.match(html, /Kéo co|Nhiệm vụ sự kiện/); assert.doesNotMatch(html, /answerKey|secret/);
  const presenter = renderToStaticMarkup(React.createElement(component.exports.ClassEventPanel, { view: events.classEventView(start(), null, 1000, { presenter: true }) }));
  assert.doesNotMatch(presenter, /<form/);
});

check('boss health and mountain finish line scale to the actual available question pool', () => {
  let boss = start('boss');
  assert.equal(boss.bossHealth, 3);
  for (const [learnerId, value] of [['a', 10], ['b', 11], ['c', 12]]) boss = answer(boss, learnerId, value, learnerId, 2000);
  assert.equal(boss.bossHealth, 0);
  const mountain = answer(start('mountain'), 'a', 10);
  assert.equal(events.classEventView(mountain, 'a', 2000).progress.value, 4, 'one reviewed task can complete the authored mini-event climb');
});

check('receipt identity remains scoped even for delimiter-containing learner and request IDs', () => {
  const state = session(); state.roster = { a: { present: true }, 'a:b': { present: true } }; state.branches.practice = { a: 'support', 'a:b': 'support' };
  let event = events.startClassEvent(state, { type: 'tug', seed: 1, durationMs: 180000 }, teacher, 1000);
  event = answer(event, 'a:b', 10, 'c');
  event = answer(event, 'a', 10, 'b:c');
  assert.equal(event.participants.a.correct, 1);
});

check('bingo stays playable with one to three authored questions and never wins from free cells alone', () => {
  for (const count of [1, 2, 3]) {
    const state = session();
    state.roster = { a: { present: true } };
    for (let i = 1; i < count; i++) {
      state.package.tasks.push({ ...state.package.tasks[0], id: 'support-' + i });
      state.package.activities[0].taskIds.push('support-' + i);
    }
    let event = events.startClassEvent(state, { type: 'bingo', seed: 1, durationMs: 180000 }, teacher, 1000);
    assert.equal(event.participants.a.taskIds.length, count);
    assert.equal(events.classEventView(event, 'a', 1000).progress.value, 0);
    assert.deepEqual(events.classEventView(event, 'a', 1000).own.bingoFree, Array.from({ length: 4 }, (_, i) => i >= count));
    for (let i = 0; i < count; i++) event = answer(event, 'a', 10, 'bingo-' + i, 2000 + i);
    assert.equal(events.classEventView(event, 'a', 2000 + count).progress.value, 1);
  }
});
