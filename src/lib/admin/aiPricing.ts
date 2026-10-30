/**
 * BẢNG GIÁ AI theo giá niêm yết chính thức, đơn vị USD / 1 triệu token, có HIỆU LỰC THEO NGÀY.
 *
 * Nguồn (tra lại khi giá đổi, cập nhật bảng + ngày tra):
 *  - Gemini: https://ai.google.dev/gemini-api/docs/pricing — trang cập nhật 2026-09-23.
 *    3.8/3.7 Flash: giá khuyến mãi tới 2026-12-31, từ 2027-01-01 gấp đôi.
 *    3.1 Pro Preview: prompt > 200k token tính giá cao hơn.
 *  - GLM 5.2 qua Vercel AI Gateway: https://vercel.com/ai-gateway/models/glm-5.2 — tra 2026-09-24.
 *    Trang không nêu giá cache → tính bằng giá đầu vào (không bao giờ tính thấp hơn thực tế).
 *
 * Quy tắc tính: đầu vào = (input − cached) × giá vào + cached × giá cache;
 * đầu ra = (output + thoughts) × giá ra (Google tính token suy nghĩ theo giá đầu ra).
 */

export interface ModelPrice {
  input: number;
  output: number;
  cached: number;
}

interface PricePeriod {
  /** Ngày bắt đầu hiệu lực (YYYY-MM-DD, giờ VN), vắng = từ trước tới nay. */
  from?: string;
  /** Ngày cuối hiệu lực (bao gồm), vắng = tới nay. */
  to?: string;
  price: ModelPrice;
  /** Giá cho lượt có prompt vượt ngưỡng (vd 3.1 Pro > 200k token). */
  longPrompt?: { thresholdTokens: number; price: ModelPrice };
}

interface PriceRule {
  label: string;
  matches: (model: string) => boolean;
  periods: PricePeriod[];
}

export const PRICE_SOURCES = {
  gemini: 'ai.google.dev/gemini-api/docs/pricing (cập nhật 2026-10-15)',
  gateway: 'vercel.com/ai-gateway/models/glm-5.2 (tra 2026-09-24)',
  claude: 'trang giá Anthropic (tra 2026-09-30, xem src/data/providerGuide.ts)',
  openai: 'trang giá OpenAI (tra 2026-09-30, xem src/data/providerGuide.ts)',
  vilao: 'chợ Vilao — console, model chib/gemini-3.8-flash (24/10/2026)',
} as const;

/** Claude/OpenAI: các trang giá không nêu giá cache nên tính cache bằng giá đầu vào — không bao giờ tính thấp hơn thực tế. */
const flatPrice = (input: number, output: number): PricePeriod[] => [{ price: { input, output, cached: input } }];

const FLASH_PERIODS: PricePeriod[] = [
  { to: '2026-12-31', price: { input: 0.75, output: 3.75, cached: 0.075 } },
  { from: '2027-01-01', price: { input: 1.5, output: 7.5, cached: 0.15 } },
];

const RULES: PriceRule[] = [
  {
    label: 'Gemini 4 Argon',
    matches: m => m.startsWith('gemini-4-argon'),
    // ai.google.dev/gemini-api/docs/pricing (cập nhật 2026-10-15): giá khuyến mãi tới 2026-11-30, từ 2026-12-01 gấp đôi; chỉ gói trả phí.
    periods: [
      { to: '2026-11-30', price: { input: 2, output: 10, cached: 0.1 } },
      { from: '2026-12-01', price: { input: 4, output: 20, cached: 0.2 } },
    ],
  },
  { label: 'Gemini 3.8 Flash', matches: m => m.startsWith('gemini-3.8-flash'), periods: FLASH_PERIODS },
  // Lớp dự phòng chấm bài qua gói xKiro (30/10/2026): tính theo giá niêm yết Google, như lớp Gemini gốc.
  { label: 'Gemini 3.8 Flash (xKiro)', matches: m => m.startsWith('xkiro/google/gemini-3.8-flash'), periods: FLASH_PERIODS },
  { label: 'Gemini 3.7 Flash', matches: m => m.startsWith('gemini-3.7-flash'), periods: FLASH_PERIODS },
  {
    label: 'Gemini 3.1 Pro',
    matches: m => m.startsWith('gemini-3.1-pro'),
    periods: [{
      price: { input: 2, output: 12, cached: 0.2 },
      longPrompt: { thresholdTokens: 200_000, price: { input: 4, output: 18, cached: 0.4 } },
    }],
  },
  { label: 'Claude Sonnet 5.5', matches: m => m.startsWith('claude-sonnet-5-5'), periods: flatPrice(2, 10) },
  { label: 'Claude Haiku 4.5', matches: m => m.startsWith('claude-haiku-4-5'), periods: flatPrice(1, 5) },
  { label: 'Claude Opus 5.5', matches: m => m.startsWith('claude-opus-5-5'), periods: flatPrice(4, 20) },
  { label: 'GPT-6.1 Sol', matches: m => m.startsWith('gpt-6.1-sol'), periods: flatPrice(2, 10) },
  { label: 'GPT-6 Luna', matches: m => m.startsWith('gpt-6-luna'), periods: flatPrice(0.1, 0.5) },
  { label: 'GPT-6 Astra', matches: m => m.startsWith('gpt-6-astra'), periods: flatPrice(10, 50) },
  { label: 'GLM 5.2 (Vercel AI Gateway)', matches: m => m === 'zai/glm-5.2', periods: [{ price: { input: 0.5625, output: 1.8, cached: 0.5625 } }] },
  {
    label: 'Vilao gemini-3.8-flash (chợ API)',
    matches: m => m.startsWith('vilao/'),
    // Chợ Vilao, model chib (console 24/10/2026): 400₫/1M vào · 1.600₫/1M ra · cache đọc 160₫/1M (API trả
    // `price_per_cached_read_token`), tối thiểu 3₫/request (không mô hình hoá mức tối thiểu).
    // Quy sang USD bằng chính tỉ giá ghi sổ (26.190₫/USD) nên khi quy ngược ra VNĐ đúng giá niêm yết.
    periods: [{ price: { input: 400 / 26_190, output: 1_600 / 26_190, cached: 160 / 26_190 } }],
  },
];

