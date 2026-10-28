/**
 * TỰ CHỌN PHÉP CHIẾU KHÔNG SUY BIẾN.
 *
 * VÌ SAO (lỗi thật 28/10, ChatGPT chỉ ra từ ảnh Zalo): với chóp có SA⊥đáy, phép chiếu
 * cố định làm S, B, C gần thẳng hàng — d(B,SC) chỉ 0.018 (≈0) và diện tích mặt SBC chỉ
 * 0.49% khung hình. Mặt bên suy biến thành đoạn thẳng, HS không nhận ra tam giác SBC.
 *
 * NGUYÊN NHÂN TOÁN HỌC: khi h/w ≈ 1, hai cạnh SB và SC có hình chiếu gần song song.
 *
 * CÁCH SỬA ĐÚNG GỐC: không chỉnh tay toạ độ từng ca (đó là cách gây "được cái này hỏng
 * cái kia"). Thay vào đó THỬ NHIỀU phép chiếu và CHỌN cái có điểm suy biến thấp nhất:
 *   - không đỉnh nào nằm sát cạnh,
 *   - mọi mặt bên có diện tích đủ lớn trên hình chiếu,
 *   - nhãn không chồng lên nhau.
 */
import { projectSolid, type Solid, type ProjectedSolid } from './_assistant-geometry-projection.js';

type V2 = [number, number];

/** Ứng viên hướng nhìn (x, y, z) — trước, hơi cao, lệch phải; xoay quanh trục z. */
const VIEW_CANDIDATES: Array<[number, number, number]> = [
  [0.30, -1, 0.46],
  [0.55, -1, 0.42],
  [0.75, -1, 0.38],
  [0.95, -1, 0.35],
  [0.10, -1, 0.50],
  [-0.10, -1, 0.45],
  [0.45, -1, 0.60],
  [0.45, -1, 0.30],
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
 * Chấm điểm một hình chiếu: càng CAO càng tốt.
 * Ưu tiên TUYỆT ĐỐI: mặt yếu nhất phải đủ lớn (min-area), vì chỉ cần MỘT mặt suy biến là
 * hình vô dụng với HS — cộng điểm trung bình sẽ che mất mặt tệ nhất (lỗi 28/10: SBC 0.5%
 * nhưng các mặt khác 27-37% nên tổng vẫn cao và bị chọn).
 */
export const scoreProjection = (solid: Solid, proj: ProjectedSolid): number => {
  const names = Object.keys(proj.points);
  const w = proj.bbox.maxX - proj.bbox.minX || 1;
  const h = proj.bbox.maxY - proj.bbox.minY || 1;
  const boxArea = w * h;
  let score = 0;
  let minFaceRatio = Infinity;

  // 1) Mọi MẶT phải có diện tích đủ lớn (không suy biến thành đoạn thẳng).
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
  // Mặt yếu nhất quyết định: dưới 4% là gần như vô dụng, phạt cực nặng.
  if (minFaceRatio < 0.04) score -= 500 * (0.04 - minFaceRatio) / 0.04;
  // Thưởng khi mặt yếu nhất cũng đủ rộng rãi.
  score += Math.min(minFaceRatio, 0.12) * 20;

  // 2) Không đỉnh nào nằm sát cạnh không chứa nó.
  for (const v of names) {
    for (const e of proj.edges) {
      if (e.a === v || e.b === v) continue;
      const d = distToSeg(proj.points[v], proj.points[e.a], proj.points[e.b]) / Math.hypot(w, h);
      if (d < 0.06) score -= 10 * (0.06 - d) / 0.06;
    }
  }

  // 3) Nhãn không chồng nhau (đỉnh chiếu quá gần nhau thì nhãn đè).
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
 * Chọn phép chiếu tốt nhất trong các ứng viên. Trả về hình chiếu + điểm số để test khoá.
 */
export const bestProjection = (solid: Solid): { proj: ProjectedSolid; score: number; view: [number, number, number] } => {
  let best: { proj: ProjectedSolid; score: number; view: [number, number, number] } | null = null;
  for (const view of VIEW_CANDIDATES) {
    const proj = projectSolid(solid, view);
    const score = scoreProjection(solid, proj);
    if (!best || score > best.score) best = { proj, score, view };
  }
  return best!;
};
