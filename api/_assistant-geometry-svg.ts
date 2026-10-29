/**
 * Dựng SVG hình học/thống kê từ DSL của AI (api/_assistant-geometry.ts) — bản v2.
 *
 * Chuẩn SGK (tra cứu lại 28/10 theo phản hồi của chủ dự án):
 * - Cạnh NHÌN THẤY: nét liền. Cạnh BỊ CHE: nét đứt. (nét đứt chỉ dành cho đường bị che.)
 * - Chóp SA⊥đáy: chân đường cao O + dấu góc vuông tại đỉnh góc vuông.
 * - Trụ/nón: đường cao h (nét đứt, trục), bán kính r (nét đứt), tâm O.
 * - Cầu: tâm O, bán kính R (nét đứt).
 *
 * Khổ 800×640, nét 3.5, nhãn 34px — cỡ đủ lớn khi HS xem trên điện thoại
 * (bản 640×520 bị phàn nàn là nhỏ). Font: KaTeX_Main (bundle kèm function) để
 * có ⊥ ∠ √ ≤ ⇒ △ và ⅓ ⅔; fallback sans-serif cho phần còn lại.
 *
 * Phân số trong ghi chú chạy qua beautifyFractions (cùng chuẩn với chat text):
 * 1/3 → ⅓, 2/3 → ⅔. Không còn dạng "2/3" thô.
 * Mọi lỗi DSL → trả null (caller fallback về text, không bao giờ throw).
 */
import { beautifyFractions } from './_assistant-math-text.js';
import type { GeometrySpec } from './_assistant-geometry.js';
import { type Solid, type ProjectedSolid } from './_assistant-geometry-projection.js';
import { bestProjection } from './_assistant-geometry-best-view.js';
import { SOLIDS } from './_assistant-geometry-solids.js';

export const GEOMETRY_SVG_SIZE = { width: 800, height: 640 } as const;

const W = GEOMETRY_SVG_SIZE.width;
const H = GEOMETRY_SVG_SIZE.height;
// Bảng màu theo MATH DIAGRAM STANDARD v1.0 §17.1 (nền sáng):
// nét chính #1F2937, nét khuất #6B7280 (luôn kèm nét đứt — không mã hoá bằng màu riêng),
// lưới #E5E7EB. px ở đây lớn hơn tham chiếu §17.3 vì ảnh 800×640 cho điện thoại.
const INK = '#1F2937';
const HIDDEN_INK = '#6B7280';
const GRID_INK = '#E5E7EB';
const FONT = `font-family="'KaTeX_Main','DejaVu Sans',sans-serif"`;
const DASH = 'stroke-dasharray="10 7"';

