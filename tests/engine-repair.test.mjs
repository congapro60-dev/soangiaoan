import test from 'node:test';
import assert from 'node:assert/strict';
import {assignParticipants, addLateParticipant, factionCounts} from '../lib/game-modes.js';
import {createArena, arenaAction, awardArena, returnMarker} from '../lib/arena.js';
import {stationLogic} from '../lib/station-logic.js';
import {checkPuzzle} from '../lib/challenges.js';

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

for (const participation of ['pairs', 'group', 'individual']) test(`late ${participation} preserves the roster and balances factions`, () => {
  const prior = freeze(assignParticipants(Array.from({length: 25}, (_, i) => `L${i}`), {seed: 4, participation, rule: 'duel'}));
  const snapshot = structuredClone(prior);
  const late = addLateParticipant(prior, 'late');
  const combined = [...prior, late];
  assert.deepEqual(prior, snapshot);
  assert.deepEqual(factionCounts(combined), [7, 7, 6, 6]);
  assert.equal(late.participation, participation);
  assert.equal(late.rule, 'duel');
  if (participation === 'pairs') {
    assert.equal(late.pair, prior.at(-1).pair);
    for (const pair of new Set(combined.map(a => a.pair))) assert.equal(combined.filter(a => a.pair === pair).length, 2);
  } else assert.equal(late.pair, null);
  assert.throws(() => addLateParticipant(prior, prior[0].learnerId), /DUPLICATE_LEARNER/);
  assert.throws(() => addLateParticipant(prior, {id: prior[0].learnerId}), /DUPLICATE_LEARNER/);
  assert.throws(() => addLateParticipant(combined, 'overflow'), /LEARNER_CAPACITY/);
});

test('late pairs fill a singleton before allocating a vacant pair', () => {
  const prior = assignParticipants(['a', 'b', 'c', 'd'], {participation: 'pairs'});
  const singleton = prior.slice(1);
  assert.equal(addLateParticipant(singleton, 'e').pair, prior[0].pair);
  assert.equal(addLateParticipant(prior, 'e').pair, 2);
});

test('arena actions are immutable, stun expires, guard blocks, and attacks cool down', () => {
  const original = freeze(createArena(['a', 'b', 'c'], 4));
  const attacked = arenaAction(original, {player: 'a', action: 'stun', target: 'b', now: 0}).state;
  assert.equal(original.players.b.stunnedUntil, 0);
  assert.equal(original.startedAt, null);
  assert.equal(attacked.players.b.stunnedUntil, 3000);
  freeze(attacked);
  for (const action of ['answer', 'guard', 'assist', 'stun']) assert.equal(arenaAction(attacked, {player: 'b', action, target: 'a', now: 2999}).code, 'STUNNED');
  assert.equal(arenaAction(attacked, {player: 'a', action: 'stun', target: 'c', now: 4999}).code, 'COOLDOWN');
  const guarded = arenaAction(attacked, {player: 'b', action: 'guard', now: 3000}).state;
  assert.equal(guarded.players.b.shieldUntil, 6000);
  const blocked = arenaAction(freeze(guarded), {player: 'a', action: 'stun', target: 'b', now: 5000}).state;
  assert.equal(blocked.players.b.stunnedUntil, 3000);
  const hit = arenaAction(blocked, {player: 'c', action: 'stun', target: 'b', now: 6000}).state;
  assert.equal(hit.players.b.stunnedUntil, 9000);
  const assisted = arenaAction(freeze(hit), {player: 'a', action: 'assist', target: 'c', now: 6001}).state;
  assert.equal(assisted.players.c.assists, 1);
  assert.equal(hit.players.c.assists, undefined);
  const scored = arenaAction(freeze(assisted), {player: 'b', action: 'answer', correct: true, now: 9000}).state;
  assert.equal(scored.players.b.score, 1);
  const endHit = arenaAction(scored, {player: 'a', action: 'stun', target: 'b', now: 74999}).state;
  assert.equal(endHit.players.b.stunnedUntil, 75000);
  assert.equal(arenaAction(endHit, {player: 'c', action: 'answer', now: 75000}).result, 'timeout');
  assert.equal(returnMarker(endHit, 'b', 'q').temporaryDefeat, false);
  assert(Object.values(endHit.players).every(p => p.status === 'active'));
});

