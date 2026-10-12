import { createHash } from 'node:crypto';
import { CHECKER_REGISTRY, hashPackage } from './schema.js';
import { recordTaskSubmission, extensionEligibility } from './passport.js';
import { practiceVariants, practiceEvidencePackage } from './practice-variants.js';
export { practiceVariants } from './practice-variants.js';

export function assessPracticeSubmission(state, { submissionId, criteriaMet, feedback, nonMastery }, actor, now) {
  const fail = code => ({ ok: false, code });
  const sub = state.submissions[submissionId], record = state.openAssessments[submissionId];
  if (sub?.source !== 'practice' || !record?.practiceTask || typeof criteriaMet !== 'boolean') return fail('INVALID_ASSESSMENT');
  const task = record.practiceTask;
  const variant = practiceVariants(state.package, sub.activityId, task.branch === 'shared' || !task.branch ? 'core' : task.branch)
    .find(candidate => candidate.variantId === sub.variantId && hashPackage(candidate.task) === sub.taskHash);
  if (!variant || task.type !== 'open' || sub.packageHash !== state.package.contentHash || hashPackage(task) !== sub.taskHash) return fail('STALE_PRACTICE');
  if (sub.assessmentStatus === 'assessed') {
    if (sub.ok !== criteriaMet || (record.feedback || '') !== (feedback || '') || Boolean(record.nonMastery) !== Boolean(nonMastery)) return fail('PRACTICE_ALREADY_ASSESSED');
    return { ok: true, result: { correct: sub.ok, preserved: true } };
  }
  if (sub.assessmentStatus !== 'pending' || record.status !== 'pending') return fail('INVALID_ASSESSMENT');
  sub.ok = criteriaMet; sub.assessmentStatus = 'assessed'; sub.assisted ||= nonMastery === true;
  Object.assign(record, { status: 'assessed', criteriaMet, feedback, nonMastery, assessedAt: now, assessedBy: actor.id });
  const taskId = 'variant:' + sub.variantId, evidencePackage = practiceEvidencePackage(state.package);
  const evidenceIds = evidencePackage.evidenceRules.filter(rule => rule.taskId === taskId).map(rule => rule.id);
  state.passports[sub.learnerId] = recordTaskSubmission(state.passports[sub.learnerId], { ...sub, taskId, evidenceIds, now }, state.package);
  const practice = state.practice?.[sub.learnerId];
  if (practice?.submission?.submissionId === submissionId) Object.assign(practice, { assessed: true, correct: criteriaMet, submission: structuredClone(sub) });
  return { ok: true, result: { correct: criteriaMet } };
}

