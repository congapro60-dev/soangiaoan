/**
 * SINH ẢNH RASTER minh họa bối cảnh / CDTC cho giáo án (Imagen qua @google/genai).
 *
 * Gộp vào dispatcher `grade-homework` qua `action: 'generateImage'` để không tốn slot Vercel
 * (trần 12 function). Dùng CHUNG cơ chế khoá + ví như chấm bài:
 *   - `setAiKeyOwner(uid)` → `ensureGeminiKey` chọn khoá (chung/riêng) + cổng billing;
 *   - `recordImageUsage` ghi lượt + trừ ví (chỉ khoá chung mới tính tiền, tính theo SỐ ẢNH).
 * AiKeyRequiredError để dispatcher bắt → 402 (client mở hộp nhập khoá / đồng ý dùng khoá chung).
 *
 * RANH GIỚI: chỉ ảnh minh họa bối cảnh/CDTC. KHÔNG dùng cho hình Toán chính xác (đồ thị, hình
 * học, miền nghiệm, biểu đồ số liệu) — những thứ đó giữ TikZ/bảng. Chặn thẳng directive như vậy.
 *
 * Ảnh sinh xong lưu Firebase Storage, cache theo hash(model+directive+style+tỉ lệ): lần sau dùng
 * lại, không sinh lại (raster chậm + tốn tiền). Client gọi ở bước HẬU-SINH giáo án, không lúc xuất.
 */
/// <reference types="node" />
import { createHash, randomUUID } from 'node:crypto';
import type { VercelResponse } from '@vercel/node';
import { GoogleGenAI, PersonGeneration } from '@google/genai';
import { getAuth } from 'firebase-admin/auth';
import { getAdminStorage } from './_exam-core.js';
import { getGradingApiKey } from './_grading-core.js';
import { acquireCallHoldWaiting, recordImageUsage, releaseWalletHold, setAiKeyOwner } from './_ai-usage.js';
import { AiKeyRequiredError, ensureGeminiKey, onOwnKeyFailure } from './_ai-keys.js';
import { classifyGeminiKeyFailure } from '../src/lib/admin/aiKeyPolicy.js';

/** Imagen 4 (bản chuẩn) — giá/ảnh niêm yết trong `aiPricing.ts` để sao kê quy ra tiền. */
const IMAGE_MODEL = 'imagen-4.0-generate-001';
const MAX_DIRECTIVE_LENGTH = 1000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const IMAGES_COL = 'aiImages';
const STORAGE_PREFIX = 'ai-images';

/** Tỉ lệ ảnh cho phép (Imagen hỗ trợ); mặc định 4:3 hợp minh họa trong giáo án. */
const ASPECT_RATIOS = new Set(['1:1', '4:3', '3:4', '16:9', '9:16']);
const DEFAULT_ASPECT = '4:3';

/**
 * Directive rơi vào NỘI DUNG TOÁN CHÍNH XÁC — từ chối, buộc dùng TikZ/bảng để số/hình không bị
 * ảnh raster "nói dối". Chỉ chặn từ khoá rõ ràng, không chặn bối cảnh đời thường (chợ, cầu…).
 */
const MATH_FIGURE_RE = /đồ thị|miền nghiệm|hệ trục|trục tọa độ|parabol|hình học|tam giác|đường tròn|biểu đồ|bảng số liệu|hàm số/i;

interface RateLimitWindow {
  startedAt: number;
  count: number;
}
const rateLimits = new Map<string, RateLimitWindow>();

