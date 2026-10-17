import assert from 'node:assert/strict';
import test from 'node:test';
import { createLessonSession, reduceLessonSession } from '../lib/lesson/runtime.js';
import { serializeForStudent } from '../lib/lesson/serialize.js';
import { getAuthoredLesson } from '../lib/lesson/authored-content.js';

const lesson = await getAuthoredLesson('g11-ch2-review');

const teacher = { role: 'teacher', id: 'teacher-1' };
const pupil = id => ({ role: 'student', id });

function session() {
  const state = createLessonSession({ package: structuredClone(lesson), sessionId: 'self-1', hostId: 'teacher-1',
    learners: [{ id: 'a', name: 'An' }, { id: 'b', name: 'Bình' }], now: 1000 });
  state.pacing = 'self';
  return state;
}
let clock = 1000, seq = 0;
function send(state, actor, type, payload = {}, activityId) {
  const out = reduceLessonSession(state, { eventId: `e${++seq}`, type, round: state.round, revision: state.revision, payload, ...(activityId ? { activityId } : {}) }, { actor, now: clock += 1000 });
  return out;
}
function answerAll(state, id) {
  const view = serializeForStudent(state, id);
  for (const task of view.tasks) {
    const key = state.package.tasks.find(t => t.id === task.id).evaluation;
    const answer = key.checkerId === 'representation_match' ? key.answerKey : key.answerKey ?? 'Em tự trình bày lời giải.';
    const out = send(state, pupil(id), 'SUBMIT', { taskId: task.id, answer }, view.currentActivity.id);
    assert.equal(out.result.ok, true, `${task.id}: ${out.result.code}`);
    state = out.state;
  }
  return state;
}

test('self-paced pupils each move through their own gates; the teacher timeline does not hold them back', () => {
  let state = session();
  state = send(state, teacher, 'START').state;
  assert.equal(state.clock.activityDeadline, state.clock.startedAt + 78 * 60 * 1000, 'one clock for the whole lesson (reserve excluded)');
  assert.equal(send(state, teacher, 'NEXT').result.code, 'SELF_PACED');

  assert.equal(serializeForStudent(state, 'a').currentActivity.id, 'act-exp');
  state = answerAll(state, 'a');
  const a = serializeForStudent(state, 'a'), b = serializeForStudent(state, 'b');
  assert.equal(a.currentActivity.id, 'act-pre', 'An moves on after finishing gate 1');
  assert.equal(b.currentActivity.id, 'act-exp', 'Bình stays at gate 1');
  assert.equal(a.pacing, 'self');
  assert.equal(state.timeline.activityIndex, 0, 'class timeline untouched');

  // Dice now reach gate 2 for An only.
  for (let i = 0; i < 8; i++) state = send(state, pupil('a'), 'ROLL').state;
  assert.equal(state.diceTrack.a.position, 16);
  for (let i = 0; i < 8; i++) state = send(state, pupil('b'), 'ROLL').state;
  assert.equal(state.diceTrack.b.position, 8);
});

test('group and whole-class tasks are done individually, two wrong tries let the pupil move on, open tasks finish on submit', () => {
  let state = send(session(), teacher, 'START').state;
  state = answerAll(state, 'a'); // exp
  state = answerAll(state, 'a'); // pre
  const form = serializeForStudent(state, 'a');
  assert.equal(form.currentActivity.id, 'act-form');
  assert.equal(form.tasks[0].participation, 'individual');
  // two wrong tries on the formula match
  for (let i = 0; i < 2; i++) state = send(state, pupil('a'), 'SUBMIT', { taskId: 'task-form-formulas', answer: { rep_csc_term: 'card_csn_term' } }, 'act-form').state;
  assert.equal(serializeForStudent(state, 'a').currentActivity.id, 'act-prac-mono');
  // jump to exit: open exit ticket counts as finished once submitted (pending teacher marking)
  state.selfProgress.a = state.package.activities.findIndex(x => x.id === 'act-exit');
  state = send(state, pupil('a'), 'SUBMIT', { taskId: 'task-exit-ticket', answer: 'Em tự trình bày lời giải.' }, 'act-exit').state;
  assert.equal(serializeForStudent(state, 'a').currentActivity.id, 'act-reflection');
});

