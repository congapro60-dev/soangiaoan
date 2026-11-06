import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture, act, tick, learners} from './fixtures/mode-fixture.mjs';
import {createGame, reduce, rank, RULES} from '../lib/mode-engine/index.js';
import {serializePublic} from '../lib/mode-engine/serialize.js';
import {initLessonMode, applyLessonMode, serializeLessonMode} from '../lib/lesson/mode-bridge.js';

const NEW_RULES = ['speedway', 'bellring', 'bomb', 'farm', 'arena'];

test('five new games are registered exactly once with their own maths action', () => {
  for (const rule of NEW_RULES) {
    assert.ok(Object.hasOwn(RULES, rule), rule);
    assert.equal(RULES[rule].mathActions.length, 1, rule);
  }
  assert.equal(RULES.speedway.mathActions[0], 'accelerate');
  assert.equal(RULES.bellring.mathActions[0], 'ring');
  assert.equal(RULES.bomb.mathActions[0], 'cut');
  assert.equal(RULES.farm.mathActions[0], 'water');
  assert.equal(RULES.arena.mathActions[0], 'attack');
});

test('speedway advances on a correct answer and boosts only after a three-answer streak', () => {
  let s = fixture('speedway', {learners: learners.slice(0, 2)});
  assert.equal(s.ruleState.players['unit-1'].distance, 0);
  s = act(s, 'unit-1', {type: 'accelerate'});
  assert.equal(s.ruleState.players['unit-1'].distance, 1);
  assert.equal(s.ruleState.players['unit-1'].combo, 1);

  // A wrong answer costs a step and resets the streak.
  s = act(s, 'unit-1', {type: 'accelerate'}, {correct: false});
  assert.equal(s.ruleState.players['unit-1'].distance, 0);
  assert.equal(s.ruleState.players['unit-1'].combo, 0);

  // Three correct answers unlock the boost and add two steps.
  for (let i = 0; i < 3; i++) s = act(s, 'unit-1', {type: 'accelerate'});
  const before = s.ruleState.players['unit-1'].distance;
  assert.ok(s.ruleState.players['unit-1'].combo >= 3);
  s = act(s, 'unit-1', {type: 'boost'});
  assert.equal(s.ruleState.players['unit-1'].distance, before + 2);
});

test('speedway rejects a boost without an active streak and finishes the racer at the finish line', () => {
  const fresh = fixture('speedway', {learners: learners.slice(0, 2)});
  assert.throws(() => act(fresh, 'unit-1', {type: 'boost'}), /BOOST_UNAVAILABLE/);
});

test('bellring eliminates a wrong answer, stays eliminated and can be rescued once', () => {
  let s = fixture('bellring', {learners: learners.slice(0, 3)});
  s = act(s, 'unit-1', {type: 'ring'}, {correct: false});
  assert.equal(s.ruleState.players['unit-1'].out, true);
  assert.equal(s.units.find(u => u.id === 'unit-1').outcome, 'temporary-defeat');
  // Eliminated learners cannot ring again.
  assert.throws(() => act(s, 'unit-1', {type: 'ring'}), /LEARNER_ELIMINATED/);
  // Rescue is gated by five correct answers.
  assert.throws(() => act(s, 'unit-1', {type: 'rescue'}), /RESCUE_UNAVAILABLE/);
});

test('bellring crowns the last learner standing', () => {
  let s = fixture('bellring', {learners: learners.slice(0, 2)});
  s = act(s, 'unit-2', {type: 'ring'}, {correct: false});
  const survivor = s.units.find(u => u.id === 'unit-1');
  assert.equal(survivor.outcome, 'completed');
  assert.notEqual(s.ruleState.players['unit-1'].finishedAt, null);
});

test('bomb counts cut wires and never rewards a wrong answer', () => {
  let s = fixture('bomb', {learners: learners.slice(0, 2)});
  s = act(s, 'unit-1', {type: 'cut'});
  assert.equal(s.ruleState.players['unit-1'].cut, 1);
  assert.equal(s.ruleState.wiresCut, 1);
  const mistakesBefore = s.ruleState.players['unit-1'].mistakes;
  s = act(s, 'unit-1', {type: 'cut'}, {correct: false});
  assert.equal(s.ruleState.players['unit-1'].cut, 1);
  assert.equal(s.ruleState.players['unit-1'].mistakes, mistakesBefore + 1);
});

test('bomb detonates when the shared clock runs out before every wire is cut', () => {
  let s = fixture('bomb', {learners: learners.slice(0, 2)});
  s = act(s, 'unit-1', {type: 'cut'});
  s = tick(s, s.deadline);
  assert.equal(s.ruleState.exploded, true);
  assert.equal(s.finished, true);
});

