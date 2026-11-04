import { describe, expect, it, vi } from 'vitest';
import { clampScale } from './MathFigureZoom';

vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  return { ...actual, useRef: (v: unknown) => ({ current: v }), useState: (v: unknown) => [v, () => {}], useEffect: () => {} };
});

describe('MathFigureZoom — ASS-MDP-01 × Math Diagram Standard (zoom/fallback)', () => {
  it('clampScale: giữ trong [1, 4]', () => {
    expect(clampScale(1)).toBe(1);
    expect(clampScale(2.5)).toBe(2.5);
    expect(clampScale(0.2)).toBe(1);
    expect(clampScale(9)).toBe(4);
    expect(clampScale(NaN)).toBe(1);
    expect(clampScale(Infinity)).toBe(1);
  });
});
