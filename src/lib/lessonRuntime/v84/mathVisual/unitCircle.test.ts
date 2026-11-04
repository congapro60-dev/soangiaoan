import { describe, expect, it } from 'vitest';
import { constrainAngle, unitCirclePosition, validateUnitCircleInvariant, extractUnitCircleEvidence } from './unitCircle';

describe('deterministic unit circle', () => {
  it('places cardinal angles on the exact axes', () => {
    expect(unitCirclePosition(0)).toMatchObject({ x: 1, y: 0, quadrant: 'axis' });
    expect(unitCirclePosition(Math.PI / 2)).toMatchObject({ x: 0, y: 1, quadrant: 'axis' });
    expect(unitCirclePosition(Math.PI)).toMatchObject({ x: -1, y: 0, quadrant: 'axis' });
    expect(unitCirclePosition(-Math.PI / 2)).toMatchObject({ x: 0, y: -1, quadrant: 'axis' });
  });

  it('keeps negative and coterminal angles mathematically equivalent', () => {
    const negative = unitCirclePosition(-Math.PI / 6);
    const coterminal = unitCirclePosition(11 * Math.PI / 6);
    expect(negative.x).toBeCloseTo(Math.sqrt(3) / 2, 12);
    expect(negative.y).toBeCloseTo(-0.5, 12);
    expect(negative.quadrant).toBe('IV');
    expect(coterminal.x).toBeCloseTo(negative.x, 12);
    expect(coterminal.y).toBeCloseTo(negative.y, 12);
  });

  it('constrains a drag angle to the declared domain', () => {
    expect(constrainAngle(5 * Math.PI, { min: -2 * Math.PI, max: 2 * Math.PI })).toBe(2 * Math.PI);
    expect(constrainAngle(-5 * Math.PI, { min: -2 * Math.PI, max: 2 * Math.PI })).toBe(-2 * Math.PI);
  });

  it('rejects a distorted circle and extracts only submitted mathematical evidence', () => {
    expect(validateUnitCircleInvariant(unitCirclePosition(Math.PI / 3))).toBe(true);
    expect(validateUnitCircleInvariant({ theta: 0, x: 2, y: 0, quadrant: 'axis' })).toBe(false);
    const evidence = extractUnitCircleEvidence(unitCirclePosition(Math.PI / 3));
    expect(evidence).toMatchObject({ angleRad: Math.PI / 3, quadrant: 'I' });
    expect(evidence.cos).toBeCloseTo(0.5, 12);
    expect(evidence.sin).toBeCloseTo(Math.sqrt(3) / 2, 12);
  });
});
