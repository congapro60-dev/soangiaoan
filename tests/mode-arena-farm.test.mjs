import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture, act, tick, learners} from './fixtures/mode-fixture.mjs';
import {constants as arenaConstants} from '../lib/mode-engine/rules/arena.js';
import {constants as farmConstants} from '../lib/mode-engine/rules/farm.js';

test('arena starts every hero as an unchosen warrior until the learner picks a class', () => {
  const s = fixture('arena', {learners: learners.slice(0, 2)});
  const p = s.ruleState.players['unit-1'];
  assert.equal(p.class, 'warrior');
  assert.equal(p.classChosen, false);
});

test('choosing a class resets hp and mp to that class and cannot be repeated', () => {
  let s = fixture('arena', {learners: learners.slice(0, 2)});
  s = act(s, 'unit-1', {type: 'chooseClass', class: 'mage'});
  const p = s.ruleState.players['unit-1'];
  assert.equal(p.class, 'mage');
  assert.equal(p.classChosen, true);
  assert.equal(p.hp, arenaConstants.classes.mage.hp);
  assert.equal(p.mp, arenaConstants.classes.mage.mp);
  assert.throws(() => act(s, 'unit-1', {type: 'chooseClass', class: 'tank'}), /CLASS_ALREADY_CHOSEN/);
});

test('arena rejects an unknown class name', () => {
  const s = fixture('arena', {learners: learners.slice(0, 2)});
  assert.throws(() => act(s, 'unit-1', {type: 'chooseClass', class: 'dragon'}), /INVALID_CLASS/);
});

test('each class lands a different amount of damage on the boss', () => {
  const damage = {};
  for (const cls of ['warrior', 'mage', 'archer', 'tank']) {
    let s = fixture('arena', {learners: learners.slice(0, 2)});
    s = act(s, 'unit-1', {type: 'chooseClass', class: cls});
    s = act(s, 'unit-1', {type: 'attack'});
    damage[cls] = s.ruleState.players['unit-1'].damage;
  }
  assert.ok(damage.mage > damage.warrior, 'mage hits harder than warrior');
  assert.ok(damage.warrior > damage.tank, 'warrior hits harder than tank');
  assert.ok(damage.archer > damage.tank, 'archer hits harder than tank');
});

test('the tank survives more wrong answers than the mage', () => {
  const hpLeft = cls => {
    let s = fixture('arena', {learners: learners.slice(0, 2)});
    s = act(s, 'unit-1', {type: 'chooseClass', class: cls});
    for (let i = 0; i < 4; i++) s = act(s, 'unit-1', {type: 'attack'}, {correct: false});
    return s.ruleState.players['unit-1'].hp;
  };
  assert.ok(hpLeft('tank') > hpLeft('mage'));
});

test('farm derives the season day from the trusted game clock', () => {
  let s = fixture('farm', {learners: learners.slice(0, 2)});
  assert.equal(s.ruleState.day, 0);
  s = tick(s, farmConstants.dayMs * 2);
  assert.equal(s.ruleState.day, 2);
});

test('skipping whole days costs stored water and two dry days wilt one stage', () => {
  let s = fixture('farm', {learners: learners.slice(0, 2)});
  // Water enough to reach stage 2 with one spare watering left over.
  for (let i = 0; i < 5; i++) s = act(s, 'unit-1', {type: 'water'});
  const before = s.ruleState.players['unit-1'];
  assert.equal(before.stage, 2);
  assert.equal(before.water, 1);
  // The crop was watered on day 0. Skipping day 1 loses the spare watering.
  s = tick(s, farmConstants.dayMs * 2);
  const oneDay = s.ruleState.players['unit-1'];
  assert.equal(oneDay.dryDays, 1);
  assert.equal(oneDay.water, 0, 'stored watering lost');
  assert.equal(oneDay.stage, 2, 'one dry day does not wilt the crop');
  // Skipping a second day in a row wilts the crop by one stage.
  s = tick(s, farmConstants.dayMs * 3);
  const twoDays = s.ruleState.players['unit-1'];
  assert.equal(twoDays.dryDays, 2);
  assert.equal(twoDays.stage, 1, 'crop wilted one stage');
});

test('watering on the current day protects the crop from the wilt penalty', () => {
  let s = fixture('farm', {learners: learners.slice(0, 2)});
  for (let i = 0; i < 4; i++) s = act(s, 'unit-1', {type: 'water'});
  const stage = s.ruleState.players['unit-1'].stage;
  // Learner waters again inside the next day.
  s = tick(s, farmConstants.dayMs);
  s = act(s, 'unit-1', {type: 'water'});
  s = tick(s, farmConstants.dayMs * 2);
  assert.ok(s.ruleState.players['unit-1'].stage >= stage - 1, 'one day of water softens the wilt');
});

test('the season closes once the declared number of days has elapsed', () => {
  let s = fixture('farm', {learners: learners.slice(0, 2)});
  s = tick(s, farmConstants.dayMs * farmConstants.seasonDays);
  assert.equal(s.ruleState.day, farmConstants.seasonDays);
  assert.equal(s.finished, true);
});
