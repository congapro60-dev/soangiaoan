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
  LogOut,
  GraduationCap,
  ClipboardCheck,
  Globe,
  BrainCircuit
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onCreatorTabClick: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  setIsSettingsOpen: (val: boolean) => void;
  handleLogout: () => void;
}

export const Sidebar = ({
  activeTab,
  setActiveTab,
  onCreatorTabClick,
  isSidebarOpen,
  setIsSidebarOpen,
  setIsSettingsOpen,
  handleLogout
}: SidebarProps) => {
  const currentPath = window.location.pathname;
  const menuItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'creator', label: 'Soạn giáo án', icon: Plus },
    { id: 'testing', label: 'Bảng Kiểm tra', icon: GraduationCap },
    { id: 'exams', label: 'Thi online', icon: Globe },
    { id: 'grading', label: 'Chấm điểm AI', icon: ClipboardCheck },
    { id: 'adaptive', label: 'Học phân hoá', icon: BrainCircuit },
    { id: 'adaptiveLessons', label: 'Quản lý bài học', icon: FileText, path: '/adaptive-lessons' },
    { id: 'library', label: 'Thư viện', icon: FileText },
    { id: 'templates', label: 'Mẫu giáo án', icon: Layout },
    { id: 'chat', label: 'AI Tutor', icon: MessageSquare },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: isSidebarOpen ? 280 : 80 }}
      className={cn(
        "flex flex-col h-full bg-white border-r border-slate-200 shadow-sm z-50 md:z-30",
        "fixed inset-y-0 left-0 md:relative md:inset-auto",
        "transition-transform duration-300",
        !isSidebarOpen ? "-translate-x-full md:translate-x-0" : "translate-x-0"
      )}
    >
      {/* Brand area */}
      <div className="p-6 flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200">
          <Sparkles className="text-white w-6 h-6" />
        </div>
        {isSidebarOpen && (
          <div className="flex flex-col">
            <span className="font-bold text-xl text-slate-900 whitespace-nowrap tracking-tight">SmartPlan <span className="text-blue-600">AI</span></span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Trợ lý sư phạm</span>
          </div>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 space-y-1.5 mt-6">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id || ('path' in item && currentPath === item.path);
          return (
          <button
            key={item.id}
            onClick={() => {
              if ('path' in item && item.path) {
                window.location.href = item.path;
                return;
              }
              item.id === 'creator' ? onCreatorTabClick() : setActiveTab(item.id as any);
            }}
            className={cn(
              "w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group relative",
              isActive
                ? "bg-blue-600 text-white shadow-xl shadow-blue-100"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-white" : "group-hover:text-blue-500")} />
            {isSidebarOpen && <span className="font-semibold">{item.label}</span>}
            
            {/* Active Indicator Bar */}
            {isActive && (
              <motion.div 
                layoutId="activeTab"
                className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
              />
            )}
          </button>
          );
        })}
      </nav>

      {/* Footer Nav */}
      <div className="p-4 space-y-2 border-t border-slate-50 mt-auto">
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl text-slate-500 hover:bg-slate-50 transition-all group"
        >
          <Settings className="w-5 h-5 flex-shrink-0 group-hover:rotate-45 transition-transform" />
          {isSidebarOpen && <span className="font-medium">Cài đặt</span>}
        </button>
        
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl text-slate-500 hover:bg-slate-50 transition-all"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          {isSidebarOpen && <span className="font-medium">Thu gọn menu</span>}
        </button>

        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl text-red-500 hover:bg-red-50 transition-all group mt-4 bg-red-50/10"
        >
          <LogOut className="w-5 h-5 flex-shrink-0 group-hover:-translate-x-1 transition-transform" />
          {isSidebarOpen && <span className="font-bold">Đăng xuất</span>}
        </button>
      </div>
    </motion.aside>
  );
};
