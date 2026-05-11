import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Key, CheckCircle2, ExternalLink, Server } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AppData } from '../../types';
import { GEMINI_MODELS, CLAUDE_MODELS, OPENAI_MODELS, GROK_MODELS, DEEPSEEK_MODELS } from '../../lib/aiProviders';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  showToast: (msg: string) => void;
}

type Provider = 'gemini' | 'claude' | 'openai' | 'grok' | 'deepseek';

const PROVIDERS: { id: Provider; label: string; color: string; bg: string; border: string }[] = [
  { id: 'gemini', label: 'Gemini', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-500' },
  { id: 'claude', label: 'Claude', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-500' },
  { id: 'openai', label: 'ChatGPT', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500' },
  { id: 'grok', label: 'Grok', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-500' },
  { id: 'deepseek', label: 'DeepSeek', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-500' },
];

const PROVIDER_MODELS: Record<Provider, { id: string; name: string; desc: string }[]> = {
  gemini: GEMINI_MODELS,
  claude: CLAUDE_MODELS,
  openai: OPENAI_MODELS,
  grok: GROK_MODELS,
  deepseek: DEEPSEEK_MODELS,
};

const PROVIDER_LINKS: Record<Provider, { url: string; label: string }> = {
  gemini: { url: 'https://aistudio.google.com/app/apikey', label: 'Lấy Gemini API Key' },
  claude: { url: 'https://console.anthropic.com/settings/keys', label: 'Lấy Claude API Key' },
  openai: { url: 'https://platform.openai.com/api-keys', label: 'Lấy OpenAI API Key' },
  grok: { url: 'https://console.x.ai/', label: 'Lấy Grok API Key' },
  deepseek: { url: 'https://platform.deepseek.com/api_keys', label: 'Lấy DeepSeek API Key' },
};

export const SettingsModal = ({
  isOpen,
  onClose,
  data,
  setData,
  showToast
}: SettingsModalProps) => {
  const currentProvider: Provider = (data.settings.selectedProvider as Provider) ?? 'gemini';
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
        selectedModel: currentModelValid ? prev.settings.selectedModel : models[0].id,
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
    } else {
      setData(prev => ({ ...prev, settings: { ...prev.settings, openaiApiKey: value } }));
    }
  };

  const getApiKey = (provider: Provider): string => {
    if (provider === 'gemini') return data.settings.geminiApiKey || '';
    if (provider === 'claude') return data.settings.claudeApiKey || '';
    if (provider === 'grok') return data.settings.grokApiKey || '';
    if (provider === 'deepseek') return data.settings.deepseekApiKey || '';
    return data.settings.openaiApiKey || '';
  };

  const models = PROVIDER_MODELS[activeTab];
  const link = PROVIDER_LINKS[activeTab];
  const providerStyle = PROVIDERS.find(p => p.id === activeTab)!;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                Cài đặt hệ thống
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                title="Đóng"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Provider Tabs */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-3">Nền tảng AI đang dùng</label>
                <div className="grid grid-cols-5 gap-2">
                  {PROVIDERS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProvider(p.id)}
                      className={cn(
                        'py-2.5 px-3 rounded-xl border-2 text-sm font-bold transition-all',
                        currentProvider === p.id
                          ? `${p.border} ${p.bg} ${p.color}`
                          : 'border-slate-100 text-slate-500 hover:border-slate-200'
                      )}
                    >
                      {p.label}
                      {currentProvider === p.id && (
                        <span className="ml-1.5 text-[10px] font-normal opacity-70">đang dùng</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    API Key — {activeTab === 'gemini' ? 'Google Gemini' : activeTab === 'claude' ? 'Anthropic Claude' : activeTab === 'grok' ? 'xAI Grok' : activeTab === 'deepseek' ? 'DeepSeek' : 'OpenAI ChatGPT'}
                  </div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className={cn('text-xs hover:underline flex items-center gap-0.5', providerStyle.color)}
                  >
                    {link.label} <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <input
                  type="password"
                  value={getApiKey(activeTab)}
                  onChange={(e) => handleApiKeyChange(activeTab, e.target.value)}
                  placeholder={`Nhập ${activeTab === 'gemini' ? 'Gemini' : activeTab === 'claude' ? 'Claude' : activeTab === 'grok' ? 'Grok' : activeTab === 'deepseek' ? 'DeepSeek' : 'OpenAI'} API Key...`}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <p className="text-[10px] text-slate-400">API Key chỉ lưu cục bộ trong trình duyệt, không gửi lên máy chủ của chúng tôi.</p>
              </div>

              {/* Model Selection */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700">
                  Mô hình — {activeTab === 'gemini' ? 'Google Gemini' : activeTab === 'claude' ? 'Anthropic Claude' : activeTab === 'grok' ? 'xAI Grok' : activeTab === 'deepseek' ? 'DeepSeek' : 'OpenAI'}
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {models.map(m => {
                    const isSelected = data.settings.selectedModel === m.id && currentProvider === activeTab;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          handleSelectProvider(activeTab);
                          setData(prev => ({ ...prev, settings: { ...prev.settings, selectedModel: m.id, selectedProvider: activeTab } }));
                        }}
                        className={cn(
                          'p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between',
                          isSelected ? `${providerStyle.border} ${providerStyle.bg}` : 'border-slate-100 hover:border-slate-200'
                        )}
                      >
                        <div>
                          <div className={cn('font-bold text-sm', isSelected ? providerStyle.color : 'text-slate-700')}>{m.name}</div>
                          <div className="text-xs text-slate-500">{m.desc}</div>
                        </div>
                        {isSelected && <CheckCircle2 className={cn('w-5 h-5', providerStyle.color)} />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Auto Save Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <span className="text-sm font-medium text-slate-700">Tự động lưu</span>
                <div
                  onClick={() => setData(prev => ({ ...prev, settings: { ...prev.settings, autoSave: !prev.settings.autoSave } }))}
                  className={cn(
                    'w-12 h-6 rounded-full p-1 cursor-pointer transition-colors',
                    data.settings.autoSave ? 'bg-blue-600' : 'bg-slate-300'
                  )}
                >
                  <div className={cn('w-4 h-4 bg-white rounded-full transition-transform', data.settings.autoSave ? 'translate-x-6' : 'translate-x-0')} />
                </div>
              </div>

              {/* Bot API Section */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-500" />
                  Bot API (Đẩy giáo án lên Drive)
                </label>
                <input
                  type="text"
                  value={data.settings.botApiUrl || ''}
                  onChange={(e) => setData(prev => ({ ...prev, settings: { ...prev.settings, botApiUrl: e.target.value } }))}
                  placeholder="https://edu-lesson-bot.railway.app"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                />
                <input
                  type="password"
                  value={data.settings.botApiToken || ''}
                  onChange={(e) => setData(prev => ({ ...prev, settings: { ...prev.settings, botApiToken: e.target.value } }))}
                  placeholder="WEB_API_TOKEN từ Railway..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <p className="text-[10px] text-slate-400">URL Railway và token xác thực để đẩy giáo án lên Google Drive qua bot.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  onClose();
                  showToast('Đã lưu cài đặt!');
                }}
                className="flex-1 py-3 gradient-bg text-white rounded-xl font-bold shadow-lg shadow-blue-200"
              >
                Lưu thay đổi
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
