import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture, learners, act, tick} from './fixtures/mode-fixture.mjs';
import {createGame, reduce, rank, RULES, gameClock} from '../lib/mode-engine/index.js';
import {CLASSROOM, createRoster, addLate, leave, closeCommunity, hash} from '../lib/mode-engine/roster.js';
import {serializePublic, serializeHost} from '../lib/mode-engine/serialize.js';
import {initRace, roll, finishStation, compareTeams} from '../lib/race.js';
import {TOPICS, MATH_POINTS, numericAnswer} from '../lib/campaign.js';
import {contextQuestion, checkContext} from '../lib/context-questions.js';
import {issueChallenge, verifyChallenge, publicChallenge} from '../lib/mode-engine/challenge.js';
import {factionCounts} from '../lib/mode-engine/roster.js';
import {challenge as legacyPuzzle} from '../lib/challenges.js';

function frozen(value) { if (value && typeof value === 'object') { Object.freeze(value); for (const v of Object.values(value)) frozen(v); } return value; }
const small = learners.slice(0, 4);

test('public mode challenge keeps action state but never leaks answer or steps', () => {
  const q = issueChallenge({seed: 4, serial: 1, unitId: 'unit-1', action: {type: 'earn'}, gameNow: 0, curriculum: {plan: [{topic: 'sets', level: 0, category: 'practice', format: 'short'}]}});
  const view = publicChallenge(q);
  assert.deepEqual(view.action, {type: 'earn'});
  assert.equal(view.used, false);
  assert.equal('answer' in view, false);
  assert.equal('steps' in view, false);
});

test('student mode view keeps other learner names private while host view retains roster', () => {
  const state = fixture('duel', {participation: 'individual'});
  const studentView = serializePublic(state, 'unit-1');
  const hostView = serializeHost(state, 'unit-1');
  assert.ok(studentView.units.find(u => u.id === 'unit-1').members);
  assert.ok(studentView.units.filter(u => u.id !== 'unit-1').every(u => !u.members && Number.isInteger(u.memberCount)));
  assert.ok(hostView.units.every(u => Array.isArray(u.members)));
});

test('curriculum matrix uses selected grades/topics/contexts, all five levels and three canonical formats', () => {
  for (const grade of [10, 11, 12, 0]) for (const level of [0, 1, 2, 3, 4]) for (const format of ['short', 'mcq', 'tf']) {
    const topics = TOPICS.filter(t => !grade || t.grade === grade).map(t => t.id);
    const s = fixture('merchant', {curriculum: {grade, topics, minLevel: level, maxLevel: level, categories: ['digital'], formats: [format]}});
    const issued = reduce(s, {type: 'issue', requestId: 'matrix', round: 1, unitId: 'unit-1', action: {type: 'earn'}}, {gameNow: 0}).state;
    const q = issued.challenges[issued.activeChallenges['unit-1']];
    assert.ok(topics.includes(q.topic));
    assert.equal(q.category, 'digital'); assert.equal(q.level, level); assert.equal(q.format, format);
    assert.equal(q.points, MATH_POINTS[level]); assert.doesNotMatch(q.prompt, /^Solve /);
    assert.ok(s.curriculum.plan.some(p => p.topic === q.topic && p.level === q.level && p.format === q.format));
    assert.equal(checkContext(q, q.answer) ?? numericAnswer(q.answer, q.answer), true);
    const submission = {type: 'progress', requestId: 'submit', round: 1, unitId: 'unit-1', action: {type: 'earn'}, challengeId: q.id, answer: q.answer};
    assert.equal(reduce(issued, submission, {gameNow: 1}).result.correct, true);
    for (const answer of ['', '__wrong__', false, [], {}, format === 'short' ? q.answer + 10 : format === 'mcq' ? String((Number(q.answer) + 1) % 4) : 'DDDD']) {
      assert.equal(reduce(issued, {...submission, answer}, {gameNow: 1}).result.correct, false);
    }
    for (const injected of [{correct: true}, {expected: q.answer}]) assert.throws(() => reduce(issued, {...submission, ...injected}, {gameNow: 1}), /UNTRUSTED_SOLUTION/);
    const view = serializePublic(issued, 'unit-1').challenge;
    assert.equal(view.topic, q.topic); assert.equal(view.points, q.points);
    assert.deepEqual(view.options, q.options); assert.deepEqual(view.statements, q.statements);
    assert.doesNotMatch(JSON.stringify(view), /"(?:answer|expected|steps|seed)":/);
  }
  assert.equal(fixture('merchant').curriculum.grade, 10);
  for (const curriculum of [{grade: 9}, {grade: 10, topics: ['integral']}, {topics: []}, {topics: 'sets'}, {formats: ['number']}, {categories: ['invalid']}, {minLevel: -1}, {maxLevel: 5}, {minLevel: 4, maxLevel: 1}, {expected: 1}, {plan: []}]) assert.throws(() => fixture('merchant', {curriculum}));
});

