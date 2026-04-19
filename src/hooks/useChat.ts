import { useState } from 'react';
import { callAI, getActiveApiKey } from '../lib/aiProviders';
import { AppData } from '../types';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

export const useChat = (data: AppData, setIsLoading: (val: boolean) => void, showToast: (msg: string, type?: any) => void) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  const handleChat = async () => {
    if (!chatInput.trim() || !getActiveApiKey(data.settings)) {
      if (!getActiveApiKey(data.settings)) showToast('Vui lòng nhập API Key trong phần Cài đặt!', 'warning');
      return;
    }

    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsLoading(true);

    try {
      const prompt = `
        BẠN LÀ CHUYÊN GIA SƯ PHẠM VÀ PHỤ TÁ NGHIÊN CỨU (LIKE NOTEBOOK LM).
        Câu hỏi của người dùng: "${chatInput}"
        
        YÊU CẦU QUAN TRỌNG NHẤT:
        1. Bạn phải luôn trả lời DỰA TRÊN NGỮ CẢNH CỦA GIÁO ÁN HIỆN TẠI (nếu người dùng hỏi về bài học).
        2. BẮT BUỘC TRÍCH DẪN NGUỒN CỤ THỂ. (VD: "Dựa vào mục X của giáo án...", "Theo tiêu chí 1a của hệ thống Danielson về...")
        3. Văn phong thân thiện, mang tính xây dựng, định hướng phát triển chuyên môn.
        4. Trả lời cực kỳ ngắn gọn, đi thẳng vào trọng tâm, bôi đậm từ khóa.
      `;
      const result = await callAI(prompt, data.settings);
      if (result) {
        setChatMessages(prev => [...prev, { role: 'ai', text: result }]);
      }
    } catch (error) {
      showToast('Lỗi AI Tutor', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return { chatMessages, chatInput, setChatInput, handleChat };
};
