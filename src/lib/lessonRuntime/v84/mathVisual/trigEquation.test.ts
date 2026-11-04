import { describe, expect, it } from 'vitest';
import { solveTrigEquation, trigValue, type TrigEquationModel } from './trigEquation';

const model = (fn: TrigEquationModel['fn'], value: number,
  overrides: Partial<TrigEquationModel> = {}): TrigEquationModel => ({
  fn, value, minAngleRad: 0, maxAngleRad: 2 * Math.PI, includeMin: true, includeMax: false, ...overrides,
});

describe('deterministic trig equation model', () => {
  it('enumerates both sine families and verifies roots against the equation', () => {
    const result = solveTrigEquation(model('sin', 0.5));
    expect(result.roots).toHaveLength(2);
    expect(result.roots[0]).toBeCloseTo(Math.PI / 6, 12);
    expect(result.roots[1]).toBeCloseTo(5 * Math.PI / 6, 12);
    expect(result.families).toHaveLength(2);
    for (const root of result.roots) expect(trigValue('sin', root)).toBeCloseTo(0.5, 12);
  });

  it('deduplicates tangent sine/cosine branches without erasing endpoint policy', () => {
    expect(solveTrigEquation(model('sin', 1)).roots).toEqual([Math.PI / 2]);
    expect(solveTrigEquation(model('cos', -1)).roots).toEqual([Math.PI]);
    const closed = solveTrigEquation(model('cos', 1, { includeMax: true }));
    expect(closed.roots).toEqual([0, 2 * Math.PI]);
    expect(solveTrigEquation(model('cos', 1, { includeMin: false })).roots).toEqual([]);
  });

  it('has no real roots for sine or cosine outside [-1, 1]', () => {
    expect(solveTrigEquation(model('sin', 1.01))).toMatchObject({ roots: [], families: [] });
    expect(solveTrigEquation(model('cos', -2))).toMatchObject({ roots: [], families: [] });
  });

  it('uses period pi for tangent and cotangent, never returns poles as zeroes', () => {
    expect(solveTrigEquation(model('tan', 0)).roots).toEqual([0, Math.PI]);
    expect(solveTrigEquation(model('cot', 0)).roots).toEqual([Math.PI / 2, 3 * Math.PI / 2]);
    expect(trigValue('tan', Math.PI / 2)).toBeNull();
    expect(trigValue('cot', 0)).toBeNull();
    for (const fn of ['tan', 'cot'] as const) {
      const result = solveTrigEquation(model(fn, -2, { minAngleRad: -2 * Math.PI }));
      expect(result.families[0].period).toBe(Math.PI);
      expect(result.roots).toHaveLength(4);
      for (const root of result.roots) expect(trigValue(fn, root)).toBeCloseTo(-2, 10);
    }
  });

  it('distinguishes very close roots from the coalesced ±1 case', () => {
    const result = solveTrigEquation(model('sin', 1 - 1e-12));
    expect(result.roots).toHaveLength(2);
    expect(result.roots[1]).toBeGreaterThan(result.roots[0]);
  });

  it('rejects invalid or unbounded domains instead of hanging or silently truncating', () => {
    for (const overrides of [{ value: NaN }, { minAngleRad: 9, maxAngleRad: 1 },
      { maxAngleRad: Infinity }, { maxAngleRad: 10000 }, { includeMin: 'yes' }] as unknown as Partial<TrigEquationModel>[]) {
      expect(() => solveTrigEquation(model('sin', 0, overrides))).toThrow('TRIG_MODEL_INVALID');
    }
  });
});
