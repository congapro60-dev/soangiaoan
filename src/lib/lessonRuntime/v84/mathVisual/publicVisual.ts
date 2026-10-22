import type { LessonIRV83 } from '../../../lessonCompiler/v832/lessonIRSchema.js';
import { parseMathVisualExtension } from './extension.js';
import { resolveGeometry2D, type Point2D } from './geometry2d.js';
import { sequenceRows, type SequenceRow } from './sequence.js';
import { solveTrigEquation, type TrigEquationModel, type TrigSolutionFamily } from './trigEquation.js';

export interface PublicUnitCircleVisual {
  visualId: string;
  renderer: 'unit_circle';
  stateId: string;
  visibleObjects: string[];
  model: { minAngleRad: number; maxAngleRad: number; defaultAngleRad: number };
  description: string;
}
export interface PublicGeometry2DVisual {
  visualId: string;
  renderer: 'geometry_2d';
  stateId: string;
  visibleObjects: string[];
  points: Record<string, Point2D>;
  segments: Record<string, { from: Point2D; to: Point2D }>;
  description: string;
}
export interface PublicSequenceVisual {
  visualId: string;
  renderer: 'sequence';
  stateId: string;
  visibleObjects: string[];
  rows: SequenceRow[];
  formula?: string;
  description: string;
}
export interface PublicTrigEquationVisual {
  visualId: string;
  renderer: 'trig_equation';
  stateId: string;
  visibleObjects: string[];
  model: TrigEquationModel;
  roots?: number[];
  families?: TrigSolutionFamily[];
  description: string;
}
export type PublicMathVisual = PublicUnitCircleVisual | PublicGeometry2DVisual | PublicSequenceVisual | PublicTrigEquationVisual;

export const projectMathVisuals = (lesson: LessonIRV83, visualIds: readonly string[], stateId: string | null,
  questionPhase?: string): PublicMathVisual[] => {
  const contracts = parseMathVisualExtension(lesson);
  return [...new Set(visualIds)].flatMap<PublicMathVisual>(visualId => {
    const contract = contracts[visualId];
    if (!contract) return [];
    const visual = lesson.visuals[visualId];
    const requestedStateId = questionPhase === 'REVEAL' ? contract.revealStateIds[0]
      : questionPhase ? contract.taskStateId : stateId;
    const selectedStateId = requestedStateId && visual.states[requestedStateId] ? requestedStateId : visual.defaultStateId;
    const state = visual.states[selectedStateId];
    if (!state) throw new Error(`VISUAL_STATE_NOT_FOUND:${visualId}:${selectedStateId}`);
    const visibleObjects = state.visibleObjects.filter(id => !state.hiddenObjects?.includes(id));
    if (!contract.revealStateIds.includes(selectedStateId)
      && visibleObjects.some(id => contract.answerBearingObjectIds.includes(id))) {
      throw new Error(`VISUAL_SPOILER:${visualId}:${selectedStateId}`);
    }
    if (contract.renderer === 'geometry_2d') {
      const geometry = resolveGeometry2D(contract.model);
      const pointIds = new Set(Object.keys(geometry.points));
      const visibleSet = new Set(visibleObjects);
      const points = Object.fromEntries(Object.entries(geometry.points).filter(([id]) => visibleSet.has(id)));
      const segments = Object.fromEntries(Object.entries(geometry.segments).filter(([id]) => visibleSet.has(id)));
      for (const segment of contract.model.segments) {
        if (visibleSet.has(segment.id) && (!visibleSet.has(segment.from) || !visibleSet.has(segment.to)
          || !pointIds.has(segment.from) || !pointIds.has(segment.to))) {
          throw new Error(`VISUAL_SEGMENT_ENDPOINT_HIDDEN:${visualId}:${segment.id}`);
        }
      }
      return [{ visualId, renderer: 'geometry_2d' as const, stateId: selectedStateId,
        visibleObjects, points, segments, description: contract.accessibility.description }];
    }
    if (contract.renderer === 'trig_equation') {
      const { fn, value, minAngleRad, maxAngleRad, includeMin, includeMax } = contract.model;
      const solution = solveTrigEquation(contract.model);
      const revealed = contract.revealStateIds.includes(selectedStateId) && (!questionPhase || questionPhase === 'REVEAL');
      return [{ visualId, renderer: 'trig_equation' as const, stateId: selectedStateId, visibleObjects,
        model: { fn, value, minAngleRad, maxAngleRad, includeMin, includeMax },
        ...(revealed && visibleObjects.includes('solution_points') ? { roots: solution.roots } : {}),
        ...(revealed && visibleObjects.includes('solution_families') ? { families: solution.families } : {}),
        description: contract.accessibility.description }];
    }
    if (contract.renderer === 'sequence') {
      const model = contract.model;
      const formulaObjectId = contract.formulaObjectId ?? 'general_formula';
      const formula = model.family === 'arithmetic'
        ? `u_n = ${model.firstTerm} + ${model.difference}(n - ${model.firstIndex})`
        : `u_n = ${model.firstTerm} · ${model.ratio}^(n - ${model.firstIndex})`;
      return [{ visualId, renderer: 'sequence' as const, stateId: selectedStateId,
        visibleObjects, rows: sequenceRows(model),
        ...(visibleObjects.includes(formulaObjectId) && (!questionPhase || questionPhase === 'REVEAL') ? { formula } : {}),
        description: contract.accessibility.description }];
    }
    return [{ visualId, renderer: contract.renderer, stateId: selectedStateId, visibleObjects,
      model: { minAngleRad: contract.model.minAngleRad, maxAngleRad: contract.model.maxAngleRad,
        defaultAngleRad: questionPhase === 'REVEAL' && contract.model.revealAngleRad !== undefined
          ? contract.model.revealAngleRad : contract.model.defaultAngleRad },
      description: contract.accessibility.description }];
  });
};
