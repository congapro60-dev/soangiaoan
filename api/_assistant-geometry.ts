/**
 * DSL hình học/thống kê do AI sinh (khối ```geometry {...}``` cuối câu trả lời) + parser tách khối.
 *
 * Nguyên tắc an toàn (chốt 28/10): mọi nhánh lỗi đều trả spec=null nhưng VẪN gỡ khối
 * khỏi text — học sinh không bao giờ nhìn thấy JSON rác trong Zalo, và luồng chat cũ
 * (không hình) hoạt động y như trước. Không tin mù AI: shape phải nằm trong danh sách
 * cho phép, note phải ngắn (≤300 ký tự), mảng số liệu phải hợp lệ và có giới hạn.
 */
export type GeometryShape =
  | 'pyramid' | 'prism' | 'box' | 'cylinder' | 'cone' | 'sphere'
  | 'graph' | 'table' | 'bar';

type ShapeBase = { note?: string };

export type GeometrySpec = ShapeBase & (
  | { shape: 'pyramid' | 'prism' | 'box' | 'cylinder' | 'cone' | 'sphere'; base?: 'square' | 'triangle'; apexAt?: 'center' | 'A' }
  | { shape: 'graph'; points: [number, number][]; xrange?: [number, number]; yrange?: [number, number]; xlabel?: string; ylabel?: string }
  | { shape: 'table'; head: string[]; rows: string[][] }
  | { shape: 'bar'; labels: string[]; values: number[]; ylabel?: string }
);

const SHAPES: ReadonlySet<string> = new Set([
  'pyramid', 'prism', 'box', 'cylinder', 'cone', 'sphere', 'graph', 'table', 'bar',
]);
const BASES: ReadonlySet<string> = new Set(['square', 'triangle']);
const SOLID_SHAPES: ReadonlySet<string> = new Set(['pyramid', 'prism', 'box', 'cylinder', 'cone', 'sphere']);
const MAX_NOTE = 300;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Đọc cặp số [x,y] hợp lệ từ unknown — không đúng thì null. */
const readPoint = (v: unknown): [number, number] | null => {
  if (!Array.isArray(v) || v.length !== 2 || !isNum(v[0]) || !isNum(v[1])) return null;
  return [v[0], v[1]];
};

const readRange = (v: unknown): [number, number] | null => {
  if (!Array.isArray(v) || v.length !== 2 || !isNum(v[0]) || !isNum(v[1]) || v[0] >= v[1]) return null;
  return [v[0], v[1]];
};

