/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { acquireCallHoldWaiting, createAiUsageContext, openAiUsageCounts, recordAiUsage, releaseWalletHold, runWithAiUsage } from './_ai-usage.js';
import { AiKeyRequiredError, aiKeyRequiredPayload, ensureGeminiKey } from './_ai-keys.js';

const VILAO_MODEL = 'gemini-3.8-flash';
const MAX_PROBLEM_TEXT_LENGTH = 2000;
const MAX_HTML_SIZE_BYTES = 200000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

type SimulationStyle = 'textbook' | 'realistic';

type GenerateSimulationError = 'unauthorized' | 'invalid_input' | 'gemini_error' | 'html_too_large' | 'rate_limited';

interface RateLimitWindow {
  startedAt: number;
  count: number;
}

const rateLimits = new Map<string, RateLimitWindow>();

const SYSTEM_PROMPT = `Bạn là chuyên gia tạo mô phỏng HTML tương tác cho học sinh THPT Việt Nam.

NHIỆM VỤ: Sinh ra 1 file HTML duy nhất (self-contained, không cần asset ngoài)
mô phỏng đề bài toán được cung cấp, để học sinh hiểu trực quan trước khi học công thức.

YÊU CẦU KỸ THUẬT:
- Output: 1 đoạn HTML hoàn chỉnh từ <!DOCTYPE html> đến </html>
- CSS inline trong <style>, JS inline trong <script>
- KHÔNG dùng asset bên ngoài (no <img src="http...">, no <link href="...">)
- KHÔNG dùng framework (no React, Vue, jQuery)
- Vanilla JS + Canvas/SVG cho hình động nếu cần
- Tổng dung lượng < 100KB

YÊU CẦU GIÁO DỤC:
- Có ít nhất 1 thanh trượt / input / nút điều khiển để học sinh thay đổi tham số
- Khi học sinh thay đổi tham số, mô phỏng cập nhật REAL-TIME
- Hiển thị bảng giá trị / công thức tương ứng cập nhật theo
- KHÔNG hiện đáp án bài toán
- KHÔNG nhồi chữ giải thích dài — chỉ chú thích đại lượng

PHONG CÁCH:
- {style}: 'textbook' = đường nét sạch, màu pastel, kiểu SGK
- {style}: 'realistic' = hình minh họa sinh động, gradient, animation mượt

NGÔN NGỮ: Tiếng Việt, dùng ký hiệu toán học chuẩn (u_n, S_n, d, ...)`;

const parseJsonSecret = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return JSON.parse(value.replace(/\r?\n/g, '\\n'));
  }
};

