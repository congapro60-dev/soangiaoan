/**
 * Pure immutable lesson session runtime reducer.
 */

import {explorationCommand, closeExploration, recordExplorationRoll} from './exploration.js';
import { initLessonMode, applyLessonMode, applyLessonModeAction, syncLessonModeLearner, tickLessonMode } from './mode-bridge.js';
import { startClassEvent, answerClassEvent, pickClassEvent, buzzClassEvent, finishClassEvent, leaveClassEvent } from './class-events.js';
import { sanitizeLessonIntegrations, sanitizeValueReflection, grantValueBadge, revokeValueBadge } from './values.js';
import { reducePractice, assessPracticeSubmission } from './revisit.js';
import { groupRoleLayout, proposeGroupDraft, voteGroupDraft, groupDraftConsent, createGroupDice, advanceGroupDiceTurn, rollGroupDice } from './group-policy.js';
import { canonicalize, hashPackage, CHECKER_REGISTRY, verdictMeta } from './schema.js';
import { createHash } from 'node:crypto';
import { isSelfPaced, scopeToLearner, selfPacedPackage, advanceLearner, learnerGateIndex, taskDone, lessonMinutes, placeLateLearner, initClassQuest, questsOf, questJoined, questJoinedAll, questMandatoryHold, closeOpenQuest, ensureLaneBranches } from './self-pace.js';
import { validateLessonPackage } from './validate.js';
import { updateGateHistory } from './gate-history.js';
import { exitTaskIds } from './evidence.js';
import { tutorCommand, tutorAssisted, updateTutors } from './tutor.js';
import {
  extensionEligibility,
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
    return val.length <= 160000; // drawingPhoto data URLs (~150KB) must pass; transport caps still bind at MAX_EVENT_BYTES.
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
    if (serialized && serialized.length > 262144) {
      return false;
    }
  } catch {
    return false;
  }
  return validatePayloadDepthAndKeys(answer, 0);
}

const ALLOWED_PAYLOAD_KEYS = Object.freeze({
  EXPLORATION_CONFIG: new Set(['enabled']),
  EXPLORATION_WINDOW: new Set(['open']),
  EXPLORATION_REFLECT: new Set(['cardId','choice']),
  EXPLORATION_READ: new Set(['cardId']),
  TUTOR_NEED: new Set(['needed']),
  TUTOR_REQUEST: new Set(['recipientId']),
  TUTOR_RESPOND: new Set(['requestId','accept']),
  TUTOR_END: new Set(['requestId']),
  TUTOR_REVOKE: new Set(['requestId']),
  REVISIT: new Set(['activityId', 'branch']),
  REVISIT_SUBMIT: new Set(['answer', 'attemptId','confirmed','usedAI']),
  REVISIT_HINT: new Set(['hintId', 'attemptId']),
  SET_REVISIT: new Set(['enabled']),
  SET_PRACTICE_GRADING: new Set(['enabled']),
  SET_VALUES: new Set(['integrationIds','aiPolicy']),
  VALUE_REFLECT: new Set(['reflection']),
  VALUE_BADGE: new Set(['learnerId','valueId','evidenceId','reason']),
  VALUE_REVOKE: new Set(['learnerId','valueId','evidenceId','reason']),
  INTEGRITY: new Set(['confirmed','usedAI']),
  TEACHER_RESPONSE: new Set(['learnerId','taskId','answer']),
  CLASS_EVENT_OPEN: new Set(['type','durationMs','seed','slot']),
  CLASS_EVENT_ANSWER: new Set(['eventId','step','answer','requestId']),
  CLASS_EVENT_BUZZ: new Set(['eventId','step','requestId']),
  CLASS_EVENT_PICK: new Set(['eventId','cellId','requestId']),
  CLASS_EVENT_CLOSE: new Set([]),
  SET_MODE: new Set(['rule','participation']),
  MODE_ACTION: new Set(['requestId','rule','round','startedAt','instanceId','sequence','action']),
  START: new Set([]),
  PAUSE: new Set([]),
  RESUME: new Set([]),
  NEXT: new Set(['force']),
  LOCK: new Set([]),
  UNLOCK: new Set([]),
  REVEAL: new Set(['taskId']),
  EXTEND: new Set(['minutes']),
  ASSESS: new Set(['submissionId', 'criteriaMet', 'feedback', 'nonMastery', 'reason']),
  SELF_ASSESS: new Set(['levels']),
  ASSESS_BATCH_APPLY: new Set(['requestId', 'assessments']),
  ASSESS_AUTOMATIC_BATCH: new Set(['requestId', 'sourceFingerprint', 'assessments']),
  ASSESS_AUTOMATIC: new Set(['submissionId', 'criteriaMet', 'feedback', 'model', 'sourceFingerprint', 'auditReceipt', 'confidence']),
  ASSESS_COMMENT: new Set(['submissionId', 'feedback', 'model', 'sourceFingerprint', 'auditReceipt', 'confidence']),
  ASSESS_NEEDS_REVIEW: new Set(['submissionId', 'reason', 'model', 'sourceFingerprint', 'auditReceipt']),
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
  GROUP_PROPOSE: new Set(['taskId', 'answer', 'proposalId']),
  GROUP_VOTE: new Set(['taskId', 'proposalHash']),
  GROUP_SUBMIT: new Set(['taskId', 'answer', 'proposalHash']),
  GROUP_ASSESS: new Set(['groupId', 'taskId', 'proposalHash', 'criteriaMet', 'feedback']),
  ROLL: new Set([])
  ,ARENA_OPEN: new Set(['seed'])
  ,ARENA_ANSWER: new Set(['answer', 'step', 'requestId'])
  ,ARENA_COMBAT: new Set(['target', 'action', 'requestId'])
  ,ARENA_SETTLE: new Set([])
});

const TEACHER_COMMANDS = new Set([
  'EXPLORATION_CONFIG','EXPLORATION_WINDOW',
  'TUTOR_REVOKE',
  'SET_MODE',
  'CLASS_EVENT_OPEN','CLASS_EVENT_CLOSE',
  'SET_VALUES', 'VALUE_BADGE', 'VALUE_REVOKE',
  'TEACHER_RESPONSE',
  'SET_REVISIT',
  'SET_PRACTICE_GRADING',
  'START',
  'PAUSE',
  'RESUME',
  'NEXT',
  'LOCK',
  'UNLOCK',
  'REVEAL',
  'EXTEND',
  'ASSESS',
  'ASSESS_BATCH_APPLY',
  'ASSESS_AUTOMATIC_BATCH',
  'ASSESS_AUTOMATIC',
  'ASSESS_NEEDS_REVIEW',
  'ASSESS_COMMENT',
  'GROUP_ASSESS',
  'SET_BRANCH',
  'ADD_LEARNER',
  'LEAVE_LEARNER',
  'CONCLUDE'
  ,'ARENA_OPEN'
  ,'ARENA_SETTLE'
]);

