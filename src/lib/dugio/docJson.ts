/**
 * Đọc JSON từ phản hồi AI, chịu được phản hồi bị cắt giữa chừng.
 *
 * callAI() đã tự nối tiếp khi output bị cắt, nhưng phần nối là VĂN BẢN — nó
 * không đảm bảo cấu trúc JSON khép lại. Nên vẫn cần lớp vớt này.
 */

export function lamSach(raw: string): string {
  let s = raw.trim().replace(/```json/gi, '').replace(/```/g, '').trim();
  const a = s.indexOf('{');
  if (a > 0) s = s.slice(a);
  return s;
}

/**
 * Quét mọi cặp ngoặc nhọn cân bằng và parse riêng từng mảnh.
 * Khi phản hồi đứt giữa chừng, các phần tử hoàn chỉnh vẫn lấy được.
 */
export function votObject<T extends { ma?: unknown }>(s: string): T[] {
  const out: T[] = [];
  const stack: number[] = [];
  let inStr = false;
  let esc = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === '{') stack.push(i);
    else if (c === '}' && stack.length) {
      const start = stack.pop() as number;
      try {
        const o = JSON.parse(s.slice(start, i + 1));
        if (o && typeof o === 'object' && o.ma) out.push(o as T);
      } catch {
        /* mảnh chưa hợp lệ, bỏ qua */
      }
    }
  }
  return out;
}

/** Dùng cho phản hồi một object đơn, không có mảng phần tử để vớt. */
export function docJSONdon<T>(raw: string): T {
  const s = lamSach(raw);
  const b = s.lastIndexOf('}');
  return JSON.parse(b !== -1 ? s.slice(0, b + 1) : s) as T;
}

/** Dùng cho phản hồi có mảng phần tử; rơi xuống chế độ vớt khi parse thẳng hỏng. */
export function docJSON<T extends { ma?: unknown }>(
  raw: string,
  khoaMang: string,
): { items: T[]; biCat: boolean } {
  const s = lamSach(raw);
  const b = s.lastIndexOf('}');
  if (b !== -1) {
    try {
      const o = JSON.parse(s.slice(0, b + 1)) as Record<string, unknown>;
      const arr = o[khoaMang];
      if (Array.isArray(arr)) return { items: arr as T[], biCat: false };
    } catch {
      /* rơi xuống chế độ vớt */
    }
  }
  const vot = votObject<T>(s);
  if (vot.length) return { items: vot, biCat: true };
  throw new Error('Phản hồi AI không đọc được');
}