const esc = (s: string): string =>
  s.replace(/&/g, '&' + 'amp;').replace(/</g, '&' + 'lt;').replace(/>/g, '&' + 'gt;').replace(/"/g, '&' + 'quot;');

const line = (x1: number, y1: number, x2: number, y2: number, dashed = false): string =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${dashed ? HIDDEN_INK : INK}" stroke-width="3.5" stroke-linecap="round"${dashed ? ` ${DASH}` : ''}/>`;

/** Nửa ellipse: half='top'|'bottom' theo toạ độ màn hình (y hướng xuống). */
const halfEllipse = (cx: number, cy: number, rx: number, ry: number, half: 'top' | 'bottom', dashed = false): string => {
  const sweep = half === 'top' ? 0 : 1;
  return `<path d="M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 ${sweep} ${cx + rx} ${cy}" fill="none" stroke="${dashed ? HIDDEN_INK : INK}" stroke-width="3.5" stroke-linecap="round"${dashed ? ` ${DASH}` : ''}/>`;
};

const ellipse = (cx: number, cy: number, rx: number, ry: number, dashed = false): string =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${dashed ? HIDDEN_INK : INK}" stroke-width="3.5"${dashed ? ` ${DASH}` : ''}/>`;

const label = (x: number, y: number, text: string, size = 34): string =>
  `<text x="${x}" y="${y}" ${FONT} font-size="${size}" font-weight="700" fill="${INK}" text-anchor="middle" stroke="#ffffff" stroke-width="6" paint-order="stroke fill" stroke-linejoin="round">${text}</text>`;

/**
 * Tô nhạt các MẶT NHÌN THẤY để khối có cảm giác 3D (SGK hay tô mặt bên).
 * Chỉ tô mặt quay về phía người nhìn — mặt khuất để trắng, đúng quy ước.
 */
const fillVisibleFaces = (proj: ProjectedSolid, P: (n: string) => Pt): string[] => {
  const out: string[] = [];
  for (const face of proj.faces) {
    if (!face.visible || face.vertices.length < 3) continue;
    const pts = face.vertices.map(n => P(n));
    const d = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    out.push(`<polygon points="${d}" fill="#eaf1fa" stroke="none"/>`);
  }
  return out;
};

/** Ghi chú dưới hình — đã escape, phân số đã vulgar hoá (⅓ ⅔…). */
const noteText = (text: string): string =>
  `<text x="${W / 2}" y="${H - 16}" ${FONT} font-size="28" fill="#333" text-anchor="middle">${esc(beautifyFractions(text))}</text>`;

/** Dấu góc vuông tại đỉnh v, giữa 2 tia hướng tới a và b. */
const rightAngleMark = (v: [number, number], a: [number, number], b: [number, number], size = 24): string => {
  const l1 = Math.hypot(a[0] - v[0], a[1] - v[1]);
  const l2 = Math.hypot(b[0] - v[0], b[1] - v[1]);
  if (!l1 || !l2) return '';
  const u1 = [(a[0] - v[0]) / l1, (a[1] - v[1]) / l1];
  const u2 = [(b[0] - v[0]) / l2, (b[1] - v[1]) / l2];
  const p1 = [v[0] + u1[0] * size, v[1] + u1[1] * size];
  const p2 = [p1[0] + u2[0] * size, p1[1] + u2[1] * size];
  const p3 = [v[0] + u2[0] * size, v[1] + u2[1] * size];
  return `<polyline points="${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)} ${p3[0].toFixed(1)},${p3[1].toFixed(1)}" fill="none" stroke="${INK}" stroke-width="2.2"/>`;
};

type Pt = [number, number];

/**
 * Vẽ khối 3D bằng PHÉP CHIẾU (thay vẽ tay): nét liền/đứt do projectSolid tự tính
 * theo pháp tuyến mặt, nhãn đẩy ra ngoài tâm nên không đè cạnh.
 * Đây là đường chuẩn SGK — sửa lỗi D nằm trên SB (28/10).
 */
const drawSolid = (solid: Solid, note?: string): string => {
  const { proj } = bestProjection(solid);
  const { minX, minY, maxX, maxY } = proj.bbox;
  const padX = 100, padTop = 70, padBottom = note ? 110 : 70;
  const availW = W - padX * 2;
  const availH = H - padTop - padBottom;
  const sc = Math.min(availW / (maxX - minX || 1), availH / (maxY - minY || 1));
  const ox = (W - (maxX - minX) * sc) / 2 - minX * sc;
  const oy = padTop + (availH - (maxY - minY) * sc) / 2 - minY * sc;
  const P = (n: string): Pt => [proj.points[n][0] * sc + ox, proj.points[n][1] * sc + oy];
  // Tô mặt nhìn thấy TRƯỚC, rồi mới vẽ cạnh lên trên.
  const parts: string[] = fillVisibleFaces(proj, P);
  for (const e of proj.edges) {
    const a = P(e.a), b = P(e.b);
    parts.push(line(a[0], a[1], b[0], b[1], e.dashed));
  }
  // Nhãn: chọn hướng xa MỌI cạnh nhất (không chỉ xa tâm) để không đè lên đường.
  const edgeSegs: Array<[Pt, Pt]> = proj.edges.map(e => [P(e.a), P(e.b)]);
  for (const n of Object.keys(proj.points)) {
    parts.push(labelAvoidingEdges(P(n), edgeSegs, n));
  }
  if (note) parts.push(noteText(note));
  return parts.join('\n');
};

/**
 * Đặt nhãn sao cho KHÔNG đè lên bất kỳ cạnh nào: thử 8 hướng quanh đỉnh, chọn hướng
 * xa cạnh nhất. Bản cũ chỉ đẩy ra xa TÂM nên nhãn B rơi đúng lên cạnh SC (lỗi 28/10).
 */
const labelAvoidingEdges = (p: Pt, edges: Array<[Pt, Pt]>, text: string, size = 34): string => {
  const distToSeg = (q: Pt, a: Pt, b: Pt): number => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    if (!len2) return Math.hypot(q[0] - a[0], q[1] - a[1]);
    let t = ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(q[0] - (a[0] + t * dx), q[1] - (a[1] + t * dy));
  };
  let best: Pt = [p[0], p[1] - 40];
  let bestScore = -Infinity;
  for (let i = 0; i < 8; i += 1) {
    const ang = (Math.PI * 2 * i) / 8;
    const cand: Pt = [p[0] + Math.cos(ang) * 42, p[1] + Math.sin(ang) * 42];
    // Điểm thấp nhất trong các khoảng cách tới mọi cạnh = mức an toàn của hướng này.
    let minD = Infinity;
    for (const [a, b] of edges) minD = Math.min(minD, distToSeg(cand, a, b));
    if (minD > bestScore) { bestScore = minD; best = cand; }
  }
  return label(best[0], best[1] + 10, text, size);
};