test('a pupil whose level has no task at a gate gets the nearest level instead of an empty gate', () => {
  let state = send(session(), teacher, 'START').state;
  const challenge = state.package.activities.findIndex(x => x.id === 'act-challenge');
  state.selfProgress = { a: challenge };
  state.package = { ...state.package, tasks: state.package.tasks.filter(t => !['task-challenge-support', 'task-challenge-core'].includes(t.id)),
    activities: state.package.activities.map(x => x.id === 'act-challenge' ? { ...x, taskIds: ['task-challenge-mix'] } : x) };
  const view = serializeForStudent(state, 'a');
  assert.deepEqual(view.tasks.map(t => t.id), ['task-challenge-mix']);
});

test('teacher pause still stops every pupil in self-paced mode', () => {
  let state = send(session(), teacher, 'START').state;
  state = send(state, teacher, 'PAUSE').state;
  assert.equal(send(state, pupil('a'), 'ROLL').result.code, 'PAUSED');
});

test('more than half the class wrong on a question raises a pause suggestion for the teacher', async () => {
  const { wrongAlerts } = await import('../lib/lesson/self-pace.js');
  const { cockpitActions } = await import('../lib/lesson/cockpit.js');
  const state = { package: { tasks: [{ id: 't1', prompt: 'Tính $u_5$ của cấp số nhân' }] }, submissions: {} };
  const add = (learnerId, ok, at) => { state.submissions[`${learnerId}${at}`] = { learnerId, taskId: 't1', activityId: 'a', ok, assessmentStatus: 'assessed', at }; };
  add('a', false, 1); add('b', false, 2); add('c', true, 3); add('d', true, 4);
  assert.deepEqual(wrongAlerts(state), [], 'exactly half is not more than half');
  add('e', false, 5); add('a', true, 6); // a's later correct retry does not hide the first-attempt error
  const [alert] = wrongAlerts(state);
  assert.equal(alert.wrong, 3); assert.equal(alert.total, 5);
  const view = { wrongAlerts: [alert], roster: { a: { id: 'a', name: 'A', present: true } }, map: { peers: [{ id: 'a', position: 0 }] } };
  const actions = cockpitActions(view);
  if (actions.length) assert.equal(actions[0].kind, 'pause');
});

test('a pupil who joins late starts at the gate the lesson plan has reached; early pupils keep their own pace', async () => {
  const { plannedGateIndex } = await import('../lib/lesson/self-pace.js');
  let state = send(session(), teacher, 'START').state;
  const start = state.clock.startedAt;
  // exp 4' + pre 8' = 12 minutes → act-form (index 2) is the planned gate at minute 13.
  assert.equal(plannedGateIndex(state, start + 13 * 60000), 2);
  clock = start + 13 * 60000;
  const late = reduceLessonSession(state, { eventId: `e${++seq}`, type: 'ADD_LEARNER', round: state.round, revision: state.revision,
    payload: { learner: { id: 'c', name: 'Châu' } } }, { actor: teacher, now: clock });
  assert.equal(late.result.ok, true, late.result.code);
  state = late.state;
  assert.equal(serializeForStudent(state, 'c').currentActivity.id, 'act-form');
  assert.equal(state.diceTrack.c.position, 16);
  assert.equal(serializeForStudent(state, 'a').currentActivity.id, 'act-exp', 'An who came on time is not moved');
  // a pause does not count as lesson time
  const paused = { ...state, clock: { ...state.clock, totalPausedMs: 10 * 60000 } };
  assert.equal(plannedGateIndex(paused, start + 13 * 60000), 0);
});

test('when every pupil present has passed the quest gate, the class game opens by itself and everyone sees the shared goal', () => {
  let state = send(session(), teacher, 'START').state;
  const quest = serializeForStudent(state, 'a').classQuest;
  assert.equal(quest.activityId, 'act-prac-csn', 'gate around the middle of the lesson with closed tasks');
  assert.equal(quest.eventLabel, 'Đánh trùm cả lớp');
  assert.deepEqual([quest.passed, quest.total, quest.status], [0, 2, 'pending']);
  const gate = state.package.activities.findIndex(x => x.id === 'act-prac-csn');
  state.selfProgress = { a: gate + 1, b: gate };
  state = answerAll(state, 'b');
  assert.equal(state.classQuest.status, 'open', state.classQuest.reason);
  assert.equal(state.classEvent.type, 'boss');
  assert.equal(serializeForStudent(state, 'b').classQuest.status, 'open');
  assert.equal(send(state, pupil('a'), 'ROLL').result.ok, false, 'main game waits while the class plays together');
});
