import { createSessionPlan } from './session-plan.js';
import { validateSessionPlan } from './validate-session-plan.js';

const stable = (value) => JSON.stringify(value, Object.keys(value).sort());
function confidence(pkg) {
  const refs = pkg?.sourceRefs || [];
  if (!refs.length) return 0;
  return refs.filter((ref) => ref.verification === 'verified').length / refs.length;
}

function chooseConfiguration(pkg, requestedRule, requestedParticipation) {
  const tasks = Array.isArray(pkg?.tasks) ? pkg.tasks : [];
  const hasGroup = tasks.some((task) => ['group', 'whole_class'].includes(task.participation));
  const hasPair = tasks.some((task) => task.participation === 'pair');
  const hasIndividual = tasks.some((task) => task.participation === 'individual');
  const participation = hasGroup ? 'group' : hasPair ? 'pairs' : 'individual';
  const rule = hasGroup ? 'campaign' : hasPair ? 'duel' : 'campaign';
  const reasonCodes = [`PARTICIPATION_FROM_TASKS_${participation.toUpperCase()}`, `RULE_FROM_TASKS_${rule.toUpperCase()}`];
  if (requestedParticipation !== participation) reasonCodes.push('REQUESTED_PARTICIPATION_OVERRIDDEN_INCOMPATIBLE');
  if (requestedRule !== rule) reasonCodes.push('REQUESTED_RULE_OVERRIDDEN_INCOMPATIBLE');
  if (!hasIndividual) reasonCodes.push('NO_INDIVIDUAL_TASKS');
  return { rule, participation, reasonCodes };
}

export function pilotDraft({ package: pkg, theme = 'modern', map = theme, rule = 'campaign', participation = 'group', seed = 0 } = {}) {
  const reasonCodes = [];
  const alternatives = [];
  const uncertainties = [];
  if (!pkg) return { status: 'draft', reasonCodes: ['PACKAGE_REQUIRED'], alternatives: [], confidence: 0, uncertainties: ['package'], plan: null };
  const chosen = chooseConfiguration(pkg, rule, participation);
  reasonCodes.push(...chosen.reasonCodes);
  if ((pkg.sourceRefs || []).some((ref) => ref.verification !== 'verified')) {
    reasonCodes.push('SOURCE_REVIEW_REQUIRED');
    uncertainties.push('sourceRefs');
  }
  if (!pkg.budget?.slotMinutes) reasonCodes.push('TIME_BUDGET_MISSING');
  if (!Array.isArray(pkg.objectives) || !pkg.objectives.length) reasonCodes.push('LEARNING_OBJECTIVES_MISSING');
  if (chosen.rule !== rule) alternatives.push({ rule, reasonCode: 'REQUESTED_RULE_NOT_SELECTED' });
  if (chosen.participation !== participation) alternatives.push({ participation, reasonCode: 'REQUESTED_PARTICIPATION_NOT_SELECTED' });
  if (alternatives.length === 0) alternatives.push({ participation: 'individual', reasonCode: 'INDIVIDUAL_CHECKPOINT_ALTERNATIVE' });
  let plan;
  try {
     plan = createSessionPlan({ package: pkg, theme, map, rule: chosen.rule, participation: chosen.participation, status: 'draft', director: { seed, confidence: confidence(pkg), uncertainties } });
  } catch (error) {
    reasonCodes.push(error.message);
  }
  const validation = plan ? validateSessionPlan(plan, { package: pkg }) : { ok: false, errors: [] };
  for (const error of validation.errors) reasonCodes.push(error.code);
  return {
    status: 'draft',
    reasonCodes: [...new Set(reasonCodes)],
    alternatives,
    confidence: confidence(pkg),
    uncertainties,
    plan: validation.ok ? plan : null,
    validation
  };
}

export function createDirector(options = {}) {
  return Object.freeze({
    deterministic: true,
    pilotDraft: (input = {}) => pilotDraft({ ...input, ...options }),
    approved(input = {}) {
      const draft = pilotDraft({ ...input, ...options });
      if (draft.reasonCodes.includes('SOURCE_REVIEW_REQUIRED')) return { ...draft, status: 'draft', approved: false, reasonCodes: [...draft.reasonCodes, 'APPROVAL_REFUSED_UNVERIFIED_SOURCE'] };
      if (!draft.plan) return { ...draft, status: 'draft', approved: false };
       const chosen = chooseConfiguration(input.package, input.rule || options.rule || 'campaign', input.participation || options.participation || 'group');
       const plan = createSessionPlan({ package: input.package, theme: input.theme || options.theme || 'modern', map: input.map || input.theme || options.theme || 'modern', rule: chosen.rule, participation: chosen.participation, status: 'approved', director: { seed: input.seed || options.seed || 0, confidence: draft.confidence, uncertainties: draft.uncertainties } });
      const validation = validateSessionPlan(plan, { package: input.package, mode: 'approved' });
      return { ...draft, status: validation.ok ? 'approved' : 'draft', approved: validation.ok, plan: validation.ok ? plan : null, validation };
    }
  });
}

export const directSession = pilotDraft;
export { stable };
