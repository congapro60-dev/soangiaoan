/// <reference types="node" />
// File prefix "_" → không thành Serverless Function. Gồm: hạn mức chống đốt tiền + gọi Gemini.
import { acquireCallHoldWaiting, geminiUsageCounts, recordAiUsage, releaseWalletHold } from './_ai-usage.js';
import { AiKeyRequiredError, ensureGeminiKey, onOwnKeyFailure } from './_ai-keys.js';
import { pickFromPool, reportPoolKeyFailure, reportPoolKeySuccess, type PooledKey } from './_gemini-key-pool.js';
import { POOL_MAX_TRIES_PER_CALL } from '../src/lib/admin/geminiKeyPool.js';
import { getAdminDb } from './_exam-core.js';
import { classifyGeminiKeyFailure, rateLimitRetryMs, type AiKeyStatus } from '../src/lib/admin/aiKeyPolicy.js';
import { moTaGioiHanPhut, moTaLoiDichVu } from '../src/lib/httpErrorText.js';

/**
 * Đường chấm bài này dùng KHOÁ AI CỦA CHỦ DỰ ÁN, không phải khoá giáo viên
 * (quyết định 2026-08-20, đảo lại quyết định 2026-07-21 cho riêng luồng chấm).
 *
 * Nên hạn mức KHÔNG phải tính năng thêm, nó là điều kiện để đường này tồn tại.
 * Đường học sinh tự nộp dễ đốt tiền nhất: một đứa trẻ chụp 50 tấm trong một buổi tối
 * là chuyện bình thường, nên ngưỡng riêng của nó chặt hơn hẳn đường lớp học.
 */
export const QUOTA_LIMITS = {
  /** Bài giáo viên bấm chấm, tính theo tài khoản giáo viên, mỗi ngày. */
  teacherDaily: 300,
  /** Bài học sinh tự nộp, tính theo cả lớp của giáo viên đó, mỗi ngày. */
  selfDaily: 100,
  /** Bài học sinh tự nộp, tính theo từng em, mỗi ngày. */
  selfPerStudentDaily: 5,
  /** Lượt gọi GLM qua gateway (soạn/nâng cấp bằng khoá server), tính theo user, mỗi ngày. */
  gatewayDaily: Number(process.env.AI_GATEWAY_DAILY_LIMIT) || 100,
} as const;

export type GradeKind = 'teacher' | 'self' | 'gateway';

export interface QuotaDoc {
  day: string;
  teacherCount: number;
  selfCount: number;
  /** Lượt gọi GLM gateway của user, mỗi ngày. */
  gatewayCount: number;
  byStudent: Record<string, number>;
}

export const today = (now: Date = new Date()): string => now.toISOString().slice(0, 10);

export const emptyQuota = (day: string): QuotaDoc => ({ day, teacherCount: 0, selfCount: 0, gatewayCount: 0, byStudent: {} });

/** Sang ngày mới thì bộ đếm về 0. Đọc doc cũ luôn phải đi qua hàm này trước khi dùng. */
export const rollQuota = (raw: Partial<QuotaDoc> | null | undefined, day: string): QuotaDoc => {
  if (!raw || raw.day !== day) return emptyQuota(day);
  return {
    day,
    teacherCount: raw.teacherCount ?? 0,
    selfCount: raw.selfCount ?? 0,
    gatewayCount: raw.gatewayCount ?? 0,
    byStudent: raw.byStudent ?? {},
  };
};

export interface QuotaVerdict {
  allowed: number;
  reason: string;
}

/**
 * Còn được chấm bao nhiêu bài nữa. Trả về số lượng thay vì true/false để nơi gọi chấm được
 * phần đầu rồi báo phần còn lại phải đợi mai, thay vì từ chối cả lô.
 */
export const remainingQuota = (
  quota: QuotaDoc,
  kind: GradeKind,
  studentId: string,
  limits: typeof QUOTA_LIMITS = QUOTA_LIMITS,
): QuotaVerdict => {
  if (kind === 'gateway') {
    const left = limits.gatewayDaily - quota.gatewayCount;
    return left > 0
      ? { allowed: left, reason: '' }
      : { allowed: 0, reason: `Hôm nay tài khoản này đã dùng hết ${limits.gatewayDaily} lượt GLM. Thử lại vào ngày mai.` };
  }
  if (kind === 'teacher') {
    const left = limits.teacherDaily - quota.teacherCount;
    return left > 0
      ? { allowed: left, reason: '' }
      : { allowed: 0, reason: `Hôm nay đã chấm hết hạn mức ${limits.teacherDaily} bài. Thử lại vào ngày mai.` };
  }

  const perStudentLeft = limits.selfPerStudentDaily - (quota.byStudent[studentId] ?? 0);
  if (perStudentLeft <= 0) {
    return { allowed: 0, reason: `Mỗi ngày em chỉ nhờ chấm được ${limits.selfPerStudentDaily} bài. Mai quay lại nhé.` };
  }
  const classLeft = limits.selfDaily - quota.selfCount;
  if (classLeft <= 0) {
    return { allowed: 0, reason: 'Hôm nay lớp đã dùng hết lượt chấm tự do. Mai quay lại nhé.' };
  }
  return { allowed: Math.min(perStudentLeft, classLeft), reason: '' };
};