test('all selected topics and contexts delegate exactly to existing contextual templates', () => {
  for (const topic of TOPICS) for (const category of ['practice', 'real', 'theory', 'history', 'digital', 'global', 'culture', 'wellbeing']) {
    const s = fixture('merchant', {curriculum: {grade: topic.grade, topics: [topic.id], categories: [category], minLevel: 4, maxLevel: 4}});
    const q = issueChallenge({seed: 173, serial: 1, unitId: 'unit-1', action: {type: 'earn'}, gameNow: 0, curriculum: s.curriculum});
    assert.equal(q.topic, topic.id); assert.equal(q.category, category); assert.equal(q.level, 4);
    const expected = contextQuestion(s.curriculum.plan[0], hash('173:1:unit-1::1'));
    assert.equal(q.prompt, expected.question); assert.equal(q.answer, expected.answer);
  }
});

test('duel shares complete format metadata independent of submission order; legacy bonus formats verify canonically', () => {
  for (const format of ['short', 'mcq', 'tf']) {
    let s = fixture('duel', {learners: small, curriculum: {grade: 12, topics: ['conditional'], formats: [format], categories: ['global'], minLevel: 4, maxLevel: 4}});
    for (const id of ['unit-2', 'unit-1']) s = reduce(s, {type: 'issue', requestId: id, unitId: id, round: 1, action: {type: 'answer'}}, {gameNow: 0}).state;
    const [a, b] = Object.values(s.challenges);
    for (const key of ['prompt', 'answer', 'steps', 'options', 'statements', 'topic', 'category', 'level', 'points', 'format']) assert.deepEqual(a[key], b[key]);
    const legacy = fixture('campaign', {learners: small});
    const team = structuredClone(legacy.ruleState.players['unit-1']);
    team.race.bonus = contextQuestion({topic: 'probability10', category: 'real', level: 2, format}, 12);
    s = fixture('campaign', {learners: small, legacyTeams: {'unit-1': team}});
    s = act(s, 'unit-1', {type: 'bonus'});
    assert.equal(s.ruleState.players['unit-1'].race.bonus.done, true);
    assert.equal(team.race.bonus.done, false);
  }
  const s = fixture('merchant', {curriculum: {topics: ['probability10']}});
  const q = issueChallenge({seed: 1, serial: 1, unitId: 'u', action: {type: 'earn'}, gameNow: 0, curriculum: s.curriculum,
    legacyQuestion: {question: 'Q', format: 'short', answer: 0.5}});
  assert.equal(verifyChallenge(q, {unitId: 'u', action: {type: 'earn'}, answer: '1/2', gameNow: 1, round: 1, context: ''}), true);
});

test('factions count learner membership, preserve indivisible units and honor validated host overrides', () => {
  assert.deepEqual(factionCounts(createRoster(learners).units), [7, 7, 6, 6]);
  assert.deepEqual(factionCounts(createRoster(learners, {participation: 'pairs'}).units), [8, 6, 6, 6]);
  assert.deepEqual(factionCounts(createRoster(learners, {participation: 'group'}).units), [8, 7, 7, 4]);
  const r = createRoster(learners, {participation: 'pairs', factions: {'unit-1': 3, 'unit-2': 3}});
  assert.equal(r.units[0].faction, 3); assert.equal(r.units[1].faction, 3);
  assert.ok(r.units.every(u => u.members.length === 2));
  assert.throws(() => fixture('zones', {factions: {'unit-1': 4}}), /INVALID_FACTIONS/);
  const late = addLate(r, {id: 'late', name: 'Late'});
  assert.deepEqual(late.units.slice(0, r.units.length), r.units);
  const counts = factionCounts(r.units);
  assert.equal(late.units.at(-1).faction, counts.indexOf(Math.min(...counts)));
});

