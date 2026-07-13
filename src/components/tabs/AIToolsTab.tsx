import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
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
import { PromptBuilderModal } from '../features/prompt-builder/PromptBuilderModal';

interface AIToolsTabProps {
  data: AppData;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  showToast: (msg: string, icon?: any) => void;
  setActiveTab?: (tab: any) => void;
}

const categoryFilters: Array<'all' | AIToolCategory> = ['all', 'prompt', 'education', 'design', 'coding', 'research', 'utility'];

const examples = [
  'Tôi đang dùng Google Gemini, tôi muốn tạo bài kiểm tra 15 phút về logarit lớp 12 có đáp án.',
  'Tôi muốn viết prompt tạo slide bài đạo hàm cho học sinh yếu, nhiều ví dụ trực quan.',
  'Tôi muốn prompt cho Canva để tạo poster lớp học về quy tắc ứng xử khi làm việc nhóm.',
  'Tôi muốn prompt cho Cursor sửa giao diện React nhưng không làm hỏng logic hiện có.',
];

const outputFormatHelp: Record<string, string> = {
  'Tự chọn': 'Khuyên dùng cho người mới: hệ thống tự chọn dạng trình bày phù hợp nhất.',
  Markdown: 'Dạng văn bản có tiêu đề, gạch đầu dòng, in đậm — dễ đọc và dễ copy sang AI khác.',
  Bảng: 'Dùng khi muốn AI trả kết quả theo cột/hàng, ví dụ kế hoạch bài dạy hoặc ma trận đề.',
  JSON: 'Dành cho người kỹ thuật hoặc cần dữ liệu có cấu trúc để đưa vào hệ thống khác.',
  Checklist: 'Dùng khi muốn AI trả về danh sách việc cần làm, tiêu chí kiểm tra hoặc quy trình từng bước.',
  Code: 'Chỉ chọn khi muốn AI trả về mã lập trình như HTML, JavaScript, Python hoặc CSS.',
};

const outputFormatOptions = [
  { value: 'Tự chọn', label: 'Tự chọn (khuyên dùng)' },
  { value: 'Markdown', label: 'Văn bản dễ đọc' },
  { value: 'Bảng', label: 'Bảng' },
  { value: 'Checklist', label: 'Checklist' },
  { value: 'Code', label: 'Code' },
  { value: 'JSON', label: 'JSON (kỹ thuật)' },
] as const;

