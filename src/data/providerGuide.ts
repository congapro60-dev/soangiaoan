/**
 * HƯỚNG DẪN chọn AI + lấy API key cho giáo viên (hiện trong Cài đặt).
 *
 * Giá và điều kiện tra ngày 2026-09-30 từ trang chính thức của từng hãng — giá đổi thường xuyên, nên mọi con số
 * ở đây là THAM KHẢO; trang giá của hãng mới là căn cứ. Quy ra tiền Việt theo tỷ giá tham chiếu, không phải tỷ giá
 * ví web (ví web tính theo Vietcombank và bảng giá riêng ở `lib/admin/aiPricing.ts`).
 *
 * Điều quan trọng nhất giáo viên hay nhầm: các gói tiêu dùng (ChatGPT Plus, Claude Pro/Max, SuperGrok, Google AI Pro)
 * CHỈ dùng trên ứng dụng của hãng, KHÔNG kèm khoá API. API luôn tính riêng theo token.
 */
import type { ApiProvider } from '../config/apiLimits';

export const GUIDE_DATE = '30/09/2026';

/** Tỷ giá tham khảo (VNĐ/USD) để ước lượng chi phí trong hướng dẫn. */
export const GUIDE_USD_VND = 26_000;

/** Một giáo án dài trung bình: ~8.000 token đề bài + tài liệu tham khảo, ~10.000 token trả về (đã gồm suy nghĩ). */
export const LESSON_PLAN_TOKENS = { input: 8_000, output: 10_000 } as const;

export interface GuidePick {
  modelId: string;
  /** Vai trò của model: "nên dùng", "rẻ nhất", "cao cấp"… */
  role: string;
  /** Giá USD trên 1 triệu token. */
  inUsd: number;
  outUsd: number;
  note?: string;
}

export interface ProviderGuide {
  provider: ApiProvider;
  /** Một câu chốt: có API miễn phí không, hay phải mua riêng. */
  verdict: string;
  hasFreeTier: boolean;
  /** Gói tiêu dùng của hãng có kèm API không (luôn không) + nói rõ để khỏi mua nhầm. */
  subscription: string;
  minTopUp: string;
  steps: string[];
  picks: GuidePick[];
  caution?: string;
}