test('persisted campaign puzzles keep canonical fields, digit and puzzle validation without solution leaks', () => {
  const base = fixture('campaign', {learners: small});
  const team = structuredClone(base.ruleState.players['unit-1']);
  team.puzzle = legacyPuzzle(0, 2, team.seed);
  let s = fixture('campaign', {learners: small, legacyTeams: {'unit-1': team}});
  s = reduce(s, {type: 'issue', requestId: 'legacy', round: 1, unitId: 'unit-1', action: {type: 'station'}}, {gameNow: 0}).state;
  const q = s.challenges[s.activeChallenges['unit-1']];
  const event = {type: 'progress', requestId: 'solve', round: 1, unitId: 'unit-1', action: {type: 'station'}, challengeId: q.id, answer: team.puzzle.expected};
  assert.equal(reduce(s, {...event, answer: {}}, {gameNow: 1}).result.correct, false);
  const solved = reduce(s, event, {gameNow: 1}).state;
  assert.equal(solved.ruleState.players['unit-1'].race.outcomes[0].digit, team.puzzle.digit);
  const view = serializePublic(s, 'unit-1').challenge;
  assert.deepEqual(view.fields, team.puzzle.fields);
  assert.doesNotMatch(JSON.stringify(view), /"(?:answer|expected|steps|seed|digit)":/);
});

test('classroom constants, 26 named learners, 13 pairs, balanced factions, stable late/leaver assignments', () => {
  assert.deepEqual(CLASSROOM, {unitCap: 40, learners: 26, pairs: 13, factions: 4, groupSize: 4});
  const roster = createRoster(learners, {seed: 173});
  assert.equal(roster.units.length, 26);
  assert.deepEqual([0, 1, 2, 3].map(f => roster.units.filter(u => u.faction === f).length), [7, 7, 6, 6]);
  assert.deepEqual(roster, createRoster([...learners].reverse(), {seed: 173}));
  const pairs = createRoster(learners, {participation: 'pairs', seed: 173});
  assert.equal(pairs.units.length, 13);
  assert.ok(pairs.units.every(u => u.members.length === 2 && u.members.every(m => m.name)));
  const late = addLate(pairs, {id: 'late', name: 'Late'}, {communityOpened: true});
  assert.deepEqual(late.units.slice(0, 13), pairs.units);
  assert.equal(late.units[13].members.length, 1);
  assert.equal(late.units[13].outcome, 'spectator');
  assert.equal(closeCommunity(late).units[13].outcome, 'active');
  const left = leave(pairs, pairs.units[0].members[0].id);
  assert.equal(left.units[0].members.length, 2);
  assert.equal(left.units[0].members[0].present, false);
  assert.equal(left.units[0].controller, 1);
  assert.deepEqual(left.units.slice(1), pairs.units.slice(1));
  assert.deepEqual(createRoster(learners, {participation: 'group'}).units.map(u => u.members.length), [4, 4, 4, 4, 4, 3, 3]);
  const forty = Array.from({length: 40}, (_, i) => ({id: String(i), name: String(i)}));
  assert.equal(createRoster(forty).units.length, 40);
  assert.throws(() => addLate(createRoster(forty), {id: '41', name: '41'}), /UNIT_CAPACITY/);
  assert.throws(() => createRoster([...forty, {id: '41', name: '41'}]), /UNIT_CAPACITY/);
});

test('duel uses simultaneous questions, current standings re-pair and losers continue', () => {
  let s = fixture('duel', {learners: small});
  for (const id of ['unit-2', 'unit-4']) s = act(s, id, {type: 'answer'}, {gameNow: 1000});
  const questions = Object.values(s.challenges);
  assert.equal(questions[0].prompt, questions[1].prompt);
  s = tick(s, 75000);
  assert.deepEqual(s.ruleState.pairs, [['unit-2', 'unit-4'], ['unit-1', 'unit-3']]);
  assert.ok(s.units.every(u => u.outcome === 'active'));
  s = act(s, 'unit-1', {type: 'answer'}, {gameNow: 76000});
  assert.equal(s.ruleState.players['unit-1'].correct, 1);
  s = tick(s, 375000);
  assert.equal(s.finished, true);
  assert.deepEqual(rank(s).map(r => r.unitId), ['unit-2', 'unit-4', 'unit-1', 'unit-3']);
});

