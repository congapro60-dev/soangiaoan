import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Geometry2DVisual, MathVisualView } from './MathVisualView';
import type { PublicGeometry2DVisual } from '../../../lib/lessonRuntime/v84/mathVisual/publicVisual';

const visual: PublicGeometry2DVisual = {
  visualId: 'figure', renderer: 'geometry_2d', stateId: 'initial',
  visibleObjects: ['A', 'B', 'M', 'F', 'MF'], description: 'Hình có giao điểm chưa tiết lộ',
  points: { A: { x: 0, y: 0 }, B: { x: 4, y: 0 }, M: { x: 2, y: 0 }, F: { x: 2, y: 4 } },
  segments: { MF: { from: { x: 2, y: 0 }, to: { x: 2, y: 4 } } },
};

describe('2D geometry renderer', () => {
  it('renders only the public visible object IDs', () => {
    const before = renderToStaticMarkup(createElement(Geometry2DVisual, { visual }));
    expect(before).toContain('Hình có giao điểm chưa tiết lộ');
    expect(before).toContain('>M</text>');
    expect(before).not.toContain('>R</text>');
    const after = renderToStaticMarkup(createElement(Geometry2DVisual, {
      visual: { ...visual, stateId: 'reveal', visibleObjects: [...visual.visibleObjects, 'R'],
        points: { ...visual.points, R: { x: 2, y: 4 } } },
    }));
    expect(after).toContain('>R</text>');
  });
});

describe('sequence representation renderer', () => {
  it('shows the same index-term data before and after a teacher-controlled formula reveal', () => {
    const rows = [{ index: 1, value: 18 }, { index: 2, value: 20 }, { index: 3, value: 22 }];
    const initial = { visualId: 'sequence', renderer: 'sequence' as const, stateId: 'initial',
      visibleObjects: ['rows', 'points'], rows, description: 'Dãy ghế' };
    const before = renderToStaticMarkup(createElement(MathVisualView, { visual: initial }));
    expect(before).toContain('>18<');
    expect(before).not.toContain('u_n');
    const after = renderToStaticMarkup(createElement(MathVisualView, { visual: {
      ...initial, stateId: 'reveal', visibleObjects: [...initial.visibleObjects, 'general_formula'],
      formula: 'u_n = 18 + 2(n - 1)',
    } }));
    expect(after).toContain('katex');
  });
});
