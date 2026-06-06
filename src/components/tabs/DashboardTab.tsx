import { motion } from 'motion/react';
import {
  FileText,
  Zap,
  BookOpen,
  ArrowRight,
  Sparkles,
  Users,
  Layout,
  PlusCircle,
  ClipboardCheck,
  TrendingUp,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { AppData, LessonPlan } from '../../types';
import { cn } from '../../lib/utils';
import dayjs from 'dayjs';
import { LearningAnalytics } from '../features/LearningAnalytics';

interface DashboardTabProps {
  data: AppData;
  setCurrentPlan: (plan: Partial<LessonPlan>) => void;
  setActiveTab: (tab: any) => void;
}

export const DashboardTab = ({ data, setCurrentPlan, setActiveTab }: DashboardTabProps) => {
  const totalGraded = (data.gradingSessions || []).reduce(
    (sum, s) => sum + s.results.filter(r => r.status === 'completed').length,
    0
  );
  const lessonCount = data.lessonPlans?.length || 0;
  const publicCount = data.lessonPlans?.filter(p => p.isPublic)?.length || 0;
  const latestPlan = data.lessonPlans?.[0];
  const teacherName = data.authorName?.split(' ').pop() || 'Thầy/Cô';

  const stats = [
    { label: 'Giáo án', value: lessonCount, icon: FileText, color: 'text-blue-700', bg: 'bg-blue-50', hint: 'Đang lưu trong thư viện' },
    { label: 'Chia sẻ', value: publicCount, icon: Users, color: 'text-amber-700', bg: 'bg-amber-50', hint: 'Tài nguyên cộng đồng' },
    { label: 'Template', value: data.templates?.length || 0, icon: Layout, color: 'text-violet-700', bg: 'bg-violet-50', hint: 'Mẫu xuất bản' },
    { label: 'Môn học', value: data.subjects?.length || 0, icon: BookOpen, color: 'text-emerald-700', bg: 'bg-emerald-50', hint: 'Đã cấu hình' },
    { label: 'Đã chấm', value: totalGraded, icon: ClipboardCheck, color: 'text-rose-700', bg: 'bg-rose-50', hint: 'Bài hoàn tất' },
  ];

  const quickActions = [
    { label: 'Soạn giáo án mới', icon: PlusCircle, tab: 'creator', desc: 'Tạo bài dạy với AI Co-pilot', badge: 'Ưu tiên' },
    { label: 'Tạo đề kiểm tra', icon: ShieldCheck, tab: 'testing', desc: 'Dựng đề theo ma trận thông minh', badge: 'Smart Grid' },
    { label: 'Quản lý thư viện', icon: Layout, tab: 'library', desc: 'Xem giáo án cá nhân và cộng đồng', badge: 'Library' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex w-full max-w-7xl flex-col gap-8"
    >
      <section className="relative overflow-hidden rounded-[36px] border border-blue-100 bg-white px-6 py-7 shadow-[0_24px_70px_-46px_rgba(49,130,206,0.8)] sm:px-8 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_86%_12%,rgba(49,130,206,0.18),transparent_34%),linear-gradient(135deg,rgba(235,248,255,0.9),rgba(255,255,255,0.72))]" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
              <Sparkles className="h-3.5 w-3.5" /> Giao An Dewey Workspace
            </div>
            <div>
              <h2 className="max-w-3xl text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                Chào {teacherName}, hôm nay mình tối ưu bài dạy nào?
              </h2>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-500 sm:text-base">
                Bảng điều khiển được thiết kế lại theo hướng rõ ràng, ít nhiễu và ưu tiên các tác vụ giáo viên dùng thường xuyên: soạn giáo án, tạo đề, quản lý tài nguyên và theo dõi kết quả.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setActiveTab('creator')}
                className="dewey-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <Zap className="h-5 w-5" /> Soạn bài ngay
              </button>
              <button
                onClick={() => setActiveTab('testing')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                Tạo đề kiểm tra <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/80 bg-white/78 p-5 shadow-xl shadow-blue-100/50 backdrop-blur-md">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Gợi ý tiếp theo</p>
                <h3 className="mt-2 text-lg font-black text-slate-900">{latestPlan ? 'Tiếp tục hoàn thiện giáo án' : 'Bắt đầu giáo án đầu tiên'}</h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="line-clamp-2 text-sm font-bold text-slate-700">
                {latestPlan?.title || 'Chọn “Soạn bài ngay” để tạo cấu trúc giáo án chuẩn, sau đó xuất Word/PDF khi cần.'}
              </p>
              <button
                onClick={() => {
                  if (latestPlan) setCurrentPlan(latestPlan);
                  setActiveTab('creator');
                }}
                className="mt-4 inline-flex items-center gap-2 text-sm font-black text-blue-700 hover:underline"
              >
                Mở workspace <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            className="dewey-card p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', stat.bg)}>
                <stat.icon className={cn('h-6 w-6', stat.color)} />
              </div>
              <p className="text-3xl font-black tracking-tight text-slate-950">{stat.value}</p>
            </div>
            <div className="mt-5">
              <p className="text-sm font-black text-slate-800">{stat.label}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">{stat.hint}</p>
            </div>
          </motion.div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.45fr]">
        <div className="dewey-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Shortcut</p>
              <h3 className="mt-1 text-xl font-black text-slate-900">Truy cập nhanh</h3>
            </div>
            <Sparkles className="h-5 w-5 text-blue-500" />
          </div>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => setActiveTab(action.tab as any)}
                className="group w-full rounded-3xl border border-slate-100 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/60"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 transition group-hover:bg-blue-50">
                    <action.icon className="h-5 w-5 text-slate-500 transition group-hover:text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-black text-slate-800 group-hover:text-blue-700">{action.label}</p>
                      <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 sm:inline-flex">{action.badge}</span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-400">{action.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="dewey-card overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Recent work</p>
              <h3 className="mt-1 text-xl font-black text-slate-900">Giáo án gần đây</h3>
            </div>
            <button
              onClick={() => setActiveTab('library')}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100"
            >
              Xem tất cả <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {data.lessonPlans?.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {data.lessonPlans.slice(0, 5).map((plan) => (
                <button
                  key={plan.id}
                  className="group flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition hover:bg-blue-50/40"
                  onClick={() => { setCurrentPlan(plan); setActiveTab('creator'); }}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-black text-slate-800 group-hover:text-blue-700">{plan.title}</p>
                      <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Lớp {plan.grade} · {data.subjects?.find(s => s.id === plan.subjectId)?.name || 'Chưa rõ môn'}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-right">
                    <span className="hidden items-center gap-1 rounded-xl bg-slate-50 px-2.5 py-1.5 text-[11px] font-black text-slate-500 sm:inline-flex">
                      <Clock className="h-3.5 w-3.5" /> {dayjs(plan.updatedAt).format('DD/MM/YYYY')}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
                <FileText className="h-7 w-7" />
              </div>
              <h4 className="mt-4 text-base font-black text-slate-800">Chưa có giáo án nào</h4>
              <p className="mt-2 text-sm font-semibold text-slate-400">Hãy bắt đầu bằng một yêu cầu ngắn cho AI Co-pilot.</p>
            </div>
          )}
        </div>
      </section>

      {(data.gradingSessions?.length ?? 0) > 0 && (
        <LearningAnalytics sessions={data.gradingSessions} />
      )}
    </motion.div>
  );
};

const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);