export const bumpQuota = (quota: QuotaDoc, kind: GradeKind, studentId: string, count: number): QuotaDoc => {
  if (count <= 0) return quota;
  if (kind === 'gateway') return { ...quota, gatewayCount: quota.gatewayCount + count };
  if (kind === 'teacher') return { ...quota, teacherCount: quota.teacherCount + count };
  return {
    ...quota,
    selfCount: quota.selfCount + count,
    byStudent: { ...quota.byStudent, [studentId]: (quota.byStudent[studentId] ?? 0) + count },
  };
};

/** Nạp bộ đếm hạn mức của một user (giáo viên hoặc user dùng gateway), tự roll sang ngày mới. */
export const loadQuotaDoc = async (
  db: FirebaseFirestore.Firestore,
  uid: string,
): Promise<[QuotaDoc, FirebaseFirestore.DocumentReference]> => {
  const ref = db.collection('gradingQuota').doc(uid);
  const snap = await ref.get();
  return [rollQuota(snap.exists ? (snap.data() as Partial<QuotaDoc>) : null, today()), ref];
};

/** Reserve exactly one AI call atomically so concurrent practice requests cannot share one stale read. */
export const reserveQuota = async (
  db: FirebaseFirestore.Firestore,
  uid: string,
  kind: GradeKind,
  studentId: string,
): Promise<{ quota: QuotaDoc; verdict: QuotaVerdict }> => {
  const ref = db.collection('gradingQuota').doc(uid);
  return db.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    const quota = rollQuota(snap.exists ? (snap.data() as Partial<QuotaDoc>) : null, today());
    const verdict = remainingQuota(quota, kind, studentId);
    if (verdict.allowed > 0) transaction.set(ref, bumpQuota(quota, kind, studentId, 1));
    return { quota, verdict };
  });
};

/** One-off maintenance waiver: records each refresh outside the normal daily cap. */
export const reserveTeacherRefreshQuota = async (db: FirebaseFirestore.Firestore, uid: string): Promise<void> => {
  const ref = db.collection('gradingQuota').doc(uid);
  await db.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    transaction.set(ref, bumpQuota(rollQuota(snap.exists ? snap.data() as Partial<QuotaDoc> : null, today()), 'teacher', '', 1));
  });
};

// ── Chạy ngầm sau khi đã trả lời client ──────────────────────────────────────

/**
 * Giữ việc chạy tiếp trên máy chủ SAU KHI đã trả lời client.
 *
 * Học sinh nộp bài bằng điện thoại rồi tắt máy là chuyện bình thường; nếu việc chấm nằm trong
 * chính request của em thì request đứt là worker chết giữa chừng và bài kẹt "Đang chấm". Có
 * `waitUntil` thì trả lời ngay "máy đang chấm, em cứ tắt máy" mà việc chấm vẫn chạy nốt.
 *
 * Vercel đặt hàm này vào request context toàn cục (`@vercel/functions` cũng đọc đúng chỗ này).
 * Nền tảng không cung cấp — chạy local, chạy test — thì trả `false` để nhánh gọi tự lùi về cách
 * cũ là chờ xong rồi mới trả lời. LƯU Ý: `waitUntil` KHÔNG vượt được `maxDuration`; nó bỏ được
 * phụ thuộc vào máy học sinh, không nới thêm được giây nào.
 */
export const chayNgam = (work: Promise<unknown>): boolean => {
  const store = (globalThis as Record<symbol, unknown>)[Symbol.for('@vercel/request-context')] as
    { get?: () => { waitUntil?: (promise: Promise<unknown>) => void } | undefined } | undefined;
  const waitUntil = store?.get?.()?.waitUntil;
  if (typeof waitUntil !== 'function') return false;
  waitUntil(work);
  return true;
};

// ── Gọi Gemini bằng khoá của chủ dự án ───────────────────────────────────────

export interface InlineImage {
  mimeType: string;
  /** base64 THUẦN, không có tiền tố data: */
  data: string;
}

export const getGradingApiKey = (): string => {
  const key = process.env.GRADING_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!key) throw new Error('Máy chủ chưa cấu hình khoá chấm bài (GRADING_GEMINI_API_KEY).');
  return key;
};

// Ghim trong code, KHONG doc env nua. Truoc day env GRADING_MODEL override duoc: mot lan dat pro
// (gemini-3.1-pro-preview) roi quen go la production am tham chay model vuot tran 60s cua Vercel
// Hobby, trong khi code da revert ve flash -> ca lop ket "Dang cham" ma doc code khong thay gi sai.
// Doi model = sua dong nay roi deploy, de trang thai that luon nam trong git.
export const GRADING_MODEL = 'gemini-3.8-flash';