/** Chóp: đáy vuông/tam giác. apexAt='A' → S đứng trên A (đề "SA ⊥ đáy");
 *  apexAt='center' (mặc định) → S trên tâm O (chóp đều). Chọn SAI là vẽ sai đề. */
const pyramid = (base: 'square' | 'triangle', apexAt: 'center' | 'A', note?: string): string => {
  const parts: string[] = [];
  const solid = base === 'triangle'
    ? SOLIDS.pyramidTriangle()
    : apexAt === 'A' ? SOLIDS.pyramidApexAtA() : SOLIDS.pyramidSquare();
  const { proj } = bestProjection(solid);
  const { minX, minY, maxX, maxY } = proj.bbox;
  const padX = 100, padTop = 70, padBottom = note ? 110 : 70;
  const sc = Math.min((W - padX * 2) / (maxX - minX || 1), (H - padTop - padBottom) / (maxY - minY || 1));
  const ox = (W - (maxX - minX) * sc) / 2 - minX * sc;
  const oy = padTop + ((H - padTop - padBottom) - (maxY - minY) * sc) / 2 - minY * sc;
  const P = (n: string): Pt => [proj.points[n][0] * sc + ox, proj.points[n][1] * sc + oy];
  // Tô mặt nhìn thấy TRƯỚC, rồi mới vẽ cạnh lên trên.
  parts.push(...fillVisibleFaces(proj, P));
  for (const e of proj.edges) {
    const a = P(e.a), b = P(e.b);
    parts.push(line(a[0], a[1], b[0], b[1], e.dashed));
  }
  // Chỉ vẽ đường cao S→O + dấu góc vuông khi S nằm trên tâm (chóp đều).
  // Với apexAt='A', SA CHÍNH LÀ đường cao nên không có O riêng.
  const hasO = 'O' in proj.points;
  if (hasO) {
    const S = P('S'), O = P('O'), A = P('A');
    parts.push(line(S[0], S[1], O[0], O[1], true));
    parts.push(rightAngleMark(O, S, A));
  } else {
    // apexAt='A': đánh dấu góc vuông tại A giữa SA và AB (thể hiện SA ⊥ đáy).
    parts.push(rightAngleMark(P('A'), P('S'), P('B')));
  }
  const edgeSegs: Array<[Pt, Pt]> = proj.edges.map(e => [P(e.a), P(e.b)]);
  for (const n of Object.keys(proj.points)) {
    parts.push(labelAvoidingEdges(P(n), edgeSegs, n, n === 'O' ? 30 : 34));
  }
  if (note) parts.push(noteText(note));
  return parts.join('\n');
};

/** Lăng trụ đứng / hộp chữ nhật — dùng phép chiếu chuẩn SGK. */
const prism = (note?: string): string => drawSolid(SOLIDS.prism(), note);

/** Hộp chữ nhật / lập phương ABCD.A'B'C'D' — dùng phép chiếu chuẩn SGK. */
const box = (note?: string): string => drawSolid(SOLIDS.box(), note);

