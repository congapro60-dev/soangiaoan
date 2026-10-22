import type { LessonIRV83 } from '../../../lessonCompiler/v832/lessonIRSchema';
import { resolveGeometry2D, validateGeometry2DInvariants, type Geometry2DInvariant,
  type Geometry2DModel } from './geometry2d';
import { sequenceRows, validateSequenceInvariants, type SequenceModel } from './sequence';
import { solveTrigEquation, type TrigEquationModel } from './trigEquation';

interface MathVisualBase {
  mathematicalAuthority: 'source_verified' | 'teacher_authored_verified' | 'system_authored_pending_review';
  purpose: { pedagogicalRole: string; learningValue: string; linkedActivityRefs: string[];
    expectedStudentAction?: string; expectedEvidence?: string };
  answerBearingObjectIds: string[];
  taskStateId: string;
  revealStateIds: string[];
  accessibility: { description: string; keyboardAlternative: boolean };
  fallback: { description: string };
  evidenceExtractor?: { fields: string[]; submissionRequired: boolean };
}
export interface UnitCircleVisualContract extends MathVisualBase {
  renderer: 'unit_circle';
  model: { minAngleRad: number; maxAngleRad: number; defaultAngleRad: number; revealAngleRad?: number };
  invariants: string[];
}
export interface Geometry2DVisualContract extends MathVisualBase {
  renderer: 'geometry_2d';
  model: Geometry2DModel;
  invariants: Geometry2DInvariant[];
}
export interface SequenceVisualContract extends MathVisualBase {
  renderer: 'sequence';
  model: SequenceModel;
  invariants: string[];
  formulaObjectId?: string;
}
export interface TrigEquationVisualContract extends MathVisualBase {
  renderer: 'trig_equation';
  mode: 'REVEAL_FORMALIZE';
  model: TrigEquationModel;
  invariants: string[];
}
export type MathVisualContract = UnitCircleVisualContract | Geometry2DVisualContract | SequenceVisualContract | TrigEquationVisualContract;

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

const filled = (value: unknown): value is string => typeof value === 'string' && Boolean(value.trim());
const stringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(filled);
const linePair = (value: unknown): boolean => {
  const lines = record(value);
  const first = record(lines?.first);
  const second = record(lines?.second);
  return Boolean(first && second && filled(first.from) && filled(first.to) && filled(second.from) && filled(second.to));
};
const geometryModel = (value: unknown): value is Geometry2DModel => {
  const model = record(value);
  return Boolean(model && Array.isArray(model.points) && Array.isArray(model.segments)
    && model.points.every((raw: unknown) => {
      const point = record(raw);
      return Boolean(point && filled(point.id)
        && (linePair(point.intersectionOf)
          || (typeof point.x === 'number' && Number.isFinite(point.x)
            && typeof point.y === 'number' && Number.isFinite(point.y))));
    })
    && model.segments.every((raw: unknown) => {
      const segment = record(raw);
      return Boolean(segment && filled(segment.id) && filled(segment.from) && filled(segment.to));
    }));
};
const geometryInvariants = (value: unknown): value is Geometry2DInvariant[] => Array.isArray(value)
  && value.length > 0 && value.every((raw: unknown) => {
    const invariant = record(raw);
    return Boolean(invariant && (invariant.type === 'intersection'
      ? filled(invariant.point) && linePair(invariant.lines)
      : invariant.type === 'collinearity' && Array.isArray(invariant.points)
        && invariant.points.length === 3 && invariant.points.every(filled)));
  });