test('zones capture, defense, shared objectives and tick-only control', () => {
  let s = fixture('zones', {learners: small});
  s = act(s, 'unit-3', {type: 'capture', zone: 0});
  assert.equal(s.ruleState.factions[2].control, 0);
  s = act(s, 'unit-3', {type: 'defend', zone: 0});
  s = act(s, 'unit-2', {type: 'capture', zone: 0});
  assert.equal(s.ruleState.zones[0].owner, 2);
  for (let i = 0; i < 3; i++) s = act(s, 'unit-3', {type: 'objective'});
  assert.equal(s.ruleState.factions[2].resources, 8);
  s = tick(s, 120000);
  assert.equal(s.finished, true);
  assert.equal(s.ruleState.factions[2].control, 12);
  assert.deepEqual(rank(s).map(r => r.unitId), ['unit-3', 'unit-2', 'unit-1', 'unit-4']);
});

test('survival shrinks, drains, temporarily defeats and permits recovery/re-entry', () => {
  let s = fixture('survival', {learners: small});
  s = act(s, 'unit-1', {type: 'move', position: 6});
  s = tick(s, 60000);
  assert.equal(s.ruleState.radius, 4);
  assert.equal(s.units[0].outcome, 'temporary-defeat');
  assert.throws(() => act(s, 'unit-1', {type: 'objective'}), /TEMPORARY_DEFEAT/);
  s = act(s, 'unit-1', {type: 'recover'});
  assert.equal(s.units[0].outcome, 'active');
  assert.equal(s.ruleState.players['unit-1'].position, 0);
  s = act(s, 'unit-4', {type: 'objective'});
  s = tick(s, 180000);
  assert.equal(s.finished, true);
  assert.equal(s.units.length, 4);
  assert.deepEqual(rank(s).map(r => r.unitId), ['unit-4', 'unit-2', 'unit-3', 'unit-1']);
});

test('escort needs both repair and fuel, preserves resources for ties', () => {
  let s = fixture('escort', {learners: small});
  s = act(s, 'unit-2', {type: 'advance'});
  s = act(s, 'unit-2', {type: 'advance'});
  assert.throws(() => act(s, 'unit-2', {type: 'advance'}), /CONVOY_BLOCKED/);
  s = act(s, 'unit-2', {type: 'fuel'});
  assert.throws(() => act(s, 'unit-2', {type: 'advance'}), /CONVOY_BLOCKED/);
  for (let i = 0; i < 4; i++) {
    if (!s.ruleState.players['unit-2'].integrity) s = act(s, 'unit-2', {type: 'repair'});
    if (!s.ruleState.players['unit-2'].fuel) s = act(s, 'unit-2', {type: 'fuel'});
    s = act(s, 'unit-2', {type: 'advance'});
  }
  assert.equal(s.units[1].outcome, 'completed');
  s = tick(s, s.deadline);
  assert.deepEqual(rank(s).map(r => r.unitId), ['unit-2', 'unit-1', 'unit-3', 'unit-4']);
});

test('treasure requires clues, branch selection and valid complete sets', () => {
  let s = fixture('treasure', {learners: small});
  assert.throws(() => act(s, 'unit-3', {type: 'dig'}), /INVALID_ACTION/);
  assert.throws(() => act(s, 'unit-3', {type: 'assemble'}), /INVALID_ACTION/);
  for (let set = 0; set < 2; set++) {
    for (const branch of ['sun', 'moon', 'star']) {
      s = act(s, 'unit-3', {type: 'clue'});
      s = act(s, 'unit-3', {type: 'choose', branch});
      s = act(s, 'unit-3', {type: 'dig'});
    }
    s = act(s, 'unit-3', {type: 'assemble'});
  }
  assert.equal(s.ruleState.players['unit-3'].sets, 2);
  assert.equal(s.units[2].outcome, 'completed');
  s = act(s, 'unit-4', {type: 'clue'});
  s = tick(s, s.deadline);
  assert.deepEqual(rank(s).map(r => r.unitId), ['unit-3', 'unit-4', 'unit-1', 'unit-2']);
});

