/**
 * Serialization allowlists for teacher, student, and presenter views.
 */

import { extensionEligibility, DICE_UNITS_PER_ACTIVITY, MASCOT_COUNT } from './runtime.js';
import { serializeLessonArena } from './arena-bridge.js';
import { gateClockActive, projectGateTiming } from './gate-history.js';
import { buildPassportCard } from './passport.js';

/**
 * Sanitizes inputSchema using strict allowlists for student and presenter views.
 *
 * @param {Object} inputSchema
 * @returns {Object|undefined}
 */
function sanitizeInputSchema(inputSchema) {
  if (!inputSchema || typeof inputSchema !== 'object') return undefined;
  const clean = {};
  if (typeof inputSchema.type === 'string') {
    clean.type = inputSchema.type;
  }
  if (Array.isArray(inputSchema.options)) {
    clean.options = inputSchema.options.map((opt) => ({
      id: String(opt.id),
      label: String(opt.label)
    }));
  }
  if (Array.isArray(inputSchema.representations)) {
    clean.representations = inputSchema.representations.map((rep) => ({
      id: String(rep.id),
      label: String(rep.label)
    }));
  }
  if (Array.isArray(inputSchema.cards)) {
    clean.cards = inputSchema.cards.map((card) => ({
      id: String(card.id),
      label: String(card.label)
    }));
  }
  return clean;
}

/**
 * Sanitizes a single task for teacher view using strict allowlist.
 *
 * @param {Object} task
 * @returns {Object|null}
 */
function sanitizeTaskForTeacher(task) {
  if (!task || typeof task !== 'object') return null;
  const clean = {
    id: task.id,
    activityId: task.activityId,
    type: task.type,
    objectiveIds: Array.isArray(task.objectiveIds) ? [...task.objectiveIds] : [],
    prompt: task.prompt,
    branch: task.branch,
    participation: task.participation,
    minutes: task.minutes
  };

  if (Array.isArray(task.sourceRefs)) {
    clean.sourceRefs = task.sourceRefs.map((src) => ({
      id: src.id,
      kind: src.kind,
      locator: src.locator,
      label: src.label,
      verification: src.verification
    }));
  }

  if (task.inputSchema) {
    clean.inputSchema = sanitizeInputSchema(task.inputSchema);
  }

  if (task.evaluation) {
    clean.evaluation = {};
    if (task.evaluation.checkerId !== undefined) {
      clean.evaluation.checkerId = task.evaluation.checkerId;
    }
    if (Array.isArray(task.evaluation.options)) {
      clean.evaluation.options = [...task.evaluation.options];
    }
    if (task.evaluation.answerKey !== undefined) {
      clean.evaluation.answerKey = task.evaluation.answerKey;
    }
    if (task.evaluation.rubric) {
      clean.evaluation.rubric = {};
      if (Array.isArray(task.evaluation.rubric.criteria)) {
        clean.evaluation.rubric.criteria = [...task.evaluation.rubric.criteria];
      }
      if (Array.isArray(task.evaluation.rubric.lookFor)) {
        clean.evaluation.rubric.lookFor = [...task.evaluation.rubric.lookFor];
      }
    }
  }

  if (Array.isArray(task.hintIds)) {
    clean.hintIds = [...task.hintIds];
  }
  if (Array.isArray(task.supportIds)) {
    clean.supportIds = [...task.supportIds];
  }

  if (Array.isArray(task.hints)) {
    clean.hints = task.hints.map((h) => ({
      id: h.id,
      tier: h.tier,
      text: h.text || h.prompt || '',
      taskId: h.taskId || h.targetTaskId,
      objectiveIds: Array.isArray(h.objectiveIds) ? [...h.objectiveIds] : [],
      order: h.order,
      notAnswer: h.notAnswer,
      supportRationale: h.supportRationale
    }));
  }

  return clean;
}

/**
 * Sanitizes a lesson package for teacher view using strict allowlist.
 *
 * @param {Object} pkg
 * @returns {Object|null}
 */