/**
 * Model cho VIỆC PHỤ (đọc mã đề trên ảnh, tách danh mục câu hỏi): nhẹ hơn hẳn model chấm
 * chính nên rẻ hơn nhiều, mà hai việc này không cần suy luận sâu.
 *
 * Nếu khoá của lớp không dùng được model này thì đường đọc mã đề đã có chuỗi
 * `callUtilityVision` đỡ (Vilao → xKiro → Gemini rẻ) — không bao giờ để lượt chấm
 * hỏng vì tiết kiệm token.
 */
export const UTILITY_MODEL = 'gemini-2.5-flash-lite';

/**
 * Tách prompt thành phần CỐ ĐỊNH và phần ĐỔI theo từng học sinh.
 *
 * Gemini cache tiền tố (implicit prompt caching) cho phần đầu request giống hệt nhau:
 * phần cố định (đề, đáp án, luật chấm) + ảnh đề/đáp án đặt trước mọi phần đổi theo em, thì
 * cả lớp chấm chung một cache — 39/40 bài chỉ trả giá đọc cache thay vì đọc lại từ đầu.
 */
export interface GeminiPromptSegment {
  /** Chữ cố định cho cả lớp. Đặt TRƯỚC mọi phần động để được cache. */
  prefix: string;
  /** Ảnh cố định cho cả lớp (ảnh đề, ảnh đáp án) — đặt ngay sau prefix. */
  prefixImages?: InlineImage[];
  /** Chữ đổi theo từng học sinh (bài làm dạng chữ, số ảnh bài làm). */
  suffix: string;
  /** Ảnh bài làm của học sinh. */
  suffixImages?: InlineImage[];
}

/** Tách "data:image/jpeg;base64,xxx" thành phần Gemini nhận được. */
export const parseDataUrl = (dataUrl: string): InlineImage | null => {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(String(dataUrl || '').trim());
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
};

export interface GeminiOptions {
  /**
   * Trần token đầu ra. Token "suy nghĩ" của model CŨNG tính vào trần này, nên đặt chặt là câu
   * trả lời thật bị cắt cụt hoặc rỗng. Giải cả một đề cần rộng hơn hẳn chấm một bài.
   *
   * `'model-max'` = KHÔNG gửi trần nào cả, để model dùng trần tối đa của chính nó. Dùng cho
   * đường chấm bài: ở đó bị cắt giữa chừng là hỏng nguyên lượt chấm của một em, mà tự đoán một
   * con số thì hoặc vẫn chật, hoặc vượt trần model rồi bị từ chối thẳng.
   */
  maxOutputTokens?: number | 'model-max';
  /** Bật chế độ JSON của Gemini: model bị ràng buộc trả JSON hợp lệ, khỏi bọc trong ```json. */
  jsonMode?: boolean;
  /** Mức suy nghĩ Gemini (`thinkingConfig.thinkingLevel`, chữ thường) — nơi gọi PHẢI kiểm hợp model trước (`resolveEffort`). */
  thinkingLevel?: string;
  /** Chỉ dẫn hệ thống (đường relay giữ đúng chỉ dẫn mà trình duyệt vốn gửi khi gọi Gemini bằng khoá của giáo viên). */
  systemInstruction?: string;
  /**
   * Nhiệt độ sinh. Mặc định 0.2. Tác vụ ĐỌC/chấm nên đặt 0 để mỗi lần chấm lại đọc chữ và công
   * thức ổn định hơn, không "mỗi lần một kiểu". Tác vụ cần đa dạng (sinh bài luyện) giữ >0.
   */
  temperature?: number;
  /**
   * Trần thời gian chờ Gemini, mili giây. Không đặt là chờ vô hạn — mà hàm serverless bị Vercel
   * giết ở `maxDuration` thì bài nộp nằm lại "đang chấm" mãi vì không nhánh nào kịp mở khoá. Luôn truyền
   * phần thời gian còn lại của lượt chấm vào đây.
   */
  timeoutMs?: number;
}

export type GeminiFailureKind =
  | 'http'
  | 'empty'
  | 'max_tokens'
  | 'safety'
  | 'recitation'
  | 'provider';

export class GeminiResponseError extends Error {
  constructor(
    readonly kind: GeminiFailureKind,
    message: string,
    readonly finishReason?: string,
    cause?: unknown,
    /** Google từ chối vì chính khoá (hết hạn mức / hỏng) — đợt chấm nền dựa vào đây để dừng thay vì đốt bài. */
    readonly keyFailure?: AiKeyStatus | null,
    /** 429 chỉ vì gọi quá nhanh (giới hạn mỗi phút): đợi chừng này rồi thử lại, không phải hết hạn mức. */
    readonly retryAfterMs?: number | null,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'GeminiResponseError';
  }
}

// Mã RECITATION chỉ cho biết Gemini dừng vì thấy giống nội dung đã có; không chứng minh bài vi phạm bản quyền.
const RECITATION_MESSAGE = 'Gemini dừng với mã RECITATION (nghi nội dung giống tài liệu có sẵn) nên chưa trả được kết quả. Thử lại một lần; nếu vẫn lỗi, thử ảnh khác hoặc xử lý thủ công.';

