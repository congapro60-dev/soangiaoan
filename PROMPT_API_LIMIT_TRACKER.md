# PROMPT: Xây dựng tính năng API Rate Limit Tracker cho web giaoandewey.vercel.app

## Bối cảnh

Web `giaoandewey.vercel.app` (TypeScript + Vite + React) hiện đã có dialog "Cài đặt hệ thống" với các tab provider: Gemini, Claude, ChatGPT, Grok, DeepSeek. Cần bổ sung tính năng **theo dõi lượng API đã dùng theo ngày** (giống ảnh đính kèm).

---

## Yêu cầu tổng quan

Mỗi provider API cần hiển thị:
1. **Model đang được chọn** (tên đầy đủ + model ID)
2. **Requests đã dùng / ngày** (RPD — giả định) với progress bar
3. **Tokens đã dùng / phút** (TPM — giả định) với progress bar
4. **RPM hiện tại** (Requests Per Minute thực tế — đếm rolling 60s)
5. **Nút Reset bộ đếm** (reset counter về 0 cho ngày hôm đó)
6. **Trạng thái:** hiển thị "Vẫn trong ngưỡng an toàn X phút." khi dưới 80%, đổi màu vàng khi 80–95%, đỏ khi >95%
7. **Lưu ý UX:** Nếu vượt giới hạn giả định mà API vẫn response được thì không chặn user — chỉ hiện cảnh báo màu vàng/đỏ, KHÔNG throw error hoặc block request

---

## Dữ liệu model và giới hạn giả định

### Cấu trúc dữ liệu (TypeScript interface)

```typescript
interface ProviderModel {
  id: string;           // model string dùng trong API call
  name: string;         // tên hiển thị
  contextWindow: number; // tokens
  rpdLimit: number;     // Requests Per Day giả định (soft limit)
  tpmLimit: number;     // Tokens Per Minute giả định (soft limit)
  rpmLimit: number;     // Requests Per Minute giả định (soft limit)
  isFree?: boolean;     // free tier
  isPreview?: boolean;
  isLatest?: boolean;
  tags?: string[];
}

interface ProviderConfig {
  key: string;          // 'gemini' | 'claude' | 'chatgpt' | 'grok' | 'deepseek'
  label: string;
  baseUrl: string;
  models: ProviderModel[];
}
```

---

### 1. Google Gemini

