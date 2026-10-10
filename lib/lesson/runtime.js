/**
 * Pure immutable lesson session runtime reducer.
 */

import { canonicalize, hashPackage, CHECKER_REGISTRY } from './schema.js';
import { validateLessonPackage } from './validate.js';
import { updateGateHistory } from './gate-history.js';
import {
  createLearnerPassport,
  computeObjectiveMastery,
  recordHintAssistance,
  recordTaskSubmission
} from './passport.js';
import {
  ROLE_DEFINITIONS,
  createActivityGroups,
  autoAssignRemainingRoles
} from './grouping.js';
import {
  openLessonArena,
  answerLessonArena,
  combatLessonArena,
  settleLessonArena
} from './arena-bridge.js';

const FORBIDDEN_ID_NAMES = new Set(['__proto__', 'constructor', 'prototype']);

function isValidIdentifier(val) {
  if (typeof val !== 'string' || val.length === 0 || val.length > 128) {
    return false;
  }
  return !FORBIDDEN_ID_NAMES.has(val);
}

function validatePayloadDepthAndKeys(val, depth = 0) {
  if (depth > 8) return false;
  if (val === null || val === undefined) return true;
  if (typeof val === 'number' || typeof val === 'boolean') {
    return typeof val === 'boolean' || Number.isFinite(val);
  }
  if (typeof val === 'string') {
    return val.length <= 8000;
  }
  if (Array.isArray(val)) {
    if (val.length > 100) return false;
    for (const item of val) {
      if (!validatePayloadDepthAndKeys(item, depth + 1)) return false;
    }
    return true;
  }
  if (typeof val === 'object') {
    for (const key of Object.keys(val)) {
      if (FORBIDDEN_ID_NAMES.has(key)) return false;
      if (!validatePayloadDepthAndKeys(val[key], depth + 1)) return false;
    }
    return true;
  }
  return false;
}

function validateAnswerJson(answer) {
  try {
    const serialized = JSON.stringify(answer);
    if (serialized && serialized.length > 16000) {
      return false;
    }
  } catch {
    return false;
  }
  return validatePayloadDepthAndKeys(answer, 0);
}

const ALLOWED_PAYLOAD_KEYS = Object.freeze({
  START: new Set([]),
  PAUSE: new Set([]),
  RESUME: new Set([]),
  NEXT: new Set(['force']),
  LOCK: new Set([]),
  UNLOCK: new Set([]),
  REVEAL: new Set(['taskId']),
  EXTEND: new Set(['minutes']),
  ASSESS: new Set(['submissionId', 'criteriaMet', 'feedback', 'nonMastery']),
  SET_BRANCH: new Set(['learnerId', 'branch']),
  ADD_LEARNER: new Set(['learner']),
  LEAVE_LEARNER: new Set(['learnerId']),
  CONCLUDE: new Set([]),
  TICK: new Set([]),
  SAVE_DRAFT: new Set(['taskId', 'answer']),
  SUBMIT: new Set(['taskId', 'answer']),
  HINT: new Set(['taskId', 'hintId']),
  SELECT_BRANCH: new Set(['branch']),
  CHOOSE_ROLE: new Set(['roleId']),
  CHOOSE_MASCOT: new Set(['mascot']),
  GROUP_CONTRIBUTE: new Set(['taskId', 'text']),
  GROUP_SUBMIT: new Set(['taskId', 'answer']),
  ROLL: new Set([])
  ,ARENA_OPEN: new Set(['seed'])
  ,ARENA_ANSWER: new Set(['answer', 'step', 'requestId'])
  ,ARENA_COMBAT: new Set(['target', 'action', 'requestId'])
  ,ARENA_SETTLE: new Set([])
});

const TEACHER_COMMANDS = new Set([
  'START',
  'PAUSE',
  'RESUME',
  'NEXT',
  'LOCK',
  'UNLOCK',
  'REVEAL',
  'EXTEND',
  'ASSESS',
  'SET_BRANCH',
  'ADD_LEARNER',
  'LEAVE_LEARNER',
  'CONCLUDE'
  ,'ARENA_OPEN'
  ,'ARENA_SETTLE'
]);

const STUDENT_COMMANDS = new Set([
  'SAVE_DRAFT',
  'SUBMIT',
  'HINT',
  'SELECT_BRANCH',
  'CHOOSE_ROLE',
  'CHOOSE_MASCOT',
  'GROUP_CONTRIBUTE',
  'GROUP_SUBMIT',
  'ROLL'
  ,'ARENA_ANSWER'
  ,'ARENA_COMBAT'
]);

// Choosing a mascot is allowed in the waiting room, while paused and while locked: it changes only how a pupil is drawn.
const LOBBY_COMMANDS = new Set(['CHOOSE_MASCOT']);
export const MASCOT_COUNT = 8;

// Dice position is counted in these units per activity; the map scales 0..activities*units onto its 32 cells.
export const DICE_UNITS_PER_ACTIVITY = 8;

export function extensionEligibility({ activity, package: pkg, passport } = {}) {
  const tasks = Array.isArray(pkg?.tasks) ? pkg.tasks : [];
  const hasAuthoredTask = Boolean(activity && tasks.some(
    (task) => activity.taskIds?.includes(task.id) && task.branch === 'extension'
  ));
  if (!hasAuthoredTask) {
    return { authored: false, eligible: false, reasonCode: 'NO_AUTHORED_EXTENSION', displaySafe: true };
  }

  // Recheck is the gate for the optional branch. Final mastery still requires
  // recheck + exit in computeObjectiveMastery; do not make students wait for exit.
  const recheckActivity = (pkg.activities || []).find((candidate) => candidate.phase === 'recheck');
  const mustObjectives = (pkg.objectives || []).filter((objective) => objective.level === 'must');
  const submissions = Array.isArray(passport?.submissions) ? passport.submissions : [];
  const supportHistory = Array.isArray(passport?.supportHistory) ? passport.supportHistory : [];
  const eligible = Boolean(recheckActivity) && mustObjectives.every((objective) => {
    const rule = (pkg.evidenceRules || []).find((candidate) =>
      candidate.kind === 'individual_recheck' && candidate.countsForMastery === true &&
      candidate.taskId && recheckActivity.taskIds?.includes(candidate.taskId) &&
      (candidate.objectiveId === objective.id || candidate.objectiveIds?.includes(objective.id))
    );
    if (!rule) return false;
    const latest = submissions.filter((submission) => submission.taskId === rule.taskId).at(-1);
    return Boolean(latest?.ok === true && latest.assessmentStatus === 'assessed' &&
      !latest.assisted && !supportHistory.some((hint) => hint.taskId === rule.taskId) &&
      !passport?.revealedTasks?.[rule.taskId]);
  });
  return {
    authored: true,
    eligible,
    reasonCode: eligible ? null : 'MUST_OBJECTIVES_NOT_INDEPENDENT',
    displaySafe: true
  };
}

