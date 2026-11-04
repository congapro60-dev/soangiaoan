import { OMR_TEMPLATES, type OmrTemplate } from './omrTemplates';

/**
 * Chấm phiếu tô mẫu Bộ 2025 bằng code — không gọi AI, mỗi lần chạy ra đúng một kết quả.
 *
 * Cơ chế giống các app chấm phiếu (TN Maker…): tìm 4 ô vuông đen ở góc → nắn phối cảnh về toạ độ
 * mẫu → đo độ đậm từng ô tròn → so ô trong cùng câu. Hai lớp tách nét chấm của GV:
 *  - bỏ hẳn điểm ảnh ĐỎ (bút chấm), kể cả vạch đỏ cắt ngang cột ô;
 *  - chỉ đo lõi ô (55% bán kính): ô HS tô là đĩa đặc, dấu ✓/gạch của GV chỉ là nét mảnh.
 * Câu không chắc (tô 2 ô, tô mờ, nét đỏ phủ gần hết ô) → độ tin thấp để GV soát, không đoán.
 */

export interface RgbaImage { width: number; height: number; data: Uint8ClampedArray | Uint8Array }

export interface PreparedImage {
  w: number; h: number;
  /** Độ sáng so với nền giấy quanh đó (0 đen – 1 trắng): đã san đều bóng tối, vệt sáng. */
  norm: Float32Array;
  /** Nền giấy ước lượng (0–255) — dùng để "scan" ảnh. */
  bg: Float32Array;
  red: Uint8Array;
  src: RgbaImage;
}

type Pt = { x: number; y: number };
type Homography = (u: number, v: number) => Pt;

export interface OmrChoice { q: number; answer: string | null; confidence: number }
export interface OmrTrueFalse { q: number; items: Record<'a' | 'b' | 'c' | 'd', 'Đ' | 'S' | null>; confidence: number }
export interface OmrSheet {
  form: OmrTemplate['id'];
  /** Tỉ lệ ô vuông định vị khớp mẫu (0–1). */
  alignment: number;
  examCode: string | null;
  studentCode: string | null;
  mcq: OmrChoice[];
  trueFalse: OmrTrueFalse[];
  shortAnswer: OmrChoice[];
}

const FILL = 0.45;   // lõi ô phủ ≥ 45% điểm tối → em tô
const WEAK = 0.3;    // 30–45% → tô mờ / tẩy dở → không chắc (dưới 30% là nhiễu giấy, bóng)
const DARK = 0.55;   // độ sáng tương đối dưới mức này coi là nét chì

export const isRedInk = (r: number, g: number, b: number) => r > 110 && r - g > 45 && r - b > 30;

/** Độ sáng + nền giấy + mặt nạ bút đỏ. Nền = sáng nhất mỗi khối, nới 1 khối, làm mượt, nội suy. */
export const prepareImage = (src: RgbaImage): PreparedImage => {
  const { width: w, height: h, data } = src;
  const lum = new Float32Array(w * h), red = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    red[i] = isRedInk(r, g, b) ? 1 : 0;
  }
  const B = Math.max(8, Math.round(Math.max(w, h) / 48));
  const bw = Math.ceil(w / B), bh = Math.ceil(h / B);
  const blk = new Float32Array(bw * bh);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, k = Math.floor(y / B) * bw + Math.floor(x / B);
    // Nét đỏ sáng hơn chì nhưng không phải giấy: không dùng làm nền.
    if (!red[i] && lum[i] > blk[k]) blk[k] = lum[i];
  }
  const grow = new Float32Array(bw * bh), smooth = new Float32Array(bw * bh);
  const around = (src2: Float32Array, out: Float32Array, pick: (vals: number[]) => number) => {
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const vals: number[] = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < bh && xx >= 0 && xx < bw) vals.push(src2[yy * bw + xx]);
      }
      out[y * bw + x] = pick(vals);
    }
  };
  around(blk, grow, v => Math.max(...v));
  around(grow, smooth, v => v.reduce((s, n) => s + n, 0) / v.length);
  const bg = new Float32Array(w * h), norm = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const fy = Math.min(bh - 1, Math.max(0, y / B - 0.5)), y0 = Math.floor(fy), y1 = Math.min(bh - 1, y0 + 1), ty = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = Math.min(bw - 1, Math.max(0, x / B - 0.5)), x0 = Math.floor(fx), x1 = Math.min(bw - 1, x0 + 1), tx = fx - x0;
      const top = smooth[y0 * bw + x0] * (1 - tx) + smooth[y0 * bw + x1] * tx;
      const bot = smooth[y1 * bw + x0] * (1 - tx) + smooth[y1 * bw + x1] * tx;
      const i = y * w + x, v = Math.max(40, top * (1 - ty) + bot * ty);
      bg[i] = v;
      norm[i] = Math.min(1, lum[i] / v);
    }
  }
  return { w, h, norm, bg, red, src };
};

