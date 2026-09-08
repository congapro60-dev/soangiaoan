/// <reference types="node" />
// File prefix "_" → không thành Serverless Function. Gồm: hạn mức chống đốt tiền + gọi Gemini.

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
  /**
   * Nhiệt độ sinh. Mặc định 0.2. Tác vụ ĐỌC/chấm nên đặt 0 để mỗi lần chấm lại đọc chữ và công
   * thức ổn định hơn, không "mỗi lần một kiểu". Tác vụ cần đa dạng (sinh bài luyện) giữ >0.
   */
  temperature?: number;
  /**
   * Trần thời gian chờ Gemini, mili giây. Không đặt là chờ vô hạn — mà hàm serverless bị Vercel
   * giết ở 60s thì bài nộp nằm lại "đang chấm" mãi vì không nhánh nào kịp mở khoá. Luôn truyền
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
  ) {
    super(message);
    this.name = 'GeminiResponseError';
  }
}

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
    return 'Gemini dừng vì nội dung trùng tài liệu có bản quyền. Thử ảnh đề khác.';
  }
  if (!coChu) {
    return `Gemini không trả về chữ nào${reason ? ` (dừng vì ${reason})` : ''}.`;
  }
  if (reason && reason !== 'STOP') {
    return `Gemini dừng bất thường: ${reason}.`;
  }
  return null;
};

export const callGeminiVision = async (
  prompt: string,
  images: InlineImage[],
  apiKey: string,
  model: string = GRADING_MODEL,
  options: GeminiOptions = {},
): Promise<string> => {
  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.2,
  };
  const maxOutputTokens = options.maxOutputTokens ?? 4096;
  // Bỏ hẳn field khi gọi 'model-max': Gemini không nhận field này thì tự lấy trần lớn nhất của
  // model. An toàn hơn tự điền một con số — điền quá tay là bị từ chối, điền dè là lại bị cắt.
  if (maxOutputTokens !== 'model-max') generationConfig.maxOutputTokens = maxOutputTokens;
  if (options.jsonMode) generationConfig.responseMimeType = 'application/json';

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              ...images.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
            ],
          }],
          generationConfig,
        }),
        ...(options.timeoutMs ? { signal: AbortSignal.timeout(options.timeoutMs) } : {}),
      },
    );
  } catch (error) {
    // Hết giờ chờ thì phải ném ra để nhánh gọi kịp mở khoá bài nộp trước khi Vercel giết hàm.
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    throw new GeminiResponseError(
      'provider',
      timedOut
        ? 'AI xử lý quá lâu nên máy chủ phải dừng lượt chấm này. Thử lại, hoặc chụp gọn lại bài (ít ảnh hơn).'
        : 'Không gọi được Gemini lúc này. Thử lại sau ít phút.',
    );
  }

  if (!res.ok) {
    // Kèm mã HTTP: 429 (hết hạn mức), 400 (payload sai), 503 (Gemini quá tải) đòi ba cách xử lý
    // hoàn toàn khác nhau, mà thông điệp chung chung thì giáo viên lẫn người sửa lỗi đều mù.
    throw new GeminiResponseError(
      'http',
      `Gemini không thể xử lý yêu cầu lúc này (mã ${res.status}). Thử lại sau ít phút.`,
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
    error?: unknown;
  };
  if (data.error) {
    throw new GeminiResponseError('provider', 'Gemini không hoàn tất yêu cầu. Thử lại sau ít phút.');
  }

  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.map(p => p.text || '').join('') || '';
  const finishReason = candidate?.finishReason || data.promptFeedback?.blockReason;
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
      moTaFinishReason(finishReason, hasText) || 'Gemini dừng vì nội dung trùng tài liệu có bản quyền. Thử ảnh đề khác.',
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
