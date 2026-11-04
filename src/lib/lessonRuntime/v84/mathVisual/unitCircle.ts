export interface UnitCirclePosition {
  theta: number;
  x: number;
  y: number;
  quadrant: 'I' | 'II' | 'III' | 'IV' | 'axis';
}

const exactAxis = (value: number): number => Math.abs(value) < 1e-12 ? 0
  : Math.abs(value - 1) < 1e-12 ? 1 : Math.abs(value + 1) < 1e-12 ? -1 : value;

export const unitCirclePosition = (theta: number): UnitCirclePosition => {
  if (!Number.isFinite(theta)) throw new Error('ANGLE_INVALID');
  const x = exactAxis(Math.cos(theta));
  const y = exactAxis(Math.sin(theta));
  const quadrant = x === 0 || y === 0 ? 'axis'
    : x > 0 && y > 0 ? 'I' : x < 0 && y > 0 ? 'II' : x < 0 && y < 0 ? 'III' : 'IV';
  return { theta, x, y, quadrant };
};

export const constrainAngle = (theta: number, domain: { min: number; max: number }): number => {
  if (![theta, domain.min, domain.max].every(Number.isFinite) || domain.min > domain.max) throw new Error('ANGLE_DOMAIN_INVALID');
  return Math.max(domain.min, Math.min(domain.max, theta));
};

export const validateUnitCircleInvariant = (position: UnitCirclePosition): boolean =>
  [position.theta, position.x, position.y].every(Number.isFinite)
  && Math.abs(position.x * position.x + position.y * position.y - 1) < 1e-10
  && Math.abs(position.x - Math.cos(position.theta)) < 1e-10
  && Math.abs(position.y - Math.sin(position.theta)) < 1e-10;

export const extractUnitCircleEvidence = (position: UnitCirclePosition): {
  angleRad: number; cos: number; sin: number; quadrant: UnitCirclePosition['quadrant'];
} => {
  if (!validateUnitCircleInvariant(position)) throw new Error('UNIT_CIRCLE_INVARIANT_FAILED');
  return { angleRad: position.theta, cos: position.x, sin: position.y, quadrant: position.quadrant };
};
