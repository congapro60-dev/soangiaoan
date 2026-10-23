import { describe, expect, it } from 'vitest';
import { resolveGeometry2D, validateGeometry2DInvariants } from './geometry2d';

describe('semantic deterministic 2D geometry', () => {
  const model = {
    points: [
      { id: 'A', x: 0, y: 0 }, { id: 'B', x: 4, y: 0 },
      { id: 'C', x: 0, y: 4 }, { id: 'M', x: 2, y: 0 },
      { id: 'F', x: 2, y: 8 }, { id: 'D', x: 0, y: 8 },
      { id: 'R', intersectionOf: { first: { from: 'M', to: 'F' }, second: { from: 'B', to: 'D' } } },
    ],
    segments: [{ id: 'AB', from: 'A', to: 'B' }, { id: 'MF', from: 'M', to: 'F' },
      { id: 'BD', from: 'B', to: 'D' }],
  };

  it('derives an intersection from mathematical lines instead of screen pixels', () => {
    const resolved = resolveGeometry2D(model);
    expect(resolved.points.R).toEqual({ x: 2, y: 4 });
    expect(resolved.segments.MF).toEqual({ from: { x: 2, y: 0 }, to: { x: 2, y: 8 } });
    expect(validateGeometry2DInvariants(resolved, [
      { type: 'intersection', point: 'R', lines: { first: { from: 'M', to: 'F' }, second: { from: 'B', to: 'D' } } },
      { type: 'collinearity', points: ['A', 'M', 'B'] },
    ])).toEqual([]);
  });

  it('rejects undefined parallel intersections without NaN coordinates', () => {
    const parallel = { points: [
      { id: 'A', x: 0, y: 0 }, { id: 'B', x: 1, y: 0 },
      { id: 'C', x: 0, y: 1 }, { id: 'D', x: 1, y: 1 },
      { id: 'R', intersectionOf: { first: { from: 'A', to: 'B' }, second: { from: 'C', to: 'D' } } },
    ], segments: [] };
    expect(() => resolveGeometry2D(parallel)).toThrow('GEOMETRY_PARALLEL_INTERSECTION:R');
  });

  it('fails an asserted incidence that is not mathematically true', () => {
    const resolved = resolveGeometry2D(model);
    expect(validateGeometry2DInvariants(resolved, [{ type: 'collinearity', points: ['A', 'C', 'B'] }]))
      .toEqual(['COLLINEARITY_FAILED:A,C,B']);
  });
});
