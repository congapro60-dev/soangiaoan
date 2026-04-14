import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Headphones, Play, Square, Loader2, X } from 'lucide-react';
import { callGeminiAI } from '../../lib/gemini';

interface AudioOverviewProps {
  content: string;
  apiKey: string;
  modelIndex: number;
  onClose: () => void;
}

export const AudioOverview = ({ content, apiKey, modelIndex, onClose }: AudioOverviewProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [script, setScript] = useState<string | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const generateAndPlay = async () => {
    if (isPlaying) {
      synthRef.current?.cancel();
      setIsPlaying(false);
      return;
    }

    if (script) {
      speakContent(script);
      return;
    }

    setIsLoading(true);
    try {
      const prompt = `
        Bạn là chuyên gia giáo dục đang thu âm một đoạn Podcast tóm tắt cực hay, cực truyền cảm hứng về Giáo án này.
        Giáo án:
        ${content}

        Yêu cầu:
        1. Viết một kịch bản ngắn (khoảng 150-200 từ).
        2. Bắt đầu bằng: "Chào các thầy cô, hôm nay chúng ta sẽ cùng khám phá một bài giảng tuyệt vời về..."
        3. Nêu bật 2-3 điểm sáng tạo nhất của giáo án.
        4. Trả về DUY NHẤT LỜI ĐỌC (plain text, không dùng markdown, không dùng ký tự đặc biệt như ** hay # để máy đọc trơn tru).
      `;
      const result = await callGeminiAI(prompt, apiKey, modelIndex);
      if (result) {
        setScript(result);
        speakContent(result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const speakContent = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    
    // Split into smaller chunks to prevent speech synthesis stopping early (common browser bug)
    const chunks = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let currentChunk = 0;
    
    const playNext = () => {
      if (currentChunk < chunks.length) {
        const utterance = new SpeechSynthesisUtterance(chunks[currentChunk]);
        utterance.lang = 'vi-VN';
        utterance.rate = 1.05;
        utterance.pitch = 1.1;
        
        utterance.onend = () => {
          currentChunk++;
          playNext();
        };
        
        utterance.onerror = (e) => {
           console.error("Speech error", e);
           setIsPlaying(false);
        };

        synthRef.current?.speak(utterance);
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
    };
    
    playNext();
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-6 right-6 z-50 w-80 bg-white/90 backdrop-blur-xl border border-purple-100 rounded-3xl shadow-2xl p-5"
      >
        <button onClick={() => { synthRef.current?.cancel(); onClose(); }} className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 transition-colors">
          <X className="w-4 h-4 text-slate-400" />
        </button>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg shadow-purple-200">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-slate-800">Audio Overview</h4>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">NotebookLM Style</p>
          </div>
        </div>

        <button 
          onClick={generateAndPlay}
          disabled={isLoading}
          className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isPlaying ? <Square className="fill-white w-4 h-4" /> : <Play className="fill-white w-4 h-4 ml-1" />}
          {isLoading ? 'Đang soạn kịch bản...' : isPlaying ? 'Dừng phát' : (script ? 'Phát lại Podcast' : 'Tạo Podcast & Nghe')}
        </button>

        {isPlaying && (
          <div className="mt-4 flex gap-1 justify-center h-4 items-end overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <motion.div 
                key={i}
                animate={{ height: ["20%", "100%", "20%"] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
                className="w-1.5 bg-purple-500 rounded-t"
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