test('arena request ids replay once and reject changed payloads; falsy rewards are once-only', () => {
  const original = createArena(['a', 'b', 'c'], 4);
  assert.equal(original.duration, 75);
  assert.deepEqual(original.bracket, createArena(['a', 'b', 'c'], 4).bracket);
  assert.equal(original.bracket.filter(b => b.bye).length, 1);
  const payload = {player: 'a', action: 'answer', correct: true, now: 0, requestId: 'r'};
  const state = freeze(arenaAction(original, payload).state);
  assert.equal(arenaAction(state, {...payload, now: 100}).replay, true);
  assert.equal(arenaAction(state, {...payload, correct: false}).code, 'REQUEST_ID_CONFLICT');
  assert.equal(arenaAction(state, {...payload, player: 'b'}).code, 'REQUEST_ID_CONFLICT');
  assert.equal(state.players.a.score, 1);
  assert.equal(original.requests, undefined);
  for (const reward of [0, false, null, {points: 1}]) {
    const awarded = awardArena(state, 'a', reward);
    assert.equal(awardArena(freeze(awarded.state), 'a', 99).replay, true);
    assert.deepEqual(awardArena(awarded.state, 'a', 99).reward, reward);
  }
});

test('all five gate levels have distinct deterministic data and independently valid solutions', () => {
  for (let seed = 0; seed < 30; seed++) for (const station of [0, 2, 4]) {
    const puzzles = Array.from({length: 5}, (_, level) => stationLogic(station, level, seed));
    assert.equal(new Set(puzzles.map(p => JSON.stringify(p.expected))).size, 5, `${station}/${seed}`);
    for (const [level, p] of puzzles.entries()) {
      assert.deepEqual(p, stationLogic(station, level, seed));
      const input = {...p.expected, circuit: '1,0,0,0,0,0,0,0,1'};
      assert(checkPuzzle(p, input));
      for (const key of Object.keys(p.expected)) assert(!checkPuzzle(p, {...input, [key]: 'INVALID'}));
      assert(p.steps.length > 0);
      assert(Object.keys(p.expected).every(key => p.fields.some(f => f.key === key)));
      if (station === 0) {
        const cabinet = ['A', 'B', 'C'][(level + seed % 3) % 3];
        assert.equal(p.expected.cabinet, cabinet);
        assert.equal(p.expected.digit, level === 0 ? 8 : level === 1 ? 9 : level === 2 ? [5, 7, 9][seed % 3] : level === 3 ? 4 + seed % 3 : 2 + seed % 3);
        assert(p.steps.at(-1).includes(String(p.expected.digit)));
      }
      if (station === 2) {
        assert.equal(p.widget.kind, 'pipes');
        assert.equal(p.digit, [0, 3, 4, 5, 8].reduce((sum, i) => sum + p.widget.labels[i], 0) % 10);
        assert(!checkPuzzle(p, {...input, circuit: '0,0,0,0,0,0,0,0,0'}));
        if (level > 0) {
          const T = [5, 7, 9, 11, 13][level] + seed % 3;
          const k = [2, 2, 3, 3, 4][level];
          const budget = T + (k - 1) * [2, 3, 4, 6, 7][level];
          const feasible = Array.from({length: T - 1}, (_, i) => i + 1).filter(x => k * x + T - x <= budget && (level < 2 || 2 * x - T <= [99, 99, 2, 3, 2][level]) && T - x >= (level >= 3 ? 3 : 1));
          assert.equal(p.expected.x, Math.max(...feasible));
          assert.equal(p.expected.y, T - p.expected.x);
          assert.equal(p.expected.power, k * p.expected.x + p.expected.y);
          assert.equal(p.expected.rejected, p.expected.power + k - 1);
        }
      }
      if (station === 4) {
        const n = p.expected.channel, divisor = n === 37 ? 5 : 3;
        assert.equal(p.expected.excluded, n - 2);
        assert.equal((n - 2) % divisor, 0);
        assert.notEqual(n % divisor, 0);
        assert.equal(p.expected.connected, 1);
      }
    }
  }
});