test('relay requires actual controller coverage and explicit handoff, including singletons', () => {
  let s = fixture('relay', {learners: learners.slice(0, 8), participation: 'pairs'});
  const unit = s.units[3];
  const [a, b] = unit.members.map(m => m.id);
  assert.throws(() => act(s, unit.id, {type: 'solve', learnerId: b}), /WRONG_CONTROLLER/);
  s = act(s, unit.id, {type: 'solve', learnerId: a});
  assert.throws(() => act(s, unit.id, {type: 'solve', learnerId: a}), /HANDOFF_REQUIRED/);
  s = act(s, unit.id, {type: 'handoff', learnerId: a});
  assert.equal(s.units[3].controller, 1);
  s = act(s, unit.id, {type: 'solve', learnerId: b});
  s = act(s, unit.id, {type: 'handoff', learnerId: b});
  assert.equal(s.units[3].outcome, 'completed');
  assert.deepEqual(s.ruleState.players[unit.id].coverage, [a, b]);
  s = tick(s, s.deadline);
  assert.deepEqual(rank(s).map(r => r.unitId), ['unit-4', 'unit-1', 'unit-2', 'unit-3']);
  let singleton = fixture('relay', {learners: learners.slice(0, 1), participation: 'pairs'});
  singleton = act(singleton, 'unit-1', {type: 'solve', learnerId: singleton.units[0].members[0].id});
  singleton = act(singleton, 'unit-1', {type: 'handoff', learnerId: singleton.units[0].members[0].id});
  assert.equal(singleton.finished, true);
});

test('lockdown enforces code/pipes/graph/logic room sequence and puzzle correctness', () => {
  let s = fixture('lockdown', {learners: small});
  const puzzles = [{roomType: 'code', code: '314'}, {roomType: 'pipes', rotations: [1, 2, 1]}, {roomType: 'graph', path: ['A', 'B', 'D']}, {roomType: 'logic', order: ['water', 'seed', 'tree']}];
  for (const puzzle of puzzles) {
    assert.equal(serializePublic(s, 'unit-1').room.type, puzzle.roomType);
    s = act(s, 'unit-1', {type: 'power'});
    assert.throws(() => act(s, 'unit-1', {type: 'unlock', roomType: 'wrong'}), /WRONG_ROOM/);
    if (puzzle.roomType === 'code') assert.throws(() => act(s, 'unit-1', {type: 'unlock', roomType: 'code', code: '000'}), /PUZZLE_INCORRECT/);
    s = act(s, 'unit-1', {type: 'unlock', ...puzzle});
  }
  assert.equal(s.units[0].outcome, 'completed');
  s = act(s, 'unit-4', {type: 'power'});
  s = act(s, 'unit-4', {type: 'unlock', ...puzzles[0]});
  s = tick(s, s.deadline);
  assert.deepEqual(rank(s).map(r => r.unitId), ['unit-1', 'unit-4', 'unit-2', 'unit-3']);
});

test('merchant publishes prices, conservative trades, funded contracts and net assets', () => {
  let s = fixture('merchant', {learners: small});
  assert.deepEqual(serializePublic(s).market.prices, {ore: 3, wood: 2});
  assert.throws(() => act(s, 'unit-1', {type: 'contract'}), /CONTRACT_UNFUNDED/);
  assert.throws(() => act(s, 'unit-1', {type: 'buy', item: 'ore', quantity: -1}), /INVALID_ACTION/);
  s = act(s, 'unit-1', {type: 'buy', item: 'wood', quantity: 2});
  s = act(s, 'unit-1', {type: 'sell', item: 'wood', quantity: 2});
  assert.equal(s.ruleState.players['unit-1'].coins, 4);
  s = act(s, 'unit-2', {type: 'earn'});
  for (let i = 0; i < 3; i++) {
    s = act(s, 'unit-2', {type: 'buy', item: 'ore', quantity: 2});
    s = act(s, 'unit-2', {type: 'buy', item: 'wood', quantity: 1});
    s = act(s, 'unit-2', {type: 'contract'});
  }
  s = act(s, 'unit-4', {type: 'earn'});
  s = act(s, 'unit-4', {type: 'earn'});
  s = act(s, 'unit-3', {type: 'earn'});
  assert.equal(s.units[1].outcome, 'completed');
  s = tick(s, s.deadline);
  assert.deepEqual(rank(s).map(r => r.unitId), ['unit-2', 'unit-4', 'unit-3', 'unit-1']);
});

