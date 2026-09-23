/// <reference types="node" />
/**
 * ĐẾM TOKEN cho mọi lượt gọi AI bằng KHOÁ CHUNG của chủ dự án (chấm BTVN, giải đề, mô phỏng, GLM).
 *
 * Mục đích: chủ dự án biết ai đã dùng bao nhiêu và quy ra tiền để thu lại. Vì vậy:
 *  - Chỉ lưu SỐ TOKEN THÔ + model. Tiền tính lúc hiển thị theo bảng giá — sửa bảng giá là áp lại
 *    được cho cả dữ liệu cũ, không phải ghi lại.
 *  - Google tính tiền cả lượt bị cắt (MAX_TOKENS) hay bị chặn, nên nơi gọi phải ghi TRƯỚC khi ném lỗi.
 *  - Ghi hỏng KHÔNG được làm hỏng lượt chấm của học sinh: mọi lỗi ở đây chỉ log.
 *
 * Ai gọi / lớp nào lấy từ ngữ cảnh theo lượt request (AsyncLocalStorage): handler gắn một lần ở
 * đầu, mọi lượt gọi AI lồng bên trong (kể cả chấm chạy nền) tự nhận đúng ngữ cảnh.
 * Collection `aiUsage` chỉ máy chủ ghi/đọc (rules chặn client).
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from './_exam-core.js';

export const AI_USAGE_COL = 'aiUsage';

export interface AiUsageIdentity {
  uid: string | null;
  email: string | null;
  /** Học sinh vào bằng mã lớp + PIN là tài khoản ẩn danh. */
  anonymous: boolean;
}

export interface AiUsageContext {
  /** Tính năng gọi AI (action của endpoint). */
  feature: string;
  /** Mã tham chiếu để quy về lớp / giáo viên chủ lớp khi lập bảng kê. */
  refs: Record<string, string>;
  /**
   * Người gọi, giải mã LƯỜI: chỉ khi có lượt AI thật sự cần ghi mới verify token, nên gắn ngữ
   * cảnh cho cả endpoint nhiều request (điểm danh, đăng nhập…) không tốn thêm gì.
   */
  identity: () => Promise<AiUsageIdentity>;
}

export interface AiTokenCounts {
  inputTokens: number;
  outputTokens: number;
  /** Token "suy nghĩ" — Google tính theo GIÁ ĐẦU RA. */
  thoughtsTokens: number;
  /** Phần đầu vào đọc từ cache (giá rẻ hơn); đã nằm TRONG inputTokens. */
  cachedTokens: number;
  totalTokens: number;
}

export type AiProvider = 'gemini' | 'ai-gateway';

const storage = new AsyncLocalStorage<AiUsageContext>();

export const runWithAiUsage = <T>(context: AiUsageContext, fn: () => Promise<T>): Promise<T> => storage.run(context, fn);

export const currentAiUsageContext = (): AiUsageContext | null => storage.getStore() ?? null;

const count = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0);

/** `usageMetadata` của Gemini → số token. Không có thì null (không ghi gì). */
export const geminiUsageCounts = (meta: unknown): AiTokenCounts | null => {
  if (!meta || typeof meta !== 'object') return null;
  const m = meta as Record<string, unknown>;
  const inputTokens = count(m.promptTokenCount);
  const outputTokens = count(m.candidatesTokenCount);
  const thoughtsTokens = count(m.thoughtsTokenCount);
  const cachedTokens = count(m.cachedContentTokenCount);
  const totalTokens = count(m.totalTokenCount) || inputTokens + outputTokens + thoughtsTokens;
  if (totalTokens === 0) return null;
  return { inputTokens, outputTokens, thoughtsTokens, cachedTokens, totalTokens };
};

