import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  createLessonSession,
  extensionEligibility,
  reduceLessonSession
} from '../lib/lesson/runtime.js';
import {
  createLearnerPassport,
  computeObjectiveMastery,
  recordHintAssistance,
  recordTaskSubmission
} from '../lib/lesson/passport.js';
import {
  ROLE_DEFINITIONS,
  createActivityGroups,
  chooseGroupRole,
  autoAssignRemainingRoles
} from '../lib/lesson/grouping.js';
import {
  serializeForTeacher,
  serializeForStudent,
  serializeForPresenter
} from '../lib/lesson/serialize.js';
import { hashPackage } from '../lib/lesson/schema.js';

function arenaRuntimeState() {
  return {
    id: 'runtime-arena', hostId: 'teacher-1', round: 1, revision: 0, status: 'active',
    timeline: { currentActivityId: 'arena-activity', activityIndex: 0, locked: false },
    clock: { lastNow: 100, activityDeadline: 999999, pausedAt: null, totalPausedMs: 0, activityPausedMs: 0 }, groups: {}, eventCache: {}, rewardLedger: {},
    gameWallets: { learners: { 'learner-1': { earned: 0, bonus: 0 } } },
    passports: { 'learner-1': { submissions: [] } },
    roster: { 'learner-1': { id: 'learner-1', name: 'Learner', present: true } },
    package: { status: 'approved', budget: {reserveMinutes: 4}, map: 'historical', activities: [{ id: 'arena-activity', taskIds: ['arena-task'] }], tasks: [{id: 'arena-task', type: 'closed', prompt: 'Tính 2 + 2.', evaluation: {checkerId: 'numeric_exact', answerKey: 4}}] }
  };
}

test('runtime dispatches arena events through the bridge and caches replays', async () => {
  let state = arenaRuntimeState();
  const teacher = { role: 'teacher', id: 'teacher-1' };
  const student = { role: 'student', id: 'learner-1' };
  const open = reduceLessonSession(state, {
    eventId: 'arena-open', type: 'ARENA_OPEN', activityId: 'arena-activity', round: 1, revision: 0,
    payload: { seed: 7 }
  }, { actor: teacher, now: 101 });
  assert.equal(open.result.ok, true);
  state = open.state;
  const mainDeadline = state.clock.activityDeadline;
  assert.equal(typeof state.clock.arenaPausedAt, 'number');

  const forged = reduceLessonSession(state, {
    eventId: 'arena-answer', type: 'ARENA_ANSWER', activityId: 'arena-activity', round: 1, revision: 1,
    payload: { answer: '0', step: 0, requestId: 'answer-1' }
  }, { actor: student, now: 10101 });
  assert.equal(forged.result.ok, true);
  assert.equal(typeof forged.result.correct, 'boolean');
  state = forged.state;
  assert.equal(state.clock.activityDeadline, mainDeadline);
  const replay = reduceLessonSession(state, {
    eventId: 'arena-open', type: 'ARENA_OPEN', activityId: 'arena-activity', round: 1, revision: 0,
    payload: { seed: 7 }
  }, { actor: teacher, now: 10101 });
  assert.equal(replay.result.replay, true);

  const unauthorized = reduceLessonSession(state, {
    eventId: 'arena-combat', type: 'ARENA_COMBAT', activityId: 'arena-activity', round: 1, revision: state.revision,
    payload: { target: 'learner-1', action: 'attack', requestId: 'combat-1' }
  }, { actor: teacher, now: 102 });
  assert.equal(unauthorized.result.code, 'UNAUTHORIZED');
  const settled = reduceLessonSession(state, {
    eventId: 'arena-settle', type: 'ARENA_SETTLE', activityId: 'arena-activity', round: 1, revision: state.revision,
    payload: {}
  }, { actor: teacher, now: state.arena.event.resumeAt });
  assert.equal(settled.result.ok, true);
  assert.equal(settled.state.clock.arenaPausedAt, null);
  assert.ok(settled.state.clock.activityDeadline > mainDeadline);
});

test('arena reserve, teacher pause and automatic settlement preserve main deadline and rewards', () => {
  let state = arenaRuntimeState();
  const command = (type, now, payload = {}, actor = {role: 'teacher', id: 'teacher-1'}) => {
    const changed = reduceLessonSession(state, {eventId: `${type}-${state.revision}`, type, round: state.round, revision: state.revision, activityId: state.timeline.currentActivityId, payload}, {actor, now});
    assert.equal(changed.result.ok, true, JSON.stringify(changed.result)); state = changed.state;
  };
  command('ARENA_OPEN', 101, {seed: 1});
  const oldDeadline = state.clock.activityDeadline;
  const resumeAt = state.arena.event.resumeAt;
  command('PAUSE', 1000);
  command('RESUME', 4000);
  assert.equal(state.arena.event.resumeAt, resumeAt + 3000);
  assert.equal(state.clock.activityDeadline, oldDeadline + 3000);
  command('TICK', state.arena.event.resumeAt, {}, {role: 'system', id: 'system'});
  assert.equal(state.arena.settled, true);
  assert.equal(state.clock.arenaPausedAt, null);
  assert.equal(state.clock.activityDeadline, oldDeadline + 3000 + 95000);
  const wallet = JSON.stringify(state.gameWallets);
  command('TICK', state.clock.lastNow + 1, {}, {role: 'system', id: 'system'});
  assert.equal(JSON.stringify(state.gameWallets), wallet);
  const noReserve = arenaRuntimeState(); noReserve.package.budget.reserveMinutes = 0;
  const rejected = reduceLessonSession(noReserve, {eventId: 'no-reserve', type: 'ARENA_OPEN', round: 1, revision: 0, activityId: noReserve.timeline.currentActivityId, payload: {}}, {actor: {role: 'teacher', id: 'teacher-1'}, now: 101});
  assert.equal(rejected.result.code, 'ARENA_BUDGET_EXCEEDED');
});

const fixtureJson = await readFile(
  new URL('../content/lessons/g11-sequences-p1.json', import.meta.url),
  'utf8'
);
const fixture = JSON.parse(fixtureJson);

test('student and presenter game plans expose only public metadata', () => {
  const state = createLessonSession({ package: fixture, mode: 'preview', sessionId: 'public-plan', hostId: 'teacher-1', now: 1000 });
  state.gamePlan = {
    id: 'plan-1',
    contentHash: 'plan-hash',
    schemaVersion: '1.0.0',
    theme: 'modern',
    map: 'modern',
    rule: 'campaign',
    participation: 'group',
    story: { title: 'Title', premise: 'private premise', goal: 'Goal', places: ['private place'] },
     activityPlans: [{ id: 'act-exp', order: 0, phase: 'experience', minutes: 3, participation: 'whole_class', taskIds: ['task-exp-predict'], evidenceIds: ['ev-exp-pred'], mapSegment: { id: 'seg-1', start: { index: 1, point: [10, 20], private: 'strip' }, end: { point: [30, 40, 50], private: 'strip' }, private: 'strip' } }],
    checkpoints: [{ id: 'checkpoint-1', objectiveIds: ['obj-t11-18'] }],
    director: { deterministic: true, seed: 7, confidence: 0.5, uncertainties: ['sourceRefs'] },
    sourceRefs: [{ id: 'source', locator: 'private' }]
  };

  for (const view of [serializeForStudent(state, 'learner-1'), serializeForPresenter(state)]) {
    assert.deepEqual(view.gamePlan.story, { title: 'Title', goal: 'Goal' });
    assert.equal(Object.hasOwn(view.gamePlan, 'director'), false);
    assert.equal(Object.hasOwn(view.gamePlan, 'sourceRefs'), false);
   assert.equal(Object.hasOwn(view.gamePlan.activityPlans[0], 'taskIds'), false);
   assert.equal(Object.hasOwn(view.gamePlan.activityPlans[0], 'evidenceIds'), false);
   assert.deepEqual(view.gamePlan.activityPlans[0].mapSegment, {
     id: 'seg-1',
     start: { index: 1, point: [10, 20] },
     end: { point: [30, 40] }
   });
    assert.deepEqual(view.gamePlan.checkpoints[0].objectiveCodes, ['T11.18']);
  }

  const teacher = serializeForTeacher(state);
  assert.equal(Object.hasOwn(teacher.gamePlan, 'director'), false);
  assert.equal(Object.hasOwn(teacher.gamePlan, 'sourceRefs'), false);
  assert.deepEqual(teacher.gamePlan.activityPlans[0].taskIds, ['task-exp-predict']);
});

// Helper to create an approved clone for live mode tests
function createApprovedFixtureClone() {
  const clone = JSON.parse(JSON.stringify(fixture));
  clone.status = 'approved';
  // Mark external sources as verified so publish mode validation passes
  for (const src of clone.sourceRefs) {
    src.verification = 'verified';
  }
  clone.contentHash = hashPackage(clone);
  return clone;
}

test('runtime rejects session creation if package hash or structure is invalid', () => {
  const tampered = { ...fixture, contentHash: 'deadbeef787289f87b04552ed805b24d7ec64ce12f96f402f6ce0515c7863c55' };
  assert.throws(
    () => createLessonSession({ package: tampered, mode: 'preview', sessionId: 's1', hostId: 'teacher-1' }),
    /INVALID_PACKAGE/
  );
  assert.throws(
    () => createLessonSession({ package: null, mode: 'preview', sessionId: 's1', hostId: 'teacher-1' }),
    /INVALID_PACKAGE/
  );
});

test('runtime enforces approved/published status in live mode and allows draft in preview mode', () => {
  // Real fixture is 'needs_review' - cannot run in live mode
  assert.throws(
    () => createLessonSession({ package: fixture, mode: 'live', sessionId: 's1', hostId: 'teacher-1' }),
    /ERR_PACKAGE_NOT_APPROVED|INVALID_PACKAGE/
  );

  // Preview mode accepts needs_review / draft
  const previewSession = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's-prev',
    hostId: 'teacher-1',
    learners: [
      { id: 'hs-1', name: 'Nguyễn Văn An' },
      { id: 'hs-2', name: 'Trần Thị Bình' }
    ],
    now: 1000
  });
  assert.equal(previewSession.mode, 'preview');
  assert.equal(previewSession.status, 'waiting');
  assert.equal(previewSession.round, 1);
  assert.equal(previewSession.revision, 0);
  assert.ok(previewSession.roster['hs-1']);
  assert.ok(previewSession.passports['hs-1']);

  // Verified approved clone works in live mode
  const approvedClone = createApprovedFixtureClone();
  const liveSession = createLessonSession({
    package: approvedClone,
    mode: 'live',
    sessionId: 's-live',
    hostId: 'teacher-1',
    now: 1000
  });
  assert.equal(liveSession.mode, 'live');
});

test('actor authorization: student cannot run teacher commands and wrong host is rejected', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's1',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    now: 1000
  });

  // Student tries START
  const studentStart = reduceLessonSession(
    session,
    { eventId: 'e-1', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'student', id: 'hs-1' }, now: 1000 }
  );
  assert.equal(studentStart.result.ok, false);
  assert.equal(studentStart.result.code, 'UNAUTHORIZED');
  assert.equal(studentStart.state.status, 'waiting');

  // Impostor teacher tries START
  const impostorStart = reduceLessonSession(
    session,
    { eventId: 'e-2', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-fake' }, now: 1000 }
  );
  assert.equal(impostorStart.result.ok, false);
  assert.equal(impostorStart.result.code, 'UNAUTHORIZED');

  // Legitimate teacher START succeeds
  const legitStart = reduceLessonSession(
    session,
    { eventId: 'e-3', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  );
  assert.equal(legitStart.result.ok, true);
  assert.equal(legitStart.state.status, 'active');
  assert.equal(legitStart.state.revision, 1);
});

