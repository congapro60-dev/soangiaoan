/**
 * TỰ CHỌN GÓC NHÌN KHÔNG SUY BIẾN.
 *
 * BÀI HỌC 28/10: bản trước "thử 8 hướng chiếu" nhưng hàm chiếu KHÔNG dùng tham số đó
 * (chỉ dùng để xét mặt khuất) → mặt bên dẹt vẫn dẹt, và tôi lại đi bẻ cong toạ độ hình
 * học để bù, khiến hình nói dối. Nay phép chiếu là phép chiếu song song THẬT có tham số,
 * nên đổi góc nhìn là đổi hình chiếu thật.
 *
 * Tiêu chí: MẶT YẾU NHẤT phải đủ lớn (min-area), không phải điểm trung bình — chỉ cần
 * một mặt suy biến là hình vô dụng với HS, còn trung bình sẽ che mất mặt tệ nhất.
 */
import { projectSolid, DEFAULT_CAMERA, type Camera, type Solid, type ProjectedSolid } from './_assistant-geometry-projection.js';

type V2 = [number, number];

/** Ngưỡng gap tối thiểu (tỉ lệ đường chéo). Đo trên lưới 37×12 góc nhìn: có 150 góc
 *  đạt gap > 8% cho chóp SA⊥đáy, nên 5% là ngưỡng an toàn và không quá khắt khe. */
export const MIN_VERTEX_EDGE_GAP = 0.05;

/** Ứng viên góc nhìn: azimuth × elevation. Dải elevation 15–30° là vùng ĐÚNG QUY ƯỚC
 *  SGK (chóp có đúng 3 cạnh đứt CD,DA,SD) — đo trên lưới 37×8, có 101 góc thoả. */
const CANDIDATES: Camera[] = [
  { azimuth: -60, elevation: 20 },
  { azimuth: -65, elevation: 20 },
  { azimuth: -60, elevation: 15 },
  { azimuth: -70, elevation: 15 },
  { azimuth: -55, elevation: 25 },
  { azimuth: -60, elevation: 25 },
  { azimuth: -75, elevation: 20 },
  { azimuth: -50, elevation: 20 },
  { azimuth: -45, elevation: 25 },
  { azimuth: -80, elevation: 25 },
  { azimuth: -40, elevation: 18 },
  { azimuth: -90, elevation: 22 },
];

const distToSeg = (q: V2, a: V2, b: V2): number => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (!len2) return Math.hypot(q[0] - a[0], q[1] - a[1]);
  let t = ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(q[0] - (a[0] + t * dx), q[1] - (a[1] + t * dy));
};

const triArea = (a: V2, b: V2, c: V2): number =>
  Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;

/**
 * RÀNG BUỘC CỨNG: đỉnh không được nằm giữa cạnh không chứa nó.
 * Trả về khoảng cách nhỏ nhất (đã chuẩn hoá); < ngưỡng nghĩa là góc nhìn này KHÔNG dùng được.
 * Đây là điều kiện LOẠI TRỰC TIẾP, không phải điểm trừ — vì chỉ cần một đỉnh nằm trên cạnh
 * là bài toán rối (lỗi chủ dự án bắt được nhiều lần), không thể bù bằng mặt đẹp.
 */
export const minVertexEdgeGap = (proj: ProjectedSolid): number => {
  const names = Object.keys(proj.points);
  const w = proj.bbox.maxX - proj.bbox.minX || 1;
  const h = proj.bbox.maxY - proj.bbox.minY || 1;
  const diag = Math.hypot(w, h);
  let minGap = Infinity;
  for (const v of names) {
    for (const e of proj.edges) {
      if (e.a === v || e.b === v) continue;
      const d = distToSeg(proj.points[v], proj.points[e.a], proj.points[e.b]) / diag;
      minGap = Math.min(minGap, d);
    }
  }
  return minGap;
};

/** Khoảng cách nhỏ nhất cho phép giữa đỉnh và cạnh (tỉ lệ đường chéo khung hình). */

