import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as mode from '../public/mode-classroom.js';

function board(rule, players, extra = {}) {
  return {
    rule, unitId: 'unit-1', gameNow: 0, deadline: 1800000, finished: false, paused: false,
    units: [{id: 'unit-1', members: [{id: 'l0', name: 'An'}], controller: 'l0', outcome: 'active', faction: 0},
            {id: 'unit-2', members: [{id: 'l1', name: 'Bình'}], controller: 'l1', outcome: 'active', faction: 1}],
    players: {'unit-1': players, 'unit-2': {}},
    ranking: [], challenge: null, ...extra
  };
}

test('speedway board renders one lane per unit with the own lane highlighted', () => {
  const html = mode.student(board('speedway', {distance: 7, combo: 2}, {track: {length: 20}}));
  assert.match(html, /Đường đua tri thức/);
  assert.match(html, /7\/20/);
  assert.match(html, /lane own/);
});

test('bellring board separates the standing learners from those who left the stage', () => {
  const html = mode.student(board('bellring', {ring: 3, out: false}, {players: {'unit-1': {ring: 3, out: false}, 'unit-2': {out: true}}}));
  assert.match(html, /Rung chuông vàng/);
  assert.match(html, /Còn 1 người trên sàn/);
  assert.match(html, /Đã rời sàn: Bình/);
});

test('bomb board shows the cut wires and flips to the exploded state', () => {
  const safe = mode.student(board('bomb', {cut: 2, mistakes: 0}, {bomb: {wires: 4, cut: 2, exploded: false}}));
  assert.match(safe, /Đã cắt 2\/4 dây/);
  const boom = mode.student(board('bomb', {cut: 1, mistakes: 3}, {bomb: {wires: 4, cut: 1, exploded: true}}));
  assert.match(boom, /Bom đã nổ/);
});

test('farm board shows all five crop stages, the season day and the current stage', () => {
  const html = mode.student(board('farm', {stage: 2, water: 1, harvested: 0}, {farm: {stages: 5, labels: ['Hạt', 'Mầm', 'Cây non', 'Ra hoa', 'Kết quả'], day: 2, seasonDays: 6}}));
  assert.match(html, /Ngày 3\/6/);
  assert.match(html, /giai đoạn 2\/5/);
  assert.match(html, /plot grown/);
  assert.match(html, /plot current/);
});

test('arena board shows the boss health bar and the own hero stats', () => {
  const html = mode.student(board('arena', {class: 'mage', hp: 800, mp: 300, damage: 600, items: ['shield']}, {arena: {boss: {hp: 6000, max: 9000}}}));
  assert.match(html, /Đấu trường RPG/);
  assert.match(html, /Trùm còn 6000\/9000 máu/);
  assert.match(html, /Lớp nhân vật: Pháp sư/);
  assert.match(html, /Vật phẩm: shield/);
});

test('arena offers the four character classes only before the learner has chosen one', () => {
  const open = mode.student(board('arena', {class: 'warrior', classChosen: false}, {arena: {boss: {hp: 100, max: 9000}, classes: ['warrior', 'mage', 'archer', 'tank']}}));
  assert.match(open, /Chọn lớp nhân vật/);
  for (const name of ['Chiến binh', 'Pháp sư', 'Cung thủ', 'Tank']) assert.ok(open.includes(name), name);
  assert.match(open, /data-mode-class="tank"/);

  const chosen = mode.student(board('arena', {class: 'tank', classChosen: true}, {arena: {boss: {hp: 100, max: 9000}}}));
  assert.doesNotMatch(chosen, /Chọn lớp nhân vật/);
  assert.match(chosen, /Lớp nhân vật: Tank/);
});

test('no new game board leaks an answer, solution or hidden field', () => {
  const boards = [
    board('speedway', {distance: 1}, {track: {length: 20}}),
    board('bellring', {ring: 1}),
    board('bomb', {cut: 1}, {bomb: {wires: 4, cut: 1}}),
    board('farm', {stage: 1}, {farm: {labels: ['Hạt', 'Mầm', 'Cây non', 'Ra hoa', 'Kết quả']}}),
    board('arena', {hp: 100}, {arena: {boss: {hp: 100, max: 9000}}})
  ];
  for (const b of boards) {
    const html = mode.student(b);
    assert.doesNotMatch(html, /expected|solution|answerKey/, b.rule);
  }
});

test('the new game boards ship dedicated CSS with large touch targets', () => {
  const css = readFileSync(new URL('../public/mode-classroom.css', import.meta.url), 'utf8');
  for (const selector of ['.game-board', '.lane-car', '.wire', '.plot', '.boss-bar']) assert.ok(css.includes(selector), selector);
  assert.match(css, /min-height:\s*64px/);
});
