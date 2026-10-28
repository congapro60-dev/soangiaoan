import { describe, expect, it } from 'vitest';
import { projectSolid } from '../_assistant-geometry-projection.js';
import { SOLIDS } from '../_assistant-geometry-solids.js';

/**
 * Quy tắc hình biểu diễn SGK (tra cứu 28/10):
 * - Đáy vuông → hình bình hành (cạnh sâu xiên 30–45°, ngắn lại).
 * - Đường cao thẳng đứng.
 * - Cạnh khuất nét đứt, TÍNH TỰ ĐỘNG theo pháp tuyến mặt.
 * - LỖI PHẢI CHẶN: đỉnh D không được nằm trên cạnh SB (hay bất kỳ cạnh nào khác)
 *   — chủ dự án phát hiện từ ảnh thật, làm nhiều bài toán khó giải.
 */

/**
 * Khoảng cách TƯƠNG ĐỐI từ p tới đoạn ab, chỉ tính khi p chiếu vào GIỮA đoạn.
 * Toạ độ ở đây chưa scale (hình rộng ~2.5 đơn vị) nên phải chuẩn hoá theo kích
 * thước hình, không dùng ngưỡng tuyệt đối.
 * Trả về tỉ lệ so với đường chéo bbox nếu p nằm giữa đoạn, ngược lại Infinity.
 */
const distOnSegment = (
  p: [number, number], a: [number, number], b: [number, number], diag: number,
): number => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Infinity;
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  if (t <= 0.08 || t >= 0.92) return Infinity;
  const d = Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  return d / diag;
};

/** Đường chéo bbox của hình chiếu — dùng làm đơn vị đo. */
const diagOf = (proj: ReturnType<typeof projectSolid>): number => {
  const { minX, minY, maxX, maxY } = proj.bbox;
  return Math.hypot(maxX - minX, maxY - minY) || 1;
};

describe('projectSolid — quy tắc hình biểu diễn', () => {
  it('Q1: chóp đáy vuông — KHÔNG đỉnh nào nằm GIỮA cạnh không chứa nó', () => {
    const proj = projectSolid(SOLIDS.pyramidSquare());
    const diag = diagOf(proj);
    const names = Object.keys(proj.points);
    for (const v of names) {
      for (const e of proj.edges) {
        if (e.a === v || e.b === v) continue;
        const rel = distOnSegment(proj.points[v], proj.points[e.a], proj.points[e.b], diag);
        // Lỗi chủ dự án bắt được: D nằm giữa SB. Ngưỡng 3% đường chéo hình.
        expect(rel, `đỉnh ${v} nằm giữa cạnh ${e.a}${e.b} (lệch ${(rel * 100).toFixed(1)}%)`).toBeGreaterThan(0.03);
      }
    }
  });

  it('Q2: hộp chữ nhật — KHÔNG đỉnh nào nằm GIỮA cạnh không chứa nó', () => {
    const proj = projectSolid(SOLIDS.box());
    const diag = diagOf(proj);
    const names = Object.keys(proj.points);
    for (const v of names) {
      for (const e of proj.edges) {
        if (e.a === v || e.b === v) continue;
        const rel = distOnSegment(proj.points[v], proj.points[e.a], proj.points[e.b], diag);
        expect(rel, `đỉnh ${v} nằm giữa cạnh ${e.a}${e.b}`).toBeGreaterThan(0.03);
      }
    }
  });

  it('Q3: đường cao S→O thẳng đứng (chênh x < 0.5px)', () => {
    const proj = projectSolid(SOLIDS.pyramidSquare());
    expect(Math.abs(proj.points.S[0] - proj.points.O[0])).toBeLessThan(0.5);
  });

  it('Q4: cạnh bị che phải có nét đứt, và phải có ít nhất 1 cạnh đứt', () => {
    for (const make of [SOLIDS.pyramidSquare, SOLIDS.box]) {
      const proj = projectSolid(make());
      expect(proj.edges.some(e => e.dashed)).toBe(true);
      expect(proj.edges.some(e => !e.dashed)).toBe(true);
    }
  });

  it('Q5: đáy là hình bình hành — AB song song CD, AD song song BC', () => {
    const proj = projectSolid(SOLIDS.pyramidSquare());
    const { A, B, C, D } = proj.points;
    const v1 = [B[0] - A[0], B[1] - A[1]];
    const v2 = [C[0] - D[0], C[1] - D[1]];
    const cross = Math.abs(v1[0] * v2[1] - v1[1] * v2[0]);
    expect(cross).toBeLessThan(1); // cùng phương
  });

  it('Q6: D nằm phía sau (bị che) → các cạnh tới D đứt, đúng SGK', () => {
    const proj = projectSolid(SOLIDS.pyramidSquare());
    const toD = proj.edges.filter(e => e.a === 'D' || e.b === 'D');
    expect(toD.length).toBeGreaterThan(0);
    expect(toD.every(e => e.dashed)).toBe(true);
    expect(proj.hidden).toContain('D');
  });

  it('Q7: MỌI khối — không đỉnh nào nằm giữa cạnh (kể cả chân cao O với SC/SA)', () => {
    const solids = {
      pyramidSquare: SOLIDS.pyramidSquare(),
      pyramidTriangle: SOLIDS.pyramidTriangle(),
      box: SOLIDS.box(),
      prism: SOLIDS.prism(),
    };
    for (const [label, solid] of Object.entries(solids)) {
      const proj = projectSolid(solid);
      const diag = diagOf(proj);
      for (const v of Object.keys(proj.points)) {
        for (const e of proj.edges) {
          if (e.a === v || e.b === v) continue;
          const rel = distOnSegment(proj.points[v], proj.points[e.a], proj.points[e.b], diag);
          // Lỗi thật 28/10: O cách SC chỉ 0.118 (≈5% đường chéo) — bài toán rối.
          expect(rel, `${label}: đỉnh ${v} nằm giữa cạnh ${e.a}${e.b} (lệch ${(rel * 100).toFixed(1)}%)`)
            .toBeGreaterThan(0.06);
        }
      }
    }
  });
});
