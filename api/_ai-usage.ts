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
import { randomUUID } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from './_exam-core.js';
import { FieldValue } from 'firebase-admin/firestore';
import type { AiKeySource } from '../src/lib/admin/aiKeyPolicy.js';
import { costUsdOfCall, costUsdOfImage } from '../src/lib/admin/aiPricing.js';
import { chargeForCall, type VoucherRedemption } from '../src/lib/admin/aiWallet.js';

export const AI_USAGE_COL = 'aiUsage';
/** Sổ chi tiêu khoá chung theo giáo viên + tháng (`{uid}_{YYYY-MM}`), chỉ máy chủ đọc/ghi. */
export const AI_SPEND_COL = 'aiSpend';
export const aiSpendDocId = (uid: string, month: string): string => `${uid}_${month}`;

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
  /**
   * Giáo viên CHỊU khoá/tiền của lượt này (chủ lớp). Handler đặt khi biết chắc; vắng thì suy từ người gọi.
   * Đổi người chịu thì chọn lại khoá.
   */
  keyOwnerUid?: string | null;
  /** Khoá đã chọn cho request này (xem `_ai-keys.ts`); cache để mọi lượt gọi trong request dùng chung. */
  keyChoice?: AiKeyChoice | null;
}

/** Khoá Gemini dùng cho một request + nguồn của nó — nguồn quyết định lượt đó có vào bảng kê không. */
export interface AiKeyChoice {
  key: string;
  source: AiKeySource;
  ownerUid: string | null;
  /** Có trừ ví trả trước không (null = không trừ: chưa bật kiểm soát / khoá riêng / chủ dự án). */
  billing?: { usdVnd: number; voucher: VoucherRedemption | null; /** Trần tháng giáo viên tự đặt (VNĐ), để kiểm cùng lúc với giữ chỗ tiền. */ capVnd?: number | null } | null;
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

export type AiProvider = 'gemini' | 'ai-gateway' | 'claude' | 'openai';

const storage = new AsyncLocalStorage<AiUsageContext>();

export const runWithAiUsage = <T>(context: AiUsageContext, fn: () => Promise<T>): Promise<T> => storage.run(context, fn);

export const currentAiUsageContext = (): AiUsageContext | null => storage.getStore() ?? null;

/** Handler gắn giáo viên chịu khoá/tiền cho lượt này (vd chủ lớp khi học sinh tự nộp). */
export const setAiKeyOwner = (uid: string | null): void => {
  const context = currentAiUsageContext();
  if (!context) return;
  context.keyOwnerUid = uid;
  context.keyChoice = null;
};

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

/**
 * `usage` của Anthropic Messages API → số token. `input_tokens` KHÔNG gồm phần đọc/ghi cache, nên cộng vào đầu vào
 * (phần đọc cache ghi riêng để tính theo cột cache; giá cache hiện bằng giá đầu vào nên không lệch).
 */
export const anthropicUsageCounts = (usage: unknown): AiTokenCounts | null => {
  if (!usage || typeof usage !== 'object') return null;
  const u = usage as Record<string, unknown>;
  const cachedTokens = count(u.cache_read_input_tokens);
  const inputTokens = count(u.input_tokens) + cachedTokens + count(u.cache_creation_input_tokens);
  const outputTokens = count(u.output_tokens);
  const totalTokens = inputTokens + outputTokens;
  if (totalTokens === 0) return null;
  return { inputTokens, outputTokens, thoughtsTokens: 0, cachedTokens, totalTokens };
};

/** Ngày/tháng theo giờ Việt Nam để gom bảng kê đúng tháng thu tiền. */
export const vnDate = (now: Date): { day: string; month: string } => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now);
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? '00';
  return { day: `${get('year')}-${get('month')}-${get('day')}`, month: `${get('year')}-${get('month')}` };
};

const ANONYMOUS_UNKNOWN: AiUsageIdentity = { uid: null, email: null, anonymous: false };

export const buildAiUsageRecord = (
  context: { feature: string; refs: Record<string, string>; keyChoice?: AiKeyChoice | null } | null,
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
  // 'own' = giáo viên tự trả Google, KHÔNG vào bảng kê. Lượt cũ (trước khi có trường này) là khoá chung.
  keySource: context?.keyChoice?.source ?? 'shared',
  ...(context?.keyChoice?.ownerUid ? { keyOwnerUid: context.keyChoice.ownerUid } : {}),
  ...counts,
  ...(extra.finishReason ? { finishReason: extra.finishReason } : {}),
});

/**
 * Cộng dồn theo NGÀY (giờ Việt Nam) ngay trong document tháng của `aiSpend`, để chip ở Header hiện
 * "hôm nay" mà chỉ đọc MỘT document — không phải quét lại toàn bộ `aiUsage` mỗi lần làm mới.
 */
