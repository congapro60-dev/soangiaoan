import { motion } from 'motion/react';
import { 
  FileText, 
  CheckCircle2, 
  Zap, 
  BookOpen,
  Calculator,
  FlaskConical,
  Dna
} from 'lucide-react';
import { AppData, LessonPlan } from '../../types';

const ICON_MAP: Record<string, any> = {
  Calculator,
  Zap,
  FlaskConical,
  Dna,
  BookOpen,
};

interface DashboardTabProps {
  data: AppData;
  setCurrentPlan: (plan: Partial<LessonPlan>) => void;
  setActiveTab: (tab: any) => void;
}

export const DashboardTab = ({ data, setCurrentPlan, setActiveTab }: DashboardTabProps) => {
  return (
    <motion.div 
      key="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-slate-400">Tổng số</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{data.lessonPlans.length}</div>
          <div className="text-sm text-slate-500 mt-1">Giáo án đã soạn</div>
        </div>
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-slate-400">Tuân thủ</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">98%</div>
          <div className="text-sm text-slate-500 mt-1">Độ chính xác trung bình</div>
        </div>
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-xl text-green-600">
              <Zap className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-slate-400">Tiết kiệm</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">~12h</div>
          <div className="text-sm text-slate-500 mt-1">Thời gian chuẩn bị/tuần</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            Môn học của bạn
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.subjects.map(subject => {
              const Icon = ICON_MAP[subject.icon] || BookOpen;
              return (
                <div key={subject.id} className="p-4 bg-white rounded-2xl border border-slate-100 hover:shadow-md transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                      <Icon className="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{subject.name}</div>
                      <div className="text-xs text-slate-500">{data.lessonPlans.filter(p => p.subjectId === subject.id).length} giáo án</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            Giáo án gần đây
          </h3>
          <div className="space-y-3">
            {data.lessonPlans.slice(0, 4).map(plan => (
              <div 
                key={plan.id} 
                onClick={() => { setCurrentPlan(plan); setActiveTab('creator'); }}
                className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between hover:bg-blue-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">{plan.title}</div>
                    <div className="text-xs text-slate-500">{data.subjects.find(s => s.id === plan.subjectId)?.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-400 group-hover:text-blue-500 transition-colors">
                  <span className="text-xs font-bold uppercase tracking-widest hidden sm:block">Xem lại</span>
                  <Zap className="w-4 h-4" />
                </div>
              </div>
            ))}
            {data.lessonPlans.length === 0 && (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
                Bạn chưa soạn giáo án nào. Bắt đầu ngay!
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