export const PROVIDER_GUIDES: Partial<Record<ApiProvider, ProviderGuide>> = {
  gemini: {
    provider: 'gemini',
    verdict: 'Có API miễn phí để bắt đầu — hợp nhất với thầy/cô mới dùng thử.',
    hasFreeTier: true,
    subscription: 'Gói Google AI Pro/Ultra (ứng dụng Gemini) KHÔNG kèm API. Không cần mua gói đó để lấy khoá.',
    minTopUp: 'Miễn phí để bắt đầu; hết hạn mức thì bật thanh toán, tính theo token',
    steps: [
      'Vào aistudio.google.com, đăng nhập Google, bấm “Get API key” rồi “Create API key”.',
      'Dán khoá (bắt đầu bằng AIza…) vào ô bên dưới.',
      'Khi hết hạn mức miễn phí (báo lỗi 429), bật thanh toán cho dự án trong Google AI Studio để dùng tiếp, trả theo mức dùng.',
    ],
    picks: [
      { modelId: 'gemini-3.8-flash', role: 'Nên dùng', inUsd: 0.75, outUsd: 3.75, note: 'Giá này đến hết 31/12/2026, từ 01/01/2027 tăng.' },
      { modelId: 'gemini-3.5-flash-lite', role: 'Rẻ nhất', inUsd: 0.3, outUsd: 2.5 },
      { modelId: 'gemini-3.1-pro-preview', role: 'Cao cấp', inUsd: 2, outUsd: 12, note: 'Không có gói miễn phí.' },
    ],
    caution: 'Hạn mức miễn phí xem ở Google AI Studio → Rate limits; thanh “đã dùng” trong Cài đặt chỉ là ước tính.',
  },
  claude: {
    provider: 'claude',
    verdict: 'Phải mua API riêng — không có gói miễn phí.',
    hasFreeTier: false,
    subscription: 'Gói Claude Pro/Max chỉ dùng trên claude.ai, KHÔNG kèm API. API thanh toán riêng bằng tiền nạp trước.',
    minTopUp: 'Nạp trước tối thiểu 5 USD (khoảng 130.000đ), thẻ Visa/Mastercard quốc tế',
    steps: [
      'Vào platform.claude.com (Claude Console), tạo tài khoản.',
      'Vào Billing, bấm “Add funds/Purchase credits”, nạp tối thiểu 5 USD.',
      'Vào API keys, tạo khoá mới rồi dán vào ô bên dưới.',
    ],
    picks: [
      { modelId: 'claude-sonnet-5-5', role: 'Nên dùng', inUsd: 2, outUsd: 10, note: 'Cân bằng tốc độ và chất lượng.' },
      { modelId: 'claude-haiku-4-5-20251001', role: 'Rẻ nhất', inUsd: 1, outUsd: 5 },
      { modelId: 'claude-opus-5-5', role: 'Cao cấp', inUsd: 4, outUsd: 20 },
      { modelId: 'claude-fable-5-1', role: 'Cao nhất', inUsd: 10, outUsd: 50, note: 'Chỉ khi các bản trên chưa đạt.' },
    ],
  },
  openai: {
    provider: 'openai',
    verdict: 'Phải mua API riêng — không có gói miễn phí.',
    hasFreeTier: false,
    subscription: 'ChatGPT Plus (khoảng 20 USD/tháng) chỉ dùng trên chatgpt.com, KHÔNG kèm API. API tính riêng bằng tiền nạp trước.',
    minTopUp: 'Nạp trước tối thiểu 5 USD (mặc định 10 USD), thẻ Visa/Mastercard quốc tế',
    steps: [
      'Vào platform.openai.com, đăng nhập, vào Billing rồi “Add payment details”.',
      'Chọn số tiền nạp (tối thiểu 5 USD) và TẮT “auto-reload” nếu không muốn bị nạp tự động.',
      'Vào API keys, tạo khoá mới rồi dán vào ô bên dưới.',
    ],
    picks: [
      { modelId: 'gpt-6.1-sol', role: 'Nên dùng', inUsd: 2, outUsd: 10 },
      { modelId: 'gpt-6-luna', role: 'Rẻ nhất', inUsd: 0.1, outUsd: 0.5 },
      { modelId: 'gpt-6-astra', role: 'Cao cấp', inUsd: 10, outUsd: 50, note: 'Đắt gấp 5 lần bản Sol.' },
    ],
    caution: 'Tên model theo trang giá OpenAI ngày 30/09/2026; nếu báo “model not found”, khoá của thầy/cô chưa được cấp model đó — chọn bản khác.',
  },
  grok: {
    provider: 'grok',
    verdict: 'Phải dùng API riêng của xAI — trả theo mức dùng, không cần gói tháng.',
    hasFreeTier: false,
    subscription: 'SuperGrok (khoảng 30 USD/tháng) và X Premium KHÔNG kèm API. Hai bên tính tiền tách biệt.',
    minTopUp: 'Trả theo mức dùng; tài khoản mới đôi khi được tặng tín dụng dùng thử (hạn ngắn)',
    steps: [
      'Vào console.x.ai, tạo tài khoản và thêm phương thức thanh toán/nạp tín dụng.',
      'Vào API Keys, tạo khoá rồi dán vào ô bên dưới.',
    ],
    picks: [
      { modelId: 'grok-4.3', role: 'Nên dùng', inUsd: 1.25, outUsd: 2.5 },
      { modelId: 'grok-4.7', role: 'Cao cấp', inUsd: 2, outUsd: 6 },
    ],
    caution: 'Câu hỏi dài từ 200.000 token trở lên bị tính giá cao gấp đôi cho toàn bộ lượt đó.',
  },
  deepseek: {
    provider: 'deepseek',
    verdict: 'Phải nạp tiền API — nhưng là hãng rẻ nhất.',
    hasFreeTier: false,
    subscription: 'DeepSeek không có gói tháng; chat trên web miễn phí và tách biệt với API.',
    minTopUp: 'Nạp tối thiểu khoảng 2 USD (khoảng 52.000đ), thẻ Visa/Mastercard',
    steps: [
      'Vào platform.deepseek.com, tạo tài khoản, vào Top up nạp tiền.',
      'Vào API keys, tạo khoá rồi dán vào ô bên dưới.',
    ],
    picks: [
      { modelId: 'deepseek-flash', role: 'Nên dùng', inUsd: 0.3, outUsd: 1.2, note: 'Giá giờ cao điểm; giờ thấp điểm rẻ bằng một nửa.' },
      { modelId: 'deepseek-v4-pro', role: 'Cao cấp', inUsd: 1.32, outUsd: 3.96, note: 'Giá giờ cao điểm.' },
    ],
    caution: 'Máy chủ đặt ở Trung Quốc: chỉ gửi nội dung bài dạy, KHÔNG gửi tên, ảnh hay điểm của học sinh. Giờ cao điểm (giá gấp đôi): 8–11h và 13–17h Việt Nam, thứ Hai đến thứ Sáu.',
  },
  nvidia: {
    provider: 'nvidia',
    verdict: 'Có tín dụng miễn phí để thử — không phải dịch vụ dùng lâu dài.',
    hasFreeTier: true,
    subscription: 'Không có gói tháng. Tài khoản mới nhận tín dụng dùng thử (khoảng 1.000, tối đa khoảng 5.000 khi xác minh email cơ quan).',
    minTopUp: 'Miễn phí trong hạn mức thử; giới hạn khoảng 40 lượt/phút',
    steps: [
      'Vào build.nvidia.com, đăng ký tài khoản NVIDIA.',
      'Chọn một model, bấm “Get API Key” (khoá bắt đầu bằng nvapi-) rồi dán vào ô bên dưới.',
    ],
    picks: [],
    caution: 'Danh mục model của NVIDIA đổi liên tục; nếu một model báo lỗi không tìm thấy, chọn model khác trong danh sách.',
  },
};

/** Chi phí ước tính cho MỘT giáo án dài (VNĐ), làm tròn tới chục đồng. */
export const lessonPlanCostVnd = (pick: Pick<GuidePick, 'inUsd' | 'outUsd'>, usdVnd = GUIDE_USD_VND): number => {
  const usd = (LESSON_PLAN_TOKENS.input * pick.inUsd + LESSON_PLAN_TOKENS.output * pick.outUsd) / 1_000_000;
  return Math.round((usd * usdVnd) / 10) * 10;
};

export interface CompareRow {
  provider: ApiProvider;
  pick: GuidePick | null;
  costVnd: number | null;
}

/** Bảng so sánh nhanh: mỗi hãng một dòng, model "Nên dùng" làm chuẩn; hãng rẻ nhất lên đầu, hãng không có giá xuống cuối. */
export const compareRows = (usdVnd = GUIDE_USD_VND): CompareRow[] =>
  (Object.values(PROVIDER_GUIDES) as ProviderGuide[])
    .map(guide => {
      const pick = guide.picks.find(p => p.role === 'Nên dùng') ?? null;
      return { provider: guide.provider, pick, costVnd: pick ? lessonPlanCostVnd(pick, usdVnd) : null };
    })
    .sort((a, b) => (a.costVnd ?? Number.POSITIVE_INFINITY) - (b.costVnd ?? Number.POSITIVE_INFINITY));
