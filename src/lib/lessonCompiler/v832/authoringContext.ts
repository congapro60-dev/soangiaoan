import type { MathVisualContract } from '../../lessonRuntime/v84/mathVisual/extension';
import type { Geometry2DModel } from '../../lessonRuntime/v84/mathVisual/geometry2d';
import type { SequenceModel } from '../../lessonRuntime/v84/mathVisual/sequence';
import type { TrigEquationModel } from '../../lessonRuntime/v84/mathVisual/trigEquation';

export interface AuthoringContextFragment {
  activityId: string;
  visualId: string;
  contract: MathVisualContract;
  notes: string[];
}

export interface AuthoringContext {
  version: '1.0';
  status: 'examples_only_pending_review';
  assets: string[];
  fragments: AuthoringContextFragment[];
  timing: {
    version: '1.0';
    activityBudgets: Record<string, {
      introSec: number;
      closeSec: number;
      questions: Record<string, { statsSec: number; revealDebriefSec: number; transitionSec: number }>;
    }>;
    rules: string[];
  };
  instructions: string[];
}

const base = (activityId: string, answerBearingObjectIds: string[], taskStateId: string,
  revealStateIds: string[]): Pick<MathVisualContract, 'mathematicalAuthority' | 'purpose' | 'answerBearingObjectIds' | 'taskStateId' | 'revealStateIds' | 'accessibility' | 'fallback'> => ({
  mathematicalAuthority: 'system_authored_pending_review',
  purpose: { pedagogicalRole: 'shape demonstration', learningValue: 'adapt only after source review', linkedActivityRefs: [activityId], expectedStudentAction: 'inspect and explain', expectedEvidence: 'teacher-reviewed response' },
  answerBearingObjectIds, taskStateId, revealStateIds,
  accessibility: { description: 'Generic mathematical visual example', keyboardAlternative: true },
  fallback: { description: 'Text and teacher-led explanation' },
});

const geometryModel: Geometry2DModel = {
  points: [{ id: 'point_a', x: 0, y: 0 }, { id: 'point_b', x: 2, y: 2 }, { id: 'point_c', x: 0, y: 2 },
    { id: 'point_d', x: 2, y: 0 }, { id: 'intersection_x', intersectionOf: { first: { from: 'point_a', to: 'point_b' }, second: { from: 'point_c', to: 'point_d' } } }],
  segments: [{ id: 'segment_ab', from: 'point_a', to: 'point_b' }, { id: 'segment_cd', from: 'point_c', to: 'point_d' }],
};

export const buildAuthoringContext = (): AuthoringContext => ({
  version: '1.0', status: 'examples_only_pending_review', assets: ['unit_circle', 'geometry_2d', 'sequence', 'trig_equation'],
  fragments: [
    { activityId: 'synthetic_activity_unit_circle', visualId: 'synthetic_visual_unit_circle', contract: { ...base('synthetic_activity_unit_circle', ['angle_answer'], 'task', ['reveal']), renderer: 'unit_circle', model: { minAngleRad: 0, maxAngleRad: Math.PI * 2, defaultAngleRad: 0 }, invariants: ['unit_radius_one', 'cardinal_axes'] }, notes: ['bounded radians', 'projections remain protected until reveal'] },
    { activityId: 'synthetic_activity_geometry_2d', visualId: 'synthetic_visual_geometry_2d', contract: { ...base('synthetic_activity_geometry_2d', ['intersection_answer'], 'task', ['reveal']), renderer: 'geometry_2d', model: geometryModel, invariants: [{ type: 'intersection', point: 'intersection_x', lines: { first: { from: 'point_a', to: 'point_b' }, second: { from: 'point_c', to: 'point_d' } } }] }, notes: ['semantic points and segments', 'derived intersection is reveal-only'] },
    { activityId: 'synthetic_activity_sequence', visualId: 'synthetic_visual_sequence', contract: { ...base('synthetic_activity_sequence', ['general_formula'], 'task', ['reveal']), renderer: 'sequence', model: { family: 'arithmetic', firstIndex: 1, firstTerm: 3, difference: 2, count: 4 } as SequenceModel, invariants: ['recurrence_matches_terms'], formulaObjectId: 'general_formula' }, notes: ['generic terms 3,5,7,9', 'no source attribution'] },
    { activityId: 'synthetic_activity_trig_equation', visualId: 'synthetic_visual_trig_equation', contract: { ...base('synthetic_activity_trig_equation', ['solution_points', 'solution_families'], 'task', ['reveal']), renderer: 'trig_equation', mode: 'REVEAL_FORMALIZE', model: { fn: 'sin', value: 0, minAngleRad: 0, maxAngleRad: Math.PI * 2, includeMin: true, includeMax: true } as TrigEquationModel, invariants: ['roots_satisfy_equation', 'interval_membership', 'poles_excluded'] }, notes: ['solver-valid generic example', 'solutions appear only in reveal state'] },
  ],
  timing: { version: '1.0', activityBudgets: { synthetic_activity_sequence: { introSec: 30, closeSec: 30, questions: { synthetic_instance_sequence: { statsSec: 15, revealDebriefSec: 30, transitionSec: 15 } } } }, rules: ['question work comes from estimatedWorkTimeSec', 'protect recheck, Exit, reflection and closing', 'validate against the existing activity budget contract'] },
  instructions: ['Examples demonstrate shapes only; compose with reviewed source IDs.', 'Use planning_assumption/unknown for learner evidence; never invent observations.', 'Keep mathematical authority pending review and retain a reviewable gap when models are insufficient.', 'Do not copy synthetic IDs, terms or examples into authored content.'],
});

export const AUTHORING_CONTEXT = buildAuthoringContext();