/**
 * Dịch `finishReason` sang câu người dùng đọc hiểu.
 *
 * Bỏ qua bước này là mọi trục trặc đều hiện ra thành "AI không trả về JSON hợp lệ" — đổ oan cho
 * khâu đọc JSON trong khi thủ phạm là câu trả lời bị cắt hoặc bị chặn. Đã mất một lượt đi tìm
 * nhầm hướng vì đúng chỗ này.
 */
export const moTaFinishReason = (reason: string | undefined, coChu: boolean): string | null => {
  if (reason === 'MAX_TOKENS') {
    return 'AI trả lời dài quá trần cho phép nên bị cắt giữa chừng. Thử chia nhỏ đề, hoặc giảm số câu trong một lần.';
  }
  if (reason === 'SAFETY' || reason === 'PROHIBITED_CONTENT') {
    return 'Gemini từ chối xử lý nội dung này. Kiểm tra lại ảnh đề xem có gì bất thường không.';
  }
  if (reason === 'RECITATION') {
    return RECITATION_MESSAGE;
  }
  if (!coChu) {
    return `Gemini không trả về chữ nào${reason ? ` (dừng vì ${reason})` : ''}.`;
  }
  if (reason && reason !== 'STOP') {
    return `Gemini dừng bất thường: ${reason}.`;
  }
  return null;
};

/**
 * Gọi Gemini (chọn khoá, chuyển khoá khi khoá riêng hết, ghi token) và trả nguyên văn + lý do dừng, KHÔNG ném lỗi vì
 * lý do dừng — nơi gọi tự quyết. Đường chấm dùng `callGeminiVision` (ném lỗi khi bị cắt/chặn); đường relay soạn bài
 * cần giữ phần chữ dở dang để tự nối tiếp nên dùng thẳng hàm này.
 */
export const callGeminiRaw = async (
  prompt: string,
  images: InlineImage[],
  apiKey: string,
  model: string = GRADING_MODEL,
  options: GeminiOptions = {},
  segment?: GeminiPromptSegment,
): Promise<{ text: string; finishReason?: string }> => {
  const hold: CallHold = { vnd: 0, ownerUid: null, handedOver: false };
  try {
    return await callGeminiRawHeld(prompt, images, apiKey, model, options, hold, segment);
  } finally {
    // Đã giữ chỗ tiền mà lượt gọi hỏng TRƯỚC khi tới bước ghi/trừ tiền (lỗi mạng, Google từ chối…) thì trả lại phần giữ.
    if (hold.vnd > 0 && !hold.handedOver && hold.ownerUid) {
      await releaseWalletHold(getAdminDb(), hold.ownerUid, hold.vnd).catch(error => console.error('[grading] không trả được chỗ giữ tiền:', error));
    }
  }
};

interface CallHold {
  vnd: number;
  ownerUid: string | null;
  /** `recordAiUsage` đã nhận phần giữ chỗ (nó tự thay bằng số tiền thật hoặc tự trả lại) — không được trả lần nữa. */
  handedOver: boolean;
}

