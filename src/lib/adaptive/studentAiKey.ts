// API key AI cho CỔNG HỌC SINH (bài học phân hóa) — G3, 24/10/2026.
// Học sinh nhập key riêng MỘT lần trên máy (localStorage): nhận CẢ key Gemini free (AIza…) lẫn key Vilao (sk-…).
// ƯU TIÊU key riêng; KHÔNG có / key lỗi / hết quota → rơi xuống đường SERVER (khoá Vilao của thầy lớp
// qua /api/ai-relay, nhánh studentAi — hạn mức chống lạm dụng ở server: STUDENT_AI_DAILY_LIMIT).

const STORAGE_KEY = 'student-gemini-api-key-v1';

export const STUDENT_KEY_GUIDE =
  'Nhập API key thầy/cô gửi, hoặc tự lấy key miễn phí: Gemini tại aistudio.google.com/apikey (key bắt đầu "AIza") hoặc Vilao tại vilao.ai (key bắt đầu "sk-"). Không có key vẫn học được — AI thầy/cô sẽ hỗ trợ khi còn lượt.';

export const getStudentAiKey = (): string => {
  try {
    return (localStorage.getItem(STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
};

export const setStudentAiKey = (key: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } catch {
    // localStorage bị chặn (chế độ riêng tư) — key chỉ sống trong phiên gọi.
  }
};

const MISSING_KEY_NAME = 'StudentAiKeyMissing';

export const isStudentKeyMissingError = (err: unknown): boolean =>
  err instanceof Error && err.name === MISSING_KEY_NAME;

export interface StudentGeminiOptions {
  imageBase64?: string;
  imageMimeType?: string;
  model?: string;
}

/** Key Vilao? (OpenAI-compatible, bắt đầu "sk-") — còn lại coi như key Gemini (AIza…). */
const isVilaoKey = (key: string): boolean => key.startsWith('sk-');

/** Fallback SERVER: nhờ máy chủ gọi Vilao bằng khoá của thầy/chủ dự án (hạn mức chống lạm dụng ở server). */
const callStudentServer = async (
  prompt: string,
  options: StudentGeminiOptions,
): Promise<string> => {
  const user = (await import('../firebase')).auth.currentUser;
  if (!user) throw new Error('Chưa có phiên học sinh — kiểm tra lại link học.');
  const token = await user.getIdToken();
  const res = await fetch('/api/ai-relay', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentAi: true,
      prompt,
      ...(options.imageBase64 ? { images: [`data:${options.imageMimeType || 'image/jpeg'};base64,${options.imageBase64}`] } : {}),
    }),
  });
  const data = await res.json().catch(() => null) as { text?: unknown; error?: unknown } | null;
  if (!res.ok) {
    if (res.status === 429) throw new Error('Hết lượt AI hỗ trợ cho hôm nay (hạn mức cho học sinh). Em tiếp tục bài học và thử lại ngày mai nhé.');
    if (res.status === 402) throw new Error('AI hỗ trợ cho học sinh đang tạm tắt. Em tiếp tục bài học và hỏi thầy/cô nhé.');
    throw new Error(typeof data?.error === 'string' ? data.error : 'AI hỗ trợ học sinh chưa chạy được lúc này. Em tiếp tục bài học nhé.');
  }
  return typeof data?.text === 'string' ? data.text.trim() : '';
};

/** Gọi Gemini free bằng key AIza của học sinh (text hoặc kèm 1 ảnh). */
const callStudentGeminiKey = async (apiKey: string, prompt: string, options: StudentGeminiOptions): Promise<string> => {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1beta' } });
  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
    { text: prompt },
  ];
  if (options.imageBase64) {
    parts.push({ inlineData: { data: options.imageBase64, mimeType: options.imageMimeType || 'image/jpeg' } });
  }
  const result = await ai.models.generateContent({
    model: options.model || 'gemini-3.8-flash',
    contents: [{ parts }],
    config: { temperature: 0.2, maxOutputTokens: 8192 },
  });
  return (result.text || '').trim();
};

/** Gọi Vilao bằng key sk- của học sinh (OpenAI-compatible, có vision). */
const callStudentVilaoKey = async (apiKey: string, prompt: string, options: StudentGeminiOptions): Promise<string> => {
  const userContent: Array<Record<string, unknown>> = [];
  if (options.imageBase64) {
    userContent.push({ type: 'image_url', image_url: { url: `data:${options.imageMimeType || 'image/jpeg'};base64,${options.imageBase64}` } });
  }
  userContent.push({ type: 'text', text: prompt });
  const res = await fetch('https://api.vilao.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model || 'gemini-3.8-flash',
      max_tokens: 8192,
      messages: [{ role: 'user', content: userContent }],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Key Vilao trả lỗi ${res.status}: ${detail.slice(0, 150)}`);
  }
  const data = await res.json().catch(() => null) as { choices?: Array<{ message?: { content?: unknown } }> } | null;
  const content = data?.choices?.[0]?.message?.content;
  return (typeof content === 'string' ? content : '').trim();
};

/**
 * AI cho học sinh: ƯU TIÊN key riêng (Gemini AIza… hoặc Vilao sk-…, tự nhận diện);
 * không có key → đường server (khoá Vilao của thầy qua /api/ai-relay nhánh studentAi).
 * Lỗi key (hết quota / model chưa gắn / khoá thu hồi) cũng rơi sang server để em không bị kẹt.
 */
export const callStudentGemini = async (
  prompt: string,
  options: StudentGeminiOptions = {},
): Promise<string> => {
  const apiKey = getStudentAiKey();
  if (!apiKey) {
    // Không có key riêng: đường server là mặc định (G3) — lỗi server báo thẳng, không mở ô nhập key.
    return callStudentServer(prompt, options);
  }
  try {
    return isVilaoKey(apiKey)
      ? await callStudentVilaoKey(apiKey, prompt, options)
      : await callStudentGeminiKey(apiKey, prompt, options);
  } catch (error) {
    // Key riêng hỏng/hết → thử server một lượt; cả hai hỏng thì báo lỗi của Server (rõ ràng hơn cho HS).
    try {
      return await callStudentServer(prompt, options);
    } catch {
      throw error;
    }
  }
};