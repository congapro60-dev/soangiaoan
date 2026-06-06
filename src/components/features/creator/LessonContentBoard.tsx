import { useState } from 'react';
import { BookOpen, CheckCircle2, ClipboardCheck, Eye, ImagePlus, Layers, Loader2, MessageSquare, PenTool, Sparkles, Target, Wand2 } from 'lucide-react';
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

const qualityChecks = [
  'Đã có cấu trúc mục tiêu · thiết bị · tiến trình',
  'Nội dung có thể xuất Word/PDF theo chuẩn A4',
  'Có thể yêu cầu AI tinh chỉnh theo từng phần',
];

const bloomVerbs = ['Trình bày', 'Giải thích', 'Phân tích', 'Vận dụng', 'Thiết kế'];

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
      console.error('Lỗi khi tải ảnh:', error);
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

  if (generationMode === 'bulk') {
    return (
      <div className="flex-1 overflow-y-auto bg-[#eff4ff] p-4 sm:p-8 custom-scrollbar scroll-smooth">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-[28px] border border-[#c0c7d3] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d2e4ff] text-[#005ea1]">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-[#0d1c2e]">Kết quả soạn hàng loạt</h3>
                <p className="text-sm text-[#414751]">Xem nhanh từng giáo án trước khi lưu tất cả vào thư viện.</p>
              </div>
            </div>
          </div>

          {bulkResults.map((result, idx) => (
            <article key={result.id} className="overflow-hidden rounded-[28px] border border-[#d4e4fc] bg-white shadow-sm">
              <div className="flex items-center gap-4 border-b border-[#d4e4fc] bg-[#f8f9ff] px-6 py-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2178c3] text-sm font-black text-white">{idx + 1}</span>
                <div className="min-w-0">
                  <h4 className="truncate text-lg font-bold text-[#0d1c2e]">{result.title}</h4>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#717782]">Bản xem trước Markdown</p>
                </div>
              </div>
              <div className="prose prose-slate markdown-body max-w-none p-6 sm:p-10">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeRaw, rehypeKatex]}
                >{result.content}</ReactMarkdown>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#eff4ff] lg:flex-row">
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-[#c0c7d3] bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-[900px] flex-wrap items-center gap-2 text-sm text-[#414751]">
            <div className="flex items-center gap-2 rounded-full bg-[#eff4ff] px-3 py-2 font-semibold">
              <BookOpen className="h-4 w-4 text-[#005ea1]" />
              <span className="truncate">{currentPlan.title || 'Giáo án đang soạn'}</span>
            </div>
            <div className="hidden h-5 w-px bg-[#c0c7d3] sm:block" />
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 font-medium ring-1 ring-[#d4e4fc]">
              <Target className="h-4 w-4 text-[#385d8e]" />
              <span>Lớp {currentPlan.grade || '--'} · Tuần {currentPlan.week || '--'}</span>
            </div>
            {isUploadingImage && (
              <div className="ml-auto flex items-center gap-2 rounded-full bg-[#d2e4ff] px-3 py-2 text-xs font-bold text-[#005ea1]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải ảnh
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar scroll-smooth sm:p-8">
          <div className="mx-auto max-w-[900px]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#c0c7d3] bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0d1c2e]">
                <PenTool className="h-4 w-4 text-[#005ea1]" />
                A4 Markdown Editor
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#717782]">
                <ImagePlus className="h-4 w-4" /> Dán/kéo ảnh trực tiếp vào vùng soạn
              </div>
            </div>

            <div id="lesson-content" className="relative" data-color-mode="light" onPaste={handlePaste} onDrop={handleDrop}>
              <div className="rounded-[28px] border border-[#c0c7d3] bg-white p-3 shadow-[0_18px_50px_rgba(0,94,161,0.12)] sm:p-5">
                <MDEditor
                  value={currentPlan.content || ''}
                  onChange={val => setCurrentPlan(prev => ({ ...prev, content: val || '' }))}
                  preview="edit"
                  previewOptions={{
                    remarkPlugins: [remarkGfm, remarkMath],
                    rehypePlugins: [rehypeRaw, rehypeKatex]
                  }}
                  height={760}
                  className="dewey-md-editor w-full overflow-hidden rounded-2xl border border-[#d4e4fc] shadow-none"
                  textareaProps={{
                    placeholder: 'Bắt đầu soạn thảo giáo án bằng Markdown...'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="flex w-full shrink-0 flex-col border-t border-[#c0c7d3] bg-white lg:w-[340px] lg:border-l lg:border-t-0">
        <div className="border-b border-[#d4e4fc] bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[#2178c3] text-white shadow-lg shadow-blue-200">
              <Sparkles className="relative z-10 h-5 w-5" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-[#0d1c2e]">AI Co-pilot</h3>
              <p className="text-xs font-medium text-[#58646a]">Tinh chỉnh giáo án theo ngữ cảnh</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 custom-scrollbar">
          <div className="rounded-2xl border border-[#d4e4fc] bg-[#eff4ff] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#00497e]">
              <Eye className="h-4 w-4" /> Đang phân tích
            </div>
            <p className="text-sm leading-relaxed text-[#414751]">
              AI sẽ dùng toàn bộ giáo án hiện tại làm ngữ cảnh để viết lại, bổ sung hoạt động, phân hoá học sinh hoặc chuẩn hoá văn phong.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-bold text-[#0d1c2e]">
              <Wand2 className="h-4 w-4 text-[#005ea1]" /> Gợi ý nhanh
            </h4>
            <div className="flex flex-wrap gap-2">
              {bloomVerbs.map(verb => (
                <button
                  key={verb}
                  type="button"
                  onClick={() => setRevisionPrompt(`Hãy bổ sung mục tiêu bài học sử dụng động từ Bloom: ${verb}.`)}
                  className="rounded-full border border-[#c0c7d3] bg-white px-3 py-1.5 text-xs font-bold text-[#414751] transition hover:border-[#005ea1] hover:text-[#005ea1]"
                >
                  {verb}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#c0c7d3] bg-white p-4 shadow-sm">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#0d1c2e]">
              <ClipboardCheck className="h-4 w-4 text-[#385d8e]" /> Đánh giá chất lượng
            </h4>
            <ul className="space-y-2">
              {qualityChecks.map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#414751]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2178c3]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#d4e4fc] bg-[#f8f9ff] p-4">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#0d1c2e]">
              <MessageSquare className="h-4 w-4 text-[#005ea1]" /> Ví dụ lệnh tốt
            </h4>
            <p className="text-sm leading-relaxed text-[#58646a]">
              “Hãy thêm hoạt động nhóm 10 phút, phân hoá cho 3 mức năng lực và bổ sung câu hỏi đánh giá cuối giờ.”
            </p>
          </div>
        </div>

        <div className="border-t border-[#d4e4fc] bg-[#f8f9ff] p-4">
          <div className="space-y-3">
            <textarea
              value={revisionPrompt}
              onChange={(e) => setRevisionPrompt(e.target.value)}
              placeholder="Thưa trợ lý, hãy sửa bài này theo yêu cầu này..."
              className="min-h-[92px] w-full resize-none rounded-2xl border border-[#c0c7d3] bg-white px-4 py-3 text-sm text-[#0d1c2e] outline-none transition-all placeholder:text-[#717782] focus:border-[#005ea1] focus:ring-2 focus:ring-[#9fcaff]"
            />
            <button
              onClick={handleReviseLesson}
              disabled={isLoading || !revisionPrompt.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#005ea1] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-[#00497e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Gửi yêu cầu cho AI
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
