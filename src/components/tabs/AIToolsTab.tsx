import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowUpRight,
  Check,
  Clipboard,
  Copy,
  ExternalLink,
  Loader2,
  Search,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AI_TOOL_CATEGORY_LABELS, AI_TOOL_LINKS, AIToolCategory } from '../../data/aiTools';
import { callAI } from '../../lib/aiProviders';
import type { AppData } from '../../types';
import {
  buildPromptWriterPrompt,
  PROMPT_DETAIL_LEVELS,
  PROMPT_PURPOSES,
  PROMPT_TARGET_TOOLS,
  type PromptDetailLevel,
  type PromptPurpose,
  type PromptTargetTool,
} from '../../utils/promptBuilder';
import { cn } from '../../lib/utils';

interface AIToolsTabProps {
  data: AppData;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  showToast: (msg: string, icon?: any) => void;
}

const categoryFilters: Array<'all' | AIToolCategory> = ['all', 'prompt', 'education', 'design', 'coding', 'research', 'utility'];

const examples = [
  'Tôi đang dùng Google Gemini, tôi muốn tạo bài kiểm tra 15 phút về logarit lớp 12 có đáp án.',
  'Tôi muốn viết prompt tạo slide bài đạo hàm cho học sinh yếu, nhiều ví dụ trực quan.',
  'Tôi muốn prompt cho Canva để tạo poster lớp học về quy tắc ứng xử khi làm việc nhóm.',
  'Tôi muốn prompt cho Cursor sửa giao diện React nhưng không làm hỏng logic hiện có.',
];

