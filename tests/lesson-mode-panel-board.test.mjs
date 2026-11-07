import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

// The repository ships .tsx without a Node loader, so transpile exactly like the
// existing mode-panel test does.
const source = await readFile(new URL('../components/lesson/LessonModePanel.tsx', import.meta.url), 'utf8');
const module = {exports: {}};
const code = ts.transpileModule(source, {
  compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, esModuleInterop: true}
}).outputText;
vm.runInNewContext(code, {module, exports: module.exports, require: () => React});
const {LessonModePanel} = module.exports;

const view = (rule, own, board) => ({
  rule, round: 1, startedAt: 0, instanceId: 'i', paused: false, finished: false,
  gameNow: 0, deadline: 1800000,
  aggregate: {total: 2, completed: 0, active: 2},
  board,
  own: {actions: [], selectedAction: null, actionSequence: 0, isController: true, ...own}
});
const render = v => renderToStaticMarkup(React.createElement(LessonModePanel, {view: v, onAction() {}}));

test('speedway renders one lane per slot and marks the own lane', () => {
  const html = render(view('speedway', {distance: 7, combo: 2}, {
    track: {length: 20, lane: [{slot: 1, distance: 7, own: true}, {slot: 2, distance: 2, own: false}]}
  }));
  assert.match(html, /Đường đua tri thức/);
  assert.match(html, /Em/);
  assert.match(html, /Đội 2/);
  assert.match(html, /7\/20/);
  assert.match(html, /lane own/);
});

test('bellring separates standing seats from the eliminated ones', () => {
  const html = render(view('bellring', {ring: 3, out: false}, {
    seats: [{slot: 1, standing: true, ring: 3, own: true}, {slot: 2, standing: false, ring: 0, own: false}]
  }));
  assert.match(html, /Rung chuông vàng/);
  assert.match(html, /Còn 1 người trên sàn/);
  assert.match(html, /Đã rời sàn: Đội 2/);
});

test('bomb shows the wire count and swaps to the exploded copy', () => {
  const safe = render(view('bomb', {cut: 2}, {bomb: {wires: 4, cut: 2, exploded: false}}));
  assert.match(safe, /Đã cắt 2\/4 dây/);
  const boom = render(view('bomb', {cut: 1}, {bomb: {wires: 4, cut: 1, exploded: true}}));
  assert.match(boom, /Bom đã nổ/);
});

test('farm shows the season day, the stage and all five plots', () => {
  const html = render(view('farm', {stage: 2, water: 1, harvested: 1}, {
    farm: {stages: 5, labels: ['Hạt', 'Mầm', 'Cây non', 'Ra hoa', 'Kết quả'], day: 2, seasonDays: 6}
  }));
  assert.match(html, /Ngày 3\/6/);
  assert.match(html, /giai đoạn 2\/5/);
  assert.equal((html.match(/class="plot(?![a-z-])/g) || []).length, 5);
});

test('arena shows the boss bar, the chosen class label and the items', () => {
  const html = render(view('arena', {class: 'mage', hp: 800, mp: 300, damage: 600, items: ['shield']}, {
    arena: {boss: {hp: 6000, max: 9000}, classes: ['warrior', 'mage', 'archer', 'tank']}
  }));
  assert.match(html, /Trùm còn 6000\/9000 máu/);
  assert.match(html, /Pháp sư/);
  assert.match(html, /shield/);
  assert.match(html, /width:67%/);
});

test('no board leaks a learner name or an internal identifier', () => {
  const views = [
    view('speedway', {distance: 1}, {track: {length: 20, lane: [{slot: 1, distance: 1, own: true}]}}),
    view('bellring', {}, {seats: [{slot: 1, standing: true, ring: 0, own: true}]}),
    view('bomb', {}, {bomb: {wires: 4, cut: 0, exploded: false}}),
    view('farm', {}, {farm: {stages: 5, labels: ['a', 'b', 'c', 'd', 'e'], day: 0, seasonDays: 6}}),
    view('arena', {}, {arena: {boss: {hp: 1, max: 1}, classes: []}})
  ];
  for (const v of views) {
    const html = render(v);
    assert.doesNotMatch(html, /PRIVATE_|learnerId|unitId|mode-1/, v.rule);
  }
});

test('the presenter view renders no board markup', () => {
  for (const rule of ['speedway', 'bellring', 'bomb', 'farm', 'arena']) {
    const html = renderToStaticMarkup(React.createElement(LessonModePanel, {
      view: {rule, round: 1, startedAt: 0, instanceId: 'i', paused: false, finished: false, aggregate: {total: 2, completed: 0, active: 2}}
    }));
    assert.doesNotMatch(html, /game-board/, rule);
  }
});
