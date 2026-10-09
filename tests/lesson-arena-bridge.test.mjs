import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {hashPackage} from '../lib/lesson/schema.js';
import {validateLessonPackage} from '../lib/lesson/validate.js';
import {createLessonSession, reduceLessonSession} from '../lib/lesson/runtime.js';
import {createSessionPlan} from '../lib/lesson/session-plan.js';
import {validateSessionPlan} from '../lib/lesson/validate-session-plan.js';
import {openLessonArena, answerLessonArena, combatLessonArena, serializeLessonArena, settleLessonArena, lessonArenaDescriptor} from '../lib/lesson/arena-bridge.js';

function state() {
  return {id: 's', status: 'active', round: 1, hostId: 't', timeline: {currentActivityId: 'a', activityIndex: 0, locked: false}, clock: {activityDeadline: 999999}, package: {status: 'approved', budget: {reserveMinutes: 4}, map: 'historical', activities: [{id: 'a', taskIds: ['q1', 'q2']}], tasks: [{id: 'q1', type: 'closed', prompt: 'Tính 2 + 2.', evaluation: {checkerId: 'numeric_exact', answerKey: 4}}, {id: 'q2', type: 'closed', prompt: 'Tính 3 + 3.', evaluation: {checkerId: 'numeric_exact', answerKey: 6}}]}, roster: {one: {id: 'one', name: 'One', present: true}, two: {id: 'two', name: 'Two', present: true}}, passports: {one: {submissions: []}, two: {submissions: []}}, rewardLedger: {}, gameWallets: {learners: {one: {earned: 0}, two: {earned: 0}}}};
}

function historicalState(gamePlan) {
  const current = state();
  return {...current, package: {...current.package, map: undefined}, gamePlan};
}

test('descriptor gate rejects an unauthored non-historical activity', () => {
  assert.deepEqual(lessonArenaDescriptor({package: {status: 'approved', map: 'other'}, activity: {id: 'a'}}), {authored: false, reason: 'ARENA_NOT_AUTHORED'});
  assert.equal(openLessonArena({...state(), package: {...state().package, map: 'other'}}, {activityId: 'a', seed: 3, actor: {role: 'teacher', id: 't'}}, 100).code, 'ARENA_NOT_AUTHORED');
});

test('approved historical game plan opens without mutating the package', () => {
  const original = historicalState({map: 'historical'});
  const opened = openLessonArena(original, {activityId: 'a', seed: 3, actor: {role: 'teacher', id: 't'}}, 100);
  assert.equal(opened.ok, true);
  assert.equal(original.package.gamePlan, undefined);
  assert.equal(lessonArenaDescriptor({package: {status: 'approved', gamePlan: {theme: 'Long Thành'}}}).authored, true);
  assert.equal(lessonArenaDescriptor({package: {status: 'approved', map: 'historical'}}).authored, true);
});

test('approved plans for other maps remain unauthored', () => {
  assert.deepEqual(lessonArenaDescriptor({package: {status: 'approved', gamePlan: {map: 'other'}}}), {authored: false, reason: 'ARENA_NOT_AUTHORED'});
  assert.deepEqual(lessonArenaDescriptor({package: {status: 'approved', gamePlan: {theme: 'coast'}}}), {authored: false, reason: 'ARENA_NOT_AUTHORED'});
  assert.equal(openLessonArena(historicalState({map: 'other'}), {activityId: 'a', seed: 3, actor: {role: 'teacher', id: 't'}}, 100).code, 'ARENA_NOT_AUTHORED');
});

test('server verdict ignores forged correct and public projection hides private data', () => {
  let s = openLessonArena(state(), {activityId: 'a', seed: 7, actor: {role: 'teacher', id: 't'}}, 100).state;
  const answer = answerLessonArena(s, {answer: '0', correct: true, step: 0, requestId: 'q'}, 'one', 10101);
  assert.equal(answer.ok, true);
  assert.equal(answer.correct, false);
  s = answer.state;
  const pub = serializeLessonArena(s, 'one', 10101);
  assert.equal('seed' in pub, false);
  assert.equal('answer' in pub.own.question, false);
  assert.equal('steps' in pub.own.question, false);
});