export const AIToolsTab = ({ data, isLoading, setIsLoading, showToast, setActiveTab }: AIToolsTabProps) => {
  const [activeCategory, setActiveCategory] = useState<'all' | AIToolCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rawRequest, setRawRequest] = useState('');
  const [targetTool, setTargetTool] = useState<PromptTargetTool>('Google Gemini');
  const [purpose, setPurpose] = useState<PromptPurpose>('Giáo án / bài giảng');
  const [detailLevel, setDetailLevel] = useState<PromptDetailLevel>('Vừa đủ');
  const [outputLanguage, setOutputLanguage] = useState<'Tiếng Việt' | 'English'>('Tiếng Việt');
  const [outputFormat, setOutputFormat] = useState<'Markdown' | 'Bảng' | 'JSON' | 'Checklist' | 'Code' | 'Tự chọn'>('Tự chọn');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPromptBuilder, setShowPromptBuilder] = useState(false);
  const missingApiKey = !data.settings.geminiApiKey && !data.settings.claudeApiKey && !data.settings.openaiApiKey && !data.settings.grokApiKey && !data.settings.deepseekApiKey;

  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return AI_TOOL_LINKS.filter(tool => {
      const matchCategory = activeCategory === 'all' || tool.category === activeCategory;
      const searchableText = [
        tool.name,
        tool.description,
        tool.useFor,
        tool.badge,
        tool.note,
        tool.sourceLabel,
        tool.accountInfo,
        ...(tool.quickLinks || []).flatMap(link => [link.label, link.url]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchSearch = !q || searchableText.includes(q);
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
      if (!result || !result.trim()) {
        throw new Error('AI không trả về nội dung. Vui lòng thử lại.');
      }
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
      className="space-y-6 bg-[#f9f9ff]"
    >
      {missingApiKey && (
        <section className="flex flex-col gap-3 rounded-xl border border-[#c0c7d3] bg-[#d9e3f9] p-4 text-[#121c2c] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#3b6090]" />
            <p className="text-sm leading-6 text-[#121c2c]">
              Bạn chưa nhập API Key — AI sẽ dùng key dự phòng (có thể chậm). Vui lòng thêm key của bạn để có trải nghiệm tốt nhất.
            </p>
          </div>
          <button
            type="button"
            onClick={() => showToast('Mở Hồ sơ và cài đặt để thêm API Key.', 'info')}
            className="rounded-lg bg-[#3b6090] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#204877]"
          >
            Cài đặt
          </button>
        </section>
      )}

      <section className="relative overflow-hidden rounded-xl border border-[#c0c7d3]/40 bg-gradient-to-r from-[#005ea1] to-[#2178c3] p-8 text-white shadow-sm md:p-12">
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-20 pointer-events-none">
          <div className="absolute right-[-60px] top-[-50px] h-64 w-64 rounded-full bg-white/25 blur-3xl" />
          <div className="absolute bottom-[-70px] right-20 h-48 w-48 rounded-full bg-[#9fcaff]/40 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-50 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" /> Công cụ AI
            </div>
            <h2 className="font-['Plus_Jakarta_Sans'] text-4xl font-bold tracking-[-0.02em] md:text-5xl">Trung tâm công cụ AI cho giáo&nbsp;viên</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/90 md:text-lg">
              Gom các công cụ hay vào một nơi: viết prompt, mở nhanh web AI bên ngoài, và sau này có thể bổ sung thêm các link thầy/cô gửi.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => document.getElementById('prompt-writer-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold uppercase tracking-wide text-[#005ea1] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(49,130,206,0.2)]"
            >
              <WandSparkles className="h-4 w-4" /> Viết prompt ngay
            </button>
            <button
              onClick={() => setShowPromptBuilder(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-5 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(147,51,234,0.4)] hover:bg-purple-700"
            >
              <Sparkles className="h-4 w-4" /> Kiến trúc sư Prompt (JSON)
            </button>
          </div>
        </div>
      </section>

      <section id="prompt-writer-panel" className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-[#c0c7d3] bg-white p-6 shadow-sm lg:col-span-7">
          <div className="mb-6 flex items-center gap-3 border-b border-[#c0c7d3]/50 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#d2e4ff] text-[#005ea1]">
              <WandSparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-['Plus_Jakarta_Sans'] text-xl font-semibold text-[#121c2c]">Viết Prompt AI</h3>
              <p className="text-sm text-[#414751]">Nhập một dòng mơ hồ, hệ thống sẽ viết lại thành prompt hoàn chỉnh.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.05em] text-[#414751]">Công cụ AI</span>
                <select value={targetTool} onChange={(e) => setTargetTool(e.target.value as PromptTargetTool)} className="w-full rounded-lg border border-[#c0c7d3] bg-[#f9f9ff] px-4 py-2.5 text-sm text-[#121c2c] outline-none transition-all focus:border-[#005ea1] focus:bg-white focus:ring-2 focus:ring-[#005ea1]/20">
                  {PROMPT_TARGET_TOOLS.map(tool => <option key={tool} value={tool}>{tool}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.05em] text-[#414751]">Mục đích</span>
                <select value={purpose} onChange={(e) => setPurpose(e.target.value as PromptPurpose)} className="w-full rounded-lg border border-[#c0c7d3] bg-[#f9f9ff] px-4 py-2.5 text-sm text-[#121c2c] outline-none transition-all focus:border-[#005ea1] focus:bg-white focus:ring-2 focus:ring-[#005ea1]/20">
                  {PROMPT_PURPOSES.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.05em] text-[#414751]">Độ chi tiết</span>
                <select value={detailLevel} onChange={(e) => setDetailLevel(e.target.value as PromptDetailLevel)} className="w-full rounded-lg border border-[#c0c7d3] bg-[#f9f9ff] px-4 py-2.5 text-sm text-[#121c2c] outline-none transition-all focus:border-[#005ea1] focus:bg-white focus:ring-2 focus:ring-[#005ea1]/20">
                  {PROMPT_DETAIL_LEVELS.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.05em] text-[#414751]">Ngôn ngữ</span>
                <select value={outputLanguage} onChange={(e) => setOutputLanguage(e.target.value as 'Tiếng Việt' | 'English')} className="w-full rounded-lg border border-[#c0c7d3] bg-[#f9f9ff] px-4 py-2.5 text-sm text-[#121c2c] outline-none transition-all focus:border-[#005ea1] focus:bg-white focus:ring-2 focus:ring-[#005ea1]/20">
                  <option>Tiếng Việt</option>
                  <option>English</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.05em] text-[#414751]">Dạng kết quả</span>
                <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as any)} className="w-full rounded-lg border border-[#c0c7d3] bg-[#f9f9ff] px-4 py-2.5 text-sm text-[#121c2c] outline-none transition-all focus:border-[#005ea1] focus:bg-white focus:ring-2 focus:ring-[#005ea1]/20">
                  {outputFormatOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <p className="text-[11px] leading-relaxed text-[#414751]">
                  {outputFormatHelp[outputFormat]}
                </p>
              </label>
            </div>

            <label className="space-y-1.5 block">
              <span className="text-xs font-bold uppercase tracking-[0.05em] text-[#414751]">Ý tưởng mơ hồ</span>
              <textarea
                value={rawRequest}
                onChange={(e) => setRawRequest(e.target.value)}
                placeholder="VD: Tôi đang dùng Google Gemini, tôi muốn tạo bài giảng về đạo hàm cho học sinh yếu..."
                className="min-h-[150px] w-full resize-y rounded-lg border border-[#c0c7d3] bg-[#f9f9ff] px-4 py-3 text-sm text-[#121c2c] outline-none transition-all focus:border-[#005ea1] focus:bg-white focus:ring-2 focus:ring-[#005ea1]/20"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {examples.map(example => (
                <button key={example} onClick={() => setRawRequest(example)} className="rounded-lg border border-[#c0c7d3] bg-white px-3 py-1.5 text-left text-[11px] font-semibold text-[#414751] transition-all hover:border-[#005ea1] hover:bg-[#f0f3ff] hover:text-[#005ea1]">
                  {example}
                </button>
              ))}
            </div>

            <button
              onClick={handleGeneratePrompt}
              disabled={isLoading || !rawRequest.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#005ea1] px-5 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition-all hover:bg-[#00497e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Tạo prompt hoàn chỉnh
            </button>
          </div>
        </div>

        <div className="flex h-full flex-col rounded-xl border border-[#c0c7d3] bg-white p-6 shadow-sm lg:col-span-5">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#c0c7d3]/50 pb-4">
            <div>
              <h3 className="font-['Plus_Jakarta_Sans'] text-xl font-semibold text-[#121c2c]">Kết quả</h3>
              <p className="text-sm text-[#414751]">Copy prompt này sang công cụ AI bạn muốn dùng.</p>
            </div>
            <button
              onClick={handleCopy}
              disabled={!generatedPrompt.trim()}
              className="inline-flex items-center gap-2 rounded-lg border border-[#c0c7d3] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#414751] transition-all hover:bg-[#f0f3ff] disabled:opacity-40"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Đã copy' : 'Sao chép'}
            </button>
          </div>

          <div className="min-h-[420px] flex-1 rounded-lg border border-dashed border-[#c0c7d3] bg-[#f9f9ff] p-5">
            {!generatedPrompt ? (
              <div className="flex h-[360px] flex-col items-center justify-center text-center text-[#414751]">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#dee8ff] text-[#414751]/60">
                  <Clipboard className="h-8 w-8" />
                </div>
                <p className="max-w-sm text-base leading-6">Prompt hoàn chỉnh sẽ xuất hiện ở đây. Chức năng này độc lập, không ảnh hưởng soạn giáo án, Word/PDF hoặc bot.</p>
              </div>
            ) : (
              <div className="markdown-body max-w-none text-sm leading-6 text-[#121c2c]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedPrompt}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-800">Kho công cụ AI & dạy học</h3>
            <p className="text-xs font-semibold text-slate-400">Mỗi thẻ đều ghi rõ nên dùng cho việc gì để thầy/cô chọn đúng công cụ.</p>
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
                {tool.sourceLabel && <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-blue-500">{tool.sourceLabel}</p>}
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{tool.description}</p>
                <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-3 py-2.5">
                  <p className="text-[11px] font-black uppercase tracking-wide text-blue-600">Nên dùng khi</p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">{tool.useFor}</p>
                </div>
                {(tool.note || tool.accountInfo || tool.apiKeyRequired || tool.quickLinks?.length) && (
                  <div className="mt-3 space-y-2 rounded-2xl border border-amber-100 bg-amber-50/80 px-3 py-2.5">
                    <p className="text-[11px] font-black uppercase tracking-wide text-amber-700">Giới thiệu & hướng dẫn</p>
                    {tool.note && <p className="text-[11px] font-semibold leading-relaxed text-amber-700">{tool.note}</p>}
                    {tool.accountInfo && <p className="rounded-xl bg-white/70 px-2 py-1.5 text-[11px] font-black leading-relaxed text-slate-700">Tài khoản: {tool.accountInfo}</p>}
                    {tool.apiKeyRequired && <p className="text-[11px] font-semibold leading-relaxed text-amber-700">Cần API key để sử dụng app.</p>}
                    {tool.quickLinks && tool.quickLinks.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tool.quickLinks.map(link => (
                          <button
                            key={`${tool.id}-${link.label}`}
                            type="button"
                            onClick={() => openTool(link.url)}
                            className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-blue-600 shadow-sm transition-all hover:bg-blue-600 hover:text-white"
                          >
                            {link.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => {
                    if (tool.internalAction === 'prompt-writer') {
                      document.getElementById('prompt-writer-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else if (tool.internalAction === 'lesson-upgrade' && setActiveTab) {
                      setActiveTab('lessonUpgrade');
                    } else {
                      openTool(tool.url);
                    }
                  }}
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

      {showPromptBuilder && (
        <PromptBuilderModal
          data={data}
          showToast={showToast}
          onClose={() => setShowPromptBuilder(false)}
        />
      )}
    </motion.div>
  );
};
