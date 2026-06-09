import { useMemo, useState } from 'react';
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
import { DiagramRenderer } from './DiagramRenderer';

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

const CONTEXTUAL_PROMPTS = {
  objectives: [
    'Viết lại mục tiêu theo Bloom, có đủ kiến thức, năng lực và phẩm chất.',
    'Bổ sung động từ đo lường được cho mục tiêu bài học.',
    'Tách mục tiêu thành 3 mức: nhận biết, thông hiểu, vận dụng.',
  ],
  activities: [
    'Bổ sung hoạt động nhóm 10 phút có sản phẩm học tập rõ ràng.',
    'Thêm câu hỏi gợi mở và dự kiến phản hồi của học sinh.',
    'Phân hoá hoạt động cho học sinh yếu, trung bình và khá giỏi.',
  ],
  assessment: [
    'Bổ sung câu hỏi đánh giá cuối giờ theo 4 mức độ nhận thức.',
    'Thêm rubric/tiêu chí đánh giá ngắn gọn cho nhiệm vụ học tập.',
    'Tạo phiếu exit ticket 3 câu để kiểm tra nhanh sau bài học.',
  ],
  general: [
    'Chuẩn hoá văn phong sư phạm, rõ ý và dễ triển khai trên lớp.',
    'Rút gọn phần đang chọn nhưng giữ đủ ý chính.',
    'Bổ sung ví dụ gần gũi với học sinh Việt Nam.',
  ],
};

