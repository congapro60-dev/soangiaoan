import { PRODUCT_THEMES } from '../product-content.js';
import { SKILLS } from '../skills.js';
import { ROLE_DEFINITIONS } from './grouping.js';
import { validateSessionPlan } from './validate-session-plan.js';

const SAFE_SKILLS = Object.freeze(['time', 'boost', 'double']);
const GAME_EVENT_TYPES = Object.freeze(['game', 'logic', 'movement', 'reward']);
const PARTICIPATION = Object.freeze({
  whole_class: 'individual_broadcast',
  individual: 'individual',
  pair: 'pairs',
  pairs: 'pairs',
  group: 'group'
});

const clone = (value) => structuredClone(value);
const freeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
  return value;
};

function fail(code, message) {
  const error = new Error(message || code);
  error.code = code;
  throw error;
}

function authoredTask(task) {
  const safe = clone(task);
  if (safe.evaluation && typeof safe.evaluation === 'object') {
    safe.evaluation = { ...safe.evaluation };
    delete safe.evaluation.answerKey;
  }
  delete safe.answer;
  delete safe.answerKey;
  return safe;
}

function routePosition(route, index) {
  const point = route[Math.max(0, Math.min(route.length - 1, index))];
  return { index: Math.max(0, Math.min(route.length - 1, index)), point: [...point] };
}

function makeRoute(theme, activities) {
  const route = Array.isArray(theme.route) && theme.route.length ? theme.route : [[0, 0]];
  const gates = Array.isArray(theme.checkpoints) && theme.checkpoints.length
    ? theme.checkpoints
    : [0, route.length - 1];
  const coreActivities = activities.filter((activity) => activity.budgetRole === 'core');
  const segments = activities.map((activity, index) => {
    const start = Math.floor((index * (route.length - 1)) / Math.max(1, activities.length));
    const end = Math.floor(((index + 1) * (route.length - 1)) / Math.max(1, activities.length));
    return {
      id: activity.id,
      activityId: activity.id,
      order: activity.order,
      start: routePosition(route, start),
      end: routePosition(route, end),
      coreGate: activity.budgetRole === 'core',
      gateIndex: activity.budgetRole === 'core' ? coreActivities.indexOf(activity) + 1 : null
    };
  });
  return {
    themeId: theme.id,
    points: route.map((point) => [...point]),
    checkpoints: gates.map((index, checkpoint) => ({ id: `route-checkpoint-${checkpoint + 1}`, index, position: routePosition(route, index) })),
    segments
  };
}

function buildActivities(plan, pkg) {
  const tasks = new Map((pkg.tasks || []).map((task) => [task.id, task]));
  return plan.activityPlans.map((activity) => ({
    id: activity.id,
    order: activity.order,
    phase: activity.phase,
    minutes: activity.minutes,
    budgetRole: activity.budgetRole,
    participation: PARTICIPATION[activity.participation] || 'individual',
    sourceParticipation: activity.participation,
    objectiveIds: [...activity.objectiveIds],
    taskIds: [...activity.taskIds],
    evidenceIds: [...activity.evidenceIds],
    coreGate: activity.budgetRole === 'core',
    tasks: activity.taskIds.map((id) => authoredTask(tasks.get(id))).filter(Boolean)
  }));
}

function assertApproved(plan, pkg) {
  if (!plan || typeof plan !== 'object') fail('PLAN_REQUIRED');
  if (plan.status !== 'approved') fail('PLAN_NOT_APPROVED', 'Only an approved SessionPlan can run');
  if (!pkg || typeof pkg !== 'object') fail('PACKAGE_REQUIRED');
  if (pkg.status === 'needs_review' || (pkg.sourceRefs || []).some((source) => source.verification !== 'verified')) {
    fail('SOURCE_REVIEW_REQUIRED', 'The lesson source still needs review');
  }
  const validation = validateSessionPlan(plan, { package: pkg, mode: 'approved' });
  if (!validation.ok) fail('INVALID_APPROVED_PLAN', JSON.stringify(validation.errors));
}