const checkRateLimit = (uid: string): boolean => {
  const now = Date.now();
  const current = rateLimits.get(uid);
  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(uid, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  current.count += 1;
  return true;
};

const normalizeStyle = (value: unknown): 'flat' | 'realistic' => (value === 'realistic' ? 'realistic' : 'flat');

/** Ràng buộc an toàn/chất lượng chung: minh họa phẳng, KHÔNG chữ/số trong ảnh, không người thật. */
const buildImagePrompt = (directive: string, style: 'flat' | 'realistic'): string => {
  const look = style === 'realistic'
    ? 'soft realistic illustration, gentle lighting'
    : 'clean flat vector illustration, simple shapes, pastel palette';
  return [
    directive,
    `Style: ${look}, educational, friendly, suitable for a Vietnamese high-school lesson.`,
    'No text, no letters, no numbers anywhere in the image.',
    'No real recognizable people, no logos, no brands.',
    'Avoid sensitive religious, political or gender-charged content.',
  ].join(' ');
};

const cacheKey = (directive: string, style: string, aspectRatio: string): string =>
  createHash('sha256').update(`${IMAGE_MODEL}\n${style}\n${aspectRatio}\n${directive}`).digest('hex').slice(0, 32);

/** Lưu PNG vào Storage → link tải có token (giống ảnh QR nạp tiền). */
const saveImagePng = async (hash: string, bytes: Buffer): Promise<string> => {
  const bucket = getAdminStorage();
  const token = randomUUID();
  const path = `${STORAGE_PREFIX}/${hash}.png`;
  await bucket.file(path).save(bytes, {
    resumable: false,
    metadata: { contentType: 'image/png', metadata: { firebaseStorageDownloadTokens: token } },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
};

const generateImagen = async (key: string, prompt: string, aspectRatio: string): Promise<Buffer | null> => {
  const ai = new GoogleGenAI({ apiKey: key });
  const result = await ai.models.generateImages({
    model: IMAGE_MODEL,
    prompt,
    config: { numberOfImages: 1, aspectRatio, personGeneration: PersonGeneration.DONT_ALLOW },
  });
  const base64 = result.generatedImages?.[0]?.image?.imageBytes;
  return typeof base64 === 'string' && base64.length > 0 ? Buffer.from(base64, 'base64') : null;
};

/**
 * POST { action:'generateImage', idToken, directive, style?, aspectRatio? }
 *   → { ok:true, url, cached }  |  402 (cần khoá)  |  4xx (đầu vào/loại ảnh sai)
 */
export const handleGenerateImage = async (
  db: FirebaseFirestore.Firestore,
  body: Record<string, unknown>,
  res: VercelResponse,
): Promise<VercelResponse> => {
  let uid: string;
  try {
    if (typeof body.idToken !== 'string' || !body.idToken) throw new Error('no-token');
    uid = (await getAuth().verifyIdToken(body.idToken)).uid;
  } catch {
    return res.status(401).json({ error: 'Cần đăng nhập tài khoản giáo viên.' });
  }

  if (!checkRateLimit(uid)) {
    return res.status(429).json({ error: 'Sinh ảnh hơi nhanh. Chờ chút rồi thử lại.' });
  }

  const directive = typeof body.directive === 'string' ? body.directive.trim() : '';
  if (!directive || directive.length > MAX_DIRECTIVE_LENGTH) {
    return res.status(400).json({ error: 'Mô tả ảnh phải là chuỗi 1–1000 ký tự.' });
  }
  if (MATH_FIGURE_RE.test(directive)) {
    return res.status(422).json({
      error: 'Nội dung Toán chính xác (đồ thị/hình học/miền nghiệm/biểu đồ số liệu) phải dùng TikZ hoặc bảng, không dùng ảnh AI.',
      code: 'USE_TIKZ',
    });
  }
  const style = normalizeStyle(body.style);
  const aspectRatio = ASPECT_RATIOS.has(String(body.aspectRatio)) ? String(body.aspectRatio) : DEFAULT_ASPECT;

  const hash = cacheKey(directive, style, aspectRatio);
  const cacheRef = db.collection(IMAGES_COL).doc(hash);
  const cached = await cacheRef.get();
  if (cached.exists && typeof cached.data()?.url === 'string') {
    return res.status(200).json({ ok: true, url: cached.data()!.url, cached: true });
  }

  // Khoá + ví: giáo viên gọi tự chịu phí (khoá chung) hoặc dùng khoá riêng (Google tính trực tiếp).
  setAiKeyOwner(uid);
  const fallbackKey = getGradingApiKey();
  let choice = await ensureGeminiKey(fallbackKey);
  const prompt = buildImagePrompt(directive, style);

  // Giữ chỗ tiền trước khi gọi (chỉ lượt bị trừ ví): chặn các lượt song song cùng lọt qua kiểm số dư (QA F3).
  const acquire = async (): Promise<number> => {
    const held = await acquireCallHoldWaiting(choice);
    if (!held.ok) throw new AiKeyRequiredError(held.reason === 'timeout' ? 'no_balance' : held.reason, choice.ownerUid);
    return held.holdVnd;
  };
  let holdVnd = await acquire();
  let handedOver = false;
  let bytes: Buffer | null;
  try {
    try {
      bytes = await generateImagen(choice.key, prompt, aspectRatio);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const keyFailure = classifyGeminiKeyFailure(Number((error as { status?: unknown }).status) || 0, detail);
      if (choice.source !== 'own' || !keyFailure) {
        return res.status(502).json({ error: 'Không sinh được ảnh. Thử lại sau hoặc bỏ ảnh cho lượt này.' });
      }
      // Khoá riêng của giáo viên bị Google từ chối → chuyển khoá chung (nếu được phép) rồi thử lại.
      choice = await onOwnKeyFailure(choice, keyFailure, detail, fallbackKey);
      holdVnd = await acquire();
      bytes = await generateImagen(choice.key, prompt, aspectRatio).catch(() => null);
    }

    if (!bytes) {
      return res.status(502).json({ error: 'Không sinh được ảnh. Thử lại sau hoặc bỏ ảnh cho lượt này.' });
    }

    // Ghi lượt + trừ ví TRƯỚC khi trả về (lượt này đã tính tiền dù bước lưu có lỗi). `recordImageUsage` nhận luôn phần giữ chỗ.
    handedOver = true;
    await recordImageUsage(IMAGE_MODEL, 1, { holdVnd });
  } finally {
    if (holdVnd > 0 && !handedOver && choice.ownerUid) {
      await releaseWalletHold(db, choice.ownerUid, holdVnd).catch(error => console.error('[ai-image] không trả được chỗ giữ tiền:', error));
    }
  }

  const url = await saveImagePng(hash, bytes);
  await cacheRef.set({
    hash,
    url,
    directive,
    style,
    aspectRatio,
    model: IMAGE_MODEL,
    createdAt: new Date().toISOString(),
    createdBy: uid,
  }, { merge: true });

  return res.status(200).json({ ok: true, url, cached: false });
};
