import { motion } from 'motion/react';
import { 
  Sparkles, 
  LayoutDashboard, 
  Plus, 
  FileText, 
  Layout, 
  MessageSquare, 
  Settings, 
  X, 
  Menu, 
  Zap 
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  setIsSettingsOpen: (val: boolean) => void;
  handleLogout: () => void;
}

export const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  isSidebarOpen, 
  setIsSidebarOpen, 
  setIsSettingsOpen, 
  handleLogout 
}: SidebarProps) => {
  return (
    <motion.aside 
      initial={false}
      animate={{ width: isSidebarOpen ? 260 : 80 }}
      className="relative flex flex-col h-full bg-white border-r border-slate-200 shadow-sm z-30"
    >
      <div className="p-6 flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0">
          <Sparkles className="text-white w-6 h-6" />
        </div>
        {isSidebarOpen && (
          <span className="font-bold text-xl gradient-text whitespace-nowrap">SmartPlan AI</span>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {[
          { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
          { id: 'creator', label: 'Soạn giáo án', icon: Plus },
          { id: 'library', label: 'Thư viện', icon: FileText },
          { id: 'templates', label: 'Mẫu giáo án', icon: Layout },
          { id: 'chat', label: 'AI Tutor', icon: MessageSquare },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
              activeTab === item.id 
                ? "bg-blue-50 text-blue-600 font-medium" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-slate-50 transition-all"
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {isSidebarOpen && <span>Cài đặt</span>}
        </button>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="mt-2 w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-slate-50 transition-all"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          {isSidebarOpen && <span>Thu gọn</span>}
        </button>
        <button 
          onClick={handleLogout}
          className="mt-2 w-full flex items-center gap-3 p-3 rounded-xl text-orange-500 hover:bg-orange-50 transition-all font-medium"
        >
          <Zap className="w-5 h-5" />
          {isSidebarOpen && <span>Đăng xuất</span>}
        </button>
      </div>
    </motion.aside>
  );
};