export const parseMathVisualExtension = (lesson: LessonIRV83): Record<string, MathVisualContract> => {
  const extension = record(record(lesson.extensions)?.mathVisualSimulation);
  if (!extension) return {};
  if (extension.version !== '1.0' || !record(extension.assets)) throw new Error('VISUAL_EXTENSION_VERSION_INVALID');
  const contracts: Record<string, MathVisualContract> = {};
  for (const [visualId, unknownContract] of Object.entries(extension.assets as Record<string, unknown>)) {
    const contract = record(unknownContract);
    const visual = lesson.visuals[visualId];
    if (!visual || !contract || !['unit_circle', 'geometry_2d', 'sequence', 'trig_equation'].includes(String(contract.renderer))) {
      throw new Error(`VISUAL_RENDERER_INVALID:${visualId}`);
    }
    const fallback = record(contract.fallback);
    if (!fallback || !filled(fallback.description)) throw new Error(`VISUAL_FALLBACK_REQUIRED:${visualId}`);
    const accessibility = record(contract.accessibility);
    if (!accessibility || !filled(accessibility.description) || accessibility.keyboardAlternative !== true) {
      throw new Error(`VISUAL_ACCESSIBILITY_REQUIRED:${visualId}`);
    }
    const purpose = record(contract.purpose);
    if (!purpose || !filled(purpose.pedagogicalRole) || !filled(purpose.learningValue)
      || !stringArray(purpose.linkedActivityRefs) || purpose.linkedActivityRefs.length === 0
      || purpose.linkedActivityRefs.some(id => !lesson.timeline.some(activity => activity.id === id))) {
      throw new Error(`VISUAL_PURPOSE_INVALID:${visualId}`);
    }
    if (!['source_verified', 'teacher_authored_verified', 'system_authored_pending_review'].includes(String(contract.mathematicalAuthority))) {
      throw new Error(`VISUAL_MATH_AUTHORITY_INVALID:${visualId}`);
    }
    if (contract.renderer === 'unit_circle') {
      const model = record(contract.model);
      if (!model || ![model.minAngleRad, model.maxAngleRad, model.defaultAngleRad].every(value => typeof value === 'number' && Number.isFinite(value))
        || (model.minAngleRad as number) > (model.maxAngleRad as number)
        || (model.defaultAngleRad as number) < (model.minAngleRad as number)
        || (model.defaultAngleRad as number) > (model.maxAngleRad as number)
        || (model.revealAngleRad !== undefined && (typeof model.revealAngleRad !== 'number'
          || !Number.isFinite(model.revealAngleRad) || model.revealAngleRad < (model.minAngleRad as number)
          || model.revealAngleRad > (model.maxAngleRad as number)))) throw new Error(`VISUAL_MODEL_INVALID:${visualId}`);
      if (!stringArray(contract.invariants) || !contract.invariants.includes('unit_radius_one')
        || !contract.invariants.includes('cardinal_axes')) throw new Error(`VISUAL_INVARIANTS_INVALID:${visualId}`);
    } else if (contract.renderer === 'geometry_2d') {
      if (!geometryModel(contract.model) || !geometryInvariants(contract.invariants)) {
        throw new Error(`VISUAL_MODEL_INVALID:${visualId}`);
      }
      const geometry = resolveGeometry2D(contract.model);
      if (validateGeometry2DInvariants(geometry, contract.invariants).length) {
        throw new Error(`VISUAL_MATH_INVARIANT_FAILED:${visualId}`);
      }
      if ([...Object.keys(geometry.points), ...Object.keys(geometry.segments)].some(id => !visual.objects?.includes(id))) {
        throw new Error(`VISUAL_OBJECT_MODEL_MISMATCH:${visualId}`);
      }
    } else if (contract.renderer === 'trig_equation') {
      if (!record(contract.model) || contract.mode !== 'REVEAL_FORMALIZE') throw new Error(`VISUAL_MODEL_INVALID:${visualId}`);
      try { solveTrigEquation(contract.model as unknown as TrigEquationModel); }
      catch { throw new Error(`VISUAL_MODEL_INVALID:${visualId}`); }
      if (!stringArray(contract.invariants)
        || !['roots_satisfy_equation', 'interval_membership', 'poles_excluded'].every(id => (contract.invariants as string[]).includes(id))) {
        throw new Error(`VISUAL_INVARIANTS_INVALID:${visualId}`);
      }
      if (!stringArray(contract.answerBearingObjectIds)
        || !['solution_points', 'solution_families'].every(id => visual.objects?.includes(id)
          && (contract.answerBearingObjectIds as string[]).includes(id))) throw new Error(`VISUAL_SOLUTION_OBJECT_INVALID:${visualId}`);
    } else {
      const model = record(contract.model);
      if (!model || !['arithmetic', 'geometric'].includes(String(model.family))
        || !stringArray(contract.invariants) || !contract.invariants.includes('recurrence_matches_terms')) {
        throw new Error(`VISUAL_MODEL_INVALID:${visualId}`);
      }
      try {
        sequenceRows(contract.model as SequenceModel);
        if (validateSequenceInvariants(contract.model as SequenceModel).length) {
          throw new Error(`VISUAL_MATH_INVARIANT_FAILED:${visualId}`);
        }
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('VISUAL_MATH_INVARIANT_FAILED')) throw error;
        throw new Error(`VISUAL_MODEL_INVALID:${visualId}`);
      }
      const formulaObjectId = contract.formulaObjectId ?? 'general_formula';
      if (!filled(formulaObjectId) || !visual.objects?.includes(formulaObjectId)
        || !(contract.answerBearingObjectIds as unknown[] | undefined)?.includes(formulaObjectId)) {
        throw new Error(`VISUAL_FORMULA_OBJECT_INVALID:${visualId}`);
      }
    }
    if (!stringArray(contract.answerBearingObjectIds)
      || !stringArray(contract.revealStateIds) || contract.revealStateIds.length === 0) {
      throw new Error(`VISUAL_INVARIANTS_INVALID:${visualId}`);
    }
    const answerBearingObjectIds = contract.answerBearingObjectIds as string[];
    const revealStateIds = contract.revealStateIds as string[];
    const objects = new Set(visual.objects);
    const stateIds = new Set(Object.keys(visual.states));
    if (!filled(contract.taskStateId) || !stateIds.has(contract.taskStateId) || revealStateIds.includes(contract.taskStateId)
      || answerBearingObjectIds.some(id => !objects.has(id))
      || revealStateIds.some(id => !stateIds.has(id))) throw new Error(`VISUAL_STATE_REF_INVALID:${visualId}`);
    for (const [stateId, state] of Object.entries(visual.states)) {
      if (!revealStateIds.includes(stateId)
        && state.visibleObjects.some(id => answerBearingObjectIds.includes(id))) {
        throw new Error(`VISUAL_SPOILER:${visualId}:${stateId}`);
      }
    }
    contracts[visualId] = contract as unknown as MathVisualContract;
  }
  return contracts;
};
