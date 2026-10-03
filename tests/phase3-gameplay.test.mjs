import test from 'node:test';
import assert from 'node:assert/strict';
import {assignParticipants, factionCounts, addLateParticipant, markLeaver} from '../lib/game-modes.js';
import {createRecovery, setDraft, downgradeQuestion, abandon, requestTeacherHelp, applyPenalty, composePause} from '../lib/recovery.js';
import {createEvent, acceptEvent, rewardOnce, fingerprint} from '../lib/room-events.js';
import {createArena, arenaAction, awardArena, returnMarker} from '../lib/arena.js';

test('mode assignment is deterministic, capped, paired and faction-balanced', () => { const a = assignParticipants(Array.from({length: 26}, (_, i) => `L${i}`), {seed: 4, participation: 'pairs', rule: 'duel'}); assert.deepEqual(a, assignParticipants(Array.from({length: 26}, (_, i) => `L${i}`), {seed: 4, participation: 'pairs', rule: 'duel'})); assert.deepEqual(factionCounts(a), [7, 7, 6, 6]); assert.equal(a[0].pair, a[1].pair); assert.equal(addLateParticipant(a.slice(0, 25), 'late', {seed: 4, participation: 'pairs', rule: 'duel'}).learnerId, 'late'); assert.equal(markLeaver(a, 'L0').find(x => x.learnerId === 'L0').outcome, 'abandoned'); });
test('recovery revisions invalidate drafts and protect gates/penalties', () => { let s = createRecovery({participant: 'p', round: 1}); s = setDraft(s, 'x'); s = downgradeQuestion(s); assert.equal(s.questionRevision, 1); assert.throws(() => setDraft(s, 'old', 0), /DRAFT_REVISION_MISMATCH/); assert.throws(() => abandon(s, 'start'), /GUIDED_GATE_REQUIRED/); assert.equal(applyPenalty(applyPenalty(applyPenalty(applyPenalty(s)))).penalty, 3); assert.equal(requestTeacherHelp(s).state, 'teacher-help'); });
test('events replay by hash, conflict by id, expire by deadline, reward once', () => { const c = new Map(); const e = createEvent({requestId: 'r', type: 'answer', payload: {answer: 2}, round: 1, revision: 2, deadline: 10, now: 0}); assert.equal(acceptEvent(c, e, 1).ok, true); assert.equal(acceptEvent(c, e, 1).replay, true); assert.equal(acceptEvent(c, {...e, payload: {answer: 3}}, 1).code, 'REQUEST_ID_CONFLICT'); assert.equal(acceptEvent(new Map(), e, 11).code, 'DEADLINE_EXPIRED'); const rewards = new Map(); assert.equal(rewardOnce(rewards, 'x', 5).reward, 5); assert.equal(rewardOnce(rewards, 'x', 6).replay, true); });
test('arena is 75 seconds, supports actions, timeout and reward replay without elimination', () => { let a = createArena(['a', 'b', 'c'], 9); assert.equal(a.duration, 75); a = arenaAction(a, {player: 'a', action: 'answer', correct: true, now: 0}).state; a = arenaAction(a, {player: 'a', action: 'stun', target: 'b', now: 100}).state; assert.equal(a.players.b.stunnedUntil, 3100); assert.equal(arenaAction(a, {player: 'a', action: 'answer', now: 75000}).result, 'timeout'); const one = awardArena(a, 'a', {points: 1}); assert.equal(awardArena(one.state, 'a', {points: 2}).replay, true); assert.equal(returnMarker(a, 'a', 'q1').temporaryDefeat, false); });

