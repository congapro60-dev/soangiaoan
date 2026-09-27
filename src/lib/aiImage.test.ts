import { describe, it, expect, vi } from 'vitest';
import { extractAiImageDirectives, hasUnresolvedAiImages, resolveAiImagesInMarkdown } from './aiImage';

const block = (body: string) => '```aiimg\n' + body + '\n```';

describe('aiImage — quét & resolve block aiimg', () => {
  it('trích directive chưa resolve, bỏ qua URL đã resolve', () => {
    const md = `Mở đầu\n\n${block('khu chợ ngoài trời có 3 quầy bánh')}\n\n${block('https://x/y.png')}`;
    const found = extractAiImageDirectives(md);
    expect(found.map(f => f.body)).toEqual(['khu chợ ngoài trời có 3 quầy bánh']);
    expect(hasUnresolvedAiImages(md)).toBe(true);
  });

  it('không có block aiimg → trả nguyên văn, không gọi generate', async () => {
    const md = 'Chỉ có chữ và ```tikz\n\\begin{tikzpicture}\\end{tikzpicture}\n```';
    const generate = vi.fn();
    expect(await resolveAiImagesInMarkdown(md, generate)).toBe(md);
    expect(generate).not.toHaveBeenCalled();
  });

  it('resolve thành công → thay body bằng URL đã cache', async () => {
    const md = `A\n${block('sân trường giờ ra chơi')}\nB`;
    const out = await resolveAiImagesInMarkdown(md, async () => 'https://cdn/abc.png');
    expect(out).toBe(`A\n${block('https://cdn/abc.png')}\nB`);
  });

  it('sinh lỗi (null hoặc throw) → thay bằng chú thích, không chặn', async () => {
    const md = `${block('cây cầu bắc qua sông')}\n\n${block('quầy hàng đa văn hóa')}`;
    const out = await resolveAiImagesInMarkdown(md, async (d) => {
      if (d.includes('cầu')) return null;
      throw new Error('timeout');
    });
    expect(out).toContain('*(Minh họa: cây cầu bắc qua sông)*');
    expect(out).toContain('*(Minh họa: quầy hàng đa văn hóa)*');
    expect(out).not.toContain('```aiimg');
  });

  it('nhiều block cùng directive → sinh MỘT lần, dùng chung URL', async () => {
    const md = `${block('bản đồ thế giới đơn giản')}\nx\n${block('bản đồ thế giới đơn giản')}`;
    const generate = vi.fn(async () => 'https://cdn/map.png');
    const out = await resolveAiImagesInMarkdown(md, generate);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(out.match(/https:\/\/cdn\/map\.png/g)?.length).toBe(2);
  });
});