/** `usage` kiểu OpenAI (Vercel AI Gateway) → số token. */
export const openAiUsageCounts = (usage: unknown): AiTokenCounts | null => {
  if (!usage || typeof usage !== 'object') return null;
  const u = usage as Record<string, unknown>;
  const inputTokens = count(u.prompt_tokens);
  const completion = count(u.completion_tokens);
  const details = (u.completion_tokens_details && typeof u.completion_tokens_details === 'object'
    ? u.completion_tokens_details : {}) as Record<string, unknown>;
  const promptDetails = (u.prompt_tokens_details && typeof u.prompt_tokens_details === 'object'
    ? u.prompt_tokens_details : {}) as Record<string, unknown>;
  const thoughtsTokens = count(details.reasoning_tokens);
  const cachedTokens = count(promptDetails.cached_tokens);
  const totalTokens = count(u.total_tokens) || inputTokens + completion;
  if (totalTokens === 0) return null;
  // OpenAI gộp reasoning vào completion_tokens; tách ra để cột "đầu ra" không bị đếm hai lần.
  return { inputTokens, outputTokens: Math.max(0, completion - thoughtsTokens), thoughtsTokens, cachedTokens, totalTokens };
};

/** Ngày/tháng theo giờ Việt Nam để gom bảng kê đúng tháng thu tiền. */
const vnDate = (now: Date): { day: string; month: string } => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now);
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? '00';
  return { day: `${get('year')}-${get('month')}-${get('day')}`, month: `${get('year')}-${get('month')}` };
};

const ANONYMOUS_UNKNOWN: AiUsageIdentity = { uid: null, email: null, anonymous: false };

export const buildAiUsageRecord = (
  context: { feature: string; refs: Record<string, string> } | null,
  identity: AiUsageIdentity,
  provider: AiProvider,
  model: string,
  counts: AiTokenCounts,
  extra: { finishReason?: string } = {},
  now: Date = new Date(),
): Record<string, unknown> => ({
  at: now.toISOString(),
  ...vnDate(now),
  provider,
  model,
  feature: context?.feature || 'unknown',
  uid: identity.uid,
  email: identity.email,
  anonymous: identity.anonymous,
  refs: context?.refs ?? {},
  ...counts,
  ...(extra.finishReason ? { finishReason: extra.finishReason } : {}),
});

/** Ghi một lượt dùng. KHÔNG bao giờ ném lỗi ra ngoài. */
export const recordAiUsage = async (
  provider: AiProvider,
  model: string,
  counts: AiTokenCounts | null,
  extra: { finishReason?: string } = {},
): Promise<void> => {
  if (!counts) return;
  try {
    const context = currentAiUsageContext();
    const identity = context ? await context.identity() : ANONYMOUS_UNKNOWN;
    const record = buildAiUsageRecord(context, identity, provider, model, counts, extra);
    await getAdminDb().collection(AI_USAGE_COL).add(record);
  } catch (error) {
    console.error('[ai-usage] không ghi được lượt dùng AI:', error);
  }
};

const REF_KEYS = ['classId', 'submissionId', 'assignmentId', 'setId', 'studentId', 'examId', 'attemptId'] as const;

/** Rút mã tham chiếu có trong body (không tin để phân quyền — chỉ để quy về lớp khi lập bảng kê). */
export const refsFromBody = (body: Record<string, unknown>): Record<string, string> => {
  const refs: Record<string, string> = {};
  for (const key of REF_KEYS) {
    const value = body[key];
    if (typeof value === 'string' && value.trim() && value.length <= 200) refs[key] = value.trim();
  }
  return refs;
};

/** Giải mã token → người gọi. Token hỏng/thiếu thì uid null — TỪ CHỐI truy cập là việc của handler. */
export const identityFromToken = async (idToken: unknown): Promise<AiUsageIdentity> => {
  if (typeof idToken !== 'string' || !idToken) return ANONYMOUS_UNKNOWN;
  try {
    getAdminDb();
    const decoded = await getAuth().verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: typeof decoded.email === 'string' ? decoded.email : null,
      anonymous: decoded.firebase?.sign_in_provider === 'anonymous',
    };
  } catch {
    return ANONYMOUS_UNKNOWN;
  }
};

/** Dựng ngữ cảnh — ĐỒNG BỘ, không tốn gì; token chỉ giải mã (một lần) khi có lượt AI cần ghi. */
export const createAiUsageContext = (
  idToken: unknown,
  feature: string,
  body: Record<string, unknown> = {},
  resolveIdentity: (token: unknown) => Promise<AiUsageIdentity> = identityFromToken,
): AiUsageContext => {
  let cached: Promise<AiUsageIdentity> | null = null;
  return {
    feature,
    refs: refsFromBody(body),
    identity: () => (cached ??= resolveIdentity(idToken)),
  };
};