type Mat = number[]; // 3×3, theo hàng

/** Ma trận ánh xạ hình vuông đơn vị → tứ giác (Heckbert): (0,0)=TL, (1,0)=TR, (1,1)=BR, (0,1)=BL. */
const squareToQuad = (tl: Pt, tr: Pt, br: Pt, bl: Pt): Mat => {
  const dx1 = tr.x - br.x, dx2 = bl.x - br.x, sx = tl.x - tr.x + br.x - bl.x;
  const dy1 = tr.y - br.y, dy2 = bl.y - br.y, sy = tl.y - tr.y + br.y - bl.y;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
  return [tr.x - tl.x + g * tr.x, bl.x - tl.x + h * bl.x, tl.x, tr.y - tl.y + g * tr.y, bl.y - tl.y + h * bl.y, tl.y, g, h, 1];
};
const mul = (A: Mat, B: Mat): Mat => Array.from({ length: 9 }, (_, k) => {
  const r = Math.floor(k / 3), c = k % 3;
  return A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
});
const inv = (m: Mat): Mat => {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = f * g - d * i, C = d * h - e * g, det = a * A + b * B + c * C || 1e-12;
  return [A, c * h - b * i, b * f - c * e, B, a * i - c * g, c * d - a * f, C, b * g - a * h, a * e - b * d].map(x => x / det);
};
const apply = (m: Mat): Homography => (u, v) => {
  const z = m[6] * u + m[7] * v + m[8];
  return { x: (m[0] * u + m[1] * v + m[2]) / z, y: (m[3] * u + m[4] * v + m[5]) / z };
};

export const unitSquareHomography = (tl: Pt, tr: Pt, br: Pt, bl: Pt): Homography => apply(squareToQuad(tl, tr, br, bl));

/** Bốn điểm theo thứ tự TL, TR, BR, BL (theo vị trí), hoặc null nếu trùng vai. */
const orderQuad = <T extends Pt>(four: T[]): [T, T, T, T] | null => {
  const by = (f: (b: T) => number) => four.reduce((m, b) => (f(b) > f(m) ? b : m));
  const q: [T, T, T, T] = [by(b => -(b.x + b.y)), by(b => b.x - b.y), by(b => b.x + b.y), by(b => b.y - b.x)];
  return new Set(q).size === 4 ? q : null;
};

interface Blob { x: number; y: number; side: number; area: number }

/** Các đốm đen gần vuông, đặc — ứng viên ô vuông định vị. */
const squareBlobs = (p: PreparedImage): Blob[] => {
  const { w, h, norm, red } = p;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = norm[i] < 0.5 && !red[i] ? 1 : 0;
  const queue = new Int32Array(w * h), out: Blob[] = [];
  const minSide = Math.min(w, h) * 0.006, maxSide = Math.max(w, h) * 0.05;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    let head = 0, tail = 1, x0 = w, y0 = h, x1 = 0, y1 = 0;
    queue[0] = i; mask[i] = 0;
    while (head < tail) {
      const k = queue[head++], x = k % w, y = (k - x) / w;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && mask[k - 1]) { mask[k - 1] = 0; queue[tail++] = k - 1; }
      if (x < w - 1 && mask[k + 1]) { mask[k + 1] = 0; queue[tail++] = k + 1; }
      if (y > 0 && mask[k - w]) { mask[k - w] = 0; queue[tail++] = k - w; }
      if (y < h - 1 && mask[k + w]) { mask[k + w] = 0; queue[tail++] = k + w; }
    }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    if (bw < minSide || bw > maxSide || bh / bw < 0.7 || bh / bw > 1.4 || tail / (bw * bh) < 0.75) continue;
    out.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, side: (bw + bh) / 2, area: tail });
  }
  return out;
};

