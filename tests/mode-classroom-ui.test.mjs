import test from 'node:test';
import assert from 'node:assert/strict';
import {student, teacher, csv, readAnswer, readUnlock} from '../public/mode-classroom.js';

const base = (rule = 'merchant', challenge = null) => ({
  rule, participation: 'pairs', gameNow: 10, deadline: 10000, finished: false, paused: false, unitId: 'unit-1',
  units: [{id: 'unit-1', faction: 2, controller: 'learner-1', outcome: 'active', late: false, members: [{id: 'learner-1', name: 'An', present: true}, {id: 'learner-2', name: 'Bình', present: true}]}],
  players: {'unit-1': {coins: 4, ore: 1, wood: 2, contracts: 0, correct: 1}},
  ranking: [{unitId: 'unit-1', rank: 1, values: [0, 1]}], challenge
});

const h = {esc: x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])), mathText: x => String(x ?? ''), time: n => `${Math.floor(Number(n) / 1000)}s`, now: () => 10};

test('student renderer is Vietnamese, roster-aware and does not expose teacher secrets', () => {
  const m = base('merchant', {id: 'challenge-1', prompt: 'Tính 2 + 2', format: 'short', action: {type: 'earn'}, used: false, answer: 4, steps: ['Cộng hai số.']});
  const html = student(m, h);
  assert.match(html, /Thương hội/);
  assert.match(html, /An · Bình/);
  assert.match(html, /data-mode-send="earn"/);
  assert.match(html, /id="mode-answer"/);
  assert.doesNotMatch(html, /Cộng hai số|>4</);
});

test('all non-campaign rules render a distinct Vietnamese objective and action contract', () => {
  for (const rule of ['duel', 'zones', 'survival', 'escort', 'treasure', 'relay', 'lockdown', 'merchant']) {
    const m = base(rule);
    m.players['unit-1'] = {};
    const html = student(m, h);
    assert.doesNotMatch(html, /undefined|null/);
    assert.match(html, /mode-classroom/);
  }
});

test('student challenge controls support MCQ, true-false and puzzle input without JSON typing', () => {
  const mcq = student({...base('merchant', {prompt: 'Q', format: 'mcq', options: ['A', 'B'], used: false, action: {type: 'earn'}})}, h);
  assert.match(mcq, /mode-answer-option/); assert.doesNotMatch(mcq, /mode-answer"/);
  const tf = student({...base('merchant', {prompt: 'Q', format: 'tf', statements: ['A', 'B'], used: false, action: {type: 'earn'}})}, h);
  assert.match(tf, /mode-tf-0/); assert.match(tf, /Đúng/);
  const puzzle = student({...base('merchant', {prompt: 'Q', format: 'puzzle', fields: [{key: 'x', label: 'x'}], used: false, action: {type: 'earn'}})}, h);
  assert.match(puzzle, /data-mode-field="x"/); assert.doesNotMatch(puzzle, /JSON array/);
});

test('readAnswer returns server-expected shapes', () => {
  const elements = new Map([
    ['mode-answer', {value: ' 4 '}], ['mode-field-x', {value: '2'}],
  ]);
  const checked = value => ({value, checked: true});
  const doc = {getElementById: id => elements.get(id), querySelector: selector => selector.includes('option') ? checked('1') : selector.includes('tf-0') ? checked('D') : selector.includes('tf-1') ? checked('S') : null};
  assert.equal(readAnswer({challenge: {format: 'short'}}, doc), ' 4 ');
  assert.equal(readAnswer({challenge: {format: 'mcq'}}, doc), '1');
  assert.equal(readAnswer({challenge: {format: 'tf', statements: ['a', 'b']}}, doc), 'DS');
  assert.deepEqual(readAnswer({challenge: {format: 'puzzle', fields: [{key: 'x'}]}}, doc), {x: '2'});
});

test('lockdown renderer and reader use typed controls, not JSON input', () => {
  const m = {...base('lockdown'), room: {type: 'pipes', count: 3}};
  const html = student(m, h);
  assert.match(html, /mode-rotation-0/); assert.doesNotMatch(html, /JSON array/);
  const doc = {getElementById: id => ({value: id.endsWith('0') ? '1' : '2'})};
  assert.deepEqual(readUnlock(m, doc), {rotations: [1, 2, 2]});
  const logic = {...base('lockdown'), room: {type: 'logic', items: ['tree', 'water', 'seed']}};
  const logicDoc = {getElementById: id => ({value: id.endsWith('0') ? 'water' : id.endsWith('1') ? 'seed' : 'tree'})};
  assert.deepEqual(readUnlock(logic, logicDoc), {order: ['water', 'seed', 'tree']});
});

test('teacher renderer and CSV expose roster, faction, objective and answers', () => {
  const m = base('merchant');
  const reports = [{mode: {...m, objective: m.players['unit-1'], answers: [{id: 'q', topicName: 'Tập hợp', prompt: 'Q', answer: '4', steps: ['Bước']} ]}}];
  const html = teacher({mode: m}, reports, h);
  assert.match(html, /An · Bình/); assert.match(html, /Đáp án/); assert.match(html, /Bước/);
  const output = csv({mode: m}, reports);
  assert.match(output, /Roster/); assert.match(output, /An · Bình/); assert.match(output, /"3"/);
});

test('teacher joins each report to its exact unit and temporary defeat keeps recover available', () => {
  const m = base('survival');
  m.units.push({id: 'unit-2', faction: 1, controller: 'learner-3', outcome: 'active', late: false, members: [{id: 'learner-3', name: 'Chi', present: true}]});
  m.players['unit-1'] = {energy: 0, rounds: 1, objectives: 0, position: 4};
  m.players['unit-2'] = {energy: 80, rounds: 2, objectives: 1, position: 2};
  m.ranking = [{unitId: 'unit-1', rank: 1, values: [1, 0, 0]}, {unitId: 'unit-2', rank: 2, values: [2, 1, 80]}];
  m.unitId = 'unit-1'; m.units[0].outcome = 'temporary-defeat';
  const html = student(m, h);
  assert.match(html, /data-mode-send="recover" >Hồi năng lượng/);
  assert.match(html, /data-mode-send="objective" disabled/);
  const reports = [{mode: {...m, unitId: 'unit-1', objective: m.players['unit-1'], answers: []}}, {mode: {...m, unitId: 'unit-2', objective: m.players['unit-2'], answers: []}}];
  const board = {mode: m};
  const teacherHtml = teacher(board, reports, h);
  assert.match(teacherHtml, /Năng lượng.*0/); assert.match(teacherHtml, /Năng lượng.*80/);
});

test('CSV escapes formula-like roster and objective values', () => {
  const m = base('merchant'); m.units[0].members[0].name = '=IMPORTXML(1)'; m.players['unit-1'].coins = '=1+1';
  const reports = [{mode: {...m, objective: m.players['unit-1'], answers: []}}];
  const output = csv({mode: m}, reports);
  assert.match(output, /'=IMPORTXML/);
  assert.match(output, /Xu==1\+1/); // objective is prefixed by its label, so the cell is not formula-leading.
});