const parseServiceAccount = () => {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const rawBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (rawJson) {
    return parseJsonSecret(rawJson);
  }

  if (rawBase64) {
    return parseJsonSecret(Buffer.from(rawBase64, 'base64').toString('utf8'));
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  return null;
};

const initializeAdmin = () => {
  if (!getApps().length) {
    const serviceAccount = parseServiceAccount();
    if (!serviceAccount) {
      throw new Error('Missing Firebase Admin service account environment variables');
    }

    initializeApp({ credential: cert(serviceAccount) });
  }
};

const sendError = (res: VercelResponse, status: number, error: GenerateSimulationError, message: string) => (
  res.status(status).json({ ok: false, error, message })
);

const getBearerToken = (authorizationHeader: string | string[] | undefined) => {
  const authorization = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
};

const normalizeStyle = (value: unknown): SimulationStyle => (
  value === 'realistic' ? 'realistic' : 'textbook'
);

const validateStringId = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

const checkRateLimit = (teacherId: string) => {
  const now = Date.now();
  const current = rateLimits.get(teacherId);

  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(teacherId, { startedAt: now, count: 1 });
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  current.count += 1;
  return true;
};

const buildUserPrompt = ({ problemText, style }: { problemText: string; style: SimulationStyle }) => `Đề bài: ${problemText}

Lớp: THPT
Chủ đề: Toán học
Mục tiêu mô phỏng: Giúp học sinh hiểu trực quan ý tưởng toán học trước khi học công thức
Phong cách: ${style}

Hãy sinh HTML mô phỏng.`;

const isValidHtmlSimulation = (html: string) => (
  html.startsWith('<!DOCTYPE html>') && html.endsWith('</html>')
);

const getHtmlSizeBytes = (html: string) => Buffer.byteLength(html, 'utf8');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    return sendError(res, 401, 'unauthorized', 'Missing Firebase ID token');
  }

  let teacherId: string;
  let teacherEmail: string | null = null;
  try {
    initializeAdmin();
    const decodedToken = await getAuth().verifyIdToken(token);
    teacherId = decodedToken.uid;
    teacherEmail = typeof decodedToken.email === 'string' ? decodedToken.email : null;
  } catch (error) {
    console.error('Simulation auth failed:', error);
    return sendError(res, 401, 'unauthorized', 'Invalid Firebase ID token');
  }

  if (!checkRateLimit(teacherId)) {
    return sendError(res, 429, 'rate_limited', 'Vui lòng thử lại sau');
  }

  const { lessonId, unitId, exampleId, problemText, style: rawStyle, regenerate } = req.body || {};
  const style = normalizeStyle(rawStyle);

  if (
    !validateStringId(lessonId)
    || !validateStringId(unitId)
    || !validateStringId(exampleId)
    || typeof problemText !== 'string'
    || problemText.trim().length === 0
    || problemText.length > MAX_PROBLEM_TEXT_LENGTH
    || (rawStyle !== undefined && rawStyle !== 'textbook' && rawStyle !== 'realistic')
  ) {
    return sendError(res, 400, 'invalid_input', 'Invalid simulation generation payload');
  }

  const normalizedLessonId = lessonId.trim();
  const normalizedUnitId = unitId.trim();
  const normalizedExampleId = exampleId.trim();
  const normalizedProblemText = problemText.trim();
  const simulationId = `${normalizedLessonId}_${normalizedUnitId}`;

  try {
    const db = getFirestore();
    const simulationRef = db.collection('lessonSimulations').doc(simulationId);
    const cachedSnapshot = await simulationRef.get();

    if (cachedSnapshot.exists && regenerate !== true) {
      const cachedData = cachedSnapshot.data() || {};
      if (typeof cachedData.html === 'string') {
        return res.status(200).json({
          ok: true,
          simulationId,
          html: cachedData.html,
          cached: true,
        });
      }
    }

    const apiKey = process.env.GRADING_VILAO_API_KEY?.trim();
    if (!apiKey) {
      return sendError(res, 500, 'gemini_error', 'Vilao API key is not configured');
    }

    // G1 24/10/2026: máy chủ gọi chợ Vilao (OpenAI-compatible) thay SDK Google; không stream, trả khối một lần.
    const baseUrl = (process.env.GRADING_VILAO_BASE_URL?.trim() || 'https://api.vilao.ai/v1').replace(/\/+$/, '');
    const generate = async (key: string): Promise<{ text: string; usage: unknown }> => {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: VILAO_MODEL,
          temperature: 0.2,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt({ problemText: normalizedProblemText, style }) },
          ],
        }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Vilao trả lỗi ${response.status}: ${detail.slice(0, 200)}`);
      }
      const data = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: unknown } }>; usage?: unknown } | null;
      const content = data?.choices?.[0]?.message?.content;
      return { text: typeof content === 'string' ? content : '', usage: data?.usage ?? null };
    };
    const identity = { uid: teacherId, email: teacherEmail, anonymous: false };
    const usageContext = createAiUsageContext(null, 'generateSimulation', { lessonId: normalizedLessonId }, async () => identity);
    usageContext.keyOwnerUid = teacherId;
    let text: string;
    try {
      text = await runWithAiUsage(usageContext, async () => {
        // Cùng quy tắc với chấm bài: lượt này luôn dùng khoá chung Vilao (vendor mode — không có khoá riêng của hãng).
        const choice = await ensureGeminiKey(apiKey, { vendor: true });
        // Giữ chỗ tiền trước khi gọi (chỉ lượt bị trừ ví) để các lượt song song không cùng lọt qua kiểm số dư (QA F3).
        const acquire = async (): Promise<number> => {
          const held = await acquireCallHoldWaiting(choice);
          if (held.ok === false) throw new AiKeyRequiredError(held.reason === 'timeout' ? 'no_balance' : held.reason, choice.ownerUid);
          return held.holdVnd;
        };
        const holdVnd = await acquire();
        let handedOver = false;
        try {
          const generated = await generate(choice.key);
          // Đếm token — ghi trước mọi nhánh báo lỗi vì lượt này đã tính tiền. `recordAiUsage` nhận luôn phần giữ chỗ.
          handedOver = true;
          await recordAiUsage('vilao', `vilao/${VILAO_MODEL}`, openAiUsageCounts(generated.usage), { holdVnd });
          return generated.text;
        } finally {
          if (holdVnd > 0 && !handedOver && choice.ownerUid) {
            await releaseWalletHold(db, choice.ownerUid, holdVnd).catch(error => console.error('[simulation] không trả được chỗ giữ tiền:', error));
          }
        }
      });
    } catch (error) {
      if (error instanceof AiKeyRequiredError) return res.status(402).json(aiKeyRequiredPayload(error));
      throw error;
    }

    const html = text.trim();
    if (!isValidHtmlSimulation(html)) {
      return sendError(res, 500, 'gemini_error', 'Gemini output is not valid self-contained HTML');
    }

    const htmlSizeBytes = getHtmlSizeBytes(html);
    if (htmlSizeBytes >= MAX_HTML_SIZE_BYTES) {
      return sendError(res, 413, 'html_too_large', 'Generated HTML is larger than 200KB');
    }

    await simulationRef.set({
      id: simulationId,
      lessonId: normalizedLessonId,
      unitId: normalizedUnitId,
      exampleId: normalizedExampleId,
      problemText: normalizedProblemText,
      html,
      style,
      createdAt: new Date().toISOString(),
      createdBy: teacherId,
      htmlSizeBytes,
      geminiModel: `vilao/${VILAO_MODEL}`,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.status(200).json({
      ok: true,
      simulationId,
      html,
      cached: false,
    });
  } catch (error) {
    console.error('Generate simulation failed:', error);
    return sendError(res, 500, 'gemini_error', error instanceof Error ? error.message : 'Gemini simulation generation failed');
  }
}
