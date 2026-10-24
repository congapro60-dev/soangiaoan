/**
 * SINH ẢNH RASTER minh họa bối cảnh / CDTC cho giáo án — đích Vilao `/v1/images/generations` (G3, 24/10).
 *
 * Gộp vào dispatcher `grade-homework` qua `action: 'generateImage'` để không tốn slot Vercel
 * (trần 12 function). Dùng CHUNG cơ chế khoá + ví như chấm bài:
 *   - `setAiKeyOwner(uid)` → `ensureGeminiKey` chọn khoá (khoá chung Vilao của chủ dự án) + cổng billing;
 *   - `recordImageUsage` ghi lượt + trừ ví (chỉ khoá chung mới tính tiền, tính theo SỐ ẢNH).
 * AiKeyRequiredError để dispatcher bắt → 402 (client mở hộp đồng ý dùng khoá chung).
 * Model đặt qua env `AI_IMAGE_MODEL` (mặc định `gpt-image-2` 90₫/ảnh, có thể đổi bằng env không sửa code).
 *
 * RANH GIỚI: chỉ ảnh minh họa bối cảnh/CDTC. KHÔNG dùng cho hình Toán chính xác (đồ thị, hình
 * học, miền nghiệm, biểu đồ số liệu) — những thứ đó giữ TikZ/bảng. Chặn thẳng directive như vậy.
 *
 * Ảnh sinh xong lưu Firebase Storage, cache theo hash(model+directive+style+tỉ lệ): lần sau dùng
 * lại, không sinh lại. Vilao trả ĐỒNG BỘ (POST → 200 có b64_json hoặc url), ảnh chậm 26–52s —
 * hàm dispatcher đã maxDuration 300s, client không được cắt sớm.
 */
/// <reference types="node" />
import { createHash, randomUUID } from 'node:crypto';
import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { getAdminStorage } from './_exam-core.js';
import { acquireCallHoldWaiting, recordImageUsage, releaseWalletHold, setAiKeyOwner } from './_ai-usage.js';
import { AiKeyRequiredError, ensureGeminiKey } from './_ai-keys.js';

const imageModel = (env: NodeJS.ProcessEnv = process.env): string => env.AI_IMAGE_MODEL?.trim() || 'gpt-image-2';
/** Khoá Vilao của máy chủ cho ví (fallback của `ensureGeminiKey`) — đọc MỖI LẦN GỌI để env đổi theo deployment. */
const vilaoImagesKey = (env: NodeJS.ProcessEnv = process.env): string => env.GRADING_VILAO_API_KEY?.trim() || '';
const vilaoImagesBaseUrl = (env: NodeJS.ProcessEnv = process.env): string =>
  (env.GRADING_VILAO_BASE_URL?.trim() || 'https://api.vilao.ai/v1').replace(/\/+$/, '');
const IMAGE_TIMEOUT_MS = 120_000;
const MAX_DIRECTIVE_LENGTH = 1000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const IMAGES_COL = 'aiImages';
const STORAGE_PREFIX = 'ai-images';

/** Tỉ lệ ảnh cho phép; Vilao nhận `size` (gpt-image-2: 1024×1024 / 1536×1024 / 1024×1536). */
const ASPECT_RATIOS = new Set(['1:1', '4:3', '3:4', '16:9', '9:16']);
const DEFAULT_ASPECT = '4:3';
const ASPECT_TO_SIZE: Record<string, string> = {
  '1:1': '1024x1024',
  '4:3': '1536x1024',
  '16:9': '1536x1024',
  '3:4': '1024x1536',
  '9:16': '1024x1536',
};

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

const cacheKey = (directive: string, style: string, aspectRatio: string, model: string): string =>
  createHash('sha256').update(`${model}\n${style}\n${aspectRatio}\n${directive}`).digest('hex').slice(0, 32);

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

/**
 * Gọi Vilao tạo ảnh: 200 trả `data[0].b64_json` (gpt-image-2) hoặc `data[0].url` (model khăn CDN,
 * vd gemini-3.1-flash-image) — cả hai đều quy về bytes để lưu Storage.
 */
