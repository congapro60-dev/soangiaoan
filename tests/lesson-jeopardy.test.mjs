import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as events from '../lib/lesson/class-events.js';

const teacher = { role: 'teacher', id: 'teacher' };
function fixture() {
  return { id: 'mountain-session', hostId: 'teacher', seed: 7, round: 1, status: 'active', timeline: { activityIndex: 0, locked: false }, clock: {},
    roster: { a: { present: true }, b: { present: true }, absent: { present: false } }, branches: { practice: { a: 'core', b: 'support' } },
    package: { budget: { reserveMinutes: 3 }, objectives: [{ id: 'seq', code: 'SEQ', statement: 'Nhận biết dãy số' }, { id: 'list', statement: 'Cách cho dãy số' }],
      activities: [{ id: 'practice', phase: 'practice', taskIds: ['one', 'two', 'three', 'support'] }],
      tasks: [{ id: 'one', objectiveIds: ['seq'], prompt: 'Tính câu một', branch: 'core' }, { id: 'two', objectiveIds: ['list'], prompt: 'Tính câu hai', branch: 'core' }, { id: 'three', objectiveIds: ['unknown'], prompt: 'Tính câu ba', branch: 'core' }, { id: 'support', objectiveIds: ['seq'], prompt: 'Câu hỗ trợ', branch: 'support' }].map((task, i) => ({ ...task, type: 'closed', inputSchema: { unit: 'm', privateAnswer: 'secret' }, evaluation: { checkerId: 'numeric_exact', answerKey: i + 1 } })) } };
}
const start = () => events.startClassEvent(fixture(), { type: 'mountain', seed: 1, durationMs: 180000 }, teacher, 1000);
const pick = (event, cellId, requestId = 'pick', now = 2000, learnerId = 'a') => events.pickClassEvent(event, { learnerId, cellId, requestId }, now);
const answer = (event, value, requestId = 'answer', now = 3000) => events.answerClassEvent(event, { learnerId: 'a', step: event.participants.a.step, answer: value, requestId }, now);

test('Jeopardy board draws actual own authored categories, stakes and only reveals selected task', () => {
  const event = start(), own = events.classEventView(event, 'a', 1000).own;
  assert.equal(event.boardVersion, 1);
  assert.equal(own.task, null);
  assert.equal(own.canAnswer, false);
  assert.equal(own.canPick, true);
  assert.equal(own.board.length, 3);
  assert.deepEqual(new Set(own.board.map(c => c.id)), new Set(['one', 'two', 'three']));
  assert.deepEqual(own.board.map(c => c.points), [10, 20, 30]);
  assert.equal(own.board.find(c => c.id === 'one').category, 'Nhận biết dãy số');
  assert.equal(own.board.find(c => c.id === 'two').category, 'Cách cho dãy số');
  assert.equal(own.board.find(c => c.id === 'three').category, 'Nhiệm vụ đã duyệt');
  const selected = pick(event, own.board[2].id), view = events.classEventView(selected, 'a', 2000).own;
  assert.equal(view.task.id, own.board[2].id);
  assert.equal(view.selectedCellId, own.board[2].id);
  assert.equal(view.canAnswer, true);
  assert.equal(view.canPick, false);
  assert.equal(/answerKey|secret|privateAnswer|Tính câu/.test(JSON.stringify(own.board)), false);
  assert.equal(events.classEventView(event, 'b', 1000).own.board.length, 1);
  const tv = events.classEventView(selected, null, 2000, { presenter: true });
  assert.equal(tv.own, null);
  assert.equal(/answerKey|prompt|one|two|three|learnerId/.test(JSON.stringify(tv)), false);
});

test('Jeopardy requires selection, scores chosen stake once, supports arbitrary order and consumes wrong cells', () => {
  let event = start();
  assert.throws(() => answer(event, 1), /EVENT_CELL_REQUIRED/);
  const board = events.classEventView(event, 'a', 1000).own.board;
  const third = board[2];
  event = pick(event, third.id);
  assert.throws(() => pick(event, board[0].id, 'other-pick', 2001), /EVENT_CELL_SELECTED/);
  const key = event.tasks.find(t => t.id === third.id).evaluation.answerKey;
  event = answer(event, key);
  assert.equal(event.participants.a.score, 30);
  assert.equal(event.participants.a.step, 1);
  assert.equal(events.classEventView(event, 'a', 3000).own.task, null);
  assert.throws(() => pick(event, third.id, 'repeat', 4000), /EVENT_CELL_USED/);
  event = pick(event, board[0].id, 'first', 4000);
  event = answer(event, -1, 'wrong', 5000);
  assert.equal(event.participants.a.score, 30);
  assert.throws(() => pick(event, board[1].id, 'wait', 14999), /EVENT_ANSWER_COOLDOWN/);
  event = pick(event, board[1].id, 'second', 15000);
  event = answer(event, event.tasks.find(t => t.id === board[1].id).evaluation.answerKey, 'last', 15001);
  assert.equal(event.participants.a.score, 50);
  const own = events.classEventView(event, 'a', 15001).own;
  assert.equal(own.board.every(cell => cell.used), true);
  assert.equal(own.canPick, false);
  assert.equal(event.teams[event.participants.a.team].points, 50);
  assert.doesNotMatch(JSON.stringify(event), /passport|mastery/);
});