function sanitizePackageForTeacher(pkg) {
  if (!pkg || typeof pkg !== 'object') return null;

  const sanitizedTasks = Array.isArray(pkg.tasks)
    ? pkg.tasks.map(sanitizeTaskForTeacher).filter(Boolean)
    : [];

  const sanitizedHints = Array.isArray(pkg.hints)
    ? pkg.hints.map((h) => ({
        id: h.id,
        tier: h.tier,
        text: h.text || h.prompt || '',
        taskId: h.taskId || h.targetTaskId,
        objectiveIds: Array.isArray(h.objectiveIds) ? [...h.objectiveIds] : [],
        order: h.order,
        notAnswer: h.notAnswer,
        supportRationale: h.supportRationale
      }))
    : [];

  const sanitizedEvidence = Array.isArray(pkg.evidenceRules || pkg.evidence)
    ? (pkg.evidenceRules || pkg.evidence).map((e) => ({
        id: e.id,
        kind: e.kind,
        objectiveIds: Array.isArray(e.objectiveIds)
          ? [...e.objectiveIds]
          : e.objectiveId
          ? [e.objectiveId]
          : [],
        individual: e.individual,
        countsForMastery: e.countsForMastery,
        taskId: e.taskId
      }))
    : [];

  const clean = {
    schemaVersion: pkg.schemaVersion,
    id: pkg.id,
    version: pkg.version,
    status: pkg.status,
    contentHash: pkg.contentHash,
    subject: pkg.subject,
    grade: pkg.grade,
    curriculumRefs: Array.isArray(pkg.curriculumRefs) ? [...pkg.curriculumRefs] : [],
    sourceRefs: Array.isArray(pkg.sourceRefs)
      ? pkg.sourceRefs.map((src) => ({
          id: src.id,
          kind: src.kind,
          locator: src.locator,
          label: src.label,
          verification: src.verification
        }))
      : [],
    essentialQuestion: pkg.essentialQuestion,
    prerequisites: Array.isArray(pkg.prerequisites) ? [...pkg.prerequisites] : [],
    budget: pkg.budget
      ? {
          slotMinutes: pkg.budget.slotMinutes,
          coreMinutes: pkg.budget.coreMinutes,
          reserveMinutes: pkg.budget.reserveMinutes,
          transitionMinutes: pkg.budget.transitionMinutes,
          optionalMinutes: pkg.budget.optionalMinutes
        }
      : undefined,
    objectives: Array.isArray(pkg.objectives)
      ? pkg.objectives.map((o) => ({
          id: o.id,
          code: o.code,
          level: o.level,
          statement: o.statement,
          prerequisiteIds: Array.isArray(o.prerequisiteIds) ? [...o.prerequisiteIds] : []
        }))
      : [],
    activities: Array.isArray(pkg.activities)
      ? pkg.activities.map((a) => ({
          id: a.id,
          phase: a.phase,
          budgetRole: a.budgetRole,
          minutes: a.minutes,
          objectiveIds: Array.isArray(a.objectiveIds) ? [...a.objectiveIds] : [],
          taskIds: Array.isArray(a.taskIds) ? [...a.taskIds] : [],
          participation: a.participation,
          studentAction: a.studentAction,
          expectedProduct: a.expectedProduct,
          evidenceIds: Array.isArray(a.evidenceIds) ? [...a.evidenceIds] : [],
          teacherLookFor: a.teacherLookFor,
          supportIds: Array.isArray(a.supportIds) ? [...a.supportIds] : [],
          transition: a.transition
        }))
      : [],
    tasks: sanitizedTasks,
    hints: sanitizedHints,
    evidenceRules: sanitizedEvidence,
    evidence: sanitizedEvidence,
    rubric: pkg.rubric
      ? {
          criteria: Array.isArray(pkg.rubric.criteria) ? [...pkg.rubric.criteria] : [],
          lookFor: Array.isArray(pkg.rubric.lookFor) ? [...pkg.rubric.lookFor] : []
        }
      : undefined,
    modePolicies: pkg.modePolicies ? JSON.parse(JSON.stringify(pkg.modePolicies)) : undefined,
    masteryPolicy: pkg.masteryPolicy
      ? {
          individualEvidencePerObjectiveMin: pkg.masteryPolicy.individualEvidencePerObjectiveMin,
          masterySources: Array.isArray(pkg.masteryPolicy.masterySources)
            ? [...pkg.masteryPolicy.masterySources]
            : [],
          forbiddenSources: Array.isArray(pkg.masteryPolicy.forbiddenSources)
            ? [...pkg.masteryPolicy.forbiddenSources]
            : []
        }
      : undefined
  };

  return clean;
}

function objectiveCodes(plan, pkg, checkpoint) {
  const codes = new Map((pkg?.objectives || []).map((objective) => [objective.id, objective.code]));
  return (checkpoint.objectiveCodes || checkpoint.objectiveIds || [])
    .map((id) => codes.get(id) || id)
    .filter((code) => typeof code === 'string' && code.length > 0);
}