const SYSTEM_COMMANDS = new Set(['TICK']);

/**
 * Creates a brand new immutable JSON-serializable lesson session.
 */
export function createLessonSession({
  package: pkg,
  mode = 'preview',
  sessionId,
  hostId,
  learners = [],
  now = Date.now(),
  seed = 42,
  rewardPolicy = { individualCorrect: 0, groupCorrect: 0 }
}) {
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) {
    throw new Error('INVALID_PACKAGE: Package must be a non-null object');
  }

  // Content hash verification
  const expectedHash = hashPackage(pkg);
  if (pkg.contentHash !== expectedHash) {
    throw new Error(`INVALID_PACKAGE: Content hash mismatch. Expected ${expectedHash}, got ${pkg.contentHash}`);
  }

  // Mode validation
  if (mode === 'live') {
    if (pkg.status !== 'approved' && pkg.status !== 'published') {
      throw new Error(`ERR_PACKAGE_NOT_APPROVED: Live session requires status approved or published, got ${pkg.status}`);
    }
    const validation = validateLessonPackage(pkg, { mode: 'publish' });
    if (!validation.ok) {
      throw new Error(`INVALID_PACKAGE: Validation failed in publish mode: ${JSON.stringify(validation.errors)}`);
    }
  } else {
    // preview mode allows draft / needs_review
    const validation = validateLessonPackage(pkg, { mode: 'draft' });
    if (!validation.ok) {
      throw new Error(`INVALID_PACKAGE: Validation failed in draft mode: ${JSON.stringify(validation.errors)}`);
    }
  }

  const clonedPkg = JSON.parse(JSON.stringify(pkg));
  const roster = {};
  const passports = {};
  const diceTrack = {};
  const learnerWallets = {};

  for (const learner of learners) {
    if (!learner || !learner.id) continue;
    roster[learner.id] = {
      id: learner.id,
      name: learner.name || learner.id,
      deviceId: learner.deviceId || null,
      present: learner.present !== false
    };
    passports[learner.id] = createLearnerPassport(learner.id, clonedPkg);
    diceTrack[learner.id] = {
      position: 0,
      carry: 0,
      rolls: 0,
      slow: false,
      boost: false
    };
    learnerWallets[learner.id] = { earned: 0, bonus: 0 };
  }

  const initialActivity = clonedPkg.activities?.[0] || null;
  const groups = {};
  const branches = {};
  if (initialActivity) {
    branches[initialActivity.id] = {};
  }

  return {
    id: sessionId,
    hostId,
    round: 1,
    revision: 0,
    mode,
    status: 'waiting',
    packageHash: expectedHash,
    package: clonedPkg,
    seed,
    rewardPolicy: {
      individualCorrect: Math.max(0, Math.min(100, Math.floor(rewardPolicy?.individualCorrect || 0))),
      groupCorrect: Math.max(0, Math.min(100, Math.floor(rewardPolicy?.groupCorrect || 0)))
    },
    roster,
    gateHistory: {},
    passports,
    groups,
    submissions: {},
    openAssessments: {},
    branches,
    groupProducts: {},
    groupContributions: {},
    drafts: {},
    gameWallets: {
      learners: learnerWallets,
      groups: {}
    },
    rewardLedger: {},
    eventCache: {},
    reveals: {},
    clock: {
      startedAt: null,
      lastNow: now,
      pausedAt: null,
      totalPausedMs: 0,
      activityStartedAt: null,
      activityPausedMs: 0,
      activityDeadline: null
    },
    timeline: {
      activityIndex: 0,
      currentActivityId: initialActivity?.id || '',
      currentPhase: initialActivity?.phase || '',
      locked: false
    },
    diceTrack
  };
}

/**
 * Pure reducer for processing lesson session events.
 */