export function reducePractice(state, event, actor, now) {
  const fail = code => ({ state, result: { ok: false, code } });
  const next = structuredClone(state);
  if (event.type === 'SET_REVISIT') {
    if (typeof event.payload.enabled !== 'boolean') return fail('INVALID_EVENT');
    next.revisitEnabled = event.payload.enabled;
  } else {
    if (state.revisitEnabled === false) return fail('REVISIT_DISABLED');
    if (['waiting', 'paused'].includes(state.status) || state.status !== 'concluded' && (state.timeline.locked || state.clock.arenaPausedAt != null || state.clock.classEventPausedAt != null || state.clock.activityDeadline != null && now >= state.clock.activityDeadline)) return fail('REVISIT_LOCKED');
    next.practice ||= {};
    if (event.type === 'REVISIT') {
      const index = state.package.activities.findIndex(activity => activity.id === event.payload.activityId);
      if (index < 0 || (state.status !== 'concluded' && index >= state.timeline.activityIndex)) return fail('REVISIT_LOCKED');
      const branch = event.payload.branch || state.branches?.[event.payload.activityId]?.[actor.id] || 'core';
      if (!['support', 'core', 'extension'].includes(branch)) return fail('INVALID_EVENT');
      // The caller still needs the original independent recheck before practicing extension content.
      if (branch === 'extension' && !extensionEligibility({activity:state.package.activities[index],package:state.package,passport:state.passports[actor.id]}).eligible) return fail('BRANCH_LOCKED');
      const variants = practiceVariants(state.package, event.payload.activityId, branch);
      if (!variants.length) return fail('PRACTICE_VARIANTS_REQUIRED');
      const prior = state.practice?.[actor.id];
      if (prior?.submission?.assessmentStatus === 'pending') return fail('PRACTICE_ASSESSMENT_PENDING');
      if (prior && now - prior.at < 10000) return fail('PRACTICE_WAIT');
      const attempt = (prior?.attempt || 0) + 1;
      const seed = createHash('sha256').update(state.id + ':' + actor.id + ':' + event.payload.activityId).digest().readUInt32BE(0);
      const variant = variants[(seed + attempt - 1) % variants.length];
      next.practice[actor.id] = { ...variant, packageHash: state.package.contentHash, taskHash: hashPackage(variant.task), attemptId: 'practice-' + state.revision + '-' + actor.id, activityId: event.payload.activityId, attempt, at: now, assessed: false };
    } else if (event.type === 'REVISIT_HINT') {
      const practice = next.practice[actor.id];
      if (!practice || practice.assessed) return fail('PRACTICE_REQUIRED');
      if (event.payload.attemptId !== practice.attemptId) return fail('STALE_PRACTICE');
      const hints = state.package.hints.filter(hint => practice.task.hintIds.includes(hint.id));
      const index = hints.findIndex(hint => hint.id === event.payload.hintId);
      practice.openedHints ||= [];
      if (index < 0 || (index > 0 && !practice.openedHints.includes(hints[index - 1].id))) return fail('INVALID_HINT');
      if (!practice.openedHints.includes(hints[index].id)) practice.openedHints.push(hints[index].id);
    } else if (event.type === 'REVISIT_SUBMIT') {
      if(event.payload.confirmed !== undefined && typeof event.payload.confirmed !== 'boolean' || event.payload.usedAI !== undefined && typeof event.payload.usedAI !== 'boolean')return fail('INVALID_EVENT');
      const practice = next.practice[actor.id];
      if (!practice) return fail('PRACTICE_REQUIRED');
      if (event.payload.attemptId !== practice.attemptId) return fail('STALE_PRACTICE');
      if (practice.assessed) return fail('PRACTICE_ALREADY_ASSESSED');
      if (practice.submission?.assessmentStatus === 'pending') return fail('PRACTICE_ASSESSMENT_PENDING');
      const validated = practiceVariants(state.package, practice.activityId, practice.task.branch === 'shared' || !practice.task.branch ? 'core' : practice.task.branch)
        .find(candidate => candidate.variantId === practice.variantId && hashPackage(candidate.task) === practice.taskHash);
      if (!validated || practice.packageHash !== state.package.contentHash || practice.taskHash !== hashPackage(practice.task)) return fail('STALE_PRACTICE');
      const pending = practice.task.type === 'open', checker = CHECKER_REGISTRY[practice.task.evaluation?.checkerId];
      if (!pending && !checker) return fail('INVALID_TASK');
      const correct = pending ? null : checker(event.payload.answer, practice.task)?.ok === true;
      const submissionId = 'practice-' + state.round + '-' + (state.revision + 1) + '-' + actor.id;
      const submission = { submissionId, source: 'practice', learnerId: actor.id, taskId: practice.task.id, activityId: practice.activityId, variantId: practice.variantId, packageHash: practice.packageHash, taskHash: practice.taskHash, answer: event.payload.answer, ok: correct, assessmentStatus: pending ? 'pending' : 'assessed', assisted: Boolean(practice.openedHints?.length || event.payload.confirmed !== true || event.payload.usedAI !== false), at: now };
      next.submissions[submissionId] = submission;
      if (pending) {
        next.openAssessments ||= {};
        next.openAssessments[submissionId] = { ...submission, status: 'pending', createdAt: now, practiceTask: structuredClone(practice.task), attemptId: practice.attemptId };
      }
      const evidencePackage = practiceEvidencePackage(state.package), taskId = 'variant:' + practice.variantId;
      const evidenceIds = evidencePackage.evidenceRules.filter(rule => rule.taskId === taskId).map(rule => rule.id);
      next.passports[actor.id] = recordTaskSubmission(next.passports[actor.id], { ...submission, taskId, evidenceIds, now }, state.package);
      Object.assign(practice, { assessed: !pending, correct, submission });
      next.revision++;
      next.clock.lastNow = now;
      return { state: next, result: { ok: true, submissionId, ...(pending ? { pending: true } : { correct }), type: event.type, revision: next.revision } };
    }
  }
  next.revision++;
  next.clock.lastNow = now;
  return { state: next, result: { ok: true, type: event.type, revision: next.revision } };
}
