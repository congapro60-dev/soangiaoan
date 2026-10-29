/**
 * Render công thức Toán bằng KaTeX thành ẢNH để gửi qua Zalo (chốt 28/10).
 *
 * VÌ SAO: Unicode không có phân thức xếp tầng, tích phân có cận, lim ở dưới,
 * ma trận, hệ phương trình — HS lớp 11-12 gặp hằng ngày. KaTeX render đúng chuẩn
 * SGK (đã kiểm chứng thật: phân thức lồng, ∫₀¹, Σ, ma trận, cases đều đẹp).
 *
 * NGUYÊN TẮC: ảnh là "bản đẹp" đi kèm, KHÔNG thay thế text.
 * - Caption vẫn là lời giải đầy đủ dạng Unicode → ảnh lỗi/không xem được thì HS
 *   vẫn hiểu bài (không phụ thuộc ảnh).
 * - Không có công thức LaTeX trong câu trả lời → trả null, không tốn lần render.
 *
 * KaTeX CSS + font nhúng base64 từ node_modules (giống export-lesson đã chạy thật):
 * chromium serverless không có mạng để tải /fonts/*.woff2.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import katex from 'katex';

/** CSS KaTeX + font woff2 nhúng base64. Thiếu file → chuỗi rỗng (ảnh vẫn ra, chỉ xấu chữ). */
const loadKatexCss = (): string => {
  // Dò nhiều vị trí: process.cwd() (Vercel: /var/task) rồi require.resolve (monorepo/test).
  const dirs: string[] = [join(process.cwd(), 'node_modules', 'katex')];
  try {
    const requireFromHere = createRequire(import.meta.url);
    dirs.push(dirname(requireFromHere.resolve('katex/package.json')));
  } catch { /* bundle CJS hoặc không resolve được — dùng cwd */ }
  for (const pkgDir of dirs) {
    try {
      const fontsDir = join(pkgDir, 'dist', 'fonts');
      const css = readFileSync(join(pkgDir, 'dist', 'katex.min.css'), 'utf8');
      return css.replace(/url\((['"]?)fonts\/([^)'"]+\.woff2)\1\)/g, (_m, _q, fontFile: string) => {
        try {
          return `url(data:font/woff2;base64,${readFileSync(join(fontsDir, fontFile)).toString('base64')})`;
        } catch { return `url(fonts/${fontFile})`; }
      });
    } catch { /* thử đường tiếp theo */ }
  }
  console.error('[math-image] không nạp được KaTeX CSS');
  return '';
};

const KATEX_CSS = loadKatexCss();

/** Có công thức LaTeX nào trong câu trả lời không ($$…$$, $…$, \[…\], \(…\))? */
export const hasLatexFormula = (text: string): boolean =>
  /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|(?<!\\)\$[^$\n]+?(?<!\\)\$|\\\([\s\S]+?\\\)/.test(String(text ?? ''));

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&' + 'amp;').replace(/</g, '&' + 'lt;').replace(/>/g, '&' + 'gt;');

/**
 * Bỏ ký hiệu markdown khỏi phần chữ trước khi render ảnh: ảnh là bitmap, `**2**` sẽ
 * hiện nguyên dấu sao (lỗi thấy thật trên ảnh 28/10). Chỉ xử lý **đậm**, *nghiêng*,
 * `code`, __đậm__ — KHÔNG đụng dấu * dùng làm phép nhân trong công thức.
 */
const stripMarkdown = (s: string): string =>
  s.replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/(?<![\w*])\*([^*\n]+)\*(?![\w*])/g, '$1');

/** Render 1 công thức; lỗi cú pháp → in nguyên văn (không làm hỏng cả ảnh). */
const renderTex = (tex: string, display: boolean): string => {
  try {
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'html' });
  } catch {
    return `<code>${escapeHtml(tex)}</code>`;
  }
};

/**
 * Dựng HTML cho cả câu trả lời: chữ giữ nguyên (escape), công thức render bằng KaTeX.
 * $$…$$ và \[…\] là display (xuống dòng, canh giữa); $…$ và \(…\) là inline.
 */
