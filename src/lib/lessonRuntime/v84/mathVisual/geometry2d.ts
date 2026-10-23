export interface Point2D { x: number; y: number }
export interface LineRef2D { from: string; to: string }
export interface LinePair2D { first: LineRef2D; second: LineRef2D }
export type PointDefinition = { id: string; x: number; y: number }
  | { id: string; intersectionOf: LinePair2D };
export interface Geometry2DModel {
  points: PointDefinition[];
  segments: Array<{ id: string; from: string; to: string }>;
}
export interface ResolvedGeometry2D {
  points: Record<string, Point2D>;
  segments: Record<string, { from: Point2D; to: Point2D }>;
}
export type Geometry2DInvariant =
  | { type: 'intersection'; point: string; lines: LinePair2D }
  | { type: 'collinearity'; points: [string, string, string] };

const intersection = (startOne: Point2D, endOne: Point2D, startTwo: Point2D, endTwo: Point2D): Point2D | null => {
  const directionOne = { x: endOne.x - startOne.x, y: endOne.y - startOne.y };
  const directionTwo = { x: endTwo.x - startTwo.x, y: endTwo.y - startTwo.y };
  const determinant = directionOne.x * directionTwo.y - directionOne.y * directionTwo.x;
  if (Math.hypot(directionOne.x, directionOne.y) < 1e-12 || Math.hypot(directionTwo.x, directionTwo.y) < 1e-12
    || Math.abs(determinant) < 1e-10) return null;
  const offset = { x: startTwo.x - startOne.x, y: startTwo.y - startOne.y };
  const multiplier = (offset.x * directionTwo.y - offset.y * directionTwo.x) / determinant;
  return { x: startOne.x + multiplier * directionOne.x, y: startOne.y + multiplier * directionOne.y };
};

export const resolveGeometry2D = (model: Geometry2DModel): ResolvedGeometry2D => {
  const definitions = new Map(model.points.map(point => [point.id, point]));
  if (definitions.size !== model.points.length || model.points.some(point => !point.id)) throw new Error('GEOMETRY_POINT_ID_INVALID');
  const points: Record<string, Point2D> = {};
  const pending = new Set<string>();
  const resolvePoint = (id: string): Point2D => {
    if (points[id]) return points[id];
    const definition = definitions.get(id);
    if (!definition) throw new Error(`GEOMETRY_POINT_NOT_FOUND:${id}`);
    if (pending.has(id)) throw new Error(`GEOMETRY_CYCLIC_DEFINITION:${id}`);
    pending.add(id);
    let point: Point2D;
    if ('intersectionOf' in definition) {
      const { first, second } = definition.intersectionOf;
      const derived = intersection(resolvePoint(first.from), resolvePoint(first.to), resolvePoint(second.from), resolvePoint(second.to));
      if (!derived) throw new Error(`GEOMETRY_PARALLEL_INTERSECTION:${id}`);
      point = derived;
    } else {
      if (!Number.isFinite(definition.x) || !Number.isFinite(definition.y)) throw new Error(`GEOMETRY_POINT_INVALID:${id}`);
      point = { x: definition.x, y: definition.y };
    }
    pending.delete(id);
    points[id] = point;
    return point;
  };
  for (const point of model.points) resolvePoint(point.id);
  const segments: ResolvedGeometry2D['segments'] = {};
  for (const segment of model.segments) {
    if (!segment.id || segments[segment.id]) throw new Error(`GEOMETRY_SEGMENT_ID_INVALID:${segment.id}`);
    segments[segment.id] = { from: resolvePoint(segment.from), to: resolvePoint(segment.to) };
  }
  return { points, segments };
};

export const validateGeometry2DInvariants = (geometry: ResolvedGeometry2D, invariants: readonly Geometry2DInvariant[]): string[] => {
  const issues: string[] = [];
  for (const invariant of invariants) {
    if (invariant.type === 'collinearity') {
      const [first, middle, last] = invariant.points.map(id => geometry.points[id]);
      if (!first || !middle || !last || Math.abs((middle.x - first.x) * (last.y - first.y)
        - (middle.y - first.y) * (last.x - first.x)) > 1e-9) {
        issues.push(`COLLINEARITY_FAILED:${invariant.points.join(',')}`);
      }
    } else {
      const target = geometry.points[invariant.point];
      const { first: firstLine, second: secondLine } = invariant.lines;
      const first = geometry.points[firstLine.from];
      const second = geometry.points[firstLine.to];
      const third = geometry.points[secondLine.from];
      const fourth = geometry.points[secondLine.to];
      const actual = first && second && third && fourth ? intersection(first, second, third, fourth) : null;
      if (!target || !actual || Math.hypot(target.x - actual.x, target.y - actual.y) > 1e-9) {
        issues.push(`INTERSECTION_FAILED:${invariant.point}`);
      }
    }
  }
  return issues;
};
