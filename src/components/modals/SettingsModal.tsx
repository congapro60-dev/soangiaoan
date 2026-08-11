import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  Key,
  LockKeyhole,
  RotateCcw,
  Save,
  Server,
  Settings,
  ShieldCheck,
  User,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { AppData } from '../../types';
import { GEMINI_MODELS, CLAUDE_MODELS, OPENAI_MODELS, GROK_MODELS, DEEPSEEK_MODELS, NVIDIA_MODELS } from '../../lib/aiProviders';
import { useTokenTracker } from '../../hooks/useTokenTracker';
import { parseFolderId } from '../../lib/googleDrive';
import type { DriveFolderKey } from '../../services/pushLessonToDrive';
import type { ApiProvider } from '../../config/apiLimits';

const DRIVE_FOLDER_FIELDS: { key: DriveFolderKey; label: string }[] = [
  { key: 'tdsG10', label: 'TDS · Lớp 10' },
  { key: 'moetG10', label: 'MOET · Lớp 10' },
  { key: 'tdsG11', label: 'TDS · Lớp 11' },
  { key: 'moetG11', label: 'MOET · Lớp 11' },
  { key: 'tdsG12', label: 'TDS · Lớp 12' },
  { key: 'moetG12', label: 'MOET · Lớp 12' },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  showToast: (msg: string) => void;
}

type Provider = ApiProvider;

