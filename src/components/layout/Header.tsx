import { Key } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AppData } from '../../types';

interface HeaderProps {
  activeTab: string;
  data: AppData;
  setIsSettingsOpen: (val: boolean) => void;
}

export const Header = ({ activeTab, data, setIsSettingsOpen }: HeaderProps) => {
  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Bảng điều khiển';
      case 'creator': return 'Soạn giáo án mới';
      case 'library': return 'Thư viện giáo án';
      case 'templates': return 'Mẫu giáo án & Tiêu chí';
      case 'chat': return 'Trợ lý AI';
      default: return '';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-20">
      <h2 className="text-lg font-semibold text-slate-800">
        {getTitle()}
      </h2>
      <div className="flex items-center gap-4">
        {!data.settings.geminiApiKey && (
          <span className="text-red-500 text-sm font-semibold animate-pulse hidden sm:block">
            Lấy API key để sử dụng app
          </span>
        )}
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-700 transition-colors"
        >
          <Key className="w-4 h-4" /> Settings
        </button>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
          <div className={cn(
            "w-2 h-2 rounded-full", 
            data.settings.geminiApiKey ? "bg-green-500" : "bg-red-500"
          )} />
          {data.settings.geminiApiKey ? 'AI Ready' : 'Cần nhập API Key'}
        </div>
      </div>
    </header>
  );
};