/** Tỉ lệ điểm tối (không tính nét đỏ) trong đĩa bán kính rr quanh c, kèm tỉ lệ bị đỏ phủ. */
const diskStats = (p: PreparedImage, c: Pt, rr: number) => {
  let n = 0, dark = 0, red = 0;
  // Phép nắn suy biến (bộ ghép sai) cho bán kính vô lý → coi như trượt, không quét cả ảnh.
  if (!Number.isFinite(rr) || !Number.isFinite(c.x) || !Number.isFinite(c.y) || rr > Math.max(p.w, p.h) * 0.05) return { fill: 0, redShare: 0 };
  const R = Math.max(1, rr), R2 = R * R;
  for (let dy = -Math.ceil(R); dy <= R; dy++) for (let dx = -Math.ceil(R); dx <= R; dx++) {
    if (dx * dx + dy * dy > R2) continue;
    const x = Math.round(c.x + dx), y = Math.round(c.y + dy);
    if (x < 0 || y < 0 || x >= p.w || y >= p.h) continue;
    const i = y * p.w + x;
    if (p.red[i]) { red++; continue; }
    n++; if (p.norm[i] < DARK) dark++;
  }
  return { fill: n ? dark / n : 0, redShare: n + red ? red / (n + red) : 1 };
};

const pxPerUnit = (H: Homography, u: number, v: number) => {
  const a = H(u, v), b = H(u + 0.01, v);
  return Math.hypot(b.x - a.x, b.y - a.y) / 0.01;
};

export interface SheetLocation { template: OmrTemplate; H: Homography; alignment: number }

/** Các bộ 4 ô vuông lớn của mẫu (đã xếp TL, TR, BR, BL) — phiếu 12 có 8 ô lớn, ảnh mất góc vẫn còn bộ khác. */
const templateQuads = (t: OmrTemplate) => {
  const maxS = Math.max(...t.marks.map(m => m[2]));
  const big = t.marks.filter(m => m[2] >= maxS * 0.75).map(([u, v]) => ({ x: u, y: v * t.aspect, u, v }));
  const out: { quad: [Pt, Pt, Pt, Pt]; ratio: number }[] = [];
  for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++)
    for (let k = j + 1; k < big.length; k++) for (let l = k + 1; l < big.length; l++) {
      const q = orderQuad([big[i], big[j], big[k], big[l]]);
      if (!q) continue;
      const width = Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y), height = Math.hypot(q[3].x - q[0].x, q[3].y - q[0].y);
      if (width < 0.4 || height < 0.4) continue; // bộ quá hẹp: sai số phối cảnh lớn
      out.push({ quad: q.map(b => ({ x: b.u, y: b.v })) as [Pt, Pt, Pt, Pt], ratio: height / width });
    }
  return out;
};
const QUADS = new Map(OMR_TEMPLATES.map(t => [t.id, templateQuads(t)]));

/** Tìm phiếu: thử các bộ 4 đốm vuông lớn nhất ghép với các bộ 4 ô lớn của mẫu; giữ bộ khớp nhiều ô định vị nhất. */
export const locateSheet = (p: PreparedImage): SheetLocation | null => {
  const top = squareBlobs(p).sort((a, b) => b.area - a.area).slice(0, 12);
  let best: SheetLocation | null = null;
  for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++)
    for (let k = j + 1; k < top.length; k++) for (let l = k + 1; l < top.length; l++) {
      const q = orderQuad([top[i], top[j], top[k], top[l]]);
      if (!q) continue;
      const width = Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y), height = Math.hypot(q[3].x - q[0].x, q[3].y - q[0].y);
      if (width < Math.min(p.w, p.h) * 0.25) continue;
      const toImage = squareToQuad(...q);
      for (const template of OMR_TEMPLATES) {
        for (const tq of QUADS.get(template.id)!) {
          if (Math.abs(height / width / tq.ratio - 1) > 0.2) continue;
          const H = apply(mul(toImage, inv(squareToQuad(...tq.quad))));
          // Dừng sớm khi đã trượt quá 1/4 ô định vị: bộ ghép sai bị loại sau vài phép đo.
          const allowMiss = Math.floor(template.marks.length * 0.25);
          let hits = 0, miss = 0;
          for (const [u, v, s] of template.marks) {
            if (diskStats(p, H(u, v), s * pxPerUnit(H, u, v) * 0.3).fill >= 0.6) hits++;
            else if (++miss > allowMiss) break;
          }
          if (miss > allowMiss) continue;
          const alignment = hits / template.marks.length;
          if (!best || alignment > best.alignment) best = { template, H, alignment };
          if (alignment === 1) return refineLocation(p, best);
        }
      }
    }
  return best && best.alignment >= 0.75 ? refineLocation(p, best) : null;
};

