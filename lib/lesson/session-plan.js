import { createHash } from 'node:crypto';
import { PRODUCT_THEMES } from '../product-content.js';
import { RULES } from '../mode-engine/index.js';
import { ROLE_DEFINITIONS } from './grouping.js';
import { canonicalize, hashPackage } from './schema.js';

export const SESSION_PLAN_SCHEMA = '1.0.0';
export const SESSION_STATUSES = Object.freeze(['draft', 'approved']);
export const DIRECTOR_POLICIES = Object.freeze(['branch', 'reward', 'skill']);

const freeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
  return value;
};

function planHash(plan) {
  const copy = { ...plan };
  delete copy.contentHash;
  return createHash('sha256').update(canonicalize(copy), 'utf8').digest('hex');
}

function packageTuple(pkg) {
  if (!pkg || typeof pkg !== 'object') throw new TypeError('PACKAGE_REQUIRED');
  const packageContent = { ...pkg };
  delete packageContent.rowId;
  const contentHash = hashPackage(packageContent);
  const tuple = { id: pkg.id, version: pkg.version, contentHash };
  if (typeof pkg.rowId === 'string' && pkg.rowId) tuple.rowId = pkg.rowId;
  return tuple;
}

function asIds(items) {
  return Array.isArray(items) ? items.map((item) => typeof item === 'string' ? item : item.id) : [];
}

export function createSessionPlan({
  package: pkg,
  theme = 'modern',
  map = theme,
  rule = 'campaign',
  participation = 'group',
  devices = ['projector', 'learner-device'],
  status = 'draft',
  policies = {},
  director = {}
} = {}) {
  const themeId = typeof theme === 'string' ? theme : theme?.id;
  const mapId = typeof map === 'string' ? map : map?.id;
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) throw new TypeError('PACKAGE_REQUIRED');
  if (!Object.hasOwn(PRODUCT_THEMES, themeId)) throw new Error('UNKNOWN_THEME');
  if (!Object.hasOwn(PRODUCT_THEMES, mapId)) throw new Error('UNKNOWN_MAP');
  if (themeId !== mapId) throw new Error('STORY_MISMATCH');
  if (!Object.hasOwn(RULES, rule)) throw new Error('UNKNOWN_RULE');
  if (!['group', 'individual', 'pairs'].includes(participation)) throw new Error('UNKNOWN_PARTICIPATION');
  if (!SESSION_STATUSES.includes(status)) throw new Error('UNKNOWN_STATUS');

  const activities = Array.isArray(pkg.activities) ? pkg.activities : [];
  const checkpoints = activities
    .filter((activity) => ['recheck', 'exit'].includes(activity.phase))
    .map((activity) => ({
      id: `checkpoint-${activity.id}`,
      activityId: activity.id,
      objectiveIds: [...(activity.objectiveIds || [])],
      evidenceIds: [...(activity.evidenceIds || [])],
      individual: activity.participation === 'individual'
    }));
  const plan = {
    schemaVersion: SESSION_PLAN_SCHEMA,
    id: `${pkg.id}:${pkg.version}:${themeId}:${rule}`,
    status,
    package: packageTuple(pkg),
    theme: themeId,
    map: mapId,
    rule,
    participation,
    devices: [...devices],
    story: {
      title: PRODUCT_THEMES[themeId].title,
      premise: PRODUCT_THEMES[themeId].story,
      goal: PRODUCT_THEMES[themeId].goal,
      places: [...PRODUCT_THEMES[themeId].places]
    },
    activityPlans: activities.map((activity, index) => ({
      id: activity.id,
      order: index,
      phase: activity.phase,
      minutes: activity.minutes,
      participation: activity.participation,
      objectiveIds: [...(activity.objectiveIds || [])],
      taskIds: [...(activity.taskIds || [])],
      evidenceIds: [...(activity.evidenceIds || [])],
      budgetRole: activity.budgetRole
    })),
    checkpoints,
    policies: {
      branch: policies.branch || { allowed: ['shared', 'support', 'core', 'extension'], default: 'shared' },
      reward: policies.reward || { group: 'cosmetic', individual: 'mastery', once: true },
      skill: policies.skill || { roles: ROLE_DEFINITIONS.map(({ id }) => id), evidence: 'individual' }
    },
    director: {
      deterministic: true,
      seed: Number.isSafeInteger(director.seed) ? director.seed : 0,
       confidence: typeof director.confidence === 'number' && director.confidence >= 0 && director.confidence <= 1 ? director.confidence : 1,
      uncertainties: Array.isArray(director.uncertainties) ? [...director.uncertainties] : []
    }
  };
  plan.contentHash = planHash(plan);
  return freeze(plan);
}

export const hashSessionPlan = planHash;
export const canonicalizeSessionPlan = (plan) => canonicalize(plan);
export { freeze as deepFreeze };
