/// <reference types="node" />
// Handler GLM 5.2 — gộp vào route /api/grade-homework qua action 'aiGateway'.
//
// Vì sao không đứng thành function riêng: Vercel Hobby chỉ cho TỐI ĐA 12 Serverless Functions,
// thêm file api/ai-gateway.ts là cái thứ 13 và CẢ HAI deployment đều vỡ lúc build. Gộp vào
// route chấm bài bằng action riêng giữ nguyên hợp đồng client (Bearer idToken, JSON/SSE),
// key vẫn nằm server-side, không đổi kiến trúc bảo mật.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from './_exam-core.js';
import { bumpQuota, loadQuotaDoc, remainingQuota } from './_grading-core.js';
import {
  AI_GATEWAY_BASE_URL,
  AI_GATEWAY_MODEL,
  buildGatewayChatRequest,
  getBearerToken,
  normalizeGatewayPrompt,
  resolveGatewayApiKey,
} from './_ai-gateway-core.js';

interface GatewayBody {
  prompt?: unknown;
  stream?: unknown;
}

/** Chỉ cần đúng những trường này từ decoded token — đủ để chặn anonymous và khoá hạn mức theo uid. */
interface DecodedUser {
  uid: string;
  firebase?: { sign_in_provider?: string };
}

const readGatewayBody = (req: VercelRequest): GatewayBody => {
  if (req.body && typeof req.body === 'object') return req.body as GatewayBody;
  try {
    return JSON.parse(String(req.body || '{}')) as GatewayBody;
  } catch {
    return {};
  }
};

const sendError = (res: VercelResponse, status: number, error: string) => res.status(status).json({ error });

const verifyGatewayUser = async (req: VercelRequest): Promise<DecodedUser | null> => {
  const token = getBearerToken(req.headers.authorization);
  if (!token) return null;

  try {
    // getAdminDb initializes Firebase Admin once in the serverless function before verifyIdToken.
    getAdminDb();
    const decoded = await getAuth().verifyIdToken(token);
    return { uid: decoded.uid, firebase: decoded.firebase };
  } catch (error) {
    console.error('[ai-gateway] Firebase auth failed:', error);
    return null;
  }
};

const writeStreamEvent = (res: VercelResponse, payload: unknown) => {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const handleStream = async (
  res: VercelResponse,
  client: OpenAI,
  prompt: string,
): Promise<void> => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.status(200);

  try {
    const completion = await client.chat.completions.create(buildGatewayChatRequest(prompt, true));
    // SDK trả về union ChatCompletion | Stream; khi stream=true kiểu union không tự hẹp được
    // nên phải đi qua unknown — cast thẳng là TS2352.
    for await (const chunk of (completion as unknown as AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }>)) {
      const text = chunk.choices?.[0]?.delta?.content || '';
      if (text) writeStreamEvent(res, { text });
    }
    writeStreamEvent(res, { done: true });
    // Sentinel kết thúc theo đúng quy ước client: ghi THÔ không JSON.stringify —
    // stringify biến nó thành "[DONE]" (kèm ngoặc kép) và parser phía client bỏ qua.
    res.write('data: [DONE]\n\n');
  } catch (error) {
    console.error('[ai-gateway] Streaming request failed:', error);
    writeStreamEvent(res, { error: 'Gọi GLM 5.2 thất bại. Vui lòng thử lại.' });
    writeStreamEvent(res, '[DONE]');
  } finally {
    res.end();
  }
};

export const handleAiGateway = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    void sendError(res, 405, 'Chỉ nhận POST.');
    return;
  }

  const user = await verifyGatewayUser(req);
  if (!user) {
    void sendError(res, 401, 'Bạn cần đăng nhập để dùng GLM 5.2.');
    return;
  }

  // Cổng học sinh dùng signInAnonymously — token ẩn danh HỢP LỆ nhưng KHÔNG được đốt
  // khoá GLM của chủ dự án: gateway chỉ dành cho tài khoản giáo viên đăng nhập thật.
  if (user.firebase?.sign_in_provider === 'anonymous') {
    void sendError(res, 403, 'GLM 5.2 chỉ dùng được với tài khoản giáo viên đã đăng nhập.');
    return;
  }

  const apiKey = resolveGatewayApiKey();
  if (!apiKey) {
    void sendError(res, 500, 'AI Gateway chưa được cấu hình trên Vercel.');
    return;
  }

  const body = readGatewayBody(req);
  const prompt = normalizeGatewayPrompt(body.prompt);
  if (!prompt) {
    void sendError(res, 400, 'Nội dung gửi đến GLM 5.2 không hợp lệ.');
    return;
  }

  // Hạn mức theo từng user/ngày — chặn vét khoá khoá server bằng script.
  const db = getAdminDb();
  const [quota, quotaRef] = await loadQuotaDoc(db, user.uid);
  const verdict = remainingQuota(quota, 'gateway', '');
  if (verdict.allowed <= 0) {
    void sendError(res, 429, verdict.reason);
    return;
  }

  // Timeout tường minh NGẮN hơn trần function (60s): SDK mặc định 10 phút sẽ bị Vercel
  // cắt giữa đường mà client còn treo đợi; maxRetries 0 để một lượt hỏng không tự nhân đôi.
  const client = new OpenAI({ apiKey, baseURL: AI_GATEWAY_BASE_URL, timeout: 45_000, maxRetries: 0 });
  const stream = body.stream === true;

  if (stream) {
    await handleStream(res, client, prompt);
    await quotaRef.set(bumpQuota(quota, 'gateway', '', 1));
    return;
  }

  try {
    const completion = await client.chat.completions.create(buildGatewayChatRequest(prompt, false));
    const choice = completion.choices[0];
    const text = choice?.message?.content || '';
    if (!text) {
      void sendError(res, 502, 'GLM 5.2 không trả về nội dung.');
      return;
    }

    await quotaRef.set(bumpQuota(quota, 'gateway', '', 1));
    void res.status(200).json({
      text,
      model: AI_GATEWAY_MODEL,
      truncated: choice.finish_reason === 'length',
    });
  } catch (error) {
    console.error('[ai-gateway] Request failed:', error);
    void sendError(res, 502, 'Gọi GLM 5.2 thất bại. Vui lòng thử lại.');
  }
};
