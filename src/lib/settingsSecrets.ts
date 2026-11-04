/**
 * Khoá API KHÔNG bao giờ được ghi lên / đọc từ Firebase cùng cài đặt: chúng chỉ nằm ở trình duyệt của giáo viên.
 * Một chỗ duy nhất liệt kê, để thêm trường khoá mới (vd danh sách nhiều khoá Gemini) không bị quên ở một trong hai đường đồng bộ.
 */
const LOCAL_ONLY_KEYS = ['geminiApiKey', 'geminiApiKeys', 'claudeApiKey', 'openaiApiKey', 'grokApiKey', 'deepseekApiKey'] as const;

export const stripLocalOnlyKeys = <T extends object>(settings: T): Omit<T, (typeof LOCAL_ONLY_KEYS)[number]> => {
  const copy = { ...settings } as Record<string, unknown>;
  for (const key of LOCAL_ONLY_KEYS) delete copy[key];
  return copy as Omit<T, (typeof LOCAL_ONLY_KEYS)[number]>;
};
