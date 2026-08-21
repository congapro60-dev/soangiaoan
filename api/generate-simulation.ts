/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const GEMINI_MODEL = 'gemini-3.7-flash';
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
  try {
    initializeAdmin();
    const decodedToken = await getAuth().verifyIdToken(token);
    teacherId = decodedToken.uid;
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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return sendError(res, 500, 'gemini_error', 'Gemini API key is not configured');
    }

    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: buildUserPrompt({ problemText: normalizedProblemText, style }) }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
      },
    });

    const html = (result.text || '').trim();
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
      geminiModel: GEMINI_MODEL,
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
