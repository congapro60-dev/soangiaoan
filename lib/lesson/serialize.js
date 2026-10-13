import {explorationView} from './exploration.js';
/**
 * Serialization allowlists for teacher, student, and presenter views.
 */

import { classEventActiveNow, extensionEligibility, DICE_UNITS_PER_ACTIVITY, MASCOT_COUNT, BRANCH_SWITCH_LIMIT } from './runtime.js';
import { serializeLessonMode } from './mode-bridge.js';
import { classEventView } from './class-events.js';
import { storyCue } from './story-cues.js';
import { practiceVariants } from './revisit.js';
import { serializeLessonArena } from './arena-bridge.js';
import { gateClockActive, projectGateTiming } from './gate-history.js';
import { groupDraftConsent } from './group-policy.js';
import { buildLessonQualityReport } from './values.js';
import { buildPassportCard } from './passport.js';
import { studentTutorView } from './tutor.js';
import { WORLD_LABELS, DEVICE_LABELS } from './teacher-setup.js';

function sessionWorld(state) {
  const selected=state.teacherSetup?.worldTheme;
  return typeof selected==='string'&&Object.hasOwn(WORLD_LABELS,selected)?selected:state.gamePlan?.theme;
}
function sessionDevice(state) {
  const selected=state.teacherSetup?.deviceMode;
  return typeof selected==='string'&&Object.hasOwn(DEVICE_LABELS,selected)?selected:undefined;
}

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
  for (const key of ['items', 'categories']) if (Array.isArray(inputSchema[key])) clean[key] = inputSchema[key].map(item => ({ id: String(item.id), label: String(item.label) }));
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
    worldTheme: sessionWorld(state),
    deviceMode: sessionDevice(state),
    storyCue: storyCue({ theme: sessionWorld(state), phase: state.package?.activities?.[state.timeline?.activityIndex]?.phase, concluded: state.status === "concluded" }),
    id: state.id,
    classEvent: classEventView(state.classEvent, null, classEventActiveNow(state, now), {teacher:true}),
    ...(state.teacherSetup ? {teacherSetup:structuredClone(state.teacherSetup)} : {}),
    exploration: explorationView(state, null, now, true),
    qualityReport: buildLessonQualityReport(state, { role: "teacher", id: state.hostId }),
    tutors: structuredClone(state.tutors || {needs:{},history:[]}),
    aiPolicy: state.aiPolicy || 'off',
    lessonIntegrations: [...(state.lessonIntegrations || [])],
    revisitEnabled: state.revisitEnabled !== false,
    valueBadges: structuredClone(state.valueBadges || {}),
    valueReflections: structuredClone(state.valueReflections || {}),
    lessonMode: serializeLessonMode(state),
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
function revisitGates(state, learnerId) {
  return (state.package?.activities || []).flatMap((activity,index)=>{
    if(state.status!=='concluded' && index>=state.timeline.activityIndex)return [];
    const branches=['support','core','extension'].filter(branch=>practiceVariants(state.package,activity.id,branch).some(variant=>variant.task.branch===branch || branch==='core' && (!variant.task.branch || variant.task.branch==='shared')) && (branch!=='extension' || extensionEligibility({activity,package:state.package,passport:state.passports?.[learnerId]}).eligible));
    return branches.length?[{id:activity.id,title:activity.studentAction,number:index+1,branches}]:[];
  });
}

