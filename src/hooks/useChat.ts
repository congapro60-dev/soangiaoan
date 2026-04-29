import { useState } from 'react';
import { callAI, getActiveApiKey } from '../lib/aiProviders';
import { AppData } from '../types';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

// --- Patch Engine (by Claude Code) ---

/** Section Patch: Replace content between two ## headings */
function applySectionPatch(original: string, heading: string, newContent: string): string {
  const start = original.indexOf(heading);
  if (start === -1) return original; // heading not found, skip

  const after = original.slice(start + heading.length);
  const nextSection = after.match(/\n##+ /);
  const end = nextSection ? start + heading.length + nextSection.index! : original.length;

  return original.slice(0, start) + heading + '\n\n' + newContent.trim() + '\n\n' + original.slice(end);
}

/** Find/Replace Patch: Fallback for small edits not tied to a section */
function applyFindReplace(original: string, find: string, replace: string): string {
  if (!original.includes(find)) return original; // not found, skip
  return original.replace(find, replace);
}

/** Parse all patches from AI response and apply them to the original content */
function applyAllPatches(original: string, aiResponse: string): { patched: string; count: number } {
  let result = original;
  let count = 0;

  // 1. Section Patches (primary)
  const sectionRegex = /<PATCH_SECTION>\s*<HEADING>([\s\S]*?)<\/HEADING>\s*<CONTENT>([\s\S]*?)<\/CONTENT>\s*<\/PATCH_SECTION>/g;
  let sectionMatch;
  while ((sectionMatch = sectionRegex.exec(aiResponse)) !== null) {
    const heading = sectionMatch[1].trim();
    const content = sectionMatch[2].trim();
    result = applySectionPatch(result, heading, content);
    count++;
  }

  // 2. Find/Replace Patches (fallback for small inline edits)
  const patchRegex = /<PATCH>\s*<FIND>([\s\S]*?)<\/FIND>\s*<REPLACE>([\s\S]*?)<\/REPLACE>\s*<\/PATCH>/g;
  let patchMatch;
  while ((patchMatch = patchRegex.exec(aiResponse)) !== null) {
    const find = patchMatch[1].trim();
    const replace = patchMatch[2].trim();
    result = applyFindReplace(result, find, replace);
    count++;
  }

  return { patched: result, count };
}

// --- Hook ---

export const useChat = (
  data: AppData, 
  setIsLoading: (val: boolean) => void, 
  showToast: (msg: string, type?: any) => void,
  getCurrentContext?: () => string | null,
  onUpdateEditor?: (newContent: string) => void
) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  const handleChat = async () => {
    if (!chatInput.trim() || !getActiveApiKey(data.settings)) {
      if (!getActiveApiKey(data.settings)) showToast('Vui lòng nhập API Key trong phần Cài đặt!', 'warning');
      return;
    }

    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    const currentInput = chatInput;
    setChatInput('');
    setIsLoading(true);

    try {
      const context = getCurrentContext ? getCurrentContext() : null;
      const prompt = `
        BẠN LÀ CHUYÊN GIA SƯ PHẠM VÀ PHỤ TÁ NGHIÊN CỨU (LIKE NOTEBOOK LM).
        Câu hỏi của người dùng: "${currentInput}"
        
        ${context ? `NGỮ CẢNH GIÁO ÁN ĐANG MỞ:
        --- BẮT ĐẦU GIÁO ÁN ---
        ${context}
        --- KẾT THÚC GIÁO ÁN ---
        
        === HƯỚNG DẪN KHI NGƯỜI DÙNG YÊU CẦU CHỈNH SỬA GIÁO ÁN ===
        KHÔNG ĐƯỢC viết lại toàn bộ giáo án. Thay vào đó, chỉ trả về các khối thay đổi:

        [CÁCH 1 - ƯU TIÊN] Nếu thay đổi nằm trong một MỤC (Heading ##) cụ thể:
        Dùng thẻ <PATCH_SECTION>:
        <PATCH_SECTION>
        <HEADING>## TÊN MỤC CHÍNH XÁC NHƯ TRONG GIÁO ÁN</HEADING>
        <CONTENT>
        Viết đầy đủ toàn bộ nội dung MỚI của mục đó (bao gồm cả phần không thay đổi trong mục).
        TUYỆT ĐỐI KHÔNG dùng placeholder "(giữ nguyên)", "[...]", "..." hay bất kỳ cụm tắt nào.
        </CONTENT>
        </PATCH_SECTION>

        [CÁCH 2 - FALLBACK] Nếu thay đổi là nhỏ, không thuộc mục riêng (VD: đổi tên bài, sửa thời lượng):
        Dùng thẻ <PATCH>:
        <PATCH>
        <FIND>đoạn văn gốc chính xác cần thay thế</FIND>
        <REPLACE>nội dung mới thay thế</REPLACE>
        </PATCH>

        Sau các thẻ patch, hãy viết 1-2 câu giải thích ngắn những gì đã được thay đổi.
        Nếu người dùng chỉ HỎI TƯ VẤN (không yêu cầu sửa), trả lời bình thường, KHÔNG dùng thẻ patch.` : ''}
        
        YÊU CẦU CHUNG:
        1. Văn phong thân thiện, xây dựng, định hướng phát triển chuyên môn.
        2. Trả lời ngắn gọn, bôi đậm từ khóa quan trọng.
      `;
      const result = await callAI(prompt, data.settings);
      if (result) {
        // Try to apply section/find-replace patches
        const hasPatch = /<PATCH_SECTION>|<PATCH>/.test(result);
        if (hasPatch && onUpdateEditor && getCurrentContext) {
          const currentContent = getCurrentContext();
          if (currentContent) {
            const { patched, count } = applyAllPatches(currentContent, result);
            if (count > 0) {
              onUpdateEditor(patched);
              showToast(`✅ Đã cập nhật ${count} mục trong giáo án!`, 'success');
            } else {
              showToast('⚠️ Không tìm thấy đúng vị trí cần sửa trong giáo án.', 'warning');
            }
          }
          // Show explanation text only (strip patch tags from chat)
          const cleanText = result
            .replace(/<PATCH_SECTION>[\s\S]*?<\/PATCH_SECTION>/g, '')
            .replace(/<PATCH>[\s\S]*?<\/PATCH>/g, '')
            .trim();
          const feedbackMsg = cleanText || `✨ **Trợ lý đã cập nhật giáo án thành công!**`;
          setChatMessages(prev => [...prev, { role: 'ai', text: feedbackMsg }]);
        } else {
          setChatMessages(prev => [...prev, { role: 'ai', text: result }]);
        }
      }
    } catch (error) {
      showToast('Lỗi AI Tutor', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return { chatMessages, chatInput, setChatInput, handleChat };
};