const spendByDay = (day: unknown, costUsd: number, charge: { chargeVnd: number } | null) => ({
  days: {
    [String(day)]: {
      costUsd: FieldValue.increment(costUsd),
      calls: FieldValue.increment(1),
      ...(charge ? { chargeVnd: FieldValue.increment(charge.chargeVnd) } : {}),
    },
  },
});


const AI_WALLETS_COL = 'aiWallets';

/**
 * GIỮ CHỖ TIỀN cho một lượt gọi: ví chỉ bị trừ SAU khi Google trả lời, nên nhiều lượt chạy song song cùng qua kiểm số dư rồi
 * cùng trừ → ví/trần âm sâu (QA F3: hai lượt, ví 1.000đ → −38.000đ). Trước khi gọi, lượt này giữ `min(HOLD_VND, còn lại)`
 * trong ví (`aiWallets.heldVnd`), lượt sau chỉ thấy phần CÒN LẠI; xong thì giữ chỗ được thay bằng số tiền thật trong CÙNG
 * giao dịch trừ ví. Lượt vượt quá phần giữ chỉ làm ví âm đúng phần vượt (thường 0), không còn nhân theo số lượt song song.
 */
export const HOLD_VND = 1_000;
/** Giữ chỗ quá lâu (hàm bị giết, không kịp trả) thì hết hiệu lực — sau một chu kỳ tối đa của hàm dài nhất. */
export const HOLD_STALE_MS = 10 * 60_000;

/**
 * `contended` = bị chặn chỉ vì các lượt KHÁC đang giữ chỗ (còn tiền/còn trần nếu họ xong sớm) → đáng chờ rồi thử lại, khác với
 * hết tiền thật. Không có nó, hai bài học sinh nộp cùng lúc khi ví sắp hết sẽ bị chặn oan dù cả hai cộng lại vẫn trả nổi.
 */
export type HoldResult = { ok: true; holdVnd: number } | { ok: false; reason: 'no_balance' | 'cap_reached'; contended: boolean };

/** Số lần chờ tối đa và thời gian mỗi lần chờ khi bị chặn vì lượt khác đang giữ chỗ. */
export const HOLD_MAX_WAITS = 8;
export const holdRetryMs = (env: NodeJS.ProcessEnv = process.env): number => Number(env.AI_HOLD_RETRY_MS) || 1_000;

/** Chỉ lượt bị TRỪ VÍ mới giữ chỗ (không khoá riêng, không chủ dự án, không mã giảm 100%); các lượt khác trả `holdVnd: 0`. */
export const acquireCallHold = async (choice: AiKeyChoice, now: number = Date.now()): Promise<HoldResult> => {
  const ownerUid = choice.ownerUid;
  const billing = choice.billing;
  if (!ownerUid || !billing || choice.source === 'own' || (billing.voucher?.percent ?? 0) >= 100) return { ok: true, holdVnd: 0 };
  const db = getAdminDb();
  const walletRef = db.collection(AI_WALLETS_COL).doc(ownerUid);
  const capVnd = typeof billing.capVnd === 'number' && billing.capVnd > 0 ? billing.capVnd : 0;
  const spendRef = capVnd ? db.collection(AI_SPEND_COL).doc(aiSpendDocId(ownerUid, vnDate(new Date(now)).month)) : null;
  return db.runTransaction(async (transaction): Promise<HoldResult> => {
    const walletSnap = await transaction.get(walletRef);
    const spendSnap = spendRef ? await transaction.get(spendRef) : null;
    const wallet = walletSnap.exists ? walletSnap.data() ?? {} : {};
    const held = Number(wallet.heldAt) > now - HOLD_STALE_MS ? Math.max(0, Number(wallet.heldVnd) || 0) : 0;
    const available = (Number(wallet.balanceVnd) || 0) - held;
    if (available <= 0) return { ok: false, reason: 'no_balance', contended: (Number(wallet.balanceVnd) || 0) > 0 && held > 0 };
    // Trần tháng: đã trừ + đang giữ chỗ. Kiểm cùng giao dịch nên các lượt song song không cùng lọt qua.
    const spentVnd = Number(spendSnap?.data()?.chargeVnd) || 0;
    if (capVnd && spentVnd + held >= capVnd) return { ok: false, reason: 'cap_reached', contended: spentVnd < capVnd };
    const holdVnd = Math.min(HOLD_VND, available);
    transaction.set(walletRef, { uid: ownerUid, heldVnd: held + holdVnd, heldAt: now }, { merge: true });
    return { ok: true, holdVnd };
  });
};

/**
 * Giữ chỗ có CHỜ: bị chặn chỉ vì lượt khác đang giữ chỗ thì chờ rồi thử lại (tối đa `HOLD_MAX_WAITS` lần), thay vì báo hết tiền oan.
 * `deadline` (mốc thời gian, ms) là hạn chót của cả lượt gọi — quá hạn trong lúc chờ thì trả `timeout` để nơi gọi tự báo lỗi.
 */
