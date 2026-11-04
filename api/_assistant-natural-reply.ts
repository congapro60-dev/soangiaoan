/**
 * Nhịp nhắn "như người thật" (hướng A, chốt 4/11 — theo gợi ý của Phát).
 *
 * VẤN ĐỀ: AI trả lời tốt nhưng bot dồn hết vào MỘT tin dài → đọc là biết máy viết.
 * Người thật nhắn Zalo thường chia 2–3 tin ngắn, mỗi tin một ý.
 *
 * GIẢI PHÁP: cắt câu trả lời thành các phần ở RANH GIỚI AN TOÀN:
 *  - chỉ cắt ở cuối đoạn (`\n\n`) hoặc cuối câu (`. ` `! ` `? ` `… `), KHÔNG cắt giữa câu;
 *  - KHÔNG cắt bên trong URL (link web phải còn nguyên để bấm được);
 *  - câu trả lời ngắn (< MIN_SPLIT_LEN) giữ nguyên 1 tin — người thật cũng nhắn 1 tin khi ngắn;
 *  - tối đa `maxParts` tin; phần dư gộp vào tin cuối, tránh mảnh vụn vô nghĩa.
 */
const MIN_SPLIT_LEN = 240;
const MIN_PART_LEN = 60;

/** URL/token không được cắt giữa đường. */
const URL_RE = /https?:\/\/\S+/g;

/**
 * Cắt `text` thành 1–`maxParts` tin nhắn tự nhiên.
 * Trả mảng 1 phần khi câu ngắn hoặc không tìm được ranh giới an toàn.
 */
export const splitForChat = (text: string, maxParts = 3): string[] => {
  const whole = String(text ?? '').trim();
  if (!whole) return [];
  if (whole.length < MIN_SPLIT_LEN || maxParts < 2) return [whole];

  // Vị trí các URL để không cắt vào giữa.
  const protectedSpans: Array<[number, number]> = [];
  for (const match of whole.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    protectedSpans.push([start, start + match[0].length]);
  }
  const insideUrl = (pos: number): boolean => protectedSpans.some(([s, e]) => pos > s && pos < e);

  // Ranh giới ưu tiên: hết đoạn > hết câu.
  const boundaries: Array<{ pos: number; weight: number }> = [];
  const paragraph = /\n{2,}/g;
  for (const match of whole.matchAll(paragraph)) {
    const pos = (match.index ?? 0) + match[0].length;
    if (!insideUrl(pos)) boundaries.push({ pos, weight: 2 });
  }
  const sentence = /[.!?…]["')\]]?\s+/g;
  for (const match of whole.matchAll(sentence)) {
    const pos = (match.index ?? 0) + match[0].length;
    if (!insideUrl(pos)) boundaries.push({ pos, weight: 1 });
  }
  if (!boundaries.length) return [whole];

  // Chia đều mục tiêu: mỗi phần ~ độ dài / maxParts, chọn ranh giới gần mốc nhất.
  const target = Math.ceil(whole.length / maxParts);
  const parts: string[] = [];
  let cursor = 0;
  while (cursor < whole.length && parts.length < maxParts - 1) {
    const want = cursor + Math.max(target, MIN_PART_LEN);
    const candidates = boundaries
      .filter(b => b.pos > cursor + MIN_PART_LEN && b.pos < whole.length)
      .sort((a, b) => (Math.abs(a.pos - want) - b.weight * 20) - (Math.abs(b.pos - want) - a.weight * 20));
    const pick = candidates[0];
    if (!pick) break;
    const chunk = whole.slice(cursor, pick.pos).trim();
    if (chunk) parts.push(chunk);
    cursor = pick.pos;
  }
  const rest = whole.slice(cursor).trim();
  if (rest) parts.push(rest);

  // Mảnh cuối quá ngắn thì gộp vào mảnh trước (đừng để tin cụt kiểu "nhé!").
  if (parts.length > 1 && parts[parts.length - 1].length < MIN_PART_LEN) {
    const last = parts.pop() as string;
    parts[parts.length - 1] = `${parts[parts.length - 1]}\n\n${last}`;
  }
  return parts.length ? parts : [whole];
};