export const mathAnswerHtml = (reply: string): string => {
  const src = String(reply ?? '');
  const parts: string[] = [];
  // Tách theo thứ tự: display trước, rồi inline. Giữ phần chữ giữa các công thức.
  const pattern = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|(?<!\\)\$([^$\n]+?)(?<!\\)\$|\\\(([\s\S]+?)\\\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(src)) !== null) {
    if (m.index > last) parts.push(`<span class="txt">${escapeHtml(stripMarkdown(src.slice(last, m.index)))}</span>`);
    const display = m[1] !== undefined || m[2] !== undefined;
    const tex = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? '').trim();
    parts.push(display ? `<div class="disp">${renderTex(tex, true)}</div>` : renderTex(tex, false));
    last = m.index + m[0].length;
  }
  if (last < src.length) parts.push(`<span class="txt">${escapeHtml(stripMarkdown(src.slice(last)))}</span>`);
  return parts.join('');
};

/** HTML đầy đủ cho trang render (khổ rộng 960, chữ 26px — đọc tốt trên điện thoại, không gãy công thức dài). */
export const mathAnswerDocument = (reply: string): string => `<!doctype html><html><head><meta charset="utf-8">
<style>${KATEX_CSS}</style>
<style>
  html,body{margin:0;padding:0;background:#fff;}
  body{width:960px;padding:28px 36px;box-sizing:border-box;font-family:'Times New Roman',Georgia,serif;font-size:26px;line-height:1.6;color:#111;}
  .txt{white-space:pre-wrap;}
  .disp{margin:14px 0;text-align:center;}
  .katex{font-size:1.15em;}
  .katex-display{margin:0;}
</style></head><body>${mathAnswerHtml(reply)}</body></html>`;

/**
 * Render câu trả lời (chữ + công thức) thành JPEG.
 * Không có công thức → null (caller không tốn lần render nào).
 * Lỗi bất kỳ → null, caller fallback text.
 */
export const renderMathAnswerPng = async (reply: string): Promise<Buffer | null> => {
  if (!hasLatexFormula(reply)) return null;
  try {
    const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
      import('@sparticuz/chromium'),
      import('puppeteer-core'),
    ]);
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 960, height: 1200 },
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || await chromium.executablePath(),
      headless: true,
    });
    try {
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(20_000);
      page.setDefaultTimeout(20_000);
      await page.setContent(mathAnswerDocument(reply), { waitUntil: 'load', timeout: 20_000 });
      await page.evaluate(async () => {
        const f = (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts;
        if (f) await f.ready;
      });
      // CẮT SÁT NỘI DUNG BODY: chụp element body thay vì fullPage (lỗi 29/10: fullPage thừa 80% khoảng trắng dọc bên dưới).
      const bodyEl = await page.$('body');
      const takeShot = async () => (bodyEl ? bodyEl.screenshot({ type: 'png' }) : page.screenshot({ type: 'png' }));
      const sizeOf = (buf: Buffer): { w: number; h: number } => {
        // PNG: width/height nằm ở IHDR, offset 16 và 20.
        if (buf[0] === 0x89 && buf[1] === 0x50) {
          return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
        }
        return { w: 960, h: 600 };
      };
      let shot = await takeShot();
      let dim = sizeOf(Buffer.from(shot as Buffer));
      const MAX_RATIO = 1.6;
      for (let attempt = 0; attempt < 3 && dim.h > dim.w * MAX_RATIO; attempt += 1) {
        const scale = Math.max(0.65, (dim.w * MAX_RATIO) / dim.h);
        await page.evaluate((s: number) => {
          document.body.style.fontSize = `${Math.round(parseFloat(getComputedStyle(document.body).fontSize) * s)}px`;
        }, scale);
        shot = await takeShot();
        dim = sizeOf(Buffer.from(shot as Buffer));
      }
      return Buffer.from(shot as Buffer);
    } finally {
      await browser.close().catch(() => { /* bỏ qua */ });
    }
  } catch (err) {
    console.error('[math-image] render thất bại:', err instanceof Error ? err.message : err);
    return null;
  }
};
