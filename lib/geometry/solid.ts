/**
 * Hình học khối 3D cho mô phỏng tương tác.
 *
 * NGUYÊN TẮC: nét liền/nét đứt là KẾT QUẢ TÍNH TOÁN từ hình học + góc nhìn,
 * không phải thuộc tính của cạnh. Học sinh xoay để kiểm chứng quy ước.
 *
 * Công thức culling: mặt nhìn thấy khi pháp tuyến (hướng ra ngoài) hướng về
 * phía camera. Cạnh thuộc ÍT NHẤT MỘT mặt nhìn thấy thì vẽ nét liền.
 *
 * LƯU Ý QUAN TRỌNG (bug đã gặp): pháp tuyến PHẢI được ép hướng ra ngoài theo
 * tâm khối. Nếu tin vào thứ tự đỉnh nhập tay, mặt có thể bị đảo và hình hộp
 * ra 11/12 nét liền thay vì 9/12.
 */

export type Vec3 = [number, number, number];
export type Vec2 = [number, number];

export interface Face {
  /** Chỉ số đỉnh, theo thứ tự vòng quanh mặt. */
  v: number[];
}

export interface Edge {
  a: number;
  b: number;
}

export interface Solid {
  verts: Vec3[];
  labels: string[];
  faces: Face[];
  edges: Edge[];
  /** Điểm phụ (trung điểm, chân đường cao...) — tính từ 3D, không nhập tay. */
  extraPts?: { p: Vec3; label: string }[];
}

export interface Camera {
  pos: Vec3;
  fwd: Vec3;
  right: Vec3;
  up: Vec3;
  fov: number;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]) || 1;
