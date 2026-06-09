export const MAX_SOURCE_CHARS = 30000;

export interface TruncationResult {
  truncatedText: string;
  isTruncated: boolean;
  originalLength: number;
}

/**
 * Truncates text to a maximum length to prevent exceeding the AI context window.
 * 30,000 characters is roughly 8,000 - 10,000 tokens, which is safe for most
 * modern models while leaving room for the system prompt, skeleton, and output.
 */
export const truncateToContextBudget = (text: string | undefined, maxLength: number = MAX_SOURCE_CHARS): TruncationResult => {
  if (!text) {
    return { truncatedText: '', isTruncated: false, originalLength: 0 };
  }

  const originalLength = text.length;

  if (originalLength <= maxLength) {
    return {
      truncatedText: text,
      isTruncated: false,
      originalLength
    };
  }

  const suffix = '\n\n... [Nội dung tài liệu đã được rút gọn do vượt quá giới hạn độ dài cho phép của AI]';
  const sliceLength = Math.max(0, maxLength - suffix.length);
  
  return {
    truncatedText: text.substring(0, sliceLength) + suffix,
    isTruncated: true,
    originalLength
  };
};
