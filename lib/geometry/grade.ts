/**
 * Chấm hình học sinh tự vẽ (Mức B).
 *
 * Học sinh: kéo đặt đỉnh từ vị trí gợi ý, bấm hai đỉnh để nối cạnh, bấm cạnh
 * để chọn nét liền/đứt.
 *
 * Máy chấm phải phân biệt được BA loại lỗi khác nhau, vì mỗi loại dạy một thứ:
 *   1. THIEU cạnh  — quên vẽ
 *   2. THUA cạnh   — vẽ đường không có trong hình
 *   3. SAI NÉT     — vẽ đúng cạnh nhưng chọn nhầm liền/đứt  <- giá trị dạy học cao nhất
 *
 * Gộp cả ba thành "sai" là mất phần dạy quy ước nét.
 */

/** Dung sai đỉnh (px màn hình). HS kéo đặt lệch trong ngưỡng này vẫn coi là đúng đỉnh. */
export const DEFAULT_VERTEX_TOLERANCE = 18;

export interface DrawnEdge {
  /** Chỉ số đỉnh đã đặt (theo thứ tự HS đặt, không theo thứ tự gốc). */
  a: number;
  b: number;
  /** HS chọn: true = nét liền, false = nét đứt. */
  solid: boolean;
}

export interface DrawnVertex {
  x: number;
  y: number;
}

export interface ExpectedEdge {
  /** Nhãn hai đỉnh, ví dụ ['A','B']. */
  from: string;
  to: string;
  /** Nét đúng theo góc nhìn hiện tại. */
  solid: boolean;
}

export interface GradeInput {
  /** Đỉnh HS đã đặt, theo thứ tự HS đặt. */
  drawnVerts: DrawnVertex[];
  /** Vị trí gợi ý của từng đỉnh gốc, cùng thứ tự với labels. */
  hintVerts: DrawnVertex[];
  /** Nhãn các đỉnh gốc, ví dụ ['A','B','C','S']. */
  labels: string[];
  /** Cạnh HS đã vẽ (chỉ số theo drawnVerts). */
  drawnEdges: DrawnEdge[];
  /** Cạnh đúng (theo nhãn, không phụ thuộc thứ tự). */
  expectedEdges: ExpectedEdge[];
  tolerance?: number;
}

export type IssueKind = 'missing' | 'extra' | 'wrongDash';

export interface GradeIssue {
  kind: IssueKind;
  edge: string;
  detail: string;
}

export interface GradeResult {
  ok: boolean;
  missing: GradeIssue[];
  extra: GradeIssue[];
  wrongDash: GradeIssue[];
  /** Bảng ánh xạ chỉ số HS đặt -> nhãn đỉnh gốc. */
  vertexMapping: (string | null)[];
  summary: string;
}

/** Chuẩn hoá cặp nhãn để so sánh không phụ thuộc thứ tự. */
const pairKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Ánh xạ đỉnh HS đặt về nhãn gốc.
 * Dùng tham lam theo khoảng cách gần nhất, mỗi nhãn chỉ dùng một lần.
 */
export function mapVertices(
  drawn: DrawnVertex[],
  hints: DrawnVertex[],
  labels: string[],
  tolerance: number
): (string | null)[] {
  const pairs: { di: number; hi: number; d: number }[] = [];
  for (let di = 0; di < drawn.length; di++) {
    for (let hi = 0; hi < hints.length; hi++) {
      const d = Math.hypot(drawn[di].x - hints[hi].x, drawn[di].y - hints[hi].y);
      if (d <= tolerance) pairs.push({ di, hi, d });
    }
  }
  pairs.sort((a, b) => a.d - b.d);

  const usedDrawn = new Set<number>();
  const usedHint = new Set<number>();
  const map: (string | null)[] = new Array(drawn.length).fill(null);

  for (const p of pairs) {
    if (usedDrawn.has(p.di) || usedHint.has(p.hi)) continue;
    usedDrawn.add(p.di);
    usedHint.add(p.hi);
    map[p.di] = labels[p.hi];
  }
  return map;
}

/**
 * Chấm hình HS vẽ.
 *
 * Nguyên tắc: mọi phép so sánh cạnh đều theo CẶP NHÃN KHÔNG THỨ TỰ.
 * HS vẽ A->B hay B->A là như nhau.
 */
export function gradeDrawing(input: GradeInput): GradeResult {
  const tol = input.tolerance ?? DEFAULT_VERTEX_TOLERANCE;
  const mapping = mapVertices(input.drawnVerts, input.hintVerts, input.labels, tol);

  // Cạnh HS vẽ, quy về cặp nhãn. Bỏ qua cạnh có đầu mút không ánh xạ được.
  const drawnMap = new Map<string, { solid: boolean; label: string }>();
  for (const e of input.drawnEdges) {
    const la = mapping[e.a];
    const lb = mapping[e.b];
    if (!la || !lb) continue; // đầu mút lạc ra ngoài dung sai: coi như không vẽ
    const k = pairKey(la, lb);
    drawnMap.set(k, { solid: e.solid, label: `${la}${lb}` });
  }

  const expectedMap = new Map<string, { solid: boolean; label: string }>();
  for (const e of input.expectedEdges) {
    expectedMap.set(pairKey(e.from, e.to), { solid: e.solid, label: `${e.from}${e.to}` });
  }

  const missing: GradeIssue[] = [];
  const extra: GradeIssue[] = [];
  const wrongDash: GradeIssue[] = [];

  for (const [k, exp] of expectedMap) {
    const got = drawnMap.get(k);
    if (!got) {
      missing.push({
        kind: 'missing',
        edge: exp.label,
        detail: `thiếu cạnh ${exp.label}`,
      });
      continue;
    }
    if (got.solid !== exp.solid) {
      wrongDash.push({
        kind: 'wrongDash',
        edge: exp.label,
        detail: exp.solid
          ? `cạnh ${exp.label} phải là nét liền (đang vẽ nét đứt)`
          : `cạnh ${exp.label} phải là nét đứt (đang vẽ nét liền)`,
      });
    }
  }

  for (const [k, got] of drawnMap) {
    if (!expectedMap.has(k)) {
      extra.push({
        kind: 'extra',
        edge: got.label,
        detail: `thừa cạnh ${got.label}`,
      });
    }
  }

  const ok = missing.length === 0 && extra.length === 0 && wrongDash.length === 0;

  let summary: string;
  if (ok) {
    summary = 'Đúng hoàn toàn.';
  } else {
    const parts: string[] = [];
    if (wrongDash.length) parts.push(`${wrongDash.length} cạnh sai nét`);
    if (missing.length) parts.push(`thiếu ${missing.length} cạnh`);
    if (extra.length) parts.push(`thừa ${extra.length} cạnh`);
    summary = parts.join(', ') + '.';
  }

  return { ok, missing, extra, wrongDash, vertexMapping: mapping, summary };
}
