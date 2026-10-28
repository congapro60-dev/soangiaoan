/**
 * Dựng hình khối 3D → hình biểu diễn 2D THEO QUY TẮC SGK (tra cứu 28/10).
 *
 * VÌ SAO CÓ FILE NÀY: bản vẽ tay trước đó đặt A,B,C,D,S,O gần cùng trục x nên
 * D nằm ĐÚNG TRÊN đường SB — lỗi sơ đẳng làm nhiều bài toán khó giải (chủ dự án
 * phát hiện từ ảnh thật trên Zalo). Gán nét liền/đứt bằng tay cũng sai.
 *
 * NĂM QUY TẮC HÌNH BIỂU DIỄN:
 * 1. Song song giữ song song; trung điểm/trọng tâm giữ đúng tỉ số.
 * 2. Cạnh hướng ra sau vẽ xiên 30–45° và NGẮN LẠI (k ≈ 0.5) → đáy vuông thành
 *    hình bình hành, không còn hình thoi có hai đỉnh đối diện thẳng hàng.
 * 3. Đường cao (trục z) luôn thẳng đứng, song song mép trang.
 * 4. Đường nhìn thấy vẽ nét liền, đường bị che vẽ nét đứt.
 * 5. Nét liền/đứt TÍNH TỰ ĐỘNG: cạnh bị đứt khi MỌI mặt chứa nó đều khuất.
 *    Không gán tay nên không lệch quy tắc.
 */

export type V3 = [number, number, number];
type V2 = [number, number];

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Hướng nhìn chuẩn SGK: từ phía trước (−y), CAO VỪA (+z ≈ 25°), hơi lệch phải (+x).
 *  z quá lớn sẽ khiến mặt bên khuất bị tính là nhìn thấy (SD thành nét liền — sai SGK). */
const VIEW = unit([0.30, -1, 0.46]);

/** Hệ số co của trục sâu (quy tắc 2): xiên 45°, dài bằng ~½ cạnh thật. */
const DEPTH = 0.5;
const COS45 = Math.SQRT1_2;

export type Solid = {
  vertices: Record<string, V3>;
  /** Mỗi mặt là danh sách đỉnh; thứ tự tuỳ ý — pháp tuyến tự chỉnh ra ngoài. */
  faces: string[][];
  edges: [string, string][];
};

export type ProjectedSolid = {
  points: Record<string, V2>;
  edges: { a: string; b: string; dashed: boolean }[];
  /** Đỉnh khuất (nằm trong đường bao) — dùng để đặt nhãn. */
  hidden: string[];
  center: V2;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
};

/** Chiếu trục đo: x ngang, z dọc (đường cao luôn thẳng đứng), y sâu xiên 45° co 0.5. */
const project = (p: V3): V2 => [
  p[0] + p[1] * DEPTH * COS45,
  -p[2] + p[1] * DEPTH * COS45,
];

/**
 * Tính hình biểu diễn: chiếu các đỉnh rồi tự xác định cạnh nào bị che.
 * Một mặt là "thấy" khi pháp tuyến của nó quay về phía người nhìn (dot(n, VIEW) > 0);
 * cạnh chỉ bị vẽ nét đứt khi TẤT CẢ mặt chứa nó đều khuất.
 */
export const projectSolid = (solid: Solid): ProjectedSolid => {
  const points: Record<string, V2> = {};
  for (const [name, p] of Object.entries(solid.vertices)) points[name] = project(p);

  // Tâm khối: trung bình các đỉnh — dùng để chỉnh pháp tuyến hướng ra ngoài.
  const names = Object.keys(solid.vertices);
  const centroid: V3 = [0, 0, 0];
  for (const n of names) {
    centroid[0] += solid.vertices[n][0] / names.length;
    centroid[1] += solid.vertices[n][1] / names.length;
    centroid[2] += solid.vertices[n][2] / names.length;
  }

  const faceVisible = solid.faces.map(face => {
    const a = solid.vertices[face[0]];
    const b = solid.vertices[face[1]];
    const c = solid.vertices[face[2]];
    let n = cross(sub(b, a), sub(c, a));
    // Chỉnh pháp tuyến ra ngoài (so với tâm khối).
    const mid: V3 = [0, 0, 0];
    for (const v of face) {
      mid[0] += solid.vertices[v][0] / face.length;
      mid[1] += solid.vertices[v][1] / face.length;
      mid[2] += solid.vertices[v][2] / face.length;
    }
    if (dot(n, sub(mid, centroid)) < 0) n = [-n[0], -n[1], -n[2]];
    return dot(unit(n), VIEW) > 0;
  });

  const edges = solid.edges.map(([a, b]) => {
    // Cạnh nằm trên mặt thấy nào không? Nếu có → nét liền.
    const onVisibleFace = solid.faces.some((face, i) =>
      faceVisible[i] && face.includes(a) && face.includes(b));
    return { a, b, dashed: !onVisibleFace };
  });

  const xs = Object.values(points).map(p => p[0]);
  const ys = Object.values(points).map(p => p[1]);
  const bbox = { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
  const center: V2 = [(bbox.minX + bbox.maxX) / 2, (bbox.minY + bbox.maxY) / 2];

  // Đỉnh khuất: mọi cạnh nối tới nó đều đứt.
  const hidden = names.filter(n => {
    const touching = edges.filter(e => e.a === n || e.b === n);
    return touching.length > 0 && touching.every(e => e.dashed);
  });

  return { points, edges, hidden, center, bbox };
};
