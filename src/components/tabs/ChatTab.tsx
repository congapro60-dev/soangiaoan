import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Bot,
  Lightbulb,
  SendHorizontal,
  Sparkles,
  Trash2
} from 'lucide-react';
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
  clearChat: () => void;
}

const suggestions = [
  'Gợi ý hoạt động khởi động',
  'Tạo 5 câu hỏi trắc nghiệm',
  'Tinh chỉnh mục tiêu bài học',
  'Thêm phân hóa cho học sinh yếu'
];

export const ChatTab = ({
  chatMessages,
  chatInput,
  setChatInput,
  isLoading,
  handleChat,
  clearChat
}: ChatTabProps) => {
  const canSend = !isLoading && chatInput.trim().length > 0;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chatMessages, isLoading]);

  return (
    <motion.div
      key="chat"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative h-full min-h-[640px] overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/82 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:radial-gradient(#3182ce_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="relative flex h-full flex-col">
        <div className="border-b border-slate-200/80 bg-white/70 px-5 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--dewey-blue)] text-white shadow-[0_12px_28px_-18px_rgba(49,130,206,0.9)]">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-slate-900">AI Tutor</h2>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--dewey-blue)]">
                    Co-pilot
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[var(--dewey-blue)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--dewey-blue)]" />
                  Đang trực tuyến · hỗ trợ tinh chỉnh giáo án
                </div>
              </div>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={clearChat}
                disabled={chatMessages.length === 0}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-xs font-bold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                title="Xóa toàn bộ hội thoại"
              >
                <Trash2 className="h-4 w-4" /> Xóa hội thoại
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 bg-blue-50/80 px-5 py-3 text-sm text-slate-600 sm:px-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--dewey-blue)]" />
            <span>AI Tutor dùng ngữ cảnh hiện tại để gợi ý hoạt động, câu hỏi và cách diễn đạt phù hợp lớp học.</span>
          </div>
          <span className="hidden whitespace-nowrap rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-semibold text-[var(--dewey-blue)] md:inline-flex">
            Knowledge Blue
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white/35 px-4 py-6 sm:px-6">
          {chatMessages.length === 0 ? (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-50 text-[var(--dewey-blue)] ring-1 ring-blue-100">
                <Lightbulb className="h-9 w-9 opacity-70" />
              </div>
              <h3 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-slate-800">Chào thầy/cô!</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Tôi có thể giúp tinh chỉnh giáo án, gợi ý hoạt động, tạo câu hỏi hoặc diễn giải lại nội dung cho dễ dạy hơn.
              </p>
              <div className="mt-8 flex max-w-2xl flex-wrap justify-center gap-3">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setChatInput(suggestion)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[var(--dewey-blue)]"
                  >
                    “{suggestion}”
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex gap-3',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'ai' && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--dewey-blue)] text-white">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[88%] rounded-3xl px-5 py-4 text-sm leading-6 shadow-sm sm:max-w-[78%]',
                      msg.role === 'user'
                        ? 'rounded-tr-md bg-[var(--dewey-blue)] text-white'
                        : 'rounded-tl-md border border-slate-200/80 bg-blue-50/70 text-slate-800'
                    )}
                  >
                    {msg.role === 'ai' ? (
                      <div className="markdown-body text-sm leading-7 [&_*:last-child]:mb-0">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeRaw, rehypeKatex]}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--dewey-blue)] text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2 rounded-3xl rounded-tl-md border border-slate-200 bg-blue-50/70 px-5 py-4">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--dewey-blue)]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--dewey-blue)] [animation-delay:0.2s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--dewey-blue)] [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-slate-200/80 bg-white/86 px-4 py-4 sm:px-6">
          <div className="flex items-end gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm transition focus-within:border-[var(--dewey-blue)] focus-within:ring-4 focus-within:ring-blue-100">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (canSend) handleChat();
                }
              }}
              placeholder="Nhập yêu cầu (ví dụ: 'Hãy thêm hoạt động trò chơi cho bài này'...)"
              rows={1}
              className="max-h-32 min-h-11 flex-1 resize-none border-none bg-transparent px-2 py-2.5 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 focus:ring-0"
            />
            <button
              type="button"
              onClick={handleChat}
              disabled={!canSend}
              className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--dewey-blue)] text-white shadow-[0_12px_28px_-18px_rgba(49,130,206,0.9)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              title="Gửi"
            >
              <SendHorizontal className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            AI có thể mắc lỗi. Vui lòng kiểm tra lại thông tin quan trọng trước khi đưa vào giáo án.
          </p>
        </div>
      </div>
    </motion.div>
  );
};
