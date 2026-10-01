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
import { callVendor } from './_ai-relay-vendors.js';
import {
  RELAY_GEMINI_TIMEOUT_MS,
  RELAY_INFLIGHT_STALE_MS,
  RELAY_MAX_INFLIGHT,
  RELAY_MAX_OUTPUT_TOKENS,
  RELAY_TEMPERATURE,
  parseRelayBody,
  relayDailyLimit,
  relayVendorKey,
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
  const { provider, model, prompt, system, images } = parsed.value;
  // Hãng khác Gemini chỉ chạy khi chủ dự án đã đặt khoá của hãng đó trên máy chủ — kiểm TRƯỚC khi giữ chỗ/đếm hạn mức ngày.
  const vendorKey = provider === 'gemini' ? null : relayVendorKey(provider);
  if (provider !== 'gemini' && !vendorKey) {
    void sendError(res, 503, 'Ví web chưa bật cho hãng AI này. Thầy/cô dùng khoá riêng của hãng trong Cài đặt, hoặc chọn Gemini.');
    return;
  }

  const db = getAdminDb();
  const day = vnDate(new Date()).day;
  const quotaRef = db.collection(AI_RELAY_QUOTA_COL).doc(user.uid);
  const limit = relayDailyLimit();

  // GIỮ CHỖ trước khi gọi Google, trong một giao dịch: đọc-rồi-ghi tách rời thì ba lượt song song cùng thấy "còn chỗ"
  // và cùng đi qua (QA F2). Đồng thời giữ tối đa RELAY_MAX_INFLIGHT lượt chạy cùng lúc để chặn ví âm quá sâu.
  const now = Date.now();
  const reserved = await db.runTransaction(async transaction => {
    const snap = await transaction.get(quotaRef);
    const data = snap.exists ? snap.data() ?? {} : {};
    const count = data.day === day ? Number(data.count) || 0 : 0;
    const inflight = Number(data.inflightAt) > now - RELAY_INFLIGHT_STALE_MS ? Number(data.inflight) || 0 : 0;
    if (count >= limit) return `Hôm nay tài khoản này đã dùng hết ${limit} lượt AI qua ví web. Thử lại vào ngày mai.`;
    if (inflight >= RELAY_MAX_INFLIGHT) return `Đang có ${RELAY_MAX_INFLIGHT} lượt AI chạy cùng lúc. Chờ một lượt xong rồi thử lại.`;
    transaction.set(quotaRef, { day, count: count + 1, inflight: inflight + 1, inflightAt: now }, { merge: true });
    return null;
  });
  if (reserved) {
    void sendError(res, 429, reserved);
    return;
  }
  // Trả chỗ khi xong. Lượt bị chặn TRƯỚC khi gọi Google (402) thì hoàn luôn cả lượt trong ngày.
  let refund = false;
  const release = () => quotaRef.set(
    { inflight: FieldValue.increment(-1), ...(refund ? { count: FieldValue.increment(-1) } : {}) },
    { merge: true },
  );

  // Người chịu khoá/tiền = chính giáo viên gọi; feature cố định để sao kê gọi tên "AI của web".
  const context = createAiUsageContext(getBearerToken(req.headers.authorization), 'aiRelay', {});
  context.keyOwnerUid = user.uid;

  try {
    const result = await runWithAiUsage(context, async (): Promise<{ text: string; finishReason?: string }> => {
      if (provider !== 'gemini' && vendorKey) {
        const vendor = await callVendor({ vendor: provider, apiKey: vendorKey, model, prompt, system, images, timeoutMs: RELAY_GEMINI_TIMEOUT_MS });
        return { text: vendor.text, finishReason: vendor.refused ? 'SAFETY' : vendor.truncated ? 'MAX_TOKENS' : 'STOP' };
      }
      return callGeminiRaw(prompt, images, getGradingApiKey(), model, {
        temperature: RELAY_TEMPERATURE,
        maxOutputTokens: RELAY_MAX_OUTPUT_TOKENS,
        timeoutMs: RELAY_GEMINI_TIMEOUT_MS,
        ...(system ? { systemInstruction: system } : {}),
      });
    });

    const hasText = result.text.trim().length > 0;
    if (result.finishReason === 'SAFETY' || result.finishReason === 'PROHIBITED_CONTENT' || result.finishReason === 'RECITATION' || !hasText) {
      void sendError(res, 422, moTaFinishReason(result.finishReason, hasText) || 'AI không trả về kết quả. Thử lại sau ít phút.');
      return;
    }
    void res.status(200).json({ text: result.text, model, truncated: result.finishReason === 'MAX_TOKENS' });
  } catch (error) {
    if (error instanceof AiKeyRequiredError) {
      // Bị chặn trước khi gọi Google: không tính vào hạn mức ngày.
      refund = true;
      res.status(402).json(aiKeyRequiredPayload(error));
      return;
    }
    if (error instanceof GeminiResponseError) {
      console.error('[ai-relay] Gemini failed:', error.kind, error.message);
      void sendError(res, 502, error.message);
      return;
    }
    console.error('[ai-relay] Unexpected failure:', error);
    void sendError(res, 500, 'Máy chủ gặp lỗi khi gọi AI. Thử lại sau ít phút.');
  } finally {
    await release().catch(error => console.error('[ai-relay] không trả được chỗ giữ:', error));
  }
};
