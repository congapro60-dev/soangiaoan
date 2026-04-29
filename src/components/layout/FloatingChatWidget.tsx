import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
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

interface FloatingChatWidgetProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (val: string) => void;
  isLoading: boolean;
  handleChat: () => void;
}

export const FloatingChatWidget = ({
  chatMessages,
  chatInput,
  setChatInput,
  isLoading,
  handleChat
}: FloatingChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [chatMessages, isOpen, isLoading]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col mb-4 origin-bottom-right",
              isExpanded ? "w-[90vw] sm:w-[80vw] h-[85vh] max-w-4xl max-h-[800px]" : "w-[360px] h-[550px] max-h-[70vh]"
            )}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 cursor-default">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center shadow-md">
                  <MessageSquare className="text-white w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-sm">AI Tutor</div>
                  <div className="text-[10px] text-green-500 flex items-center gap-1 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Trợ lý giải đáp
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors hidden sm:block"
                  title={isExpanded ? "Thu nhỏ" : "Phóng to"}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-500 rounded-lg transition-colors"
                  title="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <MessageSquare className="w-10 h-10 opacity-20" />
                  <p className="text-center text-xs px-4">Hãy hỏi tôi về cách viết công thức LaTeX, tạo bảng biểu, hoặc lên ý tưởng giảng dạy!</p>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] p-3 rounded-2xl text-sm shadow-sm",
                    msg.role === 'user' 
                      ? "bg-blue-600 text-white rounded-tr-none" 
                      : "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200"
                  )}>
                    {msg.role === 'ai' ? (
                      <div className="markdown-body text-xs sm:text-sm">
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
                  <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none flex gap-1.5 border border-slate-200">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-slate-100 bg-white">
              <div className="flex gap-2 relative">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (chatInput.trim() && !isLoading) handleChat();
                    }
                  }}
                  placeholder="Hỏi AI (Shift+Enter để xuống dòng)..."
                  className="flex-1 pl-4 pr-12 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm resize-none custom-scrollbar min-h-[44px] max-h-[120px]"
                  rows={1}
                />
                <button 
                  onClick={handleChat}
                  disabled={isLoading || !chatInput.trim()}
                  className="absolute right-1.5 bottom-1.5 p-2 gradient-bg text-white rounded-lg shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-colors duration-300 z-50",
          isOpen ? "bg-slate-800 text-white" : "gradient-bg text-white"
        )}
        title="Trợ lý AI Tutor"
      >
        {isOpen ? <X className="w-6 h-6" /> : (
          <>
            <MessageSquare className="w-6 h-6" />
            {!isOpen && chatMessages.length > 0 && !isLoading && (
               <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full"></span>
            )}
            <span className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-20"></span>
          </>
        )}
      </motion.button>
    </div>
  );
};