test('campaign delegates race mutations/ranking and preserves supplied V7 data', () => {
  let s = fixture('campaign', {learners: small});
  const legacy = structuredClone(s.ruleState.players['unit-1']);
  legacy.customV7 = {keep: true};
  const before = structuredClone(legacy);
  const preserved = createGame({rule: 'campaign', learners: small, legacyTeams: {'unit-1': legacy}});
  assert.deepEqual(preserved.ruleState.players['unit-1'], before);
  assert.deepEqual(legacy, before);
  initRace(legacy);
  s = act(s, 'unit-1', {type: 'station'});
  finishStation(legacy, 1, 0);
  assert.deepEqual(s.ruleState.players['unit-1'].race, legacy.race);
  roll(legacy, 0);
  s = act(s, 'unit-1', {type: 'roll'});
  assert.deepEqual(s.ruleState.players['unit-1'].race, legacy.race);
  let guard = 0;
  while (s.units[0].outcome !== 'completed' && guard++ < 100) {
    const t = s.ruleState.players['unit-1'];
    if (t.race.bonus && !t.race.bonus.done) s = act(s, 'unit-1', {type: 'bonus'});
    else if (t.race.phase === 'challenge') s = act(s, 'unit-1', {type: 'station'});
    else if (t.race.phase === 'travel') s = act(s, 'unit-1', {type: 'roll'});
    else s = act(s, 'unit-1', {type: 'gate', code: t.race.outcomes.map(o => o.digit).join('')});
  }
  assert.equal(s.units[0].outcome, 'completed');
  assert.equal(s.ruleState.players['unit-1'].race.position, 32);
  s = act(s, 'unit-3', {type: 'station'});
  s = act(s, 'unit-3', {type: 'roll'});
  s = tick(s, s.deadline);
  assert.deepEqual(rank(s).map(r => r.unitId), ['unit-1', 'unit-3', 'unit-2', 'unit-4']);
  assert.deepEqual(rank(s).map(r => r.unitId), Object.values(s.ruleState.players).sort(compareTeams).map(t => t.id));
});

test('all nine rules have distinct objective progress traces; deterministic and deeply immutable', () => {
  const traces = [];
  const actions = {campaign: {type: 'station'}, duel: {type: 'answer'}, zones: {type: 'capture', zone: 1}, survival: {type: 'objective'}, escort: {type: 'advance'}, treasure: {type: 'clue'}, relay: null, lockdown: {type: 'power'}, merchant: {type: 'earn'}};
  for (const name of Object.keys(RULES)) {
    const initial = frozen(fixture(name, {learners: small}));
    const action = actions[name] ?? {type: 'solve', learnerId: initial.units[0].members[0].id};
    const snapshot = structuredClone(initial);
    const a = act(initial, 'unit-1', action);
    const b = act(initial, 'unit-1', action);
    assert.deepEqual(a, b);
    assert.deepEqual(initial, snapshot);
    assert.notDeepEqual(a.ruleState, initial.ruleState);
    traces.push(JSON.stringify(a.ruleState));
    assert.deepEqual(reduce(frozen(a), {type: 'rank'}, {gameNow: 0}).result, rank(a));
  }
  assert.equal(new Set(traces).size, 9);
});

test('engine late spectators cannot act, return after community, retain leaver results and rotate pair controllers', () => {
  let s = fixture('merchant', {learners: small, participation: 'pairs'});
  const originals = structuredClone(s.units);
  const admin = event => { s = reduce(s, {round: 1, requestId: `admin-${Object.keys(s.requests).length}`, ...event}, {gameNow: s.gameNow}).state; };
  admin({type: 'community-open'});
  admin({type: 'join', learner: {id: 'new', name: 'New Learner'}});
  assert.deepEqual(s.units.slice(0, 2), originals);
  assert.equal(s.units[2].outcome, 'spectator');
  assert.throws(() => act(s, 'unit-3', {type: 'earn'}), /UNIT_INACTIVE/);
  admin({type: 'community-close'});
  assert.equal(s.units[2].outcome, 'active');
  s = act(s, 'unit-3', {type: 'earn'});
  assert.equal(s.ruleState.players['unit-3'].coins, 9);
  assert.equal(s.units[2].controller, 0);
  s = act(s, 'unit-1', {type: 'earn'});
  assert.equal(s.units[0].controller, 1);
  admin({type: 'leave', learnerId: s.units[0].members[1].id});
  assert.equal(s.ruleState.players['unit-1'].coins, 9);
  assert.equal(s.units[0].controller, 0);
  admin({type: 'leave', learnerId: s.units[0].members[0].id});
  assert.equal(s.units[0].outcome, 'abandoned');
  assert.equal(rank(s).length, 3);
});

