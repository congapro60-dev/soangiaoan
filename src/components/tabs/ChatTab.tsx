import { motion } from 'motion/react';
import { MessageSquare, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { cn } from '../../lib/utils';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

interface ChatTabProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (val: string) => void;
  isLoading: boolean;
  handleChat: () => void;
}

export const ChatTab = ({
  chatMessages,
  chatInput,
  setChatInput,
  isLoading,
  handleChat
}: ChatTabProps) => {
  return (
    <motion.div 
      key="chat"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
    >
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center">
          <MessageSquare className="text-white w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-slate-800">AI Tutor</div>
          <div className="text-xs text-green-500 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Đang trực tuyến
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-[400px]">
        {chatMessages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 py-20">
            <MessageSquare className="w-16 h-16 opacity-10" />
            <p className="text-center max-w-xs">Chào thầy/cô! Tôi có thể giúp gì trong việc tinh chỉnh giáo án hôm nay?</p>
          </div>
        )}
        {chatMessages.map((msg, idx) => (
          <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[80%] p-4 rounded-2xl text-sm",
              msg.role === 'user' 
                ? "bg-blue-600 text-white rounded-tr-none" 
                : "bg-slate-100 text-slate-800 rounded-tl-none"
            )}>
              {msg.role === 'ai' ? (
                <div className="markdown-body">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                  >{msg.text}</ReactMarkdown>
                </div>
              ) : msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none flex gap-2">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-slate-100">
        <div className="flex gap-3">
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleChat()}
            placeholder="Nhập yêu cầu (ví dụ: 'Hãy thêm hoạt động trò chơi cho bài này'...)"
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
          <button 
            onClick={handleChat}
            disabled={isLoading || !chatInput.trim()}
            className="p-3 gradient-bg text-white rounded-xl shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
