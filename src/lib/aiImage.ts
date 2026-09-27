/**
 * BƯỚC HẬU-SINH ẢNH RASTER: sau khi AI viết xong giáo án, quét các block ```aiimg``` (mỗi block là
 * một directive tiếng Việt mô tả ảnh minh họa bối cảnh/CDTC), gọi endpoint sinh ảnh, rồi THAY body
 * block bằng URL ảnh đã cache. Lúc xuất Word/PDF, `classifyDiagram` nhận block `aiimg` (URL) và nhúng
 * như diagram khác (xem `krokiRender.fetchAiImagePng`).
 *
 * Nguyên tắc: KHÔNG bao giờ để ảnh làm hỏng giáo án. Sinh lỗi/timeout → thay block bằng một dòng
 * chú thích tiếng Việt (giữ ý đồ minh họa), không chặn xuất.
 */

/** Fence ```aiimg ... ``` — bắt cả directive lẫn URL đã resolve. */
const AIIMG_BLOCK_RE = /```aiimg[^\S\r\n]*\r?\n([\s\S]*?)```/g;

export interface AiImageDirective {
  /** Toàn bộ block gốc (kể cả fence) để thay thế đúng chỗ. */
  block: string;
  /** Nội dung bên trong fence, đã trim. */
  body: string;
}

const isResolvedUrl = (body: string): boolean => /^https:\/\/\S+$/.test(body.trim());

/** Các block `aiimg` CHƯA resolve (body còn là directive, không phải URL). Giữ NGUYÊN từng block. */
export const extractAiImageDirectives = (markdown: string): AiImageDirective[] => {
  const out: AiImageDirective[] = [];
  for (const match of markdown.matchAll(AIIMG_BLOCK_RE)) {
    const body = (match[1] || '').trim();
    if (!body || isResolvedUrl(body)) continue;
    out.push({ block: match[0], body });
  }
  return out;
};

/** Có block `aiimg` chưa resolve nào không (để bỏ qua bước hậu-sinh khi không cần). */
export const hasUnresolvedAiImages = (markdown: string): boolean =>
  extractAiImageDirectives(markdown).length > 0;

/** Chú thích thay cho ảnh khi không sinh được — giữ ý đồ minh họa, không để trống. */
const fallbackCaption = (directive: string): string => `*(Minh họa: ${directive.replace(/\s+/g, ' ').trim()})*`;

/**
 * Thay mọi block `aiimg` chưa resolve bằng URL ảnh đã sinh; block nào sinh lỗi (generate trả null
 * hoặc ném) thì thay bằng dòng chú thích. Trả về markdown mới. `generate` là hàm gọi endpoint.
 */
export const resolveAiImagesInMarkdown = async (
  markdown: string,
  generate: (directive: string) => Promise<string | null>,
): Promise<string> => {
  const directives = extractAiImageDirectives(markdown);
  if (directives.length === 0) return markdown;

  // Sinh song song theo directive DUY NHẤT (nhiều block cùng nội dung dùng chung một URL).
  const uniqueBodies = [...new Set(directives.map(d => d.body))];
  const urlByBody = new Map<string, string | null>();
  await Promise.all(uniqueBodies.map(async (body) => {
    try {
      urlByBody.set(body, await generate(body));
    } catch {
      urlByBody.set(body, null);
    }
  }));

  // Thay từng block bằng CHUỖI GỐC (split/join) — không dựng lại regex, khỏi lệ thuộc khoảng trắng.
  let result = markdown;
  for (const { block, body } of directives) {
    const url = urlByBody.get(body) ?? null;
    const replacement = url ? '```aiimg\n' + url + '\n```' : fallbackCaption(body);
    result = result.split(block).join(replacement);
  }
  return result;
};
