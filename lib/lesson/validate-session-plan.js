import { PRODUCT_THEMES } from '../product-content.js';
import { RULES } from '../mode-engine/index.js';
import { ROLE_DEFINITIONS } from './grouping.js';
import { hashPackage } from './schema.js';
import { hashSessionPlan } from './session-plan.js';
import { validateLessonPackage } from './validate.js';

const PLAN_KEYS = new Set(['schemaVersion', 'id', 'status', 'contentHash', 'package', 'theme', 'map', 'rule', 'participation', 'devices', 'story', 'activityPlans', 'checkpoints', 'policies', 'director']);
const PACKAGE_KEYS = new Set(['id', 'version', 'contentHash', 'rowId']);
const STORY_KEYS = new Set(['title', 'premise', 'goal', 'places']);
const ACTIVITY_KEYS = new Set(['id', 'order', 'phase', 'minutes', 'participation', 'objectiveIds', 'taskIds', 'evidenceIds', 'budgetRole']);
const CHECKPOINT_KEYS = new Set(['id', 'activityId', 'objectiveIds', 'evidenceIds', 'individual']);
const POLICY_KEYS = new Set(['branch', 'reward', 'skill']);
const BRANCH_KEYS = new Set(['allowed', 'default']);
const REWARD_KEYS = new Set(['group', 'individual', 'once']);
const SKILL_KEYS = new Set(['roles', 'evidence']);
const DIRECTOR_KEYS = new Set(['deterministic', 'seed', 'confidence', 'uncertainties']);
const PARTICIPATIONS = new Set(['group', 'individual', 'pairs']);
const PHASES = new Set(['experience', 'formation', 'guided', 'practice', 'recheck', 'exit', 'reflection']);
const ROLES = new Set(ROLE_DEFINITIONS.map(({ id }) => id));
const BRANCHES = new Set(['shared', 'support', 'core', 'extension']);
const REWARDS = new Set(['none', 'cosmetic', 'points', 'currency', 'item', 'mastery']);
const BUDGET_ROLES = new Set(['core', 'reserve', 'optional']);
const DEVICES = new Set(['projector', 'learner-device']);
const fail = (errors, code, path, message) => errors.push({ code, path, message });
const object = (x) => x && typeof x === 'object' && !Array.isArray(x);
const exact = (x, keys) => object(x) && Object.keys(x).every((key) => keys.has(key));
const strings = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);
const validId = (value) => typeof value === 'string' && value.length > 0;
const unknownKeys = (x, keys, path, errors) => {
  if (!object(x)) return;
  for (const key of Object.keys(x)) if (!keys.has(key)) fail(errors, 'UNKNOWN_PLAN_KEY', `${path}.${key}`, `Unknown SessionPlan key: ${key}`);
};

