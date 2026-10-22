import type { LessonIRV83 } from '../../lessonCompiler/v832/lessonIRSchema';
import type { IssueClassification } from './repairLifecycle';

export interface ReviewFieldChange { path: string; before: unknown; after: unknown }
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const segment = (value: string) => value.replace(/~/g, '~0').replace(/\//g, '~1');
const derivedPaths = new Set(['/lesson/lessonVersion', '/provenance/contentHash',
  '/qualityAudit', '/buildStatus', '/generatedArtifacts']);

/** Authored changes only; array entities use stable IDs when both sides name the same entity. */
export const diffReviewCandidate = (before: LessonIRV83, after: LessonIRV83): ReviewFieldChange[] => {
  const changes: ReviewFieldChange[] = [];
  const visit = (left: unknown, right: unknown, path: string) => {
    if (derivedPaths.has(path) || Object.is(left, right)) return;
    if (Array.isArray(left) && Array.isArray(right) && left.length === right.length) {
      left.forEach((value, index) => {
        const next = right[index];
        const key = object(value) && object(next) && typeof value.id === 'string' && value.id === next.id
          ? value.id : String(index);
        visit(value, next, `${path}/${segment(key)}`);
      });
    } else if (object(left) && object(right)) {
      for (const key of [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()) {
        visit(left[key], right[key], `${path}/${segment(key)}`);
      }
    } else changes.push({ path, before: left ?? null, after: right ?? null });
  };
  visit(before, after, '');
  return changes;
};

export const inspectClassifiedChanges = (changes: readonly ReviewFieldChange[], classification: IssueClassification): string[] => {
  const issues: string[] = [];
  const categories = new Set([classification.primary, ...classification.secondary]);
  const declared = classification.affectedPaths.map(path => `/${path.replace(/^\/+|\/+$/g, '')}`);
  if (!changes.length) issues.push('PATCH_NO_AUTHORED_CHANGE');
  for (const change of changes) {
    if (!declared.some(path => path === change.path || change.path.startsWith(`${path}/`))) {
      issues.push(`PATCH_OUTSIDE_DECLARED_PATH:${change.path}`);
    }
    // UI diffs may replace an array/object atomically. Check changed descendants too,
    // otherwise a broad affectedPaths declaration could hide a protected field.
    const paths: string[] = [];
    const inspect = (before: unknown, after: unknown, path: string) => {
      if (JSON.stringify(before) === JSON.stringify(after)) return;
      paths.push(path);
      if (Array.isArray(before) || Array.isArray(after)) {
        const left = Array.isArray(before) ? before : [];
        const right = Array.isArray(after) ? after : [];
        for (let index = 0; index < Math.max(left.length, right.length); index++) {
          inspect(left[index], right[index], `${path}/${index}`);
        }
      } else if (object(before) || object(after)) {
        const left = object(before) ? before : {};
        const right = object(after) ? after : {};
        for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
          inspect(left[key], right[key], `${path}/${segment(key)}`);
        }
      }
    };
    inspect(change.before, change.after, change.path);
    if (paths.some(path => /(?:^|\/)(?:privacy|mustNotShow)(?:\/|$)/.test(path))) issues.push('PATCH_REQUIRES_SECURITY_REVIEW');
    if (paths.some(path => /(?:^|\/)(?:durationSec|estimatedWorkTimeSec|handoffOverheadSec|surfaceSwitchCostSec|timingPolicy)(?:\/|$)/.test(path))
      && !categories.has('TIMING_IR')) issues.push('PATCH_REQUIRES_TIMING_SCOPE');
    if (paths.some(path => /(?:^|\/)(?:correctAnswer|rubric|workedSolution|correctAnswerOrRubric)(?:\/|$)/.test(path))
      && !categories.has('QUESTION_IR') && !categories.has('REVEAL_IR')) issues.push('PATCH_REQUIRES_QUESTION_SCOPE');
    if (paths.some(path => /(?:^|\/)(?:objectiveRefs|successCriteriaRefs|learningIntention|successCriteria)(?:\/|$)/.test(path))
      && !categories.has('SUCCESS_CRITERIA_IR') && !categories.has('PEDAGOGY_IR')) issues.push('PATCH_REQUIRES_LEARNING_GOAL_SCOPE');
  }
  return [...new Set(issues)];
};

export const inspectReviewScope = (lesson: LessonIRV83, activityId: string, scope: string,
  changes: readonly ReviewFieldChange[]): string[] => {
  if (scope === 'runtime') return ['PATCH_RUNTIME_SCOPE_REQUIRES_ENGINE'];
  if (scope === 'lesson') return [];
  const activity = lesson.timeline.find(item => item.id === activityId);
  if (!activity) return ['REVIEW_ACTIVITY_NOT_FOUND'];
  const allowed = [`/timeline/${segment(activity.id)}`,
    ...(activity.questionInstances ?? []).map(item => `/questions/${segment(item.questionId)}`),
    ...[...(activity.presenter.visualRefs ?? []), ...(activity.student.visualRefs ?? [])]
      .map(id => `/visuals/${segment(id)}`),
    ...(activity.formativeCycleRefs ?? []).map(id => `/formativeDecisionCycles/${segment(id)}`)];
  return changes.filter(change => !allowed.some(prefix => change.path === prefix || change.path.startsWith(`${prefix}/`)))
    .map(change => `PATCH_OUTSIDE_REVIEW_SCOPE:${change.path}`);
};
