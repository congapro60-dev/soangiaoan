/**
 * DSL hình học do AI sinh (khối ```geometry {...}``` cuối câu trả lời) + parser tách khối.
 *
 * Nguyên tắc an toàn (chốt 28/10): mọi nhánh lỗi đều trả spec=null nhưng VẪN gỡ khối
 * khỏi text — học sinh không bao giờ nhìn thấy JSON rác trong Zalo, và luồng chat cũ
 * (không hình) hoạt động y như trước. Không tin mù AI: shape phải nằm trong danh sách
 * cho phép, note phải ngắn (≤300 ký tự).
 */
export type GeometryShape = 'pyramid' | 'prism' | 'box' | 'cylinder' | 'cone' | 'sphere';

export type GeometrySpec = {
  shape: GeometryShape;
  /** Chỉ pyramid: đáy vuông (mặc định) hoặc tam giác. */
  base?: 'square' | 'triangle';
  /** Mô tả ngắn đề bài hiển thị dưới hình (đã là ký hiệu Unicode). */
  note?: string;
};

const SHAPES: ReadonlySet<string> = new Set(['pyramid', 'prism', 'box', 'cylinder', 'cone', 'sphere']);
const BASES: ReadonlySet<string> = new Set(['square', 'triangle']);
const MAX_NOTE = 300;

/** Validate DSL từ JSON AI parse ra — không hợp lệ thì null, không throw. */
export const parseGeometrySpec = (value: unknown): GeometrySpec | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.shape !== 'string' || !SHAPES.has(raw.shape)) return null;
  const spec: GeometrySpec = { shape: raw.shape as GeometryShape };
  if (raw.base !== undefined) {
    if (typeof raw.base !== 'string' || !BASES.has(raw.base)) return null;
    spec.base = raw.base as 'square' | 'triangle';
  }
  if (raw.note !== undefined) {
    if (typeof raw.note !== 'string' || !raw.note.trim()) return null;
    if (raw.note.length > MAX_NOTE) return null;
    spec.note = raw.note.trim();
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
  const text = source.replace(re, (_match, body: string) => {
    try {
      const parsed = parseGeometrySpec(JSON.parse(String(body).trim()));
      if (parsed) spec = parsed;
    } catch { /* JSON hỏng — bỏ qua, vẫn gỡ khối */ }
    return '';
  });
  return { text: text.replace(/\n{3,}/g, '\n\n').trim(), spec };
};
