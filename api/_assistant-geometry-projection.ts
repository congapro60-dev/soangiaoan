/**
 * Dựng hình khối 3D → hình biểu diễn 2D bằng PHÉP CHIẾU SONG SONG có tham số.
 *
 * BÀI HỌC 28/10 (lỗi nghiêm trọng do chính tôi gây ra, chủ dự án phát hiện):
 * - Ban đầu tôi "sửa" mặt bên bị dẹt bằng cách BẺ CONG TOẠ ĐỘ (đặt S lệch khỏi A) trong
 *   khi vẫn vẽ ký hiệu góc vuông tại A → hình vẽ NÓI DỐI: đề cho SA ⊥ đáy nhưng hình vẽ
 *   SA xiên. KHÔNG BAO GIỜ được sửa hình học để chiều theo hình vẽ.
 * - Lỗi thứ hai: hàm chiếu cũ KHÔNG dùng tham số hướng nhìn (VIEW chỉ dùng để xét mặt
 *   khuất), nên "thử 8 hướng chiếu" thực chất không đổi phép chiếu → mặt dẹt vẫn dẹt.
 *
 * CÁCH ĐÚNG:
 * - Toạ độ 3D giữ ĐÚNG đề bài (SA ⊥ đáy thì S cùng x,y với A).
 * - Phép chiếu là phép chiếu song song THẬT, có tham số góc phương vị (azimuth) và góc
 *   ngẩng (elevation). Nhờ vậy có thể chọn góc nhìn mà MỌI mặt đều không suy biến,
 *   trong khi hình học vẫn đúng.
 * - Nét liền/đứt vẫn TÍNH TỰ ĐỘNG theo pháp tuyến mặt.
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

/** Góc nhìn: azimuth (độ, quanh trục z) và elevation (độ, ngẩng lên). */
export type Camera = { azimuth: number; elevation: number };

/** Góc nhìn mặc định: đo trên lưới 37×8, nhóm ĐÚNG SGK (3 cạnh đứt CD,DA,SD cho chóp)
 *  tập trung ở elevation 15–25°. Elevation cao (40°+) nhìn chúc từ trên xuống nên thấy
 *  gần hết các mặt, chỉ còn 1 cạnh đứt — sai quy ước. */
export const DEFAULT_CAMERA: Camera = { azimuth: -60, elevation: 20 };

export type Solid = {
  vertices: Record<string, V3>;
  /** Mỗi mặt là danh sách đỉnh; thứ tự tuỳ ý — pháp tuyến tự chỉnh ra ngoài. */
  faces: string[][];
  edges: [string, string][];
};

export type ProjectedSolid = {
  points: Record<string, V2>;
  edges: { a: string; b: string; dashed: boolean }[];
  /** Các MẶT theo thứ tự đỉnh đã chiếu; visible=false là mặt khuất (không tô). */
  faces: { vertices: string[]; visible: boolean }[];
  /** Đỉnh khuất (mọi cạnh nối tới đều đứt). */
  hidden: string[];
  center: V2;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
};

const deg = (d: number): number => (d * Math.PI) / 180;

/**
 * Phép chiếu song song THẬT: dựng hệ trục màn hình từ hướng nhìn rồi chiếu vuông góc.
 * Vector đơn vị hướng nhìn v (từ vật thể tới mắt):
 *   v = (cos el·cos az, cos el·sin az, sin el)
 * Trục phải r = chuẩn hoá(worldUp × v); trục lên u = v × r.
 */
export const projectSolid = (solid: Solid, camera: Camera = DEFAULT_CAMERA): ProjectedSolid => {
  const az = deg(camera.azimuth);
  const el = deg(camera.elevation);
  const v: V3 = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
  const r = unit(cross([0, 0, 1], v));
  const u = cross(v, r);

  const project = (p: V3): V2 => [dot(p, r), -dot(p, u)];

  const points: Record<string, V2> = {};
  for (const [name, p] of Object.entries(solid.vertices)) points[name] = project(p);

  // Tâm khối để chỉnh pháp tuyến hướng ra ngoài.
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
    const mid: V3 = [0, 0, 0];
    for (const vv of face) {
      mid[0] += solid.vertices[vv][0] / face.length;
      mid[1] += solid.vertices[vv][1] / face.length;
      mid[2] += solid.vertices[vv][2] / face.length;
    }
    if (dot(n, sub(mid, centroid)) < 0) n = [-n[0], -n[1], -n[2]];
    return dot(unit(n), v) > 0;
  });

  const edges = solid.edges.map(([a, b]) => {
    const onVisibleFace = solid.faces.some((face, i) =>
      faceVisible[i] && face.includes(a) && face.includes(b));
    return { a, b, dashed: !onVisibleFace };
  });

  const xs = Object.values(points).map(p => p[0]);
  const ys = Object.values(points).map(p => p[1]);
  const bbox = { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
  const center: V2 = [(bbox.minX + bbox.maxX) / 2, (bbox.minY + bbox.maxY) / 2];

  const hidden = names.filter(n => {
    const touching = edges.filter(e => e.a === n || e.b === n);
    return touching.length > 0 && touching.every(e => e.dashed);
  });

  return {
    points,
    edges,
    faces: solid.faces.map((face, i) => ({ vertices: face, visible: faceVisible[i] })),
    hidden,
    center,
    bbox,
  };
};
