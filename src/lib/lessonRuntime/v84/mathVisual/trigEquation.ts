import { numberLatex } from './trigNotation';

export type TrigFunction = 'sin' | 'cos' | 'tan' | 'cot';

export interface TrigEquationModel {
  fn: TrigFunction;
  value: number;
  minAngleRad: number;
  maxAngleRad: number;
  includeMin: boolean;
  includeMax: boolean;
}

export interface TrigSolutionFamily { offset: number; period: number; offsetLatex: string }
export interface TrigEquationSolution { roots: number[]; families: TrigSolutionFamily[] }

// Bounded classroom view, not an arbitrary-precision symbolic solver.
export const TRIG_MAX_ANGLE_RAD = 128 * Math.PI;
export const TRIG_MAX_VALUE = 1e6;
const tolerance = (angle: number) => 8 * Number.EPSILON * Math.max(1, Math.abs(angle));

export const trigValue = (fn: TrigFunction, angle: number): number | null => {
  if (!Number.isFinite(angle)) throw new Error('TRIG_ANGLE_INVALID');
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  if (fn === 'sin') return sin;
  if (fn === 'cos') return cos;
  if (fn === 'tan') return Math.abs(cos) <= tolerance(angle) ? null : sin / cos;
  if (fn === 'cot') return Math.abs(sin) <= tolerance(angle) ? null : cos / sin;
  throw new Error('TRIG_FUNCTION_INVALID');
};

export const solveTrigEquation = (model: TrigEquationModel): TrigEquationSolution => {
  const { fn, value, minAngleRad: min, maxAngleRad: max, includeMin, includeMax } = model;
  if (!['sin', 'cos', 'tan', 'cot'].includes(fn)
    || ![value, min, max].every(Number.isFinite) || min > max
    || Math.max(Math.abs(min), Math.abs(max)) > TRIG_MAX_ANGLE_RAD
    || Math.abs(value) > TRIG_MAX_VALUE
    || typeof includeMin !== 'boolean' || typeof includeMax !== 'boolean') throw new Error('TRIG_MODEL_INVALID');
  if ((fn === 'sin' || fn === 'cos') && Math.abs(value) > 1) return { roots: [], families: [] };
  let families: TrigSolutionFamily[];
  const literal = numberLatex(value);
  if (fn === 'sin') {
    const offset = Math.asin(value);
    families = [{ offset, period: 2 * Math.PI, offsetLatex: `\\arcsin(${literal})` }];
    if (Math.abs(value) !== 1) families.push({ offset: Math.PI - offset, period: 2 * Math.PI,
      offsetLatex: `\\pi-\\arcsin(${literal})` });
  } else if (fn === 'cos') {
    const offset = Math.acos(value);
    families = [{ offset, period: 2 * Math.PI, offsetLatex: `\\arccos(${literal})` }];
    if (Math.abs(value) !== 1) families.push({ offset: -offset, period: 2 * Math.PI,
      offsetLatex: `-\\arccos(${literal})` });
  } else {
    families = [{ offset: fn === 'tan' ? Math.atan(value) : Math.atan2(1, value), period: Math.PI,
      offsetLatex: fn === 'tan' ? `\\arctan(${literal})` : `\\frac{\\pi}{2}-\\arctan(${literal})` }];
  }
  const roots: number[] = [];
  for (const { offset, period } of families) {
    for (let k = Math.floor((min - offset) / period) - 1; k <= Math.ceil((max - offset) / period) + 1; k++) {
      let root = offset + k * period;
      // Only absorb floating-point roundoff at a declared interval boundary.
      if (Math.abs(root - min) <= tolerance(min)) root = min;
      if (Math.abs(root - max) <= tolerance(max)) root = max;
      if (root < min || root > max || (root === min && !includeMin) || (root === max && !includeMax)) continue;
      const actual = trigValue(fn, root);
      if (actual === null || Math.abs(actual - value) > 1e-6 * Math.max(1, Math.abs(value))) {
        throw new Error('TRIG_NUMERICAL_VERIFICATION_FAILED');
      }
      if (!roots.some(existing => Math.abs(existing - root) <= tolerance(root))) roots.push(root === 0 ? 0 : root);
    }
  }
  return { roots: roots.sort((left, right) => left - right), families };
};
