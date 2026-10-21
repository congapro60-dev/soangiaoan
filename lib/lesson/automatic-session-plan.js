import { createHash } from 'node:crypto';
import { canonicalize } from './schema.js';
import { createSessionPlan, hashSessionPlan } from './session-plan.js';
import { validateSessionPlan } from './validate-session-plan.js';

const sha = value => createHash('sha256').update(canonicalize(value)).digest('hex');

export function createAutomaticSessionPlan({ package: pkg, setup } = {}) {
  if (!pkg || typeof pkg !== 'object' || !setup || typeof setup !== 'object') return { ok:false, reason:'AUTO_PLAN_INPUT_REQUIRED' };
  try {
    const theme = setup.worldTheme || 'modern';
    const boundPackage = pkg;
    const plan = createSessionPlan({
      package: boundPackage, theme, map: theme, rule: setup.rule,
      participation: setup.participation, devices: ['projector', 'learner-device'], status: 'draft'
    });
    const validation = validateSessionPlan(plan, { package: boundPackage, mode:'draft' });
    if (!validation.ok) return { ok:false, reason:'AUTO_PLAN_INVALID', errors:validation.errors.slice(0,8).map(error=>error.code) };
    const setupFingerprint = sha(setup);
    const packageHash = plan.package.contentHash;
    const planHash = hashSessionPlan(plan);
    return { ok:true, plan, audit:{mode:'automatic', packageHash, setupFingerprint, rule:setup.rule, planHash, deterministic:true} };
  } catch (error) {
    return { ok:false, reason:['UNKNOWN_RULE','UNKNOWN_THEME','STORY_MISMATCH','UNKNOWN_PARTICIPATION'].includes(error?.message) ? error.message : 'AUTO_PLAN_INVALID' };
  }
}
