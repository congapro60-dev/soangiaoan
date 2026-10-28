import { describe, expect, it } from 'vitest';
import { bestProjection, scoreProjection } from '../_assistant-geometry-best-view.js';
import { projectSolid } from '../_assistant-geometry-projection.js';
import { SOLIDS } from '../_assistant-geometry-solids.js';

/**
 * Lỗi thật 28/10 (ChatGPT chỉ ra từ ảnh Zalo): với chóp SA⊥đáy, phép chiếu cố định làm
 * S, B, C gần thẳng hàng — d(B,SC) ≈ 0.018, diện tích mặt SBC chỉ 0.49% khung hình.
 * Mặt bên suy biến thành đoạn thẳng.
 *
 * Cách sửa: tự chọn phép chiếu không suy biến thay vì chỉnh tay toạ độ.
 */
type V2 = [number, number];
const triArea = (a: V2, b: V2, c: V2): number =>
  Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;

const faceAreaRatio = (proj: ReturnType<typeof projectSolid>, face: string[]): number => {
  const w = proj.bbox.maxX - proj.bbox.minX || 1;
  const h = proj.bbox.maxY - proj.bbox.minY || 1;
  const p0 = proj.points[face[0]];
  let area = 0;
  for (let i = 1; i + 1 < face.length; i += 1) {
    area += triArea(p0, proj.points[face[i]], proj.points[face[i + 1]]);
  }
  return area / (w * h);
};

describe('tự chọn phép chiếu — chống mặt suy biến', () => {
  it('B1: chóp SA⊥đáy — mặt SBC phải đủ lớn (không suy biến thành đoạn)', () => {
    const solid = SOLIDS.pyramidApexAtA();
    const { proj } = bestProjection(solid);
    // Ngưỡng 3% khung hình: bản cũ chỉ 0.49%.
    expect(faceAreaRatio(proj, ['S', 'B', 'C'])).toBeGreaterThan(0.03);
  });

  it('B2: MỌI mặt bên của mọi khối đều không suy biến', () => {
    const solids = {
      apexA: SOLIDS.pyramidApexAtA(),
      center: SOLIDS.pyramidSquare(),
      triangle: SOLIDS.pyramidTriangle(),
      box: SOLIDS.box(),
    };
    for (const [name, solid] of Object.entries(solids)) {
      const { proj } = bestProjection(solid);
      for (const face of solid.faces) {
        if (face.length < 3) continue;
        const ratio = faceAreaRatio(proj, face);
        expect(ratio, `${name}: mặt ${face.join('')} suy biến (${(ratio * 100).toFixed(2)}%)`)
          .toBeGreaterThan(0.015);
      }
    }
  });

  it('B3: phép chiếu được chọn phải tốt hơn hoặc bằng mọi ứng viên khác', () => {
    const solid = SOLIDS.pyramidApexAtA();
    const best = bestProjection(solid);
    // So với chính các góc nhìn mà bộ chọn dùng (Camera, không phải vector).
    const candidates: Array<{ azimuth: number; elevation: number }> = [
      { azimuth: -70, elevation: 38 },
      { azimuth: -90, elevation: 45 },
      { azimuth: -55, elevation: 40 },
    ];
    for (const camera of candidates) {
      const score = scoreProjection(solid, projectSolid(solid, camera));
      expect(best.score).toBeGreaterThanOrEqual(score);
    }
  });

  it('B4: chóp SA⊥đáy — B không được nằm sát cạnh SC (lỗi cũ: 0.018)', () => {
    const { proj } = bestProjection(SOLIDS.pyramidApexAtA());
    const distToSeg = (q: V2, a: V2, b: V2): number => {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len2 = dx * dx + dy * dy;
      const t = len2 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / len2)) : 0;
      return Math.hypot(q[0] - (a[0] + t * dx), q[1] - (a[1] + t * dy));
    };
    const w = proj.bbox.maxX - proj.bbox.minX || 1;
    const h = proj.bbox.maxY - proj.bbox.minY || 1;
    const d = distToSeg(proj.points.B, proj.points.S, proj.points.C) / Math.hypot(w, h);
    expect(d).toBeGreaterThan(0.03);
  });
});