const STUDENT_COMMANDS = new Set([
  'EXPLORATION_REFLECT','EXPLORATION_READ',
  'TUTOR_NEED','TUTOR_REQUEST','TUTOR_RESPOND','TUTOR_END',
  'CLASS_EVENT_ANSWER','CLASS_EVENT_PICK','CLASS_EVENT_BUZZ',
  'VALUE_REFLECT', 'INTEGRITY',
  'SELF_ASSESS',
  'REVISIT', 'REVISIT_SUBMIT', 'REVISIT_HINT',
  'MODE_ACTION',
  'SAVE_DRAFT',
  'SUBMIT',
  'HINT',
  'SELECT_BRANCH',
  'CHOOSE_ROLE',
  'CHOOSE_MASCOT',
  'GROUP_CONTRIBUTE',
  'GROUP_PROPOSE',
  'GROUP_VOTE',
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
/** "Đổi mức": self-chosen level changes allowed per activity, and the wait before stepping down (plan 19.4). */
export const BRANCH_SWITCH_LIMIT = 2;
export const BRANCH_DOWN_AFTER_MS = 3 * 60 * 1000;

export function groupActiveMs(state, now) {
  const clock = state.clock;
  const paused = clock.pausedAt == null ? 0 : Math.max(0, now - clock.pausedAt);
  const arena = clock.arenaPausedAt == null ? 0 : Math.max(0, Math.min(now, state.arena?.event?.resumeAt ?? now) - clock.arenaPausedAt);
  const overlap = clock.pausedAt == null || clock.arenaPausedAt == null ? 0 : Math.max(0, Math.min(now, state.arena?.event?.resumeAt ?? now) - Math.max(clock.pausedAt, clock.arenaPausedAt));
  const eventElapsed = clock.classEventPausedAt == null ? 0 : Math.min(state.classEvent?.durationMs || 0, Math.max(0, classEventActiveNow(state, now) - (state.classEvent?.startedAt || 0)));
  return Math.max(0, now - (clock.startedAt ?? now) - (clock.totalPausedMs || 0) - paused - arena + overlap - eventElapsed);
}

export function classEventActiveNow(state, now) {
  if (!state.classEvent) return 0;
  if (state.classEvent.status === 'closed') return state.classEvent.closedAt ?? state.classEvent.endsAt;
  const start = state.clock.classEventWallStartedAt ?? state.clock.classEventPausedAt ?? now;
  const ongoingPause = state.clock.pausedAt == null ? 0 : Math.max(0, now - Math.max(start, state.clock.pausedAt));
  return state.classEvent.startedAt + Math.max(0, now - start - (state.clock.classEventTeacherPausedMs || 0) - ongoingPause);
}

function closeClassEvent(state, actor, now) {
  if (!state.classEvent) return;
  const logical = Math.min(classEventActiveNow(state, now), state.classEvent.endsAt);
  state.classEvent = finishClassEvent(state.classEvent, actor, logical);
  closeOpenQuest(state, now);
  if (state.clock.classEventPausedAt != null) {
    const elapsed = Math.max(0, logical - state.classEvent.startedAt);
    if (state.clock.activityDeadline != null) state.clock.activityDeadline += elapsed;
    state.clock.activityPausedMs = (state.clock.activityPausedMs || 0) + elapsed;
    state.clock.totalPausedMs = (state.clock.totalPausedMs || 0) + elapsed;
    state.clock.classEventBudgetUsedMs = (state.clock.classEventBudgetUsedMs || 0) + elapsed;
    state.clock.classEventPausedAt = null;
  }
}

function syncModeLearner(state, learnerId) {
  syncLessonModeLearner(state, learnerId);
}

function createSessionGroups(state, activity, now) {
  const version = state.groupPolicyVersion === 1 ? 1 : 0;
  const learners = Object.values(state.roster).filter(learner => version || learner.present);
  const stationIndex = state.package.activities.slice(0, state.timeline.activityIndex).filter(item => item.participation === 'group').length;
  const groups = createActivityGroups({ activity, learners, seed: state.seed, now, groupPolicyVersion: version, stationIndex });
  if (version) {
    const activeMs = groupActiveMs(state, now);
    groups.selectionActiveDeadline = activeMs + 15000;
    state.groupDice ||= {};
    for (const group of groups.groups) {
      const layout = groupRoleLayout(group.memberIds.filter(id => state.roster[id]?.present !== false), { stationIndex });
      Object.assign(group, { ...layout, defaultRoles: layout.roles, roles: {}, phase: 'individual_think', needsSupport: [], startedActiveMs: activeMs });
      if (!state.groupDice[group.id]) {
        state.groupDice[group.id] = createGroupDice(group, activeMs);
        state.groupDice[group.id].position = Math.max(0, ...group.memberIds.map(id => state.diceTrack[id]?.position || 0));
      }
      state.groupDice[group.id].turnIndex %= group.memberIds.length;
    }
  }
  return groups;
}

function currentGroupTask(state, learnerId, taskId) {
  const activity = state.package.activities[state.timeline.activityIndex];
  const task = state.package.tasks.find(item => item.id === taskId);
  const branch = state.branches[activity.id]?.[learnerId] || 'core';
  if (!activity.taskIds.includes(taskId) || !task || task.participation !== 'group' || (task.branch && task.branch !== 'shared' && task.branch !== branch)) throw new Error('TASK_NOT_AVAILABLE');
  const group = state.groups[activity.id]?.groups.find(item => item.memberIds.includes(learnerId));
  if (!group) throw new Error('UNAUTHORIZED');
  return { activity, task, group };
}

function rewardGroupProduct(state, product) {
  if (product.ok !== true || state.reveals[product.taskId]?.revealed) return;
  const ledgerKey = `${state.id}:${state.round}:${product.activityId}:${product.taskId}:group:${product.groupId}`;
  if (state.rewardLedger[ledgerKey]) return;
  const amount = state.rewardPolicy.groupCorrect;
  state.rewardLedger[ledgerKey] = { amount, recipientType: 'group', recipientId: product.groupId, taskId: product.taskId, submissionId: null, active: true };
  state.gameWallets.groups[product.groupId] ||= { earned: 0, bonus: 0 };
  state.gameWallets.groups[product.groupId].earned += amount;
}

function addCurrentGroupLearner(state, learner, now) {
  const groupState = state.groups[state.timeline.currentActivityId];
  if (!groupState || learner.present === false) return;
  let group = groupState.groups.find(item => item.memberIds.includes(learner.id));
  if (!group) group = learner.teamId ? groupState.groups.find(item => item.teamId === learner.teamId)
    : groupState.groups.find(item => !item.teamId && item.memberIds.length < 4);
  if (!group) {
    group = { id: learner.teamId ? `team:${learner.teamId}` : `grp-${groupState.groups.length + 1}`,
      ...(learner.teamId ? { teamId: learner.teamId } : {}), memberIds: [], roles: {}, contributions: [], productSubmissionIds: [],
      phase: 'individual_think', needsSupport: [], startedActiveMs: groupActiveMs(state, now) };
    groupState.groups.push(group);
  }
  if (!group.memberIds.includes(learner.id)) group.memberIds.push(learner.id);
  group.archivedMemberIds = (group.archivedMemberIds || []).filter(id => id !== learner.id);
  const layout = groupRoleLayout(group.memberIds.filter(id => state.roster[id]?.present !== false), { stationIndex: groupState.stationIndex || 0 });
  group.roleDefinitions = layout.roleDefinitions; group.subgroups = layout.subgroups; group.defaultRoles = layout.roles;
  group.roles = Object.fromEntries(Object.entries(group.roles).filter(([roleId, id]) => layout.roleDefinitions.some(role => role.id === roleId) && state.roster[id]?.present !== false));
  state.groupDice[group.id] ||= createGroupDice(group, groupActiveMs(state, now));
}

export { extensionEligibility } from './passport.js';

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
  rewardPolicy = { individualCorrect: 0, groupCorrect: 0 },
  groupPolicyVersion = 1,
  learningPolicyVersion = 1
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
  if (groupPolicyVersion !== 0 && groupPolicyVersion !== 1) throw new Error('INVALID_GROUP_POLICY');
  if (learningPolicyVersion !== 0 && learningPolicyVersion !== 1) throw new Error('INVALID_LEARNING_POLICY');
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
      teamId: isValidIdentifier(learner.teamId) ? learner.teamId : null,
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
    groupPolicyVersion,
    learningPolicyVersion,
    groupDice: {},
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
export function reduceLessonSession(state, event, context) {
  if (!isSelfPaced(state)) return reduceCore(state, event, context);
  const type = event?.type, actor = context?.actor;
  if (type === 'NEXT') return { state, result: { ok: false, code: 'SELF_PACED' } };
  if (actor?.role === 'student' && state.roster?.[actor.id] && STUDENT_COMMANDS.has(type)) {
    const scoped = scopeToLearner(state, actor.id);
    const out = reduceCore(scoped, event, context);
    if (!out.result.ok || out.result.replay) return { state, result: out.result };
    const merged = { ...out.state, package: state.package, timeline: state.timeline };
    if (type === 'SUBMIT') { advanceLearner(merged, actor.id); openClassQuest(merged, context.now); }
    return { state: merged, result: out.result };
  }
  // GV mở hoạt động tập thể khi tự đi: dùng câu của cổng mốc tương ứng (slot 0 bắt buộc, slot 1 tuỳ chọn; timeline chung vẫn ở cổng 1).
  const questSlot = Number.isInteger(event.payload?.slot) ? event.payload.slot : 0;
  const quest = type === 'CLASS_EVENT_OPEN' ? questsOf(state).find(item => item.slot === questSlot && item.status !== 'closed') ?? null : null;
  const base = { ...state, package: quest ? questPackage(selfPacedPackage(state.package)) : selfPacedPackage(state.package), ...(quest ? { timeline: { ...state.timeline, activityIndex: quest.gateIndex, currentActivityId: quest.activityId } } : {}) };
  if (quest) ensureLaneBranches(base, quest.activityId);
  const out = reduceCore(base, quest && event.activityId === state.timeline.currentActivityId ? { ...event, activityId: quest.activityId } : event, context);
  if (!out.result.ok) return { state, result: out.result };
  const merged = { ...out.state, package: state.package, ...(quest ? { timeline: state.timeline } : {}) };
  if (quest) {
    writeQuestPatch(merged, quest.slot, { status: 'open', openedAt: context.now });
    if (merged.classEvent) merged.classEvent = { ...merged.classEvent, mandatory: quest.mandatory === true, questSlot: quest.slot };
  }
  if (type === 'START') {
    merged.clock = { ...merged.clock, activityDeadline: merged.clock.startedAt + lessonMinutes(state.package) * 60 * 1000 };
    const planned = merged.teacherSetup?.event?.type;
    initClassQuest(merged, planned && planned !== 'none' ? planned : 'boss', 0);
    const first = questsOf(merged).find(item => item.slot === 0)?.eventType;
    initClassQuest(merged, first === 'tug' ? 'relay' : 'tug', 1);
  }
  if (type === 'ADD_LEARNER' && merged.status !== 'waiting' && !state.roster?.[event.payload?.learner?.id]) placeLateLearner(merged, event.payload.learner.id, context.now, DICE_UNITS_PER_ACTIVITY);
  return { state: merged, result: out.result };
}

// Trò chơi của nhiệm vụ cả lớp luôn được tối thiểu 3 phút (đồng hồ tiết cộng thêm đúng thời gian chơi).
const questPackage = pkg => ({ ...pkg, budget: { ...pkg.budget, reserveMinutes: Math.max(3, Number(pkg.budget?.reserveMinutes) || 0) } });

// Cả lớp (mọi em có mặt) đã qua cổng mốc: tự mở hoạt động tập thể bằng câu của cổng mốc (slot 0 bắt buộc, slot 1 tuỳ chọn).
// Không đủ quỹ thời gian dự phòng hoặc không mở được thì để trạng thái 'ready' để GV mở tay khi phù hợp.
function openClassQuest(state, now) {
  for (const quest of questsOf(state)) {
    if (quest.status !== 'pending') continue;
    const learners = Object.keys(state.roster || {}).filter(id => state.roster[id]?.present !== false);
    const passed = learners.filter(id => learnerGateIndex(state, id) > quest.gateIndex || state.selfFinished?.[id]).length;
    if (!learners.length || passed < learners.length) continue;
    ensureLaneBranches(state, quest.activityId);
    const atGate = { ...state, package: questPackage(state.package), timeline: { ...state.timeline, activityIndex: quest.gateIndex, currentActivityId: quest.activityId } };
    try {
      state.classEvent = { ...startClassEvent(atGate, { type: quest.eventType, seed: state.seed, durationMs: 180000 }, { role: 'teacher', id: state.hostId }, groupActiveMs(state, now)), mandatory: quest.mandatory === true, questSlot: quest.slot };
      state.clock = { ...state.clock, classEventPausedAt: now, classEventWallStartedAt: now, classEventTeacherPausedMs: 0 };
      writeQuestPatch(state, quest.slot, { status: 'open', openedAt: now });
    } catch (error) {
      writeQuestPatch(state, quest.slot, { status: 'ready', reason: error.message });
    }
    return;
  }
}

// Nhiệm vụ cả lớp lưu dạng mảng (classQuests); cập nhật theo slot để an toàn qua các bản sao trạng thái.
function writeQuestPatch(state, slot, patch) {
  state.classQuests = questsOf(state).map(item => item.slot === slot ? { ...item, ...patch } : item);
  delete state.classQuest;
}

function reduceCore(state, event, { actor, now }) {
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

  if (['REVISIT', 'REVISIT_SUBMIT', 'REVISIT_HINT', 'SET_REVISIT', 'SET_PRACTICE_GRADING'].includes(event.type)) {
    if (event.type === 'REVISIT_SUBMIT' && !validateAnswerJson(payload.answer)) return { state, result: { ok: false, code: 'INVALID_ANSWER' } };
    const practice = reducePractice(state, event, actor, now);
    if (practice.result.ok) { updateGateHistory(state,practice.state,event,actor,now,DICE_UNITS_PER_ACTIVITY); practice.state.eventCache[cacheKey] = { fingerprint, result: practice.result }; }
    return practice;
  }

  // 6. Concluded session guard
  if (state.status === 'concluded' && !['TUTOR_REVOKE','SELF_ASSESS','ASSESS_BATCH_APPLY','ASSESS_AUTOMATIC_BATCH','ASSESS_AUTOMATIC','ASSESS_NEEDS_REVIEW','ASSESS'].includes(event.type)) {
    return { state, result: { ok: false, code: 'SESSION_CONCLUDED' } };
  }

  // 7. Activity-bound check
  const ACTIVITY_BOUND_COMMANDS = new Set([
    'EXPLORATION_REFLECT','EXPLORATION_READ',
    'TUTOR_NEED','TUTOR_REQUEST','TUTOR_RESPOND','TUTOR_END',
    'SAVE_DRAFT',
    'SUBMIT',
    'TEACHER_RESPONSE',
    'HINT',
    'GROUP_CONTRIBUTE',
    'GROUP_PROPOSE',
    'GROUP_VOTE',
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
  if (STUDENT_COMMANDS.has(event.type) && !LOBBY_COMMANDS.has(event.type) && event.type !== 'SELF_ASSESS') {
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
    if (!['CLASS_EVENT_ANSWER','CLASS_EVENT_PICK','CLASS_EVENT_BUZZ'].includes(event.type) && state.clock.activityDeadline !== null && state.clock.arenaPausedAt == null && state.clock.classEventPausedAt == null && now >= state.clock.activityDeadline) {
      return { state, result: { ok: false, code: 'ACTIVITY_EXPIRED' } };
    }
  }

  if (event.type === 'ARENA_OPEN' &&
      (state.status === 'waiting' || state.status === 'paused' || state.timeline.locked ||
       (state.clock.activityDeadline !== null && now >= state.clock.activityDeadline))) {
    return { state, result: { ok: false, code: state.status === 'paused' ? 'PAUSED' : state.timeline.locked ? 'LOCKED' : 'NOT_ACTIVE' } };
  }

  if (state.classEvent?.status === 'active' && (classEventActiveNow(state, now) < state.classEvent.endsAt || questMandatoryHold(state)) && !['CLASS_EVENT_ANSWER','CLASS_EVENT_PICK','CLASS_EVENT_BUZZ','CLASS_EVENT_CLOSE','PAUSE','RESUME','TICK','CONCLUDE','LOCK','UNLOCK','ADD_LEARNER','LEAVE_LEARNER'].includes(event.type)) return {state,result:{ok:false,code:'CLASS_EVENT_ACTIVE'}};

  // Clone state immutably for processing mutation
  const next = JSON.parse(JSON.stringify(state));
  next.clock.lastNow = now;
  if(next.lessonMode){const modeState=next.clock.classEventPausedAt!=null?{...next,status:'paused'}:next;const tick=tickLessonMode(modeState,modeState.status==="paused"?next.lessonMode.gameNow:groupActiveMs(next,now));if(tick.ok)next.lessonMode=tick.state.lessonMode;}
  if (next.status === 'active' && next.clock.arenaPausedAt != null && now >= next.arena.event.resumeAt) {
    const settled = settleLessonArena(next, now);
    Object.assign(next, settled.state);
    if (STUDENT_COMMANDS.has(event.type) && !LOBBY_COMMANDS.has(event.type) && next.clock.activityDeadline !== null && now >= next.clock.activityDeadline) return {state, result: {ok: false, code: 'ACTIVITY_EXPIRED'}};
  }
  if (next.classEvent?.status === 'active' && (questJoinedAll(next) || (classEventActiveNow(next, now) >= next.classEvent.endsAt && !questMandatoryHold(next)))) {
    closeClassEvent(next, {role:'teacher',id:next.hostId}, now);
    if (STUDENT_COMMANDS.has(event.type) && !['CLASS_EVENT_ANSWER','CLASS_EVENT_PICK','CLASS_EVENT_BUZZ'].includes(event.type) && !LOBBY_COMMANDS.has(event.type) && next.clock.activityDeadline !== null && now >= next.clock.activityDeadline) return {state,result:{ok:false,code:'ACTIVITY_EXPIRED'}};
  }
  if (['NEXT','CONCLUDE','ARENA_OPEN','CLASS_EVENT_OPEN'].includes(event.type)) closeExploration(next, now);
  const nextRevision = next.revision + 1;

  let mutationResult = null;

  // Dispatch event handler
  switch (event.type) {
    case 'SELF_ASSESS': {
      if (state.status === 'waiting') return {state,result:{ok:false,code:'NOT_ACTIVE'}};
      const levels = payload.levels;
      if (!levels || typeof levels !== 'object' || Array.isArray(levels) ||
          Object.keys(levels).length !== 3 || !['must','should','could'].every(key => Object.hasOwn(levels,key) && ['not_started','working','met'].includes(levels[key]))) {
        return { state, result: { ok:false, code:'INVALID_SELF_ASSESSMENT' } };
      }
      next.selfAssessments ||= {};
      next.selfAssessments[actor.id] = { ...levels, updatedAt: now };
      mutationResult = { ok:true, revision:nextRevision, type:event.type }; break;
    }
    case 'ASSESS_AUTOMATIC_BATCH': {
      const { requestId, sourceFingerprint, assessments } = payload;
      if (!isValidIdentifier(requestId) || requestId.length > 120 || typeof sourceFingerprint !== 'string' || !sourceFingerprint || sourceFingerprint.length > 128 || !Array.isArray(assessments) || assessments.length < 1 || assessments.length > 100) return { state, result: { ok: false, code: 'INVALID_AUTOMATIC_ASSESSMENT_BATCH' } };
      const fingerprint = createHash('sha256').update(canonicalize({ sourceFingerprint, assessments })).digest('hex');
      next.automaticAssessBatches ||= {};
      const prior = next.automaticAssessBatches[requestId];
      if (prior) {
        if (prior.fingerprint !== fingerprint) return { state, result: { ok: false, code: 'REQUEST_ID_CONFLICT' } };
        return { state, result: { ok: true, type: event.type, requestId, applied: prior.applied, replay: true } };
      }
      const ids = new Set();
      const latestAnswers = new Map();
      for (const submission of Object.values(state.submissions || {})) {
        if (submission.source === 'practice' || submission.source === 'teacher_recorded_response') continue;
        const key = JSON.stringify([submission.learnerId, submission.taskId]), old = latestAnswers.get(key);
        if (!old || (submission.at || 0) >= (old.at || 0)) latestAnswers.set(key, submission);
      }
      for (const item of assessments) {
        if (!item || typeof item !== 'object' || Array.isArray(item) ||
            typeof item.submissionId !== 'string' || !isValidIdentifier(item.submissionId) || ids.has(item.submissionId) ||
            (item.status !== 'ai_assessed' && item.status !== 'needs_review' && item.status !== 'ai_commented')) return { state, result: { ok: false, code: 'INVALID_AUTOMATIC_ASSESSMENT_BATCH' } };
        ids.add(item.submissionId);
        const sub = state.submissions?.[item.submissionId], record = state.openAssessments?.[item.submissionId];
        const task = state.package.tasks.find(candidate => candidate.id === sub?.taskId);
        if (item.status === 'ai_commented') {
          // V28 Phase C — nhận xét AI cho luyện tập nền B: bản ghi mới, không đụng vé.
          if (!sub || !record || sub.source !== 'practice' || sub.assessmentStatus !== 'submitted' || record.status !== 'comment_pending' || task?.type !== 'open' ||
              state.practice?.[sub.learnerId]?.submission?.submissionId !== item.submissionId || !state.roster?.[sub.learnerId]?.present) return { state, result: { ok: false, code: 'INVALID_ASSESSMENT' } };
          if (typeof item.feedback !== 'string' || !item.feedback || item.feedback.length > 2000 || typeof item.model !== 'string' || !item.model || item.model.length > 200 || item.sourceFingerprint !== undefined && item.sourceFingerprint !== sourceFingerprint) return { state, result: { ok: false, code: 'INVALID_AUTOMATIC_ASSESSMENT_BATCH' } };
          if (item.confidence !== undefined && (!Number.isFinite(item.confidence) || item.confidence < 0 || item.confidence > 1)) return { state, result: { ok: false, code: 'INVALID_AUTOMATIC_ASSESSMENT_BATCH' } };
          continue;
        }
        if (!sub || record?.status !== 'pending' || sub.assessmentStatus !== 'pending' || task?.type !== 'open') return { state, result: { ok: false, code: 'INVALID_ASSESSMENT' } };
        if (sub.source === 'practice') {
          // Công tắc A: AI chấm luyện tập như vé — chỉ bản ghi pending của lượt luyện hiện tại.
          if (state.practice?.[sub.learnerId]?.submission?.submissionId !== item.submissionId || !state.roster?.[sub.learnerId]?.present) return { state, result: { ok: false, code: 'INVALID_ASSESSMENT' } };
        } else if (sub.source === 'teacher_recorded_response' || !exitTaskIds(state, sub.learnerId).has(sub.taskId) || latestAnswers.get(JSON.stringify([sub.learnerId, sub.taskId])) !== sub || !state.roster?.[sub.learnerId]?.present) return { state, result: { ok: false, code: 'INVALID_ASSESSMENT' } };
        if (item.status === 'ai_assessed' && (typeof item.criteriaMet !== 'boolean' || typeof item.feedback !== 'string' || item.feedback.length > 2000 || typeof item.model !== 'string' || item.model.length > 200 || typeof item.auditReceipt !== 'string' || item.auditReceipt.length > 200 || item.sourceFingerprint !== undefined && item.sourceFingerprint !== sourceFingerprint || item.confidence !== undefined && (!Number.isFinite(item.confidence) || item.confidence < 0 || item.confidence > 1))) return { state, result: { ok: false, code: 'INVALID_AUTOMATIC_ASSESSMENT_BATCH' } };
        if (item.status === 'needs_review' && (typeof item.reason !== 'string' || !item.reason || item.reason.length > 200 || item.model !== undefined && (typeof item.model !== 'string' || item.model.length > 200) || item.auditReceipt !== undefined && (typeof item.auditReceipt !== 'string' || item.auditReceipt.length > 200) || item.sourceFingerprint !== undefined && item.sourceFingerprint !== sourceFingerprint)) return { state, result: { ok: false, code: 'INVALID_AUTOMATIC_ASSESSMENT_BATCH' } };
      }
      const source = assessments.map(item => {
        const sub = state.submissions[item.submissionId];
        const task = state.package.tasks.find(candidate => candidate.id === sub.taskId);
        return { sub, task };
      });
      const expectedSourceFingerprint = createHash('sha256').update(canonicalize(source)).digest('hex');
      if (sourceFingerprint !== expectedSourceFingerprint) return { state, result: { ok: false, code: 'ASSESSMENT_SOURCE_CHANGED' } };
      let current = state;
      for (let i = 0; i < assessments.length; i++) {
        const item = assessments[i];
        const step = reduceCore(current, {
          eventId: `automatic-${requestId}-${i}`,
          type: item.status === 'ai_assessed' ? 'ASSESS_AUTOMATIC' : item.status === 'ai_commented' ? 'ASSESS_COMMENT' : 'ASSESS_NEEDS_REVIEW',
          round: current.round,
          revision: current.revision,
          payload: item.status === 'ai_assessed'
            ? { submissionId: item.submissionId, criteriaMet: item.criteriaMet, feedback: item.feedback, model: item.model, sourceFingerprint, auditReceipt: item.auditReceipt, ...(item.confidence === undefined ? {} : { confidence: item.confidence }) }
            : item.status === 'ai_commented'
              ? { submissionId: item.submissionId, feedback: item.feedback, model: item.model, sourceFingerprint, auditReceipt: item.auditReceipt, ...(item.confidence === undefined ? {} : { confidence: item.confidence }) }
              : { submissionId: item.submissionId, reason: item.reason, ...(item.model === undefined ? {} : { model: item.model }), ...(item.sourceFingerprint === undefined ? {} : { sourceFingerprint }), ...(item.auditReceipt === undefined ? {} : { auditReceipt: item.auditReceipt }) }
        }, { actor, now });
        if (!step.result.ok) return { state, result: step.result };
        current = step.state;
      }
      current.revision = state.revision + 1;
      for (const key of Object.keys(current.eventCache || {})) if (key.startsWith(`teacher:${actor.id}:automatic-${requestId}-`)) delete current.eventCache[key];
      current.automaticAssessBatches ||= {};
      current.automaticAssessBatches[requestId] = { fingerprint, sourceFingerprint, applied: assessments.length, at: now, actorId: actor.id };
      Object.assign(next, current);
      mutationResult = { ok: true, revision: nextRevision, type: event.type, requestId, applied: assessments.length };
      break;
    }
    case 'ASSESS_BATCH_APPLY': {
      const { requestId, assessments } = payload;
      if (!isValidIdentifier(requestId) || requestId.length > 80 || !Array.isArray(assessments) || assessments.length < 1 || assessments.length > 100) return {state,result:{ok:false,code:'INVALID_ASSESSMENT_BATCH'}};
      const fingerprint = createHash('sha256').update(canonicalize(assessments)).digest('hex');
      next.assessBatches ||= {};
      const prior = next.assessBatches[requestId];
      if (prior) {
        if (prior.fingerprint !== fingerprint) return {state,result:{ok:false,code:'REQUEST_ID_CONFLICT'}};
        return {state,result:{ok:true,type:event.type,requestId,applied:prior.applied,replay:true}};
      }
      const ids = new Set();
      const latestAnswers = new Map();
      for (const submission of Object.values(state.submissions || {})) {
        if (submission.source === 'practice' || submission.source === 'teacher_recorded_response') continue;
        const key = JSON.stringify([submission.learnerId, submission.taskId]), old = latestAnswers.get(key);
        if (!old || (submission.at || 0) >= (old.at || 0)) latestAnswers.set(key, submission);
      }
      for (const item of assessments) {
        if (!item || typeof item !== 'object' || Array.isArray(item) ||
            Object.keys(item).some(key => !['submissionId','criteriaMet','feedback'].includes(key)) ||
            typeof item.submissionId !== 'string' || !isValidIdentifier(item.submissionId) ||
            ids.has(item.submissionId) || typeof item.criteriaMet !== 'boolean' ||
            item.feedback !== undefined && (typeof item.feedback !== 'string' || item.feedback.length > 2000)) return {state,result:{ok:false,code:'INVALID_ASSESSMENT_BATCH'}};
        ids.add(item.submissionId);
        const sub=state.submissions?.[item.submissionId], record=state.openAssessments?.[item.submissionId];
        const task=state.package.tasks.find(task=>task.id===sub?.taskId);
        if (!sub || record?.status !== 'pending' || sub.assessmentStatus !== 'pending' || latestAnswers.get(JSON.stringify([sub.learnerId, sub.taskId])) !== sub ||
            task?.type !== 'open' || !exitTaskIds(state, sub.learnerId).has(sub.taskId) ||
            sub.source === 'practice' || sub.source === 'teacher_recorded_response' || !state.roster?.[sub.learnerId]?.present) return {state,result:{ok:false,code:'INVALID_ASSESSMENT'}};
      }
      let current=state;
      for(let i=0;i<assessments.length;i++){
        const item=assessments[i];
        const step=reduceCore(current,{eventId:`batch-${requestId}-${i}`,type:'ASSESS',round:current.round,revision:current.revision,payload:item},{actor,now});
        if(!step.result.ok)return {state,result:step.result};
        current=step.state;
      }
      const applied=assessments.length;
      current.revision=state.revision+1;
      for(const key of Object.keys(current.eventCache||{}))if(key.startsWith(`teacher:${actor.id}:batch-${requestId}-`))delete current.eventCache[key];
      current.assessBatches||={};
      if(Object.keys(current.assessBatches).length>=100)return {state,result:{ok:false,code:'ASSESSMENT_BATCH_LIMIT'}};
      current.assessBatches[requestId]={fingerprint,applied,at:now,actorId:actor.id};
      Object.assign(next,current);
      mutationResult={ok:true,type:event.type,requestId,applied}; break;
    }
    case 'EXPLORATION_CONFIG': case 'EXPLORATION_WINDOW': case 'EXPLORATION_REFLECT': case 'EXPLORATION_READ': {
      const code=explorationCommand(next,event,actor,now);
      if(code)return {state,result:{ok:false,code}};
      mutationResult={ok:true,revision:nextRevision,type:event.type};break;
    }
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
      const rule = next.gamePlan && (next.teacherSetup?.rule || next.gamePlan.rule || next.gamePlan.ruleId);
      if (rule && !next.lessonMode) {
        const initialized = initLessonMode(next, rule, groupActiveMs(next, now));
        if (initialized.ok) next.lessonMode = initialized.state.lessonMode;
        else next.lessonModeError = initialized.code;
      }

      if (firstAct?.participation === 'group') {
        next.groups[firstAct.id] = createSessionGroups(next, firstAct, now);
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
      if(next.clock.classEventPausedAt!=null)next.clock.classEventTeacherPausedMs=(next.clock.classEventTeacherPausedMs||0)+pausedDelta;
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
        next.groups[nextAct.id] = createSessionGroups(next, nextAct, now);
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
      if (next.classEvent?.status === 'active') closeClassEvent(next, actor, now);
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
      if (grpState && (next.groupPolicyVersion === 1 ? groupActiveMs(next, now) > grpState.selectionActiveDeadline : now > grpState.selectionDeadline)) {
        next.groups[currActId] = autoAssignRemainingRoles(grpState, { now, seed: next.seed, roster: next.roster });
      }
      if (grpState && next.groupPolicyVersion === 1) {
        const activeMs = groupActiveMs(next, now);
        for (const group of next.groups[currActId].groups) {
          next.groupDice[group.id] = advanceGroupDiceTurn(group, next.groupDice[group.id], next.roster, activeMs);
          if (activeMs - group.startedActiveMs > 180000 && group.contributions.length > 0) {
            group.needsSupport = group.memberIds.filter(id => next.roster[id]?.present !== false && !group.contributions.some(item => item.learnerId === id)).map(learnerId => ({ learnerId, reason: 'GROUP_WAIT_EXCEEDED', activeMs }));
            const support = next.package.tasks.some(task => task.activityId === currActId && task.branch === 'support' && task.participation === 'individual');
            if (support) for (const entry of group.needsSupport) next.branches[currActId][entry.learnerId] = 'support';
          }
        }
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

    case 'CLASS_EVENT_OPEN': {
      try { next.classEvent=startClassEvent(next,{...payload,seed:payload.seed??next.seed},actor,groupActiveMs(next,now));next.clock.classEventPausedAt=now;next.clock.classEventWallStartedAt=now;next.clock.classEventTeacherPausedMs=0; } catch(error) {return{state,result:{ok:false,code:error.message}};}mutationResult={ok:true,type:event.type,revision:nextRevision};break;
    }
    case 'CLASS_EVENT_ANSWER': {
      if(!next.classEvent||payload.eventId!==next.classEvent.id)return{state,result:{ok:false,code:'STALE_CLASS_EVENT'}};
      try{next.classEvent=answerClassEvent(next.classEvent,{learnerId:actor.id,step:payload.step,answer:payload.answer,requestId:payload.requestId},classEventActiveNow(next,now));mutationResult={...next.classEvent.lastResult,type:event.type,revision:nextRevision};}catch(error){return{state,result:{ok:false,code:error.message}};}
      if(mutationResult.ok!==false){questJoined(next,actor.id);if(questJoinedAll(next))closeClassEvent(next,{role:'teacher',id:next.hostId},now);}
      break;
    }
    case 'CLASS_EVENT_PICK': {
      if(!next.classEvent||payload.eventId!==next.classEvent.id)return{state,result:{ok:false,code:'STALE_CLASS_EVENT'}};
      try{next.classEvent=pickClassEvent(next.classEvent,{learnerId:actor.id,cellId:payload.cellId,requestId:payload.requestId},classEventActiveNow(next,now));mutationResult={...next.classEvent.lastResult,type:event.type,revision:nextRevision};}catch(error){return{state,result:{ok:false,code:error.message}};}
      if(mutationResult.ok!==false){questJoined(next,actor.id);if(questJoinedAll(next))closeClassEvent(next,{role:'teacher',id:next.hostId},now);}
      break;
    }
    case 'CLASS_EVENT_BUZZ': {
      if(!next.classEvent||payload.eventId!==next.classEvent.id)return{state,result:{ok:false,code:'STALE_CLASS_EVENT'}};
      try{next.classEvent=buzzClassEvent(next.classEvent,{learnerId:actor.id,step:payload.step,requestId:payload.requestId},classEventActiveNow(next,now));mutationResult={...next.classEvent.lastResult,type:event.type,revision:nextRevision};}catch(error){return{state,result:{ok:false,code:error.message}};}
      if(mutationResult.ok!==false){questJoined(next,actor.id);if(questJoinedAll(next))closeClassEvent(next,{role:'teacher',id:next.hostId},now);}
      break;
    }
    case 'CLASS_EVENT_CLOSE': {
      if(!next.classEvent)return{state,result:{ok:false,code:'CLASS_EVENT_REQUIRED'}};
      if (next.classEvent.status === 'active') {try {closeClassEvent(next,actor,now);}catch(error){return{state,result:{ok:false,code:error.message}};}}closeOpenQuest(next,now);mutationResult={ok:true,type:event.type,revision:nextRevision};break;
    }
    case 'MODE_ACTION': {
      const result=applyLessonModeAction(next,payload,{role:'learner',id:actor.id},groupActiveMs(next,now));
      if(!result.ok)return {state,result:{ok:false,code:result.code}};
      next.lessonMode=result.state.lessonMode;
      mutationResult={ok:true,type:event.type,revision:nextRevision,...result.result};break;
    }

    case 'SET_MODE': {
      if(payload.participation!==undefined){if(!['individual','pairs','group'].includes(payload.participation))return{state,result:{ok:false,code:'INVALID_EVENT'}};next.modeParticipation=payload.participation;}
      const mode=initLessonMode(next,payload.rule,groupActiveMs(next,now));if(!mode.ok)return{state,result:{ok:false,code:mode.code}};Object.assign(next,mode.state);mutationResult={ok:true,type:event.type,revision:nextRevision};break;
    }
    case 'INTEGRITY': {
      if (payload.confirmed !== true || typeof payload.usedAI !== 'boolean') return { state, result: { ok:false, code:'INTEGRITY_REQUIRED' } };
      next.integrity ||= {}; next.integrity[actor.id] = { activityId: next.timeline.currentActivityId, confirmed:true, usedAI:payload.usedAI, at:now };
      mutationResult = { ok:true, revision:nextRevision, type:event.type }; break;
    }
    case 'SET_VALUES': {
      try { next.lessonIntegrations = sanitizeLessonIntegrations(payload.integrationIds); if (!['off','hints','check'].includes(payload.aiPolicy)) throw Error('INVALID_AI_POLICY'); next.aiPolicy = payload.aiPolicy; } catch(error) { return {state,result:{ok:false,code:error.message}}; }
      mutationResult={ok:true,revision:nextRevision,type:event.type};break;
    }
    case 'VALUE_REFLECT': {
      try { const reflection=sanitizeValueReflection(payload.reflection,next.aiPolicy||'off'); next.valueReflections ||= {};next.valueReflections[actor.id]={...reflection,activityId:next.timeline.currentActivityId,submittedAt:now}; } catch(error) {return{state,result:{ok:false,code:error.message}};}
      mutationResult={ok:true,revision:nextRevision,type:event.type};break;
    }
    case 'VALUE_BADGE':
    case 'VALUE_REVOKE': {
      try { next.valueBadges ||= {};next.valueBadges[payload.learnerId] ||= []; const badges=next.valueBadges[payload.learnerId];
      if(event.type==='VALUE_BADGE') { const badge=grantValueBadge(next,{...payload,now},actor);const exists=badges.find(item=>item.valueId===badge.valueId&&item.evidenceId===badge.evidenceId&&!item.revokedAt);if(!exists)badges.push(badge); }
      else {const index=badges.findIndex(item=>item.valueId===payload.valueId&&item.evidenceId===payload.evidenceId&&!item.revokedAt);if(index<0)throw Error('INVALID_VALUE_BADGE');badges[index]=revokeValueBadge(next,badges[index],{reason:payload.reason,now},actor); }
      } catch(error) {return{state,result:{ok:false,code:error.message}};} mutationResult={ok:true,revision:nextRevision,type:event.type};break;
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

      if (next.learningPolicyVersion === 1 && next.mode === 'live' && ['recheck','exit'].includes(currAct.phase) && next.integrity?.[actor.id]?.activityId !== currAct.id) return {state,result:{ok:false,code:'INTEGRITY_REQUIRED'}};
      // Branch gating: shared tasks accessible plus chosen branch
      const currentBranch = next.branches[currAct.id]?.[actor.id] || 'core';
      if (task.branch && task.branch !== 'shared' && task.branch !== currentBranch) {
        return { state, result: { ok: false, code: 'TASK_NOT_AVAILABLE' } };
      }

      if (!validateAnswerJson(answer)) {
        return { state, result: { ok: false, code: 'INVALID_ANSWER' } };
      }

      if (isSelfPaced(next) && (next.selfFinished?.[actor.id] || taskDone(next, actor.id, task))) {
        return { state, result: { ok: false, code: 'TASK_ALREADY_COMPLETED' } };
      }

      let isCorrect = false;
      let assessmentStatus = 'assessed';
      let checkRes = null;

      if (task.type === 'closed') {
        const checker = CHECKER_REGISTRY[task.evaluation?.checkerId];
        if (!checker) {
          return { state, result: { ok: false, code: 'INVALID_TASK' } };
        }
        checkRes = checker(answer, task);
        isCorrect = Boolean(checkRes?.ok);
      } else if (task.type === 'open') {
        isCorrect = false;
        assessmentStatus = 'pending';
      } else if (task.type === 'reflection') {
        isCorrect = true;
        assessmentStatus = 'assessed';
      }
      const verdict = task.type === 'closed' ? verdictMeta(checkRes, isCorrect) : { ratio: isCorrect ? 1 : 0, perItem: undefined };

      const isRevealed = Boolean(next.reveals[taskId]?.revealed);
      const hasHint = (next.passports[actor.id]?.supportHistory || []).some((h) => h.taskId === taskId);
      const isAssisted = isRevealed || hasHint || tutorAssisted(next, actor.id, taskId) || next.integrity?.[actor.id]?.activityId === currAct.id && next.integrity[actor.id].usedAI || next.valueReflections?.[actor.id]?.activityId === currAct.id && next.valueReflections[actor.id].usedAI;

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
        ratio: verdict.ratio,
        ...(verdict.perItem ? { perItem: verdict.perItem } : {}),
        at: now
      };

      next.submissions[submissionId] = subRecord;
      // A submitted answer supersedes the draft; without this, photo submissions keep ~2 copies in state.
      if (next.drafts[actor.id]) delete next.drafts[actor.id][taskId];
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

      if (next.lessonMode) { const mode=applyLessonMode(next,{learnerId:actor.id,taskId,submissionId},groupActiveMs(next,now));if(mode.ok){Object.assign(next,mode.state);if(next.lessonModeErrors)delete next.lessonModeErrors[actor.id];}else{next.lessonModeErrors||={};next.lessonModeErrors[actor.id]=mode.code;} }
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

    case 'TEACHER_RESPONSE': {
      const { learnerId, taskId, answer } = payload, activity = next.package.activities[next.timeline.activityIndex];
      const task = next.package.tasks.find(task => task.id === taskId);
      if (next.status !== 'active' || next.timeline.locked || now >= next.clock.activityDeadline) return {state,result:{ok:false,code:'NOT_ACTIVE'}};
      if (!next.roster[learnerId]?.present || !task || !activity.taskIds.includes(taskId) || task.participation === 'group' || task.type === 'reflection') return {state,result:{ok:false,code:'TASK_NOT_AVAILABLE'}};
      const branch = next.branches[activity.id]?.[learnerId] || 'core';
      if (task.branch && task.branch !== 'shared' && task.branch !== branch) return {state,result:{ok:false,code:'TASK_NOT_AVAILABLE'}};
      if (!validateAnswerJson(answer)) return {state,result:{ok:false,code:'INVALID_ANSWER'}};
      const checker = CHECKER_REGISTRY[task.evaluation?.checkerId], serverVerdict = task.type === 'closed' && checker ? Boolean(checker(answer,task).ok) : null;
      const submissionId = `board-${next.round}-${nextRevision}-${learnerId}-${event.eventId}`;
      const sub = { submissionId, learnerId, taskId, activityId:activity.id, answer, ok:false, assessmentStatus:'pending', assisted:true,
        source:'teacher_recorded_response', recordedBy:actor.id, serverVerdict, at:now };
      next.submissions[submissionId]=sub;
      next.openAssessments[submissionId]={...sub,status:'pending',createdAt:now,nonMastery:true};
      next.passports[learnerId]=recordTaskSubmission(next.passports[learnerId],{...sub,evidenceIds:[],now},next.package);
      mutationResult={ok:true,type:event.type,revision:nextRevision,submissionId,pending:true};break;
    }

    case 'ASSESS_COMMENT': {
      // V28 Phase C: AI nhận xét (không chấm) cho luyện tập nền B — ghi phản hồi vào bản ghi comment_pending, bài nộp vẫn 'submitted'.
      const cSub = next.submissions[payload.submissionId], cRec = next.openAssessments[payload.submissionId];
      if (!cSub || !cRec || cSub.source !== 'practice' || cSub.assessmentStatus !== 'submitted' || cRec.status !== 'comment_pending') return { state, result: { ok: false, code: 'INVALID_ASSESSMENT' } };
      if (typeof payload.feedback !== 'string' || !payload.feedback || payload.feedback.length > 2000 || typeof payload.model !== 'string' || !payload.model || payload.model.length > 200 || payload.sourceFingerprint !== undefined && (typeof payload.sourceFingerprint !== 'string' || !payload.sourceFingerprint || payload.sourceFingerprint.length > 128)) return { state, result: { ok: false, code: 'INVALID_ASSESSMENT' } };
      if (payload.confidence !== undefined && (!Number.isFinite(payload.confidence) || payload.confidence < 0 || payload.confidence > 1)) return { state, result: { ok: false, code: 'INVALID_ASSESSMENT' } };
      cRec.status = 'commented';
      cRec.feedback = payload.feedback;
      cRec.assessedAt = now;
      cRec.assessmentSource = 'ai';
      cRec.model = payload.model;
      if (payload.sourceFingerprint !== undefined) cRec.sourceFingerprint = payload.sourceFingerprint;
      if (payload.auditReceipt !== undefined) {
        if (typeof payload.auditReceipt !== 'string' || !payload.auditReceipt || payload.auditReceipt.length > 200) return { state, result: { ok: false, code: 'INVALID_ASSESSMENT' } };
        cRec.auditReceipt = payload.auditReceipt;
      }
      if (payload.confidence !== undefined) cRec.confidence = payload.confidence;
      cSub.aiComment = { feedback: payload.feedback, model: payload.model, at: now };
      mutationResult = { ok: true, revision: nextRevision, type: event.type, submissionId: payload.submissionId, commented: true };
      break;
    }

    case 'ASSESS_AUTOMATIC': case 'ASSESS_NEEDS_REVIEW': {
      const autoSub = next.submissions[payload.submissionId], autoRecord = next.openAssessments[payload.submissionId];
      if (!autoSub || !autoRecord || autoRecord.status !== 'pending' || autoSub.assessmentStatus !== 'pending' || autoSub.source === 'practice' || autoSub.source === 'teacher_recorded_response') return { state, result: { ok: false, code: 'INVALID_ASSESSMENT' } };
      if (event.type === 'ASSESS_AUTOMATIC') {
        if (typeof payload.criteriaMet !== 'boolean' || typeof payload.feedback !== 'string' || payload.feedback.length > 2000 || typeof payload.model !== 'string' || !payload.model || payload.model.length > 200 || typeof payload.sourceFingerprint !== 'string' || !payload.sourceFingerprint || payload.sourceFingerprint.length > 128 || typeof payload.auditReceipt !== 'string' || !payload.auditReceipt || payload.auditReceipt.length > 200 || payload.confidence !== undefined && (!Number.isFinite(payload.confidence) || payload.confidence < 0 || payload.confidence > 1)) return { state, result: { ok: false, code: 'INVALID_ASSESSMENT' } };
        autoRecord.status = 'ai_assessed';
        autoRecord.criteriaMet = payload.criteriaMet;
        autoRecord.feedback = payload.feedback;
        autoRecord.assessedAt = now;
        autoRecord.assessmentSource = 'ai';
        autoRecord.model = payload.model;
        autoRecord.sourceFingerprint = payload.sourceFingerprint;
        autoRecord.auditReceipt = payload.auditReceipt;
        if (payload.confidence !== undefined) autoRecord.confidence = payload.confidence;
        autoSub.ok = payload.criteriaMet;
        autoSub.assessmentStatus = 'ai_assessed';
        autoSub.aiAssessment = { model: payload.model, sourceFingerprint: payload.sourceFingerprint, auditReceipt: payload.auditReceipt, ...(payload.confidence === undefined ? {} : { confidence: payload.confidence }) };
        next.passports[autoSub.learnerId] = recordTaskSubmission(next.passports[autoSub.learnerId], { submissionId: autoSub.submissionId, taskId: autoSub.taskId, activityId: autoSub.activityId, answer: autoSub.answer, ok: autoSub.ok, assessmentStatus: 'ai_assessed', assisted: autoSub.assisted, evidenceIds: [], now }, next.package);
        mutationResult = { ok: true, revision: nextRevision, type: event.type, submissionId: autoSub.submissionId, correct: payload.criteriaMet, automatic: true };
      } else {
        if (typeof payload.reason !== 'string' || !payload.reason || payload.reason.length > 200 || payload.model !== undefined && (typeof payload.model !== 'string' || payload.model.length > 200) || payload.sourceFingerprint !== undefined && (typeof payload.sourceFingerprint !== 'string' || !payload.sourceFingerprint || payload.sourceFingerprint.length > 128) || payload.auditReceipt !== undefined && (typeof payload.auditReceipt !== 'string' || payload.auditReceipt.length > 200)) return { state, result: { ok: false, code: 'INVALID_ASSESSMENT' } };
        autoRecord.status = 'needs_review';
        autoRecord.reason = payload.reason;
        autoRecord.assessedAt = now;
        autoRecord.assessmentSource = 'ai';
        if (payload.model !== undefined) autoRecord.model = payload.model;
        if (payload.sourceFingerprint !== undefined) autoRecord.sourceFingerprint = payload.sourceFingerprint;
        if (payload.auditReceipt !== undefined) autoRecord.auditReceipt = payload.auditReceipt;
        autoSub.ok = null;
        autoSub.assessmentStatus = 'needs_review';
        autoSub.aiAssessment = { ...(payload.model === undefined ? {} : { model: payload.model }), ...(payload.sourceFingerprint === undefined ? {} : { sourceFingerprint: payload.sourceFingerprint }), ...(payload.auditReceipt === undefined ? {} : { auditReceipt: payload.auditReceipt }), reason: payload.reason };
        next.passports[autoSub.learnerId] = recordTaskSubmission(next.passports[autoSub.learnerId], { submissionId: autoSub.submissionId, taskId: autoSub.taskId, activityId: autoSub.activityId, answer: autoSub.answer, ok: false, assessmentStatus: 'needs_review', assisted: autoSub.assisted, evidenceIds: [], now }, next.package);
        mutationResult = { ok: true, revision: nextRevision, type: event.type, submissionId: autoSub.submissionId, needsReview: true, automatic: true };
      }
      break;
    }

    case 'ASSESS': {
      const { submissionId, criteriaMet, feedback, nonMastery, reason } = payload;
      const sub = next.submissions[submissionId];
      if (!sub || !next.openAssessments[submissionId]) {
        return { state, result: { ok: false, code: 'INVALID_ASSESSMENT' } };
      }
      if (sub.source !== 'practice' && !['pending', 'assessed', 'ai_assessed', 'needs_review'].includes(sub.assessmentStatus)) return { state, result: { ok: false, code: 'INVALID_ASSESSMENT' } };
      if (sub.source === 'teacher_recorded_response' && nonMastery !== true) return {state,result:{ok:false,code:'INVALID_ASSESSMENT'}};
      if (typeof criteriaMet !== 'boolean') {
        return { state, result: { ok: false, code: 'INVALID_EVENT' } };
      }
      if (feedback !== undefined && (typeof feedback !== 'string' || feedback.length > 2000)) {
        return { state, result: { ok: false, code: 'INVALID_EVENT' } };
      }
      if (nonMastery !== undefined && typeof nonMastery !== 'boolean') {
        return { state, result: { ok: false, code: 'INVALID_EVENT' } };
      }
      if (sub.source === 'practice') {
        const assessed = assessPracticeSubmission(next, payload, actor, now);
        if (!assessed.ok) return { state, result: { ok: false, code: assessed.code } };
        mutationResult = { ok: true, revision: nextRevision, type: 'ASSESS', submissionId, ...assessed.result };
        break;
      }

      const isTaskRevealed = Boolean(next.reveals[sub.taskId]?.revealed);
      if (isTaskRevealed) {
        const isExplicitNonMastery = criteriaMet === false || nonMastery === true;
        if (!isExplicitNonMastery) {
          return { state, result: { ok: false, code: 'INVALID_ASSESSMENT' } };
        }
      }

      const openRecord = next.openAssessments[submissionId];
      const previousAssessment = openRecord.status === 'ai_assessed' || openRecord.status === 'needs_review'
        ? { status: openRecord.status, criteriaMet: openRecord.criteriaMet ?? null, feedback: openRecord.feedback ?? null, reason: openRecord.reason ?? null, model: openRecord.model ?? null, sourceFingerprint: openRecord.sourceFingerprint ?? null, auditReceipt: openRecord.auditReceipt ?? null, assessedAt: openRecord.assessedAt ?? null }
        : null;
      openRecord.status = 'assessed';
      openRecord.criteriaMet = criteriaMet;
      openRecord.feedback = feedback;
      openRecord.assessedAt = now;
      if (previousAssessment) {
        openRecord.previousAssessment = previousAssessment;
        openRecord.regradedBy = actor.id;
        openRecord.regradeReason = reason;
        openRecord.regradedAt = now;
      }
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
          evidenceIds: sub.source === 'teacher_recorded_response' || nonMastery === true ? [] : relevantEvidence,
          now
        },
        next.package
      );

      if (next.lessonMode && sub.source !== 'teacher_recorded_response' && !sub.modeApplied && sub.activityId === next.timeline.currentActivityId) {
        const mode = applyLessonMode(next, { learnerId, taskId, submissionId }, groupActiveMs(next, now));
        if (mode.ok) { Object.assign(next, mode.state); next.submissions[submissionId].modeApplied = true; if (next.lessonModeErrors) delete next.lessonModeErrors[learnerId]; }
        else { next.lessonModeErrors ||= {}; next.lessonModeErrors[learnerId] = mode.code; }
      }

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

      // "Đổi mức" (plan 19.4): at most 2 self-chosen changes per activity; after a pupil has chosen a level
      // themselves, stepping down needs one wrong assessed answer in this activity or 3 minutes on it.
      const RANK = { support: 1, core: 2, extension: 3 };
      const current = next.branches[currActId]?.[actor.id] || 'core';
      if (branch === current) return { state, result: { ok: false, code: 'INVALID_EVENT' } };
      if (!next.branchSwitches) next.branchSwitches = {};
      if (!next.branchSwitches[currActId]) next.branchSwitches[currActId] = {};
      const used = next.branchSwitches[currActId][actor.id] || 0;
      if (used >= BRANCH_SWITCH_LIMIT) return { state, result: { ok: false, code: 'BRANCH_SWITCH_LIMIT' } };
      if (used > 0 && RANK[branch] < RANK[current]) {
        const triedWrong = Object.values(next.submissions || {}).some((sub) => sub.learnerId === actor.id &&
          sub.activityId === currActId && sub.assessmentStatus === 'assessed' && sub.ok === false);
        const c = next.clock;
        const eventElapsed = c.classEventPausedAt == null ? 0 : Math.min(next.classEvent?.durationMs || 0, Math.max(0,classEventActiveNow(next,now)-(next.classEvent?.startedAt || 0)));
        const active = now - (c.activityStartedAt ?? now) - (c.activityPausedMs || 0) - (c.pausedAt != null ? now - c.pausedAt : 0) - (c.arenaPausedAt != null ? Math.max(0, now - c.arenaPausedAt) : 0) - eventElapsed;
        const spent = active >= BRANCH_DOWN_AFTER_MS; // pauses and arena time do not count as working time
        if (!triedWrong && !spent) return { state, result: { ok: false, code: 'BRANCH_DOWN_TOO_SOON' } };
      }
      next.branchSwitches[currActId][actor.id] = used + 1;
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
      if (next.groupPolicyVersion === 1 ? groupActiveMs(next, now) > grpState.selectionActiveDeadline : now > grpState.selectionDeadline) {
        return { state, result: { ok: false, code: 'ROLE_WINDOW_CLOSED' } };
      }
      const group = grpState.groups.find((g) => g.memberIds.includes(actor.id));
      if (!group) {
        return { state, result: { ok: false, code: 'ROLE_UNAVAILABLE' } };
      }
      const definition = (group.roleDefinitions || ROLE_DEFINITIONS).find(role => role.id === roleId);
      if (!definition || (definition.subgroupId && !group.subgroups.find(subgroup => subgroup.id === definition.subgroupId)?.memberIds.includes(actor.id))) return { state, result: { ok: false, code: 'ROLE_UNAVAILABLE' } };

      if (group.roles[roleId] && group.roles[roleId] !== actor.id) {
        return { state, result: { ok: false, code: 'ROLE_UNAVAILABLE' } };
      }
      if (next.groupPolicyVersion === 1 && group.memberIds.filter(id => next.roster[id]?.present !== false).length >= 4 &&
        Object.entries(group.roles).some(([id, member]) => id !== roleId && member === actor.id)) return { state, result: { ok: false, code: 'ROLE_LIMIT' } };

      group.roles[roleId] = actor.id;
      mutationResult = { ok: true, revision: nextRevision, type: 'CHOOSE_ROLE', roleId };
      break;
    }

    case 'GROUP_CONTRIBUTE': {
      const { taskId, text } = payload;
      if (typeof text !== 'string' || text.length > 4000 || (next.groupPolicyVersion === 1 && !text.trim())) {
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

      if (next.groupPolicyVersion === 1 && !next.drafts[actor.id]?.[taskId]) return { state, result: { ok: false, code: 'INDIVIDUAL_THINK_REQUIRED' } };

      if (!group.contributions) {
        group.contributions = [];
      }
      group.contributions.push({
        learnerId: actor.id,
        taskId,
        text,
        at: now
      });
      if (next.groupPolicyVersion === 1) group.phase = 'role_contribution';

      mutationResult = { ok: true, revision: nextRevision, type: 'GROUP_CONTRIBUTE', taskId };
      break;
    }

    case 'GROUP_PROPOSE':
    case 'GROUP_VOTE': {
      if (next.groupPolicyVersion !== 1) return { state, result: { ok: false, code: 'GROUP_POLICY_DISABLED' } };
      try {
        const { group } = currentGroupTask(next, actor.id, payload.taskId);
        if (!group.contributions.some(item => item.learnerId === actor.id && item.taskId === payload.taskId)) return { state, result: { ok: false, code: 'GROUP_CONTRIBUTION_REQUIRED' } };
        if (event.type === 'GROUP_PROPOSE' && next.groupProducts[`${group.id}:${payload.taskId}`]?.ok === true) return { state, result: { ok: false, code: 'GROUP_TASK_COMPLETE' } };
        if (event.type === 'GROUP_PROPOSE' && next.groupProducts[`${group.id}:${payload.taskId}`]?.assessmentStatus === 'pending') return { state, result: { ok: false, code: 'GROUP_ASSESSMENT_PENDING' } };
        if (event.type === 'GROUP_VOTE' && group.proposal?.taskId !== payload.taskId) return { state, result: { ok: false, code: 'STALE_GROUP_PROPOSAL' } };
        const changed = event.type === 'GROUP_PROPOSE'
          ? proposeGroupDraft(group, { id: payload.proposalId, taskId: payload.taskId, answer: payload.answer, learnerId: actor.id }, next.roster)
          : voteGroupDraft(group, { learnerId: actor.id, proposalHash: payload.proposalHash }, next.roster);
        Object.assign(group, changed);
        const consent = groupDraftConsent(group, group.proposal.hash, next.roster);
        group.phase = consent.approved ? 'majority_consented' : 'proposed_product';
        mutationResult = { ok: true, revision: nextRevision, type: event.type, taskId: payload.taskId, proposalHash: group.proposal.hash, ...consent };
      } catch (error) { return { state, result: { ok: false, code: error.message } }; }
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
      if (next.groupPolicyVersion === 1) {
        const proposal = group.proposal;
        if (!proposal || proposal.taskId !== taskId) return { state, result: { ok: false, code: 'GROUP_CONSENT_REQUIRED' } };
        if (payload.proposalHash !== proposal.hash) return { state, result: { ok: false, code: 'STALE_GROUP_PROPOSAL' } };
        if (canonicalize(answer) !== canonicalize(proposal.answer)) return { state, result: { ok: false, code: 'GROUP_PROPOSAL_MISMATCH' } };
        if (!groupDraftConsent(group, proposal.hash, next.roster).approved) return { state, result: { ok: false, code: 'GROUP_CONSENT_REQUIRED' } };
      }

      const productKey = `${group.id}:${taskId}`;
      const existingProduct = next.groupProducts[productKey];
      // ponytail: first correct shared product is authoritative; later retries cannot erase it.
      if (existingProduct?.ok === true) {
        mutationResult = { ok: true, revision: nextRevision, type: 'GROUP_SUBMIT', groupId: group.id, correct: true, preserved: true };
        break;
      }
      if (existingProduct?.assessmentStatus === 'pending') {
        if (existingProduct.proposalHash !== payload.proposalHash || canonicalize(existingProduct.answer) !== canonicalize(answer)) return { state, result: { ok: false, code: 'GROUP_ASSESSMENT_PENDING' } };
        mutationResult = { ok: true, revision: nextRevision, type: 'GROUP_SUBMIT', groupId: group.id, pending: true, preserved: true };
        break;
      }
      if (task.type === 'open' && existingProduct?.assessmentStatus === 'assessed' && existingProduct.proposalHash === payload.proposalHash) {
        mutationResult = { ok: true, revision: nextRevision, type: 'GROUP_SUBMIT', groupId: group.id, correct: existingProduct.ok, preserved: true };
        break;
      }

      if (!['closed', 'open'].includes(task.type)) return { state, result: { ok: false, code: 'INVALID_TASK' } };
      let isCorrect = null;
      let verdict = { ratio: 0, perItem: undefined };
      if (task.type === 'closed') {
        const checker = CHECKER_REGISTRY[task.evaluation?.checkerId];
        if (!checker) return { state, result: { ok: false, code: 'INVALID_TASK' } };
        const checkRes = checker(answer, task);
        isCorrect = Boolean(checkRes?.ok);
        verdict = verdictMeta(checkRes, isCorrect);
      }

      next.groupProducts[productKey] = {
        groupId: group.id,
        activityId: currActId,
        round: next.round,
        packageHash: next.package.contentHash,
        taskId,
        answer,
        ok: isCorrect,
        ratio: verdict.ratio,
        ...(verdict.perItem ? { perItem: verdict.perItem } : {}),
        assessmentStatus: task.type === 'open' ? 'pending' : 'assessed',
        proposalHash: group.proposal?.hash || hashPackage({ groupId: group.id, taskId, answer, revision: nextRevision }),
        proposalVersion: group.proposal?.id || nextRevision,
        submittedBy: actor.id,
        at: now
      };
      if (next.groupPolicyVersion === 1) group.phase = task.type === 'open' ? 'pending_assessment' : isCorrect ? 'individual_recheck' : 'role_contribution';
      rewardGroupProduct(next, next.groupProducts[productKey]);

      mutationResult = {
        ok: true,
        revision: nextRevision,
        type: 'GROUP_SUBMIT',
        groupId: group.id,
        ...(task.type === 'open' ? { pending: true } : { correct: isCorrect })
      };
      break;
    }

    case 'GROUP_ASSESS': {
      const { groupId, taskId, proposalHash, criteriaMet, feedback = '' } = payload;
      if (!isValidIdentifier(groupId) || !isValidIdentifier(taskId) || typeof proposalHash !== 'string' ||
          typeof criteriaMet !== 'boolean' || typeof feedback !== 'string' || feedback.length > 2000) return { state, result: { ok: false, code: 'INVALID_ASSESSMENT' } };
      const product = next.groupProducts[`${groupId}:${taskId}`], task = next.package.tasks.find(item => item.id === taskId);
      if (!product || !task || task.type !== 'open' || task.participation !== 'group') return { state, result: { ok: false, code: 'GROUP_PRODUCT_REQUIRED' } };
      if (product.proposalHash !== proposalHash || product.packageHash !== next.package.contentHash || product.round !== next.round) return { state, result: { ok: false, code: 'STALE_GROUP_PROPOSAL' } };
      if (product.assessmentStatus === 'assessed') {
        if (product.ok !== criteriaMet || product.assessment?.feedback !== feedback) return { state, result: { ok: false, code: 'GROUP_ALREADY_ASSESSED' } };
        mutationResult = { ok: true, revision: nextRevision, type: event.type, groupId, taskId, correct: product.ok, preserved: true };
        break;
      }
      if (product.assessmentStatus !== 'pending') return { state, result: { ok: false, code: 'GROUP_PRODUCT_REQUIRED' } };
      product.ok = criteriaMet; product.assessmentStatus = 'assessed';
      product.assessment = { criteriaMet, feedback, assessedBy: actor.id, assessedAt: now };
      const group = next.groups[product.activityId]?.groups.find(item => item.id === groupId);
      if (group && next.groupPolicyVersion === 1) group.phase = criteriaMet ? 'individual_recheck' : 'role_contribution';
      rewardGroupProduct(next, product);
      mutationResult = { ok: true, revision: nextRevision, type: event.type, groupId, taskId, correct: criteriaMet };
      break;
    }

    case 'ROLL': {
      if (Object.keys(payload).length > 0) {
        return { state, result: { ok: false, code: 'INVALID_EVENT' } };
      }
      if (next.groupPolicyVersion === 1 && next.groups[next.timeline.currentActivityId]) {
        const group = next.groups[next.timeline.currentActivityId].groups.find(item => item.memberIds.includes(actor.id));
        if (!group) return { state, result: { ok: false, code: 'UNAUTHORIZED' } };
        const dice = next.groupDice[group.id];
        const tasks = next.package.tasks.filter(task => next.package.activities[next.timeline.activityIndex].taskIds.includes(task.id) && task.participation === 'group');
        const completed = tasks.length > 0 && tasks.every(task => next.groupProducts[`${group.id}:${task.id}`]?.ok === true);
        let hash = 0;
        for (const char of `${next.seed}:${group.id}:${dice.rolls}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
        const die = 1 + hash % 6;
        try {
          const rolled = rollGroupDice(group, dice, { learnerId: actor.id, gateId: next.timeline.currentActivityId, completed,
            activeMs: groupActiveMs(next, now), die, gatePosition: (next.timeline.activityIndex + 1) * DICE_UNITS_PER_ACTIVITY }, next.roster);
          next.groupDice[group.id] = rolled;
          for (const id of group.memberIds) next.diceTrack[id] = { ...next.diceTrack[id], position: rolled.position, carry: rolled.carry, rolls: rolled.rolls };
          mutationResult = { ok: true, revision: nextRevision, type: 'ROLL', groupId: group.id, from: dice.position, die, position: rolled.position };
        } catch (error) { return { state, result: { ok: false, code: error.message } }; }
        break;
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
      if (learner.teamId != null && !isValidIdentifier(learner.teamId)) return { state, result: { ok: false, code: 'INVALID_LEARNER' } };

      if (next.roster[learner.id]) {
        // Rejoin existing learner
        if (learner.name && learner.name !== next.roster[learner.id].name) {
          return { state, result: { ok: false, code: 'INVALID_LEARNER' } };
        }
        next.roster[learner.id].present = learner.present !== false;
        if (learner.teamId !== undefined) next.roster[learner.id].teamId = learner.teamId;
        if (learner.deviceId !== undefined) {
          next.roster[learner.id].deviceId = learner.deviceId;
        }

        // Restore to archived group membership if present
        if (learner.present !== false && next.groupPolicyVersion !== 1) {
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
          teamId: learner.teamId || null,
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
        if (next.groupPolicyVersion !== 1 && grpState && Array.isArray(grpState.groups)) {
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

      if (next.groupPolicyVersion === 1) addCurrentGroupLearner(next, learner, now);
      syncModeLearner(next, learner.id);
      if (next.status === 'active' && next.gamePlan && !next.lessonMode) {
        const initialized = initLessonMode(next, next.teacherSetup?.rule || next.gamePlan.rule, groupActiveMs(next, now));
        if (initialized.ok) next.lessonMode = initialized.state.lessonMode;
        else next.lessonModeError = initialized.code;
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
      if (next.classEvent?.status === 'active') next.classEvent = leaveClassEvent(next.classEvent, learnerId, actor, classEventActiveNow(next, now));
      syncModeLearner(next, learnerId);

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
            if (next.groupPolicyVersion !== 1) g.memberIds = g.memberIds.filter((m) => m !== learnerId);
            for (const [rId, mId] of Object.entries(g.roles)) {
              if (mId === learnerId) {
                delete g.roles[rId];
              }
            }
            if (next.groupPolicyVersion === 1) next.groupDice[g.id] = advanceGroupDiceTurn(g, next.groupDice[g.id], next.roster, groupActiveMs(next, now));
          }
        }
      }

      mutationResult = { ok: true, revision: nextRevision, type: 'LEAVE_LEARNER', learnerId };
      break;
    }

    case 'TUTOR_NEED': case 'TUTOR_REQUEST': case 'TUTOR_RESPOND': case 'TUTOR_END': case 'TUTOR_REVOKE': {
      const code = tutorCommand(next, event, actor, now);
      if (code) return {state,result:{ok:false,code}};
      mutationResult = {ok:true,revision:nextRevision,type:event.type};
      break;
    }
    default:
      return { state, result: { ok: false, code: 'INVALID_EVENT' } };
  }

  if (event.type === 'ROLL') recordExplorationRoll(state,next,actor,mutationResult);
  updateTutors(next, event, now, mutationResult.submissionId);
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