const callGeminiRawHeld = async (
  prompt: string,
  images: InlineImage[],
  apiKey: string,
  model: string,
  options: GeminiOptions,
  hold: CallHold,
  segment?: GeminiPromptSegment,
): Promise<{ text: string; finishReason?: string }> => {
  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.2,
  };
  const maxOutputTokens = options.maxOutputTokens ?? 4096;
  // Bỏ hẳn field khi gọi 'model-max': Gemini không nhận field này thì tự lấy trần lớn nhất của
  // model. An toàn hơn tự điền một con số — điền quá tay là bị từ chối, điền dè là lại bị cắt.
  if (maxOutputTokens !== 'model-max') generationConfig.maxOutputTokens = maxOutputTokens;
  if (options.jsonMode) generationConfig.responseMimeType = 'application/json';
  // Mức suy nghĩ (đã kiểm hợp model ở nơi gọi): REST dùng chữ thường như tài liệu.
  if (options.thinkingLevel) generationConfig.thinkingConfig = { thinkingLevel: options.thinkingLevel };

  // Khoá theo request: nhóm dùng khoá chung / khoá riêng của giáo viên / khoá chung đã đồng ý tính phí.
  let keyChoice = await ensureGeminiKey(apiKey);
  let res: Response;
  // MỘT hạn chót cho cả lượt (kể cả lần gọi lại sau khi khoá riêng hỏng): mỗi lần gọi chỉ được dùng phần thời gian còn lại,
  // nếu không hai lần cộng lại vượt trần thời gian của hàm và Vercel giết hàm giữa chừng (QA F4).
  const startedAt = Date.now();
  const deadline = options.timeoutMs ? startedAt + options.timeoutMs : null;
  const timedOutError = (cause?: unknown) => new GeminiResponseError(
    'provider',
    'AI xử lý quá lâu nên máy chủ phải dừng lượt chấm này. Thử lại, hoặc chụp gọn lại bài (ít ảnh hơn).',
    undefined,
    cause,
  );
  // Khoá chung: thử lần lượt các khoá trong danh sách của chủ dự án (free trước, paid sau), khoá môi trường là chốt cuối.
  const triedPoolKeys = new Set<string>();
  let pooled: PooledKey | null = null;
  for (let attempt = 0; ; attempt += 1) {
    pooled = keyChoice.source !== 'own' && triedPoolKeys.size < POOL_MAX_TRIES_PER_CALL
      ? await pickFromPool(model, triedPoolKeys)
      : null;
    const remainingMs = deadline === null ? null : deadline - Date.now();
    if (remainingMs !== null && remainingMs <= 0) throw timedOutError();
    // Giữ chỗ tiền TRƯỚC khi gọi (chỉ lượt bị trừ ví): chặn các lượt song song cùng lọt qua kiểm số dư/trần (QA F3).
    if (hold.vnd === 0) {
      const held = await acquireCallHoldWaiting(keyChoice, deadline);
      if (held.ok === false && held.reason === 'timeout') throw timedOutError();
      if (held.ok === false) throw new AiKeyRequiredError(held.reason, keyChoice.ownerUid);
      if (held.holdVnd > 0) {
        hold.vnd = held.holdVnd;
        hold.ownerUid = keyChoice.ownerUid;
      }
    }
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(pooled?.key ?? keyChoice.key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: segment
                // Thứ tự parts = thứ tự token của request. Phần cố định (chữ + ảnh đề/đáp án)
                // đứng trước phần đổi theo học sinh để Gemini cache được tiền tố đó cho cả lớp.
                ? [
                  ...(segment.prefix ? [{ text: segment.prefix }] : []),
                  ...(segment.prefixImages ?? []).map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
                  ...(segment.suffix ? [{ text: segment.suffix }] : []),
                  ...(segment.suffixImages ?? []).map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
                ]
                : [
                  { text: prompt },
                  ...images.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
                ],
            }],
            generationConfig,
            ...(options.systemInstruction ? { systemInstruction: { parts: [{ text: options.systemInstruction }] } } : {}),
          }),
          ...(remainingMs !== null ? { signal: AbortSignal.timeout(remainingMs) } : {}),
        },
      );
    } catch (error) {
      // Hết giờ chờ thì phải ném ra để nhánh gọi kịp mở khoá bài nộp trước khi Vercel giết hàm.
      const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      // Số ảnh + thời gian chờ là thứ cần để biết timeout do bài nặng hay do Gemini chậm; không có thì không đo được.
      console.warn('[gemini] lượt gọi hỏng', {
        model,
        images: images.length,
        ms: Date.now() - startedAt,
        timedOut,
        cause: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      });
      throw timedOut
        ? timedOutError(error)
        : new GeminiResponseError('provider', 'Không gọi được Gemini lúc này. Thử lại sau ít phút.', undefined, error);
    }
    if (pooled && !res.ok) {
      // Khoá trong danh sách bị Google từ chối vì chính khoá (hết hạn mức / hỏng): cho nghỉ rồi thử khoá kế tiếp, không báo lỗi ra ngoài.
      const detail = await res.clone().text().catch(() => '');
      const failure = classifyGeminiKeyFailure(res.status, detail);
      if (failure) {
        triedPoolKeys.add(pooled.id);
        await reportPoolKeyFailure(pooled, model, failure, detail);
        continue;
      }
    }
    if (res.ok || keyChoice.source !== 'own' || attempt > 0) break;
    // Khoá RIÊNG của giáo viên bị từ chối vì chính khoá (hết hạn mức / hỏng): ghi lại, rồi hoặc chuyển
    // sang khoá chung (đã đồng ý tính phí) và gọi lại MỘT lần, hoặc ném AiKeyRequiredError.
    const detail = await res.clone().text().catch(() => '');
    const keyFailure = classifyGeminiKeyFailure(res.status, detail);
    if (!keyFailure) break;
    // Chỉ gọi quá nhanh (giới hạn mỗi phút): khoá vẫn còn hạn mức. KHÔNG đánh dấu "hết" 60 phút, KHÔNG chuyển sang ví
    // (GV sẽ bị trừ tiền oan) — báo lỗi kèm thời gian chờ ở dưới, lượt sau lại dùng khoá riêng.
    if (rateLimitRetryMs(res.status, detail)) break;
    keyChoice = await onOwnKeyFailure(keyChoice, keyFailure, detail, apiKey);
  }

  if (!res.ok) {
    // Kèm mã HTTP: 429 (hết hạn mức), 400 (payload sai), 503 (Gemini quá tải) đòi ba cách xử lý
    // hoàn toàn khác nhau, mà thông điệp chung chung thì giáo viên lẫn người sửa lỗi đều mù.
    const detail = await Promise.resolve().then(() => res.clone().text()).catch(() => '');
    const retryAfterMs = rateLimitRetryMs(res.status, detail);
    throw new GeminiResponseError(
      'http',
      retryAfterMs
        ? moTaGioiHanPhut(retryAfterMs)
        : moTaLoiDichVu(res.status, 'Gemini'),
      undefined,
      undefined,
      classifyGeminiKeyFailure(res.status, detail),
      retryAfterMs,
    );
  }

  let rawData: unknown;
  try {
    rawData = await res.json();
  } catch {
    throw new GeminiResponseError('provider', 'Gemini trả về phản hồi không hợp lệ. Thử lại sau ít phút.');
  }
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    throw new GeminiResponseError('provider', 'Gemini trả về phản hồi không hợp lệ. Thử lại sau ít phút.');
  }
  const data = rawData as {
    candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
    promptFeedback?: { blockReason?: string };
    usageMetadata?: unknown;
    error?: unknown;
  };
  // Ghi token TRƯỚC mọi nhánh ném lỗi: Google tính tiền cả lượt bị cắt/bị chặn.
  hold.handedOver = true;
  await recordAiUsage('gemini', model, geminiUsageCounts(data.usageMetadata), {
    finishReason: data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason,
    holdVnd: hold.vnd,
    ...(keyChoice.source !== 'own' ? { poolKey: pooled ? { id: pooled.id, tier: pooled.tier } : { tier: 'env' as const } } : {}),
  });
  if (pooled) await reportPoolKeySuccess(pooled);
  console.info('[gemini] gọi xong', {
    model,
    images: images.length,
    ms: Date.now() - startedAt,
    finishReason: data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason,
    usage: data.usageMetadata,
  });
  if (data.error) {
    throw new GeminiResponseError('provider', 'Gemini không hoàn tất yêu cầu. Thử lại sau ít phút.');
  }

  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.map(p => p.text || '').join('') || '';
  const finishReason = candidate?.finishReason || data.promptFeedback?.blockReason;
  return { text, finishReason };
};