/** Validate DSL từ JSON AI parse ra — không hợp lệ thì null, không throw. */
export const parseGeometrySpec = (value: unknown): GeometrySpec | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.shape !== 'string' || !SHAPES.has(raw.shape)) return null;

  let note: string | undefined;
  if (raw.note !== undefined) {
    if (typeof raw.note !== 'string' || !raw.note.trim() || raw.note.length > MAX_NOTE) return null;
    note = raw.note.trim();
  }

  if (SOLID_SHAPES.has(raw.shape)) {
    const spec = { shape: raw.shape, note } as GeometrySpec;
    if (raw.base !== undefined) {
      if (typeof raw.base !== 'string' || !BASES.has(raw.base)) return null;
      (spec as { base?: string }).base = raw.base;
    }
    if (raw.apexAt !== undefined) {
      // Chỉ pyramid mới có lựa chọn chân đường cao; giá trị khác → từ chối cả khối.
      if (raw.shape !== 'pyramid') return null;
      if (raw.apexAt !== 'center' && raw.apexAt !== 'A') return null;
      (spec as { apexAt?: 'center' | 'A' }).apexAt = raw.apexAt;
    }
    return spec;
  }

  if (raw.shape === 'graph') {
    // Điểm: 2..30 cặp số. Khung: tuỳ chọn, x0<x1, y0<y1.
    if (!Array.isArray(raw.points) || raw.points.length < 2 || raw.points.length > 30) return null;
    const points: [number, number][] = [];
    for (const p of raw.points) {
      const pt = readPoint(p);
      if (!pt) return null;
      points.push(pt);
    }
    const spec: GeometrySpec = { shape: 'graph', points, note };
    if (raw.xrange !== undefined) {
      const r = readRange(raw.xrange);
      if (!r) return null;
      (spec as { xrange?: [number, number] }).xrange = r;
    }
    if (raw.yrange !== undefined) {
      const r = readRange(raw.yrange);
      if (!r) return null;
      (spec as { yrange?: [number, number] }).yrange = r;
    }
    for (const key of ['xlabel', 'ylabel'] as const) {
      const v = (raw as Record<string, unknown>)[key];
      if (v !== undefined) {
        if (typeof v !== 'string' || !v.trim() || v.length > 10) return null;
        (spec as Record<string, unknown>)[key] = v.trim();
      }
    }
    return spec;
  }

  if (raw.shape === 'table') {
    // Bảng: 1..6 cột, 1..8 hàng, ô ≤14 ký tự.
    if (!Array.isArray(raw.head) || raw.head.length < 1 || raw.head.length > 6) return null;
    const head = raw.head.map(c => (typeof c === 'string' ? c.trim() : ''));
    if (head.some(c => !c || c.length > 14)) return null;
    if (!Array.isArray(raw.rows) || raw.rows.length < 1 || raw.rows.length > 8) return null;
    const rows = raw.rows.map(r => {
      if (!Array.isArray(r) || r.length !== head.length) return null;
      const cells = r.map(c => (typeof c === 'string' ? c.trim() : ''));
      if (cells.some(c => c.length > 14)) return null;
      return cells;
    });
    if (rows.some(r => r === null)) return null;
    return { shape: 'table', head, rows: rows as string[][], note };
  }

  // bar
  if (!Array.isArray(raw.labels) || raw.labels.length < 2 || raw.labels.length > 10) return null;
  const labels = raw.labels.map(c => (typeof c === 'string' ? c.trim() : ''));
  if (labels.some(c => !c || c.length > 12)) return null;
  if (!Array.isArray(raw.values) || raw.values.length !== labels.length) return null;
  const values = raw.values.map(v => (isNum(v) && v >= 0 && v <= 1_000_000 ? v : null));
  if (values.some(v => v === null)) return null;
  const spec: GeometrySpec = { shape: 'bar', labels, values: values as number[], note };
  if (raw.ylabel !== undefined) {
    if (typeof raw.ylabel !== 'string' || !raw.ylabel.trim() || raw.ylabel.length > 14) return null;
    spec.ylabel = raw.ylabel.trim();
  }
  return spec;
};

/**
 * Tách khối ```geometry ...``` khỏi câu trả lời thô của AI (lấy khối CUỐI nếu có nhiều).
 * Khối JSON hỏng / shape lạ → spec null, khối vẫn bị gỡ.
 */
export const extractGeometryReply = (raw: string): { text: string; spec: GeometrySpec | null } => {
  const source = String(raw ?? '');
  const re = /```geometry\s*\n?([\s\S]*?)```/g;
  let spec: GeometrySpec | null = null;
  let sawBlock = false;
  const text = source.replace(re, (_match, body: string) => {
    sawBlock = true;
    try {
      const parsed = parseGeometrySpec(JSON.parse(String(body).trim()));
      if (parsed) spec = parsed;
      else console.error('[geometry] khối hợp lệ JSON nhưng sai DSL:', String(body).trim().slice(0, 200));
    } catch (err) {
      // Log để phân biệt "model không vẽ" với "ta từ chối khối của model" — nếu không
      // sẽ không biết vì sao HS không nhận được hình (bài học 28/10).
      console.error('[geometry] JSON hỏng:', String(body).trim().slice(0, 200), err instanceof Error ? err.message : '');
    }
    return '';
  });
  if (sawBlock && !spec) console.error('[geometry] có khối nhưng bị từ chối → gửi text');
  return { text: text.replace(/\n{3,}/g, '\n\n').trim(), spec };
};