const generateImageOnVilao = async (key: string, prompt: string, aspectRatio: string, model: string, baseUrl: string): Promise<Buffer | null> => {
  const size = ASPECT_TO_SIZE[aspectRatio] || ASPECT_TO_SIZE[DEFAULT_ASPECT];
  const res = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, size, n: 1 }),
    signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Vilao trả lỗi ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = await res.json().catch(() => null) as {
    data?: Array<{ b64_json?: unknown; url?: unknown }>;
  } | null;
  const first = data?.data?.[0];
  if (typeof first?.b64_json === 'string' && first.b64_json) return Buffer.from(first.b64_json, 'base64');
  if (typeof first?.url === 'string' && first.url) {
    const bytesRes = await fetch(first.url as string, { signal: AbortSignal.timeout(30_000) });
    if (!bytesRes.ok) return null;
    return Buffer.from(await bytesRes.arrayBuffer());
  }
  return null;
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
  } catch (error) {
    console.error('[ai-image] verify idToken lỗi:', error instanceof Error ? error.message : error);
    return res.status(401).json({ error: `Cần đăng nhập tài khoản giáo viên. (debug: ${error instanceof Error ? error.message.slice(0, 200) : 'không rõ'})` });
  }

  if (!checkRateLimit(uid)) {
    return res.status(429).json({ error: 'Sinh ảnh hơi nhanh. Chờ chút rồi thử lại.' });
  }

  if (!vilaoImagesKey()) {
    return res.status(503).json({ error: 'Máy chủ chưa cấu hình khoá Vilao (GRADING_VILAO_API_KEY). Báo chủ dự án.' });
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

  const generationModel = imageModel();
  const hash = cacheKey(directive, style, aspectRatio, generationModel);
  const cacheRef = db.collection(IMAGES_COL).doc(hash);
  const cached = await cacheRef.get();
  if (cached.exists && typeof cached.data()?.url === 'string') {
    return res.status(200).json({ ok: true, url: cached.data()!.url, cached: true });
  }

  // Khoá + ví: khoá Vilao chung của chủ dự án, giáo viên chịu phí ví (giữ nguyên cổng như chấm bài).
  setAiKeyOwner(uid);
  const choice = await ensureGeminiKey(vilaoImagesKey());
  const prompt = buildImagePrompt(directive, style);

  // Giữ chỗ tiền trước khi gọi (chỉ lượt bị trừ ví): chặn các lượt song song cùng lọt qua kiểm số dư (QA F3).
  const acquisition = await acquireCallHoldWaiting(choice);
  if (acquisition.ok === false) throw new AiKeyRequiredError(acquisition.reason === 'timeout' ? 'no_balance' : acquisition.reason, choice.ownerUid);
  const holdVnd = acquisition.holdVnd;
  let handedOver = false;
  let bytes: Buffer | null = null;
  let upstreamError = '';
  try {
    try {
      bytes = await generateImageOnVilao(choice.key, prompt, aspectRatio, generationModel, vilaoImagesBaseUrl());
    } catch (error) {
      upstreamError = error instanceof Error ? error.message : String(error);
      console.error('[ai-image] Vilao lỗi:', upstreamError.slice(0, 300));
    }

    if (!bytes) {
      return res.status(502).json({ error: `Không sinh được ảnh. Thử lại sau hoặc bỏ ảnh cho lượt này. (debug: ${upstreamError.slice(0, 200) || 'không rõ'})` });
    }

    // Ghi lượt + trừ ví TRƯỚC khi trả về (lượt này đã tính tiền dù bước lưu có lỗi). `recordImageUsage` nhận luôn phần giữ chỗ.
    handedOver = true;
    await recordImageUsage(generationModel, 1, { holdVnd });
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
    model: generationModel,
    createdAt: new Date().toISOString(),
    createdBy: uid,
  }, { merge: true });

  return res.status(200).json({ ok: true, url, cached: false });
};
