/// <reference types="node" />
/**
 * Relay Gemini cho ví web: trình duyệt của giáo viên gửi lời nhắc, máy chủ gọi Gemini bằng khoá chung và trừ ví.
 *
 * Toàn bộ quy tắc khoá/ví/trần dùng lại NGUYÊN `callGeminiRaw` → `ensureGeminiKey` (cùng luật với chấm bài):
 *  - chế độ "chỉ khoá riêng" và khoá riêng có sẵn trên máy chủ thì chạy khoá riêng (không trừ ví);
 *  - chưa đồng ý tính phí / hết số dư / chạm trần thì trả 402 `AI_KEY_REQUIRED` để trình duyệt mở hộp nạp tiền.
 *
 * Hàm riêng (`api/ai-relay.ts`) để có `maxDuration` dài hơn hàm chấm bài (60s) mà không đụng giả định thời gian của
 * khoá chấm. Không stream: trả nguyên văn một lần.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from './_exam-core.js';
import { GeminiResponseError, callGeminiRaw, getGradingApiKey, moTaFinishReason } from './_grading-core.js';
import { createAiUsageContext, runWithAiUsage, vnDate } from './_ai-usage.js';
import { AiKeyRequiredError, aiKeyRequiredPayload } from './_ai-keys.js';
import { getBearerToken } from './_ai-gateway-core.js';
import {
  RELAY_GEMINI_TIMEOUT_MS,
  RELAY_MAX_OUTPUT_TOKENS,
  RELAY_TEMPERATURE,
  parseRelayBody,
  relayDailyLimit,
} from './_ai-relay-core.js';

export const AI_RELAY_QUOTA_COL = 'aiRelayQuota';

const sendError = (res: VercelResponse, status: number, error: string) => res.status(status).json({ error });

const readBody = (req: VercelRequest): unknown => {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(String(req.body || '{}'));
  } catch {
    return {};
  }
};

const verifyTeacher = async (req: VercelRequest): Promise<{ uid: string; anonymous: boolean } | null> => {
  const token = getBearerToken(req.headers.authorization);
  if (!token) return null;
  try {
    getAdminDb();
    const decoded = await getAuth().verifyIdToken(token);
    return { uid: decoded.uid, anonymous: decoded.firebase?.sign_in_provider === 'anonymous' };
  } catch (error) {
    console.error('[ai-relay] Firebase auth failed:', error);
    return null;
  }
};

export const handleAiRelay = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    void sendError(res, 405, 'Chỉ nhận POST.');
    return;
  }

  const user = await verifyTeacher(req);
  if (!user) {
    void sendError(res, 401, 'Bạn cần đăng nhập để dùng AI bằng ví web.');
    return;
  }
  // Học sinh vào bằng mã lớp là tài khoản ẩn danh: không được đốt khoá/ví của giáo viên bằng đường này.
  if (user.anonymous) {
    void sendError(res, 403, 'AI bằng ví web chỉ dùng được với tài khoản giáo viên đã đăng nhập.');
    return;
  }

  const parsed = parseRelayBody(readBody(req));
  if (!parsed.ok) {
    void sendError(res, parsed.status, parsed.error);
    return;
  }
  const { model, prompt, system, images } = parsed.value;

  const db = getAdminDb();
  const day = vnDate(new Date()).day;
  const quotaRef = db.collection(AI_RELAY_QUOTA_COL).doc(user.uid);
  const quotaSnap = await quotaRef.get();
  const sameDay = quotaSnap.exists && quotaSnap.data()?.day === day;
  const used = sameDay ? Number(quotaSnap.data()?.count) || 0 : 0;
  const limit = relayDailyLimit();
  if (used >= limit) {
    void sendError(res, 429, `Hôm nay tài khoản này đã dùng hết ${limit} lượt AI qua ví web. Thử lại vào ngày mai.`);
    return;
  }

  // Người chịu khoá/tiền = chính giáo viên gọi; feature cố định để sao kê gọi tên "AI của web".
  const context = createAiUsageContext(getBearerToken(req.headers.authorization), 'aiRelay', {});
  context.keyOwnerUid = user.uid;

  const bumpQuota = () => quotaRef.set({ day, count: sameDay ? FieldValue.increment(1) : 1 }, { merge: true });

  try {
    const result = await runWithAiUsage(context, () => callGeminiRaw(prompt, images, getGradingApiKey(), model, {
      temperature: RELAY_TEMPERATURE,
      maxOutputTokens: RELAY_MAX_OUTPUT_TOKENS,
      timeoutMs: RELAY_GEMINI_TIMEOUT_MS,
      ...(system ? { systemInstruction: system } : {}),
    }));
    await bumpQuota();

    const hasText = result.text.trim().length > 0;
    if (result.finishReason === 'SAFETY' || result.finishReason === 'PROHIBITED_CONTENT' || result.finishReason === 'RECITATION' || !hasText) {
      void sendError(res, 422, moTaFinishReason(result.finishReason, hasText) || 'AI không trả về kết quả. Thử lại sau ít phút.');
      return;
    }
    void res.status(200).json({ text: result.text, model, truncated: result.finishReason === 'MAX_TOKENS' });
  } catch (error) {
    if (error instanceof AiKeyRequiredError) {
      // Bị chặn trước khi gọi Google: không tính vào hạn mức ngày.
      res.status(402).json(aiKeyRequiredPayload(error));
      return;
    }
    await bumpQuota().catch(() => undefined);
    if (error instanceof GeminiResponseError) {
      console.error('[ai-relay] Gemini failed:', error.kind, error.message);
      void sendError(res, 502, error.message);
      return;
    }
    console.error('[ai-relay] Unexpected failure:', error);
    void sendError(res, 500, 'Máy chủ gặp lỗi khi gọi AI. Thử lại sau ít phút.');
  }
};