test('fingerprint canonicalizes nested objects recursively, preserves array order, and standardizes null/undefined', () => {
  // Nested changes change fingerprint
  assert.notEqual(fingerprint({a: {b: 1}}), fingerprint({a: {b: 2}}));
  const cache = new Map();
  const event = createEvent({requestId: 'nested', type: 'answer', payload: {answer: {value: 1, steps: [2, 3]}}});
  assert.equal(acceptEvent(cache, event).replay, false);
  assert.equal(acceptEvent(cache, {...event, payload: {answer: {steps: [2, 3], value: 1}}}).replay, true);
  assert.equal(acceptEvent(cache, {...event, payload: {answer: {value: 2, steps: [2, 3]}}}).code, 'REQUEST_ID_CONFLICT');
  assert.equal(acceptEvent(cache, {...event, payload: {answer: {value: 1, steps: [3, 2]}}}).code, 'REQUEST_ID_CONFLICT');
  assert.notEqual(fingerprint(JSON.parse('{"__proto__":{"value":1}}')), fingerprint(JSON.parse('{"__proto__":{"value":2}}')));

  // Reordered keys at any depth produce identical fingerprints
  assert.equal(fingerprint({b: 2, a: 1}), fingerprint({a: 1, b: 2}));
  assert.equal(fingerprint({outer: {z: 1, y: 2}}), fingerprint({outer: {y: 2, z: 1}}));
  assert.equal(fingerprint({a: 1, b: {d: 4, c: 3}}), '{"a":1,"b":{"c":3,"d":4}}');

  // Array order is preserved, but nested objects within arrays are canonicalized
  assert.notEqual(fingerprint([1, 2]), fingerprint([2, 1]));
  assert.equal(fingerprint([1, 2]), '[1,2]');
  assert.equal(fingerprint([{b: 2, a: 1}, {d: 4, c: 3}]), '[{"a":1,"b":2},{"c":3,"d":4}]');

  // Null and undefined handling: top-level undefined explicit, object undefined omitted, null preserved
  assert.equal(fingerprint(undefined), undefined);
  assert.equal(fingerprint(null), 'null');
  assert.equal(fingerprint([undefined, null]), '[null,null]');
  assert.equal(fingerprint({a: undefined, b: 1}), '{"b":1}');
  assert.equal(fingerprint({a: undefined, b: 1}), fingerprint({b: 1}));
  assert.equal(fingerprint({a: null, b: 1}), '{"a":null,"b":1}');
  assert.notEqual(fingerprint({a: null, b: 1}), fingerprint({b: 1}));
  assert.notEqual(fingerprint({a: null, b: 1}), fingerprint({a: undefined, b: 1}));
});

test('arena bracket is deterministic for same seed, shuffled for different seeds, and preserves large roster', () => {
  const roster26 = Array.from({length: 26}, (_, i) => `player_${String(i).padStart(2, '0')}`);
  const arena1 = createArena(roster26, 42);
  const arena1Same = createArena(roster26, 42);
  const arena2 = createArena(roster26, 99);

  // Same seed is deterministic
  assert.deepEqual(arena1.bracket, arena1Same.bracket);
  assert.deepEqual(arena1.players, arena1Same.players);

  // Different seed produces different bracket permutation on 26-player roster
  assert.notDeepEqual(arena1.bracket, arena2.bracket);

  // Participant preservation across bracket and player map
  const bracketParticipants1 = arena1.bracket.flatMap(b => b.right ? [b.left, b.right] : [b.left]);
  assert.equal(bracketParticipants1.length, 26);
  assert.deepEqual(bracketParticipants1.slice().sort(), roster26.slice().sort());
  assert.deepEqual(Object.keys(arena1.players).sort(), roster26.slice().sort());

  // Odd roster preserves all participants and marks bye
  const roster25 = roster26.slice(0, 25);
  const oddArena = createArena(roster25, 42);
  const bracketParticipantsOdd = oddArena.bracket.flatMap(b => b.right ? [b.left, b.right] : [b.left]);
  assert.equal(bracketParticipantsOdd.length, 25);
  assert.deepEqual(bracketParticipantsOdd.slice().sort(), roster25.slice().sort());
  assert.equal(oddArena.bracket.at(-1).bye, true);
  assert.equal(oddArena.bracket.at(-1).right, null);
});

test('composePause enforces additive invariant and immutability across repeated compositions', () => {
  const s0 = createRecovery({participant: 'p1', round: 1});
  const snapshotPause = {...s0.pause};

  // Immutability: state and pause are not mutated
  const s1 = composePause(s0, {numerator: 1, denominator: 4});
  assert.deepEqual(s0.pause, snapshotPause);
  assert.notEqual(s0, s1);
  assert.notEqual(s0.pause, s1.pause);
  assert.deepEqual(s1.pause, {numerator: 1, denominator: 4});

  // Repeated composition adds fractions canonically in lowest terms
  const s2 = composePause(s1, {numerator: 1, denominator: 4});
  assert.deepEqual(s2.pause, {numerator: 1, denominator: 2}); // 1/4 + 1/4 = 2/4 = 1/2
  const s3 = composePause(s2, {numerator: 1, denominator: 2});
  assert.deepEqual(s3.pause, {numerator: 1, denominator: 1}); // 1/2 + 1/2 = 1/1

  // Additive duration composition via openedAt/resumeAt
  const s4 = composePause(s3, {openedAt: 1000, resumeAt: 2500}); // duration 1500
  assert.equal(s4.pause.duration, 1500);
  assert.equal(s4.pause.numerator, 1501); // 1/1 + 1500/1 = 1501/1
  assert.equal(s4.pause.denominator, 1);

  const s5 = composePause(s4, {openedAt: 3000, resumeAt: 3500}); // duration 500
  assert.equal(s5.pause.duration, 2000); // 1500 + 500 = 2000
  assert.equal(s5.pause.numerator, 2001); // 1501 + 500 = 2001/1
  assert.equal(s5.pause.denominator, 1);
});
