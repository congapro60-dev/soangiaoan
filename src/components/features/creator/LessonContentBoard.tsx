import { useState } from 'react';
import { Sparkles, Pencil, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { LessonPlan } from '../../../types';

interface LessonContentBoardProps {
  generationMode: 'single' | 'bulk';
  currentPlan: Partial<LessonPlan>;
  setCurrentPlan: React.Dispatch<React.SetStateAction<Partial<LessonPlan>>>;
  bulkResults: LessonPlan[];
  revisionPrompt: string;
  setRevisionPrompt: (val: string) => void;
  handleReviseLesson: () => void;
  isLoading: boolean;
}

export const LessonContentBoard = ({
  generationMode,
  currentPlan,
  setCurrentPlan,
  bulkResults,
  revisionPrompt,
  setRevisionPrompt,
  handleReviseLesson,
  isLoading
}: LessonContentBoardProps) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar scroll-smooth">
        {generationMode === 'single' ? (
          <div id="lesson-content" className="relative">
            {/* Edit / Preview toggle */}
            <button
              onClick={() => setIsEditing(v => !v)}
              className="absolute top-0 right-0 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm"
            >
              {isEditing ? <><Eye className="w-3.5 h-3.5" /> Xem trước</> : <><Pencil className="w-3.5 h-3.5" /> Chỉnh sửa</>}
            </button>

            {isEditing ? (
              <textarea
                value={currentPlan.content || ''}
                onChange={e => setCurrentPlan(prev => ({ ...prev, content: e.target.value }))}
                className="w-full min-h-[70vh] px-6 py-8 rounded-[24px] border border-blue-200 bg-slate-50 text-sm font-mono leading-relaxed focus:ring-2 focus:ring-blue-400 outline-none resize-none"
                spellCheck={false}
              />
            ) : (
              <div className="prose prose-slate max-w-none markdown-body">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeRaw, rehypeKatex]}
                >{currentPlan.content || ''}</ReactMarkdown>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-12">
              {bulkResults.map((result, idx) => (
              <div key={result.id} className="space-y-6">
                  <div className="flex items-center gap-4 py-4 border-b border-slate-50">
                    <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">{idx + 1}</span>
                    <h4 className="text-xl font-bold text-slate-900">{result.title}</h4>
                  </div>
                  <div className="prose prose-slate max-w-none markdown-body">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeRaw, rehypeKatex]}
                    >{result.content}</ReactMarkdown>
                  </div>
              </div>
              ))}
          </div>
        )}
      </div>

      {/* Revision Prompt Area */}
      {generationMode === 'single' && (
        <div className="p-6 bg-slate-50 border-t border-slate-100 mt-auto">
            <div className="flex gap-3">
              <textarea
                value={revisionPrompt}
                onChange={(e) => setRevisionPrompt(e.target.value)}
                placeholder="Thưa trợ lý, hãy sửa bài này theo yêu cầu này..."
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-100 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 min-h-[50px] max-h-[150px] transition-all"
              />
              <button
                onClick={handleReviseLesson}
                disabled={isLoading || !revisionPrompt.trim()}
                className="self-end px-5 py-3 gradient-bg text-white rounded-xl font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-blue-100"
              >
              <Sparkles className="w-4 h-4" /> Gửi
              </button>
            </div>
        </div>
      )}
    </>
  );
};
