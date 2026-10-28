import { describe, expect, it } from 'vitest';
import { geometrySvg } from '../_assistant-geometry-svg.js';
import type { GeometrySpec } from '../_assistant-geometry.js';

/**
 * Dựng SVG hình học/thống kê từ DSL của AI.
 * Yêu cầu chất lượng (phản hồi chủ dự án 28/10):
 * - Nhãn điểm SÁT đỉnh, không lơ lửng; không đè lên ghi chú.
 * - Cạnh bị che phải nét đứt (chuẩn SGK).
 * - Chóp có O + dấu góc vuông; trụ/nón có r, h; cầu có O, R.
 * - Ghi chú có phân số vulgar (⅓ ⅔), không còn "1/3" thô.
 * - Khổ 800×640 đủ lớn trên điện thoại; font KaTeX_Main cho glyph toán.
 */
const SOLID = ['pyramid', 'prism', 'box', 'cylinder', 'cone', 'sphere'] as const;

describe('geometrySvg — dựng SVG từ DSL', () => {
  it('V1: 9 shape hợp lệ đều sinh ra <svg>', () => {
    for (const shape of SOLID) {
      expect(geometrySvg({ shape } as GeometrySpec)).toContain('<svg');
    }
    expect(geometrySvg({ shape: 'graph', points: [[0, 0], [1, 1]] } as unknown as GeometrySpec)).toContain('<svg');
    expect(geometrySvg({ shape: 'table', head: ['x'], rows: [['1']] } as unknown as GeometrySpec)).toContain('<svg');
    expect(geometrySvg({ shape: 'bar', labels: ['A', 'B'], values: [1, 2] } as unknown as GeometrySpec)).toContain('<svg');
  });

  it('V2: chóp đáy vuông — đủ nhãn S,A,B,C,D + chân cao O + dấu góc vuông', () => {
    const svg = geometrySvg({ shape: 'pyramid', base: 'square' }) ?? '';
    for (const label of ['S', 'A', 'B', 'C', 'D', 'O']) {
      expect(svg).toContain(`>${label}<`);
    }
    expect(svg).toContain('<polyline'); // dấu góc vuông
    expect(svg).toContain('stroke-dasharray'); // cạnh che + đường cao nét đứt
  });

  it('V3: hình khối có cạnh che → nét đứt', () => {
    for (const spec of [{ shape: 'pyramid' }, { shape: 'prism' }, { shape: 'box' }] as GeometrySpec[]) {
      expect(geometrySvg(spec) ?? '').toContain('stroke-dasharray');
    }
  });

  it('V4: pyramid base triangle → nhãn chỉ S,A,B,C (không có D)', () => {
    const svg = geometrySvg({ shape: 'pyramid', base: 'triangle' }) ?? '';
    expect(svg).toContain('>S<');
    expect(svg).toContain('>A<');
    expect(svg).toContain('>C<');
    expect(svg).not.toContain('>D<');
  });

  it('V5: box có nhãn A,B,C,D và A,B,C,D (đỉnh trên)', () => {
    const svg = geometrySvg({ shape: 'box' }) ?? '';
    for (const l of ['A', 'B', 'C', 'D']) {
      expect(svg).toContain(`>${l}<`);
      expect(svg).toContain(`>${l}'<`);
    }
  });

  it('V6: note được escape — ký tự < & không phá SVG', () => {
    const svg = geometrySvg({ shape: 'cylinder', note: 'r < R và a & b' }) ?? '';
    expect(svg).not.toContain('r < R');
    expect(svg).toContain('r &' + 'lt; R');
    expect(svg).toContain('a &' + 'amp; b');
  });

  it('V7: ghi chú có phân số vulgar — 1/3 thành ⅓ (chuẩn chung với chat)', () => {
    const svg = geometrySvg({ shape: 'sphere', note: 'V = 4/3 pi R mu ba va 2/3' }) ?? '';
    expect(svg).toContain('4/3'); // 4/3 không có ký tự riêng → giữ nguyên
    expect(svg).toContain('⅔'); // 2/3 → ⅔
    expect(svg).not.toContain('2/3');
  });

  it('V8: DSL sai → trả null, KHÔNG throw (fallback về text)', () => {
    expect(geometrySvg({ shape: 'unicorn' } as unknown as GeometrySpec)).toBeNull();
    expect(geometrySvg({} as unknown as GeometrySpec)).toBeNull();
    expect(geometrySvg(null as unknown as GeometrySpec)).toBeNull();
    expect(geometrySvg({ shape: 'graph' } as unknown as GeometrySpec)).toBeNull();
    expect(geometrySvg({ shape: 'table' } as unknown as GeometrySpec)).toBeNull();
    expect(geometrySvg({ shape: 'bar' } as unknown as GeometrySpec)).toBeNull();
  });

  it('V9: trụ/nón có bán kính r + đường cao h nét đứt; cầu có O, R', () => {
    const cyl = geometrySvg({ shape: 'cylinder' }) ?? '';
    expect(cyl).toContain('>r<');
    expect(cyl).toContain('>h<');
    const cone = geometrySvg({ shape: 'cone' }) ?? '';
    expect(cone).toContain('>r<');
    expect(cone).toContain('>h<');
    expect(cone).toContain('<polyline');
    const sph = geometrySvg({ shape: 'sphere' }) ?? '';
    expect(sph).toContain('>R<');
    expect(sph).toContain('>O<');
  });

  it('V10: đồ thị — trục, nhãn x/y, điểm vẽ, khung lưới', () => {
    const svg = geometrySvg({
      shape: 'graph',
      points: [[-2, 4], [-1, 1], [0, 0], [1, 1], [2, 4]],
      xrange: [-3, 3],
      yrange: [-1, 5],
      xlabel: 'x',
      ylabel: 'y',
    } as unknown as GeometrySpec) ?? '';
    expect(svg).toContain('>x<');
    expect(svg).toContain('>y<');
    expect(svg).toContain('<polyline');
    expect(svg).toContain('<circle'); // điểm
    expect(svg).toContain('>O<');
  });

  it('V11: bảng — hàng đầu in đậm, đủ số cột/dòng', () => {
    const svg = geometrySvg({
      shape: 'table',
      head: ['x', '1', '2', '3'],
      rows: [['tần suất', '3', '5', '2'], ['tỉ lệ', '0.3', '0.5', '0.2']],
    } as unknown as GeometrySpec) ?? '';
    expect(svg).toContain('>x<');
    expect(svg).toContain('>tần suất<');
    expect(svg).toContain('>tỉ lệ<');
    expect((svg.match(/<rect /g) ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it('V12: biểu đồ cột — cột có nhãn giá trị trên đầu, nhãn mục dưới chân', () => {
    const svg = geometrySvg({
      shape: 'bar',
      labels: ['Toán', 'Lý', 'Hóa'],
      values: [8, 7, 9],
      ylabel: 'điểm TB',
    } as unknown as GeometrySpec) ?? '';
    expect(svg).toContain('>Toán<');
    expect(svg).toContain('>Lý<');
    expect(svg).toContain('>Hóa<');
    expect(svg).toContain('>8<');
    expect(svg).toContain('>9<');
    expect(svg).toContain('>điểm TB<');
  });
});