export function reduceLessonSession(state, event, { actor, now }) {
  // 1. Basic event structure checks
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return { state, result: { ok: false, code: 'INVALID_EVENT' } };
  }

  if (!isValidIdentifier(event.eventId)) {
    return { state, result: { ok: false, code: 'INVALID_EVENT' } };
  }

  if (typeof event.type !== 'string' || !ALLOWED_PAYLOAD_KEYS[event.type]) {
    return { state, result: { ok: false, code: 'INVALID_EVENT' } };
  }

  // Reject event prototype pollution or illegal keys
  const forbiddenEventKeys = [
    '__proto__',
    'constructor',
    'prototype',
    'learnerId',
    'groupId',
    'correct',
    'score',
    'evidence',
    'grantsMastery',
    'isIndividual'
  ];
  for (const k of forbiddenEventKeys) {
    if (Object.prototype.hasOwnProperty.call(event, k)) {
      return { state, result: { ok: false, code: 'UNAUTHORIZED' } };
    }
  }

  const payload = event.payload || {};
  if (typeof payload !== 'object' || Array.isArray(payload)) {
    return { state, result: { ok: false, code: 'INVALID_EVENT' } };
  }

  // Check allowed keys in payload
  const allowedKeys = ALLOWED_PAYLOAD_KEYS[event.type];
  for (const key of Object.keys(payload)) {
    if (!allowedKeys.has(key)) {
      return { state, result: { ok: false, code: 'INVALID_EVENT' } };
    }
  }

  // Validate student override attempt inside payload
  const studentForbiddenOverrides = ['learnerId', 'groupId', 'correct', 'score', 'evidence', 'grantsMastery'];
  if (STUDENT_COMMANDS.has(event.type)) {
    for (const k of studentForbiddenOverrides) {
      if (k in payload) {
        return { state, result: { ok: false, code: 'UNAUTHORIZED' } };
      }
    }
  }

  // 2. Actor authorization
  if (!actor || !isValidIdentifier(actor.id)) {
    return { state, result: { ok: false, code: 'UNAUTHORIZED' } };
  }

  if (actor.role === 'teacher') {
    if (actor.id !== state.hostId && actor.authorizedHostId !== state.hostId) {
      return { state, result: { ok: false, code: 'UNAUTHORIZED' } };
    }
    if (!TEACHER_COMMANDS.has(event.type)) {
      return { state, result: { ok: false, code: 'UNAUTHORIZED' } };
    }
  } else if (actor.role === 'student') {
    if (actor.id === 'system' || actor.id === state.hostId) {
      return { state, result: { ok: false, code: 'UNAUTHORIZED' } };
    }
    const studentRecord = state.roster[actor.id];
    if (!studentRecord || studentRecord.present === false) {
      return { state, result: { ok: false, code: 'UNAUTHORIZED' } };
    }
    if (!STUDENT_COMMANDS.has(event.type)) {
      return { state, result: { ok: false, code: 'UNAUTHORIZED' } };
    }
  } else if (actor.role === 'system') {
    if (actor.id !== 'system') {
      return { state, result: { ok: false, code: 'UNAUTHORIZED' } };
    }
    if (!SYSTEM_COMMANDS.has(event.type) && event.type !== 'ARENA_SETTLE') {
      return { state, result: { ok: false, code: 'UNAUTHORIZED' } };
    }
  } else {
    return { state, result: { ok: false, code: 'UNAUTHORIZED' } };
  }

  // 3. Monotonic clock check
  if (typeof now !== 'number' || !Number.isFinite(now) || now < state.clock.lastNow) {
    return { state, result: { ok: false, code: 'INVALID_CLOCK' } };
  }

  // 4. Cache check (Actor-scoped idempotency and replay)
  const cacheKey = `${actor.role}:${actor.id}:${event.eventId}`;
  const fingerprint = canonicalize({
    type: event.type,
    payload: event.payload,
    activityId: event.activityId || '',
    round: event.round,
    revision: event.revision
  });

  if (state.eventCache[cacheKey]) {
    const cached = state.eventCache[cacheKey];
    if (cached.fingerprint === fingerprint) {
      return {
        state,
        result: {
          ...cached.result,
          replay: true
        }
      };
    } else {
      return { state, result: { ok: false, code: 'EVENT_ID_CONFLICT' } };
    }
  }

  // 5. Round and Revision match
  if (event.round !== state.round) {
    return { state, result: { ok: false, code: 'ROUND_MISMATCH' } };
  }
  if (event.revision !== state.revision) {
    return { state, result: { ok: false, code: 'REVISION_MISMATCH' } };
  }

  // 6. Concluded session guard
  if (state.status === 'concluded') {
    return { state, result: { ok: false, code: 'SESSION_CONCLUDED' } };
  }

  // 7. Activity-bound check
  const ACTIVITY_BOUND_COMMANDS = new Set([
    'SAVE_DRAFT',
    'SUBMIT',
    'HINT',
    'GROUP_CONTRIBUTE',
    'GROUP_SUBMIT'
  ]);
  if (ACTIVITY_BOUND_COMMANDS.has(event.type)) {
    if (!event.activityId || event.activityId !== state.timeline.currentActivityId) {
      return { state, result: { ok: false, code: 'STALE_ACTIVITY' } };
    }
  } else if (event.activityId && event.activityId !== state.timeline.currentActivityId) {
    return { state, result: { ok: false, code: 'STALE_ACTIVITY' } };
  }

  // 8. Session status & lock guards
  if (STUDENT_COMMANDS.has(event.type) && !LOBBY_COMMANDS.has(event.type)) {
    if (state.status === 'waiting') {
      return { state, result: { ok: false, code: 'NOT_ACTIVE' } };
    }
    if (state.status === 'paused') {
      return { state, result: { ok: false, code: 'PAUSED' } };
    }
    if (state.timeline.locked) {
      return { state, result: { ok: false, code: 'LOCKED' } };
    }
    if (state.clock.arenaPausedAt != null && now < state.arena.event.resumeAt && !['ARENA_ANSWER', 'ARENA_COMBAT'].includes(event.type)) {
      return {state, result: {ok: false, code: 'ARENA_ACTIVE'}};
    }
    if (state.clock.activityDeadline !== null && state.clock.arenaPausedAt == null && now >= state.clock.activityDeadline) {
      return { state, result: { ok: false, code: 'ACTIVITY_EXPIRED' } };
    }
  }

  if (event.type === 'ARENA_OPEN' &&
      (state.status === 'waiting' || state.status === 'paused' || state.timeline.locked ||
       (state.clock.activityDeadline !== null && now >= state.clock.activityDeadline))) {
    return { state, result: { ok: false, code: state.status === 'paused' ? 'PAUSED' : state.timeline.locked ? 'LOCKED' : 'NOT_ACTIVE' } };
  }

  // Clone state immutably for processing mutation
  const next = JSON.parse(JSON.stringify(state));
  next.clock.lastNow = now;
  if (next.status === 'active' && next.clock.arenaPausedAt != null && now >= next.arena.event.resumeAt) {
    const settled = settleLessonArena(next, now);
    Object.assign(next, settled.state);
    if (STUDENT_COMMANDS.has(event.type) && !LOBBY_COMMANDS.has(event.type) && next.clock.activityDeadline !== null && now >= next.clock.activityDeadline) return {state, result: {ok: false, code: 'ACTIVITY_EXPIRED'}};
  }
  const nextRevision = next.revision + 1;

  let mutationResult = null;

  // Dispatch event handler
  switch (event.type) {
    case 'START': {
      if (next.status !== 'waiting') {
        return { state, result: { ok: false, code: 'INVALID_EVENT' } };
      }
      next.status = 'active';
      next.clock.startedAt = now;
      next.clock.activityStartedAt = now;
      const firstAct = next.package.activities[0];
      const durationMs = (firstAct?.minutes || 0) * 60 * 1000;
      next.clock.activityDeadline = now + durationMs;

      if (firstAct?.participation === 'group') {
        const presentLearners = Object.values(next.roster).filter((l) => l.present);
        next.groups[firstAct.id] = createActivityGroups({
          activity: firstAct,
          learners: presentLearners,
          seed: next.seed,
          now
        });
      }
      mutationResult = { ok: true, revision: nextRevision, type: 'START' };
      break;
    }

    case 'ARENA_OPEN': {
      const opened = openLessonArena(next, {
        activityId: event.activityId,
        seed: payload.seed,
        eventId: event.eventId,
        actor
      }, now);
      if (!opened.ok) return { state, result: { ok: false, code: opened.code } };
      next.arena = opened.state.arena;
      next.clock = opened.state.clock;
      mutationResult = { ok: true, revision: nextRevision, type: 'ARENA_OPEN' };
      break;
    }

    case 'ARENA_ANSWER': {
      const answered = answerLessonArena(next, payload, actor.id, now);
      if (!answered.ok) return { state, result: { ok: false, code: answered.code } };
      next.arena = answered.state.arena;
      mutationResult = { ok: true, correct: answered.correct, revision: nextRevision, type: 'ARENA_ANSWER' };
      break;
    }

    case 'ARENA_COMBAT': {
      const fought = combatLessonArena(next, payload, actor.id, now);
      if (!fought.ok) return { state, result: { ok: false, code: fought.code } };
      next.arena = fought.state.arena;
      mutationResult = { ok: true, effect: fought.effect, revision: nextRevision, type: 'ARENA_COMBAT' };
      break;
    }

    case 'ARENA_SETTLE': {
      const settled = settleLessonArena(next, now);
      if (!settled.ok) return { state, result: { ok: false, code: settled.code } };
      next.rewardLedger = settled.state.rewardLedger;
      next.gameWallets = settled.state.gameWallets;
      next.clock = settled.state.clock;
      next.arena = settled.state.arena;
      mutationResult = { ok: true, revision: nextRevision, type: 'ARENA_SETTLE' };
      break;
    }

    case 'PAUSE': {
      if (next.status !== 'active') {
        return { state, result: { ok: false, code: 'INVALID_EVENT' } };
      }
      next.status = 'paused';
      next.clock.pausedAt = now;
      mutationResult = { ok: true, revision: nextRevision, type: 'PAUSE' };
      break;
    }

    case 'RESUME': {
      if (next.status !== 'paused') {
        return { state, result: { ok: false, code: 'INVALID_EVENT' } };
      }
      next.status = 'active';
      const pausedDelta = now - (next.clock.pausedAt || now);
      next.clock.totalPausedMs += pausedDelta;
      next.clock.activityPausedMs += pausedDelta;
      if (next.clock.activityDeadline !== null) {
        next.clock.activityDeadline += pausedDelta;
      }
      if (next.clock.arenaPausedAt != null && next.arena?.event && !next.arena.settled) {
        next.clock.arenaPausedAt += pausedDelta;
        for (const field of ['startAt', 'finishAt', 'resumeAt']) next.arena.event[field] += pausedDelta;
      }
      next.clock.pausedAt = null;

      // Adjust group selection deadline if present
      const currActId = next.timeline.currentActivityId;
      if (next.groups[currActId]?.selectionDeadline) {
        next.groups[currActId].selectionDeadline += pausedDelta;
      }

      mutationResult = { ok: true, revision: nextRevision, type: 'RESUME' };
      break;
    }

    case 'LOCK': {
      next.timeline.locked = true;
      mutationResult = { ok: true, revision: nextRevision, type: 'LOCK' };
      break;
    }

    case 'UNLOCK': {
      next.timeline.locked = false;
      mutationResult = { ok: true, revision: nextRevision, type: 'UNLOCK' };
      break;
    }

    case 'EXTEND': {
      const minutes = payload.minutes;
      if (typeof minutes !== 'number' || minutes <= 0 || minutes > 10) {
        return { state, result: { ok: false, code: 'INVALID_EVENT' } };
      }
      const extensionMs = minutes * 60 * 1000;
      const baseDeadline = Math.max(next.clock.activityDeadline || now, now);
      next.clock.activityDeadline = baseDeadline + extensionMs;
      mutationResult = { ok: true, revision: nextRevision, type: 'EXTEND', minutes };
      break;
    }

    case 'NEXT': {
      if (!['active', 'paused'].includes(next.status)) {
        return { state, result: { ok: false, code: 'NOT_ACTIVE' } };
      }
      if (next.clock.arenaPausedAt != null && next.arena?.event && !next.arena.settled) {
        next.arena.event.startAt = Math.min(next.arena.event.startAt, now);
        next.arena.event.finishAt = now;
        next.arena.event.resumeAt = now;
        next.arena.cancelled = true;
        Object.assign(next, settleLessonArena(next, now).state);
      }
      const activities = next.package.activities || [];
      let targetIndex = -1;
      for (let i = next.timeline.activityIndex + 1; i < activities.length; i++) {
        if (activities[i].budgetRole !== 'reserve') {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex === -1) {
        return { state, result: { ok: false, code: 'SESSION_CONCLUDED' } };
      }

      const nextAct = activities[targetIndex];
      next.timeline.activityIndex = targetIndex;
      next.arena = null;
      next.timeline.currentActivityId = nextAct.id;
      next.timeline.currentPhase = nextAct.phase;
      next.clock.activityStartedAt = now;
      next.clock.activityPausedMs = 0;
      next.clock.activityDeadline = now + (nextAct.minutes || 0) * 60 * 1000;
      if (next.status === 'paused') next.clock.pausedAt = now;

      if (!next.branches[nextAct.id]) {
        next.branches[nextAct.id] = {};
      }

      if (nextAct.participation === 'group') {
        const presentLearners = Object.values(next.roster).filter((l) => l.present);
        next.groups[nextAct.id] = createActivityGroups({
          activity: nextAct,
          learners: presentLearners,
          seed: next.seed,
          now
        });
      }

      mutationResult = {
        ok: true,
        revision: nextRevision,
        type: 'NEXT',
        currentActivityId: nextAct.id
      };
      break;
    }

    case 'CONCLUDE': {
      next.status = 'concluded';
      mutationResult = { ok: true, revision: nextRevision, type: 'CONCLUDE' };
      break;
    }

    case 'REVEAL': {
      const taskId = payload.taskId;
      const currAct = next.package.activities[next.timeline.activityIndex];
      if (!currAct || !Array.isArray(currAct.taskIds) || !currAct.taskIds.includes(taskId)) {
        return { state, result: { ok: false, code: 'INVALID_TASK' } };
      }

      next.reveals[taskId] = { revealed: true, revealedAt: now };

      // Mark all current learners assisted on this task
      for (const learnerId of Object.keys(next.passports)) {
        if (!next.passports[learnerId].revealedTasks) {
          next.passports[learnerId].revealedTasks = {};
        }
        next.passports[learnerId].revealedTasks[taskId] = now;
        for (const sub of next.passports[learnerId].submissions) {
          if (sub.taskId === taskId) {
            sub.assisted = true;
          }
        }
      }
      for (const sub of Object.values(next.submissions)) {
        if (sub.taskId === taskId) {
          sub.assisted = true;
        }
      }

      mutationResult = { ok: true, revision: nextRevision, type: 'REVEAL', taskId };
      break;
    }

    case 'TICK': {
      const currActId = next.timeline.currentActivityId;
      const grpState = next.groups[currActId];
      if (grpState && now > grpState.selectionDeadline) {
        next.groups[currActId] = autoAssignRemainingRoles(grpState, { now, seed: next.seed, roster: next.roster });
      }
      mutationResult = { ok: true, revision: nextRevision, type: 'TICK' };
      break;
    }

    case 'SAVE_DRAFT': {
      const { taskId, answer } = payload;
      const currAct = next.package.activities[next.timeline.activityIndex];
      if (!currAct || !Array.isArray(currAct.taskIds) || !currAct.taskIds.includes(taskId)) {
        return { state, result: { ok: false, code: 'TASK_NOT_AVAILABLE' } };
      }
      const task = next.package.tasks.find((t) => t.id === taskId);
      if (!task) {
        return { state, result: { ok: false, code: 'INVALID_TASK' } };
      }
      const currentBranch = next.branches[currAct.id]?.[actor.id] || 'core';
      if (task.branch && task.branch !== 'shared' && task.branch !== currentBranch) {
        return { state, result: { ok: false, code: 'TASK_NOT_AVAILABLE' } };
      }
      if (!validateAnswerJson(answer)) {
        return { state, result: { ok: false, code: 'INVALID_ANSWER' } };
      }
      if (!next.drafts[actor.id]) {
        next.drafts[actor.id] = {};
      }
      next.drafts[actor.id][taskId] = {
        answer,
        savedAt: now
      };
      mutationResult = { ok: true, revision: nextRevision, type: 'SAVE_DRAFT', taskId };
      break;
    }

    case 'HINT': {
      const { taskId, hintId } = payload;
      const currAct = next.package.activities[next.timeline.activityIndex];
      if (!currAct || !Array.isArray(currAct.taskIds) || !currAct.taskIds.includes(taskId)) {
        return { state, result: { ok: false, code: 'TASK_NOT_AVAILABLE' } };
      }

      const task = next.package.tasks.find((t) => t.id === taskId);
      if (!task) {
        return { state, result: { ok: false, code: 'INVALID_TASK' } };
      }

      const currentBranch = next.branches[currAct.id]?.[actor.id] || 'core';
      if (task.branch && task.branch !== 'shared' && task.branch !== currentBranch) {
        return { state, result: { ok: false, code: 'TASK_NOT_AVAILABLE' } };
      }

      // Check hint exists in package and belongs to this task
      const taskHints = (next.package.hints || [])
        .filter(
          (h) =>
            h.taskId === taskId ||
            h.targetTaskId === taskId ||
            (task.hintIds && task.hintIds.includes(h.id)) ||
            (task.supportIds && task.supportIds.includes(h.id))
        )
        .sort((a, b) => (a.tier || '').localeCompare(b.tier || ''));

      const hintObj = taskHints.find((h) => h.id === hintId);
      if (!hintObj) {
        return { state, result: { ok: false, code: 'INVALID_HINT' } };
      }

      const passport = next.passports[actor.id];
      const usedHintIds = new Set((passport.supportHistory || []).filter((h) => h.taskId === taskId).map((h) => h.hintId));

      // If already requested, replay is free
      if (!usedHintIds.has(hintId)) {
        const hintIndex = taskHints.findIndex((h) => h.id === hintId);
        if (hintIndex > 0) {
          const priorHint = taskHints[hintIndex - 1];
          if (!usedHintIds.has(priorHint.id)) {
            return { state, result: { ok: false, code: 'INVALID_HINT' } };
          }
        }
        next.passports[actor.id] = recordHintAssistance(passport, {
          taskId,
          hintId,
          tier: hintObj.tier,
          now
        });
      }

      mutationResult = { ok: true, revision: nextRevision, type: 'HINT', taskId, hintId };
      break;
    }

    case 'SUBMIT': {
      const { taskId, answer } = payload;
      const currAct = next.package.activities[next.timeline.activityIndex];
      if (!currAct || !Array.isArray(currAct.taskIds) || !currAct.taskIds.includes(taskId)) {
        return { state, result: { ok: false, code: 'TASK_NOT_AVAILABLE' } };
      }

      const task = next.package.tasks.find((t) => t.id === taskId);
      if (!task) {
        return { state, result: { ok: false, code: 'INVALID_TASK' } };
      }

      // Reject individual SUBMIT for group task before any checker/verdict
      if (task.participation === 'group') {
        return { state, result: { ok: false, code: 'TASK_NOT_AVAILABLE' } };
      }

      // Branch gating: shared tasks accessible plus chosen branch
      const currentBranch = next.branches[currAct.id]?.[actor.id] || 'core';
      if (task.branch && task.branch !== 'shared' && task.branch !== currentBranch) {
        return { state, result: { ok: false, code: 'TASK_NOT_AVAILABLE' } };
      }

      if (!validateAnswerJson(answer)) {
        return { state, result: { ok: false, code: 'INVALID_ANSWER' } };
      }

      let isCorrect = false;
      let assessmentStatus = 'assessed';

      if (task.type === 'closed') {
        const checker = CHECKER_REGISTRY[task.evaluation?.checkerId];
        if (!checker) {
          return { state, result: { ok: false, code: 'INVALID_TASK' } };
        }
        const checkRes = checker(answer, task);
        isCorrect = Boolean(checkRes?.ok);
      } else if (task.type === 'open') {
        isCorrect = false;
        assessmentStatus = 'pending';
      } else if (task.type === 'reflection') {
        isCorrect = true;
        assessmentStatus = 'assessed';
      }

      const isRevealed = Boolean(next.reveals[taskId]?.revealed);
      const hasHint = (next.passports[actor.id]?.supportHistory || []).some((h) => h.taskId === taskId);
      const isAssisted = isRevealed || hasHint;

      const submissionId = `sub-${next.round}-${nextRevision}-${actor.id}-${event.eventId}`;
      const subRecord = {
        submissionId,
        learnerId: actor.id,
        taskId,
        activityId: currAct.id,
        answer,
        ok: isCorrect,
        assessmentStatus,
        assisted: isAssisted,
        at: now
      };

      next.submissions[submissionId] = subRecord;
      if (assessmentStatus === 'pending') {
        next.openAssessments[submissionId] = {
          submissionId,
          learnerId: actor.id,
          taskId,
          activityId: currAct.id,
          answer,
          status: 'pending',
          createdAt: now
        };
      }

      // Update learner passport
      const relevantEvidence = (next.package.evidenceRules || [])
        .filter((r) => r.taskId === taskId)
        .map((r) => r.id);

      next.passports[actor.id] = recordTaskSubmission(
        next.passports[actor.id],
        {
          submissionId,
          taskId,
          activityId: currAct.id,
          answer,
          ok: isCorrect,
          assessmentStatus,
          assisted: isAssisted,
          evidenceIds: relevantEvidence,
          now
        },
        next.package
      );

      // Reward policy
      if (isCorrect && assessmentStatus === 'assessed') {
        const ledgerKey = `${next.id}:${next.round}:${currAct.id}:${taskId}:learner:${actor.id}`;
        if (!next.rewardLedger[ledgerKey]) {
          const amount = next.rewardPolicy.individualCorrect;
          next.rewardLedger[ledgerKey] = {
            amount,
            recipientType: 'learner',
            recipientId: actor.id,
            taskId,
            submissionId,
            active: true
          };
          if (!next.gameWallets.learners[actor.id]) {
            next.gameWallets.learners[actor.id] = { earned: 0, bonus: 0 };
          }
          next.gameWallets.learners[actor.id].earned += amount;
        } else if (!next.rewardLedger[ledgerKey].active) {
          next.rewardLedger[ledgerKey].active = true;
          next.gameWallets.learners[actor.id].earned += next.rewardLedger[ledgerKey].amount;
        }
      }

      mutationResult = {
        ok: true,
        revision: nextRevision,
        type: 'SUBMIT',
        submissionId,
        correct: isCorrect,
        pending: assessmentStatus === 'pending'
      };
      break;
    }

    case 'ASSESS': {
      const { submissionId, criteriaMet, feedback, nonMastery } = payload;
      const sub = next.submissions[submissionId];
      if (!sub || !next.openAssessments[submissionId]) {
        return { state, result: { ok: false, code: 'INVALID_ASSESSMENT' } };
      }
      if (typeof criteriaMet !== 'boolean') {
        return { state, result: { ok: false, code: 'INVALID_EVENT' } };
      }
      if (feedback !== undefined && (typeof feedback !== 'string' || feedback.length > 2000)) {
        return { state, result: { ok: false, code: 'INVALID_EVENT' } };
      }
      if (nonMastery !== undefined && typeof nonMastery !== 'boolean') {
        return { state, result: { ok: false, code: 'INVALID_EVENT' } };
      }

      const isTaskRevealed = Boolean(next.reveals[sub.taskId]?.revealed);
      if (isTaskRevealed) {
        const isExplicitNonMastery = criteriaMet === false || nonMastery === true;
        if (!isExplicitNonMastery) {
          return { state, result: { ok: false, code: 'INVALID_ASSESSMENT' } };
        }
      }

      const openRecord = next.openAssessments[submissionId];
      openRecord.status = 'assessed';
      openRecord.criteriaMet = criteriaMet;
      openRecord.feedback = feedback;
      openRecord.assessedAt = now;
      if (nonMastery !== undefined) {
        openRecord.nonMastery = nonMastery;
      }

      sub.ok = criteriaMet;
      sub.assessmentStatus = 'assessed';
      if (isTaskRevealed || nonMastery === true) {
        sub.assisted = true;
      }

      const learnerId = sub.learnerId;
      const taskId = sub.taskId;

      const relevantEvidence = (next.package.evidenceRules || [])
        .filter((r) => r.taskId === taskId)
        .map((r) => r.id);

      next.passports[learnerId] = recordTaskSubmission(
        next.passports[learnerId],
        {
          submissionId,
          taskId,
          activityId: sub.activityId,
          answer: sub.answer,
          ok: criteriaMet,
          assessmentStatus: 'assessed',
          assisted: sub.assisted,
          evidenceIds: relevantEvidence,
          now
        },
        next.package
      );

      // Ledger reward update
      const ledgerKey = `${next.id}:${next.round}:${sub.activityId}:${taskId}:learner:${learnerId}`;
      const canGrantReward = criteriaMet && !isTaskRevealed && nonMastery !== true;
      if (canGrantReward) {
        if (!next.rewardLedger[ledgerKey]) {
          const amount = next.rewardPolicy.individualCorrect;
          next.rewardLedger[ledgerKey] = {
            amount,
            recipientType: 'learner',
            recipientId: learnerId,
            taskId,
            submissionId,
            active: true
          };
          if (!next.gameWallets.learners[learnerId]) {
            next.gameWallets.learners[learnerId] = { earned: 0, bonus: 0 };
          }
          next.gameWallets.learners[learnerId].earned += amount;
        } else if (!next.rewardLedger[ledgerKey].active) {
          next.rewardLedger[ledgerKey].active = true;
          next.gameWallets.learners[learnerId].earned += next.rewardLedger[ledgerKey].amount;
        }
      } else {
        if (next.rewardLedger[ledgerKey] && next.rewardLedger[ledgerKey].active) {
          next.rewardLedger[ledgerKey].active = false;
          next.gameWallets.learners[learnerId].earned = Math.max(
            0,
            next.gameWallets.learners[learnerId].earned - next.rewardLedger[ledgerKey].amount
          );
        }
      }

      mutationResult = {
        ok: true,
        revision: nextRevision,
        type: 'ASSESS',
        submissionId,
        correct: criteriaMet
      };
      break;
    }

    case 'CHOOSE_MASCOT': {
      const mascot = payload.mascot;
      if (!Number.isInteger(mascot) || mascot < 0 || mascot >= MASCOT_COUNT) {
        return { state, result: { ok: false, code: 'INVALID_EVENT' } };
      }
      // The first choice is always allowed (also for a pupil who joins late); after that it can change only while the room is waiting.
      if (Number.isInteger(next.roster[actor.id].mascot) && state.status !== 'waiting') {
        return { state, result: { ok: false, code: 'MASCOT_LOCKED' } };
      }
      next.roster[actor.id].mascot = mascot;
      mutationResult = { ok: true, revision: nextRevision, type: 'CHOOSE_MASCOT', mascot };
      break;
    }

    case 'SELECT_BRANCH': {
      const branch = payload.branch;
      if (branch !== 'support' && branch !== 'core' && branch !== 'extension') {
        return { state, result: { ok: false, code: 'INVALID_EVENT' } };
      }
      const currAct = next.package.activities[next.timeline.activityIndex];
      const currActId = next.timeline.currentActivityId;
      const actTasks = (next.package.tasks || []).filter((t) => currAct?.taskIds?.includes(t.id));

      // Reject branch if current activity has no task for this branch
      if (!actTasks.some((t) => t.branch === branch)) {
        return { state, result: { ok: false, code: 'BRANCH_LOCKED' } };
      }

      if (branch === 'extension') {
        const eligibility = extensionEligibility({
          activity: currAct,
          package: next.package,
          passport: next.passports[actor.id]
        });
        if (!eligibility.eligible) {
          return { state, result: { ok: false, code: 'BRANCH_LOCKED' } };
        }
      }

      if (!next.branches[currActId]) {
        next.branches[currActId] = {};
      }
      next.branches[currActId][actor.id] = branch;
      mutationResult = { ok: true, revision: nextRevision, type: 'SELECT_BRANCH', branch };
      break;
    }

    case 'SET_BRANCH': {
      const { learnerId, branch } = payload;
      if (!next.roster[learnerId]) {
        return { state, result: { ok: false, code: 'INVALID_LEARNER' } };
      }
      if (branch !== 'support' && branch !== 'core') {
        return { state, result: { ok: false, code: 'INVALID_EVENT' } };
      }
      const currActId = next.timeline.currentActivityId;
      if (!next.branches[currActId]) {
        next.branches[currActId] = {};
      }
      next.branches[currActId][learnerId] = branch;
      mutationResult = { ok: true, revision: nextRevision, type: 'SET_BRANCH', learnerId, branch };
      break;
    }

    case 'CHOOSE_ROLE': {
      const roleId = payload.roleId;
      const currActId = next.timeline.currentActivityId;
      const grpState = next.groups[currActId];
      if (!grpState) {
        return { state, result: { ok: false, code: 'ROLE_UNAVAILABLE' } };
      }
      if (now > grpState.selectionDeadline) {
        return { state, result: { ok: false, code: 'ROLE_WINDOW_CLOSED' } };
      }
      if (!ROLE_DEFINITIONS.some((r) => r.id === roleId)) {
        return { state, result: { ok: false, code: 'ROLE_UNAVAILABLE' } };
      }

      const group = grpState.groups.find((g) => g.memberIds.includes(actor.id));
      if (!group) {
        return { state, result: { ok: false, code: 'ROLE_UNAVAILABLE' } };
      }

      if (group.roles[roleId] && group.roles[roleId] !== actor.id) {
        return { state, result: { ok: false, code: 'ROLE_UNAVAILABLE' } };
      }

      group.roles[roleId] = actor.id;
      mutationResult = { ok: true, revision: nextRevision, type: 'CHOOSE_ROLE', roleId };
      break;
    }

    case 'GROUP_CONTRIBUTE': {
      const { taskId, text } = payload;
      if (typeof text !== 'string' || text.length > 4000) {
        return { state, result: { ok: false, code: 'INVALID_EVENT' } };
      }
      const currAct = next.package.activities[next.timeline.activityIndex];
      const currActId = next.timeline.currentActivityId;
      if (!currAct || !Array.isArray(currAct.taskIds) || !currAct.taskIds.includes(taskId)) {
        return { state, result: { ok: false, code: 'TASK_NOT_AVAILABLE' } };
      }
      const task = next.package.tasks.find((t) => t.id === taskId);
      if (!task || task.participation !== 'group') {
        return { state, result: { ok: false, code: 'TASK_NOT_AVAILABLE' } };
      }
      const currentBranch = next.branches[currAct.id]?.[actor.id] || 'core';
      if (task.branch && task.branch !== 'shared' && task.branch !== currentBranch) {
        return { state, result: { ok: false, code: 'TASK_NOT_AVAILABLE' } };
      }
      const grpState = next.groups[currActId];
      if (!grpState) {
        return { state, result: { ok: false, code: 'UNAUTHORIZED' } };
      }
      const group = grpState.groups.find((g) => g.memberIds.includes(actor.id));
      if (!group) {
        return { state, result: { ok: false, code: 'UNAUTHORIZED' } };
      }

      if (!group.contributions) {
        group.contributions = [];
      }
      group.contributions.push({
        learnerId: actor.id,
        taskId,
        text,
        at: now
      });

      mutationResult = { ok: true, revision: nextRevision, type: 'GROUP_CONTRIBUTE', taskId };
      break;
    }

    case 'GROUP_SUBMIT': {
      const { taskId, answer } = payload;
      const currAct = next.package.activities[next.timeline.activityIndex];
      const currActId = next.timeline.currentActivityId;
      if (!currAct || !Array.isArray(currAct.taskIds) || !currAct.taskIds.includes(taskId)) {
        return { state, result: { ok: false, code: 'TASK_NOT_AVAILABLE' } };
      }
      const task = next.package.tasks.find((t) => t.id === taskId);
      if (!task || task.participation !== 'group') {
        return { state, result: { ok: false, code: 'TASK_NOT_AVAILABLE' } };
      }
      const currentBranch = next.branches[currAct.id]?.[actor.id] || 'core';
      if (task.branch && task.branch !== 'shared' && task.branch !== currentBranch) {
        return { state, result: { ok: false, code: 'TASK_NOT_AVAILABLE' } };
      }
      const grpState = next.groups[currActId];
      if (!grpState) {
        return { state, result: { ok: false, code: 'UNAUTHORIZED' } };
      }
      const group = grpState.groups.find((g) => g.memberIds.includes(actor.id));
      if (!group) {
        return { state, result: { ok: false, code: 'UNAUTHORIZED' } };
      }

      if (!validateAnswerJson(answer)) {
        return { state, result: { ok: false, code: 'INVALID_ANSWER' } };
      }

      const productKey = `${group.id}:${taskId}`;
      const existingProduct = next.groupProducts[productKey];
      // ponytail: first correct shared product is authoritative; later retries cannot erase it.
      if (existingProduct?.ok === true) {
        mutationResult = { ok: true, revision: nextRevision, type: 'GROUP_SUBMIT', groupId: group.id, correct: true, preserved: true };
        break;
      }

      let isCorrect = false;
      if (task.type === 'closed') {
        const checker = CHECKER_REGISTRY[task.evaluation?.checkerId];
        if (!checker) return { state, result: { ok: false, code: 'INVALID_TASK' } };
        isCorrect = Boolean(checker(answer, task)?.ok);
      }

      next.groupProducts[productKey] = {
        groupId: group.id,
        taskId,
        answer,
        ok: isCorrect,
        submittedBy: actor.id,
        at: now
      };

      const isRevealed = Boolean(next.reveals[taskId]?.revealed);
      if (isCorrect && !isRevealed) {
        const ledgerKey = `${next.id}:${next.round}:${currActId}:${taskId}:group:${group.id}`;
        if (!next.rewardLedger[ledgerKey]) {
          const amount = next.rewardPolicy.groupCorrect;
          next.rewardLedger[ledgerKey] = {
            amount,
            recipientType: 'group',
            recipientId: group.id,
            taskId,
            submissionId: null,
            active: true
          };
          if (!next.gameWallets.groups[group.id]) {
            next.gameWallets.groups[group.id] = { earned: 0, bonus: 0 };
          }
          next.gameWallets.groups[group.id].earned += amount;
        }
      }

      mutationResult = {
        ok: true,
        revision: nextRevision,
        type: 'GROUP_SUBMIT',
        groupId: group.id,
        correct: isCorrect
      };
      break;
    }

    case 'ROLL': {
      if (Object.keys(payload).length > 0) {
        return { state, result: { ok: false, code: 'INVALID_EVENT' } };
      }

      const learnerDice = next.diceTrack[actor.id] || {
        position: 0,
        carry: 0,
        rolls: 0,
        slow: false,
        boost: false
      };

      // Deterministic dice roll from seed and roll count
      const seedStr = `${next.seed}:${actor.id}:${learnerDice.rolls}`;
      let hash = 0;
      for (let i = 0; i < seedStr.length; i++) {
        hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
      }
      const rollVal = 1 + (hash % 6);

      // Core checkpoint calculation
      const gate = (next.timeline.activityIndex + 1) * DICE_UNITS_PER_ACTIVITY;
      // Carry is excess movement in the same activity-coordinate units as position.
      const targetPos = learnerDice.position + learnerDice.carry + rollVal;
      const newPos = Math.min(gate, targetPos);
      const carry = Math.max(0, targetPos - gate);

      next.diceTrack[actor.id] = {
        position: newPos,
        carry,
        rolls: learnerDice.rolls + 1,
        slow: false,
        boost: false
      };

      mutationResult = {
        ok: true,
        revision: nextRevision,
        type: 'ROLL',
        position: newPos,
        from: learnerDice.position,
        die: rollVal
      };
      break;
    }

    case 'ADD_LEARNER': {
      const learner = payload.learner;
      if (!learner || !isValidIdentifier(learner.id)) {
        return { state, result: { ok: false, code: 'INVALID_LEARNER' } };
      }
      if (learner.id === 'system' || learner.id === next.hostId) {
        return { state, result: { ok: false, code: 'INVALID_LEARNER' } };
      }

      if (next.roster[learner.id]) {
        // Rejoin existing learner
        if (learner.name && learner.name !== next.roster[learner.id].name) {
          return { state, result: { ok: false, code: 'INVALID_LEARNER' } };
        }
        next.roster[learner.id].present = learner.present !== false;
        if (learner.deviceId !== undefined) {
          next.roster[learner.id].deviceId = learner.deviceId;
        }

        // Restore to archived group membership if present
        if (learner.present !== false) {
          const currActId = next.timeline.currentActivityId;
          const grpState = next.groups[currActId];
          if (grpState && Array.isArray(grpState.groups)) {
            let restored = false;
            for (const g of grpState.groups) {
              if (g.archivedMemberIds && g.archivedMemberIds.includes(learner.id)) {
                g.archivedMemberIds = g.archivedMemberIds.filter((m) => m !== learner.id);
                if (!g.memberIds.includes(learner.id)) {
                  g.memberIds.push(learner.id);
                }
                restored = true;
                break;
              } else if (g.memberIds.includes(learner.id)) {
                restored = true;
                break;
              }
            }
            if (!restored) {
              let placed = false;
              for (const g of grpState.groups) {
                if (g.memberIds.length < 4) {
                  g.memberIds.push(learner.id);
                  placed = true;
                  break;
                }
              }
              if (!placed) {
                grpState.groups.push({
                  id: `grp-${currActId}-${grpState.groups.length + 1}`,
                  memberIds: [learner.id],
                  roles: {},
                  contributions: [],
                  productSubmissionIds: []
                });
              }
            }
          }
        }
      } else {
        // New learner
        if (typeof learner.name !== 'string' || learner.name.trim().length === 0) {
          return { state, result: { ok: false, code: 'INVALID_LEARNER' } };
        }
        next.roster[learner.id] = {
          id: learner.id,
          name: learner.name,
          deviceId: learner.deviceId || null,
          present: learner.present !== false
        };
        next.passports[learner.id] = createLearnerPassport(learner.id, next.package);
        next.diceTrack[learner.id] = {
          position: 0,
          carry: 0,
          rolls: 0,
          slow: false,
          boost: false
        };
        next.gameWallets.learners[learner.id] = { earned: 0, bonus: 0 };

        // Add to group if current activity has groups
        const currActId = next.timeline.currentActivityId;
        const grpState = next.groups[currActId];
        if (grpState && Array.isArray(grpState.groups)) {
          let placed = false;
          for (const g of grpState.groups) {
            if (g.memberIds.length < 4) {
              g.memberIds.push(learner.id);
              placed = true;
              break;
            }
          }
          if (!placed) {
            grpState.groups.push({
              id: `grp-${currActId}-${grpState.groups.length + 1}`,
              memberIds: [learner.id],
              roles: {},
              contributions: [],
              productSubmissionIds: []
            });
          }
        }
      }

      mutationResult = { ok: true, revision: nextRevision, type: 'ADD_LEARNER', learnerId: learner.id };
      break;
    }

    case 'LEAVE_LEARNER': {
      const learnerId = payload.learnerId;
      if (!next.roster[learnerId]) {
        return { state, result: { ok: false, code: 'INVALID_LEARNER' } };
      }
      next.roster[learnerId].present = false;

      // Rebalance roles in current group: move to archivedMemberIds and clear roles
      const currActId = next.timeline.currentActivityId;
      const grpState = next.groups[currActId];
      if (grpState && Array.isArray(grpState.groups)) {
        for (const g of grpState.groups) {
          if (g.memberIds.includes(learnerId)) {
            if (!g.archivedMemberIds) {
              g.archivedMemberIds = [];
            }
            if (!g.archivedMemberIds.includes(learnerId)) {
              g.archivedMemberIds.push(learnerId);
            }
            g.memberIds = g.memberIds.filter((m) => m !== learnerId);
            for (const [rId, mId] of Object.entries(g.roles)) {
              if (mId === learnerId) {
                delete g.roles[rId];
              }
            }
          }
        }
      }

      mutationResult = { ok: true, revision: nextRevision, type: 'LEAVE_LEARNER', learnerId };
      break;
    }

    default:
      return { state, result: { ok: false, code: 'INVALID_EVENT' } };
  }

  updateGateHistory(state, next, event, actor, now, DICE_UNITS_PER_ACTIVITY);

  // Update revision and store in eventCache
  next.revision = nextRevision;
  next.eventCache[cacheKey] = {
    fingerprint,
    originalRevision: event.revision,
    result: {
      ...mutationResult,
      replay: false
    }
  };

  return {
    state: next,
    result: {
      ...mutationResult,
      replay: false
    }
  };
}