test('Jeopardy pick guards scope/input/frozen participant/clock and retry namespace; close replay adds no point', () => {
  const initial = start(), cellId = events.classEventView(initial, 'a', 1000).own.board[0].id;
  assert.throws(() => pick(initial, 'support'), /EVENT_CELL_UNAVAILABLE/);
  assert.throws(() => pick(initial, cellId, 'late', 2000, 'late'), /EVENT_LEARNER_UNAVAILABLE/);
  assert.throws(() => events.pickClassEvent(initial, { learnerId: 'a', cellId, requestId: 'spoof', points: 999 }, 2000), /INVALID_EVENT_INPUT/);
  assert.throws(() => pick(initial, cellId, 'expired', initial.endsAt), /EVENT_EXPIRED/);
  let event = pick(initial, cellId, 'same-request');
  assert.equal(pick(event, cellId, 'same-request', 2001).lastResult.replay, true);
  assert.throws(() => pick(event, events.classEventView(initial, 'a', 1000).own.board[1].id, 'same-request', 2001), /EVENT_REQUEST_CONFLICT/);
  event = answer(event, event.tasks.find(t => t.id === cellId).evaluation.answerKey, 'same-request');
  const score = event.participants.a.score;
  event = events.finishClassEvent(event, teacher, 4000);
  assert.equal(pick(event, cellId, 'same-request', 4001).lastResult.replay, true);
  assert.equal(event.participants.a.score, score);
  assert.throws(() => pick(event, cellId, 'new', 4001), /EVENT_CLOSED/);
  const legacy = events.startClassEvent(fixture(), { type: 'boss', durationMs: 180000, seed: 1 }, teacher, 1000);
  assert.throws(() => pick(legacy, cellId), /INVALID_CLASS_EVENT/);
  assert.throws(() => pick(initial, cellId, 'past', 999), /INVALID_EVENT_CLOCK/);
});

test('Jeopardy panel renders selectable stakes, requires two steps and hides chosen prompt on TV', () => {
  const source = readFileSync(new URL('../components/lesson/ClassEventPanel.tsx', import.meta.url), 'utf8');
  const component = { exports: {} };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module: component, exports: component.exports, require: name => name === 'react' ? React : name.endsWith('/ClassEventScene') ? {__esModule:true,default:()=>null} : name.endsWith('/MathText') ? {__esModule:true,default:({text})=>React.createElement('span',null,text)} : name.endsWith('/TaskImage') ? {__esModule:true,default:()=>null,taskImageOf:()=>undefined,taskSolidOf:()=>undefined} : {default:props=>React.createElement('form', {'aria-label':'Nhiệm vụ sự kiện'},props.task.prompt), __esModule:true} });
  const render = (event, disabled = false, presenter = false) => renderToStaticMarkup(React.createElement(component.exports.ClassEventPanel, { view: events.classEventView(event, presenter ? null : 'a', 3000, { presenter }), onPick() {}, onAnswer() {}, disabled }));
  const event = start(), html = render(event);
  assert.match(html, /Bảng Jeopardy|Chọn ô/);
  assert.match(html, /10 điểm|20 điểm|30 điểm/);
  assert.doesNotMatch(html, /<form|Tính câu/);
  const chosen = pick(event, events.classEventView(event, 'a', 1000).own.board[2].id);
  assert.match(render(chosen), /<form/);
  assert.doesNotMatch(render(chosen, false, true), /<form|Bảng Jeopardy|Tính câu/);
  assert.match(render(event, true), /disabled=""/);
  assert.match(source, /minHeight: 44/);
});

test('legacy persisted mountain without board version remains sequential and new one-cell board remains playable', () => {
  let legacy = start();
  delete legacy.boardVersion;
  for (const player of Object.values(legacy.participants)) for (const field of ['board', 'selectedCellId', 'usedCellIds']) delete player[field];
  const task = legacy.tasks.find(t => t.id === legacy.participants.a.taskIds[0]);
  assert.equal(events.classEventView(legacy, 'a', 1000).own.task.id, task.id);
  legacy = answer(legacy, task.evaluation.answerKey);
  assert.equal(legacy.participants.a.score, 10);
  assert.equal(events.classEventView(legacy, 'a', 3000).own.board, undefined);
  let event = start();
  const own = events.classEventView(event, 'b', 1000).own;
  assert.equal(own.board.length, 1);
  event = pick(event, own.board[0].id, 'single', 2000, 'b');
  event = events.answerClassEvent(event, { learnerId: 'b', step: 0, answer: 4, requestId: 'single-answer' }, 3000);
  assert.equal(event.participants.b.score, 10);
  assert.equal(events.classEventView(event, 'b', 3000).own.canPick, false);
});
