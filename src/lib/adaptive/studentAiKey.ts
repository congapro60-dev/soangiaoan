// API key AI cho CỔNG HỌC SINH (bài học phân hóa) — thay thế relay server-side.
// Chính sách 2026-07-21: không còn key dự phòng; học sinh nhập key free (tự lấy hoặc
// thầy/cô phát) một lần trên máy, lưu localStorage, dùng cho chấm ảnh + cá nhân hóa.

const STORAGE_KEY = 'student-gemini-api-key-v1';

export const STUDENT_KEY_GUIDE =
  'Nhập API key thầy/cô gửi, hoặc tự lấy key miễn phí tại aistudio.google.com/apikey (đăng nhập Google → Create API key).';

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

/**
 * Gọi Gemini trực tiếp bằng key của học sinh (text hoặc kèm 1 ảnh).
 * Thiếu key → throw lỗi có name 'StudentAiKeyMissing' để UI mở ô nhập key.
 */
export const callStudentGemini = async (
  prompt: string,
  options: StudentGeminiOptions = {},
): Promise<string> => {
  const apiKey = getStudentAiKey();
  if (!apiKey) {
    const err = new Error(`Chưa có API key AI. ${STUDENT_KEY_GUIDE}`);
    err.name = MISSING_KEY_NAME;
    throw err;
  }

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1beta' } });
  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
    { text: prompt },
  ];
  if (options.imageBase64) {
    parts.push({ inlineData: { data: options.imageBase64, mimeType: options.imageMimeType || 'image/jpeg' } });
  }

  const result = await ai.models.generateContent({
    model: options.model || 'gemini-2.5-flash',
    contents: [{ parts }],
    config: { temperature: 0.2, maxOutputTokens: 8192 },
  });
  return (result.text || '').trim();
};
