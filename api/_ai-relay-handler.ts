/// <reference types="node" />
/**
 * Relay AI cho ví web: trình duyệt của giáo viên gửi lời nhắc, máy chủ gọi AI bằng khoá chung và trừ ví.
 *
 * Từ G1 (24/10/2026) provider 'gemini' chạy TRÊN chợ API Vilao (khoá môi trường `GRADING_VILAO_API_KEY`),
 * máy chủ không gọi Google trực tiếp trong đường này nữa; Claude/ChatGPT giữ khoá riêng hãng như cũ.
 *
 * Toàn bộ quy tắc khoá/ví/trần dùng lại NGUYÊN `ensureGeminiKey` qua `callVendor` (cùng luật với chấm bài):
 *  - chế độ "chỉ khoá riêng" và khoá riêng có sẵn trên máy chủ thì chạy khoá riêng (không trừ ví);
 *  - chưa đồng ý tính phí / hết số dư / chạm trần thì trả 402 `AI_KEY_REQUIRED` để trình duyệt mở hộp nạp tiền.
 *
 * Hàm riêng (`api/ai-relay.ts`) để không dùng chung khoá/hạn mức thời gian của hàm chấm bài (`api/grade-homework.ts`,
 * cũng 300s nhưng kèm khoá "đang chấm" và vòng chấm theo lô). Không stream: trả nguyên văn một lần.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from './_exam-core.js';
import { GeminiResponseError, moTaFinishReason } from './_grading-core.js';
import { createAiUsageContext, runWithAiUsage, vnDate } from './_ai-usage.js';
import { AiKeyRequiredError, aiKeyRequiredPayload } from './_ai-keys.js';
import { getBearerToken } from './_ai-gateway-core.js';
import { callVendor } from './_ai-relay-vendors.js';
import {
  RELAY_GEMINI_TIMEOUT_MS,
  RELAY_INFLIGHT_STALE_MS,
  RELAY_MAX_INFLIGHT,
  parseRelayBody,
  relayDailyLimit,
  relayGeminiBackendKey,
  relayVendorKey,
  studentDailyLimit,
  studentDayTotalCap,
  type RelayApiVendor,
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
  const isStudent = Boolean(user.anonymous && (readBody(req) as Record<string, unknown>)?.studentAi === true);
  // Học sinh vào bằng mã lớp là tài khoản ẩn danh: không được đốt khoá/ví của giáo viên bằng đường này,
  // trừ nhánh AI HỌC SINH riêng (G3) — hạn mức/ngày riêng, chạy khoá Vilao máy chủ (chủ dự án trả), không trừ ví thầy cô.
  if (user.anonymous && !isStudent) {
    void sendError(res, 403, 'AI bằng ví web chỉ dùng được với tài khoản giáo viên đã đăng nhập.');
    return;
  }

  const parsed = parseRelayBody(readBody(req));
  if (parsed.ok === false) {
    void sendError(res, parsed.status, parsed.error);
    return;
  }
  const { provider, model, prompt, system, images, effort } = parsed.value;
  // Hãng khác Gemini chỉ chạy khi chủ dự án đã đặt khoá của hãng đó trên máy chủ — kiểm TRƯỚC khi giữ chỗ/đếm hạn mức ngày.
  const apiVendor: RelayApiVendor = provider === 'gemini' ? 'vilao' : provider;
  const vendorKey = provider === 'gemini' ? relayGeminiBackendKey() : relayVendorKey(provider);
  if (!vendorKey) {
    void sendError(res, 503, provider === 'gemini'
      ? 'Ví web chưa cấu hình khoá AI trên máy chủ. Báo chủ dự án đặt GRADING_VILAO_API_KEY.'
      : 'Ví web chưa bật cho hãng AI này. Thầy/cô dùng khoá riêng của hãng trong Cài đặt, hoặc chọn Gemini.');
    return;
  }

  const db = getAdminDb();
  // Nhánh HS: chủ lớp lấy từ `studentLinks` của PHIÊN (không tin client). Không gắn với lớp nào thì không được dùng.
  let studentLink: { classId: string; studentId: string; teacherId: string } | null = null;
  if (isStudent) {
    const data = (await db.collection('studentLinks').doc(user.uid).get()).data() ?? {};
    const link = { classId: String(data.classId || ''), studentId: String(data.studentId || ''), teacherId: String(data.teacherId || '') };
    if (!link.classId || !link.studentId || !link.teacherId) {
      void sendError(res, 403, 'Em cần vào lớp bằng mã lớp trước khi dùng AI.');
      return;
    }
    studentLink = link;
  }
  const day = vnDate(new Date()).day;
  const quotaRef = db.collection(AI_RELAY_QUOTA_COL).doc(user.uid);
  const limit = isStudent ? studentDailyLimit() : relayDailyLimit();
  // Trần TỔNG lượt AI học sinh cả hệ thống mỗi ngày (chống lạm dụng khoá Vilao server) — một doc chung, editable bằng env.
  const studentTotalRef = db.collection(AI_RELAY_QUOTA_COL).doc('_studentDayTotal');
  const studentTotalCap = studentDayTotalCap();

  // GIỮ CHỐ trước khi gọi AI, trong một giao dịch: đọc-rồi-ghi tách rời thì ba lượt song song cùng thấy "còn chỗ"
  // và cùng đi qua (QA F2). Đồng thời giữ tối đa RELAY_MAX_INFLIGHT lượt chạy cùng lúc để chặn ví âm quá sâu.
  const now = Date.now();
  const reserved = await db.runTransaction(async transaction => {
    const snap = await transaction.get(quotaRef);
    const data = snap.exists ? snap.data() ?? {} : {};
    const count = data.day === day ? Number(data.count) || 0 : 0;
    const inflight = Number(data.inflightAt) > now - RELAY_INFLIGHT_STALE_MS ? Number(data.inflight) || 0 : 0;
    // Riêng nhánh HS: thêm một doc đếm tổng cả hệ thống — hết trần tổng thì mọi HS chờ sang ngày mới.
    let totalLeft = true;
    if (isStudent) {
      const totalSnap = await transaction.get(studentTotalRef);
      const totalData = totalSnap.exists ? totalSnap.data() ?? {} : {};
      const total = totalData.day === day ? Number(totalData.count) || 0 : 0;
      if (total >= studentTotalCap) totalLeft = false;
    }
    if (count >= limit) return `Hôm nay tài khoản này đã dùng hết ${limit} lượt AI. Thử lại vào ngày mai.`;
    if (!totalLeft) return 'Hệ thống đã hết lượt AI học sinh hôm nay (trần chung). Em thử lại vào ngày mai nhé.';
    if (inflight >= RELAY_MAX_INFLIGHT) return `Đang có ${RELAY_MAX_INFLIGHT} lượt AI chạy cùng lúc. Chờ một lượt xong rồi thử lại.`;
    transaction.set(quotaRef, { day, count: count + 1, inflight: inflight + 1, inflightAt: now, ...(isStudent ? { student: true } : {}) }, { merge: true });
    if (isStudent) transaction.set(studentTotalRef, { day, count: FieldValue.increment(1) }, { merge: true });
    return null;
  });
  if (reserved) {
    void sendError(res, 429, reserved);
    return;
  }
  // Trả chỗ khi xong. Lượt bị chặn TRƯỚC khi gọi AI (402) thì hoàn luôn cả lượt trong ngày.
  let refund = false;
  const release = () => quotaRef.set(
    { inflight: FieldValue.increment(-1), ...(refund ? { count: FieldValue.increment(-1) } : {}) },
    { merge: true },
  );

  // Người chịu khoá/tiền = chính giáo viên gọi (HS thì thầy cô chủ lớp từ studentLinks); feature để sao kê phân biệt.
  const context = createAiUsageContext(
    getBearerToken(req.headers.authorization),
    isStudent ? 'studentAi' : 'aiRelay',
    studentLink ? { classId: studentLink.classId, studentId: studentLink.studentId } : {},
  );
  context.keyOwnerUid = studentLink ? studentLink.teacherId : user.uid;
  // HS: chạy khoá Vilao máy chủ, KHÔNG trừ ví thầy cô — đã có hạn mức riêng (mỗi em/ngày + trần tổng hệ thống) ở trên.
  // Đặt sẵn khoá cho request thì `ensureGeminiKey` dùng luôn, không xét đồng ý/ví/trần của giáo viên.
  if (studentLink) context.keyChoice = { key: vendorKey, source: 'shared', ownerUid: studentLink.teacherId, billing: null };

  try {
    const result = await runWithAiUsage(context, async (): Promise<{ text: string; finishReason?: string }> => {
      const vendor = await callVendor({ vendor: apiVendor, apiKey: vendorKey, model, prompt, system, images, effort, timeoutMs: RELAY_GEMINI_TIMEOUT_MS });
      return { text: vendor.text, finishReason: vendor.refused ? 'SAFETY' : vendor.truncated ? 'MAX_TOKENS' : 'STOP' };
    });

    const hasText = result.text.trim().length > 0;
    if (result.finishReason === 'SAFETY' || result.finishReason === 'PROHIBITED_CONTENT' || result.finishReason === 'RECITATION' || !hasText) {
      void sendError(res, 422, moTaFinishReason(result.finishReason, hasText) || 'AI không trả về kết quả. Thử lại sau ít phút.');
      return;
    }
    void res.status(200).json({ text: result.text, model, truncated: result.finishReason === 'MAX_TOKENS' });
  } catch (error) {
    if (error instanceof AiKeyRequiredError) {
      // Bị chặn trước khi gọi AI: không tính vào hạn mức ngày.
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
