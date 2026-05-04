import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  UploadCloud, Search, Plus, FileText, Eye, Trash2, Copy,
  Edit3, Check, X, Filter, Users, ClipboardList, BookMarked,
  Download, Upload
} from 'lucide-react';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import { cn } from '../../lib/utils';
import { AppData, LessonPlan } from '../../types';
import { SavedExam } from '../../hooks/useSavedExams';
import { ViewPlanModal } from '../modals/ViewPlanModal';
import { downloadBlob } from '../../utils/fileUtils';

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
  // Exam library
  savedExams: SavedExam[];
  communityExams: SavedExam[];
  onDeleteExam: (id: string) => void;
  onToggleShareExam: (id: string, isPublic: boolean) => void;
  onOpenExamInEditor: (exam: SavedExam) => void;
  onFetchCommunityExams: () => void;
}

type ContentTab = 'plans' | 'exams';

export const LibraryTab = ({
  libraryTab, setLibraryTab, searchQuery, setSearchQuery,
  setActiveTab, data, communityPlans, setCurrentPlan,
  deletePlan, duplicatePlan, updatePlanMetadata, user,
  toggleSharePlan, loadMorePlans, hasMorePlans, loadMoreCommunity, hasMoreCommunity,
  savedExams, communityExams, onDeleteExam, onToggleShareExam, onOpenExamInEditor, onFetchCommunityExams,
}: LibraryTabProps) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<LessonPlan>>({});
  const [viewingPlan, setViewingPlan] = useState<LessonPlan | null>(null);
  const [contentTab, setContentTab] = useState<ContentTab>('plans');

  // Load community exams when switching to community tab
  useEffect(() => {
    if (libraryTab === 'community') onFetchCommunityExams();
  }, [libraryTab]);

  const plans = libraryTab === 'personal' ? data.lessonPlans : communityPlans;
  const exams = libraryTab === 'personal' ? savedExams : communityExams;

  const filteredPlans = plans.filter(p => {
    const matchesSearch = (p.title || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    const matchesGrade = selectedGrade === 'all' || p.grade === selectedGrade;
    const matchesWeek = selectedWeek === 'all' || p.week === selectedWeek;
    return matchesSearch && matchesGrade && matchesWeek;
  });

  const filteredExams = exams.filter(e =>
    (e.title || '').toLowerCase().includes((searchQuery || '').toLowerCase()) &&
    (selectedGrade === 'all' || e.grade === selectedGrade)
  );

  const handleExportExamWord = async (exam: SavedExam) => {
    try {
      const { marked } = await import('marked');
      const { WORD_EXPORT_STYLES } = await import('../../utils/examPaperStyles');
      const htmlBody = await marked(exam.content);
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><style>${WORD_EXPORT_STYLES}</style></head>
<body>${htmlBody}</body></html>`;
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, new TextEncoder().encode(html)], { type: 'application/msword' });
      downloadBlob(blob, `${exam.title.replace(/\s+/g, '_')}.doc`);
    } catch { /* silently fail */ }
  };

  const handleDeleteExam = async (exam: SavedExam) => {
    const res = await Swal.fire({
      title: 'Xóa đề thi?',
      text: `"${exam.title}" sẽ bị xóa vĩnh viễn.`,
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Xóa', cancelButtonText: 'Hủy', confirmButtonColor: '#dc2626',
    });
    if (res.isConfirmed) onDeleteExam(exam.id);
  };

  return (
    <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-6xl mx-auto">
      {/* Top row: personal/community + new button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex p-1 bg-white rounded-2xl shadow-sm border border-slate-100 w-fit gap-1">
          <button
            onClick={() => setLibraryTab('personal')}
            className={cn('px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 text-sm',
              libraryTab === 'personal' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:text-slate-800')}
          >
            <FileText className="w-4 h-4" /> Góc của tôi
          </button>
          <button
            onClick={() => setLibraryTab('community')}
            className={cn('px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 text-sm',
              libraryTab === 'community' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:text-slate-800')}
          >
            <Users className="w-4 h-4" /> Kho Chung
          </button>
        </div>
        <button
          onClick={() => setActiveTab(contentTab === 'plans' ? 'creator' : 'testing')}
          className="px-5 py-2.5 gradient-bg text-white rounded-2xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2 hover:opacity-90 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          {contentTab === 'plans' ? 'Soạn giáo án mới' : 'Soạn đề mới'}
        </button>
      </div>

      {/* Content type tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setContentTab('plans')}
          className={cn('flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm border-2 transition-all',
            contentTab === 'plans'
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-slate-100 bg-white text-slate-500 hover:border-blue-200')}
        >
          <ClipboardList className="w-4 h-4" />
          Giáo án
          <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-lg',
            contentTab === 'plans' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500')}>
            {(libraryTab === 'personal' ? data.lessonPlans : communityPlans).length}
          </span>
        </button>
        <button
          onClick={() => setContentTab('exams')}
          className={cn('flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm border-2 transition-all',
            contentTab === 'exams'
              ? 'border-violet-600 bg-violet-50 text-violet-700'
              : 'border-slate-100 bg-white text-slate-500 hover:border-violet-200')}
        >
          <BookMarked className="w-4 h-4" />
          Đề thi
          <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-lg',
            contentTab === 'exams' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500')}>
            {exams.length}
          </span>
        </button>
      </div>

      {/* Search & filter */}
      <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder={contentTab === 'plans' ? 'Tìm kiếm giáo án...' : 'Tìm kiếm đề thi...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-medium"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <Filter className="w-3 h-3" /> Lọc:
            </div>
            <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-3 py-2.5 bg-white border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="all">Tất cả Khối</option>
              {[...Array(12)].map((_, i) => <option key={i + 1} value={(i + 1).toString()}>Khối {i + 1}</option>)}
            </select>
            {contentTab === 'plans' && (
              <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}
                className="px-3 py-2.5 bg-white border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="all">Tất cả Tuần</option>
                {[...Array(35)].map((_, i) => <option key={i + 1} value={(i + 1).toString()}>Tuần {i + 1}</option>)}
              </select>
            )}
            {(selectedGrade !== 'all' || selectedWeek !== 'all') && (
              <button onClick={() => { setSelectedGrade('all'); setSelectedWeek('all'); }}
                className="px-3 py-2.5 text-red-500 font-bold text-xs hover:underline">Xóa lọc</button>
            )}
          </div>
        </div>
      </div>

      {/* ── LESSON PLANS ── */}
      {contentTab === 'plans' && (
        <>
          {filteredPlans.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="w-10 h-10 text-slate-300" />}
              title={libraryTab === 'community' ? 'Kho chung đang trống' : 'Chưa có giáo án nào'}
              desc={libraryTab === 'community'
                ? 'Hãy chia sẻ giáo án lên Kho chung để cộng đồng cùng học hỏi.'
                : 'Nhấn "Soạn giáo án mới" để tạo với sự hỗ trợ của AI.'}
              action={libraryTab === 'personal' ? (
                <button onClick={() => setActiveTab('creator')}
                  className="mt-4 px-6 py-3 gradient-bg text-white rounded-2xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2 hover:opacity-90 transition-all">
                  <Plus className="w-5 h-5" /> Soạn bài ngay
                </button>
              ) : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlans.map(plan => (
                <motion.div key={plan.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setViewingPlan(plan)}
                  className="group pro-card p-6 cursor-pointer overflow-hidden relative">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                      <FileText className="w-5 h-5 text-blue-500 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {libraryTab === 'personal' && (
                        <button title={plan.isPublic ? 'Thu hồi' : 'Chia sẻ lên Kho chung'}
                          onClick={(e) => { e.stopPropagation(); toggleSharePlan(e, plan); }}
                          className={cn('p-2 rounded-xl transition-all', plan.isPublic ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-400 hover:bg-orange-50 hover:text-orange-600')}>
                          <UploadCloud className="w-4 h-4" />
                        </button>
                      )}
                      <button title="Xem" onClick={(e) => { e.stopPropagation(); setViewingPlan(plan); }}
                        className="p-2 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all">
                        <Eye className="w-4 h-4" />
                      </button>
                      {libraryTab === 'personal' && (
                        <>
                          <button title="Nhân bản" onClick={(e) => { e.stopPropagation(); duplicatePlan(plan); }}
                            className="p-2 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button title="Sửa" onClick={(e) => { e.stopPropagation(); setEditingId(plan.id); setEditForm({ title: plan.title, grade: plan.grade, week: plan.week, authorName: plan.authorName }); }}
                            className="p-2 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); deletePlan(plan.id); }}
                            className="p-2 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {editingId === plan.id ? (
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      <input type="text" value={editForm.title || ''} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                        className="w-full px-3 py-2 text-sm font-bold border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Tên giáo án" />
                      <div className="grid grid-cols-2 gap-2">
                        <select value={editForm.grade || ''} onChange={e => setEditForm(p => ({ ...p, grade: e.target.value }))}
                          className="px-2 py-1.5 text-xs border border-slate-100 rounded-xl bg-slate-50 outline-none">
                          {[...Array(12)].map((_, i) => <option key={i + 1} value={(i + 1).toString()}>Lớp {i + 1}</option>)}
                        </select>
                        <select value={editForm.week || ''} onChange={e => setEditForm(p => ({ ...p, week: e.target.value }))}
                          className="px-2 py-1.5 text-xs border border-slate-100 rounded-xl bg-slate-50 outline-none">
                          {[...Array(35)].map((_, i) => <option key={i + 1} value={(i + 1).toString()}>Tuần {i + 1}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { updatePlanMetadata(plan.id, editForm); setEditingId(null); }}
                          className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-700">
                          <Check className="w-3 h-3" /> Lưu
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                          <X className="w-3 h-3" /> Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h4 className="font-bold text-slate-900 line-clamp-2 leading-tight mb-3 group-hover:text-blue-600 transition-colors">{plan.title}</h4>
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">Lớp {plan.grade || '?'}</span>
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg">Tuần {plan.week || '?'}</span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                        <span className="text-[10px] text-slate-400 font-bold truncate max-w-[120px]">{plan.authorName || 'Ẩn danh'}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-300">{dayjs(plan.updatedAt).format('DD/MM/YY')}</span>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          )}
          {(libraryTab === 'personal' ? hasMorePlans : hasMoreCommunity) && (
            <div className="flex justify-center pb-8">
              <button onClick={libraryTab === 'personal' ? loadMorePlans : loadMoreCommunity}
                className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm">
                Tải thêm giáo án...
              </button>
            </div>
          )}
        </>
      )}

      {/* ── EXAMS ── */}
      {contentTab === 'exams' && (
        <>
          {filteredExams.length === 0 ? (
            <EmptyState
              icon={<BookMarked className="w-10 h-10 text-slate-300" />}
              title={libraryTab === 'community' ? 'Kho đề thi chung đang trống' : 'Chưa có đề thi nào được lưu'}
              desc={libraryTab === 'community'
                ? 'Hãy chia sẻ đề thi lên Kho chung để giáo viên khác cùng sử dụng.'
                : 'Soạn đề trong tab "Bảng Kiểm tra" rồi nhấn "Lưu vào Thư viện" để lưu tại đây.'}
              action={libraryTab === 'personal' ? (
                <button onClick={() => setActiveTab('testing')}
                  className="mt-4 px-6 py-3 bg-violet-600 text-white rounded-2xl font-bold shadow-lg shadow-violet-200 flex items-center gap-2 hover:bg-violet-700 transition-all">
                  <Plus className="w-5 h-5" /> Soạn đề ngay
                </button>
              ) : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExams.map(exam => (
                <motion.div key={exam.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="group pro-card p-6 overflow-hidden relative">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-11 h-11 rounded-2xl bg-violet-50 flex items-center justify-center group-hover:bg-violet-600 transition-colors">
                      <BookMarked className="w-5 h-5 text-violet-500 group-hover:text-white transition-colors" />
                    </div>
                    {libraryTab === 'personal' && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button title={exam.isPublic ? 'Thu hồi khỏi Kho chung' : 'Chia sẻ lên Kho chung'}
                          onClick={() => onToggleShareExam(exam.id, !exam.isPublic)}
                          className={cn('p-2 rounded-xl transition-all', exam.isPublic ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-400 hover:bg-orange-50 hover:text-orange-600')}>
                          <UploadCloud className="w-4 h-4" />
                        </button>
                        <button title="Mở để chỉnh sửa" onClick={() => onOpenExamInEditor(exam)}
                          className="p-2 bg-slate-50 text-slate-400 hover:bg-violet-50 hover:text-violet-600 rounded-xl transition-all">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button title="Xuất Word" onClick={() => handleExportExamWord(exam)}
                          className="p-2 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteExam(exam)}
                          className="p-2 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {libraryTab === 'community' && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button title="Xuất Word" onClick={() => handleExportExamWord(exam)}
                          className="p-2 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all">
                          <Download className="w-4 h-4" />
                        </button>
                        <button title="Tải về & tạo đề thi online" onClick={() => onOpenExamInEditor(exam)}
                          className="p-2 bg-slate-50 text-slate-400 hover:bg-violet-50 hover:text-violet-600 rounded-xl transition-all">
                          <Upload className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-900 line-clamp-2 leading-tight mb-3 group-hover:text-violet-600 transition-colors cursor-pointer"
                    onClick={() => onOpenExamInEditor(exam)}>
                    {exam.title}
                  </h4>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {exam.grade && <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg">Khối {exam.grade}</span>}
                    {exam.subject && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{exam.subject}</span>}
                    {exam.questionCount && <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">{exam.questionCount} câu</span>}
                    {exam.isPublic && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">Kho chung</span>}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <span className="text-[10px] text-slate-400 font-bold truncate max-w-[120px]">{exam.authorName || 'Ẩn danh'}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-300">{dayjs(exam.updatedAt).format('DD/MM/YY')}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      <ViewPlanModal plan={viewingPlan} onClose={() => setViewingPlan(null)}
        onEdit={(plan) => { setCurrentPlan(plan); setActiveTab('creator'); setViewingPlan(null); }} />
    </motion.div>
  );
};

const EmptyState = ({ icon, title, desc, action }: {
  icon: React.ReactNode; title: string; desc: string; action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-20 h-20 rounded-[32px] bg-slate-100 flex items-center justify-center mb-4">{icon}</div>
    <h3 className="text-lg font-black text-slate-400 mb-2">{title}</h3>
    <p className="text-sm text-slate-400 max-w-sm">{desc}</p>
    {action}
  </div>
);
