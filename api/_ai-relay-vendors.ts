/// <reference types="node" />
/**
 * Relay cho hãng KHÁC Gemini (Claude, ChatGPT) — dùng chung hàm `api/ai-relay.ts`, KHÔNG thêm Vercel Function (đang sát trần 12).
 *
 * Cùng luật khoá/ví/trần như lượt Gemini: `ensureGeminiKey(…, { vendor: true })` chọn nguồn (khoá riêng của hãng nằm ở trình
 * duyệt nên ở đây luôn là khoá chung), giữ chỗ tiền trước khi gọi, ghi lượt + trừ ví trong một giao dịch khi xong, trả lại
 * phần giữ khi lượt hỏng. Gọi bằng `fetch` thẳng tới API của hãng (không kéo SDK vào hàm), không stream.
 */
import { AiKeyRequiredError, ensureGeminiKey } from './_ai-keys.js';
import {
  acquireCallHoldWaiting,
  anthropicUsageCounts,
  openAiUsageCounts,
  recordAiUsage,
  releaseWalletHold,
  type AiTokenCounts,
} from './_ai-usage.js';
import { GeminiResponseError, type InlineImage } from './_grading-core.js';
import { getAdminDb } from './_exam-core.js';
import { RELAY_VENDOR_MAX_OUTPUT_TOKENS, type RelayVendor } from './_ai-relay-core.js';

const LABEL: Record<RelayVendor, string> = { claude: 'Claude', openai: 'ChatGPT' };
const ANTHROPIC_VERSION = '2023-06-01';

export interface VendorCall {
  vendor: RelayVendor;
  apiKey: string;
  model: string;
  prompt: string;
  system?: string;
  images: InlineImage[];
  /** Hạn chót cho CẢ lượt (kể cả thời gian chờ giữ chỗ tiền), tính bằng ms từ lúc gọi. */
  timeoutMs: number;
}

export interface VendorResult {
  text: string;
  /** Bị cắt vì hết trần đầu ra — nơi gọi xin viết tiếp. */
  truncated: boolean;
  /** Hãng từ chối vì an toàn/nội dung. */
  refused: boolean;
}

const buildRequest = (call: VendorCall): { url: string; headers: Record<string, string>; body: unknown } => {
  const maxTokens = RELAY_VENDOR_MAX_OUTPUT_TOKENS[call.vendor];
  if (call.vendor === 'claude') {
    return {
      url: 'https://api.anthropic.com/v1/messages',
      headers: { 'x-api-key': call.apiKey, 'anthropic-version': ANTHROPIC_VERSION, 'content-type': 'application/json' },
      body: {
        model: call.model,
        max_tokens: maxTokens,
        ...(call.system ? { system: call.system } : {}),
        messages: [{
          role: 'user',
          content: [
            ...call.images.map(image => ({ type: 'image', source: { type: 'base64', media_type: image.mimeType, data: image.data } })),
            { type: 'text', text: call.prompt },
          ],
        }],
      },
    };
  }
  return {
    url: 'https://api.openai.com/v1/chat/completions',
    headers: { authorization: `Bearer ${call.apiKey}`, 'content-type': 'application/json' },
    body: {
      model: call.model,
      max_completion_tokens: maxTokens,
      messages: [
        ...(call.system ? [{ role: 'system', content: call.system }] : []),
        {
          role: 'user',
          content: [
            ...call.images.map(image => ({ type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.data}` } })),
            { type: 'text', text: call.prompt },
          ],
        },
      ],
    },
  };
};

interface Parsed extends VendorResult {
  counts: AiTokenCounts | null;
  finishReason?: string;
}

const parseResponse = (vendor: RelayVendor, data: unknown): Parsed | null => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (vendor === 'claude') {
    const d = data as { content?: Array<{ type?: string; text?: string }>; stop_reason?: string; usage?: unknown };
    const text = (d.content ?? []).filter(part => part.type === 'text').map(part => part.text ?? '').join('');
    return { text, truncated: d.stop_reason === 'max_tokens', refused: d.stop_reason === 'refusal', counts: anthropicUsageCounts(d.usage), finishReason: d.stop_reason };
  }
  const d = data as { choices?: Array<{ message?: { content?: unknown }; finish_reason?: string }>; usage?: unknown };
  const choice = d.choices?.[0];
  const text = typeof choice?.message?.content === 'string' ? choice.message.content : '';
  return { text, truncated: choice?.finish_reason === 'length', refused: choice?.finish_reason === 'content_filter', counts: openAiUsageCounts(d.usage), finishReason: choice?.finish_reason };
};

export const callVendor = async (call: VendorCall): Promise<VendorResult> => {
  const label = LABEL[call.vendor];
  const deadline = Date.now() + call.timeoutMs;
  const timedOut = () => new GeminiResponseError('provider', 'AI xử lý quá lâu nên máy chủ phải dừng lượt này. Thử lại với nội dung ngắn hơn.');

  const choice = await ensureGeminiKey(call.apiKey, { vendor: true });
  const held = await acquireCallHoldWaiting(choice, deadline);
  if (!held.ok) {
    if (held.reason === 'timeout') throw timedOut();
    throw new AiKeyRequiredError(held.reason, choice.ownerUid);
  }
  let handedOver = false;
  try {
    const request = buildRequest({ ...call, apiKey: choice.key });
    let res: Response;
    try {
      res = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify(request.body),
        signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
      });
    } catch (error) {
      const expired = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      throw expired ? timedOut() : new GeminiResponseError('provider', `Không gọi được ${label} lúc này. Thử lại sau ít phút.`);
    }
    if (!res.ok) {
      throw new GeminiResponseError('http', `${label} không thể xử lý yêu cầu lúc này (mã ${res.status}). Thử lại sau ít phút.`);
    }
    const parsed = parseResponse(call.vendor, await res.json().catch(() => null));
    if (!parsed) throw new GeminiResponseError('provider', `${label} trả về phản hồi không hợp lệ. Thử lại sau ít phút.`);
    // Ghi token TRƯỚC mọi nhánh báo lỗi: hãng tính tiền cả lượt bị cắt/bị từ chối. `recordAiUsage` nhận luôn phần giữ chỗ.
    handedOver = true;
    await recordAiUsage(call.vendor, call.model, parsed.counts, { finishReason: parsed.finishReason, holdVnd: held.holdVnd });
    return { text: parsed.text, truncated: parsed.truncated, refused: parsed.refused };
  } finally {
    if (held.holdVnd > 0 && !handedOver && choice.ownerUid) {
      await releaseWalletHold(getAdminDb(), choice.ownerUid, held.holdVnd).catch(error => console.error('[ai-relay] không trả được chỗ giữ tiền:', error));
    }
  }
};
