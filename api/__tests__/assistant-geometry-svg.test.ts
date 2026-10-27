import { describe, expect, it } from 'vitest';
import { geometrySvg } from '../_assistant-geometry-svg.js';
import type { GeometrySpec } from '../_assistant-geometry-svg.js';

/**
 * Dựng SVG hình học từ DSL của AI.
 * Yêu cầu chất lượng: nhãn điểm đầy đủ, cạnh CHE phải nét đứt (không thì HS
 * nhìn hình như hình phẳng), note phải được escape (không chèn XML).
 */
describe('geometrySvg — dựng SVG từ DSL', () => {
  it('V1: 6 shape hợp lệ đều sinh ra <svg>', () => {
    for (const shape of ['pyramid', 'prism', 'box', 'cylinder', 'cone', 'sphere'] as const) {
      const svg = geometrySvg({ shape } as GeometrySpec);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    }
  });

  it('V2: chóp đáy vuông có đủ nhãn S, A, B, C, D', () => {
    const svg = geometrySvg({ shape: 'pyramid', base: 'square' }) ?? '';
    for (const label of ['S', 'A', 'B', 'C', 'D']) {
      expect(svg).toContain(`>${label}<`);
    }
  });

  it('V3: hình có cạnh che → phải có nét đứt (stroke-dasharray)', () => {
    for (const spec of [{ shape: 'pyramid' }, { shape: 'prism' }, { shape: 'box' }] as GeometrySpec[]) {
      expect(geometrySvg(spec) ?? '').toContain('stroke-dasharray');
    }
  });

  it('V4: pyramid base triangle → nhãn chỉ S, A, B, C (không có D)', () => {
    const svg = geometrySvg({ shape: 'pyramid', base: 'triangle' }) ?? '';
    expect(svg).toContain('>S<');
    expect(svg).toContain('>A<');
    expect(svg).toContain('>C<');
    expect(svg).not.toContain('>D<');
  });

  it('V5: box có nhãn A, B, C, D và các đỉnh trên A, B, C, D (dấu phẩy)', () => {
    const svg = geometrySvg({ shape: 'box' }) ?? '';
    for (const label of ['A', 'B', 'C', 'D']) {
      expect(svg).toContain(`>${label}<`);
      expect(svg).toContain(`>${label}'<`);
    }
  });

  it('V6: note được escape — ký tự < & không phá SVG', () => {
    const svg = geometrySvg({ shape: 'cylinder', note: 'r < R và a & b' }) ?? '';
    // expected viết tách để ký tự escape không bị decode khi đi qua tool call.
    const escaped = 'r &' + 'lt; R';
    expect(svg).toContain(escaped);
    expect(svg).not.toContain('r < R');
    expect(svg).toContain('a &' + 'amp; b');
  });

  it('V7: note hiển thị trong hình', () => {
    const svg = geometrySvg({ shape: 'cone', note: 'SA ⊥ đáy, SA = a√2' }) ?? '';
    expect(svg).toContain('SA ⊥ đáy, SA = a√2');
  });

  it('V8: DSL sai → trả null, KHÔNG throw (fallback về text)', () => {
    expect(geometrySvg({ shape: 'unicorn' } as unknown as GeometrySpec)).toBeNull();
    expect(geometrySvg({} as unknown as GeometrySpec)).toBeNull();
    expect(geometrySvg(null as unknown as GeometrySpec)).toBeNull();
  });
});