export const acquireCallHoldWaiting = async (
  choice: AiKeyChoice,
  deadline: number | null = null,
): Promise<HoldResult | { ok: false; reason: 'timeout' }> => {
  let held = await acquireCallHold(choice);
  for (let waited = 0; !held.ok && held.contended && waited < HOLD_MAX_WAITS; waited += 1) {
    await new Promise(resolve => setTimeout(resolve, holdRetryMs()));
    if (deadline !== null && deadline - Date.now() <= 0) return { ok: false, reason: 'timeout' };
    held = await acquireCallHold(choice);
  }
  return held;
};

/** Trả lại phần giữ chỗ khi lượt gọi KHÔNG đi tới bước trừ tiền (lỗi mạng, Google từ chối…). */
export const releaseWalletHold = (db: FirebaseFirestore.Firestore, ownerUid: string, holdVnd: number): Promise<unknown> =>
  db.collection(AI_WALLETS_COL).doc(ownerUid).set({ heldVnd: FieldValue.increment(-holdVnd) }, { merge: true });

const releaseCurrentHold = async (holdVnd: number | undefined): Promise<void> => {
  const ownerUid = currentAiUsageContext()?.keyChoice?.ownerUid;
  if (!holdVnd || !ownerUid) return;
  await releaseWalletHold(getAdminDb(), ownerUid, holdVnd).catch(error => console.error('[ai-usage] không trả được chỗ giữ tiền:', error));
};

interface Settlement {
  ownerUid?: string | null;
  billable: boolean;
  costUsd: number;
  charge: { chargeVnd: number } | null;
  images?: number;
  holdVnd?: number;
}

/**
 * Ghi lượt dùng + cộng sổ chi tiêu + trừ ví trong MỘT giao dịch: trước đây ba lần ghi rời nhau, lỗi giữa chừng để lại sổ
 * đã ghi mà ví chưa trừ (hoặc ngược lại). Lượt không tính tiền (khoá riêng, chưa bật kiểm soát) chỉ cần ghi sổ lượt dùng.
 */
const settleUsage = async (db: FirebaseFirestore.Firestore, record: Record<string, unknown>, o: Settlement): Promise<void> => {
  const { ownerUid } = o;
  if (!o.billable || !ownerUid) {
    await db.collection(AI_USAGE_COL).add(record);
    return;
  }
  const usageRef = db.collection(AI_USAGE_COL).doc(randomUUID());
  const spendRef = db.collection(AI_SPEND_COL).doc(aiSpendDocId(ownerUid, String(record.month)));
  const walletRef = db.collection(AI_WALLETS_COL).doc(ownerUid);
  const debit = o.charge?.chargeVnd ?? 0;
  await db.runTransaction(async transaction => {
    transaction.set(usageRef, record);
    // Sổ chi tiêu tháng của giáo viên chịu phí — để hiện "đã dùng" và chặn khi chạm trần tự đặt.
    transaction.set(spendRef, {
      uid: ownerUid,
      month: record.month,
      costUsd: FieldValue.increment(o.costUsd),
      calls: FieldValue.increment(1),
      ...(o.images ? { images: FieldValue.increment(o.images) } : {}),
      ...(o.charge ? { chargeVnd: FieldValue.increment(o.charge.chargeVnd) } : {}),
      ...spendByDay(record.day, o.costUsd, o.charge),
      updatedAt: record.at,
    }, { merge: true });
    if (debit > 0 || o.holdVnd) {
      transaction.set(walletRef, {
        uid: ownerUid,
        ...(debit > 0 ? { balanceVnd: FieldValue.increment(-debit) } : {}),
        ...(o.holdVnd ? { heldVnd: FieldValue.increment(-o.holdVnd) } : {}),
        updatedAt: record.at,
      }, { merge: true });
    }
  });
};