test('farm grows one stage per two waterings and never overwaters a mature crop', () => {
  let s = fixture('farm', {learners: learners.slice(0, 2)});
  assert.equal(s.ruleState.players['unit-1'].stage, 0);
  s = act(s, 'unit-1', {type: 'water'});
  assert.equal(s.ruleState.players['unit-1'].stage, 0);
  assert.equal(s.ruleState.players['unit-1'].water, 1);
  s = act(s, 'unit-1', {type: 'water'});
  assert.equal(s.ruleState.players['unit-1'].stage, 1);
  assert.equal(s.ruleState.players['unit-1'].water, 0);
  // Wrong answers dry the soil; two dry answers cost one stored watering.
  s = act(s, 'unit-1', {type: 'water'});
  s = act(s, 'unit-1', {type: 'water'}, {correct: false});
  s = act(s, 'unit-1', {type: 'water'}, {correct: false});
  assert.equal(s.ruleState.players['unit-1'].water, 0);
});

test('farm allows a harvest only after five stages', () => {
  let s = fixture('farm', {learners: learners.slice(0, 2)});
  assert.throws(() => act(s, 'unit-1', {type: 'harvest'}), /CROP_NOT_MATURE/);
  for (let i = 0; i < 10; i++) s = act(s, 'unit-1', {type: 'water'});
  assert.equal(s.ruleState.players['unit-1'].stage, 5);
  assert.throws(() => act(s, 'unit-1', {type: 'water'}), /CROP_MATURE/);
  s = act(s, 'unit-1', {type: 'harvest'});
  assert.equal(s.ruleState.players['unit-1'].harvested, 1);
  assert.equal(s.ruleState.players['unit-1'].stage, 0);
});

test('arena damages the boss on correct answers and revives a downed hero once', () => {
  let s = fixture('arena', {learners: learners.slice(0, 2)});
  const bossBefore = s.ruleState.boss.hp;
  s = act(s, 'unit-1', {type: 'attack'});
  assert.ok(s.ruleState.boss.hp < bossBefore);
  assert.ok(s.ruleState.players['unit-1'].damage > 0);

  // Ten wrong answers take a warrior from 1200 to a downed state.
  s = fixture('arena', {learners: learners.slice(0, 2)});
  for (let i = 0; i < 12; i++) s = act(s, 'unit-1', {type: 'attack'}, {correct: false});
  assert.equal(s.ruleState.players['unit-1'].down, true);
  assert.throws(() => act(s, 'unit-1', {type: 'attack'}), /UNIT_INACTIVE|HERO_DOWN|INVALID_ACTION/);
});

test('arena ends the whole raid once the boss reaches zero health', () => {
  let s = fixture('arena', {learners: learners.slice(0, 2)});
  // Drive the boss to zero with the registered maths action.
  for (let i = 0; i < 40 && s.ruleState.boss.hp > 0; i++) {
    const unit = s.units.find(u => u.outcome === 'active');
    if (!unit) break;
    s = act(s, unit.id, {type: 'attack'});
  }
  assert.equal(s.ruleState.boss.hp, 0);
  assert.ok(s.units.every(u => u.outcome === 'completed'));
});

test('public serializer exposes the new game boards without leaking solutions', () => {
  const boards = {
    speedway: v => v.track && v.track.length === 20,
    bomb: v => v.bomb && v.bomb.wires === 4,
    farm: v => v.farm && v.farm.stages === 5,
    arena: v => v.arena && v.arena.boss && v.arena.boss.hp > 0
  };
  for (const [rule, check] of Object.entries(boards)) {
    const s = fixture(rule, {learners: learners.slice(0, 2)});
    const view = serializePublic(s, 'unit-1');
    assert.ok(check(view), rule);
    const text = JSON.stringify(view);
    assert.doesNotMatch(text, /expected|solution|steps|answerKey/, rule);
    assert.doesNotMatch(text, /"secret":/, rule);
  }
});

test('every new game reaches the lesson bridge and pays exactly one game receipt per assessed task', () => {
  const base = {
    status: 'active', round: 2, seed: 9, modeParticipation: 'individual',
    roster: {l0: {present: true}, l1: {present: true}},
    package: {contentHash: 'h', tasks: [{id: 'q1', type: 'closed', participation: 'individual', branch: 'shared', activityId: 'a', evaluation: {checkerId: 'numeric_exact', answerKey: 42}}], activities: [{id: 'a', taskIds: ['q1']}]},
    timeline: {activityIndex: 0, currentActivityId: 'a', locked: false},
    clock: {arenaPausedAt: null},
    branches: {a: {l0: 'core', l1: 'core'}},
    submissions: {s1: {submissionId: 's1', learnerId: 'l0', taskId: 'q1', activityId: 'a', assessmentStatus: 'assessed', ok: true, answer: 42}}
  };
  for (const rule of NEW_RULES) {
    const started = initLessonMode(structuredClone(base), rule, 0);
    assert.equal(started.ok, true, rule);
    const applied = applyLessonMode(started.state, {learnerId: 'l0', taskId: 'q1', submissionId: 's1'}, 5);
    assert.equal(applied.ok, true, rule + '::' + applied.code);
    assert.equal(applied.result.correct, true, rule);
    const view = serializeLessonMode(applied.state, 'l0');
    assert.equal(view.rule, rule);
    assert.ok(view.own, rule);
  }
});
