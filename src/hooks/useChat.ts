import { useState } from 'react';
import { callGeminiAI, MODELS } from '../lib/gemini';
import { AppData } from '../types';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

export const useChat = (data: AppData, setIsLoading: (val: boolean) => void, showToast: (msg: string, type?: any) => void) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  const handleChat = async () => {
    if (!chatInput.trim() || !data.settings.geminiApiKey) {
      if (!data.settings.geminiApiKey) showToast('Vui lòng nhập API Key trong phần Cài đặt!', 'warning');
      return;
    }

    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsLoading(true);

    try {
      const prompt = `Bạn là AI Tutor giúp giáo viên soạn giáo án. Câu hỏi: "${chatInput}"`;
      const result = await callGeminiAI(prompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));
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