function publicGamePlan(plan, pkg) {
  if (!plan || typeof plan !== 'object') return null;
  const mapSegment = (segment) => {
    if (!segment || typeof segment !== 'object') return undefined;
    const position = (value) => value && typeof value === 'object'
      ? {
          ...(Number.isInteger(value.index) ? { index: value.index } : {}),
          ...(Array.isArray(value.point) ? { point: value.point.slice(0, 2) } : {})
        }
      : undefined;
    return {
      ...(segment.id !== undefined ? { id: segment.id } : {}),
      ...(segment.activityId !== undefined ? { activityId: segment.activityId } : {}),
      ...(segment.order !== undefined ? { order: segment.order } : {}),
      ...(segment.start ? { start: position(segment.start) } : {}),
      ...(segment.end ? { end: position(segment.end) } : {}),
      ...(segment.coreGate !== undefined ? { coreGate: Boolean(segment.coreGate) } : {}),
      ...(segment.gateIndex !== undefined ? { gateIndex: segment.gateIndex } : {})
    };
  };
  return {
    id: plan.id,
    contentHash: plan.contentHash,
    schemaVersion: plan.schemaVersion,
    theme: plan.theme,
    map: plan.map,
    rule: plan.rule,
    participation: plan.participation,
    story: plan.story
      ? { title: plan.story.title, goal: plan.story.goal }
      : undefined,
    activityPlans: Array.isArray(plan.activityPlans)
      ? plan.activityPlans.map((activity) => ({
          id: activity.id,
          order: activity.order,
          phase: activity.phase,
          minutes: activity.minutes,
          participation: activity.participation,
          ...(activity.mapSegment && typeof activity.mapSegment === 'object'
            ? { mapSegment: mapSegment(activity.mapSegment) }
            : {})
        }))
      : [],
    checkpoints: Array.isArray(plan.checkpoints)
      ? plan.checkpoints.map((checkpoint) => ({
          id: checkpoint.id,
          objectiveCodes: objectiveCodes(plan, pkg, checkpoint)
        }))
      : []
  };
}

function teacherGamePlan(plan, pkg) {
  if (!plan || typeof plan !== 'object') return null;
  const publicPlan = publicGamePlan(plan, pkg);
  return {
    ...publicPlan,
    package: plan.package ? { ...plan.package } : undefined,
    devices: Array.isArray(plan.devices) ? [...plan.devices] : [],
    activityPlans: Array.isArray(plan.activityPlans)
      ? plan.activityPlans.map((activity) => ({
          ...publicPlan.activityPlans.find((item) => item.id === activity.id),
          objectiveIds: Array.isArray(activity.objectiveIds) ? [...activity.objectiveIds] : [],
          taskIds: Array.isArray(activity.taskIds) ? [...activity.taskIds] : [],
          evidenceIds: Array.isArray(activity.evidenceIds) ? [...activity.evidenceIds] : [],
          budgetRole: activity.budgetRole
        }))
      : [],
    policies: plan.policies ? JSON.parse(JSON.stringify(plan.policies)) : undefined
  };
}

/**
 * Serializes session state for teacher view (full keys, rubric, roster, evidence).
 *
 * @param {Object} state
 * @returns {Object}
 */
