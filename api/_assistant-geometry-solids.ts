/**
 * Định nghĩa 6 khối hình học bằng TOẠ ĐỘ 3D THẬT + danh sách mặt.
 * Nhờ vậy phép chiếu (api/_assistant-geometry-projection.ts) tự tính được
 * cạnh nào khuất → không còn gán nét đứt bằng tay, và không còn cảnh
 * D nằm trên SB.
 *
 * Quy ước toạ độ: x sang phải, y đi ra sau (sâu), z lên (đường cao).
 * Đáy nằm trên z = 0. Đơn vị tuỳ ý, chỉ quan hệ tỉ lệ mới quan trọng.
 */
import type { Solid } from './_assistant-geometry-projection.js';

/** Hộp chữ nhật / lập phương / lăng trụ đáy vuông: ABCD đáy, A'B'C'D' đỉnh trên. */
const boxSolid = (w: number, d: number, h: number): Solid => {
  const vertices = {
    A: [0, 0, 0] as [number, number, number],
    B: [w, 0, 0] as [number, number, number],
    C: [w, d, 0] as [number, number, number],
    D: [0, d, 0] as [number, number, number],
    "A'": [0, 0, h] as [number, number, number],
    "B'": [w, 0, h] as [number, number, number],
    "C'": [w, d, h] as [number, number, number],
    "D'": [0, d, h] as [number, number, number],
  };
  const faces = [
    ['A', 'B', 'C', 'D'],                     // đáy
    ["A'", "B'", "C'", "D'"],                 // nắp
    ['A', 'B', "B'", "A'"],                   // trước
    ['B', 'C', "C'", "B'"],                   // phải
    ['C', 'D', "D'", "C'"],                   // sau
    ['D', 'A', "A'", "D'"],                   // trái
  ];
  const edges: [string, string][] = [
    ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'],
    ["A'", "B'"], ["B'", "C'"], ["C'", "D'"], ["D'", "A'"],
    ['A', "A'"], ['B', "B'"], ['C', "C'"], ['D', "D'"],
  ];
  return { vertices, faces, edges };
};

/** Chóp đáy chữ nhật, S trên tâm đáy (chân đường cao O). */
const pyramidSolid = (w: number, d: number, h: number): Solid => {
  const vertices = {
    A: [0, 0, 0] as [number, number, number],
    B: [w, 0, 0] as [number, number, number],
    C: [w, d, 0] as [number, number, number],
    D: [0, d, 0] as [number, number, number],
    S: [w / 2, d / 2, h] as [number, number, number],
    O: [w / 2, d / 2, 0] as [number, number, number],
  };
  const faces = [
    ['A', 'B', 'C', 'D'],
    ['S', 'A', 'B'],
    ['S', 'B', 'C'],
    ['S', 'C', 'D'],
    ['S', 'D', 'A'],
  ];
  const edges: [string, string][] = [
    ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'],
    ['S', 'A'], ['S', 'B'], ['S', 'C'], ['S', 'D'],
  ];
  return { vertices, faces, edges };
};

/**
 * Chóp có S nằm trên ĐỈNH A (đề cho "SA ⊥ (ABCD)"): S thẳng đứng trên A, O trùng A.
 * Đây là hình đúng cho đa số bài lớp 11 (SA vuông góc mặt đáy tại A) — đặt S trên tâm
 * O là VẼ SAI ĐỀ, và bài giải sẽ rối vì SA không còn là đường cao (lỗi chủ dự án bắt
 * được 28/10: hình vẽ sai đề + sai tính chất hình học).
 */
const pyramidApexAtA = (w: number, d: number, h: number): Solid => {
  const vertices = {
    A: [0, 0, 0] as [number, number, number],
    B: [w, 0, 0] as [number, number, number],
    C: [w, d, 0] as [number, number, number],
    D: [0, d, 0] as [number, number, number],
    // S đứng THẲNG trên A: SA ⊥ đáy đúng như đề.
    S: [0, 0, h] as [number, number, number],
  };
  const faces = [
    ['A', 'B', 'C', 'D'],
    ['S', 'A', 'B'],
    ['S', 'B', 'C'],
    ['S', 'C', 'D'],
    ['S', 'D', 'A'],
  ];
  const edges: [string, string][] = [
    ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'],
    ['S', 'A'], ['S', 'B'], ['S', 'C'], ['S', 'D'],
  ];
  return { vertices, faces, edges };
};

/** Chóp đáy tam giác. O là TRỌNG TÂM đáy (chân đường cao của chóp đều) — không phải
 *  trung bình cộng đỉnh, vì trung bình cộng làm O suýt nằm trên cạnh SC (lỗi 28/10).
 *  Đáy cao 1.75 (không phải 1.3) để trọng tâm O không đi sát cạnh AB. */
const pyramidTriangleSolid = (h: number): Solid => {
  const A: [number, number, number] = [0, 0, 0];
  const B: [number, number, number] = [2, 0, 0];
  const C: [number, number, number] = [0.85, 1.75, 0];
  const G: [number, number, number] = [
    (A[0] + B[0] + C[0]) / 3,
    (A[1] + B[1] + C[1]) / 3,
    0,
  ];
  const vertices = {
    A, B, C,
    S: [G[0], G[1], h] as [number, number, number],
    O: G,
  };
  const faces = [
    ['A', 'B', 'C'],
    ['S', 'A', 'B'],
    ['S', 'B', 'C'],
    ['S', 'C', 'A'],
  ];
  const edges: [string, string][] = [
    ['A', 'B'], ['B', 'C'], ['C', 'A'],
    ['S', 'A'], ['S', 'B'], ['S', 'C'],
  ];
  return { vertices, faces, edges };
};

export const SOLIDS = {
  box: () => boxSolid(2, 1.2, 1.6),
  prism: () => boxSolid(2, 1.2, 1.6),
  // d = 1.9 (sâu hơn) để SC vòng ra xa B: với d = 1.4, B chỉ cách SC 5.4% đường chéo
  // → cạnh đi sát đỉnh, đúng loại lỗi chủ dự án bắt được (28/10).
  pyramidSquare: () => pyramidSolid(2, 1.9, 1.9),
  // "SA ⊥ (ABCD)": S đứng trên A (đúng đề) — KHÔNG dùng pyramidSquare cho ca này.
  pyramidApexAtA: () => pyramidApexAtA(2, 1.9, 1.9),
  pyramidTriangle: () => pyramidTriangleSolid(1.9),
} as const;