function buildDescriptor(plan, pkg, execution) {
  const theme = { id: plan.map, ...PRODUCT_THEMES[plan.map] };
  const activities = buildActivities(plan, pkg);
  const route = makeRoute(theme, activities);
  const descriptor = {
    adapter: 'lesson-game-r4',
    planId: plan.id,
    planHash: plan.contentHash,
    package: { id: plan.package.id, version: plan.package.version, contentHash: plan.package.contentHash },
    themeId: plan.theme,
    mapId: plan.map,
    ruleId: plan.rule,
    deterministic: true,
    seed: plan.director.seed,
    participation: PARTICIPATION[plan.participation] || plan.participation,
    story: clone(plan.story),
    activities,
    checkpoints: clone(plan.checkpoints),
    route,
    roles: ROLE_DEFINITIONS.map(({ id, label }) => ({ id, label })),
    policy: {
      masteryAuthority: 'LearningPassport',
      groupGameMapMastery: false,
      gameLogicEventsAreMastery: false,
      coreGates: 'lesson-runtime',
      allowedSkills: SAFE_SKILLS.map((id) => ({ id, ...SKILLS[id] })),
      disabledSkills: Object.keys(SKILLS).filter((id) => !SAFE_SKILLS.includes(id))
    },
    execution
  };
  return freeze(descriptor);
}

export function createGameAdapter({ plan, package: pkg } = {}) {
  assertApproved(plan, pkg);
  return buildDescriptor(plan, pkg, { allowed: true, source: 'approved-session-plan' });
}

export const adaptSessionPlan = createGameAdapter;
export const createLessonGameAdapter = createGameAdapter;

export function pilotGameDescriptor({ draft, package: pkg } = {}) {
  if (!draft?.plan) {
    return { execution: { allowed: false, code: draft?.reasonCodes?.includes('SOURCE_REVIEW_REQUIRED') ? 'SOURCE_REVIEW_REQUIRED' : 'PLAN_NOT_APPROVED' } };
  }
  const blocked = draft.status !== 'approved' || draft.plan.status !== 'approved' || !pkg || pkg.status === 'needs_review' || (pkg.sourceRefs || []).some((source) => source.verification !== 'verified');
  return buildDescriptor(draft.plan, pkg, blocked
    ? { allowed: false, code: draft.reasonCodes?.includes('SOURCE_REVIEW_REQUIRED') ? 'SOURCE_REVIEW_REQUIRED' : 'PLAN_NOT_APPROVED' }
    : { allowed: true, source: 'approved-session-plan' });
}

export function clampMovement({ position = 0, steps = 0, carry = 0, gate = 0 } = {}) {
  const target = Math.max(0, position) + Math.max(0, steps) + Math.max(0, carry);
  return { position: Math.min(Math.max(0, gate), target), carry: Math.max(0, target - Math.max(0, gate)) };
}

export function mapLessonEvent({ activity, task, answer, eventId, round, revision } = {}) {
  if (!activity?.id || !task?.id || typeof eventId !== 'string') fail('INVALID_LESSON_EVENT');
  const group = task.participation === 'group' || activity.sourceParticipation === 'group';
  return {
    eventId,
    type: group ? 'GROUP_SUBMIT' : 'SUBMIT',
    activityId: activity.id,
    round,
    revision,
    payload: { taskId: task.id, answer }
  };
}

export function recordGameReward(ledger = {}, { sessionId, activityId, taskId, recipientType = 'learner', recipientId, amount = 0 } = {}) {
  const key = `${sessionId}:${activityId}:${taskId}:${recipientType}:${recipientId}`;
  if (ledger[key]) return { ledger, replay: true, entry: ledger[key] };
  const next = { ...ledger, [key]: { key, amount: Math.max(0, amount), recipientType, recipientId, activityId, taskId, mastery: false } };
  return { ledger: next, replay: false, entry: next[key] };
}

export { GAME_EVENT_TYPES, SAFE_SKILLS };