> **Nguồn:** [ai.google.dev/gemini-api/docs/rate-limits](https://ai.google.dev/gemini-api/docs/rate-limits)
> Free tier (AI Studio) có giới hạn RPD. Paid tier không có RPD nhưng có TPM.

```typescript
const GEMINI_MODELS: ProviderModel[] = [
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    contextWindow: 1_000_000,
    rpdLimit: 500,   // Free: ~500/day est. Paid: không giới hạn — dùng 1500 làm soft cap
    tpmLimit: 1_000_000,
    rpmLimit: 30,
    isLatest: true,
    tags: ["reasoning","vision","coding","flagship"]
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro Preview",
    contextWindow: 1_000_000,
    rpdLimit: 50,    // Preview tier: ~50 req/day free
    tpmLimit: 32_000,
    rpmLimit: 2,
    isPreview: true,
    tags: ["reasoning","vision","1M-ctx"]
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    contextWindow: 1_000_000,
    rpdLimit: 1_500,
    tpmLimit: 500_000,
    rpmLimit: 15,
    isPreview: true,
    tags: ["fast","vision","cheap"]
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash-Lite",
    contextWindow: 1_000_000,
    rpdLimit: 1_500,
    tpmLimit: 1_000_000,
    rpmLimit: 30,
    tags: ["fast","vision","cheap"]
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    contextWindow: 1_000_000,
    rpdLimit: 50,
    tpmLimit: 32_000,
    rpmLimit: 5,
    tags: ["reasoning","vision","coding"]
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    contextWindow: 1_048_576,
    rpdLimit: 1_500,
    tpmLimit: 1_000_000,
    rpmLimit: 15,
    tags: ["fast","vision","cheap"]
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash-Lite",
    contextWindow: 1_048_576,
    rpdLimit: 1_500,
    tpmLimit: 1_000_000,
    rpmLimit: 30,
    tags: ["fast","cheap"]
  }
];
```

---

### 2. Anthropic Claude

> **Nguồn:** [platform.claude.com/docs/en/about-claude/models/overview](https://platform.claude.com/docs/en/about-claude/models/overview)
> Tier 1 (mới) có giới hạn RPM và TPM thấp. Giả định mức Tier 1.

```typescript
const CLAUDE_MODELS: ProviderModel[] = [
  {
    id: "claude-opus-4-8",
    name: "Claude Opus 4.8",
    contextWindow: 1_000_000,
    rpdLimit: 1_000,   // Tier 1 est: ~1000 RPD
    tpmLimit: 100_000, // Tier 1: ~100K input TPM
    rpmLimit: 50,
    isLatest: true,
    tags: ["reasoning","vision","coding","flagship","1M-ctx"]
  },
  {
    id: "claude-opus-4-7",
    name: "Claude Opus 4.7",
    contextWindow: 1_000_000,
    rpdLimit: 1_000,
    tpmLimit: 100_000,
    rpmLimit: 50,
    tags: ["reasoning","vision","coding","1M-ctx"]
  },
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    contextWindow: 1_000_000,
    rpdLimit: 1_000,
    tpmLimit: 100_000,
    rpmLimit: 50,
    tags: ["reasoning","vision","coding","1M-ctx"]
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    contextWindow: 1_000_000,
    rpdLimit: 2_000,
    tpmLimit: 200_000,
    rpmLimit: 50,
    tags: ["fast","vision","coding","1M-ctx"]
  },
  {
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
    contextWindow: 200_000,
    rpdLimit: 5_000,
    tpmLimit: 400_000,
    rpmLimit: 50,
    tags: ["fast","vision","cheap"]
  }
];
```

---

### 3. OpenAI / ChatGPT

> **Nguồn:** [developers.openai.com/api/docs/models](https://developers.openai.com/api/docs/models)
> Giả định Tier 1. GPT-5.x là thế hệ mới nhất (tháng 4–5/2026).

```typescript
const OPENAI_MODELS: ProviderModel[] = [
  {
    id: "gpt-5.5",
    name: "GPT-5.5",
    contextWindow: 400_000,
    rpdLimit: 500,    // Tier 1 est
    tpmLimit: 40_000, // Tier 1: GPT-5 ~40K TPM
    rpmLimit: 20,
    isLatest: true,
    tags: ["reasoning","vision","coding","flagship"]
  },
  {
    id: "gpt-5.5-pro",
    name: "GPT-5.5 Pro",
    contextWindow: 400_000,
    rpdLimit: 200,
    tpmLimit: 20_000,
    rpmLimit: 10,
    tags: ["reasoning","vision","coding","premium"]
  },
  {
    id: "gpt-5.4-thinking",
    name: "GPT-5.4 Thinking",
    contextWindow: 400_000,
    rpdLimit: 500,
    tpmLimit: 40_000,
    rpmLimit: 20,
    tags: ["reasoning","vision","coding"]
  },
  {
    id: "gpt-5.4-mini",
    name: "GPT-5.4 mini",
    contextWindow: 200_000,
    rpdLimit: 2_000,
    tpmLimit: 200_000,
    rpmLimit: 500,
    tags: ["fast","vision","cheap"]
  },
  {
    id: "gpt-5.4-nano",
    name: "GPT-5.4 nano",
    contextWindow: 200_000,
    rpdLimit: 5_000,
    tpmLimit: 500_000,
    rpmLimit: 1_000,
    tags: ["fast","cheap"]
  },
  {
    id: "gpt-4.1-2025-04-14",
    name: "GPT-4.1",
    contextWindow: 1_000_000,
    rpdLimit: 500,
    tpmLimit: 40_000,
    rpmLimit: 30,
    tags: ["coding","vision","1M-ctx"]
  },
  {
    id: "gpt-4.1-mini-2025-04-14",
    name: "GPT-4.1 mini",
    contextWindow: 1_000_000,
    rpdLimit: 2_000,
    tpmLimit: 200_000,
    rpmLimit: 500,
    tags: ["fast","vision","cheap","1M-ctx"]
  },
  {
    id: "gpt-4.1-nano-2025-04-14",
    name: "GPT-4.1 nano",
    contextWindow: 1_000_000,
    rpdLimit: 5_000,
    tpmLimit: 1_000_000,
    rpmLimit: 1_000,
    tags: ["fast","cheap","1M-ctx"]
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    contextWindow: 128_000,
    rpdLimit: 500,
    tpmLimit: 40_000,
    rpmLimit: 30,
    tags: ["vision","audio","multimodal"]
  },
  {
    id: "o3-2025-04-16",
    name: "o3",
    contextWindow: 200_000,
    rpdLimit: 200,
    tpmLimit: 40_000,
    rpmLimit: 20,
    tags: ["reasoning","vision"]
  },
  {
    id: "o3-pro",
    name: "o3-pro",
    contextWindow: 200_000,
    rpdLimit: 100,
    tpmLimit: 20_000,
    rpmLimit: 10,
    tags: ["reasoning","premium"]
  }
];
```

---

### 4. xAI Grok

> **Nguồn:** [docs.x.ai/developers/models](https://docs.x.ai/developers/models) và [docs.x.ai/developers/rate-limits](https://docs.x.ai/developers/rate-limits)
> Base URL: `https://api.x.ai/v1`. OpenAI-compatible API. Grok 4.3 là model mới nhất (4/2026).

```typescript
const GROK_MODELS: ProviderModel[] = [
  {
    id: "grok-4.3",
    name: "Grok 4.3",
    contextWindow: 1_000_000,
    rpdLimit: 1_000,   // xAI Tier 0 est: ~1000/day
    tpmLimit: 500_000,
    rpmLimit: 60,
    isLatest: true,
    tags: ["reasoning","vision","video","flagship"]
  },
  {
    id: "grok-4.20",
    name: "Grok 4.20",
    contextWindow: 2_000_000,
    rpdLimit: 500,
    tpmLimit: 200_000,
    rpmLimit: 30,
    tags: ["reasoning","vision","2M-ctx"]
  },
  {
    id: "grok-4-0709",
    name: "Grok 4",
    contextWindow: 256_000,
    rpdLimit: 1_000,
    tpmLimit: 500_000,
    rpmLimit: 60,
    tags: ["reasoning","vision"]
  },
  {
    id: "grok-3-beta",
    name: "Grok 3 Beta",
    contextWindow: 131_000,
    rpdLimit: 2_000,
    tpmLimit: 500_000,
    rpmLimit: 60,
    tags: ["vision","search"]
  },
  {
    id: "grok-3-mini-beta",
    name: "Grok 3 Mini",
    contextWindow: 131_000,
    rpdLimit: 5_000,
    tpmLimit: 1_000_000,
    rpmLimit: 120,
    tags: ["fast","cheap"]
  }
];
```

---

### 5. DeepSeek

> **Nguồn:** [api-docs.deepseek.com](https://api-docs.deepseek.com)
> Base URL: `https://api.deepseek.com`. OpenAI-compatible.
> DeepSeek **không công bố giới hạn RPD/TPM cố định** — dùng dynamic throttling.
> V4 ra mắt 24/4/2026 với context 1M. Model IDs cũ `deepseek-chat` và `deepseek-reasoner` sẽ deprecated 24/7/2026.

```typescript
const DEEPSEEK_MODELS: ProviderModel[] = [
  {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    contextWindow: 1_000_000,
    rpdLimit: 2_000,   // Soft cap est — DeepSeek dùng dynamic throttling
    tpmLimit: 500_000, // Concurrency cap ~2500 est (từ source chính thức)
    rpmLimit: 60,      // DeepSeek ~60 RPM est
    isLatest: true,
    tags: ["fast","coding","1M-ctx","cheap"]
  },
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    contextWindow: 1_000_000,
    rpdLimit: 500,
    tpmLimit: 200_000, // Concurrency cap ~500 est
    rpmLimit: 20,
    isLatest: true,
    tags: ["reasoning","coding","1M-ctx"]
  },
  {
    id: "deepseek-v3-2",     // deepseek-chat alias cũ
    name: "DeepSeek V3.2",
    contextWindow: 128_000,
    rpdLimit: 2_000,
    tpmLimit: 500_000,
    rpmLimit: 60,
    tags: ["coding","fast"]
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    contextWindow: 128_000,
    rpdLimit: 1_000,
    tpmLimit: 200_000,
    rpmLimit: 30,
    tags: ["reasoning","math"]
  }
];
```

---

## Logic lưu trữ và tính toán

```typescript
// Lưu vào localStorage, reset mỗi ngày
interface UsageState {
  date: string;          // 'YYYY-MM-DD' — reset nếu khác ngày
  requestsToday: number; // RPD đã dùng
  tokensUsedCurrentMinute: number; // TPM rolling
  minuteStart: number;   // timestamp ms bắt đầu phút hiện tại
  rpm: number;           // requests trong 60s qua (rolling)
  rpmWindow: number[];   // timestamps của từng request trong 60s
}

// Key localStorage: `usage_${providerKey}_${modelId}`

// Sau MỖI API call thành công (bất kể status):
function trackUsage(provider: string, modelId: string, tokensUsed: number) {
  const key = `usage_${provider}_${modelId}`;
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  
  let state: UsageState = JSON.parse(localStorage.getItem(key) || 'null') || {
    date: today,
    requestsToday: 0,
    tokensUsedCurrentMinute: 0,
    minuteStart: now,
    rpm: 0,
    rpmWindow: []
  };

  // Reset nếu sang ngày mới
  if (state.date !== today) {
    state = { date: today, requestsToday: 0, tokensUsedCurrentMinute: 0,
              minuteStart: now, rpm: 0, rpmWindow: [] };
  }

  // Cập nhật RPD
  state.requestsToday += 1;

  // Cập nhật TPM — reset sau 60s
  if (now - state.minuteStart > 60_000) {
    state.tokensUsedCurrentMinute = tokensUsed;
    state.minuteStart = now;
  } else {
    state.tokensUsedCurrentMinute += tokensUsed;
  }

  // Cập nhật RPM rolling window 60s
  state.rpmWindow = [...state.rpmWindow.filter(t => now - t < 60_000), now];
  state.rpm = state.rpmWindow.length;

  localStorage.setItem(key, JSON.stringify(state));
}

// GỌI trackUsage() trong finally block của mọi fetch đến API
// Không chặn request nếu vượt giới hạn — chỉ hiển thị cảnh báo
```

---

## UI Component: `<ApiUsagePanel />`

Hiển thị bên trong dialog "Cài đặt hệ thống", ngay bên dưới phần chọn API Key:

```tsx
// Props
interface ApiUsagePanelProps {
  provider: string;    // 'gemini' | 'claude' | 'chatgpt' | 'grok' | 'deepseek'
  model: ProviderModel;
  onReset: () => void;
}

// Cấu trúc hiển thị (theo ảnh mẫu):
// ┌─────────────────────────────────────────────┐
// │ ⚡ Hạn mức API hôm nay         [↺ Reset]   │
// │ {model.name} · {YYYY/MM/DD}                 │
// ├─────────────────────────────────────────────┤
// │ Requests đã dùng / ngày                     │
// │ ████░░░░░░░░░░░░░░░░  23 / 500             │
// │                                             │
// │ Tokens đã dùng / phút                       │
// │ ██░░░░░░░░░░░░░░░░░░  8.420 / 32.000       │
// ├─────────────────────────────────────────────┤
// │ ℹ RPM hiện tại: 2 / 2. Vẫn trong ngưỡng... │
// └─────────────────────────────────────────────┘

// Màu progress bar:
// < 80%:  xanh lá  (#1D9E75 hoặc var(--color-success))
// 80-95%: vàng     (#F59E0B)
// > 95%:  đỏ       (#EF4444)

// Text trạng thái:
// < 80%:  "✓ RPM hiện tại: X / {limit}. Vẫn trong ngưỡng an toàn."
// 80-95%: "⚠ Gần đạt giới hạn giả định. API vẫn hoạt động bình thường."
// > 95%:  "⚠ Đã vượt giới hạn ước tính. Nếu gặp lỗi 429, hãy chờ 1 phút."

// NOTE: Đây là SOFT LIMIT — không block request, chỉ hiển thị cảnh báo
```

---

## Cấu trúc file đề xuất

```
src/
  data/
    models.ts           ← Toàn bộ PROVIDER_CONFIGS với models và limits
  hooks/
    useApiUsage.ts      ← Hook đọc/ghi localStorage, track usage
  components/
    settings/
      ApiUsagePanel.tsx ← Component hiển thị usage (theo ảnh mẫu)
      ModelSelector.tsx ← Dropdown chọn model cho từng provider
      SettingsDialog.tsx ← Dialog tổng hợp (đã có, chỉ bổ sung)
```

---

## Lưu ý quan trọng khi code

1. **KHÔNG block API request** nếu vượt soft limit — chỉ warn UI
2. `trackUsage()` phải gọi TRONG `finally` block — kể cả khi API lỗi
3. `tokensUsed` lấy từ response body: `response.usage.total_tokens` (OpenAI format) hoặc `response.usageMetadata.totalTokenCount` (Gemini format)
4. Nếu không lấy được token count từ response → ước tính = `Math.ceil(promptLength / 4)`
5. Số hiển thị dùng `toLocaleString('vi-VN')` cho dễ đọc (32.000 thay vì 32000)
6. Interval refresh UI mỗi **10 giây** để cập nhật RPM rolling window
7. Nút "Reset bộ đếm" chỉ reset `requestsToday` và `tokensUsedCurrentMinute` về 0, KHÔNG reset date
8. DeepSeek: hiển thị chú thích "* Giới hạn ước tính (DeepSeek dùng dynamic throttling)" dưới panel
9. Provider base URLs:
   - Gemini: `https://generativelanguage.googleapis.com/v1beta`
   - Claude: `https://api.anthropic.com/v1`
   - OpenAI: `https://api.openai.com/v1`
   - Grok: `https://api.x.ai/v1` (OpenAI-compatible)
   - DeepSeek: `https://api.deepseek.com` (OpenAI-compatible)
