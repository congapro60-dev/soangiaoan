import { describe, expect, it } from 'vitest';
import { OMR_TEMPLATES, type OmrTemplate } from './omrTemplates';
import { readAnswerSheet, prepareImage, locateSheet, scanImage, unitSquareHomography } from './omrSheet';

type Pt = { x: number; y: number };

/** Nghịch đảo ánh xạ đơn vị → tứ giác bằng Newton (đủ cho ảnh test). */
const invert = (H: (u: number, v: number) => Pt, x: number, y: number) => {
  let u = 0.5, v = 0.5;
  for (let i = 0; i < 12; i++) {
    const p = H(u, v), pu = H(u + 1e-4, v), pv = H(u, v + 1e-4);
    const a = (pu.x - p.x) / 1e-4, b = (pv.x - p.x) / 1e-4, c = (pu.y - p.y) / 1e-4, d = (pv.y - p.y) / 1e-4;
    const det = a * d - b * c, ex = x - p.x, ey = y - p.y;
    u += (d * ex - b * ey) / det; v += (a * ey - c * ex) / det;
  }
  return { u, v };
};

interface Draw {
  template: OmrTemplate;
  filled: string[];
  /** Ô có vạch đỏ GV chấm cắt ngang (không tô). */
  redTicks?: string[];
  quad?: [Pt, Pt, Pt, Pt];
  shadow?: boolean;
}

/** Vẽ phiếu tổng hợp: ô vuông đen, vòng ô tròn, ô tô chì xám, vạch đỏ, phối cảnh, bóng tối. */
const render = ({ template, filled, redTicks = [], quad, shadow }: Draw) => {
  const w = 700, h = 980;
  const [tl, tr, br, bl] = quad || [{ x: 60, y: 60 }, { x: 640, y: 70 }, { x: 650, y: 900 }, { x: 50, y: 890 }];
  const H = unitSquareHomography(tl, tr, br, bl);
  const data = new Uint8ClampedArray(w * h * 4);
  const fill = new Set(filled), ticks = new Set(redTicks);
  // Lưới tra nhanh: mỗi ô 0,02 đơn vị chứa các ô tròn gần đó.
  const bucket = new Map<string, { k: string; u: number; v: number }[]>();
  const key = (u: number, v: number) => `${Math.floor(u / 0.02)},${Math.floor(v / 0.02)}`;
  for (const [k, u, v] of template.cells) for (const du of [-0.02, 0, 0.02]) for (const dv of [-0.02, 0, 0.02]) {
    const b = key(u + du, v + dv); bucket.set(b, [...(bucket.get(b) || []), { k, u, v }]);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const { u, v } = invert(H, x, y);
    let c: [number, number, number] = [235, 232, 225];
    for (const [mu, mv, s] of template.marks) {
      if (Math.abs(u - mu) < s / 2 && Math.abs(v - mv) * template.aspect < s / 2) c = [20, 20, 20];
    }
    for (const cell of bucket.get(key(u, v)) || []) {
      const d = Math.hypot(u - cell.u, (v - cell.v) * template.aspect);
      if (d > template.r * 1.2) continue;
      if (fill.has(cell.k) && d < template.r * 0.9) c = [70, 70, 75];
      else if (Math.abs(d - template.r) < template.r * 0.12) c = [40, 40, 40];
      if (ticks.has(cell.k) && Math.abs((u - cell.u) - (v - cell.v) * template.aspect) < template.r * 0.2) c = [210, 40, 40];
    }
    const k = shadow ? 0.45 + 0.55 * (x / w) : 1;
    const i = (y * w + x) * 4;
    data[i] = c[0] * k; data[i + 1] = c[1] * k; data[i + 2] = c[2] * k; data[i + 3] = 255;
  }
  return { width: w, height: h, data };
};

const k12 = OMR_TEMPLATES.find(t => t.id === 'k12')!;
const k1011 = OMR_TEMPLATES.find(t => t.id === 'k1011')!;

describe('chấm phiếu tô bằng code', { timeout: 60_000 }, () => {
  it('phiếu 12 nghiêng + bóng tối: đọc đúng mã đề, SBD, ba phần; vạch đỏ GV không thành bóng tô', () => {
    const filled = [
      'MD.0.1', 'MD.1.0', 'MD.2.2',
      ...'123456'.split('').map((d, i) => `SBD.${i}.${d}`),
      'I.1.A', 'I.2.C', 'I.3.B', 'I.12.D',
      'II.1.a.D', 'II.1.b.S', 'II.1.c.D', 'II.1.d.S',
      'III.1.minus', 'III.1.d1.1', 'III.1.comma.2', 'III.1.d3.5',
      'III.2.d0.2', 'III.2.d1.0',
    ];
    const img = render({ template: k12, filled, redTicks: ['I.3.D', 'I.4.A', 'II.2.a.D'], shadow: true,
      quad: [{ x: 80, y: 40 }, { x: 630, y: 75 }, { x: 665, y: 930 }, { x: 40, y: 900 }] });
    const sheet = readAnswerSheet(img)!;
    expect(sheet.form).toBe('k12');
    expect(sheet.examCode).toBe('102');
    expect(sheet.studentCode).toBe('123456');
    expect(sheet.mcq.slice(0, 4).map(m => m.answer)).toEqual(['A', 'C', 'B', null]);
    expect(sheet.mcq[2].confidence).toBeGreaterThanOrEqual(0.9);
    expect(sheet.mcq[11]).toMatchObject({ answer: 'D' });
    expect(sheet.trueFalse[0].items).toEqual({ a: 'Đ', b: 'S', c: 'Đ', d: 'S' });
    expect(sheet.trueFalse[1].items.a).toBeNull();
    expect(sheet.shortAnswer[0]).toMatchObject({ answer: '-1,5' });
    expect(sheet.shortAnswer[1]).toMatchObject({ answer: '20' });
    expect(sheet.shortAnswer[2].answer).toBeNull();
  });

  it('phiếu 10–11 nhận đúng mẫu; tô hai ô → không đoán, độ tin thấp', () => {
    const sheet = readAnswerSheet(render({ template: k1011, filled: ['I.1.B', 'I.2.A', 'I.2.D', 'II.3.c.S'] }))!;
    expect(sheet.form).toBe('k1011');
    expect(sheet.mcq[0]).toMatchObject({ answer: 'B' });
    expect(sheet.mcq[1].answer).toBeNull();
    expect(sheet.mcq[1].confidence).toBeLessThan(0.5);
    expect(sheet.trueFalse[2].items.c).toBe('S');
  });

  it('ảnh không có phiếu → null (giữ cách chấm cũ); scan vẫn san sáng', () => {
    const w = 300, h = 400, data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) { const x = i % w; data.fill(Math.round(120 + 100 * x / w), i * 4, i * 4 + 3); data[i * 4 + 3] = 255; }
    const p = prepareImage({ width: w, height: h, data });
    expect(locateSheet(p)).toBeNull();
    const out = scanImage(p, null);
    expect(out.data[0]).toBeGreaterThan(240);
    expect(out.data[(w - 1) * 4]).toBeGreaterThan(240);
  });
});