export const callGeminiVision = async (
  prompt: string,
  images: InlineImage[],
  apiKey: string,
  model: string = GRADING_MODEL,
  options: GeminiOptions = {},
  /** Khi có: dùng đúng các parts này (prefix cố định trước, phần đổi theo học sinh sau) thay cho prompt+images. */
  segment?: GeminiPromptSegment,
): Promise<string> => {
  const { text, finishReason } = await callGeminiRaw(prompt, images, apiKey, model, options, segment);
  const hasText = text.trim().length > 0;

  if (finishReason === 'MAX_TOKENS') {
    throw new GeminiResponseError(
      'max_tokens',
      moTaFinishReason(finishReason, hasText) || 'AI trả lời dài quá trần cho phép. Thử lại với đề ngắn hơn.',
      finishReason,
    );
  }
  if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
    throw new GeminiResponseError(
      'safety',
      moTaFinishReason(finishReason, hasText) || 'Gemini từ chối xử lý nội dung này. Kiểm tra lại ảnh đề.',
      finishReason,
    );
  }
  if (finishReason === 'RECITATION') {
    throw new GeminiResponseError(
      'recitation',
      moTaFinishReason(finishReason, hasText) || RECITATION_MESSAGE,
      finishReason,
    );
  }
  if (finishReason && finishReason !== 'STOP') {
    throw new GeminiResponseError('provider', 'Gemini dừng bất thường. Thử lại sau ít phút.', finishReason);
  }
  if (!hasText) {
    throw new GeminiResponseError(
      'empty',
      moTaFinishReason(finishReason, false) || 'Gemini không trả về kết quả. Thử lại sau ít phút.',
      finishReason,
    );
  }

  return text;
};

/**
 * Gọi model RẺ cho việc phụ (đọc mã đề, tách danh mục câu).
 *
 * Đã vào CHUỖI DỰ PHÒNG (G4): ngày trước hàm này gọi thẳng Google, nên khoá Google
 * chết là khâu đọc mã đề chết theo dù Vilao/xKiro còn sống. Nay thứ tự là
 * Vilao → xKiro → Gemini, và lớp Google dùng UTILITY_MODEL (model rẻ) chứ không phải
 * model chấm chính — giữ đặc tính "việc phụ thì model rẻ trước".
 *
 * Vì lượt gọi đã ở lớp rẻ nhất, KHÔNG lùi thêm sang model chấm chính nữa: mọi lớp
 * đều thử rồi mới hỏng, lùi nữa chỉ tốn thêm một lượt gọi đắt tiền cùng khoá Google.
 * Riêng tầng Google có thể tắt hẳn bằng `GRADING_GEMINI_FALLBACK=off`.
 */
export const callUtilityVision = async (
  prompt: string,
  images: InlineImage[],
  _apiKey: string,
  options: GeminiOptions = {},
  segment?: GeminiPromptSegment,
): Promise<string> => {
  const chain = getGradingChain('utility');
  if (chain.length === 0) {
    throw new Error('Máy chủ chưa cấu hình khoá cho việc đọc mã đề (GRADING_VILAO_API_KEY, GRADING_XKIRO_API_KEY hoặc GRADING_GEMINI_API_KEY).');
  }
  let lastError: unknown;
  for (const adapter of chain) {
    try {
      return await adapter.call(prompt, images, options, segment);
    } catch (error) {
      lastError = error;
      console.warn(`[grading-chain/utility] ${adapter.name} hỏng, thử lớp kế: ${error instanceof Error ? error.message : 'lỗi không rõ'}`);
    }
  }
  throw lastError;
};

