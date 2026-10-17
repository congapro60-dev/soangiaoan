/**
 * MỨC SUY NGHĨ (reasoning effort / thinking level) của từng model — mỗi mức là MỘT tham số API thật, không phải nhãn trang trí:
 *  - Gemini:  `generationConfig.thinkingConfig.thinkingLevel` (minimal | low | medium | high)
 *  - Claude:  `output_config.effort` (low | medium | high | xhigh | max)
 *  - ChatGPT: `reasoning_effort` (none | minimal | low | medium | high | xhigh | max)
 * Nguồn (tra 2026-10-16): ai.google.dev/gemini-api/docs/thinking · platform.claude.com/docs/en/build-with-claude/effort ·
 * developers.openai.com/api/docs/guides/reasoning và trang từng model. Mức nào model KHÔNG hỗ trợ thì KHÔNG gửi (gửi sẽ bị 400).
 * Model chưa tra được danh sách mức (Gemini 3.7/3.5 Flash, 2.5; Claude Haiku 4.5; Grok, DeepSeek…) thì không có ô chọn — chạy mặc định.
 *
 * Mức càng cao model càng nghĩ lâu và sinh nhiều token "suy nghĩ" (tính giá như token đầu ra): chậm hơn và tốn tiền hơn.
 * File thuần, dùng chung cho trình duyệt và máy chủ (máy chủ nhập qua đuôi `.js`).
 */

export type EffortProvider = 'gemini' | 'claude' | 'openai';
export const EFFORT_PROVIDERS: readonly EffortProvider[] = ['gemini', 'claude', 'openai'];

export interface EffortLevelInfo {
  label: string;
  /** Một câu cho giáo viên: mức này khác mức khác ở chỗ nào. */
  desc: string;
}

/** Tên hiển thị + mô tả cho từng mã mức (dùng chung mọi hãng; hãng nào không có mã đó thì không hiện). */
export const EFFORT_LEVEL_INFO: Record<string, EffortLevelInfo> = {
  none: { label: 'Không suy nghĩ', desc: 'Trả lời ngay, không nghĩ trước. Nhanh và rẻ nhất, dễ sai ở bài khó.' },
  minimal: { label: 'Tối thiểu', desc: 'Nghĩ rất ít. Nhanh, rẻ; hợp việc đơn giản như viết lại, định dạng.' },
  low: { label: 'Nhanh', desc: 'Nghĩ ít. Nhanh và tiết kiệm; hợp soạn bài thông thường.' },
  medium: { label: 'Cân bằng', desc: 'Nghĩ vừa phải. Cân bằng giữa tốc độ, chi phí và độ chính xác.' },
  high: { label: 'Sâu', desc: 'Nghĩ kỹ. Chính xác hơn ở bài khó, nhưng chậm hơn và tốn nhiều token hơn.' },
  xhigh: { label: 'Rất sâu', desc: 'Nghĩ rất kỹ cho việc phức tạp. Chậm và tốn token rõ rệt.' },
  max: { label: 'Tối đa', desc: 'Nghĩ hết mức, không giới hạn. Chậm nhất và tốn nhất — chỉ dùng khi thật cần.' },
};

export interface EffortSupport {
  /** Các mức model nhận, từ nhẹ đến nặng. */
  levels: readonly string[];
  /** Mức model tự dùng khi KHÔNG gửi tham số; null = tài liệu không nêu. */
  defaultLevel: string | null;
}

interface EffortRule {
  matches: (model: string) => boolean;
  support: EffortSupport;
}

const FIVE = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
const LOW_TO_HIGH = ['low', 'medium', 'high'] as const;
const MINIMAL_TO_HIGH = ['minimal', 'low', 'medium', 'high'] as const;

const RULES: Record<EffortProvider, EffortRule[]> = {
  gemini: [
    { matches: m => m.startsWith('gemini-4-argon'), support: { levels: LOW_TO_HIGH, defaultLevel: 'medium' } },
    { matches: m => m.startsWith('gemini-3.8-flash'), support: { levels: LOW_TO_HIGH, defaultLevel: 'medium' } },
    { matches: m => m.startsWith('gemini-3.6-flash'), support: { levels: MINIMAL_TO_HIGH, defaultLevel: 'medium' } },
    { matches: m => m.startsWith('gemini-3.5-flash-lite'), support: { levels: MINIMAL_TO_HIGH, defaultLevel: 'minimal' } },
    { matches: m => m.startsWith('gemini-3.1-pro'), support: { levels: LOW_TO_HIGH, defaultLevel: 'high' } },
    { matches: m => m.startsWith('gemini-3-flash-preview'), support: { levels: MINIMAL_TO_HIGH, defaultLevel: 'high' } },
  ],
  claude: [
    { matches: m => m.startsWith('claude-opus-5-5'), support: { levels: FIVE, defaultLevel: 'medium' } },
    { matches: m => m.startsWith('claude-sonnet-5-5'), support: { levels: FIVE, defaultLevel: 'high' } },
    { matches: m => m.startsWith('claude-fable-5-1'), support: { levels: FIVE, defaultLevel: 'high' } },
  ],
  openai: [
    { matches: m => m.startsWith('gpt-6.1-sol'), support: { levels: FIVE, defaultLevel: 'medium' } },
    { matches: m => m.startsWith('gpt-6-luna'), support: { levels: ['none', ...FIVE], defaultLevel: 'medium' } },
    { matches: m => m.startsWith('gpt-6-astra'), support: { levels: ['minimal', ...FIVE], defaultLevel: null } },
  ],
};

const normalize = (model: string): string => String(model || '').trim().toLowerCase().replace(/^models\//, '');

/** Các mức của một model; null = model này không có ô chọn mức (chạy mặc định). */
export const effortSupportFor = (provider: string, model: string): EffortSupport | null => {
  if (!(EFFORT_PROVIDERS as readonly string[]).includes(provider)) return null;
  const id = normalize(model);
  return RULES[provider as EffortProvider].find(rule => rule.matches(id))?.support ?? null;
};

/**
 * Mức sẽ THẬT SỰ gửi đi: mức giáo viên chọn nếu model nhận, ngược lại `undefined` (không gửi tham số → model chạy mặc định).
 * Mức bằng mặc định của model vẫn gửi (kết quả như không gửi nhưng rõ ràng, và không lệch khi hãng đổi mặc định).
 */
export const resolveEffort = (provider: string, model: string, chosen: string | null | undefined): string | undefined => {
  const support = effortSupportFor(provider, model);
  return support && chosen && support.levels.includes(chosen) ? chosen : undefined;
};

/** Mức giáo viên chọn của một hãng trong Cài đặt (`settings.effort`), chưa kiểm model. */
export const chosenEffortOf = (effort: Partial<Record<string, string>> | undefined, provider: string): string | undefined =>
  effort?.[provider] || undefined;