test('approved lesson tasks supply arena questions and standard checkers', () => {
  const base = state();
  const lesson = {
    ...base,
    package: {
      ...base.package,
      plan: undefined,
      map: 'historical',
      activities: [{ id: 'a', taskIds: ['q'] }],
      tasks: [{ id: 'q', type: 'closed', prompt: 'Tính 2 + 2.', evaluation: { checkerId: 'numeric_exact', answerKey: 4 } }]
    }
  };
  let opened = openLessonArena(lesson, { activityId: 'a', seed: 4, actor: { role: 'teacher', id: 't' } }, 100);
  assert.equal(opened.ok, true);
  let answered = answerLessonArena(opened.state, { answer: '4', step: 0, requestId: 'lesson-q' }, 'one', 10101);
  assert.equal(answered.ok, true);
  assert.equal(answered.correct, true);
  opened = openLessonArena(lesson, { activityId: 'a', seed: 4, actor: { role: 'teacher', id: 't' } }, 100);
  answered = answerLessonArena(opened.state, { answer: '5', correct: true, step: 0, requestId: 'lesson-q-wrong' }, 'one', 10101);
  assert.equal(answered.ok, true);
  assert.equal(answered.correct, false);
  const view = serializeLessonArena(opened.state, 'one', 10101);
  assert.equal(view.own.question.question, 'Tính 2 + 2.');
  assert.equal('answer' in view.own.question, false);
});

test('presenter projection anonymizes learner names while teacher projection retains them', () => {
  const renamed = {...state(), roster: {one: {id: 'one', name: 'Private One', present: true}, two: {id: 'two', name: 'Private Two', present: true}}};
  const s = openLessonArena(renamed, {activityId: 'a', seed: 7, actor: {role: 'teacher', id: 't'}}, 100).state;
  const presenterJson = JSON.stringify(serializeLessonArena(s, null, 10101));
  const teacherJson = JSON.stringify(serializeLessonArena(s, null, 10101, true));
  assert.equal(presenterJson.includes('Private One'), false);
  assert.equal(presenterJson.includes('Private Two'), false);
  assert.match(presenterJson, /Đấu thủ \d+\/\d+/);
  assert.equal(teacherJson.includes('Private One'), true);
  assert.equal(teacherJson.includes('Private Two'), true);
  const presenter = serializeLessonArena(s, null, 10101);
  const teacher = serializeLessonArena(s, null, 10101, true);
  const before = JSON.stringify(s);
  const later = serializeLessonArena(s, null, s.arena.event.finishAt);
  assert.equal(presenter.phase, teacher.phase);
  for (const entry of presenter.entries) {
    const source = teacher.entries.find(row => row.id === entry.id);
    assert.deepEqual({...entry, name: source.name}, source);
    assert.equal(later.entries.find(row => row.id === entry.id).name, entry.name);
  }
  for (const pair of presenter.bracket) {
    const source = teacher.bracket.find(row => row.match === pair.match);
    assert.deepEqual({...pair, left: pair.left && {...pair.left, name: source.left.name}, right: pair.right && {...pair.right, name: source.right.name}}, source);
    for (const side of ['left', 'right']) {
      if (pair[side]) assert.equal(pair[side].name, presenter.entries.find(row => row.id === pair[side].id).name);
    }
  }
  assert.equal(serializeLessonArena(s, 'one', 10101).own.opponent.name, 'Private Two');
  assert.equal(JSON.stringify(s), before);
});

test('combat is bounded and knockdown is not elimination', () => {
  let s = openLessonArena(state(), {activityId: 'a', seed: 7, actor: {role: 'teacher', id: 't'}}, 100).state;
  s = {...s, arena: {...s.arena, entries: s.arena.entries.map(e => e.id === 'one' ? {...e, resource: 5} : e)}};
  const result = combatLessonArena(s, {target: 'two', action: 'attack', requestId: 'a'}, 'one', 10101);
  assert.equal(result.ok, true);
  assert.ok(result.state.arena.entries.find(e => e.id === 'two'));
  assert.equal(combatLessonArena(result.state, {target: 'two', action: 'explode'}, 'one', 10102).ok, false);
});

