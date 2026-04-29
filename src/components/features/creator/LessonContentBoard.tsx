import { useState } from 'react';
import { Sparkles, Pencil, Eye, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import MDEditor from '@uiw/react-md-editor';
import { LessonPlan } from '../../../types';
import { auth, storage } from '../../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageUpload = async (file: File, e: React.SyntheticEvent) => {
    e.preventDefault();
    if (isUploadingImage) return;

    try {
      setIsUploadingImage(true);
      const user = auth.currentUser;
      const folder = currentPlan.id ?? `temp_${user?.uid || 'anonymous'}`;
      const timestamp = Date.now();
      const filename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, `lesson_images/${folder}/${filename}`);
      
      const textarea = document.querySelector<HTMLTextAreaElement>('.w-md-editor-text-input');
      const pos = textarea?.selectionStart ?? (currentPlan.content || '').length;
      const uploadingText = `\n![Đang tải ảnh lên...](${filename})\n`;
      const currentContent = currentPlan.content || '';
      setCurrentPlan(prev => ({ 
        ...prev, 
        content: currentContent.slice(0, pos) + uploadingText + currentContent.slice(pos) 
      }));

      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      setCurrentPlan(prev => {
        const text = prev.content || '';
        return {
          ...prev,
          content: text.replace(uploadingText, `\n![${file.name}](${url})\n`)
        };
      });
    } catch (error) {
      console.error("Lỗi khi tải ảnh:", error);
      const uploadingText = `\n![Đang tải ảnh lên...](${file.name.replace(/[^a-zA-Z0-9.]/g, '_')})\n`;
      setCurrentPlan(prev => ({
        ...prev,
        content: (prev.content || '').replace(uploadingText, '\n*(Lỗi: Không thể tải ảnh)*\n')
      }));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleImageUpload(file, e);
          break;
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    const items = e.dataTransfer?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleImageUpload(file, e);
          break;
        }
      }
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar scroll-smooth">
        {generationMode === 'single' ? (
          <div id="lesson-content" className="relative" data-color-mode="light" onPaste={handlePaste} onDrop={handleDrop}>
            <MDEditor
              value={currentPlan.content || ''}
              onChange={val => setCurrentPlan(prev => ({ ...prev, content: val || '' }))}
              previewOptions={{
                remarkPlugins: [remarkGfm, remarkMath],
                rehypePlugins: [rehypeRaw, rehypeKatex]
              }}
              height={700}
              className="w-full border-blue-200 shadow-sm"
              textareaProps={{
                placeholder: 'Bắt đầu soạn thảo giáo án bằng Markdown...'
              }}
            />
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