const detectLessonSection = (content: string, cursorPosition?: number) => {
  const beforeCursor = content.slice(0, cursorPosition ?? content.length);
  const headings = Array.from(beforeCursor.matchAll(/^#{1,4}\s+(.+)$/gm));
  const heading = headings.at(-1)?.[1]?.trim() || 'Toàn bộ giáo án';
  const normalized = heading.toLowerCase();
  const key = normalized.includes('mục tiêu')
    ? 'objectives'
    : normalized.includes('hoạt động') || normalized.includes('tiến trình')
      ? 'activities'
      : normalized.includes('đánh giá') || normalized.includes('kiểm tra')
        ? 'assessment'
        : 'general';
  return { heading, key } as const;
};

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
  const [editorContext, setEditorContext] = useState({ section: 'Toàn bộ giáo án', selectedText: '', key: 'general' as keyof typeof CONTEXTUAL_PROMPTS });

  const contextualPrompts = useMemo(() => CONTEXTUAL_PROMPTS[editorContext.key], [editorContext.key]);

  const updateEditorContext = () => {
    const textarea = document.querySelector<HTMLTextAreaElement>('.w-md-editor-text-input');
    const content = currentPlan.content || '';
    const cursorPosition = textarea?.selectionStart ?? content.length;
    const selectedText = textarea && textarea.selectionEnd > textarea.selectionStart
      ? content.slice(textarea.selectionStart, textarea.selectionEnd).trim()
      : '';
    const section = detectLessonSection(content, cursorPosition);
    setEditorContext({ section: section.heading, selectedText, key: section.key });
  };

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
      <div className="flex-1 overflow-y-auto bg-blue-50/30 p-4 sm:p-8 custom-scrollbar scroll-smooth">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-[var(--color-primary)]">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-slate-800">Kết quả soạn hàng loạt</h3>
                <p className="text-sm text-slate-600">Xem nhanh từng giáo án trước khi lưu tất cả vào thư viện.</p>
              </div>
            </div>
          </div>

          {bulkResults.map((result, idx) => (
            <article key={result.id} className="overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-sm">
              <div className="flex items-center gap-4 border-b border-blue-100 bg-slate-50 px-6 py-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-black text-white">{idx + 1}</span>
                <div className="min-w-0">
                  <h4 className="truncate text-lg font-bold text-slate-800">{result.title}</h4>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bản xem trước Markdown</p>
                </div>
              </div>
              <div className="prose prose-slate markdown-body max-w-none p-6 sm:p-10">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeRaw, rehypeKatex]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const lang = match ? match[1] : '';
                      const codeString = String(children).replace(/\n$/, '');

                      const isSvg = codeString.trim().startsWith('<svg') || codeString.trim().startsWith('xml <svg') || codeString.trim().startsWith('html <svg');
                      if (isSvg) {
                         const cleanSvg = codeString.replace(/^(xml|html)\s*/i, '').trim();
                         return <DiagramRenderer code={cleanSvg} type="svg" />;
                      }

                      const isTikz = codeString.includes('\\begin{tikzpicture}') || codeString.trim().startsWith('latex \\begin') || codeString.trim().startsWith('tikz \\begin');
                      if (isTikz) {
                         const cleanTikz = codeString.replace(/^(latex|tikz|tex)\s*/i, '').trim();
                         return <DiagramRenderer code={cleanTikz} type="tikz" />;
                      }
                      
                      const isPrompt = codeString.trim().toLowerCase().startsWith('prompt ');
                      if (isPrompt) {
                         return (
                           <div className="my-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3">
                             <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl shrink-0">
                               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                             </div>
                             <div>
                               <p className="text-sm font-bold text-indigo-900 mb-1">Gợi ý tạo ảnh minh họa (Image Prompt)</p>
                               <p className="text-xs text-indigo-700 leading-relaxed italic">{codeString.replace(/^prompt\s*/i, '')}</p>
                             </div>
                           </div>
                         );
                      }

                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >{result.content}</ReactMarkdown>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-blue-50/30 lg:flex-row">
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-[900px] flex-wrap items-center gap-2 text-sm text-slate-600">
            <div className="flex items-center gap-2 rounded-full bg-blue-50/30 px-3 py-2 font-semibold">
              <BookOpen className="h-4 w-4 text-[var(--color-primary)]" />
              <span className="truncate">{currentPlan.title || 'Giáo án đang soạn'}</span>
            </div>
            <div className="hidden h-5 w-px bg-[#c0c7d3] sm:block" />
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 font-medium ring-1 ring-[#d4e4fc]">
              <Target className="h-4 w-4 text-[#385d8e]" />
              <span>Lớp {currentPlan.grade || '--'} · Tuần {currentPlan.week || '--'}</span>
            </div>
            {isUploadingImage && (
              <div className="ml-auto flex items-center gap-2 rounded-full bg-blue-100 px-3 py-2 text-xs font-bold text-[var(--color-primary)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải ảnh
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar scroll-smooth sm:p-8">
          <div className="mx-auto max-w-[900px]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <PenTool className="h-4 w-4 text-[var(--color-primary)]" />
                A4 Markdown Editor
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <ImagePlus className="h-4 w-4" /> Dán/kéo ảnh trực tiếp vào vùng soạn
              </div>
            </div>

            <div id="lesson-content" className="relative" data-color-mode="light" onPaste={handlePaste} onDrop={handleDrop}>
              <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(0,94,161,0.12)] sm:p-5">
                <MDEditor
                  value={currentPlan.content || ''}
                  onChange={val => setCurrentPlan(prev => ({ ...prev, content: val || '' }))}
                  preview="edit"
                  previewOptions={{
                    remarkPlugins: [remarkGfm, remarkMath],
                    rehypePlugins: [rehypeRaw, rehypeKatex],
                    components: {
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const lang = match ? match[1] : '';
                        const codeString = String(children).replace(/\n$/, '');

                        const isSvg = codeString.trim().startsWith('<svg') || codeString.trim().startsWith('xml <svg') || codeString.trim().startsWith('html <svg');
                        if (isSvg) {
                           const cleanSvg = codeString.replace(/^(xml|html)\s*/i, '').trim();
                           return <DiagramRenderer code={cleanSvg} type="svg" />;
                        }

                        const isTikz = codeString.includes('\\begin{tikzpicture}') || codeString.trim().startsWith('latex \\begin') || codeString.trim().startsWith('tikz \\begin');
                        if (isTikz) {
                           const cleanTikz = codeString.replace(/^(latex|tikz|tex)\s*/i, '').trim();
                           return <DiagramRenderer code={cleanTikz} type="tikz" />;
                        }
                        
                        const isPrompt = lang === 'prompt' || /^prompt(?:\s|<br\s*\/?>)/i.test(codeString.trim());
                        if (isPrompt) {
                           return (
                             <div className="my-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3">
                               <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl shrink-0">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                               </div>
                               <div>
                                 <p className="text-sm font-bold text-indigo-900 mb-1">Gợi ý tạo ảnh minh họa (Image Prompt)</p>
                                 <p className="text-xs text-indigo-700 leading-relaxed italic">{codeString.replace(/^prompt(?:\s|<br\s*\/?>)*/i, '')}</p>
                               </div>
                             </div>
                           );
                        }

                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }
                    }
                  }}
                  height={760}
                  className="dewey-md-editor w-full overflow-hidden rounded-2xl border border-blue-100 shadow-none"
                  textareaProps={{
                    placeholder: 'Bắt đầu soạn thảo giáo án bằng Markdown...',
                    onClick: updateEditorContext,
                    onKeyUp: updateEditorContext,
                    onSelect: updateEditorContext,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="flex w-full shrink-0 flex-col border-t border-slate-200 bg-white lg:w-[340px] lg:border-l lg:border-t-0">
        <div className="border-b border-blue-100 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-primary text-white shadow-lg shadow-blue-200">
              <Sparkles className="relative z-10 h-5 w-5" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-slate-800">AI Co-pilot</h3>
              <p className="text-xs font-medium text-slate-500">Tinh chỉnh giáo án theo ngữ cảnh</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 custom-scrollbar">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Eye className="h-4 w-4" /> Đang phân tích
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              AI đang ưu tiên ngữ cảnh: <strong>{editorContext.section}</strong>{editorContext.selectedText ? ' · đang xử lý đoạn đã chọn' : ''}. Gợi ý bên dưới sẽ đổi theo vị trí con trỏ trong giáo án.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Wand2 className="h-4 w-4 text-[var(--color-primary)]" /> Gợi ý nhanh
            </h4>
            <div className="flex flex-wrap gap-2">
              {contextualPrompts.map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setRevisionPrompt(`${editorContext.selectedText ? `Với đoạn đang chọn: "${editorContext.selectedText.slice(0, 300)}". ` : ''}${prompt}`)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  {prompt}
                </button>
              ))}
              {editorContext.key === 'objectives' && bloomVerbs.map(verb => (
                <button
                  key={verb}
                  type="button"
                  onClick={() => setRevisionPrompt(`Hãy bổ sung mục tiêu bài học sử dụng động từ Bloom: ${verb}.`)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  {verb}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
              <ClipboardCheck className="h-4 w-4 text-[#385d8e]" /> Đánh giá chất lượng
            </h4>
            <ul className="space-y-2">
              {qualityChecks.map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-slate-50 p-4">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
              <MessageSquare className="h-4 w-4 text-[var(--color-primary)]" /> Ví dụ lệnh tốt
            </h4>
            <p className="text-sm leading-relaxed text-slate-500">
              “Hãy thêm hoạt động nhóm 10 phút, phân hoá cho 3 mức năng lực và bổ sung câu hỏi đánh giá cuối giờ.”
            </p>
          </div>
        </div>

        <div className="border-t border-blue-100 bg-slate-50 p-4">
          <div className="space-y-3">
            <textarea
              value={revisionPrompt}
              onChange={(e) => setRevisionPrompt(e.target.value)}
              placeholder="Thưa trợ lý, hãy sửa bài này theo yêu cầu này..."
              className="min-h-[92px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[#9fcaff]"
            />
            <button
              onClick={handleReviseLesson}
              disabled={isLoading || !revisionPrompt.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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

