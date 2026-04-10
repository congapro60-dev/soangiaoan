import { motion } from 'motion/react';
import { 
  UploadCloud, 
  Search, 
  Plus, 
  FileText, 
  Eye, 
  Trash2, 
  CheckCircle2 
} from 'lucide-react';
import dayjs from 'dayjs';
import { cn } from '../../lib/utils';
import { AppData, LessonPlan } from '../../types';

interface LibraryTabProps {
  libraryTab: 'personal' | 'community';
  setLibraryTab: (tab: 'personal' | 'community') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: any) => void;
  data: AppData;
  communityPlans: LessonPlan[];
  setCurrentPlan: (plan: Partial<LessonPlan>) => void;
  toggleSharePlan: (e: React.MouseEvent, plan: LessonPlan) => void;
  deletePlan: (id: string) => void;
}

export const LibraryTab = ({
  libraryTab,
  setLibraryTab,
  searchQuery,
  setSearchQuery,
  setActiveTab,
  data,
  communityPlans,
  setCurrentPlan,
  toggleSharePlan,
  deletePlan
}: LibraryTabProps) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');

  const plansToDisplay = libraryTab === 'personal' ? data.lessonPlans : communityPlans;
  
  const filteredPlans = plansToDisplay.filter(p => {
    const matchesSearch = (p.title || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    const matchesGrade = selectedGrade === 'all' || p.grade === selectedGrade;
    const matchesWeek = selectedWeek === 'all' || p.week === selectedWeek;
    return matchesSearch && matchesGrade && matchesWeek;
  });

  return (
    <motion.div 
      key="library"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Tabs Cá Nhân / Cộng Đồng */}
      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setLibraryTab('personal')}
          className={cn(
            "px-6 py-4 font-bold transition-all border-b-2", 
            libraryTab === 'personal' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          Góc của tôi
        </button>
        <button 
          onClick={() => setLibraryTab('community')}
          className={cn(
            "px-6 py-4 font-bold transition-all border-b-2 flex items-center gap-2", 
            libraryTab === 'community' ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <UploadCloud className="w-4 h-4" /> Kho Chung (Community)
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tiêu đề bài học..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <button 
            onClick={() => setActiveTab('creator')}
            className="w-full sm:w-auto px-6 py-3 gradient-bg text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" /> Soạn mới
          </button>
        </div>

        <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-2xl border border-slate-100">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Lọc nhanh:</span>
          <select 
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Tất cả Khối</option>
            {[...Array(12)].map((_, i) => (
              <option key={i+1} value={(i+1).toString()}>Lớp {i+1}</option>
            ))}
          </select>
          <select 
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Tất cả Tuần</option>
            {[...Array(35)].map((_, i) => (
              <option key={i+1} value={(i+1).toString()}>Tuần {i+1}</option>
            ))}
          </select>
          <button 
            onClick={() => { setSelectedGrade('all'); setSelectedWeek('all'); setSearchQuery(''); }}
            className="text-xs text-blue-600 font-bold hover:underline ml-auto"
          >
            Xóa lọc
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlans.map(plan => (
          <div 
            key={plan.id} 
            onClick={() => { setCurrentPlan(plan); setActiveTab('creator'); }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {libraryTab === 'personal' && (
                  <button 
                    title={plan.isPublic ? "Thu hồi khỏi cộng đồng" : "Đóng góp phát hành lên Thư viện chung"}
                    onClick={(e) => toggleSharePlan(e, plan)} 
                    className={cn("p-2 transition-colors", plan.isPublic ? "text-orange-500 hover:text-orange-600" : "text-slate-400 hover:text-orange-500")}
                  >
                    <UploadCloud className="w-5 h-5" />
                  </button>
                )}
                <button className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                  <Eye className="w-5 h-5" />
                </button>
                {libraryTab === 'personal' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); deletePlan(plan.id); }}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            <h4 className="font-bold text-slate-800 line-clamp-2 mb-1 h-12 leading-tight">
              {plan.title}
            </h4>
            <div className="space-y-1 mb-4">
              <p className="text-[10px] text-slate-500 flex items-center gap-2">
                <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Lớp {plan.grade || '?'}</span>
                <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">Tuần {plan.week || '?'}</span>
              </p>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                Người soạn: <span className="font-bold text-slate-600">{plan.authorName || 'Ẩn danh'}</span>
              </p>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                {dayjs(plan.createdAt).format('DD MMM YYYY')}
              </span>
              <div className="flex items-center gap-1 text-green-500 text-[10px] font-bold">
                <CheckCircle2 className="w-3 h-3" /> HOÀN THÀNH
              </div>
            </div>
          </div>
        ))}
      </div>
      {filteredPlans.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <FileText className="w-16 h-16 mb-4 opacity-20" />
          <p>{libraryTab === 'personal' ? 'Thư viện trống. Hãy tạo giáo án đầu tiên!' : 'Chưa có giáo án cộng đồng nào phù hợp.'}</p>
        </div>
      )}
    </motion.div>
  );
};