test('settlement rewards once and does not change passport mastery', () => {
  let s = openLessonArena(state(), {activityId: 'a', seed: 7, actor: {role: 'teacher', id: 't'}}, 100).state;
  const before = JSON.stringify(s.passports);
  const first = settleLessonArena(s, s.arena.event.resumeAt);
  assert.equal(first.ok, true);
  const second = settleLessonArena(first.state, first.state.arena.event.resumeAt);
  assert.deepEqual(second.state.rewardLedger, first.state.rewardLedger);
  assert.equal(JSON.stringify(first.state.passports), before);
});

test('pause, lock, and activity boundary reject arena actions', () => {
  const s = openLessonArena(state(), {activityId: 'a', seed: 7, actor: {role: 'teacher', id: 't'}}, 100).state;
  assert.equal(answerLessonArena({...s, status: 'paused'}, {answer: '1', step: 0}, 'one', 10101).code, 'ARENA_UNAVAILABLE');
  assert.equal(answerLessonArena({...s, timeline: {...s.timeline, locked: true}}, {answer: '1', step: 0}, 'one', 10101).code, 'ARENA_UNAVAILABLE');
  assert.equal(answerLessonArena({...s, timeline: {...s.timeline, currentActivityId: 'b'}}, {answer: '1', step: 0}, 'one', 10101).code, 'ARENA_UNAVAILABLE');
});

test('valid approved Day so package runs choice arena without legacy plan or repeated tasks', async () => {
  const pkg = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));
  pkg.status = 'approved';
  pkg.sourceRefs = pkg.sourceRefs.map(ref => ({...ref, verification: 'verified'}));
  pkg.contentHash = hashPackage(pkg);
  assert.equal(validateLessonPackage(pkg, {mode: 'publish'}).ok, true);
  const plan = createSessionPlan({package: {...pkg, rowId: 'fixture'}, status: 'approved', theme: 'historical'});
  assert.equal(validateSessionPlan(plan, {package: {...pkg, rowId: 'fixture'}, mode: 'approved'}).ok, true);
  let s = {...createLessonSession({id: 'approved-arena', hostId: 't', package: pkg, mode: 'live', now: 100, learners: [{id: 'one', name: 'One'}]}), gamePlan: plan};
  const command = (type, payload, now, actor = {role: 'teacher', id: 't'}) => {
    const result = reduceLessonSession(s, {eventId: `${type}-${s.revision}`, type, payload, round: s.round, revision: s.revision, activityId: s.timeline.currentActivityId}, {actor, now});
    assert.equal(result.result.ok, true, JSON.stringify(result.result)); s = result.state; return result.result;
  };
  command('START', {}, 101);
  command('NEXT', {}, 102);
  command('ARENA_OPEN', {seed: 4}, 103);
  const now = s.arena.event.startAt + 1;
  const first = serializeLessonArena(s, 'one', now);
  assert.equal(first.questions, 2);
  assert.equal(first.own.question.task.evaluation.checkerId, 'choice_exact');
  assert.equal(first.own.question.task.inputSchema.options.length, 2);
  const passports = JSON.stringify(s.passports);
  for (const taskId of s.arena.taskIds) {
    const step = s.arena.entries[0].step;
    const task = pkg.tasks.find(task => task.id === taskId);
    const answer = command('ARENA_ANSWER', {answer: task.evaluation.answerKey, step, requestId: `q-${step}`}, now + step * 2001, {role: 'student', id: 'one'});
    assert.equal(answer.correct, true);
  }
  assert.equal(serializeLessonArena(s, 'one', now + 5000).own.question, null);
  assert.equal(JSON.stringify(s.passports), passports);
  const exhausted = answerLessonArena(s, {answer: 'anything', step: 2}, 'one', now + 6000);
  assert.equal(exhausted.code, 'ARENA_EXHAUSTED');
});
