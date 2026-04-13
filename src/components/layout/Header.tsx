import { AppData } from '../../types';
import { cn } from '../../lib/utils';
import { Search, Bell, Settings } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  data: AppData;
  setIsSettingsOpen: (val: boolean) => void;
}

export const Header = ({ activeTab, data, setIsSettingsOpen }: HeaderProps) => {
  const getTitle = () => {
    switch(activeTab) {
      case 'dashboard': return 'Bảng điều khiển';
      case 'creator': return 'Trình soạn thảo AI';
      case 'library': return 'Thanh thư viện';
      case 'templates': return 'Mẫu tài liệu';
      case 'chat': return 'AI Tutor';
      default: return 'SmartPlan AI';
    }
  };

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-20 backdrop-blur-md bg-white/80">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-black text-slate-800 tracking-tight">{getTitle()}</h1>
        {activeTab === 'creator' && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-green-100">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> AI Online
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        {/* Search Bar (Optional Header Search) */}
        <div className="hidden lg:flex items-center relative group">
           <Search className="absolute left-3 w-4 h-4 text-slate-400 group-focus-within:text-blue-500" />
           <input 
            type="text" 
            placeholder="Tìm tính năng..." 
            className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all w-48"
           />
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-all relative">
             <Bell className="w-5 h-5" />
             <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
          
          <div className="h-8 w-[1px] bg-slate-100 mx-2" />
          
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-3 p-1 pl-4 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-700">{data.authorName || 'Thầy Cô'}</p>
              <p className="text-[10px] text-slate-400 font-medium">Giáo viên</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-100">
               {data.authorName?.charAt(0) || 'G'}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
