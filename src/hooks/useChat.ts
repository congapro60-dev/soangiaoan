import { useState } from 'react';
import { callAI, getActiveApiKey } from '../lib/aiProviders';
import { AppData } from '../types';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

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
        
        ${context ? `NGỮ CẢNH GIÁO ÁN ĐANG MỞ (Sử dụng để tham chiếu):
        --- BẮT ĐẦU GIÁO ÁN ---
        ${context}
        --- KẾT THÚC GIÁO ÁN ---
        
        CHÚ Ý CỰC KỲ QUAN TRỌNG: 
        Nếu người dùng yêu cầu BẠN SỬA ĐỔI, THÊM, BỚT nội dung trực tiếp vào giáo án:
        1. Hãy viết lại TOÀN BỘ giáo án đã được cập nhật nội dung.
        2. BẮT BUỘC phải bọc toàn bộ giáo án mới đó bên trong cặp thẻ HTML: <UPDATE_EDITOR> (nội dung mới) </UPDATE_EDITOR>.
        3. ĐỂ GIỮ NGUYÊN CÁC PHẦN KHÔNG CÓ THAY ĐỔI, BẮT BUỘC SAO CHÉP NGUYÊN VĂN 100% NỘI DUNG GỐC của phần đó. TUYỆT ĐỐI KHÔNG được viết các cụm từ kiểu "(Giữ nguyên như bản gốc)", "[Nội dung cũ]", "(unchanged)", "[...]" hay bất kỳ dạng placeholder nào thay thế cho nội dung thật. Việc dùng placeholder là LỖI NGHIÊM TRỌNG gây mất dữ liệu của giáo viên.
        Nếu người dùng chỉ hỏi tư vấn bình thường, hãy trả lời bình thường và TUYỆT ĐỐI KHÔNG dùng thẻ <UPDATE_EDITOR>.` : ''}
        
        YÊU CẦU QUAN TRỌNG NHẤT:
        1. Bạn phải luôn trả lời DỰA TRÊN NGỮ CẢNH CỦA GIÁO ÁN HIỆN TẠI (nếu người dùng hỏi về bài học).
        2. BẮT BUỘC TRÍCH DẪN NGUỒN CỤ THỂ. (VD: "Dựa vào mục X của giáo án...", "Theo tiêu chí 1a của hệ thống Danielson về...")
        3. Văn phong thân thiện, mang tính xây dựng, định hướng phát triển chuyên môn.
        4. Trả lời cực kỳ ngắn gọn, đi thẳng vào trọng tâm, bôi đậm từ khóa.
      `;
      const result = await callAI(prompt, data.settings);
      if (result) {
        // Parse Magic Tag for Agentic Execution
        const updateMatch = result.match(/<UPDATE_EDITOR>([\s\S]*?)<\/UPDATE_EDITOR>/);
        if (updateMatch && onUpdateEditor) {
          const newContent = updateMatch[1].trim();
          onUpdateEditor(newContent);
          
          // Remove the tag from chat display to avoid cluttering the chat history
          const cleanText = result.replace(/<UPDATE_EDITOR>[\s\S]*?<\/UPDATE_EDITOR>/, '').trim();
          const feedbackMsg = cleanText || "✨ **Trợ lý đã tự động cập nhật giáo án trên màn hình của thầy!** (Thầy có thể xem bên cửa sổ Soạn thảo)";
          setChatMessages(prev => [...prev, { role: 'ai', text: feedbackMsg }]);
          showToast('Đã cập nhật giáo án thành công!', 'success');
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