const PROVIDERS: { id: Provider; label: string; color: string; bg: string; border: string; accent: string }[] = [
  { id: 'gemini', label: 'Gemini', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-500', accent: 'from-blue-500 to-sky-400' },
  { id: 'claude', label: 'Claude', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-500', accent: 'from-orange-500 to-amber-400' },
  { id: 'openai', label: 'ChatGPT', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500', accent: 'from-emerald-500 to-teal-400' },
  { id: 'grok', label: 'Grok', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-500', accent: 'from-purple-500 to-fuchsia-400' },
  { id: 'deepseek', label: 'DeepSeek', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-500', accent: 'from-cyan-500 to-blue-400' },
  { id: 'nvidia', label: 'NVIDIA NIM', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-500', accent: 'from-green-500 to-lime-400' },
  { id: 'openai-compatible', label: 'Custom API', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-400', accent: 'from-slate-500 to-gray-400' },
];

const PROVIDER_MODELS: Record<Provider, { id: string; name: string; desc: string }[]> = {
  gemini: GEMINI_MODELS,
  claude: CLAUDE_MODELS,
  openai: OPENAI_MODELS,
  grok: GROK_MODELS,
  deepseek: DEEPSEEK_MODELS,
  nvidia: NVIDIA_MODELS,
  'openai-compatible': [],
};

const PROVIDER_LINKS: Record<Provider, { url: string; label: string }> = {
  gemini: { url: 'https://aistudio.google.com/app/apikey', label: 'Lấy Gemini API Key' },
  claude: { url: 'https://console.anthropic.com/settings/keys', label: 'Lấy Claude API Key' },
  openai: { url: 'https://platform.openai.com/api-keys', label: 'Lấy OpenAI API Key' },
  grok: { url: 'https://console.x.ai/', label: 'Lấy Grok API Key' },
  deepseek: { url: 'https://platform.deepseek.com/api_keys', label: 'Lấy DeepSeek API Key' },
  nvidia: { url: 'https://build.nvidia.com/explore/models', label: 'Lấy NVIDIA API Key' },
  'openai-compatible': { url: '#', label: 'API Tuỳ chỉnh' },
};

const providerName = (provider: Provider): string => {
  if (provider === 'gemini') return 'Google Gemini';
  if (provider === 'claude') return 'Anthropic Claude';
  if (provider === 'grok') return 'xAI Grok';
  if (provider === 'deepseek') return 'DeepSeek';
  if (provider === 'nvidia') return 'NVIDIA NIM';
  if (provider === 'openai-compatible') return 'OpenAI Compatible';
  return 'OpenAI ChatGPT';
};

const formatNumber = (value: number): string => new Intl.NumberFormat('vi-VN').format(value);

const usagePercent = (used: number, limit?: number): number => {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
};

const progressTone = (percent: number): string => {
  if (percent >= 90) return 'bg-red-500';
  if (percent >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
};

export const SettingsModal = ({
  isOpen,
  onClose,
  data,
  setData,
  showToast
}: SettingsModalProps) => {
  // Migrate giá trị cũ đã ngừng hỗ trợ (VD 'free-router' còn lưu trong Firestore) về gemini
  // để modal không crash khi tra PROVIDERS/PROVIDER_MODELS.
  const rawProvider = data.settings.selectedProvider as string | undefined;
  const currentProvider: Provider = PROVIDERS.some(p => p.id === rawProvider)
    ? (rawProvider as Provider)
    : 'gemini';
  const [activeTab, setActiveTab] = useState<Provider>(currentProvider);

  const handleSelectProvider = (provider: Provider) => {
    setActiveTab(provider);
    const models = PROVIDER_MODELS[provider];
    const currentModelValid = models.some(m => m.id === data.settings.selectedModel);
    setData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        selectedProvider: provider,
        selectedModel: provider === 'openai-compatible' ? prev.settings.openaiCompatibleModelId || 'claude-opus-4-7' : (currentModelValid ? prev.settings.selectedModel : models[0]?.id),
      }
    }));
  };

  const handleApiKeyChange = (provider: Provider, value: string) => {
    if (provider === 'gemini') {
      setData(prev => ({ ...prev, settings: { ...prev.settings, geminiApiKey: value } }));
    } else if (provider === 'claude') {
      setData(prev => ({ ...prev, settings: { ...prev.settings, claudeApiKey: value } }));
    } else if (provider === 'grok') {
      setData(prev => ({ ...prev, settings: { ...prev.settings, grokApiKey: value } }));
    } else if (provider === 'deepseek') {
      setData(prev => ({ ...prev, settings: { ...prev.settings, deepseekApiKey: value } }));
    } else if (provider === 'nvidia') {
      setData(prev => ({ ...prev, settings: { ...prev.settings, nvidiaApiKey: value } }));
    } else if (provider === 'openai-compatible') {
      setData(prev => ({ ...prev, settings: { ...prev.settings, openaiCompatibleApiKey: value } }));
    } else {
      setData(prev => ({ ...prev, settings: { ...prev.settings, openaiApiKey: value } }));
    }
  };

  const getApiKey = (provider: Provider): string => {
    if (provider === 'gemini') return data.settings.geminiApiKey || '';
    if (provider === 'claude') return data.settings.claudeApiKey || '';
    if (provider === 'grok') return data.settings.grokApiKey || '';
    if (provider === 'deepseek') return data.settings.deepseekApiKey || '';
    if (provider === 'nvidia') return data.settings.nvidiaApiKey || '';
    if (provider === 'openai-compatible') return data.settings.openaiCompatibleApiKey || '';
    return data.settings.openaiApiKey || '';
  };

  const models = PROVIDER_MODELS[activeTab];
  const link = PROVIDER_LINKS[activeTab];
  const providerStyle = PROVIDERS.find(p => p.id === activeTab)!;
  const selectedModelForTab = currentProvider === activeTab ? data.settings.selectedModel : models[0].id;
  const usage = useTokenTracker(activeTab, selectedModelForTab);
  const requestPercent = usagePercent(usage.requestsToday, usage.limit?.rpd);
  const tokenPercent = usagePercent(usage.tokensLastMinute, usage.limit?.tpm);
  const isRateLimited = usage.isMinuteLimited || usage.isTokenMinuteLimited;
  const activeApiKey = getApiKey(activeTab);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-md sm:p-5"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 16 }}
            className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-blue-100 bg-slate-50 shadow-[0_30px_90px_-36px_rgba(15,23,42,0.55)]"
          >
            <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:radial-gradient(#3182ce_1px,transparent_1px)] [background-size:24px_24px]" />

            <div className="relative border-b border-blue-100 bg-white/88 px-5 py-4 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--dewey-blue)] text-white shadow-[0_14px_30px_-18px_rgba(49,130,206,0.9)]">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-slate-900">Hồ sơ & Cài đặt</h3>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--dewey-blue)]">Knowledge Blue</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-500">Quản lý nhà cung cấp AI, model, hạn mức API và kết nối bot xuất Drive.</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[var(--dewey-blue)]"
                  title="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="relative grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[240px_minmax(0,1fr)]">
              <aside className="border-b border-blue-100 bg-blue-50/70 p-4 lg:border-b-0 lg:border-r lg:p-5">
                <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--dewey-blue)] text-white">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">Giáo viên</p>
                      <p className="text-xs font-semibold text-slate-500">Thiết lập cục bộ</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between rounded-2xl bg-blue-50 px-3 py-2 text-xs font-bold text-slate-600">
                      <span>Provider</span>
                      <span className={providerStyle.color}>{providerStyle.label}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                      <span>API Key</span>
                      <span className={activeApiKey ? 'text-emerald-600' : 'text-amber-600'}>{activeApiKey ? 'Đã nhập' : 'Chưa nhập'}</span>
                    </div>
                  </div>
                </div>

                <nav className="mt-4 space-y-2">
                  {[
                    { icon: Cpu, label: 'AI Providers', active: true },
                    { icon: Activity, label: 'Hạn mức API', active: true },
                    { icon: Server, label: 'Bot Drive', active: true },
                    { icon: ShieldCheck, label: 'Bảo mật', active: false },
                  ].map(item => (
                    <div
                      key={item.label}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition',
                        item.active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'
                      )}
                    >
                      <item.icon className="h-4 w-4 text-[var(--dewey-blue)]" />
                      {item.label}
                    </div>
                  ))}
                </nav>
              </aside>

              <div className="min-h-0 space-y-5 p-5 sm:p-7">
                <section className="rounded-[24px] border border-blue-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">Nền tảng AI đang dùng</h4>
                      <p className="mt-1 text-sm text-slate-500">Chọn provider và nhập API key tương ứng. Dữ liệu được lưu cục bộ trong trình duyệt.</p>
                    </div>
                    <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-[var(--dewey-blue)]">{providerName(activeTab)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-8">
                    {PROVIDERS.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProvider(p.id)}
                        className={cn(
                          'group rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md',
                          currentProvider === p.id ? `${p.border} ${p.bg}` : 'border-slate-200 bg-white hover:border-blue-200'
                        )}
                      >
                        <div className={cn('mb-2 h-1.5 w-10 rounded-full bg-gradient-to-r', p.accent)} />
                        <div className={cn('text-sm font-black', currentProvider === p.id ? p.color : 'text-slate-700')}>{p.label}</div>
                        <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{currentProvider === p.id ? 'Đang dùng' : 'Khả dụng'}</div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 space-y-2">
                    <label className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-slate-700">
                      <span className="flex items-center gap-2"><Key className="h-4 w-4" /> API Key — {providerName(activeTab)}</span>
                      {link.url !== '#' && (
                        <a href={link.url} target="_blank" rel="noreferrer" className={cn('flex items-center gap-1 text-xs hover:underline', providerStyle.color)}>
                          {link.label} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </label>
                    <div className="relative">
                      <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        value={activeApiKey}
                        onChange={(e) => handleApiKeyChange(activeTab, e.target.value)}
                        placeholder={`Nhập ${providerStyle.label} API Key...`}
                        className="w-full rounded-2xl border border-slate-200 bg-blue-50/40 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[var(--dewey-blue)] focus:bg-white focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                    <p className="text-[11px] font-medium text-slate-400">API Key chỉ lưu cục bộ trong trình duyệt, không gửi lên máy chủ của chúng tôi.</p>
                  </div>
                </section>

                <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="rounded-[24px] border border-blue-100 bg-white p-5 shadow-sm">
                    <h4 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">Mô hình</h4>
                    <p className="mt-1 text-sm text-slate-500">Chọn model mặc định cho các tác vụ tạo giáo án, đề kiểm tra và AI Tutor.</p>
                    <div className="mt-4 grid grid-cols-1 gap-3">
                      {activeTab === 'openai-compatible' ? (
                        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div>
                            <label className="mb-1 block text-xs font-bold text-slate-700">Base URL</label>
                            <input
                              type="text"
                              value={data.settings.openaiCompatibleBaseUrl || ''}
                              onChange={(e) => setData(prev => ({ ...prev, settings: { ...prev.settings, openaiCompatibleBaseUrl: e.target.value } }))}
                              placeholder="https://digishop-api.io.vn/v1"
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-[var(--dewey-blue)] focus:bg-white focus:ring-2 focus:ring-blue-100"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-bold text-slate-700">Model ID</label>
                            <input
                              type="text"
                              value={data.settings.openaiCompatibleModelId || ''}
                              onChange={(e) => setData(prev => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  openaiCompatibleModelId: e.target.value,
                                  selectedModel: e.target.value // Update selectedModel as well so usage tracking knows
                                }
                              }))}
                              placeholder="claude-opus-4-7"
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-[var(--dewey-blue)] focus:bg-white focus:ring-2 focus:ring-blue-100"
                            />
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Với Custom API, bạn cần nhập chính xác Base URL và Model ID được cung cấp.
                          </p>
                        </div>
                      ) : (
                        models.map(m => {
                          const isSelected = data.settings.selectedModel === m.id && currentProvider === activeTab;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                handleSelectProvider(activeTab);
                                setData(prev => ({ ...prev, settings: { ...prev.settings, selectedModel: m.id, selectedProvider: activeTab } }));
                              }}
                              className={cn(
                                'flex items-start justify-between gap-3 rounded-2xl border p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/60',
                                isSelected ? `${providerStyle.border} ${providerStyle.bg}` : 'border-slate-200 bg-white'
                              )}
                            >
                              <div>
                                <div className={cn('font-bold text-sm', isSelected ? providerStyle.color : 'text-slate-800')}>{m.name}</div>
                                <div className="mt-1 text-xs leading-5 text-slate-500">{m.desc}</div>
                              </div>
                              {isSelected && <CheckCircle2 className={cn('mt-0.5 h-5 w-5 shrink-0', providerStyle.color)} />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-[24px] border border-blue-100 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-black text-slate-800">
                            <Activity className="h-4 w-4 text-emerald-600" />
                            Hạn mức API hôm nay
                          </div>
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">
                            {usage.limit ? `${usage.limit.displayName} · ${usage.dateKey.replaceAll('_', '/')}` : `Chưa có dữ liệu hạn mức cho model ${selectedModelForTab}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            usage.reset();
                            showToast('Đã reset bộ đếm API hôm nay');
                          }}
                          className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reset
                        </button>
                      </div>

                      {usage.limit ? (
                        <div className="mt-4 space-y-3">
                          <div>
                            <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-600">
                              <span>Requests / ngày</span>
                              <span>{formatNumber(usage.requestsToday)} / {formatNumber(usage.limit.rpd)}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-blue-50">
                              <div className={cn('h-full rounded-full transition-all', progressTone(requestPercent))} style={{ width: `${requestPercent}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-600">
                              <span>Tokens / phút</span>
                              <span>{formatNumber(usage.tokensLastMinute)} / {formatNumber(usage.limit.tpm)}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-blue-50">
                              <div className={cn('h-full rounded-full transition-all', progressTone(tokenPercent))} style={{ width: `${tokenPercent}%` }} />
                            </div>
                          </div>

                          <div className={cn(
                            'flex items-start gap-2 rounded-2xl px-3 py-2 text-[11px] font-bold',
                            isRateLimited ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                          )}>
                            {isRateLimited ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                            <span>
                              RPM: {formatNumber(usage.requestsLastMinute)} / {formatNumber(usage.limit.rpm)} · TPM: {formatNumber(usage.tokensLastMinute)} / {formatNumber(usage.limit.tpm)}.
                              {isRateLimited ? ' Gần/quá ngưỡng 1 phút, vui lòng đợi trước khi chạy tiếp.' : ' Vẫn trong ngưỡng an toàn 1 phút.'}
                            </span>
                          </div>

                          {activeTab !== 'gemini' && (
                            <p className="text-[10px] font-semibold leading-relaxed text-amber-700">Với OpenAI/Claude/Grok/DeepSeek, hạn mức trên hiển thị theo tài khoản Tier 1.</p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-4 rounded-2xl bg-blue-50 px-3 py-2 text-[11px] font-semibold text-slate-500">Model này chưa có trong database hạn mức. Bộ đếm vẫn có thể ghi usage local.</p>
                      )}
                    </div>

                    <div className="rounded-[24px] border border-blue-100 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-4 rounded-2xl bg-blue-50/70 p-4">
                        <div>
                          <p className="text-sm font-bold text-slate-800">Tự động lưu</p>
                          <p className="mt-1 text-xs text-slate-500">Giảm rủi ro mất nội dung khi soạn giáo án.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setData(prev => ({ ...prev, settings: { ...prev.settings, autoSave: !prev.settings.autoSave } }))}
                          className={cn('h-7 w-14 rounded-full p-1 transition-colors', data.settings.autoSave ? 'bg-[var(--dewey-blue)]' : 'bg-slate-300')}
                        >
                          <span className={cn('block h-5 w-5 rounded-full bg-white shadow transition-transform', data.settings.autoSave ? 'translate-x-7' : 'translate-x-0')} />
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[24px] border border-blue-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[var(--dewey-blue)]"><Database className="h-5 w-5" /></div>
                    <div>
                      <h4 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">Google Drive — Thư mục nhận giáo án</h4>
                      <p className="text-sm text-slate-500">Dán link thư mục Drive cho từng chương trình và lớp. Để trống cũng được — lúc đẩy dán link vào là app tự nhớ.</p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {DRIVE_FOLDER_FIELDS.map(({ key, label }) => (
                      <label key={key} className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
                        <input
                          type="text"
                          value={data.settings.driveFolders?.[key] || ''}
                          onChange={(e) => setData(prev => ({
                            ...prev,
                            settings: {
                              ...prev.settings,
                              driveFolders: { ...prev.settings.driveFolders, [key]: parseFolderId(e.target.value) },
                            },
                          }))}
                          placeholder="Dán link thư mục Drive..."
                          className="w-full rounded-2xl border border-slate-200 bg-blue-50/40 px-4 py-3 font-mono text-xs outline-none transition focus:border-[var(--dewey-blue)] focus:bg-white focus:ring-4 focus:ring-blue-100"
                        />
                      </label>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <div className="relative flex flex-col gap-3 border-t border-blue-100 bg-white/90 px-5 py-4 sm:flex-row sm:px-7">
              <button onClick={onClose} className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Đóng</button>
              <button
                onClick={() => {
                  onClose();
                  showToast('Đã lưu cài đặt!');
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--dewey-blue)] py-3 text-sm font-bold text-white shadow-[0_14px_30px_-18px_rgba(49,130,206,0.9)] transition hover:bg-blue-700"
              >
                <Save className="h-4 w-4" />
                Lưu thay đổi
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