const normalizeModel = (model: string): string => String(model || '').trim().toLowerCase().replace(/^models\//, '');

export const modelLabel = (model: string): string =>
  RULES.find(rule => rule.matches(normalizeModel(model)))?.label ?? model;

/** Giá áp dụng cho một lượt: theo model, NGÀY phát sinh và độ dài prompt. null = model chưa có trong bảng. */
export const priceFor = (model: string, day: string, inputTokens = 0): ModelPrice | null => {
  const rule = RULES.find(item => item.matches(normalizeModel(model)));
  if (!rule) return null;
  const period = rule.periods.find(p => (!p.from || day >= p.from) && (!p.to || day <= p.to));
  if (!period) return null;
  if (period.longPrompt && inputTokens > period.longPrompt.thresholdTokens) return period.longPrompt.price;
  return period.price;
};

export interface UsageTokens {
  inputTokens: number;
  outputTokens: number;
  thoughtsTokens: number;
  cachedTokens: number;
}

/** Tiền USD của MỘT lượt gọi. null khi model chưa có giá (hiện cảnh báo, không đoán). */
export const costUsdOfCall = (model: string, day: string, tokens: UsageTokens): number | null => {
  const price = priceFor(model, day, tokens.inputTokens);
  if (!price) return null;
  const cached = Math.min(tokens.cachedTokens, tokens.inputTokens);
  const usd = ((tokens.inputTokens - cached) * price.input
    + cached * price.cached
    + (tokens.outputTokens + tokens.thoughtsTokens) * price.output) / 1_000_000;
  return usd;
};

/** Quy USD ra VNĐ, làm tròn tới đồng. */
export const usdToVnd = (usd: number, usdVnd: number): number => Math.round(usd * usdVnd);

// ── Giá SINH ẢNH (Imagen) — tính theo MỖI ẢNH, không theo token ────────────────
// Nguồn: ai.google.dev/gemini-api/docs/imagen (tra 2026-09-27). Imagen 4: Standard $0.04/ảnh,
// Ultra $0.06/ảnh, Fast $0.02/ảnh. Giá đổi thì cập nhật bảng + ngày như phần token ở trên.

interface ImagePricePeriod {
  from?: string;
  to?: string;
  /** USD cho MỖI ảnh sinh ra. */
  usdPerImage: number;
}

interface ImagePriceRule {
  label: string;
  matches: (model: string) => boolean;
  periods: ImagePricePeriod[];
}

const IMAGE_RULES: ImagePriceRule[] = [
  { label: 'Imagen 4 Ultra', matches: m => m.startsWith('imagen-4') && m.includes('ultra'), periods: [{ usdPerImage: 0.06 }] },
  { label: 'Imagen 4 Fast', matches: m => m.startsWith('imagen-4') && m.includes('fast'), periods: [{ usdPerImage: 0.02 }] },
  { label: 'Imagen 4', matches: m => m.startsWith('imagen-4') || m.startsWith('imagen'), periods: [{ usdPerImage: 0.04 }] },
  // Giá ảnh Vilao niêm yết (console 24/10/2026), quy theo tỉ giá ghi sổ 26.190₫/USD: 90₫ & 85₫/ảnh.
  { label: 'Vilao gpt-image-2 (chợ API)', matches: m => m.startsWith('gpt-image-2'), periods: [{ usdPerImage: 90 / 26_190 }] },
  { label: 'Vilao gemini-3.1-flash-image (chợ API)', matches: m => m.startsWith('gemini-3.1-flash-image'), periods: [{ usdPerImage: 85 / 26_190 }] },
];

/** Nhãn model ảnh (Imagen…) để hiện trong sao kê; trả nguyên model nếu chưa có trong bảng. */
export const imageModelLabel = (model: string): string =>
  IMAGE_RULES.find(rule => rule.matches(normalizeModel(model)))?.label ?? model;

/** Có phải model sinh ảnh (tính tiền theo ảnh) không. */
export const isImageModel = (model: string): boolean =>
  IMAGE_RULES.some(rule => rule.matches(normalizeModel(model)));

/** Giá USD/ảnh áp dụng theo model + ngày. null = model ảnh chưa có trong bảng. */
export const imagePriceFor = (model: string, day: string): number | null => {
  const rule = IMAGE_RULES.find(item => item.matches(normalizeModel(model)));
  if (!rule) return null;
  const period = rule.periods.find(p => (!p.from || day >= p.from) && (!p.to || day <= p.to));
  return period ? period.usdPerImage : null;
};

/** Tiền USD của một lượt sinh ảnh = giá/ảnh × số ảnh. null khi model chưa có giá. */
export const costUsdOfImage = (model: string, day: string, imageCount: number): number | null => {
  const per = imagePriceFor(model, day);
  if (per == null) return null;
  return per * Math.max(0, Math.round(imageCount));
};