/**
 * Giấy cong / chụp gần: một phép nắn cho cả tờ lệch vài điểm ảnh ở từng vùng. Đo vị trí thật của
 * từng ô vuông định vị, rồi mỗi điểm trên phiếu được kéo theo độ lệch của các ô vuông gần nó nhất.
 */
const refineLocation = (p: PreparedImage, loc: SheetLocation): SheetLocation => {
  const { template, H } = loc;
  const shifts: { u: number; v: number; dx: number; dy: number }[] = [];
  for (const [u, v, s] of template.marks) {
    const c = H(u, v), side = s * pxPerUnit(H, u, v), R = Math.ceil(side * 1.2);
    let n = 0, sx = 0, sy = 0;
    for (let y = Math.round(c.y) - R; y <= c.y + R; y++) for (let x = Math.round(c.x) - R; x <= c.x + R; x++) {
      if (x < 0 || y < 0 || x >= p.w || y >= p.h) continue;
      const i = y * p.w + x;
      if (!p.red[i] && p.norm[i] < 0.5) { n++; sx += x; sy += y; }
    }
    // Đủ đậm cỡ một ô vuông và không lẫn chữ quanh đó (quá đậm = dính nét khác).
    if (n >= side * side * 0.6 && n <= side * side * 1.6) shifts.push({ u, v, dx: sx / n - c.x, dy: sy / n - c.y });
  }
  if (shifts.length < 4) return loc;
  const aspect = template.aspect;
  const refined: Homography = (u, v) => {
    const c = H(u, v);
    const near = shifts.map(m => ({ m, d: (m.u - u) ** 2 + ((m.v - v) * aspect) ** 2 })).sort((a, b) => a.d - b.d).slice(0, 4);
    let wsum = 0, dx = 0, dy = 0;
    for (const { m, d } of near) { const wgt = 1 / (d + 1e-4); wsum += wgt; dx += m.dx * wgt; dy += m.dy * wgt; }
    return { x: c.x + dx / wsum, y: c.y + dy / wsum };
  };
  return { ...loc, H: refined };
};

type Fill = { fill: number; redShare: number };

/** Chọn đúng một ô trong nhóm. Không ô nào tô / tô hai ô / tô mờ → null hoặc độ tin thấp. */
const pick = (opts: [string, Fill | undefined][]): { value: string | null; confidence: number } => {
  const known = opts.filter((o): o is [string, Fill] => !!o[1]).sort((a, b) => b[1].fill - a[1].fill);
  if (!known.length) return { value: null, confidence: 0 };
  const marked = known.filter(o => o[1].fill >= FILL);
  const runnerUp = known[marked.length]?.[1].fill ?? 0;
  if (marked.length === 1) {
    const covered = marked[0][1].redShare > 0.5;
    // So tương đối trong câu (như app chấm phiếu): ô tô phải đậm hơn hẳn ô kế tiếp; nét ✓ chấm của GV
    // trong ô (ảnh nhỏ làm nhạt màu đỏ) chỉ đạt ~30–40%, ô tô thật ≥ 70%.
    return { value: marked[0][0], confidence: runnerUp < 0.4 && marked[0][1].fill - runnerUp >= 0.4 && !covered ? 0.95 : 0.5 };
  }
  if (marked.length > 1) return { value: null, confidence: 0.2 };
  // Chì nhạt: không ô nào đủ đậm nhưng đúng một ô hơn hẳn phần còn lại (gần như trắng) → nhận, độ tin vừa.
  if (known[0][1].fill >= WEAK && (known[1]?.[1].fill ?? 0) < 0.1) return { value: known[0][0], confidence: 0.6 };
  return { value: null, confidence: known[0][1].fill < WEAK ? 0.95 : 0.3 };
};

