import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, History, BookOpen, FileText, GraduationCap, Menu } from 'lucide-react';
import { AppData } from '../../types';

type ActiveTab = 'dashboard' | 'creator' | 'library' | 'chat' | 'templates' | 'testing' | 'grading' | 'exams' | 'adaptive' | 'aiTools';

interface HeaderProps {
  activeTab: string;
  data: AppData;
  setIsSettingsOpen: (val: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;
  onMenuClick?: () => void;
}

const timeAgo = (ts: number) => {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'Vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
};

export const Header = ({ activeTab, data, setIsSettingsOpen, setActiveTab, onMenuClick }: HeaderProps) => {
  const [showHistory, setShowHistory] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowHistory(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activityFeed = useMemo(() => {
    const items: { id: string; title: string; timestamp: number; tab: string; badge: string; color: string; icon: React.ReactNode }[] = [];

    data.lessonPlans.slice(0, 10).forEach(p => {
      items.push({
        id: p.id,
        title: p.title,
        timestamp: new Date(p.updatedAt || p.createdAt).getTime(),
        tab: 'creator',
        badge: 'Giáo án',
        color: 'bg-blue-100 text-blue-700',
        icon: <BookOpen className="w-3.5 h-3.5" />,
      });
    });

    (data.gradingSessions || []).slice(0, 5).forEach(s => {
      items.push({
        id: s.id,
        title: s.title,
        timestamp: new Date(s.createdAt).getTime(),
        tab: 'grading',
        badge: 'Chấm bài',
        color: 'bg-purple-100 text-purple-700',
        icon: <GraduationCap className="w-3.5 h-3.5" />,
      });
    });

    try {
      const raw = localStorage.getItem('testing_history');
      if (raw) {
        const entries = JSON.parse(raw) as { id: string; timestamp: number; title: string; mode: string }[];
        entries.slice(0, 5).forEach(e => {
          const modeLabel = e.mode === 'create' ? 'Soạn đề' : e.mode === 'audit' ? 'Soát lỗi' : 'Trộn đề';
          const modeColor = e.mode === 'create' ? 'bg-green-100 text-green-700' : e.mode === 'audit' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700';
          items.push({
            id: e.id,
            title: e.title,
            timestamp: e.timestamp,
            tab: 'testing',
            badge: modeLabel,
            color: modeColor,
            icon: <FileText className="w-3.5 h-3.5" />,
          });
        });
      }
    } catch {}

    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 15);
  }, [data.lessonPlans, data.gradingSessions]);

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Bảng điều khiển';
      case 'creator': return 'Trình soạn thảo AI';
      case 'library': return 'Thanh thư viện';
      case 'templates': return 'Mẫu tài liệu';
      case 'chat': return 'AI Tutor';
      case 'exams': return 'Thi online';
      case 'adaptive': return 'Học phân hoá';
      case 'aiTools': return 'Công cụ AI';
      default: return 'SmartPlan AI';
    }
  };

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-20 backdrop-blur-md bg-white/80">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-all md:hidden"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-black text-slate-800 tracking-tight">{getTitle()}</h1>
        {activeTab === 'creator' && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-green-100">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> AI Online
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center relative group">
          <Search className="absolute left-3 w-4 h-4 text-slate-400 group-focus-within:text-blue-500" />
          <input
            type="text"
            placeholder="Tìm tính năng..."
            className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all w-48"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* History button */}
          <div className="relative" ref={ref}>
            <button
              onClick={() => setShowHistory(v => !v)}
              className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-all relative"
              title="Lịch sử hoạt động"
            >
              <History className="w-5 h-5" />
              {activityFeed.length > 0 && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </button>

            {showHistory && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-500" />
                    Lịch sử hoạt động
                  </h3>
                  <span className="text-[10px] text-slate-400">{activityFeed.length} mục</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {activityFeed.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">Chưa có hoạt động nào</p>
                  ) : (
                    activityFeed.map(item => (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.tab as ActiveTab); setShowHistory(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                      >
                        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${item.color}`}>
                          {item.icon}{item.badge}
                        </span>
                        <span className="text-xs text-slate-700 font-medium flex-1 truncate">{item.title}</span>
                        <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">{timeAgo(item.timestamp)}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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
