import { describe, expect, it } from 'vitest';
import { SOLIDS } from '../_assistant-geometry-solids.js';
import { geometrySvg } from '../_assistant-geometry-svg.js';

/**
 * Bộ kiểm thử P0 rút từ MATH DIAGRAM STANDARD THCS–THPT v1.0 (docs/MATH_DIAGRAM_STANDARD_THCS_THPT_V1_0.md),
 * mục 21.1 — CHỈ các mã ứng với shape bot hỗ trợ. Quy chuẩn 29/10 (chủ dự án gửi tài liệu chuẩn).
 */

const v3 = (p: [number, number, number] | number[]): [number, number, number] => [p[0], p[1], p[2]];

describe('MATH DIAGRAM STANDARD v1.0 — P0 (mục 21.1)', () => {
  it('M09: hình chóp S.ABC — S KHÔNG thuộc mặt phẳng đáy (S nằm ngoài z=0)', () => {
    const s = SOLIDS.pyramidTriangle();
    const base = s.faces.find(f => f.length === 3 && !f.includes('S'));
    expect(base).toBeDefined();
    // Toàn bộ đáy nằm trong z=0, S nằm ngoài → S không thuộc (ABC).
    for (const n of base!) expect(s.vertices[n][2]).toBe(0);
    expect(s.vertices.S[2]).not.toBe(0);
  });

  it('M10: chóp đều — chân đường cao là TÂM đáy (không phải trọng tâm lệch/sai)', () => {
    const s = SOLIDS.pyramidSquare();
    const base = ['A', 'B', 'C', 'D'] as const;
    const cx = base.reduce((a, n) => a + s.vertices[n][0], 0) / 4;
    const cy = base.reduce((a, n) => a + s.vertices[n][1], 0) / 4;
    const apex: [number, number, number] = v3(s.vertices.S);
    // Đỉnh S chiếu vuông góc xuống đúng tâm đáy (cùng x,y).
    expect(apex[0]).toBeCloseTo(cx, 6);
    expect(apex[1]).toBeCloseTo(cy, 6);
    expect(apex[2]).toBeGreaterThan(0);
  });

  it('M11: lăng trụ/hộp — cạnh bên SONG SONG và BẰNG NHAU, A\' tương ứng A (không nối chéo)', () => {
    const s = SOLIDS.box();
    const pairs: Array<['A' | 'B' | 'C' | 'D', string]> = [['A', "A'"], ['B', "B'"], ['C', "C'"], ['D', "D'"]];
    const vectors = pairs.map(([a, ap]) => {
      const p = s.vertices[a], q = s.vertices[ap];
      return [q[0] - p[0], q[1] - p[1], q[2] - p[2]] as [number, number, number];
    });
    for (const vec of vectors) {
      expect(vec[0]).toBeCloseTo(vectors[0][0], 6);
      expect(vec[1]).toBeCloseTo(vectors[0][1], 6);
      expect(vec[2]).toBeCloseTo(vectors[0][2], 6);
    }
    // Cạnh bên phải là cạnh của khối (nối đúng cặp tương ứng).
    for (const [a, ap] of pairs) {
      expect(s.edges.some(([x, y]) => (x === a && y === ap) || (x === ap && y === a))).toBe(true);
    }
  });

  it('M30: biểu đồ cột — trục bắt đầu từ 0, chiều cao cột TỈ LỆ THUẬN giá trị', () => {
    const svg = geometrySvg({ shape: 'bar', labels: ['A', 'B'], values: [1, 3] });
    expect(svg).toBeTruthy();
    // Lấy chiều cao (height) từng <rect> cột: giá trị 1 và 3 → tỉ lệ 1:3.
    const heights = [...(svg as string).matchAll(/height="([\d.]+)"/g)].map(m => Number(m[1]));
    // Bỏ rect nền (cao bằng toàn khung): chỉ giữ các rect nhỏ hơn khung.
    const bars = heights.filter(h => h < 500);
    expect(bars.length).toBe(2);
    const [h1, h3] = bars.sort((a, b) => a - b);
    expect(h3 / h1).toBeCloseTo(3, 1);
  });

  it('§17.1 — bảng màu chuẩn: nét chính #1F2937, nét khuất #6B7280 kèm nét đứt, lưới #E5E7EB', () => {
    const solidSvg = geometrySvg({ shape: 'pyramid', base: 'square', apexAt: 'center' }) as string;
    expect(solidSvg).toContain('#1F2937');
    // Nét khuất: màu xám + dasharray (phân biệt nhờ CẢ màu và nét đứt — không chỉ màu).
    const hidden = solidSvg.match(/<line[^/]*stroke-dasharray[^/]*\/>/g) ?? [];
    expect(hidden.length).toBeGreaterThan(0);
    for (const h of hidden) expect(h).toContain('#6B7280');
    const graphSvg = geometrySvg({ shape: 'graph', points: [[0, 0], [1, 1]], xrange: [-2, 2], yrange: [-2, 2] }) as string;
    expect(graphSvg).toContain('#E5E7EB');
  });

  it('§16.1 — ký hiệu tên hình: hộp dùng A\'…D\' (dấu phẩy trên) đúng hệ thống', () => {
    const svg = geometrySvg({ shape: 'box' }) as string;
    for (const name of ["A'", "B'", "C'", "D'"]) expect(svg).toContain(`>${name}<`);
  });
});