const cylinder = (note?: string): string => {
  const cx = 400, rx = 200, ry = 52, top = 150, bottom = 490;
  const parts = [
    ellipse(cx, top, rx, ry),
    halfEllipse(cx, bottom, rx, ry, 'top', true),
    halfEllipse(cx, bottom, rx, ry, 'bottom'),
    line(cx - rx, top, cx - rx, bottom),
    line(cx + rx, top, cx + rx, bottom),
    // Trục (đường cao h) + bán kính r — nét đứt, đúng SGK
    line(cx, top, cx, bottom, true),
    line(cx, top, cx + rx, top, true),
    label(cx + rx / 2, top - 18, 'r', 30),
    label(cx + 24, (top + bottom) / 2, 'h', 30),
    label(cx + 22, bottom + 30, 'O', 30),
  ];
  if (note) parts.push(noteText(note));
  return parts.join('\n');
};

const cone = (note?: string): string => {
  const cx = 400, rx = 210, ry = 54, baseY = 500, sy = 110;
  const parts = [
    halfEllipse(cx, baseY, rx, ry, 'top', true),
    halfEllipse(cx, baseY, rx, ry, 'bottom'),
    line(cx, sy, cx - rx, baseY),
    line(cx, sy, cx + rx, baseY),
    // Trục (đường cao h) + bán kính r + dấu góc vuông tại O giữa h và r
    line(cx, sy, cx, baseY, true),
    line(cx, baseY, cx + rx, baseY, true),
    rightAngleMark([cx, baseY], [cx, sy], [cx + rx, baseY]),
    label(cx + rx / 2, baseY - 20, 'r', 30),
    label(cx + 24, (sy + baseY) / 2, 'h', 30),
    label(cx, sy - 24, 'S'),
    label(cx + 22, baseY + 34, 'O', 30),
  ];
  if (note) parts.push(noteText(note));
  return parts.join('\n');
};

const sphere = (note?: string): string => {
  const cx = 400, cy = 280, r = 200;
  const parts = [
    ellipse(cx, cy, r, r),
    halfEllipse(cx, cy, r, 48, 'top', true),
    halfEllipse(cx, cy, r, 48, 'bottom'),
    line(cx, cy, cx + r, cy, true),
    label(cx + r / 2, cy - 18, 'R', 30),
    label(cx + 24, cy + 30, 'O', 30),
  ];
  if (note) parts.push(noteText(note));
  return parts.join('\n');
};

/** Định dạng số trục: bỏ số 0 lẻ, tối đa 1 chữ số thập phân. */
const fmtTick = (v: number): string => {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : String(r);
};