/**
 * Kéo tâm ô về đúng vòng tròn in sẵn (lệch tối đa 40% bán kính): vòng in luôn có, dù ô tô hay trống.
 * Cần khi ảnh nhỏ — lệch 1–2 điểm ảnh đã đủ làm lõi ô lọt ra ngoài.
 */
const snapToRing = (p: PreparedImage, c: Pt, rr: number): Pt => {
  const ring = Array.from({ length: 16 }, (_, k) => [Math.cos(k * Math.PI / 8) * rr, Math.sin(k * Math.PI / 8) * rr]);
  const step = Math.max(1, rr * 0.15), lim = rr * 0.4;
  let best = c, bestScore = -1, bestDist = 0;
  for (let dy = -lim; dy <= lim + 1e-9; dy += step) for (let dx = -lim; dx <= lim + 1e-9; dx += step) {
    let score = 0;
    for (const [rx, ry] of ring) {
      const x = Math.round(c.x + dx + rx), y = Math.round(c.y + dy + ry);
      if (x < 0 || y < 0 || x >= p.w || y >= p.h) continue;
      const i = y * p.w + x;
      if (!p.red[i] && p.norm[i] < 0.75) score++;
    }
    const dist = dx * dx + dy * dy;
    if (score > bestScore || (score === bestScore && dist < bestDist)) { best = { x: c.x + dx, y: c.y + dy }; bestScore = score; bestDist = dist; }
  }
  return best;
};

/** Độ phủ lõi từng ô tròn của mẫu (khoá ô → tỉ lệ tối, tỉ lệ bị nét đỏ che). */
export const measureCells = (p: PreparedImage, loc: SheetLocation): Map<string, Fill> => {
  const { template, H } = loc;
  const fills = new Map<string, Fill>();
  for (const [key, u, v] of template.cells) {
    const c = H(u, v), rr = template.r * pxPerUnit(H, u, v);
    fills.set(key, diskStats(p, snapToRing(p, c, rr), rr * 0.55));
  }
  return fills;
};

export const readSheet = (p: PreparedImage, loc: SheetLocation): OmrSheet => {
  const { template } = loc;
  const fills = measureCells(p, loc);
  const f = (k: string) => fills.get(k);
  const digits = (prefix: string, cols: number) => {
    const out: string[] = [];
    for (let c = 0; c < cols; c++) {
      const r = pick(Array.from({ length: 10 }, (_, d) => [String(d), f(`${prefix}.${c}.${d}`)]));
      // Mã đề/SBD: máy chủ còn đối chiếu với danh sách mã có thật nên nhận cả ô tô nhạt.
      if (!r.value || r.confidence < 0.6) return null;
      out.push(r.value);
    }
    return out.join('');
  };
  const mcq = Array.from({ length: 40 }, (_, i) => {
    const r = pick(['A', 'B', 'C', 'D'].map(o => [o, f(`I.${i + 1}.${o}`)]));
    return { q: i + 1, answer: r.value, confidence: r.confidence };
  });
  const trueFalse = Array.from({ length: 8 }, (_, i) => {
    let confidence = 1;
    const items = {} as OmrTrueFalse['items'];
    for (const s of ['a', 'b', 'c', 'd'] as const) {
      const r = pick([['Đ', f(`II.${i + 1}.${s}.D`)], ['S', f(`II.${i + 1}.${s}.S`)]]);
      items[s] = r.value as 'Đ' | 'S' | null;
      confidence = Math.min(confidence, r.confidence);
    }
    return { q: i + 1, items, confidence };
  });
  const shortAnswer = Array.from({ length: 6 }, (_, i) => {
    const q = i + 1, chars: string[] = [];
    let confidence = 1;
    for (let k = 0; k < 4; k++) {
      const opts: [string, Fill | undefined][] = Array.from({ length: 10 }, (_, d) => [String(d), f(`III.${q}.d${k}.${d}`)]);
      if (k === 0) opts.push(['-', f(`III.${q}.minus`)]);
      if (k === 1 || k === 2) opts.push([',', f(`III.${q}.comma.${k}`)]);
      const r = pick(opts);
      chars.push(r.value || '');
      confidence = Math.min(confidence, r.confidence);
    }
    const text = chars.join('');
    // Ô trống xen giữa ("1_5") hoặc dấu phẩy/trừ đứng sai chỗ → không tự quyết.
    // Em được tô lệch phải ("_100"): bỏ ô trống ĐẦU; chỉ ô trống XEN GIỮA mới là lỗi.
    const lead = chars.findIndex(Boolean);
    const body = lead === -1 ? [] : chars.slice(lead);
    const firstEmpty = body.indexOf('');
    const gap = firstEmpty !== -1 && body.slice(firstEmpty).some(Boolean);
    const valid = /^-?\d+(,\d+)?$/.test(text) && !gap;
    return { q, answer: text || null, confidence: text && !valid ? Math.min(confidence, 0.3) : confidence };
  });
  return { form: template.id, alignment: loc.alignment, examCode: digits('MD', 3), studentCode: digits('SBD', 6), mcq, trueFalse, shortAnswer };
};