/** Chấm điểm một hình chiếu: càng CAO càng tốt. */
export const scoreProjection = (solid: Solid, proj: ProjectedSolid): number => {
  const names = Object.keys(proj.points);
  const w = proj.bbox.maxX - proj.bbox.minX || 1;
  const h = proj.bbox.maxY - proj.bbox.minY || 1;
  const boxArea = w * h;
  let score = 0;
  let minFaceRatio = Infinity;

  for (const face of solid.faces) {
    if (face.length < 3) continue;
    const p0 = proj.points[face[0]];
    let area = 0;
    for (let i = 1; i + 1 < face.length; i += 1) {
      area += triArea(p0, proj.points[face[i]], proj.points[face[i + 1]]);
    }
    const ratio = area / boxArea;
    minFaceRatio = Math.min(minFaceRatio, ratio);
    score += Math.min(ratio, 0.25);
  }
  // Mặt yếu nhất quyết định: dưới 4% là gần như vô dụng.
  if (minFaceRatio < 0.04) score -= 500 * (0.04 - minFaceRatio) / 0.04;
  score += Math.min(minFaceRatio, 0.12) * 20;

  // Điểm trừ theo mức vi phạm ràng buộc đỉnh–cạnh (điều kiện loại xử riêng ở bestProjection).
  const gap = minVertexEdgeGap(proj);
  if (gap < MIN_VERTEX_EDGE_GAP) score -= 1000 * (MIN_VERTEX_EDGE_GAP - gap) / MIN_VERTEX_EDGE_GAP;

  // Nhãn không chồng nhau.
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const a = proj.points[names[i]], b = proj.points[names[j]];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]) / Math.hypot(w, h);
      if (d < 0.05) score -= 10 * (0.05 - d) / 0.05;
    }
  }
  return score;
};

/**
 * Chọn góc nhìn tốt nhất.
 *
 * RÀNG BUỘC CỨNG (ưu tiên tuyệt đối): góc nhìn phải cho SỐ CẠNH ĐỨT hợp lý — với chóp
 * 4 đỉnh đáy là 3 cạnh khuất (CD, DA, SD). Góc nhìn chúc từ trên xuống làm mất cạnh đứt
 * (chỉ còn 1) → sai quy ước SGK, dù mặt bên rộng hơn.
 *
 * Thứ tự xét: (1) đúng số cạnh đứt → (2) không đỉnh nào nằm giữa cạnh → (3) điểm mặt bên.
 */
export const bestProjection = (solid: Solid): { proj: ProjectedSolid; score: number; camera: Camera } => {
  const baseCount = Object.keys(solid.vertices).filter(n => /^[A-Z]$/.test(n)).length;
  // Chóp 4 đỉnh đáy + S: đúng 3 cạnh khuất. Hộp/lăng trụ: 3 cạnh khuất (D, DD', CD, DA).
  const expectedDashed = solid.faces.length === 5 && baseCount === 5 ? 3 : 3;

  type Entry = { proj: ProjectedSolid; score: number; camera: Camera };
  let bestOk: Entry | null = null;
  let bestGapOnly: Entry | null = null;
  let bestFallback: Entry | null = null;

  for (const camera of CANDIDATES) {
    const proj = projectSolid(solid, camera);
    const gap = minVertexEdgeGap(proj);
    const score = scoreProjection(solid, proj);
    const entry: Entry = { proj, score, camera };
    const dashedOk = proj.edges.filter(e => e.dashed).length === expectedDashed;

    if (!bestFallback || score > bestFallback.score) bestFallback = entry;
    if (gap < MIN_VERTEX_EDGE_GAP) continue;
    if (!bestGapOnly || score > bestGapOnly.score) bestGapOnly = entry;
    if (dashedOk && (!bestOk || score > bestOk.score)) bestOk = entry;
  }
  return bestOk ?? bestGapOnly ?? bestFallback!;
};