/** Đồ thị hàm số: trục có mũi tên + lưới + đường qua các điểm AI đưa. */
const graph = (spec: Extract<GeometrySpec, { shape: 'graph' }>, note?: string): string => {
  const [x0, x1] = spec.xrange ?? [-5, 5];
  const [y0, y1] = spec.yrange ?? [-5, 5];
  const px0 = 100, px1 = 760, py0 = 60, py1 = 560;
  const sx = (x: number): number => px0 + ((x - x0) / (x1 - x0)) * (px1 - px0);
  const sy = (y: number): number => py1 - ((y - y0) / (y1 - y0)) * (py1 - py0);
  const parts: string[] = [];
  // Lưới nhạt (chuẩn §17.1: #E5E7EB, nhạt hơn trục và đồ thị)
  for (let i = 1; i < 6; i += 1) {
    const gx = px0 + (i * (px1 - px0)) / 6;
    const gy = py0 + (i * (py1 - py0)) / 6;
    parts.push(
      `<line x1="${gx}" y1="${py0}" x2="${gx}" y2="${py1}" stroke="${GRID_INK}" stroke-width="1.5"/>`,
      `<line x1="${px0}" y1="${gy}" x2="${px1}" y2="${gy}" stroke="${GRID_INK}" stroke-width="1.5"/>`,
    );
  }
  // Trục Oxy: qua điểm 0 nếu có trong khung, không thì bám mép.
  const ox = x0 <= 0 && x1 >= 0 ? sx(0) : (x0 > 0 ? px0 : px1);
  const oy = y0 <= 0 && y1 >= 0 ? sy(0) : (y0 > 0 ? py1 : py0);
  parts.push(
    `<line x1="${px0 - 10}" y1="${oy}" x2="${px1 + 22}" y2="${oy}" stroke="${INK}" stroke-width="3"/>`,
    `<line x1="${ox}" y1="${py1 + 10}" x2="${ox}" y2="${py0 - 22}" stroke="${INK}" stroke-width="3"/>`,
    `<polygon points="${px1 + 22},${oy} ${px1 + 8},${oy - 7} ${px1 + 8},${oy + 7}" fill="${INK}"/>`,
    `<polygon points="${ox},${py0 - 22} ${ox - 7},${py0 - 8} ${ox + 7},${py0 - 8}" fill="${INK}"/>`,
  );
  // Vạch số trên trục (5 vạch mỗi trục, bỏ trùng 0 ở gốc).
  for (let i = 0; i <= 6; i += 1) {
    const vx = x0 + (i * (x1 - x0)) / 6;
    const vy = y1 - (i * (y1 - y0)) / 6;
    const sxv = sx(vx), syv = sy(vy);
    const nearOriginX = Math.abs(sxv - ox) < 14;
    const nearOriginY = Math.abs(syv - oy) < 14;
    if (!nearOriginX) {
      parts.push(
        `<line x1="${sxv}" y1="${oy - 6}" x2="${sxv}" y2="${oy + 6}" stroke="${INK}" stroke-width="2"/>`,
        `<text x="${sxv}" y="${oy + 30}" ${FONT} font-size="24" fill="${INK}" text-anchor="middle">${fmtTick(vx)}</text>`,
      );
    }
    if (!nearOriginY) {
      parts.push(
        `<line x1="${ox - 6}" y1="${syv}" x2="${ox + 6}" y2="${syv}" stroke="${INK}" stroke-width="2"/>`,
        `<text x="${ox - 14}" y="${syv + 8}" ${FONT} font-size="24" fill="${INK}" text-anchor="end">${fmtTick(vy)}</text>`,
      );
    }
  }
  // Tên trục + gốc O
  const xName = spec.xlabel ?? 'x';
  const yName = spec.ylabel ?? 'y';
  parts.push(
    label(px1 + 10, oy + 42, xName, 30),
    label(ox + 34, py0 - 2, yName, 30),
  );
  if (x0 <= 0 && x1 >= 0 && y0 <= 0 && y1 >= 0) parts.push(label(ox - 20, oy + 32, 'O', 28));
  // Đường cong + điểm
  const pts = spec.points.map(([x, y]) => [sx(x), sy(y)] as Pt);
  parts.push(
    `<clipPath id="gplot"><rect x="${px0}" y="${py0}" width="${px1 - px0}" height="${py1 - py0}"/></clipPath>`,
    `<polyline points="${pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" clip-path="url(#gplot)"/>`,
    ...pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="6" fill="${INK}"/>`),
  );
  if (note) parts.push(noteText(note));
  return parts.join('\n');
};

/** Bảng số liệu (thống kê — mẫu số liệu, tần suất...). */
const table = (spec: Extract<GeometrySpec, { shape: 'table' }>, note?: string): string => {
  const head = spec.head;
  const rows = spec.rows;
  const font = 26;
  const colW = head.map((h, i) => {
    const lens = [h.length, ...rows.map(r => (r[i] ?? '').length)];
    return Math.max(100, Math.max(...lens) * 17 + 36);
  });
  const total = colW.reduce((a, b) => a + b, 0);
  const startX = Math.max(20, (W - total) / 2);
  const headH = 62, rowH = 58;
  const startY = 90;
  const bottom = startY + headH + rows.length * rowH;
  const parts: string[] = [];
  // Khung ngoài + dòng ngang
  parts.push(`<rect x="${startX}" y="${startY}" width="${total}" height="${bottom - startY}" fill="#ffffff" stroke="${INK}" stroke-width="2.5"/>`);
  for (let i = 0; i <= rows.length; i += 1) {
    const y = startY + headH + i * rowH;
    parts.push(`<line x1="${startX}" y1="${y}" x2="${startX + total}" y2="${y}" stroke="${INK}" stroke-width="2"/>`);
  }
  // Cột dọc
  let accX = startX;
  for (let i = 0; i <= head.length; i += 1) {
    parts.push(`<line x1="${accX}" y1="${startY}" x2="${accX}" y2="${bottom}" stroke="${INK}" stroke-width="2"/>`);
    if (i < head.length) {
      const cw = colW[i];
      const cx = accX + cw / 2;
      // Hàng đầu in đậm
      parts.push(label(cx, startY + 42, esc(beautifyFractions(head[i])), 28));
      rows.forEach((row, ri) => {
        parts.push(label(cx, startY + headH + ri * rowH + 39, esc(beautifyFractions(row[i] ?? '')), font));
      });
      accX += cw;
    }
  }
  if (note) parts.push(noteText(note));
  return parts.join('\n');
};

/** Biểu đồ cột (thống kê tần suất...). */
const bar = (spec: Extract<GeometrySpec, { shape: 'bar' }>, note?: string): string => {
  const n = spec.labels.length;
  const left = 110, right = 760, baseline = 520, topY = 110;
  const maxV = Math.max(...spec.values, 1);
  const slot = (right - left) / n;
  const barW = Math.min(90, slot * 0.6);
  const parts: string[] = [];
  // 2 trục
  parts.push(
    `<line x1="${left}" y1="${baseline}" x2="${right + 20}" y2="${baseline}" stroke="${INK}" stroke-width="3"/>`,
    `<line x1="${left}" y1="${baseline}" x2="${left}" y2="${topY - 30}" stroke="${INK}" stroke-width="3"/>`,
    `<polygon points="${right + 20},${baseline} ${right + 6},${baseline - 7} ${right + 6},${baseline + 7}" fill="${INK}"/>`,
    `<polygon points="${left},${topY - 30} ${left - 7},${topY - 16} ${left + 7},${topY - 16}" fill="${INK}"/>`,
  );
  if (spec.ylabel) parts.push(`<text x="${left - 60}" y="${topY - 4}" ${FONT} font-size="26" fill="${INK}" text-anchor="start">${esc(spec.ylabel)}</text>`);
  spec.labels.forEach((lab, i) => {
    const v = spec.values[i];
    const hPx = Math.max(2, ((v / maxV) * (baseline - topY)));
    const x = left + slot * i + (slot - barW) / 2;
    parts.push(
      `<rect x="${x.toFixed(1)}" y="${(baseline - hPx).toFixed(1)}" width="${barW.toFixed(1)}" height="${hPx.toFixed(1)}" fill="#dbe7f6" stroke="${INK}" stroke-width="2.5"/>`,
      `<text x="${(x + barW / 2).toFixed(1)}" y="${(baseline - hPx - 12).toFixed(1)}" ${FONT} font-size="28" font-weight="700" fill="${INK}" text-anchor="middle">${fmtTick(v)}</text>`,
      `<text x="${(left + slot * i + slot / 2).toFixed(1)}" y="${baseline + 42}" ${FONT} font-size="26" fill="${INK}" text-anchor="middle">${esc(lab)}</text>`,
    );
  });
  if (note) parts.push(noteText(note));
  return parts.join('\n');
};

/** DSL → chuỗi SVG hoàn chỉnh. DSL không hợp lệ → null. */
export const geometrySvg = (spec: GeometrySpec | null | undefined): string | null => {
  if (!spec || typeof spec !== 'object') return null;
  const body = (() => {
    try {
      switch (spec.shape) {
        case 'pyramid': return pyramid(spec.base === 'triangle' ? 'triangle' : 'square', spec.apexAt === 'A' ? 'A' : 'center', spec.note);
        case 'prism': return prism(spec.note);
        case 'box': return box(spec.note);
        case 'cylinder': return cylinder(spec.note);
        case 'cone': return cone(spec.note);
        case 'sphere': return sphere(spec.note);
        case 'graph': return graph(spec as Extract<GeometrySpec, { shape: 'graph' }>, spec.note);
        case 'table': return table(spec as Extract<GeometrySpec, { shape: 'table' }>, spec.note);
        case 'bar': return bar(spec as Extract<GeometrySpec, { shape: 'bar' }>, spec.note);
        default: return null;
      }
    } catch {
      // DSL thiếu/dư trường → không được làm sập nhánh chat; trả null để fallback text.
      return null;
    }
  })();
  if (!body) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n<rect width="${W}" height="${H}" fill="#ffffff"/>\n${body}\n</svg>`;
};