export function serializeForTeacher(state, now = state?.clock?.lastNow) {
  if (!state) return null;

  const sanitizedTasks = Array.isArray(state.package?.tasks)
    ? state.package.tasks.map(sanitizeTaskForTeacher).filter(Boolean)
    : [];

  const sanitizedPackage = state.package ? sanitizePackageForTeacher(state.package) : null;

  return {
    id: state.id,
    hostId: state.hostId,
    round: state.round,
    revision: state.revision,
    mode: state.mode,
    status: state.status,
    contentHash: state.package?.contentHash || state.packageHash,
    clock: state.clock ? JSON.parse(JSON.stringify(state.clock)) : null,
    timeline: state.timeline ? JSON.parse(JSON.stringify(state.timeline)) : null,
    roster: state.roster ? JSON.parse(JSON.stringify(state.roster)) : {},
    passports: state.passports ? JSON.parse(JSON.stringify(state.passports)) : {},
    groups: state.groups ? JSON.parse(JSON.stringify(state.groups)) : {},
    submissions: state.submissions ? JSON.parse(JSON.stringify(state.submissions)) : {},
    openAssessments: state.openAssessments ? JSON.parse(JSON.stringify(state.openAssessments)) : {},
    branches: state.branches ? JSON.parse(JSON.stringify(state.branches)) : {},
    groupProducts: state.groupProducts ? JSON.parse(JSON.stringify(state.groupProducts)) : {},
    groupContributions: state.groupContributions
      ? JSON.parse(JSON.stringify(state.groupContributions))
      : {},
    drafts: state.drafts ? JSON.parse(JSON.stringify(state.drafts)) : {},
    reveals: state.reveals ? JSON.parse(JSON.stringify(state.reveals)) : {},
    diceTrack: state.diceTrack ? JSON.parse(JSON.stringify(state.diceTrack)) : {},
    gateTiming: projectGateTiming(state, now, DICE_UNITS_PER_ACTIVITY),
    gateClockActive: gateClockActive(state, now),
    gameWallets: state.gameWallets ? JSON.parse(JSON.stringify(state.gameWallets)) : {},
    package: sanitizedPackage,
    tasks: sanitizedTasks,
    gamePlan: teacherGamePlan(state.gamePlan, state.package)
    ,map: publicMap(state, { showNames: true })
    ,arena: serializeLessonArena(state, null, state.clock?.lastNow, true)
  };
}

/**
 * Sanitizes a task for student consumption.
 *
 * @param {Object} task
 * @param {boolean} isRevealed
 * @param {Array<string>} openedHintIds
 * @param {Array<Object>} allHints
 * @returns {Object}
 */
function sanitizeTaskForStudent(task, isRevealed, openedHintIds = [], allHints = []) {
  const sanitized = {
    id: task.id,
    activityId: task.activityId,
    type: task.type,
    prompt: task.prompt,
    branch: task.branch,
    participation: task.participation,
    inputSchema: sanitizeInputSchema(task.inputSchema)
  };

  if (task.evaluation) {
    sanitized.evaluation = {
      checkerId: task.evaluation.checkerId
    };
    if (task.evaluation.options) {
      sanitized.evaluation.options = [...task.evaluation.options];
    }
    if (task.evaluation.rubric) {
      sanitized.evaluation.rubric = {
        criteria: task.evaluation.rubric.criteria ? [...task.evaluation.rubric.criteria] : []
        // lookFor is deliberately excluded (teacher private)
      };
    }
    if (isRevealed && task.evaluation.answerKey !== undefined) {
      sanitized.evaluation.answerKey = task.evaluation.answerKey;
    }
  }

  // Build advertisedHints for current task using task.hintIds and package hints
  if (Array.isArray(allHints) && allHints.length > 0) {
    const hintIds = Array.isArray(task.hintIds)
      ? task.hintIds
      : Array.isArray(task.supportIds)
      ? task.supportIds
      : allHints.filter((h) => h.taskId === task.id || h.targetTaskId === task.id).map((h) => h.id);

    if (hintIds && hintIds.length > 0) {
      const advertised = [];
      for (const hId of hintIds) {
        const hintObj = allHints.find((h) => h.id === hId);
        if (hintObj) {
          const isOpened = openedHintIds.includes(hintObj.id);
          const item = {
            id: hintObj.id,
            tier: hintObj.tier,
            opened: isOpened
          };
          if (isOpened) {
            item.text = hintObj.text || hintObj.prompt || '';
          }
          advertised.push(item);
        }
      }
      sanitized.advertisedHints = advertised;
    }
  }

  // Only include opened hints belonging to this task
  if (openedHintIds.length > 0 && Array.isArray(allHints)) {
    const taskHints = allHints.filter(
      (h) => h.taskId === task.id || h.targetTaskId === task.id || (task.hintIds && task.hintIds.includes(h.id))
    );
    const opened = taskHints
      .filter((h) => openedHintIds.includes(h.id))
      .map((h) => ({
        id: h.id,
        tier: h.tier,
        text: h.text || h.prompt || '',
        kind: h.kind
      }));
    if (opened.length > 0) {
      sanitized.openedHints = opened;
    }
  }

  return sanitized;
}

