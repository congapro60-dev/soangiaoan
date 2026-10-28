/**
 * Render SVG hình học/thống kê → ẢNH bằng chromium (như export-lesson) rồi upload Storage,
 * trả URL công khai cho Zalo sendPhoto. Chốt 28/10.
 *
 * QUAN TRỌNG:
 * - chromium/puppeteer chỉ được import ĐỘNG khi thật sự có hình — tin nhắn thường
 *   không chịu chi phí cold start.
 * - Font KaTeX_Main được NHÚNG base64 vào trang (@font-face) — chromium serverless
 *   không có glyph toán (⊥ từng biến mất trong ảnh, lỗi 28/10); KaTeX_Main có đủ
 *   ⊥ ∠ ∥ √ ≤ ⇒ △ + dấu tiếng Việt + ⅓ ⅔. File 52KB được includeFiles vào bundle.
 * - Xuất JPEG (không phải PNG): ảnh PNG gốc bị Zalo trên ĐIỆN THOẠI không hiển thị
 *   (khung xám trống, lỗi 28/10) — JPEG là định dạng Zalo render ổn định nhất.
 * - Mọi bước lỗi đều trả null và caller fallback về tin text: bot không bao giờ im lặng.
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { geometrySvg, GEOMETRY_SVG_SIZE } from './_assistant-geometry-svg.js';
import type { GeometrySpec } from './_assistant-geometry.js';
import { renderMathAnswerJpeg } from './_assistant-math-image.js';
import { getAdminStorage } from './_exam-core.js';

/** Đọc font KaTeX_Main 1 lần; trả chuỗi @font-face nhúng base64 (rỗng nếu thiếu file). */
let fontFaceCss: string | null = null;
const fontFace = (): string => {
  if (fontFaceCss !== null) return fontFaceCss;
  try {
    const ttf = readFileSync(join(process.cwd(), 'node_modules', 'katex', 'dist', 'fonts', 'KaTeX_Main-Regular.ttf'));
    fontFaceCss = `@font-face{font-family:'KaTeX_Main';src:url(data:font/ttf;base64,${ttf.toString('base64')}) format('truetype');}`;
  } catch {
    fontFaceCss = '';
  }
  return fontFaceCss;
};

export const renderGeometryJpeg = async (svg: string): Promise<Buffer | null> => {
  try {
    const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
      import('@sparticuz/chromium'),
      import('puppeteer-core'),
    ]);
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: GEOMETRY_SVG_SIZE.width, height: GEOMETRY_SVG_SIZE.height },
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || await chromium.executablePath(),
      headless: true,
    });
    try {
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(20_000);
      page.setDefaultTimeout(20_000);
      await page.setContent(
        `<!doctype html><html><head><meta charset="utf-8"><style>${fontFace()}html,body{margin:0;padding:0;background:#ffffff;}</style></head>` +
        `<body>${svg}</body></html>`,
        { waitUntil: 'load', timeout: 20_000 },
      );
      await page.evaluate(async () => { if ((document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts) await (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready; });
      const shot = await page.screenshot({ type: 'jpeg', quality: 92 });
      return Buffer.from(shot as Buffer);
    } finally {
      await browser.close().catch(() => { /* bỏ qua */ });
    }
  } catch (err) {
    console.error('[geometry] render ảnh thất bại:', err instanceof Error ? err.message : err);
    return null;
  }
};

/** Upload ảnh lên Storage — token URL công khai (cùng dạng luồng ảnh nộp bài). */
export const uploadGeometryImage = async (jpeg: Buffer, classId: string): Promise<string | null> => {
  try {
    const path = `geometry/${encodeURIComponent(classId || 'khong-lop')}/${randomUUID()}.jpg`;
    const bucket = getAdminStorage();
    const file = bucket.file(path);
    const token = randomUUID();
    await file.save(jpeg, { contentType: 'image/jpeg', resumable: false });
    await file.setMetadata({ contentType: 'image/jpeg', metadata: { firebaseStorageDownloadTokens: token } });
    return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
  } catch (err) {
    console.error('[geometry] upload Storage thất bại:', err instanceof Error ? err.message : err);
    return null;
  }
};

/** Gửi Zalo qua callback (mặc định sendPhoto) — tách để test thay được. */
export type PhotoSender = (token: string, chatId: string, photoUrl: string, caption: string) => Promise<boolean>;

/**
 * Đường ống đầy đủ: spec → SVG → JPEG → Storage → Zalo.
 * Bất kỳ bước nào hỏng → false (caller fallback gửi text).
 */
export const sendGeometryPhoto = async (
  token: string,
  chatId: string,
  spec: GeometrySpec,
  caption: string,
  classId: string,
  send: PhotoSender,
): Promise<boolean> => {
  const svg = geometrySvg(spec);
  if (!svg) return false;
  const jpeg = await renderGeometryJpeg(svg);
  if (!jpeg) return false;
  const url = await uploadGeometryImage(jpeg, classId);
  if (!url) return false;
  return send(token, chatId, url, caption);
};

/**
 * Đường ống ảnh CÔNG THỨC: câu trả lời (chữ + LaTeX) → KaTeX → JPEG → Storage → Zalo.
 * Caption vẫn là lời giải Unicode đầy đủ nên ảnh chỉ là "bản đẹp" đi kèm.
 * Không có công thức → false ngay (không tốn lần render).
 */
export const sendMathFormulaPhoto = async (
  token: string,
  chatId: string,
  replyWithLatex: string,
  caption: string,
  classId: string,
  send: PhotoSender,
): Promise<boolean> => {
  const jpeg = await renderMathAnswerJpeg(replyWithLatex);
  if (!jpeg) return false;
  const url = await uploadGeometryImage(jpeg, classId);
  if (!url) return false;
  return send(token, chatId, url, caption);
};
