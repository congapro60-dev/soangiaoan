import type { UnitCircleVisualContract } from './extension.js';
import type { UnitCirclePosition } from './unitCircle.js';
import { extractUnitCircleEvidence, unitCirclePosition } from './unitCircle.js';

export interface UnitCircleEvidence {
  angleRad: number;
  cos: number;
  sin: number;
  quadrant: UnitCirclePosition['quadrant'];
  explanation: string;
}

export const normalizeUnitCircleSubmission = (contract: UnitCircleVisualContract, value: string): UnitCircleEvidence => {
  let raw: unknown;
  try { raw = JSON.parse(value); } catch { throw new Error('SIMULATION_SUBMISSION_INVALID'); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('SIMULATION_SUBMISSION_INVALID');
  const input = raw as Record<string, unknown>;
  if (typeof input.angleRad !== 'number' || !Number.isFinite(input.angleRad)) throw new Error('SIMULATION_ANGLE_INVALID');
  if (input.angleRad < contract.model.minAngleRad || input.angleRad > contract.model.maxAngleRad) {
    throw new Error('SIMULATION_ANGLE_OUT_OF_DOMAIN');
  }
  if (input.explanation !== undefined && (typeof input.explanation !== 'string' || input.explanation.length > 1000)) {
    throw new Error('SIMULATION_EXPLANATION_INVALID');
  }
  return { ...extractUnitCircleEvidence(unitCirclePosition(input.angleRad)),
    explanation: typeof input.explanation === 'string' ? input.explanation.trim() : '' };
};
