import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { callAI, getActiveApiKey } from '../lib/aiProviders';
import { AppData } from '../types';
import { applyEditorPatches, stripEditorPatchTags } from '../utils/editorPatchEngine';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

const EDITOR_UNDO_STORAGE_KEY = 'lesson-editor-ai-agent-last-safe-backup';
const CHAT_HISTORY_STORAGE_KEY = 'ai-tutor-chat-history';
const MAX_CHAT_HISTORY = 60;
const CHAT_CONTEXT_HEAD_CHARS = 12000;
const CHAT_CONTEXT_TAIL_CHARS = 6000;

const loadChatHistory = (): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is ChatMessage => m && (m.role === 'user' || m.role === 'ai') && typeof m.text === 'string'
    );
  } catch {
    return [];
  }
};

const buildBoundedChatContext = (context: string | null): string | null => {
  if (!context) return null;
  if (context.length <= CHAT_CONTEXT_HEAD_CHARS + CHAT_CONTEXT_TAIL_CHARS) return context;

  return `${context.slice(0, CHAT_CONTEXT_HEAD_CHARS)}\n\n[... NGỮ CẢNH ĐÃ ĐƯỢC RÚT GỌN: bỏ qua ${context.length - CHAT_CONTEXT_HEAD_CHARS - CHAT_CONTEXT_TAIL_CHARS} ký tự ở giữa để tránh vượt giới hạn AI ...]\n\n${context.slice(-CHAT_CONTEXT_TAIL_CHARS)}`;
};

const saveEditorUndoBackup = (content: string) => {
  try {
    localStorage.setItem(EDITOR_UNDO_STORAGE_KEY, content);
  } catch {
    // Ignore storage quota/private-mode failures; the in-memory undo action still works for this toast.
  }
};

const showPatchWarningWithUndo = async ({
  message,
  backup,
  onUndo,
}: {
  message: string;
  backup: string;
  onUndo: (content: string) => void;
}) => {
  const result = await Swal.fire({
    title: message,
    icon: 'warning',
    toast: true,
    position: 'top-end',
    showConfirmButton: true,
    confirmButtonText: 'Hoàn tác',
    showCancelButton: true,
    cancelButtonText: 'Đóng',
    timer: 10000,
    timerProgressBar: true,
  });

  if (result.isConfirmed) {
    onUndo(backup);
    Swal.fire({
      title: 'Đã hoàn tác về bản giáo án an toàn gần nhất.',
      icon: 'success',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  }
};

// --- Hook ---

export const useChat = (
  data: AppData, 
  setIsLoading: (val: boolean) => void, 
  showToast: (msg: string, type?: any) => void,
  getCurrentContext?: () => string | null,
  onUpdateEditor?: (newContent: string) => void
) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(loadChatHistory);
  const [chatInput, setChatInput] = useState('');

  // Lưu hội thoại để không mất khi reload; cắt bớt để không phình localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(chatMessages.slice(-MAX_CHAT_HISTORY)));
    } catch {
      // localStorage đầy — bỏ qua, hội thoại vẫn còn trong phiên
    }
  }, [chatMessages]);

  const clearChat = () => {
    setChatMessages([]);
    try {
      localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
    } catch { /* ignore */ }
  };

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
      const context = buildBoundedChatContext(getCurrentContext ? getCurrentContext() : null);
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
        // Try to apply section/find-replace patches. Full-editor rewrites are blocked by the patch engine.
        const patchResult = applyEditorPatches(getCurrentContext ? getCurrentContext() || '' : '', result);
        if (patchResult.hasPatchIntent && onUpdateEditor && getCurrentContext) {
          const currentContent = getCurrentContext();
          if (currentContent) {
            const safeBackup = currentContent;
            if (patchResult.appliedCount > 0) {
              saveEditorUndoBackup(safeBackup);
              onUpdateEditor(patchResult.patched);
              showToast(`✅ Đã cập nhật ${patchResult.appliedCount} mục trong giáo án!`, 'success');
            }

            if (patchResult.warnings.length > 0) {
              await showPatchWarningWithUndo({
                message: `⚠️ ${patchResult.warnings[0]}`,
                backup: safeBackup,
                onUndo: onUpdateEditor,
              });
            } else if (patchResult.appliedCount === 0) {
              showToast(
                patchResult.rejected[0]?.reason || '⚠️ Không tìm thấy đúng vị trí cần sửa trong giáo án.',
                'warning'
              );
            }
          }
          // Show explanation text only (strip patch tags from chat)
          const cleanText = stripEditorPatchTags(result);
          const feedbackMsg = cleanText || (
            patchResult.appliedCount > 0
              ? `✨ **Trợ lý đã cập nhật giáo án an toàn bằng patch.**`
              : `⚠️ **Trợ lý không ghi đè giáo án vì patch không an toàn hoặc không khớp nội dung hiện tại.**`
          );
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

  return { chatMessages, chatInput, setChatInput, handleChat, clearChat };
};