function validateSessionPlan(plan, { package: pkg, mode, sourceReviewed = false } = {}) {
  const errors = [];
  try {
  if (!object(plan)) return { ok: false, errors: [{ code: 'INVALID_PLAN', path: '', message: 'SessionPlan must be an object' }] };
  for (const key of Object.keys(plan)) if (!PLAN_KEYS.has(key)) fail(errors, 'UNKNOWN_PLAN_KEY', key, `Unknown SessionPlan key: ${key}`);
  if (plan.schemaVersion !== '1.0.0') fail(errors, 'INVALID_SCHEMA_VERSION', 'schemaVersion', 'Unsupported SessionPlan schema');
  if (!['draft', 'approved'].includes(plan.status)) fail(errors, 'INVALID_STATUS', 'status', 'Status must be draft or approved');
   if (typeof plan.contentHash !== 'string' || hashSessionPlan(plan) !== plan.contentHash) fail(errors, 'HASH_MISMATCH', 'contentHash', 'Canonical SessionPlan hash does not match');
   if (!exact(plan.package, PACKAGE_KEYS) || !['id', 'version', 'contentHash'].every((key) => typeof plan.package?.[key] === 'string' && plan.package[key]) || (Object.hasOwn(plan.package || {}, 'rowId') && !validId(plan.package.rowId))) fail(errors, 'INVALID_PACKAGE_TUPLE', 'package', 'Package tuple has unknown or missing shape');
   if (plan.status === 'approved' && !validId(plan.package?.rowId)) fail(errors, 'PACKAGE_ROW_ID_REQUIRED', 'package.rowId', 'Approved plans require a persisted package rowId');
  if (pkg) {
     if (plan.package.id !== pkg.id || plan.package.version !== pkg.version || (pkg.rowId && plan.package.rowId !== pkg.rowId)) fail(errors, 'PACKAGE_TUPLE_MISMATCH', 'package', 'Package tuple does not match supplied package');
     const packageContent = { ...pkg };
     delete packageContent.rowId;
     const expected = hashPackage(packageContent);
    if (plan.package.contentHash !== expected) fail(errors, 'PACKAGE_HASH_MISMATCH', 'package.contentHash', 'Package hash does not match supplied package');
  }
   if (!Object.hasOwn(PRODUCT_THEMES, plan.theme)) fail(errors, 'UNKNOWN_THEME', 'theme', 'Theme is not registered');
   if (!Object.hasOwn(PRODUCT_THEMES, plan.map)) fail(errors, 'UNKNOWN_MAP', 'map', 'Map is not registered');
   if (Object.hasOwn(PRODUCT_THEMES, plan.theme) && Object.hasOwn(PRODUCT_THEMES, plan.map) && plan.theme !== plan.map) fail(errors, 'STORY_MISMATCH', 'map', 'Theme and map must resolve to the same registered story');
  if (!Object.hasOwn(RULES, plan.rule)) fail(errors, 'UNKNOWN_RULE', 'rule', 'Rule is not registered');
  if (!PARTICIPATIONS.has(plan.participation)) fail(errors, 'UNKNOWN_PARTICIPATION', 'participation', 'Participation is not registered');
    if (!strings(plan.devices) || plan.devices.some((device) => !DEVICES.has(device)) || new Set(plan.devices || []).size !== (plan.devices || []).length) fail(errors, 'INVALID_DEVICES', 'devices', 'Devices must be a non-empty list of unique registered device IDs');
    if (!object(plan.story) || typeof plan.story.title !== 'string' || typeof plan.story.premise !== 'string' || typeof plan.story.goal !== 'string' || !strings(plan.story.places)) fail(errors, 'INVALID_STORY', 'story', 'Story metadata is incomplete');
   unknownKeys(plan.story, STORY_KEYS, 'story', errors);
   const registeredStory = PRODUCT_THEMES[plan.theme];
   if (registeredStory && object(plan.story) && (plan.story.title !== registeredStory.title || plan.story.premise !== registeredStory.story || plan.story.goal !== registeredStory.goal || JSON.stringify(plan.story.places) !== JSON.stringify(registeredStory.places))) fail(errors, 'STORY_OWNERSHIP', 'story', 'Story fields must match the registered theme');
  if (!Array.isArray(plan.activityPlans) || !Array.isArray(plan.checkpoints)) return { ok: false, errors: errors.concat([{ code: 'INVALID_TIMELINE', path: 'activityPlans', message: 'Activities and checkpoints are required' }]) };

   const sourcePackage = pkg && object(pkg) ? pkg : null;
   if (sourcePackage) {
     const packageForValidation = { ...sourcePackage };
     delete packageForValidation.rowId;
     const packageResult = validateLessonPackage(packageForValidation, { mode: plan.status === 'approved' || mode === 'approved' ? 'publish' : 'draft' });
     for (const error of packageResult.errors) fail(errors, 'INVALID_PACKAGE_STRUCTURE', `package.${error.path}`, error.message);
   }
  const objectives = new Set((sourcePackage?.objectives || []).map((x) => x.id));
  const tasks = new Map((sourcePackage?.tasks || []).map((x) => [x.id, x]));
  const evidence = new Map((sourcePackage?.evidenceRules || []).map((x) => [x.id, x]));
   const activityIds = new Set();
   const orders = new Set();
   let minutes = 0;
  for (const [i, activity] of plan.activityPlans.entries()) {
    const path = `activityPlans.${i}`;
    if (!object(activity)) { fail(errors, 'INVALID_ACTIVITY_PLAN', path, 'Activity plan must be an object'); continue; }
    unknownKeys(activity, ACTIVITY_KEYS, path, errors);
     if (activityIds.has(activity.id)) fail(errors, 'DUPLICATE_ACTIVITY', `${path}.id`, 'Duplicate activity ID');
     activityIds.add(activity.id);
     if (orders.has(activity.order) || activity.order !== i) fail(errors, 'INVALID_ACTIVITY_ORDER', `${path}.order`, 'Activity order must be unique and contiguous from zero');
     orders.add(activity.order);
     if (!PHASES.has(activity.phase)) fail(errors, 'UNKNOWN_PHASE', `${path}.phase`, 'Activity phase is not allowed');
    if (!Number.isSafeInteger(activity.minutes) || activity.minutes <= 0) fail(errors, 'INVALID_TIME', `${path}.minutes`, 'Activity minutes must be positive integer');
    minutes += Number(activity.minutes) || 0;
      if (!BUDGET_ROLES.has(activity.budgetRole)) fail(errors, 'INVALID_BUDGET_ROLE', `${path}.budgetRole`, 'Activity budgetRole must be core, reserve, or optional');
     if (!validId(activity.id) || !Number.isSafeInteger(activity.order) || !strings(activity.objectiveIds) || !strings(activity.taskIds) || !strings(activity.evidenceIds)) fail(errors, 'INVALID_ACTIVITY_PLAN', path, 'Activity IDs and ownership lists must be non-empty string arrays');
     for (const id of activity.objectiveIds || []) if (sourcePackage && !objectives.has(id)) fail(errors, 'UNKNOWN_OBJECTIVE_ID', `${path}.objectiveIds`, `Unknown objective: ${id}`);
     for (const id of activity.taskIds || []) if (sourcePackage && !tasks.has(id)) fail(errors, 'UNKNOWN_TASK_ID', `${path}.taskIds`, `Unknown task: ${id}`);
     for (const id of activity.evidenceIds || []) if (sourcePackage && !evidence.has(id)) fail(errors, 'UNKNOWN_EVIDENCE_ID', `${path}.evidenceIds`, `Unknown evidence: ${id}`);
      if (sourcePackage && (activity.taskIds || []).some((id) => tasks.get(id)?.participation !== activity.participation)) fail(errors, 'ACTIVITY_PARTICIPATION_MISMATCH', `${path}.participation`, 'Activity participation must match every authored task');
  }
  if (sourcePackage) {
     if (minutes !== sourcePackage.budget?.slotMinutes) fail(errors, 'TIME_GAP', 'activityPlans', 'Activity minutes must cover exactly the package slot');
     const packageActivities = new Map((sourcePackage.activities || []).map((x) => [x.id, x]));
      if (plan.activityPlans.length !== packageActivities.size || plan.activityPlans.some((x) => !packageActivities.has(x.id))) fail(errors, 'ACTIVITY_OWNERSHIP', 'activityPlans', 'Session must retain every package activity exactly once');
      if (!plan.activityPlans.some((activity) => activity.budgetRole === 'core')) fail(errors, 'CORE_GATE_BYPASS', 'activityPlans', 'Session must retain at least one core activity');
      for (const activity of plan.activityPlans) {
       const authored = packageActivities.get(activity.id);
       if (!authored) continue;
        for (const field of ['phase', 'minutes', 'participation', 'objectiveIds', 'taskIds', 'evidenceIds', 'budgetRole']) if (JSON.stringify(activity[field] || null) !== JSON.stringify(authored[field] || null)) fail(errors, 'ACTIVITY_OWNERSHIP', `activityPlans.${activity.id}.${field}`, 'Activity ownership must exactly match the package');
     }
    const covered = new Set(plan.activityPlans.flatMap((x) => x.objectiveIds || []));
    for (const objective of sourcePackage.objectives || []) if (!covered.has(objective.id)) fail(errors, 'LO_GAP', `objectives.${objective.id}`, 'Objective is not covered by the session timeline');
     const plannedTasks = new Set();
     for (const activity of plan.activityPlans) for (const taskId of activity.taskIds || []) {
       if (plannedTasks.has(taskId)) fail(errors, 'DUPLICATE_TASK_OWNERSHIP', `activityPlans.${activity.id}.taskIds`, `Task appears more than once: ${taskId}`);
       plannedTasks.add(taskId);
       const task = tasks.get(taskId);
       if (task && task.activityId !== activity.id) fail(errors, 'TASK_ACTIVITY_MISMATCH', `activityPlans.${activity.id}.taskIds`, `Task ${taskId} belongs to ${task.activityId}`);
       if (task && (JSON.stringify(task.objectiveIds || []) !== JSON.stringify((activity.objectiveIds || []).filter((id) => (task.objectiveIds || []).includes(id)))) ) fail(errors, 'TASK_OBJECTIVE_OWNERSHIP', `tasks.${taskId}`, 'Task objective ownership is inconsistent with its activity');
     }
     if (plannedTasks.size !== tasks.size) fail(errors, 'TASK_OWNERSHIP', 'activityPlans', 'Session must retain every package task exactly once');
   }
   for (const [i, checkpoint] of plan.checkpoints.entries()) {
     if (!object(checkpoint)) { fail(errors, 'INVALID_CHECKPOINT', `checkpoints.${i}`, 'Checkpoint must be an object'); continue; }
     unknownKeys(checkpoint, CHECKPOINT_KEYS, `checkpoints.${i}`, errors);
     if (!validId(checkpoint.id) || !validId(checkpoint.activityId) || !strings(checkpoint.objectiveIds) || !strings(checkpoint.evidenceIds)) fail(errors, 'INVALID_CHECKPOINT', `checkpoints.${i}`, 'Checkpoint fields have invalid shape');
     if (!activityIds.has(checkpoint.activityId)) fail(errors, 'UNKNOWN_CHECKPOINT_ACTIVITY', `checkpoints.${i}.activityId`, 'Checkpoint activity is not in the timeline');
     const checkpointActivity = plan.activityPlans.find((activity) => activity.id === checkpoint.activityId);
     if (checkpoint.individual !== true || checkpointActivity?.participation !== 'individual') fail(errors, 'MASTERY_NOT_INDIVIDUAL', `checkpoints.${i}`, 'Mastery checkpoint must be individual');
     if (checkpointActivity && checkpointActivity.taskIds.some((id) => tasks.get(id)?.participation !== 'individual')) fail(errors, 'GROUP_RECHECK_FORBIDDEN', `checkpoints.${i}`, 'Recheck cannot include group or whole-class tasks');
     if (checkpointActivity && (JSON.stringify(checkpoint.objectiveIds) !== JSON.stringify(checkpointActivity.objectiveIds) || JSON.stringify(checkpoint.evidenceIds) !== JSON.stringify(checkpointActivity.evidenceIds))) fail(errors, 'CHECKPOINT_OWNERSHIP', `checkpoints.${i}`, 'Checkpoint ownership must exactly match its activity');
  }
  if (!object(plan.policies) || !object(plan.policies.branch) || !object(plan.policies.reward) || !object(plan.policies.skill)) fail(errors, 'INVALID_POLICIES', 'policies', 'Branch, reward, and skill policies are required');
  unknownKeys(plan.policies, POLICY_KEYS, 'policies', errors);
  unknownKeys(plan.policies?.branch, BRANCH_KEYS, 'policies.branch', errors);
  unknownKeys(plan.policies?.reward, REWARD_KEYS, 'policies.reward', errors);
  unknownKeys(plan.policies?.skill, SKILL_KEYS, 'policies.skill', errors);
  unknownKeys(plan.director, DIRECTOR_KEYS, 'director', errors);
    if (plan.policies?.branch && (!strings(plan.policies.branch.allowed) || plan.policies.branch.allowed.some((x) => !BRANCHES.has(x)) || new Set(plan.policies.branch.allowed).size !== plan.policies.branch.allowed.length || !BRANCHES.has(plan.policies.branch.default) || !plan.policies.branch.allowed.includes(plan.policies.branch.default))) fail(errors, 'UNKNOWN_BRANCH', 'policies.branch', 'Invalid branch policy');
   if (plan.policies?.skill && (!Array.isArray(plan.policies.skill.roles) || plan.policies.skill.roles.some((x) => !ROLES.has(x)))) fail(errors, 'UNKNOWN_ROLE', 'policies.skill.roles', 'Unknown skill role');
   if (plan.policies?.reward && (!REWARDS.has(plan.policies.reward.group) || !REWARDS.has(plan.policies.reward.individual) || typeof plan.policies.reward.once !== 'boolean')) fail(errors, 'INVALID_REWARD_POLICY', 'policies.reward', 'Reward policy has invalid types or values');
   if (plan.policies?.reward?.group === 'mastery') fail(errors, 'GROUP_GAME_MAP_MASTERY', 'policies.reward.group', 'Group rewards cannot establish mastery');
   if (plan.policies?.skill && (plan.policies.skill.evidence !== 'individual' || !strings(plan.policies.skill.roles))) fail(errors, 'INVALID_SKILL_POLICY', 'policies.skill', 'Skill evidence must remain individual');
    if (!object(plan.director) || plan.director.deterministic !== true || !Number.isSafeInteger(plan.director.seed) || typeof plan.director.confidence !== 'number' || !Number.isFinite(plan.director.confidence) || plan.director.confidence < 0 || plan.director.confidence > 1 || !Array.isArray(plan.director.uncertainties) || plan.director.uncertainties.some((item) => typeof item !== 'string' || item.length === 0)) fail(errors, 'INVALID_DIRECTOR', 'director', 'Director metadata has invalid types or confidence outside [0,1]');
   if (sourcePackage) {
     const mustObjectives = (sourcePackage.objectives || []).filter((objective) => objective.level === 'must');
     for (const objective of mustObjectives) {
       const covered = plan.checkpoints.filter((checkpoint) => checkpoint.objectiveIds.includes(objective.id) && checkpoint.evidenceIds.length > 0 && plan.activityPlans.find((activity) => activity.id === checkpoint.activityId)?.phase === 'recheck' && checkpoint.individual === true);
       if (!covered.length) fail(errors, 'MUST_OBJECTIVE_CHECKPOINT_MISSING', `objectives.${objective.id}`, 'Every must objective requires a non-empty individual recheck checkpoint');
     }
    const mastery = new Set(sourcePackage.masteryPolicy?.masterySources || []);
    const checkpointEvidence = new Set(plan.checkpoints.flatMap((x) => x.evidenceIds || []));
    for (const source of mastery) if (!(sourcePackage.evidenceRules || []).some((x) => x.kind === source && checkpointEvidence.has(x.id))) fail(errors, 'CORE_GATE_BYPASS', 'checkpoints', `Mastery source is not represented: ${source}`);
    if (!(sourcePackage.evidenceRules || []).some((x) => x.individual && x.countsForMastery)) fail(errors, 'CORE_GATE_BYPASS', 'evidenceRules', 'No individual mastery evidence exists');
    const forbidden = new Set(sourcePackage.masteryPolicy?.forbiddenSources || ['group_product', 'map_position', 'race_position', 'group_score']);
     for (const evidenceId of checkpointEvidence) {
       const evidenceRule = evidence.get(evidenceId);
       if (evidenceRule && (forbidden.has(evidenceRule.kind) || evidenceRule.individual !== true || evidenceRule.countsForMastery !== true)) fail(errors, 'GROUP_GAME_MAP_MASTERY', `checkpoints.${evidenceId}`, 'Group, game, map, plan, or non-individual evidence cannot establish mastery');
     }
     if (plan.status === 'approved' || mode === 'approved') {
       if (!Array.isArray(sourcePackage.sourceRefs) || sourcePackage.sourceRefs.length === 0) fail(errors, 'SOURCE_REFS_REQUIRED', 'sourceRefs', 'Approved plans require non-empty sourceRefs');
        for (const [i, source] of (sourcePackage.sourceRefs || []).entries()) if (!sourceReviewed && source.verification !== 'verified') fail(errors, 'UNVERIFIED_SOURCE', `sourceRefs.${i}`, 'Approved plans require verified sources');
     }
  }
  return { ok: errors.length === 0, errors };
  } catch (error) {
    return { ok: false, errors: [{ code: 'INVALID_PLAN', path: '', message: error instanceof Error ? error.message : 'Invalid SessionPlan' }] };
  }
}

export { validateSessionPlan };
export default validateSessionPlan;