function mascotFor(state, learnerId) {
  const chosen = state.roster?.[learnerId]?.mascot;
  if (Number.isInteger(chosen) && chosen >= 0 && chosen < MASCOT_COUNT) return chosen;
  let hash = 2166136261;
  for (const char of String(learnerId)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash % MASCOT_COUNT;
}

/**
 * Pieces for the shared campaign map. Real learner ids never leave the server: each marker gets
 * a position-based public id, and the TV view carries no names at all.
 *
 * @param {Object} state
 * @param {{ ownLearnerId?: string|null, showNames?: boolean }} options
 */
function publicMap(state, { ownLearnerId = null, showNames = false } = {}) {
  const ids = Object.keys(state.roster || {});
  const peers = [];
  ids.forEach((id, index) => {
    const entry = state.roster[id];
    if (!entry || entry.present === false) return;
    const peer = {
      id: 'm' + index,
      mascot: mascotFor(state, id),
      position: Number(state.diceTrack?.[id]?.position) || 0
    };
    // A roster entry without a real name falls back to the learner id; that id must never be shown.
    if (showNames) peer.name = entry.name && entry.name !== id ? String(entry.name) : '';
    if (showNames && !ownLearnerId) peer.chosen = Number.isInteger(entry.mascot) && entry.mascot >= 0 && entry.mascot < MASCOT_COUNT;
    if (ownLearnerId && id === ownLearnerId) {
      peer.own = true;
      peer.chosen = Number.isInteger(entry.mascot) && entry.mascot >= 0 && entry.mascot < MASCOT_COUNT;
    }
    peers.push(peer);
  });
  const activityCount = Math.max(1, state.package?.activities?.length || 1);
  const totalPosition = activityCount * DICE_UNITS_PER_ACTIVITY;
  // A pupil's dice stop at the gate of the activity the class is on; later gates open as the teacher moves on.
  const gatePosition = Math.min(totalPosition, ((state.timeline?.activityIndex || 0) + 1) * DICE_UNITS_PER_ACTIVITY);
  return { totalPosition, gatePosition, unitsPerActivity: DICE_UNITS_PER_ACTIVITY, peers };
}

function publicWallet(wallet) {
  return {
    earned: Number.isFinite(wallet?.earned) ? wallet.earned : 0,
    bonus: Number.isFinite(wallet?.bonus) ? wallet.bonus : 0
  };
}

/**
 * Serializes session state for student view (privacy-safe, own passport and group only).
 *
 * @param {Object} state
 * @param {string} learnerId
 * @returns {Object}
 */
export function serializeForStudent(state, learnerId) {
  if (!state) return null;

  const currentActivity = state.package?.activities?.[state.timeline?.activityIndex] || null;
  const currentActivityId = state.timeline?.currentActivityId || currentActivity?.id;

  const learnerPassport = state.passports?.[learnerId]
    ? JSON.parse(JSON.stringify(state.passports[learnerId]))
    : null;

  const openedHintIds = (learnerPassport?.supportHistory || []).map((h) => h.hintId);

  const learnerBranch = state.branches?.[currentActivityId]?.[learnerId] || 'core';

  // Filter tasks to current activity and learner's branch
  const activityTasks = (state.package?.tasks || []).filter((t) => {
    if (currentActivity && Array.isArray(currentActivity.taskIds) && !currentActivity.taskIds.includes(t.id)) {
      return false;
    }
    if (t.branch && t.branch !== 'shared' && t.branch !== learnerBranch) {
      return false;
    }
    return true;
  });

  const sanitizedTasks = activityTasks.map((task) => {
    const isRevealed = Boolean(state.reveals?.[task.id]?.revealed);
    return sanitizeTaskForStudent(task, isRevealed, openedHintIds, state.package?.hints || []);
  });

  // Find own group in current activity
  let ownGroup = null;
  const activityGroupState = state.groups?.[currentActivityId];
  if (activityGroupState && Array.isArray(activityGroupState.groups)) {
    const found = activityGroupState.groups.find((g) => g.memberIds.includes(learnerId));
    if (found) {
      const groupProducts = {};
      for (const t of activityTasks) {
        const prodKey = `${found.id}:${t.id}`;
        const p = state.groupProducts?.[prodKey];
        if (p) {
          groupProducts[t.id] = {
            taskId: p.taskId,
            answer: p.answer,
            ok: p.ok,
            submittedBy: p.submittedBy,
            at: p.at
          };
        }
      }

      ownGroup = {
        id: found.id,
        memberIds: [...found.memberIds],
        roles: { ...found.roles },
        contributions: (found.contributions || []).map((c) => ({
          learnerId: c.learnerId,
          taskId: c.taskId,
          text: c.text,
          at: c.at
        })),
        products: groupProducts,
        wallet: publicWallet(state.gameWallets?.groups?.[found.id]),
        selectionDeadline: activityGroupState.selectionDeadline
      };
    }
  }

  // Learner's own submissions
  const ownSubmissions = Object.values(state.submissions || {})
    .filter((s) => s.learnerId === learnerId)
    .map((s) => ({
      submissionId: s.submissionId,
      taskId: s.taskId,
      activityId: s.activityId,
      answer: s.answer,
      ok: s.ok,
      assessmentStatus: s.assessmentStatus,
      assisted: s.assisted,
      at: s.at
    }));

  return {
    id: state.id,
    mode: state.mode,
    status: state.status,
    round: state.round,
    revision: state.revision,
    clock: {
      startedAt: state.clock?.startedAt,
      pausedAt: state.clock?.pausedAt,
      activityStartedAt: state.clock?.activityStartedAt,
      activityDeadline: state.clock?.activityDeadline,
      totalPausedMs: state.clock?.totalPausedMs
      ,arenaPausedAt: state.clock?.arenaPausedAt ?? null
    },
    timeline: {
      activityIndex: state.timeline?.activityIndex,
      currentActivityId: state.timeline?.currentActivityId,
      currentPhase: state.timeline?.currentPhase,
      locked: Boolean(state.timeline?.locked)
    },
    currentActivity: currentActivity
      ? {
          id: currentActivity.id,
          phase: currentActivity.phase,
          minutes: currentActivity.minutes,
          participation: currentActivity.participation,
          studentAction: currentActivity.studentAction
        }
      : null,
    tasks: sanitizedTasks,
    passport: learnerPassport,
    passportCard: state.status === 'concluded' && learnerPassport ? buildPassportCard(learnerPassport, state.package) : null,
    submissions: ownSubmissions,
    drafts: state.drafts?.[learnerId] ? JSON.parse(JSON.stringify(state.drafts[learnerId])) : {},
    group: ownGroup,
    branch: learnerBranch,
    wallet: publicWallet(state.gameWallets?.learners?.[learnerId]),
    extension: extensionEligibility({
      activity: currentActivity,
      package: state.package,
      passport: learnerPassport
    }),
    diceTrack: state.diceTrack?.[learnerId] || { position: 0, carry: 0, rolls: 0 },
    map: publicMap(state, { ownLearnerId: learnerId, showNames: true }),
    gamePlan: publicGamePlan(state.gamePlan, state.package)
    ,arena: serializeLessonArena(state, learnerId, state.clock?.lastNow)
  };
}

/**
 * Serializes session state for presenter / TV view (anonymous aggregate, no private data).
 *
 * @param {Object} state
 * @returns {Object}
 */
export function serializeForPresenter(state) {
  if (!state) return null;

  const currentActivity = state.package?.activities?.[state.timeline?.activityIndex] || null;

  const activityTasks = (state.package?.tasks || []).filter((t) => {
    if (currentActivity && Array.isArray(currentActivity.taskIds)) {
      return currentActivity.taskIds.includes(t.id);
    }
    return false;
  });

  const sanitizedTasks = activityTasks.map((task) => {
    const isRevealed = Boolean(state.reveals?.[task.id]?.revealed);
    return sanitizeTaskForStudent(task, isRevealed, [], []);
  });

  return {
    id: state.id,
    mode: state.mode,
    status: state.status,
    round: state.round,
    clock: {
      startedAt: state.clock?.startedAt,
      pausedAt: state.clock?.pausedAt,
      activityStartedAt: state.clock?.activityStartedAt,
      activityDeadline: state.clock?.activityDeadline,
      totalPausedMs: state.clock?.totalPausedMs
      ,arenaPausedAt: state.clock?.arenaPausedAt ?? null
    },
    timeline: {
      activityIndex: state.timeline?.activityIndex,
      currentActivityId: state.timeline?.currentActivityId,
      currentPhase: state.timeline?.currentPhase,
      locked: Boolean(state.timeline?.locked)
    },
    currentActivity: currentActivity
      ? {
          id: currentActivity.id,
          phase: currentActivity.phase,
          minutes: currentActivity.minutes,
          participation: currentActivity.participation,
          studentAction: currentActivity.studentAction
        }
      : null,
    tasks: sanitizedTasks,
    gamePlan: publicGamePlan(state.gamePlan, state.package)
    ,map: publicMap(state, { showNames: false })
    ,arena: serializeLessonArena(state, null, state.clock?.lastNow)
  };
}

export { publicGamePlan, teacherGamePlan };
