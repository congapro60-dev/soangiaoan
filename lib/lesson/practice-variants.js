import { hashPackage } from './schema.js';
import { validateLessonPackage } from './validate.js';

const variantsCache = new Map();

export function practiceVariants(pkg, activityId, branch = 'core') {
  const key = (pkg.contentHash || hashPackage(pkg)) + ':' + activityId + ':' + branch;
  if (variantsCache.has(key)) return structuredClone(variantsCache.get(key));
  const activity = pkg.activities.find(item => item.id === activityId);
  if (!activity) return [];
  const candidates = [];
  for (const base of pkg.tasks.filter(task => activity.taskIds.includes(task.id) && ['closed','open'].includes(task.type) && (!task.branch || task.branch === 'shared' || task.branch === branch))) {
    const variants = base.metadata?.practiceVariants;
    if (!Array.isArray(variants) || variants.length > 16) continue;
    for (const [index, variant] of variants.entries()) {
      if (!variant || Object.keys(variant).some(key => !['prompt', 'evaluation', 'inputSchema', 'masteryEvidence'].includes(key)) || typeof variant.prompt !== 'string' || variant.prompt === base.prompt || variant.masteryEvidence !== undefined && typeof variant.masteryEvidence !== 'boolean') continue;
      const { masteryEvidence = false, ...content } = variant;
      const task = { ...structuredClone(base), ...structuredClone(content), participation: 'individual', isCore: false, requiresFullScaffold: false, hintIds: [], metadata: { ...base.metadata } };
      delete task.metadata.practiceVariants;
      const probe = structuredClone(pkg);
      probe.tasks[probe.tasks.findIndex(item => item.id === base.id)] = task;
      const hintIds = new Set(base.hintIds || []);
      probe.hints = probe.hints.filter(hint => !hintIds.has(hint.id));
      for (const act of probe.activities) act.supportIds = (act.supportIds || []).filter(id => !hintIds.has(id));
      probe.contentHash = hashPackage(probe);
      if (validateLessonPackage(probe).ok) candidates.push({ task, variantId: base.id + ':' + index, masteryEvidence });
    }
  }
  // ponytail: bounded cache for immutable packages; use a per-package compiled plan if pools grow beyond 32 keys.
  if (variantsCache.size >= 32) variantsCache.delete(variantsCache.keys().next().value);
  variantsCache.set(key, candidates);
  return structuredClone(candidates);
}

export function practiceEvidencePackage(pkg) {
  const tasks = [], evidenceRules = [];
  for (const activity of pkg?.activities || []) for (const branch of ['support', 'core', 'extension']) {
    for (const variant of practiceVariants(pkg, activity.id, branch)) {
      const taskId = 'variant:' + variant.variantId;
      if (!variant.masteryEvidence || tasks.some(task => task.id === taskId)) continue;
      const rules = (pkg.evidenceRules || []).filter(rule => rule.taskId === variant.task.id && rule.individual === true && rule.countsForMastery === true && ['individual_recheck','independent_recheck','exit'].includes(rule.kind));
      if (!rules.length || variant.task.participation !== 'individual') continue;
      const clonedRules = rules.map(rule => ({ ...rule, id: taskId + ':' + rule.id, taskId }));
      tasks.push({ ...variant.task, id: taskId, evidenceIds: clonedRules.map(rule => rule.id) });
      evidenceRules.push(...clonedRules);
    }
  }
  return { ...pkg, tasks: [...(pkg?.tasks || []), ...tasks], evidenceRules: [...(pkg?.evidenceRules || []), ...evidenceRules] };
}
