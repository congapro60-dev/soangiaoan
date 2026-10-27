/**
 * Render SVG hình học → PNG bằng chromium (như export-lesson) rồi upload Storage,
 * trả URL công khai cho Zalo sendPhoto. Chốt 28/10.
 *
 * QUAN TRỌNG: chromium/puppeteer chỉ được import ĐỘNG khi thật sự có hình — tin nhắn
 * thường không phải chịu chi phí cold start. Mọi bước lỗi đều trả null và caller
 * fallback về tin text: bot không bao giờ im lặng vì lỗi vẽ hình.
 */
import { randomUUID } from 'node:crypto';
import { geometrySvg } from './_assistant-geometry-svg.js';
import type { GeometrySpec } from './_assistant-geometry.js';
import { getAdminStorage } from './_exam-core.js';

export const GEOMETRY_SVG_SIZE = { width: 640, height: 520 } as const;

export const renderGeometryPng = async (svg: string): Promise<Buffer | null> => {
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
        `<!doctype html><html><body style="margin:0;padding:0">${svg}</body></html>`,
        { waitUntil: 'load', timeout: 20_000 },
      );
      const shot = await page.screenshot({ type: 'png' });
      return Buffer.from(shot as Buffer);
    } finally {
      await browser.close().catch(() => { /* bỏ qua */ });
    }
  } catch (err) {
    console.error('[geometry] render PNG thất bại:', err instanceof Error ? err.message : err);
    return null;
  }
};

/** Upload PNG lên Storage — token URL công khai (cùng dạng luồng ảnh nộp bài). */
export const uploadGeometryPng = async (png: Buffer, classId: string): Promise<string | null> => {
  try {
    const path = `geometry/${encodeURIComponent(classId || 'khong-lop')}/${randomUUID()}.png`;
    const bucket = getAdminStorage();
    const file = bucket.file(path);
    const token = randomUUID();
    await file.save(png, { contentType: 'image/png', resumable: false });
    await file.setMetadata({ contentType: 'image/png', metadata: { firebaseStorageDownloadTokens: token } });
    return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
  } catch (err) {
    console.error('[geometry] upload Storage thất bại:', err instanceof Error ? err.message : err);
    return null;
  }
};

/** Gửi Zalo qua callback (mặc định sendPhoto) — tách để test thay được. */
export type PhotoSender = (token: string, chatId: string, photoUrl: string, caption: string) => Promise<boolean>;

/**
 * Đường ống đầy đủ: spec → SVG → PNG → Storage → Zalo.
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
  const png = await renderGeometryPng(svg);
  if (!png) return false;
  const url = await uploadGeometryPng(png, classId);
  if (!url) return false;
  return send(token, chatId, url, caption);
};