test('teacher cannot skip the first activity before starting the lesson', () => {
  const session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 'waiting-next',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    now: 1000
  });
  const result = reduceLessonSession(session, {
    eventId: 'next-before-start', type: 'NEXT', round: 1, revision: 0,
    activityId: session.timeline.currentActivityId, payload: { force: true }
  }, { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 });
  assert.equal(result.result.ok, false);
  assert.equal(result.result.code, 'NOT_ACTIVE');
  assert.equal(result.state.timeline.activityIndex, 0);
  assert.equal(result.state.status, 'waiting');
});

test('student actions rejected before session is active or while paused or locked', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's1',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    now: 1000
  });

  // In 'waiting' status
  const submitInWaiting = reduceLessonSession(
    session,
    {
      eventId: 'sub-wait',
      type: 'SUBMIT',
      activityId: 'act-exp',
      round: 1,
      revision: 0,
      payload: { taskId: 'task-exp-predict', answer: 'opt_finite_seat' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: 1000 }
  );
  assert.equal(submitInWaiting.result.ok, false);
  assert.equal(submitInWaiting.result.code, 'NOT_ACTIVE');

  // Teacher START
  session = reduceLessonSession(
    session,
    { eventId: 'e-start', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  // Teacher PAUSE
  session = reduceLessonSession(
    session,
    { eventId: 'e-pause', type: 'PAUSE', round: 1, revision: 1, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1100 }
  ).state;
  assert.equal(session.status, 'paused');

  // Student action while paused
  const submitInPause = reduceLessonSession(
    session,
    {
      eventId: 'sub-pause',
      type: 'SUBMIT',
      activityId: 'act-exp',
      round: 1,
      revision: 2,
      payload: { taskId: 'task-exp-predict', answer: 'opt_finite_seat' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: 1200 }
  );
  assert.equal(submitInPause.result.ok, false);
  assert.equal(submitInPause.result.code, 'PAUSED');

  // Teacher RESUME
  session = reduceLessonSession(
    session,
    { eventId: 'e-resume', type: 'RESUME', round: 1, revision: 2, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1500 }
  ).state;
  assert.equal(session.status, 'active');

  // Teacher LOCK
  session = reduceLessonSession(
    session,
    { eventId: 'e-lock', type: 'LOCK', round: 1, revision: 3, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1600 }
  ).state;

  // Student action while locked
  const submitInLock = reduceLessonSession(
    session,
    {
      eventId: 'sub-lock',
      type: 'SUBMIT',
      activityId: 'act-exp',
      round: 1,
      revision: 4,
      payload: { taskId: 'task-exp-predict', answer: 'opt_finite_seat' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: 1700 }
  );
  assert.equal(submitInLock.result.ok, false);
  assert.equal(submitInLock.result.code, 'LOCKED');
});

test('clock monotonicity and deadline handling', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's1',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    now: 1000
  });

  // Time going backward
  const clockBackward = reduceLessonSession(
    session,
    { eventId: 'e-start', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 500 }
  );
  assert.equal(clockBackward.result.ok, false);
  assert.equal(clockBackward.result.code, 'INVALID_CLOCK');

  // Normal start
  session = reduceLessonSession(
    session,
    { eventId: 'e-start', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  // Fast-forward past deadline
  const pastDeadline = session.clock.activityDeadline + 1000;
  const expiredSubmit = reduceLessonSession(
    session,
    {
      eventId: 'sub-expired',
      type: 'SUBMIT',
      activityId: 'act-exp',
      round: 1,
      revision: 1,
      payload: { taskId: 'task-exp-predict', answer: 'opt_finite_seat' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: pastDeadline }
  );
  assert.equal(expiredSubmit.result.ok, false);
  assert.equal(expiredSubmit.result.code, 'ACTIVITY_EXPIRED');

  // Teacher EXTEND deadline by 5 minutes
  const extendRes = reduceLessonSession(
    session,
    {
      eventId: 'e-extend',
      type: 'EXTEND',
      round: 1,
      revision: 1,
      payload: { minutes: 5 }
    },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: pastDeadline }
  );
  assert.equal(extendRes.result.ok, true);
  assert.ok(extendRes.state.clock.activityDeadline >= pastDeadline + 5 * 60 * 1000);
});

test('event idempotency, replay and conflict detection', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's1',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    rewardPolicy: { individualCorrect: 10, groupCorrect: 20 },
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'e-start', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  const submitEvent = {
    eventId: 'sub-1',
    type: 'SUBMIT',
    activityId: 'act-exp',
    round: 1,
    revision: 1,
    payload: { taskId: 'task-exp-predict', answer: 'opt_finite_seat' }
  };

  // First execution
  const first = reduceLessonSession(session, submitEvent, { actor: { role: 'student', id: 'hs-1' }, now: 2000 });
  assert.equal(first.result.ok, true);
  assert.equal(first.result.replay, false);
  assert.equal(first.result.correct, true);
  assert.equal(first.state.revision, 2);
  assert.equal(first.state.gameWallets.learners['hs-1'].earned, 10);

  // Exact replay: same actor, same eventId and payload
  const second = reduceLessonSession(first.state, submitEvent, { actor: { role: 'student', id: 'hs-1' }, now: 2500 });
  assert.equal(second.result.ok, true);
  assert.equal(second.result.replay, true);
  assert.equal(second.state.revision, 2); // Does not increment revision on replay
  assert.equal(second.state.gameWallets.learners['hs-1'].earned, 10); // Reward not granted twice

  // Conflicting eventId with different payload
  const conflictEvent = {
    ...submitEvent,
    payload: { taskId: 'task-exp-predict', answer: 'opt_infinite_seat' }
  };
  const conflict = reduceLessonSession(first.state, conflictEvent, { actor: { role: 'student', id: 'hs-1' }, now: 2600 });
  assert.equal(conflict.result.ok, false);
  assert.equal(conflict.result.code, 'EVENT_ID_CONFLICT');

  // Stale revision
  const staleRevEvent = {
    eventId: 'sub-stale',
    type: 'SUBMIT',
    activityId: 'act-exp',
    round: 1,
    revision: 0, // Current is 2
    payload: { taskId: 'task-exp-predict', answer: 'opt_finite_seat' }
  };
  const staleRes = reduceLessonSession(first.state, staleRevEvent, { actor: { role: 'student', id: 'hs-1' }, now: 2700 });
  assert.equal(staleRes.result.ok, false);
  assert.equal(staleRes.result.code, 'REVISION_MISMATCH');
});

test('closed task evaluation with real fixture and checker registry', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's1',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    rewardPolicy: { individualCorrect: 5, groupCorrect: 0 },
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'e-start', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  // Stale activity submit rejected
  const staleAct = reduceLessonSession(
    session,
    {
      eventId: 'sub-wrong-act',
      type: 'SUBMIT',
      activityId: 'act-pre', // Current is act-exp
      round: 1,
      revision: 1,
      payload: { taskId: 'task-pre-finite-inf', answer: 'opt_A' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: 1100 }
  );
  assert.equal(staleAct.result.ok, false);
  assert.equal(staleAct.result.code, 'STALE_ACTIVITY');

  // Submit wrong answer
  const wrongSubmit = reduceLessonSession(
    session,
    {
      eventId: 'sub-wrong',
      type: 'SUBMIT',
      activityId: 'act-exp',
      round: 1,
      revision: 1,
      payload: { taskId: 'task-exp-predict', answer: 'opt_infinite_seat' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: 1200 }
  );
  assert.equal(wrongSubmit.result.ok, true);
  assert.equal(wrongSubmit.result.correct, false);
  assert.equal(wrongSubmit.state.gameWallets.learners['hs-1'].earned, 0);

  // Retry with correct answer
  const rightSubmit = reduceLessonSession(
    wrongSubmit.state,
    {
      eventId: 'sub-right',
      type: 'SUBMIT',
      activityId: 'act-exp',
      round: 1,
      revision: 2,
      payload: { taskId: 'task-exp-predict', answer: 'opt_finite_seat' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: 1300 }
  );
  assert.equal(rightSubmit.result.ok, true);
  assert.equal(rightSubmit.result.correct, true);
  assert.equal(rightSubmit.state.gameWallets.learners['hs-1'].earned, 5);
});

test('hints: ordering, replay, and support tracking', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's1',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'e-start', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  // Requesting nonexistent hint
  const badHint = reduceLessonSession(
    session,
    {
      eventId: 'h-bad',
      type: 'HINT',
      activityId: 'act-exp',
      round: 1,
      revision: 1,
      payload: { taskId: 'task-exp-predict', hintId: 'hint-nonexistent' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: 1100 }
  );
  assert.equal(badHint.result.ok, false);
  assert.equal(badHint.result.code, 'INVALID_HINT');

  // Request valid H1 hint (hint-exp-1)
  const h1 = reduceLessonSession(
    session,
    {
      eventId: 'h-1',
      type: 'HINT',
      activityId: 'act-exp',
      round: 1,
      revision: 1,
      payload: { taskId: 'task-exp-predict', hintId: 'hint-exp-1' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: 1200 }
  );
  assert.equal(h1.result.ok, true);
  assert.equal(h1.state.passports['hs-1'].supportHistory.length, 1);

  // Now submit task-exp-predict with answer
  const submitWithHint = reduceLessonSession(
    h1.state,
    {
      eventId: 'sub-hinted',
      type: 'SUBMIT',
      activityId: 'act-exp',
      round: 1,
      revision: 2,
      payload: { taskId: 'task-exp-predict', answer: 'opt_finite_seat' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: 1300 }
  );
  assert.equal(submitWithHint.result.ok, true);
  assert.equal(submitWithHint.result.correct, true);

  // Because hint was used, this task is marked assisted in passport
  const lastSub = submitWithHint.state.passports['hs-1'].submissions.slice(-1)[0];
  assert.equal(lastSub.assisted, true);
});

test('teacher REVEAL taints task independence permanently for all students', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's1',
    hostId: 'teacher-main',
    learners: [
      { id: 'hs-1', name: 'Học sinh 1' },
      { id: 'hs-2', name: 'Học sinh 2' }
    ],
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'e-start', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  // Teacher reveals task-exp-predict
  session = reduceLessonSession(
    session,
    {
      eventId: 'e-reveal',
      type: 'REVEAL',
      round: 1,
      revision: 1,
      payload: { taskId: 'task-exp-predict' }
    },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1100 }
  ).state;
  assert.equal(session.reveals['task-exp-predict'].revealed, true);

  // Student 1 submits after reveal
  const postRevealSubmit = reduceLessonSession(
    session,
    {
      eventId: 'sub-post-reveal',
      type: 'SUBMIT',
      activityId: 'act-exp',
      round: 1,
      revision: 2,
      payload: { taskId: 'task-exp-predict', answer: 'opt_finite_seat' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: 1200 }
  );
  assert.equal(postRevealSubmit.result.ok, true);
  const sub = postRevealSubmit.state.passports['hs-1'].submissions.slice(-1)[0];
  assert.equal(sub.assisted, true);
});

test('open task submission, teacher assessment, reassessment refund and passport sync', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's1',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    rewardPolicy: { individualCorrect: 15, groupCorrect: 0 },
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'e-start', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  // Advance to act-recheck (which contains open task task-recheck-19)
  while (session.timeline.currentActivityId !== 'act-recheck') {
    session = reduceLessonSession(
      session,
      { eventId: `next-${session.revision}`, type: 'NEXT', round: 1, revision: session.revision, payload: {} },
      { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
    ).state;
  }
  assert.equal(session.timeline.currentActivityId, 'act-recheck');

  // Submit open task (task-recheck-19)
  const openSubRes = reduceLessonSession(
    session,
    {
      eventId: 'open-sub-1',
      type: 'SUBMIT',
      activityId: 'act-recheck',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-recheck-19', answer: 'Học sinh trình bày đủ 4 cách biểu diễn' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: session.clock.lastNow + 100 }
  );
  assert.equal(openSubRes.result.ok, true);
  assert.equal(openSubRes.result.pending, true);
  const subId = openSubRes.result.submissionId;
  assert.ok(subId);
  assert.equal(openSubRes.state.openAssessments[subId].status, 'pending');
  assert.equal(openSubRes.state.gameWallets.learners['hs-1'].earned, 0);

  // Teacher assesses open task as criteriaMet: true
  const assessTrue = reduceLessonSession(
    openSubRes.state,
    {
      eventId: 'assess-1',
      type: 'ASSESS',
      round: 1,
      revision: openSubRes.state.revision,
      payload: { submissionId: subId, criteriaMet: true, feedback: 'Rất tốt' }
    },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: openSubRes.state.clock.lastNow + 100 }
  );
  assert.equal(assessTrue.result.ok, true);
  assert.equal(assessTrue.state.openAssessments[subId].status, 'assessed');
  assert.equal(assessTrue.state.gameWallets.learners['hs-1'].earned, 15);

  // Teacher amends assessment to criteriaMet: false (refund / revoke)
  const assessFalse = reduceLessonSession(
    assessTrue.state,
    {
      eventId: 'assess-2',
      type: 'ASSESS',
      round: 1,
      revision: assessTrue.state.revision,
      payload: { submissionId: subId, criteriaMet: false, feedback: 'Chưa đủ ý' }
    },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: assessTrue.state.clock.lastNow + 100 }
  );
  assert.equal(assessFalse.result.ok, true);
  assert.equal(assessFalse.state.gameWallets.learners['hs-1'].earned, 0);

  // Teacher amends back to true (restores same reward, does not add extra)
  const assessTrueAgain = reduceLessonSession(
    assessFalse.state,
    {
      eventId: 'assess-3',
      type: 'ASSESS',
      round: 1,
      revision: assessFalse.state.revision,
      payload: { submissionId: subId, criteriaMet: true }
    },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: assessFalse.state.clock.lastNow + 100 }
  );
  assert.equal(assessTrueAgain.result.ok, true);
  assert.equal(assessTrueAgain.state.gameWallets.learners['hs-1'].earned, 15);
});

test('grouping: role selection, auto-assignment, contributions and group product without individual mastery', () => {
  const learners = [
    { id: 'hs-1', name: 'Nguyễn Văn An' },
    { id: 'hs-2', name: 'Trần Thị Bình' },
    { id: 'hs-3', name: 'Lê Văn Cường' },
    { id: 'hs-4', name: 'Phạm Thị Dung' }
  ];

  let session = createLessonSession({ groupPolicyVersion: 0,
    package: fixture,
    mode: 'preview',
    sessionId: 's1',
    hostId: 'teacher-main',
    learners,
    rewardPolicy: { individualCorrect: 0, groupCorrect: 30 },
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'e-start', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  // Advance to group activity act-form-19
  while (session.timeline.currentActivityId !== 'act-form-19') {
    session = reduceLessonSession(
      session,
      { eventId: `next-${session.revision}`, type: 'NEXT', round: 1, revision: session.revision, payload: {} },
      { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
    ).state;
  }
  assert.equal(session.timeline.currentActivityId, 'act-form-19');

  // Groups are created for act-form-19
  const groupState = session.groups['act-form-19'];
  assert.ok(groupState);
  assert.equal(groupState.groups.length, 1);
  const grp = groupState.groups[0];
  assert.equal(grp.memberIds.length, 4);

  // Student 1 chooses role 'discover'
  session = reduceLessonSession(
    session,
    {
      eventId: 'role-1',
      type: 'CHOOSE_ROLE',
      round: 1,
      revision: session.revision,
      payload: { roleId: 'discover' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: session.clock.lastNow + 100 }
  ).state;
  assert.equal(session.groups['act-form-19'].groups[0].roles.discover, 'hs-1');

  // Student 2 tries same role 'discover' -> ROLE_UNAVAILABLE
  const roleDup = reduceLessonSession(
    session,
    {
      eventId: 'role-dup',
      type: 'CHOOSE_ROLE',
      round: 1,
      revision: session.revision,
      payload: { roleId: 'discover' }
    },
    { actor: { role: 'student', id: 'hs-2' }, now: session.clock.lastNow + 100 }
  );
  assert.equal(roleDup.result.ok, false);
  assert.equal(roleDup.result.code, 'ROLE_UNAVAILABLE');

  // TICK after 15s role window closes auto-assigns remaining roles
  session = reduceLessonSession(
    session,
    {
      eventId: 'tick-roles',
      type: 'TICK',
      round: 1,
      revision: session.revision,
      payload: {}
    },
    { actor: { role: 'system', id: 'system' }, now: session.clock.lastNow + 20000 }
  ).state;

  const finalRoles = session.groups['act-form-19'].groups[0].roles;
  for (const r of ROLE_DEFINITIONS) {
    assert.ok(finalRoles[r.id], `Role ${r.id} should be assigned`);
  }

  // Student contributes text
  session = reduceLessonSession(
    session,
    {
      eventId: 'contrib-1',
      type: 'GROUP_CONTRIBUTE',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-form-four-rep', text: 'Số hạng đầu là 18' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: session.clock.lastNow + 100 }
  ).state;

  // Group submits shared product (representation match task)
  const repMatchAnswer = {
    rep_list: 'card_list_18_20_22',
    rep_explicit: 'card_explicit_formula',
    rep_recurrence: 'card_recurrence_rel',
    rep_verbal: 'card_verbal_desc'
  };
  const grpSub = reduceLessonSession(
    session,
    {
      eventId: 'grp-sub-1',
      type: 'GROUP_SUBMIT',
      activityId: 'act-form-19',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-form-four-rep', answer: repMatchAnswer }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: session.clock.lastNow + 100 }
  );
  assert.equal(grpSub.result.ok, true);
  assert.equal(grpSub.result.correct, true);

  // Group reward granted to group wallet, NOT individual wallet
  assert.equal(grpSub.state.gameWallets.groups[grp.id].earned, 30);
  assert.equal(grpSub.state.gameWallets.learners['hs-1'].earned, 0);

  // Group product does NOT count towards individual mastery of obj-t11-19
  const mastery19 = computeObjectiveMastery(grpSub.state.passports['hs-1'], 'obj-t11-19', fixture);
  assert.notEqual(mastery19.status, 'independent_mastery');
  assert.equal(mastery19.independentCount, 0);
});

test('a later wrong group retry cannot overwrite an already-correct shared product', () => {
  let session = createLessonSession({ groupPolicyVersion: 0,
    package: fixture,
    mode: 'preview',
    sessionId: 'group-product-stable',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'A' }, { id: 'hs-2', name: 'B' }, { id: 'hs-3', name: 'C' }, { id: 'hs-4', name: 'D' }],
    rewardPolicy: { groupCorrect: 30 },
    now: 1000
  });
  session = reduceLessonSession(session, { eventId: 'start', type: 'START', round: 1, revision: 0, payload: {} }, { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }).state;
  while (session.timeline.currentActivityId !== 'act-form-19') {
    session = reduceLessonSession(session, { eventId: `next-${session.revision}`, type: 'NEXT', round: 1, revision: session.revision, payload: {} }, { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }).state;
  }
  const answer = { rep_list: 'card_list_18_20_22', rep_explicit: 'card_explicit_formula', rep_recurrence: 'card_recurrence_rel', rep_verbal: 'card_verbal_desc' };
  const first = reduceLessonSession(session, { eventId: 'group-correct', type: 'GROUP_SUBMIT', round: 1, revision: session.revision, activityId: 'act-form-19', payload: { taskId: 'task-form-four-rep', answer } }, { actor: { role: 'student', id: 'hs-1' }, now: session.clock.lastNow + 100 });
  assert.equal(first.result.ok, true);
  const second = reduceLessonSession(first.state, { eventId: 'group-wrong-retry', type: 'GROUP_SUBMIT', round: 1, revision: first.state.revision, activityId: 'act-form-19', payload: { taskId: 'task-form-four-rep', answer: { rep_list: 'wrong' } } }, { actor: { role: 'student', id: 'hs-2' }, now: first.state.clock.lastNow + 100 });
  assert.equal(second.result.preserved, true);
  const product = second.state.groupProducts[`${first.state.groups['act-form-19'].groups[0].id}:task-form-four-rep`];
  assert.equal(product.ok, true);
  assert.deepEqual(product.answer, answer);
  assert.equal(second.state.gameWallets.groups[product.groupId].earned, 30);
});

test('group closed submission rejects a missing checker and revealed group work earns no reward', () => {
  let session = createLessonSession({ groupPolicyVersion: 0, package: fixture, mode: 'preview', sessionId: 'group-reveal', hostId: 'teacher-main', learners: [{ id: 'hs-1' }, { id: 'hs-2' }, { id: 'hs-3' }, { id: 'hs-4' }], rewardPolicy: { groupCorrect: 30 }, now: 1000 });
  const teacher = { role: 'teacher', id: 'teacher-main' };
  const student = { role: 'student', id: 'hs-1' };
  session = reduceLessonSession(session, { eventId: 'start', type: 'START', round: 1, revision: 0, payload: {} }, { actor: teacher, now: 1000 }).state;
  while (session.timeline.currentActivityId !== 'act-form-19') session = reduceLessonSession(session, { eventId: `next-${session.revision}`, type: 'NEXT', round: 1, revision: session.revision, payload: {} }, { actor: teacher, now: session.clock.lastNow + 100 }).state;
  const task = session.package.tasks.find(item => item.id === 'task-form-four-rep');
  const originalChecker = task.evaluation.checkerId;
  delete task.evaluation.checkerId;
  const invalid = reduceLessonSession(session, { eventId: 'bad-checker', type: 'GROUP_SUBMIT', activityId: 'act-form-19', round: 1, revision: session.revision, payload: { taskId: task.id, answer: {} } }, { actor: student, now: session.clock.lastNow + 100 });
  assert.equal(invalid.result.code, 'INVALID_TASK');
  task.evaluation.checkerId = originalChecker;
  session = reduceLessonSession(session, { eventId: 'reveal', type: 'REVEAL', activityId: 'act-form-19', round: 1, revision: session.revision, payload: { taskId: task.id } }, { actor: teacher, now: session.clock.lastNow + 100 }).state;
  const answer = { rep_list: 'card_list_18_20_22', rep_explicit: 'card_explicit_formula', rep_recurrence: 'card_recurrence_rel', rep_verbal: 'card_verbal_desc' };
  const revealed = reduceLessonSession(session, { eventId: 'revealed-group', type: 'GROUP_SUBMIT', activityId: 'act-form-19', round: 1, revision: session.revision, payload: { taskId: task.id, answer } }, { actor: student, now: session.clock.lastNow + 100 });
  assert.equal(revealed.result.correct, true);
  const groupId = revealed.state.groups['act-form-19'].groups[0].id;
  assert.equal(revealed.state.gameWallets.groups[groupId]?.earned || 0, 0);
  assert.equal(Object.values(revealed.state.rewardLedger).some(entry => entry.recipientId === groupId), false);
});

test('branching: student select branch extension requires independent mastery of must objectives', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's1',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'e-start', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  while (session.timeline.currentActivityId !== 'act-prac') {
    session = reduceLessonSession(
      session,
      { eventId: `next-${session.revision}`, type: 'NEXT', round: 1, revision: session.revision, payload: {} },
      { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
    ).state;
  }

  // Student selects support branch -> allowed
  const selSupport = reduceLessonSession(
    session,
    {
      eventId: 'sel-supp',
      type: 'SELECT_BRANCH',
      round: 1,
      revision: session.revision,
      payload: { branch: 'support' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: session.clock.lastNow + 100 }
  );
  assert.equal(selSupport.result.ok, true);
  assert.equal(selSupport.state.branches['act-prac']['hs-1'], 'support');

  // Student attempts extension without mastering must objectives -> BRANCH_LOCKED
  const selExt = reduceLessonSession(
    selSupport.state,
    {
      eventId: 'sel-ext',
      type: 'SELECT_BRANCH',
      round: 1,
      revision: selSupport.state.revision,
      payload: { branch: 'extension' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: selSupport.state.clock.lastNow + 100 }
  );
  assert.equal(selExt.result.ok, false);
  assert.equal(selExt.result.code, 'BRANCH_LOCKED');

  // Teacher SET_BRANCH support or core allowed; teacher cannot set extension
  const teachCore = reduceLessonSession(
    session,
    {
      eventId: 'teach-core',
      type: 'SET_BRANCH',
      round: 1,
      revision: session.revision,
      payload: { learnerId: 'hs-1', branch: 'core' }
    },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
  );
  assert.equal(teachCore.result.ok, true);
  assert.equal(teachCore.state.branches['act-prac']['hs-1'], 'core');
});

test('server deterministic dice roll clamps at core checkpoint and rejects client forgery', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's1',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'e-start', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  // Student trying to forge roll payload (dieValue: 6) -> rejected
  const forged = reduceLessonSession(
    session,
    {
      eventId: 'roll-forge',
      type: 'ROLL',
      round: 1,
      revision: session.revision,
      payload: { dieValue: 6, grantsMastery: true }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: session.clock.lastNow + 100 }
  );
  assert.equal(forged.result.ok, false);
  assert.equal(forged.result.code, 'INVALID_EVENT');

  // Legitimate roll with empty payload
  const rollRes = reduceLessonSession(
    session,
    {
      eventId: 'roll-ok',
      type: 'ROLL',
      round: 1,
      revision: session.revision,
      payload: {}
    },
    { actor: { role: 'student', id: 'hs-1' }, now: session.clock.lastNow + 100 }
  );
  assert.equal(rollRes.result.ok, true);
  assert.ok(rollRes.result.position >= 1 && rollRes.result.position <= 8);
});

test('dice roll consumes carry in the same route coordinate units', () => {
  let session = createLessonSession({
    package: fixture, mode: 'preview', sessionId: 'carry', hostId: 'teacher-main',
    learners: [{ id: 'hs-1' }], now: 1000
  });
  session = reduceLessonSession(session, {
    eventId: 'start-carry', type: 'START', round: 1, revision: 0, payload: {}
  }, { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }).state;
  session.diceTrack['hs-1'] = { position: 6, carry: 3, rolls: 0, slow: false, boost: false };
  const result = reduceLessonSession(session, {
    eventId: 'roll-carry', type: 'ROLL', round: 1, revision: session.revision, payload: {}
  }, { actor: { role: 'student', id: 'hs-1' }, now: 1100 });
  assert.equal(result.result.ok, true);
  assert.equal(result.state.diceTrack['hs-1'].position, 8);
  assert.equal(result.state.diceTrack['hs-1'].carry, 5);
});

test('serializers: teacher full view, student privacy and presenter anonymity', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's1',
    hostId: 'teacher-main',
    learners: [
      { id: 'hs-1', name: 'Học sinh 1' },
      { id: 'hs-2', name: 'Học sinh 2' }
    ],
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'e-start', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  const teacherView = serializeForTeacher(session);
  const studentView = serializeForStudent(session, 'hs-1');
  const presenterView = serializeForPresenter(session);

  // Teacher sees full package evaluation and all passports
  assert.ok(teacherView.tasks.some(t => t.evaluation?.answerKey !== undefined));
  assert.ok(teacherView.passports['hs-1']);
  assert.ok(teacherView.passports['hs-2']);

  // Student view strips answerKey and only sees own passport
  assert.ok(studentView.tasks.every(t => t.evaluation?.answerKey === undefined));
  assert.ok(studentView.passport);
  assert.equal(studentView.passport.learnerId, 'hs-1');
  assert.equal(studentView.passports, undefined);

  // Presenter view strips answerKey, student names, and individual passports
  assert.ok(presenterView.tasks.every(t => t.evaluation?.answerKey === undefined));
  assert.equal(presenterView.passports, undefined);
  assert.equal(presenterView.roster, undefined);
});

test('student projection keeps individual wallet separate and strips private projection fields', () => {
  const state = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 'wallet-contract',
    hostId: 'teacher-main',
    learners: [{ id: 'hs1' }, { id: 'otherlearner' }],
    now: 1000
  });
  state.timeline.currentActivityId = 'act-form-19';
  state.timeline.activityIndex = state.package.activities.findIndex((activity) => activity.id === 'act-form-19');
  state.passports.otherlearner = { learnerId: 'otherlearner', passport: 'do not leak' };
  state.gameWallets.learners.hs1 = { earned: 11, bonus: 1, private: 999 };
  state.gameWallets.learners.otherlearner = { earned: 77, bonus: 0 };
  state.gameWallets.groups['group-1'] = { earned: 22, bonus: 2, othergroup: 999 };
  state.gameWallets.groups.othergroup = { earned: 999, bonus: 99 };
  state.gameWallets.groups.previousgroup = { earned: 888, bonus: 88 };
  state.groups.previousActivity = { groups: [{ id: 'previousgroup', memberIds: ['hs1'] }] };
  state.groups['act-form-19'] = {
    selectionDeadline: 2000,
    groups: [
      { id: 'othergroup', memberIds: ['otherlearner'], roles: {}, contributions: [] },
      { id: 'group-1', memberIds: ['hs1'], roles: {}, contributions: [], private: 'strip me' }
    ]
  };

  const view = serializeForStudent(state, 'hs1');
  assert.deepEqual(view.wallet, { earned: 11, bonus: 1 });
  assert.deepEqual(view.group.wallet, { earned: 22, bonus: 2 });
  assert.equal(JSON.stringify(view).includes('999'), false);
  assert.equal(view.group.private, undefined);
  assert.deepEqual(view.passport, state.passports.hs1);
  assert.equal(view.passports, undefined);
  assert.equal(view.gameWallets, undefined);
  assert.equal(view.groups, undefined);
  assert.equal(JSON.stringify(view).includes('otherlearner'), false);
  assert.equal(JSON.stringify(view).includes('previousgroup'), false);
  view.wallet.earned = 50;
  view.group.wallet.earned = 60;
  assert.equal(state.gameWallets.learners.hs1.earned, 11);
  assert.equal(state.gameWallets.groups['group-1'].earned, 22);

  delete state.groups['act-form-19'];
  assert.equal(serializeForStudent(state, 'hs1').group, null);
  assert.deepEqual(serializeForStudent(state, 'hs1').wallet, { earned: 11, bonus: 1 });
  delete state.gameWallets.learners.hs1;
  assert.deepEqual(serializeForStudent(state, 'hs1').wallet, { earned: 0, bonus: 0 });
});

test('student wallets only project finite earned and bonus numbers', () => {
  for (const invalid of [undefined, null, '11', { private: 'secret' }, NaN, Infinity]) {
    const state = {
      timeline: { currentActivityId: 'activity' },
      groups: { activity: { groups: [{ id: 'group', memberIds: ['hs1'], roles: {} }] } },
      gameWallets: {
        learners: { hs1: { earned: invalid, bonus: invalid, private: 'secret' } },
        groups: { group: { earned: invalid, bonus: invalid, private: 'secret' } }
      }
    };
    const view = serializeForStudent(state, 'hs1');
    assert.deepEqual(view.wallet, { earned: 0, bonus: 0 });
    assert.deepEqual(view.group.wallet, { earned: 0, bonus: 0 });
  }
});

test('student extension projection is display-safe and runtime denies unauthorized selection', () => {
  const state = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 'extension-contract',
    hostId: 'teacher-main',
    learners: [{ id: 'hs1' }],
    now: 1000
  });
  state.timeline.currentActivityId = 'act-extension';
  state.timeline.activityIndex = state.package.activities.findIndex((activity) => activity.id === 'act-extension');
  state.status = 'active';
  state.clock.activityDeadline = 2000;
  const view = serializeForStudent(state, 'hs1');
  assert.deepEqual(view.extension, {
    authored: true,
    eligible: false,
    reasonCode: 'MUST_OBJECTIVES_NOT_INDEPENDENT',
    displaySafe: true
  });
  assert.equal(view.tasks.some((task) => task.branch === 'extension'), false);
  const denied = reduceLessonSession(state, {
    eventId: 'extension-denied', type: 'SELECT_BRANCH', round: 1, revision: 0,
    payload: { branch: 'extension' }
  }, { actor: { role: 'student', id: 'hs1' }, now: 1000 });
  assert.equal(denied.result.ok, false);
  assert.equal(denied.result.code, 'BRANCH_LOCKED');
  assert.strictEqual(denied.state, state);

  const activity = state.package.activities[state.timeline.activityIndex];
  const extensionTask = state.package.tasks.find((task) => activity.taskIds.includes(task.id) && task.branch === 'extension');
  assert.ok(extensionTask);
  state.reveals[extensionTask.id] = { revealed: true };
  extensionTask.prompt = 'EXTENSION_PROMPT_SENTINEL';
  extensionTask.evaluation.answerKey = 'EXTENSION_ANSWER_SENTINEL';

  // Seed genuine independent evidence through the passport helper, not cached mastery flags.
  for (const rule of state.package.evidenceRules) {
    if (!rule.countsForMastery || !state.package.masteryPolicy.masterySources.includes(rule.kind)) continue;
    state.passports.hs1 = recordTaskSubmission(state.passports.hs1, {
      submissionId: `evidence-${rule.taskId}`, taskId: rule.taskId,
      activityId: 'evidence-activity', answer: 'own answer', ok: true,
      assessmentStatus: 'assessed', assisted: false, evidenceIds: [rule.id], now: 1000
    }, state.package);
  }
  const eligibleView = serializeForStudent(state, 'hs1');
  assert.deepEqual(eligibleView.extension, { authored: true, eligible: true, reasonCode: null, displaySafe: true });
  assert.deepEqual(eligibleView.extension, extensionEligibility({ activity, package: state.package, passport: state.passports.hs1 }));
  assert.equal(JSON.stringify(eligibleView).includes('EXTENSION_'), false);
  assert.equal(eligibleView.tasks.some((task) => task.id === extensionTask.id), false);

  const selected = reduceLessonSession(state, {
    eventId: 'extension-allowed', type: 'SELECT_BRANCH', round: 1, revision: 0,
    payload: { branch: 'extension' }
  }, { actor: { role: 'student', id: 'hs1' }, now: 1000 });
  assert.equal(selected.result.ok, true);
  const selectedView = serializeForStudent(selected.state, 'hs1');
  assert.equal(selectedView.branch, 'extension');
  assert.equal(selectedView.tasks.find((task) => task.id === extensionTask.id).prompt, 'EXTENSION_PROMPT_SENTINEL');
  assert.equal(selectedView.tasks.find((task) => task.id === extensionTask.id).evaluation.answerKey, 'EXTENSION_ANSWER_SENTINEL');

  // An extension elsewhere in the package must not unlock the current activity.
  activity.taskIds = activity.taskIds.filter((id) => id !== extensionTask.id);
  const unauthoredView = serializeForStudent(state, 'hs1');
  assert.deepEqual(unauthoredView.extension, { authored: false, eligible: false, reasonCode: 'NO_AUTHORED_EXTENSION', displaySafe: true });
  assert.deepEqual(unauthoredView.extension, extensionEligibility({ activity, package: state.package, passport: state.passports.hs1 }));
  const unauthoredDenied = reduceLessonSession(state, {
    eventId: 'extension-not-authored', type: 'SELECT_BRANCH', round: 1, revision: 0,
    payload: { branch: 'extension' }
  }, { actor: { role: 'student', id: 'hs1' }, now: 1000 });
  assert.equal(unauthoredDenied.result.code, 'BRANCH_LOCKED');
  assert.strictEqual(unauthoredDenied.state, state);
});

test('the authored pilot has a reachable optional extension between recheck and exit', () => {
  const index = fixture.activities.findIndex(activity => activity.taskIds.some(id => fixture.tasks.some(task => task.id === id && task.branch === 'extension')));
  assert.ok(index > fixture.activities.findIndex(activity => activity.phase === 'recheck'));
  assert.ok(index < fixture.activities.findIndex(activity => activity.phase === 'exit'));
  assert.equal(fixture.activities[index].budgetRole, 'optional');
  assert.equal(fixture.budget.coreMinutes + fixture.budget.reserveMinutes + fixture.budget.optionalMinutes + fixture.budget.transitionMinutes, 40);
});

test('real recheck opens the optional extension before exit without granting final mastery', () => {
  let session = createLessonSession({ package: fixture, mode: 'preview', sessionId: 'real-extension-route', hostId: 'teacher-main', learners: [{ id: 'hs-1' }, { id: 'hs-2' }], now: 1000 });
  let eventCount = 0;
  const teacher = { role: 'teacher', id: 'teacher-main' };
  const learner = { role: 'student', id: 'hs-1' };
  const step = (type, payload = {}, actor = teacher) => {
    const reduced = reduceLessonSession(session, { eventId: `route-${++eventCount}`, type, round: session.round, revision: session.revision, activityId: session.timeline.currentActivityId, payload }, { actor, now: session.clock.lastNow + 100 });
    assert.equal(reduced.result.ok, true, `${type}: ${reduced.result.code}`);
    session = reduced.state;
    return reduced.result;
  };
  step('START');
  while (session.timeline.currentActivityId !== 'act-recheck') step('NEXT');
  step('SUBMIT', { taskId: 'task-recheck-18', answer: 'opt_recheck_infinite' }, learner);
  const recheck = step('SUBMIT', { taskId: 'task-recheck-19', answer: '4,7,10,13; w_n=3n+1; w_1=4, w_n=w_(n-1)+3, n>=2; bắt đầu 4, tăng 3; kiểm n=1,2,3.' }, learner);
  assert.equal(recheck.pending, true);
  step('NEXT');
  assert.equal(session.timeline.currentActivityId, 'act-extension');
  assert.equal(serializeForStudent(session, 'hs-1').extension.eligible, false);
  step('ASSESS', { submissionId: recheck.submissionId, criteriaMet: true, feedback: 'Đủ bốn biểu diễn và kiểm chứng độc lập.' });
  assert.equal(serializeForStudent(session, 'hs-1').extension.eligible, true);
  assert.equal(serializeForStudent(session, 'hs-2').extension.eligible, false);
  for (const objective of fixture.objectives) assert.notEqual(computeObjectiveMastery(session.passports['hs-1'], objective.id, fixture).status, 'independent_mastery');
  step('SELECT_BRANCH', { branch: 'extension' }, learner);
  const extension = step('SUBMIT', { taskId: 'task-prac-ext-rules', answer: 30 }, learner);
  assert.equal(extension.correct, true);
  for (const objective of fixture.objectives) assert.notEqual(computeObjectiveMastery(session.passports['hs-1'], objective.id, fixture).status, 'independent_mastery');
  step('PAUSE');
  assert.equal(session.status, 'paused');
  step('NEXT');
  assert.equal(session.timeline.currentActivityId, 'act-exit');
  assert.ok(session.passports['hs-1'].submissions.some(submission => submission.taskId === 'task-prac-ext-rules'));
  step('RESUME');
  const exit = step('SUBMIT', { taskId: 'task-exit-ticket', answer: 'n là vị trí; u_n là giá trị số hạng. Ví dụ w_n=3n+1, n=1 cho w_1=4, n=2 cho w_2=7.' }, learner);
  step('ASSESS', { submissionId: exit.submissionId, criteriaMet: true, feedback: 'Đạt độc lập.' });
  for (const objective of fixture.objectives) assert.equal(computeObjectiveMastery(session.passports['hs-1'], objective.id, fixture).status, 'independent_mastery');
});

test('late join, leave and rejoin preserves evidence and identity', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's1',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'e-start', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  // Add late learner hs-2
  session = reduceLessonSession(
    session,
    {
      eventId: 'add-hs2',
      type: 'ADD_LEARNER',
      round: 1,
      revision: session.revision,
      payload: { learner: { id: 'hs-2', name: 'Học sinh 2', deviceId: 'dev-2' } }
    },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
  ).state;
  assert.ok(session.roster['hs-2']);
  assert.ok(session.passports['hs-2']);

  // hs-2 leaves
  session = reduceLessonSession(
    session,
    {
      eventId: 'leave-hs2',
      type: 'LEAVE_LEARNER',
      round: 1,
      revision: session.revision,
      payload: { learnerId: 'hs-2' }
    },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
  ).state;
  assert.equal(session.roster['hs-2'].present, false);

  // hs-2 rejoins with same ID
  session = reduceLessonSession(
    session,
    {
      eventId: 'rejoin-hs2',
      type: 'ADD_LEARNER',
      round: 1,
      revision: session.revision,
      payload: { learner: { id: 'hs-2', name: 'Học sinh 2', deviceId: 'dev-new' } }
    },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
  ).state;
  assert.equal(session.roster['hs-2'].present, true);
  assert.equal(session.roster['hs-2'].deviceId, 'dev-new');

  // Attempting to rename hs-2 with conflicting name rejected
  const conflictRename = reduceLessonSession(
    session,
    {
      eventId: 'rename-hs2',
      type: 'ADD_LEARNER',
      round: 1,
      revision: session.revision,
      payload: { learner: { id: 'hs-2', name: 'Tên Khác' } }
    },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
  );
  assert.equal(conflictRename.result.ok, false);
  assert.equal(conflictRename.result.code, 'INVALID_LEARNER');
});

test('session conclusion preserves incomplete state without auto mastery', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's1',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'e-start', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  session = reduceLessonSession(
    session,
    { eventId: 'e-conclude', type: 'CONCLUDE', round: 1, revision: session.revision, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
  ).state;
  assert.equal(session.status, 'concluded');

  // Any subsequent command after conclusion rejected
  const afterConclude = reduceLessonSession(
    session,
    {
      eventId: 'sub-after',
      type: 'SUBMIT',
      activityId: 'act-exp',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-exp-predict', answer: 'opt_finite_seat' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: session.clock.lastNow + 100 }
  );
  assert.equal(afterConclude.result.ok, false);
  assert.equal(afterConclude.result.code, 'SESSION_CONCLUDED');
});

test('JSON round-trip deterministic transitions: serialization preserves exact state and operations', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's-json-rt',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    now: 1000
  });

  // Start session
  session = reduceLessonSession(
    session,
    { eventId: 'start-json', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  // JSON round-trip
  const jsonStr = JSON.stringify(session);
  const rehydrated = JSON.parse(jsonStr);

  // Run next event on both original and rehydrated
  const submitEvent = {
    eventId: 'sub-json',
    type: 'SUBMIT',
    activityId: 'act-exp',
    round: 1,
    revision: 1,
    payload: { taskId: 'task-exp-predict', answer: 'opt_finite_seat' }
  };

  const resOriginal = reduceLessonSession(session, submitEvent, { actor: { role: 'student', id: 'hs-1' }, now: 2000 });
  const resRehydrated = reduceLessonSession(rehydrated, submitEvent, { actor: { role: 'student', id: 'hs-1' }, now: 2000 });

  assert.deepEqual(resOriginal.result, resRehydrated.result);
  assert.deepEqual(resOriginal.state, resRehydrated.state);
});

test('grouping supports 1, 2, 3, 5, and 26 learners and covers 4 generic functions', () => {
  const dummyAct = { id: 'act-group-test' };

  for (const n of [1, 2, 3, 5, 26]) {
    const learners = Array.from({ length: n }, (_, i) => ({ id: `hs-${i + 1}`, name: `Học sinh ${i + 1}` }));
    const groupState = createActivityGroups({ activity: dummyAct, learners, now: 1000 });
    const assigned = autoAssignRemainingRoles(groupState, { now: 2000, seed: 12345 });

    assert.ok(assigned.groups.length >= 1);
    for (const g of assigned.groups) {
      assert.ok(g.memberIds.length >= 1);
      // All 4 generic functions must be covered in every group with members
      for (const roleDef of ROLE_DEFINITIONS) {
        assert.ok(g.roles[roleDef.id], `Group ${g.id} (size ${n}) must cover role ${roleDef.id}`);
        assert.ok(g.memberIds.includes(g.roles[roleDef.id]));
      }
    }
  }
});

test('full objective mastery: independent recheck + assessed open exit achieves independent_mastery', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's-mastery',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'e-start', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  // Advance to act-recheck
  while (session.timeline.currentActivityId !== 'act-recheck') {
    session = reduceLessonSession(
      session,
      { eventId: `next-${session.revision}`, type: 'NEXT', round: 1, revision: session.revision, payload: {} },
      { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
    ).state;
  }

  // 1. Solve task-recheck-18 unassisted (closed task)
  session = reduceLessonSession(
    session,
    {
      eventId: 'sub-recheck-18',
      type: 'SUBMIT',
      activityId: 'act-recheck',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-recheck-18', answer: 'opt_recheck_infinite' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: session.clock.lastNow + 100 }
  ).state;

  // 2. Solve task-recheck-19 unassisted (open task)
  session = reduceLessonSession(
    session,
    {
      eventId: 'sub-recheck-19',
      type: 'SUBMIT',
      activityId: 'act-recheck',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-recheck-19', answer: '4 cách biểu diễn que tính' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: session.clock.lastNow + 100 }
  ).state;

  // Teacher assesses task-recheck-19 as criteriaMet: true
  const sub19Id = Object.keys(session.openAssessments).find((k) => session.openAssessments[k].taskId === 'task-recheck-19');
  session = reduceLessonSession(
    session,
    {
      eventId: 'assess-19',
      type: 'ASSESS',
      round: 1,
      revision: session.revision,
      payload: { submissionId: sub19Id, criteriaMet: true, feedback: 'Xuất sắc' }
    },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
  ).state;

  // Advance to optional extension, then to act-exit. Extension is optional and not mastery evidence.
  session = reduceLessonSession(
    session,
    { eventId: `next-${session.revision}`, type: 'NEXT', round: 1, revision: session.revision, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
  ).state;
  assert.equal(session.timeline.currentActivityId, 'act-extension');
  session = reduceLessonSession(
    session,
    { eventId: `next-extension-${session.revision}`, type: 'NEXT', round: 1, revision: session.revision, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
  ).state;
  assert.equal(session.timeline.currentActivityId, 'act-exit');

  // 3. Submit task-exit-ticket (open task)
  session = reduceLessonSession(
    session,
    {
      eventId: 'sub-exit',
      type: 'SUBMIT',
      activityId: 'act-exit',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-exit-ticket', answer: 'Phân biệt n và u_n' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: session.clock.lastNow + 100 }
  ).state;

  // Teacher assesses task-exit-ticket as criteriaMet: true
  const subExitId = Object.keys(session.openAssessments).find((k) => session.openAssessments[k].taskId === 'task-exit-ticket');
  session = reduceLessonSession(
    session,
    {
      eventId: 'assess-exit',
      type: 'ASSESS',
      round: 1,
      revision: session.revision,
      payload: { submissionId: subExitId, criteriaMet: true, feedback: 'Đạt chuẩn' }
    },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
  ).state;

  // Verify independent mastery on both objectives
  const mastery18 = computeObjectiveMastery(session.passports['hs-1'], 'obj-t11-18', fixture);
  assert.equal(mastery18.status, 'independent_mastery');
  assert.ok(mastery18.independentCount >= 2);

  const mastery19 = computeObjectiveMastery(session.passports['hs-1'], 'obj-t11-19', fixture);
  assert.equal(mastery19.status, 'independent_mastery');
  assert.ok(mastery19.independentCount >= 2);
});

test('cache spoofing: different actors using same eventId do not collide or replay', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's-spoof',
    hostId: 'teacher-main',
    learners: [
      { id: 'hs-1', name: 'Học sinh 1' },
      { id: 'hs-2', name: 'Học sinh 2' }
    ],
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'e-start', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  // hs-1 submits with eventId 'common-event-1'
  const res1 = reduceLessonSession(
    session,
    {
      eventId: 'common-event-1',
      type: 'SUBMIT',
      activityId: 'act-exp',
      round: 1,
      revision: 1,
      payload: { taskId: 'task-exp-predict', answer: 'opt_finite_seat' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: 2000 }
  );
  assert.equal(res1.result.ok, true);
  assert.equal(res1.result.replay, false);

  // hs-2 submits with same eventId 'common-event-1' (different actor)
  const res2 = reduceLessonSession(
    res1.state,
    {
      eventId: 'common-event-1',
      type: 'SUBMIT',
      activityId: 'act-exp',
      round: 1,
      revision: 2,
      payload: { taskId: 'task-exp-predict', answer: 'opt_infinite_seat' }
    },
    { actor: { role: 'student', id: 'hs-2' }, now: 2500 }
  );
  assert.equal(res2.result.ok, true);
  assert.equal(res2.result.replay, false);
  assert.equal(res2.result.correct, false);
});

test('serializer recursive privacy: student and presenter serializers strip answerKey, secrets, and other learners data', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's-privacy',
    hostId: 'teacher-main',
    learners: [
      { id: 'hs-1', name: 'Học sinh 1' },
      { id: 'hs-2', name: 'Học sinh 2' }
    ],
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'e-start', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  session = reduceLessonSession(
    session,
    {
      eventId: 'sub-hs1',
      type: 'SUBMIT',
      activityId: 'act-exp',
      round: 1,
      revision: 1,
      payload: { taskId: 'task-exp-predict', answer: 'opt_finite_seat' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: 2000 }
  ).state;

  const studentView = serializeForStudent(session, 'hs-2');
  const presenterView = serializeForPresenter(session);

  function assertNoSecrets(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
      assert.notEqual(k, 'answerKey', `answerKey must not be exposed at ${path}.${k}`);
      assert.notEqual(k, 'lookFor', `rubric.lookFor must not be exposed at ${path}.${k}`);
      assert.notEqual(k, 'eventCache', `eventCache must not be exposed at ${path}.${k}`);
      assert.notEqual(k, 'rewardLedger', `rewardLedger must not be exposed at ${path}.${k}`);
      if (typeof v === 'object' && v !== null) {
        assertNoSecrets(v, `${path}.${k}`);
      }
    }
  }

  assertNoSecrets(studentView, 'studentView');
  assertNoSecrets(presenterView, 'presenterView');

  // Verify hs-2 cannot see hs-1's submissions
  const subLearnerIds = (studentView.submissions || []).map((s) => s.learnerId);
  assert.ok(!subLearnerIds.includes('hs-1'));
});

test('pure helpers: createLearnerPassport, recordHintAssistance, recordTaskSubmission, chooseGroupRole', () => {
  let p = createLearnerPassport('learner-unit-test', fixture);
  assert.equal(p.learnerId, 'learner-unit-test');
  assert.deepEqual(p.submissions, []);
  assert.deepEqual(p.supportHistory, []);

  p = recordHintAssistance(p, { taskId: 'task-exp-predict', hintId: 'hint-exp-1', tier: 'H1', now: 1000 });
  assert.equal(p.supportHistory.length, 1);
  assert.equal(p.supportHistory[0].tier, 'H1');

  p = recordTaskSubmission(
    p,
    {
      submissionId: 'sub-unit-1',
      taskId: 'task-exp-predict',
      activityId: 'act-exp',
      answer: 'opt_finite_seat',
      ok: true,
      assessmentStatus: 'assessed',
      assisted: false,
      evidenceIds: ['ev-exp-pred'],
      now: 1200
    },
    fixture
  );
  assert.equal(p.submissions.length, 1);
  // Hint was used so assisted should be true
  assert.equal(p.submissions[0].assisted, true);

  // Group role choosing
  const grpState = createActivityGroups({
    activity: { id: 'act-unit' },
    learners: [{ id: 'l-1' }, { id: 'l-2' }],
    now: 1000
  });
  const updatedGrp = chooseGroupRole(grpState, { learnerId: 'l-1', roleId: 'discover', now: 1100 });
  assert.equal(updatedGrp.groups[0].roles.discover, 'l-1');
});

test('repro 1: GROUP_SUBMIT rejected for individual/future task and individual SUBMIT rejected for group task', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's-repro-1',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'start-1', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  // In act-exp, missing activityId on SUBMIT fails closed with STALE_ACTIVITY
  const missingAct = reduceLessonSession(
    session,
    {
      eventId: 'sub-missing-act',
      type: 'SUBMIT',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-exp-predict', answer: 'opt_finite_seat' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: 1100 }
  );
  assert.equal(missingAct.result.ok, false);
  assert.equal(missingAct.result.code, 'STALE_ACTIVITY');

  // Advance to group activity act-form-19
  while (session.timeline.currentActivityId !== 'act-form-19') {
    session = reduceLessonSession(
      session,
      { eventId: `next-${session.revision}`, type: 'NEXT', round: 1, revision: session.revision, payload: {} },
      { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
    ).state;
  }

  // GROUP_SUBMIT targeting future task task-recheck-18 must be rejected
  const futureGrpSub = reduceLessonSession(
    session,
    {
      eventId: 'grp-future',
      type: 'GROUP_SUBMIT',
      activityId: 'act-form-19',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-recheck-18', answer: 'opt_recheck_infinite' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: session.clock.lastNow + 100 }
  );
  assert.equal(futureGrpSub.result.ok, false);
  assert.equal(futureGrpSub.result.code, 'TASK_NOT_AVAILABLE');

  // Individual SUBMIT targeting group task task-form-four-rep must be rejected
  const indSubForGrp = reduceLessonSession(
    session,
    {
      eventId: 'ind-for-grp',
      type: 'SUBMIT',
      activityId: 'act-form-19',
      round: 1,
      revision: session.revision,
      payload: {
        taskId: 'task-form-four-rep',
        answer: {
          rep_list: 'card_list_18_20_22',
          rep_explicit: 'card_explicit_formula',
          rep_recurrence: 'card_recurrence_rel',
          rep_verbal: 'card_verbal_desc'
        }
      }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: session.clock.lastNow + 100 }
  );
  assert.equal(indSubForGrp.result.ok, false);
  assert.equal(indSubForGrp.result.code, 'TASK_NOT_AVAILABLE');

  // GROUP_CONTRIBUTE targeting non-group task must be rejected
  const badContrib = reduceLessonSession(
    session,
    {
      eventId: 'bad-contrib',
      type: 'GROUP_CONTRIBUTE',
      activityId: 'act-form-19',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-recheck-18', text: 'nội dung' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: session.clock.lastNow + 100 }
  );
  assert.equal(badContrib.result.ok, false);
  assert.equal(badContrib.result.code, 'TASK_NOT_AVAILABLE');
});

test('repro 2: hint serializer renders h.text and scopes opened hints strictly to target task', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's-repro-2',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'start-2', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  // Open hint on task-exp-predict
  session = reduceLessonSession(
    session,
    {
      eventId: 'hint-exp',
      type: 'HINT',
      activityId: 'act-exp',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-exp-predict', hintId: 'hint-exp-1' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: 1100 }
  ).state;

  const studentView = serializeForStudent(session, 'hs-1');
  const expTask = studentView.tasks.find((t) => t.id === 'task-exp-predict');
  assert.ok(expTask);
  assert.ok(expTask.openedHints && expTask.openedHints.length === 1);
  assert.equal(typeof expTask.openedHints[0].text, 'string');
  assert.ok(expTask.openedHints[0].text.length > 0);
  assert.equal(expTask.openedHints[0].text, fixture.hints.find((h) => h.id === 'hint-exp-1').text);

  // Advance to act-pre
  session = reduceLessonSession(
    session,
    { eventId: `next-${session.revision}`, type: 'NEXT', round: 1, revision: session.revision, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
  ).state;

  const preView = serializeForStudent(session, 'hs-1');
  for (const t of preView.tasks) {
    assert.equal(t.openedHints, undefined, `Task ${t.id} must not inherit openedHints from task-exp-predict`);
  }
});

test('repro 3: own group products and contributions are exposed to own group members in student serializer', () => {
  const learners = [
    { id: 'hs-1', name: 'Học sinh 1' },
    { id: 'hs-2', name: 'Học sinh 2' }
  ];
  let session = createLessonSession({ groupPolicyVersion: 0,
    package: fixture,
    mode: 'preview',
    sessionId: 's-repro-3',
    hostId: 'teacher-main',
    learners,
    rewardPolicy: { individualCorrect: 0, groupCorrect: 10 },
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'start-3', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  while (session.timeline.currentActivityId !== 'act-form-19') {
    session = reduceLessonSession(
      session,
      { eventId: `next-${session.revision}`, type: 'NEXT', round: 1, revision: session.revision, payload: {} },
      { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
    ).state;
  }

  // hs-1 contributes
  session = reduceLessonSession(
    session,
    {
      eventId: 'contrib-1',
      type: 'GROUP_CONTRIBUTE',
      activityId: 'act-form-19',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-form-four-rep', text: 'Đóng góp của hs-1' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: session.clock.lastNow + 100 }
  ).state;

  // hs-2 submits group product
  session = reduceLessonSession(
    session,
    {
      eventId: 'grp-sub',
      type: 'GROUP_SUBMIT',
      activityId: 'act-form-19',
      round: 1,
      revision: session.revision,
      payload: {
        taskId: 'task-form-four-rep',
        answer: {
          rep_list: 'card_list_18_20_22',
          rep_explicit: 'card_explicit_formula',
          rep_recurrence: 'card_recurrence_rel',
          rep_verbal: 'card_verbal_desc'
        }
      }
    },
    { actor: { role: 'student', id: 'hs-2' }, now: session.clock.lastNow + 100 }
  ).state;

  // hs-1 checks view: can see shared contributions and group product
  const view1 = serializeForStudent(session, 'hs-1');
  assert.ok(view1.group);
  assert.ok(view1.group.contributions && view1.group.contributions.length === 1);
  assert.equal(view1.group.contributions[0].text, 'Đóng góp của hs-1');
  assert.ok(view1.group.products && view1.group.products['task-form-four-rep']);
  assert.equal(view1.group.products['task-form-four-rep'].ok, true);

  // hs-2 checks view: can see shared contributions from hs-1 and group product
  const view2 = serializeForStudent(session, 'hs-2');
  assert.ok(view2.group);
  assert.ok(view2.group.contributions && view2.group.contributions.length === 1);
  assert.equal(view2.group.contributions[0].learnerId, 'hs-1');
  assert.ok(view2.group.products && view2.group.products['task-form-four-rep']);
});

test('repro 4: LEAVE_LEARNER then TICK does not assign roles to absent learner', () => {
  const learners = [
    { id: 'hs-1', name: 'Học sinh 1' },
    { id: 'hs-2', name: 'Học sinh 2' },
    { id: 'hs-3', name: 'Học sinh 3' }
  ];
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's-repro-4',
    hostId: 'teacher-main',
    learners,
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'start-4', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  while (session.timeline.currentActivityId !== 'act-form-19') {
    session = reduceLessonSession(
      session,
      { eventId: `next-${session.revision}`, type: 'NEXT', round: 1, revision: session.revision, payload: {} },
      { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
    ).state;
  }

  // hs-2 leaves the lesson
  session = reduceLessonSession(
    session,
    {
      eventId: 'leave-2',
      type: 'LEAVE_LEARNER',
      round: 1,
      revision: session.revision,
      payload: { learnerId: 'hs-2' }
    },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
  ).state;

  // Role window closes, TICK assigns remaining roles
  session = reduceLessonSession(
    session,
    {
      eventId: 'tick-roles-absent',
      type: 'TICK',
      round: 1,
      revision: session.revision,
      payload: {}
    },
    { actor: { role: 'system', id: 'system' }, now: session.groups['act-form-19'].selectionDeadline + 1000 }
  ).state;

  const groupRoles = session.groups['act-form-19'].groups[0].roles;
  for (const [rId, mId] of Object.entries(groupRoles)) {
    assert.notEqual(mId, 'hs-2', `Role ${rId} must not be assigned to absent learner hs-2`);
  }
});

test('repro 5: inputSchema sanitize strips injected keys and teacher view strips secrets/cache', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's-repro-5',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'start-5', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  // Injected malicious keys into package tasks
  const tamperedSession = JSON.parse(JSON.stringify(session));
  tamperedSession.package.tasks[0].inputSchema.options[0].answerKey = 'SECRET_ANSWER_KEY';
  tamperedSession.package.tasks[0].inputSchema.options[0].serverToken = 'SECRET_TOKEN';
  tamperedSession.package.tasks[0].inputSchema.injectedKey = 'MALICIOUS_KEY';
  tamperedSession.package.tasks[0].unknownTaskField = 'LEAK_TASK_FIELD';
  tamperedSession.package.worker = { clientToken: 'SECRET_CLIENT_TOKEN' };
  tamperedSession.package.unknownMetadata = { secret: 'LEAK_METADATA' };

  const studentView = serializeForStudent(tamperedSession, 'hs-1');
  const task0 = studentView.tasks[0];
  assert.equal(task0.inputSchema.injectedKey, undefined);
  assert.equal(task0.inputSchema.options[0].answerKey, undefined);
  assert.equal(task0.inputSchema.options[0].serverToken, undefined);
  assert.deepEqual(Object.keys(task0.inputSchema.options[0]).sort(), ['id', 'label']);

  const teacherView = serializeForTeacher(tamperedSession);
  assert.equal(teacherView.seed, undefined, 'seed must not leak to teacher view');
  assert.equal(teacherView.eventCache, undefined, 'eventCache must not leak to teacher view');
  assert.equal(teacherView.rewardLedger, undefined, 'rewardLedger must not leak to teacher view');
  assert.equal(teacherView.packageHash, undefined, 'packageHash must be removed in favor of contentHash');
  assert.equal(teacherView.contentHash, session.package.contentHash, 'contentHash must be present');
  assert.equal(teacherView.package?.worker, undefined, 'package.worker must not leak to teacher view');
  assert.equal(teacherView.package?.unknownMetadata, undefined, 'nested unknown package metadata must not leak to teacher view');
  assert.equal(teacherView.package?.tasks[0].unknownTaskField, undefined, 'nested unknown task field must not leak to teacher view');
  assert.equal(teacherView.package?.tasks[0].inputSchema.options[0].serverToken, undefined, 'nested inputSchema option token must not leak to teacher view');
  assert.equal(teacherView.package?.tasks[0].inputSchema.injectedKey, undefined, 'nested inputSchema injected key must not leak to teacher view');
  assert.equal(teacherView.tasks[0].unknownTaskField, undefined, 'projected task unknown field must not leak to teacher view');
  assert.equal(teacherView.tasks[0].inputSchema.options[0].serverToken, undefined, 'projected task inputSchema option token must not leak to teacher view');
});

test('repro 6: actor authorization check precedes clock check', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's-repro-6',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'start-6', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  // An unauthorized actor with clock going backward (now: 500 < lastNow: 1000)
  const res = reduceLessonSession(
    session,
    {
      eventId: 'unauth-clock',
      type: 'SUBMIT',
      activityId: 'act-exp',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-exp-predict', answer: 'opt_finite_seat' }
    },
    { actor: { role: 'student', id: 'unknown-intruder' }, now: 500 }
  );
  // Must fail with UNAUTHORIZED, not INVALID_CLOCK
  assert.equal(res.result.ok, false);
  assert.equal(res.result.code, 'UNAUTHORIZED');
});

test('repro 7: exact deadline boundary now === activityDeadline rejects student actions with ACTIVITY_EXPIRED', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's-repro-7',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'start-7', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  const deadline = session.clock.activityDeadline;
  const resAtDeadline = reduceLessonSession(
    session,
    {
      eventId: 'sub-at-deadline',
      type: 'SUBMIT',
      activityId: 'act-exp',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-exp-predict', answer: 'opt_finite_seat' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: deadline }
  );
  assert.equal(resAtDeadline.result.ok, false);
  assert.equal(resAtDeadline.result.code, 'ACTIVITY_EXPIRED');

  // Exact deadline boundary also rejects HINT and ROLL
  const hintAtDeadline = reduceLessonSession(
    session,
    {
      eventId: 'hint-at-deadline',
      type: 'HINT',
      activityId: 'act-exp',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-exp-predict', hintId: 'hint-exp-1' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: deadline }
  );
  assert.equal(hintAtDeadline.result.ok, false);
  assert.equal(hintAtDeadline.result.code, 'ACTIVITY_EXPIRED');

  const rollAtDeadline = reduceLessonSession(
    session,
    {
      eventId: 'roll-at-deadline',
      type: 'ROLL',
      round: 1,
      revision: session.revision,
      payload: {}
    },
    { actor: { role: 'student', id: 'hs-1' }, now: deadline }
  );
  assert.equal(rollAtDeadline.result.ok, false);
  assert.equal(rollAtDeadline.result.code, 'ACTIVITY_EXPIRED');
});

test('repro 8: SELECT_BRANCH rejects branch when current activity has no branched tasks', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's-repro-8',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'start-8', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  // In act-exp, all tasks have branch: 'shared'. Selecting branch 'support' must fail
  const res = reduceLessonSession(
    session,
    {
      eventId: 'sel-supp-bad-act',
      type: 'SELECT_BRANCH',
      round: 1,
      revision: session.revision,
      payload: { branch: 'support' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: 1100 }
  );
  assert.equal(res.result.ok, false);
  assert.equal(res.result.code, 'BRANCH_LOCKED');
});

test('ASSESS after REVEAL must be explicitly non-mastery or reject', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's-assess-reveal',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    rewardPolicy: { individualCorrect: 15, groupCorrect: 0 },
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'start-ar', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  // Advance to act-recheck
  while (session.timeline.currentActivityId !== 'act-recheck') {
    session = reduceLessonSession(
      session,
      { eventId: `next-${session.revision}`, type: 'NEXT', round: 1, revision: session.revision, payload: {} },
      { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
    ).state;
  }

  // Submit open task (task-recheck-19)
  const openSub = reduceLessonSession(
    session,
    {
      eventId: 'sub-ar-1',
      type: 'SUBMIT',
      activityId: 'act-recheck',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-recheck-19', answer: '4 cách biểu diễn' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: session.clock.lastNow + 100 }
  );
  const sid = openSub.result.submissionId;
  session = openSub.state;

  // Teacher REVEALS task-recheck-19
  session = reduceLessonSession(
    session,
    {
      eventId: 'reveal-ar',
      type: 'REVEAL',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-recheck-19' }
    },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
  ).state;

  // Teacher attempts ordinary assessment (criteriaMet: true) without explicit nonMastery -> must REJECT
  const ordinaryAssess = reduceLessonSession(
    session,
    {
      eventId: 'assess-ordinary-fail',
      type: 'ASSESS',
      round: 1,
      revision: session.revision,
      payload: { submissionId: sid, criteriaMet: true }
    },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
  );
  assert.equal(ordinaryAssess.result.ok, false);
  assert.equal(ordinaryAssess.result.code, 'INVALID_ASSESSMENT');

  // Teacher assesses with criteriaMet: false (explicit non-mastery) -> allowed
  const nonMasteryAssess = reduceLessonSession(
    session,
    {
      eventId: 'assess-nonmastery-false',
      type: 'ASSESS',
      round: 1,
      revision: session.revision,
      payload: { submissionId: sid, criteriaMet: false, feedback: 'Chưa đạt sau khi đã xem đáp án' }
    },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
  );
  assert.equal(nonMasteryAssess.result.ok, true);
  assert.equal(nonMasteryAssess.state.openAssessments[sid].status, 'assessed');
  assert.equal(nonMasteryAssess.state.gameWallets.learners['hs-1'].earned, 0);

  // Teacher assesses with nonMastery: true -> allowed, but awards 0 reward and assisted is true
  const explicitNonMasteryAssess = reduceLessonSession(
    session,
    {
      eventId: 'assess-explicit-nonmastery',
      type: 'ASSESS',
      round: 1,
      revision: session.revision,
      payload: { submissionId: sid, criteriaMet: true, nonMastery: true, feedback: 'Đã xem giải, không tính mastery' }
    },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
  );
  assert.equal(explicitNonMasteryAssess.result.ok, true);
  assert.equal(explicitNonMasteryAssess.state.openAssessments[sid].status, 'assessed');
  assert.equal(explicitNonMasteryAssess.state.gameWallets.learners['hs-1'].earned, 0);

  // Must not count as independent mastery
  const mastery = computeObjectiveMastery(explicitNonMasteryAssess.state.passports['hs-1'], 'obj-t11-19', fixture);
  assert.notEqual(mastery.status, 'independent_mastery');
});

test('isolation: own group product and contributions visible ONLY to own group, completely hidden from other groups', () => {
  const learners = [
    { id: 'hs-1', name: 'Học sinh 1' },
    { id: 'hs-2', name: 'Học sinh 2' },
    { id: 'hs-3', name: 'Học sinh 3' },
    { id: 'hs-4', name: 'Học sinh 4' },
    { id: 'hs-5', name: 'Học sinh 5' },
    { id: 'hs-6', name: 'Học sinh 6' }
  ];
  let session = createLessonSession({ groupPolicyVersion: 0,
    package: fixture,
    mode: 'preview',
    sessionId: 's-iso',
    hostId: 'teacher-main',
    learners,
    rewardPolicy: { individualCorrect: 0, groupCorrect: 10 },
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'start-iso', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  while (session.timeline.currentActivityId !== 'act-form-19') {
    session = reduceLessonSession(
      session,
      { eventId: `next-${session.revision}`, type: 'NEXT', round: 1, revision: session.revision, payload: {} },
      { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
    ).state;
  }

  // 6 learners are divided into 2 groups (3 in grp-act-form-19-1, 3 in grp-act-form-19-2)
  const grp1 = session.groups['act-form-19'].groups[0];
  const grp2 = session.groups['act-form-19'].groups[1];
  assert.equal(session.groups['act-form-19'].groups.length, 2);
  const memberG1 = grp1.memberIds[0];
  const memberG2 = grp2.memberIds[0];

  // Group 1 contributes and submits
  session = reduceLessonSession(
    session,
    {
      eventId: 'contrib-g1',
      type: 'GROUP_CONTRIBUTE',
      activityId: 'act-form-19',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-form-four-rep', text: 'SECRET_GROUP_1_CONTRIBUTION' }
    },
    { actor: { role: 'student', id: memberG1 }, now: session.clock.lastNow + 100 }
  ).state;

  session = reduceLessonSession(
    session,
    {
      eventId: 'sub-g1',
      type: 'GROUP_SUBMIT',
      activityId: 'act-form-19',
      round: 1,
      revision: session.revision,
      payload: {
        taskId: 'task-form-four-rep',
        answer: {
          rep_list: 'card_list_18_20_22',
          rep_explicit: 'card_explicit_formula',
          rep_recurrence: 'card_recurrence_rel',
          rep_verbal: 'card_verbal_desc'
        }
      }
    },
    { actor: { role: 'student', id: memberG1 }, now: session.clock.lastNow + 100 }
  ).state;

  // Group 2 contributes
  session = reduceLessonSession(
    session,
    {
      eventId: 'contrib-g2',
      type: 'GROUP_CONTRIBUTE',
      activityId: 'act-form-19',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-form-four-rep', text: 'SECRET_GROUP_2_CONTRIBUTION' }
    },
    { actor: { role: 'student', id: memberG2 }, now: session.clock.lastNow + 100 }
  ).state;

  // View for memberG1 (Group 1)
  const view1 = serializeForStudent(session, memberG1);
  assert.equal(view1.group.id, grp1.id);
  assert.ok(view1.group.products['task-form-four-rep']);
  assert.ok(view1.group.contributions.some((c) => c.text === 'SECRET_GROUP_1_CONTRIBUTION'));
  assert.ok(!view1.group.contributions.some((c) => c.text === 'SECRET_GROUP_2_CONTRIBUTION'));
  // Ensure other group product is not leaked anywhere in view1
  assert.equal(view1.groupProducts, undefined);

  // View for memberG2 (Group 2)
  const view2 = serializeForStudent(session, memberG2);
  assert.equal(view2.group.id, grp2.id);
  // Group 2 did not submit product yet, so view2.group.products must NOT have Group 1's product
  assert.equal(view2.group.products['task-form-four-rep'], undefined);
  assert.ok(view2.group.contributions.some((c) => c.text === 'SECRET_GROUP_2_CONTRIBUTION'));
  assert.ok(!view2.group.contributions.some((c) => c.text === 'SECRET_GROUP_1_CONTRIBUTION'));
  assert.equal(view2.groupProducts, undefined);
});

test('advertisedHints projection for student view: preserves task scope and order, unopened never includes text, opened includes authored h.text', () => {
  let session = createLessonSession({
    package: fixture,
    mode: 'preview',
    sessionId: 's-adv-hints',
    hostId: 'teacher-main',
    learners: [{ id: 'hs-1', name: 'Học sinh 1' }],
    now: 1000
  });

  session = reduceLessonSession(
    session,
    { eventId: 'start-adv', type: 'START', round: 1, revision: 0, payload: {} },
    { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }
  ).state;

  // View before opening hint on task-exp-predict
  let view = serializeForStudent(session, 'hs-1');
  const taskExp = view.tasks.find((t) => t.id === 'task-exp-predict');
  assert.ok(taskExp);
  assert.ok(Array.isArray(taskExp.advertisedHints));
  assert.equal(taskExp.advertisedHints.length, 1);
  assert.deepEqual(taskExp.advertisedHints[0], {
    id: 'hint-exp-1',
    tier: 'H1',
    opened: false
  });
  assert.equal('text' in taskExp.advertisedHints[0], false);

  // Student opens hint-exp-1
  session = reduceLessonSession(
    session,
    {
      eventId: 'h-exp-1',
      type: 'HINT',
      activityId: 'act-exp',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-exp-predict', hintId: 'hint-exp-1' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: 1100 }
  ).state;

  view = serializeForStudent(session, 'hs-1');
  const taskExpOpened = view.tasks.find((t) => t.id === 'task-exp-predict');
  assert.equal(taskExpOpened.advertisedHints.length, 1);
  assert.equal(taskExpOpened.advertisedHints[0].opened, true);
  assert.equal(typeof taskExpOpened.advertisedHints[0].text, 'string');
  assert.equal(taskExpOpened.advertisedHints[0].text, fixture.hints.find((h) => h.id === 'hint-exp-1').text);

  // Advance to act-pre then act-form-18 (which has 4 hints H1..H4)
  while (session.timeline.currentActivityId !== 'act-form-18') {
    session = reduceLessonSession(
      session,
      { eventId: `next-${session.revision}`, type: 'NEXT', round: 1, revision: session.revision, payload: {} },
      { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }
    ).state;
  }

  // Open H1 only on task-form-distinguish-n-un
  session = reduceLessonSession(
    session,
    {
      eventId: 'h-form-1',
      type: 'HINT',
      activityId: 'act-form-18',
      round: 1,
      revision: session.revision,
      payload: { taskId: 'task-form-distinguish-n-un', hintId: 'hint-form18-1' }
    },
    { actor: { role: 'student', id: 'hs-1' }, now: session.clock.lastNow + 100 }
  ).state;

  view = serializeForStudent(session, 'hs-1');
  const taskForm = view.tasks.find((t) => t.id === 'task-form-distinguish-n-un');
  assert.ok(taskForm);
  assert.ok(Array.isArray(taskForm.advertisedHints));
  assert.equal(taskForm.advertisedHints.length, 4);

  // Preserves authored order H1..H4
  assert.equal(taskForm.advertisedHints[0].id, 'hint-form18-1');
  assert.equal(taskForm.advertisedHints[0].tier, 'H1');
  assert.equal(taskForm.advertisedHints[0].opened, true);
  assert.equal(typeof taskForm.advertisedHints[0].text, 'string');
  assert.ok(taskForm.advertisedHints[0].text.length > 0);

  // H2, H3, H4 are unopened and must NOT leak text
  for (let i = 1; i <= 3; i++) {
    assert.equal(taskForm.advertisedHints[i].opened, false);
    assert.equal('text' in taskForm.advertisedHints[i], false);
    assert.equal(taskForm.advertisedHints[i].tier, `H${i + 1}`);
  }
});

test('Đổi mức: at most 2 self-chosen changes per activity, stepping down waits for a wrong answer or 3 minutes', () => {
  let session = createLessonSession({ package: fixture, mode: 'preview', sessionId: 's-level', hostId: 'teacher-main', learners: [{ id: 'hs-1', name: 'Học sinh 1' }], now: 1000 });
  session = reduceLessonSession(session, { eventId: 'e-start', type: 'START', round: 1, revision: 0, payload: {} }, { actor: { role: 'teacher', id: 'teacher-main' }, now: 1000 }).state;
  while (session.timeline.currentActivityId !== 'act-prac') {
    session = reduceLessonSession(session, { eventId: `next-${session.revision}`, type: 'NEXT', round: 1, revision: session.revision, payload: {} }, { actor: { role: 'teacher', id: 'teacher-main' }, now: session.clock.lastNow + 100 }).state;
  }
  const pupil = (state, branch, dt, id) => reduceLessonSession(state, { eventId: id, type: 'SELECT_BRANCH', round: 1, revision: state.revision, payload: { branch } }, { actor: { role: 'student', id: 'hs-1' }, now: state.clock.lastNow + dt });
  const toSupport = pupil(session, 'support', 100, 'l1');
  assert.equal(toSupport.result.ok, true, 'leaving the assigned level is free');
  const up = pupil(toSupport.state, 'core', 100, 'l2');
  assert.equal(up.result.ok, true);
  const tooSoon = pupil(up.state, 'support', 100, 'l3');
  assert.equal(tooSoon.result.code, 'BRANCH_SWITCH_LIMIT', 'two changes used');
  const after = pupil(toSupport.state, 'core', 100, 'l2b');
  const down = pupil(after.state, 'support', 100, 'l3b');
  assert.equal(down.result.code, 'BRANCH_SWITCH_LIMIT');
  assert.equal(serializeForStudent(after.state, 'hs-1').branchSwitchesLeft, 0);
  const same = pupil(session, 'core', 100, 'l0');
  assert.equal(same.result.ok, false);
});

test('stars per gate: best own correct answer by level, +1 without hints; invitation after 2 clean answers in support', () => {
  let session = createLessonSession({ package: fixture, mode: 'preview', sessionId: 's-stars', hostId: 'teacher-main', learners: [{ id: 'hs-1', name: 'Học sinh 1' }], now: 1000 });
  const activity = session.package.activities[0];
  const task = session.package.tasks.find((t) => activity.taskIds?.includes(t.id));
  session.timeline.currentActivityId = activity.id;
  session.branches[activity.id] = { 'hs-1': 'support' };
  session.submissions = {
    a: { submissionId: 'a', learnerId: 'hs-1', activityId: activity.id, taskId: task.id, at: 1, ok: true, assessmentStatus: 'assessed' },
    b: { submissionId: 'b', learnerId: 'hs-1', activityId: activity.id, taskId: task.id, at: 2, ok: true, assessmentStatus: 'assessed' },
  };
  const view = serializeForStudent(session, 'hs-1');
  const level = { support: 1, extension: 3 }[task.branch] || 2;
  assert.equal(view.gateStars.find((g) => g.activityId === activity.id).stars, level + 1);
  assert.equal(view.levelInvite, true);
  session.passports['hs-1'].supportHistory = [{ taskId: task.id, tier: 'H1', at: 1 }];
  const helped = serializeForStudent(session, 'hs-1');
  assert.equal(helped.gateStars.find((g) => g.activityId === activity.id).stars, level);
  assert.equal(helped.levelInvite, false);
});

test('legacy branch switches preserve privacy and downgrade waits through teacher pause', () => {
  let state = createLessonSession({ package: fixture, mode: 'preview', sessionId: 's-pause-level', hostId: 'qa-host', learners: [{ id: 'a', name: 'Synthetic A' }, { id: 'b', name: 'Synthetic B' }], now: 1000 });
  const teacher = { role: 'teacher', id: 'qa-host' }, pupil = { role: 'student', id: 'a' };
  const command = (type, actor, payload = {}, dt = 100) => {
    const next = reduceLessonSession(state, { eventId: 'qa-' + state.revision + '-' + type, type, round: state.round, revision: state.revision, payload }, { actor, now: state.clock.lastNow + dt });
    if (next.result.ok) state = next.state;
    return next.result;
  };
  assert.equal(command('START', teacher).ok, true);
  while (state.timeline.currentActivityId !== 'act-prac') assert.equal(command('NEXT', teacher).ok, true);
  const activityId = state.timeline.currentActivityId;
  state.branches[activityId] = { a: 'support', b: 'core' };
  const task = fixture.tasks.find(t => fixture.activities.find(a => a.id === activityId).taskIds.includes(t.id));
  state.submissions = { b: { submissionId: 'b', learnerId: 'b', activityId, taskId: task.id, at: 100, ok: true, assessmentStatus: 'assessed' } };
  state.branchSwitches = { [activityId]: { b: 2 } };
  const passports = JSON.stringify(state.passports);
  const view = serializeForStudent(state, 'a');
  assert.equal(view.branchSwitchesLeft, 2);
  assert.equal(view.levelInvite, false);
  assert.ok(view.gateStars.every(g => g.stars === 0));
  assert.equal(JSON.stringify(state.passports), passports);
  delete state.branchSwitches;
  assert.equal(command('SELECT_BRANCH', pupil, { branch: 'core' }).ok, true);
  assert.equal(command('SELECT_BRANCH', pupil, { branch: 'support' }).code, 'BRANCH_DOWN_TOO_SOON');
  assert.equal(command('PAUSE', teacher).ok, true);
  assert.equal(command('RESUME', teacher, {}, 180000).ok, true);
  assert.equal(command('SELECT_BRANCH', pupil, { branch: 'support' }).code, 'BRANCH_DOWN_TOO_SOON');
  const active = state.clock.lastNow - state.clock.activityStartedAt - state.clock.activityPausedMs;
  assert.equal(command('SELECT_BRANCH', pupil, { branch: 'support' }, 180000 - active).ok, true, 'exactly three active minutes opens downgrade');
  assert.equal(serializeForStudent(state, 'a').branchSwitchesLeft, 0);
});