// ── Chuỗi dự phòng "rẻ trước, đắt sau" (2026-10-22) ──────────────────────────
// Luồng chấm bài tiêu khoá CHỦ DỰ ÁN. Quyết định của chủ dự án: Vilao (chợ API,
// đóng tiền nhỏ theo từng request) đứng đầu chuỗi, Gemini trả phí là lớp chót.
// Hạn mức tính tiền cho giáo viên/học sinh KHÔNG đổi — lớp gọi model này chỉ
// quyết định "tiền thật của chủ dự án chảy vào đâu" (ensureGeminiKey/ví vẫn
// chạy như cũ ở nơi gọi).

export interface OpenAiVisionOptions {
  baseUrl: string;
  model: string;
  /**
   * Mức suy nghĩ (`reasoning_effort`) của API OpenAI-compatible. Model Gemini trên Vilao
   * nhận 'none' = tắt hẳn suy nghĩ: nhanh hơn hẳn mà chất lượng chấm không giảm (A/B
   * 10/2026 chấm 5 bài × 2 lượt: 10/10 đạt chuẩn phần 1), tiền token suy nghĩ về 0.
   */
  reasoningEffort?: string;
}

/** Phẳng bucket cache (segment) thành prompt+ảnh phẳng cho đường OpenAI-compatible. */
const nhoiSegment = (
  prompt: string,
  images: InlineImage[],
  segment?: GeminiPromptSegment,
): { prompt: string; images: InlineImage[] } => (
  segment
    ? {
        prompt: [segment.prefix, segment.suffix].filter(Boolean).join('\n\n'),
        images: [...(segment.prefixImages ?? []), ...(segment.suffixImages ?? [])],
      }
    : { prompt, images }
);

/**
 * Gọi API OpenAI-compatible có vision (Vilao…). Hợp đồng giống callGeminiVision:
 * trả text, ném lỗi có thông điệp người dùng đọc hiểu và phân loại được (kinds
 * 'max_tokens'/'empty' khớp bộ retry của đường chấm). jsonMode của Gemini không có
 * tương đương chuẩn trên đường này — prompt đã yêu cầu trả JSON, bộ parse bọc ```json
 * vốn đã xử lý. `'model-max'` → bỏ gửi max_tokens, để model dùng trần riêng của nó.
 */
export const callOpenAiCompatibleVision = async (
  prompt: string,
  images: InlineImage[],
  apiKey: string,
  options: OpenAiVisionOptions & Pick<GeminiOptions, 'maxOutputTokens' | 'temperature' | 'timeoutMs'>,
  segment?: GeminiPromptSegment,
): Promise<string> => {
  const dung = nhoiSegment(prompt, images, segment);
  const res = await fetch(
    `${options.baseUrl.replace(/\/+$/, '')}/chat/completions`,
    {
      method: 'POST',
      signal: AbortSignal.timeout(options.timeoutMs ?? 30_000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model,
        ...(options.reasoningEffort ? { reasoning_effort: options.reasoningEffort } : {}),
        ...(options.maxOutputTokens && options.maxOutputTokens !== 'model-max'
          ? { max_tokens: options.maxOutputTokens }
          : {}),
        temperature: options.temperature ?? 0.2,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: dung.prompt },
            ...dung.images.map(img => ({
              type: 'image_url',
              image_url: { url: `data:${img.mimeType};base64,${img.data}` },
            })),
          ],
        }],
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new GeminiResponseError('http', `kênh rẻ trả lỗi ${res.status}: ${detail.slice(0, 200)}`, String(res.status));
  }

  const data = await res.json() as {
    choices?: Array<{ finish_reason?: string; message?: { content?: string | Array<{ text?: string }> } }>;
  };
  const choice = data.choices?.[0];
  const rawContent = choice?.message?.content;
  const text = typeof rawContent === 'string'
    ? rawContent
    : Array.isArray(rawContent) ? rawContent.map(part => part?.text || '').join('') : '';

  if (choice?.finish_reason === 'length') {
    throw new GeminiResponseError('max_tokens', moTaFinishReason('MAX_TOKENS', true) || 'AI trả lời dài quá trần cho phép.', 'MAX_TOKENS');
  }
  if (!text.trim()) {
    throw new GeminiResponseError('empty', `Kênh rẻ không trả về chữ nào${choice?.finish_reason ? ` (dừng vì ${choice.finish_reason})` : ''}.`);
  }
  return text;
};

export interface GradingAdapter {
  name: string;
  /** Vai trong chuỗi chi phí: 're' (rẻ) | 'phi' (trả phí cao hơn). */
  tier: 're' | 'phi';
  call: (prompt: string, images: InlineImage[], options: GeminiOptions, segment?: GeminiPromptSegment) => Promise<string>;
}

/**
 * Tầng Google có được phép làm lớp đỡ cuối hay không.
 *
 * Mặc định BẬT: giữ nguyên hành vi cũ (Google là lớp chót của mọi chuỗi).
 * Đặt `GRADING_GEMINI_FALLBACK=off` (hoặc 0/false/no) để tắt hẳn tầng Google mà
 * không phải sửa code — dùng khi muốn cắt chi phí Google hoàn toàn hoặc khi
 * khoá Google đã cạn hạn mức và ta không muốn lượt chấm chờ nó timeout.
 */