export const AIToolsTab = ({ data, isLoading, setIsLoading, showToast }: AIToolsTabProps) => {
  const [activeCategory, setActiveCategory] = useState<'all' | AIToolCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rawRequest, setRawRequest] = useState('');
  const [targetTool, setTargetTool] = useState<PromptTargetTool>('Google Gemini');
  const [purpose, setPurpose] = useState<PromptPurpose>('Giáo án / bài giảng');
  const [detailLevel, setDetailLevel] = useState<PromptDetailLevel>('Vừa đủ');
  const [outputLanguage, setOutputLanguage] = useState<'Tiếng Việt' | 'English'>('Tiếng Việt');
  const [outputFormat, setOutputFormat] = useState<'Markdown' | 'Bảng' | 'JSON' | 'Checklist' | 'Code' | 'Tự chọn'>('Markdown');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return AI_TOOL_LINKS.filter(tool => {
      const matchCategory = activeCategory === 'all' || tool.category === activeCategory;
      const matchSearch = !q || `${tool.name} ${tool.description} ${tool.badge || ''}`.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  const handleGeneratePrompt = async () => {
    if (!rawRequest.trim()) {
      showToast('Nhập một ý tưởng hoặc yêu cầu mơ hồ trước khi tạo prompt.', 'error');
      return;
    }

    setIsLoading(true);
    setGeneratedPrompt('');
    try {
      const metaPrompt = buildPromptWriterPrompt({
        rawRequest,
        targetTool,
        purpose,
        detailLevel,
        outputLanguage,
        outputFormat,
      });
      const result = await callAI(metaPrompt, data.settings);
      setGeneratedPrompt(result.trim());
      showToast('Đã tạo prompt hoàn chỉnh.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Không tạo được prompt. Vui lòng thử lại.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedPrompt.trim()) return;
    await navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    showToast('Đã sao chép prompt.', 'success');
    window.setTimeout(() => setCopied(false), 1800);
  };

  const openTool = (url?: string) => {
    if (!url) {
      showToast('Công cụ này đang được chuẩn bị để mở rộng sau.', 'info');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      key="ai-tools"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <section className="relative overflow-hidden rounded-[32px] border border-blue-100 bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 p-6 text-white shadow-xl shadow-blue-100">
        <div className="absolute right-[-80px] top-[-80px] h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-50">
              <Sparkles className="h-3.5 w-3.5" /> Công cụ AI
            </div>
            <h2 className="text-3xl font-black tracking-tight">Trung tâm công cụ AI cho giáo viên</h2>
            <p className="mt-2 text-sm font-medium text-blue-50/90">
              Gom các công cụ hay vào một nơi: viết prompt, mở nhanh web AI bên ngoài, và sau này có thể bổ sung thêm các link thầy/cô gửi.
            </p>
          </div>
          <button
            onClick={() => document.getElementById('prompt-writer-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            <WandSparkles className="h-4 w-4" /> Viết prompt ngay
          </button>
        </div>
      </section>

      <section id="prompt-writer-panel" className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <WandSparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Viết Prompt AI</h3>
              <p className="text-xs font-semibold text-slate-400">Nhập một dòng mơ hồ, hệ thống sẽ viết lại thành prompt hoàn chỉnh.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Công cụ AI</span>
                <select value={targetTool} onChange={(e) => setTargetTool(e.target.value as PromptTargetTool)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:ring-2 focus:ring-blue-500">
                  {PROMPT_TARGET_TOOLS.map(tool => <option key={tool} value={tool}>{tool}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Mục đích</span>
                <select value={purpose} onChange={(e) => setPurpose(e.target.value as PromptPurpose)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:ring-2 focus:ring-blue-500">
                  {PROMPT_PURPOSES.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Độ chi tiết</span>
                <select value={detailLevel} onChange={(e) => setDetailLevel(e.target.value as PromptDetailLevel)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:ring-2 focus:ring-blue-500">
                  {PROMPT_DETAIL_LEVELS.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Ngôn ngữ</span>
                <select value={outputLanguage} onChange={(e) => setOutputLanguage(e.target.value as 'Tiếng Việt' | 'English')} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:ring-2 focus:ring-blue-500">
                  <option>Tiếng Việt</option>
                  <option>English</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Format</span>
                <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as any)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:ring-2 focus:ring-blue-500">
                  {['Markdown', 'Bảng', 'JSON', 'Checklist', 'Code', 'Tự chọn'].map(item => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>

            <label className="space-y-1.5 block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">Ý tưởng mơ hồ</span>
              <textarea
                value={rawRequest}
                onChange={(e) => setRawRequest(e.target.value)}
                placeholder="VD: Tôi đang dùng Google Gemini, tôi muốn tạo bài giảng về đạo hàm cho học sinh yếu..."
                className="min-h-[150px] w-full resize-y rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {examples.map(example => (
                <button key={example} onClick={() => setRawRequest(example)} className="rounded-full border border-slate-200 px-3 py-1.5 text-left text-[11px] font-bold text-slate-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                  {example}
                </button>
              ))}
            </div>

            <button
              onClick={handleGeneratePrompt}
              disabled={isLoading || !rawRequest.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Tạo prompt hoàn chỉnh
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-800">Kết quả</h3>
              <p className="text-xs font-semibold text-slate-400">Copy prompt này sang công cụ AI bạn muốn dùng.</p>
            </div>
            <button
              onClick={handleCopy}
              disabled={!generatedPrompt.trim()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-40"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Đã copy' : 'Sao chép'}
            </button>
          </div>

          <div className="min-h-[420px] rounded-3xl border border-slate-100 bg-slate-50 p-5">
            {!generatedPrompt ? (
              <div className="flex h-[360px] flex-col items-center justify-center text-center text-slate-400">
                <Clipboard className="mb-4 h-14 w-14 opacity-20" />
                <p className="max-w-sm text-sm font-semibold">Prompt hoàn chỉnh sẽ xuất hiện ở đây. Chức năng này độc lập, không ảnh hưởng soạn giáo án, Word/PDF hoặc bot.</p>
              </div>
            ) : (
              <div className="markdown-body max-w-none text-sm text-slate-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedPrompt}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-800">Kho công cụ AI</h3>
            <p className="text-xs font-semibold text-slate-400">Sau này chỉ cần bổ sung link vào danh sách là web có thêm nút mở công cụ mới.</p>
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm công cụ..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {categoryFilters.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-black transition-all',
                activeCategory === category ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              )}
            >
              {category === 'all' ? 'Tất cả' : AI_TOOL_CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTools.map(tool => {
            const Icon = tool.icon;
            return (
              <article key={tool.id} className={cn('group rounded-3xl border p-5 transition-all hover:-translate-y-1 hover:shadow-lg', tool.featured ? 'border-blue-200 bg-blue-50/60' : 'border-slate-100 bg-white')}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', tool.featured ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600')}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {tool.badge && <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 shadow-sm">{tool.badge}</span>}
                </div>
                <h4 className="font-black text-slate-800">{tool.name}</h4>
                <p className="mt-2 min-h-[54px] text-sm font-medium leading-relaxed text-slate-500">{tool.description}</p>
                <button
                  onClick={() => tool.internalAction === 'prompt-writer' ? document.getElementById('prompt-writer-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) : openTool(tool.url)}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black text-white transition-all group-hover:bg-blue-600"
                >
                  {tool.internalAction ? 'Mở công cụ' : tool.url ? 'Mở website' : 'Đang chuẩn bị'}
                  {tool.url ? <ExternalLink className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
};
