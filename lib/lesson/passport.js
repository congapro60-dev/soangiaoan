/**
 * Learner passport and evidence tracking module.
 */

/**
 * Creates an empty serializable learner passport.
 *
 * @param {string} id
 * @param {Object} pkg
 * @returns {Object}
 */
export function createLearnerPassport(id, pkg = null) {
  return {
    learnerId: id,
    packageVersion: pkg?.version || null,
    submissions: [],
    supportHistory: [],
    revealedTasks: {},
    objectiveEvidence: {}
  };
}

/**
 * Records a hint usage in the learner's passport.
 *
 * @param {Object} passport
 * @param {{ taskId: string, hintId: string, tier: string, now: number }} param1
 * @returns {Object} new passport
 */
export function recordHintAssistance(passport, { taskId, hintId, tier, now }) {
  const newPassport = JSON.parse(JSON.stringify(passport));
  newPassport.supportHistory.push({
    taskId,
    hintId,
    tier,
    at: now
  });
  return newPassport;
}

/**
 * Records or updates a task submission in the learner's passport.
 *
 * @param {Object} passport
 * @param {Object} submission
 * @param {Object} pkg
 * @returns {Object} new passport
 */
export function recordTaskSubmission(
  passport,
  {
    submissionId,
    taskId,
    activityId,
    answer,
    ok,
    assessmentStatus = 'assessed',
    assisted = false,
    evidenceIds = [],
    now
  },
  pkg = null
) {
  const newPassport = JSON.parse(JSON.stringify(passport));
  if (pkg?.version) {
    newPassport.packageVersion = pkg.version;
  }

  const hasHint = Array.isArray(newPassport.supportHistory) &&
    newPassport.supportHistory.some((h) => h.taskId === taskId);
  const isRevealed = Boolean(newPassport.revealedTasks?.[taskId]);
  const isAssisted = Boolean(assisted || hasHint || isRevealed);

  const subRecord = {
    submissionId,
    taskId,
    activityId,
    answer,
    ok: Boolean(ok),
    assessmentStatus,
    assisted: isAssisted,
    evidenceIds: Array.isArray(evidenceIds) ? [...evidenceIds] : [],
    at: now
  };

  const existingIndex = newPassport.submissions.findIndex((s) => s.submissionId === submissionId);
  if (existingIndex >= 0) {
    newPassport.submissions[existingIndex] = subRecord;
  } else {
    newPassport.submissions.push(subRecord);
  }

  return newPassport;
}

/**
 * Computes objective mastery for a learner from their passport submissions.
 *
 * @param {Object} passport
 * @param {string} objectiveId
 * @param {Object} pkg
 * @returns {{
 *   status: 'no_evidence' | 'in_progress' | 'supported' | 'independent_mastery' | 'needs_support',
 *   independentCount: number,
 *   supportedCount: number
 * }}
 */
export function computeObjectiveMastery(passport, objectiveId, pkg) {
  if (!passport || !pkg) {
    return { status: 'no_evidence', independentCount: 0, supportedCount: 0 };
  }

  const forbiddenSources = new Set(pkg.masteryPolicy?.forbiddenSources || [
    'group_product',
    'map_position',
    'race_position',
    'group_score'
  ]);
  const masterySources = new Set(pkg.masteryPolicy?.masterySources || [
    'independent_recheck',
    'individual_recheck',
    'exit'
  ]);
  const minRequired = Number.isInteger(pkg.masteryPolicy?.individualEvidencePerObjectiveMin)
    ? pkg.masteryPolicy.individualEvidencePerObjectiveMin
    : 2;

  const relevantRules = (pkg.evidenceRules || []).filter(
    (r) =>
      r.objectiveId === objectiveId ||
      (Array.isArray(r.objectiveIds) && r.objectiveIds.includes(objectiveId))
  );
  if (relevantRules.length === 0) {
    return { status: 'no_evidence', independentCount: 0, supportedCount: 0 };
  }

  const independentTasks = new Set();
  const supportedTasks = new Set();
  let hasIndependentRecheck = false;
  let hasPending = false;
  let hasFailed = false;

  for (const rule of relevantRules) {
    // If forbidden source, cannot count for mastery
    if (forbiddenSources.has(rule.kind)) {
      continue;
    }

    const taskSubs = (passport.submissions || []).filter((s) => s.taskId === rule.taskId);
    if (taskSubs.length === 0) {
      continue;
    }

    // Evaluate latest assessed record per task
    const assessedSubs = taskSubs.filter((s) => s.assessmentStatus === 'assessed');
    const latestAssessed = assessedSubs.length > 0 ? assessedSubs[assessedSubs.length - 1] : null;
    const latestAny = taskSubs[taskSubs.length - 1];

    if (!latestAssessed) {
      if (latestAny && latestAny.assessmentStatus === 'pending') {
        hasPending = true;
      }
      continue;
    }

    if (!latestAssessed.ok) {
      hasFailed = true;
      continue;
    }

    // Check if rule counts for mastery and source is allowed
    if (!rule.countsForMastery || !masterySources.has(rule.kind)) {
      continue;
    }

    const hasHint = Array.isArray(passport.supportHistory) &&
      passport.supportHistory.some((h) => h.taskId === rule.taskId);
    const isRevealed = Boolean(passport.revealedTasks?.[rule.taskId]);
    const isAssisted = Boolean(latestAssessed.assisted || hasHint || isRevealed);

    if (isAssisted) {
      supportedTasks.add(rule.taskId);
    } else {
      independentTasks.add(rule.taskId);
      if (rule.kind === 'independent_recheck' || rule.kind === 'individual_recheck') {
        hasIndependentRecheck = true;
      }
    }
  }

  const independentCount = independentTasks.size;
  const supportedCount = supportedTasks.size;

  let status = 'no_evidence';
  if (independentCount >= minRequired && hasIndependentRecheck) {
    status = 'independent_mastery';
  } else if (supportedCount > 0 || independentCount > 0) {
    status = 'supported';
  } else if (hasFailed) {
    status = 'needs_support';
  } else if (hasPending) {
    status = 'in_progress';
  }

  return {
    status,
    independentCount,
    supportedCount
  };
}

const CARD_STATUS = { independent_mastery: 'independent', supported: 'supported' };

/**
 * End-of-lesson card for one learner: what they did on their own, what they did with help, and one next step.
 * No ranking, no score comparison; built only from the learner's own passport.
 */
export function buildPassportCard(passport, pkg) {
  const objectives = (pkg?.objectives || []).map((objective) => {
    const mastery = computeObjectiveMastery(passport, objective.id, pkg);
    return {
      id: objective.id,
      code: objective.code || '',
      statement: objective.statement || objective.text || objective.id,
      status: mastery.status === 'supported' && mastery.supportedCount === 0 ? 'next' : CARD_STATUS[mastery.status] || 'next'
    };
  }).filter((item) => item.statement);
  const firstNext = objectives.find((item) => item.status === 'next') || objectives.find((item) => item.status === 'supported');
  const nextStep = firstNext
    ? (firstNext.status === 'next' ? `Ôn lại và thử thêm một bài về: ${firstNext.statement}` : `Tự làm lại không dùng gợi ý một bài về: ${firstNext.statement}`)
    : 'Em đã tự làm được mọi mục tiêu của tiết học. Thử một bài nâng cao nhé!';
  return {
    objectives,
    nextStep,
    hints: Array.isArray(passport?.supportHistory) ? passport.supportHistory.length : 0
  };
}