export const geminiFallbackEnabled = (raw: string | undefined = process.env.GRADING_GEMINI_FALLBACK): boolean => {
  const v = raw?.trim().toLowerCase();
  return !(v === 'off' || v === '0' || v === 'false' || v === 'no');
};

/**
 * Chuỗi nhà cung cấp chấm bài, xếp theo chi phí tăng dần.
 * Thứ tự: Vilao (env GRADING_VILAO_API_KEY) → xKiro (env GRADING_XKIRO_API_KEY,
 * model :free nên không tốn tiền) → Gemini (env GRADING_GEMINI_API_KEY/GEMINI_API_KEY).
 * Thiếu key nào thì bỏ lớp đó; không set key nào mới thì hành vi cũ giữ nguyên.
 * Muốn đổi thứ tự (vd đưa xKiro lên đầu vì free) thì chỉ cần sửa thứ tự push
 * dưới đây — không có cờ/env thừa.
 *
 * `variant = 'utility'` đổi model của lớp Google sang `UTILITY_MODEL` (model rẻ dùng
 * cho việc phụ như đọc mã đề) thay vì model chấm chính: hai đường dùng cùng thứ tự
 * nhà cung cấp nhưng khác mức giá, đúng đặc tính "việc phụ thì model rẻ trước".
 */
export const getGradingChain = (variant: 'grading' | 'utility' = 'grading'): GradingAdapter[] => {
  const chain: GradingAdapter[] = [];
  const vilaoKey = process.env.GRADING_VILAO_API_KEY?.trim();
  if (vilaoKey) {
    // Model + thinking 0 là cấu hình ĐÃ KIỂM CHỨNG chấm ảnh (A/B 10/2026: 5 bài × 2 lượt qua
    // lane chib 10/10 đạt, ~5₫/bài, trung bình 30s/lượt). Ghim trong code như GRADING_MODEL:
    // đổi model = sửa dòng này rồi deploy, đừng lật qua env để kẻo trạng thái thật lệch với git.
    const vilaoOptions: OpenAiVisionOptions = {
      baseUrl: process.env.GRADING_VILAO_BASE_URL?.trim() || 'https://api.vilao.ai/v1',
      model: process.env.GRADING_VILAO_MODEL?.trim() || 'gemini-3.8-flash',
      reasoningEffort: 'none',
    };
    chain.push({
      name: `vilao/${vilaoOptions.model}`,
      tier: 're',
      call: (prompt, images, options, segment) => callOpenAiCompatibleVision(prompt, images, vilaoKey, { ...vilaoOptions, ...options }, segment),
    });
  }
  const xkiroKey = process.env.GRADING_XKIRO_API_KEY?.trim();
  if (xkiroKey) {
    const xkiroOptions: OpenAiVisionOptions = {
      baseUrl: process.env.GRADING_XKIRO_BASE_URL?.trim() || 'https://api.xkiro.com/v1',
      model: process.env.GRADING_XKIRO_MODEL?.trim() || 'qwen/qwen3.8-max:free',
    };
    chain.push({
      name: `xkiro/${xkiroOptions.model}`,
      tier: 're',
      call: (prompt, images, options, segment) => callOpenAiCompatibleVision(prompt, images, xkiroKey, { ...xkiroOptions, ...options }, segment),
    });
  }
  const geminiKey = process.env.GRADING_GEMINI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || '';
  if (geminiKey && geminiFallbackEnabled()) {
    const key = geminiKey;
    const model = variant === 'utility' ? UTILITY_MODEL : GRADING_MODEL;
    chain.push({
      name: `gemini/${model}`,
      tier: 'phi',
      call: (prompt, images, options, segment) => callGeminiVision(prompt, images, key, model, options, segment),
    });
  }
  return chain;
};

/**
 * Gọi chấm bài đi qua chuỗi dự phòng: thử từng nhà cung cấp theo thứ tự chi phí,
 * lớp trước hỏng thì nhảy sang lớp kế. Lỗi cuối cùng được ném NGUYÊN — nơi gọi
 * vẫn phân loại được (retry lớp empty/max_tokens, thông điệp đọc hiểu) và log
 * ghi rõ lớp nào đã đi qua.
 */
export const callGradingVision = async (
  prompt: string,
  images: InlineImage[],
  options: GeminiOptions = {},
  segment?: GeminiPromptSegment,
): Promise<string> => {
  const chain = getGradingChain();
  if (chain.length === 0) {
    throw new Error('Máy chủ chưa cấu hình khoá chấm bài (GRADING_VILAO_API_KEY, GRADING_XKIRO_API_KEY hoặc GRADING_GEMINI_API_KEY).');
  }
  let lastError: unknown;
  for (const adapter of chain) {
    try {
      return await adapter.call(prompt, images, options, segment);
    } catch (error) {
      lastError = error;
      console.warn(`[grading-chain] ${adapter.name} hỏng, thử lớp kế: ${error instanceof Error ? error.message : 'lỗi không rõ'}`);
    }
  }
  throw lastError;
};