/**
 * "Scan" ảnh: chia cho nền giấy để xoá bóng tối, giữ màu (để GV và máy còn nhận ra nét đỏ).
 * Có phiếu → nắn phẳng về khổ phiếu; không có → giữ khung ảnh, chỉ san sáng.
 */
export const scanImage = (p: PreparedImage, loc: SheetLocation | null, outWidth = 1240): RgbaImage => {
  const { src } = p;
  const lift = (i: number, o: Uint8ClampedArray, j: number) => {
    const k = 255 / p.bg[i];
    for (let c = 0; c < 3; c++) o[j * 4 + c] = Math.min(255, src.data[i * 4 + c] * k);
    o[j * 4 + 3] = 255;
  };
  if (!loc) {
    const out = new Uint8ClampedArray(p.w * p.h * 4);
    for (let i = 0; i < p.w * p.h; i++) lift(i, out, i);
    return { width: p.w, height: p.h, data: out };
  }
  // Lề quanh 4 ô góc: ô góc nằm cách mép giấy ~5% bề ngang.
  const m = 0.06;
  const outHeight = Math.round(outWidth * loc.template.aspect);
  const out = new Uint8ClampedArray(outWidth * outHeight * 4);
  for (let y = 0; y < outHeight; y++) for (let x = 0; x < outWidth; x++) {
    const u = -m + (x / (outWidth - 1)) * (1 + 2 * m), v = -m + (y / (outHeight - 1)) * (1 + 2 * m);
    const s = loc.H(u, v), sx = Math.round(s.x), sy = Math.round(s.y), j = y * outWidth + x;
    if (sx < 0 || sy < 0 || sx >= p.w || sy >= p.h) { out.fill(255, j * 4, j * 4 + 4); continue; }
    lift(sy * p.w + sx, out, j);
  }
  return { width: outWidth, height: outHeight, data: out };
};

/** Ảnh tối hoặc sáng không đều (nền giấy chỗ tối nhất < 70% chỗ sáng nhất, hoặc cả tờ tối) → nên "scan". */
export const needsLightFix = (p: PreparedImage): boolean => {
  const sample: number[] = [];
  const step = Math.max(1, Math.floor(p.bg.length / 2000));
  for (let i = 0; i < p.bg.length; i += step) sample.push(p.bg[i]);
  sample.sort((a, b) => a - b);
  const low = sample[Math.floor(sample.length * 0.05)], high = sample[Math.floor(sample.length * 0.95)];
  return low / high < 0.7 || high < 170;
};

/** Một lượt: chuẩn bị → tìm phiếu → đọc. Không phải phiếu mẫu → null (giữ cách chấm cũ). */
export const readAnswerSheet = (img: RgbaImage): OmrSheet | null => {
  const p = prepareImage(img);
  const loc = locateSheet(p);
  return loc ? readSheet(p, loc) : null;
};
