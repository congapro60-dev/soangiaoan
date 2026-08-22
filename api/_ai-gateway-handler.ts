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

const readGatewayBody = (req: VercelRequest): GatewayBody => {
  if (req.body && typeof req.body === 'object') return req.body as GatewayBody;
  try {
    return JSON.parse(String(req.body || '{}')) as GatewayBody;
  } catch {
    return {};
  }
};

const sendError = (res: VercelResponse, status: number, error: string) => res.status(status).json({ error });

const verifyFirebaseUser = async (req: VercelRequest): Promise<boolean> => {
  const token = getBearerToken(req.headers.authorization);
  if (!token) return false;

  try {
    // getAdminDb initializes Firebase Admin once in the serverless function before verifyIdToken.
    getAdminDb();
    await getAuth().verifyIdToken(token);
    return true;
  } catch (error) {
    console.error('[ai-gateway] Firebase auth failed:', error);
    return false;
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
    writeStreamEvent(res, '[DONE]');
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

  const authenticated = await verifyFirebaseUser(req);
  if (!authenticated) {
    void sendError(res, 401, 'Bạn cần đăng nhập để dùng GLM 5.2.');
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

  const client = new OpenAI({ apiKey, baseURL: AI_GATEWAY_BASE_URL });
  const stream = body.stream === true;

  if (stream) {
    await handleStream(res, client, prompt);
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
