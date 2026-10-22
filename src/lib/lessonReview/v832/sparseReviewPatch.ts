import type { LessonIRV83 } from '../../lessonCompiler/v832/lessonIRSchema';
import type { LessonIRPatch } from './repairLifecycle';

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const assertSafeKeys = (value: unknown): void => {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error(`PATCH_UNSAFE_KEY:${key}`);
    assertSafeKeys(child);
  }
};

const merge = (original: unknown, change: unknown): unknown => {
  if (!object(original) || !object(change)) return structuredClone(change);
  const result = { ...original };
  for (const [key, value] of Object.entries(change)) result[key] = merge(original[key], value);
  return result;
};

/** Expand sparse activity/question edits before the canonical shallow domain reducer. Arrays replace atomically. */
export const expandSparseReviewPatch = (lesson: LessonIRV83,
  proposal: Pick<LessonIRPatch, 'op' | 'targetId' | 'changes'>): typeof proposal => {
  assertSafeKeys(proposal.changes);
  const target = proposal.op === 'UPDATE_ACTIVITY' ? lesson.timeline.find(activity => activity.id === proposal.targetId)
    : proposal.op === 'UPDATE_QUESTION' && Object.hasOwn(lesson.questions, proposal.targetId) ? lesson.questions[proposal.targetId] : null;
  if (!target) return proposal;
  const original = target as unknown as Record<string, unknown>;
  return { ...proposal, changes: Object.fromEntries(Object.entries(proposal.changes)
    .map(([key, value]) => [key, merge(original[key], value)])) };
};
