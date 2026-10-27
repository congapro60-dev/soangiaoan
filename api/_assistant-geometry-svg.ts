/**
 * Dựng SVG hình học không gian từ DSL của AI (api/_assistant-geometry.ts).
 *
 * Quy ước vẽ chuẩn SGK: cạnh CHE nét đứt (stroke-dasharray), cạnh nhìn thấy nét liền,
 * nhãn đỉnh in đậm. Chiếu isometric thô — đủ cho HS hình dung, không cần thư viện.
 * Mọi lỗi DSL → trả null (caller fallback về text, không bao giờ throw).
 */
import type { GeometrySpec } from './_assistant-geometry.js';

const W = 640;
const H = 520;
const INK = '#1a1a1a';
const DASH = 'stroke-dasharray="8 6"';

const esc = (s: string): string =>
  s.replace(/&/g, '&' + 'amp;').replace(/</g, '&' + 'lt;').replace(/>/g, '&' + 'gt;').replace(/"/g, '&' + 'quot;');

const line = (x1: number, y1: number, x2: number, y2: number, dashed = false): string =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"${dashed ? ` ${DASH}` : ''}/>`;

/** Nửa ellipse: half='top'|'bottom' theo toạ độ màn hình (y hướng xuống). */
const halfEllipse = (cx: number, cy: number, rx: number, ry: number, half: 'top' | 'bottom', dashed = false): string => {
  const sweep = half === 'top' ? 0 : 1;
  return `<path d="M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 ${sweep} ${cx + rx} ${cy}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"${dashed ? ` ${DASH}` : ''}/>`;
};

const ellipse = (cx: number, cy: number, rx: number, ry: number, dashed = false): string =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${INK}" stroke-width="2.5"${dashed ? ` ${DASH}` : ''}/>`;

const label = (x: number, y: number, text: string): string =>
  `<text x="${x}" y="${y}" font-family="sans-serif" font-size="26" font-weight="700" fill="${INK}" text-anchor="middle">${text}</text>`;

const noteText = (text: string): string =>
  `<text x="${W / 2}" y="${H - 12}" font-family="sans-serif" font-size="21" fill="#333" text-anchor="middle">${esc(text)}</text>`;

/** Chóp S.ABCD (đáy vuông) hoặc S.ABC (đáy tam giác) với SA ⊥ đáy. */
const pyramid = (base: 'square' | 'triangle', note?: string): string => {
  const parts: string[] = [];
  if (base === 'triangle') {
    // Đáy ABC: A–B nhìn thấy, C khuất sau.
    const A: [number, number] = [100, 440], B: [number, number] = [540, 440], C: [number, number] = [310, 320], S: [number, number] = [310, 115];
    parts.push(
      line(A[0], A[1], B[0], B[1]),
      line(B[0], B[1], C[0], C[1], true),
      line(C[0], C[1], A[0], A[1], true),
      line(S[0], S[1], A[0], A[1]),
      line(S[0], S[1], B[0], B[1]),
      line(S[0], S[1], C[0], C[1], true),
      label(S[0], S[1] - 20, 'S'),
      label(A[0] - 24, A[1] + 24, 'A'),
      label(B[0] + 24, B[1] + 24, 'B'),
      label(C[0], C[1] - 18, 'C'),
    );
  } else {
    // Đáy ABCD hình bình hành: A trước-trái, B trước, C sau-phải, D sau.
    const A: [number, number] = [80, 400], B: [number, number] = [320, 465], C: [number, number] = [560, 400], D: [number, number] = [320, 335], S: [number, number] = [320, 120];
    parts.push(
      line(A[0], A[1], B[0], B[1]),
      line(B[0], B[1], C[0], C[1]),
      line(C[0], C[1], D[0], D[1], true),
      line(D[0], D[1], A[0], A[1], true),
      line(S[0], S[1], A[0], A[1]),
      line(S[0], S[1], B[0], B[1]),
      line(S[0], S[1], D[0], D[1]),
      line(S[0], S[1], C[0], C[1], true),
      label(S[0], S[1] - 20, 'S'),
      label(A[0] - 22, A[1] + 26, 'A'),
      label(B[0], B[1] + 32, 'B'),
      label(C[0] + 24, C[1] + 26, 'C'),
      label(D[0] - 22, D[1] - 12, 'D'),
    );
  }
  if (note) parts.push(noteText(note));
  return parts.join('\n');
};

/** Lăng trụ đứng đáy tam giác ABC.A'B'C'. */
const prism = (note?: string): string => {
  const dy = 200;
  const A: [number, number] = [100, 440], B: [number, number] = [540, 440], C: [number, number] = [310, 320];
  const A2: [number, number] = [A[0], A[1] - dy], B2: [number, number] = [B[0], B[1] - dy], C2: [number, number] = [C[0], C[1] - dy];
  const parts = [
    line(A[0], A[1], B[0], B[1]),
    line(B[0], B[1], C[0], C[1], true),
    line(C[0], C[1], A[0], A[1], true),
    line(A[0], A[1], A2[0], A2[1]),
    line(B[0], B[1], B2[0], B2[1]),
    line(C[0], C[1], C2[0], C2[1], true),
    line(A2[0], A2[1], B2[0], B2[1]),
    line(B2[0], B2[1], C2[0], C2[1]),
    line(C2[0], C2[1], A2[0], A2[1]),
    label(A[0] - 24, A[1] + 24, 'A'),
    label(B[0] + 24, B[1] + 24, 'B'),
    label(C[0], C[1] - 16, 'C'),
    label(A2[0] - 24, A2[1] + 6, "A'"),
    label(B2[0] + 26, B2[1] + 6, "B'"),
    label(C2[0], C2[1] - 16, "C'"),
  ];
  if (note) parts.push(noteText(note));
  return parts.join('\n');
};

/** Hộp chữ nhật / lập phương ABCD.A'B'C'D'. */
const box = (note?: string): string => {
  const dy = 200;
  const A: [number, number] = [110, 420], B: [number, number] = [370, 470], C: [number, number] = [560, 400], D: [number, number] = [300, 350];
  const up = (p: [number, number]): [number, number] => [p[0], p[1] - dy];
  const A2 = up(A), B2 = up(B), C2 = up(C), D2 = up(D);
  const parts = [
    line(A[0], A[1], B[0], B[1]),
    line(B[0], B[1], C[0], C[1]),
    line(C[0], C[1], D[0], D[1], true),
    line(D[0], D[1], A[0], A[1], true),
    line(A[0], A[1], A2[0], A2[1]),
    line(B[0], B[1], B2[0], B2[1]),
    line(C[0], C[1], C2[0], C2[1], true),
    line(D[0], D[1], D2[0], D2[1], true),
    line(A2[0], A2[1], B2[0], B2[1]),
    line(B2[0], B2[1], C2[0], C2[1]),
    line(C2[0], C2[1], D2[0], D2[1]),
    line(D2[0], D2[1], A2[0], A2[1]),
    label(A[0] - 24, A[1] + 24, 'A'),
    label(B[0], B[1] + 32, 'B'),
    label(C[0] + 26, C[1] + 24, 'C'),
    label(D[0] - 30, D[1] + 4, 'D'),
    label(A2[0] - 24, A2[1] + 6, "A'"),
    label(B2[0] + 2, B2[1] + 34, "B'"),
    label(C2[0] + 26, C2[1] - 2, "C'"),
    label(D2[0] - 30, D2[1] + 4, "D'"),
  ];
  if (note) parts.push(noteText(note));
  return parts.join('\n');
};

const cylinder = (note?: string): string => {
  const cx = 320, rx = 150, ry = 40, top = 150, bottom = 430;
  const parts = [
    ellipse(cx, top, rx, ry),
    halfEllipse(cx, bottom, rx, ry, 'top', true),
    halfEllipse(cx, bottom, rx, ry, 'bottom'),
    line(cx - rx, top, cx - rx, bottom),
    line(cx + rx, top, cx + rx, bottom),
  ];
  if (note) parts.push(noteText(note));
  return parts.join('\n');
};

const cone = (note?: string): string => {
  const cx = 320, rx = 165, ry = 42, baseY = 440, sy = 110;
  const parts = [
    halfEllipse(cx, baseY, rx, ry, 'top', true),
    halfEllipse(cx, baseY, rx, ry, 'bottom'),
    line(cx, sy, cx - rx, baseY),
    line(cx, sy, cx + rx, baseY),
    label(cx, sy - 20, 'S'),
  ];
  if (note) parts.push(noteText(note));
  return parts.join('\n');
};

const sphere = (note?: string): string => {
  const cx = 320, cy = 265, r = 160;
  const parts = [
    ellipse(cx, cy, r, r),
    halfEllipse(cx, cy, r, 40, 'top', true),
    halfEllipse(cx, cy, r, 40, 'bottom'),
    label(cx + 22, cy + 26, 'O'),
  ];
  if (note) parts.push(noteText(note));
  return parts.join('\n');
};

/** DSL → chuỗi SVG hoàn chỉnh. DSL không hợp lệ → null. */
export const geometrySvg = (spec: GeometrySpec | null | undefined): string | null => {
  if (!spec || typeof spec !== 'object') return null;
  const body = (() => {
    switch (spec.shape) {
      case 'pyramid': return pyramid(spec.base === 'triangle' ? 'triangle' : 'square', spec.note);
      case 'prism': return prism(spec.note);
      case 'box': return box(spec.note);
      case 'cylinder': return cylinder(spec.note);
      case 'cone': return cone(spec.note);
      case 'sphere': return sphere(spec.note);
      default: return null;
    }
  })();
  if (!body) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n<rect width="${W}" height="${H}" fill="#ffffff"/>\n${body}\n</svg>`;
};
