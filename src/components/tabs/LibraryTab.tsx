import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  UploadCloud, 
  Search, 
  Plus, 
  FileText, 
  Eye, 
  Trash2, 
  CheckCircle2,
  Copy,
  Edit3,
  Check,
  X,
  Filter,
  Users
} from 'lucide-react';
import dayjs from 'dayjs';
import { cn } from '../../lib/utils';
import { AppData, LessonPlan } from '../../types';

interface LibraryTabProps {
  libraryTab: 'personal' | 'community';
  setLibraryTab: (tab: 'personal' | 'community') => void;
  searchQuery: string;
  loadMorePlans: () => void;
  hasMorePlans: boolean;
  loadMoreCommunity: () => void;
  hasMoreCommunity: boolean;
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: any) => void;
  data: AppData;
  communityPlans: LessonPlan[];
  setCurrentPlan: (plan: Partial<LessonPlan>) => void;
  deletePlan: (id: string) => void;
  duplicatePlan: (plan: LessonPlan) => void;
  updatePlanMetadata: (id: string, updates: Partial<LessonPlan>) => void;
  user: any;
  toggleSharePlan: (e: React.MouseEvent, plan: LessonPlan) => void;
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
  deletePlan,
  duplicatePlan,
  updatePlanMetadata,
  user,
  toggleSharePlan,
  loadMorePlans,
  hasMorePlans,
  loadMoreCommunity,
  hasMoreCommunity
}: LibraryTabProps) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<LessonPlan>>({});

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
      className="space-y-8 max-w-6xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Tab Toggle */}
        <div className="flex p-1 bg-white rounded-2xl shadow-sm border border-slate-100 w-fit">
          <button 
            onClick={() => setLibraryTab('personal')}
            className={cn(
              "px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2",
              libraryTab === 'personal' ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <FileText className="w-5 h-5" /> Góc của tôi
          </button>
          <button 
            onClick={() => setLibraryTab('community')}
            className={cn(
              "px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2",
              libraryTab === 'community' ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Users className="w-5 h-5" /> Kho Chung (Community)
          </button>
        </div>

        <button 
          onClick={() => setActiveTab('creator')}
          className="px-6 py-3 gradient-bg text-white rounded-2xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2 hover:opacity-90 transition-all"
        >
          <Plus className="w-5 h-5" /> Soạn mới
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Tìm kiếm theo tiêu đề bài học..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-medium"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest">
               <Filter className="w-3 h-3" /> Lọc nhanh:
            </div>
            <select 
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">Tất cả Khối</option>
              {[...Array(12)].map((_, i) => <option key={i+1} value={(i+1).toString()}>Khối {i+1}</option>)}
            </select>
            <select 
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="px-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">Tất cả Tuần</option>
              {[...Array(35)].map((_, i) => <option key={i+1} value={(i+1).toString()}>Tuần {i+1}</option>)}
            </select>
            {(selectedGrade !== 'all' || selectedWeek !== 'all') && (
              <button 
                onClick={() => { setSelectedGrade('all'); setSelectedWeek('all'); }}
                className="px-4 py-3 text-red-500 font-bold text-xs hover:underline"
              >
                Xóa lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPlans.map((plan) => (
          <motion.div 
            key={plan.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => { setCurrentPlan(plan); setActiveTab('creator'); }}
            className="group pro-card p-6 cursor-pointer overflow-hidden relative"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                <FileText className="w-6 h-6 text-blue-500 group-hover:text-white transition-colors" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-200">
                {libraryTab === 'personal' && (
                  <button 
                    title={plan.isPublic ? "Thu hồi khỏi cộng đồng" : "Chia sẻ lên Kho chung"}
                    onClick={(e) => { e.stopPropagation(); toggleSharePlan(e, plan); }} 
                    className={cn("p-2 rounded-xl transition-all", plan.isPublic ? "bg-orange-50 text-orange-600" : "bg-slate-50 text-slate-400 hover:bg-orange-50 hover:text-orange-600")}
                  >
                    <UploadCloud className="w-5 h-5" />
                  </button>
                )}
                <button className="p-2 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all">
                  <Eye className="w-5 h-5" />
                </button>
                {libraryTab === 'personal' && (
                   <>
                    <button 
                      title="Nhân bản"
                      onClick={(e) => { e.stopPropagation(); duplicatePlan(plan); }}
                      className="p-2 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                    {(libraryTab === 'personal' || plan.userId === user?.uid) && (
                      <button 
                        title="Sửa nhanh"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditingId(plan.id); 
                          setEditForm({ title: plan.title, grade: plan.grade, week: plan.week, authorName: plan.authorName }); 
                        }}
                        className="p-2 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); deletePlan(plan.id); }}
                      className="p-2 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {editingId === plan.id ? (
              <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                <input 
                  type="text"
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 text-sm font-bold border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Tên giáo án"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    value={editForm.grade || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, grade: e.target.value }))}
                    className="px-2 py-1.5 text-xs border border-slate-100 rounded-xl bg-slate-50 outline-none"
                  >
                    {[...Array(12)].map((_, i) => <option key={i+1} value={(i+1).toString()}>Lớp {i+1}</option>)}
                  </select>
                  <select 
                    value={editForm.week || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, week: e.target.value }))}
                    className="px-2 py-1.5 text-xs border border-slate-100 rounded-xl bg-slate-50 outline-none"
                  >
                    {[...Array(35)].map((_, i) => <option key={i+1} value={(i+1).toString()}>Tuần {i+1}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { updatePlanMetadata(plan.id, editForm); setEditingId(null); }}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-700 shadow-lg shadow-blue-100"
                  >
                    <Check className="w-3 h-3" /> Lưu
                  </button>
                  <button 
                    onClick={() => setEditingId(null)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-slate-200"
                  >
                    <X className="w-3 h-3" /> Hủy
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h4 className="font-bold text-slate-900 line-clamp-2 h-12 leading-tight mb-2 group-hover:text-blue-600 transition-colors">
                  {plan.title}
                </h4>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase">Lớp {plan.grade || '?'}</span>
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg uppercase">Tuần {plan.week || '?'}</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase">Hoàn thành</span>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                   <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500">
                         {plan.authorName?.charAt(0) || 'A'}
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold truncate max-w-[80px]">{plan.authorName || 'Ẩn danh'}</span>
                   </div>
                   <span className="text-[10px] uppercase font-bold text-slate-300">
                    {dayjs(plan.updatedAt).format('DD/MM/YYYY')}
                   </span>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* Nút Tải thêm */}
      {(libraryTab === 'personal' ? hasMorePlans : hasMoreCommunity) && (
        <div className="flex justify-center pb-12">
          <button
            onClick={libraryTab === 'personal' ? loadMorePlans : loadMoreCommunity}
            className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
          >
            Tải thêm giáo án...
          </button>
        </div>
      )}
    </motion.div>
  );
};