const norm = (a: Vec3): Vec3 => {
  const l = len(a);
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Tâm khối — dùng để ép pháp tuyến hướng ra ngoài. */
export function centroid(verts: Vec3[]): Vec3 {
  const n = verts.length;
  return [
    verts.reduce((s, v) => s + v[0], 0) / n,
    verts.reduce((s, v) => s + v[1], 0) / n,
    verts.reduce((s, v) => s + v[2], 0) / n,
  ];
}

export function faceCenter(verts: Vec3[], face: Face): Vec3 {
  const k = face.v.length;
  return [
    face.v.reduce((s, i) => s + verts[i][0], 0) / k,
    face.v.reduce((s, i) => s + verts[i][1], 0) / k,
    face.v.reduce((s, i) => s + verts[i][2], 0) / k,
  ];
}

/** Pháp tuyến đã ép hướng ra ngoài khối. */
export function faceNormal(verts: Vec3[], face: Face): Vec3 {
  const [i0, i1, i2] = face.v;
  const n = cross(sub(verts[i1], verts[i0]), sub(verts[i2], verts[i0]));
  const c = faceCenter(verts, face);
  const g = centroid(verts);
  // Nếu pháp tuyến đang chĩa vào trong, lật ngược.
  return dot(n, sub(c, g)) < 0 ? [-n[0], -n[1], -n[2]] : n;
}

/** Camera quay quanh target theo yaw/pitch, chiếu phối cảnh. */
export function makeCamera(
  target: Vec3,
  dist: number,
  yawDeg: number,
  pitchDeg: number,
  fov = 45
): Camera {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  const dir: Vec3 = [
    Math.cos(pitch) * Math.cos(yaw),
    Math.cos(pitch) * Math.sin(yaw),
    Math.sin(pitch),
  ];
  const pos: Vec3 = [
    target[0] + dir[0] * dist,
    target[1] + dir[1] * dist,
    target[2] + dir[2] * dist,
  ];
  const fwd = norm(sub(target, pos));
  const worldUp: Vec3 = [0, 0, 1];
  let right = cross(fwd, worldUp);
  if (len(right) < 1e-9) right = [1, 0, 0];
  right = norm(right);
  const up = cross(right, fwd);
  return { pos, fwd, right, up, fov };
}

/** Chiếu 1 điểm 3D ra toạ độ màn hình (đơn vị tuỳ ý, chưa nhân scale). */
export function project(p: Vec3, cam: Camera): { x: number; y: number; z: number } {
  const v = sub(p, cam.pos);
  const z = Math.max(dot(v, cam.fwd), 1e-6);
  const f = 1 / Math.tan((cam.fov * Math.PI) / 360);
  return {
    x: (dot(v, cam.right) * f) / z,
    y: (-dot(v, cam.up) * f) / z,
    z,
  };
}

export interface Visibility {
  faceVisible: boolean[];
  /** true = nét liền (nhìn thấy), false = nét đứt (khuất). */
  edgeSolid: Record<string, boolean>;
  visibleFaceCount: number;
}

export const edgeKey = (a: number, b: number): string => `${a}-${b}`;

/**
 * Tính mặt nào nhìn thấy và cạnh nào vẽ nét liền.
 * Đây là lõi của toàn bộ mô phỏng — mọi thứ khác chỉ là hiển thị.
 */
export function computeVisibility(solid: Solid, cam: Camera): Visibility {
  const { verts, faces, edges } = solid;

  const faceVisible = faces.map((f) => {
    const n = faceNormal(verts, f);
    const c = faceCenter(verts, f);
    return dot(n, sub(cam.pos, c)) > 0;
  });

  const edgeSolid: Record<string, boolean> = {};
  for (const e of edges) {
    let visible = false;
    for (let fi = 0; fi < faces.length; fi++) {
      if (!faceVisible[fi]) continue;
      const v = faces[fi].v;
      if (v.includes(e.a) && v.includes(e.b)) {
        visible = true;
        break;
      }
    }
    edgeSolid[edgeKey(e.a, e.b)] = visible;
  }

  return {
    faceVisible,
    edgeSolid,
    visibleFaceCount: faceVisible.filter(Boolean).length,
  };
}

/** Số cạnh nét liền — dùng cho test. */
export function solidEdgeCount(solid: Solid, cam: Camera): { solid: number; dashed: number; total: number } {
  const { edgeSolid } = computeVisibility(solid, cam);
  const total = solid.edges.length;
  const s = Object.values(edgeSolid).filter(Boolean).length;
  return { solid: s, dashed: total - s, total };
}

/* ============================================================
   DỮ LIỆU KHỐI — dựng theo đúng đề từng bài, không áp một kiểu.
   ============================================================ */

/**
 * Tứ diện SABC (bài r106, thiết diện trung điểm).
 * C đặt lệch về phía đối diện B để nhìn thấy 2 mặt SAB + SAC.
 */
const tuDienVerts: Vec3[] = [
  [0, 0, 0], // A
  [6, 0, 0], // B
  [-2.5, 4.5, 0], // C
  [2, 2.2, 6], // S
];

/** Trung điểm 2 đỉnh: tính bằng công thức, không nhập số làm tròn. */
const mid = (a: Vec3, b: Vec3): Vec3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

export const tuDienSABC: Solid = {
  verts: tuDienVerts,
  labels: ["A", "B", "C", "S"],
  faces: [{ v: [0, 1, 2] }, { v: [0, 1, 3] }, { v: [1, 2, 3] }, { v: [2, 0, 3] }],
  edges: [
    { a: 0, b: 1 },
    { a: 1, b: 2 },
    { a: 2, b: 0 },
    { a: 0, b: 3 },
    { a: 1, b: 3 },
    { a: 2, b: 3 },
  ],
  // M, N, P là trung điểm SA, SB, SC — đúng đề r106 task-3-1.
  extraPts: [
    { p: mid(tuDienVerts[3], tuDienVerts[0]), label: "M" },
    { p: mid(tuDienVerts[3], tuDienVerts[1]), label: "N" },
    { p: mid(tuDienVerts[3], tuDienVerts[2]), label: "P" },
  ],
};

/**
 * Hình hộp CHỮ NHẬT ABCD.A'B'C'D' (bài r106 task-3-2 — đề ghi rõ "chữ nhật").
 * KHÁC với hopXien: ở đây đáy là hình chữ nhật, các mặt đều vuông góc.
 */
export const hopChuNhat: Solid = {
  verts: [
    [0, 0, 0], // A
    [8, 0, 0], // B
    [8, 5, 0], // C
    [0, 5, 0], // D
    [0, 0, 4], // A'
    [8, 0, 4], // B'
    [8, 5, 4], // C'
    [0, 5, 4], // D'
  ],
  labels: ["A", "B", "C", "D", "A'", "B'", "C'", "D'"],
  faces: [
    { v: [0, 1, 2, 3] }, // đáy ABCD
    { v: [4, 5, 6, 7] }, // trên A'B'C'D'
    { v: [0, 1, 5, 4] }, // ABB'A'
    { v: [1, 2, 6, 5] }, // BCC'B'
    { v: [2, 3, 7, 6] }, // CDD'C'
    { v: [3, 0, 4, 7] }, // DAA'D'
  ],
  edges: [
    { a: 0, b: 1 },
    { a: 1, b: 2 },
    { a: 2, b: 3 },
    { a: 3, b: 0 },
    { a: 4, b: 5 },
    { a: 5, b: 6 },
    { a: 6, b: 7 },
    { a: 7, b: 4 },
    { a: 0, b: 4 },
    { a: 1, b: 5 },
    { a: 2, b: 6 },
    { a: 3, b: 7 },
  ],
};

/**
 * Hình hộp xiên ABCD.A'B'C'D' (bài r106, hai mặt đối diện).
 * Đáy là hình bình hành — đúng loại "hộp xiên" người dùng đã chốt.
 */
export const hopXien: Solid = {
  verts: [
    [0, 0, 0], // A
    [8, 0, 0], // B
    [10, 5, 0], // C
    [2, 5, 0], // D
    [0, 0, 4], // A'
    [8, 0, 4], // B'
    [10, 5, 4], // C'
    [2, 5, 4], // D'
  ],
  labels: ["A", "B", "C", "D", "A'", "B'", "C'", "D'"],
  faces: [
    { v: [0, 1, 2, 3] }, // đáy ABCD
    { v: [4, 5, 6, 7] }, // trên A'B'C'D'
    { v: [0, 1, 5, 4] }, // ABB'A'
    { v: [1, 2, 6, 5] }, // BCC'B'
    { v: [2, 3, 7, 6] }, // CDD'C'
    { v: [3, 0, 4, 7] }, // DAA'D'
  ],
  edges: [
    { a: 0, b: 1 },
    { a: 1, b: 2 },
    { a: 2, b: 3 },
    { a: 3, b: 0 },
    { a: 4, b: 5 },
    { a: 5, b: 6 },
    { a: 6, b: 7 },
    { a: 7, b: 4 },
    { a: 0, b: 4 },
    { a: 1, b: 5 },
    { a: 2, b: 6 },
    { a: 3, b: 7 },
  ],
};

/**
 * Hình chóp S.ABCD (bài r107, thiết diện song song đáy).
 * Đáy là hình thang AB ∥ CD, AB = 2·CD — đúng đề.
 * Toạ độ 3D được suy ngược từ hình 2D đã duyệt, chiếu lại khớp 100%.
 */
const chopVerts: Vec3[] = [
  [0, 0, 0], // A
  [8, 0, 0], // B
  [4, 3, 0], // C
  [0, 3, 0], // D
  [4, 1.5, 5.4167], // S
];

/**
 * Điểm thiết diện: S + 2/3·(X − S).
 * TÍNH BẰNG CÔNG THỨC, không ghi số đã làm tròn — ghi số làm tròn 4 chữ số
 * từng làm 2 đường gần song song bị coi là không song song (lệch 1e-4).
 */
const thietDien = (target: Vec3): Vec3 => {
  const S = chopVerts[4];
  const t = 2 / 3;
  return [S[0] + t * (target[0] - S[0]), S[1] + t * (target[1] - S[1]), S[2] + t * (target[2] - S[2])];
};

export const chopSABCD: Solid = {
  verts: chopVerts,
  labels: ["A", "B", "C", "D", "S"],
  faces: [
    { v: [0, 1, 2, 3] }, // đáy ABCD
    { v: [0, 1, 4] }, // SAB
    { v: [1, 2, 4] }, // SBC
    { v: [2, 3, 4] }, // SCD
    { v: [3, 0, 4] }, // SDA
  ],
  edges: [
    { a: 0, b: 1 }, // AB
    { a: 1, b: 2 }, // BC
    { a: 2, b: 3 }, // CD
    { a: 3, b: 0 }, // DA
    { a: 0, b: 4 }, // SA
    { a: 1, b: 4 }, // SB
    { a: 2, b: 4 }, // SC
    { a: 3, b: 4 }, // SD
  ],
  // M trên SA, N trên SB, P trên SC, Q trên SD — tính từ 3D, không nhập tay.
  // Đã kiểm: chiếu ngược ra 2D khớp chính xác hình đã duyệt (123.33/283.33/176.67/96.67).
  extraPts: [
    { p: thietDien(chopVerts[0]), label: "M" },
    { p: thietDien(chopVerts[1]), label: "N" },
    { p: thietDien(chopVerts[2]), label: "P" },
    { p: thietDien(chopVerts[3]), label: "Q" },
  ],
};

/** Góc nhìn mặc định cho từng khối — chọn theo kết quả quét thật, không đoán. */
export const defaultViews: Record<string, { yaw: number; pitch: number; dist: number; target: Vec3 }> = {
  'tu-dien-sabc': { yaw: -140, pitch: 40, dist: 20, target: [2, 2.2, 1.5] },
  'hop-xien': { yaw: -70, pitch: 20, dist: 24, target: [5, 2.5, 2] },
  // Hop chu nhat: yaw -50 cho net dut CD, DA, DD' (giong chuan SGK cua hop xien)
  'hop-chu-nhat': { yaw: -50, pitch: 15, dist: 24, target: [4, 2.5, 2] },
  'chop-sabcd': { yaw: -160, pitch: 35, dist: 26, target: [4, 1.5, 2.2] },
};

export const solids: Record<string, Solid> = {
  'tu-dien-sabc': tuDienSABC,
  'hop-xien': hopXien,
  'hop-chu-nhat': hopChuNhat,
  'chop-sabcd': chopSABCD,
};