/** Ghi một lượt dùng. KHÔNG bao giờ ném lỗi ra ngoài. */
export const recordAiUsage = async (
  provider: AiProvider,
  model: string,
  counts: AiTokenCounts | null,
  extra: { finishReason?: string; /** Phần tiền đã giữ chỗ cho lượt này (`acquireCallHold`) — được thay bằng số tiền thật khi trừ ví. */ holdVnd?: number } = {},
): Promise<void> => {
  if (!counts) {
    await releaseCurrentHold(extra.holdVnd);
    return;
  }
  try {
    const context = currentAiUsageContext();
    const identity = context ? await context.identity() : ANONYMOUS_UNKNOWN;
    const record = buildAiUsageRecord(context, identity, provider, model, counts, { finishReason: extra.finishReason });
    const db = getAdminDb();
    const choice = context?.keyChoice;
    const ownerUid = choice?.ownerUid;
    const billable = Boolean(ownerUid) && record.keySource !== 'own';
    const costUsd = billable ? costUsdOfCall(model, String(record.day), counts) ?? 0 : 0;
    // Ví trả trước: lượt này bị trừ bao nhiêu — ghi luôn giá gốc, tỷ giá, % giảm để sao kê tự giải thích.
    const charge = billable && choice?.billing ? chargeForCall(costUsd, choice.billing.usdVnd, choice.billing.voucher) : null;
    if (charge && choice?.billing) {
      Object.assign(record, { costUsd, usdVnd: choice.billing.usdVnd, ...charge });
    }
    await settleUsage(db, record, { ownerUid, billable, costUsd, charge, holdVnd: extra.holdVnd });
  } catch (error) {
    console.error('[ai-usage] không ghi được lượt dùng AI:', error);
    // Giao dịch hỏng thì chưa ai trừ tiền: trả lại phần giữ chỗ để ví không bị kẹt.
    await releaseCurrentHold(extra.holdVnd);
  }
};

/**
 * Ghi một lượt SINH ẢNH (Imagen) — tính tiền theo SỐ ẢNH, không theo token.
 * ⚠ GIỮ ĐỒNG BỘ logic tính phí/trừ ví với recordAiUsage: chỉ khoá chung (ownerUid + keySource≠'own')
 * mới trừ ví; khoá riêng của giáo viên ('own') không vào bảng kê. KHÔNG bao giờ ném lỗi ra ngoài.
 */
export const recordImageUsage = async (
  model: string,
  imageCount: number,
  extra: { finishReason?: string; /** Phần tiền đã giữ chỗ cho lượt này — được thay bằng số tiền thật khi trừ ví. */ holdVnd?: number } = {},
): Promise<void> => {
  const images = Math.max(0, Math.round(imageCount));
  if (images <= 0) {
    await releaseCurrentHold(extra.holdVnd);
    return;
  }
  try {
    const context = currentAiUsageContext();
    const identity = context ? await context.identity() : ANONYMOUS_UNKNOWN;
    const now = new Date();
    const record: Record<string, unknown> = {
      at: now.toISOString(),
      ...vnDate(now),
      provider: 'gemini' as AiProvider,
      model,
      feature: context?.feature || 'generateImage',
      uid: identity.uid,
      email: identity.email,
      anonymous: identity.anonymous,
      refs: context?.refs ?? {},
      keySource: context?.keyChoice?.source ?? 'shared',
      ...(context?.keyChoice?.ownerUid ? { keyOwnerUid: context.keyChoice.ownerUid } : {}),
      // Lượt ảnh không có token: ghi 0 cho các cột token + số ảnh để sao kê phân biệt token/ảnh.
      inputTokens: 0, outputTokens: 0, thoughtsTokens: 0, cachedTokens: 0, totalTokens: 0,
      images,
      ...(extra.finishReason ? { finishReason: extra.finishReason } : {}),
    };
    const db = getAdminDb();
    const choice = context?.keyChoice;
    const ownerUid = choice?.ownerUid;
    const billable = Boolean(ownerUid) && record.keySource !== 'own';
    const costUsd = billable ? costUsdOfImage(model, String(record.day), images) ?? 0 : 0;
    const charge = billable && choice?.billing ? chargeForCall(costUsd, choice.billing.usdVnd, choice.billing.voucher) : null;
    if (charge && choice?.billing) {
      Object.assign(record, { costUsd, usdVnd: choice.billing.usdVnd, ...charge });
    }
    await settleUsage(db, record, { ownerUid, billable, costUsd, charge, images, holdVnd: extra.holdVnd });
  } catch (error) {
    console.error('[ai-usage] không ghi được lượt sinh ảnh:', error);
    await releaseCurrentHold(extra.holdVnd);
  }
};

const REF_KEYS = ['classId', 'submissionId', 'assignmentId', 'setId', 'studentId', 'examId', 'attemptId'] as const;

/**
 * Bổ sung mã tham chiếu cho lượt AI ĐANG chạy khi chỉ biết sau lúc đọc dữ liệu (vd bài nộp → học sinh). Không đè giá trị đã có.
 * Nhờ vậy mọi lượt AI của một em đều tra lại được theo `refs.studentId` — cổng học sinh hiện chi phí AI của chính em từ đây.
 */
export const tagAiUsageRefs = (refs: Partial<Record<(typeof REF_KEYS)[number], unknown>>): void => {
  const context = currentAiUsageContext();
  if (!context) return;
  for (const key of REF_KEYS) {
    const value = refs[key];
    if (typeof value === 'string' && value.trim() && value.length <= 200 && !context.refs[key]) context.refs[key] = value.trim();
  }
};

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
