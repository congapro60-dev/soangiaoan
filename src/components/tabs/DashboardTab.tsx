import { motion } from 'motion/react';
import { 
  FileText, 
  CheckCircle2, 
  Zap, 
  BookOpen,
  ArrowRight,
  Sparkles,
  Users,
  Layout,
  PlusCircle
} from 'lucide-react';
import { AppData, LessonPlan } from '../../types';
import { cn } from '../../lib/utils';
import dayjs from 'dayjs';

interface DashboardTabProps {
  data: AppData;
  setCurrentPlan: (plan: Partial<LessonPlan>) => void;
  setActiveTab: (tab: any) => void;
}

export const DashboardTab = ({ data, setCurrentPlan, setActiveTab }: DashboardTabProps) => {
  const stats = [
    { label: 'Tổng giáo án', value: data.lessonPlans?.length || 0, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Bài chia sẻ', value: data.lessonPlans?.filter(p => p.isPublic)?.length || 0, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Mẫu tài liệu', value: data.templates?.length || 0, icon: Layout, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Môn học', value: data.subjects?.length || 0, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const quickActions = [
    { label: 'Soạn giáo án mới', icon: PlusCircle, tab: 'creator', desc: 'Sử dụng AI để khởi tạo giáo án nhanh' },
    { label: 'AI Tutor', icon: Sparkles, tab: 'chat', desc: 'Trò chuyện và nhận hỗ trợ sư phạm' },
    { label: 'Quản lý Mẫu', icon: Layout, tab: 'templates', desc: 'Tùy chỉnh các mẫu file xuất bản' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 max-w-6xl mx-auto"
    >
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Chào {data.authorName && <span className="text-blue-600">thầy {data.authorName}</span>},
          </h2>
          <p className="text-slate-500 mt-2 font-medium">Hôm nay thầy muốn chuẩn bị bài giảng nào?</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setActiveTab('creator')}
            className="px-6 py-3 gradient-bg text-white rounded-2xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2 hover:scale-[1.02] transition-all"
          >
            <Zap className="w-5 h-5" /> Soạn bài ngay
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="pro-card p-6 flex flex-col gap-4"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          <h3 className="text-xl font-bold text-slate-800">Truy cập nhanh</h3>
          <div className="space-y-4">
            {quickActions.map((action) => (
              <button 
                key={action.label}
                onClick={() => setActiveTab(action.tab as any)}
                className="w-full text-left p-5 bg-white border border-slate-100 rounded-3xl hover:border-blue-500 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <action.icon className="w-5 h-5 text-slate-500 group-hover:text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 group-hover:text-blue-600">{action.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{action.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Plans */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800">Giáo án gần đây</h3>
            <button 
              onClick={() => setActiveTab('library')}
              className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              Xem tất cả <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            {data.lessonPlans?.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {data.lessonPlans.slice(0, 5).map((plan) => (
                  <div 
                    key={plan.id} 
                    className="p-5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => { setCurrentPlan(plan); setActiveTab('creator'); }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm line-clamp-1">{plan.title}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-0.5">
                          Lớp {plan.grade} · {data.subjects?.find(s => s.id === plan.subjectId)?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                       <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-1 bg-green-50 text-green-600 rounded-lg">
                         {dayjs(plan.updatedAt).format('DD/MM/YYYY')}
                       </span>
                       <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center text-slate-400">
                Bạn chưa có giáo án nào. Hãy bắt đầu soạn thảo ngay!
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);