test('public serializers allowlist secrets, solutions and unknown injected fields', () => {
  for (const name of Object.keys(RULES)) {
    let s = fixture(name, {learners: small});
    const type = RULES[name].mathActions[0];
    const action = {type};
    if (name === 'zones') action.zone = 0;
    if (name === 'relay') action.learnerId = s.units[0].members[0].id;
    if (name === 'escort') s = act(s, 'unit-1', {type: 'advance'});
    s = reduce(s, {type: 'issue', requestId: 'q', round: 1, unitId: 'unit-1', action}, {gameNow: 0}).state;
    s.ruleState.players['unit-1'].secret = 'SENTINEL';
    s.challenges[s.activeChallenges['unit-1']].expected = 'SENTINEL';
    const publicView = serializePublic(frozen(s), 'unit-1');
    const text = JSON.stringify(publicView);
    assert.doesNotMatch(text, /"(?:answer|expected|steps|seed|secret|requests|bag|eventOrder|stationSchedule)":|SENTINEL/);
    assert.equal(typeof publicView.challenge.prompt, 'string');
    assert.equal(typeof serializeHost(s, 'unit-1').solution.answer, 'number');
  }
});

test('request replay/conflict, canonical binding, deadlines, stale rounds and pause-safe clocks', () => {
  const initial = fixture('merchant', {learners: small});
  const issue = {type: 'issue', requestId: 'q', round: 1, unitId: 'unit-1', action: {type: 'earn'}};
  const issued = reduce(initial, issue, {gameNow: 1000});
  const replay = reduce(issued.state, {...issue, action: {type: 'earn'}}, {gameNow: 2000});
  assert.equal(replay.state, issued.state);
  assert.deepEqual(replay.result, issued.result);
  assert.throws(() => reduce(issued.state, {...issue, unitId: 'unit-2'}, {gameNow: 2000}), /REQUEST_ID_CONFLICT/);
  const q = issued.state.challenges[issued.result.challengeId];
  const submit = {type: 'progress', requestId: 'a', round: 1, unitId: 'unit-1', action: {type: 'earn'}, challengeId: q.id, answer: q.answer};
  const accepted = reduce(issued.state, submit, {gameNow: q.deadline - 1});
  assert.equal(accepted.state.ruleState.players['unit-1'].coins, 9);
  assert.equal(reduce(accepted.state, submit, {gameNow: q.deadline + 1}).state, accepted.state);
  assert.throws(() => reduce(accepted.state, {...submit, answer: 0}, {gameNow: q.deadline}), /REQUEST_ID_CONFLICT/);
  assert.throws(() => reduce(issued.state, submit, {gameNow: q.deadline}), /CHALLENGE_EXPIRED/);
  assert.throws(() => reduce(issued.state, {...submit, unitId: 'unit-2'}, {gameNow: 2000}), /CHALLENGE_MISMATCH/);
  assert.throws(() => reduce(issued.state, {...submit, round: 2}, {gameNow: 2000}), /STALE_ROUND/);
  assert.throws(() => reduce(issued.state, submit, {gameNow: 999}), /INVALID_CLOCK/);
  assert.throws(() => reduce(issued.state, submit, {gameNow: 1000, pause: true}), /GAME_PAUSED/);
  assert.throws(() => tick(issued.state, 1001, true), /PAUSED_CLOCK_ADVANCED/);
  const paused = tick(issued.state, 1000, true);
  assert.equal(paused.gameNow, 1000);
  assert.equal(gameClock(90000, [{start: 1000, end: 50000}, {start: 40000, end: 80000}]), 11000);
  assert.equal(gameClock(100000, [{start: 1000}]), 1000);
  assert.equal(reduce(paused, submit, {gameNow: 11000}).result.correct, true);
  const wrong = reduce(issued.state, {...submit, answer: ''}, {gameNow: 2000});
  assert.equal(wrong.result.correct, false);
  assert.equal(wrong.state.ruleState.players['unit-1'].coins, 4);
  assert.throws(() => reduce(wrong.state, {...submit, requestId: 'again'}, {gameNow: 3000}), /CHALLENGE_USED/);
});