function publicMap(state, { ownLearnerId = null, showNames = false } = {}) {
  const ids = Object.keys(state.roster || {});
  const peers = [];
  const activityCount = Math.max(1, state.package?.activities?.length || 1);
  const totalPosition = activityCount * DICE_UNITS_PER_ACTIVITY;
  const gatePosition = Math.min(totalPosition, ((state.timeline?.activityIndex || 0) + 1) * DICE_UNITS_PER_ACTIVITY);
  const teamMap = ['group','pairs'].includes(state.lessonMode?.participation) && (ownLearnerId || !showNames);
  let memberCount = 0, ownTeamMemberCount;
  if (teamMap) {
    const currentGroups = state.groups?.[state.timeline?.currentActivityId]?.groups || [];
    state.lessonMode.units.forEach((unit, index) => {
      const members = unit.members.filter(member => state.roster?.[member.id]?.present === true);
      if (!members.length) return;
      memberCount += members.length;
      const controller = members.find(member => member.id === unit.members[unit.controller]?.id) || members[0];
      const matchingGroup = currentGroups.find(group => group.memberIds?.length === unit.members.length && unit.members.every(member => group.memberIds.includes(member.id)));
      const groupPosition = matchingGroup ? state.groupDice?.[matchingGroup.id]?.position : undefined;
      const position = Number.isFinite(groupPosition) ? groupPosition : Math.min(...members.map(member => Number(state.diceTrack?.[member.id]?.position) || 0));
      const own = ownLearnerId && members.some(member => member.id === ownLearnerId);
      const chosen = state.roster[controller.id].mascot;
      peers.push({ id: 'm' + index, name: `${state.lessonMode.participation === 'pairs' ? 'Cặp' : 'Đội'} ${index + 1}`, mascot: mascotFor(state, controller.id),
        position: Math.max(0, Math.min(gatePosition, position)), memberCount: members.length,
        ...(own ? { own: true, chosen: Number.isInteger(chosen) && chosen >= 0 && chosen < MASCOT_COUNT } : {}) });
      if (own) ownTeamMemberCount = members.length;
    });
  } else ids.forEach((id, index) => {
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
  // A pupil's dice stop at the gate of the activity the class is on; later gates open as the teacher moves on.
  const activity=state.package?.activities?.[state.timeline?.activityIndex],ownBranch=state.branches?.[activity?.id]?.[ownLearnerId]||'core';
  const laneTasks=(state.package?.tasks||[]).filter(task=>task.activityId===activity?.id&&task.participation==='individual'&&['support','core','extension'].includes(task.branch));
  const laneChoices=ownLearnerId&&!teamMap&&laneTasks.length?['support','core','extension'].filter(branch=>laneTasks.some(task=>task.branch===branch)&&(branch!=='extension'||extensionEligibility({activity,package:state.package,passport:state.passports?.[ownLearnerId]}).eligible)):null;
  const laneOpen=state.status==='active'&&!state.timeline?.locked&&state.clock?.arenaPausedAt==null&&state.clock?.classEventPausedAt==null&&(state.clock?.activityDeadline==null||(state.clock.lastNow||0)<state.clock.activityDeadline)&&levelProgress(state,ownLearnerId,ownBranch).branchSwitchesLeft>0;
  return { totalPosition, gatePosition, unitsPerActivity: DICE_UNITS_PER_ACTIVITY, peers,
    ...(laneChoices?{ownBranch,availableBranches:laneOpen?laneChoices:[]}:{}),
    ...(teamMap ? { unitCount: peers.length, memberCount, ...(ownTeamMemberCount ? { ownTeamMemberCount } : {}) } : {}),
    ...(ownLearnerId ? { activityIds: (state.package?.activities || []).map(activity => activity.id), gateStars: levelProgress(state, ownLearnerId, state.branches?.[state.timeline?.currentActivityId]?.[ownLearnerId] || "core").gateStars, revisitEnabled: state.revisitEnabled !== false, revisitGates: revisitGates(state,ownLearnerId) } : {}) };
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
// Stars per gate (plan 19.4): best own correct answer per activity, support 1 / core or shared 2 / extension 3,
// +1 when no hint or revealed answer was used. Game points only: never part of the passport.
const LEVEL = { support: 1, core: 2, shared: 2, extension: 3 };
function levelProgress(state, learnerId, branch) {
  const tasks = new Map((state.package?.tasks || []).map((task) => [task.id, task]));
  const passport = state.passports?.[learnerId];
  const helped = (taskId) => Boolean(passport?.supportHistory?.some((hint) => hint.taskId === taskId) || passport?.revealedTasks?.[taskId]);
  const own = Object.values(state.submissions || {}).filter((sub) => sub.learnerId === learnerId && sub.assessmentStatus === 'assessed')
    .sort((a, b) => (a.at || 0) - (b.at || 0));
  const gateStars = (state.package?.activities || []).map((activity) => {
    let stars = 0;
    for (const sub of own) {
      if (sub.activityId !== activity.id || sub.ok !== true || !tasks.has(sub.taskId)) continue;
      const clean = !sub.assisted && !helped(sub.taskId);
      stars = Math.max(stars, (LEVEL[tasks.get(sub.taskId).branch || 'shared'] || 2) + (clean ? 1 : 0));
    }
    return { activityId: activity.id, stars };
  });
  const activityId = state.timeline?.currentActivityId;
  const recent = own.filter((sub) => sub.activityId === activityId).slice(-2);
  const higher = branch === 'support' ? 'core' : null;
  const levelInvite = Boolean(higher && recent.length === 2 && recent.every((sub) => sub.ok === true && !sub.assisted && !helped(sub.taskId)));
  const used = state.branchSwitches?.[activityId]?.[learnerId] || 0;
  return { gateStars, levelInvite, branchSwitchesLeft: Math.max(0, BRANCH_SWITCH_LIMIT - used) };
}

export function serializeForStudent(state, learnerId, now = state.clock?.lastNow) {
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
      const policy = { phase: found.phase, roleDefinitions: found.roleDefinitions, subgroups: found.subgroups, needsSupport: found.needsSupport, proposal: found.proposal ? structuredClone(found.proposal) : null, consent: found.proposal ? groupDraftConsent(found, found.proposal.hash, state.roster) : null, dice: state.groupDice?.[found.id] };
      const groupProducts = {};
      for (const t of activityTasks) {
        const prodKey = `${found.id}:${t.id}`;
        const p = state.groupProducts?.[prodKey];
        if (p) {
          groupProducts[t.id] = {
            taskId: p.taskId,
            answer: p.answer,
            ok: p.ok,
            assessmentStatus: p.assessmentStatus,
            feedback: p.assessment?.feedback,
            proposalVersion: p.proposalVersion,
            submittedBy: p.submittedBy,
            at: p.at
          };
        }
      }

      ownGroup = {
        ...policy,
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
      ,classEventPausedAt: state.clock?.classEventPausedAt ?? null
    },
    timeline: {
      activityIndex: state.timeline?.activityIndex,
      currentActivityId: state.timeline?.currentActivityId,
      currentPhase: state.timeline?.currentPhase,
      locked: Boolean(state.timeline?.locked)
    },
    currentActivity: state.status !== 'waiting' && currentActivity
      ? {
          id: currentActivity.id,
          phase: currentActivity.phase,
          minutes: currentActivity.minutes,
          participation: currentActivity.participation,
          studentAction: currentActivity.studentAction
        }
      : null,
    tasks: state.status === 'waiting' ? [] : sanitizedTasks,
    exploration: explorationView(state, learnerId, now),
    practice: state.status !== 'waiting' && state.practice?.[learnerId] ? { activityId: state.practice[learnerId].activityId, attemptId: state.practice[learnerId].attemptId, attempt: state.practice[learnerId].attempt, assessed: state.practice[learnerId].assessed, correct: state.practice[learnerId].correct, task: sanitizeTaskForStudent(state.practice[learnerId].task, false, state.practice[learnerId].openedHints || [], []), submission: state.practice[learnerId].submission } : null,
    revisitEnabled: state.revisitEnabled !== false,
    revisitGates: revisitGates(state,learnerId),
    worldTheme: sessionWorld(state),
    deviceMode: sessionDevice(state),
    storyCue: storyCue({ theme: sessionWorld(state), phase: currentActivity?.phase, concluded: state.status === "concluded", complete: Boolean(state.passports?.[learnerId] && buildPassportCard(state.passports[learnerId],state.package).objectives.every(objective=>objective.status==='independent')) }),
    valueBadges: structuredClone(state.valueBadges?.[learnerId] || []),
    valueReflection: structuredClone(state.valueReflections?.[learnerId] || null),
    aiPolicy: state.aiPolicy || "off",
    integrityConfirmed: state.integrity?.[learnerId]?.activityId === currentActivityId,
    lessonIntegrations: state.lessonIntegrations || [],
    lessonMode: serializeLessonMode(state, learnerId),
    lessonModeError: state.lessonModeErrors?.[learnerId] || null,
    classEvent: classEventView(state.classEvent, state.classEvent?.participants?.[learnerId] ? learnerId : null, classEventActiveNow(state, now)),
    learnerId,
    tutor: studentTutorView(state, learnerId),
    passport: learnerPassport,
    learnerName: state.roster?.[learnerId]?.name && state.roster[learnerId].name !== learnerId ? state.roster[learnerId].name : 'Em',
    passportCard: state.status === 'concluded' && learnerPassport ? buildPassportCard(learnerPassport, state.package) : null,
    ...levelProgress(state, learnerId, learnerBranch),
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
    map: {...publicMap(state, { ownLearnerId: learnerId, showNames: true }), discoveryPoints: explorationView(state, learnerId, now).points},
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
export function serializeForPresenter(state, now = state.clock?.lastNow) {
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
      ,classEventPausedAt: state.clock?.classEventPausedAt ?? null
    },
    timeline: {
      activityIndex: state.timeline?.activityIndex,
      currentActivityId: state.timeline?.currentActivityId,
      currentPhase: state.timeline?.currentPhase,
      locked: Boolean(state.timeline?.locked)
    },
    currentActivity: state.status !== 'waiting' && currentActivity
      ? {
          id: currentActivity.id,
          phase: currentActivity.phase,
          minutes: currentActivity.minutes,
          participation: currentActivity.participation,
          studentAction: currentActivity.studentAction
        }
      : null,
    tasks: state.status === 'waiting' ? [] : sanitizedTasks,
    classEvent: classEventView(state.classEvent, null, classEventActiveNow(state,now), {presenter:true}),
    lessonMode: serializeLessonMode(state),
    gamePlan: publicGamePlan(state.gamePlan, state.package)
    ,worldTheme: sessionWorld(state)
    ,deviceMode: sessionDevice(state)
    ,map: publicMap(state, { showNames: false })
    ,arena: serializeLessonArena(state, null, state.clock?.lastNow)
  };
}

export { publicGamePlan, teacherGamePlan };
